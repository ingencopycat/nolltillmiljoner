"""B78 Phase 2: frozen SEC evidence, corporate-action boundaries and fail-closed gates."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from stock_normalizer import StockNormalizer, COMPANY_PROFILES
from stock_contract import IDENTITIES, validate
from update_stocks import update_stock

ADDED = ['TTMI', 'SNDK', 'FLY', 'CRWV']


def baseline_data_hash(raw):
    # The historical Phase 2 hashes were recorded from a CRLF checkout.
    # Git/Linux uses LF: normalize only line endings, preserving every other byte
    # (including financial values, provenance, schema and JSON string contents).
    return hashlib.sha256(raw.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')).hexdigest()


def fixture(ticker, kind):
    return json.loads((ROOT / f'tests/fixtures/sec_{ticker.lower()}_{kind}.json').read_text())


def normalized(ticker, facts=None):
    return StockNormalizer(ticker).normalize(fixture(ticker, 'submissions'),
                                           facts or fixture(ticker, 'companyfacts'))


class PhaseTwoTests(unittest.TestCase):
    def test_existing_eight_outputs_and_profiles_unchanged(self):
        baseline = json.loads((ROOT / 'docs/research-phase2-audit.json').read_text(encoding='utf-8'))['existingEightBaseline']
        self.assertEqual(len(baseline), 8)
        for ticker, hashes in baseline.items():
            with self.subTest(ticker=ticker):
                self.assertEqual(baseline_data_hash((ROOT / f'data/stocks/{ticker}.json').read_bytes()), hashes['data'])
                self.assertEqual(hashlib.sha256(json.dumps(COMPANY_PROFILES[ticker], sort_keys=True).encode()).hexdigest(), hashes['profile'])

    def test_baseline_hash_ignores_only_checkout_line_endings(self):
        lf = b'{\n  "value": 123.5, "unit": "USD", "accession": "original"\n}\n'
        expected = baseline_data_hash(lf)
        self.assertEqual(baseline_data_hash(lf.replace(b'\n', b'\r\n')), expected)
        for before, after in ((b'123.5', b'123.6'), (b'USD', b'EUR'),
                              (b'original', b'changed'), (b'value', b'other')):
            with self.subTest(change=before):
                self.assertNotEqual(baseline_data_hash(lf.replace(before, after)), expected)

    def test_publication_periods_finite_provenance_and_no_per_share_substitution(self):
        for ticker in ADDED:
            with self.subTest(ticker=ticker):
                data = normalized(ticker)
                self.assertTrue(validate(data, ticker))
                json.dumps(data, allow_nan=False)
                published = json.loads((ROOT / f'data/stocks/{ticker}.json').read_text(encoding='utf-8'))
                for section in ('annual', 'quarterly', 'ttm', 'valuationBase'):
                    self.assertEqual(data[section], published[section])
                self.assertEqual(len(data['ttm']['quarters']), 4)
                for period in data['annual'] + data['quarterly'] + [data['ttm']]:
                    for metric in period['metrics'].values():
                        self.assertIn('qualityStatus', metric)
                        self.assertIn('definition', metric)
                        if metric['value'] is not None:
                            self.assertTrue(metric.get('accession') or metric.get('sourceFilings') or
                                            any(i.get('accession') or i.get('sourceFilings') for i in metric.get('inputs', [])))
                    for key in ('dilutedShares', 'dilutedEps'):
                        self.assertIsNone(period['metrics'][key]['value'])
                        self.assertTrue(period['metrics'][key]['unsupportedReason'])
                self.assertIsNone(data['valuationBase']['ttmDilutedEps']['value'])
                self.assertIsNone(data['valuationBase']['ttmFcfPerShare']['value'])
                self.assertIsNone(data['quarterly'][-1]['metrics']['debt']['value'])
                broken = copy.deepcopy(data['quarterly'])
                del broken[-2]
                self.assertIsNone(StockNormalizer(ticker).compute_ttm(broken))

    def test_ttmi_reported_calendar_overrides_conflicting_annual_fy_only(self):
        data = normalized('TTMI')
        self.assertEqual([(a['period'], a['periodEnd']) for a in data['annual']],
                         [('FY2023', '2024-01-01'), ('FY2024', '2024-12-30'), ('FY2025', '2025-12-29')])
        for year in (2024, 2025):
            quarters = [q for q in data['quarterly'] if q['fiscalYear'] == year]
            self.assertEqual([q['period'] for q in quarters], [f'{year}Q{i}' for i in range(1, 5)])
            annual = next(a for a in data['annual'] if a['fiscalYear'] == year)
            self.assertEqual(sum(q['metrics']['revenue']['value'] for q in quarters), annual['metrics']['revenue']['value'])
        facts = fixture('TTMI', 'companyfacts')
        values = facts['facts']['us-gaap']['RevenueFromContractWithCustomerExcludingAssessedTax']['units']['USD']
        current = next(v for v in values if v['end'] == '2026-06-29' and v['fp'] == 'Q2')
        values.append({**current, 'fp': 'Q3'})
        with self.assertRaisesRegex(ValueError, 'conflict'):
            normalized('TTMI', facts)

    def test_sandisk_excludes_predecessor_and_mixed_spin_year(self):
        data = normalized('SNDK')
        self.assertEqual([a['period'] for a in data['annual']], ['FY2026'])
        self.assertEqual([q['period'] for q in data['quarterly']], ['2026Q1', '2026Q2', '2026Q3', '2026Q4'])
        self.assertEqual(data['ttm']['periodStart'], '2025-06-28')
        self.assertEqual(data['ttm']['periodEnd'], '2026-07-03')
        self.assertEqual(data['quarterly'][0]['periodEnd'], '2025-10-03')
        self.assertEqual(data['ttm']['metrics']['revenue']['value'], data['annual'][0]['metrics']['revenue']['value'])
        self.assertIsNone(StockNormalizer('SNDK').compute_ttm(data['quarterly'][:3]))

    def test_firefly_ipo_quarter_keeps_fundamentals_but_excludes_share_basis(self):
        data = normalized('FLY')
        self.assertEqual(data['ttm']['quarters'], ['2025Q3', '2025Q4', '2026Q1', '2026Q2'])
        self.assertLess(data['quarterly'][1]['periodStart'], '2025-08-08')
        self.assertGreater(data['quarterly'][1]['periodEnd'], '2025-08-08')
        self.assertTrue(data['ttm']['metrics']['revenue']['value'])
        self.assertIsNone(data['valuationBase']['latestAnnualEps']['value'])

    def test_coreweave_financing_exclusions_even_when_cash_capex_exists(self):
        self.assertIn('PaymentsToAcquirePropertyPlantAndEquipment', fixture('CRWV', 'companyfacts')['facts']['us-gaap'])
        data = normalized('CRWV')
        for period in data['annual'] + data['quarterly'] + [data['ttm']]:
            for key in ('capex', 'freeCashFlow'):
                self.assertIsNone(period['metrics'][key]['value'])
                self.assertIn('financing', period['metrics'][key]['unsupportedReason'])
        self.assertTrue(data['ttm']['metrics']['operatingCashFlow']['value'])

    def test_galaxy_non_equivalent_revenue_concepts_and_deferred_scope(self):
        facts = fixture('GLXY', 'companyfacts')['facts']['us-gaap']
        def annual(concept):
            return next(v['val'] for v in facts[concept]['units']['USD']
                        if v.get('start') == '2025-01-01' and v['end'] == '2025-12-31')
        self.assertNotEqual(annual('Revenues'), annual('RevenueFromContractWithCustomerExcludingAssessedTax'))
        self.assertNotIn('GLXY', IDENTITIES)
        self.assertFalse((ROOT / 'data/stocks/GLXY.json').exists())
        with self.assertRaises(ValueError):
            StockNormalizer('GLXY')
        audit = json.loads((ROOT / 'docs/research-phase2-audit.json').read_text(encoding='utf-8'))
        self.assertEqual(audit['phase3Classifications'], {'AVEX':'D','BULL':'C','NBIS':'C','TEM':'D','ASML':'C'})

    def test_wrong_currency_and_degraded_refresh_never_replace_known_good(self):
        for ticker in ADDED:
            with tempfile.TemporaryDirectory() as directory:
                target = Path(directory) / f'{ticker}.json'
                original = (ROOT / f'data/stocks/{ticker}.json').read_bytes()
                target.write_bytes(original)
                facts = fixture(ticker, 'companyfacts')
                revenue = facts['facts']['us-gaap']['RevenueFromContractWithCustomerExcludingAssessedTax']['units']
                revenue['EUR'] = revenue.pop('USD')
                client = Mock()
                client.resolve_cik.return_value = IDENTITIES[ticker]
                client.get_submissions.return_value = fixture(ticker, 'submissions')
                client.get_company_facts.return_value = facts
                with self.assertRaises(ValueError):
                    update_stock(ticker, client=client, output_dir=directory)
                self.assertEqual(target.read_bytes(), original)
