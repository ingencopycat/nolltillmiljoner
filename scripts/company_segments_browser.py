"""Real SEC business-mix data, two screenshot review passes, no external writes."""
import argparse,json
from pathlib import Path
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke
parser=argparse.ArgumentParser();parser.add_argument('--pass-number',required=True);args=parser.parse_args()
OUT=Path(__file__).resolve().parents[1]/'docs/qa/company-segments'/('pass-'+args.pass_number);OUT.mkdir(parents=True,exist_ok=True)
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page;records=[]
try:
 p.emulate_media(reduced_motion='reduce')
 for ticker in ('NVDA','SOFI','CRWD'):
  case.go('research.html?ticker='+ticker);p.locator('#thesis-text').fill('Segment evidence review: preserve this Research revision.');p.locator('#thesisForm [type=submit]').click();case.wait_for('t=>NTMThesisStorage.get(t).thesis?.revisionCount>=1',arg=ticker);saved=p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)
  for width in (1440,360,390,430):
   for theme in ('dark','light'):
    p.set_viewport_size({'width':width,'height':960 if width==1440 else 844});case.go('research.html?ticker='+ticker);p.evaluate('applyTheme',theme)
    section=p.locator('#companySegments');expect(section).to_be_visible()
    groups=['market-platforms','accounting-segments','data-center-markets'] if ticker=='NVDA' else ['accounting-segments' if ticker=='SOFI' else 'revenue-categories']
    for group in groups:
     key=f'{ticker}-{group}-{width}-{theme}'
     if ticker=='NVDA':p.locator('#segmentGroup').select_option(group)
     expect(p.locator('#segmentSources')).not_to_have_attribute('open','');assert section.locator('a:visible').count()==0
     expect(section.locator('.segment-mix')).to_be_visible();assert section.locator('.segment-trend').count()==(0 if ticker=='NVDA' and group!='market-platforms' else 1)
     assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),key
     assert section.evaluate("e=>!e.innerText.includes('0001045810-')&&!e.innerText.includes('0001818874-')&&!e.innerText.includes('0001535527-')")
     section.evaluate('(e)=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-default.png'),animations='disabled')
     summary=p.locator('#segmentSources > summary');summary.focus();p.keyboard.press('Enter');expect(p.locator('#segmentSources')).to_have_attribute('open','');summary.evaluate('(e)=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-sources.png'),animations='disabled')
     assert section.locator('a:visible').count()>3
     more=p.locator('#segmentSources td details').first;more.locator('summary').click();expect(more.locator('p').first).to_be_visible();p.locator('#segmentSources table').evaluate('(e)=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-passage.png'),animations='disabled')
     summary.focus();p.keyboard.press('Enter');expect(summary).to_be_focused();expect(p.locator('#segmentSources')).not_to_have_attribute('open','');assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),key
     assert p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)==saved
     records.append(dict(ticker=ticker,group=group,width=width,theme=theme,overflow=False,keyboard=True,savedResearchUnchanged=True));print('PASS',key,flush=True)
 # Retained data on source failure; malformed/incomplete latest mix must not create a partial chart.
 case.go('research.html?ticker=SOFI');p.evaluate("async()=>{const d=await(await fetch('data/stocks/evidence/SOFI.json')).json();document.querySelector('#companySegments').remove();NTMCompanySegmentsUI.render(d,document.querySelector('#companyEvidence'),{status:'unavailable'});}")
 expect(p.locator('#companySegments')).to_contain_text('tidigare verifierade');expect(p.locator('#companySegments .segment-mix')).to_be_visible()
 p.evaluate("async()=>{const d=await(await fetch('data/stocks/evidence/SOFI.json')).json();d.reviewedEvidence.observations=d.reviewedEvidence.observations.filter(o=>!(o.kind==='business_mix'&&o.category.id==='lending'&&o.period.end==='2026-06-30'));document.querySelector('#companySegments').remove();NTMCompanySegmentsUI.render(d,document.querySelector('#companyEvidence'),{status:'verified'});}")
 expect(p.locator('#companySegments')).to_contain_text('Ofullständig');assert p.locator('#companySegments .segment-mix').count()==0
 # Unsupported issuer: no decorative empty section.
 case.go('research.html?ticker=TTMI');assert p.locator('#companySegments').count()==0
 (OUT/'results.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
finally:
 case.tearDown();BrowserSmoke.tearDownClass()
