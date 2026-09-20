"""Real production routes: shared navigation, calendar insets and visual evidence."""
import json
from pathlib import Path
from browser_smoke import BrowserSmoke
from playwright.sync_api import expect

OUT = Path('docs/qa/navigation-polish')
PRIMARY = ['Verktyg', 'Research', 'Fråga NTM', 'Academy', 'Min NTM']
SECONDARY = ['Inlägg och videor', 'Resurser', 'Makro', 'Rapporter', 'Community']
FAMILIES = {
    'index.html': None,
    'ranta-pa-ranta.html': ('verktyg.html', 'location'),
    'research.html': ('research.html', 'page'),
    'fragor-svar.html': ('fragor-svar.html', 'page'),
    'fragor-svar-pe-tal.html': ('fragor-svar.html', 'location'),
    'academy.html': ('academy.html', 'page'),
    'academy-pe.html': ('academy.html', 'location'),
    'min-ntm.html': ('min-ntm.html', 'page'),
    'makro.html': ('makro.html', 'page'),
    'rapporter.html': ('rapporter.html', 'page'),
    'post-jordi-visser-linjart-exponentiellt-ai-trading.html': ('inlagg.html', 'location'),
    'upptack.html': ('research.html', 'location'),
    'analys.html?id=11111111-1111-4111-8111-111111111111': ('research.html', 'location'),
    'profil.html?u=reader_a': ('research.html', 'location'),
    'konto.html': ('konto.html', 'page'),
}


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    BrowserSmoke.setUpClass()
    case = BrowserSmoke(); case.setUp(); p = case.page
    case.context.route('**/*', lambda r: r.continue_() if r.request.url.startswith(case.base)
                       else r.fulfill(status=200, body=''))
    p.add_init_script("document.addEventListener('securitypolicyviolation', e => (window.violations ||= []).push(e.violatedDirective))")
    p.emulate_media(reduced_motion='reduce')
    rows = []

    def check_nav():
        expect(p.locator('.main-nav > a:not([data-account-nav])')).to_have_text(PRIMARY)
        expect(p.locator('.nav-learn-links a')).to_have_text(SECONDARY)
        expect(p.locator('.nav-learn summary')).to_have_text('Mer')
        expect(p.locator('[data-account-nav]')).to_have_count(1)
        assert p.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not p.evaluate('window.violations || []')

    try:
        for theme in ['dark', 'light']:
            for width in [320, 360, 390, 430, 640, 768, 1024, 1200, 1201, 1280, 1440, 1920]:
                p.set_viewport_size(dict(width=width, height=900))
                case.go('index.html'); p.evaluate('applyTheme', theme)
                expect(p.locator('#ntmMacroList')).not_to_be_empty()
                check_nav()
                hero = p.locator('.product-intro').bounding_box()
                panels = p.locator('.ntm-today-panels .ntm-event-panel')
                for panel in panels.all():
                    box = panel.bounding_box()
                    header = panel.locator('.ntm-panel-header').bounding_box()
                    content = panel.locator('.ntm-event-list').bounding_box()
                    assert header['x'] - box['x'] >= 18
                    assert box['x'] + box['width'] - header['x'] - header['width'] >= 18
                    assert header['y'] - box['y'] >= 16
                    assert content['y'] - header['y'] - header['height'] >= 12
                    assert box['y'] + box['height'] - content['y'] - content['height'] >= 20
                if width in [360, 390, 430, 768, 1024, 1280, 1440]:
                    p.screenshot(path=str(OUT / f'pass2-home-{theme}-{width}.png'))
                    p.locator('.ntm-today-panels').screenshot(path=str(OUT / f'pass2-panels-{theme}-{width}.png'))
                p.evaluate('scrollTo(0,0)')
                toggle = p.locator('#mobileNavToggle')
                summary = p.locator('.nav-learn summary')
                if width <= 1200:
                    expect(toggle).to_be_visible()
                    toggle.focus(); p.keyboard.press('Enter')
                    expect(toggle).to_have_attribute('aria-expanded', 'true')
                    expect(p.locator('.main-nav > a').first).to_be_focused()
                    expect(p.locator('[data-account-nav]')).to_be_visible()
                else:
                    expect(toggle).not_to_be_visible()
                    # Include the longest allowed visual account label in the desktop fit check.
                    account = p.locator('[data-account-nav]')
                    original = account.inner_text()
                    account.evaluate('(e) => e.textContent = "@abcdefghijklmnopqrstuvwx"')
                    boxes = [p.locator('.brand-wrap').bounding_box(), p.locator('.main-nav').bounding_box(), p.locator('#themeToggle').bounding_box()]
                    assert all(a['x'] + a['width'] <= b['x'] for a, b in zip(boxes, boxes[1:]))
                    account.evaluate('(e, value) => e.textContent = value', original)
                summary.focus(); p.keyboard.press('Enter')
                expect(p.locator('.nav-learn')).to_have_attribute('open', '')
                p.keyboard.press('Tab')
                expect(p.locator('.nav-learn-links a').first).to_be_focused()
                for link in p.locator('.main-nav a:visible').all():
                    assert link.bounding_box()['height'] >= 44
                if width in [360, 390, 430, 768, 1024, 1280, 1440]:
                    p.screenshot(path=str(OUT / f'pass2-menu-{theme}-{width}.png'))
                p.keyboard.press('Escape')
                expect(toggle if width <= 1200 else summary).to_be_focused()
                assert p.locator('#main-content').evaluate('(e) => !e.inert')
                if width <= 1200:
                    expect(toggle).to_have_attribute('aria-expanded', 'false')
                    toggle.click()
                else:
                    summary.click()
                p.locator('.ntm-menu-backdrop').click(position={'x': 2, 'y': 890})
                expect(toggle if width <= 1200 else summary).to_be_focused()
                rows.append(dict(theme=theme, width=width, hero=hero, navigation='mobile' if width <= 1200 else 'desktop'))
        for route, active in FAMILIES.items():
            for width in [390, 1440]:
                p.set_viewport_size(dict(width=width, height=900)); case.go(route)
                check_nav()
                current = p.locator('.main-nav [aria-current]')
                expect(current).to_have_count(1 if active else 0)
                if active:
                    expect(current).to_have_attribute('href', active[0])
                    expect(current).to_have_attribute('aria-current', active[1])
                if route == 'fragor-svar.html':
                    expect(p.locator('h1')).to_contain_text('Fråga NTM')
                    p.screenshot(path=str(OUT / f'pass2-knowledge-{width}.png'))
                if route in ['makro.html', 'rapporter.html'] and width == 1440:
                    p.locator('.nav-learn summary').click()
                    p.screenshot(path=str(OUT / f'pass2-active-{route}.png'))
        # Use the existing local date override with published records; never edit financial data.
        for theme in ['dark', 'light']:
            for width in [390, 1440]:
                p.set_viewport_size(dict(width=width, height=900))
                case.go('index.html?ntmDate=2026-09-23'); p.evaluate('applyTheme', theme)
                expect(p.locator('#ntmEarningsList .ntm-event-item:visible')).to_have_count(3)
                p.locator('.ntm-today-panels').screenshot(path=str(OUT / f'pass2-populated-{theme}-{width}.png'))
                p.locator('#ntmEarningsList summary').click()
                expect(p.locator('#ntmEarningsList .ntm-event-item:visible')).to_have_count(7)
                assert p.evaluate('document.documentElement.scrollWidth <= innerWidth')
        (OUT / 'navigation.json').write_text(json.dumps(rows, indent=2), encoding='utf-8')
        print('PASS: 24 width/theme combinations; 15 page families at mobile/desktop; menu keyboard, Escape/focus, outside click, account fit, active states, module insets, CSP and reflow.')
    finally:
        case.tearDown(); BrowserSmoke.tearDownClass()


if __name__ == '__main__':
    run()
