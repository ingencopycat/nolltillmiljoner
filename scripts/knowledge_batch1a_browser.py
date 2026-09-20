"""Six reviewed objects and their bounded shared-help integrations; local fixtures only."""
from pathlib import Path
import unittest
from playwright.sync_api import expect
import browser_smoke as smoke

OUT=Path(__file__).resolve().parents[1]/'docs/qa/knowledge-batch1a/browser'
IDS=['balance-sheet','income-statement','cash-flow-statement','profit-versus-cash','capex','working-capital']

class Batch1A(unittest.TestCase):
    setUpClass=classmethod(smoke.BrowserSmoke.setUpClass.__func__)
    tearDownClass=classmethod(smoke.BrowserSmoke.tearDownClass.__func__)
    setUp=smoke.BrowserSmoke.setUp
    tearDown=smoke.BrowserSmoke.tearDown
    go=smoke.BrowserSmoke.go
    wait_for=smoke.BrowserSmoke.wait_for

    def test_six_pages_mobile_themes_keyboard_sources_and_reflow(self):
        OUT.mkdir(parents=True,exist_ok=True)
        p=self.page
        for width in [360,390,430]:
            for theme in ['light','dark']:
                p.set_viewport_size({'width':width,'height':900})
                p.emulate_media(reduced_motion='reduce')
                for id in IDS:
                    self.go('fragor-svar-'+id+'.html')
                    p.evaluate('applyTheme',theme)
                    expect(p.locator('h1')).to_have_count(1)
                    self.assertEqual({s.strip() for s in p.locator('meta[name=robots]').get_attribute('content').split(',')},{'noindex','follow'})
                    p.locator('.knowledge-method summary').focus()
                    p.keyboard.press('Enter')
                    expect(p.locator('.knowledge-method')).to_have_attribute('open','')
                    self.assertGreater(p.locator('.knowledge-method a').count(),0)
                    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width)
                p.evaluate('scrollTo(0,0)')
                p.screenshot(path=str(OUT/f'working-capital-{width}-{theme}.png'),full_page=True)
        self.go('fragor-svar-profit-versus-cash.html')
        p.set_viewport_size({'width':360,'height':900})
        p.evaluate("document.documentElement.style.fontSize='200%'")
        expect(p.locator('table caption')).to_be_visible()
        p.screenshot(path=str(OUT/'comparison-text-zoom.png'),full_page=True)
        overflow=p.evaluate("[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>360).map(e=>({tag:e.tagName,text:e.textContent.slice(0,60),right:e.getBoundingClientRect().right}))")
        self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),360,str(overflow))

    def test_keyboard_retrieval_neutral_limits_and_no_javascript_pages(self):
        p=self.page;self.go('fragor-svar.html')
        for q,text in [('Vad visar en balansräkning?','ögonblicksbild'),('Vad visar en resultaträkning?','Vinst är inte'),('Vad visar en kassaflödesanalys?','finansieringsverksamhet'),('Varför kan vinst och kassaflöde skilja sig?','inte ett automatiskt gott eller dåligt tecken'),('Är hög CapEx dåligt?','inte automatiskt dåligt'),('Är ökande lager dåligt?','inte automatiskt bra')]:
            p.locator('#question').fill(q);p.locator('#question').press('Enter')
            expect(p.locator('#answer')).to_have_attribute('data-outcome','ANSWER')
            expect(p.locator('#answer')).to_contain_text(text)
        for q in ['Är mycket cash alltid bra?','Är positivt kassaflöde en bra aktie?','Ska jag köpa ett bolag med hög CapEx?']:
            p.locator('#question').fill(q);p.locator('#question').press('Enter')
            expect(p.locator('#answer')).to_have_attribute('data-outcome','ABSTAIN_UNSUPPORTED_JUDGMENT')
        context=self.browser.new_context(java_script_enabled=False)
        try:
            page=context.new_page()
            for id in IDS:
                page.goto(self.base+'/fragor-svar-'+id+'.html')
                expect(page.locator('h1')).to_be_visible()
                page.locator('.knowledge-method summary').click()
                expect(page.locator('.knowledge-method a').first).to_be_visible()
        finally:context.close()

    def test_shared_research_academy_and_frozen_report_help(self):
        p=self.page;self.go('research.html?ticker=NVDA')
        trigger=p.locator('[data-wave1-concept=cash-flow-statement]')
        trigger.locator('xpath=ancestor::details').locator('summary').click()
        before=p.locator('input').evaluate_all('(nodes)=>nodes.map(n=>[n.id,n.value])')
        trigger.click()
        expect(p.locator('#wave1Help')).to_contain_text('Vad visar en kassaflödesanalys?')
        p.keyboard.press('Escape');expect(trigger).to_be_focused()
        self.assertEqual(before,p.locator('input').evaluate_all('(nodes)=>nodes.map(n=>[n.id,n.value])'))
        self.go('academy.html#competency=per-share')
        p.get_by_role('button',name='Försök utan hjälp').click()
        p.locator('#competencyAttempt input[name=number]').fill('2.72')
        p.get_by_role('button',name='Förklara med Knowledge').click()
        expect(p.locator('#competencyKnowledge')).to_contain_text('Vad visar en resultaträkning?')
        expect(p.locator('#competencyAttempt input[name=number]')).to_have_value('2.72')
        p.locator('#competencyAttempt input[value="1"]').check()
        p.locator('#competencyAttempt [type=submit]').click()
        self.assertFalse(p.evaluate('!!NTMAcademyEvidence.derive(NTMAcademyProgress.read().data)[0].first'))
        self.go('analys.html')
        p.evaluate("""()=>{const s=NTMPublicReport.project({company:'Synthetic company',ticker:'EX',thesis:'Synthetic author reasoning for a bounded terminology test.',analysisDate:'2026-09-19',basisDate:'2026-09-18'});const h=document.createElement('div');h.id='batch1aReport';document.querySelector('main').append(h);NTMPublicReportUI.render(h,s);}""")
        before=p.locator('#batch1aReport').text_content()
        p.locator('#batch1aReport .report-terminology summary').click()
        trigger=p.locator('#batch1aReport [data-knowledge-help=profit-versus-cash]');trigger.click()
        expect(p.locator('#knowledgeHelp')).to_contain_text('Varför kan vinst och kassaflöde skilja sig?')
        p.keyboard.press('Escape');expect(trigger).to_be_focused()
        self.assertEqual(before,p.locator('#batch1aReport').text_content())

if __name__=='__main__':unittest.main(verbosity=2)
