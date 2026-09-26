"""Actual Schedule 13D/G UI, two review passes, no network fixtures in CI."""
import argparse,json
from pathlib import Path
from research_navigation import open_research_workspace
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke
parser=argparse.ArgumentParser();parser.add_argument('--pass-number',required=True);args=parser.parse_args()
OUT=Path(__file__).resolve().parents[1]/'docs/qa/company-ownership'/('pass-'+args.pass_number);OUT.mkdir(parents=True,exist_ok=True)
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page;records=[]
try:
 p.emulate_media(reduced_motion='reduce')
 for ticker in ('NVDA','SOFI','CRWD'):
  case.go('research.html?ticker='+ticker);open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('Ownership evidence review: preserve saved Research.');open_research_workspace(p, '#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click();case.wait_for('t=>NTMThesisStorage.get(t).thesis?.revisionCount>=1',arg=ticker);saved=p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)
  for width in (1440,360,390,430):
   for theme in ('dark','light'):
    p.set_viewport_size({'width':width,'height':960 if width==1440 else 844});case.go('research.html?ticker='+ticker);p.evaluate('applyTheme',theme)
    open_research_workspace(p,'#companyOwnership');section=p.locator('#companyOwnership');expect(section).to_be_visible();key=f'{ticker}-{width}-{theme}'
    expect(p.locator('#ownershipSources')).not_to_have_attribute('open','');assert section.locator('a:visible').count()==0
    expect(section).to_contain_text('inte dagens innehav');assert section.locator('.ownership-entry').count()==(4 if ticker=='SOFI' else 2)
    assert section.evaluate("e=>!e.innerText.includes('0002100119-')&&!e.innerText.includes('SEC CIK')")
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),key
    section.evaluate('e=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-default.png'),animations='disabled')
    if ticker=='SOFI':
     section.locator('button.insider-more').click();assert section.locator('.ownership-entry').count()==5
     joint=section.locator('.ownership-entry').filter(has_text='JANE STREET GROUP, LLC');expect(joint).to_contain_text('gemensam rapportering, 4 personer');assert joint.locator('svg line').count()==1;joint.evaluate('e=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-joint.png'),animations='disabled')
    if ticker=='NVDA':
     changed=section.locator('.ownership-entry').filter(has=p.get_by_role('heading',name='The Vanguard Group',exact=True));expect(changed).to_contain_text('Ej jämförbart');assert changed.locator('svg line').count()==0
    detail=section.locator('.ownership-detail').last;detail.locator('summary').focus();p.keyboard.press('Enter');expect(detail.locator('a').first).to_be_visible();expect(detail).to_contain_text('Rösträtt:');assert detail.locator('a').first.get_attribute('href').startswith('https://www.sec.gov/Archives/')
    detail.evaluate('e=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-evidence.png'),animations='disabled')
    p.keyboard.press('Escape')
    if ticker=='SOFI':
     p.locator('#ownershipPeriod').select_option('history')
     assert section.locator('.ownership-entry').count()==1;expect(section).to_contain_text('SoftBank Group Corp.');expect(section).to_contain_text('Äldre 13D-historik från 2022');assert section.locator('svg line').count()==1
     section.evaluate('e=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-history.png'),animations='disabled');section.locator('.ownership-detail > summary').click();expect(section).to_contain_text('I denna rapport uppgav parterna');expect(section).to_contain_text('13D · ändring 4')
    else:assert section.locator('#ownershipPeriod').count()==0
    p.keyboard.press('Escape')
    method=p.locator('#ownershipSources');method.locator('summary').focus();p.keyboard.press('Enter');expect(method).to_have_attribute('open','');method.evaluate('e=>e.scrollIntoView({block:"start"})');p.screenshot(path=str(OUT/f'{key}-method.png'),animations='disabled')
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),key
    assert p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)==saved
    records.append(dict(ticker=ticker,width=width,theme=theme,overflow=False,keyboard=True,savedResearchUnchanged=True));print('PASS',key,flush=True)
 case.go('research.html?ticker=NVDA');p.evaluate("async()=>{const d=await(await fetch('data/stocks/evidence/NVDA.json')).json();document.querySelector('#companyOwnership').remove();d.ownershipEvidence.pendingReview=[{filingDate:'2026-09-23'}];NTMCompanyOwnershipUI.render(d,document.querySelector('#evidenceOwnership'),{status:'unavailable'});}")
 open_research_workspace(p,'#companyOwnership')
 expect(p.locator('#companyOwnership')).to_contain_text('tidigare verifierat');expect(p.locator('#companyOwnership')).to_contain_text('väntar på granskning')
 p.evaluate("async()=>{const d=await(await fetch('data/stocks/evidence/NVDA.json')).json();document.querySelector('#companyOwnership').remove();d.ownershipEvidence.filings=[];d.ownershipEvidence.pendingReview=[{filingDate:'2026-09-23'}];NTMCompanyOwnershipUI.render(d,document.querySelector('#evidenceOwnership'),{status:'verified'});}")
 open_research_workspace(p,'#companyOwnership')
 expect(p.locator('#companyOwnership')).to_contain_text('Det säger inget om vilka större ägare bolaget har.');assert p.locator('#companyOwnership .ownership-entry').count()==0
 case.go('research.html?ticker=TTMI');assert p.locator('#companyOwnership').count()==0
 (OUT/'results.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
finally:
 case.tearDown();BrowserSmoke.tearDownClass()
