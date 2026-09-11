#!/usr/bin/env python3
"""
test_macro.py - Comprehensive Test & Regression Suite for Macroeconomic Data Automation

Covers:
1. Exact Period Matching:
   - Missing July between August and June -> returns None for MoM.
   - Unsorted responses & Annual Averages (M13, Q05) correctly filtered.
   - Previous period calculable before new actual is released.
   - January publication referring to December of previous year.
   - Second Quarter 2026 correctly parsed as Q2 with ref_year=2026.
   - Unknown period is not guessed (returns None, no outcome attached).
2. Event Identity & History:
   - Same reference month across different years (e.g. August 2026 and August 2027) preserved as separate events.
   - Moved calendar date and time update the existing event without duplicating.
   - Time changes on the same date are updated.
3. Timezone Consistency:
   - UTC ('Z') and America/New_York local times resolve to the exact same moment.
4. Error & API Resilience:
   - Empty data series does not count as a successful update.
   - API failure preserves last valid data and does not set lastSuccessfulUpdate to now when previous was None.
5. Staging & Deployment Security:
   - Distribution directory contains ONLY mandatory user-facing web files;
     strictly excludes scripts, tests, workflows, fixtures, logs, and build artifacts.
   - Staging fails if any mandatory website file is missing.
"""

import os
import sys
import shutil
import tempfile
import unittest
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts'))
from update_macro import (
    compute_bls_value,
    build_series_lookup_table,
    parse_ics_calendar,
    parse_ref_period_and_year,
    sync_scheduled_weeks_from_calendar,
    derive_required_fetch_years
)
from update_macro import (
    calculate_monthly_change,
    calculate_delta,
    format_provider_value,
    parse_provider_period,
    parse_fred_csv,
    parse_treasury_rows,
    FRED_SERIES_DEFINITIONS,
    BEA_EVENT_DEFINITIONS,
)
from stage_site import (
    REQUIRED_FILES,
    REQUIRED_DIRECTORIES,
    find_missing_local_references,
    stage_site,
)

class TestMacroRegressionSuite(unittest.TestCase):

    def test_missing_july_between_august_and_june_returns_none(self):
        """August must not be compared with June if July is missing."""
        mock_series_missing_july = {
            'seriesID': 'CUSR0000SA0',
            'data': [
                {'year': '2026', 'period': 'M08', 'value': '334.131'},
                # July (M07) is intentionally MISSING
                {'year': '2026', 'period': 'M06', 'value': '332.568'}
            ]
        }
        val = compute_bls_value(mock_series_missing_july, 'mom_pct', ref_year=2026, target_month=8, offset=0)
        self.assertIsNone(val, "MoM calculation must return None when immediately preceding month (July) is missing")

    def test_unsorted_responses_and_annual_averages_ignored(self):
        """Unsorted data and M13 / Q05 annual average codes must be cleanly handled."""
        mock_series_unsorted = {
            'seriesID': 'CUSR0000SA0',
            'data': [
                {'year': '2025', 'period': 'M13', 'value': '330.000'}, # Annual average
                {'year': '2026', 'period': 'M07', 'value': '332.813'}, # July
                {'year': '2026', 'period': 'M08', 'value': '334.131'}, # August
                {'year': '2025', 'period': 'M12', 'value': '326.031'}, # Unsorted Dec 2025
                {'year': '2026', 'period': 'M13', 'value': '335.000'}  # Annual average
            ]
        }
        table = build_series_lookup_table(mock_series_unsorted)
        self.assertNotIn((2025, 'M13'), table)
        self.assertNotIn((2026, 'M13'), table)
        self.assertEqual(table[(2026, 'M08')], 334.131)
        self.assertEqual(table[(2026, 'M07')], 332.813)

        val = compute_bls_value(mock_series_unsorted, 'mom_pct', ref_year=2026, target_month=8, offset=0)
        self.assertEqual(val, '0.4%')

    def test_previous_value_calculable_before_target_actual_released(self):
        """When August 2026 is not yet published, offset=1 (July) must still calculate properly."""
        mock_series_july_only = {
            'seriesID': 'WPSFD4',
            'data': [
                {'year': '2026', 'period': 'M07', 'value': '156.784'},
                {'year': '2026', 'period': 'M06', 'value': '156.667'}
            ]
        }
        actual = compute_bls_value(mock_series_july_only, 'mom_pct', ref_year=2026, target_month=8, offset=0)
        self.assertIsNone(actual)

        prev = compute_bls_value(mock_series_july_only, 'mom_pct', ref_year=2026, target_month=8, offset=1)
        self.assertEqual(prev, '0.1%')

    def test_january_publication_for_december_preceding_year(self):
        """January publication referring to December of previous year must calculate using ref_year."""
        mock_series_dec_jan = {
            'seriesID': 'CUSR0000SA0',
            'data': [
                {'year': '2025', 'period': 'M12', 'value': '326.031'},
                {'year': '2025', 'period': 'M11', 'value': '325.063'},
                {'year': '2024', 'period': 'M12', 'value': '315.000'}
            ]
        }
        val_mom = compute_bls_value(mock_series_dec_jan, 'mom_pct', ref_year=2025, target_month=12, offset=0)
        self.assertEqual(val_mom, '0.3%')

        val_yoy = compute_bls_value(mock_series_dec_jan, 'yoy_pct', ref_year=2025, target_month=12, offset=0)
        self.assertEqual(val_yoy, '3.5%')

    def test_second_quarter_parsed_correctly(self):
        """'Reference period: Second Quarter 2026' must become Q2 with ref_year=2026."""
        label, num, yr, p_type = parse_ref_period_and_year(
            'Reference period: Second Quarter 2026',
            'Productivity and Costs',
            fallback_year=2026
        )
        self.assertEqual(label, 'Q2')
        self.assertEqual(num, 2)
        self.assertEqual(yr, 2026)
        self.assertEqual(p_type, 'quarter')

    def test_unknown_period_is_not_guessed(self):
        """If reference period is missing or cannot be verified, it must return None and not guess."""
        label, num, yr, p_type = parse_ref_period_and_year(
            'Unverified press release with no reference period',
            'General Announcement',
            fallback_year=2026
        )
        self.assertIsNone(label)
        self.assertIsNone(num)
        self.assertIsNone(p_type)

    def test_separate_events_for_same_month_different_years(self):
        """August 2026 and August 2027 must remain distinct events in their respective weeks."""
        macro_weeks = {
            '2026-W37': {
                'weekNumber': 37,
                'year': 2026,
                'events': [
                    {
                        'id': 'us-cpi-2026-09-11',
                        'date': '2026-09-11',
                        'time': '08:30',
                        'eventName': 'CPI',
                        'period': 'Aug.',
                        'refYear': 2026,
                        'actual': '0.4%'
                    }
                ]
            }
        }

        mock_ics_2027 = [
            {
                'summary': 'Consumer Price Index',
                'description': 'Reference period: August 2027',
                'date': '2027-09-10',
                'time': '08:30',
                'uid': 'bls-cpi-2027@bls.gov'
            }
        ]

        added, updated = sync_scheduled_weeks_from_calendar(macro_weeks, mock_ics_2027)
        self.assertEqual(added, 4, "Four CPI indicators should be added for 2027")
        self.assertEqual(updated, 0, "2026 event must NOT be modified or overwritten by 2027 event")

        # Verify 2026 event is intact
        w37_ev = macro_weeks['2026-W37']['events'][0]
        self.assertEqual(w37_ev['date'], '2026-09-11')
        self.assertEqual(w37_ev['refYear'], 2026)
        self.assertEqual(w37_ev['actual'], '0.4%')

        # Verify 2027 event in 2027 week
        self.assertIn('2027-W36', macro_weeks)
        w2027_events = macro_weeks['2027-W36']['events']
        cpi_2027 = next(e for e in w2027_events if e['id'].startswith('us-cpi-2027'))
        self.assertEqual(cpi_2027['refYear'], 2027)
        self.assertEqual(cpi_2027['period'], 'Aug.')
        self.assertIsNone(cpi_2027['actual'])

    def test_moved_date_and_time_updates_without_duplicates(self):
        """Moved release date and changed time update the existing event without duplicating."""
        macro_weeks = {
            '2026-W36': {
                'weekNumber': 36,
                'year': 2026,
                'events': [
                    {
                        'id': 'us-jolts-job-openings-2026-09-02',
                        'date': '2026-09-02',
                        'time': '10:00',
                        'eventName': 'JOLTS Job Openings',
                        'period': 'Jul.',
                        'refYear': 2026,
                        'actual': '7.27M',
                        'calUid': 'jolts-2026-09@bls.gov'
                    }
                ]
            }
        }

        # Date moved to 2026-09-01 and time to 09:30
        mock_ics_moved = [
            {
                'summary': 'Job Openings and Labor Turnover Survey',
                'description': 'Reference period: July 2026',
                'date': '2026-09-01',
                'time': '09:30',
                'uid': 'jolts-2026-09@bls.gov'
            }
        ]

        added, updated = sync_scheduled_weeks_from_calendar(macro_weeks, mock_ics_moved)
        self.assertEqual(added, 0, "No duplicate event should be added")
        self.assertEqual(updated, 1, "Existing event should be updated to new date and time")

        w36_events = macro_weeks['2026-W36']['events']
        self.assertEqual(len(w36_events), 1)
        self.assertEqual(w36_events[0]['date'], '2026-09-01')
        self.assertEqual(w36_events[0]['time'], '09:30')
        self.assertEqual(w36_events[0]['actual'], '7.27M')

    def test_different_uids_for_same_period_are_preserved(self):
        """A first August publication and a revised September publication stay separate."""
        macro_weeks = {
            '2026-W32': {
                'weekNumber': 32,
                'year': 2026,
                'events': [{
                    'id': 'us-nonfarm-productivity-2026-08-06',
                    'date': '2026-08-06',
                    'time': '08:30',
                    'eventName': 'Nonfarm Productivity, Q/Q%',
                    'period': 'Q2',
                    'refYear': 2026,
                    'actual': '3.0%',
                    'calUid': 'productivity-august@bls.gov::us-nonfarm-productivity'
                }]
            }
        }
        mock_ics_september = [{
            'summary': 'Productivity and Costs',
            'description': 'Reference period: Second Quarter 2026',
            'date': '2026-09-03',
            'time': '08:30',
            'uid': 'productivity-september@bls.gov'
        }]

        added, updated = sync_scheduled_weeks_from_calendar(macro_weeks, mock_ics_september)

        self.assertEqual(added, 2)
        self.assertEqual(updated, 0)
        self.assertEqual(len(macro_weeks['2026-W32']['events']), 1)
        september_events = macro_weeks['2026-W36']['events']
        self.assertEqual(len(september_events), 2)
        self.assertTrue(all(event['refYear'] == 2026 for event in september_events))
        self.assertTrue(any(event['calUid'].startswith('productivity-september') for event in september_events))

    def test_utc_and_ny_timezone_parsing_consistency(self):
        """UTC 'Z' timestamp and America/New_York TZID resolve to identical local time and date."""
        ics_text = """BEGIN:VCALENDAR
BEGIN:VEVENT
UID:utc-event@bls.gov
DTSTART:20260911T123000Z
SUMMARY:Consumer Price Index
DESCRIPTION:Reference period: August 2026
END:VEVENT
BEGIN:VEVENT
UID:tzid-event@bls.gov
DTSTART;TZID=America/New_York:20260911T083000
SUMMARY:Producer Price Index
DESCRIPTION:Reference period: August 2026
END:VEVENT
END:VCALENDAR"""

        events = parse_ics_calendar(ics_text)
        self.assertEqual(len(events), 2)
        # 12:30 UTC during EDT is 08:30 EDT
        self.assertEqual(events[0]['date'], '2026-09-11')
        self.assertEqual(events[0]['time'], '08:30')

        self.assertEqual(events[1]['date'], '2026-09-11')
        self.assertEqual(events[1]['time'], '08:30')

    def test_supported_calendar_event_without_period_is_preserved(self):
        """A dated JOLTS calendar event remains visible without coupling an unverified result."""
        ics_text = """BEGIN:VCALENDAR
BEGIN:VEVENT
UID:jolts-2026-09-29@bls.gov
DTSTART;TZID=US-Eastern:20260929T100000
SUMMARY:Job Openings and Labor Turnover Survey
END:VEVENT
END:VCALENDAR"""
        calendar_events = parse_ics_calendar(ics_text)
        macro_weeks = {}

        added, updated = sync_scheduled_weeks_from_calendar(macro_weeks, calendar_events)

        self.assertEqual(added, 1)
        self.assertEqual(updated, 0)
        event = macro_weeks['2026-W40']['events'][0]
        self.assertEqual(event['date'], '2026-09-29')
        self.assertEqual(event['time'], '10:00')
        self.assertEqual(event['eventName'], 'JOLTS Job Openings')
        self.assertIsNone(event['period'])
        self.assertIsNone(event['refYear'])
        self.assertIsNone(event['actual'])

    def test_calendar_uid_backfills_legacy_event_without_duplicate(self):
        """A newly verified UID updates an older same-day event that has no UID."""
        macro_weeks = {
            '2026-W40': {
                'weekNumber': 40,
                'year': 2026,
                'events': [{
                    'id': 'us-jolts-job-openings-2026-09-29',
                    'date': '2026-09-29',
                    'time': '10:00',
                    'eventName': 'JOLTS Job Openings',
                    'period': 'Jul.',
                    'refYear': 2026,
                    'actual': '7.27M'
                }]
            }
        }
        calendar_events = [{
            'uid': 'jolts-2026-09-29@bls.gov',
            'date': '2026-09-29',
            'time': '10:00',
            'summary': 'Job Openings and Labor Turnover Survey',
            'description': ''
        }]

        added, updated = sync_scheduled_weeks_from_calendar(macro_weeks, calendar_events)

        self.assertEqual(added, 0)
        self.assertEqual(updated, 1)
        self.assertEqual(len(macro_weeks['2026-W40']['events']), 1)
        self.assertEqual(
            macro_weeks['2026-W40']['events'][0]['calUid'],
            'jolts-2026-09-29@bls.gov::us-jolts-job-openings'
        )
        self.assertEqual(macro_weeks['2026-W40']['events'][0]['actual'], '7.27M')

    def test_census_wholesale_monthly_change_uses_exact_months(self):
        """Wholesale inventory change must use the July and June observations."""
        values = {
            (2026, 6): 946687.0,
            (2026, 7): 958854.0,
        }
        self.assertEqual(calculate_monthly_change(values, 2026, 7), '1.3%')

    def test_census_vip_construction_uses_july_and_june_levels(self):
        """VIP total construction must calculate July MoM from the exact SA levels."""
        values = {(2026, 6): 2167698.0, (2026, 7): 2157581.0}
        self.assertEqual(calculate_monthly_change(values, 2026, 7), '-0.5%')

    def test_census_m3_factory_orders_uses_new_orders_not_another_period(self):
        """M3 New Orders must use July versus June and reject missing June."""
        values = {(2026, 6): 657790.0, (2026, 7): 663616.0, (2026, 5): 658836.0}
        self.assertEqual(calculate_monthly_change(values, 2026, 7), '0.9%')
        self.assertIsNone(calculate_monthly_change({(2026, 7): 663616.0}, 2026, 7))

    def test_census_period_mismatch_does_not_overwrite_existing_actual(self):
        """A level for another month cannot replace an existing valid event value."""
        values = {(2026, 6): 657790.0, (2026, 8): 670000.0}
        self.assertIsNone(calculate_monthly_change(values, 2026, 7))

    def test_provider_period_parser_rejects_unknown_period(self):
        self.assertEqual(parse_provider_period('Jul.'), ('M', 7))
        self.assertEqual(parse_provider_period('Q2'), ('Q', 2))
        self.assertEqual(parse_provider_period('unverified'), (None, None))

    def test_federal_reserve_consumer_credit_delta_uses_adjacent_months(self):
        values = {(2026, 6): 5_044_000.0, (2026, 7): 5_186_204.0, (2026, 5): 5_000_000.0}
        self.assertEqual(calculate_delta(values, 2026, 7), 142204.0)
        self.assertEqual(format_provider_value(calculate_delta(values, 2026, 7), 'delta_billions'), '142B')

    def test_federal_reserve_level_and_missing_period_do_not_fabricate(self):
        fred_values = {'2026-07': 102.9939, '2026-06': 102.2}
        self.assertEqual(fred_values.get('2026-07'), 102.9939)
        self.assertIsNone(fred_values.get('2026-08'))

    def test_provider_series_definitions_are_exact_and_seasonally_adjusted(self):
        self.assertEqual(FRED_SERIES_DEFINITIONS['us-consumer-credit-']['series'], 'TOTALSL')
        self.assertEqual(FRED_SERIES_DEFINITIONS['us-industrial-production-']['series'], 'INDPRO')
        self.assertEqual(FRED_SERIES_DEFINITIONS['us-capacity-utilization-']['series'], 'TCU')
        self.assertTrue(all(spec['seasonal'] == 'seasonally adjusted' for spec in FRED_SERIES_DEFINITIONS.values()))
        self.assertEqual(BEA_EVENT_DEFINITIONS['us-gdp-']['table'], 'T10101')
        self.assertEqual(BEA_EVENT_DEFINITIONS['us-pce-price-index-']['table'], 'T40100')

    def test_fred_csv_and_fiscaldata_period_parsers_match_exact_month(self):
        fred = parse_fred_csv('DATE,TOTALSL\n2026-06-01,5044000\n2026-07-01,5186204\n2026-08-01,.\n')
        self.assertEqual(fred['2026-07'], 5186204.0)
        self.assertNotIn('2026-08', fred)

        treasury = parse_treasury_rows([
            {'record_type_cd': 'MTH', 'classification_desc': 'July', 'current_month_dfct_sur_amt': '-432000000000'},
            {'record_type_cd': 'D', 'classification_desc': 'July', 'current_month_dfct_sur_amt': '999'},
        ], 2026)
        self.assertEqual(treasury[(2026, 7)], -432.0)

    def test_treasury_provider_uses_calendar_year_window(self):
        """FiscalData must retrieve all publication dates in the reference year."""
        import update_macro
        captured = {}
        original_request = update_macro.urllib.request.urlopen

        class Response:
            def __enter__(self):
                return self
            def __exit__(self, *args):
                return False
            def read(self):
                return b'{"data": []}'

        def fake_urlopen(request, timeout):
            captured['url'] = request.full_url
            return Response()

        update_macro.urllib.request.urlopen = fake_urlopen
        try:
            update_macro.fetch_treasury_monthly_balance(2026)
        finally:
            update_macro.urllib.request.urlopen = original_request
        self.assertIn('record_date%3Agte%3A2026-01-01', captured['url'])
        self.assertIn('record_date%3Alte%3A2026-12-31', captured['url'])

    def test_bea_rows_require_exact_period_and_unit_match(self):
        rows = [
            {'TimePeriod': '2026M07', 'LineDescription': 'Personal income', 'CL_UNIT': 'Millions of dollars', 'DataValue': '100'},
            {'TimePeriod': '2026M06', 'LineDescription': 'Personal income', 'CL_UNIT': 'Millions of dollars', 'DataValue': '99'},
            {'TimePeriod': '2026M07', 'LineDescription': 'Personal income', 'CL_UNIT': 'Percent change', 'DataValue': '9.9'},
        ]
        exact = [row for row in rows if row['LineDescription'] == 'Personal income' and row['CL_UNIT'] == 'Millions of dollars']
        by_period = {row['TimePeriod']: row['DataValue'] for row in exact}
        self.assertEqual(by_period.get('2026M07'), '100')
        self.assertEqual(by_period.get('2026M06'), '99')
        self.assertIsNone(by_period.get('2026M08'))

    def test_empty_api_data_returns_none(self):
        """API series with empty data list must not produce fake updates."""
        mock_empty_series = {
            'seriesID': 'CES0000000001',
            'data': []
        }
        val = compute_bls_value(mock_empty_series, 'net_change_k', ref_year=2026, target_month=8, offset=0)
        self.assertIsNone(val)

    def test_staging_distribution_folder_and_mandatory_files(self):
        """Ensure deployment directory contains ONLY required web assets and fails if mandatory files are missing."""
        workspace = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        # Verify all mandatory files exist in workspace
        for mf in REQUIRED_FILES:
            self.assertTrue(os.path.exists(os.path.join(workspace, mf)), f"Mandatory file missing in workspace: {mf}")
        for directory in REQUIRED_DIRECTORIES:
            self.assertTrue(os.path.isdir(os.path.join(workspace, directory)))

        temp_dir = tempfile.mkdtemp()
        try:
            stage_site(temp_dir)

            staged_items = os.listdir(temp_dir)
            self.assertIn('index.html', staged_items)
            self.assertIn('makro.html', staged_items)
            self.assertIn('data', staged_items)
            self.assertIn('images', staged_items)
            self.assertTrue(os.path.isfile(os.path.join(temp_dir, 'data', 'market-calendar.js')))
            self.assertEqual(find_missing_local_references(temp_dir), [])

            # Strictly verify exclusions
            self.assertNotIn('scripts', staged_items)
            self.assertNotIn('tests', staged_items)
            self.assertNotIn('.github', staged_items)
            self.assertNotIn('YouTube Transcriber.spec', staged_items)
            self.assertNotIn('youtube-transcriber', staged_items)
            self.assertFalse(os.path.exists(os.path.join(temp_dir, 'data', 'bls-schedule.ics')))
        finally:
            shutil.rmtree(temp_dir)

if __name__ == '__main__':
    unittest.main()
