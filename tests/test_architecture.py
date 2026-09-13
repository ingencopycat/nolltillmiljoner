import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import unittest
from unittest.mock import patch, MagicMock
import urllib.error
import re
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from sec_client import SECClient, SECNetworkError
from stock_normalizer import StockNormalizer


class ArchitectureTests(unittest.TestCase):
    def test_readme_matches_operational_boundaries(self):
        readme=(ROOT/'README.md').read_text(encoding='utf-8')
        self.assertNotIn('no browser was available',readme)
        self.assertNotIn('or analytics tracking',readme)
        self.assertIn('Cloudflare Web Analytics',readme)
        self.assertTrue(any('static.cloudflareinsights.com' in p.read_text(encoding='utf-8') for p in ROOT.glob('*.html')))
        for contract in ('valuation-core.js','lastCompleteFetch','ntm-stock-v1','Retry-After','check_calendar_coverage.cjs'):
            self.assertIn(contract,readme)

    def test_workflow_permission_boundaries(self):
        workflow=(ROOT/'.github/workflows/deploy.yml').read_text()
        self.assertIn('permissions: {}',workflow)
        jobs=dict(re.findall(r'^  ([a-z-]+):\n(.*?)(?=^  [a-z-]+:\n|\Z)',workflow.split('jobs:\n',1)[1],re.M|re.S))
        expected={'validate':{'contents':'read'},'prepare-data':{'contents':'read'},'build':{'contents':'read'},
                  'commit-data':{'contents':'write'},'deploy':{'pages':'write','id-token':'write'}}
        self.assertEqual(set(jobs),set(expected))
        for name,scopes in expected.items():
            block=re.search(r'^    permissions:\n((?:      [^\n]+\n)+)',jobs[name],re.M).group(1)
            self.assertEqual(dict(re.findall(r'      ([\w-]+): (\w+)',block)),scopes)
        for name in ('validate','prepare-data','build'):
            self.assertIn('persist-credentials: false',jobs[name])
        self.assertNotIn('secrets.',jobs['commit-data'])
        self.assertIn('needs: build',jobs['deploy'])
        self.assertIn('needs.commit-data.outputs.revision',jobs['build'])

    def test_module_order_and_unique_touched_functions(self):
        for page in ROOT.glob('*.html'):
            html=page.read_text(encoding='utf-8')
            if '<script src="script.js"' in html:
                self.assertLess(html.index('<script src="valuation-core.js"'),html.index('<script src="script.js"'))
                self.assertEqual(html.count('<script src="valuation-core.js"'),1)
        for file in ('script.js','research.js'):
            names=re.findall(r'^function (\w+)\(', (ROOT/file).read_text(encoding='utf-8'),re.M)
            self.assertEqual(len(names),len(set(names)),file)

    def test_pure_core_properties(self):
        node = os.environ.get('NODE_BINARY') or shutil.which('node')
        result = subprocess.run([node, '--test', 'tests/valuation-core.test.cjs'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_bounded_retries(self):
        response = MagicMock(); response.__enter__.return_value.read.return_value = b'{"ok":true}'
        response.__enter__.return_value.info.return_value.get.return_value = None
        with patch('sec_client.time.sleep') as sleep, patch('sec_client.urllib.request.urlopen', side_effect=[urllib.error.URLError('offline'), response]) as request:
            self.assertTrue(SECClient(rate_limit_delay=0)._fetch_json('https://example.test')['ok'])
            self.assertEqual(request.call_count, 2); sleep.assert_called_once_with(1)
        for code, attempts in [(429,3),(503,3),(404,1),(403,1)]:
            error = urllib.error.HTTPError('url',code,'error',{'Retry-After':'3'},None)
            with patch('sec_client.time.sleep') as sleep, patch('sec_client.urllib.request.urlopen', side_effect=error) as request:
                with self.assertRaises(SECNetworkError): SECClient(rate_limit_delay=0)._fetch_json('https://example.test')
                self.assertEqual(request.call_count,attempts)
                for call in sleep.call_args_list: self.assertEqual(call.args[0],3)
            error.close()
        error = urllib.error.HTTPError('url',429,'error',{'Retry-After':'3600'},None)
        with patch('sec_client.time.sleep') as sleep, patch('sec_client.urllib.request.urlopen', side_effect=error) as request:
            with self.assertRaisesRegex(SECNetworkError,'bounded'): SECClient(rate_limit_delay=0)._fetch_json('https://example.test')
            self.assertEqual(request.call_count,1); sleep.assert_not_called()
        error.close()

    def test_independent_ttm_oracle(self):
        quarters = []
        for n, (start,end) in enumerate([('01-01','03-31'),('04-01','06-30'),('07-01','09-30'),('10-01','12-31')],1):
            quarters.append({'period':f'2025Q{n}','fiscalYear':2025,'fiscalPeriod':f'Q{n}',
                'periodStart':f'2025-{start}','periodEnd':f'2025-{end}', 'metrics':{
                    key:{'value':value} for key,value in {'revenue':n*100,'netIncome':n*10,'netIncomeToCommon':n*10,
                     'dilutedShares':10,'operatingCashFlow':30,'capex':10,'freeCashFlow':20}.items()}})
        normalizer = StockNormalizer('NVDA'); result = normalizer.compute_ttm(quarters)['metrics']
        self.assertEqual(result['revenue']['value'],1000)
        self.assertEqual(result['netIncome']['value'],100)
        self.assertEqual(result['dilutedEps']['value'],10)
        self.assertEqual(result['freeCashFlow']['value'],80)
        self.assertIsNone(normalizer.compute_ttm(quarters[:2]+quarters[3:]))
        quarters[-1]['metrics']['dilutedShares']['value']=100
        self.assertIsNone(normalizer.compute_ttm(quarters)['metrics']['dilutedEps']['value'])

    def test_retry_after_http_date_and_malformed_header(self):
        response=MagicMock(); response.__enter__.return_value.read.return_value=b'{}'
        response.__enter__.return_value.info.return_value.get.return_value=None
        for header,delay in [('Wed, 01 Jan 2025 00:00:10 GMT',10),('invalid',1)]:
            error=urllib.error.HTTPError('url',503,'busy',{'Retry-After':header},None)
            with patch('sec_client.datetime') as clock, patch('sec_client.time.sleep') as sleep, patch('sec_client.urllib.request.urlopen',side_effect=[error,response]) as request:
                clock.now.return_value=datetime(2025,1,1,tzinfo=timezone.utc)
                self.assertEqual(SECClient(rate_limit_delay=0)._fetch_json('https://example.test'),{})
                sleep.assert_called_once_with(delay); self.assertEqual(request.call_count,2)

    def test_fcf_identity_from_reported_components(self):
        for ticker in ['NVDA','CRWD']:
            doc=json.loads((ROOT/f'data/stocks/{ticker}.json').read_text(encoding='utf-8'))
            for period in doc['annual']+doc['quarterly']:
                m=period['metrics']
                ocf,capex=m['operatingCashFlow']['value'],m['capex']['value']
                self.assertEqual(m['freeCashFlow']['value'],None if ocf is None or capex is None else ocf-capex)
