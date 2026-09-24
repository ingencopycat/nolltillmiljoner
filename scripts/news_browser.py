"""Text-only news article QA on the existing local browser harness."""
from pathlib import Path
import tempfile
from browser_smoke import BrowserSmoke
from playwright.sync_api import expect

SLUG = 'trump-xi-washington-ai-handel-taiwan'
out = Path(tempfile.gettempdir()) / 'ntm-news-qa'
out.mkdir(exist_ok=True)
BrowserSmoke.setUpClass()
try:
    case = BrowserSmoke(); case.setUp()
    try:
        p = case.page
        p.add_init_script("window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective))")
        p.route('**/*', lambda route: route.continue_() if route.request.url.startswith(BrowserSmoke.base) else route.abort())
        case.go(f'post-{SLUG}.html')
        expect(p.locator('h1')).to_have_text('Trump och Xi möts i Washington – AI, handel och Taiwan i fokus')
        expect(p.locator('.post-article img')).to_have_count(0)
        expect(p.locator('[aria-label="Artikelns källor"] a')).to_have_count(5)
        for width in [1440, 390, 320]:
            p.set_viewport_size({'width': width, 'height': 960})
            for theme in ['light', 'dark']:
                p.evaluate('applyTheme', theme)
                assert p.evaluate('document.documentElement.scrollWidth') <= width
                expect(p.locator('.post-content h2')).to_have_count(6)
                assert not p.evaluate('window.__csp')
                p.screenshot(path=str(out / f'article-{width}-{theme}.png'), full_page=True, animations='disabled')
                p.screenshot(path=str(out / f'viewport-{width}-{theme}.png'), animations='disabled')
        p.locator('[data-copy-link]').focus()
        assert p.locator('[data-copy-link]').evaluate('(e)=>e===document.activeElement')
        case.go('inlagg.html')
        expect(p.locator(f'.post-card h3 a[href="post-{SLUG}.html"]')).to_be_visible()
        p.locator(f'.post-card h3 a[href="post-{SLUG}.html"]').click()
        expect(p.locator('.post-content h2')).to_have_count(6)
        print(f'PASS news: article, sources, archive navigation, no images, keyboard focus, 3 widths x 2 themes, CSP. Screenshots: {out}')
    finally:
        case.tearDown()
finally:
    BrowserSmoke.tearDownClass()
