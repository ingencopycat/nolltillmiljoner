"""A2 isolated browser evidence; no production writes or installed dependencies."""
import functools,hashlib,http.server,json,sys,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
PHASE=sys.argv[1] if len(sys.argv)>1 else 'pass-1'
OUT=HERE/'qa'/PHASE
OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/docs/design-exploration/a2/'
results=[];errors=[];requests=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 context=browser.new_context(reduced_motion='reduce')
 page=context.new_page()
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:requests.append((r.url,r.method)))
 def go(v,s,t,w):
  page.set_viewport_size({'width':w,'height':960 if w==1440 else 844})
  page.goto(base+f'prototype.html?direction=a&variant={v}&surface={s}&theme={t}')
  page.wait_for_selector('html[data-art-ready=true]')
 def shot(name,full=False):
  page.screenshot(path=str(OUT/(name+'.png')),full_page=full,animations='disabled')
  results.append({'name':name,'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth')})
 for v in '123':
  for surface in ('overview','thesis','public'):
   for theme in ('light','dark'):
    for width in (1440,390):
     go(v,surface,theme,width)
     shot(f'{v}-{surface}-{width}-{theme}')
     if surface=='thesis':
      page.locator('[data-action=edit]').click()
      shot(f'{v}-edit-{width}-{theme}')
     if surface=='public' and width==390:shot(f'{v}-public-full-{width}-{theme}',True)
  for theme in ('light','dark'):
   go(v,'overview',theme,390)
   page.locator('[data-art-action=controls]').click()
   shot(f'{v}-controls-390-{theme}')
   page.keyboard.press('Escape')
   page.locator('[data-action=picker]').click()
   page.locator('#company-search').fill('NVDA')
   shot(f'{v}-picker-390-{theme}')
   page.keyboard.press('Escape')
   page.locator('[data-action="source:revenue"]').first.click()
   shot(f'{v}-source-390-{theme}')
   page.keyboard.press('Escape')
  go(v,'overview','light',1440)
  assert '302,97' in page.locator('main').inner_text()
  page.locator('a.primary').first.click()
  page.wait_for_selector('html[data-art-ready=true]')
  assert f'variant={v}' in page.url and 'surface=thesis' in page.url
  page.locator('[data-action=edit]').click()
  page.locator('#thesis-input').fill('A2 temporary verification')
  page.locator('[data-action=save]').click()
  assert page.locator('#thesis-statement').inner_text()=='A2 temporary verification'
  page.reload();page.wait_for_selector('html[data-art-ready=true]')
  assert 'temporary' not in page.locator('#thesis-statement').inner_text()
  assert page.evaluate('localStorage.length+sessionStorage.length')==0
 browser.close()
server.shutdown()
baseline=json.loads((HERE.parent/'production-baseline.json').read_text(encoding='utf-8-sig'))
changed=[n for n,h in baseline.items() if hashlib.sha256((ROOT/n).read_bytes()).hexdigest()!=h]
external=[(u,m) for u,m in requests if not u.startswith(f'http://127.0.0.1:{server.server_port}/') or m!='GET']
report={'captures':len(results),'results':results,'errors':errors,'productionChanges':changed,'externalRequestsOrWrites':external}
(OUT/'results.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
for v in '123':
 names=[f'{v}-overview-1440-light',f'{v}-overview-1440-dark',f'{v}-overview-390-light',f'{v}-public-1440-light',f'{v}-public-390-dark',f'{v}-controls-390-light']
 sheet=Image.new('RGB',(1800,1240),'#d9dce0')
 for i,n in enumerate(names):
  im=Image.open(OUT/(n+'.png'));im.thumbnail((585,580));x=i%3*600;y=i//3*620
  sheet.paste(im,(x,y+30));ImageDraw.Draw(sheet).text((x+10,y+8),n,fill='black')
 sheet.save(OUT/f'{v}-contact.jpg')
print(json.dumps({k:v for k,v in report.items() if k!='results'}))
assert not errors,errors
assert not changed,changed
assert not external,external
assert not [r for r in results if r['overflow']],[r for r in results if r['overflow']]
