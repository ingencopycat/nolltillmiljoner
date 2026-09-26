"""Real MU/VRT packages and fail-closed source/activation boundaries, offline."""
import copy
import json
import shutil
import subprocess
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch, Mock
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import issuer_onboarding as onboarding
import financial_sources as financial
import evidence_sources as sources
import reviewed_company_evidence as reviewed
import test_sec_daily as daily_fixture


class OnboardingTests(unittest.TestCase):
    def test_both_packages_reproduce_and_keep_partial_coverage_explicit(self):
        for t in ('MU','VRT'):
            actual=onboarding.compose(ROOT,t)
            saved=onboarding.read(ROOT/f'data/stocks/evidence/{t}.json')
            self.assertEqual(actual,saved)
            self.assertFalse(actual['coverageDecision']['fullResearch'])
            self.assertEqual(len(actual['ownershipEvidence']['filings']),2)
            self.assertTrue(actual['materialEvents']['observations'])
            self.assertTrue(actual['materialEvents']['pendingReview'])
            observations=actual['reviewedEvidence']['observations']
            self.assertIn('shares_outstanding',{o['metricId'] for o in observations})
            self.assertIn('weighted_diluted',{o['metricId'] for o in observations})
            self.assertNotIn('debt_total',{o['metricId'] for o in observations})

    def test_absolute_guidance_and_missing_category_fail_closed(self):
        data=onboarding.read(ROOT/'data/stocks/evidence/MU.json')['reviewedEvidence']
        guidance=next(o for o in data['observations'] if o['kind']=='guidance' and o['period']['label']=='Q4 FY2026')
        self.assertEqual((guidance['value']['lower'],guidance['value']['upper']),(49e9,51e9))
        broken=copy.deepcopy(data)
        broken['observations']=[o for o in broken['observations'] if o['metricId']!='revenue-all-other']
        with self.assertRaisesRegex(ValueError,'Missing or duplicate'):reviewed.validate_business_groups(broken['observations'])
        broken=copy.deepcopy(data)
        next(o for o in broken['observations'] if o['kind']=='business_mix')['value']['point']+=100
        with self.assertRaisesRegex(ValueError,'reconcile'):reviewed.validate_business_groups(broken['observations'])

    def test_capture_identity_failure_cannot_write_financial_inputs(self):
        stock=onboarding.read(ROOT/'data/stocks/MU.json')
        sub=onboarding.read(ROOT/'tests/fixtures/sec_mu_submissions.json')
        facts=onboarding.read(ROOT/'tests/fixtures/sec_mu_companyfacts.json');facts['cik']=1
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(ValueError,'identity'):financial.preserve(folder,'MU',stock,sub,facts)
            self.assertEqual(list(Path(folder).iterdir()),[])

    def test_activation_validates_before_write_and_rolls_back(self):
        with tempfile.TemporaryDirectory() as folder:
            candidate=Path(folder)/'candidate';destination=Path(folder)/'destination'
            candidate.mkdir();destination.mkdir()
            for name in ('a','b'):(candidate/name).write_bytes(b'new');(destination/name).write_bytes(b'old')
            with patch.object(onboarding.subprocess,'run',side_effect=ValueError('source gate')):
                with self.assertRaises(ValueError):onboarding.activate(candidate,destination,['a','b'])
            self.assertEqual((destination/'a').read_bytes(),b'old')
            write=Path.write_bytes
            def fail(path,raw):
                if path==destination/'b' and raw==b'new':raise OSError('disk')
                return write(path,raw)
            with patch.object(onboarding.subprocess,'run'),patch.object(Path,'write_bytes',fail):
                with self.assertRaises(OSError):onboarding.activate(candidate,destination,['a','b'])
            self.assertEqual([(destination/n).read_bytes() for n in ('a','b')],[b'old',b'old'])

    def test_first_daily_run_rerun_and_failure_retain_packages(self):
        fixture=daily_fixture.DailyTests();fixture.setUp();self.addCleanup(fixture.doCleanups)
        before=fixture.bytes()
        for _ in range(2):
            result=fixture.run_daily(('MU','VRT'))
            self.assertEqual(result['rejectedFailed'],0)
            self.assertFalse(result['productionDataChanged'])
            self.assertEqual(before,fixture.bytes())
        fixture.client.get_submissions.side_effect=OSError('unavailable')
        result=fixture.run_daily(('MU','VRT'))
        self.assertEqual(result['rejectedFailed'],2)
        self.assertEqual(before,fixture.bytes())

    def test_financial_source_omission_blocks_combined_candidate(self):
        fixture=daily_fixture.DailyTests();fixture.setUp();self.addCleanup(fixture.doCleanups)
        path=fixture.fixtures/'sec_mu_companyfacts.json'
        path.write_text('{}',encoding='utf-8')
        before=fixture.bytes();state=fixture.state.read_bytes()
        result=fixture.run_daily(('MU',))
        self.assertTrue(result.get('publicationBlocked'))
        self.assertEqual(before,fixture.bytes());self.assertEqual(state,fixture.state.read_bytes())

    def test_accepted_period_sources_survive_transfer_and_exact_index(self):
        f=daily_fixture.DailyTests();f.setUp();self.addCleanup(f.doCleanups)
        daily=daily_fixture.daily
        stock=onboarding.read(f.stocks/'NVDA.json');latest=stock['quarterly'][-1];accession=latest['accession']
        # Present the historical subset before this captured period arrives. The
        # real normalizer, admission guard and candidate closure remain enabled.
        stock['quarterly']=stock['quarterly'][:-1]
        (f.stocks/'NVDA.json').write_text(json.dumps(stock),encoding='utf-8')
        feed=onboarding.read(f.stocks/'evidence/NVDA.json')
        feed['events']=[e for e in feed['events'] if e['accessionNumber']!=accession]
        from company_evidence import latest_report
        feed['latestReportAccession']=latest_report(feed['events'])['accessionNumber']
        (f.stocks/'evidence/NVDA.json').write_text(json.dumps(feed),encoding='utf-8')
        state=onboarding.read(f.state)
        index=daily.discovery(f.subs[daily.IDENTITIES['NVDA']],'NVDA')
        state['issuers']['NVDA']['seen']={a:daily.fingerprint(m) for a,m in index.items() if a!=accession}
        f.state.write_text(json.dumps(state),encoding='utf-8')
        facts=onboarding.read(ROOT/'tests/fixtures/sec_nvda_companyfacts.json')
        f.client.get_company_facts.return_value=facts
        old_source=(f.fixtures/'sec_nvda_companyfacts.json').read_bytes()
        with patch.object(daily,'START','2026-01-01'):
            result=f.run_daily()
        self.assertEqual(result['rejectedFailed'],0)
        self.assertGreater(result['acceptedObservationsEvents'],1)
        self.assertEqual(onboarding.read(f.stocks/'NVDA.json')['quarterly'][-1],latest)
        f.client.get_company_facts.assert_called_once()
        repo=f.root/'index-check'
        shutil.copytree(f.stocks,repo/'data/stocks')
        shutil.copytree(f.fixtures,repo/'tests/fixtures')
        shutil.copytree(ROOT/'scripts/source_reviews',repo/'scripts/source_reviews')
        shutil.copyfile(ROOT/'data/issuer-registry.json',repo/'data/issuer-registry.json')
        def git(*args):subprocess.run(['git','-c','core.autocrlf=false',*args],cwd=repo,check=True,capture_output=True)
        git('init','-q');git('add','.')
        sources.validate_git_index(repo)
        path=repo/'tests/fixtures/sec_nvda_companyfacts.json'
        updated=path.read_bytes();path.write_bytes(old_source);git('add','tests/fixtures/sec_nvda_companyfacts.json')
        # Working-tree repair cannot hide a missing updated input in the index.
        path.write_bytes(updated)
        with self.assertRaisesRegex(ValueError,'financial source'):sources.validate_git_index(repo)


if __name__=='__main__':unittest.main()
