"""Actual 100-object corpus, bounded help and local browser regression evidence."""
import json,time,unittest
from pathlib import Path
from playwright.sync_api import expect
import browser_smoke as smoke
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/qa/knowledge-expansion/browser'
BEFORE=json.loads((ROOT/'docs/qa/knowledge-expansion/before.json').read_text(encoding='utf-8'))
OLD={e['id'] for e in BEFORE['entries']}
IDS=[p.stem for p in (ROOT/'docs/internal/knowledge/answers').glob('*.json') if p.stem not in OLD]

class Expansion(unittest.TestCase):
    setUpClass=classmethod(smoke.BrowserSmoke.setUpClass.__func__)
    tearDownClass=classmethod(smoke.BrowserSmoke.tearDownClass.__func__)
    setUp=smoke.BrowserSmoke.setUp
    tearDown=smoke.BrowserSmoke.tearDown
    go=smoke.BrowserSmoke.go
    wait_for=smoke.BrowserSmoke.wait_for

    def test_actual_corpus_performance_and_lazy_payload(self):
        OUT.mkdir(parents=True,exist_ok=True);p=self.page;seen=[]
        p.on('request',lambda r:seen.append(r.url));p.set_viewport_size({'width':390,'height':900})
        t=time.perf_counter();self.go('fragor-svar.html');load=(time.perf_counter()-t)*1000
        self.assertFalse(any('/data/knowledge/answers/' in u for u in seen))
        result=p.evaluate("""()=>{const K=NTMKnowledgeCatalog,measure=fn=>{let a=[];for(let i=0;i<100;i++){let t=performance.now();fn();a.push(performance.now()-t)}a.sort((a,b)=>a-b);return {medianMs:a[50],p95Ms:a[95]}};return {count:K.entries.length,bodiesInitiallyLoaded:K.entries.filter(e=>e.fullAnswer).length,search:measure(()=>K.search('kassaflöde')),ask:measure(()=>K.respond('Vad är en ETF?')),abstention:measure(()=>K.respond('Ska jag köpa NVIDIA?')),category:measure(()=>K.search('','metrics').slice(0,12)),heapBytes:performance.memory?.usedJSHeapSize||null}}""")
        self.assertEqual(result['count'],100);self.assertEqual(result['bodiesInitiallyLoaded'],0)
        p.locator('#knowledgeSearch').fill('kassaflöde');self.assertLessEqual(p.locator('[data-knowledge-card]:visible').count(),12)
        p.locator('#knowledgeCategory').select_option('macro');self.assertLessEqual(p.locator('[data-knowledge-card]:visible').count(),12)
        (OUT/'actual-corpus-performance.json').write_text(json.dumps({'browser':self.browser.version,'method':'Local Chromium, 390 CSS px, no CPU/network throttle; 100 warmed synchronous samples, not a field-performance guarantee.','loadMs':load,'compactScriptBytes':(ROOT/'knowledge-catalog.js').stat().st_size,'allAnswerBodyBytes':sum(p.stat().st_size for p in (ROOT/'data/knowledge/answers').glob('*.json')),**result},indent=2),encoding='utf-8')

    def test_new_pages_mobile_sources_reflow_and_no_js(self):
        OUT.mkdir(parents=True,exist_ok=True);p=self.page;assert len(IDS)==59
        for width in [360,390,430]:
            for theme in ['light','dark']:
                p.set_viewport_size({'width':width,'height':900});p.emulate_media(reduced_motion='reduce')
                for id in IDS:
                    self.go('fragor-svar-'+id+'.html');p.evaluate('applyTheme',theme)
                    expect(p.locator('h1')).to_have_count(1)
                    self.assertIn('noindex',p.locator('meta[name=robots]').get_attribute('content'))
                    p.locator('.knowledge-method summary').focus();p.keyboard.press('Enter')
                    expect(p.locator('.knowledge-method a').first).to_be_visible()
                    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width,id)
                p.screenshot(path=str(OUT/f'new-page-{width}-{theme}.png'),full_page=True)
        for id in ['cpi-pce','fund-etf','ev-market-cap']:
            self.go('fragor-svar-'+id+'.html');p.set_viewport_size({'width':360,'height':900})
            p.evaluate("document.documentElement.style.fontSize='200%'")
            expect(p.locator('table caption')).to_be_visible();self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),360,id)
            p.screenshot(path=str(OUT/f'{id}-text-zoom.png'),full_page=True)
        context=self.browser.new_context(java_script_enabled=False)
        try:
            page=context.new_page()
            for id in IDS:
                page.goto(self.base+'/fragor-svar-'+id+'.html');expect(page.locator('h1')).to_be_visible()
                page.locator('.knowledge-method summary').click();expect(page.locator('.knowledge-method a').first).to_be_visible()
        finally:context.close()

    def test_required_journeys_and_context_preservation(self):
        p=self.page;self.go('fragor-svar.html')
        for question in ['Vad visar en balansräkning?','Varför kan vinst och kassaflöde skilja sig?','Är P/E 40 dyrt?','Vad skiljer P/E från P/S?','Hur mycket måste det stiga efter 50 procents fall?','Vad är en ETF?','CPI vs PCE','Betyder stark CPI att börsen faller?','Hur motbevisar jag min tes?','Vad är en fryst NTM-rapport?','Vad är köp- och säljspread?','Vad är courtage och hur påverkar det små köp?','diversifering']:
            p.locator('#knowledgeAskInput').fill(question);p.locator('#knowledgeAskInput').press('Enter')
            expect(p.locator('#knowledgeAskResult')).to_have_attribute('data-outcome','ANSWER')
        p.locator('#knowledgeAskInput').fill('Ska jag köpa en ETF?');p.locator('#knowledgeAskInput').press('Enter')
        expect(p.locator('#knowledgeAskResult')).to_have_attribute('data-outcome','ABSTAIN_UNSUPPORTED_JUDGMENT')
        for page,id in [('avgifter.html','fee-double-count'),('isk-skattkalkylator.html','isk-inputs'),('havstang.html','loss-recovery'),('makro.html','cpi-pce')]:
            self.go(page);trigger=p.locator('[data-knowledge-help='+id+']')
            trigger.locator('xpath=ancestor::details').locator('summary').click()
            before=p.locator('input').evaluate_all('(nodes)=>nodes.map(n=>[n.id,n.value])');trigger.click()
            expect(p.locator('#knowledgeHelp')).to_be_visible()
            if id=='cpi-pce':
                self.assertEqual(trigger.get_attribute('data-knowledge-context'),'macro')
                expect(p.locator('#knowledgeHelp')).to_contain_text('BLS')
            p.keyboard.press('Escape');expect(trigger).to_be_focused()
            self.assertEqual(before,p.locator('input').evaluate_all('(nodes)=>nodes.map(n=>[n.id,n.value])'))
        self.go('research.html?ticker=NVDA');trigger=p.locator('[data-wave1-concept=fact-assumption]')
        trigger.locator('xpath=ancestor::details').locator('summary').click();trigger.click()
        expect(p.locator('#wave1Help')).to_contain_text('antaganden');p.keyboard.press('Escape');expect(trigger).to_be_focused()

if __name__=='__main__':unittest.main(verbosity=2)
