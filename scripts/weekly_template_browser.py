"""Structural weekly-template contract, independent of text and exact pixel values."""
from pathlib import Path
import unittest
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke

class WeeklyTemplateBrowser(BrowserSmoke):
    def test_template(self):
        p = self.page
        folder = Path(__file__).resolve().parents[1] / 'docs/qa/weekly-template'
        folder.mkdir(parents=True, exist_ok=True)
        p.add_init_script("document.addEventListener('securitypolicyviolation',e=>(window.__templateCsp ||= []).push(e.violatedDirective))")
        baseline = None
        for width in [1440, 768, 430, 390, 360]:
            p.set_viewport_size({'width': width, 'height': 1000})
            for date in ['2026-09-27', '2026-09-28', '2026-10-05']:
                self.go('rapporter.html?ntmDate=' + date)
                for week in ['2026-W38', '2026-W39', '2026-W40']:
                    p.locator(f'#weekArchive [data-week="{week}"]').click()
                    expect(p.locator('#earnings-week-layout > #weekVisual')).to_have_count(1)
                    expect(p.locator('#earnings-week-layout > #earnings-readable')).to_have_count(1)
                    expect(p.locator('#earnings-week-navigation #weekArchive')).to_have_count(1)
                    expect(p.locator('.earnings-days > p')).to_have_count(5)
                    signature = p.evaluate("""() => ({
                      regions: [...document.querySelector('#earnings-week-layout').children].map(e=>e.id),
                      navigation: document.querySelector('#earnings-week-navigation').parentElement.id,
                      image: [...document.querySelector('#weekVisual').children].map(e=>e.tagName),
                      summary: document.querySelector('.earnings-days').parentElement.id
                    })""")
                    if baseline is None: baseline = signature
                    self.assertEqual(signature, baseline)
                    self.assertEqual(signature['regions'], ['weekVisual', 'earnings-readable', 'earnings-week-navigation'])
                    image = p.locator('#weekVisual')
                    text = p.locator('#earnings-readable')
                    nav = p.locator('#earnings-week-navigation')
                    a, b, c = image.bounding_box(), text.bounding_box(), nav.bounding_box()
                    if width > 860:
                        self.assertLess(a['x'] + a['width'], b['x'])
                        self.assertGreater(a['width'], b['width'])
                    else:
                        self.assertGreaterEqual(b['y'], a['y'] + a['height'] - 1)
                    self.assertGreaterEqual(c['y'], max(a['y']+a['height'], b['y']+b['height']) - 1)
                    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)
                    expect(p.locator('#weekArchive .active')).to_have_attribute('data-week', week)
                    status = 'Aktuell' if (date == '2026-09-27' and week == '2026-W39') or (date == '2026-09-28' and week == '2026-W40') else 'Kommande' if date == '2026-09-27' and week == '2026-W40' else 'Arkiv'
                    expect(p.locator('#weekArchive .active .archive-item-status')).to_have_text(status)
                    if date == '2026-09-28':
                        image.scroll_into_view_if_needed()
                        p.locator('#weekVisual img').evaluate('(i)=>i.decode()')
                        for theme in ['light', 'dark']:
                            p.evaluate('applyTheme', theme)
                            p.evaluate('document.activeElement.blur()')
                            p.screenshot(path=str(folder/f'{week}-{width}-{theme}.png'), full_page=True, animations='disabled')
                    self.assertEqual(p.evaluate('window.__templateCsp || []'), [])
        # Week content changes while the shell stays identical. Sources are secondary.
        expect(p.locator('.earnings-days')).to_contain_text('GNS')
        expect(p.locator('.earnings-days')).not_to_contain_text('ATCH')
        expect(p.locator('#earnings-provenance')).not_to_have_attribute('open', '')
        p.locator('#earnings-readable a[href="research.html?ticker=MU"]').click()
        expect(p.locator('#companyName')).to_contain_text('MICRON')
        # Macro shares one event renderer; status/week must not move its regions.
        for date, week in [('2026-09-27','2026-W40'), ('2026-09-28','2026-W39'), ('2026-09-28','2026-W38')]:
            self.go('makro.html?ntmDate=' + date)
            p.locator(f'button[data-week="{week}"]').click()
            expect(p.locator('#macroStructuredContent > .macro-week-header')).to_have_count(1)
            expect(p.locator('#macroStructuredContent > .macro-days-list')).to_have_count(1)
            self.assertTrue(p.locator('.macro-event-card').count() > 0)
            expect(p.locator('#weekVisual')).to_be_hidden()
            expect(p.locator(f'button.active[data-week="{week}"]')).to_have_count(1)
        self.assertEqual(self.errors, [])
        print('PASS: shared earnings regions across 3 weeks, 3 dates, 5 widths; Macro structure, Research and CSP', flush=True)

if __name__ == '__main__':
    result = unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([WeeklyTemplateBrowser('test_template')]))
    raise SystemExit(not result.wasSuccessful())
