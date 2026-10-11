"""W42 content and responsive checks; three captures complement seven template captures."""
from pathlib import Path
import json
import unittest
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke


class Week42Browser(BrowserSmoke):
    def test_week42(self):
        p = self.page
        folder = Path(__file__).resolve().parents[1] / 'docs/qa/week42'
        folder.mkdir(parents=True, exist_ok=True)
        p.add_init_script("document.addEventListener('securitypolicyviolation',e=>(window.__weekCsp ||= []).push(e.violatedDirective))")
        for width in [1440, 768, 430, 390, 360]:
            p.set_viewport_size({'width': width, 'height': 1000})
            for filename in ['makro', 'rapporter']:
                self.go(filename + '.html?ntmDate=2026-10-12')
                if filename == 'makro':
                    expect(p.locator('.macro-event-card')).to_have_count(20)
                    expect(p.locator('#event-us-fed-warsh-2026-10-15')).to_contain_text('05:30')
                    expect(p.locator('#event-us-nfib-2026-10-13')).to_contain_text('Heldag')
                    expect(p.locator('#event-us-existing-home-sales-2026-10-13')).to_contain_text('3.98M')
                else:
                    img = p.locator('#weekVisual img')
                    img.scroll_into_view_if_needed(); img.evaluate('(i)=>i.decode()')
                    self.assertIn('week-42-', img.evaluate('el=>el.currentSrc'))
                    expect(p.locator('.earnings-days > p')).to_have_count(5)
                    expect(p.locator('.earnings-days > p').first).to_contain_text('Inga bolag listade')
                    expect(p.locator('#earnings-provenance details')).to_have_count(43)
                    expect(p.locator('#earnings-readable a[href*="research.html"]')).to_have_count(0)
                    expect(p.locator('.earnings-days')).to_contain_text('Publiceringstid ej bekräftad')
                    p.locator('#earnings-provenance > summary').focus(); p.keyboard.press('Enter')
                    summary = p.locator('#earnings-provenance details').filter(has_text='Källa och tidpunkt · BSVN').locator('summary')
                    summary.focus(); summary.press('Enter')
                    expect(summary.locator('..')).to_contain_text('15 okt. 16:00')
                    summary.press('Enter'); p.locator('#earnings-provenance > summary').click()
                for theme in ['light', 'dark']:
                    p.evaluate('applyTheme', theme)
                    p.emulate_media(reduced_motion='reduce')
                    p.evaluate('document.activeElement.blur()')
                    p.evaluate('window.scrollTo({top:0,behavior:"instant"})')
                    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)
                    if filename == 'rapporter':
                        boxes = [p.locator('#'+id).bounding_box() for id in ['weekVisual','earnings-readable','earnings-week-navigation']]
                        a,b,c = boxes
                        self.assertEqual(p.locator('#earnings-week-layout > *').count(),3)
                        if width > 860:
                            self.assertLess(a['x']+a['width'],b['x']); self.assertGreater(a['width'],b['width'])
                        else: self.assertGreaterEqual(b['y'],a['y']+a['height']-1)
                        self.assertGreaterEqual(c['y'],max(a['y']+a['height'],b['y']+b['height'])-1)
                    if filename == 'makro' and (width,theme) in [(1440,'light'),(360,'dark')]:
                        p.screenshot(path=str(folder/f'makro-{width}-{theme}.png'), full_page=True, animations='disabled')
                self.assertEqual(p.evaluate('window.__weekCsp || []'), [])

        self.go('makro.html?ntmDate=2026-10-11')
        p.locator('#upcomingWeeks [data-week="2026-W42"]').focus(); p.keyboard.press('Enter')
        expect(p.locator('.macro-event-card')).to_have_count(20)
        p.locator('#currentWeekNavigation [data-week="2026-W41"]').click()
        expect(p.locator('.macro-event-card')).to_have_count(9)
        self.go('index.html?ntmDate=2026-10-12')
        expect(p.locator('#ntmEarningsList')).to_have_text('Inga bolagsrapporter i kalendern idag.')
        self.go('index.html?ntmDate=2026-10-13')
        expect(p.locator('#ntmEarningsList')).to_contain_text('UNH')
        expect(p.locator('#ntmEarningsList')).to_contain_text('JPM')
        self.go('index.html?ntmDate=2026-10-14')
        expect(p.locator('#ntmMacroList')).to_contain_text('CPI / kärn-KPI')
        self.go('index.html?ntmDate=2026-10-16')
        expect(p.locator('#ntmMacroList')).to_contain_text('Warsh')
        expect(p.locator('#ntmMacroList')).to_contain_text('05:30')
        selection=json.loads((folder.parents[1]/'internal/week42-distribution.json').read_text(encoding='utf-8'))
        articles=''
        for kind,caption in [('earnings','Rapporter'),('macro','Makro')]:
            artifact=next(a for a in selection['artifacts'] if a['kind']==kind)
            articles+=f'<article><p>{caption} — Vecka 42, 2026</p><img src="{self.base}/{artifact["image"].removeprefix("./")}" alt="Originalbild"></article>'
        url=self.base+'/__qa/attachments'
        html='<!doctype html><html lang="sv"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{max-width:1100px;margin:32px auto;padding:0 20px;background:#313338;color:#fff;font:16px system-ui}article{margin:32px 0}img{display:block;max-width:100%;height:auto}p{margin:0 0 12px}</style>'+articles+'</html>'
        p.route(url,lambda route:route.fulfill(content_type='text/html',body=html));p.goto(url)
        expect(p.locator('article > p')).to_have_text(['Rapporter — Vecka 42, 2026','Makro — Vecka 42, 2026'])
        for image,kind in zip(p.locator('article img').all(),['rapporter','makro']):
            image.evaluate('(i)=>i.decode()')
            self.assertTrue(image.evaluate('(i)=>i.currentSrc').endswith(f'/images/{kind}/week-42.png'))
        p.set_viewport_size({'width':390,'height':1000})
        p.screenshot(path=str(folder/'discord-preview-390.png'),full_page=True,animations='disabled')
        self.assertEqual(self.errors,[])
        print('PASS: W42 content, 5 widths × 2 themes, shared structure, keyboard, CSP, homepage grouping, Swedish rollover, original Discord preview',flush=True)


if __name__ == '__main__':
    result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Week42Browser('test_week42')]))
    raise SystemExit(not result.wasSuccessful())
