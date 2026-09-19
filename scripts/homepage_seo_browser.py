"""Homepage semantics and unchanged visible Instagram promotion, in real Chromium."""
import json
import sys
from pathlib import Path
import unittest
from browser_smoke import BrowserSmoke
from playwright.sync_api import expect


class HomepageSeo(BrowserSmoke):
    # Reuse the isolated browser setup without inheriting the whole smoke suite.
    def test_homepage_search_identity(self):
        self.go('index.html')
        p = self.page
        expect(p.locator('h1')).to_have_text('Allt du behöver som investerare – på ett ställe.')
        promo = p.locator('#site-instagram-promo')
        expect(promo).to_have_attribute('data-nosnippet', '')
        expect(promo.locator('h3')).to_have_text('Följ min resa från NOLL TILL MILJONER.')
        expect(promo.locator('p')).to_have_text('Jag delar investeringar, idéer, analyser och resan längs vägen.')
        expect(promo.get_by_role('link', name='Följ på Instagram')).to_have_attribute('href', 'https://www.instagram.com/ingencopycat/')
        expect(p.locator('#latestPosts time')).to_have_count(3)
        expect(p.locator('#latestPosts [data-nosnippet] time')).to_have_count(3)
        self.assertTrue(all('Inläggets datum:' in t for t in p.locator('#latestPosts [data-nosnippet]').all_text_contents()))
        self.assertEqual(p.locator('.product-intro [data-nosnippet]').count(), 0)
        out = Path('docs/qa/homepage-seo')
        out.mkdir(parents=True, exist_ok=True)
        for theme in ['light', 'dark']:
            p.evaluate('applyTheme', theme)
            p.wait_for_timeout(350)  # Existing theme transition; capture its final palette.
            for width in [320, 360, 390, 430, 1440]:
                p.set_viewport_size({'width': width, 'height': 900})
                self.assertTrue(p.evaluate('document.documentElement.scrollWidth<=innerWidth'), (theme, width))
                expect(promo).to_be_visible()
                if width in [390, 1440]:
                    p.screenshot(path=str(out / f'homepage-{theme}-{width}.png'), full_page=True)
        schema = p.locator('script[type="application/ld+json"]').all_text_contents()
        (out / 'rendered-schema.json').write_text(json.dumps([json.loads(s) for s in schema], ensure_ascii=False, indent=2), encoding='utf-8')
        self.go('inlagg.html')
        expect(p.locator('#site-instagram-promo')).not_to_have_attribute('data-nosnippet', '')
        self.assertEqual(p.locator('#postResults [data-nosnippet]').count(), 0)


if __name__ == '__main__':
    result = unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([HomepageSeo('test_homepage_search_identity')]))
    sys.exit(not result.wasSuccessful())
