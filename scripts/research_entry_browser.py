"""Entry, bounded selector and initial-paint regression. Offline synthetic catalogs only."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import re
import unittest
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/qa/research-entry'


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, output):
        try:
            super().copyfile(source, output)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass


class Entry(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        OUT.mkdir(parents=True, exist_ok=True)
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
        Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()
        cls.metrics = []

    @classmethod
    def tearDownClass(cls):
        (OUT / 'metrics.json').write_text(json.dumps(cls.metrics, indent=2), encoding='utf-8')
        cls.browser.close()
        cls.pw.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width':1280,'height':900}, reduced_motion='reduce')
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda e:self.errors.append(str(e)))
        self.page.add_init_script("document.addEventListener('securitypolicyviolation',e=>{window.__csp=(window.__csp||[]).concat(e.violatedDirective)});")

    def tearDown(self):
        self.assertEqual(self.errors, [])
        self.assertEqual(self.page.evaluate('window.__csp||[]'), [])
        self.context.close()

    def go(self, route='research.html'):
        self.page.goto(self.base+'/'+route)
        self.page.wait_for_function("document.querySelector('main').dataset.entryState && document.querySelector('main').dataset.entryState !== 'INITIALIZING'")

    def test_initial_paint_and_slow_direct_ticker(self):
        p = self.page
        # Hold the actual entry script response: inspect the browser before DOMContentLoaded.
        p.set_viewport_size({'width':390,'height':844})
        held = []
        p.route('**/research-entry.js', lambda r:held.append(r))
        p.goto(self.base+'/research.html', wait_until='commit')
        expect(p.locator('#researchLoading')).to_be_visible()
        expect(p.locator('#researchEntryIntro')).to_be_hidden()
        expect(p.locator('[data-relation-ticker]:visible')).to_have_count(0)
        expect(p.locator('.research-company-card')).to_have_count(0)
        p.screenshot(path=str(OUT/'initializing-390.png'))
        expect(p.locator('script[src="research-entry.js"]')).to_have_count(1)
        while not held:
            p.wait_for_timeout(10)
        held.pop().continue_()
        expect(p.locator('#companySearch')).to_be_visible()
        expect(p.locator('#main-content')).to_have_attribute('data-entry-state','NO_COMPANY')
        p.unroute('**/research-entry.js')
        pending = []
        p.route('**/data/stocks/NVDA.json', lambda r:pending.append(r))
        p.goto(self.base+'/research.html?ticker=nvda')
        expect(p.locator('#main-content')).to_have_attribute('data-entry-state','DIRECT_TICKER')
        expect(p.locator('#researchEntryIntro')).to_be_hidden()
        expect(p.locator('#researchDetail')).to_be_hidden()
        expect(p.locator('#researchLoading')).to_be_visible()
        pending.pop().continue_()
        expect(p.locator('#companyName')).to_contain_text('NVIDIA')
        expect(p.locator('#main-content')).to_have_attribute('data-entry-state','COMPANY_SELECTED')
        expect(p.locator('#companyPicker > summary')).to_contain_text('Byt bolag')
        p.locator('#companyPicker > summary').click()
        expect(p.locator('#companySearch')).to_be_focused()
        p.keyboard.press('Escape')
        expect(p.locator('#companyPicker > summary')).to_be_focused()

    def test_current_search_keyboard_and_manual(self):
        self.go(); p = self.page
        expect(p.locator('#companyRecent')).to_be_hidden()
        expect(p.locator('#stockSwitcherPills a')).to_have_count(0)
        for query in ['nvda',' NVIDIA ','nvi']:
            p.locator('#companySearch').fill(query)
            expect(p.locator('#stockSwitcherPills a').first).to_have_attribute('data-ticker','NVDA')
        p.locator('#companySearch').press('ArrowDown')
        expect(p.locator('#stockSwitcherPills a').first).to_be_focused()
        p.keyboard.press('ArrowUp')
        expect(p.locator('#companySearch')).to_be_focused()
        p.locator('#companySearch').fill('no such company')
        expect(p.locator('#companySearchStatus')).to_contain_text('Inget bolag')
        p.locator('#manualThesisEntry > summary').click()
        p.locator('#manualTicker').fill('PRIVATE')
        p.locator('#manualLabel').fill('Manual Research')
        p.locator('#manualThesisForm button').click()
        expect(p.locator('#main-content')).to_have_attribute('data-entry-state','MANUAL_COMPANY')
        expect(p.locator('#manualThesisHeading')).to_have_text('Manual Research')
        expect(p.locator('#manualThesisNotice')).to_be_visible()
        expect(p.locator('#companyHeaderCard')).to_be_hidden()

    def test_no_javascript_has_an_honest_fallback(self):
        context=self.browser.new_context(java_script_enabled=False)
        try:
            page=context.new_page()
            page.goto(self.base+'/research.html')
            expect(page.locator('#researchLoading')).to_be_hidden()
            expect(page.locator('[data-relation-ticker]:visible')).to_have_count(0)
            expect(page.locator('main noscript p')).to_contain_text('Research behöver JavaScript')
        finally:
            context.close()

    def test_returning_local_session_and_failure(self):
        self.go('research.html?ticker=NVDA'); p=self.page
        expect(p.locator('#companyName')).to_contain_text('NVIDIA')
        self.go()
        expect(p.locator('#main-content')).to_have_attribute('data-entry-state','RETURNING_RESEARCH')
        expect(p.locator('#companyRecentList a')).to_have_count(1)
        expect(p.locator('#companySearch')).to_be_visible()
        p.route('**/data/stocks/SOFI.json', lambda r:r.fulfill(status=503,body='unavailable'))
        self.go('research.html?ticker=SOFI')
        expect(p.locator('#main-content')).to_have_attribute('data-entry-state','LOAD_FAILURE')
        expect(p.locator('#researchError')).to_be_visible()
        expect(p.locator('#companySearch')).to_be_visible()

    def test_mobile_themes_reflow(self):
        p=self.page
        for width in [360,390,430,320]:
            for theme in ['light','dark']:
                p.set_viewport_size({'width':width,'height':844})
                self.go()
                p.evaluate('(t)=>applyTheme(t)',theme)
                expect(p.locator('#companySearch')).to_be_in_viewport()
                p.locator('#companyBrowse > summary').click()
                expect(p.locator('#companyLetters button').first).to_have_attribute('aria-pressed','true')
                self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)
                p.screenshot(path=str(OUT/f'entry-{width}-{theme}.png'), full_page=True)
        p.locator('#companySearch').fill('NVDA')
        p.locator('#companySearch').press('ArrowDown')
        p.keyboard.press('Enter')
        expect(p.locator('#companyName')).to_contain_text('NVIDIA')

    def test_zoom_and_saved_manual_continuation(self):
        p=self.page
        self.go('research.html?ticker=PRIVATE')
        p.locator('#thesis-text').fill('A saved manual research thesis with a reviewable assumption.')
        p.locator('#thesisForm button[type=submit]').click()
        self.go()
        expect(p.locator('#main-content')).to_have_attribute('data-entry-state','RETURNING_RESEARCH')
        expect(p.locator('#companyRecentList')).to_contain_text('Manuell tes')
        expect(p.locator('#companyRecentList a')).to_have_count(1)
        for zoom in [2,4]:
            # Browser zoom reduces the CSS viewport and triggers media queries.
            # CSS body.zoom does not, so use the equivalent 1280/zoom CSS viewport.
            width=1280//zoom
            p.set_viewport_size({'width':width,'height':900})
            p.locator('#companySearch').fill('NVDA')
            expect(p.locator('#stockSwitcherPills a')).to_have_count(1)
            self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width)
            p.screenshot(path=str(OUT/f'entry-zoom-{zoom}.png'),full_page=True)
        p.locator('#companySearch').fill('')
        p.locator('#companyRecentList a').click()
        expect(p.locator('#thesis-text')).to_have_value('A saved manual research thesis with a reviewable assumption.')

    def test_synthetic_scale(self):
        p=self.page
        source=(ROOT/'research-entry.js').read_text(encoding='utf-8')
        for count in [12,100,550]:
            if count != 12:
                rows=[[f'T{i:04}',f'{chr(65+i%26)} Shared Company {i//2:04}'] for i in range(count)]
                code=re.sub(r'const companies = \[.*?\]\.map', 'const companies = '+json.dumps(rows)+'.map',source,count=1,flags=re.S)
                p.route('**/research-entry.js',lambda r,request,code=code:r.fulfill(content_type='application/javascript',body=code))
            requests=[]
            p.on('request',lambda r:requests.append(r.url) if '/data/stocks/' in r.url else None)
            self.go()
            initial=p.locator('#companyPicker li').count()
            initial_dom=p.locator('#companyPicker *').count()
            self.assertEqual(initial,0)
            self.assertEqual(requests,[])
            durations=p.evaluate("""q=>{const a=[];for(let i=0;i<100;i++){const t=performance.now();companySearch.value=q;companySearch.dispatchEvent(new Event('input'));a.push(performance.now()-t)}return a.sort((a,b)=>a-b)}""", 'o' if count==12 else 'Company')
            result_count=p.locator('#stockSwitcherPills a').count()
            self.assertLessEqual(result_count,20)
            if count!=12:
                expect(p.locator('#companySearchStatus')).to_contain_text(f'{count} träffar')
                p.locator('#companySearchPages button').last.click()
                expect(p.locator('#stockSwitcherPills a').first).to_be_focused()
                p.locator('#companySearch').fill(f't{count-1:04}')
                expect(p.locator('#stockSwitcherPills a').first).to_have_attribute('data-ticker',f'T{count-1:04}')
            p.locator('#companySearch').fill('')
            p.locator('#companyBrowse > summary').click()
            expect(p.locator('#companyLetters button').first).to_have_attribute('aria-pressed','true')
            if count>20:p.locator('#companyLetters button').last.click()
            else:
                expect(p.locator('#companyLetters')).to_be_hidden()
                expect(p.locator('#companyBrowseResults a')).to_have_count(12)
            self.assertLessEqual(p.locator('#companyBrowseResults a').count(),20)
            # All 26 groups must wrap at phone widths; a dense group also stays paginated.
            p.set_viewport_size({'width':360,'height':844})
            self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),360)
            if count>20:self.assertLess(p.locator('#companyLetters').bounding_box()['height'],400)
            self.metrics.append(dict(companies=count,initial_results=initial,initial_selector_dom=initial_dom,search_results=result_count,
                search_render_median_ms=durations[50],search_render_p95_ms=durations[95],stock_requests=len(requests),
                selector_bytes=len((code if count!=12 else source).encode('utf-8'))))
            p.unroute('**/research-entry.js')


if __name__=='__main__':
    unittest.main()
