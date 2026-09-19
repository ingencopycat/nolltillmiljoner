"""Local Knowledge 100 UX and synthetic browser scale; fresh anonymous contexts."""
import json
import os
from pathlib import Path
import subprocess
import time
import unittest
from playwright.sync_api import expect
import browser_smoke as smoke

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/qa/knowledge100'

class Knowledge100(unittest.TestCase):
    setUpClass = classmethod(smoke.BrowserSmoke.setUpClass.__func__)
    tearDownClass = classmethod(smoke.BrowserSmoke.tearDownClass.__func__)
    setUp = smoke.BrowserSmoke.setUp
    tearDown = smoke.BrowserSmoke.tearDown
    go = smoke.BrowserSmoke.go
    wait_for = smoke.BrowserSmoke.wait_for

    def ask(self, query):
        self.page.locator('#knowledgeAskInput').fill(query)
        self.page.locator('#knowledgeAskInput').press('Enter')

    def test_mobile_keyboard_clarification_formula_and_depth(self):
        p = self.page
        requests = []
        p.on('request', lambda r: requests.append(r.url + (r.post_data or '')))
        for width in [360, 390, 430]:
            p.set_viewport_size({'width':width, 'height':900})
            for theme in ['light', 'dark']:
                self.go('fragor-svar.html')
                p.evaluate('applyTheme', theme)
                expect(p.locator('[data-knowledge-card]')).to_have_count(0)
                p.screenshot(path=str(OUT/f'initial-{width}-{theme}.png'),full_page=True)
                self.ask('avkastning')
                expect(p.locator('#knowledgeAskResult button')).to_have_count(3)
                p.locator('#knowledgeAskResult button').first.focus()
                p.keyboard.press('Enter')
                expect(p.locator('#knowledgeAskResult')).to_contain_text('Vad skiljer CAGR')
                p.locator('#knowledgeAskResult summary').press('Enter')
                expect(p.locator('#knowledgeAskResult details')).to_have_attribute('open','')
                p.locator('.knowledge-formula summary').press('Enter')
                p.locator('#knowledgeFormula [name=price]').fill('150')
                p.locator('#knowledgeFormula [name=eps]').fill('6')
                p.locator('#knowledgeFormula button').click()
                expect(p.locator('#knowledgeAskResult')).to_contain_text('25 gånger')
                p.locator('#knowledgeFormula [name=eps]').fill('-6')
                p.locator('#knowledgeFormula button').click()
                expect(p.locator('#knowledgeAskResult')).to_contain_text('Negativ EPS')
                self.ask('Är P/E 40 dyrt?')
                expect(p.locator('#knowledgeAskResult')).to_have_attribute('data-outcome','ANSWER')
                expect(p.locator('#knowledgeAskResult')).to_contain_text('avgör inte ensamt')
                self.ask('Ska jag köpa NVIDIA?')
                expect(p.locator('#knowledgeAskResult')).to_have_attribute('data-outcome','ABSTAIN_UNSUPPORTED_JUDGMENT')
                self.ask('PRIVATE-UNKNOWN-SENTINEL')
                expect(p.locator('#knowledgeAskResult')).to_contain_text('inget granskat svar')
                p.locator('#knowledgeSearch').fill('EPS')
                self.assertLessEqual(p.locator('[data-knowledge-card]:visible').count(),12)
                self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width)
                p.emulate_media(reduced_motion='reduce')
                p.evaluate('window.scrollTo(0,0)')
                p.screenshot(path=str(OUT/f'knowledge-{width}-{theme}.png'),full_page=True)
        self.assertFalse(any('PRIVATE-UNKNOWN-SENTINEL' in r for r in requests))
        self.assertNotIn('PRIVATE',p.evaluate('JSON.stringify({...localStorage,...sessionStorage})'))
        for file in ['fragor-svar-forward-trailing-pe.html','fragor-svar-cagr-total-avkastning.html','fragor-svar-pe-tal.html','fragor-svar-isk-grunder.html']:
            self.go(file)
            p.set_viewport_size({'width':360,'height':900})
            p.locator('.knowledge-method summary').press('Enter')
            expect(p.locator('.knowledge-method')).to_have_attribute('open','')
            self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),360)
            p.evaluate('window.scrollTo(0,0)')
            p.screenshot(path=str(OUT/file.replace('.html','.png')),full_page=True)
        # 200% browser-equivalent reflow: 720 CSS px reduced to 360, plus 200% text zoom.
        p.evaluate("document.documentElement.style.fontSize='200%'")
        self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),360)

    def test_body_failure_and_no_initial_corpus_download(self):
        p=self.page
        seen=[]
        p.on('request',lambda r:seen.append(r.url))
        self.go('fragor-svar.html')
        self.assertFalse(any('/data/knowledge/answers/' in u for u in seen))
        p.route('**/data/knowledge/answers/pe.json',lambda r:r.fulfill(status=503,body='unavailable'))
        self.ask('Vad är P/E?')
        expect(p.locator('#knowledgeAskResult')).to_contain_text('Svaret kunde inte öppnas')
        self.assertEqual(p.evaluate('NTMKnowledgeCatalog.entries.filter(e=>e.fullAnswer).length'),0)

    def test_shared_calculator_help_preserves_fields_and_focus(self):
        p=self.page
        for file,answer in [('avkastningskalkylator.html','cagr'),('aktiekopskalkylator.html','gav'),('valutajusterad-avkastning.html','fx'),('ranta-pa-ranta.html','compounding'),('avgifter.html','annual-fees'),('isk-skattkalkylator.html','isk')]:
            self.go(file)
            p.set_viewport_size({'width':360,'height':900})
            trigger=p.locator(f'[data-knowledge-help={answer}]')
            trigger.locator('xpath=ancestor::details').locator('summary').click()
            before=p.locator('input').evaluate_all('(nodes)=>nodes.map(n=>[n.id,n.value])')
            trigger.click()
            expect(p.locator('#knowledgeHelp a')).to_be_visible()
            self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),360)
            p.keyboard.press('Escape')
            expect(trigger).to_be_focused()
            self.assertEqual(before,p.locator('input').evaluate_all('(nodes)=>nodes.map(n=>[n.id,n.value])'))

    def test_public_report_help_is_generic_and_preserves_frozen_content(self):
        p=self.page
        self.go('analys.html')
        p.evaluate("""()=>{const s=NTMPublicReport.project({company:'Synthetic company',ticker:'EX',thesis:'Synthetic author reasoning for a bounded terminology test.',analysisDate:'2026-09-18',basisDate:'2026-09-17'});const host=document.createElement('div');host.id='knowledgeReportFixture';document.querySelector('main').append(host);NTMPublicReportUI.render(host,s);}""")
        before=p.locator('#knowledgeReportFixture').text_content()
        p.locator('#knowledgeReportFixture .report-terminology summary').click()
        trigger=p.locator('#knowledgeReportFixture [data-knowledge-help=revenue]')
        trigger.click()
        expect(p.locator('#knowledgeHelp')).to_contain_text('Vad är revenue eller omsättning?')
        p.keyboard.press('Escape')
        expect(trigger).to_be_focused()
        self.assertEqual(before,p.locator('#knowledgeReportFixture').text_content())

    def test_cancel_slow_research_help_does_not_reopen_dialog(self):
        p=self.page
        pending=[]
        p.route('**/data/knowledge/answers/eps.json',lambda route:pending.append(route))
        self.go('research.html?ticker=NVDA')
        trigger=p.locator('#val-eps').locator('..').get_by_role('button')
        trigger.click()
        expect(p.locator('#wave1Help')).to_contain_text('Öppnar granskat svar')
        p.keyboard.press('Escape')
        expect(trigger).to_be_focused()
        self.assertEqual(len(pending),1)
        pending[0].fulfill(content_type='application/json',body=(ROOT/'data/knowledge/answers/eps.json').read_text(encoding='utf-8'))
        p.evaluate("NTMKnowledgeCatalog.load('eps')")
        expect(p.locator('#wave1Help')).not_to_be_visible()

    def test_synthetic_scale_browser(self):
        p=self.page
        rows=[]
        for size in [100,500,1200]:
            payload=subprocess.check_output([os.environ['NODE_BINARY'],'scripts/knowledge_scale.cjs','--fixture',str(size)],cwd=ROOT).decode('utf-8')
            script='window.NTMKnowledgeCatalog=NTMKnowledgeCore.create('+payload+');'
            p.route('**/knowledge-catalog.js',lambda r:r.fulfill(content_type='text/javascript',body=script))
            p.set_viewport_size({'width':390,'height':900})
            start=time.perf_counter()
            self.go('fragor-svar.html')
            elapsed=(time.perf_counter()-start)*1000
            expect(p.locator('[data-knowledge-card]')).to_have_count(0)
            timings=p.evaluate("""()=>{const K=NTMKnowledgeCatalog,measure=fn=>{const a=[];for(let i=0;i<100;i++){let t=performance.now();fn();a.push(performance.now()-t);}a.sort((a,b)=>a-b);return {p95Ms:a[95],medianMs:a[50]};};return {search:measure(()=>K.search('vinst')),ask:measure(()=>K.respond('Vad är P/E?')),askNoCoverage:measure(()=>K.respond('unknownterm')),askTypo:measure(()=>K.respond('diversifierinh')),category:measure(()=>K.search('','metrics').slice(0,12)),memory:performance.memory?.usedJSHeapSize||null};}""")
            p.locator('#knowledgeCategory').select_option('metrics')
            self.assertLessEqual(p.locator('[data-knowledge-card]:visible').count(),12)
            expect(p.locator('#category-metrics .knowledge-list > a')).to_be_visible()
            self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),390)
            rows.append({'size':size,'loadMs':elapsed,'payloadBytes':len(script.encode('utf-8')),**timings})
            p.unroute('**/knowledge-catalog.js')
        (OUT/'browser-scale.json').write_text(json.dumps({'browser':self.browser.version,'method':'Localhost Chromium; synthetic index route only; no synthetic files staged; CSS viewport 390; 100 warmed retrieval samples.','rows':rows},indent=2),encoding='utf-8')

if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    unittest.main(verbosity=2)
