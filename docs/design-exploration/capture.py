"""Read-only localhost browser verification and exploration evidence. No production writes."""
import functools
import hashlib
import http.server
import json
import sys
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
phase = sys.argv[1] if len(sys.argv) > 1 else 'pass-1'
OUT = HERE / 'qa' / phase
OUT.mkdir(parents=True, exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/docs/design-exploration/'
results=[]
errors=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch()
    context=browser.new_context(reduced_motion='reduce')
    page=context.new_page()
    page.on('pageerror', lambda error:errors.append(str(error)))
    def shot(name):
        overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth')
        page.screenshot(path=str(OUT/(name+'.png')), animations='disabled')
        results.append({'name':name,'overflow':overflow})
    for d in 'abc':
        for surface in ('overview','thesis','public'):
            for width in (1440,390):
                page.set_viewport_size({'width':width,'height':960 if width==1440 else 844})
                for theme in ('light','dark'):
                    page.goto(base+f'prototype.html?direction={d}&surface={surface}&theme={theme}')
                    page.wait_for_selector('html[data-ready=true]')
                    page.evaluate('document.fonts.ready')
                    shot(f'{d}-{surface}-{width}-{theme}')
                    if surface=='thesis':
                        page.locator('#depth details').first.locator('summary').click()
                        page.locator('#depth').scroll_into_view_if_needed()
                        shot(f'{d}-thesis-deep-{width}-{theme}')
                    if surface=='public':
                        page.locator('#context').scroll_into_view_if_needed()
                        shot(f'{d}-public-data-{width}-{theme}')
        # Each direction: real interactions, data semantics, storage isolation.
        page.set_viewport_size({'width':390,'height':844})
        page.goto(base+f'prototype.html?direction={d}&surface=overview&theme=light')
        page.wait_for_selector('html[data-ready=true]')
        assert '302,97' in page.locator('main').inner_text()
        page.locator('[data-action=picker]').click()
        page.locator('#company-search').fill('NVDA')
        assert page.locator('[data-action=pick]').is_visible()
        page.locator('#company-search').fill('missing')
        assert 'Inget bolag' in page.locator('#company-results').inner_text()
        page.keyboard.press('Escape')
        page.locator('[data-action="source:revenue"]').first.click()
        assert '302' in page.locator('#dialog').inner_text()
        shot(f'{d}-source-390-light')
        page.keyboard.press('Escape')
        page.locator('#financials summary').click()
        assert page.locator('#financials table').is_visible()
        page.locator('[data-action=theme]').click()
        assert page.locator('html').get_attribute('data-theme')=='dark'
        page.goto(base+f'prototype.html?direction={d}&surface=thesis&theme=light')
        page.wait_for_selector('html[data-ready=true]')
        page.locator('[data-action=edit]').click()
        page.locator('#thesis-input').fill('Temporary QA edit')
        page.locator('[data-action=save]').click()
        assert page.locator('#thesis-statement').inner_text()=='Temporary QA edit'
        page.reload()
        page.wait_for_selector('html[data-ready=true]')
        assert 'Temporary' not in page.locator('#thesis-statement').inner_text()
        page.locator('[data-action=review]').click()
        page.locator('[data-action=review-save]').click()
        assert 'Granskad' in page.locator('.review-state').inner_text()
        assert 'Granskad' in page.locator('.mobile-review').inner_text()
        page.locator('#depth details').nth(2).locator('summary').click()
        page.locator('[data-action=close-thesis]').click()
        page.locator('[data-action=close-confirm]').click()
        assert page.locator('[data-action=review]').is_disabled()
        assert 'Avslutad' in page.locator('.mobile-review').inner_text()
        assert page.evaluate('localStorage.length+sessionStorage.length')==0
    browser.close()
server.shutdown()
for d in 'abc':
    names=[f'{d}-overview-1440-light',f'{d}-overview-1440-dark',f'{d}-overview-390-light',f'{d}-thesis-1440-light',f'{d}-public-1440-light',f'{d}-public-390-dark']
    sheet=Image.new('RGB',(1800,1250),'#ddddda')
    for i,name in enumerate(names):
        im=Image.open(OUT/(name+'.png'));im.thumbnail((585,570))
        x=(i%3)*600;y=(i//3)*625
        sheet.paste(im,(x,y+30));ImageDraw.Draw(sheet).text((x+8,y+8),name,fill='black')
    sheet.save(OUT/f'{d}-contact.jpg')
baseline=json.loads((HERE/'production-baseline.json').read_text(encoding='utf-8-sig'))
changed=[name for name,digest in baseline.items() if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest]
report={'captures':len(results),'results':results,'browserErrors':errors,'productionChanged':changed}
(OUT/'results.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='results'}))
assert not errors,errors
assert not changed,changed
assert not [r for r in results if r['overflow']], [r for r in results if r['overflow']]
