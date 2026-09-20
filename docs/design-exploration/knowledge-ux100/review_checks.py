"""Supplementary owner hub, sources, contrast, payload and failure recovery checks."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
H=Path(__file__).resolve().parent
R=H.parents[2]
B='http://127.0.0.1:8765/docs/design-exploration/knowledge-ux100/'
result={'sources':[],'contrast':[],'hub':False,'coldPayload':{}}
with sync_playwright() as p:
 browser=p.chromium.launch()
 ctx=browser.new_context(viewport={'width':1440,'height':1000})
 page=ctx.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(B+'index.html')
 expect(page.locator('iframe')).to_have_count(1)
 for d in 'abc':
  page.select_option('#direction',d)
  page.select_option('#viewport','390')
  page.select_option('#themeChoice','light')
  page.select_option('#demo','comparison')
  expect(page.frame_locator('iframe').locator('.comparison')).to_be_visible()
 page.locator('#compare').click();expect(page.locator('iframe')).to_have_count(3)
 existing=json.loads((H/'screenshots.json').read_text(encoding='utf-8'))
 page.goto(B+'gallery.html');expect(page.locator('figure')).to_have_count(len(existing))
 page.select_option('#filter','b');expect(page.locator('figure')).to_have_count(sum(s['direction']=='b' for s in existing))
 result['hub']=True
 shots=[s for s in existing if s['state']!='sources']
 for d in 'abc':
  # Beginner/experienced inputs and a genuinely unsupported contextual follow-up.
  page.goto(B+f'app.html?d={d}')
  for question,answer in [('Vad är en aktie?','Vad innebär det att äga en aktie?'),('När blir en jämförelse av fritt kassaflöde missvisande?','När blir en jämförelse av fritt kassaflöde missvisande?'),('Vad är P/E?','Vad betyder P/E?')]:
   page.locator('#question').fill(question);page.locator('#composer button').click()
   expect(page.locator('#answerTitle')).to_have_text(answer)
  page.locator('#question').fill('Och forward då?');page.locator('#composer button').click()
  expect(page.locator('.boundary h2')).to_have_text('Här saknas ett granskat svar')
  for theme in ['dark','light']:
   for width in [1440,390]:
    page.set_viewport_size({'width':width,'height':1000})
    page.goto(B+f'app.html?d={d}&theme={theme}&state=deep')
    page.locator('#answerTitle').wait_for()
    page.screenshot(path=str(H/'screenshots'/f'{d}-deep-{width}-{theme}.png'),full_page=True)
    if d=='c': page.get_by_role('button',name='Granska underlaget').click()
    expect(page.locator('#sources')).to_be_visible()
    assert page.locator('#sources').get_attribute('open') is not None
    assert page.locator('#sources a').count()>0
    assert not page.locator('#sources a:not([href^="https://"])').count()
    name=f'{d}-sources-{width}-{theme}.png'
    page.screenshot(path=str(H/'screenshots'/name),full_page=True)
    shots.append(dict(file=name,direction=d,state='sources',width=width,theme=theme))
    result['sources'].append([d,theme,width])
    ratios=page.evaluate('''()=>{const s=getComputedStyle(document.body);const rgb=v=>v.trim().slice(1).match(/../g).map(x=>parseInt(x,16)/255);const lum=v=>rgb(v).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);const ratio=(a,b)=>{const x=lum(s.getPropertyValue(a)),y=lum(s.getPropertyValue(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};return Object.fromEntries([['--text','--bg'],['--secondary','--bg'],['--muted','--bg'],['--accent','--bg'],['--on-accent','--accent'],['--muted','--panel']].map(([a,b])=>[a+'/'+b,ratio(a,b)]));}''')
    assert min(ratios.values())>=4.5,ratios
    if d=='a' and width==1440:result['contrast'].append(dict(theme=theme,ratios=ratios))
    # Refresh the comparison captures after the final neutral caption refinement.
    page.goto(B+f'app.html?d={d}&theme={theme}&state=comparison')
    page.locator('#answerTitle').wait_for()
    expect(page.locator('table caption')).to_have_text('Jämförelse av begreppen')
    page.screenshot(path=str(H/'screenshots'/f'{d}-comparison-{width}-{theme}.png'),full_page=True)
 # Fresh browser context ensures cold payload metrics, not cached responses.
 cold=browser.new_context();pc=cold.new_page();pc.goto(B+'app.html');pc.wait_for_function('window.Exploration')
 resources=pc.evaluate("performance.getEntriesByType('resource').map(x=>({path:new URL(x.name).pathname,bytes:x.decodedBodySize}))")
 result['coldPayload']={'resources':resources,'htmlBytes':(H/'app.html').stat().st_size,'totalFileBytes':sum((R/x['path'].lstrip('/')).stat().st_size for x in resources)+(H/'app.html').stat().st_size,'answerBodies':sum('/answers/' in x['path'] for x in resources)}
 assert result['coldPayload']['answerBodies']==0
 # Body network failure and version corruption use the actual core rejection;
 # recovering requires retry after the failed response condition is removed.
 for fault in ['network','version']:
  pc.goto(B+'app.html')
  def route(r):
   if fault=='network':r.fulfill(status=503,body='')
   else:
    data=r.fetch().json();data['contentVersion']=-1;r.fulfill(json=data)
  pc.route('**/data/knowledge/answers/pe.json',route)
  pc.locator('#question').fill('Vad är P/E?');pc.locator('#composer button').click()
  expect(pc.locator('#answer h2')).to_have_text('Vi kunde inte öppna svaret')
  assert pc.locator('.lead').count()==0
  pc.unroute('**/data/knowledge/answers/pe.json',route)
  pc.get_by_role('button',name='Försök igen',exact=True).click();expect(pc.locator('#answerTitle')).to_have_text('Vad betyder P/E?')
 for d in 'abc':
  page.goto(B+f'direct.html?d={d}&theme=light');assert 'P/E' in page.locator('h1').inner_text()
 assert not errors,errors
 browser.close()
(H/'review-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
(H/'screenshots.json').write_text(json.dumps(shots,ensure_ascii=False),encoding='utf-8')
print('PASS hub/side-by-side/gallery; 12 source captures; contrast; no initial answer bodies; real failure/retry; direct pages')
