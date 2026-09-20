"""Bounded local UX matrix using real production engine/data. Run after build.cjs."""
import hashlib,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
BASE='http://127.0.0.1:8765/docs/design-exploration/knowledge-ux100/'
SHOTS=HERE/'screenshots'
SHOTS.mkdir(exist_ok=True)
states=['landing','pe','interpretation','clarify','comparison','calculation','invalid','negative','none','judgment','deep','related','product','search','explore','time','suppressed','load-error','version-error','index-error','malformed','followup']
capture={'landing','pe','interpretation','clarify','comparison','calculation','judgment','deep','search','explore'}
report={'matrix':[],'journeys':[],'performance':[],'screenshots':[],'errors':[]}

def ready(page,state):
    if state in ['pe','interpretation','comparison','calculation','negative','deep','related','product','time']:
        page.locator('#answerTitle').wait_for()
    elif state not in ['landing','search','explore']:
        page.locator('#answer h2' if state!='index-error' else '#ask h1').wait_for()
    else: page.locator('#composer' if state=='landing' else '#'+state).wait_for()
    page.evaluate('document.fonts.ready')

with sync_playwright() as pw:
    browser=pw.chromium.launch()
    context=browser.new_context()
    page=context.new_page()
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    requests=[]
    page.on('request',lambda r:requests.append((r.method,r.url)))
    for d in 'abc':
        # Product popups may initialize their own normal local state. Each UX
        # direction starts in a fresh isolated profile so those writes cannot
        # be misattributed to the prototype on the next iteration.
        context.close()
        context=browser.new_context()
        page=context.new_page()
        page.on('pageerror',lambda e:report['errors'].append(str(e)))
        page.on('request',lambda r:requests.append((r.method,r.url)))
        for theme in ['dark','light']:
            for width in [1440,360,390,430]:
                page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844})
                for state in states:
                    page.goto(BASE+f'app.html?d={d}&theme={theme}&state={state}')
                    ready(page,state)
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(d,theme,width,state,'overflow')
                    unnamed=page.locator('button,input,select,summary').evaluate_all("""els=>els.filter(e=>e.getClientRects().length).filter(e=>!(e.textContent.trim()||e.getAttribute('aria-label')||Array.from(e.labels||[]).some(l=>l.textContent.trim()))).map(e=>e.outerHTML)""")
                    assert not unnamed,(d,state,unnamed)
                    if state=='calculation': expect(page.locator('.result-number')).to_have_text('20 gånger')
                    if state=='negative': assert not page.locator('.result-number').count()
                    if state in ['suppressed','load-error','version-error','malformed']: assert not page.locator('.lead').count()
                    if state=='pe': assert page.locator('.related-link').count()==3
                    if width in [1440,390] and state in capture:
                        filename=f'{d}-{state}-{width}-{theme}.png'
                        page.screenshot(path=str(SHOTS/filename),full_page=True)
                        report['screenshots'].append(dict(file=filename,direction=d,state=state,width=width,theme=theme))
                    report['matrix'].append([d,theme,width,state])
                print('PASS matrix',d,theme,width,flush=True)
        # Full journeys: keyboard query, disclosure, typed continuation, Back/Forward, refresh.
        page.set_viewport_size({'width':390,'height':844})
        page.goto(BASE+f'app.html?d={d}')
        page.locator('#question').focus();page.keyboard.insert_text('Vad är P/E?');page.keyboard.press('Enter')
        expect(page.locator('#answerTitle')).to_have_text('Vad betyder P/E?')
        page.locator('#depth > summary').focus();page.keyboard.press('Enter')
        expect(page.locator('#depth')).to_have_attribute('open','')
        link=page.locator('.related-link').first
        next_title=link.locator('span').inner_text().removesuffix(' ↗')
        link.focus();page.keyboard.press('Enter')
        expect(page.locator('#answerTitle')).to_have_text(next_title)
        page.go_back();expect(page.locator('#answerTitle')).to_have_text('Vad betyder P/E?')
        page.go_forward();expect(page.locator('#answerTitle')).to_have_text(next_title)
        page.reload();expect(page.locator('#answerTitle')).to_have_text(next_title)
        for id in ['pe','eps','forward','pe-losses','pe-versus-ps','fcf']:
            page.evaluate('(id)=>Exploration.show({kind:"ANSWER",answerId:id})',id)
        assert page.evaluate('Exploration.trail.length')==5
        page.locator('#newQuestion').click();expect(page.locator('#question')).to_be_focused()
        page.locator('#question').fill('marginal');page.locator('#composer button').click()
        expect(page.locator('.boundary h2')).to_have_text('Menar du…')
        page.locator('.choice').first.click();page.locator('#answerTitle').wait_for()
        page.locator('[data-mode=explore]').click();page.locator('.category-row').first.click()
        page.locator('#concepts summary').first.click();page.locator('#concepts .result-row').first.click();page.locator('#answerTitle').wait_for()
        page.locator('[data-mode=search]').click();page.locator('#searchInput').fill('P/E')
        assert 0<page.locator('#results .result-row').count()<=12
        # Unsupported input stays transient in the current DOM only.
        page.locator('[data-mode=ask]').click();page.locator('#question').fill('PRIVATE_SENTINEL 987654321')
        page.locator('#composer button').click();page.locator('.boundary h2').wait_for()
        assert 'PRIVATE_SENTINEL' not in page.url
        assert 'PRIVATE_SENTINEL' not in page.evaluate('JSON.stringify(history.state)')
        assert page.evaluate('localStorage.length+sessionStorage.length')==0
        assert not page.evaluate('!!window.NTMEvents')
        # Context: actual allowlisted compact renderer, close/focus, then full answer.
        for origin in ['research','calculator','macro','public-report']:
            page.goto(BASE+f'app.html?d={d}&state={origin}')
            trigger=page.locator('#context button');trigger.click()
            page.locator('#helpBody button').wait_for()
            page.keyboard.press('Escape');expect(trigger).to_be_focused()
            trigger.click();page.locator('#helpBody button').click();page.locator('#answerTitle').wait_for()
        # Product link is canonical and explicitly opens a new tab without transfer.
        page.goto(BASE+f'app.html?d={d}&state=product');ready(page,'product')
        if d=='c': page.get_by_role('button',name='Använd det',exact=True).click()
        with context.expect_page() as new:
            page.locator('[data-product]').first.click()
        popup=new.value;popup.wait_for_load_state('domcontentloaded');assert '987654321' not in popup.url;popup.close()
        expect(page.locator('#answerTitle')).to_be_visible()
        # Reflow equivalents for a 1440px desktop at 200% and 400% browser zoom.
        for width in [720,360]:
            page.set_viewport_size({'width':width,'height':900});page.emulate_media(reduced_motion='reduce')
            page.goto(BASE+f'app.html?d={d}&state=comparison');ready(page,'comparison')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            assert page.evaluate('getComputedStyle(document.documentElement).scrollBehavior')!='smooth'
        report['journeys'].append(dict(direction=d,keyboard=True,history=True,privacy=True,context=True,product=True,reflow=True))
        print('PASS journeys',d,flush=True)
    assert not report['errors'],report['errors']
    assert not [(m,u)for m,u in requests if m!='GET']
    assert not [u for m,u in requests if 'PRIVATE_SENTINEL' in u or '987654321' in u]
    # No-JS direct page and existing canonical page remain readable, including sources.
    offline=context.browser.new_context(java_script_enabled=False)
    plain=offline.new_page()
    for path in [BASE+'direct.html','http://127.0.0.1:8765/fragor-svar-pe-tal.html']:
        plain.goto(path);assert 'P/E' in plain.locator('h1').inner_text();assert plain.locator('a[href^="https://www.finra.org"]').count()
    offline.close()
    # Real core with metadata-only synthetic expansion; real 100 entries retained.
    for count in [100,500,1200]:
        page.goto(BASE+'app.html?d=b')
        page.wait_for_function('window.Exploration')
        data=page.evaluate('''count=>{
          const start=performance.now(),size=Exploration.scale(count),init=performance.now()-start;
          const times={};for(const [name,fn]of Object.entries({retrieval:()=>Exploration.K.respond('Vad är P/E?'),search:()=>Exploration.K.search('P/E'),explore:()=>Exploration.renderConcepts('valuation')})){
            const values=[];for(let i=0;i<20;i++){const t=performance.now();fn();values.push(performance.now()-t);}values.sort((a,b)=>a-b);times[name]={p50:values[10],p95:values[19]};}
          Exploration.mode('search');Exploration.renderSearch();const resultRows=document.querySelectorAll('#results .result-row').length;
          Exploration.mode('explore');Exploration.renderConcepts('valuation');return {...size,initMs:init,times,resultRows,conceptRows:document.querySelectorAll('#concepts>details').length,dom:document.querySelectorAll('*').length,bodyRequests:performance.getEntriesByType('resource').filter(x=>x.name.includes('/answers/')).length,initialResources:performance.getEntriesByType('resource').map(x=>({path:new URL(x.name).pathname,bytes:x.decodedBodySize}))};
        }''',count)
        assert data['resultRows']<=12 and data['conceptRows']<=10 and data['bodyRequests']==0
        report['performance'].append(data)
    browser.close()

baseline=json.loads((HERE/'production-baseline.json').read_text())
changed=[f for f,digest in baseline.items() if hashlib.sha256((ROOT/f).read_bytes()).hexdigest()!=digest]
assert not changed,changed
report['productionFilesUnchanged']=len(baseline)
(HERE/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
(HERE/'screenshots.json').write_text(json.dumps(report['screenshots'],ensure_ascii=False),encoding='utf-8')
print('PASS',len(report['matrix']),'responsive states;',len(report['screenshots']),'screenshots; production unchanged:',len(baseline))
