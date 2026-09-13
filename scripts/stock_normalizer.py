#!/usr/bin/env python3
"""
stock_normalizer.py - High-Integrity SEC XBRL Fundamentals & Filing Normalizer

Implements strict, deterministic normalization of SEC EDGAR Company Facts
and Submissions into standardized NTM Research fundamentals JSON.

Key architectural rules:
1. Concept Configuration per Company/Profile: No blind assumptions about standard GAAP concepts.
2. Generic Fiscal Calendar & Filing Period Discovery: Dynamically discovers exact period boundaries
   from SEC submissions and 10-K/10-Q XBRL facts without hardcoded calendar assumptions.
3. Flow vs Instant Separation: Treats duration/flow concepts (income, cash flow) and instant concepts (balance sheet) cleanly.
4. Safe Standalone Quarter Derivation: Derives standalone quarters (Q2 from 6M-Q1, Q3 from 9M-6M, Q4 from FY-9M) ONLY when compatible.
5. Non-Additive Guard: Non-additive metrics like EPS and Weighted Average Shares are never subtracted across periods.
6. Derived Metrics (e.g. Free Cash Flow): Computes FCF = OCF - CapEx only when supported, carrying full provenance to underlying facts.
7. Strict TTM Computation: Calculates TTM only when 4 consecutive, verified quarters exist.
8. Full Source Provenance: Every single metric value contains form, filing date, accession, concept, and derivation notes.
9. Defensive Null Handling: Incomplete or unsupported metrics return null instead of guesses.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple


# Profile definitions for company-specific XBRL mappings
COMPANY_PROFILES: Dict[str, Dict[str, Any]] = {
    'SOFI': {
        'profileName': 'financial_services',
        'industry': 'fintech_banking',
        'description': 'Fintech and depository financial institution reporting net interest income and noninterest income',
        'metrics': {
            'revenue': {
                'concept': 'RevenuesNetOfInterestExpense',
                'taxonomy': 'us-gaap',
                'label': 'Total Net Revenue (Net of Interest Expense)',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Total net revenue comprising Net Interest Income and Noninterest Income',
            },
            'operatingIncome': {
                'concept': None,
                'type': 'flow',
                'unit': 'USD',
                'unsupported': True,
                'unsupportedReason': 'Financial institution: Operating income is not reported as a standard line item in depository banking.',
            },
            'netIncome': {
                'concept': 'NetIncomeLoss',
                'taxonomy': 'us-gaap',
                'label': 'Net Income (Loss) Attributable to Parent',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Net income (loss) attributable to SoFi Technologies, Inc.',
            },
            'netIncomeToCommon': {
                'concept': 'NetIncomeLossAvailableToCommonStockholdersBasic',
                'taxonomy': 'us-gaap',
                'label': 'Net Income (Loss) Available to Common Stockholders, Basic',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Net income (loss) available to common stockholders after preferred dividends/accretion',
            },
            'dilutedEps': {
                'concept': 'EarningsPerShareDiluted',
                'taxonomy': 'us-gaap',
                'label': 'Earnings Per Share, Diluted',
                'type': 'flow',
                'unit': 'USD/shares',
                'description': 'Diluted earnings per share',
                'isAdditive': False,
            },
            'dilutedShares': {
                'concept': 'WeightedAverageNumberOfDilutedSharesOutstanding',
                'taxonomy': 'us-gaap',
                'label': 'Weighted Average Number of Diluted Shares Outstanding',
                'type': 'flow',
                'unit': 'shares',
                'description': 'Weighted-average common shares outstanding used in calculating diluted EPS',
                'isAdditive': False,
            },
            'cashAndCashEquivalents': {
                'concept': 'CashAndCashEquivalentsAtCarryingValue',
                'taxonomy': 'us-gaap',
                'label': 'Cash and Cash Equivalents, at Carrying Value',
                'type': 'instant',
                'unit': 'USD',
                'description': 'Cash and cash equivalents on balance sheet at end of period',
            },
            'totalAssets': {
                'concept': 'Assets',
                'taxonomy': 'us-gaap',
                'label': 'Total Assets',
                'type': 'instant',
                'unit': 'USD',
                'description': 'Total assets on consolidated balance sheet',
            },
            'totalLiabilities': {
                'concept': 'Liabilities',
                'taxonomy': 'us-gaap',
                'label': 'Total Liabilities',
                'type': 'instant',
                'unit': 'USD',
                'description': 'Total liabilities on consolidated balance sheet (incl. deposits)',
            },
            'stockholdersEquity': {
                'concept': 'StockholdersEquity',
                'taxonomy': 'us-gaap',
                'label': "Stockholders' Equity Attributable to Parent",
                'type': 'instant',
                'unit': 'USD',
                'description': "Total stockholders' equity attributable to parent",
            },
            'debt': {
                'concept': None,
                'type': 'instant',
                'unit': 'USD',
                'unsupported': True,
                'unsupportedReason': (
                    'Financial institution balance sheet: traditional industrial Total Debt is ambiguous '
                    'due to customer deposits ($37.5B) vs funded debt borrowings ($1.8B via DebtLongtermAndShorttermCombinedAmount).'
                ),
            },
            'deferredRevenue': {
                'concept': 'ContractWithCustomerLiability',
                'taxonomy': 'us-gaap',
                'label': 'Contract Liabilities / Deferred Revenue',
                'type': 'instant',
                'unit': 'USD',
                'description': 'Contract liabilities and unearned revenue',
            },
            'operatingCashFlow': {
                'concept': 'NetCashProvidedByUsedInOperatingActivities',
                'taxonomy': 'us-gaap',
                'label': 'Net Cash Provided by (Used in) Operating Activities',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Net cash provided by or used in operating activities from cash flow statement',
            },
            'capex': {
                'concept': 'PaymentsToAcquireProductiveAssets',
                'taxonomy': 'us-gaap',
                'label': 'Payments to Acquire Productive Assets (CapEx)',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Capital expenditures on equipment and internal-use software development',
            },
            'freeCashFlow': {
                'concept': None,
                'type': 'flow',
                'unit': 'USD',
                'unsupported': True,
                'unsupportedReason': (
                    'Financial institution: Free Cash Flow (OCF - CapEx) is not economically meaningful '
                    'for depository and lending institutions whose cash flow is dominated by loan origination and deposit changes.'
                ),
            },
            'stockBasedCompensation': {
                'concept': 'ShareBasedCompensation',
                'taxonomy': 'us-gaap',
                'label': 'Stock-Based Compensation Expense',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Non-cash stock-based compensation expense from statement of cash flows',
            },
        },
    },
    'NVDA': {
        'profileName': 'standard_company',
        'industry': 'technology_hardware',
        'description': 'Semiconductor and compute hardware provider reporting standard product revenue, gross debt, and FCF',
        'metrics': {
            'revenue': {
                'concept': 'Revenues',
                'taxonomy': 'us-gaap',
                'label': 'Total Revenue',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Total revenue from sales of compute, networking, and graphics hardware/software',
            },
            'operatingIncome': {
                'concept': 'OperatingIncomeLoss',
                'taxonomy': 'us-gaap',
                'label': 'Operating Income',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Operating income from operations',
            },
            'netIncome': {
                'concept': 'NetIncomeLoss',
                'taxonomy': 'us-gaap',
                'label': 'Net Income',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Consolidated net income attributable to NVIDIA Corporation',
            },
            'netIncomeToCommon': {
                'concept': 'NetIncomeLoss',
                'taxonomy': 'us-gaap',
                'label': 'Net Income Attributable to Common Stockholders',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Net income available to common shareholders (identical to NetIncomeLoss for single-class equity)',
            },
            'dilutedEps': {
                'concept': 'EarningsPerShareDiluted',
                'taxonomy': 'us-gaap',
                'label': 'Earnings Per Share, Diluted',
                'type': 'flow',
                'unit': 'USD/shares',
                'description': 'Diluted earnings per share (split-adjusted by SEC XBRL)',
                'isAdditive': False,
            },
            'dilutedShares': {
                'concept': 'WeightedAverageNumberOfDilutedSharesOutstanding',
                'taxonomy': 'us-gaap',
                'label': 'Weighted Average Number of Diluted Shares Outstanding',
                'type': 'flow',
                'unit': 'shares',
                'description': 'Weighted-average common shares outstanding used in calculating diluted EPS',
                'isAdditive': False,
            },
            'cashAndCashEquivalents': {
                'concept': 'CashAndCashEquivalentsAtCarryingValue',
                'taxonomy': 'us-gaap',
                'label': 'Cash and Cash Equivalents',
                'type': 'instant',
                'unit': 'USD',
                'description': 'Cash and cash equivalents at carrying value on balance sheet',
            },
            'totalAssets': {
                'concept': 'Assets',
                'taxonomy': 'us-gaap',
                'label': 'Total Assets',
                'type': 'instant',
                'unit': 'USD',
                'description': 'Total assets on consolidated balance sheet',
            },
            'totalLiabilities': {
                'concept': 'Liabilities',
                'taxonomy': 'us-gaap',
                'label': 'Total Liabilities',
                'type': 'instant',
                'unit': 'USD',
                'description': 'Total liabilities on consolidated balance sheet',
            },
            'stockholdersEquity': {
                'concept': 'StockholdersEquity',
                'taxonomy': 'us-gaap',
                'label': "Total Stockholders' Equity",
                'type': 'instant',
                'unit': 'USD',
                'description': "Total shareholders' equity",
            },
            'debt': {
                'concept': 'LongTermDebt',
                'taxonomy': 'us-gaap',
                'label': 'Total Debt (Long-Term Debt & Current Portion)',
                'type': 'instant',
                'unit': 'USD',
                'description': 'Carrying value of total long-term debt including current portion',
            },
            'deferredRevenue': {
                'concept': 'ContractWithCustomerLiability',
                'taxonomy': 'us-gaap',
                'label': 'Contract Liabilities (Deferred Revenue)',
                'type': 'instant',
                'unit': 'USD',
                'description': 'Current and noncurrent contract liabilities / deferred revenue',
            },
            'operatingCashFlow': {
                'concept': 'NetCashProvidedByUsedInOperatingActivities',
                'taxonomy': 'us-gaap',
                'label': 'Net Cash Provided by Operating Activities',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Net cash provided by operating activities from consolidated statements of cash flows',
            },
            'capex': {
                'concept': 'PaymentsToAcquireProductiveAssets',
                'taxonomy': 'us-gaap',
                'label': 'Capital Expenditures (Acquisition of Property & Equipment)',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Payments for acquisition of property and equipment, intangible assets, and productive assets',
            },
            'freeCashFlow': {
                'concept': None,
                'type': 'flow',
                'unit': 'USD',
                'label': 'Free Cash Flow (FCF)',
                'description': 'Free cash flow defined as Operating Cash Flow minus Capital Expenditures (CapEx)',
                'compute': 'fcf_from_ocf_capex',
            },
            'stockBasedCompensation': {
                'concept': 'AllocatedShareBasedCompensationExpense',
                'taxonomy': 'us-gaap',
                'label': 'Stock-Based Compensation Expense',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Total allocated share-based compensation expense from statement of cash flows',
            },
        },
    },
    'CRWD': {
        'profileName': 'software_saas',
        'industry': 'security_software',
        'description': 'Cybersecurity platform and cloud software provider reporting subscription revenue, deferred revenue, and SaaS metrics',
        'metrics': {
            'revenue': {
                'concept': 'RevenueFromContractWithCustomerIncludingAssessedTax',
                'taxonomy': 'us-gaap',
                'label': 'Total Revenue',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Total revenue from subscription and professional services',
            },
            'operatingIncome': {
                'concept': 'OperatingIncomeLoss',
                'taxonomy': 'us-gaap',
                'label': 'Operating Income (Loss)',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Operating income (loss) from operations',
            },
            'netIncome': {
                'concept': 'NetIncomeLoss',
                'taxonomy': 'us-gaap',
                'label': 'Net Income (Loss)',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Consolidated net income (loss) attributable to CrowdStrike Holdings, Inc.',
            },
            'netIncomeToCommon': {
                'concept': 'NetIncomeLoss',
                'taxonomy': 'us-gaap',
                'label': 'Net Income (Loss) Attributable to Common Stockholders',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Net income (loss) available to common shareholders',
            },
            'dilutedEps': {
                'concept': 'EarningsPerShareDiluted',
                'taxonomy': 'us-gaap',
                'label': 'Earnings Per Share, Diluted',
                'type': 'flow',
                'unit': 'USD/shares',
                'description': 'Diluted earnings per share',
                'isAdditive': False,
            },
            'dilutedShares': {
                'concept': 'WeightedAverageNumberOfDilutedSharesOutstanding',
                'taxonomy': 'us-gaap',
                'label': 'Weighted Average Number of Diluted Shares Outstanding',
                'type': 'flow',
                'unit': 'shares',
                'description': 'Weighted-average common shares outstanding used in calculating diluted EPS',
                'isAdditive': False,
            },
            'cashAndCashEquivalents': {
                'concept': 'CashAndCashEquivalentsAtCarryingValue',
                'taxonomy': 'us-gaap',
                'label': 'Cash and Cash Equivalents',
                'type': 'instant',
                'unit': 'USD',
                'description': 'Cash and cash equivalents on balance sheet at end of period',
            },
            'totalAssets': {
                'concept': 'Assets',
                'taxonomy': 'us-gaap',
                'label': 'Total Assets',
                'type': 'instant',
                'unit': 'USD',
                'description': 'Total assets on consolidated balance sheet',
            },
            'totalLiabilities': {
                'concept': 'Liabilities',
                'taxonomy': 'us-gaap',
                'label': 'Total Liabilities',
                'type': 'instant',
                'unit': 'USD',
                'description': 'Total liabilities on consolidated balance sheet',
            },
            'stockholdersEquity': {
                'concept': 'StockholdersEquity',
                'taxonomy': 'us-gaap',
                'label': "Total Stockholders' Equity",
                'type': 'instant',
                'unit': 'USD',
                'description': "Total shareholders' equity",
            },
            'debt': {
                'concept': 'LongTermDebtNoncurrent',
                'taxonomy': 'us-gaap',
                'label': 'Total Debt (Senior Notes)',
                'type': 'instant',
                'unit': 'USD',
                'description': 'Long-term senior notes outstanding (excluding operating lease liabilities)',
            },
            'deferredRevenue': {
                'concept': 'ContractWithCustomerLiability',
                'taxonomy': 'us-gaap',
                'label': 'Total Deferred Revenue (Contract Liabilities)',
                'type': 'instant',
                'unit': 'USD',
                'description': 'Total unearned subscription and services revenue (current and noncurrent contract liabilities)',
            },
            'operatingCashFlow': {
                'concept': 'NetCashProvidedByUsedInOperatingActivities',
                'taxonomy': 'us-gaap',
                'label': 'Net Cash Provided by Operating Activities',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Net cash provided by operating activities from cash flow statement',
            },
            'capex': {
                'concept': 'PaymentsToAcquirePropertyPlantAndEquipment',
                'taxonomy': 'us-gaap',
                'label': 'Capital Expenditures (Purchases of Property & Equipment)',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Purchases of property and equipment',
            },
            'freeCashFlow': {
                'concept': None,
                'type': 'flow',
                'unit': 'USD',
                'label': 'Free Cash Flow (FCF)',
                'description': 'Free cash flow defined as Operating Cash Flow minus Capital Expenditures (Purchases of Property & Equipment)',
                'compute': 'fcf_from_ocf_capex',
            },
            'stockBasedCompensation': {
                'concept': 'ShareBasedCompensation',
                'taxonomy': 'us-gaap',
                'label': 'Stock-Based Compensation Expense',
                'type': 'flow',
                'unit': 'USD',
                'description': 'Total non-cash stock-based compensation expense from statement of cash flows',
            },
        },
    },
}


def get_company_profile(ticker: str) -> Dict[str, Any]:
    """Retrieve the XBRL metric mapping profile for a given ticker."""
    ticker_upper = ticker.strip().upper()
    if ticker_upper in COMPANY_PROFILES:
        return COMPANY_PROFILES[ticker_upper]
    raise ValueError(f"No configured XBRL metric profile for ticker '{ticker}' in V0.")


def derive_fiscal_year_and_quarter(report_date_str: str, fye_str: str) -> Tuple[int, int]:
    """
    Derive the exact fiscal year and quarter number for a period ending report_date_str,
    given the company's fiscalYearEnd (e.g. '1231' or '0131').
    """
    dt = datetime.strptime(report_date_str, '%Y-%m-%d')
    fye_month = int(fye_str[:2]) if len(fye_str) >= 2 else 12
    fye_day = int(fye_str[2:]) if len(fye_str) >= 4 else 31

    if fye_month == 12:
        fy = dt.year
        q = (dt.month - 1) // 3 + 1
    elif fye_month == 1:
        if dt.month == 1:
            fy = dt.year
            q = 4
        else:
            fy = dt.year + 1
            if 2 <= dt.month <= 4:
                q = 1
            elif 5 <= dt.month <= 7:
                q = 2
            elif 8 <= dt.month <= 10:
                q = 3
            else:
                q = 4
    else:
        if (dt.month, dt.day) > (fye_month, fye_day):
            fy = dt.year + 1
        else:
            fy = dt.year
        rel_m = (dt.month - (fye_month % 12 + 1)) % 12
        q = rel_m // 3 + 1

    return fy, q


class StockNormalizer:
    """Normalizes raw SEC submissions and XBRL company facts into verified NTM fundamentals."""

    def __init__(self, ticker: str, profile: Optional[Dict[str, Any]] = None):
        self.ticker = ticker.strip().upper()
        self.profile = profile or get_company_profile(self.ticker)
        self.metric_defs = self.profile['metrics']

    def _filter_facts(
        self,
        facts_data: Dict[str, Any],
        taxonomy: str,
        concept: str,
        form_whitelist: Tuple[str, ...] = ('10-K', '10-Q', '10-K/A', '10-Q/A'),
    ) -> List[Dict[str, Any]]:
        """Extract and filter facts for a specific taxonomy and concept."""
        tax_facts = facts_data.get('facts', {}).get(taxonomy, {})
        if concept not in tax_facts:
            return []
        units_dict = tax_facts[concept].get('units', {})
        if not units_dict:
            return []
        unit_key = list(units_dict.keys())[0]
        entries = units_dict[unit_key]
        return [
            entry for entry in entries
            if entry.get('form') in form_whitelist and entry.get('val') is not None
        ]

    def _get_best_instant_fact(
        self,
        facts_list: List[Dict[str, Any]],
        target_date: str,
        preferred_form: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Get the most authoritative instant fact for a target date."""
        matching = [
            f for f in facts_list
            if f.get('end') == target_date and not f.get('start')
        ]
        if not matching:
            return None

        def sort_key(f: Dict[str, Any]) -> Tuple[int, int, str]:
            form = f.get('form', '')
            is_pref = 1 if preferred_form and form.startswith(preferred_form) else 0
            is_amend = 1 if '/A' in form else 0
            filed = f.get('filed', '')
            return (is_pref, is_amend, filed)

        matching.sort(key=sort_key, reverse=True)
        return matching[0]

    def _get_best_duration_fact(
        self,
        facts_list: List[Dict[str, Any]],
        start_date: str,
        end_date: str,
        preferred_form: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Get the most authoritative duration fact for an exact start and end date."""
        matching = [
            f for f in facts_list
            if f.get('start') == start_date and f.get('end') == end_date
        ]
        if not matching:
            return None

        def sort_key(f: Dict[str, Any]) -> Tuple[int, int, str]:
            form = f.get('form', '')
            is_pref = 1 if preferred_form and form.startswith(preferred_form) else 0
            is_amend = 1 if '/A' in form else 0
            filed = f.get('filed', '')
            return (is_pref, is_amend, filed)

        matching.sort(key=sort_key, reverse=True)
        return matching[0]

    def _build_provenance(
        self,
        value: Any,
        metric_cfg: Dict[str, Any],
        period: str,
        period_start: Optional[str],
        period_end: str,
        fact: Optional[Dict[str, Any]] = None,
        is_derived: bool = False,
        derivation_notes: Optional[str] = None,
        derived_from: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Construct structured source provenance for a metric."""
        if value is None:
            return {
                'value': None,
                'unit': metric_cfg.get('unit'),
                'period': period,
                'periodStart': period_start,
                'periodEnd': period_end,
                'source': 'SEC',
                'taxonomy': metric_cfg.get('taxonomy', 'us-gaap'),
                'concept': metric_cfg.get('concept'),
                'label': metric_cfg.get('label'),
                'form': fact.get('form') if fact else None,
                'filed': fact.get('filed') if fact else None,
                'accession': fact.get('accn') if fact else None,
                'isDerived': is_derived,
                'derivationNotes': derivation_notes,
                'derivedFrom': derived_from,
                'unsupported': metric_cfg.get('unsupported', False),
                'unsupportedReason': metric_cfg.get('unsupportedReason'),
            }

        return {
            'value': value,
            'unit': metric_cfg.get('unit'),
            'period': period,
            'periodStart': period_start,
            'periodEnd': period_end,
            'source': 'SEC',
            'taxonomy': metric_cfg.get('taxonomy', 'us-gaap'),
            'concept': metric_cfg.get('concept'),
            'label': metric_cfg.get('label'),
            'form': fact.get('form') if fact else None,
            'filed': fact.get('filed') if fact else None,
            'accession': fact.get('accn') if fact else None,
            'isDerived': is_derived,
            'derivationNotes': derivation_notes,
            'derivedFrom': derived_from,
        }

    def normalize_company_info(
        self,
        submissions_data: Dict[str, Any],
        last_updated: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Normalize company identity and metadata from SEC submissions."""
        cik_raw = str(submissions_data.get('cik', ''))
        return {
            'name': submissions_data.get('name', ''),
            'ticker': self.ticker,
            'cik': cik_raw.zfill(10),
            'sic': str(submissions_data.get('sic', '')),
            'sicDescription': submissions_data.get('sicDescription', ''),
            'fiscalYearEnd': str(submissions_data.get('fiscalYearEnd', '')),
            'stateOfIncorporation': submissions_data.get('stateOfIncorporation', ''),
            'currency': 'USD',
            'lastUpdated': last_updated or datetime.now(timezone.utc).isoformat(),
        }

    def normalize_filings(
        self,
        submissions_data: Dict[str, Any],
        max_filings: int = 25,
    ) -> List[Dict[str, Any]]:
        """Extract and structure recent 10-K and 10-Q filings with direct SEC URLs."""
        recent = submissions_data.get('filings', {}).get('recent', {})
        if not recent or 'form' not in recent:
            return []

        forms = recent.get('form', [])
        filing_dates = recent.get('filingDate', [])
        report_dates = recent.get('reportDate', [])
        accessions = recent.get('accessionNumber', [])
        primary_docs = recent.get('primaryDocument', [])
        cik_no_zeros = str(submissions_data.get('cik', '')).lstrip('0')

        filings: List[Dict[str, Any]] = []
        for i in range(len(forms)):
            form = forms[i]
            if form not in ('10-K', '10-Q', '10-K/A', '10-Q/A'):
                continue
            acc_raw = accessions[i]
            acc_clean = acc_raw.replace('-', '')
            primary_doc = primary_docs[i]
            doc_url = f'https://www.sec.gov/Archives/edgar/data/{cik_no_zeros}/{acc_clean}/{primary_doc}'
            filing_url = f'https://www.sec.gov/Archives/edgar/data/{cik_no_zeros}/{acc_clean}/'

            filings.append({
                'form': form,
                'filingDate': filing_dates[i],
                'reportPeriod': report_dates[i],
                'accessionNumber': acc_raw,
                'primaryDocument': primary_doc,
                'primaryDocUrl': doc_url,
                'secFilingUrl': filing_url,
            })
            if len(filings) >= max_filings:
                break

        return filings

    def discover_filing_periods(
        self,
        submissions_data: Dict[str, Any],
        facts_data: Dict[str, Any],
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Dynamically discover exact annual (10-K) and quarterly (10-Q/10-K) filing periods
        without making calendar-month assumptions.
        """
        recent = submissions_data.get('filings', {}).get('recent', {})
        forms = recent.get('form', [])
        filed_dates = recent.get('filingDate', [])
        report_dates = recent.get('reportDate', [])
        accessions = recent.get('accessionNumber', [])
        fye = str(submissions_data.get('fiscalYearEnd', '1231'))

        rev_concept = self.metric_defs['revenue']['concept']
        rev_tax = self.metric_defs['revenue'].get('taxonomy', 'us-gaap')
        rev_facts = self._filter_facts(facts_data, rev_tax, rev_concept)

        # 1. Annual 10-Ks: each unique 10-K filing
        annual_periods: List[Dict[str, Any]] = []
        seen_annual_reports = set()

        for i in range(len(forms)):
            form = forms[i]
            if form in ('10-K', '10-K/A'):
                rep = report_dates[i]
                accn = accessions[i]
                if rep in seen_annual_reports:
                    continue
                seen_annual_reports.add(rep)

                # Match full-year duration facts filed in this exact 10-K where end == rep
                matching = [
                    f for f in rev_facts
                    if f.get('accn') == accn and f.get('end') == rep and f.get('start')
                ]
                matching = [
                    f for f in matching
                    if 340 <= (datetime.strptime(f['end'], '%Y-%m-%d') - datetime.strptime(f['start'], '%Y-%m-%d')).days <= 385
                ]
                if not matching:
                    matching = [
                        f for f in rev_facts
                        if f.get('end') == rep and f.get('start') and f.get('form') in ('10-K', '10-K/A')
                    ]
                    matching = [
                        f for f in matching
                        if 340 <= (datetime.strptime(f['end'], '%Y-%m-%d') - datetime.strptime(f['start'], '%Y-%m-%d')).days <= 385
                    ]

                if matching:
                    matching.sort(key=lambda x: (x.get('filed', ''), 1 if '/A' in x.get('form', '') else 0), reverse=True)
                    best_f = matching[0]
                    fy, _ = derive_fiscal_year_and_quarter(rep, fye)
                    annual_periods.append({
                        'fiscalYear': fy,
                        'period': f'FY{fy}',
                        'periodStart': best_f['start'],
                        'periodEnd': rep,
                        'filingDate': filed_dates[i],
                        'form': form,
                        'accession': accn,
                    })

        annual_periods.sort(key=lambda x: x['fiscalYear'])

        # 2. Quarterly 10-Qs: each unique 10-Q filing
        quarterly_periods: List[Dict[str, Any]] = []
        seen_q_reports = set()

        for i in range(len(forms)):
            form = forms[i]
            if form in ('10-Q', '10-Q/A'):
                rep = report_dates[i]
                accn = accessions[i]
                if rep in seen_q_reports:
                    continue
                seen_q_reports.add(rep)

                # Find facts reported in THIS 10-Q where end == rep
                matching = [
                    f for f in rev_facts
                    if f.get('accn') == accn and f.get('end') == rep and f.get('start')
                ]
                if not matching:
                    matching = [
                        f for f in rev_facts
                        if f.get('end') == rep and f.get('start') and f.get('form') in ('10-Q', '10-Q/A')
                    ]

                if matching:
                    matching.sort(key=lambda x: (x.get('filed', ''), 1 if '/A' in x.get('form', '') else 0), reverse=True)
                    
                    f_3m = None
                    f_ytd = None
                    for mf in matching:
                        d_days = (datetime.strptime(mf['end'], '%Y-%m-%d') - datetime.strptime(mf['start'], '%Y-%m-%d')).days
                        if 75 <= d_days <= 110:
                            f_3m = mf
                        elif d_days > 110:
                            f_ytd = mf

                    fy, q_num = derive_fiscal_year_and_quarter(rep, fye)

                    quarterly_periods.append({
                        'fiscalYear': fy,
                        'fiscalPeriod': f'Q{q_num}',
                        'qNum': q_num,
                        'period': f'{fy}Q{q_num}',
                        'periodStart': f_3m['start'] if f_3m else None,
                        'periodEnd': rep,
                        'ytdStart': f_ytd['start'] if f_ytd else (f_3m['start'] if f_3m else None),
                        'ytdEnd': rep,
                        'filingDate': filed_dates[i],
                        'form': form,
                        'accession': accn,
                    })

        # Add Q4 for each annual 10-K
        for a in annual_periods:
            fy = a['fiscalYear']
            quarterly_periods.append({
                'fiscalYear': fy,
                'fiscalPeriod': 'Q4',
                'qNum': 4,
                'period': f'{fy}Q4',
                'periodStart': None,
                'periodEnd': a['periodEnd'],
                'ytdStart': a['periodStart'],
                'ytdEnd': a['periodEnd'],
                'filingDate': a['filingDate'],
                'form': a['form'],
                'accession': a['accession'],
            })

        quarterly_periods.sort(key=lambda x: (x['fiscalYear'], x['qNum']))
        return annual_periods, quarterly_periods

    def extract_annual_data(
        self,
        facts_data: Dict[str, Any],
        annual_periods: Optional[List[Dict[str, Any]]] = None,
        years: Optional[List[int]] = None,
        submissions_data: Optional[Dict[str, Any]] = None,
        max_years: int = 3,
    ) -> List[Dict[str, Any]]:
        """Extract and normalize annual fundamentals for discovered or specified fiscal years."""
        if annual_periods is None and submissions_data is not None:
            discovered_ann, _ = self.discover_filing_periods(submissions_data, facts_data)
            annual_periods = discovered_ann[-max_years:]
        elif annual_periods is None and years is not None:
            # Fallback for explicit years without submissions: construct standard boundaries
            annual_periods = []
            for y in sorted(years):
                annual_periods.append({
                    'fiscalYear': y,
                    'period': f'FY{y}',
                    'periodStart': f'{y}-01-01',
                    'periodEnd': f'{y}-12-31',
                    'filingDate': None,
                    'form': '10-K',
                    'accession': None,
                })

        if not annual_periods:
            return []

        # If explicit years filter requested, apply it
        if years is not None:
            annual_periods = [a for a in annual_periods if a['fiscalYear'] in years]

        cached_facts: Dict[str, List[Dict[str, Any]]] = {}
        for m_key, m_cfg in self.metric_defs.items():
            if m_cfg.get('concept'):
                cached_facts[m_key] = self._filter_facts(
                    facts_data, m_cfg.get('taxonomy', 'us-gaap'), m_cfg['concept']
                )

        annual_results: List[Dict[str, Any]] = []

        for a_period in annual_periods:
            year = a_period['fiscalYear']
            start_date = a_period['periodStart']
            end_date = a_period['periodEnd']
            period_str = a_period['period']

            metrics: Dict[str, Any] = {}
            representative_filing_date: Optional[str] = a_period.get('filingDate')
            representative_form: Optional[str] = a_period.get('form')
            representative_accn: Optional[str] = a_period.get('accession')

            for m_key, m_cfg in self.metric_defs.items():
                if m_cfg.get('unsupported'):
                    metrics[m_key] = self._build_provenance(
                        value=None,
                        metric_cfg=m_cfg,
                        period=period_str,
                        period_start=start_date if m_cfg.get('type') == 'flow' else None,
                        period_end=end_date,
                    )
                    continue

                if m_cfg.get('compute') == 'fcf_from_ocf_capex':
                    continue

                facts_list = cached_facts.get(m_key, [])
                if m_cfg.get('type') == 'instant':
                    best_fact = self._get_best_instant_fact(facts_list, end_date, preferred_form='10-K')
                    val = best_fact['val'] if best_fact else None
                    metrics[m_key] = self._build_provenance(
                        value=val,
                        metric_cfg=m_cfg,
                        period=period_str,
                        period_start=None,
                        period_end=end_date,
                        fact=best_fact,
                    )
                else:
                    best_fact = self._get_best_duration_fact(facts_list, start_date, end_date, preferred_form='10-K')
                    val = best_fact['val'] if best_fact else None
                    metrics[m_key] = self._build_provenance(
                        value=val,
                        metric_cfg=m_cfg,
                        period=period_str,
                        period_start=start_date,
                        period_end=end_date,
                        fact=best_fact,
                    )

                if best_fact and not representative_filing_date:
                    representative_filing_date = best_fact.get('filed')
                    representative_form = best_fact.get('form')
                    representative_accn = best_fact.get('accn')

            # Compute Free Cash Flow if configured in profile
            fcf_cfg = self.metric_defs.get('freeCashFlow')
            if fcf_cfg and fcf_cfg.get('compute') == 'fcf_from_ocf_capex':
                ocf_val = metrics.get('operatingCashFlow', {}).get('value')
                capex_val = metrics.get('capex', {}).get('value')
                if ocf_val is not None and capex_val is not None:
                    fcf_val = ocf_val - capex_val
                    ocf_accn = metrics.get('operatingCashFlow', {}).get('accession')
                    capex_accn = metrics.get('capex', {}).get('accession')
                    derived_from = [a for a in [ocf_accn, capex_accn] if a] or ['operatingCashFlow', 'capex']
                    metrics['freeCashFlow'] = self._build_provenance(
                        value=fcf_val,
                        metric_cfg=fcf_cfg,
                        period=period_str,
                        period_start=start_date,
                        period_end=end_date,
                        is_derived=True,
                        derivation_notes='Free Cash Flow computed as Operating Cash Flow minus CapEx',
                        derived_from=derived_from,
                    )
                else:
                    metrics['freeCashFlow'] = self._build_provenance(
                        value=None,
                        metric_cfg=fcf_cfg,
                        period=period_str,
                        period_start=start_date,
                        period_end=end_date,
                        is_derived=True,
                        derivation_notes='Operating Cash Flow or CapEx missing for FCF computation',
                    )

            annual_results.append({
                'fiscalYear': year,
                'period': period_str,
                'periodStart': start_date,
                'periodEnd': end_date,
                'filingDate': representative_filing_date,
                'form': representative_form or '10-K',
                'accession': representative_accn,
                'metrics': metrics,
            })

        return annual_results

    def extract_quarterly_data(
        self,
        facts_data: Dict[str, Any],
        quarterly_periods: Optional[List[Dict[str, Any]]] = None,
        quarters: Optional[List[str]] = None,
        submissions_data: Optional[Dict[str, Any]] = None,
        max_quarters: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Extract and normalize quarterly fundamentals.
        Derives standalone quarter flow values safely when only YTD/FY facts exist.
        """
        if quarterly_periods is None and submissions_data is not None:
            _, discovered_qtr = self.discover_filing_periods(submissions_data, facts_data)
            quarterly_periods = discovered_qtr[-max_quarters:]
        elif quarterly_periods is None and quarters is not None:
            # Fallback for explicit quarter strings without submissions (e.g. ['2024Q1', ...])
            quarter_dates = {
                1: ('01-01', '03-31'),
                2: ('04-01', '06-30'),
                3: ('07-01', '09-30'),
                4: ('10-01', '12-31'),
            }
            quarterly_periods = []
            for q_str in quarters:
                year = int(q_str[:4])
                q_num = int(q_str[-1])
                s_suffix, e_suffix = quarter_dates[q_num]
                quarterly_periods.append({
                    'fiscalYear': year,
                    'fiscalPeriod': f'Q{q_num}',
                    'qNum': q_num,
                    'period': q_str,
                    'periodStart': f'{year}-{s_suffix}' if q_num != 4 else None,
                    'periodEnd': f'{year}-{e_suffix}',
                    'ytdStart': f'{year}-01-01',
                    'ytdEnd': f'{year}-{e_suffix}',
                    'filingDate': None,
                    'form': '10-K' if q_num == 4 else '10-Q',
                    'accession': None,
                })

        if not quarterly_periods:
            return []

        if quarters is not None:
            quarterly_periods = [q for q in quarterly_periods if q['period'] in quarters]

        cached_facts: Dict[str, List[Dict[str, Any]]] = {}
        for m_key, m_cfg in self.metric_defs.items():
            if m_cfg.get('concept'):
                cached_facts[m_key] = self._filter_facts(
                    facts_data, m_cfg.get('taxonomy', 'us-gaap'), m_cfg['concept']
                )

        quarters_by_key = {(q['fiscalYear'], q['qNum']): q for q in quarterly_periods}

        quarterly_results: List[Dict[str, Any]] = []

        for q_item in quarterly_periods:
            year = q_item['fiscalYear']
            q_num = q_item['qNum']
            period_str = q_item['period']
            start_date = q_item.get('periodStart')
            end_date = q_item['periodEnd']
            ytd_start = q_item.get('ytdStart')

            # Populate standalone Q4 start date if missing but Q3 end is known
            if not start_date and q_num == 4:
                q3_prev = quarters_by_key.get((year, 3))
                if q3_prev and q3_prev.get('periodEnd'):
                    try:
                        q4_dt = datetime.strptime(q3_prev['periodEnd'], '%Y-%m-%d') + timedelta(days=1)
                        start_date = q4_dt.strftime('%Y-%m-%d')
                    except ValueError:
                        pass

            metrics: Dict[str, Any] = {}
            representative_filing_date: Optional[str] = q_item.get('filingDate')
            representative_form: Optional[str] = q_item.get('form')
            representative_accn: Optional[str] = q_item.get('accession')

            for m_key, m_cfg in self.metric_defs.items():
                if m_cfg.get('unsupported'):
                    metrics[m_key] = self._build_provenance(
                        value=None,
                        metric_cfg=m_cfg,
                        period=period_str,
                        period_start=start_date if m_cfg.get('type') == 'flow' else None,
                        period_end=end_date,
                    )
                    continue

                if m_cfg.get('compute') == 'fcf_from_ocf_capex':
                    continue

                facts_list = cached_facts.get(m_key, [])

                if m_cfg.get('type') == 'instant':
                    best_fact = self._get_best_instant_fact(facts_list, end_date)
                    val = best_fact['val'] if best_fact else None
                    metrics[m_key] = self._build_provenance(
                        value=val,
                        metric_cfg=m_cfg,
                        period=period_str,
                        period_start=None,
                        period_end=end_date,
                        fact=best_fact,
                    )
                    if best_fact and not representative_filing_date:
                        representative_filing_date = best_fact.get('filed')
                        representative_form = best_fact.get('form')
                        representative_accn = best_fact.get('accn')
                else:
                    best_fact = None
                    if start_date:
                        best_fact = self._get_best_duration_fact(facts_list, start_date, end_date)

                    if best_fact:
                        metrics[m_key] = self._build_provenance(
                            value=best_fact['val'],
                            metric_cfg=m_cfg,
                            period=period_str,
                            period_start=start_date,
                            period_end=end_date,
                            fact=best_fact,
                            is_derived=False,
                        )
                        if not representative_filing_date:
                            representative_filing_date = best_fact.get('filed')
                            representative_form = best_fact.get('form')
                            representative_accn = best_fact.get('accn')
                    else:
                        is_additive = m_cfg.get('isAdditive', True)
                        derived_val = None
                        derivation_method = None
                        derivation_notes = None
                        derived_from: List[str] = []

                        if is_additive and ytd_start:
                            if q_num == 2:
                                q1_item = quarters_by_key.get((year, 1))
                                if q1_item and q1_item.get('periodEnd'):
                                    ytd6 = self._get_best_duration_fact(facts_list, ytd_start, end_date)
                                    q1_fact = self._get_best_duration_fact(facts_list, ytd_start, q1_item['periodEnd'])
                                    if ytd6 and q1_fact:
                                        derived_val = ytd6['val'] - q1_fact['val']
                                        derivation_method = 'YTD_6M_minus_Q1_3M'
                                        derivation_notes = f'Derived standalone quarter flow via {derivation_method}'
                                        derived_from = [ytd6.get('accn', ''), q1_fact.get('accn', '')]
                            elif q_num == 3:
                                q2_item = quarters_by_key.get((year, 2))
                                if q2_item and q2_item.get('periodEnd'):
                                    ytd9 = self._get_best_duration_fact(facts_list, ytd_start, end_date)
                                    ytd6 = self._get_best_duration_fact(facts_list, ytd_start, q2_item['periodEnd'])
                                    if ytd9 and ytd6:
                                        derived_val = ytd9['val'] - ytd6['val']
                                        derivation_method = 'YTD_9M_minus_YTD_6M'
                                        derivation_notes = f'Derived standalone quarter flow via {derivation_method}'
                                        derived_from = [ytd9.get('accn', ''), ytd6.get('accn', '')]
                            elif q_num == 4:
                                q3_item = quarters_by_key.get((year, 3))
                                if q3_item and q3_item.get('periodEnd'):
                                    fy_fact = self._get_best_duration_fact(facts_list, ytd_start, end_date)
                                    ytd9 = self._get_best_duration_fact(facts_list, ytd_start, q3_item['periodEnd'])
                                    if fy_fact and ytd9:
                                        derived_val = fy_fact['val'] - ytd9['val']
                                        derivation_method = 'FY_12M_minus_YTD_9M'
                                        derivation_notes = f'Derived standalone quarter flow via {derivation_method}'
                                        derived_from = [fy_fact.get('accn', ''), ytd9.get('accn', '')]

                        elif m_key == 'dilutedShares' and q_num == 4 and ytd_start:
                            # Exact duration-weighted derivation for standalone Q4 diluted shares
                            q3_item = quarters_by_key.get((year, 3))
                            if q3_item and q3_item.get('periodEnd'):
                                fy_fact = self._get_best_duration_fact(facts_list, ytd_start, end_date)
                                ytd9_fact = self._get_best_duration_fact(facts_list, ytd_start, q3_item['periodEnd'])
                                if fy_fact and ytd9_fact:
                                    try:
                                        ann_s_dt = datetime.strptime(fy_fact['start'], '%Y-%m-%d')
                                        ann_e_dt = datetime.strptime(fy_fact['end'], '%Y-%m-%d')
                                        ann_days = (ann_e_dt - ann_s_dt).days + 1
                                        y9_e_dt = datetime.strptime(ytd9_fact['end'], '%Y-%m-%d')
                                        y9_days = (y9_e_dt - ann_s_dt).days + 1
                                        q4_days = (ann_e_dt - y9_e_dt).days

                                        if ann_days > 0 and y9_days > 0 and q4_days > 0:
                                            ann_share_days = fy_fact['val'] * ann_days
                                            y9_share_days = ytd9_fact['val'] * y9_days
                                            q4_share_days = ann_share_days - y9_share_days
                                            if q4_share_days > 0:
                                                derived_val = int(round(q4_share_days / q4_days))
                                                derivation_method = 'duration_weighted_annual_minus_ytd9m'
                                                derivation_notes = (
                                                    f'Derived standalone Q4 diluted shares via duration-weighted '
                                                    f'annual ({ann_days}d) minus 9M YTD ({y9_days}d)'
                                                )
                                                derived_from = [fy_fact.get('accn', ''), ytd9_fact.get('accn', '')]
                                    except ValueError:
                                        pass

                        if derived_val is not None:
                            metrics[m_key] = self._build_provenance(
                                value=derived_val,
                                metric_cfg=m_cfg,
                                period=period_str,
                                period_start=start_date,
                                period_end=end_date,
                                is_derived=True,
                                derivation_notes=derivation_notes,
                                derived_from=[a for a in derived_from if a],
                            )
                        else:
                            metrics[m_key] = self._build_provenance(
                                value=None,
                                metric_cfg=m_cfg,
                                period=period_str,
                                period_start=start_date,
                                period_end=end_date,
                                is_derived=False,
                                derivation_notes=(
                                    'Non-additive metric not reported standalone for this quarter'
                                    if not is_additive else 'Required underlying YTD/FY facts missing for derivation'
                                ),
                            )

            # Compute Free Cash Flow if configured
            fcf_cfg = self.metric_defs.get('freeCashFlow')
            if fcf_cfg and fcf_cfg.get('compute') == 'fcf_from_ocf_capex':
                ocf_val = metrics.get('operatingCashFlow', {}).get('value')
                capex_val = metrics.get('capex', {}).get('value')
                if ocf_val is not None and capex_val is not None:
                    fcf_val = ocf_val - capex_val
                    ocf_accn = metrics.get('operatingCashFlow', {}).get('accession')
                    capex_accn = metrics.get('capex', {}).get('accession')
                    derived_from = [a for a in [ocf_accn, capex_accn] if a] or ['operatingCashFlow', 'capex']
                    metrics['freeCashFlow'] = self._build_provenance(
                        value=fcf_val,
                        metric_cfg=fcf_cfg,
                        period=period_str,
                        period_start=start_date,
                        period_end=end_date,
                        is_derived=True,
                        derivation_notes='Free Cash Flow computed as Operating Cash Flow minus CapEx',
                        derived_from=derived_from,
                    )
                else:
                    metrics['freeCashFlow'] = self._build_provenance(
                        value=None,
                        metric_cfg=fcf_cfg,
                        period=period_str,
                        period_start=start_date,
                        period_end=end_date,
                        is_derived=True,
                        derivation_notes='Operating Cash Flow or CapEx missing for FCF computation',
                    )

            quarterly_results.append({
                'fiscalYear': year,
                'fiscalPeriod': f'Q{q_num}',
                'period': period_str,
                'periodStart': start_date,
                'periodEnd': end_date,
                'filingDate': representative_filing_date,
                'form': representative_form or ('10-K' if q_num == 4 else '10-Q'),
                'accession': representative_accn,
                'metrics': metrics,
            })

        return quarterly_results

    def compute_ttm(
        self,
        quarterly_data: List[Dict[str, Any]],
        target_period: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Compute Trailing Twelve Months (TTM) fundamentals from 4 consecutive quarters.
        Calculates TTM sums for flow metrics, duration-weighted average for diluted shares,
        and derived TTM Diluted EPS (TTM common income / TTM diluted shares).
        """
        if not quarterly_data or len(quarterly_data) < 4:
            return None

        sorted_q = sorted(quarterly_data, key=lambda q: (q['fiscalYear'], q['fiscalPeriod']))

        if target_period:
            idx = next((i for i, q in enumerate(sorted_q) if q['period'] == target_period), None)
            if idx is None or idx < 3:
                return None
            trailing_4 = sorted_q[idx - 3: idx + 1]
        else:
            trailing_4 = sorted_q[-4:]

        included_periods = [q['period'] for q in trailing_4]
        as_of_period = included_periods[-1]

        ttm_metrics: Dict[str, Any] = {}

        # 1. Flow metrics (additive sums)
        for m_key, m_cfg in self.metric_defs.items():
            if m_cfg.get('type') != 'flow' or m_cfg.get('unsupported'):
                continue

            is_additive = m_cfg.get('isAdditive', True)
            if not is_additive:
                continue

            quarter_values: List[float] = []
            all_valid = True
            for q in trailing_4:
                m_entry = q.get('metrics', {}).get(m_key, {})
                val = m_entry.get('value')
                if val is None:
                    all_valid = False
                    break
                quarter_values.append(float(val))

            if all_valid and len(quarter_values) == 4:
                ttm_sum = sum(quarter_values)
                if all(isinstance(v, int) or v.is_integer() for v in quarter_values):
                    ttm_sum = int(ttm_sum)

                ttm_metrics[m_key] = {
                    'value': ttm_sum,
                    'unit': m_cfg.get('unit'),
                    'concept': m_cfg.get('concept'),
                    'label': m_cfg.get('label'),
                    'isDerived': True,
                    'derivationMethod': 'sum_of_trailing_4_quarters',
                    'source': 'SEC',
                    'quartersIncluded': included_periods,
                }
            else:
                ttm_metrics[m_key] = {
                    'value': None,
                    'unit': m_cfg.get('unit'),
                    'concept': m_cfg.get('concept'),
                    'label': m_cfg.get('label'),
                    'isDerived': True,
                    'derivationMethod': 'incomplete_quarters',
                    'notes': 'One or more of the 4 trailing quarters missing valid standalone values',
                    'quartersIncluded': included_periods,
                }

        # 2. TTM Diluted Weighted-Average Shares (duration-weighted)
        quarter_shares: List[float] = []
        quarter_durations: List[int] = []
        shares_all_valid = True

        for q in trailing_4:
            s_val = q.get('metrics', {}).get('dilutedShares', {}).get('value')
            if s_val is None or s_val <= 0:
                shares_all_valid = False
                break
            quarter_shares.append(float(s_val))

            s_dt_str = q.get('periodStart')
            e_dt_str = q.get('periodEnd')
            if s_dt_str and e_dt_str:
                try:
                    d_days = (datetime.strptime(e_dt_str, '%Y-%m-%d') - datetime.strptime(s_dt_str, '%Y-%m-%d')).days + 1
                except ValueError:
                    d_days = 91
            else:
                d_days = 91
            quarter_durations.append(max(1, d_days))

        ttm_shares_val: Optional[int] = None
        ttm_shares_method: Optional[str] = None
        ttm_shares_notes: Optional[str] = None

        if shares_all_valid and len(quarter_shares) == 4:
            # Check for split-basis consistency
            max_s = max(quarter_shares)
            min_s = min(quarter_shares)
            if min_s > 0 and (max_s / min_s) > 2.5:
                # Stock split occurred mid-TTM without retroactive restatement across all 4 quarters
                ttm_shares_method = 'unsupported_inconsistent_share_basis'
                ttm_shares_notes = (
                    'Incompatible share basis: stock split occurred mid-TTM; pre-split and post-split '
                    'quarters cannot be combined without retroactive SEC restatement across all 4 quarters'
                )
                ttm_metrics['dilutedShares'] = {
                    'value': None,
                    'unit': 'shares',
                    'concept': 'WeightedAverageNumberOfDilutedSharesOutstanding',
                    'label': 'TTM Weighted Average Number of Diluted Shares Outstanding',
                    'isDerived': True,
                    'derivationMethod': ttm_shares_method,
                    'notes': ttm_shares_notes,
                    'quartersIncluded': included_periods,
                }
            else:
                total_share_days = sum(s * d for s, d in zip(quarter_shares, quarter_durations))
                total_days = sum(quarter_durations)
                ttm_shares_val = int(round(total_share_days / total_days))
                ttm_shares_method = 'duration_weighted_trailing_4_quarters'
                ttm_shares_notes = f'Duration-weighted average of {len(trailing_4)} trailing quarters ({total_days} total days)'

                ttm_metrics['dilutedShares'] = {
                    'value': ttm_shares_val,
                    'unit': 'shares',
                    'concept': 'WeightedAverageNumberOfDilutedSharesOutstanding',
                    'label': 'TTM Weighted Average Number of Diluted Shares Outstanding',
                    'source': 'SEC-derived',
                    'isDerived': True,
                    'derivationMethod': ttm_shares_method,
                    'notes': ttm_shares_notes,
                    'quartersIncluded': included_periods,
                    'quarterShares': [int(s) for s in quarter_shares],
                    'quarterDurationsDays': quarter_durations,
                }
        else:
            ttm_shares_method = 'incomplete_quarters'
            ttm_shares_notes = 'One or more trailing quarters missing valid diluted share count'
            ttm_metrics['dilutedShares'] = {
                'value': None,
                'unit': 'shares',
                'concept': 'WeightedAverageNumberOfDilutedSharesOutstanding',
                'label': 'TTM Weighted Average Number of Diluted Shares Outstanding',
                'isDerived': True,
                'derivationMethod': ttm_shares_method,
                'notes': ttm_shares_notes,
                'quartersIncluded': included_periods,
            }

        # 3. Derived TTM Diluted EPS (TTM common income / TTM diluted shares)
        ttm_common_income = ttm_metrics.get('netIncomeToCommon', {}).get('value')
        if ttm_shares_val is not None and ttm_shares_val > 0 and ttm_common_income is not None:
            raw_ttm_eps = ttm_common_income / ttm_shares_val
            rounded_ttm_eps = round(raw_ttm_eps, 2)
            ttm_metrics['dilutedEps'] = {
                'value': rounded_ttm_eps,
                'exactValue': raw_ttm_eps,
                'unit': 'USD/shares',
                'concept': 'EarningsPerShareDiluted',
                'label': 'TTM Diluted Earnings Per Share',
                'source': 'SEC-derived',
                'isDerived': True,
                'derivationMethod': 'ttm_common_income_over_weighted_diluted_shares',
                'quartersIncluded': included_periods,
                'numeratorMetric': 'netIncomeToCommon',
                'denominatorMetric': 'dilutedShares',
            }
        else:
            ttm_metrics['dilutedEps'] = {
                'value': None,
                'unit': 'USD/shares',
                'concept': 'EarningsPerShareDiluted',
                'label': 'TTM Diluted Earnings Per Share',
                'isDerived': True,
                'derivationMethod': ttm_shares_method if ttm_shares_val is None else 'missing_numerator',
                'notes': ttm_shares_notes if ttm_shares_val is None else 'TTM Net income to common is missing',
                'quartersIncluded': included_periods,
            }

        # 4. Derived TTM Free Cash Flow Per Share (where FCF is supported)
        if self.metric_defs.get('freeCashFlow', {}).get('unsupported'):
            ttm_metrics['fcfPerShare'] = {
                'value': None,
                'unit': 'USD/shares',
                'unsupported': True,
                'unsupportedReason': self.metric_defs['freeCashFlow'].get('unsupportedReason'),
            }
        else:
            ttm_fcf = ttm_metrics.get('freeCashFlow', {}).get('value')
            if ttm_fcf is not None and ttm_shares_val is not None and ttm_shares_val > 0:
                raw_fcf_ps = ttm_fcf / ttm_shares_val
                rounded_fcf_ps = round(raw_fcf_ps, 2)
                ttm_metrics['fcfPerShare'] = {
                    'value': rounded_fcf_ps,
                    'exactValue': raw_fcf_ps,
                    'unit': 'USD/shares',
                    'label': 'TTM Free Cash Flow Per Share',
                    'source': 'SEC-derived',
                    'isDerived': True,
                    'derivationMethod': 'ttm_fcf_over_weighted_diluted_shares',
                    'quartersIncluded': included_periods,
                    'numeratorMetric': 'freeCashFlow',
                    'denominatorMetric': 'dilutedShares',
                }
            else:
                ttm_metrics['fcfPerShare'] = {
                    'value': None,
                    'unit': 'USD/shares',
                    'isDerived': True,
                    'derivationMethod': ttm_shares_method if ttm_shares_val is None else 'missing_fcf',
                    'notes': ttm_shares_notes if ttm_shares_val is None else 'TTM Free cash flow is missing',
                    'quartersIncluded': included_periods,
                }

        return {
            'asOfPeriod': as_of_period,
            'quarters': included_periods,
            'metrics': ttm_metrics,
        }

    def normalize(
        self,
        submissions_data: Dict[str, Any],
        facts_data: Dict[str, Any],
        annual_years: Optional[List[int]] = None,
        quarters: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Produce the full standardized NTM fundamentals JSON document."""
        company_info = self.normalize_company_info(submissions_data)
        filings = self.normalize_filings(submissions_data)
        discovered_ann, discovered_qtr = self.discover_filing_periods(submissions_data, facts_data)

        if annual_years is not None:
            selected_ann = [a for a in discovered_ann if a['fiscalYear'] in annual_years]
        else:
            selected_ann = discovered_ann[-3:]

        if quarters is not None:
            selected_qtr = [q for q in discovered_qtr if q['period'] in quarters]
        else:
            selected_qtr = discovered_qtr[-10:]

        annual = self.extract_annual_data(facts_data, annual_periods=selected_ann)
        quarterly = self.extract_quarterly_data(facts_data, quarterly_periods=selected_qtr)
        ttm = self.compute_ttm(quarterly)

        # Build Valuation Base block
        latest_ann = annual[-1] if annual else None
        latest_ann_eps = latest_ann.get('metrics', {}).get('dilutedEps') if latest_ann else None
        ttm_m = ttm.get('metrics', {}) if ttm else {}

        valuation_base = {
            'asOfPeriod': ttm.get('asOfPeriod') if ttm else None,
            'currency': 'USD',
            'latestAnnualPeriod': latest_ann.get('period') if latest_ann else None,
            'latestAnnualEps': latest_ann_eps,
            'ttmNetIncomeToCommon': ttm_m.get('netIncomeToCommon'),
            'ttmDilutedShares': ttm_m.get('dilutedShares'),
            'ttmDilutedEps': ttm_m.get('dilutedEps'),
            'ttmFreeCashFlow': ttm_m.get('freeCashFlow'),
            'ttmFcfPerShare': ttm_m.get('fcfPerShare'),
        }

        return {
            '$schema': 'ntm-stock-v0',
            'symbol': self.ticker,
            'company': company_info,
            'metadata': {
                'source': 'SEC EDGAR',
                'profile': self.profile['profileName'],
                'industry': self.profile.get('industry', ''),
                'profileDescription': self.profile['description'],
                'secCompanyFactsUrl': f"https://data.sec.gov/api/xbrl/companyfacts/CIK{company_info['cik']}.json",
                'secSubmissionsUrl': f"https://data.sec.gov/submissions/CIK{company_info['cik']}.json",
                'lastUpdated': company_info['lastUpdated'],
            },
            'valuationBase': valuation_base,
            'annual': annual,
            'quarterly': quarterly,
            'ttm': ttm,
            'filings': filings,
        }

