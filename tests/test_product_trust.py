import hashlib
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ProductTrustTests(unittest.TestCase):
    def test_executable_product_contracts(self):
        result = subprocess.run([os.environ.get('NODE_BINARY', 'node'), '--test', 'tests/product-trust.test.cjs'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_pinned_assets_and_public_delivery(self):
        chart = ROOT / 'vendor/chart-4.5.1.umd.min.js'
        self.assertEqual(hashlib.sha256(chart.read_bytes()).hexdigest(), '48444a82d4edcb5bec0f1965faacdde18d9c17db3063d042abada2f705c9f54a')
        self.assertTrue((ROOT / 'vendor/Chart.js-LICENSE.md').exists())
        self.assertLess((ROOT / 'images/ntm-logo.webp').stat().st_size, 40000)
        consumers = []
        for page in ROOT.glob('*.html'):
            html = page.read_text(encoding='utf-8')
            self.assertNotIn('ntm-logo.png.png', html)
            self.assertNotIn('cdn.jsdelivr.net/npm/chart.js', html)
            if 'vendor/chart-' in html:
                consumers.append(page.name)
                self.assertIn('<canvas', html)
            if 'src="script.js"' in html:
                self.assertIn('href="om-metod.html"', html)
                self.assertIn('src="ntm-product.js"', html)
        self.assertEqual(len(consumers), 10)
        trust = (ROOT / 'om-metod.html').read_text(encoding='utf-8')
        self.assertNotIn('TODO', trust)
        self.assertIn('ingencopycat', trust)
        self.assertIn('om-metod.html', (ROOT / 'sitemap.xml').read_text())
