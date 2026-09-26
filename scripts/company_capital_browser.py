"""Two screenshot passes with real pilot data, keyboard and Research preservation."""
import argparse,json
from pathlib import Path
from research_navigation import open_research_workspace
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke
parser=argparse.ArgumentParser();parser.add_argument('--pass-number',required=True);args=parser.parse_args()
OUT=Path(__file__).resolve().parents[1]/'docs/qa/company-capital'/('pass-'+args.pass_number);OUT.mkdir(parents=True,exist_ok=True)
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page;records=[]
try:
 p.emulate_media(reduced_motion='reduce')
 for ticker in ('NVDA','SOFI','CRWD'):
  case.go('research.html?ticker='+ticker);open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('Capital evidence review: preserve this saved Research revision.');open_research_workspace(p, '#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click();case.wait_for('t=>NTMThesisStorage.get(t).thesis?.revisionCount>=1',arg=ticker);saved=p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)
  for width in (1440,360,390,430):
   for theme in ('dark','light'):
    p.set_viewport_size({'width':width,'height':960 if width==1440 else 844});case.go('research.html?ticker='+ticker);p.evaluate('applyTheme',theme)
    open_research_workspace(p,'#companyCapital');section=p.locator('#companyCapital');expect(section).to_be_visible();key=f'{ticker}-{width}-{theme}'
    expect(p.locator('#capitalSources')).not_to_have_attribute('open','');assert section.locator('a:visible').count()==0
    assert section.locator('.capital-chart').count()==2;assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),key
    expect(section).to_contain_text('Kostnad, inte utspädning.');assert section.evaluate("e=>!e.innerText.includes('0001045810-')&&!e.innerText.includes('0001818874-')&&!e.innerText.includes('0001535527-')")
    if ticker=='SOFI':assert section.locator('.capital-metric').count()==6;assert 'Kassa minus' not in section.inner_text()
    if ticker=='CRWD':expect(section).to_contain_text('splitjusterade historik')
    section.evaluate('(e)=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-ownership.png'),animations='disabled')
    section.locator('h2').nth(1).evaluate('(e)=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-liquidity.png'),animations='disabled')
    select=p.locator('#capitalLiquidityHistory');select.select_option('borrowings' if ticker=='SOFI' else 'debt_total' if ticker=='NVDA' else 'debt_noncurrent');assert section.locator('.capital-chart').last.get_attribute('aria-label')
    summary=p.locator('#capitalSources > summary');summary.focus();p.keyboard.press('Enter');expect(p.locator('#capitalSources')).to_have_attribute('open','');summary.evaluate('(e)=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-sources.png'),animations='disabled')
    assert section.locator('a:visible').count()==4
    p.locator('#capitalMetric').select_option('sbc_expense');more=p.locator('#capitalSources td details').first;more.locator('summary').click();expect(more.locator('p').first).to_be_visible();expect(more).to_contain_text('XBRL:')
    if width==1440:p.locator('#capitalSources table').evaluate('(e)=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-passage.png'),animations='disabled')
    summary.focus();p.keyboard.press('Enter');expect(summary).to_be_focused();assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),key
    assert p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)==saved
    records.append(dict(ticker=ticker,width=width,theme=theme,overflow=False,keyboard=True,charts=2,savedResearchUnchanged=True));print('PASS',key,flush=True)
 case.go('research.html?ticker=NVDA');p.evaluate("async()=>{const d=await(await fetch('data/stocks/evidence/NVDA.json')).json();document.querySelector('#companyCapital').remove();NTMCompanyCapitalUI.render(d,document.querySelector('#evidenceCapital'),{status:'unavailable'});}")
 open_research_workspace(p,'#companyCapital')
 expect(p.locator('#companyCapital')).to_contain_text('tidigare verifierade');assert p.locator('#companyCapital .capital-chart').count()==2
 case.go('research.html?ticker=TTMI');assert p.locator('#companyCapital').count()==0
 (OUT/'results.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
finally:
 case.tearDown();BrowserSmoke.tearDownClass()
