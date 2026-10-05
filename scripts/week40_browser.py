"""Bounded Week 40 visual and interaction review on fresh local browser contexts."""
from pathlib import Path
import unittest
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke

class Week40Browser(BrowserSmoke):
    def test_week40(self):
        p = self.page
        folder = Path(__file__).resolve().parents[1] / 'docs/qa/weekly-template/week40-detail'
        folder.mkdir(parents=True, exist_ok=True)
        p.add_init_script("document.addEventListener('securitypolicyviolation',e=>(window.__weekCsp ||= []).push(e.violatedDirective))")
        for width in [1440, 430, 390, 360]:
            p.set_viewport_size({'width':width,'height':1000})
            for filename in ['makro','rapporter']:
                self.go(filename+'.html?ntmDate=2026-09-28')
                if filename == 'makro':
                    expect(p.locator('.macro-event-card')).to_have_count(21)
                    expect(p.locator('#event-us-jolts-job-openings-2026-09-29')).to_contain_text('16:00')
                    expect(p.locator('#event-us-adp-employment-2026-09-30')).to_contain_text('14:15')
                    # Selecting an archived week is not a pre-release data snapshot.
                    actuals = p.evaluate('NTM_WEEKLY_EVENTS.macroWeeks["2026-W40"].events.filter(e=>e.actual!==null)')
                    expect(p.locator('.macro-metric-val.has-actual')).to_have_count(len(actuals))
                    for event in actuals:
                        self.assertEqual(event['fieldProvenance']['actual']['status'], 'available')
                        self.assertIn(event['fieldProvenance']['actual']['kind'], ['reported', 'provider_derived'])
                        expect(p.locator('#event-' + event['id'] + ' .has-actual')).to_have_text(event['actual'])
                    p.locator('#weekArchive [data-week="2026-W39"]').click()
                    expect(p.locator('.macro-event-card')).to_have_count(9)
                    p.locator('#currentWeekNavigation [data-week="2026-W40"]').click()
                    target=p.locator('#macroStructuredContent')
                else:
                    p.locator('#weekVisual img').scroll_into_view_if_needed()
                    self.wait_for('document.querySelector("#weekVisual img")?.naturalWidth > 0')
                    self.assertIn('week-40-',p.locator('#weekVisual img').evaluate('el=>el.currentSrc'))
                    expect(p.locator('#earnings-readable a[href="research.html?ticker=MU"]')).to_have_text('MU · Micron Technology')
                    expect(p.locator('#earnings-readable')).to_contain_text('cirka 1 okt. 22:15')
                    expect(p.locator('#earnings-readable')).to_contain_text('1 okt. 12:00')
                    expect(p.locator('#earnings-provenance details')).to_have_count(20)
                    p.locator('#earnings-provenance > summary').click()
                    summary=p.locator('#earnings-provenance details').filter(has_text='Källa och tidpunkt · MU').locator('summary')
                    summary.focus(); summary.press('Enter')
                    expect(summary.locator('..')).to_contain_text('30 sep. 22:30')
                    if width in [1440,360]:
                        summary.locator('..').screenshot(path=str(folder/f'micron-source-{width}.png'),animations='disabled')
                    summary.press('Enter')
                    p.locator('#weekArchive [data-week="2026-W39"]').click()
                    expect(p.locator('#earnings-readable')).to_contain_text('COST, LGCY, SCHL')
                    p.locator('#weekArchive [data-week="2026-W40"]').click()
                    target=p.locator('#earnings-readable')
                for theme in ['light','dark']:
                    p.evaluate('applyTheme',theme)
                    p.emulate_media(reduced_motion='reduce')
                    target.scroll_into_view_if_needed()
                    p.evaluate('(el)=>el.scrollIntoView({block:"start"})',target.element_handle())
                    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width)
                    p.screenshot(path=str(folder/f'{filename}-{width}-{theme}.png'),animations='disabled')
                self.assertEqual(p.evaluate('window.__weekCsp || []'),[])
        self.go('makro.html?ntmDate=2026-09-27')
        p.locator('#upcomingWeeks [data-week="2026-W40"]').focus()
        p.keyboard.press('Enter')
        expect(p.locator('.macro-event-card')).to_have_count(21)
        self.go('index.html?ntmDate=2026-09-30')
        expect(p.locator('#ntmEarningsList a[href="research.html?ticker=MU"]')).to_be_visible()
        expect(p.locator('#ntmMacroList')).to_contain_text('PCE / core PCE')
        expect(p.locator('#ntmMacroList')).to_contain_text('GDP')
        expect(p.locator('#ntmMacroList')).to_contain_text('ADP')
        p.locator('#ntmEarningsList a[href="research.html?ticker=MU"]').click()
        self.assertIn('ticker=MU',p.url)
        expect(p.locator('#companyName')).to_contain_text('MICRON')
        self.go('index.html?ntmDate=2026-10-02')
        expect(p.locator('#ntmMacroList')).to_contain_text('USA:s jobbrapport')
        expect(p.locator('#ntmEarningsList')).to_have_text('Inga bolagsrapporter i kalendern idag.')
        self.assertEqual(self.errors,[])
        print('PASS: Week 40 desktop, 430/390/360, light/dark, keyboard, CSP, history, Research link and release groups',flush=True)

if __name__ == '__main__':
    result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Week40Browser('test_week40')]))
    raise SystemExit(not result.wasSuccessful())
