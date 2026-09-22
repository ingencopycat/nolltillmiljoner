"""Actual primary-source business structures and publication boundaries."""
import copy,json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from reviewed_company_evidence import build,validate,validate_business_groups,REVIEWS
from sec_client import SECClient,SECClientError
from test_reviewed_company_evidence import feed,fetch

class BusinessMixTests(unittest.TestCase):
 def test_offline_actual_structures_and_provenance(self):
  for t,count in [('NVDA',60),('SOFI',40),('CRWD',24)]:
   d=feed(t);r=build(d,fetch);rows=[o for o in r['observations'] if o['kind']=='business_mix'];self.assertEqual(len(rows),count)
   self.assertEqual(rows,[o for o in d['reviewedEvidence']['observations'] if o['kind']=='business_mix'])
   self.assertTrue(all(o['source']['url'].startswith('https://www.sec.gov/Archives/') for o in rows))
 def test_issuer_classification_and_parent_relationship(self):
  n=feed('NVDA')['reviewedEvidence']['observations'];types={o['group']['type'] for o in n if o['kind']=='business_mix'};self.assertEqual(types,{'reportable_segment','market_platform'})
  child=next(o for o in n if o.get('group',{}).get('id')=='data-center-markets');self.assertEqual(child['group']['parent'],{'groupId':'market-platforms','categoryId':'data-center'})
  c=[o for o in feed('CRWD')['reviewedEvidence']['observations'] if o['kind']=='business_mix'];self.assertEqual({o['group']['type'] for o in c},{'revenue_category'})
  self.assertTrue(any('single operating and reportable segment' in ' '.join(o['source']['contexts']) for o in c))
 def test_original_and_recast_values_both_preserved(self):
  rows=[o for o in feed('NVDA')['reviewedEvidence']['observations'] if o.get('category',{}).get('id')=='hyperscale' and o['period']['end']=='2026-04-26'];self.assertEqual([o['value']['point'] for o in rows],[37869000000,43050000000]);self.assertEqual(rows[-1]['recast']['status'],'issuer_recast')
  self.assertNotEqual(rows[0]['group']['version'],rows[1]['group']['version'])
 def test_signed_corporate_reconciliation_not_a_segment(self):
  rows=[o for o in feed('SOFI')['reviewedEvidence']['observations'] if o['kind']=='business_mix' and o['period']['end']=='2026-06-30'];corp=next(o for o in rows if o['category']['id']=='corporate-other');self.assertEqual(corp['value']['point'],-56905000);self.assertEqual(corp['category']['role'],'reconciliation');validate_business_groups(rows)
 def test_missing_category_rejects_publication(self):
  d=feed('SOFI');r=d['reviewedEvidence'];r['observations']=[o for o in r['observations'] if not (o.get('category',{}).get('id')=='technology' and o['period']['end']=='2026-06-30')]
  with self.assertRaises(ValueError):validate(r,'SOFI',d['cik'])
 def test_duplicate_category_and_unreconciled_total(self):
  rows=[o for o in feed('SOFI')['reviewedEvidence']['observations'] if o['kind']=='business_mix' and o['period']['end']=='2026-06-30']
  with self.assertRaises(ValueError):validate_business_groups(rows+[rows[0]])
  rows=copy.deepcopy(rows);rows[0]['value']['point']+=10000
  with self.assertRaises(ValueError):validate_business_groups(rows)
 def test_periodic_relationship_is_checked(self):
  d=feed('NVDA');e=next(e for e in d['events'] if e['accessionNumber']=='0001045810-26-000075');e['primaryDocUrl']=e['primaryDocUrl'].replace('.htm','-wrong.htm')
  with self.assertRaises(ValueError):build(d,fetch)
 def test_new_document_limit_remains_bounded(self):
  c=SECClient()
  for limit in (0,-1,10000001,'10000000'):
   with self.assertRaises(SECClientError):c.get_filing_html('https://www.sec.gov/Archives/edgar/data/1/000000000000000001/x.htm',max_bytes=limit)
 def test_scope_tampering_is_rejected(self):
  d=feed('NVDA');r=d['reviewedEvidence'];o=next(o for o in r['observations'] if o['kind']=='business_mix');o['group']['type']='reportable_segment'
  with self.assertRaises(ValueError):validate(r,'NVDA',d['cik'])
  d=feed('NVDA');r=d['reviewedEvidence'];o=next(o for o in r['observations'] if o['kind']=='business_mix');o['source']['documentType']='earnings_release'
  with self.assertRaises(ValueError):validate(r,'NVDA',d['cik'])
if __name__=='__main__':unittest.main()
