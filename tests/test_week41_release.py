"""Offline Census refresh regression; never writes the published weekly data."""
import copy
import io
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import update_macro

# Official MWTS CSV, retrieved 2026-10-11; August report released October 8.
# https://www.census.gov/wholesale/pdf/mwts/currentwhl.pdf
# NAICS 42, US, IM inventories, seasonally adjusted, millions of dollars.
REVISED_CSV = b'Jun-2026,946687\nJul-2026,959769\nAug-2026,964199\n'


class WholesaleRevisionTests(unittest.TestCase):
    def setUp(self):
        raw = (ROOT / 'data/weekly-events.js').read_text(encoding='utf-8')
        weeks = update_macro.parse_js_object(re.search(r'const macroWeeks = (.*?);\s*const earningsWeeks', raw, re.S).group(1))
        self.event = copy.deepcopy(next(e for e in weeks['2026-W41']['events']
                                       if e['id'] == 'us-wholesale-trade-2026-10-08'))
        # Reconstruct the publication vintage, independent of future repository refreshes.
        self.event.update(previous='1.3%', actual=None)
        self.event['fieldProvenance']['actual'] = {'kind':'unavailable', 'status':'unavailable'}
        self.event.pop('officialBaseline', None)
        self.event.pop('isRevised', None)

    def refresh(self, event, instant, csv=REVISED_CSV):
        class Clock(datetime):
            @classmethod
            def now(cls, tz=None):
                return cls.fromisoformat(instant.replace('Z', '+00:00')).astimezone(tz or timezone.utc)

        def census_only(request, **kwargs):
            url = urlparse(request.full_url)
            self.assertEqual((url.scheme, url.netloc, url.path),
                             ('https', 'www.census.gov', '/econ_export/'))
            self.assertEqual(parse_qs(url.query), {
                'format':['csv'], 'mode':['report'], 'submit':['GET DATA'],
                'program':['MWTS'], 'startYear':['2026'], 'endYear':['2026'],
                'categories[0]':['42'], 'dataType':['IM'], 'geoLevel':['US'],
                'adjusted':['true'], 'notAdjusted':['false'], 'errorData':['false']})
            return io.BytesIO(csv)

        with tempfile.TemporaryDirectory(prefix='ntm-wholesale-') as directory:
            path = Path(directory) / 'weekly.js'
            weeks = {'2026-W41':{'sourceTimezone':'America/New_York', 'events':[event]}}
            path.write_text('const macroWeeks = '+json.dumps(weeks)+';\nconst earningsWeeks = {};\n'
                            'window.NTM_WEEKLY_EVENTS = {meta: {}, macroWeeks, earningsWeeks};', encoding='utf-8')
            with patch.object(update_macro, 'DATA_FILE', str(path)), patch.object(update_macro, 'datetime', Clock), \
                 patch.object(update_macro, 'fetch_bls_schedule', return_value=[]), \
                 patch.object(update_macro, 'fetch_bls_data', return_value=('REQUEST_FAILED', [])), \
                 patch.object(update_macro.urllib.request, 'urlopen', side_effect=census_only) as fetch:
                update_macro.update_macro_data()
                self.assertEqual(fetch.call_count, 1)
            return json.loads(re.search(r'const macroWeeks = (.*?);\s*const earningsWeeks',
                                       path.read_text(encoding='utf-8'), re.S).group(1))['2026-W41']['events'][0]

    def test_official_revision_and_actual_release_boundary(self):
        # Earlier July level used in the existing Census calculation fixture.
        self.assertEqual(update_macro.calculate_monthly_change({(2026,6):946687, (2026,7):958854}, 2026, 7), '1.3%')
        before = self.refresh(self.event, '2026-10-08T13:59:59Z')
        self.assertIsNone(before['actual'])
        self.assertNotIn('officialBaseline', before)
        after = self.refresh(self.event, '2026-10-08T14:00:00Z')
        self.assertEqual((after['previous'], after['actual'], after['officialBaseline']), ('1.4%', '0.5%', '0.5%'))
        self.assertNotIn('isRevised', after)  # July revision is not an actual revision flag.
        for field in ('previous', 'actual'):
            self.assertEqual(after['fieldProvenance'][field], {
                'kind':'provider_derived', 'status':'available', 'source':'U.S. Census Bureau',
                'sourceUrl':'https://www.census.gov/wholesale/release_schedule.html',
                'fetchedAt':'2026-10-08T14:00:00Z', 'methodVersion':'ntm-macro/1'})
        for field in ('id', 'date', 'time', 'period', 'refYear', 'eventName', 'forecast'):
            self.assertEqual(after[field], self.event[field])
        self.assertEqual(after['fieldProvenance']['forecast'], self.event['fieldProvenance']['forecast'])
        # Synthetic later actual revision tests flag semantics, not another claimed release.
        revised = self.refresh(after, '2026-10-09T14:00:00Z', REVISED_CSV.replace(b'964199', b'966000'))
        self.assertEqual(revised['actual'], '0.6%')
        self.assertEqual(revised['officialBaseline'], '0.6%')
        self.assertTrue(revised['isRevised'])
        self.run_js(after, succeeds=True)
        self.run_js(revised, succeeds=True)

    def test_missing_or_wrong_period_preserves_verified_observations(self):
        after = self.refresh(self.event, '2026-10-08T14:00:00Z')
        for csv in (b'', REVISED_CSV.replace(b'2026', b'2025')):
            with self.subTest(csv=csv):
                preserved = self.refresh(after, '2026-10-09T14:00:00Z', csv)
                for field in ('previous', 'actual'):
                    self.assertEqual(preserved[field], after[field])
                    self.assertEqual(preserved['fieldProvenance'][field], after['fieldProvenance'][field])

    def run_js(self, event, succeeds):
        node = os.environ.get('NODE_BINARY') or shutil.which('node')
        self.assertIsNotNone(node)
        with tempfile.TemporaryDirectory(prefix='ntm-wholesale-js-') as directory:
            preload = Path(directory) / 'updated.cjs'
            preload.write_text('const V=require('+json.dumps(str(ROOT / 'scripts/check_weekly_events.cjs'))+');'
                'const load=V.loadRepository;V.loadRepository=(...args)=>{const m=load(...args);'
                'const rows=m.data.macroWeeks["2026-W41"].events;'
                'rows[rows.findIndex(e=>e.id==="us-wholesale-trade-2026-10-08")]='+json.dumps(event)+';return m;};', encoding='utf-8')
            result = subprocess.run([node, '--require', str(preload), '--test', 'tests/week41.test.cjs'],
                                    cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(result.returncode == 0, succeeds, result.stdout + result.stderr)

    def test_js_contract_rejects_wrong_measure_period_provenance_and_early_actual(self):
        after = self.refresh(self.event, '2026-10-08T14:00:00Z')
        mutations = [
            lambda e: e.update(period='Jul.'), lambda e: e.update(refYear=2025),
            lambda e: e.update(eventName='Monthly Wholesale Trade – sales (MoM)'),
            lambda e: e.update(previous='959769'), lambda e: e.update(forecast='1.4%'),
            lambda e: e['fieldProvenance']['previous'].update(kind='manual'),
            lambda e: e['fieldProvenance']['previous'].update(source='Other provider'),
            lambda e: e['fieldProvenance']['previous'].update(sourceUrl='https://example.com/'),
            lambda e: e['fieldProvenance']['previous'].update(methodVersion='unknown'),
            lambda e: e['fieldProvenance']['actual'].update(fetchedAt='2026-10-08T13:59:59Z'),
            lambda e: e.update(officialBaseline='1.3%'),
        ]
        for index, mutate in enumerate(mutations):
            with self.subTest(mutation=index):
                invalid = copy.deepcopy(after)
                mutate(invalid)
                self.run_js(invalid, succeeds=False)
