import copy,json,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import Mock
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from reviewed_company_evidence import build,validate,visible,extract,REVIEWS
from update_stocks import update_evidence

FIX=ROOT/'tests/fixtures/company_observations'
def feed(t):return json.loads((ROOT/'data/stocks/evidence'/f'{t}.json').read_text(encoding='utf-8'))
def fetch(url):
 a=url.split('/')[-2];a=a[:10]+'-'+a[10:12]+'-'+a[12:]
 return (FIX/(a+'.html')).read_text(encoding='utf-8')
class ReviewedEvidenceTests(unittest.TestCase):
 def test_real_offline_values_equal_published_all_issuers(self):
  for t in ('NVDA','SOFI','CRWD'):
   d=feed(t);actual=build(d,fetch);self.assertEqual(actual['observations'],d['reviewedEvidence']['observations']);validate(actual,t,d['cik'])
 def test_range_point_qualitative_and_period_provenance(self):
  nv=build(feed('NVDA'),fetch)['observations'];revenue=next(o for o in nv if o['id'].endswith('000073:revenue'))
  self.assertEqual(revenue['value']['lower'],105840000000);self.assertIsNone(revenue['period']['end'])
  self.assertTrue(any(o['value']['kind']=='qualitative' for o in nv))
  so=build(feed('SOFI'),fetch)['observations'];self.assertEqual(next(o for o in so if o['id'].endswith('000008:eps'))['value']['point'],.6)
 def test_duplicates_rejected(self):
  d=feed('SOFI');r=d['reviewedEvidence'];r['observations'].append(r['observations'][0])
  with self.assertRaises(ValueError):validate(r,'SOFI',d['cik'])
 def test_missing_changed_or_duplicated_passage_fails_closed(self):
  r=json.loads(REVIEWS.read_text(encoding='utf-8'))['documents'][0]['observations'][0]
  for text in ('missing',r['quote']+r['quote'],r['quote'].replace('108.0','109.0')):
   with self.assertRaises(ValueError):extract(r,text)
 def test_malformed_document(self):
  for text in ('', '{}','Access denied',None):
   with self.assertRaises(ValueError):visible(text)
 def test_source_identity_and_hash(self):
  for change in ('url','hash','issuer','value','period'):
   d=feed('CRWD');r=d['reviewedEvidence'];o=r['observations'][0]
   if change=='url':o['source']['url']='https://evil.test/x.htm'
   if change=='hash':o['source']['quote']+='edited'
   if change=='issuer':o['ticker']='SOFI'
   if change=='value':o['value']['point']=123
   if change=='period':o['period']['label']='wrong period'
   with self.assertRaises(ValueError):validate(r,'CRWD',d['cik'])
 def test_source_relationship_mismatch(self):
  d=feed('NVDA');next(e for e in d['events'] if e['documents'])['documents']=[]
  with self.assertRaises(ValueError):build(d,fetch)
 def test_unknown_release_waits_for_review(self):
  d=feed('NVDA');e=copy.deepcopy(next(e for e in d['events'] if e['documents']));e.update(accessionNumber='0001045810-26-000999',filingDate='2026-09-23');d['events'].insert(0,e)
  r=build(d,fetch);self.assertEqual(r['pendingReview'],[e['accessionNumber']]);self.assertEqual(len([o for o in r['observations'] if o['kind'] in ('guidance','kpi')]),14)
 def test_rolling_recent_window_keeps_reviewed_archive(self):
  d=feed('SOFI');d['events']=[];self.assertEqual(len([o for o in build(d,fetch)['observations'] if o['kind'] in ('guidance','kpi')]),21)
 def test_outage_preserves_last_verified_observations_bytes(self):
  with tempfile.TemporaryDirectory() as directory:
   d=feed('NVDA');path=Path(directory)/'NVDA.json';path.write_text(json.dumps(d),encoding='utf-8');before=path.read_bytes()
   client=Mock();client.get_submissions.return_value=json.loads((ROOT/'tests/fixtures/company_evidence/NVDA.json').read_text());client.get_filing_html.side_effect=OSError('source outage')
   with self.assertRaises(OSError):update_evidence('NVDA',client,output_dir=directory,reviewed=True)
   self.assertEqual(path.read_bytes(),before);self.assertEqual(json.loads((Path(directory)/'NVDA.status.json').read_text())['status'],'unavailable')
 def test_offline_pipeline_never_published_as_live(self):
  with tempfile.TemporaryDirectory() as directory:
   d=update_evidence('NVDA',None,offline=True,output_dir=directory,reviewed=True)
   self.assertEqual(d['status'],'offline_fixture');self.assertEqual(len([o for o in d['reviewedEvidence']['observations'] if o['kind'] in ('guidance','kpi')]),14)
 def test_missing_metric_is_not_invented(self):
  self.assertFalse(any(o['kind']=='kpi' for o in feed('NVDA')['reviewedEvidence']['observations']))
  self.assertFalse(any(o['metricId']=='diluted_eps' and o['publicationDate']=='2025-12-02' for o in feed('CRWD')['reviewedEvidence']['observations']))
 def test_definition_and_split_evidence_present(self):
  so=feed('SOFI')['reviewedEvidence']['observations'];products=[o for o in so if o['metricId']=='products'];self.assertEqual(len({o['definitionVersion'] for o in products}),4)
  self.assertIn('not recast',' '.join(products[-1]['source']['contexts']))
  cr=feed('CRWD')['reviewedEvidence']['observations'];eps=[o for o in cr if o['metricId']=='diluted_eps'];self.assertIn('four-for-one',' '.join(eps[-1]['source']['contexts']))
if __name__=='__main__':unittest.main()
