"""Two-pass saved-revision review using canonical pilot evidence in isolated contexts."""
import argparse,json
from pathlib import Path
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke
parser=argparse.ArgumentParser();parser.add_argument('--pass-number',required=True);args=parser.parse_args()
OUT=Path(__file__).resolve().parents[1]/'docs/qa/research-since'/('pass-'+args.pass_number);OUT.mkdir(parents=True,exist_ok=True)
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page;records=[]
try:
 p.emulate_media(reduced_motion='reduce')
 for ticker in ('NVDA','SOFI','CRWD'):
  case.go('research.html?ticker='+ticker)
  expect(p.locator('#researchSince')).to_contain_text('Spara en analys')
  p.locator('#thesis-text').fill('PRIVATE_RESEARCH_SENTINEL: granska mina sparade antaganden.')
  p.locator('#thesisForm [type=submit]').click()
  case.wait_for('t=>NTMThesisStorage.get(t).thesis?.revisionCount>=1',arg=ticker)
  expect(p.locator('#researchSince')).to_contain_text('Inga nya granskade')
  # Fixture timestamps model a genuine returning user, not newly imported evidence.
  p.evaluate("t=>{const k=NTMThesisStorage.key,d=JSON.parse(localStorage.getItem(k));d.theses[t].revisions[0].savedAt='2026-08-01T12:00:00Z';localStorage.setItem(k,JSON.stringify(d));}",ticker)
  saved=p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)
  for width in (1440,360,390,430):
   for theme in ('dark','light'):
    p.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});case.go('research.html?ticker='+ticker);p.evaluate('applyTheme',theme)
    host=p.locator('#researchSince');expect(host.locator('.since-group').first).to_be_visible()
    assert host.locator('.since-group').count()<=7
    assert host.locator('details[open]').count()==0
    assert 'PRIVATE_RESEARCH_SENTINEL' not in host.inner_text()
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    host.scroll_into_view_if_needed();p.screenshot(path=str(OUT/f'{ticker}-{width}-{theme}-default.png'),animations='disabled')
    group=host.locator('.since-group').first;group.locator('summary').first.focus();p.keyboard.press('Enter');expect(group).to_have_attribute('open','')
    evidence=group.locator('.since-change details').first;evidence.locator('summary').click();expect(evidence.locator('a').first).to_be_visible()
    host.scroll_into_view_if_needed();p.screenshot(path=str(OUT/f'{ticker}-{width}-{theme}-expanded.png'),animations='disabled')
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    if host.locator('.since-more').count():host.locator('.since-more > summary').click()
    for detail in host.locator('.since-group').all():
     if not detail.get_attribute('open') == '':detail.locator('summary').first.click()
     assert detail.locator('.since-change').count()>0
     assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
     detail.locator('summary').first.click()
    business=host.locator('[data-group=business]')
    if business.count():
     business.locator('summary').first.click();business.scroll_into_view_if_needed();p.screenshot(path=str(OUT/f'{ticker}-{width}-{theme}-values.png'),animations='disabled')
    assert p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)==saved
    records.append(dict(ticker=ticker,width=width,theme=theme,overflow=False,keyboard=True,immutable=True));print('PASS',ticker,width,theme,flush=True)
  host.get_by_role('link',name='Granska mot min tes',exact=True).click();expect(p.locator('#thesisReviewDepth')).to_have_attribute('open','')
  p.reload();expect(p.locator('#researchSince .since-group').first).to_be_attached()
  case.go('research.html?ticker=NVDA' if ticker!='NVDA' else 'research.html?ticker=SOFI');p.go_back();expect(p.locator('#researchSince .since-group').first).to_be_attached();p.go_forward();expect(p.locator('#researchSince')).to_be_attached()
  case.go('research.html?ticker='+ticker);p.locator('#thesis-text').fill('Updated private assumptions after reviewing evidence.');p.locator('#thesisForm [type=submit]').click()
  case.wait_for('t=>NTMThesisStorage.get(t).thesis?.revisionCount===2',arg=ticker)
  expect(p.locator('#researchSince')).to_contain_text('Inga nya granskade förändringar')
  assert p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions[0]',ticker)==saved[0]
 case.go('research.html?ticker=NVDA');p.route('**/data/stocks/evidence/NVDA.status.json',lambda route:route.fulfill(json={'status':'unavailable'}));p.reload();expect(p.locator('#researchSince')).to_contain_text('senast verifierat underlag')
 p.route('**/data/stocks/evidence/NVDA.json',lambda route:route.fulfill(status=503,body='unavailable'))
 p.evaluate('NTMCompanyEvidence.render(currentStockData)');expect(p.locator('#researchSince')).to_contain_text('senast verifierat underlag');expect(p.locator('#researchSince')).to_contain_text('Inga nya granskade förändringar')
 (OUT/'results.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
finally:
 case.tearDown();BrowserSmoke.tearDownClass()
