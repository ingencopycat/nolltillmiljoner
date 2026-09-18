"""Final A2 checks, comparisons and readable owner report."""
import functools,hashlib,html,http.server,json,re,sys,threading
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
QA=HERE/'qa'
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def rgb(s):
 if s.startswith('#'):
  if len(s)==4:s='#'+''.join(c*2 for c in s[1:])
  return [int(s[i:i+2],16)/255 for i in (1,3,5)]
 return [float(v)/255 for v in re.findall(r'[\d.]+',s)[:3]]
def lum(s):
 c=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in rgb(s)]
 return sum(a*b for a,b in zip(c,(.2126,.7152,.0722)))
def contrast(a,b):
 a,b=sorted((lum(a),lum(b)));return round((b+.05)/(a+.05),2)
audit={'errors':[],'overflow':[],'contrast':[],'checks':[],'storageWrites':[]}
if '--artifacts-only' not in sys.argv:
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 base=f'http://127.0.0.1:{server.server_port}/docs/design-exploration/'
 with sync_playwright() as pw:
  browser=pw.chromium.launch()
  context=browser.new_context(reduced_motion='reduce')
  page=context.new_page()
  page.on('pageerror',lambda e:audit['errors'].append(str(e)))
  for v in '1':
   for theme in ('light','dark'):
    page.set_viewport_size({'width':1440,'height':960})
    page.goto(base+f'canonical/prototype.html?variant={v}&surface=overview&theme={theme}')
    page.wait_for_selector('html[data-art-ready=true]')
    assert page.locator('link[rel=stylesheet]').count()==1
    assert page.locator('link[rel=stylesheet]').get_attribute('href')=='canonical/v3.css'
    for selector in ('.metric-value','.publication-header h1','.public-deck','.wordmark'):
     if page.locator(selector).count():assert 'Georgia' in page.locator(selector).first.evaluate('(e)=>getComputedStyle(e).fontFamily')
    assert page.locator('a.primary').first.evaluate('(e)=>getComputedStyle(e).borderRadius')=='3px'
    assert 'Segoe UI' in page.locator('a.primary').first.evaluate('(e)=>getComputedStyle(e).fontFamily')
    colors=page.evaluate('Object.fromEntries(["bg","ink","muted","surface","secondary","positive","negative","warning","bar-stroke"].map(k=>[k,getComputedStyle(document.documentElement).getPropertyValue("--"+k).trim()]))')
    ratios={f'{k}/{bg}':contrast(colors[k],colors[bg]) for k in ('ink','muted','secondary','positive','negative','warning') for bg in ('bg','surface')}
    button=page.locator('a.primary').first
    bc=button.evaluate('(e)=>[getComputedStyle(e).color,getComputedStyle(e).backgroundColor]')
    ratios['primary']=contrast(*bc)
    button.hover();bc=button.evaluate('(e)=>[getComputedStyle(e).color,getComputedStyle(e).backgroundColor]')
    ratios['primary-hover']=contrast(*bc)
    audit['contrast'].append({'variant':v,'theme':theme,**ratios})
    assert min(ratios.values())>=4.5,(v,theme,ratios)
    anchor=page.locator('a[href$="#financials"]').first
    assert '/canonical/prototype.html?' in anchor.get_attribute('href')
    anchor.click()
    assert '/canonical/prototype.html?' in page.url and page.url.endswith('#financials')
    mark=page.locator('[data-action="year:2026"]').first
    mark.focus()
    assert page.locator('.chart-tooltip').is_visible()
    assert '215,94' in page.locator('.chart-tooltip').inner_text()
    page.locator('.history').scroll_into_view_if_needed()
    page.screenshot(path=str(QA/'final'/f'{v}-chart-focus-1440-{theme}.png'))
    page.keyboard.press('Enter')
    assert page.locator('#dialog').is_visible()
    page.keyboard.press('Escape')
    assert page.evaluate('document.activeElement.dataset.action')=='year:2026'
    page.locator('[data-art-action=controls]').click()
    assert page.locator('.control-buttons button:disabled').is_disabled()
    for cls in ('primary','secondary','tertiary','destructive'):
     b=page.locator('.control-buttons .'+cls).first
     b.hover()
     page.keyboard.press('Tab')
     b.focus()
     assert b.evaluate('(e)=>getComputedStyle(e).outlineStyle')!='none'
    page.locator('.control-buttons .primary').first.focus()
    page.screenshot(path=str(QA/'final'/f'{v}-controls-focus-1440-{theme}.png'))
    page.keyboard.press('Enter')
    assert 'Exempel' in page.locator('#control-status').inner_text()
    page.keyboard.press('Escape')
    for surface in ('overview','thesis','public'):
     for width in (360,430,720):
      page.set_viewport_size({'width':width,'height':844})
      page.goto(base+f'canonical/prototype.html?variant={v}&surface={surface}&theme={theme}')
      page.wait_for_selector('html[data-art-ready=true]')
      if page.evaluate('document.documentElement.scrollWidth>innerWidth'):audit['overflow'].append([v,theme,surface,width])
    page.set_viewport_size({'width':390,'height':844})
    page.goto(base+f'canonical/prototype.html?variant={v}&surface=thesis&theme={theme}')
    page.wait_for_selector('html[data-art-ready=true]')
    assert '/canonical/prototype.html?' in page.locator('.mobile-review').get_attribute('href')
    page.locator('#depth details').first.locator('summary').click()
    page.locator('#depth').scroll_into_view_if_needed()
    page.screenshot(path=str(QA/'final'/f'{v}-thesis-depth-390-{theme}.png'))
    assert page.evaluate('localStorage.length+sessionStorage.length')==0
  page.goto(base)
  page.wait_for_url('**/canonical/**')
  page.locator('#surface').select_option('thesis')
  page.locator('#theme').select_option('dark')
  page.locator('#size').select_option('mobile')
  frame=page.frame_locator('iframe')
  frame.locator('html[data-art-ready=true]').wait_for()
  assert frame.locator('#thesis-statement').is_visible()
  assert frame.locator('html').get_attribute('data-theme')=='dark'
  page.screenshot(path=str(QA/'review-hub.png'))
  browser.close()
 server.shutdown()
 baseline=json.loads((HERE.parent/'production-baseline.json').read_text(encoding='utf-8-sig'))
 audit['productionChanged']=[n for n,h in baseline.items() if hashlib.sha256((ROOT/n).read_bytes()).hexdigest()!=h]
 audit['checks']=['2 canonical theme palettes and actual primary/hover contrast >=4.5','18 additional 360/430/720px reflow states','Keyboard chart tooltip, source dialog, Escape and focus return','Primary/secondary/tertiary/destructive focus, disabled state','Control specimen activation','Canonical hub seeded thesis, theme and size','Zero browser storage writes','184 production baseline hashes unchanged']
 (QA/'verification.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
 assert not audit['errors'],audit['errors']
 assert not audit['overflow'],audit['overflow']
 assert not audit['productionChanged'],audit['productionChanged']
 print(json.dumps({k:v for k,v in audit.items() if k!='contrast'}))

