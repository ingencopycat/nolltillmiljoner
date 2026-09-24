import copy,json,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import Mock,patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from company_insiders import parse,metadata,refresh,validate,POLICY
from sec_client import SECClient,SECClientError
from update_stocks import update_evidence
FIX=ROOT/'tests/fixtures/company_insiders'
CIKS={'NVDA':'0001045810','SOFI':'0001818874','CRWD':'0001535527'}
def submission(t):return json.loads((FIX/(t+'.json')).read_text(encoding='utf-8'))
def fetch(url):
 a=url.split('/')[-2];return (FIX/(a[:10]+'-'+a[10:12]+'-'+a[12:]+'.xml')).read_text(encoding='utf-8')
def load(t):return refresh(submission(t),t,CIKS[t],fetch)
def filing(t,a):return next(f for f in load(t)['filings'] if f['accessionNumber']==a)

class InsidersTests(unittest.TestCase):
 def test_real_fixtures_reproduce_published(self):
  for t in CIKS:
   published=json.loads((ROOT/'data/stocks/evidence'/(t+'.json')).read_text(encoding='utf-8'))['insiderEvidence']
   data=load(t);self.assertEqual(len(data['filings']),len(published['filings']));self.assertEqual(data,published)
 def test_real_purchase_price_and_precision(self):
  f=filing('SOFI','0001613438-26-000016');r=f['transactions'][0];self.assertEqual(r['code'],'P');self.assertEqual(r['fields']['shares']['value'],'13888');self.assertEqual(r['fields']['price']['value'],'18.0578');self.assertTrue(r['classification']['weightedPrice']);self.assertEqual(r['classification']['venue'],'unspecified')
 def test_real_sales_with_multiple_rows_not_duplicated(self):
  f=filing('NVDA','0001588670-26-000014');self.assertEqual(len(f['transactions']),4);self.assertEqual(len({r['id'] for r in f['transactions']}),4);self.assertEqual([r['classification']['category'] for r in f['transactions']],['withholding','sale','sale','sale'])
 def test_award_not_purchase(self):
  f=filing('NVDA','0002152188-26-000005');self.assertEqual(f['transactions'][0]['classification']['category'],'award')
 def test_tax_footnote_and_direct_indirect_holdings(self):
  f=filing('NVDA','0001588670-26-000014');self.assertTrue(f['transactions'][0]['classification']['taxRelated']);self.assertEqual(f['transactions'][0]['fields']['ownership']['value'],'D');self.assertTrue(any(h['fields']['ownership']['value']=='I' for h in f['holdings']));self.assertTrue(f['transactions'][0]['fields']['ownedAfter']['value'])
 def test_exercise_and_derivative_legs_remain_distinct(self):
  f=filing('CRWD','0001061632-26-000008');self.assertEqual(len(f['transactions']),4);self.assertEqual(f['transactions'][0]['classification']['category'],'exercise');derivative=f['transactions'][-1];self.assertEqual(derivative['table'],'derivative');self.assertEqual(derivative['classification']['category'],'derivative');self.assertEqual(derivative['fields']['underlyingShares']['value'],'50000')
 def test_missing_price_is_null_with_footnote(self):
  f=filing('SOFI','0002032458-26-000026');r=f['transactions'][0];self.assertIsNone(r['fields']['price']['value']);self.assertEqual(r['fields']['price']['footnoteIds'],['F1']);self.assertIn('F1',f['footnotes'])
 def test_real_amendment_preserves_both_and_checks_economic_rows(self):
  d=load('NVDA');a=next(f for f in d['filings'] if f['form']=='4/A');self.assertEqual(a['originalFiledDate'],'2023-11-28');self.assertIn('correct date',a['remarks']);self.assertEqual(len(a['transactions']),16);a['transactions'][0]['fields']['shares']['value']='999'
  with self.assertRaises(ValueError):validate(d,'NVDA',CIKS['NVDA'])
 def test_incremental_rerun_fetches_no_existing_documents(self):
  d=load('NVDA');fetcher=Mock(side_effect=AssertionError('Unexpected fetch'));self.assertEqual(refresh(submission('NVDA'),'NVDA',CIKS['NVDA'],fetcher,d),d);fetcher.assert_not_called()
 def test_changed_historical_document_is_not_overwritten(self):
  d=load('NVDA');before=copy.deepcopy(d)
  with self.assertRaises(ValueError):refresh(submission('NVDA'),'NVDA',CIKS['NVDA'],lambda u:fetch(u)+'\n',d,reverify=True)
  self.assertEqual(d,before)
 def test_incremental_new_filing_fetches_only_new_source(self):
  d=load('NVDA');old=copy.deepcopy(d);new=old['filings'].pop(0);calls=[]
  actual=refresh(submission('NVDA'),'NVDA',CIKS['NVDA'],lambda u:(calls.append(u) or fetch(u)),old);self.assertEqual(calls,[new['url']]);self.assertEqual(actual,d)
 def test_duplicate_index_deduplicates_but_conflict_fails(self):
  s=submission('NVDA');r=s['filings']['recent']
  for key in r:r[key].append(r[key][0])
  self.assertEqual(load('NVDA'),refresh(s,'NVDA',CIKS['NVDA'],fetch));r['filingDate'][-1]='2026-09-19'
  with self.assertRaises(ValueError):metadata(s,'NVDA',CIKS['NVDA'])
 def test_source_failure_preserves_whole_existing_feed(self):
  with tempfile.TemporaryDirectory() as directory:
   target=Path(directory)/'NVDA.json';target.write_bytes((ROOT/'data/stocks/evidence/NVDA.json').read_bytes());before=target.read_bytes();client=Mock();client.get_submissions.return_value=submission('NVDA');client.get_ownership_xml.side_effect=OSError('ownership XML outage')
   with patch('company_evidence.refresh',return_value=json.loads(before)),self.assertRaisesRegex(OSError,'ownership XML outage'):update_evidence('NVDA',client,output_dir=directory,insiders=True,reverify_insiders=True)
   client.get_ownership_xml.assert_called_once()
   self.assertEqual(target.read_bytes(),before);self.assertEqual(json.loads((Path(directory)/'NVDA.status.json').read_text())['status'],'unavailable')
 def test_offline_pipeline_is_explicitly_offline(self):
  with tempfile.TemporaryDirectory() as directory:
   d=update_evidence('SOFI',None,offline=True,output_dir=directory,insiders=True);self.assertEqual(d['status'],'offline_fixture');self.assertEqual(d['insiderEvidence'],load('SOFI'))
 def test_malformed_entity_or_wrong_issuer_fails_closed(self):
  m=next(iter(metadata(submission('SOFI'),'SOFI',CIKS['SOFI']).values()));xml=fetch(m['url'])
  for bad in ['not XML','<ownershipDocument>','<!DOCTYPE x [<!ENTITY secret SYSTEM "file:///secret">]>'+xml,xml.replace('<issuerCik>0001818874','<issuerCik>0001045810'),xml.replace('<documentType>4','<documentType>3')]:
   with self.assertRaises(ValueError):parse(bad,m)
 def test_unknown_numeric_text_and_dangling_footnotes_rejected(self):
  m=metadata(submission('SOFI'),'SOFI',CIKS['SOFI'])['0002032458-26-000026'];xml=fetch(m['url'])
  for bad in [xml.replace('<value>82643</value>','<value>unknown</value>'),xml.replace('id="F1"/>','id="MISSING"/>')]:
   self.assertNotEqual(bad,xml)
   with self.assertRaises(ValueError):parse(bad,m)
 def test_provenance_and_url_boundaries(self):
  d=load('NVDA');self.assertEqual(len(d['filings'][0]['source']['sha256']),64);d['filings'][0]['renderedUrl']='javascript:alert(1)'
  with self.assertRaises(ValueError):validate(d,'NVDA',CIKS['NVDA'])
  for url in ['https://evil.test/x.xml','https://www.sec.gov/Archives/edgar/data/1/123/x.xml','https://www.sec.gov/Archives/edgar/data/1/000000000000000001/../x.xml']:
   with self.assertRaises(SECClientError):SECClient().get_ownership_xml(url)
 def test_recent_window_gap_is_not_claimed_complete(self):
  s=submission('CRWD');r=s['filings']['recent'];s['filings']['recent']={k:v[:1] for k,v in r.items()}
  with self.assertRaises(ValueError):refresh(s,'CRWD',CIKS['CRWD'],fetch)
 def test_reporting_owner_not_issuer_and_addresses_not_normalized(self):
  f=load('SOFI')['filings'][0];self.assertNotEqual(f['owners'][0]['cik'],f['cik']);self.assertNotIn('Address',json.dumps(f));self.assertTrue(f['owners'][0]['isOfficer'])
 def test_open_market_requires_explicit_completed_transaction_language(self):
  from company_insiders import classify
  r=filing('SOFI','0001613438-26-000016')['transactions'][0]
  self.assertEqual(classify(r,{'F1':'Shares were purchased in the open market.'})['venue'],'open_market')
  self.assertEqual(classify(r,{'F1':'Shares may be sold in the open market.'})['venue'],'unspecified')
  self.assertEqual(classify(r,{'F1':'Shares were not purchased in the open market.'})['venue'],'unspecified')
  sale=copy.deepcopy(r);sale['code']='S';sale['fields']['direction']['value']='D';self.assertEqual(classify(sale,{'F1':'Shares were sold on the open market.'})['venue'],'open_market')

if __name__=='__main__':unittest.main()
