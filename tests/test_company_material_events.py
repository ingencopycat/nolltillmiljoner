import copy,json,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import Mock,patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from company_material_events import refresh,validate,classify,metadata,review_document,POLICY,digest
from update_stocks import update_evidence
FIX=ROOT/'tests/fixtures/company_material_events';CIKS={'NVDA':'0001045810','SOFI':'0001818874','CRWD':'0001535527'}
def submission(t):return json.loads((FIX/(t+'.json')).read_text(encoding='utf-8'))
def fetch(url):
 a=url.split('/')[-2];return (FIX/(a[:10]+'-'+a[10:12]+'-'+a[12:]+'.html')).read_text(encoding='utf-8')
def load(t):return refresh(submission(t),t,CIKS[t],fetch)
def observation(t,template):return next(o for o in load(t)['observations'] if o['template']==template)
class MaterialEventTests(unittest.TestCase):
 def test_official_fixtures_reproduce_published_data(self):
  for t in CIKS:self.assertEqual(load(t),json.loads((ROOT/'data/stocks/evidence'/(t+'.json')).read_text(encoding='utf-8'))['materialEvents'])
 def test_material_agreement_and_obligation_are_one_guarantee_event(self):
  d=load('NVDA');o=observation('NVDA','guarantees');self.assertEqual(o['items'],['1.01','2.03','7.01']);self.assertEqual(o['facts'][0]['value'],'105000000000');self.assertEqual(len([x for x in d['observations'] if x['accessionNumber']==o['accessionNumber']]),1)
 def test_acquisition_agreement_is_not_completed_acquisition(self):
  o=observation('SOFI','acquisition_agreed');self.assertEqual(o['parameters']['target'],'Technisys');self.assertEqual(o['eventDate'],'2022-02-19');self.assertEqual(o['category'],'acquisition')
 def test_financing_single_filing_can_have_two_distinct_events(self):
  d=load('SOFI');original=[o for o in d['observations'] if o['accessionNumber']=='0001818874-24-000045'];self.assertEqual(len(original),2);self.assertEqual(len({o['eventId'] for o in original}),2);self.assertEqual(observation('SOFI','notes_issued')['facts'][0]['value'],'862500000.0')
 def test_real_amendment_links_only_exchange_and_keeps_original(self):
  d=load('SOFI');a=observation('SOFI','exchange_settled');original=next(o for o in d['observations'] if o['id']==a['previousId']);self.assertEqual(original['template'],'notes_exchange');self.assertEqual(a['facts'][0]['value'],'72621879');self.assertEqual(a['eventId'],original['eventId']);self.assertNotEqual(a['eventId'],observation('SOFI','notes_issued')['eventId'])
 def test_restructuring_with_earnings_excludes_only_earnings_item(self):
  d=load('CRWD');o=observation('CRWD','workforce_plan');doc=d['documents'][o['accessionNumber']];self.assertIn('2.02',doc['items']);self.assertNotIn('2.02',o['items']);self.assertEqual(o['facts'][0]['value'],'500');self.assertEqual(o['category'],'restructuring')
 def test_earnings_and_exhibits_alone_are_not_material_events(self):
  for items in [['2.02','9.01'],['9.01'],['5.07']]:self.assertFalse(classify(items)['needsReview'])
  self.assertTrue(classify(['2.02','9.01'])['earningsCanonical'])
 def test_leadership_requires_review_not_every_compensation_filing(self):
  o=observation('NVDA','executive_successor');self.assertEqual(o['parameters']['incoming'],'Nicholas Parker');d=load('CRWD');self.assertIn('0001535527-26-000018',d['documents']);self.assertFalse(any(o['accessionNumber']=='0001535527-26-000018' for o in d['observations']))
 def test_operational_outage_is_explicitly_not_cyberattack(self):
  o=observation('CRWD','service_outage');self.assertEqual(o['category'],'operating_incident');d=load('CRWD');self.assertTrue(any('not caused by a cyberattack' in p for p in d['documents'][o['accessionNumber']]['passages']));self.assertEqual(classify(['1.05'])['candidates'],['cybersecurity'])
 def test_unsupported_item_is_queued_without_invented_category(self):
  c=classify(['6.01']);self.assertTrue(c['needsReview']);self.assertEqual(c['candidates'],[])
 def test_impairment_item_candidate_not_inferred_from_other_event_costs(self):
  self.assertEqual(classify(['2.06'])['candidates'],['impairment']);self.assertEqual(observation('NVDA','export_license')['category'],'regulatory')
 def test_duplicates_suppressed_and_conflicting_metadata_rejected(self):
  s=submission('NVDA');r=s['filings']['recent']
  for k in r:r[k].append(r[k][0])
  self.assertEqual(refresh(s,'NVDA',CIKS['NVDA'],fetch),load('NVDA'));r['filingDate'][-1]='2026-09-22'
  with self.assertRaises(ValueError):metadata(s,'NVDA',CIKS['NVDA'])
 def test_malformed_source_and_item_structure_fail_closed(self):
  p=json.loads(POLICY.read_text(encoding='utf-8'));r=p['documents'][0];source=fetch(r['metadata']['primaryDocUrl'])
  for s in ['not html',source.replace('Item 1.01','Item 6.01')]:
   synthetic=copy.deepcopy(r);synthetic['sha256']=digest(s)
   with self.assertRaises(ValueError):review_document(s,r['metadata'],synthetic)
 def test_incremental_cache_and_new_review_queue(self):
  d=load('NVDA');no_fetch=Mock(side_effect=AssertionError('network'));self.assertEqual(refresh(submission('NVDA'),'NVDA',CIKS['NVDA'],no_fetch,d),d)
  s=submission('NVDA');r=s['filings']['recent']
  for k in r:r[k].insert(0,r[k][0])
  r['accessionNumber'][0]='0001045810-26-009999';r['filingDate'][0]='2026-09-23';r['items'][0]='1.01,2.03,9.01'
  new=refresh(s,'NVDA',CIKS['NVDA'],no_fetch,d);self.assertEqual(new['observations'],d['observations']);self.assertTrue(any(x['accessionNumber'].endswith('009999') for x in new['pendingReview']))
 def test_changed_source_does_not_rewrite_history(self):
  d=load('NVDA');before=copy.deepcopy(d)
  with self.assertRaises(ValueError):refresh(submission('NVDA'),'NVDA',CIKS['NVDA'],lambda u:fetch(u)+'\n',d,reverify=True)
  self.assertEqual(d,before)
 def test_provenance_and_numeric_fact_integrity(self):
  d=load('SOFI');self.assertTrue(all(len(x['sha256'])==64 for x in d['documents'].values()));o=d['observations'][0];o['items']=['9.01']
  with self.assertRaises(ValueError):validate(d,'SOFI',CIKS['SOFI'])
 def test_source_failure_preserves_existing_entire_feed(self):
  with tempfile.TemporaryDirectory() as directory:
   p=Path(directory)/'NVDA.json';p.write_bytes((ROOT/'data/stocks/evidence/NVDA.json').read_bytes());before=p.read_bytes();client=Mock();client.get_submissions.return_value=submission('NVDA');client.get_filing_html.side_effect=OSError('material source outage')
   with patch('company_evidence.refresh',return_value=json.loads(before)),self.assertRaisesRegex(OSError,'material source outage'):update_evidence('NVDA',client,output_dir=directory,material_events=True,reverify_material_events=True)
   self.assertEqual(p.read_bytes(),before);self.assertEqual(json.loads((Path(directory)/'NVDA.status.json').read_text())['status'],'unavailable')
 def test_offline_pipeline(self):
  with tempfile.TemporaryDirectory() as directory:
   d=update_evidence('CRWD',None,offline=True,output_dir=directory,material_events=True);self.assertEqual(d['status'],'offline_fixture');self.assertEqual(len(d['materialEvents']['observations']),3)
if __name__=='__main__':unittest.main()
