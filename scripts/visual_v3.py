"""Wave 1A real Chromium captures; public content is an intercepted offline fixture."""
import json
import sys
from pathlib import Path
from browser_smoke import BrowserSmoke

ROOT = Path(__file__).resolve().parents[1]
phase = sys.argv[1] if len(sys.argv) > 1 else 'after'
folder = ROOT / 'docs/qa/visual-v3' / phase
folder.mkdir(parents=True, exist_ok=True)
BrowserSmoke.setUpClass()
case = BrowserSmoke()
case.setUp()
p = case.page
p.emulate_media(reduced_motion='reduce')
results = []

def capture(name, target=None):
    if target:
        p.locator(target).scroll_into_view_if_needed()
        p.evaluate('(s)=>window.scrollTo(0,document.querySelector(s).getBoundingClientRect().top+scrollY-24)', target)
    else:
        p.evaluate('scrollTo(0,0)')
    p.screenshot(path=str(folder / (name + '.png')), animations='disabled')
    results.append(dict(name=name, overflow=p.evaluate('document.documentElement.scrollWidth>innerWidth'),
                        companyTop=p.locator('#companyName').bounding_box() if p.locator('#companyName').count() else None))

try:
    for width in (1440, 360, 390, 430):
        for theme in ('dark', 'light'):
            p.set_viewport_size(dict(width=width, height=960 if width==1440 else 844))
            case.go('research.html?ticker=NVDA')
            p.evaluate('applyTheme', theme)
            capture(f'overview-{width}-{theme}')
            if phase != 'before':
                assert p.locator('#companyName').bounding_box()['y'] < 240
                assert not p.locator('#thesisAdvanced').get_attribute('open')
                capture(f'chart-{width}-{theme}', '#overviewRevenue')
            capture(f'thesis-new-{width}-{theme}', '#thesisSection')
            p.locator('#thesis-text').fill('Efterfrågan på accelererad beräkning kan bära fortsatt tillväxt. Jag följer marginaler och kundernas investeringstakt.')
            p.locator('#thesisForm button[type=submit]').click()
            capture(f'thesis-existing-{width}-{theme}', '#thesisSection')
            p.locator('#assumptionDetail1').evaluate('(e)=>{for(let n=e;n;n=n.parentElement)if(n.tagName==="DETAILS")n.open=true}')
            capture(f'thesis-deep-{width}-{theme}', '#assumptionDetail1')
            p.evaluate('localStorage.removeItem("investment-research-theses-v1")')
    if phase != 'before':
        original = p.evaluate('JSON.stringify(currentStockData)')
        p.evaluate('''() => { const d=structuredClone(currentStockData); d.annual.splice(1,1); NTMVisualV3.revenue(d); }''')
        assert p.locator('#overviewRevenuePlot').inner_text().count('FY2025') == 1
        assert p.locator('#overviewRevenueValues').text_content().count('Saknas') == 1
        p.evaluate('''() => { const d=structuredClone(currentStockData); d.metadata.qualityStatus='unverified'; NTMVisualV3.revenue(d); }''')
        assert not p.locator('#overviewRevenue').is_visible()
        assert p.evaluate('JSON.stringify(currentStockData)') == original
        p.evaluate('NTMVisualV3.revenue(currentStockData)')
    if phase != 'before':
        p.set_viewport_size(dict(width=390,height=844))
        for theme in ('dark','light'):
            case.go('research.html?ticker=NVDA')
            p.evaluate('applyTheme',theme)
            p.locator('#companyPicker > summary').click()
            p.locator('#companySearch').fill('sofi')
            capture(f'picker-390-{theme}')
            p.locator('#companySearch').press('Escape')
            p.locator('.metric-info-btn').first.click()
            capture(f'provenance-390-{theme}')
            p.locator('#provenanceDialog').screenshot(path=str(folder/f'provenance-dialog-{theme}.png'))
            p.keyboard.press('Escape')
            p.locator('#thesis-text').fill('En sparad tes med eget datum för granskning. Jag följer efterfrågan och prövar marginalerna.')
            p.locator('#thesis-review-date').fill('2020-01-01')
            p.locator('#thesisForm button[type=submit]').click()
            p.locator('#companyResearchAction').click()
            capture(f'review-due-390-{theme}', '#thesisReview')
            p.evaluate('localStorage.removeItem("investment-research-theses-v1")')
    case.context.route('**/analys.html?*', lambda r:r.fulfill(content_type='text/html',body=(ROOT/'analys.html').read_text(encoding='utf-8').replace("connect-src 'self'", "connect-src 'self' https://offline-fixture.supabase.co")))
    case.context.route('**/cloud-config.js', lambda r: r.fulfill(content_type='application/javascript',body="window.NTMCloudConfig={enabled:true,url:'https://offline-fixture.supabase.co',publishableKey:'sb_publishable_offline_fixture'}"))
    fixture=dict(id='11111111-1111-4111-8111-111111111111', author=dict(username='research_fixture',displayName='Research fixture'),publishedAt='2026-09-16T12:00:00Z',content=dict(company='NVIDIA',ticker='NVDA',analysisDate='2026-09-15',thesis='Accelererad beräkning flyttar in företagens infrastruktur. Min tes är att efterfrågan förblir stark, men att tillväxttakten normaliseras när kunderna jämför investeringar med faktisk användning.', assumptions='Datacenter fortsätter växa. Bruttomarginalen förblir uthållig även när konkurrensen ökar.',risks='Kundkoncentration, exportrestriktioner och en svagare avkastning på kundernas investeringar.',falsification='Jag omprövar tesen om efterfrågan viker samtidigt som marginalerna faller.'))
    case.context.route('https://*.supabase.co/**',lambda r:r.fulfill(content_type='application/json',body=json.dumps(fixture if r.request.url.endswith('/ntm_social_read') else {})))
    for width in (1440,360,390,430):
        for theme in ('dark','light'):
            p.set_viewport_size(dict(width=width,height=960 if width==1440 else 844))
            case.go('analys.html?id='+fixture['id'])
            p.locator('#publicAnalysis h1').wait_for()
            p.evaluate('applyTheme',theme)
            capture(f'public-{width}-{theme}')
    (folder/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    from PIL import Image, ImageDraw
    names=['overview-1440-dark','overview-390-light','thesis-new-1440-dark','thesis-deep-390-light','public-1440-light','public-390-dark']
    sheet=Image.new('RGB',(1500,1080),'#ddd')
    for i,name in enumerate(names):
        im=Image.open(folder/(name+'.png')); im.thumbnail((490,500))
        x=(i%3)*500;y=(i//3)*540
        sheet.paste(im,(x,y+25));ImageDraw.Draw(sheet).text((x+8,y+6),name,fill='black')
    sheet.save(folder/'contact.jpg')
    assert not [r['name'] for r in results if r['overflow']], results
    print(json.dumps(dict(folder=str(folder),overflow=[r['name'] for r in results if r['overflow']],errors=case.errors)))
finally:
    case.tearDown()
    BrowserSmoke.tearDownClass()
