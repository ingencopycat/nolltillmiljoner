import sys
import unittest
import json
import re
import tempfile
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from update_macro import clear_unreleased_actuals
import update_macro


class PreReleaseActualTests(unittest.TestCase):
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
