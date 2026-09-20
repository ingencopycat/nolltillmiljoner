"""FINAL A on real production routes. No prototype runtime or production QA hooks."""
import json
import os
import subprocess
import time
import unittest
from pathlib import Path
from playwright.sync_api import expect
import browser_smoke as smoke

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/qa/knowledge-ux100'

class KnowledgeUX100(unittest.TestCase):
    setUpClass=classmethod(smoke.BrowserSmoke.setUpClass.__func__)
    tearDownClass=classmethod(smoke.BrowserSmoke.tearDownClass.__func__)
    setUp=smoke.BrowserSmoke.setUp
    tearDown=smoke.BrowserSmoke.tearDown
    go=smoke.BrowserSmoke.go

    def shot(self,p,path):
        p.evaluate("window.scrollTo({top:0,behavior:'instant'})")
        p.screenshot(path=str(path),full_page=True,animations='disabled')

    def ask(self,q):
        self.page.locator('#question').fill(q)
        self.page.locator('#question').press('Enter')

    def test_production_states_themes_and_screenshot_pass(self):
        OUT.mkdir(parents=True,exist_ok=True)
        p=self.page
        errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
        for width in [360,390,430,768,1440,1920]:
            p.set_viewport_size({'width':width,'height':1000})
            for theme in ['dark','light']:
                self.go('fragor-svar.html');p.evaluate('applyTheme',theme)
                expect(p.locator('#composer')).to_be_visible()
                expect(p.locator('.modes button')).to_have_count(3)
                expect(p.locator('#question')).to_have_attribute('placeholder','Fråga om investeringar och ekonomi...')
                font=p.locator('#question').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')
                self.assertGreaterEqual(font,20)
                self.assertNotEqual(p.locator('.composer-row').evaluate('(e)=>getComputedStyle(e).boxShadow'),'none')
                self.shot(p,OUT/f'landing-{width}-{theme}.png')
                for q,kind in [('Vad är P/E?','ANSWER'),('Är P/E 40 dyrt?','ANSWER'),('marginal','CLARIFY'),('P/E vs P/S','ANSWER'),('Aktien kostar 100 SEK och årlig EPS är 5 SEK vad är P/E?','ANSWER'),('PRIVATE-UNKNOWN-QUESTION','ABSTAIN_NO_COVERAGE'),('Är NVIDIA ett köp?','ABSTAIN_UNSUPPORTED_JUDGMENT'),('Aktien kostar 100 och EPS är 5. Vad är P/E?','INVALID_INPUT')]:
                    self.ask(q)
                    expect(p.locator('#answer')).to_have_attribute('data-outcome',kind)
                    if kind=='ANSWER':expect(p.locator('.answer-reading')).to_be_visible()
                    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width)
                self.ask('Vad är P/E?');expect(p.locator('.use a').first).to_be_visible()
                self.assertEqual(p.locator('#question').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)'),font)
                self.assertTrue(p.evaluate("!!(document.querySelector('.use').compareDocumentPosition(document.querySelector('.related')) & Node.DOCUMENT_POSITION_FOLLOWING)"))
                self.shot(p,OUT/f'answer-{width}-{theme}.png')
                p.locator('[data-mode=search]').click()
                expect(p.locator('#results>a')).to_have_count(0)
                for q in ['', ' ', '/', 'P']:
                    p.locator('#searchInput').fill(q);expect(p.locator('#results>a')).to_have_count(0)
                self.shot(p,OUT/f'search-blank-{width}-{theme}.png')
                p.locator('#searchInput').fill('P/E')
                expect(p.locator('#results>a').first).to_be_visible()
                self.assertLessEqual(p.locator('#results>a').count(),12)
                actual=p.locator('#results>a').evaluate_all('(a)=>a.map(e=>e.dataset.knowledgeCard)')
                self.assertEqual(actual,p.evaluate("NTMKnowledgeCatalog.search('P/E').slice(0,12).map(e=>e.id)"))
                self.shot(p,OUT/f'search-{width}-{theme}.png')
                p.locator('[data-mode=explore]').click();expect(p.locator('#categories button')).to_have_count(7)
                p.locator('#categories button').first.click()
                self.assertLessEqual(p.locator('#concepts details').count(),10)
                self.shot(p,OUT/f'explore-{width}-{theme}.png')
                self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width)
        self.assertEqual(errors,[])

    def test_history_refresh_relations_keyboard_and_privacy(self):
        p=self.page;seen=[]
        p.on('request',lambda r:seen.append(r.url+(r.post_data or '')))
        self.go('fragor-svar.html')
        self.assertFalse(any('/data/knowledge/answers/' in u for u in seen))
        p.locator('#question').fill('Vad är P/E?')
        p.get_by_role('button',name='Skicka fråga',exact=True).click()
        expect(p.locator('#answerTitle')).to_have_text('Vad betyder P/E?')
        p.locator('.sources summary').focus();p.keyboard.press('Enter')
        expect(p.locator('.sources')).to_have_attribute('open','')
        with p.expect_popup() as popup:p.locator('.use a').first.click()
        self.assertNotIn('question=',popup.value.url);popup.value.close()
        expect(p.locator('#answerTitle')).to_have_text('Vad betyder P/E?')
        p.locator('.related-link').first.click();expect(p.locator('#answerTitle')).to_have_text('Vad är EPS?')
        p.go_back();expect(p.locator('#answerTitle')).to_have_text('Vad betyder P/E?')
        p.go_forward();expect(p.locator('#answerTitle')).to_have_text('Vad är EPS?')
        p.reload();expect(p.locator('#answerTitle')).to_have_text('Vad är EPS?')
        self.go('fragor-svar.html')
        self.ask('Vad är P/E?');expect(p.locator('.lead')).to_be_visible()
        p.go_back();expect(p.locator('#starts')).to_be_visible()
        p.go_forward();expect(p.locator('.lead')).to_be_visible()
        self.ask('PRIVATE-SENTINEL '+('private ' * 25))
        expect(p.locator('#answer')).to_have_attribute('data-outcome','ABSTAIN_NO_COVERAGE')
        for snapshot in [p.url,p.evaluate('JSON.stringify(history.state)'),p.evaluate('JSON.stringify({...localStorage,...sessionStorage})'),p.evaluate('JSON.stringify(NTMEvents.snapshot())')]:self.assertNotIn('PRIVATE-SENTINEL',snapshot)
        self.assertFalse(any('PRIVATE-SENTINEL' in r for r in seen))
        p.locator('#newQuestion').click();expect(p.locator('#question')).to_be_focused();expect(p.locator('#question')).to_have_value('')
        self.go('fragor-svar.html#category-macro');expect(p.locator('#concepts h2')).to_be_visible()
        self.go('fragor-svar-pe-tal.html#task-help')
        p.get_by_role('link',name='Fortsätt i Fråga NTM',exact=True).click()
        expect(p.locator('.lead')).to_be_visible()
        self.assertTrue(p.url.endswith('#task-help'))
        expect(p.get_by_role('button',name='Stäng läsfliken och återgå')).to_be_visible()
        self.ask('PRIVATE-NO-COVERAGE');expect(p.locator('#answer')).to_have_attribute('data-outcome','ABSTAIN_NO_COVERAGE')
        p.reload();expect(p.locator('#answer')).to_have_attribute('data-outcome','ABSTAIN_NO_COVERAGE')

    def test_lazy_error_mixed_version_suppression_and_retry(self):
        p=self.page
        for failure in ['unavailable','version','suppressed']:
            def body(route):
                if failure=='unavailable':route.fulfill(status=503,body='unavailable');return
                data=json.loads((ROOT/'data/knowledge/answers/pe.json').read_text(encoding='utf-8'))
                if failure=='version':data['contentVersion']=-1
                else:data['reviewDue']='2000-01-01';data['reviewPolicy']['overdue']='suppress'
                route.fulfill(content_type='application/json',body=json.dumps(data))
            p.route('**/data/knowledge/answers/pe.json',body)
            self.go('fragor-svar.html?id=pe')
            expect(p.locator('#answer')).to_contain_text('Vi kunde inte öppna svaret')
            expect(p.locator('.lead')).to_have_count(0)
            p.unroute('**/data/knowledge/answers/pe.json')
        self.go('fragor-svar.html?id=pe');expect(p.locator('.lead')).to_be_visible()
        self.go('fragor-svar.html?id=unknown');expect(p.locator('.lead')).to_have_count(0)

    def test_mobile_touch(self):
        context=self.browser.new_context(viewport={'width':360,'height':900},has_touch=True,is_mobile=True)
        try:
            p=context.new_page();p.goto(self.base+'/fragor-svar.html')
            p.locator('#question').fill('Vad är P/E?');p.get_by_role('button',name='Skicka fråga',exact=True).tap()
            expect(p.locator('.lead')).to_be_visible()
        finally:context.close()

    def test_real_and_synthetic_scale_with_production_rendering(self):
        p=self.page;measurements=[]
        for size in [100,500,1200]:
            if size!=100:
                payload=subprocess.check_output([os.environ['NODE_BINARY'],'scripts/knowledge_scale.cjs','--fixture',str(size)],cwd=ROOT).decode('utf-8')
                p.route('**/knowledge-catalog.js',lambda r:r.fulfill(content_type='text/javascript',body='window.NTMKnowledgeCatalog=NTMKnowledgeCore.create('+payload+');'))
            p.set_viewport_size({'width':390,'height':900})
            self.go('fragor-svar.html');expect(p.locator('#composer')).to_be_visible()
            initial=p.evaluate("""()=>({count:NTMKnowledgeCatalog.entries.length,indexBytes:new TextEncoder().encode(JSON.stringify(NTMKnowledgeCatalog)).length,dom:document.querySelectorAll('*').length,initialBodies:performance.getEntriesByType('resource').filter(r=>r.name.includes('/data/knowledge/answers/')).length,resourcesBytes:performance.getEntriesByType('resource').reduce((sum,r)=>sum+r.decodedBodySize,0)})""")
            self.assertEqual(initial['count'],size);self.assertEqual(initial['initialBodies'],0)
            p.locator('[data-mode=search]').click();expect(p.locator('#results>a')).to_have_count(0)
            timings=p.evaluate("""()=>{const samples=fn=>{let a=[];for(let i=0;i<50;i++){const t=performance.now();fn();a.push(performance.now()-t)}return a.sort((a,b)=>a-b)[47]};return {askP95Ms:samples(()=>NTMKnowledgeCatalog.respond('Vad betyder P/E?')),searchRenderP95Ms:samples(()=>{const e=document.querySelector('#searchInput');e.value='vinst';e.dispatchEvent(new Event('input'))})}}""")
            self.assertLessEqual(p.locator('#results>a').count(),12)
            start=time.perf_counter();p.locator('[data-mode=explore]').click();p.locator('#categories button').first.click()
            explore_ms=(time.perf_counter()-start)*1000
            self.assertLessEqual(p.locator('#concepts details').count(),10)
            p.locator('#concepts summary').first.click();expect(p.locator('#concepts .result-row').first).to_be_visible()
            self.assertLessEqual(p.locator('#concepts .result-row').count(),8)
            start=time.perf_counter();p.locator('[data-mode=ask]').click();self.ask('Vad är P/E?');expect(p.locator('.lead')).to_be_visible()
            lazy_ms=(time.perf_counter()-start)*1000
            measurements.append({**initial,**timings,'exploreInteractionMs':round(explore_ms,2),'lazyAnswerInteractionMs':round(lazy_ms,2)})
            if size!=100:p.unroute('**/knowledge-catalog.js')
        OUT.mkdir(parents=True,exist_ok=True)
        (OUT/'scale.json').write_text(json.dumps({'method':'Local Chromium at 390 CSS px; actual 100, synthetic compact-index responses for 500/1200; warmed 50-sample p95; interaction times include browser automation; no throttling.','rows':measurements},indent=2),encoding='utf-8')
    def test_reflow_forced_colors_and_static_no_js(self):
        p=self.page
        for width in [720,360]:
            p.set_viewport_size({'width':width,'height':900})
            self.go('fragor-svar.html?id=pe');expect(p.locator('.lead')).to_be_visible()
            p.emulate_media(reduced_motion='reduce',forced_colors='active')
            self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width)
            p.locator('#question').focus();self.assertNotEqual(p.locator('.composer-row').evaluate('(e)=>getComputedStyle(e).outlineStyle'),'none')
        context=self.browser.new_context(java_script_enabled=False,viewport={'width':360,'height':900})
        try:
            p=context.new_page();p.goto(self.base+'/fragor-svar.html')
            expect(p.locator('#knowledgeFallback')).to_be_visible()
            p.locator('#knowledgeFallback a').first.click()
            expect(p.locator('.knowledge-short')).to_contain_text('P/E')
            p.locator('.knowledge-method summary').click();expect(p.locator('.knowledge-method a').first).to_be_visible()
            self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),360)
        finally:context.close()

if __name__=='__main__':unittest.main(verbosity=2)
