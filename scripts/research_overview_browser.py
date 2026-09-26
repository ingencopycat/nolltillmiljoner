"""Wave 2 real UI, bounded composition, evidence states and two-pass screenshots."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke

parser = argparse.ArgumentParser()
parser.add_argument('--pass-number', required=True)
args = parser.parse_args()
OUT = Path(__file__).resolve().parents[1] / 'docs/qa/research-overview' / ('pass-' + args.pass_number)
OUT.mkdir(parents=True, exist_ok=True)
BrowserSmoke.setUpClass()
case = BrowserSmoke(); case.setUp(); p = case.page
records = []

def overview(ticker):
    case.go('research.html?ticker=' + ticker)
    expect(p.locator('#overviewOutlook')).to_contain_text('Senaste rapport')

try:
    p.emulate_media(reduced_motion='reduce')
    for ticker in ('NVDA', 'SOFI', 'CRWD'):
        overview(ticker)
        assert 4 <= p.locator('#keyMetricsGrid article').count() <= 5
        expect(p.locator('#researchSincePreview')).to_be_hidden()
        expect(p.locator('#fundamentalProfile')).to_be_hidden()
        if ticker == 'SOFI':
            expect(p.locator('#keyMetricsGrid')).not_to_contain_text('kassaflöde')
            expect(p.locator('#keyMetricsGrid')).not_to_contain_text('Rörelsemarginal')
            expect(p.locator('#keyMetricsGrid')).to_contain_text('Nettointäkter')
        if ticker == 'NVDA': expect(p.locator('#overviewBusiness')).to_contain_text('Data Center')
        if ticker == 'CRWD': expect(p.locator('#overviewBusiness')).to_contain_text('inte redovisad intäkt')
        assert p.locator('#overviewEvents article').count() <= 2
        assert p.locator('#overviewOutlook .overview-observation').count() <= 2
        # Every available metric and period mode, with exact source access.
        for key in p.locator('#overviewTrendMetric option').evaluate_all('(ns)=>ns.map(n=>n.value)'):
            p.locator('#overviewTrendMetric').select_option(key)
            for mode in ('annual', 'quarterly'):
                p.locator('#overviewTrendPeriod').select_option(mode)
                assert 'period=' + mode in p.url
                if p.locator('#overviewRevenuePlot .revenue-bar:visible').count():
                    button = p.locator('#overviewRevenuePlot .revenue-bar').first
                    button.focus(); p.keyboard.press('Enter')
                    expect(p.locator('#provenanceDialog')).to_be_visible()
                    p.keyboard.press('Escape'); expect(button).to_be_focused()
                else: expect(p.locator('#revenueUnavailable')).to_be_visible()
        p.locator('#overviewTrendMetric').select_option('revenue')
        p.locator('#overviewTrendPeriod').select_option('quarterly')
        p.reload(); expect(p.locator('#overviewTrendPeriod')).to_have_value('quarterly')
        p.locator('#overviewTrendPeriod').select_option('annual')
        p.go_back(); expect(p.locator('#overviewTrendPeriod')).to_have_value('quarterly')
        p.go_forward(); expect(p.locator('#overviewTrendPeriod')).to_have_value('annual')
        for selector, target in [('#overviewBusiness > a:last-child','#data-business'),('#overviewOutlook > a:last-child','#data-outlook'),('#overviewEvents > a','#companyMaterialEvents')]:
            if p.locator(selector).count():
                p.locator(selector).click(); expect(p.locator(target)).to_be_visible()
                p.reload(); expect(p.locator(target)).to_be_visible()
                p.go_back(); expect(p.locator('#workspaceOverview')).to_be_visible()
        for width in (1440, 768, 430, 390, 360):
            for theme in ('dark', 'light'):
                p.set_viewport_size({'width':width,'height':1000 if width==1440 else 844})
                p.evaluate('applyTheme', theme)
                p.locator('#companyName').click()
                p.evaluate('scrollTo(0,0)')
                assert p.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                assert p.locator('[data-workspace]:visible').count()==1
                assert p.evaluate("() => [...document.querySelectorAll('[data-workspace][hidden]')].every(n=>n.inert)")
                p.screenshot(path=str(OUT/f'{ticker}-{width}-{theme}.png'), full_page=True, animations='disabled')
                records.append({'ticker':ticker,'width':width,'theme':theme,'height':p.evaluate('document.documentElement.scrollHeight')})
        p.set_viewport_size({'width':1440,'height':1000})
        print('PASS', ticker, flush=True)
    # Invalid facts, missing values and definition changes cannot become plotted data.
    overview('NVDA')
    checks=p.evaluate("""() => {
      const data=structuredClone(currentStockData), key='revenue';
      data.quarterly.at(-1).metrics.revenue.value=null;
      const missing=NTMResearchOverview.rows(data,key,'quarterly').at(-1);
      data.annual.at(-1).metrics.revenue.restated=true;
      const recast=NTMResearchOverview.rows(data,key,'annual').at(-1);
      data.quarterly.at(-2).metrics.revenue.definition='revenue:other';
      const changed=NTMResearchOverview.rows(data,key,'quarterly');
      return !missing.available&&!recast.available&&changed.some(r=>!r.available);
    }""")
    assert checks
    # Real saved revision then explicit dated fixture; no writes from navigation.
    case.open_research_workspace('#valuationForm')
    p.locator('#val-price').fill('123');p.locator('#valuationForm [type=submit]').click()
    case.open_research_workspace('#thesis-text')
    p.locator('#thesis-text').fill('Overview saved fixture');p.locator('#thesisForm [type=submit]').click()
    case.wait_for("NTMThesisStorage.get('NVDA').thesis?.revisionCount===1")
    p.locator('#researchWorkspaceNav [data-view=overview]').click()
    expect(p.locator('#researchSincePreview')).to_have_attribute('data-state','quiet')
    p.screenshot(path=str(OUT/'state-no-change.png'),full_page=True)
    p.evaluate("""() => {const k=NTMThesisStorage.key,d=JSON.parse(localStorage.getItem(k));d.theses.NVDA.revisions[0].savedAt='2026-08-01T12:00:00Z';localStorage.setItem(k,JSON.stringify(d));}""")
    p.reload();expect(p.locator('#researchSincePreview')).to_have_attribute('data-state','changed')
    assert p.locator('#researchSincePreview li').count()<=2
    saved=p.evaluate('localStorage.getItem(NTMThesisStorage.key)')
    case.open_research_workspace('#thesis-text');p.locator('#thesis-text').fill('Unsaved overview draft')
    case.open_research_workspace('#val-price');p.locator('#val-price').fill('124')
    analytical=p.evaluate("JSON.stringify({valuation:valuationState,inputs:readEditableAssumptions(),draft:document.getElementById('thesis-text').value})")
    p.locator('#researchWorkspaceNav [data-view=overview]').click()
    p.locator('#overviewTrendPeriod').select_option('quarterly')
    p.go_back();expect(p.locator('#overviewTrendPeriod')).to_have_value('annual')
    assert p.evaluate("JSON.stringify({valuation:valuationState,inputs:readEditableAssumptions(),draft:document.getElementById('thesis-text').value})")==analytical
    assert p.evaluate('localStorage.getItem(NTMThesisStorage.key)')==saved
    p.locator('#companyName').click()
    p.screenshot(path=str(OUT/'state-changed.png'),full_page=True)
    p.locator('#researchSincePreview a').click();expect(p.locator('#thesis-review')).to_be_visible()
    assert p.evaluate('localStorage.getItem(NTMThesisStorage.key)')==saved
    p.go_back()
    p.route('**/data/stocks/evidence/NVDA.status.json',lambda r:r.fulfill(json={'status':'unavailable'}))
    p.reload();expect(p.locator('#researchSincePreview')).to_have_attribute('data-state','unavailable')
    expect(p.locator('#overviewBusiness')).to_contain_text('tidigare verifierat')
    p.screenshot(path=str(OUT/'state-partial.png'),full_page=True)
    p.route('**/data/stocks/evidence/NVDA.json',lambda r:r.fulfill(status=503,body='Unavailable'))
    p.reload();expect(p.locator('#overviewBusiness')).to_contain_text('inte tillgängligt')
    expect(p.locator('#researchSincePreview')).to_have_attribute('data-state','unavailable')
    expect(p.locator('#overviewEvents')).to_be_hidden()
    p.screenshot(path=str(OUT/'state-unavailable.png'),full_page=True)
    # Partial feed with reporting but no reviewed business/guidance is explicit.
    feed=json.loads((Path(__file__).resolve().parents[1]/'data/stocks/evidence/NVDA.json').read_text(encoding='utf-8'))
    feed.pop('reviewedEvidence',None)
    p.unroute('**/data/stocks/evidence/NVDA.json')
    p.route('**/data/stocks/evidence/NVDA.json',lambda r:r.fulfill(json=feed))
    p.reload();expect(p.locator('#overviewBusiness')).to_contain_text('Granskad verksamhetsbild saknas')
    expect(p.locator('#overviewOutlook')).to_contain_text('Granskad guidning saknas')
    expect(p.locator('#overviewOutlook')).to_contain_text('Senaste rapport')
    (OUT/'results.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
    print('PASS overview controls, sources, history, deep links and saved/failure states',flush=True)
finally:
    case.tearDown();BrowserSmoke.tearDownClass()
