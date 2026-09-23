"""Real grouped company-event timeline, responsive review and Research preservation."""
import argparse,json
from pathlib import Path
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke
parser=argparse.ArgumentParser();parser.add_argument('--pass-number',required=True);args=parser.parse_args()
OUT=Path(__file__).resolve().parents[1]/'docs/qa/company-material-events'/('pass-'+args.pass_number);OUT.mkdir(parents=True,exist_ok=True)
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page;records=[]
try:
 p.emulate_media(reduced_motion='reduce')
 for ticker in ('NVDA','SOFI','CRWD'):
  case.go('research.html?ticker='+ticker);p.locator('#thesis-text').fill('Material event review: preserve saved Research.');p.locator('#thesisForm [type=submit]').click();case.wait_for('t=>NTMThesisStorage.get(t).thesis?.revisionCount>=1',arg=ticker);saved=p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)
  for width in (1440,360,390,430):
   for theme in ('dark','light'):
    p.set_viewport_size({'width':width,'height':960 if width==1440 else 844});case.go('research.html?ticker='+ticker);p.evaluate('applyTheme',theme)
    section=p.locator('#companyMaterialEvents');expect(section).to_be_visible();key=f'{ticker}-{width}-{theme}'
    expect(p.locator('#materialSources')).not_to_have_attribute('open','');assert section.locator('a:visible').count()==0
    assert section.locator('.material-event').count()==(3 if ticker=='CRWD' else 4)
    assert section.evaluate("e=>!e.innerText.includes('SEC-punkter')&&!e.innerText.includes('0001045810-')")
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),key
    section.evaluate('e=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-timeline.png'),animations='disabled')
    p.locator('#materialCategory').select_option('operating_incident' if ticker=='CRWD' else 'financing');assert section.locator('.material-event').count()==(2 if ticker=='SOFI' else 1)
    if ticker=='CRWD':expect(section).to_contain_text('inte en cyberattack')
    if ticker=='NVDA':expect(section).to_contain_text('inte utbetalt lån')
    section.evaluate('e=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-filtered.png'),animations='disabled')
    detail=section.locator('.ownership-detail').first;detail.locator('summary').first.focus();p.keyboard.press('Enter');expect(detail.locator('a').first).to_be_visible();expect(detail).to_contain_text('SEC-punkter');assert detail.locator('a').first.get_attribute('href').startswith('https://www.sec.gov/Archives/')
    if ticker=='SOFI':assert detail.locator('a').count()==2;expect(detail).to_contain_text('72');expect(detail).to_contain_text('600 miljoner')
    detail.evaluate('e=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-evidence.png'),animations='disabled')
    passage=detail.locator('details').first;passage.locator('summary').click();expect(passage.locator('p')).to_be_visible();assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    method=p.locator('#materialSources');method.locator('summary').focus();p.keyboard.press('Enter');expect(method).to_have_attribute('open','');method.evaluate('e=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-method.png'),animations='disabled')
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),key
    assert p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)==saved
    records.append(dict(ticker=ticker,width=width,theme=theme,overflow=False,keyboard=True,savedResearchUnchanged=True));print('PASS',key,flush=True)
 case.go('research.html?ticker=NVDA');p.evaluate("async()=>{const d=await(await fetch('data/stocks/evidence/NVDA.json')).json();document.querySelector('#companyMaterialEvents').remove();NTMCompanyMaterialEventsUI.render(d,document.querySelector('#companyEvidence'),{status:'unavailable'});}")
 expect(p.locator('#companyMaterialEvents')).to_contain_text('tidigare verifierade');assert p.locator('#companyMaterialEvents .material-event').count()==4
 case.go('research.html?ticker=TTMI');assert p.locator('#companyMaterialEvents').count()==0
 (OUT/'results.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
finally:
 case.tearDown();BrowserSmoke.tearDownClass()
