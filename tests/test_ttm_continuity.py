from copy import deepcopy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from stock_normalizer import StockNormalizer


class TtmContinuityTests(unittest.TestCase):
    def test_valid_company_sequences_preserve_existing_ttm_and_accept_reordering(self):
        for ticker in ['NVDA', 'SOFI', 'CRWD']:
            with self.subTest(ticker=ticker):
                data = json.loads((ROOT / 'data' / 'stocks' / f'{ticker}.json').read_text())
                normalizer = StockNormalizer(ticker)
                quarters = data['quarterly']
                computed = normalizer.compute_ttm(quarters)
                self.assertEqual(computed['quarters'], data['ttm']['quarters'])
                self.assertEqual({k: m['value'] for k, m in computed['metrics'].items()},
                                 {k: m['value'] for k, m in data['ttm']['metrics'].items()})
                self.assertEqual(normalizer.compute_ttm(list(reversed(quarters))), computed)

    def test_missing_duplicate_and_incompatible_quarters_are_unavailable(self):
        data = json.loads((ROOT / 'data/stocks/SOFI.json').read_text())
        quarters = data['quarterly'][-5:]
        normalizer = StockNormalizer('SOFI')
        missing = deepcopy(quarters); del missing[-2]
        duplicate = deepcopy(quarters); duplicate.append(deepcopy(duplicate[-1]))
        cases = {'missing middle':missing, 'duplicate latest':duplicate}
        for field,value in [('periodStart','2026-04-02'),('periodStart','2026-03-31'),
                            ('periodStart','2026-01-01'),('periodStart',None),
                            ('periodEnd','invalid'),('fiscalPeriod','Q5'),('period','2026Q3')]:
            changed = deepcopy(quarters); changed[-1][field] = value
            cases[f'{field}={value}'] = changed
        for label, sequence in cases.items():
            with self.subTest(label=label):
                self.assertIsNone(normalizer.compute_ttm(sequence))
        self.assertIsNone(normalizer.compute_ttm(duplicate, quarters[-1]['period']))
        # A future bad observation must not affect an explicitly requested, valid historical window.
        future = deepcopy(quarters); future[-1]['periodStart'] = '2026-01-01'
        self.assertIsNotNone(normalizer.compute_ttm(future, quarters[-2]['period']))
