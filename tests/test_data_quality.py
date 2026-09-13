from copy import deepcopy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from stock_contract import validate, METHOD
from stock_normalizer import StockNormalizer
from update_stocks import update_stock
from sec_client import SECNetworkError
from macro_provenance import set_field, complete_fields, status_meta
import update_macro


class DataQualityTests(unittest.TestCase):
    def test_provenance_and_fixture_values(self):
        for ticker in ('NVDA', 'SOFI', 'CRWD'):
            with self.subTest(ticker=ticker), tempfile.TemporaryDirectory() as directory:
                path = Path(update_stock(ticker, offline=True, output_dir=directory))
                doc = json.loads(path.read_text(encoding='utf-8'))
                self.assertTrue(validate(doc, ticker))
                old = json.loads((ROOT / f'data/stocks/{ticker}.json').read_text(encoding='utf-8'))
                self.assertEqual({k:m['value'] for k,m in old['ttm']['metrics'].items()},
                                 {k:m['value'] for k,m in doc['ttm']['metrics'].items()})
                reported = doc['annual'][-1]['metrics']['revenue']
                derived = doc['ttm']['metrics']['revenue']
                self.assertEqual(reported['kind'], 'reported')
                self.assertTrue(reported['accession'])
                self.assertEqual(derived['kind'], 'derived')
                self.assertEqual(derived['source'], 'SEC-derived')
                self.assertEqual(derived['methodVersion'], METHOD)
                self.assertEqual(len(derived['inputs']), 4)
                self.assertTrue(all(i['accession'] or i['derivedFrom'] for i in derived['inputs']))
                self.assertIsNone(doc['metadata']['fetchedAt'])
                self.assertEqual(doc['metadata']['updateStatus'], 'offline_fixture')
                if ticker != 'SOFI':
                    fcf = doc['quarterly'][-1]['metrics']['freeCashFlow']
                    self.assertEqual(fcf['kind'], 'derived')
                    self.assertTrue(fcf['sourceFilings'])
                    for filing in fcf['sourceFilings']:
                        self.assertRegex(filing['accession'], r'^\d{10}-\d{2}-\d{6}$')

    def test_invalid_refresh_and_source_failure_preserve_exact_bytes(self):
        good = json.loads((ROOT / 'data/stocks/NVDA.json').read_text(encoding='utf-8'))
        mutations = [lambda d: d.update(symbol='SOFI'),
                     lambda d: d['quarterly'].pop(-2),
                     lambda d: d['quarterly'].append(deepcopy(d['quarterly'][-1])),
                     lambda d: d['quarterly'][-1].update(periodStart=None),
                     lambda d: d['ttm']['metrics']['revenue'].update(value=float('inf')),
                     lambda d: d['ttm'].update(periodEnd=None),
                     lambda d: d['annual'][-1]['metrics']['revenue'].update(accession=None),
                     lambda d: d['metadata'].update(methodVersion='future')]
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'NVDA.json'
            raw = json.dumps(good).encode()
            for mutate in mutations:
                target.write_bytes(raw)
                bad = deepcopy(good); mutate(bad)
                with patch.object(StockNormalizer, 'normalize', return_value=bad), self.assertRaises((ValueError, TypeError)):
                    update_stock('NVDA', offline=True, output_dir=directory)
                self.assertEqual(target.read_bytes(), raw)
            client = Mock(); client.resolve_cik.return_value = '0001045810'
            client.get_submissions.side_effect = SECNetworkError('429 / unavailable')
            with self.assertRaises(SECNetworkError): update_stock('NVDA', client=client, output_dir=directory)
            self.assertEqual(target.read_bytes(), raw)
            client.get_submissions.side_effect = None
            for malformed in ({}, [], {'cik': 1045810, 'filings': {'recent': {}}}):
                client.get_submissions.return_value = malformed
                client.get_company_facts.return_value = {'cik': 1045810, 'facts': {}}
                with self.assertRaises(ValueError): update_stock('NVDA', client=client, output_dir=directory)
                self.assertEqual(target.read_bytes(), raw)
            future = deepcopy(good); future['quarterly'][-1]['periodEnd'] = '2099-01-01'
            with self.assertRaisesRegex(ValueError, 'regression'): validate(good, 'NVDA', future)

    def test_successful_mock_fetch_sets_truthful_fetch_timestamp(self):
        client = Mock(); client.resolve_cik.return_value = '0001045810'
        for method, suffix in [('get_submissions', 'submissions'), ('get_company_facts', 'companyfacts')]:
            getattr(client, method).return_value = json.loads((ROOT / f'tests/fixtures/sec_nvda_{suffix}.json').read_text())
        with tempfile.TemporaryDirectory() as directory:
            doc = json.loads(Path(update_stock('NVDA', client=client, output_dir=directory)).read_text())
            self.assertEqual(doc['metadata']['updateStatus'], 'success')
            self.assertEqual(doc['metadata']['fetchedAt'], doc['metadata']['generatedAt'])

    def test_macro_fields_and_partial_status_are_independent(self):
        event = {'actual': None, 'previous': '2%', 'forecast': '3%', 'source': 'BLS',
                 'sourceUrl': 'https://www.bls.gov/',
                 'fieldProvenance': {'forecast': {'kind': 'manual', 'source': 'NTM'}}}
        set_field(event, 'actual', '4%', '2026-09-13T00:00:00Z')
        complete_fields(event)
        self.assertEqual(event['fieldProvenance']['actual']['source'], 'BLS')
        self.assertEqual(event['fieldProvenance']['forecast']['kind'], 'manual')
        self.assertEqual(event['fieldProvenance']['previous']['kind'], 'unknown')
        event['forecast'] = None; complete_fields(event)
        self.assertEqual(event['fieldProvenance']['forecast']['kind'], 'unavailable')
        prior = {'lastSuccessfulUpdate': 'old'}
        meta = status_meta({'BLS': 'current', 'BEA': 'failed'}, 'now', prior)
        self.assertEqual(meta['status'], 'partial')
        self.assertEqual(meta['lastSuccessfulUpdate'], 'old')
        self.assertIsNone(meta['lastCompleteFetch'], 'Legacy BLS success is not a complete all-source fetch')
        self.assertEqual(status_meta({'BLS': 'failed'}, 'now', prior)['status'], 'fetch_error')
        self.assertEqual(status_meta({'BLS': 'current'}, 'now', prior)['lastSuccessfulUpdate'], 'now')

    def test_macro_update_partial_response_keeps_values_and_manual_forecast(self):
        event = {'id': 'us-unemployment-rate-test', 'date': '2026-09-04', 'period': 'Aug',
                 'refYear': 2026, 'actual': '3.5%', 'previous': '3.4%', 'forecast': '4.1%',
                 'fieldProvenance': {'forecast': {'kind': 'manual', 'source': 'NTM'}}}
        weeks = {'2026-W36': {'events': [event]}}
        payload = 'const macroWeeks = ' + json.dumps(weeks) + ';\nconst earningsWeeks = {};\nwindow.NTM_WEEKLY_EVENTS = {meta: {"lastSuccessfulUpdate":"old"}, macroWeeks, earningsWeeks};'
        response = ('REQUEST_SUCCEEDED', [{'seriesID': 'LNS14000000', 'data': [
            {'year': '2026', 'period': 'M08', 'value': '4.0'},
            {'year': '2026', 'period': 'M07', 'value': '3.0'}]}])
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'events.js'; target.write_text(payload)
            with patch.object(update_macro, 'DATA_FILE', str(target)), patch.object(update_macro, 'fetch_bls_schedule', return_value=[]), patch.object(update_macro, 'fetch_bls_data', return_value=response):
                update_macro.update_macro_data()
            result = target.read_text(encoding='utf-8')
            self.assertIn('"actual": "4.0%"', result)
            self.assertIn('"forecast": "4.1%"', result)
            self.assertIn('"kind": "manual"', result)
            self.assertIn('"status": "partial"', result)
            self.assertIn('"lastSuccessfulUpdate": "old"', result)

    def test_calendar_cache_is_not_reported_as_successful_fetch(self):
        with tempfile.TemporaryDirectory() as directory:
            cached = Path(directory) / 'calendar.ics'; cached.write_text('cached calendar')
            status = {}
            with patch.object(update_macro, 'ICS_CACHE_FILE', str(cached)), patch.object(update_macro.urllib.request, 'urlopen', side_effect=OSError('offline')), patch.object(update_macro, 'parse_ics_calendar', return_value=[{'date': '2026-09-10'}]):
                self.assertTrue(update_macro.fetch_bls_schedule(status))
            self.assertEqual(status['status'], 'cached')
            self.assertNotEqual(status_meta({'calendar': status['status']}, 'now', {})['status'], 'ok')
