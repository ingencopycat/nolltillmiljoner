import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import sec_daily as daily


def baseline(ticker='NVDA'):
    return daily.read(ROOT / 'tests/fixtures' / ('sec_' + ticker.lower() + '_submissions.json'))


def add(sub, form='8-K', items='8.01', acc='0001045810-26-999999', doc='new.htm'):
    sub = copy.deepcopy(sub)
    recent = sub['filings']['recent']
    row = dict(form=form, items=items, accessionNumber=acc, primaryDocument=doc,
               filingDate='2026-09-24', reportDate='2026-09-23')
    for key in recent:
        recent[key].insert(0, row.get(key, recent[key][0]))
    return sub


class DailyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.stocks = self.root / 'stocks'
        (self.stocks / 'evidence').mkdir(parents=True)
        self.state = self.root / 'state.json'
        self.report = self.root / 'report.json'
        self.subs = {}
        state = dict(schema='ntm-sec-daily/1', issuers={})
        for ticker in daily.PILOT:
            for name in [ticker + '.json', 'evidence/' + ticker + '.json', 'evidence/' + ticker + '.status.json']:
                (self.stocks / name).write_bytes((ROOT / 'data/stocks' / name).read_bytes())
            sub = baseline(ticker)
            # Baseline snapshots predate some reviewed examples; discovery still must retain them.
            self.subs[daily.IDENTITIES[ticker]] = sub
            index = daily.discovery(sub, ticker)
            state['issuers'][ticker] = dict(through=max(e['filingDate'] for e in index.values()),
                seen={a: daily.fingerprint(e) for a, e in index.items() if e['filingDate'] >= daily.START}, review={})
        self.state.write_text(json.dumps(state), encoding='utf-8')
        self.client = Mock()
        self.client.get_submissions.side_effect = lambda cik: self.subs[cik]
        self.before = self.bytes()

    def bytes(self):
        return {p.relative_to(self.stocks).as_posix(): p.read_bytes() for p in self.stocks.rglob('*.json')}

    def run_daily(self, tickers=('NVDA',)):
        return daily.run(tickers, self.client, self.stocks, self.state, self.report)

    def new(self, **kwargs):
        cik = daily.IDENTITIES['NVDA']
        self.subs[cik] = add(self.subs[cik], **kwargs)

    def test_no_new_no_fetch_no_publication(self):
        result = self.run_daily()
        self.assertFalse(result['productionDataChanged'])
        self.assertEqual(result['newFilings'], 0)
        self.assertEqual(result['rejectedFailed'], 0)
        self.assertEqual(self.before, self.bytes())
        self.client.get_filing_html.assert_not_called()
        self.client.get_company_facts.assert_not_called()

    def test_first_run_bootstrap_uses_real_pilot_baselines(self):
        self.state.write_text(json.dumps(dict(schema='ntm-sec-daily/1', issuers={})), encoding='utf-8')
        result = self.run_daily(daily.PILOT)
        self.assertEqual(result['rejectedFailed'], 0)
        self.assertEqual(result['newFilings'], 0)
        self.assertFalse(result['productionDataChanged'])
        self.assertEqual(self.before, self.bytes())
        self.client.get_filing_html.assert_not_called()
        self.client.get_ownership_xml.assert_not_called()

    def test_malformed_earnings_response_rejects(self):
        self.new(items='2.02')
        self.client.get_filing_html.return_value = 'upstream error page without HTML'
        result = self.run_daily()
        self.assertEqual(result['rejectedFailed'], 1)
        self.assertEqual(result['newFilings'], 1)
        self.assertIn('failedSource', result['issuers'][0])
        self.assertEqual(self.before, self.bytes())

    def test_one_known_metadata_and_idempotent_rerun(self):
        self.new(items='5.07,9.01')
        result = self.run_daily()
        self.assertTrue(result['productionDataChanged'])
        self.assertEqual(result['acceptedObservationsEvents'], 1)
        after = self.bytes()
        result = self.run_daily()
        self.assertFalse(result['productionDataChanged'])
        self.assertEqual(result['newFilings'], 0)
        self.assertEqual(after, self.bytes())

    def test_multiple_and_duplicate_evidence(self):
        self.new(items='5.07')
        self.new(items='5.07', acc='0001045810-26-999998')
        sub = self.subs[daily.IDENTITIES['NVDA']]
        for array in sub['filings']['recent'].values(): array.insert(0, array[0])
        result = self.run_daily()
        self.assertEqual(result['newFilings'], 2)
        self.assertEqual(result['acceptedObservationsEvents'], 2)

    def test_unknown_material_event_review_only(self):
        self.new(items='6.01')
        result = self.run_daily()
        self.assertFalse(result['productionDataChanged'])
        self.assertTrue(any('Unreviewed' in r['reason'] for r in result['issuers'][0]['review']))
        self.assertEqual(self.before, self.bytes())

    def test_ambiguous_guidance_relationship_review(self):
        self.new(items='2.02,9.01')
        self.client.get_filing_html.return_value = '<html>Unrelated exhibit</html>'
        result = self.run_daily()
        self.assertFalse(result['productionDataChanged'])
        self.assertTrue(any('ambiguous' in r['reason'] for r in result['issuers'][0]['review']))

    def test_new_kpi_and_segment_definition_never_auto_extract(self):
        self.new(items='2.02,9.01')
        self.client.get_filing_html.return_value = '<html>Item 2.02 Results furnished in press release Exhibit 99.1. Item 9.01 <table><tr><td>99.1 Press release</td><td><a href="release.htm">Release</a></td></tr></table>SIGNATURE</html>'
        result = self.run_daily()
        self.assertEqual(result['acceptedObservationsEvents'], 1)  # Document relationship only.
        doc = daily.read(self.stocks / 'evidence/NVDA.json')
        original = json.loads(self.before['evidence/NVDA.json'])
        self.assertEqual(doc['reviewedEvidence'], original['reviewedEvidence'])
        self.assertTrue(any('KPI' in r['reason'] and 'segment' in r['reason'] for r in result['issuers'][0]['review']))

    def test_malformed_index_rejected_bytes_and_state_preserved(self):
        self.new()
        self.subs[daily.IDENTITIES['NVDA']]['filings']['recent']['items'].pop()
        state = daily.read(self.state)
        result = self.run_daily()
        self.assertEqual(result['rejectedFailed'], 1)
        self.assertEqual(self.before, self.bytes())
        self.assertEqual(state, daily.read(self.state))

    def test_network_failure_redacted_and_retained(self):
        self.client.get_submissions.side_effect = RuntimeError('secret arbitrary transport body')
        result = self.run_daily()
        self.assertEqual(result['rejectedFailed'], 1)
        self.assertNotIn('secret', self.report.read_text())
        self.assertEqual(self.before, self.bytes())

    def test_partial_issuer_failure_does_not_block_valid_issuer(self):
        self.new(items='5.07')
        self.subs[daily.IDENTITIES['SOFI']] = {'cik': 'wrong'}
        result = self.run_daily(('NVDA', 'SOFI'))
        self.assertEqual(result['rejectedFailed'], 1)
        self.assertTrue(result['productionDataChanged'])
        self.assertEqual(self.before['SOFI.json'], self.bytes()['SOFI.json'])
        self.assertEqual(self.before['evidence/SOFI.json'], self.bytes()['evidence/SOFI.json'])

    def test_changed_metadata_rejects(self):
        self.new(items='5.07')
        self.run_daily()
        before = self.bytes()
        self.subs[daily.IDENTITIES['NVDA']]['filings']['recent']['items'][0] = '1.01'
        self.assertEqual(self.run_daily()['rejectedFailed'], 1)
        self.assertEqual(before, self.bytes())

    def test_ownership_amendment_review_not_fetched(self):
        self.new(form='4/A', doc='new.xml')
        self.assertFalse(self.run_daily()['productionDataChanged'])
        self.client.get_ownership_xml.assert_not_called()

    def test_actual_form4_structure_accepted_with_provenance(self):
        document = daily.read(self.stocks / 'evidence/NVDA.json')
        filing = next(f for f in document['insiderEvidence']['filings'] if f['form'] == '4')
        fixture = ROOT / 'tests/fixtures/company_insiders' / (filing['accessionNumber'] + '.xml')
        self.new(form='4', doc='new.xml')
        self.client.get_ownership_xml.return_value = fixture.read_text(encoding='utf-8-sig')
        result = self.run_daily()
        self.assertEqual(result['rejectedFailed'], 0)
        self.assertTrue(result['productionDataChanged'])
        current = daily.read(self.stocks / 'evidence/NVDA.json')['insiderEvidence']['filings'][0]
        self.assertEqual(current['accessionNumber'], '0001045810-26-999999')
        self.assertRegex(current['source']['sha256'], r'^[a-f0-9]{64}$')

    def test_unknown_xml_shape_review_and_malformed_source_reject(self):
        document = daily.read(self.stocks / 'evidence/NVDA.json')
        filing = next(f for f in document['insiderEvidence']['filings'] if f['form'] == '4')
        xml = (ROOT / 'tests/fixtures/company_insiders' / (filing['accessionNumber'] + '.xml')).read_text(encoding='utf-8-sig')
        self.new(form='4', doc='new.xml')
        self.client.get_ownership_xml.return_value = xml.replace('</ownershipDocument>', '<unknown>1</unknown></ownershipDocument>')
        result = self.run_daily()
        self.assertFalse(result['productionDataChanged'])
        self.assertEqual(result['rejectedFailed'], 0)
        self.new(form='4', doc='new.xml', acc='0001045810-26-999998')
        self.client.get_ownership_xml.return_value = '<bad'
        self.assertEqual(self.run_daily()['rejectedFailed'], 1)
        self.assertEqual(self.before, self.bytes())

    def test_failure_after_accepted_candidate_rolls_back_whole_issuer(self):
        self.new(items='5.07', acc='0001045810-26-999998')
        self.new(items='2.02')
        self.client.get_filing_html.side_effect = OSError('network')
        self.assertEqual(self.run_daily()['rejectedFailed'], 1)
        self.assertEqual(self.before, self.bytes())

    def test_recent_window_gap_is_not_treated_as_no_change(self):
        self.new(items='5.07')
        recent = self.subs[daily.IDENTITIES['NVDA']]['filings']['recent']
        for key in recent: recent[key] = recent[key][:1]
        self.assertEqual(self.run_daily()['rejectedFailed'], 1)
        self.assertEqual(self.before, self.bytes())

    def test_financial_definition_and_restatement_guards(self):
        old = daily.read(ROOT / 'data/stocks/NVDA.json')
        self.assertEqual(daily.guard_financials(old, copy.deepcopy(old)), 0)
        new = copy.deepcopy(old)
        new['quarterly'][-1]['metrics']['revenue']['value'] += 1
        with self.assertRaises(daily.ReviewRequired): daily.guard_financials(old, new)
        new = copy.deepcopy(old)
        row = copy.deepcopy(new['quarterly'][-1]); row['periodEnd'] = '2026-10-25'
        row['metrics']['revenue']['definition'] = 'new-scope'
        new['quarterly'].append(row)
        with self.assertRaises(daily.ReviewRequired): daily.guard_financials(old, new)

    def test_normal_comparable_financial_addition(self):
        new = daily.read(ROOT / 'data/stocks/NVDA.json')
        old = copy.deepcopy(new)
        old['quarterly'].pop()
        count = daily.guard_financials(old, new)
        self.assertGreater(count, 0)

    def test_owner_artifact_bounds_and_public_site_exclusion(self):
        self.new(items='1.01')
        self.run_daily()
        report = daily.read(self.report)
        row = next(r for r in report['issuers'][0]['review'] if r['accession'].endswith('999999'))
        self.assertTrue(row['url'].startswith('https://www.sec.gov/Archives/'))
        self.assertIn('reason', row)
        self.assertLessEqual(len(report['issuers'][0]['review']), 100)
        import stage_site
        self.assertNotIn('scripts', stage_site.REQUIRED_DIRECTORIES)
        self.assertNotIn('artifacts', stage_site.REQUIRED_DIRECTORIES)

    def test_same_workflow_entry_and_noop_gate(self):
        workflow = (ROOT / '.github/workflows/deploy.yml').read_text()
        self.assertEqual(workflow.count('cron:'), 1)
        self.assertIn("35 6 * * *", workflow)
        self.assertIn('--daily --all', workflow)
        self.assertIn('--daily --ticker "$SEC_TICKER"', workflow)
        self.assertIn("needs.commit-data.outputs.publish == 'true'", workflow)
        self.assertNotIn('--evidence --reviewed', workflow)

    def test_pilot_boundary(self):
        with self.assertRaises(ValueError): self.run_daily(('AAPL',))


if __name__ == '__main__': unittest.main()
