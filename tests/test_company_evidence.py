import copy
import json
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from company_evidence import *
from stock_contract import IDENTITIES
from sec_client import SECClient, SECClientError, SECNetworkError
from update_stocks import update_evidence
ROOT=Path(__file__).resolve().parents[1]
FIX=ROOT/'tests/fixtures/company_evidence'

def submissions(t='NVDA'):
    return json.loads((FIX/(t+'.json')).read_text(encoding='utf-8'))
def fetch(url):
    a=url.split('/')[-2];a=a[:10]+'-'+a[10:12]+'-'+a[12:]
    return (FIX/(a+'.html')).read_text(encoding='utf-8')
def build(t='NVDA'):
    return refresh(submissions(t),t,IDENTITIES[t],fetch)

class CompanyEvidenceTests(unittest.TestCase):
    def test_official_pilot_earnings_relationships(self):
        expected={'NVDA':('0001045810-26-000073','q2fy27pr.htm'),'SOFI':('0001818874-26-000050','a2026q2earningsrelease.htm'),'CRWD':('0001535527-26-000029','crwd-20260826xex991.htm')}
        for t,(accession,doc) in expected.items():
            result=build(t);validate_evidence(result,t,IDENTITIES[t])
            event=next(e for e in result['events'] if e['accessionNumber']==accession)
            self.assertEqual(event['classification'],'results_disclosure')
            self.assertEqual(event['documents'][0]['exhibit'],'99.1')
            self.assertTrue(event['documents'][0]['url'].endswith('/'+doc))
            self.assertEqual(event['documents'][0]['accessionNumber'],accession)
    def test_non_earnings_periodic_order_and_latest(self):
        data=build();events=data['events']
        self.assertTrue(any(e['classification']=='other_current_report' and not e['documents'] for e in events))
        self.assertTrue(any(e['form']=='10-K' for e in events));self.assertTrue(any(e['form']=='10-Q' for e in events))
        self.assertEqual(events,sorted(events,key=lambda e:(e['filingDate'],e['accessionNumber']),reverse=True))
        latest=latest_report(events);self.assertEqual(latest['form'],'10-Q');self.assertEqual(latest['reportDate'],'2026-07-26')
        amended=copy.deepcopy(latest);amended.update(amendment=True,form='10-Q/A',filingDate='2026-09-22')
        self.assertEqual(latest_report([amended]+events),latest)
    def test_official_amendments_are_distinct(self):
        s=json.loads((FIX/'amendments.json').read_text());events=filing_events(s,'SOFI',IDENTITIES['SOFI'])
        self.assertEqual({e['form'] for e in events},{'8-K/A','10-K/A'})
        self.assertTrue(all(e['amendment'] for e in events));self.assertIsNone(latest_report(events))
    def test_duplicate_and_malformed(self):
        s=submissions();r=s['filings']['recent']
        for values in r.values():values.append(values[0])
        self.assertEqual(len(filing_events(s,'NVDA',IDENTITIES['NVDA'])),24)
        r['filingDate'][-1]='2026-01-01'
        with self.assertRaises(ValueError):filing_events(s,'NVDA',IDENTITIES['NVDA'])
        for key,value in [('primaryDocument','../../evil.htm'),('filingDate','2026-02-30'),('filingDate','20260922'),('items','2.02<script>')]:
            s=submissions();s['filings']['recent'][key][0]=value
            with self.assertRaises(ValueError):filing_events(s,'NVDA',IDENTITIES['NVDA'])
        s=submissions();s['filings']['recent']['items'].pop()
        with self.assertRaises(ValueError):filing_events(s,'NVDA',IDENTITIES['NVDA'])
    def test_missing_ambiguous_and_unsafe_exhibits(self):
        e=next(e for e in build()['events'] if e['classification']=='results_disclosure');html=fetch(e['primaryDocUrl'])
        for source in ('<html>99.1 earnings.htm</html>',html.replace('99.1','98.1'),html.replace('q2fy27pr.htm','https://evil.test/earnings.htm'),html.replace('q2fy27pr.htm','../earnings.htm')):
            self.assertEqual(earnings_documents(e,source),[])
        unsupported=next(e for e in build('CRWD')['events'] if e['accessionNumber']=='0001104659-25-045244')
        self.assertEqual(unsupported['documentStatus'],'unsupported_relationship')
    def test_incremental_avoids_refetching_verified_accessions(self):
        previous=build();fetcher=Mock(side_effect=AssertionError('Unexpected network'))
        self.assertEqual(refresh(submissions(),'NVDA',IDENTITIES['NVDA'],fetcher,previous),previous)
        fetcher.assert_not_called()
    def test_fixture_cache_cannot_be_promoted_to_live_evidence(self):
        with tempfile.TemporaryDirectory() as d:
            update_evidence('NVDA',None,offline=True,output_dir=d)
            client=Mock();client.get_submissions.return_value=submissions();client.get_filing_html.side_effect=fetch
            result=update_evidence('NVDA',client,output_dir=d)
            self.assertGreater(client.get_filing_html.call_count,0)
            self.assertEqual(result['status'],'verified')
            client.get_filing_html.reset_mock()
            update_evidence('NVDA',client,output_dir=d)
            client.get_filing_html.assert_not_called()
    def test_failures_preserve_last_verified_bytes(self):
        with tempfile.TemporaryDirectory() as d:
            update_evidence('NVDA',None,offline=True,output_dir=d)
            path=Path(d)/'NVDA.json';before=path.read_bytes()
            client=Mock();client.get_submissions.side_effect=SECNetworkError('unavailable')
            with self.assertRaises(SECNetworkError):update_evidence('NVDA',client,output_dir=d)
            self.assertEqual(path.read_bytes(),before)
            self.assertEqual(json.loads((Path(d)/'NVDA.status.json').read_text())['status'],'unavailable')
            client.get_submissions.side_effect=None;client.get_submissions.return_value={'cik':'wrong'}
            with self.assertRaises(ValueError):update_evidence('NVDA',client,output_dir=d)
            self.assertEqual(path.read_bytes(),before)
            client.get_submissions.return_value=submissions();client.get_filing_html.side_effect=SECNetworkError('exhibit unavailable')
            with self.assertRaises(SECNetworkError):update_evidence('NVDA',client,output_dir=d)
            self.assertEqual(path.read_bytes(),before)
    def test_document_transport_boundaries(self):
        client=SECClient(rate_limit_delay=0)
        for url in ('http://www.sec.gov/a.htm','https://evil.test/a.htm','https://www.sec.gov/Archives/edgar/data/1/000000000000000001/../x.htm'):
            with self.assertRaises(SECClientError):client.get_filing_html(url)
        url='https://www.sec.gov/Archives/edgar/data/1/000000000000000001/x.htm'
        for mime,body in [('application/javascript',b'x'),('text/html',b'x'*2000001)]:
            response=Mock();response.headers.get_content_type.return_value=mime;response.headers.get.return_value=None;response.read.return_value=body
            response.__enter__=Mock(return_value=response);response.__exit__=Mock(return_value=False)
            with patch('urllib.request.build_opener') as opener:
                opener.return_value.open.return_value=response
                with self.assertRaises(SECClientError):client.get_filing_html(url)
                with self.assertRaises(SECClientError):opener.call_args.args[0].redirect_request(None,None,None,None,None,'https://evil.test/')
    def test_generated_data_and_tampering(self):
        for t in PILOT:
            data=json.loads((ROOT/'data/stocks/evidence'/(t+'.json')).read_text(encoding='utf-8'));validate_evidence(data,t,IDENTITIES[t])
            data['events'][0]['classification']='annual_report'
            with self.assertRaises(ValueError):validate_evidence(data,t,IDENTITIES[t])
    def test_synthetic_scale(self):
        source=submissions();start=time.perf_counter()
        for count in (10,100):
            for i in range(count):
                cik=str(900000+i).zfill(10);s=copy.deepcopy(source);s['cik']=cik
                events=filing_events(s,'SYN'+str(i),cik)
                self.assertEqual(len(events),24);self.assertTrue(all(e['cik']==cik for e in events))
        print(f'Company evidence synthetic 10 + 100 issuers: {time.perf_counter()-start:.3f}s; metadata only, no network')

if __name__=='__main__':unittest.main()
