"""MU/VRT generic workspaces, continuity and repeatable screenshot review passes."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke
from research_navigation import open_research_workspace

parser=argparse.ArgumentParser()
parser.add_argument('--output',required=True)
args=parser.parse_args()
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page;records=[]
def reach(selector):open_research_workspace(p,selector)
try:
 p.emulate_media(reduced_motion='reduce')
 p.add_init_script("document.addEventListener('securitypolicyviolation',e=>{window.violations=[...(window.violations||[]),e.violatedDirective]})")
 for ticker in ('MU','VRT'):
  p.set_viewport_size({'width':1440,'height':1000})
  case.go('research.html?ticker='+ticker)
  expect(p.locator('#companyOwnership')).to_be_attached()
  expect(p.locator('#companyInsiders')).to_be_hidden()
  reach('#thesis-text');p.locator('#thesis-text').fill('Saved belief '+ticker)
  reach('#val-price');p.locator('#val-price').fill('123');p.locator('#val-eps').fill('2')
  p.locator('#valuationRecalculate').click()
  reach('#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click()
  case.wait_for('t=>NTMThesisStorage.get(t).thesis?.revisionCount===1',arg=ticker)
  saved=p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)
  reach('#researchSince');expect(p.locator('#researchSince .since-group')).to_have_count(0)
  reach('#thesis-text');p.locator('#thesis-text').fill('Unsaved draft '+ticker)
  for width in (1440,768,390,360):
   for theme in ('dark','light'):
    p.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});p.evaluate('applyTheme',theme)
    for name,target in [('overview','#overviewRevenue'),('financials','#annualChart'),('business','#companySegments'),('reporting','#companyEvidence'),('capital','#companyInsiders'),('thesis','#thesis-text'),('valuation','#rev-cagr-result')]:
     reach(target)
     expect(p.locator(target)).to_be_visible()
     assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(ticker,width,theme,name)
     assert p.locator('[data-workspace]').evaluate_all('(nodes)=>nodes.every(n=>!n.hidden||n.inert)')
     p.locator('#companyName').click();p.evaluate('scrollTo(0,0)')
     if name!='financials':p.screenshot(path=str(out/f'{ticker}-{width}-{theme}-{name}.png'),full_page=True,animations='disabled')
    reach('#thesis-text');expect(p.locator('#thesis-text')).to_have_value('Unsaved draft '+ticker)
    assert p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)==saved
    records.append(dict(ticker=ticker,width=width,theme=theme,draftAndRevisionUnchanged=True))
  p.set_viewport_size({'width':1440,'height':1000})
  reach('#val-price');p.locator('#val-price').fill('130')
  reach('#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click()
  expect(p.locator('#shellValuationRequired a')).to_be_visible()
  assert p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)==saved
  p.locator('#shellValuationRequired a').click();p.locator('#valuationRecalculate').click()
  reach('#thesis-text');expect(p.locator('#thesis-text')).to_have_value('Unsaved draft '+ticker)
  # Historical timestamps are a returning-user fixture, not ingestion dates.
  p.evaluate("t=>{const k=NTMThesisStorage.key,d=JSON.parse(localStorage.getItem(k));d.theses[t].revisions[0].savedAt='2026-01-01T12:00:00Z';localStorage.setItem(k,JSON.stringify(d))}",ticker)
  p.reload();reach('#researchSince');expect(p.locator('#researchSince .since-group').first).to_be_visible()
  p.locator('#researchSince .since-group > summary').first.click()
  assert 'Unsaved draft' not in p.locator('#researchSince').inner_text()
  assert not p.evaluate('window.violations||[]')
  print('PASS onboarding UI',ticker,flush=True)
 (out/'results.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
finally:
 case.tearDown();BrowserSmoke.tearDownClass()
