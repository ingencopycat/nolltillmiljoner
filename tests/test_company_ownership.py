import copy,json,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import Mock,patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from company_ownership import refresh,parse,index,validate,POLICY,digest
from update_stocks import update_evidence
FIX=ROOT/'tests/fixtures/company_ownership';CIKS={'NVDA':'0001045810','SOFI':'0001818874','CRWD':'0001535527'}
def submission(t):return json.loads((FIX/(t+'.json')).read_text(encoding='utf-8'))
def fetch(url):
 a=url.split('/')[-2];return (FIX/(a[:10]+'-'+a[10:12]+'-'+a[12:]+('.xml' if url.endswith('.xml') else '.html'))).read_text(encoding='utf-8')
def load(t):return refresh(submission(t),t,CIKS[t],fetch)
def filing(t,a):return next(f for f in load(t)['filings'] if f['accessionNumber']==a)
def policy():return json.loads(POLICY.read_text(encoding='utf-8'))
class OwnershipTests(unittest.TestCase):
 def test_real_sources_reproduce_published_evidence(self):
  for t,count in [('NVDA',3),('SOFI',10),('CRWD',2)]:
   d=load(t);self.assertEqual(len(d['filings']),count);self.assertEqual(d,json.loads((ROOT/'data/stocks/evidence'/(t+'.json')).read_text(encoding='utf-8'))['ownershipEvidence'])
 def test_actual_13g_values_powers_and_reporting_date(self):
  f=filing('NVDA','0002100119-26-000017');p=f['persons'][0];self.assertEqual(f['eventDate'],'2026-03-31');self.assertEqual(f['filingDate'],'2026-04-28');self.assertEqual(p['shares'],'1777408252');self.assertEqual(p['percent'],'7.31');self.assertEqual(p['powers']['soleVotingPower'],'238857870');self.assertEqual(f['rules'],['Rule 13d-1(b)'])
 def test_actual_13d_legacy_purpose_and_parent_relationship(self):
  f=filing('SOFI','0001140361-22-028766');self.assertEqual(f['family'],'13D');self.assertEqual(f['amendmentNumber'],'4');self.assertEqual(len(f['persons']),2);self.assertEqual(f['persons'][0]['shares'],f['persons'][1]['shares']);self.assertIn('determined to sell',f['statements']['purpose']);self.assertTrue(f['historyOnly'])
 def test_multiple_filers_are_distinct_without_invented_ciks(self):
  f=filing('SOFI','0001595888-25-000145');self.assertEqual(len(f['persons']),4);self.assertEqual(f['persons'][0]['cik'],'0001595888');self.assertIsNone(f['persons'][1]['cik']);self.assertEqual(len({p['entityId'] for p in f['persons']}),4);self.assertEqual(f['reportedPreviousAccession'],'0001595888-25-000106')
 def test_reviewed_amendment_links_and_comparability(self):
  f=filing('SOFI','0000019617-26-000076');self.assertEqual(f['previousAccession'],'0000019617-26-000047');self.assertEqual(f['comparison']['state'],'comparable');d=load('SOFI')
  amended=next(x for x in d['filings'] if x['accessionNumber']=='0000019617-26-000076');amended['persons'][0]['entityId']='different'
  with self.assertRaises(ValueError):validate(d,'SOFI',CIKS['SOFI'])
 def test_reorganization_zero_is_not_comparable_and_entities_do_not_merge(self):
  d=load('NVDA');a=next(f for f in d['filings'] if f['accessionNumber']=='0000102909-26-000426');self.assertEqual(a['persons'][0]['shares'],'0');self.assertEqual(a['comparison']['state'],'not_comparable');self.assertNotEqual(a['seriesId'],d['filings'][0]['seriesId'])
 def test_scope_change_in_13d_breaks_position_comparison(self):
  f=filing('SOFI','0001140361-22-030137');self.assertEqual(f['comparison']['state'],'not_comparable');self.assertIn('31 428',f['comparison']['reason'])
 def test_outbound_issuer_filings_are_excluded(self):
  d=load('NVDA');self.assertEqual(len(d['excluded']),4);self.assertTrue(all(f['cik']==CIKS['NVDA'] for f in d['filings']));self.assertNotIn('Nebius',json.dumps(d['filings']))
 def test_incremental_rerun_does_not_refetch_verified_sources(self):
  d=load('SOFI');fetcher=Mock(side_effect=AssertionError('network'));self.assertEqual(refresh(submission('SOFI'),'SOFI',CIKS['SOFI'],fetcher,d),d);fetcher.assert_not_called()
 def test_changed_source_fails_and_does_not_mutate_previous(self):
  d=load('SOFI');before=copy.deepcopy(d)
  with self.assertRaises(ValueError):refresh(submission('SOFI'),'SOFI',CIKS['SOFI'],lambda u:fetch(u)+'\n',d,reverify=True)
  self.assertEqual(d,before)
 def test_new_documents_queue_for_review_not_automatic_observations(self):
  d=load('CRWD');s=submission('CRWD');r=s['filings']['recent']
  for k in r:r[k].insert(0,r[k][0])
  r['accessionNumber'][0]='0002100119-26-009999';r['filingDate'][0]='2026-09-23'
  result=refresh(s,'CRWD',CIKS['CRWD'],Mock(side_effect=AssertionError('unreviewed fetch')),d);self.assertEqual(result['filings'],d['filings']);self.assertEqual(len(result['pendingReview']),1)
 def test_duplicate_filing_suppressed_conflict_rejected(self):
  s=submission('SOFI');r=s['filings']['recent']
  for k in r:r[k].append(r[k][0])
  self.assertEqual(load('SOFI'),refresh(s,'SOFI',CIKS['SOFI'],fetch));r['filingDate'][-1]='2026-04-29'
  with self.assertRaises(ValueError):index(s,'SOFI',CIKS['SOFI'])
 def test_unknown_structures_missing_numbers_and_wrong_issuer_fail_review(self):
  r=next(x for x in policy()['documents'] if x['accessionNumber']=='0002100119-26-000017');xml=fetch(r['metadata']['url'])
  for bad in ['<broken>','<!DOCTYPE x>'+xml,xml.replace('<classPercent>7.31</classPercent>',''),xml.replace('1777408252','NaN'),xml.replace('<issuerCik>0001045810','<issuerCik>0001818874'),xml.replace('Vanguard Capital Management</reportingPersonName>','Other Entity</reportingPersonName>')]:
   synthetic=copy.deepcopy(r);synthetic['sha256']=digest(bad)
   with self.assertRaises((ValueError,KeyError)):parse(bad,r['metadata'],synthetic)
 def test_provenance_and_unsafe_links(self):
  d=load('SOFI');self.assertTrue(all(len(f['source']['sha256'])==64 for f in d['filings']));d['filings'][0]['renderedUrl']='javascript:alert(1)'
  with self.assertRaises(ValueError):validate(d,'SOFI',CIKS['SOFI'])
 def test_index_gap_fails_closed(self):
  s=submission('CRWD');s['filings']['recent']={k:v[:1] for k,v in s['filings']['recent'].items()}
  with self.assertRaises(ValueError):refresh(s,'CRWD',CIKS['CRWD'],fetch)
 def test_source_failure_preserves_entire_prior_feed(self):
  with tempfile.TemporaryDirectory() as directory:
   path=Path(directory)/'SOFI.json';path.write_bytes((ROOT/'data/stocks/evidence/SOFI.json').read_bytes());before=path.read_bytes();client=Mock();client.get_submissions.return_value=submission('SOFI');client.get_ownership_xml.side_effect=OSError('ownership outage')
   with patch('company_evidence.refresh',return_value=json.loads(before)),self.assertRaisesRegex(OSError,'ownership outage'):update_evidence('SOFI',client,output_dir=directory,ownership=True,reverify_ownership=True)
   self.assertEqual(path.read_bytes(),before);self.assertEqual(json.loads((Path(directory)/'SOFI.status.json').read_text())['status'],'unavailable')
 def test_offline_pipeline(self):
  with tempfile.TemporaryDirectory() as directory:
   d=update_evidence('SOFI',None,offline=True,output_dir=directory,ownership=True);self.assertEqual(d['status'],'offline_fixture');self.assertEqual(len(d['ownershipEvidence']['filings']),10)
 def test_reviewed_old_history_remains_when_index_rolls(self):
  d=load('SOFI');s=submission('SOFI');r=s['filings']['recent'];s['filings']['recent']={k:[v for i,v in enumerate(values) if r['filingDate'][i]>='2025-01-01'] for k,values in r.items()}
  self.assertEqual(refresh(s,'SOFI',CIKS['SOFI'],Mock(side_effect=AssertionError('refetch')),d),d)
if __name__=='__main__':unittest.main()
