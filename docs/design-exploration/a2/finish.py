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
  for v in '123':
   for theme in ('light','dark'):
    page.set_viewport_size({'width':1440,'height':960})
    page.goto(base+f'a2/prototype.html?variant={v}&surface=overview&theme={theme}')
    page.wait_for_selector('html[data-art-ready=true]')
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
    assert '/a2/prototype.html?' in anchor.get_attribute('href')
    anchor.click()
    assert '/a2/prototype.html?' in page.url and page.url.endswith('#financials')
    mark=page.locator('[data-action="year:2026"]').first
    mark.focus()
    assert page.locator('.chart-tooltip').is_visible()
    assert '215,94' in page.locator('.chart-tooltip').inner_text()
    page.locator('.history').scroll_into_view_if_needed()
    page.screenshot(path=str(QA/'pass-2'/f'{v}-chart-focus-1440-{theme}.png'))
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
    page.screenshot(path=str(QA/'pass-2'/f'{v}-controls-focus-1440-{theme}.png'))
    page.keyboard.press('Enter')
    assert 'Exempel' in page.locator('#control-status').inner_text()
    page.keyboard.press('Escape')
    for surface in ('overview','thesis','public'):
     for width in (360,430,720):
      page.set_viewport_size({'width':width,'height':844})
      page.goto(base+f'a2/prototype.html?variant={v}&surface={surface}&theme={theme}')
      page.wait_for_selector('html[data-art-ready=true]')
      if page.evaluate('document.documentElement.scrollWidth>innerWidth'):audit['overflow'].append([v,theme,surface,width])
    page.set_viewport_size({'width':390,'height':844})
    page.goto(base+f'a2/prototype.html?variant={v}&surface=thesis&theme={theme}')
    page.wait_for_selector('html[data-art-ready=true]')
    assert '/a2/prototype.html?' in page.locator('.mobile-review').get_attribute('href')
    page.locator('#depth details').first.locator('summary').click()
    page.locator('#depth').scroll_into_view_if_needed()
    page.screenshot(path=str(QA/'pass-2'/f'{v}-thesis-depth-390-{theme}.png'))
    assert page.evaluate('localStorage.length+sessionStorage.length')==0
  page.set_viewport_size({'width':1440,'height':960})
  page.goto(base+'?direction=all&surface=public&theme=light&size=mobile')
  assert page.locator('#direction').input_value()=='all'
  assert page.locator('iframe').count()==4
  page.frame_locator('iframe').nth(3).locator('html[data-art-ready=true]').wait_for()
  page.screenshot(path=str(QA/'hub-mobile-comparison.png'))
  for v in ('a','1','2','3'):
   page.locator('#direction').select_option(v)
   page.locator('#surface').select_option('thesis')
   page.locator('#theme').select_option('dark')
   frame=page.frame_locator('iframe')
   frame.locator('html[data-ready=true]').wait_for()
   assert frame.locator('#thesis-statement').is_visible()
   assert frame.locator('html').get_attribute('data-theme')=='dark'
  page.locator('#size').select_option('desktop')
  page.locator('#surface').select_option('public')
  page.frame_locator('iframe').locator('html[data-art-ready=true]').wait_for()
  assert page.frame_locator('iframe').locator('.publication-header').is_visible()
  page.screenshot(path=str(QA/'hub-desktop.png'))
  browser.close()
 server.shutdown()
 baseline=json.loads((HERE.parent/'production-baseline.json').read_text(encoding='utf-8-sig'))
 audit['productionChanged']=[n for n,h in baseline.items() if hashlib.sha256((ROOT/n).read_bytes()).hexdigest()!=h]
 audit['checks']=['6 theme palettes and actual primary/hover contrast >=4.5','54 additional 360/430/720px reflow states','Keyboard chart tooltip, source dialog, Escape and focus return','Primary/secondary/tertiary/destructive focus, disabled state','Control specimen activation','All 4 hub variants, seeded thesis, public view, theme and size','Zero browser storage writes','184 production baseline hashes unchanged']
 (QA/'verification.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
 assert not audit['errors'],audit['errors']
 assert not audit['overflow'],audit['overflow']
 assert not audit['productionChanged'],audit['productionChanged']
 print(json.dumps({k:v for k,v in audit.items() if k!='contrast'}))

font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',25)
names=['A / ORIGINAL','A2.1 / MIDNIGHT-ELECTRIC','A2.2 / GRAPHITE-ICE','A2.3 / NAVY-BLUE-VIOLET']
for surface in ('overview','public'):
 for theme in ('light','dark'):
  for width in (1440,390):
   height=960 if width==1440 else 844
   sheet=Image.new('RGB',(width*2,(height+55)*2),'#e0e4e9')
   paths=[HERE.parent/f'qa/pass-2/a-{surface}-{width}-{theme}.png']+[QA/f'pass-2/{v}-{surface}-{width}-{theme}.png' for v in '123']
   for i,(path,name) in enumerate(zip(paths,names)):
    x=i%2*width;y=i//2*(height+55)
    sheet.paste(Image.open(path).convert('RGB'),(x,y+55))
    ImageDraw.Draw(sheet).text((x+15,y+15),name,font=font if width==1440 else ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17),fill='#1d293c')
   sheet.save(QA/f'comparison-{surface}-{width}-{theme}.jpg',quality=92)
   if surface=='public' and width==1440:sheet.save(QA/f'comparison-{theme}.jpg',quality=92)

style='''*{box-sizing:border-box}body{margin:0;padding:35px 5%;background:#f3f5f8;color:#203047;font:14px/1.65 Segoe UI,Arial,sans-serif}h1{font:40px Georgia,serif;letter-spacing:-.03em}h2{font:29px Georgia,serif;margin-top:45px}h3{font-size:18px}a{color:#295c86}nav{display:flex;gap:22px;flex-wrap:wrap;margin:24px 0}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}figure{margin:0;padding:14px;background:white;border:1px solid #ccd4df}figure img{width:100%;height:300px;object-fit:contain;object-position:top}figcaption{font-size:12px;margin-bottom:12px}article{max-width:1080px;margin:auto}table{width:100%;border-collapse:collapse;font-size:13px;margin:25px 0}td,th{padding:13px;border-bottom:1px solid #cad3df;vertical-align:top;text-align:left}pre{padding:20px;background:#e4eaf1;overflow:auto}code{font-family:Consolas,monospace}p{max-width:1000px}.table-wrap{overflow:auto}'''
g=f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A2 rendered evidence</title><style>{style}</style><h1>A2 / Art direction evidence</h1><nav><a href="../index.html">Owner review hub</a><a href="report.html">Direction report</a><a href="references-and-iteration.md">Reference study & critique</a></nav><h2>Original A and the three A2 variants</h2><section>'
for path in sorted(QA.glob('comparison-*-*-*.jpg')):
 rel=path.relative_to(HERE).as_posix();g+=f'<figure><figcaption>{path.stem}</figcaption><a href="{rel}" target="_blank"><img loading="lazy" src="{rel}" alt="{path.stem}"></a></figure>'
g+='</section>'
for phase in ('pass-2','pass-1'):
 g+=f'<h2>{phase.upper()}</h2>'
 for v in '123':
  g+=f'<h3>A2.{v}</h3><section>'
  for p in sorted((QA/phase).glob(v+'-*.png')):
   rel=p.relative_to(HERE).as_posix();g+=f'<figure><figcaption>{p.stem}</figcaption><a href="{rel}" target="_blank"><img loading="lazy" src="{rel}" alt="{p.stem}"></a></figure>'
  g+='</section>'
(HERE/'gallery.html').write_text(g+'</html>',encoding='utf-8')
def inline(s):
 s=html.escape(s);s=re.sub(r'`([^`]+)`',r'<code>\1</code>',s);s=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',s)
 return re.sub(r'\[([^]]+)\]\(([^)]+)\)',r'<a href="\2">\1</a>',s)
parts=[];table=False;code=False;listing=False
for line in (HERE/'report.md').read_text(encoding='utf-8').splitlines():
 if line.startswith('```'):
  parts.append('</code></pre>' if code else '<pre><code>');code=not code;continue
 if code:parts.append(html.escape(line)+'\n');continue
 if table and not line.startswith('|'):parts.append('</tbody></table></div>');table=False
 if listing and not line.startswith('- '):parts.append('</ul>');listing=False
 if not line:continue
 if line.startswith('|'):
  if re.match(r'^\|[\s:|\-]+$',line):continue
  first=not table
  if first:parts.append('<div class="table-wrap"><table><tbody>');table=True
  cell='th' if first else 'td';parts.append('<tr>'+''.join(f'<{cell}>'+inline(c.strip())+f'</{cell}>' for c in line.strip('|').split('|'))+'</tr>');continue
 if line.startswith('#'):
  n=len(line)-len(line.lstrip('#'));parts.append(f'<h{n}>'+inline(line[n:].strip())+f'</h{n}>');continue
 if line.startswith('- '):
  if not listing:parts.append('<ul>');listing=True
  parts.append('<li>'+inline(line[2:])+'</li>');continue
 parts.append('<p>'+inline(line)+'</p>')
(HERE/'report.html').write_text(f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A2 direction report</title><style>{style}</style><article><nav><a href="../index.html">Owner review hub</a><a href="gallery.html">Screenshots</a></nav>'+''.join(parts)+'</article></html>',encoding='utf-8')
print('A2 comparison gallery and readable report generated.')
