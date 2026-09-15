"""B78 frozen SEC-source regression and publication gates; no network in tests."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from stock_normalizer import StockNormalizer, COMPANY_PROFILES
from stock_contract import IDENTITIES,validate
from update_stocks import update_stock
NEW=['MU','MRVL','VRT','COHR','RKLB']
def fixture(t,kind):return json.loads((ROOT/f'tests/fixtures/sec_{t.lower()}_{kind}.json').read_text())
class ExpansionTests(unittest.TestCase):
 def test_all_fifteen_identity_and_filing_decisions(self):
  rows=json.loads((ROOT/'docs/research-coverage-audit.json').read_text())['companies']
  self.assertEqual({r['requestedTicker'] for r in rows},set('AVEX BULL FLY RKLB CRWV NBIS TEM TTMI SNDK GLXY COHR VRT ASML MRVL MU'.split()))
  self.assertEqual({r['verifiedTicker'] for r in rows if r['implemented']},set(NEW))
  for r in rows:
   self.assertEqual(r['requestedTicker'],r['verifiedTicker']);self.assertRegex(r['cik'],r'^\d{10}$')
   if r['issuerType']=='foreign_private_issuer':self.assertIn('20-F',r['forms']);self.assertFalse(r['implemented'])
   if r['implemented']:self.assertIn('10-K',r['forms']);self.assertEqual(IDENTITIES[r['verifiedTicker']],r['cik']);self.assertIn(r['classification'],['A','B'])
 def test_five_fixtures_periods_ttm_provenance_finite_and_published_values(self):
  for t in NEW:
   with self.subTest(t=t):
    d=StockNormalizer(t).normalize(fixture(t,'submissions'),fixture(t,'companyfacts'));self.assertTrue(validate(d,t));json.dumps(d,allow_nan=False)
    self.assertEqual(len(d['annual']),3);self.assertEqual(len(d['quarterly']),10)
    self.assertEqual(len(d['ttm']['quarters']),4)
    actual=json.loads((ROOT/f'data/stocks/{t}.json').read_text())
    self.assertEqual(d['ttm'],actual['ttm'])
    self.assertIsNone(d['valuationBase']['ttmDilutedEps']['value'])
    self.assertIsNone(d['quarterly'][-1]['metrics']['debt']['value'])
    for m in d['ttm']['metrics'].values():self.assertIn(m['qualityStatus'],['available','unavailable']);self.assertIn('definition',m)
    self.assertIsNone(d['ttm']['metrics']['dilutedShares']['shareBasis'])
    self.assertEqual(d['quarterly'][-1]['metrics']['revenue']['concept'],'RevenueFromContractWithCustomerExcludingAssessedTax')
    broken=copy.deepcopy(d['quarterly']);broken[-2]['periodEnd']='2020-01-01';self.assertIsNone(StockNormalizer(t).compute_ttm(broken))
 def test_missing_metrics_do_not_become_zero_or_fabricated(self):
  for t in NEW:
   f=fixture(t,'companyfacts');del f['facts']['us-gaap']['PaymentsToAcquirePropertyPlantAndEquipment']
   d=StockNormalizer(t).normalize(fixture(t,'submissions'),f)
   self.assertIsNone(d['ttm']['metrics']['freeCashFlow']['value'])
 def test_mrvl_exact_filing_labels_and_conflicts_fail_closed(self):
  s=fixture('MRVL','submissions');f=fixture('MRVL','companyfacts');d=StockNormalizer('MRVL').normalize(s,f)
  self.assertEqual(d['ttm']['asOfPeriod'],'2027Q2');self.assertEqual(d['quarterly'][-1]['periodEnd'],'2026-08-01')
  ff=f['facts']['us-gaap']['RevenueFromContractWithCustomerExcludingAssessedTax']['units']['USD'];x=next(x for x in ff if x.get('end')=='2026-08-01');bad=copy.deepcopy(x);bad['fy']=1900;ff.append(bad)
  with self.assertRaisesRegex(ValueError,'conflicting'):StockNormalizer('MRVL').normalize(s,f)
 def test_failed_refresh_preserves_known_good_for_each_company(self):
  for t in NEW:
   with tempfile.TemporaryDirectory() as tmp:
    p=Path(tmp)/f'{t}.json';original=(ROOT/f'data/stocks/{t}.json').read_bytes();p.write_bytes(original)
    c=Mock();c.resolve_cik.return_value=IDENTITIES[t];c.get_submissions.return_value=fixture(t,'submissions');c.get_company_facts.return_value={'cik':1,'facts':{}}
    with self.assertRaises(ValueError):update_stock(t,client=c,output_dir=tmp)
    self.assertEqual(p.read_bytes(),original)
    degraded=fixture(t,'companyfacts');del degraded['facts']['us-gaap']['PaymentsToAcquirePropertyPlantAndEquipment']
    c.get_company_facts.return_value=degraded
    with self.assertRaisesRegex(ValueError,'Degraded TTM availability'):update_stock(t,client=c,output_dir=tmp)
    self.assertEqual(p.read_bytes(),original)
 def test_existing_profiles_byte_equivalent_and_new_universe_bounded(self):
  expected={'NVDA':'2f337a051ccc73a379c4aabaf06bfd8df34dd3533a05aa33ab5fb41fb49f47b0','SOFI':'ea293980c7a7ce380e56450060b7966fd6d5caca80c4b203c3f129134ddaebf8','CRWD':'47bf358b0e9801c2053db274970ff96c3ad6a6cdaba90c276370e96b77d3cd44'}
  for t,h in expected.items():self.assertEqual(hashlib.sha256(json.dumps(COMPANY_PROFILES[t],sort_keys=True).encode()).hexdigest(),h)
  self.assertEqual(set(IDENTITIES),set(expected)|set(NEW)|set("TTMI SNDK FLY CRWV".split()));self.assertEqual(set(COMPANY_PROFILES),set(IDENTITIES))
if __name__=='__main__':unittest.main()
