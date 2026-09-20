"""Focused owner-selected FINAL A checks. No production or historical screenshot writes."""
import hashlib,json,time
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
H=Path(__file__).resolve().parent
ROOT=H.parents[2]
BASE='http://127.0.0.1:8765/docs/design-exploration/knowledge-ux100/'
OUT=H/'final-a-screenshots';OUT.mkdir(exist_ok=True)
report={'matrix':[],'screenshots':[],'composer':[],'scale':[],'journeys':[],'errors':[]}
states=['landing','pe','interpretation','related','search-blank','search-pe','explore','clarify','comparison','calculation','invalid','negative','none','judgment','deep','product','time','suppressed','load-error','version-error','malformed']
captures={'landing','pe','interpretation','search-blank','search-pe','explore','related'}

def ready(page,state):
 if state in ['pe','interpretation','related','comparison','calculation','negative','deep','product','time']:page.locator('#answerTitle').wait_for()
 elif state not in ['landing','search-blank','search-pe','explore']:page.locator('#answer h2').wait_for()
 else:page.wait_for_function('window.Exploration')

def query(page,text):
 page.locator('#question').fill(text);page.get_by_role('button',name='Skicka fråga',exact=True).click()

with sync_playwright() as pw:
 browser=pw.chromium.launch()
 for theme in ['dark','light']:
  for width in [1440,360,390,430]:
   context=browser.new_context(viewport={'width':width,'height':1000 if width==1440 else 844},has_touch=width!=1440)
   page=context.new_page();requests=[]
   page.on('pageerror',lambda e:report['errors'].append(str(e)))
   page.on('request',lambda r:requests.append((r.method,r.url)))
   for state in states:
    page.goto(BASE+f'app.html?d=final&theme={theme}&state={state}');ready(page,state)
    assert page.locator('body.final-a.direction-a').count()==1
    assert page.locator('.answer-aside,.answer-stages').count()==0
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,theme,state)
    assert page.locator('.modes button').count()==3
    assert page.locator('#moreSearch').count()==0
    assert page.locator('#composer button').inner_text()==''
    if page.locator('#composer button').is_visible():expect(page.locator('#composer button')).to_have_accessible_name('Skicka fråga')
    else:expect(page.locator('#composer button')).to_have_attribute('aria-label','Skicka fråga')
    unnamed=page.locator('button,input,select,summary').evaluate_all("""els=>els.filter(e=>e.getClientRects().length).filter(e=>!(e.textContent.trim()||e.getAttribute('aria-label')||Array.from(e.labels||[]).some(l=>l.textContent.trim()))).map(e=>e.outerHTML)""")
    assert not unnamed,unnamed
    if state in ['pe','interpretation','related','deep']:
     assert page.locator('.use').evaluate("e=>!!(e.compareDocumentPosition(document.querySelector('.related'))&Node.DOCUMENT_POSITION_FOLLOWING)")
     assert not page.locator('.answer-reading').inner_text().find('Fortsätt utforska')<page.locator('.answer-reading').inner_text().find('Använd det')
    if state=='search-blank':
     assert page.locator('#results .result-row').count()==0
     expect(page.locator('#searchBlank')).to_be_visible()
     assert not page.locator('#search .filters').is_visible()
    if state=='search-pe':
     expected=page.evaluate("Exploration.K.search('PE').filter(e=>e.conceptRefs.includes('pe')).slice(0,12).map(e=>e.id)")
     actual=page.locator('#results .result-row').evaluate_all("els=>els.map(e=>new URL(e.href).searchParams.get('id'))")
     assert actual==expected and actual
     assert 'pe' in actual and 'pe-interpretation' in actual and 'pe-versus-ps' in actual
     assert 'capex' not in actual and 'bond-yields' not in actual
     report['peMatches']=actual
    if state in ['landing','pe']:
     result=page.locator('#question').evaluate('''e=>{const s=getComputedStyle(e),c=document.createElement('canvas').getContext('2d');c.font=s.font;return {font:s.fontSize,placeholderFont:getComputedStyle(e,'::placeholder').fontSize,placeholder:e.placeholder,textWidth:c.measureText(e.placeholder).width,available:e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),shadow:getComputedStyle(e.parentElement).boxShadow,button:document.querySelector('#composer button').getBoundingClientRect().toJSON()};}''')
     assert result['textWidth']<=result['available'] and result['font']==result['placeholderFont'],result
     assert result['shadow']!='none'
     assert result['button']['width']>=44 and result['button']['height']>=44
     report['composer'].append(dict(theme=theme,width=width,state=state,**result))
    if state=='calculation':expect(page.locator('.result-number')).to_have_text('20 gånger')
    if state in ['suppressed','load-error','version-error','malformed']:assert page.locator('.lead').count()==0
    if state in captures:
     filename=f'final-{state}-{width}-{theme}.png';page.screenshot(path=str(OUT/filename),full_page=True)
     report['screenshots'].append(dict(file=filename,direction='final',state=state,width=width,theme=theme))
    report['matrix'].append([width,theme,state])
   # Mouse/touch and Enter must work both initially and after an answer.
   page.goto(BASE+f'app.html?d=final&theme={theme}')
   page.locator('#question').focus();page.keyboard.insert_text('Vad är P/E?');page.keyboard.press('Enter')
   expect(page.locator('#answerTitle')).to_have_text('Vad betyder P/E?')
   page.locator('#question').fill('Är P/E 40 dyrt?')
   if width==1440:page.get_by_role('button',name='Skicka fråga').click()
   else:page.get_by_role('button',name='Skicka fråga').tap()
   expect(page.locator('#answerTitle')).to_have_text('Vad behöver jag kontrollera innan jag tolkar ett P/E-tal?')
   page.locator('#question').fill('Vad är P/E?');page.keyboard.press('Enter')
   expect(page.locator('#answerTitle')).to_have_text('Vad betyder P/E?')
   assert page.locator('.composer-row').evaluate('e=>getComputedStyle(e).boxShadow')!='none'
   # Real approved product URLs, in separate tabs; no new handoff payload.
   actions=json.loads((H/'actions.json').read_text(encoding='utf-8'))['pe'][:4]
   actual=page.locator('.use a').evaluate_all("els=>els.map(e=>({url:new URL(e.href).pathname.slice(1)+new URL(e.href).search+new URL(e.href).hash,target:e.target,rel:e.rel}))")
   assert [a['url'] for a in actual]==[a['url'] for a in actions]
   assert all(a['target']=='_blank' and 'noopener' in a['rel'] and 'noreferrer' in a['rel'] for a in actual)
   # Source disclosure, relation keyboard continuation and public-ID browser history.
   page.locator('#sources>summary').focus();page.keyboard.press('Enter');expect(page.locator('#sources')).to_have_attribute('open','')
   page.locator('.related-link').first.focus();page.keyboard.press('Enter')
   expect(page.locator('#answerTitle')).to_have_text('Vad är EPS?')
   assert parse_qs(urlparse(page.url).query)['d']==['final']
   page.go_back();expect(page.locator('#answerTitle')).to_have_text('Vad betyder P/E?')
   page.go_forward();expect(page.locator('#answerTitle')).to_have_text('Vad är EPS?')
   page.reload();expect(page.locator('#answerTitle')).to_have_text('Vad är EPS?')
   # Mode semantics: no blank-query engine call, no inventory via filters or punctuation.
   page.locator('[data-mode=search]').focus();page.keyboard.press('Enter')
   page.evaluate('()=>{window.searchCalls=[];window.originalSearch=Exploration.K.search;Exploration.K.search=(...args)=>{searchCalls.push(args);return originalSearch(...args)};}')
   for text in ['', '   ','.','P']:
    page.locator('#searchInput').fill(text)
    assert page.locator('#results .result-row').count()==0
   page.evaluate('Exploration.renderSearch()');assert page.evaluate('searchCalls.length')==0,page.evaluate('searchCalls')
   page.locator('#searchInput').fill('PE');assert page.locator('#results .result-row').count()>0
   page.locator('#searchInput').fill('PRIVATE_SENTINEL 987654321');assert page.locator('#results .result-row').count()==0
   page.locator('#searchInput').fill('');page.locator('#searchBlank button').click()
   expect(page.locator('[data-mode=explore]')).to_have_attribute('aria-current','page')
   assert page.locator('.category-row').count()==7
   page.locator('.category-row').first.click();page.locator('#concepts summary').first.click()
   expect(page.locator('#concepts .result-row').first).to_be_visible()
   # Long question retains typography, editable full value and bounded page width.
   page.locator('[data-mode=ask]').click()
   long='PRIVATE_SENTINEL '+('Hur kan jag förstå ekonomi och investeringar? '*4)
   page.locator('#question').fill(long);page.locator('#question').press('End')
   assert page.locator('#question').input_value()==long
   assert page.locator('#question').evaluate('e=>getComputedStyle(e).fontSize')==('21px' if width==1440 else '20px')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.keyboard.press('Enter');page.locator('.boundary h2').wait_for()
   assert 'PRIVATE_SENTINEL' not in page.url and 'PRIVATE_SENTINEL' not in page.evaluate('JSON.stringify(history.state)')
   assert page.evaluate('localStorage.length+sessionStorage.length')==0
   assert page.evaluate('typeof window.NTMEvents')=='undefined'
   assert not [u for m,u in requests if m!='GET' or 'PRIVATE_SENTINEL' in u or '987654321' in u]
   page.locator('#newQuestion').click();expect(page.locator('#question')).to_be_focused()
   assert page.locator('.composer-row').evaluate('e=>getComputedStyle(e).outlineWidth')=='2px'
   report['journeys'].append([width,theme,'Enter, touch/click, modes, sources, relations, history, long input, privacy'])
   context.close();print('PASS FINAL A',width,theme,flush=True)
 # Context help, formula entry, invalid submission and follow-up boundaries.
 ctx=browser.new_context(viewport={'width':390,'height':844});page=ctx.new_page()
 for origin in ['research','calculator','macro','public-report']:
  page.goto(BASE+f'app.html?d=final&state={origin}')
  trigger=page.locator('#context button');trigger.click();page.locator('#helpBody button').wait_for()
  page.keyboard.press('Escape');expect(trigger).to_be_focused()
  trigger.click();page.locator('#helpBody button').click();page.locator('#answerTitle').wait_for()
  assert parse_qs(urlparse(page.url).query)['d']==['final']
 page.goto(BASE+'app.html?d=final&state=invalid');ready(page,'invalid')
 form=page.locator('.formula-form')
 form.locator('[name=price]').fill('100');form.locator('[name=eps]').fill('5');form.locator('button').click()
 expect(page.locator('.result-number')).to_have_text('20 gånger')
 query(page,'Och forward då?');expect(page.locator('.boundary h2')).to_have_text('Här saknas ett granskat svar')
 for width,zoom in [(720,200),(360,400)]:
  for theme in ['dark','light']:
   page.set_viewport_size({'width':width,'height':900});page.emulate_media(reduced_motion='reduce')
   page.goto(BASE+f'app.html?d=final&theme={theme}&state=comparison');ready(page,'comparison')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert page.evaluate('getComputedStyle(document.documentElement).scrollBehavior')!='smooth'
   assert page.locator('.composer-row').evaluate('e=>getComputedStyle(e).animationName')=='none'
 report['zoom']='200/400% layout reflow equivalents (720/360 CSS px from 1440), both themes; reduced motion checked'
 # Synthetic scale: blank Search is 0 rows even with filters; real PE relevance is stable.
 for count in [100,500,1200]:
  page.goto(BASE+'app.html?d=final');page.wait_for_function('window.Exploration')
  result=page.evaluate('''count=>{const t=performance.now(),size=Exploration.scale(count),build=performance.now()-t;
   Exploration.mode('search');const blankRows=document.querySelectorAll('#results .result-row').length;
   document.querySelector('#category').value='valuation';Exploration.renderSearch();const filteredBlankRows=document.querySelectorAll('#results .result-row').length;
   document.querySelector('#category').value='';const times=[];document.querySelector('#searchInput').value='PE';for(let i=0;i<20;i++){const start=performance.now();Exploration.renderSearch();times.push(performance.now()-start);}times.sort((a,b)=>a-b);const peRows=document.querySelectorAll('#results .result-row').length;
   document.querySelector('#searchInput').value=count>100?'Skalprov':'a';Exploration.renderSearch();const broadRows=document.querySelectorAll('#results .result-row').length;
   Exploration.mode('explore');Exploration.renderConcepts('valuation');return {...size,buildMs:build,blankRows,filteredBlankRows,peRows,broadRows,searchP95Ms:times[19],conceptRows:document.querySelectorAll('#concepts>details').length,dom:document.querySelectorAll('*').length,bodyRequests:performance.getEntriesByType('resource').filter(x=>x.name.includes('/answers/')).length};}''',count)
  assert result['blankRows']==result['filteredBlankRows']==result['bodyRequests']==0
  assert result['peRows']>0 and result['peRows']<=12 and result['broadRows']<=12 and result['conceptRows']<=10
  assert not page.locator('#moreSearch').count()
  report['scale'].append(result)
 # Review hub defaults to final, and every required state is directly selectable.
 page.goto(BASE+'index.html');expect(page.locator('#direction')).to_have_value('final')
 expect(page.locator('iframe')).to_have_attribute('title','FINAL A')
 for state in ['landing','pe','interpretation','related','search-blank','search-pe','explore']:
  page.select_option('#demo',state)
  frame=page.frame_locator('iframe')
  expect(frame.locator('body')).to_have_class('visual-v3 direction-a final-a'+(' has-answer' if state in ['pe','interpretation','related'] else ''))
 page.locator('#compare').click();expect(page.locator('iframe')).to_have_count(2)
 # Direct generated and production Knowledge remain readable without JS.
 plain=browser.new_context(java_script_enabled=False).new_page()
 for path in [BASE+'direct.html','http://127.0.0.1:8765/fragor-svar-pe-tal.html']:
  plain.goto(path);assert 'P/E' in plain.locator('h1').inner_text();assert plain.locator('a[href^="https://www.finra.org"]').count()
 assert not report['errors'],report['errors']
 browser.close()
baseline=json.loads((H/'production-baseline.json').read_text())
assert all(hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==digest for f,digest in baseline.items())
report['productionFilesUnchanged']=len(baseline)
(H/'final-a-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
(H/'final-a-screenshots.json').write_text(json.dumps(report['screenshots'],ensure_ascii=False),encoding='utf-8')
print('PASS',len(report['matrix']),'states;',len(report['screenshots']),'screenshots; production unchanged:',len(baseline))
