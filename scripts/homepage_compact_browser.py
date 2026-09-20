"""Real-homepage viewport evidence; external widgets excluded for repeatability."""
import json
from pathlib import Path
from browser_smoke import BrowserSmoke
from playwright.sync_api import expect

OUT = Path('docs/qa/homepage-compact')


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    BrowserSmoke.setUpClass()
    case = BrowserSmoke()
    case.setUp()
    p = case.page
    rows = []
    case.context.route('**/*', lambda r: r.continue_() if r.request.url.startswith(case.base)
                       else r.fulfill(status=200, body=''))
    p.add_init_script("document.addEventListener('securitypolicyviolation', e => (window.violations ||= []).push(e.violatedDirective))")
    try:
        for theme in ['dark', 'light']:
            for width in [320, 360, 390, 430, 640, 768, 1024, 1280, 1440, 1920]:
                p.set_viewport_size(dict(width=width, height=900))
                p.emulate_media(reduced_motion='reduce')
                case.go('index.html')
                p.evaluate('applyTheme', theme)
                p.evaluate('document.fonts.ready')
                before = p.locator('.product-intro').bounding_box()
                p.wait_for_timeout(400)
                after = p.locator('.product-intro').bounding_box()
                assert before == after, (theme, width, before, after)
                assert p.evaluate('document.documentElement.scrollWidth <= innerWidth')
                expect(p.locator('h1')).to_have_text('Allt du behöver som investerare – på ett ställe.')
                assert not p.evaluate('window.violations || []')
                assert 'Laddar' not in p.locator('.ntm-market-status-grid').inner_text()
                actions = p.locator('.product-intro a')
                actions.first.focus()
                for i in range(3):
                    a = actions.nth(i)
                    assert a.evaluate('(e) => e === document.activeElement')
                    assert a.evaluate('(e) => getComputedStyle(e).outlineStyle !== "none"')
                    if i < 2:
                        assert a.bounding_box()['height'] >= 44
                        p.keyboard.press('Tab')
                p.locator('h1').evaluate('(e) => e.scrollIntoView()')
                p.evaluate('scrollTo(0,0)')
                row = p.evaluate('''() => {
                  const hero=document.querySelector('.product-intro'), h=hero.querySelector('h1');
                  const market=document.querySelector('#ntmIdag');
                  return {width:innerWidth,heroHeight:hero.getBoundingClientRect().height,
                    marketY:market.getBoundingClientRect().y,headlineSize:getComputedStyle(h).fontSize,
                    headlineLines:Math.round(h.getBoundingClientRect().height/parseFloat(getComputedStyle(h).lineHeight))};
                }''')
                row['theme'] = theme
                rows.append(row)
                if width >= 1024:
                    assert p.locator('.ntm-market-status-grid').bounding_box()['y'] + p.locator('.ntm-market-status-grid').bounding_box()['height'] < 768
                p.screenshot(path=str(OUT / f'pass2-{theme}-{width}.png'))
        # Real CTA navigation retains acquisition provenance and continuation semantics.
        for selector, destination in [
            ('a.primary-btn', 'ranta-pa-ranta.html?from=home&via=home_calculator'),
            ('a.secondary-btn', 'research.html?from=home&via=home_research'),
            ('a[href="min-ntm.html"]', 'min-ntm.html'),
        ]:
            case.go('index.html')
            p.locator('.product-intro ' + selector).click()
            assert p.url == case.base + '/' + destination, p.url
        (OUT / 'pass2.json').write_text(json.dumps(rows, indent=2), encoding='utf-8')
        print(json.dumps(rows, indent=2))
        print('PASS: viewport matrix, themes, stable initialized hero, keyboard focus, CTA destinations, market status, CSP; 640/320 CSS px equivalent 200%/400% reflow.')
    finally:
        case.tearDown()
        BrowserSmoke.tearDownClass()


if __name__ == '__main__':
    run()
