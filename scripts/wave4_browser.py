"""Wave 4 local browser evidence; no external participant validation."""
import json
from datetime import datetime, timezone
from pathlib import Path
import unittest
from research_navigation import open_research_workspace
from playwright.sync_api import expect
import browser_smoke as smoke

OUT=Path(__file__).resolve().parents[1]/'docs/qa/roadmap-wave4'
class Wave4(unittest.TestCase):
    setUpClass=classmethod(smoke.BrowserSmoke.setUpClass.__func__)
    tearDownClass=classmethod(smoke.BrowserSmoke.tearDownClass.__func__)
    setUp=smoke.BrowserSmoke.setUp
    tearDown=smoke.BrowserSmoke.tearDown
    go=smoke.BrowserSmoke.go
    wait_for=smoke.BrowserSmoke.wait_for
    open_research_workspace = smoke.BrowserSmoke.open_research_workspace
    open_depth_for=smoke.BrowserSmoke.open_depth_for

    def test_profiles_mobile_themes_evidence_and_keyboard_help(self):
        OUT.mkdir(parents=True,exist_ok=True)
        for ticker in ['NVDA','SOFI','CRWD','CRWV','FLY']:
            for width in [1440,360,390,430]:
                for theme in ['light','dark']:
                    with self.subTest(ticker=ticker,width=width,theme=theme):
                        p=self.page;p.set_viewport_size({'width':width,'height':900});p.emulate_media(reduced_motion='reduce')
                        self.go('research.html?ticker='+ticker);p.evaluate('applyTheme',theme)
                        profile=p.locator('#fundamentalProfile');expect(profile).to_be_visible()
                        expect(profile.locator('article:visible')).to_have_count(3)
                        profile.locator('> details > summary').first.focus();p.keyboard.press('Enter')
                        expect(profile.locator('[data-source-dimension=perShare]')).to_contain_text('Otillräckligt underlag')
                        if ticker=='SOFI':expect(profile.locator('[data-source-dimension=cash]')).to_contain_text('undanhållet')
                        growth=profile.locator('[data-source-dimension=growth]')
                        expect(growth).to_contain_text('ntm-fundamental/1')
                        if ticker in ['NVDA','SOFI','CRWD']:
                            growth.get_by_role('button',name='Visa källuppgift',exact=False).first.click()
                            expect(p.locator('#provenanceDialog')).to_be_visible();p.keyboard.press('Escape')
                        self.open_depth_for('[data-concept-help=fcf]')
                        trigger=profile.locator('[data-concept-help=fcf]');trigger.focus();p.keyboard.press('Enter')
                        expect(p.locator('#wave1Help')).to_contain_text('FCF');p.keyboard.press('Escape');expect(trigger).to_be_focused()
                        self.assertTrue(p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
                        profile.locator('> details > summary').first.click()
                        profile.screenshot(path=str(OUT/f'{ticker}-{width}-{theme}.png'))

    def test_calendar_context_mobile_and_help_preserves_week(self):
        for route in ['makro.html','rapporter.html']:
            for width in [1440,360,390,430]:
                for theme in ['light','dark']:
                    with self.subTest(route=route,width=width,theme=theme):
                        p=self.page;p.set_viewport_size({'width':width,'height':900});p.emulate_media(reduced_motion='reduce')
                        self.go(route);p.evaluate('applyTheme',theme)
                        if route=='makro.html':
                            section=p.locator('#macroStructuredContent');expect(section).to_contain_text('Europe/Stockholm')
                            triggers=p.locator('[data-concept-help]');self.assertGreater(triggers.count(),0)
                            trigger=triggers.first;self.open_depth_for('[data-concept-help]');trigger.scroll_into_view_if_needed()
                            before=p.evaluate('({y:scrollY,url:location.href,text:currentWeekTitle.textContent})')
                            trigger.focus();p.keyboard.press('Enter');expect(p.locator('#wave1Help')).to_be_visible()
                            p.keyboard.press('Escape');expect(trigger).to_be_focused()
                            after=p.evaluate('({y:scrollY,url:location.href,text:currentWeekTitle.textContent})')
                            self.assertEqual(before['url'],after['url']);self.assertEqual(before['text'],after['text']);self.assertLess(abs(before['y']-after['y']),3)
                        else:
                            section=p.locator('#earnings-readable');expect(section).to_contain_text('Senast verifierad mot bolagens IR: okänt')
                            expect(section).to_contain_text('America/New_York')
                        self.assertTrue(p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
                        section.screenshot(path=str(OUT/f'{route[:-5]}-{width}-{theme}.png'))
        (OUT/'wave4-browser.json').write_text(json.dumps({'companies':['NVDA','SOFI','CRWD','CRWV','FLY'],'widths':[1440,360,390,430],'themes':['light','dark'],'keyboardHelp':'open, Escape, focus return','calendarPosition':'preserved','humanReview':'pending'},indent=2),encoding='utf-8')

    def test_annual_source_correction_acknowledges_once_preserves_original_and_stays_out_of_queue(self):
        p=self.page;self.go('research.html?ticker=NVDA')
        open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('Private original reasoning for source correction')
        open_research_workspace(p, '#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click()
        self.wait_for("()=>NTMThesisStorage.get('NVDA').thesis?.revisionCount===1")
        original=p.evaluate("NTMThesisStorage.get('NVDA').thesis.revisions[0]")
        data=json.loads((OUT.parents[2]/'data/stocks/NVDA.json').read_text(encoding='utf-8'))
        data['annual'][-1]['metrics']['revenue']['accession']='wave4-corrected-accession'
        self.context.route('**/data/stocks/NVDA.json',lambda route:route.fulfill(json=data))
        self.go('research.html?ticker=NVDA')
        self.open_depth_for('#reviewReasons');expect(p.locator('#reviewReasons')).to_contain_text('annual:revenue')
        self.open_depth_for('#changeDetectionContent');expect(p.locator('#changeDetectionContent')).to_contain_text('wave4-corrected-accession')
        self.open_depth_for('#review-keep');open_research_workspace(p, '#review-keep');p.locator('#review-keep').click()
        self.wait_for("()=>NTMThesisStorage.get('NVDA').thesis.revisionCount===2")
        self.assertEqual(p.evaluate("NTMThesisStorage.get('NVDA').thesis.revisions[0]"),original)
        self.go('research.html?ticker=NVDA');expect(p.locator('#reviewReasons')).not_to_contain_text('annual:revenue')
        self.go('min-ntm.html');expect(p.locator('#reviewQueue a')).to_have_count(0)

    def test_macro_revision_partial_retention_and_date_crossover(self):
        p=self.page;p.clock.set_fixed_time(datetime(2026,9,18,12,tzinfo=timezone.utc))
        payload={'meta':{'schemaVersion':2,'status':'partial','lastFetchAttempt':'2026-09-18T12:00:00Z','lastCompleteFetch':'2026-09-10T12:00:00Z','sources':{'BLS':'cached'}},
                 'macroWeeks':{'2026-W38':{'sourceTimezone':'America/New_York','events':[
                     {'id':'revision-fixture','eventName':'CPI','date':'2026-09-18','time':'23:30','actual':'3.0%','actualFirstReported':'3.1%',
                      'previous':'2.9%','previousFirstReported':'2.8%','forecast':None,'isRevised':True,
                      'fieldProvenance':{'actual':{'kind':'reported','source':'BLS','fetchedAt':'2026-09-10T12:00:00Z'},'previous':{'kind':'reported','revisionStatus':'revised'}}}]}},'earningsWeeks':{}}
        p.route('**/data/weekly-events.js',lambda r:r.fulfill(content_type='application/javascript',body='window.NTM_WEEKLY_EVENTS = '+json.dumps(payload)+';'))
        self.go('makro.html?week=2026-W38')
        event=p.locator('#event-revision-fixture');event.locator('summary').click()
        expect(event).to_contain_text('ursprungligt utfall 3.1%');expect(event).to_contain_text('Ursprungligt: 2.8%')
        expect(event).to_contain_text('2026-09-19');expect(event).to_contain_text('Prognos · Ej tillgänglig')
        p.get_by_text('Status per källa',exact=True).click();expect(p.locator('#macroStructuredContent')).to_contain_text('hämtning misslyckades')

if __name__=='__main__':unittest.main(verbosity=2)
