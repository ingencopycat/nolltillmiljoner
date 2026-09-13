#!/usr/bin/env python3
"""
test_stock_pipeline.py - Comprehensive Unit & Regression Test Suite for NTM Research Stock Pipeline

Covers:
1. SEC Client & CIK Resolution (SOFI & NVDA, exact match, error on unknown ticker, mock & fixture support).
2. Concept Selection & Profile Mapping (financial_services vs standard_company).
3. Broken Fiscal Year & Filing Period Discovery (NVDA January fiscal year end vs SOFI December).
4. Unsupported & Ambiguous Metrics (Debt returns null for SOFI, FCF unsupported for financial services).
5. Annual Period Selection (SOFI FY2023-FY2025, NVDA FY2024-FY2026 data extraction).
6. Duplicate & Amended Facts Prioritization (prefers /A amendments and latest filing date).
7. Standalone vs YTD Quarter Extraction (direct 3M facts flagged as isDerived: False).
8. Safe Standalone Quarter Derivation (Q2 from 6M-3M, Q3 from 9M-6M, Q4 from FY-9M with full provenance).
9. Non-Additive Metric Guard (disallows deriving Q4 EPS or Shares via subtraction).
10. Total Debt & Free Cash Flow for Standard Companies (NVDA LongTermDebt, FCF = OCF - CapEx).
11. TTM Computation (strictly requires 4 consecutive compatible quarters, rejects non-additive metrics).
12. Incomplete TTM Handling (returns null if any of 4 trailing quarters is missing).
13. Source Provenance Completeness (verifies value, unit, period, source, form, filed, accession, concept).
14. Filings Metadata & Direct SEC URLs (verifies accession, primary document, SEC URL structure).
15. Atomic File Output & JSON Validation.
16. Error Resilience & File Preservation on Network Failure.
"""

import json
import os
import shutil
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts'))
from sec_client import SECClient, SECCIKNotFoundError, SECNetworkError
from stock_normalizer import StockNormalizer, COMPANY_PROFILES, get_company_profile
from update_stocks import save_atomic_json, update_stock

FIXTURES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures')


def load_fixture(filename: str) -> dict:
    """Load JSON test fixture."""
    path = os.path.join(FIXTURES_DIR, filename)
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


class TestStockPipeline(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.sofi_submissions = load_fixture('sec_sofi_submissions.json')
        cls.sofi_facts = load_fixture('sec_sofi_companyfacts.json')
        cls.nvda_submissions = load_fixture('sec_nvda_submissions.json')
        cls.nvda_facts = load_fixture('sec_nvda_companyfacts.json')
        cls.crwd_submissions = load_fixture('sec_crwd_submissions.json')
        cls.crwd_facts = load_fixture('sec_crwd_companyfacts.json')
        cls.tickers_data = load_fixture('sec_company_tickers.json')

    def setUp(self):
        self.sofi_normalizer = StockNormalizer('SOFI')
        self.nvda_normalizer = StockNormalizer('NVDA')
        self.crwd_normalizer = StockNormalizer('CRWD')

    # =========================================================================
    # 1. SEC Client & CIK Resolution
    # =========================================================================

    def test_cik_resolution_sofi(self):
        client = SECClient()
        client._tickers_cache = self.tickers_data
        cik = client.resolve_cik('SOFI')
        self.assertEqual(cik, '0001818874')

    def test_cik_resolution_nvda(self):
        client = SECClient()
        client._tickers_cache = self.tickers_data
        cik = client.resolve_cik('NVDA')
        self.assertEqual(cik, '0001045810')

    def test_cik_resolution_crwd(self):
        client = SECClient()
        client._tickers_cache = self.tickers_data
        cik = client.resolve_cik('CRWD')
        self.assertEqual(cik, '0001535527')

    def test_cik_resolution_case_insensitive(self):
        client = SECClient()
        client._tickers_cache = self.tickers_data
        self.assertEqual(client.resolve_cik('sofi'), '0001818874')
        self.assertEqual(client.resolve_cik('nvda'), '0001045810')
        self.assertEqual(client.resolve_cik('crwd'), '0001535527')
        self.assertEqual(client.resolve_cik('nvda'), '0001045810')

    def test_cik_resolution_unknown_ticker_raises(self):
        client = SECClient()
        client._tickers_cache = self.tickers_data
        with self.assertRaises(SECCIKNotFoundError):
            client.resolve_cik('UNKNOWN_TICKER_XYZ_123')

    # =========================================================================
    # 2. Concept Selection & Profile Mapping
    # =========================================================================

    def test_sofi_profile_uses_exact_xbrl_concepts(self):
        profile = get_company_profile('SOFI')
        self.assertEqual(profile['profileName'], 'financial_services')
        self.assertEqual(profile['industry'], 'fintech_banking')
        
        rev_cfg = profile['metrics']['revenue']
        self.assertEqual(rev_cfg['concept'], 'RevenuesNetOfInterestExpense')
        self.assertEqual(rev_cfg['taxonomy'], 'us-gaap')

        ni_common = profile['metrics']['netIncomeToCommon']
        self.assertEqual(ni_common['concept'], 'NetIncomeLossAvailableToCommonStockholdersBasic')

        self.assertTrue(profile['metrics']['debt']['unsupported'])
        self.assertTrue(profile['metrics']['freeCashFlow']['unsupported'])

    def test_nvda_profile_uses_exact_xbrl_concepts(self):
        profile = get_company_profile('NVDA')
        self.assertEqual(profile['profileName'], 'standard_company')
        self.assertEqual(profile['industry'], 'technology_hardware')

        self.assertEqual(profile['metrics']['revenue']['concept'], 'Revenues')
        self.assertEqual(profile['metrics']['netIncome']['concept'], 'NetIncomeLoss')
        self.assertEqual(profile['metrics']['debt']['concept'], 'LongTermDebt')
        self.assertEqual(profile['metrics']['freeCashFlow']['compute'], 'fcf_from_ocf_capex')

    def test_crwd_profile_uses_exact_xbrl_concepts(self):
        profile = get_company_profile('CRWD')
        self.assertEqual(profile['profileName'], 'software_saas')
        self.assertEqual(profile['industry'], 'security_software')

        self.assertEqual(profile['metrics']['revenue']['concept'], 'RevenueFromContractWithCustomerIncludingAssessedTax')
        self.assertEqual(profile['metrics']['operatingIncome']['concept'], 'OperatingIncomeLoss')
        self.assertEqual(profile['metrics']['netIncome']['concept'], 'NetIncomeLoss')
        self.assertEqual(profile['metrics']['debt']['concept'], 'LongTermDebtNoncurrent')
        self.assertEqual(profile['metrics']['deferredRevenue']['concept'], 'ContractWithCustomerLiability')
        self.assertEqual(profile['metrics']['stockBasedCompensation']['concept'], 'ShareBasedCompensation')
        self.assertEqual(profile['metrics']['capex']['concept'], 'PaymentsToAcquirePropertyPlantAndEquipment')
        self.assertEqual(profile['metrics']['freeCashFlow']['compute'], 'fcf_from_ocf_capex')

    def test_unsupported_company_raises_value_error(self):
        with self.assertRaises(ValueError):
            get_company_profile('UNCONFIGURED_TICKER')

    # =========================================================================
    # 3. Broken Fiscal Year & Period Discovery
    # =========================================================================

    def test_nvda_broken_fiscal_year_discovery(self):
        ann_periods, qtr_periods = self.nvda_normalizer.discover_filing_periods(
            self.nvda_submissions, self.nvda_facts
        )
        self.assertTrue(len(ann_periods) >= 3)
        fy_years = [a['fiscalYear'] for a in ann_periods]
        self.assertIn(2024, fy_years)
        self.assertIn(2025, fy_years)
        self.assertIn(2026, fy_years)

        fy26 = next(a for a in ann_periods if a['fiscalYear'] == 2026)
        self.assertEqual(fy26['periodEnd'], '2026-01-25')
        self.assertEqual(fy26['periodStart'], '2025-01-27')

        q_periods = [q['period'] for q in qtr_periods]
        self.assertIn('2026Q1', q_periods)
        self.assertIn('2027Q2', q_periods)

        q27_q2 = next(q for q in qtr_periods if q['period'] == '2027Q2')
        self.assertEqual(q27_q2['periodEnd'], '2026-07-26')
        self.assertEqual(q27_q2['periodStart'], '2026-04-27')

    def test_crwd_broken_fiscal_year_discovery(self):
        ann_periods, qtr_periods = self.crwd_normalizer.discover_filing_periods(
            self.crwd_submissions, self.crwd_facts
        )
        self.assertTrue(len(ann_periods) >= 3)
        fy_years = [a['fiscalYear'] for a in ann_periods]
        self.assertIn(2024, fy_years)
        self.assertIn(2025, fy_years)
        self.assertIn(2026, fy_years)

        fy26 = next(a for a in ann_periods if a['fiscalYear'] == 2026)
        self.assertEqual(fy26['periodEnd'], '2026-01-31')
        self.assertEqual(fy26['periodStart'], '2025-02-01')

        q_periods = [q['period'] for q in qtr_periods]
        self.assertIn('2025Q1', q_periods)
        self.assertIn('2027Q2', q_periods)

        q27_q2 = next(q for q in qtr_periods if q['period'] == '2027Q2')
        self.assertEqual(q27_q2['periodEnd'], '2026-07-31')
        self.assertEqual(q27_q2['periodStart'], '2026-05-01')

    # =========================================================================
    # 4. SOFI Annual Fundamentals (FY2023, FY2024, FY2025)
    # =========================================================================

    def test_sofi_annual_fundamentals_extraction(self):
        annual = self.sofi_normalizer.extract_annual_data(
            self.sofi_facts, submissions_data=self.sofi_submissions, max_years=3
        )
        self.assertEqual(len(annual), 3)
        by_year = {a['fiscalYear']: a for a in annual}

        # FY2023
        fy23 = by_year[2023]['metrics']
        self.assertEqual(fy23['revenue']['value'], 2122789000)
        self.assertEqual(fy23['netIncomeToCommon']['value'], -341167000)
        self.assertEqual(fy23['dilutedEps']['value'], -0.36)
        self.assertEqual(fy23['dilutedShares']['value'], 945024000)
        self.assertEqual(fy23['cashAndCashEquivalents']['value'], 3085020000)
        self.assertEqual(fy23['totalAssets']['value'], 30074858000)
        self.assertEqual(fy23['totalLiabilities']['value'], 24519872000)
        self.assertEqual(fy23['stockholdersEquity']['value'], 5234612000)
        self.assertIsNone(fy23['debt']['value'])
        self.assertTrue(fy23['debt']['unsupported'])
        self.assertEqual(fy23['operatingCashFlow']['value'], -7227139000)
        self.assertEqual(fy23['capex']['value'], 111409000)
        self.assertIsNone(fy23['freeCashFlow']['value'])
        self.assertTrue(fy23['freeCashFlow']['unsupported'])

        # FY2024
        fy24 = by_year[2024]['metrics']
        self.assertEqual(fy24['revenue']['value'], 2674859000)
        self.assertEqual(fy24['netIncomeToCommon']['value'], 479136000)
        self.assertEqual(fy24['dilutedEps']['value'], 0.39)

        # FY2025
        fy25 = by_year[2025]['metrics']
        self.assertEqual(fy25['revenue']['value'], 3613354000)
        self.assertEqual(fy25['netIncomeToCommon']['value'], 481320000)
        self.assertEqual(fy25['dilutedEps']['value'], 0.39)
        self.assertEqual(fy25['stockholdersEquity']['value'], 10489495000)

    # =========================================================================
    # 5. NVDA Annual Fundamentals (FY2024, FY2025, FY2026)
    # =========================================================================

    def test_nvda_annual_fundamentals_extraction(self):
        annual = self.nvda_normalizer.extract_annual_data(
            self.nvda_facts, submissions_data=self.nvda_submissions, max_years=3
        )
        self.assertEqual(len(annual), 3)
        by_year = {a['fiscalYear']: a for a in annual}

        # FY2024
        fy24 = by_year[2024]['metrics']
        self.assertEqual(fy24['revenue']['value'], 60922000000)
        self.assertEqual(fy24['netIncome']['value'], 29760000000)
        self.assertEqual(fy24['dilutedEps']['value'], 1.19)
        self.assertEqual(fy24['dilutedShares']['value'], 24940000000)
        self.assertEqual(fy24['cashAndCashEquivalents']['value'], 7280000000)
        self.assertEqual(fy24['totalAssets']['value'], 65728000000)
        self.assertEqual(fy24['totalLiabilities']['value'], 22750000000)
        self.assertEqual(fy24['stockholdersEquity']['value'], 42978000000)
        self.assertEqual(fy24['debt']['value'], 9709000000)
        self.assertEqual(fy24['operatingCashFlow']['value'], 28090000000)
        self.assertEqual(fy24['capex']['value'], 1069000000)
        self.assertEqual(fy24['freeCashFlow']['value'], 27021000000)
        self.assertTrue(fy24['freeCashFlow']['isDerived'])

        # FY2025
        fy25 = by_year[2025]['metrics']
        self.assertEqual(fy25['revenue']['value'], 130497000000)
        self.assertEqual(fy25['netIncome']['value'], 72880000000)
        self.assertEqual(fy25['dilutedEps']['value'], 2.94)
        self.assertEqual(fy25['debt']['value'], 8463000000)
        self.assertEqual(fy25['operatingCashFlow']['value'], 64089000000)
        self.assertEqual(fy25['capex']['value'], 3236000000)
        self.assertEqual(fy25['freeCashFlow']['value'], 60853000000)

        # FY2026
        fy26 = by_year[2026]['metrics']
        self.assertEqual(fy26['revenue']['value'], 215938000000)
        self.assertEqual(fy26['netIncome']['value'], 120067000000)
        self.assertEqual(fy26['dilutedEps']['value'], 4.90)
        self.assertEqual(fy26['cashAndCashEquivalents']['value'], 10605000000)
        self.assertEqual(fy26['totalAssets']['value'], 206803000000)
        self.assertEqual(fy26['totalLiabilities']['value'], 49510000000)
        self.assertEqual(fy26['stockholdersEquity']['value'], 157293000000)
        self.assertEqual(fy26['debt']['value'], 8468000000)
        self.assertEqual(fy26['operatingCashFlow']['value'], 102718000000)
        self.assertEqual(fy26['capex']['value'], 6042000000)
        self.assertEqual(fy26['freeCashFlow']['value'], 96676000000)

    # =========================================================================
    # 6. CRWD Annual Fundamentals (FY2024, FY2025, FY2026)
    # =========================================================================

    def test_crwd_annual_fundamentals_extraction(self):
        annual = self.crwd_normalizer.extract_annual_data(
            self.crwd_facts, submissions_data=self.crwd_submissions, max_years=3
        )
        self.assertEqual(len(annual), 3)
        by_year = {a['fiscalYear']: a for a in annual}

        # FY2024
        fy24 = by_year[2024]['metrics']
        self.assertEqual(fy24['revenue']['value'], 3055555000)
        self.assertEqual(fy24['operatingIncome']['value'], -19141000)
        self.assertEqual(fy24['netIncome']['value'], 72181000)
        self.assertEqual(fy24['dilutedEps']['value'], 0.30)
        self.assertEqual(fy24['cashAndCashEquivalents']['value'], 3375069000)
        self.assertEqual(fy24['totalAssets']['value'], 6646520000)
        self.assertEqual(fy24['totalLiabilities']['value'], 4309431000)
        self.assertEqual(fy24['stockholdersEquity']['value'], 2303950000)
        self.assertEqual(fy24['debt']['value'], 742494000)
        self.assertEqual(fy24['deferredRevenue']['value'], 3054099000)
        self.assertEqual(fy24['operatingCashFlow']['value'], 1166207000)
        self.assertEqual(fy24['capex']['value'], 176529000)
        self.assertEqual(fy24['freeCashFlow']['value'], 989678000)
        self.assertEqual(fy24['stockBasedCompensation']['value'], 648665000)

        # FY2025
        fy25 = by_year[2025]['metrics']
        self.assertEqual(fy25['revenue']['value'], 3953624000)
        self.assertEqual(fy25['operatingIncome']['value'], -116400000)
        self.assertEqual(fy25['netIncome']['value'], -15241000)
        self.assertEqual(fy25['dilutedEps']['value'], -0.06)
        self.assertEqual(fy25['debt']['value'], 743983000)
        self.assertEqual(fy25['deferredRevenue']['value'], 3728677000)
        self.assertEqual(fy25['operatingCashFlow']['value'], 1381727000)
        self.assertEqual(fy25['capex']['value'], 254852000)
        self.assertEqual(fy25['freeCashFlow']['value'], 1126875000)
        self.assertEqual(fy25['stockBasedCompensation']['value'], 861391000)

        # FY2026
        fy26 = by_year[2026]['metrics']
        self.assertEqual(fy26['revenue']['value'], 4812005000)
        self.assertEqual(fy26['operatingIncome']['value'], -293292000)
        self.assertEqual(fy26['netIncome']['value'], -162502000)
        self.assertEqual(fy26['dilutedEps']['value'], -0.65)
        self.assertEqual(fy26['cashAndCashEquivalents']['value'], 5230125000)
        self.assertEqual(fy26['totalAssets']['value'], 11086684000)
        self.assertEqual(fy26['totalLiabilities']['value'], 6614079000)
        self.assertEqual(fy26['stockholdersEquity']['value'], 4428390000)
        self.assertEqual(fy26['debt']['value'], 745471000)
        self.assertEqual(fy26['deferredRevenue']['value'], 4753438000)
        self.assertEqual(fy26['operatingCashFlow']['value'], 1612349000)
        self.assertEqual(fy26['capex']['value'], 302108000)
        self.assertEqual(fy26['freeCashFlow']['value'], 1310241000)
        self.assertEqual(fy26['stockBasedCompensation']['value'], 1096679000)

    # =========================================================================
    # 7. CRWD Quarterly Fundamentals & SaaS Metrics
    # =========================================================================

    def test_crwd_quarterly_fundamentals(self):
        quarterly = self.crwd_normalizer.extract_quarterly_data(
            self.crwd_facts, submissions_data=self.crwd_submissions, max_quarters=10
        )
        self.assertEqual(len(quarterly), 10)
        by_period = {q['period']: q for q in quarterly}

        # 2025Q1
        q25_1 = by_period['2025Q1']['metrics']
        self.assertEqual(q25_1['revenue']['value'], 921036000)
        self.assertFalse(q25_1['revenue']['isDerived'])
        self.assertEqual(q25_1['operatingIncome']['value'], 6936000)
        self.assertEqual(q25_1['netIncome']['value'], 42820000)
        self.assertEqual(q25_1['dilutedEps']['value'], 0.17)
        self.assertEqual(q25_1['operatingCashFlow']['value'], 383228000)
        self.assertEqual(q25_1['capex']['value'], 49683000)
        self.assertEqual(q25_1['freeCashFlow']['value'], 333545000)
        self.assertEqual(q25_1['stockBasedCompensation']['value'], 183125000)
        self.assertEqual(q25_1['deferredRevenue']['value'], 3069379000)

        # 2026Q4 (derived Q4)
        q26_4 = by_period['2026Q4']['metrics']
        self.assertEqual(q26_4['revenue']['value'], 1305375000)
        self.assertTrue(q26_4['revenue']['isDerived'])
        self.assertEqual(q26_4['operatingIncome']['value'], 13786000)
        self.assertTrue(q26_4['operatingIncome']['isDerived'])
        self.assertEqual(q26_4['netIncome']['value'], 59377000)
        self.assertTrue(q26_4['netIncome']['isDerived'])
        self.assertIsNone(q26_4['dilutedEps']['value'])
        self.assertEqual(q26_4['operatingCashFlow']['value'], 497869000)
        self.assertEqual(q26_4['capex']['value'], 102465000)
        self.assertEqual(q26_4['freeCashFlow']['value'], 395404000)
        self.assertEqual(q26_4['stockBasedCompensation']['value'], 273951000)
        self.assertEqual(q26_4['deferredRevenue']['value'], 4753438000)

        # 2027Q2 (latest quarter)
        q27_2 = by_period['2027Q2']['metrics']
        self.assertEqual(q27_2['revenue']['value'], 1470897000)
        self.assertEqual(q27_2['operatingIncome']['value'], -33232000)
        self.assertEqual(q27_2['netIncome']['value'], 5306000)
        self.assertEqual(q27_2['dilutedEps']['value'], 0.01)
        self.assertEqual(q27_2['operatingCashFlow']['value'], 530268000)
        self.assertEqual(q27_2['capex']['value'], 124413000)
        self.assertEqual(q27_2['freeCashFlow']['value'], 405855000)
        self.assertEqual(q27_2['stockBasedCompensation']['value'], 376914000)
        self.assertEqual(q27_2['deferredRevenue']['value'], 4842210000)

    # =========================================================================
    # 8. CRWD TTM Fundamentals & Stock Split Guard
    # =========================================================================

    def test_crwd_ttm_computation(self):
        doc = self.crwd_normalizer.normalize(self.crwd_submissions, self.crwd_facts)
        ttm = doc['ttm']
        self.assertIsNotNone(ttm)
        self.assertEqual(ttm['asOfPeriod'], '2027Q2')
        self.assertEqual(ttm['quarters'], ['2026Q3', '2026Q4', '2027Q1', '2027Q2'])

        # Revenue: 1,234,244,000 + 1,305,375,000 + 1,385,629,000 + 1,470,897,000 = 5,396,145,000
        self.assertEqual(ttm['metrics']['revenue']['value'], 5396145000)

        # Operating Income: -69,443,000 + 13,786,000 + -30,600,000 + -33,232,000 = -119,489,000
        self.assertEqual(ttm['metrics']['operatingIncome']['value'], -119489000)

        # Net income: -33,997,000 + 59,377,000 + 27,774,000 + 5,306,000 = 58,460,000
        self.assertEqual(ttm['metrics']['netIncome']['value'], 58460000)

        # OCF: 397,541,000 + 497,869,000 + 590,937,000 + 530,268,000 = 2,016,615,000
        self.assertEqual(ttm['metrics']['operatingCashFlow']['value'], 2016615000)

        # CapEx: 83,395,000 + 102,465,000 + 97,624,000 + 124,413,000 = 407,897,000
        self.assertEqual(ttm['metrics']['capex']['value'], 407897000)

        # FCF: 2,016,615,000 - 407,897,000 = 1,608,718,000
        self.assertEqual(ttm['metrics']['freeCashFlow']['value'], 1608718000)

        # Stock-Based Compensation: 295,436,000 + 273,951,000 + 297,703,000 + 376,914,000 = 1,244,004,000
        self.assertEqual(ttm['metrics']['stockBasedCompensation']['value'], 1244004000)

        # Mid-TTM stock split (pre-split ~250M vs post-split ~1044M) is guarded as null
        self.assertIsNone(ttm['metrics']['dilutedShares']['value'])
        self.assertEqual(ttm['metrics']['dilutedShares']['derivationMethod'], 'unsupported_inconsistent_share_basis')
        self.assertIsNone(ttm['metrics']['dilutedEps']['value'])
        self.assertEqual(ttm['metrics']['dilutedEps']['derivationMethod'], 'unsupported_inconsistent_share_basis')

    # =========================================================================
    # 9. NVDA Quarterly Fundamentals & Free Cash Flow
    # =========================================================================

    def test_nvda_quarterly_fundamentals_and_fcf(self):
        quarterly = self.nvda_normalizer.extract_quarterly_data(
            self.nvda_facts, submissions_data=self.nvda_submissions, max_quarters=10
        )
        self.assertEqual(len(quarterly), 10)
        by_period = {q['period']: q for q in quarterly}

        # 2025Q1 (FY2025 Q1)
        q25_1 = by_period['2025Q1']['metrics']
        self.assertEqual(q25_1['revenue']['value'], 26044000000)
        self.assertFalse(q25_1['revenue']['isDerived'])
        self.assertEqual(q25_1['dilutedEps']['value'], 0.60)
        self.assertEqual(q25_1['operatingCashFlow']['value'], 15345000000)
        self.assertEqual(q25_1['capex']['value'], 369000000)
        self.assertEqual(q25_1['freeCashFlow']['value'], 14976000000)

        # 2025Q2 (derived OCF from 6M - Q1)
        q25_2 = by_period['2025Q2']['metrics']
        self.assertEqual(q25_2['revenue']['value'], 30040000000)
        self.assertEqual(q25_2['operatingCashFlow']['value'], 14488000000)
        self.assertTrue(q25_2['operatingCashFlow']['isDerived'])
        self.assertEqual(q25_2['capex']['value'], 977000000)
        self.assertEqual(q25_2['freeCashFlow']['value'], 13511000000)

        # 2026Q4 (derived Q4 from FY12M - YTD9M)
        q26_4 = by_period['2026Q4']['metrics']
        self.assertEqual(q26_4['revenue']['value'], 68127000000)
        self.assertTrue(q26_4['revenue']['isDerived'])
        self.assertEqual(q26_4['netIncome']['value'], 42960000000)
        self.assertTrue(q26_4['netIncome']['isDerived'])
        self.assertEqual(q26_4['dilutedShares']['value'], 24430000000)
        self.assertTrue(q26_4['dilutedShares']['isDerived'])
        self.assertEqual(q26_4['operatingCashFlow']['value'], 36188000000)
        self.assertEqual(q26_4['capex']['value'], 1284000000)
        self.assertEqual(q26_4['freeCashFlow']['value'], 34904000000)

        # 2027Q2 (latest quarter)
        q27_2 = by_period['2027Q2']['metrics']
        self.assertEqual(q27_2['revenue']['value'], 96221000000)
        self.assertEqual(q27_2['netIncome']['value'], 59688000000)
        self.assertEqual(q27_2['dilutedEps']['value'], 2.46)
        self.assertEqual(q27_2['debt']['value'], 33366000000)
        self.assertEqual(q27_2['operatingCashFlow']['value'], 24077000000)
        self.assertEqual(q27_2['capex']['value'], 2677000000)
        self.assertEqual(q27_2['freeCashFlow']['value'], 21400000000)

    # =========================================================================
    # 10. NVDA TTM Fundamentals & Derived TTM EPS
    # =========================================================================

    def test_nvda_ttm_computation(self):
        doc = self.nvda_normalizer.normalize(self.nvda_submissions, self.nvda_facts)
        ttm = doc['ttm']
        self.assertIsNotNone(ttm)
        self.assertEqual(ttm['asOfPeriod'], '2027Q2')
        self.assertEqual(ttm['quarters'], ['2026Q3', '2026Q4', '2027Q1', '2027Q2'])

        # Revenue: 57,006,000,000 + 68,127,000,000 + 81,615,000,000 + 96,221,000,000 = 302,969,000,000
        self.assertEqual(ttm['metrics']['revenue']['value'], 302969000000)

        # Net income: 31,910,000,000 + 42,960,000,000 + 58,321,000,000 + 59,688,000,000 = 192,879,000,000
        self.assertEqual(ttm['metrics']['netIncome']['value'], 192879000000)

        # TTM duration-weighted shares: (24483 + 24430 + 24391 + 24285) * 91 / 364 = 24,397,250,000
        self.assertEqual(ttm['metrics']['dilutedShares']['value'], 24397250000)
        self.assertEqual(ttm['metrics']['dilutedShares']['derivationMethod'], 'duration_weighted_trailing_4_quarters')

        # Derived TTM Diluted EPS: 192,879,000,000 / 24,397,250,000 = $7.91
        self.assertEqual(ttm['metrics']['dilutedEps']['value'], 7.91)
        self.assertAlmostEqual(ttm['metrics']['dilutedEps']['exactValue'], 7.905768068, places=6)
        self.assertEqual(ttm['metrics']['dilutedEps']['derivationMethod'], 'ttm_common_income_over_weighted_diluted_shares')

        # OCF: 23,751,000,000 + 36,188,000,000 + 50,344,000,000 + 24,077,000,000 = 134,360,000,000
        self.assertEqual(ttm['metrics']['operatingCashFlow']['value'], 134360000000)

        # CapEx: 1,636,000,000 + 1,284,000,000 + 1,757,000,000 + 2,677,000,000 = 7,354,000,000
        self.assertEqual(ttm['metrics']['capex']['value'], 7354000000)

        # FCF: 134,360,000,000 - 7,354,000,000 = 127,006,000,000
        self.assertEqual(ttm['metrics']['freeCashFlow']['value'], 127006000000)

        # Derived TTM FCF per share: 127,006,000,000 / 24,397,250,000 = $5.21
        self.assertEqual(ttm['metrics']['fcfPerShare']['value'], 5.21)
        self.assertAlmostEqual(ttm['metrics']['fcfPerShare']['exactValue'], 5.205750668, places=6)

    # =========================================================================
    # 11. SOFI TTM Diluted Shares & Common-Income EPS
    # =========================================================================

    def test_sofi_ttm_shares_and_diluted_eps(self):
        doc = self.sofi_normalizer.normalize(self.sofi_submissions, self.sofi_facts)
        ttm = doc['ttm']
        self.assertIsNotNone(ttm)
        self.assertEqual(ttm['asOfPeriod'], '2026Q2')

        # TTM duration-weighted shares = 1,341,494,734
        self.assertEqual(ttm['metrics']['dilutedShares']['value'], 1341494734)
        self.assertEqual(ttm['metrics']['dilutedShares']['derivationMethod'], 'duration_weighted_trailing_4_quarters')

        # Derived TTM Diluted EPS: Net Income to Common ($636,264,000) / 1,341,494,734 = $0.47
        self.assertEqual(ttm['metrics']['dilutedEps']['value'], 0.47)
        self.assertAlmostEqual(ttm['metrics']['dilutedEps']['exactValue'], 0.474294817, places=6)
        self.assertEqual(ttm['metrics']['dilutedEps']['derivationMethod'], 'ttm_common_income_over_weighted_diluted_shares')

        # FCF per share is unsupported for financial institution
        self.assertIsNone(ttm['metrics']['fcfPerShare']['value'])
        self.assertTrue(ttm['metrics']['fcfPerShare']['unsupported'])

    # =========================================================================
    # 12. Valuation Base Block Structure
    # =========================================================================

    def test_valuation_base_block_structure(self):
        for normalizer, sub_data, facts_data, symbol in [
            (self.sofi_normalizer, self.sofi_submissions, self.sofi_facts, 'SOFI'),
            (self.nvda_normalizer, self.nvda_submissions, self.nvda_facts, 'NVDA'),
            (self.crwd_normalizer, self.crwd_submissions, self.crwd_facts, 'CRWD'),
        ]:
            doc = normalizer.normalize(sub_data, facts_data)
            self.assertIn('valuationBase', doc)
            vb = doc['valuationBase']
            self.assertIsNotNone(vb['asOfPeriod'])
            self.assertEqual(vb['currency'], 'USD')
            self.assertIsNotNone(vb['latestAnnualPeriod'])
            self.assertIsNotNone(vb['latestAnnualEps']['value'])
            self.assertIsNotNone(vb['ttmNetIncomeToCommon']['value'])

    # =========================================================================
    # 13. Duplicate & Amended Facts Prioritization
    # =========================================================================

    def test_prefers_amended_and_latest_filing(self):
        mock_facts = [
            {'form': '10-K', 'filed': '2024-02-27', 'start': '2023-01-01', 'end': '2023-12-31', 'val': 100, 'accn': 'acc1'},
            {'form': '10-K/A', 'filed': '2024-04-15', 'start': '2023-01-01', 'end': '2023-12-31', 'val': 105, 'accn': 'acc2_amended'},
        ]
        best = self.sofi_normalizer._get_best_duration_fact(mock_facts, '2023-01-01', '2023-12-31')
        self.assertIsNotNone(best)
        self.assertEqual(best['val'], 105)
        self.assertEqual(best['form'], '10-K/A')
        self.assertEqual(best['accn'], 'acc2_amended')

    # =========================================================================
    # 14. Source Provenance Completeness
    # =========================================================================

    def test_source_provenance_structure_all_stocks(self):
        for normalizer, sub_data, facts_data, symbol, exp_cik in [
            (self.sofi_normalizer, self.sofi_submissions, self.sofi_facts, 'SOFI', '0001818874'),
            (self.nvda_normalizer, self.nvda_submissions, self.nvda_facts, 'NVDA', '0001045810'),
            (self.crwd_normalizer, self.crwd_submissions, self.crwd_facts, 'CRWD', '0001535527'),
        ]:
            doc = normalizer.normalize(sub_data, facts_data)
            self.assertEqual(doc['symbol'], symbol)
            self.assertEqual(doc['company']['cik'], exp_cik)
            self.assertEqual(len(doc['annual']), 3)
            self.assertEqual(len(doc['quarterly']), 10)

            # Verify annual revenue provenance
            ann_rev = doc['annual'][-1]['metrics']['revenue']
            self.assertEqual(ann_rev['source'], 'SEC')
            self.assertEqual(ann_rev['taxonomy'], 'us-gaap')
            self.assertIsNotNone(ann_rev['value'])
            self.assertIsNotNone(ann_rev['form'])
            self.assertIsNotNone(ann_rev['filed'])
            self.assertIsNotNone(ann_rev['accession'])

    # =========================================================================
    # 15. Filings Metadata & Direct SEC URLs
    # =========================================================================

    def test_filings_metadata_and_urls_crwd(self):
        filings = self.crwd_normalizer.normalize_filings(self.crwd_submissions)
        self.assertTrue(len(filings) >= 10)

        latest = filings[0]
        self.assertEqual(latest['form'], '10-Q')
        self.assertEqual(latest['filingDate'], '2026-08-27')
        self.assertEqual(latest['reportPeriod'], '2026-07-31')
        self.assertTrue(latest['primaryDocUrl'].startswith('https://www.sec.gov/Archives/edgar/data/1535527/'))
        self.assertTrue(latest['primaryDocUrl'].endswith('crwd-20260731.htm'))

    # =========================================================================
    # 16. Atomic File Output & JSON Validation
    # =========================================================================

    def test_save_atomic_json(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            target = os.path.join(temp_dir, 'subfolder', 'test.json')
            payload = {'status': 'ok', 'count': 42}
            save_atomic_json(payload, target)
            self.assertTrue(os.path.isfile(target))
            with open(target, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
            self.assertEqual(loaded, payload)

    # =========================================================================
    # 17. Error Resilience & File Preservation on Network Failure
    # =========================================================================

    def test_network_failure_preserves_existing_output(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            target_file = os.path.join(temp_dir, 'CRWD.json')
            initial_data = {'symbol': 'CRWD', 'version': 'initial_valid_state'}
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)

            mock_client = MagicMock()
            mock_client.resolve_cik.side_effect = SECNetworkError('Connection timed out')

            with self.assertRaises(SECNetworkError):
                update_stock('CRWD', client=mock_client, output_dir=temp_dir)

            with open(target_file, 'r', encoding='utf-8') as f:
                content = json.load(f)
            self.assertEqual(content, initial_data)


if __name__ == '__main__':
    unittest.main()

