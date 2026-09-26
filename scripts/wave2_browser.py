"""Wave 2 actual local return journeys; fresh private contexts, no hosted writes."""
import json
import os
from pathlib import Path
import unittest
from research_navigation import open_research_workspace
from playwright.sync_api import expect
import browser_smoke as smoke

OUT=Path(__file__).resolve().parents[1]/'docs/qa/roadmap-wave2'

class Wave2(unittest.TestCase):
    setUpClass=classmethod(smoke.BrowserSmoke.setUpClass.__func__)
    tearDownClass=classmethod(smoke.BrowserSmoke.tearDownClass.__func__)
    setUp=smoke.BrowserSmoke.setUp
    tearDown=smoke.BrowserSmoke.tearDown
    go=smoke.BrowserSmoke.go
    wait_for=smoke.BrowserSmoke.wait_for
    open_research_workspace = smoke.BrowserSmoke.open_research_workspace
    open_depth_for=smoke.BrowserSmoke.open_depth_for

    def research(self,ticker='NVDA'):
        self.go('research.html?ticker='+ticker)
        open_research_workspace(self.page,'#researchContinuity')
        expect(self.page.locator('#researchContinuity')).to_be_visible()

    def save(self,question=False):
        p=self.page
        open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('Private Wave 2 belief')
        self.open_depth_for('#thesis-review-date')
        open_research_workspace(p, '#thesis-review-date');p.locator('#thesis-review-date').fill('2020-01-01')
        if question:
            self.open_depth_for('#report-question-1')
            p.locator('#report-question-1').fill('Will margin improve?')
        open_research_workspace(p, '#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click()
        self.wait_for("()=>NTMThesisStorage.get(currentStockData.symbol).thesis?.revisionCount===1")

    def enter_review(self):
        self.go('min-ntm.html')
        expect(self.page.locator('#reviewQueue a')).to_have_count(1)
        self.page.locator('#reviewQueue a').click()
        expect(self.page.locator('#reviewReasons')).to_be_visible()
        self.assertIn('review=exact',self.page.url)

    def test_actual_return_all_decisions_and_history(self):
        p=self.page
        for decision in ['keep','revise','close','abstain']:
            with self.subTest(decision=decision):
                self.research()
                p.evaluate('localStorage.clear();sessionStorage.clear()')
                p.reload()
                self.open_depth_for('#researchContinuity')
                expect(p.locator('#researchContinuity')).to_be_visible()
                self.save(question=True)
                original=p.evaluate("NTMThesisStorage.get('NVDA').thesis.revisions[0]")
                self.enter_review()
                expect(p.locator('#reviewBelief')).to_have_text('Private Wave 2 belief')
                p.locator('#reviewEvidenceLinks a').first.click()
                expect(p.locator('#researchSince')).to_be_visible()
                self.open_depth_for('#reviewContext')
                p.locator('#reviewContext').fill('I inspected the original evidence')
                p.locator('#review-'+decision).click()
                if decision=='revise':
                    open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('Revised belief after review')
                    open_research_workspace(p, '#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click()
                self.wait_for("()=>NTMThesisStorage.get('NVDA').thesis.revisionCount===2")
                thesis=p.evaluate("NTMThesisStorage.get('NVDA').thesis")
                self.assertEqual(thesis['revisions'][0],original)
                self.assertEqual(thesis['review']['decision'],decision)
                self.assertEqual(thesis['reportQuestions'][0]['status'],'open')
                self.go('min-ntm.html')
                if decision in ['close','abstain']:
                    expect(p.locator('#reviewQueue a')).to_have_count(0)
                    expect(p.locator('#closedTheses a')).to_have_count(1)
                else:
                    expect(p.locator('#reviewQueue')).to_contain_text('Öppen fråga')
                    expect(p.locator('#reviewQueue')).not_to_contain_text('granskningsdatum har nåtts')

    def test_draft_restore_discard_no_revision_or_network_leak(self):
        self.research()
        p=self.page
        requests=[]
        p.on('request',lambda r:requests.append(r.url+' '+(r.post_data or '')))
        open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('PRIVATE DRAFT SENTINEL')
        open_research_workspace(p, '#val-price');p.locator('#val-price').fill('133.37')
        self.assertIsNone(p.evaluate("NTMThesisStorage.get('NVDA').thesis"))
        p.reload()
        open_research_workspace(p,'#draftRestore')
        expect(p.locator('#draftRestore')).to_be_visible()
        expect(p.locator('#thesis-text')).to_have_value('')
        open_research_workspace(p, '#draftRestore');p.locator('#draftRestore').click()
        expect(p.locator('#thesis-text')).to_have_value('PRIVATE DRAFT SENTINEL')
        expect(p.locator('#val-price')).to_have_value('133.37')
        self.assertTrue(p.evaluate('valuationState.stale'))
        expect(p.locator('#valuationPriceInputStatus')).to_contain_text('Historiskt')
        self.assertFalse(any('PRIVATE DRAFT' in r for r in requests))
        p.reload()
        open_research_workspace(p, '#draftDiscard');p.locator('#draftDiscard').click()
        expect(p.locator('#thesis-text')).to_have_value('')
        self.assertIsNone(p.evaluate("NTMContinuity.read('NVDA').value.draft"))

    def test_stale_target_and_concurrent_editor_fail_closed(self):
        self.research();self.save();self.go('min-ntm.html')
        expect(self.page.locator('#reviewQueue a')).to_have_count(1)
        self.page.evaluate("(()=>{const t=NTMThesisStorage.get('NVDA').thesis;NTMThesisStorage.save('NVDA',{...t,text:'Newer deliberate version'})})()")
        self.page.locator('#reviewQueue a').click()
        expect(self.page.locator('#continuityStatus')).to_contain_text('nyare version')
        open_research_workspace(self.page, '#review-keep');self.page.locator('#review-keep').click()
        self.assertEqual(self.page.evaluate("NTMThesisStorage.get('NVDA').thesis.revisionCount"),2)
        self.research()
        self.page.evaluate("(()=>{const t=NTMThesisStorage.get('NVDA').thesis;NTMThesisStorage.save('NVDA',{...t,text:'Concurrent edit'})})()")
        open_research_workspace(self.page, '#thesis-text');self.page.locator('#thesis-text').fill('Must not overwrite')
        open_research_workspace(self.page, '#thesisForm [type=submit]');self.page.locator('#thesisForm [type=submit]').click()
        expect(self.page.locator('#continuityStatus')).to_contain_text('annan flik')
        self.assertEqual(self.page.evaluate("NTMThesisStorage.get('NVDA').thesis.text"),'Concurrent edit')

    def test_manual_snooze_and_unknown_price_age(self):
        self.research('ACME');self.save()
        self.enter_review()
        expect(self.page.locator('#reviewPriceAge')).to_contain_text('inte kursdatum')
        self.page.locator('#reviewSnoozeDate').fill('2099-01-01')
        self.page.locator('#reviewSnooze').click()
        self.go('min-ntm.html')
        expect(self.page.locator('#reviewQueue a')).to_have_count(0)
        expect(self.page.locator('#reviewContinuations')).to_contain_text('pausade')
        self.page.locator('#reviewContinuations a').click()
        self.open_depth_for('#reviewUnsnooze')
        self.page.locator('#reviewUnsnooze').click()
        self.go('min-ntm.html')
        expect(self.page.locator('#reviewQueue a')).to_have_count(1)

    def test_expired_draft_and_corrupt_companion_preserve_original(self):
        self.research();p=self.page
        open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('Expired private draft')
        p.evaluate("(()=>{const w=NTMContinuity.read('NVDA');w.value.draft.updatedAt=1;NTMContinuity.write('NVDA',w.value,w.raw)})()")
        p.reload();expect(p.locator('#draftRestore')).to_be_disabled()
        expect(p.locator('#researchContinuity')).to_contain_text('14 dagar')
        self.assertEqual(p.evaluate("NTMContinuity.read('NVDA').value.draft.fields['thesis-text']"),'Expired private draft')
        open_research_workspace(p, '#draftDiscard');p.locator('#draftDiscard').click()
        p.evaluate("localStorage.setItem(NTMContinuity.prefix+'NVDA','{bad')")
        p.reload();expect(p.locator('#draftDownloadRaw')).to_be_visible()
        self.assertEqual(p.evaluate("localStorage.getItem(NTMContinuity.prefix+'NVDA')"),'{bad')
        open_research_workspace(p, '#draftDeleteCorrupt');p.locator('#draftDeleteCorrupt').click()
        self.assertIsNone(p.evaluate("localStorage.getItem(NTMContinuity.prefix+'NVDA')"))

    def test_revise_draft_reload_and_deliberate_reopen(self):
        self.research('ACME');self.save();self.enter_review();p=self.page
        open_research_workspace(p, '#review-close');p.locator('#review-close').click()
        open_research_workspace(p, '#review-revise');p.locator('#review-revise').click()
        open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('Explicit reopened draft')
        p.reload();expect(p.locator('#draftRestore')).to_be_visible();open_research_workspace(p, '#draftRestore');p.locator('#draftRestore').click()
        open_research_workspace(p, '#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click()
        self.wait_for("()=>NTMThesisStorage.get('ACME').thesis.revisionCount===3")
        self.assertEqual(p.evaluate("NTMThesisStorage.get('ACME').thesis.review.decision"),'revise')

    def test_unavailable_stock_and_corrupt_journal_are_not_empty_success(self):
        self.research();self.save();p=self.page
        p.route('**/data/stocks/NVDA.json',lambda r:r.fulfill(status=503,body='unavailable'))
        self.go('min-ntm.html');expect(p.locator('#reviewQueueStatus')).to_contain_text('ofullständig')
        p.locator('#reviewQueue a').click()
        expect(p.locator('#researchError')).to_be_visible()
        self.assertEqual(p.evaluate("NTMThesisStorage.get('NVDA').thesis.revisionCount"),1)
        p.unroute('**/data/stocks/NVDA.json')
        p.evaluate("localStorage.setItem('investment-research-theses-v1','{corrupt')")
        self.research();open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('No overwrite')
        open_research_workspace(p, '#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click()
        self.assertEqual(p.evaluate("localStorage.getItem('investment-research-theses-v1')"),'{corrupt')
        expect(p.locator('#continuityStatus')).not_to_be_empty()

    def test_exact_target_survives_evidence_navigation_reload_and_deletion(self):
        self.research();self.save();self.enter_review();p=self.page
        p.locator('#reviewEvidenceLinks a').first.click();p.reload()
        expect(p.locator('#reviewReasons')).to_be_visible()
        self.assertEqual(p.evaluate('NTMContinuityUI.state().state'),'exact')
        p.evaluate("NTMThesisStorage.remove('NVDA')")
        self.assertIsNone(p.evaluate("sessionStorage.getItem(NTMContinuity.targetKey)"))
        p.reload()
        expect(p.locator('#continuityStatus')).to_contain_text('saknas')
        open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('Must not replace missing target')
        open_research_workspace(p, '#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click()
        self.assertIsNone(p.evaluate("NTMThesisStorage.get('NVDA').thesis"))

    def test_mobile_both_themes_keyboard(self):
        OUT.mkdir(parents=True,exist_ok=True)
        for width in [360,390,430]:
            for theme in ['light','dark']:
                with self.subTest(width=width,theme=theme):
                    self.page.set_viewport_size({'width':width,'height':844})
                    self.research()
                    self.page.evaluate('(theme)=>{localStorage.clear();localStorage.setItem("investment-theme",theme)}',theme)
                    self.page.reload()
                    self.open_depth_for('#researchContinuity')
                    expect(self.page.locator('#researchContinuity')).to_be_visible()
                    self.save();self.enter_review()
                    check=self.page.locator('#reviewReasons input[type=checkbox]').first
                    check.focus();self.page.keyboard.press('Space');expect(check).not_to_be_checked()
                    self.page.keyboard.press('Space');expect(check).to_be_checked()
                    self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
                    self.page.locator('#reviewReasons').screenshot(path=str(OUT/f'review-{width}-{theme}.png'))
                    open_research_workspace(self.page, '#review-keep');self.page.locator('#review-keep').click()
                    self.go('min-ntm.html')
                    expect(self.page.locator('#reviewQueue a')).to_have_count(0)
        (OUT/'wave2-browser.json').write_text(json.dumps({'widths':[360,390,430],'themes':['light','dark'],'keyboard':'native checkbox toggled, keep completed','overflow':False},indent=2),encoding='utf-8')

if __name__=='__main__':unittest.main(verbosity=2)
