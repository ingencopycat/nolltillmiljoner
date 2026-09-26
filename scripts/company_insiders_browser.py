"""Real SEC pilot data: responsive, theme, keyboard and immutable Research QA."""
import argparse,json
from pathlib import Path
from research_navigation import open_research_workspace
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke
parser=argparse.ArgumentParser();parser.add_argument('--pass-number',required=True);args=parser.parse_args()
OUT=Path(__file__).resolve().parents[1]/'docs/qa/company-insiders'/('pass-'+args.pass_number);OUT.mkdir(parents=True,exist_ok=True)
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page;records=[]
try:
 p.emulate_media(reduced_motion='reduce')
 for ticker in ('NVDA','SOFI','CRWD'):
  case.go('research.html?ticker='+ticker);open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('Insider evidence review: preserve saved Research.');open_research_workspace(p, '#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click();case.wait_for('t=>NTMThesisStorage.get(t).thesis?.revisionCount>=1',arg=ticker);saved=p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)
  for width in (1440,360,390,430):
   for theme in ('dark','light'):
    p.set_viewport_size({'width':width,'height':960 if width==1440 else 844});case.go('research.html?ticker='+ticker);p.evaluate('applyTheme',theme)
    open_research_workspace(p,'#companyInsiders');section=p.locator('#companyInsiders');expect(section).to_be_visible();key=f'{ticker}-{width}-{theme}'
    expect(p.locator('#insiderSources')).not_to_have_attribute('open','');assert section.locator('a:visible').count()==0
    assert section.locator('.insider-breakdown').count()==1;assert section.locator('.insider-filing').count()==4
    assert section.evaluate("e=>!e.innerText.includes('SEC-kod')&&!e.innerText.includes('0001045810-')")
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),key
    section.evaluate('e=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-timeline.png'),animations='disabled')
    section.locator('.insider-more').click();assert section.locator('.insider-filing').count()>4
    owner=p.locator('#insiderOwner');owner.select_option(index=1);assert section.locator('.insider-filing').count()>=1;owner.select_option('all')
    p.locator('#insiderCategory').select_option('withholding' if ticker!='CRWD' else 'derivative');assert section.locator('.insider-filing').count()>0
    section.evaluate('e=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-filtered.png'),animations='disabled')
    detail=section.locator('.insider-detail').first;detail.locator('summary').focus();p.keyboard.press('Enter');expect(detail.locator('a')).to_be_visible();expect(detail).to_contain_text('SEC-kod');assert detail.locator('a').get_attribute('href').startswith('https://www.sec.gov/Archives/')
    detail.evaluate('e=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-detail.png'),animations='disabled')
    p.keyboard.press('Escape')
    p.locator('#insiderCategory').select_option('all');p.locator('#insiderPeriod').select_option('history')
    if ticker=='NVDA':assert section.locator('.insider-filing').count()==2;expect(section).to_contain_text('räknas inte som ny affär')
    elif ticker=='SOFI':assert section.locator('.insider-filing').count()==1;expect(section).to_contain_text('Köpte aktier');expect(section).to_contain_text('18,0578')
    else:expect(section).to_contain_text('Inga rapporter')
    if ticker!='CRWD':section.evaluate('e=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-history.png'),animations='disabled')
    method=p.locator('#insiderSources');method.locator('summary').focus();p.keyboard.press('Enter');expect(method).to_have_attribute('open','');method.evaluate('e=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-method.png'),animations='disabled')
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),key
    assert p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)==saved
    records.append(dict(ticker=ticker,width=width,theme=theme,overflow=False,filters=True,keyboard=True,savedResearchUnchanged=True));print('PASS',key,flush=True)
 case.go('research.html?ticker=NVDA');p.evaluate("async()=>{const d=await(await fetch('data/stocks/evidence/NVDA.json')).json();document.querySelector('#companyInsiders').remove();NTMCompanyInsidersUI.render(d,document.querySelector('#evidenceInsiders'),{status:'unavailable'});}")
 open_research_workspace(p,'#companyInsiders')
 expect(p.locator('#companyInsiders')).to_contain_text('tidigare verifierade');assert p.locator('#companyInsiders .insider-filing').count()==4
 case.go('research.html?ticker=TTMI');assert p.locator('#companyInsiders').count()==0
 (OUT/'results.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
finally:
 case.tearDown();BrowserSmoke.tearDownClass()
