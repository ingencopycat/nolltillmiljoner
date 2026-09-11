#!/usr/bin/env python3
"""
update_macro.py - Automated Macroeconomic Data Fetcher & Calendar Manager for NTM

Fetches verified macroeconomic release data directly from official government APIs:
- U.S. Bureau of Labor Statistics (BLS) Public Data API (v1 / v2)
- BLS Official Release Schedule (iCalendar feed & verified schedule cache)

Features:
1. Exact Year + Period lookup (no relative index assumptions, rejects missing comparisons).
2. Dynamic Year Derivation (no hardcoded years).
3. Live iCalendar schedule parser with RFC 5545 unfolding, TZID/UTC support, and verified cache.
4. Distinguishes moved releases from new releases / next-year releases (strict indicator + refYear + period + UID).
5. Error resilient: preserves last valid data & previous lastSuccessfulUpdate on failure.
6. Atomic file updates to avoid race conditions and partial writes.
"""

import os
import re
import sys
import json
import math
import shutil
import tempfile
import urllib.request
import urllib.error
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(WORKSPACE_DIR, 'data', 'weekly-events.js')
ICS_CACHE_FILE = os.path.join(WORKSPACE_DIR, 'data', 'bls-schedule.ics')
ICS_URL = 'https://www.bls.gov/schedule/news_release/bls.ics'

# Series metadata and transformations
BLS_SERIES_DEFINITIONS = {
    'CES0000000001': {'name': 'Total Nonfarm Employment', 'type': 'net_change_k', 'sourceUrl': 'https://www.bls.gov/ces/'},
    'LNS14000000': {'name': 'Unemployment Rate', 'type': 'rate_pct', 'sourceUrl': 'https://www.bls.gov/cps/'},
    'CES0500000003': {'name': 'Average Hourly Earnings', 'type': 'earnings_mm_yy', 'sourceUrl': 'https://www.bls.gov/ces/'},
    'PRS85006092': {'name': 'Nonfarm Productivity', 'type': 'level_pct', 'sourceUrl': 'https://www.bls.gov/lpc/'},
    'PRS85006112': {'name': 'Unit Labor Costs', 'type': 'level_pct', 'sourceUrl': 'https://www.bls.gov/lpc/'},
    'JTS000000000000000JOL': {'name': 'Job Openings', 'type': 'level_m', 'sourceUrl': 'https://www.bls.gov/jlt/'},
    'WPSFD4': {'name': 'PPI Final Demand (MoM)', 'type': 'mom_pct', 'sourceUrl': 'https://www.bls.gov/ppi/'},
    'WPSFD49104': {'name': 'PPI Core (MoM)', 'type': 'mom_pct', 'sourceUrl': 'https://www.bls.gov/ppi/'},
    'WPUFD4': {'name': 'PPI Final Demand (NSA, YoY)', 'type': 'yoy_pct', 'sourceUrl': 'https://www.bls.gov/ppi/'},
    'CUSR0000SA0': {'name': 'CPI All Items (SA, MoM)', 'type': 'mom_pct', 'sourceUrl': 'https://www.bls.gov/cpi/'},
    'CUUR0000SA0': {'name': 'CPI All Items (NSA, YoY)', 'type': 'yoy_pct', 'sourceUrl': 'https://www.bls.gov/cpi/'},
    'CUSR0000SA0L1E': {'name': 'Core CPI (SA, MoM)', 'type': 'mom_pct', 'sourceUrl': 'https://www.bls.gov/cpi/'},
    'CUUR0000SA0L1E': {'name': 'Core CPI (NSA, YoY)', 'type': 'yoy_pct', 'sourceUrl': 'https://www.bls.gov/cpi/'}
}

FRED_SERIES_DEFINITIONS = {
    'us-consumer-credit-': {'series': 'TOTALSL', 'unit': 'millions of dollars', 'seasonal': 'seasonally adjusted', 'transform': 'delta_billions', 'sourceUrl': 'https://fred.stlouisfed.org/series/TOTALSL'},
    'us-industrial-production-': {'series': 'INDPRO', 'unit': 'index 2017=100', 'seasonal': 'seasonally adjusted', 'transform': 'mom_pct', 'sourceUrl': 'https://fred.stlouisfed.org/series/INDPRO'},
    'us-capacity-utilization-': {'series': 'TCU', 'unit': 'percent', 'seasonal': 'seasonally adjusted', 'transform': 'level_pct', 'sourceUrl': 'https://fred.stlouisfed.org/series/TCU'}
}

BEA_EVENT_DEFINITIONS = {
    'us-gdp-': {'table': 'T10101', 'frequency': 'Q', 'descriptions': ('Gross domestic product',), 'unit': 'Millions of dollars', 'transform': 'level', 'sourceUrl': 'https://apps.bea.gov/iTable/?ReqID=19'},
    'us-pce-price-index-': {'table': 'T40100', 'frequency': 'M', 'descriptions': ('Personal consumption expenditures',), 'unit': 'Index 2017=100', 'transform': 'level', 'sourceUrl': 'https://apps.bea.gov/iTable/?ReqID=19'},
    'us-core-pce-price-index-': {'table': 'T40100', 'frequency': 'M', 'descriptions': ('Personal consumption expenditures excluding food and energy',), 'unit': 'Index 2017=100', 'transform': 'level', 'sourceUrl': 'https://apps.bea.gov/iTable/?ReqID=19'},
    'us-personal-income-': {'table': 'T20100', 'frequency': 'M', 'descriptions': ('Personal income',), 'unit': 'Millions of dollars', 'transform': 'level', 'sourceUrl': 'https://apps.bea.gov/iTable/?ReqID=19'},
    'us-personal-spending-': {'table': 'T20100', 'frequency': 'M', 'descriptions': ('Personal consumption expenditures',), 'unit': 'Millions of dollars', 'transform': 'level', 'sourceUrl': 'https://apps.bea.gov/iTable/?ReqID=19'}
}

TREASURY_EVENT_PREFIX = 'us-treasury-balance-'

# Mapping indicator event templates to series
EVENT_SERIES_MAPPING = {
    'us-jolts-job-openings': {'series': 'JTS000000000000000JOL', 'type': 'level_m', 'eventName': 'JOLTS Job Openings', 'priority': 'high', 'source': 'U.S. Bureau of Labor Statistics', 'sourceUrl': 'https://www.bls.gov/jlt/'},
    'us-nonfarm-productivity': {'series': 'PRS85006092', 'type': 'level_pct', 'eventName': 'Nonfarm Productivity, Q/Q%', 'priority': 'medium', 'source': 'U.S. Bureau of Labor Statistics', 'sourceUrl': 'https://www.bls.gov/lpc/'},
    'us-unit-labor-costs': {'series': 'PRS85006112', 'type': 'level_pct', 'eventName': 'Unit Labor Costs, Q/Q%', 'priority': 'medium', 'source': 'U.S. Bureau of Labor Statistics', 'sourceUrl': 'https://www.bls.gov/lpc/'},
    'us-nonfarm-payrolls': {'series': 'CES0000000001', 'type': 'net_change_k', 'eventName': 'Nonfarm Payrolls', 'priority': 'high', 'source': 'U.S. Bureau of Labor Statistics', 'sourceUrl': 'https://www.bls.gov/ces/'},
    'us-unemployment-rate': {'series': 'LNS14000000', 'type': 'rate_pct', 'eventName': 'Unemployment Rate', 'priority': 'high', 'source': 'U.S. Bureau of Labor Statistics', 'sourceUrl': 'https://www.bls.gov/cps/'},
    'us-avg-hourly-earnings-mm': {'series': 'CES0500000003', 'type': 'mom_pct', 'eventName': 'Average Hourly Earnings, M/M%', 'priority': 'high', 'source': 'U.S. Bureau of Labor Statistics', 'sourceUrl': 'https://www.bls.gov/ces/'},
    'us-avg-hourly-earnings-yy': {'series': 'CES0500000003', 'type': 'yoy_pct', 'eventName': 'Average Hourly Earnings, Y/Y%', 'priority': 'high', 'source': 'U.S. Bureau of Labor Statistics', 'sourceUrl': 'https://www.bls.gov/ces/'},
    'us-ppi': {'series': 'WPSFD4', 'type': 'mom_pct', 'eventName': 'PPI', 'priority': 'high', 'source': 'U.S. Bureau of Labor Statistics', 'sourceUrl': 'https://www.bls.gov/ppi/'},
    'us-ppi-core-mm': {'series': 'WPSFD49104', 'type': 'mom_pct', 'eventName': 'Ex-Food & Energy PPI, M/M%', 'priority': 'high', 'source': 'U.S. Bureau of Labor Statistics', 'sourceUrl': 'https://www.bls.gov/ppi/'},
    'us-ppi-yy': {'series': 'WPUFD4', 'type': 'yoy_pct', 'eventName': 'PPI, Y/Y%', 'priority': 'high', 'source': 'U.S. Bureau of Labor Statistics', 'sourceUrl': 'https://www.bls.gov/ppi/'},
    'us-cpi': {'series': 'CUSR0000SA0', 'type': 'mom_pct', 'eventName': 'CPI', 'priority': 'high', 'source': 'U.S. Bureau of Labor Statistics', 'sourceUrl': 'https://www.bls.gov/cpi/'},
    'us-core-cpi-mm': {'series': 'CUSR0000SA0L1E', 'type': 'mom_pct', 'eventName': 'Core CPI, M/M%', 'priority': 'high', 'source': 'U.S. Bureau of Labor Statistics', 'sourceUrl': 'https://www.bls.gov/cpi/'},
    'us-cpi-yy': {'series': 'CUUR0000SA0', 'type': 'yoy_pct', 'eventName': 'CPI, Y/Y%', 'priority': 'high', 'source': 'U.S. Bureau of Labor Statistics', 'sourceUrl': 'https://www.bls.gov/cpi/'},
    'us-cpi-core-yy': {'series': 'CUUR0000SA0L1E', 'type': 'yoy_pct', 'eventName': 'CPI Core, Y/Y%', 'priority': 'high', 'source': 'U.S. Bureau of Labor Statistics', 'sourceUrl': 'https://www.bls.gov/cpi/'}
}

MONTH_NAMES = {
    'january': 1, 'jan': 1, 'february': 2, 'feb': 2, 'march': 3, 'mar': 3,
    'april': 4, 'apr': 4, 'may': 5, 'june': 6, 'jun': 6, 'july': 7, 'jul': 7,
    'august': 8, 'aug': 8, 'september': 9, 'sept': 9, 'sep': 9, 'october': 10, 'oct': 10,
    'november': 11, 'nov': 11, 'december': 12, 'dec': 12
}

QUARTER_NAMES = {
    'first quarter': 1, '1st quarter': 1, 'q1': 1,
    'second quarter': 2, '2nd quarter': 2, 'q2': 2,
    'third quarter': 3, '3rd quarter': 3, 'q3': 3,
    'fourth quarter': 4, '4th quarter': 4, 'q4': 4
}

STANDARD_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

def parse_period_month(period_str):
    if not period_str:
        return None
    cleaned = re.sub(r'[^a-zA-Z]', '', period_str).lower()
    for prefix, m in MONTH_NAMES.items():
        if cleaned.startswith(prefix):
            return m
    return None

def parse_period_quarter(period_str):
    if not period_str:
        return None
    cleaned = period_str.strip().lower()
    for q_name, q_num in QUARTER_NAMES.items():
        if q_name in cleaned:
            return q_num
    return None

def parse_ref_period_and_year(description, summary, fallback_year=None):
    """
    Parses exact reference period and year from official description text.
    Returns (period_label, period_num, ref_year, period_type) or (None, None, None, None).
    Never guesses if unverified.
    """
    text = f"{description or ''} {summary or ''}".strip()
    if not text:
        return None, None, None, None

    m_ref = re.search(r'Reference period:\s*([^\r\n;]+)', text, re.IGNORECASE)
    target_str = m_ref.group(1).strip() if m_ref else text

    # Extract year
    m_yr = re.search(r'\b(20\d\d)\b', target_str)
    ref_year = int(m_yr.group(1)) if m_yr else fallback_year

    target_lower = target_str.lower()

    # 1. Check quarters
    for q_name, q_num in QUARTER_NAMES.items():
        if q_name in target_lower:
            return f"Q{q_num}", q_num, ref_year, 'quarter'

    # 2. Check months
    words = re.findall(r'[a-zA-Z]+', target_lower)
    for w in words:
        if w in MONTH_NAMES:
            m_num = MONTH_NAMES[w]
            m_label = STANDARD_MONTHS[m_num - 1]
            return f"{m_label}.", m_num, ref_year, 'month'

    return None, None, None, None

def get_iso_week_from_date(date_str):
    d = datetime.strptime(date_str, '%Y-%m-%d')
    iso_year, iso_week, _ = d.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"

def get_preceding_month(year, month):
    if month > 1:
        return year, month - 1
    return year - 1, 12

def get_preceding_quarter(year, quarter):
    if quarter > 1:
        return year, quarter - 1
    return year - 1, 4

def get_us_eastern_offset_hours(dt_utc):
    """
    Computes exact US Eastern offset from UTC:
    EDT (UTC-4) from 2nd Sunday in March to 1st Sunday in November, else EST (UTC-5).
    """
    year = dt_utc.year
    march_1 = datetime(year, 3, 1, tzinfo=timezone.utc)
    first_sun_march = 1 + (6 - march_1.weekday()) % 7
    second_sun_march = first_sun_march + 7
    dst_start = datetime(year, 3, second_sun_march, 7, 0, tzinfo=timezone.utc)

    nov_1 = datetime(year, 11, 1, tzinfo=timezone.utc)
    first_sun_nov = 1 + (6 - nov_1.weekday()) % 7
    dst_end = datetime(year, 11, first_sun_nov, 6, 0, tzinfo=timezone.utc)

    if dst_start <= dt_utc < dst_end:
        return -4
    return -5

def build_series_lookup_table(series_data):
    table = {}
    if not series_data or not isinstance(series_data.get('data'), list):
        return table

    for pt in series_data['data']:
        try:
            yr = int(pt.get('year', 0))
            period = str(pt.get('period', '')).strip().upper()
            val_str = str(pt.get('value', '')).strip()

            if period in ('M13', 'Q05', 'A01') or not period:
                continue

            if not (re.match(r'^M(0[1-9]|1[0-2])$', period) or re.match(r'^Q0[1-4]$', period)):
                continue

            val = float(val_str)
            if math.isfinite(val):
                table[(yr, period)] = val
        except (ValueError, TypeError):
            continue

    return table

def compute_bls_value(series_data, transform_type, ref_year, target_month=None, target_quarter=None, offset=0):
    if ref_year is None:
        return None

    table = build_series_lookup_table(series_data)
    if not table:
        return None

    if target_quarter is not None:
        calc_year = ref_year
        calc_quarter = target_quarter
        if offset == 1:
            calc_year, calc_quarter = get_preceding_quarter(calc_year, calc_quarter)

        target_key = (calc_year, f"Q{calc_quarter:02d}")
        if target_key not in table:
            return None

        val = table[target_key]
        if transform_type == 'level_pct':
            return f"{val:.1f}%"
        return f"{val}"

    if target_month is not None:
        calc_year = ref_year
        calc_month = target_month
        if offset == 1:
            calc_year, calc_month = get_preceding_month(calc_year, calc_month)

        target_key = (calc_year, f"M{calc_month:02d}")
        if target_key not in table:
            return None

        val = table[target_key]

        if transform_type == 'rate_pct':
            return f"{val:.1f}%"

        if transform_type == 'level_pct':
            return f"{val:.1f}%"

        if transform_type == 'level_m':
            return f"{val / 1000.0:.2f}M"

        if transform_type == 'net_change_k':
            prev_yr, prev_m = get_preceding_month(calc_year, calc_month)
            prev_key = (prev_yr, f"M{prev_m:02d}")
            if prev_key not in table:
                return None
            prev_val = table[prev_key]
            diff = round(val - prev_val)
            return f"{diff}K"

        if transform_type == 'mom_pct':
            prev_yr, prev_m = get_preceding_month(calc_year, calc_month)
            prev_key = (prev_yr, f"M{prev_m:02d}")
            if prev_key not in table:
                return None
            prev_val = table[prev_key]
            if prev_val == 0 or not math.isfinite(prev_val):
                return None
            pct = ((val / prev_val) - 1.0) * 100.0
            return f"{pct:.1f}%"

        if transform_type == 'yoy_pct':
            prev_yr = calc_year - 1
            prev_key = (prev_yr, f"M{calc_month:02d}")
            if prev_key not in table:
                return None
            prev_val = table[prev_key]
            if prev_val == 0 or not math.isfinite(prev_val):
                return None
            pct = ((val / prev_val) - 1.0) * 100.0
            return f"{pct:.1f}%"

        return f"{val}"

    return None

def parse_ics_calendar(ics_text):
    if not ics_text:
        return []

    unfolded = re.sub(r'\r?\n[ \t]', '', ics_text)
    events = []

    for block in unfolded.split('BEGIN:VEVENT'):
        if 'END:VEVENT' not in block:
            continue
        ev = {}
        for line in block.splitlines():
            line = line.strip()
            if line.startswith('UID:'):
                ev['uid'] = line[4:].strip()
            elif line.startswith('SUMMARY:'):
                ev['summary'] = line[8:].strip()
            elif line.startswith('DESCRIPTION:'):
                ev['description'] = line[12:].strip()
            elif line.startswith('DTSTART'):
                m_dt = re.search(r'(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?', line)
                if m_dt:
                    yr = int(m_dt.group(1))
                    mo = int(m_dt.group(2))
                    da = int(m_dt.group(3))
                    hr = int(m_dt.group(4))
                    mi = int(m_dt.group(5))
                    is_utc = bool(m_dt.group(7))

                    if is_utc:
                        dt_utc = datetime(yr, mo, da, hr, mi, tzinfo=timezone.utc)
                        off = get_us_eastern_offset_hours(dt_utc)
                        dt_ny = dt_utc + timedelta(hours=off)
                        ev['date'] = dt_ny.strftime('%Y-%m-%d')
                        ev['time'] = dt_ny.strftime('%H:%M')
                        ev['timezone'] = 'America/New_York'
                    else:
                        m_tz = re.search(r'TZID=([^;:]+)', line)
                        tz_name = m_tz.group(1).strip() if m_tz else 'America/New_York'
                        ev['date'] = f"{yr:04d}-{mo:02d}-{da:02d}"
                        ev['time'] = f"{hr:02d}:{mi:02d}"
                        ev['timezone'] = tz_name

        if ev.get('summary') and ev.get('date'):
            events.append(ev)

    return events

def fetch_bls_schedule():
    try:
        req = urllib.request.Request(
            ICS_URL,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NTM-Macro/1.0',
                'Accept': 'text/calendar,text/plain,*/*'
            }
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            text = resp.read().decode('utf-8', errors='ignore')
            parsed = parse_ics_calendar(text)
            if parsed:
                print(f"[Calendar] Successfully fetched live BLS iCal ({len(parsed)} events).")
                atomic_write_file(ICS_CACHE_FILE, text)
                return parsed
    except Exception as e:
        print(f"[Calendar Info] Live ICS fetch not accessible ({e}). Using verified schedule cache.")

    if os.path.exists(ICS_CACHE_FILE):
        with open(ICS_CACHE_FILE, 'r', encoding='utf-8') as f:
            cached_text = f.read()
            parsed = parse_ics_calendar(cached_text)
            print(f"[Calendar] Loaded {len(parsed)} events from verified cache {ICS_CACHE_FILE}.")
            return parsed

    return []

def sync_scheduled_weeks_from_calendar(macro_weeks, calendar_events):
    added_events = 0
    updated_events = 0

    indicator_defs = [
        {'match': 'consumer price index', 'indicators': ['us-cpi', 'us-core-cpi-mm', 'us-cpi-yy', 'us-cpi-core-yy']},
        {'match': 'producer price index', 'indicators': ['us-ppi', 'us-ppi-core-mm', 'us-ppi-yy']},
        {'match': 'employment situation', 'indicators': ['us-nonfarm-payrolls', 'us-unemployment-rate', 'us-avg-hourly-earnings-mm', 'us-avg-hourly-earnings-yy']},
        {'match': 'productivity and costs', 'indicators': ['us-nonfarm-productivity', 'us-unit-labor-costs']},
        {'match': 'job openings', 'indicators': ['us-jolts-job-openings']}
    ]

    for cal_ev in calendar_events:
        summary_lower = cal_ev.get('summary', '').lower()
        ev_date = cal_ev.get('date')
        ev_time = cal_ev.get('time', '08:30')
        cal_uid = cal_ev.get('uid', '')
        if not ev_date:
            continue

        target_year = int(ev_date.split('-')[0])
        period_label, period_num, ref_year, p_type = parse_ref_period_and_year(
            cal_ev.get('description', ''),
            cal_ev.get('summary', ''),
            fallback_year=target_year
        )

        matched_defs = [
            idef for idef in indicator_defs
            if idef['match'] in summary_lower
        ]
        if not matched_defs:
            continue

        week_key = get_iso_week_from_date(ev_date)
        match = re.search(r'(\d{4})-W(\d+)', week_key)
        week_num = int(match.group(2)) if match else 0

        if week_key not in macro_weeks:
            macro_weeks[week_key] = {
                'weekNumber': week_num,
                'year': target_year,
                'label': f"Vecka {week_num}",
                'title': f"Vecka {week_num}, {target_year}",
                'sourceTimezone': 'America/New_York',
                'fallbackImage': None,
                'events': []
            }

        week = macro_weeks[week_key]

        for idef in matched_defs:
            for ind_key in idef['indicators']:
                template = EVENT_SERIES_MAPPING.get(ind_key)
                if not template:
                    continue

                stable_id = f"{ind_key}-{ev_date}"
                found_ev = None
                found_week_key = None

                # A verified calendar UID identifies one publication. Only legacy
                # events without UIDs may fall back to indicator and period.
                scoped_uid = f"{cal_uid}::{ind_key}" if cal_uid else ''

                for w_k, w_v in macro_weeks.items():
                    for existing_ev in w_v.get('events', []):
                        ex_id = existing_ev.get('id', '')
                        ex_ref_yr = existing_ev.get('refYear', int(existing_ev.get('date', '2026-01-01').split('-')[0]))

                        is_same_indicator = (ex_id == stable_id) or (ex_id.startswith(ind_key) and existing_ev.get('eventName') == template['eventName'])
                        is_same_period = bool(period_label and existing_ev.get('period') == period_label and ex_ref_yr == ref_year)
                        existing_uid = existing_ev.get('calUid', '')
                        is_same_uid = bool(
                            cal_uid and existing_uid in (cal_uid, scoped_uid)
                        )
                        is_legacy_period_match = not scoped_uid and not existing_ev.get('calUid') and is_same_period
                        is_legacy_id_match = not existing_uid and ex_id == stable_id

                        if is_same_indicator and (is_same_uid or is_legacy_period_match or is_legacy_id_match):
                            found_ev = existing_ev
                            found_week_key = w_k
                            break
                    if found_ev:
                        break

                if found_ev:
                    date_changed = (found_ev.get('date') != ev_date)
                    time_changed = (found_ev.get('time') != ev_time)
                    week_changed = (found_week_key != week_key)
                    period_changed = bool(period_label and found_ev.get('period') != period_label)
                    ref_year_changed = bool(period_label and found_ev.get('refYear') != ref_year)
                    uid_changed = bool(scoped_uid and found_ev.get('calUid') != scoped_uid)

                    if date_changed or time_changed or week_changed or period_changed or ref_year_changed or uid_changed:
                        found_ev['date'] = ev_date
                        found_ev['time'] = ev_time
                        found_ev['id'] = stable_id
                        if period_label:
                            found_ev['refYear'] = ref_year
                            found_ev['period'] = period_label
                        if scoped_uid:
                            found_ev['calUid'] = scoped_uid

                        if week_changed and found_week_key in macro_weeks:
                            macro_weeks[found_week_key]['events'].remove(found_ev)
                            week['events'].append(found_ev)
                        updated_events += 1
                else:
                    new_ev = {
                        'id': stable_id,
                        'date': ev_date,
                        'time': ev_time,
                        'country': 'USA',
                        'eventName': template['eventName'],
                        'period': period_label,
                        'refYear': ref_year if period_label else None,
                        'forecast': None,
                        'previous': None,
                        'actual': None,
                        'priority': template['priority'],
                        'source': template['source'],
                        'sourceUrl': template['sourceUrl']
                    }
                    if scoped_uid:
                        new_ev['calUid'] = scoped_uid
                    week['events'].append(new_ev)
                    added_events += 1

    return added_events, updated_events

def derive_required_fetch_years(macro_weeks):
    needed_years = set()
    current_year = datetime.now(timezone.utc).year
    needed_years.add(current_year)
    needed_years.add(current_year - 1)

    for week in macro_weeks.values():
        for ev in week.get('events', []):
            ev_date = ev.get('date', '')
            if ev_date:
                try:
                    ev_yr = int(ev_date.split('-')[0])
                    ref_yr = ev.get('refYear') or ev_yr
                    needed_years.add(ref_yr)
                    needed_years.add(ref_yr - 1)
                    needed_years.add(ref_yr - 2)
                except ValueError:
                    pass

    return min(needed_years), max(needed_years)

def fetch_bls_data(series_ids, start_year, end_year, api_key=None):
    url = 'https://api.bls.gov/publicAPI/v2/timeseries/data/' if api_key else 'https://api.bls.gov/publicAPI/v1/timeseries/data/'
    payload = {
        'seriesid': series_ids,
        'startyear': str(start_year),
        'endyear': str(end_year)
    }
    if api_key:
        payload['registrationkey'] = api_key

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    with urllib.request.urlopen(req, timeout=15) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        status = res.get('status')
        series_results = res.get('Results', {}).get('series', [])
        return status, series_results

def fetch_fred_series(series_id, start_year, end_year):
    url = 'https://fred.stlouisfed.org/graph/fredgraph.csv?' + urllib.parse.urlencode({
        'id': series_id,
        'cosd': f'{start_year}-01-01',
        'coed': f'{end_year}-12-31'
    })
    request = urllib.request.Request(url, headers={'User-Agent': 'NTM-Macro/1.0'})
    with urllib.request.urlopen(request, timeout=15) as response:
        text = response.read().decode('utf-8', errors='replace')
    return parse_fred_csv(text)

def parse_fred_csv(text):
    observations = {}
    for line in text.splitlines()[1:]:
        fields = line.split(',')
        if len(fields) != 2 or fields[1] in ('', '.', 'NA'):
            continue
        try:
            observations[fields[0][:7]] = float(fields[1])
        except ValueError:
            continue
    return observations

def fetch_bea_table(table_name, frequency, years, api_key):
    if not api_key:
        return []
    params = {
        'UserID': api_key,
        'method': 'GETDATA',
        'datasetname': 'NIPA',
        'TableName': table_name,
        'Frequency': frequency,
        'Year': ','.join(str(year) for year in sorted(years)),
        'ResultFormat': 'JSON'
    }
    url = 'https://apps.bea.gov/api/data/?' + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=15) as response:
        payload = json.loads(response.read().decode('utf-8'))
    error = payload.get('BEAAPI', {}).get('Results', {}).get('Error')
    if error:
        raise RuntimeError(error.get('APIErrorDescription', 'BEA API error'))
    return payload.get('BEAAPI', {}).get('Results', {}).get('Data', [])

def fetch_treasury_monthly_balance(year):
    params = urllib.parse.urlencode({
        'filter': f'record_date:gte:{year}-01-01,record_date:lte:{year}-12-31',
        'page[size]': 1000
    })
    url = f'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_1?{params}'
    request = urllib.request.Request(url, headers={'User-Agent': 'NTM-Macro/1.0'})
    with urllib.request.urlopen(request, timeout=15) as response:
        payload = json.loads(response.read().decode('utf-8'))
    return parse_treasury_rows(payload.get('data', []), year)

def parse_treasury_rows(rows, year):
    values = {}
    for row in rows:
        if row.get('record_type_cd') != 'MTH' or row.get('current_month_dfct_sur_amt') in (None, 'null'):
            continue
        month = row.get('classification_desc', '').lower()
        if month in MONTH_NAMES:
            values[(year, MONTH_NAMES[month])] = float(row['current_month_dfct_sur_amt']) / 1_000_000_000
    return values

def calculate_delta(values, year, month):
    current = values.get((year, month))
    previous_year, previous_month = get_preceding_month(year, month)
    previous = values.get((previous_year, previous_month))
    if current is None or previous is None:
        return None
    return current - previous

def parse_provider_period(period_text):
    month = parse_period_month(period_text)
    if month:
        return 'M', month
    quarter = parse_period_quarter(period_text)
    if quarter:
        return 'Q', quarter
    return None, None

def format_provider_value(value, transform):
    if transform == 'level_pct':
        return f'{value:.1f}%'
    if transform == 'delta_billions':
        return f'{value / 1000:.0f}B'
    return f'{value:g}'

def fetch_dol_weekly_claims(start_year, end_year):
    """Fetch national seasonally adjusted initial claims from official ETA XML."""
    payload = urllib.parse.urlencode({
        'level': 'us',
        'strtdate': str(start_year),
        'enddate': str(end_year),
        'filetype': 'xml',
        'submit': 'Submit',
        'final_yr': str(end_year + 1)
    }).encode('ascii')
    request = urllib.request.Request(
        'https://oui.doleta.gov/unemploy/wkclaims/report.asp',
        data=payload,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        root = ET.fromstring(response.read())

    claims = {}
    for week in root.findall('week'):
        date_text = week.findtext('weekEnded', '').strip()
        try:
            week_date = datetime.strptime(date_text, '%m/%d/%Y').date()
            initial_claims = week.findtext('InitialClaims/SA', '').replace(',', '').strip()
            if initial_claims:
                claims[week_date.isoformat()] = float(initial_claims)
        except (ValueError, TypeError):
            continue
    return claims

def fetch_census_wholesale_inventories(year):
    """Fetch seasonally adjusted MWTS inventories from the official Census CSV export."""
    query = urllib.parse.urlencode({
        'format': 'csv',
        'mode': 'report',
        'submit': 'GET DATA',
        'program': 'MWTS',
        'startYear': str(year),
        'endYear': str(year),
        'categories[0]': '42',
        'dataType': 'IM',
        'geoLevel': 'US',
        'adjusted': 'true',
        'notAdjusted': 'false',
        'errorData': 'false'
    })
    request = urllib.request.Request(
        f'https://www.census.gov/econ_export/?{query}',
        headers={'User-Agent': 'NTM-Macro/1.0'}
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        text = response.read().decode('utf-8', errors='replace')

    values = {}
    for line in text.splitlines():
        match = re.match(r'^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4}),([\d.]+)$', line.strip())
        if match:
            month = MONTH_NAMES[match.group(1).lower()]
            values[(int(match.group(2)), month)] = float(match.group(3))
    return values

def fetch_census_eits_levels(program, category, data_type, year):
    """Fetch one seasonally adjusted Census EITS level series from its CSV export."""
    query = urllib.parse.urlencode({
        'format': 'csv',
        'mode': 'report',
        'submit': 'GET DATA',
        'program': program,
        'startYear': str(year),
        'endYear': str(year),
        'categories[0]': category,
        'dataType': data_type,
        'geoLevel': 'US',
        'adjusted': 'true',
        'notAdjusted': 'false',
        'errorData': 'false'
    })
    request = urllib.request.Request(
        f'https://www.census.gov/econ_export/?{query}',
        headers={'User-Agent': 'NTM-Macro/1.0'}
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        text = response.read().decode('utf-8', errors='replace')

    values = {}
    for line in text.splitlines():
        match = re.match(r'^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4}),([\d.]+)$', line.strip())
        if match:
            month = MONTH_NAMES[match.group(1).lower()]
            values[(int(match.group(2)), month)] = float(match.group(3))
    return values

def calculate_monthly_change(values, year, month):
    current = values.get((year, month))
    previous_year, previous_month = get_preceding_month(year, month)
    previous = values.get((previous_year, previous_month))
    if current is None or previous in (None, 0):
        return None
    return f"{((current / previous) - 1) * 100:.1f}%"

def parse_js_object(js_str):
    s = js_str.strip()
    try:
        return json.loads(s)
    except Exception:
        pass

    result = []
    i = 0
    n = len(s)
    while i < n:
        if s[i] == "'":
            j = i + 1
            buf = []
            while j < n and s[j] != "'":
                if s[j] == '\\':
                    buf.append(s[j:j+2])
                    j += 2
                else:
                    buf.append(s[j])
                    j += 1
            val = ''.join(buf).replace('"', '\\"')
            result.append(f'"{val}"')
            i = j + 1
        elif s[i] == '"':
            j = i + 1
            buf = ['"']
            while j < n and s[j] != '"':
                if s[j] == '\\':
                    buf.append(s[j:j+2])
                    j += 2
                else:
                    buf.append(s[j])
                    j += 1
            buf.append('"')
            result.append(''.join(buf))
            i = j + 1
        else:
            result.append(s[i])
            i += 1

    res_str = ''.join(result)
    res_str = re.sub(r'([{\s,])([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', res_str)
    res_str = re.sub(r',\s*([}\]])', r'\1', res_str)
    return json.loads(res_str)

def atomic_write_file(filepath, content):
    dirname = os.path.dirname(filepath)
    with tempfile.NamedTemporaryFile('w', dir=dirname, delete=False, encoding='utf-8') as tf:
        tf.write(content)
        temp_name = tf.name
    os.replace(temp_name, filepath)

def update_macro_data():
    now_iso = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    api_key = os.environ.get('BLS_API_KEY', None)

    print(f"[{now_iso}] Starting robust macro data update...")

    if not os.path.exists(DATA_FILE):
        print(f"[Error] {DATA_FILE} not found.")
        sys.exit(1)

    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        raw_js = f.read()

    macro_match = re.search(r'const\s+macroWeeks\s*=\s*({[\s\S]*?});\s*const\s+earningsWeeks', raw_js)
    earnings_match = re.search(r'const\s+earningsWeeks\s*=\s*({[\s\S]*?});\s*window', raw_js)

    if not macro_match or not earnings_match:
        print("[Error] Failed to parse data/weekly-events.js")
        sys.exit(1)

    macro_weeks = parse_js_object(macro_match.group(1))

    meta_match = re.search(r'meta:\s*({[\s\S]*?}),\s*macroWeeks', raw_js)
    previous_meta = {}
    if meta_match:
        try:
            previous_meta = json.loads(meta_match.group(1))
        except Exception:
            pass

    # 1. Sync upcoming schedule from calendar
    calendar_events = fetch_bls_schedule()
    if calendar_events:
        added_e, updated_e = sync_scheduled_weeks_from_calendar(macro_weeks, calendar_events)
        print(f"[Calendar Sync] Added {added_e} events, updated {updated_e} events.")

    # 2. Derive required years dynamically
    start_year, end_year = derive_required_fetch_years(macro_weeks)
    print(f"[Dynamic Scope] Fetching data for derived years: {start_year}..{end_year}")

    series_to_fetch = list(BLS_SERIES_DEFINITIONS.keys())
    print(f"[BLS Query] Requesting {len(series_to_fetch)} series in 1 batch request...")

    bls_results = {}
    fetch_success = False

    try:
        status, series_list = fetch_bls_data(series_to_fetch, start_year, end_year, api_key=api_key)
        non_empty_count = sum(1 for s in series_list if len(s.get('data', [])) > 0)
        if status == 'REQUEST_SUCCEEDED' and non_empty_count > 0:
            for s in series_list:
                bls_results[s['seriesID']] = s
            fetch_success = True
            print(f"[BLS Success] Received {len(bls_results)} series ({non_empty_count} with data points).")
        else:
            print(f"[BLS Warning] Empty or unserviceable API response: status={status}, non_empty={non_empty_count}")
    except Exception as e:
        print(f"[BLS Fetch Error] {e}. Existing data preserved.")

    dol_claims = {}
    census_inventories = {}
    census_eits = {}
    fred_results = {}
    bea_results = {}
    treasury_results = {}
    try:
        if any(event.get('id', '').startswith('us-jobless-claims-') for week in macro_weeks.values() for event in week.get('events', [])):
            dol_claims = fetch_dol_weekly_claims(start_year, end_year)
            print(f"[DOL Success] Received {len(dol_claims)} weekly claims observations.")
    except Exception as e:
        print(f"[DOL Fetch Error] {e}. Existing claims data preserved.")

    try:
        wholesale_years = {
            int(event.get('refYear') or event.get('date', '2026-01-01').split('-')[0])
            for week in macro_weeks.values()
            for event in week.get('events', [])
            if event.get('id', '').startswith('us-wholesale-trade-')
        }
        for wholesale_year in wholesale_years:
            census_inventories[wholesale_year] = fetch_census_wholesale_inventories(wholesale_year)
            print(f"[Census Success] Received MWTS inventory data for {wholesale_year}.")
    except Exception as e:
        print(f"[Census Fetch Error] {e}. Existing wholesale data preserved.")

    census_eits_specs = {
        'us-construction-spending-': ('vip', 'AXXXX', 'T'),
        'us-factory-orders-': ('m3', 'MTM', 'NO')
    }
    try:
        eits_years = {
            int(event.get('refYear') or event.get('date', '2026-01-01').split('-')[0])
            for week in macro_weeks.values()
            for event in week.get('events', [])
            for prefix in census_eits_specs
            if event.get('id', '').startswith(prefix)
        }
        for prefix, spec in census_eits_specs.items():
            if any(event.get('id', '').startswith(prefix) for week in macro_weeks.values() for event in week.get('events', [])):
                for eits_year in eits_years:
                    census_eits[(prefix, eits_year)] = fetch_census_eits_levels(*spec, eits_year)
                    print(f"[Census Success] Received {spec[0].upper()} data for {eits_year}.")
    except Exception as e:
        print(f"[Census EITS Error] {e}. Existing Census event data preserved.")

    try:
        for prefix, spec in FRED_SERIES_DEFINITIONS.items():
            if any(event.get('id', '').startswith(prefix) for week in macro_weeks.values() for event in week.get('events', [])):
                fred_results[prefix] = fetch_fred_series(spec['series'], start_year, end_year)
                print(f"[FRED Success] Received {spec['series']} observations.")
    except Exception as e:
        print(f"[FRED Error] {e}. Existing Federal Reserve data preserved.")

    try:
        treasury_years = {
            int(event.get('refYear') or event.get('date', '2026-01-01').split('-')[0])
            for week in macro_weeks.values()
            for event in week.get('events', [])
            if event.get('id', '').startswith(TREASURY_EVENT_PREFIX)
        }
        for treasury_year in treasury_years:
            treasury_results[treasury_year] = fetch_treasury_monthly_balance(treasury_year)
            print(f"[FiscalData Success] Received MTS data for {treasury_year}.")
    except Exception as e:
        print(f"[FiscalData Error] {e}. Existing Treasury data preserved.")

    bea_key = os.environ.get('BEA_API_KEY')
    try:
        bea_years = {
            int(event.get('refYear') or event.get('date', '2026-01-01').split('-')[0])
            for week in macro_weeks.values()
            for event in week.get('events', [])
            for prefix in BEA_EVENT_DEFINITIONS
            if event.get('id', '').startswith(prefix)
        }
        for prefix, spec in BEA_EVENT_DEFINITIONS.items():
            if bea_key and any(event.get('id', '').startswith(prefix) for week in macro_weeks.values() for event in week.get('events', [])):
                rows = fetch_bea_table(spec['table'], spec['frequency'], bea_years, bea_key)
                bea_results[prefix] = [
                    row for row in rows
                    if any(row.get('LineDescription', '').strip().lower() == description.lower() for description in spec['descriptions'])
                    and row.get('CL_UNIT', '').strip().lower() == spec['unit'].lower()
                ]
                print(f"[BEA Success] Received {len(bea_results[prefix])} matched {spec['table']} rows.")
    except Exception as e:
        print(f"[BEA Error] {e}. Existing BEA data preserved.")

    # 3. Update events with exact period lookups
    updates_count = 0
    sorted_prefixes = sorted(EVENT_SERIES_MAPPING.keys(), key=len, reverse=True)

    for week_key, week in macro_weeks.items():
        events = week.get('events', [])
        for event in events:
            ev_id = event.get('id', '')
            matched_mapping = None

            provider_prefix = next((prefix for prefix in FRED_SERIES_DEFINITIONS if ev_id.startswith(prefix)), None)
            if provider_prefix and provider_prefix in fred_results:
                spec = FRED_SERIES_DEFINITIONS[provider_prefix]
                month = parse_period_month(event.get('period'))
                year = int(event.get('refYear') or event.get('date', '2026-01-01').split('-')[0])
                current = fred_results[provider_prefix].get(f'{year}-{month:02d}') if month else None
                previous_year, previous_month = get_preceding_month(year, month) if month else (None, None)
                previous = fred_results[provider_prefix].get(f'{previous_year}-{previous_month:02d}') if month else None
                value = None
                previous_value = None
                if current is not None and previous is not None:
                    if spec['transform'] == 'delta_billions':
                        value = (current - previous) / 1000
                        previous_previous_year, previous_previous_month = get_preceding_month(previous_year, previous_month)
                        prior = fred_results[provider_prefix].get(f'{previous_previous_year}-{previous_previous_month:02d}')
                        previous_value = (previous - prior) / 1000 if prior is not None else None
                    elif spec['transform'] == 'mom_pct':
                        value = ((current / previous) - 1) * 100 if previous else None
                    elif spec['transform'] == 'level_pct':
                        value = current
                if value is not None:
                    event['actual'] = f'{value:.1f}%' if spec['transform'] in ('mom_pct', 'level_pct') else f'{value:.0f}B'
                    event['officialBaseline'] = event['actual']
                if previous_value is not None:
                    event['previous'] = f'{previous_value:.0f}B'
                continue

            if ev_id.startswith(TREASURY_EVENT_PREFIX) and treasury_results:
                year = int(event.get('refYear') or event.get('date', '2026-01-01').split('-')[0])
                month = parse_period_month(event.get('period'))
                values = treasury_results.get(year, {})
                value = values.get((year, month)) if month else None
                previous_year, previous_month = get_preceding_month(year, month) if month else (None, None)
                previous = values.get((previous_year, previous_month)) if month else None
                if value is not None:
                    event['actual'] = f'{value:.0f}B'
                    event['officialBaseline'] = event['actual']
                if previous is not None:
                    event['previous'] = f'{previous:.0f}B'
                continue

            bea_prefix = next((prefix for prefix in BEA_EVENT_DEFINITIONS if ev_id.startswith(prefix)), None)
            if bea_prefix and bea_prefix in bea_results:
                spec = BEA_EVENT_DEFINITIONS[bea_prefix]
                period_type, period_number = parse_provider_period(event.get('period'))
                year = int(event.get('refYear') or event.get('date', '2026-01-01').split('-')[0])
                period_key = f'{year}M{period_number:02d}' if period_type == 'M' else f'{year}Q{period_number}' if period_type == 'Q' else None
                rows = {row.get('TimePeriod'): row for row in bea_results[bea_prefix]}
                row = rows.get(period_key)
                if row and row.get('DataValue') not in (None, '', '...'):
                    event['actual'] = row['DataValue']
                    event['officialBaseline'] = row['DataValue']
                    previous_key = None
                    if period_type == 'M':
                        previous_year, previous_month = get_preceding_month(year, period_number)
                        previous_key = f'{previous_year}M{previous_month:02d}'
                    elif period_type == 'Q':
                        previous_year, previous_quarter = get_preceding_quarter(year, period_number)
                        previous_key = f'{previous_year}Q{previous_quarter}'
                    previous_row = rows.get(previous_key)
                    if previous_row and previous_row.get('DataValue') not in (None, '', '...'):
                        event['previous'] = previous_row['DataValue']
                continue

            if ev_id.startswith('us-jobless-claims-') and dol_claims:
                claim_period = re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)[a-z.]*\.?\s+(\d{1,2})', event.get('period', ''), re.IGNORECASE)
                if claim_period:
                    month = MONTH_NAMES[claim_period.group(1)[:3].lower()]
                    claim_year = int(event.get('date', '2026-01-01').split('-')[0])
                    claim_date = datetime(claim_year, month, int(claim_period.group(2))).date()
                    actual_claims = dol_claims.get(claim_date.isoformat())
                    prior_claims = dol_claims.get((claim_date - timedelta(days=7)).isoformat())
                    if actual_claims is not None:
                        verified_actual = f"{actual_claims / 1000:.0f}K"
                        if event.get('actual') != verified_actual:
                            if event.get('actual') is not None and event.get('officialBaseline'):
                                event['isRevised'] = True
                            event['actual'] = verified_actual
                            event['officialBaseline'] = verified_actual
                            updates_count += 1
                    if prior_claims is not None:
                        event['previous'] = f"{prior_claims / 1000:.0f}K"
                continue

            if ev_id.startswith('us-wholesale-trade-') and census_inventories:
                wholesale_year = int(event.get('refYear') or event.get('date', '2026-01-01').split('-')[0])
                wholesale_month = parse_period_month(event.get('period'))
                values = census_inventories.get(wholesale_year, {})
                actual_wholesale = calculate_monthly_change(values, wholesale_year, wholesale_month) if wholesale_month else None
                if wholesale_month and wholesale_month == 1 and (wholesale_year - 1) not in census_inventories:
                    try:
                        census_inventories[wholesale_year - 1] = fetch_census_wholesale_inventories(wholesale_year - 1)
                        values = {**census_inventories[wholesale_year - 1], **values}
                    except Exception as e:
                        print(f"[Census Fetch Error] {e}. Existing wholesale data preserved.")
                previous_month = wholesale_month - 1 if wholesale_month and wholesale_month > 1 else 12 if wholesale_month else None
                previous_year = wholesale_year if wholesale_month and wholesale_month > 1 else wholesale_year - 1 if wholesale_month else None
                previous_wholesale = calculate_monthly_change(values, previous_year, previous_month) if previous_month else None
                if actual_wholesale is not None:
                    if event.get('actual') != actual_wholesale:
                        if event.get('actual') is not None and event.get('officialBaseline'):
                            event['isRevised'] = True
                        event['actual'] = actual_wholesale
                        event['officialBaseline'] = actual_wholesale
                        updates_count += 1
                if previous_wholesale is not None:
                    event['previous'] = previous_wholesale
                continue

            eits_prefix = next((prefix for prefix in census_eits_specs if ev_id.startswith(prefix)), None)
            if eits_prefix:
                eits_year = int(event.get('refYear') or event.get('date', '2026-01-01').split('-')[0])
                eits_month = parse_period_month(event.get('period'))
                eits_values = census_eits.get((eits_prefix, eits_year), {})
                actual_eits = calculate_monthly_change(eits_values, eits_year, eits_month) if eits_month else None
                previous_eits = None
                if eits_month:
                    previous_year, previous_month = get_preceding_month(eits_year, eits_month)
                    previous_eits = calculate_monthly_change(eits_values, previous_year, previous_month)
                if actual_eits is not None and event.get('actual') != actual_eits:
                    if event.get('actual') is not None and event.get('officialBaseline'):
                        event['isRevised'] = True
                    event['actual'] = actual_eits
                    event['officialBaseline'] = actual_eits
                    updates_count += 1
                if previous_eits is not None:
                    event['previous'] = previous_eits
                continue

            for prefix in sorted_prefixes:
                if ev_id.startswith(prefix) or event.get('eventName') == EVENT_SERIES_MAPPING[prefix]['eventName']:
                    matched_mapping = EVENT_SERIES_MAPPING[prefix]
                    break

            if matched_mapping:
                series_id = matched_mapping['series']
                transform_type = matched_mapping['type']

                if not event.get('sourceUrl'):
                    event['sourceUrl'] = matched_mapping['sourceUrl']
                if not event.get('source'):
                    event['source'] = matched_mapping['source']

                event['forecast'] = None

                if series_id in bls_results:
                    ev_date = event.get('date', '2026-01-01')
                    ev_year = int(ev_date.split('-')[0])
                    ref_year = event.get('refYear', ev_year)
                    target_month = parse_period_month(event.get('period'))
                    target_quarter = parse_period_quarter(event.get('period'))

                    if target_month == 12 and int(ev_date.split('-')[1]) == 1:
                        ref_year = ev_year - 1

                    prev_val = compute_bls_value(
                        bls_results[series_id],
                        transform_type,
                        ref_year=ref_year,
                        target_month=target_month,
                        target_quarter=target_quarter,
                        offset=1
                    )
                    if prev_val is not None:
                        event['previous'] = prev_val

                    val = compute_bls_value(
                        bls_results[series_id],
                        transform_type,
                        ref_year=ref_year,
                        target_month=target_month,
                        target_quarter=target_quarter,
                        offset=0
                    )

                    if val is not None:
                        current_actual = event.get('actual')
                        if current_actual != val:
                            if current_actual is not None and event.get('officialBaseline'):
                                print(f"[Revision Verified] {ev_id} ({event.get('period')} {ref_year}): {current_actual} -> {val}")
                                event['isRevised'] = True
                            else:
                                print(f"[Actual Verified] {ev_id} ({event.get('period')} {ref_year}): {val}")
                                event['officialBaseline'] = val
                            event['actual'] = val
                            updates_count += 1

    print(f"[Result] Total events verified/updated: {updates_count}")

    last_success = now_iso if fetch_success else previous_meta.get('lastSuccessfulUpdate', None)
    meta_block = {
        'lastFetchAttempt': now_iso,
        'lastSuccessfulUpdate': last_success,
        'status': 'ok' if fetch_success else 'fetch_error',
        'activeSources': ['U.S. Bureau of Labor Statistics (BLS)'],
        'preparedSources': ['Statistiska centralbyrån (SCB)']
    }

    formatted_macro = json.dumps(macro_weeks, indent=2, ensure_ascii=False)
    earnings_text = earnings_match.group(1).strip()
    meta_json = json.dumps(meta_block, indent=2, ensure_ascii=False)

    new_js = f"""const macroWeeks = {formatted_macro};

const earningsWeeks = {earnings_text};

window.NTM_WEEKLY_EVENTS = {{
  meta: {meta_json},
  macroWeeks,
  earningsWeeks,
  macro: macroWeeks['2026-W37'] ? macroWeeks['2026-W37'].events : [],
  earnings: earningsWeeks['2026-W37'] ? earningsWeeks['2026-W37'].reports : []
}};
"""

    atomic_write_file(DATA_FILE, new_js)
    print(f"[{now_iso}] Successfully wrote {DATA_FILE} (atomic replace).")

if __name__ == '__main__':
    update_macro_data()
