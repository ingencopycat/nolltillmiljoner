import sys
import unittest
import json
import re
import tempfile
import copy
import os
import shutil
import subprocess
from datetime import datetime, timezone
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from update_macro import clear_unreleased_actuals
import update_macro


class PreReleaseActualTests(unittest.TestCase):
    def test_jolts_verified_update_lifecycle_and_historical_js_contract(self):
        root = Path(__file__).resolve().parents[1]
        fixture = json.loads((root / 'tests/fixtures/bls-jolts-2026-08.json').read_text(encoding='utf-8'))
        raw = (root / 'data/weekly-events.js').read_text(encoding='utf-8')
        weeks = update_macro.parse_js_object(re.search(r'const macroWeeks = (.*?);\s*const earningsWeeks', raw, re.S).group(1))
        original = next(e for e in weeks['2026-W40']['events'] if e['id'] == 'us-jolts-job-openings-2026-09-29')
        event = copy.deepcopy(original)
        event['actual'] = None
        event['fieldProvenance']['actual'] = {'kind':'unavailable', 'status':'unavailable'}
        event.pop('officialBaseline', None)
        event.pop('isRevised', None)

        def refresh(initial, instant, response):
            class Clock(datetime):
                @classmethod
                def now(cls, tz=None):
                    return cls.fromisoformat(instant.replace('Z', '+00:00')).astimezone(tz or timezone.utc)
            with tempfile.TemporaryDirectory(prefix='ntm-jolts-lifecycle-') as directory:
                path = Path(directory) / 'weekly.js'
                subset = {'2026-W40': {'sourceTimezone':'America/New_York', 'events':[copy.deepcopy(initial)]}}
                path.write_text('const macroWeeks = '+json.dumps(subset)+';\nconst earningsWeeks = {};\nwindow.NTM_WEEKLY_EVENTS = {meta: {}, macroWeeks, earningsWeeks};', encoding='utf-8')
                with patch.object(update_macro, 'DATA_FILE', str(path)), patch.object(update_macro, 'datetime', Clock), \
                     patch.object(update_macro, 'fetch_bls_schedule', return_value=[]), \
                     patch.object(update_macro, 'fetch_bls_data', return_value=response), \
                     patch.object(update_macro.urllib.request, 'urlopen', side_effect=AssertionError('Offline fixture only')):
                    update_macro.update_macro_data()
                data = json.loads(re.search(r'const macroWeeks = (.*?);\s*const earningsWeeks', path.read_text(encoding='utf-8'), re.S).group(1))
                return data['2026-W40']['events'][0]

        response = (fixture['status'], fixture['series'])
        before = refresh(event, '2026-09-29T13:59:59Z', response)
        self.assertIsNone(before['actual'])
        self.assertEqual(before['fieldProvenance']['actual'], {'kind':'unavailable', 'status':'unavailable'})
        self.assertNotIn('officialBaseline', before)
        after = refresh(event, '2026-09-29T14:00:00Z', response)
        self.assertEqual(after['actual'], '7.08M')  # 7079 thousand / 1000, two decimals.
        self.assertEqual(after['officialBaseline'], '7.08M')
        self.assertEqual(after['previous'], '7.33M')  # 7335 uses the existing float/two-decimal formatter.
        self.assertEqual(after['fieldProvenance']['actual'], {
            'kind':'provider_derived', 'status':'available', 'source':'U.S. Bureau of Labor Statistics',
            'sourceUrl':'https://www.bls.gov/jlt/', 'fetchedAt':'2026-09-29T14:00:00Z', 'methodVersion':'ntm-macro/1'})
        self.assertEqual(after['forecast'], event['forecast'])
        self.assertEqual(after['fieldProvenance']['forecast'], event['fieldProvenance']['forecast'])
        self.assertEqual((after['period'], after['refYear']), ('Aug.', 2026))
        july_only = copy.deepcopy(fixture['series'])
        july_only[0]['data'] = july_only[0]['data'][1:]
        wrong_year = copy.deepcopy(fixture['series'])
        for point in wrong_year[0]['data']:
            point['year'] = '2025'
        for unavailable in [('REQUEST_SUCCEEDED', july_only), ('REQUEST_SUCCEEDED', wrong_year), ('REQUEST_FAILED', fixture['series']), ('REQUEST_SUCCEEDED', [])]:
            with self.subTest(response=unavailable):
                pending = refresh(event, '2026-10-05T15:00:00Z', unavailable)
                self.assertIsNone(pending['actual'])
                self.assertEqual(pending['fieldProvenance']['actual']['kind'], 'unavailable')
        preserved = refresh(after, '2026-10-05T15:00:00Z', ('REQUEST_FAILED', []))
        self.assertEqual(preserved['actual'], after['actual'])
        self.assertEqual(preserved['fieldProvenance']['actual'], after['fieldProvenance']['actual'])

        # Run the real W40 assertions against the updater output without touching repository data or W41.
        node = os.environ.get('NODE_BINARY') or shutil.which('node')
        self.assertIsNotNone(node, 'Node is required for weekly validation')
        with tempfile.TemporaryDirectory(prefix='ntm-jolts-js-') as directory:
            preload = Path(directory) / 'updated.cjs'
            preload.write_text('const V=require('+json.dumps(str(root / 'scripts/check_weekly_events.cjs'))+');'
                'const load=V.loadRepository;V.loadRepository=(...args)=>{const m=load(...args);'
                'const rows=m.data.macroWeeks["2026-W40"].events;'
                'rows[rows.findIndex(e=>e.id==="us-jolts-job-openings-2026-09-29")]='+json.dumps(after)+';return m;};', encoding='utf-8')
            subprocess.run([node, '--require', str(preload), '--test', 'tests/week40.test.cjs'], cwd=root, check=True)

    def test_provider_refresh_cannot_replace_percentage_with_raw_level(self):
        event = dict(id='us-gdp-third-estimate-2026-09-30',date='2026-09-30',time='08:30',
                     period='Q2',providerUnit='Percent change',actual=None,previous='1.5%',forecast=None)
        weeks={'2026-W40':{'sourceTimezone':'America/New_York','events':[event]}}
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'weekly.js'
            path.write_text('const macroWeeks = '+json.dumps(weeks)+';\nconst earningsWeeks = {};\nwindow.NTM_WEEKLY_EVENTS = {meta: {}, macroWeeks, earningsWeeks};',encoding='utf8')
            with patch.object(update_macro,'DATA_FILE',str(path)), patch.dict(update_macro.os.environ,{'BEA_API_KEY':'test-only'}), \
                 patch.object(update_macro,'fetch_bls_schedule',return_value=[]), \
                 patch.object(update_macro,'fetch_bls_data',return_value=('REQUEST_SUCCEEDED',[])), \
                 patch.object(update_macro,'fetch_bea_table',return_value=[
                     {'TimePeriod':'2026Q2','LineDescription':'Gross domestic product','CL_UNIT':'Millions of dollars','DataValue':'33000'},
                     {'TimePeriod':'2026Q1','LineDescription':'Gross domestic product','CL_UNIT':'Millions of dollars','DataValue':'32000'}]), \
                 patch.object(update_macro.urllib.request,'urlopen',side_effect=AssertionError('No network in test')):
                update_macro.update_macro_data()
            data=json.loads(re.search(r'const macroWeeks = (.*?);\s*const earningsWeeks',path.read_text(encoding='utf8'),re.S).group(1))
            row=data['2026-W40']['events'][0]
            self.assertIsNone(row['actual'])
            self.assertEqual(row['previous'],'1.5%')

    def test_prior_estimate_cannot_become_future_actual(self):
        event = dict(date='2026-09-30', time='08:30', actual='1.5%', previous='1.5%',
                     forecast='1.5%', officialBaseline='1.5%', isRevised=True)
        weeks = {'2026-W40': {'sourceTimezone': 'America/New_York', 'events': [event]}}
        clear_unreleased_actuals(weeks, '2026-09-30T12:29:59Z')
        self.assertIsNone(event['actual'])
        self.assertEqual(event['previous'], '1.5%')
        self.assertEqual(event['forecast'], '1.5%')
        self.assertEqual(event['fieldProvenance']['actual']['status'], 'unavailable')
        self.assertNotIn('officialBaseline', event)
        self.assertNotIn('isRevised', event)
        event['actual'] = '1.7%'
        clear_unreleased_actuals(weeks, '2026-09-30T12:30:00Z')
        self.assertEqual(event['actual'], '1.7%')

    def test_winter_time_and_unknown_time_do_not_release_early(self):
        event = dict(date='2026-12-04', time='08:30', actual='100K')
        weeks = {'2026-W49': {'sourceTimezone': 'America/New_York', 'events': [event]}}
        clear_unreleased_actuals(weeks, '2026-12-04T13:29:00Z')
        self.assertIsNone(event['actual'])
        event.update(time=None, actual='100K')
        clear_unreleased_actuals(weeks, '2026-12-04T20:00:00Z')
        self.assertIsNone(event['actual'])
