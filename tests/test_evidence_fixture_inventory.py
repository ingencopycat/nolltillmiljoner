"""Offline source closure for published pilot evidence and reviewed registries."""
import hashlib
import json
from pathlib import Path
import unittest
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


class EvidenceFixtureInventoryTests(unittest.TestCase):
    def test_production_publication_invariant(self):
        from evidence_sources import validate_repository
        validate_repository(ROOT)

    def source(self, folder, accession, suffix, digest=None):
        path = ROOT / 'tests/fixtures' / folder / (accession + suffix)
        self.assertTrue(path.is_file(), f'Missing offline source: {path.relative_to(ROOT)}')
        if digest:
            self.assertEqual(hashlib.sha256(path.read_text(encoding='utf-8').encode()).hexdigest(), digest, str(path))

    def test_published_sources_have_offline_fixtures(self):
        for ticker in ('NVDA', 'SOFI', 'CRWD'):
            feed = read(ROOT / 'data/stocks/evidence' / (ticker + '.json'))
            index = read(ROOT / 'tests/fixtures/company_insiders' / (ticker + '.json'))['filings']['recent']
            for filing in feed['insiderEvidence']['filings']:
                acc = filing['accessionNumber']
                with self.subTest(ticker=ticker, accession=acc):
                    self.source('company_insiders', acc, '.xml', filing['source']['sha256'])
                    self.assertEqual(index['accessionNumber'].count(acc), 1)
                    i = index['accessionNumber'].index(acc)
                    self.assertEqual(index['form'][i], filing['form'])
                    self.assertEqual(index['filingDate'][i], filing['filingDate'])
                    self.assertTrue(filing['renderedUrl'].endswith('/' + index['primaryDocument'][i]))
            for source in feed['reviewedEvidence']['sources']:
                # These are bounded passage fixtures, not copies of the full hashed document.
                # Their extraction/provenance contract is covered by the existing reproduction tests.
                self.source('company_observations', source['accessionNumber'], '.html')
            for event in feed['events']:
                if event.get('documentStatus') == 'verified':
                    for source in event['documents']:
                        self.source('company_evidence', event['accessionNumber'], '.html')

    def test_review_registries_have_offline_fixtures(self):
        for folder in ('company_observations', 'company_ownership', 'company_material_events'):
            policy = read(ROOT / 'scripts/source_reviews' / (folder + '.json'))
            for document in policy['documents']:
                suffix = '.xml' if document.get('metadata', {}).get('url', '').endswith('.xml') else '.html'
                self.source(folder, document['accessionNumber'], suffix, document.get('sha256'))
