"""Week 41 content, original attachment previews and shared-page visual review."""
from pathlib import Path
import json
import unittest
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke


class Week41Browser(BrowserSmoke):
    def test_week41(self):
        p = self.page
        folder = Path(__file__).resolve().parents[1] / 'docs/qa/week41'
        folder.mkdir(parents=True, exist_ok=True)
        p.add_init_script("document.addEventListener('securitypolicyviolation',e=>(window.__weekCsp ||= []).push(e.violatedDirective))")
        for width in [1440, 768, 430, 390, 360]:
            p.set_viewport_size({'width': width, 'height': 1000})
            for filename in ['makro', 'rapporter']:
                self.go(filename + '.html?ntmDate=2026-10-05')
                if filename == 'makro':
                    expect(p.locator('.macro-event-card')).to_have_count(9)
                    expect(p.locator('#event-us-fed-logan-global-perspectives-2026-10-06')).to_contain_text('01:00')
                    expect(p.locator('#event-us-fomc-minutes-2026-10-07')).to_contain_text('20:00')
                    expect(p.locator('#event-us-consumer-credit-2026-10-07')).to_contain_text('21:00')
                    expect(p.locator('#event-us-fed-schmid-economic-outlook-2026-10-09')).to_contain_text('15:30')
                    expect(p.locator('.macro-metric-val.has-actual')).to_have_count(1)
                    expect(p.locator('#event-us-ism-services-2026-10-05')).to_contain_text('54.9')
                    expect(p.locator('#event-us-michigan-prelim-consumer-survey-2026-10-09')).to_contain_text('48.1')
                    p.locator('#weekArchive [data-week="2026-W39"]').click()
                    expect(p.locator('.macro-event-card')).to_have_count(9)
                    p.locator('#weekArchive [data-week="2026-W40"]').click()
                    expect(p.locator('.macro-event-card')).to_have_count(21)
                    p.locator('#currentWeekNavigation [data-week="2026-W41"]').click()
                    expect(p.locator('.macro-event-card')).to_have_count(9)
                else:
                    img = p.locator('#weekVisual img')
                    img.scroll_into_view_if_needed(); img.evaluate('(i)=>i.decode()')
                    self.assertIn('week-41-', img.evaluate('el=>el.currentSrc'))
                    expect(p.locator('#earnings-readable')).to_contain_text('5–9 oktober 2026')
                    expect(p.locator('.earnings-days > p')).to_have_count(5)
                    expect(p.locator('.earnings-days > p').first).to_contain_text('Inga bolag listade')
                    expect(p.locator('#earnings-readable')).to_contain_text('cirka 6 okt. 14:00')
                    expect(p.locator('#earnings-readable')).to_contain_text('cirka 8 okt. 12:00')
                    expect(p.locator('#earnings-provenance details')).to_have_count(20)
                    expect(p.locator('#earnings-readable a[href*="research.html"]')).to_have_count(0)
                    p.locator('#earnings-provenance > summary').focus(); p.keyboard.press('Enter')
                    summary = p.locator('#earnings-provenance details').filter(has_text='Källa och tidpunkt · PENG').locator('summary')
                    summary.focus(); summary.press('Enter')
                    expect(summary.locator('..')).to_contain_text('6 okt. 22:30')
                    expect(p.locator('.earnings-days')).to_contain_text('Publiceringstid ej bekräftad')
                    if width in [1440, 360]:
                        summary.locator('..').screenshot(path=str(folder / f'peng-source-{width}.png'), animations='disabled')
                    summary.press('Enter'); p.locator('#earnings-provenance > summary').click()
                for theme in ['light', 'dark']:
                    p.evaluate('applyTheme', theme)
                    p.emulate_media(reduced_motion='reduce')
                    p.evaluate('document.activeElement.blur()')
                    p.evaluate('window.scrollTo({top:0,behavior:"instant"})')
                    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)
                    p.screenshot(path=str(folder / f'{filename}-{width}-{theme}.png'), full_page=True, animations='disabled')
                self.assertEqual(p.evaluate('window.__weekCsp || []'), [])

        self.go('makro.html?ntmDate=2026-10-04')
        p.locator('#upcomingWeeks [data-week="2026-W41"]').focus(); p.keyboard.press('Enter')
        expect(p.locator('.macro-event-card')).to_have_count(9)
        self.go('index.html?ntmDate=2026-10-06')
        expect(p.locator('#ntmEarningsList')).to_contain_text('PENG')
        expect(p.locator('#ntmEarningsList')).to_contain_text('STZ')
        expect(p.locator('#ntmMacroList')).not_to_contain_text('Logan')
        self.go('index.html?ntmDate=2026-10-07')
        expect(p.locator('#ntmMacroList')).to_contain_text('Logan')
        expect(p.locator('#ntmMacroList')).to_contain_text('01:00')
        expect(p.locator('#ntmMacroList')).to_contain_text('FOMC')
        self.go('index.html?ntmDate=2026-10-05')
        expect(p.locator('#ntmEarningsList')).to_have_text('Inga bolagsrapporter i kalendern idag.')
        # Ephemeral attachment review: no week-specific HTML file is published.
        selection = json.loads((folder.parents[1] / 'internal/week41-distribution.json').read_text(encoding='utf-8'))
        articles = ''
        for kind, caption in [('earnings', 'Rapporter'), ('macro', 'Makro')]:
            artifact = next(a for a in selection['artifacts'] if a['kind'] == kind)
            articles += f'<article><p>{caption} — Vecka 41, 2026</p><img src="{self.base}/{artifact["image"].removeprefix("./")}" alt="Originalbild"></article>'
        preview_url = self.base + '/__qa/attachments'
        preview_html = '<!doctype html><html lang="sv"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{max-width:1100px;margin:32px auto;padding:0 20px;background:#313338;color:#fff;font:16px system-ui}article{margin:32px 0}img{display:block;max-width:100%;height:auto}p{margin:0 0 12px}</style>' + articles + '</html>'
        p.route(preview_url, lambda route: route.fulfill(content_type='text/html', body=preview_html))
        p.goto(preview_url)
        expect(p.locator('article > p')).to_have_text(['Rapporter — Vecka 41, 2026', 'Makro — Vecka 41, 2026'])
        for image, kind in zip(p.locator('article img').all(), ['rapporter', 'makro']):
            image.evaluate('(i)=>i.decode()')
            self.assertTrue(image.evaluate('(i)=>i.currentSrc').endswith(f'/images/{kind}/week-41.png'))
        for width in [1440, 390]:
            p.set_viewport_size({'width': width, 'height': 1000})
            p.screenshot(path=str(folder / f'discord-preview-{width}.png'), full_page=True, animations='disabled')
        self.assertEqual(self.errors, [])
        print('PASS: W41 content and history, 5 widths, both themes, Swedish rollover, keyboard/CSP, original Discord previews', flush=True)


if __name__ == '__main__':
    result = unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Week41Browser('test_week41')]))
    raise SystemExit(not result.wasSuccessful())
