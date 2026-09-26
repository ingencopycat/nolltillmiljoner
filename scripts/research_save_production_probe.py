"""Disposable production-origin browser; synthetic local thesis, no hosted writes."""
import json
from pathlib import Path
from research_navigation import open_research_workspace
from playwright.sync_api import sync_playwright, expect

OUT=Path(__file__).resolve().parents[1]/'docs/qa/research-save'
def main():
 with sync_playwright() as pw:
  browser=pw.chromium.launch();context=browser.new_context(viewport={'width':390,'height':844})
  page=context.new_page();errors=[];writes=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def route(r):
   if r.request.method not in ('GET','HEAD','OPTIONS'):
    writes.append({'method':r.request.method,'path':r.request.url.split('?')[0]});r.abort()
   else:r.continue_()
  context.route('**/*',route)
  page.goto('https://nolltillmiljoner.se/research.html?ticker=NVDA',wait_until='domcontentloaded')
  open_research_workspace(page,'#thesisForm')
  button=page.locator('#thesisForm [type=submit]');expect(button).to_be_visible(timeout=30000)
  button.click();page.screenshot(path=str(OUT/'production-empty-click.png'))
  def state():return page.evaluate('''()=>({saved:NTMThesisStorage.get('NVDA').thesis?.revisionCount||0,
    banner:document.querySelector('#thesisStatusBanner').textContent,
    bannerTop:document.querySelector('#thesisStatusBanner').getBoundingClientRect().top,
    buttonTop:document.querySelector('#thesisForm [type=submit]').getBoundingClientRect().top,
    indicatorTop:document.querySelector('#thesisSavedIndicator').getBoundingClientRect().top,
    viewport:innerHeight})''')
  empty=state();open_research_workspace(page, '#thesis-text');page.locator('#thesis-text').fill('Disposable save-flow check; synthetic local text.');button.click()
  page.screenshot(path=str(OUT/'production-saved-click.png'));saved=state()
  page.reload();expect(page.locator('#thesis-text')).to_have_value('Disposable save-flow check; synthetic local text.')
  reloaded=state();context.close();browser.close()
  (OUT/'production-probe.json').write_text(json.dumps(dict(empty=empty,saved=saved,reloaded=reloaded,errors=errors,attemptedNetworkWrites=writes),indent=2),encoding='utf-8')
  print(json.dumps(dict(empty=empty,saved=saved,reloaded=reloaded,errors=errors,attemptedNetworkWrites=writes),ensure_ascii=True))
if __name__=='__main__':main()
