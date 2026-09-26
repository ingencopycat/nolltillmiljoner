"""Exact pre-Wave-3 vs current outputs and revision payloads, with fixed clock/UUIDs."""
import json, subprocess
from pathlib import Path
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke
from research_navigation import open_research_workspace
ROOT=Path(__file__).resolve().parents[1]
BASE='7fd530f8c77b191250c9ef6056d16a7143c32c44'
baseline={name:subprocess.check_output(['git','show',BASE+':'+name],cwd=ROOT) for name in ['research.html','research.js','research-shell.js']}
BrowserSmoke.setUpClass()
def run(old,ticker):
 case=BrowserSmoke();case.setUp();p=case.page
 try:
  p.add_init_script("""{const Original=Date;window.Date=class extends Original{constructor(...args){super(...(args.length?args:['2026-09-26T12:00:00Z']));}static now(){return 1790424000000;}};let i=0;crypto.randomUUID=()=> '00000000-0000-4000-8000-'+String(++i).padStart(12,'0');}""")
  if old:
   p.route('**/*',lambda r:r.fulfill(body=baseline[r.request.url.split('/')[-1]],content_type='text/html; charset=utf-8' if r.request.url.endswith('.html') else 'application/javascript; charset=utf-8') if r.request.url.split('/')[-1] in baseline else r.continue_())
   p.route('**/research.html?*',lambda r:r.fulfill(body=baseline['research.html'],content_type='text/html; charset=utf-8'))
  case.go('research.html?ticker='+ticker)
  open_research_workspace(p,'#val-price');case.open_depth_for('#val-price')
  for key,value in {'val-price':'123','val-eps':'2.5','val-years':'7','val-return':'9','val-exit-pe':'22','sc-bear-growth':'-3','sc-bear-pe':'12','sc-base-growth':'11','sc-base-pe':'23','sc-bull-growth':'27','sc-bull-pe':'38'}.items():
   case.open_depth_for('#'+key);p.locator('#'+key).fill(value)
  p.locator('#valuationForm [type=submit]').click()
  outputs=p.evaluate("""() => ({reverse:[...document.querySelectorAll('.reverse-results-grid strong')].map(n=>[n.id,n.textContent]),scenarios:[...document.querySelectorAll('#scenariosTable td')].map(n=>[n.id,n.textContent]),sensitivity:document.getElementById('sensitivityTable').textContent,snapshot:captureValuationSnapshot(currentStockData)})""")
  open_research_workspace(p,'#thesis-text')
  for key,value in {'thesis-text':'Thesis equivalence','thesis-trigger':'Disconfirming evidence','thesis-risks':'Risk fixture','thesis-notes':'Private notes','thesis-assumption-1':'Assumption fixture','report-question-1':'Next report question','thesis-review-date':'2026-12-01'}.items():
   case.open_depth_for('#'+key);p.locator('#'+key).fill(value)
  p.locator('#thesisForm [type=submit]').click()
  expect(p.locator('#thesisStatusBanner')).to_contain_text('Analysen sparad')
  outputs['revisions']=p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)
  return outputs
 finally:case.tearDown()
try:
 results={}
 for ticker in ['NVDA','SOFI','CRWD']:
  before=run(True,ticker);after=run(False,ticker)
  assert before==after,ticker+' output/payload mismatch'
  results[ticker]={'exactOutputsAndRevisions':True,'sensitivityCells':25}
  print('PASS exact calculation and revision equivalence',ticker,flush=True)
 out=ROOT/'docs/qa/research-workspaces';out.mkdir(parents=True,exist_ok=True)
 (out/'equivalence.json').write_text(json.dumps({'baseline':BASE,'results':results},indent=2),encoding='utf-8')
finally:BrowserSmoke.tearDownClass()

