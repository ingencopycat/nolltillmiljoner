"""Completion review boundaries, immutable evidence and steady-state admissions."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import company_material_events as events
import financial_sources
import test_sec_daily as fixture

def read(path):return json.loads(Path(path).read_text(encoding='utf-8'))
def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()

class CompletionTests(unittest.TestCase):
 def test_previously_accepted_evidence_and_other_issuers_unchanged(self):
  receipt=read(ROOT/'scripts/source_reviews/completion_baseline.json')
  for path,expected in receipt['unchangedFiles'].items():self.assertEqual(digest(read(ROOT/path)),expected,path)
  for t,baseline in receipt['issuers'].items():
   feed=read(ROOT/f'data/stocks/evidence/{t}.json')
   for section,key in [('reviewedEvidence','observations'),('materialEvents','observations'),('ownershipEvidence','filings')]:
    actual={x.get('id',x.get('accessionNumber')):digest(x) for x in feed[section][key]}
    for identity,expected in baseline[section].items():self.assertEqual(actual[identity],expected,identity)
   self.assertEqual(digest(feed['events']),baseline['reportingHash'])
   self.assertEqual(digest(feed['insiderEvidence']),baseline['insidersHash'])
   accessions={identity.split(':')[1] for identity in baseline['reviewedEvidence']}
   self.assertEqual(digest([s for s in feed['reviewedEvidence']['sources'] if s['accessionNumber'] in accessions]),baseline['sourcesHash'])
  for t,correction in receipt['financialCorrection'].items():
   stock=read(ROOT/f'data/stocks/{t}.json')
   for row in stock['annual']+stock['quarterly']+[stock['ttm']]:row['metrics'].pop('netIncomeToCommon',None)
   stock['ttm']['metrics'].pop('dilutedEps',None)
   for key in ['ttmNetIncomeToCommon','ttmDilutedEps']:stock['valuationBase'].pop(key,None)
   stock['metadata'].pop('profileDescription',None)
   self.assertEqual(digest(stock),correction['unaffected'])

 def test_each_pending_candidate_has_a_sourced_disposition(self):
  for t,count,pending in [('MU',13,7),('VRT',28,4)]:
   feed=read(ROOT/f'data/stocks/evidence/{t}.json');data=feed['materialEvents']
   documents=[d for d in data['documents'].values() if d['reviewDate']=='2026-09-27']
   self.assertEqual(len(documents),count);self.assertEqual(len(data['pendingReview']),pending)
   accepted={o['accessionNumber'] for o in data['observations']}
   for d in documents:
    a=d['accessionNumber']
    self.assertTrue(a in accepted or a in data['reviewDecisions'])
   broken=copy.deepcopy(data);a=next(iter(accepted))
   broken['reviewDecisions'][a]={'state':'rejected','reason':'conflict'}
   with self.assertRaisesRegex(ValueError,'Conflicting'):events.validate(broken,t,feed['cik'])
   broken=copy.deepcopy(data);a=next(iter(broken['reviewDecisions']));del broken['documents'][a]
   with self.assertRaisesRegex(ValueError,'sourced'):events.validate(broken,t,feed['cik'])

 def test_automatic_eps_requires_retained_reviewed_notes(self):
  financial_sources.validate_repository(ROOT)
  original=Path.read_text
  def missing(path,*args,**kwargs):
   if path.name=='valuation_basis.json':return '{"schema":"ntm-valuation-basis-review/1","issuers":{}}'
   return original(path,*args,**kwargs)
  with patch.object(Path,'read_text',missing):
   with self.assertRaisesRegex(ValueError,'EPS numerator review'):financial_sources.validate_repository(ROOT)
  def corrupt(path,*args,**kwargs):
   value=original(path,*args,**kwargs)
   return value+'changed' if path.name=='0000723125-25-000028.html' else value
  with patch.object(Path,'read_text',corrupt):
   with self.assertRaisesRegex(ValueError,'EPS note source'):financial_sources.validate_repository(ROOT)

 def test_mu_vrt_supported_and_review_required_daily_candidates(self):
  for t in ['MU','VRT']:
   f=fixture.DailyTests();f.setUp();self.addCleanup(f.doCleanups)
   daily=fixture.daily;cik=daily.IDENTITIES[t];acc=cik+'-26-999999'
   f.subs[cik]=fixture.add(f.subs[cik],acc=acc,items='5.07,9.01')
   before=read(f.state)['issuers'][t]
   result=f.run_daily((t,));self.assertEqual(result['rejectedFailed'],0)
   self.assertEqual(result['acceptedObservationsEvents'],1)
   state=read(f.state)['issuers'][t]
   for a,h in before['seen'].items():self.assertEqual(state['seen'][a],h)
   self.assertGreaterEqual(state['through'],before['through'])
   after=f.bytes();again=f.run_daily((t,))
   self.assertEqual(again['newFilings'],0);self.assertEqual(after,f.bytes())
   unknown=cik+'-26-999998';f.subs[cik]=fixture.add(f.subs[cik],acc=unknown,items='1.05')
   result=f.run_daily((t,));self.assertEqual(result['rejectedFailed'],0)
   self.assertIn(unknown,read(f.state)['issuers'][t]['review'])
   self.assertEqual(after,f.bytes())

 def test_mu_vrt_new_financial_period_preserves_inputs_and_reruns(self):
  from company_evidence import latest_report
  for t in ['MU','VRT']:
   f=fixture.DailyTests();f.setUp();self.addCleanup(f.doCleanups);daily=fixture.daily
   stock=read(f.stocks/(t+'.json'));latest=stock['quarterly'].pop();accession=latest['accession']
   (f.stocks/(t+'.json')).write_text(json.dumps(stock),encoding='utf-8')
   path=f.stocks/f'evidence/{t}.json';feed=read(path)
   feed['events']=[e for e in feed['events'] if e['accessionNumber']!=accession]
   feed['latestReportAccession']=latest_report(feed['events'])['accessionNumber']
   path.write_text(json.dumps(feed),encoding='utf-8')
   state=read(f.state)
   index=daily.discovery(f.subs[daily.IDENTITIES[t]],t)
   state['issuers'][t]['seen']={a:daily.fingerprint(m) for a,m in index.items() if a!=accession}
   f.state.write_text(json.dumps(state),encoding='utf-8')
   f.client.get_company_facts.return_value=read(ROOT/f'tests/fixtures/sec_{t.lower()}_companyfacts.json')
   with patch.object(daily,'START','2026-01-01'):result=f.run_daily((t,))
   self.assertEqual(result['rejectedFailed'],0,result)
   self.assertEqual(read(f.stocks/(t+'.json'))['quarterly'][-1],latest)
   manifest=read(f.fixtures/'financial_sources.json')['sources']
   for name in financial_sources.names(t):
    raw=(f.fixtures/name).read_text(encoding='utf-8').encode()
    self.assertEqual(hashlib.sha256(raw).hexdigest(),manifest[name]['sha256'])
   financial_sources.reproduce(t,read(f.stocks/(t+'.json')),*[read(f.fixtures/n) for n in financial_sources.names(t)])
   before=f.bytes();again=f.run_daily((t,));self.assertEqual(again['newFilings'],0);self.assertEqual(before,f.bytes())

if __name__=='__main__':unittest.main()
