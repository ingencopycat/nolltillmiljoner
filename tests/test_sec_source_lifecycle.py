"""Offline daily -> artifact transfer -> real Git index -> reproduction regression."""
import copy
import json
import re
import shlex
import shutil
import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch

import test_sec_daily as fixture
import evidence_sources as sources


class SourceLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.f = fixture.DailyTests()
        self.f.setUp()
        self.addCleanup(self.f.doCleanups)

    def add_form4(self, ticker='NVDA', accession='0001045810-26-999999'):
        f = self.f
        published = sources.read(f.stocks / 'evidence' / (ticker + '.json'))
        original = next(row for row in published['insiderEvidence']['filings'] if row['form'] == '4')
        xml = (f.fixtures / 'company_insiders' / (original['accessionNumber'] + '.xml')).read_text(encoding='utf-8')
        cik = fixture.daily.IDENTITIES[ticker]
        f.subs[cik] = fixture.add(f.subs[cik], form='4', acc=accession, doc='source.xml')
        return xml

    def source_bytes(self):
        return {p.relative_to(self.f.fixtures).as_posix(): p.read_bytes() for p in self.f.fixtures.rglob('*') if p.is_file()}

    def test_end_to_end_bot_transfer_and_index_cannot_omit_xml_or_index(self):
        f = self.f
        repo = f.root / 'bot'
        shutil.copytree(f.stocks, repo / 'data/stocks')
        shutil.copytree(f.fixtures, repo / 'tests/fixtures')
        shutil.copytree(fixture.ROOT / 'scripts/source_reviews', repo / 'scripts/source_reviews')
        shutil.copyfile(fixture.ROOT / 'data/weekly-events.js', repo / 'data/weekly-events.js')
        def git(*args):
            return subprocess.run(['git', '-c', 'core.autocrlf=false', *args], cwd=repo, check=True, capture_output=True)
        git('init', '-q'); git('add', '.')  # isolated index only; no commit, push or credentials
        original_index = (repo / 'tests/fixtures/company_insiders/NVDA.json').read_bytes()
        f.client.get_ownership_xml.return_value = self.add_form4()
        report = f.run_daily()
        self.assertEqual(report['issuers'][0]['outcome'], 'AUTO-ACCEPT')
        self.assertTrue(report['productionDataChanged'])
        workflow = (fixture.ROOT / '.github/workflows/deploy.yml').read_text(encoding='utf-8')
        block = re.search(r'name: validated-data\s+retention-days: 1\s+path: \|\n(.*?)\n\s+if-no-files-found:', workflow, re.S)[1]
        patterns = [line.strip() for line in block.splitlines()]
        candidate = f.root / 'transfer'
        shutil.copytree(f.stocks, candidate / 'data/stocks')
        shutil.copytree(f.fixtures, candidate / 'tests/fixtures')
        shutil.copytree(fixture.ROOT / 'scripts/source_reviews', candidate / 'scripts/source_reviews')
        shutil.copyfile(f.state, candidate / 'scripts/source_reviews/daily_state.json')
        shutil.copyfile(fixture.ROOT / 'data/weekly-events.js', candidate / 'data/weekly-events.js')
        for pattern in patterns:
            # Action's /** selects directory contents; model that exact transfer.
            selected = (candidate / pattern[:-3]).rglob('*') if pattern.endswith('/**') else candidate.glob(pattern)
            for p in selected:
                if p.is_file():
                    dest = repo / p.relative_to(candidate)
                    dest.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(p, dest)
        sources.validate_repository(repo)
        command = next(line.strip() for line in workflow.splitlines() if line.strip().startswith('git add '))
        git(*shlex.split(command)[1:])
        sources.validate_git_index(repo)
        xml_path = 'tests/fixtures/company_insiders/0001045810-26-999999.xml'
        self.assertIn(xml_path, git('ls-files').stdout.decode())
        git('rm', '--cached', xml_path)  # source still exists in working tree!
        sources.validate_repository(repo)
        with self.assertRaises(sources.SourceClosureError): sources.validate_git_index(repo)
        git('add', xml_path)
        index_path = repo / 'tests/fixtures/company_insiders/NVDA.json'
        good = index_path.read_bytes(); index_path.write_bytes(original_index)
        git('add', 'tests/fixtures/company_insiders/NVDA.json'); index_path.write_bytes(good)
        with self.assertRaises(sources.SourceClosureError): sources.validate_git_index(repo)
        git('add', 'tests/fixtures/company_insiders/NVDA.json')
        sources.validate_git_index(repo)
        before, artifacts = f.bytes(), self.source_bytes()
        f.client.get_ownership_xml.side_effect = AssertionError('Rerun must not refetch')
        self.assertFalse(f.run_daily()['productionDataChanged'])
        self.assertEqual(before, f.bytes()); self.assertEqual(artifacts, self.source_bytes())

    def test_multiple_filings_all_issuers_and_shared_manifest(self):
        f = self.f; documents = {}
        for t, acc in [('NVDA', '0001045810-26-999991'), ('NVDA', '0001045810-26-999992'), ('SOFI', '0001818874-26-999991'), ('CRWD', '0001535527-26-999991')]:
            documents[acc.replace('-', '')] = self.add_form4(t, acc)
        f.client.get_ownership_xml.side_effect = lambda url: documents[url.split('/')[-2]]
        result = f.run_daily(fixture.daily.PILOT)
        self.assertEqual(result['rejectedFailed'], 0)
        self.assertEqual([i['outcome'] for i in result['issuers']], ['AUTO-ACCEPT'] * 3)
        for t in fixture.daily.PILOT: sources.validate_feed(sources.read(f.stocks / 'evidence' / (t + '.json')), f.fixtures)
        self.assertEqual(len([p for p in (f.fixtures / 'company_insiders').glob('*99999*.xml')]), 4)

    def test_fetch_failure_and_persistence_failure_preserve_issuer_and_sources(self):
        f = self.f; before = self.source_bytes(); state = f.state.read_bytes()
        xml = self.add_form4(); f.client.get_ownership_xml.side_effect = OSError('unavailable')
        self.assertEqual(f.run_daily()['rejectedFailed'], 1)
        self.assertEqual(f.before, f.bytes()); self.assertEqual(before, self.source_bytes()); self.assertEqual(state, f.state.read_bytes())
        f.client.get_ownership_xml.side_effect = None; f.client.get_ownership_xml.return_value = xml
        with patch('sec_daily.preserve_insider', side_effect=sources.SourceClosureError('cannot persist')):
            r = f.run_daily()
        self.assertEqual(r['issuers'][0]['outcome'], 'REVIEW REQUIRED')
        self.assertEqual(f.before, f.bytes()); self.assertEqual(before, self.source_bytes()); self.assertEqual(state, f.state.read_bytes())

    def test_corrupt_source_blocks_whole_candidate_without_checkpoint_write(self):
        f = self.f
        f.client.get_ownership_xml.return_value = self.add_form4()
        source = next((f.fixtures / 'company_insiders').glob('*.xml'))
        source.write_bytes(source.read_bytes() + b'\n')
        before, state = self.source_bytes(), f.state.read_bytes()
        r = f.run_daily()
        self.assertIn('publicationBlocked', r)
        self.assertFalse(r['productionDataChanged'])
        self.assertEqual(f.before, f.bytes()); self.assertEqual(before, self.source_bytes()); self.assertEqual(state, f.state.read_bytes())

    def test_hash_mismatch_rejected_before_source_registration(self):
        f = self.f; xml = self.add_form4()
        idx = fixture.daily.discovery(f.subs[fixture.daily.IDENTITIES['NVDA']], 'NVDA')
        meta = idx['0001045810-26-999999']; parsed = fixture.daily.insider_candidate(xml, meta)
        parsed['source']['sha256'] = '0' * 64
        before = self.source_bytes()
        with self.assertRaises(sources.SourceClosureError): sources.preserve_insider(f.fixtures, 'NVDA', f.subs[meta['cik']], meta, xml, parsed)
        self.assertEqual(before, self.source_bytes())

    def test_new_earnings_all_mode_preserves_bounded_fragments_and_manifest(self):
        f = self.f
        for t in fixture.daily.PILOT:
            cik = fixture.daily.IDENTITIES[t]
            f.subs[cik] = fixture.add(f.subs[cik], acc=cik + '-26-999999', items='2.02,9.01')
        f.client.get_filing_html.return_value = '<html><p>Item 2.02 Results furnished in press release Exhibit 99.1.</p><p>Item 9.01</p><table><tr><td>99.1 Press release</td><td><a href="release.htm">Release</a></td></tr></table><p>SIGNATURE</p>' + ('irrelevant ' * 20000) + '</html>'
        r = f.run_daily(fixture.daily.PILOT)
        self.assertEqual(r['rejectedFailed'], 0); self.assertNotIn('publicationBlocked', r)
        self.assertEqual(r['acceptedObservationsEvents'], 3)
        m = sources.read(f.fixtures / 'company_evidence/manifest.json')
        for t in fixture.daily.PILOT:
            filename = fixture.daily.IDENTITIES[t] + '-26-999999.html'
            self.assertEqual(len([e for e in m['fixtures'] if e['file'] == filename]), 1)
            self.assertLess((f.fixtures / 'company_evidence' / filename).stat().st_size, 1000)
            sources.validate_feed(sources.read(f.stocks / 'evidence' / (t + '.json')), f.fixtures)

    def test_missing_other_layers_cannot_be_published(self):
        f = self.f; feed = sources.read(f.stocks / 'evidence/NVDA.json')
        for folder in ('company_observations', 'company_ownership', 'company_material_events', 'company_evidence'):
            if folder == 'company_evidence':
                acc = next(e['accessionNumber'] for e in feed['events'] if e['documentStatus'] == 'verified')
            else:
                policy = sources.read(fixture.ROOT / 'scripts/source_reviews' / (folder + '.json'))
                acc = next(d['accessionNumber'] for d in policy['documents'] if d['ticker'] == 'NVDA')
            p = next((f.fixtures / folder).glob(acc + '.*')); raw = p.read_bytes(); p.unlink()
            with self.assertRaises(sources.SourceClosureError): sources.validate_feed(feed, f.fixtures)
            p.write_bytes(raw)

    def test_workflow_gates_precede_transfer_commit_and_push(self):
        w = (fixture.ROOT / '.github/workflows/deploy.yml').read_text(encoding='utf-8')
        self.assertLess(w.index('python -B scripts/evidence_sources.py'), w.index('name: validated-data'))
        commit = w[w.index('  commit-data:'):w.index('  build:')]
        self.assertLess(commit.index('validate_release.py'), commit.index('git add '))
        self.assertLess(commit.index('evidence_sources.py --staged'), commit.index('git commit '))
        self.assertLess(commit.index('git commit '), commit.index('git push '))

    def test_amendment_is_review_only_and_no_change_preserves_artifact_bytes(self):
        f = self.f; before = self.source_bytes()
        f.new(form='4/A', doc='amended.xml')
        r = f.run_daily()
        self.assertFalse(r['productionDataChanged'])
        self.assertEqual(r['issuers'][0]['outcome'], 'REVIEW REQUIRED')
        f.client.get_ownership_xml.assert_not_called()
        self.assertEqual(f.before, f.bytes()); self.assertEqual(before, self.source_bytes())
        state = f.state.read_bytes()
        self.assertFalse(f.run_daily()['productionDataChanged'])
        self.assertEqual(state, f.state.read_bytes()); self.assertEqual(before, self.source_bytes())

    def test_local_transaction_write_failure_rolls_back_sources_evidence_and_state(self):
        f = self.f; f.client.get_ownership_xml.return_value = self.add_form4()
        before, checkpoint = self.source_bytes(), f.state.read_bytes()
        original = fixture.daily.save_atomic_json
        def fail_state(value, destination):
            if Path(destination) == f.state: raise OSError('disk failure')
            return original(value, destination)
        with patch('sec_daily.save_atomic_json', side_effect=fail_state), self.assertRaises(OSError):
            f.run_daily()
        self.assertEqual(f.before, f.bytes()); self.assertEqual(before, self.source_bytes()); self.assertEqual(checkpoint, f.state.read_bytes())


if __name__ == '__main__': unittest.main()
