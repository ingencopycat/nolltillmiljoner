"""Wave 1 production-page journeys in fresh browser contexts; no real accounts."""
import json
import os
from pathlib import Path
import unittest
from research_navigation import open_research_workspace
from playwright.sync_api import expect
import browser_smoke as smoke

OUT = Path(os.getenv('NTM_WAVE1_QA', str(Path(__file__).resolve().parents[1] / 'docs/qa/roadmap-wave1')))

class Wave1(unittest.TestCase):
    setUpClass = classmethod(smoke.BrowserSmoke.setUpClass.__func__)
    tearDownClass = classmethod(smoke.BrowserSmoke.tearDownClass.__func__)
    def setUp(self):
        self.context=self.browser.new_context(accept_downloads=True,viewport={'width':1440,'height':1000})
        self.page=self.context.new_page()
        self.page.set_default_timeout(15000)
        self.errors=[]
        self.dialogs=[]
        self.accept_dialogs=True
        self.page.on('pageerror',lambda error:self.errors.append(str(error)))
        def on_dialog(d):
            self.dialogs.append(d.type)
            d.accept() if self.accept_dialogs else d.dismiss()
        self.page.on('dialog',on_dialog)
        self.requests=[]
        self.context.on('request',lambda r:self.requests.append(r.url+' '+(r.post_data or '')))
    tearDown = smoke.BrowserSmoke.tearDown
    go = smoke.BrowserSmoke.go
    wait_for = smoke.BrowserSmoke.wait_for
    open_research_workspace = smoke.BrowserSmoke.open_research_workspace
    open_depth_for = smoke.BrowserSmoke.open_depth_for

    def research(self):
        self.go('research.html?ticker=NVDA')
        open_research_workspace(self.page,'#valuationSection')
        expect(self.page.locator('#val-eps')).to_have_value('7.91')

    def handoff(self):
        open_research_workspace(self.page,'#valuationSection')
        with self.context.expect_page() as event:
            self.page.get_by_role('button', name='Pröva Base i värderingskalkylatorn').click()
        other = event.value
        other.wait_for_load_state()
        other.on('pageerror', lambda error: self.errors.append(str(error)))
        other.on('dialog',lambda d:d.accept())
        expect(other.locator('#wave1Preview')).to_be_visible()
        return other

    def test_help_preserves_private_work_focus_and_full_article_return(self):
        self.research()
        p = self.page
        open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('PRIVATE WAVE1 UNSAVED reasoning sentinel')
        open_research_workspace(p, '#val-price');p.locator('#val-price').fill('133.37')
        before = p.evaluate("localStorage.getItem('investment-research-theses-v1')")
        trigger = p.locator('#val-eps').locator('..').get_by_role('button')
        trigger.click()
        expect(p.locator('#wave1Help')).to_contain_text('EPS betyder vinst per aktie')
        p.keyboard.press('Tab')
        self.assertTrue(p.evaluate('wave1Help.contains(document.activeElement)'))
        with self.context.expect_page() as event:
            p.get_by_role('link', name='Läs hela svaret').click()
        article = event.value
        article.wait_for_load_state()
        self.assertIsNone(article.evaluate('window.opener'))
        expect(article.locator('main')).to_contain_text('ursprungliga arbete ligger kvar')
        expect(article.get_by_role('link', name='Träna i Academy',exact=True)).to_have_attribute('href','academy-activity-check-eps-0.html')
        article.close()
        p.keyboard.press('Escape')
        expect(trigger).to_be_focused()
        expect(p.locator('#thesis-text')).to_have_value('PRIVATE WAVE1 UNSAVED reasoning sentinel')
        expect(p.locator('#val-price')).to_have_value('133.37')
        self.assertEqual(p.evaluate("localStorage.getItem('investment-research-theses-v1')"), before)
        self.assertNotIn('PRIVATE',p.url)
        self.assertFalse(any('PRIVATE WAVE1' in r for r in self.requests))

    def test_preview_explicit_apply_provenance_and_calculation(self):
        self.research()
        p = self.page
        open_research_workspace(p, '#val-price');p.locator('#val-price').fill('123.45')
        open_research_workspace(p, '#sc-base-growth');p.locator('#sc-base-growth').fill('12')
        open_research_workspace(p, '#sc-base-pe');p.locator('#sc-base-pe').fill('22')
        open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('PRIVATE SOURCE ONLY')
        p.evaluate("sessionStorage.setItem('private-sentinel','DO-NOT-COPY')")
        before = p.evaluate("localStorage.getItem('investment-research-theses-v1')")
        dest = self.handoff()
        self.assertIsNone(dest.evaluate('window.opener'))
        self.assertIsNone(dest.evaluate("sessionStorage.getItem('private-sentinel')"))
        stored = dest.evaluate('JSON.stringify(sessionStorage)')
        self.assertNotIn('PRIVATE', stored)
        self.assertNotIn('123.45',dest.url)
        expect(dest.locator('#stock-price')).to_have_value('100')
        expect(dest.locator('#stock-currency')).to_have_value('SEK')
        expect(dest.locator('#wave1Preview')).to_contain_text('inte verifierad')
        dest.get_by_role('button',name='Använd dessa antaganden').click()
        expect(dest.locator('#stock-price')).to_have_value('100')
        dest.locator('#wave1Replace').check()
        dest.locator('#stock-price').fill('999')
        expect(dest.locator('#wave1Replace')).not_to_be_checked()
        dest.locator('#wave1Replace').check()
        dest.get_by_role('button',name='Använd dessa antaganden').click()
        for field,value in [('stock-price','123.45'),('stock-eps','7.91'),('stock-growth','12'),('stock-future-pe','22'),('stock-currency','USD')]:
            expect(dest.locator('#'+field)).to_have_value(value)
        expect(dest.locator('#wave1Preview')).to_contain_text('Välj Beräkna')
        self.assertIsNone(dest.evaluate("sessionStorage.getItem(NTMWave1Context.key)"))
        dest.locator('#stock-valuation-form button[type=submit]').click()
        # Independent base-scenario arithmetic, not the production formula API.
        expected = 7.91 * (1.12 ** 5) * 22
        result = dest.locator('#stock-target-result').inner_text()
        import re
        actual=float(re.sub(r'[^0-9,.]', '', result).replace(',','.'))
        self.assertAlmostEqual(actual,expected,delta=.011)
        self.assertEqual(p.evaluate("localStorage.getItem('investment-research-theses-v1')"),before)
        expect(p.locator('#thesis-text')).to_have_value('PRIVATE SOURCE ONLY')
        self.assertFalse(any('PRIVATE SOURCE' in r for r in self.requests))
        dest.reload()
        expect(dest.locator('#wave1Preview')).to_have_count(0)

    def test_expiry_malformed_unknown_company_units_and_cancel_leave_values_untouched(self):
        self.research()
        mutations = ["r.payload.expiresAt=0", "r.payload.company.ticker='SOFI'", "r.payload.basis.epsUnit='SEK/share'", "r.payload.inputs.eps=-1", "r.payload.schemaVersion=9", "r.payload.privateText='leak'", "r.payload.basis.periodEnd='2026-02-30'"]
        for mutation in mutations:
            dest = self.handoff()
            dest.evaluate("""mutation=>{const k=NTMWave1Context.key;const r=JSON.parse(sessionStorage.getItem(k));
                // Test fixtures only; production has no eval.
                window.__fixture=r;}""", mutation)
            dest.evaluate('()=>{const r=window.__fixture;'+mutation+';sessionStorage.setItem(NTMWave1Context.key,JSON.stringify(r));}')
            dest.locator('#wave1Replace').check()
            dest.get_by_role('button',name='Använd dessa antaganden').click()
            expect(dest.locator('#wave1Preview')).to_contain_text('Ingen överföring tillämpad')
            expect(dest.locator('#stock-price')).to_have_value('100')
            dest.close()
        dest = self.handoff()
        dest.reload()
        expect(dest.locator('#wave1Preview')).to_contain_text('Förhandsgranska')
        dest.get_by_role('button',name='Avstå från överföringen').click()
        expect(dest.locator('#stock-price')).to_have_value('100')
        dest.close()
        self.go('aktievarderingskalkylator.html#handoff=11111111-1111-4111-8111-111111111111')
        expect(self.page.locator('#wave1Preview')).to_contain_text('Ingen överföring tillämpad')

    def test_negative_empty_eps_and_popup_failure(self):
        self.research()
        p=self.page
        for value in ['0','-1','']:
            open_research_workspace(p, '#val-eps');p.locator('#val-eps').fill(value)
            p.get_by_role('button',name='Pröva Base i värderingskalkylatorn').click()
            expect(p.locator('#valuationSection .wave1-context')).to_contain_text('positiv EPS')
        open_research_workspace(p, '#val-eps');p.locator('#val-eps').fill('4')
        p.evaluate('window.open=()=>null')
        p.get_by_role('button',name='Pröva Base i värderingskalkylatorn').click()
        expect(p.locator('#valuationSection .wave1-context')).to_contain_text('Tillåt en ny flik')
        expect(p.locator('#val-eps')).to_have_value('4')

    def test_unavailable_data_manual_company_and_storage_failure(self):
        self.research()
        p=self.page
        p.evaluate("currentStockData.valuationBase.ttmDilutedEps.qualityStatus='unavailable'")
        p.get_by_role('button',name='Pröva Base i värderingskalkylatorn').click()
        expect(p.locator('#valuationSection .wave1-context')).to_contain_text('Användbar EPS saknas')
        open_research_workspace(p, '#val-eps');p.locator('#val-eps').fill('4')
        p.evaluate("""() => {const open=window.open.bind(window);window.open=(...args)=>{
          const child=open(...args);child.Storage.prototype.setItem=()=>{throw Error('Lagring blockerad i test');};return child;
        }}""")
        p.get_by_role('button',name='Pröva Base i värderingskalkylatorn').click()
        expect(p.locator('#valuationSection .wave1-context')).to_contain_text('Lagring blockerad')
        expect(p.locator('#val-eps')).to_have_value('4')
        p.goto(self.base+'/research.html?ticker=XYZ',wait_until='domcontentloaded')
        expect(p.locator('#thesis-text')).to_be_visible()
        result=p.evaluate("()=>{try{NTMWave1Research();return 'unexpected';}catch(e){return e.message;}}")
        self.assertIn('Research-data',result)

    def test_help_mobile_themes_keyboard_contrast_and_screenshots(self):
        OUT.mkdir(parents=True,exist_ok=True)
        records=[]
        for theme in ['light','dark']:
            for width in [1440,390,320]:
                for route,field in [('research.html?ticker=NVDA','val-eps'),('aktievarderingskalkylator.html','stock-eps'),('sparmalskalkylator.html','goal-monthly-fee')]:
                    self.go(route)
                    p=self.page
                    p.set_viewport_size({'width':width,'height':900})
                    p.evaluate('applyTheme',theme)
                    open_research_workspace(p,'#'+field)
                    trigger=p.locator('#'+field).locator('..').get_by_role('button')
                    trigger.click()
                    expect(p.locator('#wave1Help')).to_be_visible()
                    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width)
                    self.assertTrue(p.evaluate('wave1Help.scrollWidth<=wave1Help.clientWidth'))
                    contrast=p.evaluate('''() => {
                      const rgb=c=>c.match(/[\\d.]+/g).slice(0,3).map(Number);
                      const lum=c=>rgb(c).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
                      const bg=lum(getComputedStyle(wave1Help).backgroundColor);
                      return [...wave1Help.querySelectorAll('p,a,button,h2,summary')].filter(e=>e.getClientRects().length).map(e=>{
                        const s=getComputedStyle(e),a=lum(s.color),b=s.backgroundColor==='rgba(0, 0, 0, 0)'?bg:lum(s.backgroundColor);
                        return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
                      });
                    }''')
                    self.assertGreaterEqual(min(contrast),4.5)
                    for _ in range(9):
                        p.keyboard.press('Tab')
                        self.assertTrue(p.evaluate('wave1Help.contains(document.activeElement)'))
                    p.screenshot(path=str(OUT/f'{field}-{theme}-{width}.png'))
                    records.append({'route':route,'theme':theme,'width':width,'overflow':False,'focusContained':True,'minimumTextContrast':min(contrast)})
                    p.keyboard.press('Escape')
                    expect(trigger).to_be_focused()
        (OUT/'journeys.json').write_text(json.dumps(records,indent=2),encoding='utf-8')

    def test_preview_mobile_and_refresh_guard(self):
        self.go('aktievarderingskalkylator.html')
        self.research()
        p=self.page
        open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('PRIVATE refresh protection')
        self.accept_dialogs=False
        try:p.reload(timeout=3000)
        except Exception:pass  # Dismissed beforeunload deliberately aborts navigation.
        self.assertEqual(self.dialogs,['beforeunload'])
        expect(p.locator('#thesis-text')).to_have_value('PRIVATE refresh protection')
        # Back within mounted workspaces preserves the draft without a leave prompt.
        p.go_back()  # thesis -> valuation
        p.go_back()  # valuation -> overview
        expect(p.locator('#thesis-text')).to_have_value('PRIVATE refresh protection')
        self.assertEqual(self.dialogs,['beforeunload'])
        try:p.go_back(timeout=3000)
        except Exception:pass  # Back is also cancelled through the same leave guard.
        self.assertEqual(self.dialogs,['beforeunload','beforeunload'])
        expect(p.locator('#thesis-text')).to_have_value('PRIVATE refresh protection')
        OUT.mkdir(parents=True,exist_ok=True)
        dest=self.handoff()
        for theme in ['dark','light']:
            dest.evaluate('applyTheme',theme)
            for width in [1440,390,320]:
                dest.set_viewport_size({'width':width,'height':900})
                self.assertLessEqual(dest.evaluate('document.documentElement.scrollWidth'),width)
                dest.locator('#wave1Preview').screenshot(path=str(OUT/f'preview-{theme}-{width}.png'))

if __name__=='__main__':
    unittest.main()
