"""Production-route stress checks. Public snapshots are intercepted QA data only."""
import json
from pathlib import Path
from browser_smoke import BrowserSmoke

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/qa/visual-v3/production'
OUT.mkdir(parents=True, exist_ok=True)
BrowserSmoke.setUpClass()
case = BrowserSmoke(); case.setUp(); p = case.page
results = []
contrast = """() => {
 const s=getComputedStyle(document.body), colors=['--text','--muted','--primary','--warning','--danger'];
 const lum=c=>{const rgb=c.trim().replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb.reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0)};
 const bg=lum(s.getPropertyValue('--bg'));
 return Object.fromEntries(colors.map(k=>{const fg=lum(s.getPropertyValue(k));return [k,(Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)]}));
}"""

def verify(name, screenshot=False):
    overflow = p.evaluate('document.documentElement.scrollWidth>innerWidth')
    assert not overflow, name
    ratios = p.evaluate(contrast)
    assert min(ratios.values()) >= 4.5, (name, ratios)
    results.append(dict(name=name, overflow=overflow, contrast=ratios))
    if screenshot:
        p.screenshot(path=str(OUT/(name+'.png')), animations='disabled')

try:
    p.emulate_media(reduced_motion='reduce')
    for ticker in ('NVDA','SOFI','CRWD','FLY','CRWV'):
        for width in (1440,360,390,430):
            for theme in ('dark','light'):
                p.set_viewport_size(dict(width=width,height=960 if width==1440 else 844))
                case.go('research.html?ticker='+ticker); p.evaluate('applyTheme',theme)
                assert p.locator('#companyName').bounding_box()['y'] < 240
                expected = p.evaluate('currentStockData.company.name')
                assert p.locator('#companyName').inner_text() == expected
                assert p.locator('#keyMetricsGrid .metric-box:visible').count() <= 3
                verify(f'{ticker}-{width}-{theme}', width in (1440,390))
                p.locator('[data-metrics-toggle]').click()
                verify(f'{ticker}-metrics-{width}-{theme}')
                if p.locator('#overviewRevenue').is_visible():
                    p.locator('.revenue-bar').first.focus(); p.keyboard.press('Enter')
                    assert p.locator('#provenanceDialog').is_visible()
                    p.keyboard.press('Escape')
                    assert p.locator('.revenue-bar').first.evaluate('(e)=>e===document.activeElement')
    case.go('research.html?ticker=NVDA')
    p.locator('#companyPicker > summary').click()
    p.locator('#companySearch').fill('company-with-no-match')
    assert p.locator('#stockSwitcherPills a:visible').count()==0
    assert p.locator('#companySearchStatus').inner_text()
    p.locator('#companySearch').press('Escape')
    assert p.locator('#companyPicker > summary').evaluate('(e)=>e===document.activeElement')
    p.locator('#thesis-text').fill('Lång tes om efterfrågan och osäkerhet. '*65)
    p.locator('#thesis-trigger').fill('Jag omprövar när underlaget förändras. '*30)
    p.locator('#thesisForm button[type=submit]').click()
    case.go('research.html?ticker=NVDA#thesisSection')
    assert len(p.locator('#thesis-text').input_value()) > 2000
    verify('long-saved-thesis',True)
    p.locator('#thesisAdvanced > summary').click()
    p.locator('#thesis-assumption-1').fill('Ett långt antagande med osäkra förutsättningar. '*30)
    p.locator('#thesisForm button[type=submit]').click()
    case.go('research.html?ticker=NVDA')
    case.open_depth_for('#thesis-assumption-1')
    assert len(p.locator('#thesis-assumption-1').input_value()) > 1000
    case.open_depth_for('#assumptionDetail1')
    verify('advanced-long-thesis',True)
    # The real current public contract is exercised without changing deployed config/data.
    case.context.route('**/analys.html?*', lambda r:r.fulfill(content_type='text/html',body=(ROOT/'analys.html').read_text(encoding='utf-8').replace("connect-src 'self'", "connect-src 'self' https://offline-fixture.supabase.co")))
    case.context.route('**/cloud-config.js', lambda r:r.fulfill(content_type='application/javascript',body="window.NTMCloudConfig={enabled:true,url:'https://offline-fixture.supabase.co',publishableKey:'sb_publishable_offline_fixture'}"))
    snapshot=dict(id='11111111-1111-4111-8111-111111111111',author=dict(username='a_very_long_username_1234',displayName='Long author display name'),publishedAt='2026-09-18T12:00:00Z')
    case.context.route('https://*.supabase.co/**',lambda r:r.fulfill(content_type='application/json',body=json.dumps(snapshot if r.request.url.endswith('/ntm_social_read') else {})))
    for state in ('short','long','optional-absent'):
        snapshot['content']=dict(company='A company with a long legal company name',ticker='QA',thesis=('En tes med tydlig ägare och osäkert utfall. '*160 if state=='long' else 'En kort tes.'))
        if state!='optional-absent':
            snapshot['content'].update(analysisDate='2026-09-17',assumptions='Författarens valda antagande.',risks='En beskriven risk.',falsification='Ett tydligt motbevis.')
        for width in (1440,360,390,430):
            for theme in ('dark','light'):
                p.set_viewport_size(dict(width=width,height=960 if width==1440 else 844))
                case.go('analys.html?id='+snapshot['id']); p.locator('#publicAnalysis h1').wait_for();p.evaluate('applyTheme',theme)
                assert p.locator('.report-byline a').get_attribute('href').endswith(snapshot['author']['username'])
                verify(f'public-{state}-{width}-{theme}',width in (1440,390))
    assert not case.errors, case.errors
    resources=p.evaluate("performance.getEntriesByType('resource').map(r=>({name:r.name,bytes:r.transferSize,duration:r.duration}))")
    (OUT/'stress.json').write_text(json.dumps(dict(checks=results,errors=case.errors,publicResources=resources),indent=2),encoding='utf-8')
    print(f'PASS: {len(results)} production stress/reflow/contrast states; selector, chart keyboard/focus, long saved thesis, public snapshot variants')
finally:
    case.tearDown(); BrowserSmoke.tearDownClass()
