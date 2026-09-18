"""Generate owner galleries and run final browser checks, isolated to this directory."""
import functools
import http.server
import json
import threading
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
QA=HERE/'qa'
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',28)
for theme in ('light','dark'):
    sheet=Image.new('RGB',(2880,2040),'#e0e2da')
    paths=[ROOT/f'docs/qa/visual-v3/before/overview-1440-{theme}.png']+[QA/f'pass-2/{d}-overview-1440-{theme}.png' for d in 'abc']
    names=['OLD / PRE-WAVE','A / FINANCIAL EDITORIAL','B / FINANCIAL WORKSPACE','C / NTM SIGNATURE']
    for i,(path,name) in enumerate(zip(paths,names)):
        x=(i%2)*1440;y=(i//2)*1020
        sheet.paste(Image.open(path).convert('RGB'),(x,y+60))
        ImageDraw.Draw(sheet).text((x+25,y+14),name,font=font,fill='#1a2a20')
    sheet.save(QA/f'comparison-{theme}.jpg',quality=92)

style='''*{box-sizing:border-box}body{margin:0;padding:35px 5%;background:#f3f4ee;color:#23332a;font:14px/1.6 Segoe UI,Arial,sans-serif}h1{font-size:35px;font-weight:500}a{color:#285d43}nav{display:flex;gap:20px;flex-wrap:wrap;margin:20px 0}h2{font-size:23px;font-weight:500;margin-top:40px}h3{font-size:17px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}figure{margin:0;background:white;border:1px solid #d5dbd0;padding:12px}figure img{width:100%;height:280px;object-fit:contain;object-position:top;background:#e8ece3}figcaption{font-size:12px;margin-bottom:12px}article{max-width:1050px;margin:auto}article table{width:100%;border-collapse:collapse;margin:25px 0;font-size:13px}article th,article td{text-align:left;border-bottom:1px solid #cad3c4;padding:12px;vertical-align:top}article pre{padding:20px;background:#e0e7d8;overflow:auto}article code{font-family:Consolas,monospace}p{max-width:950px}'''
html=f'<!doctype html><html lang="sv"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NTM screenshot evidence</title><style>{style}</style><h1>NTM / Rendered evidence</h1><p>Pass 1 → critique → pass 2. Images open at their original viewport resolution.</p><nav><a href="index.html">Interactive review</a><a href="report.html">Direction report</a><a href="iteration.md">Iteration critique</a><a href="qa/comparison-light.jpg">Old / A / B / C — light</a><a href="qa/comparison-dark.jpg">Old / A / B / C — dark</a></nav>'
for phase in ('pass-2','pass-1'):
    html+=f'<h2>{phase.upper()}</h2>'
    for d in 'abc':
        html+=f'<h3>Direction {d.upper()}</h3><section>'
        for path in sorted((QA/phase).glob(f'{d}-*.png')):
            src=path.relative_to(HERE).as_posix()
            html+=f'<figure><figcaption>{path.stem}</figcaption><a href="{src}" target="_blank"><img loading="lazy" src="{src}" alt="{path.stem}"></a></figure>'
        html+='</section>'
html+='</html>'
(HERE/'gallery.html').write_text(html,encoding='utf-8')
# Readable local report without a package/dependency. Markdown subset used in report.md.
import html as html_module
import re
def inline(text):
    text=html_module.escape(text)
    text=re.sub(r'`([^`]+)`',r'<code>\1</code>',text)
    text=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',text)
    text=re.sub(r'\[([^]]+)\]\(([^)]+)\)',r'<a href="\2">\1</a>',text)
    return text
parts=[];in_table=False;in_code=False;in_list=False
for line in (HERE/'report.md').read_text(encoding='utf-8').splitlines():
    if line.startswith('```'):
        parts.append('</code></pre>' if in_code else '<pre><code>');in_code=not in_code;continue
    if in_code:parts.append(html_module.escape(line)+'\n');continue
    if in_table and not line.startswith('|'):parts.append('</tbody></table>');in_table=False
    if in_list and not line.startswith('- '):parts.append('</ul>');in_list=False
    if not line:continue
    if line.startswith('|'):
        if re.match(r'^\|[\s:|\-]+$',line):continue
        cells=line.strip('|').split('|')
        if not in_table:parts.append('<table><tbody>');in_table=True
        parts.append('<tr>'+''.join('<td>'+inline(c.strip())+'</td>' for c in cells)+'</tr>');continue
    if line.startswith('#'):
        level=len(line)-len(line.lstrip('#'));parts.append(f'<h{level}>'+inline(line[level:].strip())+f'</h{level}>');continue
    if line.startswith('- '):
        if not in_list:parts.append('<ul>');in_list=True
        parts.append('<li>'+inline(line[2:])+'</li>');continue
    parts.append('<p>'+inline(line)+'</p>')
(HERE/'report.html').write_text(f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NTM direction report</title><style>{style}</style><article><nav><a href="index.html">Interactive review</a><a href="gallery.html">Screenshots</a></nav>'+''.join(parts)+'</article></html>',encoding='utf-8')
if '--artifacts-only' in sys.argv:
    print('Review gallery, comparison images and report regenerated.')
    sys.exit(0)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/docs/design-exploration/'
audit={'overflow':[],'contrast':[],'checks':[],'errors':[],'requests':[]}
def lum(h):
    if len(h)==4:h='#'+''.join(c*2 for c in h[1:])
    rgb=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    return sum(v*w for v,w in zip(rgb,(.2126,.7152,.0722)))
def contrast(a,b):
    a,b=sorted((lum(a),lum(b)))
    return (b+.05)/(a+.05)
with sync_playwright() as pw:
    browser=pw.chromium.launch()
    context=browser.new_context(reduced_motion='reduce')
    page=context.new_page()
    page.on('pageerror',lambda e:audit['errors'].append(str(e)))
    page.on('request',lambda r:audit['requests'].append({'url':r.url.replace(f'http://127.0.0.1:{server.server_port}','LOCAL'),'method':r.method}))
    for d in 'abc':
        for theme in ('light','dark'):
            page.set_viewport_size({'width':1440,'height':960})
            page.goto(base+f'prototype.html?direction={d}&surface=overview&theme={theme}')
            page.wait_for_selector('html[data-ready=true]')
            colors=page.evaluate('Object.fromEntries(["bg","ink","muted","surface","accent","accent-ink"].map(k=>[k,getComputedStyle(document.documentElement).getPropertyValue("--"+k).trim()]))')
            ratios={name:round(contrast(colors[a],colors[b]),2) for name,a,b in [('body','ink','bg'),('secondary','muted','bg'),('secondary-on-surface','muted','surface'),('button','accent-ink','accent')]}
            audit['contrast'].append({'direction':d,'theme':theme,**ratios})
            assert min(ratios.values())>=4.5,(d,theme,ratios)
            point=page.locator('[data-action="year:2024"]').first
            point.focus();page.keyboard.press('Enter')
            assert page.locator('#dialog').is_visible()
            assert 'FY2024' in page.locator('#dialog-title').inner_text()
            page.keyboard.press('Escape')
            assert page.evaluate('document.activeElement.dataset.action')=='year:2024'
            for surface in ('overview','thesis','public'):
                for width in (360,430,720):
                    page.set_viewport_size({'width':width,'height':844})
                    page.goto(base+f'prototype.html?direction={d}&surface={surface}&theme={theme}')
                    page.wait_for_selector('html[data-ready=true]')
                    if page.evaluate('document.documentElement.scrollWidth>innerWidth'):audit['overflow'].append([d,theme,surface,width])
                page.set_viewport_size({'width':390,'height':844})
                page.reload();page.wait_for_selector('html[data-ready=true]')
                page.screenshot(path=str(QA/'pass-2'/f'{d}-{surface}-390-{theme}-full.png'),full_page=True)
    page.set_viewport_size({'width':1440,'height':960})
    page.goto(base)
    for d in 'abc':
        page.locator('#direction').select_option(d)
        page.locator('#surface').select_option('thesis')
        page.locator('#theme').select_option('dark')
        page.locator('#size').select_option('mobile')
        frame=page.frame_locator('iframe')
        frame.locator('html[data-ready=true]').wait_for()
        assert frame.locator('#thesis-statement').is_visible()
        assert frame.locator('html').get_attribute('data-theme')=='dark'
    page.locator('#direction').select_option('all')
    assert page.locator('iframe').count()==3
    page.screenshot(path=str(QA/'review-hub.png'))
    audit['checks']=['All six palettes >=4.5 text contrast','Chart keyboard activation and focus return','54 additional reflow states at 360/430/720px','18 mobile full-page views','Hub direction/surface/theme/viewport switching','Side-by-side three iframe state','Zero local/session storage','No external requests or writes']
    assert page.evaluate('localStorage.length+sessionStorage.length')==0
    assert not [r for r in audit['requests'] if not r['url'].startswith('LOCAL') or r['method']!='GET']
    browser.close()
server.shutdown()
(QA/'verification.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in audit.items() if k!='requests'}))
assert not audit['overflow'],audit['overflow']
assert not audit['errors'],audit['errors']
