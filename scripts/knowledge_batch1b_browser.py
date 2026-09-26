"""Batch 1B local reviewed pages and existing shared contextual surfaces."""
from pathlib import Path
import unittest
from research_navigation import open_research_workspace
from playwright.sync_api import expect
import browser_smoke as smoke

OUT=Path(__file__).resolve().parents[1]/'docs/qa/knowledge-batch1b/browser'
IDS=['reported-adjusted','fcf-limitations','pe-interpretation','pe-losses','ps','pe-versus-ps']

class Batch1B(unittest.TestCase):
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
                    p.locator('.knowledge-method summary').focus();p.keyboard.press('Enter')
                    expect(p.locator('.knowledge-method')).to_have_attribute('open','')
                    self.assertGreater(p.locator('.knowledge-method a').count(),0)
                    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width,id)
                p.evaluate('scrollTo(0,0)')
                p.screenshot(path=str(OUT/f'pe-versus-ps-{width}-{theme}.png'),full_page=True)
        for id in ['reported-adjusted','pe-versus-ps']:
            self.go('fragor-svar-'+id+'.html')
            p.set_viewport_size({'width':360,'height':900})
            p.evaluate("document.documentElement.style.fontSize='200%'")
            expect(p.locator('table caption')).to_be_visible()
            p.screenshot(path=str(OUT/f'{id}-text-zoom.png'),full_page=True)
            self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),360,id)

    def test_keyboard_retrieval_intents_and_no_javascript(self):
        p=self.page;self.go('fragor-svar.html')
        for q,text in [('Är P/E 40 dyrt?','avgör inte ensamt'),('Är högt P/E dåligt?','inte automatiskt dåligt'),('Negativt P/E betyder billig aktie?','inte att aktien är superbillig'),('Vad är P/S?','inte till vinst'),('P/E eller P/S, vilken är bäst?','Inget av måtten är universellt bäst'),('Adjusted earnings är väl den riktiga vinsten?','inte automatiskt mer korrekt'),('Är högt FCF alltid bra?','inte automatiskt bra')]:
            p.locator('#question').fill(q);p.locator('#question').press('Enter')
            expect(p.locator('#answer')).to_have_attribute('data-outcome','ANSWER')
            expect(p.locator('#answer')).to_contain_text(text)
        for q in ['Ska jag köpa aktien med P/E 40?','Borde jag sälja mitt bolag med negativt P/E?','Är P/S 2 ett säkert köp?']:
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

    def test_research_valuation_and_frozen_report_help(self):
        p=self.page
        for page,id in [('research.html?ticker=NVDA','fcf-limitations'),('research.html?ticker=NVDA','pe-interpretation'),('aktievarderingskalkylator.html','pe-interpretation')]:
            self.go(page)
            open_research_workspace(p,'[data-wave1-concept='+id+']')
            trigger=p.locator('[data-wave1-concept='+id+']')
            trigger.locator('xpath=ancestor::details').locator('summary').click()
            before=p.locator('input').evaluate_all('(nodes)=>nodes.map(n=>[n.id,n.value])')
            trigger.click();expect(p.locator('#wave1Help')).to_be_visible()
            expect(p.locator('#wave1Help')).to_contain_text('automatiskt')
            p.keyboard.press('Escape');expect(trigger).to_be_focused()
            self.assertEqual(before,p.locator('input').evaluate_all('(nodes)=>nodes.map(n=>[n.id,n.value])'))
        self.go('analys.html')
        p.evaluate("""()=>{const s=NTMPublicReport.project({company:'Synthetic company',ticker:'EX',thesis:'Synthetic author reasoning for a bounded terminology test.',analysisDate:'2026-09-19',basisDate:'2026-09-18'});window.batch1bSnapshot=JSON.stringify(s);const h=document.createElement('div');h.id='batch1bReport';document.querySelector('main').append(h);NTMPublicReportUI.render(h,s);window.batch1bSource=s;}""")
        before=p.locator('#batch1bReport').text_content()
        p.locator('#batch1bReport .report-terminology summary').click()
        trigger=p.locator('#batch1bReport [data-knowledge-help=reported-adjusted]');trigger.click()
        expect(p.locator('#knowledgeHelp')).to_contain_text('Vad skiljer rapporterad från justerad vinst?')
        p.keyboard.press('Escape');expect(trigger).to_be_focused()
        self.assertEqual(before,p.locator('#batch1bReport').text_content())
        self.assertTrue(p.evaluate('batch1bSnapshot===JSON.stringify(batch1bSource)'))

if __name__=='__main__':unittest.main(verbosity=2)
