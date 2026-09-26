"""Enrollment contract and fail-closed candidate parity; no network or data writes."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import issuer_registry as registry
import company_evidence
import evidence_sources
import sec_daily
import update_stocks
from stock_contract import IDENTITIES
from stock_normalizer import StockNormalizer


class RegistryTests(unittest.TestCase):
    def setUp(self):
        self.doc = registry.load()

    def test_current_membership_and_python_identity(self):
        financial = ('NVDA','SOFI','CRWD','MU','MRVL','VRT','COHR','RKLB','TTMI','SNDK','FLY','CRWV')
        self.assertEqual(registry.tickers('financial'), financial)
        self.assertEqual(registry.tickers('evidence'), ('NVDA','SOFI','CRWD'))
        self.assertEqual(registry.tickers('daily'), ('NVDA','SOFI','CRWD'))
        self.assertEqual(company_evidence.PILOT, registry.tickers('evidence'))
        self.assertEqual(IDENTITIES, registry.identities())
        self.assertNotIn('UNKNOWN', IDENTITIES)
        registry.check()

    def test_schema_uniqueness_and_capability_combinations(self):
        for key, value in [('ticker',''), ('cik','123'), ('profile','invented'), ('evidence','complete'),
                           ('daily','true'), ('financial',False), ('catalogOrder',True)]:
            with self.subTest(key=key):
                doc = copy.deepcopy(self.doc); doc['issuers'][0][key] = value
                with self.assertRaises(ValueError): registry.validate(doc)
        for key in ('ticker','cik','catalogOrder'):
            doc = copy.deepcopy(self.doc); doc['issuers'][1][key] = doc['issuers'][0][key]
            with self.assertRaises(ValueError): registry.validate(doc)
        for state in ('pending','unavailable','not_applicable'):
            doc = copy.deepcopy(self.doc); doc['issuers'][0]['evidence'] = state
            with self.assertRaises(ValueError): registry.validate(doc)
            doc['issuers'][0]['daily'] = False
            registry.validate(doc)
            self.assertNotIn('NVDA', registry.tickers('evidence', doc))
            self.assertNotIn('NVDA', registry.tickers('daily', doc))

    def test_projection_and_workflow_drift_rejected(self):
        generated = registry.generated_files()
        self.assertEqual(generated['ntm-product.js'], (ROOT/'ntm-product.js').read_text(encoding='utf-8'))
        self.assertEqual(generated['.github/workflows/deploy.yml'], (ROOT/'.github/workflows/deploy.yml').read_text(encoding='utf-8'))
        for stage in (False, True):
            paths = registry.workflow_paths(self.doc, stage)
            for t in ('NVDA','SOFI','CRWD'): self.assertIn(f'data/stocks/{t}.json', paths)
            for t in ('MU','VRT'): self.assertNotIn(f'data/stocks/{t}.json', paths)
            self.assertIn('scripts/source_reviews/*.json', paths)
            self.assertIn('data/stocks/evidence/*.json', paths)
            for folder in registry.SOURCE_FOLDERS:
                self.assertIn('tests/fixtures/'+folder+('' if stage else '/**'), paths)
        with tempfile.TemporaryDirectory() as d:
            root=Path(d); (root/'data').mkdir(); (root/'.github/workflows').mkdir(parents=True)
            (root/registry.REGISTRY).write_text(json.dumps(self.doc),encoding='utf-8')
            for name, content in generated.items(): (root/name).write_text(content,encoding='utf-8')
            (root/'ntm-product.js').write_text(generated['ntm-product.js'].replace('NVIDIA CORP','WRONG'),encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'projection drift'): registry.check(root)
            (root/'ntm-product.js').write_text(generated['ntm-product.js'],encoding='utf-8')
            (root/'.github/workflows/deploy.yml').write_text(generated['.github/workflows/deploy.yml'].replace('data/stocks/CRWD.json','data/stocks/MU.json'),encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'projection drift'): registry.check(root)

    def test_test_only_enrollment_flows_to_closure_cli_and_workflow(self):
        doc=copy.deepcopy(self.doc)
        row=copy.deepcopy(doc['issuers'][0]); row.update(ticker='TEST',cik='0009999999',catalogOrder=99)
        doc['issuers'].append(row); registry.validate(doc)
        self.assertIn('TEST',registry.tickers('evidence',doc))
        generated=registry.generated_files(document=doc)
        self.assertIn('options: [ALL, NVDA, SOFI, CRWD, TEST]',generated['.github/workflows/deploy.yml'])
        self.assertIn('data/stocks/TEST.json',registry.workflow_paths(doc))
        self.assertIn('data/stocks/TEST.json',registry.workflow_paths(doc,True))
        # Closure uses the candidate's enrollment, never an imported global tuple.
        with patch.object(evidence_sources,'load',return_value=doc), patch.object(evidence_sources,'validate_feed') as validate_feed, patch.object(evidence_sources,'read',side_effect=lambda p: {'path':str(p),'documents':[]}):
            evidence_sources.validate_repository(ROOT)
            self.assertEqual(validate_feed.call_count,4)
            self.assertTrue(validate_feed.call_args.args[0]['path'].endswith('TEST.json'))
        # Missing enabled feeds fail, rather than falling back to the production registry.
        with patch.object(evidence_sources,'load',return_value=doc), patch.object(evidence_sources,'validate_feed'):
            with self.assertRaises(FileNotFoundError): evidence_sources.validate_repository(ROOT)
        with patch.object(registry,'load',return_value=doc), patch.object(sec_daily,'run',return_value={'rejectedFailed':0}) as run, patch.object(update_stocks,'SECClient'), patch.object(sys,'argv',['update_stocks.py','--daily','--all']):
            update_stocks.main()
            self.assertEqual(run.call_args.args[0],['NVDA','SOFI','CRWD','TEST'])
        self.assertNotIn('TEST',registry.tickers('daily'))

    def test_cli_modes_and_rejection_are_distinct(self):
        with patch.object(update_stocks,'SECClient'), patch.object(sec_daily,'run',return_value={'rejectedFailed':0}) as run, patch.object(sys,'argv',['update_stocks.py','--daily','--all']):
            update_stocks.main(); self.assertEqual(run.call_args.args[0],list(registry.tickers('daily')))
        with patch.object(update_stocks,'SECClient'), patch.object(update_stocks,'update_evidence') as update, patch.object(sys,'argv',['update_stocks.py','--evidence','--all']):
            update_stocks.main(); self.assertEqual([c.args[0] for c in update.call_args_list],list(registry.tickers('evidence')))
        with patch.object(update_stocks,'update_stock',return_value=True) as update, patch.object(sys,'argv',['update_stocks.py','--all','--offline']):
            update_stocks.main(); self.assertEqual([c.args[0] for c in update.call_args_list],list(registry.tickers('financial')))
        for ticker in ('MU','VRT','UNKNOWN'):
            with self.assertRaisesRegex(ValueError,'Unsupported daily'): sec_daily.run([ticker],None)
            with self.assertRaisesRegex(ValueError,'Outside evidence'): update_stocks.update_evidence(ticker,None)

    def test_all_twelve_financial_objects_reproduce_offline(self):
        for ticker in registry.tickers('financial'):
            with self.subTest(ticker=ticker):
                read=lambda p:json.loads(p.read_text(encoding='utf-8'))
                published=read(ROOT/f'data/stocks/{ticker}.json')
                fixtures=ROOT/'tests/fixtures'
                actual=StockNormalizer(ticker).normalize(read(fixtures/f'sec_{ticker.lower()}_submissions.json'),read(fixtures/f'sec_{ticker.lower()}_companyfacts.json'))
                for key in ('annual','quarterly','ttm','valuationBase'):
                    self.assertEqual(actual[key],published[key],key)


if __name__ == '__main__':
    unittest.main()
