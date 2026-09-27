"""Bounded MU/VRT completion QA through the visible workspace navigation."""
import argparse,json
from pathlib import Path
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke
from research_navigation import open_research_workspace

parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);args=parser.parse_args()
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page;records=[]
def reach(selector):open_research_workspace(p,selector)
try:
 p.emulate_media(reduced_motion='reduce')
 p.add_init_script("document.addEventListener('securitypolicyviolation',e=>{window.violations=[...(window.violations||[]),e.violatedDirective]})")
 for ticker,eps in [('MU','44.31'),('VRT','4.42')]:
  p.set_viewport_size({'width':1440,'height':1000});case.go('research.html?ticker='+ticker)
  expect(p.locator('#companyOwnership')).to_be_attached()
  reach('#val-eps');expect(p.locator('#val-eps-badge')).to_have_text('SEC TTM');expect(p.locator('#val-eps')).to_have_value(eps)
  p.locator('#val-price').fill('123');p.locator('#valuationRecalculate').click()
  reach('#thesis-text');p.locator('#thesis-text').fill('Completion saved belief '+ticker)
  p.locator('#thesisForm [type=submit]').click()
  case.wait_for('t=>NTMThesisStorage.get(t).thesis?.revisionCount===1',arg=ticker)
  saved=p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)
  p.locator('#thesis-text').fill('Completion unsaved draft '+ticker)
  for width,theme in [(1440,'dark'),(390,'light')]:
   p.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});p.evaluate('applyTheme',theme)
   for name,target in [('overview','#overviewRevenue'),('financials','#annualChart'),('business','#companyKpis'),('reporting','#companyMaterialEvents'),('capital','#companyCapital'),('review','#researchSince'),('thesis','#thesis-text'),('valuation','#rev-cagr-result')]:
    reach(target);expect(p.locator(target)).to_be_visible()
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(ticker,width,name)
    assert p.locator('[data-workspace]').evaluate_all('(nodes)=>nodes.every(n=>!n.hidden||n.inert)')
    if name=='business':
     text=p.locator(target).inner_text()
     assert ('15' in text and '2025' in text and '2024' in text) if ticker=='VRT' else ('intervall' in text)
    if (width==1440 and name=='business') or (width==390 and name=='capital'):
     p.locator(target).scroll_into_view_if_needed();p.locator(target).screenshot(path=str(out/f'{ticker}-{width}-{theme}-{name}.png'),animations='disabled')
   reach('#capitalSources');p.locator('#capitalSources > summary').click()
   expect(p.locator('#provenanceDialog')).to_be_visible();p.keyboard.press('Escape')
   expect(p.locator('#capitalSources > summary')).to_be_focused()
   reach('#thesis-text');expect(p.locator('#thesis-text')).to_have_value('Completion unsaved draft '+ticker)
   assert p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)==saved
   records.append(dict(ticker=ticker,width=width,theme=theme,automaticEps=eps,draftAndRevisionUnchanged=True))
  reach('#val-price');p.locator('#val-price').fill('130')
  reach('#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click()
  expect(p.locator('#shellValuationRequired a')).to_be_visible()
  assert p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)==saved
  assert not p.evaluate('window.violations||[]')
  print('PASS completion UI',ticker,flush=True)
 (out/'results.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
finally:
 case.tearDown();BrowserSmoke.tearDownClass()
