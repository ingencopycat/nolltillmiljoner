"""Wave 4 representative product matrix and original-node evidence lifecycle checks."""
import argparse,json
from pathlib import Path
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke
from research_navigation import open_research_workspace
parser=argparse.ArgumentParser();parser.add_argument('--pass-number',required=True);args=parser.parse_args()
out=Path(__file__).resolve().parents[1]/'docs/qa/research-polish'/('pass-'+args.pass_number);out.mkdir(parents=True,exist_ok=True)
BrowserSmoke.setUpClass();c=BrowserSmoke();c.setUp();p=c.page;records=[]
routes=['overview','data&topic=financials','data&topic=business','data&topic=outlook','data&topic=capital','thesis','thesis&section=review','valuation','thesis&section=versions','thesis&section=outcomes','thesis&section=export']
try:
 p.emulate_media(reduced_motion='reduce')
 for i,ticker in enumerate(['NVDA','SOFI','CRWD']):
  for j,route in enumerate(routes):
   width=[1440,768,430,390,360][(i+j)%5];theme=['dark','light'][(i+j)%2]
   p.set_viewport_size({'width':width,'height':900});c.go('research.html?ticker='+ticker+'&view='+route);p.evaluate('applyTheme',theme)
   expect(p.locator('[data-workspace]:visible')).to_have_count(1)
   assert p.locator('[data-workspace][hidden]').evaluate_all('(nodes)=>nodes.every(n=>n.inert)')
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(ticker,route,width)
   name=f'{ticker}-{route.replace("&","-").replace("=","-")}-{width}-{theme}'
   p.screenshot(path=str(out/(name+'.png')),full_page=True,animations='disabled')
   records.append({'name':name,'overflow':False})
 for width in [1440,768,430,390,360]:
  for theme in ['dark','light']:
   p.set_viewport_size({'width':width,'height':900});c.go('research.html');p.evaluate('applyTheme',theme)
   expect(p.locator('#companySearch')).to_be_visible();expect(p.locator('#companyPicker > summary')).to_be_hidden()
   p.locator('#companyBrowse > summary').click();expect(p.locator('#companyBrowseResults a')).to_have_count(12);expect(p.locator('#companyLetters')).to_be_hidden()
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   p.screenshot(path=str(out/f'entry-{width}-{theme}.png'),full_page=True,animations='disabled')
 c.go('research.html?ticker=NVDA')
 for n,ident in enumerate(['reportingSources','observationSources','segmentSources','capitalSources','insiderSources','ownershipSources','materialSources']):
  p.set_viewport_size({'width':[1440,768,430,390,360][n%5],'height':900})
  open_research_workspace(p,'#'+ident);source=p.locator('#'+ident);summary=source.locator(':scope > summary')
  before=source.text_content();p.evaluate('id=>window.__originalEvidence=document.getElementById(id)',ident)
  summary.focus();p.keyboard.press('Enter');expect(p.locator('#provenanceDialog')).to_be_visible()
  assert source.text_content()==before
  assert p.evaluate('id=>window.__originalEvidence===document.getElementById(id)',ident)
  for _ in range(5):
   p.keyboard.press('Tab');assert p.locator('#provenanceDialog').evaluate('n=>n.contains(document.activeElement)')
  assert p.locator('#provenanceDialog').evaluate('n=>n.scrollWidth<=n.clientWidth+1')
  assert p.locator('#provenance-heading').bounding_box()['width']>100
  p.screenshot(path=str(out/(ident+'-open.png')),full_page=True,animations='disabled')
  p.keyboard.press('Escape');expect(summary).to_be_focused();expect(source).not_to_have_attribute('open','')
  assert source.text_content()==before
  assert p.locator('#provenanceDialog').count()==1
 open_research_workspace(p,'#companyObservations')
 value=p.locator('#companyObservations .evidence-value').first
 value.click();expect(p.locator('#provenanceDialog')).to_be_visible()
 assert p.locator('#observationSources tr:focus').count()==1
 p.keyboard.press('Escape');expect(value).to_be_focused()
 # Browser history closes a modal before restoring the workspace focus.
 open_research_workspace(p,'#capitalSources');p.locator('#capitalSources > summary').click()
 p.go_back();expect(p.locator('#provenanceDialog')).to_be_hidden();expect(p.locator('#capitalSources')).to_have_count(1)
 p.go_forward()
 p.emulate_media(forced_colors='active');open_research_workspace(p,'#capitalSources');p.locator('#capitalSources > summary').click();expect(p.locator('#closeProvenanceDialog')).to_be_focused();p.keyboard.press('Escape')
 p.emulate_media(forced_colors='none');c.go('research.html?ticker=CRWD');open_research_workspace(p,'#companyKpis')
 kpi=p.locator('#companyKpis .evidence-value').first;kpi.click();expect(p.locator('#provenanceDialog')).to_be_visible()
 assert p.locator('#kpiSources tr:focus').count()==1
 p.keyboard.press('Escape');expect(kpi).to_be_focused()
 p.add_init_script("const read=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k==='investment-research-theses-v1')throw new DOMException('Blocked','SecurityError');return read.call(this,k)}")
 c.go('research.html');expect(p.locator('#companyRecentError')).to_be_visible()
 expect(p.locator('#companyRecentError a')).to_have_attribute('href','min-ntm.html')
 (out/'results.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
 print('PASS 33 company routes, 10 entry layouts, seven source contexts, keyboard/focus, hidden/inert, forced colors',flush=True)
finally:c.tearDown();BrowserSmoke.tearDownClass()
