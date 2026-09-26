"""Wave 3 setup/error presentation, mobile deep links and reviewed evidence context."""
import json
from pathlib import Path
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke
from research_navigation import open_research_workspace
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/qa/research-workspaces/states';OUT.mkdir(parents=True,exist_ok=True)
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page
try:
 p.set_viewport_size({'width':390,'height':844})
 data=json.loads((ROOT/'data/stocks/NVDA.json').read_text(encoding='utf-8'))
 data['valuationBase']['ttmDilutedEps']['value']=None
 p.route('**/data/stocks/NVDA.json',lambda r:r.fulfill(json=data))
 case.go('research.html?ticker=NVDA&view=valuation#val-eps')
 # Preserve the existing explicit manual EPS=1 example fallback on initial load.
 expect(p.locator('#valuationSection')).to_have_attribute('data-result-state','current')
 expect(p.locator('#val-eps')).to_be_visible()
 expect(p.locator('#val-override-banner')).to_be_visible()
 expect(p.locator('#valuation-tested-basis')).to_contain_text('Manuell EPS')
 p.screenshot(path=str(OUT/'missing-eps.png'),full_page=True)
 p.locator('#val-eps').fill('-1');p.locator('#valuationForm [type=submit]').click()
 expect(p.locator('#valuationStatusBanner')).to_be_visible()
 expect(p.locator('#valuationSection')).to_have_attribute('data-result-state','stale')
 p.screenshot(path=str(OUT/'negative-eps.png'),full_page=True)
 p.locator('#val-eps').fill('2');p.locator('#valuationForm [type=submit]').click()
 expect(p.locator('#valuationSection')).to_have_attribute('data-result-state','current')
 expect(p.locator('#valuation-tested-basis')).to_contain_text('Manuell EPS')
 open_research_workspace(p,'#thesis-text');p.locator('#thesis-text').fill('Saved belief for factual review')
 p.locator('#thesisForm [type=submit]').click();expect(p.locator('#thesisStatusBanner')).to_contain_text('Analysen sparad')
 p.evaluate("""() => {const k=NTMThesisStorage.key,d=JSON.parse(localStorage.getItem(k));d.theses.NVDA.revisions[0].savedAt='2026-08-01T12:00:00Z';localStorage.setItem(k,JSON.stringify(d));}""")
 case.go('research.html?ticker=NVDA&view=thesis&section=review')
 expect(p.locator('#reviewBelief')).to_contain_text('Saved belief for factual review')
 expect(p.locator('#researchSince .since-group').first).to_be_visible()
 saved=p.evaluate('localStorage.getItem(NTMThesisStorage.key)')
 for width in [1440,390]:
  p.set_viewport_size({'width':width,'height':900});p.screenshot(path=str(OUT/f'review-{width}.png'),full_page=True)
  assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 assert p.evaluate('localStorage.getItem(NTMThesisStorage.key)')==saved
 p.set_viewport_size({'width':360,'height':844})
 case.go('research.html?ticker=NVDA&view=thesis#thesis-review-date')
 expect(p.locator('#thesis-review-date')).to_be_visible();expect(p.locator('#notebook-editor')).to_be_hidden()
 p.locator('#notebook-editor-button').click();p.locator('#thesis-text').fill('Pending local draft')
 p.reload();expect(p.locator('#notebookRecovery')).to_be_visible();p.locator('#notebookRecovery').click()
 expect(p.locator('#draftRestore')).to_be_visible();p.locator('#draftRestore').click()
 open_research_workspace(p,'#thesis-text');expect(p.locator('#thesis-text')).to_have_value('Pending local draft')
 print('PASS missing/negative/manual EPS, reviewed changes, read-only review, mobile deep links and draft recovery',flush=True)
finally:case.tearDown();BrowserSmoke.tearDownClass()
