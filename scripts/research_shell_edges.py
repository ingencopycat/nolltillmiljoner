"""Additional shell boundaries, keyboard, source equivalence and overview-length evidence."""
import json, subprocess
from pathlib import Path
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/qa/research-shell'
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page;records={}
try:
    # Original tracked composition, same canonical data and browser, isolated local context.
    # Fixed pre-shell baseline; HEAD now contains Wave 1 after its release.
    baseline_ref='132f13d5eb7d99bc63f40471eecf6dc8c3c12d6e^'
    original={name:subprocess.check_output(['git','show',baseline_ref+':'+name],cwd=ROOT) for name in
      ['research.html','research.js','company-evidence.js','research-since-ui.js','company-observations-ui.js',
       'company-capital-ui.js','company-insiders-ui.js','company-ownership-ui.js','company-material-events-ui.js','company-segments-ui.js']}
    old=case.context.new_page()
    def baseline(route):
        name=route.request.url.split('/')[-1]
        if name in original:route.fulfill(body=original[name],content_type='text/html; charset=utf-8' if name.endswith('.html') else 'application/javascript; charset=utf-8')
        else:route.continue_()
    old.route('**/*',baseline)
    def evidence(page):
        # Compare the original detailed sources; Wave 2 adds duplicate preview links.
        return page.evaluate("""() => ({height:document.documentElement.scrollHeight,
          sources:[...document.querySelectorAll('#researchDetail a[href]')].filter(n=>!n.closest('#overviewContext,#overviewEvents')).map(n=>n.href).filter(s=>s.startsWith('https://www.sec.gov/')).sort(),
          observations:[...document.querySelectorAll('.observation-history tbody tr')].map(n=>n.textContent).sort()})""")
    for ticker in ('NVDA','SOFI','CRWD'):
        old.goto(case.base+'/research.html?ticker='+ticker)
        expect(old.locator('#companyOwnership')).to_be_attached()
        before=evidence(old)
        case.go('research.html?ticker='+ticker)
        expect(p.locator('#companyOwnership')).to_be_attached()
        after=evidence(p)
        assert before['sources']==after['sources']
        assert before['observations']==after['observations']
        assert after['height']<before['height']/2
        records[ticker]={'beforeHeight':before['height'],'overviewHeight':after['height'],
                         'identicalSECLinks':len(after['sources']),'identicalObservationRows':len(after['observations'])}
    old.close()
    # Tab never enters a hidden workspace, and keyboard navigation selects a real destination.
    case.go('research.html?ticker=NVDA')
    link=p.locator('#researchWorkspaceNav [data-view=data]');link.focus();p.keyboard.press('Enter')
    expect(p.locator('#data-financials')).to_be_focused()
    for _ in range(30):
        p.keyboard.press('Tab')
        assert p.evaluate("!document.activeElement.closest('[inert],[hidden]')")
    assert p.locator('#annualChart').bounding_box()['width']>300
    # Empty and invalid route state safely selects the established overview.
    case.go('research.html?ticker=NVDA&view=invalid&topic=invalid');expect(p.locator('#workspaceOverview')).to_be_visible()
    case.go('research.html?ticker=MU&view=data&topic=business');expect(p.locator('#data-business')).to_contain_text('Granskat underlag saknas')
    # Existing inline manual entry still works after supported-company composition.
    case.go('research.html?ticker=NVDA');p.locator('#researchWorkspaceNav [data-view=thesis]').click()
    p.locator('#companyPicker > summary').click()
    p.locator('#manualThesisEntry > summary').click();p.locator('#manualTicker').fill('PRIVATE-MANUAL')
    p.locator('#manualThesisForm [type=submit]').click();expect(p.locator('#thesisSection')).to_be_visible()
    p.locator('#thesis-text').fill('Manual fixture');p.locator('#thesisForm [type=submit]').click()
    assert p.evaluate("NTMThesisStorage.get('PRIVATE-MANUAL').thesis.revisionCount")==1
    expect(p.locator('#shellValuationRequired')).to_have_count(0)
    p.go_back();expect(p.locator('#companyName')).to_contain_text('NVIDIA')
    expect(p.locator('#workspaceOverview')).to_be_visible()
    p.go_forward();expect(p.locator('#thesisSection')).to_be_visible()
    case.wait_for("currentStockData?.symbol==='PRIVATE-MANUAL'")
    # Saved storage errors must remain errors on both overview and detailed review.
    case.go('research.html?ticker=NVDA')
    p.evaluate("localStorage.setItem(NTMThesisStorage.key,'{broken')");p.reload()
    expect(p.locator('#researchSincePreview')).to_contain_text('kunde inte läsas säkert')
    p.locator('#researchSincePreview a').click();expect(p.locator('#thesis-versions')).to_be_visible()
    (OUT/'edges.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
    print('PASS source/observation equivalence, shorter overview, keyboard, manual switch, missing coverage, storage error',records)
finally:
    case.tearDown();BrowserSmoke.tearDownClass()
