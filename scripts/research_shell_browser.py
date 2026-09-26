"""Wave 1 mounted-workspace, state, routing and two-pass visual regression checks."""
import argparse, json
from pathlib import Path
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke

parser=argparse.ArgumentParser();parser.add_argument('--pass-number',required=True);args=parser.parse_args()
OUT=Path(__file__).resolve().parents[1]/'docs/qa/research-shell'/('pass-'+args.pass_number)
OUT.mkdir(parents=True,exist_ok=True)
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page;records=[]

def nav(dimension,value):
    ids={'view':'researchWorkspaceNav','topic':'researchTopicNav','section':'researchThesisNav'}
    host=p.locator('#'+ids[dimension])
    if p.viewport_size['width']<=900:host.locator('select').select_option(value)
    else:host.locator('a[data-'+dimension+'="'+value+'"]').click()

def state():
    return p.evaluate("""() => ({valuation:JSON.stringify(valuationState),inputs:readEditableAssumptions(),
      text:document.getElementById('thesis-text').value,
      revisions:NTMThesisStorage.get(currentStockData.symbol).thesis?.revisions||[]})""")

try:
    p.emulate_media(reduced_motion='reduce')
    for ticker in ('NVDA','SOFI','CRWD'):
        case.go('research.html?ticker='+ticker)
        expect(p.locator('#companyEvidence')).to_contain_text('Senaste rapportering')
        expect(p.locator('#workspaceOverview')).to_be_visible()
        expect(p.locator('#companyInsiders')).to_be_hidden()
        expect(p.locator('#researchSincePreview')).to_be_hidden()
        nav('view','thesis');p.locator('#thesis-text').fill('Wave 1 private draft '+ticker)
        nav('view','valuation');p.locator('#val-price').fill('123')
        before=state();assert json.loads(before['valuation'])['stale']
        nav('view','data');nav('topic','capital');nav('topic','business');nav('view','thesis')
        assert state()==before
        expect(p.locator('#shellValuationRequired')).to_be_visible()
        p.locator('#thesisForm [type=submit]').click()
        assert state()['revisions']==[]
        p.locator('#shellValuationRequired a').click()
        expect(p.locator('#workspaceValuation')).to_be_visible()
        p.locator('#valuationForm [type=submit]').click()
        valid=state();assert not json.loads(valid['valuation'])['stale']
        nav('view','thesis');p.locator('#thesisForm [type=submit]').click()
        case.wait_for('t=>NTMThesisStorage.get(t).thesis?.revisionCount===1',arg=ticker)
        saved=state()['revisions']
        expect(p.locator('#researchSince')).to_contain_text('Inga nya granskade')
        nav('view','data');nav('topic','outlook');p.go_back()
        assert 'topic=financials' in p.url or 'topic=business' in p.url
        p.go_forward();expect(p.locator('#data-outlook')).to_be_visible()
        assert state()['revisions']==saved
        p.reload();expect(p.locator('#data-outlook')).to_be_visible()
        # Dated fixture exercises actual grouped changes and baseline immutability.
        p.evaluate("""t=>{const key=NTMThesisStorage.key,d=JSON.parse(localStorage.getItem(key));
          d.theses[t].revisions[0].savedAt='2026-08-01T12:00:00Z';localStorage.setItem(key,JSON.stringify(d));}""",ticker)
        p.reload();expect(p.locator('#researchSince .since-group').first).to_be_attached()
        saved=state()['revisions']
        for width in (1440,768,430,390,360):
            for theme in ('dark','light'):
                p.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});p.evaluate('applyTheme',theme)
                for view,topic in [('overview',None),('data','financials'),('data','business'),('data','outlook'),('data','capital'),('thesis',None),('valuation',None)]:
                    nav('view',view)
                    if topic:nav('topic',topic)
                    assert p.locator('[data-workspace]:visible').count()==1
                    if not p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'):
                        p.screenshot(path=str(OUT/'overflow.png'))
                        print(ticker,width,theme,view,topic,p.evaluate("""() => [...document.querySelectorAll('body *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).map(n=>[n.tagName,n.id,n.className,n.getBoundingClientRect().right]).slice(-25)"""),flush=True)
                        raise AssertionError('Horizontal overflow')
                    assert p.evaluate("""() => {const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.length===new Set(ids).size}""")
                    assert p.evaluate("""() => [...document.querySelectorAll('[data-workspace][hidden],[data-topic-panel][hidden],[data-thesis-panel][hidden]')].every(n=>n.inert&&!n.getClientRects().length)""")
                    if view=='valuation':
                        assert p.evaluate("""() => {const a=document.querySelector('.eps-source-badge').getBoundingClientRect(),b=document.querySelector('.eps-input-wrap button').getBoundingClientRect();return b.top>=a.bottom||b.left>=a.right||b.right<=a.left}""")
                    p.locator('#researchWorkspaceNav').scroll_into_view_if_needed()
                    p.screenshot(path=str(OUT/f'{ticker}-{width}-{theme}-{topic or view}.png'),animations='disabled')
                    records.append(dict(ticker=ticker,width=width,theme=theme,view=view,topic=topic,overflow=False))
                assert state()['revisions']==saved
        p.set_viewport_size({'width':1440,'height':1000})
        for anchor,view,topic in [('thesis-trigger','thesis',None),('researchFinancials','data','financials'),('companyInsiders','data','capital'),('observationSources','data','outlook'),('companyKpis','data','business'),('thesisHistorySection','thesis',None),('outcomeSection','thesis',None),('researchSince','thesis',None)]:
            case.go('research.html?ticker='+ticker+'#'+anchor)
            expect(p.locator('[data-workspace="'+view+'"]')).to_be_visible()
            if topic:expect(p.locator('#data-'+topic)).to_be_visible()
        nav('section','export');expect(p.locator('#researchExportMarkdown')).to_be_enabled()
        with p.expect_download() as download:p.locator('#researchExportMarkdown').click()
        assert download.value.suggested_filename.endswith('.md')
        p.locator('#researchExportPrint').click();expect(p.locator('#researchPrintView')).to_be_visible()
        p.locator('#researchPrintBack').click()
        nav('section','versions');expect(p.locator('#thesisRevisionSelect')).to_be_visible()
        assert state()['revisions']==saved
    # Full-document company switching keeps existing lifecycle and browser history behavior.
    case.go('research.html?ticker=NVDA&view=data&topic=capital')
    case.go('research.html?ticker=SOFI&view=valuation');p.go_back()
    expect(p.locator('#companyName')).to_contain_text('NVIDIA');expect(p.locator('#data-capital')).to_be_visible()
    p.go_forward();expect(p.locator('#companyName')).to_contain_text('SoFi');expect(p.locator('#workspaceValuation')).to_be_visible()
    p.route('**/data/stocks/evidence/NVDA.status.json',lambda r:r.fulfill(json={'status':'unavailable'}))
    case.go('research.html?ticker=NVDA');expect(p.locator('#researchSincePreview')).to_contain_text('otillgänglig')
    case.go('research.html?ticker=PRIVATE-MANUAL');expect(p.locator('#thesisSection')).to_be_visible()
    assert p.locator('#researchCompanyShell').count()==0
    (OUT/'results.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
    print('PASS',len(records),'visual cases; state, routing, legacy links, export, manual, unavailable',flush=True)
finally:
    case.tearDown();BrowserSmoke.tearDownClass()
