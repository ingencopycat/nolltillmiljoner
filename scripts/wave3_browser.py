"""Wave 3 local synthetic learning journeys. Clock fixtures are not human learning evidence."""
import json
import os
from pathlib import Path
import unittest
from playwright.sync_api import expect
import browser_smoke as smoke

OUT=Path(__file__).resolve().parents[1]/'docs/qa/roadmap-wave3'
class Wave3(unittest.TestCase):
    setUpClass=classmethod(smoke.BrowserSmoke.setUpClass.__func__)
    tearDownClass=classmethod(smoke.BrowserSmoke.tearDownClass.__func__)
    setUp=smoke.BrowserSmoke.setUp
    tearDown=smoke.BrowserSmoke.tearDown
    go=smoke.BrowserSmoke.go
    wait_for=smoke.BrowserSmoke.wait_for
    open_research_workspace = smoke.BrowserSmoke.open_research_workspace
    open_depth_for=smoke.BrowserSmoke.open_depth_for

    def competency(self,id):
        self.go('academy.html#competency='+id)
        expect(self.page.locator('#competencyWorkspace')).to_be_visible()

    def answer(self,value,choice):
        self.page.locator('#competencyAttempt input[name=number]').fill(str(value))
        self.page.locator(f'#competencyAttempt input[value="{choice}"]').check()
        self.page.locator('#competencyAttempt [type=submit]').click()

    def next(self):self.page.get_by_role('button',name='Se mitt nästa steg').click()

    def popup(self,label):
        with self.context.expect_page() as event:self.page.get_by_role('button',name=label).click()
        child=event.value;child.wait_for_load_state();child.on('pageerror',lambda e:self.errors.append(str(e)));child.on('dialog',lambda d:d.accept())
        expect(child.locator('#academyScenarioPreview')).to_be_visible()
        self.assertIsNone(child.evaluate('window.opener'))
        raw=child.evaluate("sessionStorage.getItem('ntm-wave1-handoff-v1')")
        for key in ['answer','correct','explanation','independent','thesis','account']:
            self.assertNotIn(key,raw)
        return child

    def apply(self,child):
        child.locator('#academyScenarioConsent').check()
        child.get_by_role('button',name='Använd övningsvärdena').click()
        expect(child.locator('#academyScenarioPreview')).to_contain_text('Ingen förståelse registreras')

    def test_independent_help_reveal_retry_and_novel_variant(self):
        self.competency('per-share');p=self.page
        p.get_by_role('button',name='Försök utan hjälp').click()
        p.locator('#competencyAttempt input[name=number]').fill('2.72')
        p.get_by_role('button',name='Förklara med Knowledge').click()
        expect(p.locator('#competencyKnowledge')).to_contain_text('EPS')
        self.assertNotIn('2.723',p.locator('#competencyKnowledge').inner_text())
        expect(p.locator('#competencyAttempt input[name=number]')).to_have_value('2.72')
        self.answer(2.72,1);self.next()
        self.assertFalse(p.evaluate("!!NTMAcademyEvidence.derive(NTMAcademyProgress.read().data)[0].first"))
        p.get_by_role('button',name='Repetera första exemplet').click()
        p.get_by_role('button',name='Visa svaret och öva').click()
        self.answer(2.72,1);self.next()
        self.assertFalse(p.evaluate("!!NTMAcademyEvidence.derive(NTMAcademyProgress.read().data)[0].first"))
        p.get_by_role('button',name='Försök utan hjälp').click();self.answer(2.70677,1);self.next()
        self.assertTrue(p.evaluate("!!NTMAcademyEvidence.derive(NTMAcademyProgress.read().data)[0].first"))
        expect(p.locator('#competencyWorkspace')).to_contain_text('Övat')
        self.assertEqual(p.evaluate('NTMAcademyProgression.derive(NTMAcademyProgress.read().data).xp'),0)

    def test_valuation_application_preview_explicit_apply_and_safe_return(self):
        self.competency('valuation-return');p=self.page
        p.get_by_role('button',name='Försök utan hjälp').click();self.answer(9.68777,1);self.next()
        p.get_by_role('button',name='Tillämpa i ett nytt exempel').click()
        child=self.popup('Öppna syntetiskt kalkylatorexempel')
        child.locator('#stock-price').fill('777')
        child.get_by_role('button',name='Använd övningsvärdena').click()
        expect(child.locator('#stock-price')).to_have_value('777')
        child.locator('#academyScenarioConsent').check();child.locator('#stock-price').fill('888')
        expect(child.locator('#academyScenarioConsent')).not_to_be_checked()
        self.apply(child);expect(child.locator('#stock-price')).to_have_value('108')
        child.locator('#stock-valuation-form [type=submit]').click()
        self.assertAlmostEqual(child.evaluate('calculateStockScenario(108,5,10,5,24).cagr*100'),12.342525636,places=7)
        child.get_by_role('button',name='Stäng övningsfliken och återgå').click()
        self.answer(12.3425256,0);self.next()
        expect(p.locator('#competencyWorkspace')).to_contain_text('Senare återblick tidigast')
        state=p.evaluate("NTMAcademyEvidence.derive(NTMAcademyProgress.read().data).find(s=>s.id==='valuation-return')")
        self.assertEqual(state['state'],'practiced');self.assertEqual(len(state['applications']),1)
        self.assertFalse(state['applications'][0]['independent'])

    def test_fx_real_savings_application_and_existing_plan_resume(self):
        self.competency('real-fx');p=self.page
        p.get_by_role('button',name='Försök utan hjälp').click();self.answer(3.3009709,0);self.next()
        p.get_by_role('button',name='Tillämpa i ett nytt exempel').click()
        fx=self.popup('Öppna syntetiskt kalkylatorexempel');self.apply(fx)
        fx.locator('#fx-calculator-form [type=submit]').click()
        self.assertAlmostEqual(fx.evaluate('calculateCurrencyAdjustedReturn({investmentReturnPct:16,currencyChangePct:-7,amount:10000}).adjReturnPct'),7.88)
        fx.close()
        goal=self.popup('Pröva köpkraft i sparmål');self.apply(goal)
        goal.locator('#goal-calculator-form [type=submit]').click()
        expect(goal.locator('#capital-result')).to_contain_text('10')
        self.assertAlmostEqual(goal.evaluate('latestGoalPlan.target'),10373.076923076924,places=7)
        goal.locator('#followup-name').evaluate("e=>{for(let p=e;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true}")
        goal.locator('#followup-name').fill('Synthetic Academy plan')
        goal.locator('#followup-start').fill('2026-09-18')
        goal.locator('#followup-save-plan').click()
        original=goal.evaluate('NTMScenarioStorage.get("sparmal").scenarios[0].followup.plan')
        plan_id=goal.locator('#followup-plan').input_value()
        goal.reload();goal.locator('#followup-plan').select_option(plan_id)
        expect(goal.locator('#followup-original')).to_contain_text('Originalplan från 2026-09-18')
        self.assertEqual(goal.evaluate('NTMScenarioStorage.get("sparmal").scenarios[0].followup.plan'),original)
        goal.close();self.answer(10373.08,0);self.next()
        self.assertEqual(p.evaluate("NTMAcademyEvidence.derive(NTMAcademyProgress.read().data).find(s=>s.id==='real-fx').applications.length"),1)

    def test_clock_fixture_delayed_success_then_failure_keeps_history(self):
        self.competency('per-share');p=self.page
        p.evaluate("""()=>{const E=NTMAcademyEvidence,now=Date.now(),old=now-8*86400000;let a=E.start('per-share-v1',old);E.record(a,'submit',true,old+2);a=E.start('per-share-v3',old+10);E.record(a,'help',false,old+11);E.record(a,'submit',true,old+12);} """)
        p.reload();p.get_by_role('button',name='Gör en senare återblick').click();self.answer(2.6619718,1);self.next()
        expect(p.locator('#competencyWorkspace')).to_contain_text('Visat förståelse')
        before=p.evaluate('NTMAcademyProgress.read().data.attempts.length')
        p.evaluate("()=>{const id=NTMAcademyEvidence.start('per-share-v6');NTMAcademyEvidence.record(id,'submit',false)}")
        p.reload();expect(p.locator('#competencyWorkspace')).to_contain_text('En senare återblick gick inte rätt')
        self.assertGreater(p.evaluate('NTMAcademyProgress.read().data.attempts.length'),before)
        self.go('min-ntm.html');expect(p.locator('#academyMiniHeading').locator('..').locator('[data-next-activity]')).to_contain_text('Bolagets tillväxt')

    def test_malformed_expired_wrong_destination_and_no_silent_apply(self):
        self.go('aktievarderingskalkylator.html')
        p=self.page
        for mode in ['unknown','expired','units','destination','answer']:
            with self.subTest(mode=mode):
                p.evaluate("""mode=>{const C=NTMWave1Context,token='11111111-1111-4111-8111-111111111111',v=C.createPractice({competency:'valuation-return',task:'valuation-return-v3',version:1},{destination:'valuation-simple',inputs:{price:108,eps:5,growth:10,years:5,multiple:24}});if(mode==='unknown')v.schemaVersion=99;if(mode==='expired'){v.createdAt-=C.ttl;v.expiresAt-=C.ttl;}if(mode==='units')v.units='SEK';if(mode==='destination')v.destination='fx-percent';if(mode==='answer')v.correct=true;sessionStorage.setItem(C.key,JSON.stringify({token,payload:v}));} """,mode)
                self.go('aktievarderingskalkylator.html#practice=11111111-1111-4111-8111-111111111111')
                p.reload();expect(p.locator('#academyScenarioPreview')).to_contain_text('Ingen övning tillämpad')
                expect(p.locator('#stock-price')).to_have_value('100')

    def test_mobile_themes_keyboard_help_and_bounded_navigation(self):
        OUT.mkdir(parents=True,exist_ok=True)
        for width in [360,390,430]:
            for theme in ['light','dark']:
                with self.subTest(width=width,theme=theme):
                    p=self.page;p.emulate_media(reduced_motion='reduce');p.set_viewport_size({'width':width,'height':844});self.competency('per-share')
                    p.evaluate('localStorage.clear()');p.reload();p.evaluate('applyTheme',theme)
                    expect(p.locator('[data-competency]')).to_have_count(3)
                    p.get_by_role('button',name='Försök utan hjälp').click()
                    p.locator('#competencyAttempt input[name=number]').fill('2.72308')
                    radio=p.locator('#competencyAttempt input[value="1"]');radio.focus();p.keyboard.press('Space');expect(radio).to_be_checked()
                    self.assertTrue(p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
                    p.locator('#competencyWorkspace').screenshot(path=str(OUT/f'learning-{width}-{theme}.png'))
                    p.locator('#competencyAttempt [type=submit]').focus();p.keyboard.press('Enter');expect(p.locator('#competencyFeedback')).to_contain_text('Rätt')
        (OUT/'wave3-browser.json').write_text(json.dumps({'widths':[360,390,430],'themes':['light','dark'],'overflow':False,'humanDelayedEvidence':'pending'},indent=2),encoding='utf-8')

    def test_scenario_mobile_keyboard_preview(self):
        for width in [360,390,430]:
            for theme in ['light','dark']:
                self.page.set_viewport_size({'width':width,'height':844})
                self.competency('valuation-return');self.page.evaluate('localStorage.clear()');self.page.reload()
                self.page.get_by_role('button',name='Försök utan hjälp').click();self.answer(9.68777,1);self.next()
                self.page.get_by_role('button',name='Tillämpa i ett nytt exempel').click()
                child=self.popup('Öppna syntetiskt kalkylatorexempel');child.emulate_media(reduced_motion='reduce');child.set_viewport_size({'width':width,'height':844});child.evaluate('applyTheme',theme)
                child.locator('#academyScenarioConsent').focus();child.keyboard.press('Space')
                expect(child.locator('#academyScenarioConsent')).to_be_checked()
                self.assertTrue(child.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
                child.locator('#academyScenarioPreview').screenshot(path=str(OUT/f'preview-{width}-{theme}.png'))
                child.get_by_role('button',name='Använd övningsvärdena').focus();child.keyboard.press('Enter')
                expect(child.locator('#stock-price')).to_have_value('108')
                child.close();self.answer(12.3425256,0);self.next()

if __name__=='__main__':unittest.main(verbosity=2)
