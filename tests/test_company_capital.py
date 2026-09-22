"""Offline SEC structures, exact facts, revisions and fail-closed publication."""
import copy,json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from inline_evidence import numeric_facts,select_fact
from reviewed_company_evidence import build,validate,REVIEWS,digest
from test_reviewed_company_evidence import feed,fetch

def rows(t,metric):return [o for o in feed(t)['reviewedEvidence']['observations'] if o['kind']=='capital' and o['metricId']==metric]
def last(t,metric):return sorted(rows(t,metric),key=lambda o:(o['period']['end'],o['publicationDate']))[-1]

class CapitalEvidenceTests(unittest.TestCase):
 def test_all_real_fixtures_reproduce_published_observations(self):
  for t in ('NVDA','SOFI','CRWD'):
   f=feed(t);result=build(f,fetch);self.assertEqual(result['observations'],f['reviewedEvidence']['observations']);self.assertGreater(len([o for o in result['observations'] if o['kind']=='capital']),50)
 def test_outstanding_is_not_weighted_average(self):
  self.assertEqual(last('NVDA','shares_outstanding')['value']['point'],24147000000)
  self.assertEqual(last('NVDA','weighted_diluted')['value']['point'],24285000000)
  self.assertEqual(last('SOFI','shares_outstanding')['unit'],'count');self.assertEqual(last('SOFI','weighted_basic')['period']['type'],'quarter')
 def test_cash_paid_is_not_authorization(self):
  self.assertEqual(last('NVDA','repurchase_cash')['value']['point'],39044000000)
  self.assertEqual(last('NVDA','repurchase_remaining')['value']['point'],99300000000)
  self.assertEqual(last('CRWD','repurchase_cash')['value']['point'],175622000)
  self.assertEqual(last('CRWD','repurchase_cash')['period']['type'],'year_to_date')
 def test_missing_buybacks_not_synthetic_zero(self):self.assertEqual(rows('SOFI','repurchase_cash'),[])
 def test_sbc_and_issuance_different_units_and_scopes(self):
  self.assertEqual(last('CRWD','sbc_expense')['value']['point'],376914000)
  self.assertEqual(last('CRWD','issuance_rsu')['value']['point'],4276000)
  self.assertEqual(last('SOFI','issuance_common')['value']['point'],3209206)
  self.assertNotEqual(last('CRWD','sbc_expense')['unit'],last('CRWD','issuance_rsu')['unit'])
 def test_crwd_split_original_and_issuer_comparatives(self):
  july=[o for o in rows('CRWD','shares_outstanding') if o['period']['end']=='2025-07-31']
  self.assertEqual([o['value']['point'] for o in july],[250827000,1003308000])
  self.assertNotEqual(july[0]['capital']['shareBasis'],july[1]['capital']['shareBasis']);self.assertIn('retroactively adjusted',' '.join(july[1]['source']['contexts']))
 def test_real_sbc_timing_revision_preserved(self):
  july=[o for o in rows('CRWD','sbc_expense') if o['period']['end']=='2025-07-31'];self.assertEqual([o['value']['point'] for o in july],[287153000,279631000]);self.assertEqual(july[-1]['capital']['recast'],'issuer_revision');self.assertNotEqual(july[0]['definitionVersion'],july[1]['definitionVersion'])
 def test_bank_scope_and_no_industrial_total_debt(self):
  self.assertEqual(rows('SOFI','debt_total'),[]);self.assertEqual(last('SOFI','deposits')['value']['point'],45543160000)
  self.assertEqual(last('SOFI','cet1_bank')['capital']['scope'],'sofi-bank');self.assertEqual(last('SOFI','cet1_bank')['value']['point'],15.2)
 def test_debt_balance_not_issuance_cashflow(self):
  self.assertEqual(last('NVDA','debt_total')['value']['point'],33366000000)
  self.assertEqual(last('NVDA','debt_current')['value']['point']+last('NVDA','debt_noncurrent')['value']['point'],33366000000)
  self.assertEqual(last('CRWD','debt_noncurrent')['value']['point'],746216000)
 def test_facilities_distinguished_from_cash(self):
  self.assertEqual(last('NVDA','facility_capacity')['capital']['scope'],'commercial-paper')
  self.assertEqual(last('SOFI','facility_capacity')['value']['point'],645000000)
  self.assertIn('October 2026',last('SOFI','funding_context')['source']['quote'])
  self.assertIn('11.4 million',' '.join(last('SOFI','funding_context')['source']['contexts']))
  self.assertIn('expired in January 2026',' '.join(last('CRWD','funding_context')['source']['contexts']))
 def test_structured_provenance_exact_dimensions_period_unit(self):
  o=last('NVDA','shares_outstanding');f=o['source']['xbrl'];self.assertEqual(f['unit'],'shares');self.assertEqual(f['end'],o['period']['end']);self.assertIsNone(f['start']);self.assertEqual(f['cik'],o['cik']);self.assertEqual(f['dimensions'],{'us-gaap:StatementEquityComponentsAxis':'us-gaap:CommonStockMember'});self.assertEqual(digest(json.dumps(f,sort_keys=True)),o['source']['xbrlSha256'])
 def test_fact_or_scope_tampering_rejected(self):
  for field in ('value','capital','provenance'):
   f=feed('NVDA');o=next(o for o in f['reviewedEvidence']['observations'] if o['kind']=='capital')
   if field=='value':o['value']['point']+=1
   elif field=='capital':o['capital']['shareBasis']='changed'
   else:o['source']['xbrl']['dimensions']={'wrong':'dimension'}
   with self.assertRaises(ValueError):validate(f['reviewedEvidence'],'NVDA',f['cik'])
 def test_source_missing_structured_facts_fails_closed(self):
  f=feed('NVDA')
  with self.assertRaises(ValueError):build(f,lambda url:fetch(url).replace('ix:nonFraction','span'))
 def test_duplicate_numeric_rendering_deduped_conflict_rejected(self):
  o=last('NVDA','cash');f={**o['source']['xbrl'],'contextRef':'a'};self.assertEqual(select_fact([f,f],f,o['cik']),o['source']['xbrl'])
  with self.assertRaises(ValueError):select_fact([f,{**f,'value':1}],f,o['cik'])
 def test_dimension_period_issuer_never_guessed(self):
  o=last('NVDA','shares_outstanding');f={**o['source']['xbrl'],'contextRef':'a'}
  for change in ({'dimensions':{}},{'start':'2026-01-26'},{'unit':'USD'},{'cik':'0000000001'}):
   with self.assertRaises(ValueError):select_fact([{**f,**change}],f,o['cik'])

class InlineParserTests(unittest.TestCase):
 def source(self,value='1,234',attrs='scale="3" format="ixt:num-dot-decimal"'):
  return '<html><xbrli:context id="c"><xbrli:entity><xbrli:identifier scheme="http://www.sec.gov/CIK">1045810</xbrli:identifier></xbrli:entity><xbrli:period><xbrli:instant>2026-07-26</xbrli:instant></xbrli:period></xbrli:context><xbrli:unit id="u"><xbrli:measure>iso4217:USD</xbrli:measure></xbrli:unit><ix:nonFraction name="us-gaap:CashAndCashEquivalentsAtCarryingValue" contextRef="c" unitRef="u" '+attrs+'>'+value+'</ix:nonFraction></html>'
 def test_scale_sign_and_inline_exclusions(self):
  self.assertEqual(numeric_facts(self.source('1,<ix:exclude>ignore</ix:exclude>234'))[0]['value'],1234000)
  self.assertEqual(numeric_facts(self.source('123', 'scale="3" sign="-"'))[0]['value'],-123000)
 def test_nil_unsupported_transform_and_scale_fail_closed(self):
  for attrs in ['xsi:nil="true"','format="ixt:num-comma-decimal"','scale="100"','continuedAt="elsewhere"']:
   self.assertEqual(numeric_facts(self.source(attrs=attrs)),[])
 def test_dash_is_reported_zero_not_missing(self):self.assertEqual(numeric_facts(self.source('—'))[0]['value'],0)
 def test_conflicting_context_identity_rejected(self):
  s=self.source();context=s[s.index('<xbrli:context'):s.index('</xbrli:context>')+16]
  with self.assertRaises(ValueError):numeric_facts(s.replace('</html>',context.replace('2026-07-26','2025-07-26')+'</html>'))
 def test_typed_dimension_not_silently_dropped(self):
  s=self.source().replace('</xbrli:entity>','<xbrldi:typedMember dimension="x"><x>1</x></xbrldi:typedMember></xbrli:entity>');self.assertEqual(numeric_facts(s),[])

if __name__=='__main__':unittest.main()
