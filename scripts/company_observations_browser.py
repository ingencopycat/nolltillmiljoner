"""Real-data, two-pass guidance/KPI presentation and Research persistence checks."""
import argparse,json
from pathlib import Path
from research_navigation import open_research_workspace
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke
parser=argparse.ArgumentParser();parser.add_argument('--pass-number',required=True);args=parser.parse_args()
OUT=Path(__file__).resolve().parents[1]/'docs/qa/company-observations'/('pass-'+args.pass_number);OUT.mkdir(parents=True,exist_ok=True)
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page;records=[]
try:
 p.emulate_media(reduced_motion='reduce')
 for ticker in ('NVDA','SOFI','CRWD'):
  case.go('research.html?ticker='+ticker);open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('Reviewed observations: saved revision remains unchanged.');open_research_workspace(p, '#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click();case.wait_for('t=>NTMThesisStorage.get(t).thesis?.revisionCount>=1',arg=ticker);saved=p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)
  for width in (1440,360,390,430):
   for theme in ('dark','light'):
    key=f'{ticker}-{width}-{theme}';p.set_viewport_size({'width':width,'height':960 if width==1440 else 844});case.go('research.html?ticker='+ticker);p.evaluate('applyTheme',theme)
    open_research_workspace(p,'#companyObservations');section=p.locator('#companyObservations');expect(section).to_be_visible();expect(p.locator('#observationSources')).not_to_have_attribute('open','')
    expect(section).to_contain_text('Bolagets guidning');assert p.locator('#observationSources a:visible').count()==0
    assert p.locator('#companyKpis .observation-chart').count()=={'NVDA':0,'SOFI':1,'CRWD':2}[ticker]
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),key
    assert p.locator('#companyObservations').evaluate("e=>!e.innerText.includes('0001045810-')&&!e.innerText.includes('0001818874-')&&!e.innerText.includes('0001535527-')")
    p.evaluate('document.activeElement?.blur()')
    section.evaluate('(e)=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-default.png'),animations='disabled')
    open_research_workspace(p,'#companyKpis')
    p.locator('#companyKpis h2').first.evaluate('(e)=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-kpis.png'),animations='disabled')
    open_research_workspace(p,'#companyObservations')
    section.locator('.observation-grid').first.locator('article').last.evaluate('(e)=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-guidance-detail.png'),animations='disabled')
    summary=p.locator('#observationSources > summary');summary.focus();p.keyboard.press('Enter');expect(p.locator('#observationSources')).to_have_attribute('open','');p.locator('#provenance-heading').scroll_into_view_if_needed();p.screenshot(path=str(OUT/f'{key}-sources.png'),animations='disabled');assert p.locator('#observationSources a:visible').count()>10
    detail=p.locator('#observationSources td details').first;detail.locator('summary').click();expect(detail.locator('p').first).to_be_visible()
    p.locator('#observationSources table').evaluate('(e)=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-source-passage.png'),animations='disabled')
    p.keyboard.press('Escape');expect(p.locator('#observationSources')).not_to_have_attribute('open','');expect(summary).to_be_focused()
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),key
    assert p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)==saved
    records.append(dict(company=ticker,width=width,theme=theme,overflow=False,sourcesKeyboard=True,revisionUnchanged=True));print('PASS',key,flush=True)
 # Simulated health failure must retain current verified observations with a visible warning.
 case.go('research.html?ticker=SOFI');p.evaluate("async()=>{const d=await (await fetch('data/stocks/evidence/SOFI.json')).json();document.querySelector('#companyObservations').remove();NTMCompanyObservationsUI.render(d,document.querySelector('#evidenceGuidance'),{status:'unavailable'});}")
 open_research_workspace(p,'#companyObservations')
 expect(p.locator('#companyObservations')).to_contain_text('tidigare verifierade');expect(p.locator('#companyObservations')).to_contain_text('15,81')
 (OUT/'results.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
finally:
 case.tearDown();BrowserSmoke.tearDownClass()
