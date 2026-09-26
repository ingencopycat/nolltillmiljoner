"""Wave 3 real UI continuity, state and two-pass screenshot checks."""
import argparse,json
from pathlib import Path
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke
from research_navigation import open_research_workspace
parser=argparse.ArgumentParser();parser.add_argument('--pass-number',required=True);args=parser.parse_args()
OUT=Path(__file__).resolve().parents[1]/'docs/qa/research-workspaces'/('pass-'+args.pass_number);OUT.mkdir(parents=True,exist_ok=True)
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page;records=[]
def reach(selector):open_research_workspace(p,selector)
try:
 p.emulate_media(reduced_motion='reduce')
 for ticker in ('NVDA','SOFI','CRWD'):
  case.go('research.html?ticker='+ticker)
  reach('#thesis-text');p.locator('#thesis-text').fill('Unsaved thesis '+ticker)
  p.locator('#thesis-trigger').fill('A measurable falsification condition')
  reach('#val-price');p.locator('#val-price').fill('123')
  reach('#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click()
  expect(p.locator('#thesisStatusBanner')).to_contain_text('Beräkna')
  assert p.evaluate('t=>NTMThesisStorage.get(t).thesis?.revisionCount||0',ticker)==0
  p.locator('#shellValuationRequired a').click()
  expect(p.locator('#valuationStatusBanner')).to_contain_text('Ändrade antaganden')
  p.locator('#valuationRecalculate').click()
  expect(p.locator('#valuationResultState')).to_contain_text('Beräknat med')
  p.get_by_role('link',name='Tillbaka till din tes',exact=True).click()
  expect(p.locator('#thesis-text')).to_have_value('Unsaved thesis '+ticker)
  p.locator('#thesisForm [type=submit]').click()
  expect(p.locator('#thesisStatusBanner')).to_contain_text('Analysen sparad')
  saved=p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)
  p.reload();reach('#thesis-text');expect(p.locator('#thesis-text')).to_have_value('Unsaved thesis '+ticker)
  p.locator('#thesis-text').fill('Draft after saved '+ticker)
  for width in (1440,768,430,390,360):
   for theme in ('dark','light'):
    p.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});p.evaluate('applyTheme',theme)
    reach('#thesis-text')
    if width<=700:
     p.locator('#notebook-context-button').click();expect(p.locator('#notebook-editor')).to_be_hidden()
     assert p.locator('#notebook-editor').evaluate('(n)=>n.inert')
     p.locator('#notebook-editor-button').click();expect(p.locator('#thesis-text')).to_have_value('Draft after saved '+ticker)
    for view,target in [('thesis','#thesis-text'),('valuation','#rev-cagr-result')]:
     reach(target)
     assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(ticker,width,view)
     p.locator('#companyName').click();p.evaluate('scrollTo(0,0)')
     p.screenshot(path=str(OUT/f'{ticker}-{width}-{theme}-{view}.png'),full_page=True,animations='disabled')
     if view=='valuation' and width<=700:
      expect(p.locator('#valuationAssumptions')).not_to_have_attribute('open','')
      p.locator('#sensitivityDepth > summary').click()
      p.locator('#sensitivityRow').select_option('1');p.locator('#sensitivityColumn').select_option('3')
      expected=p.locator('#sensitivityTable tbody tr').nth(1).locator('td').nth(3).locator('.sens-cell-price').text_content()
      expect(p.locator('#sensitivity-selected')).to_contain_text(expected)
      p.locator('#sensitivityDepth > summary').click()
    assert p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)==saved
    records.append({'ticker':ticker,'width':width,'theme':theme,'draftAndRevisionUnchanged':True})
  p.set_viewport_size({'width':1440,'height':1000})
  reach('#val-price');p.locator('#val-price').fill('130')
  p.screenshot(path=str(OUT/f'{ticker}-stale.png'),full_page=True)
  p.locator('#valuationRecalculate').click();reach('#thesis-text');p.locator('#thesisForm [type=submit]').click()
  reach('#thesisRevisionSelect');p.locator('#thesisRevisionSelect').select_option(saved[0]['id'])
  expect(p.locator('#revisionText')).to_have_text('Unsaved thesis '+ticker)
  reach('#researchExportMarkdown');expect(p.locator('#researchExportSource')).to_contain_text('version')
  with p.expect_download() as download:p.locator('#researchExportMarkdown').click()
  assert download.value.failure() is None
  p.go_back();p.go_forward();expect(p.locator('#researchExportSection')).to_be_visible()
  print('PASS analytical journey',ticker,flush=True)
 (OUT/'results.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
finally:case.tearDown();BrowserSmoke.tearDownClass()
