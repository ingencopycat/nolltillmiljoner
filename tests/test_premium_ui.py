"""Structural accessibility/delivery contracts; interactions are tested in Chrome."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class Structure(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.ids = []
        self.styles = []
        self.scripts = []
        self.skip = None
        self.depth = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        if tag == 'link' and attrs.get('rel') == 'stylesheet':
            self.styles.append(attrs.get('href'))
        if tag == 'script' and attrs.get('src'):
            self.scripts.append(attrs['src'])
        if tag == 'a' and attrs.get('class') == 'skip-link':
            self.skip = attrs.get('href')
        if tag == 'details' and 'depth-panel' in attrs.get('class', ''):
            self.depth.append(attrs)


class PremiumStructureTests(unittest.TestCase):
    def test_shared_layer_and_skip_targets_on_every_app_page(self):
        for file in ROOT.glob('*.html'):
            page = Structure(file.read_text(encoding='utf-8'))
            if 'script.js' not in page.scripts:
                continue
            with self.subTest(page=file.name):
                self.assertGreater(page.styles.index('premium.css'), page.styles.index('style.css'))
                self.assertGreater(page.scripts.index('ntm-ui.js'), page.scripts.index('script.js'))
                self.assertEqual(page.skip, '#main-content')
                self.assertIn('main-content', page.ids)
                self.assertEqual(len(page.ids), len(set(page.ids)), 'Duplicate IDs break links/labels')

    def test_progressive_depth_is_explicit_and_keeps_existing_targets(self):
        research = Structure((ROOT / 'research.html').read_text(encoding='utf-8'))
        self.assertEqual({d.get('id') for d in research.depth}, {'researchFinancials', 'sensitivityDepth', 'manualThesisEntry', 'reportQuestionsEditor',
                                                      'processReviewEditor', 'assumptionDetail1', 'assumptionDetail2', 'assumptionDetail3',
                                                      'revenueSources', 'growthDepth', 'thesisAdvanced', 'thesisReviewDepth', 'thesisHistorySectionDepth', 'outcomeSectionDepth'})
        self.assertTrue(all('open' not in d for d in research.depth))
        for target in ['annualChart', 'quarterlyChart', 'annualTableWrap', 'quarterlyTableWrap',
                       'sensitivityTable', 'thesisForm', 'valuationForm', 'outcomeForm', 'thesisRevisionSelect']:
            self.assertIn(target, research.ids)
        for file in ['ranta-pa-ranta.html', 'sparmalskalkylator.html']:
            page = Structure((ROOT / file).read_text(encoding='utf-8'))
            self.assertTrue(any('data-scenario-depth' in d and 'open' not in d for d in page.depth))
