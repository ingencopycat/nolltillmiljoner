"""Two-pass owner presentation QA using unchanged production JSON, no live SEC calls."""
import argparse,json
from pathlib import Path
from research_navigation import open_research_workspace
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke

parser=argparse.ArgumentParser();parser.add_argument('--pass-number',required=True);args=parser.parse_args()
OUT=Path(__file__).resolve().parents[1]/'docs/qa/evidence-presentation'/('pass-'+args.pass_number);OUT.mkdir(parents=True,exist_ok=True)
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page;records=[]
try:
 p.emulate_media(reduced_motion='reduce')
 for ticker in ('NVDA','SOFI','CRWD'):
  case.go('research.html?ticker='+ticker)
  open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('Presentation review: saved analysis remains unchanged.')
  open_research_workspace(p, '#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click()
  case.wait_for('t=>NTMThesisStorage.get(t).thesis?.revisionCount>=1',arg=ticker)
  saved=p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)
  for width in (1440,360,390,430):
   for theme in ('dark','light'):
    key=f'{ticker}-{width}-{theme}';p.set_viewport_size({'width':width,'height':960 if width==1440 else 844})
    case.go('research.html?ticker='+ticker);p.evaluate('applyTheme',theme)
    expect(p.locator('#companyEvidence')).to_contain_text('Officiella dokument')
    expect(p.locator('#fundamentalSources')).not_to_have_attribute('open','')
    expect(p.locator('#reportingSources')).not_to_have_attribute('open','')
    assert p.locator('#fundamentalProfile button:visible').count()==0
    open_research_workspace(p,'#companyEvidence')
    assert p.locator('#companyEvidence .reporting-grid a:visible').count()>=2
    open_research_workspace(p,'#overviewRevenuePlot')
    assert p.locator('#overviewRevenuePlot').is_visible()
    assert p.locator('#companyEvidenceSince').is_hidden()
    expect(p.locator('#researchSince')).to_contain_text('Inga nya granskade förändringar')
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),key
    for name,selector in [('overview','#companyHeaderCard'),('numbers','#keyMetricsGrid'),('growth-profitability','#fundamentalProfile'),('revenue','#overviewRevenue'),('reporting-saved','#companyEvidence')]:
     open_research_workspace(p,selector)
     p.locator(selector).screenshot(path=str(OUT/f'{key}-{name}.png'),animations='disabled')
    for ident in ('fundamentalSources','reportingSources'):
     open_research_workspace(p,'#'+ident)
     summary=p.locator('#'+ident+' > summary');summary.focus();p.keyboard.press('Enter')
     expect(p.locator('#'+ident)).to_have_attribute('open','')
     p.locator('#provenance-heading' if ident=='reportingSources' else '#fundamentalSources > summary').scroll_into_view_if_needed();p.screenshot(path=str(OUT/f'{key}-{ident}-expanded.png'),animations='disabled')
     assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(key,ident)
     if ident=='fundamentalSources':
      trigger=p.locator('#fundamentalSources button').first;trigger.focus();p.keyboard.press('Enter')
      expect(p.locator('#provenanceDialog')).to_be_visible();p.keyboard.press('Escape');expect(trigger).to_be_focused()
     if ident=='reportingSources':p.keyboard.press('Escape');expect(summary).to_be_focused()
     else:summary.click()
    assert p.evaluate('t=>NTMThesisStorage.get(t).thesis.revisions',ticker)==saved
    records.append({'company':ticker,'width':width,'theme':theme,'overflow':False,'evidenceKeyboard':'passed','revisionUnchanged':True})
    print('PASS',key,flush=True)
 # Wave 2 leaves explicit gaps while retaining eligible observations and source access.
 case.go('research.html?ticker=NVDA')
 for edit in ("d.annual.at(-1).metrics.revenue.restated=true", "d.annual.at(-1).metrics.revenue.currency='EUR';d.annual.at(-1).metrics.revenue.unit='EUR'", "d.annual.at(-1).periodEnd='2026-01-01'", "d.annual.splice(1,1)"):
  p.evaluate('()=>{const d=structuredClone(currentStockData);'+edit+';NTMResearchOverview.render(d)}')
  expect(p.locator('#revenueUnavailable')).to_be_visible()
  assert p.locator('#overviewRevenuePlot .revenue-bar').count() < 3
  expect(p.locator('#overviewRevenueValues')).to_contain_text('FY2026')
 (OUT/'results.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
finally:
 case.tearDown();BrowserSmoke.tearDownClass()
