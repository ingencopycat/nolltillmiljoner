"""Versioned provenance and publication checks. No I/O or historical migration."""
import math
import re
from datetime import date, datetime

SCHEMA = 'ntm-stock-v1'
METHOD = 'ntm-sec-normalizer/1'
IDENTITIES = {'NVDA': '0001045810', 'SOFI': '0001818874', 'CRWD': '0001535527',
    'MU': '0000723125', 'MRVL': '0001835632', 'VRT': '0001674101',
    'COHR': '0000820318', 'RKLB': '0001819994',
    'TTMI': '0001116942', 'SNDK': '0002023554', 'FLY': '0001860160', 'CRWV': '0001769628'}


def enrich(doc):
    """Annotate newly normalized output only; retain the original SEC fact fields."""
    doc['$schema'] = SCHEMA
    generated = doc['metadata']['lastUpdated']
    doc['metadata'].update(methodVersion=METHOD, generatedAt=generated,
                           fetchedAt=None, updateStatus='normalized', qualityStatus='pending_validation')
    quarters = {q['period']: q for q in doc['quarterly']}
    filings = {f['accessionNumber']: f for f in doc['filings']}
    def filing_ids(metric, metrics, seen=None):
        seen = set() if seen is None else seen
        result = set()
        for reference in [metric.get('accession')] + (metric.get('derivedFrom') or []):
            if not isinstance(reference, str) or reference in seen:
                continue
            seen.add(reference)
            if re.fullmatch(r'\d{10}-\d{2}-\d{6}', reference):
                result.add(reference)
            elif reference in metrics:
                result.update(filing_ids(metrics[reference], metrics, seen))
        return sorted(result)
    periods = doc['annual'] + doc['quarterly']
    if doc['ttm']:
        ttm = doc['ttm']
        ttm.update(periodStart=quarters[ttm['quarters'][0]]['periodStart'],
                   periodEnd=quarters[ttm['quarters'][-1]]['periodEnd'], period=ttm['asOfPeriod'])
        periods = periods + [ttm]
    for period in periods:
        is_ttm = period is doc['ttm']
        for key, metric in period['metrics'].items():
            available = metric.get('value') is not None and not metric.get('unsupported')
            derived = is_ttm or metric.get('isDerived', False)
            metric.update(kind=('derived' if derived else 'reported') if available else 'unavailable',
                          qualityStatus='available' if available else 'unavailable', methodVersion=METHOD,
                          currency='USD' if 'USD' in (metric.get('unit') or '') else None,
                          definition=f"{key}:{metric.get('taxonomy', 'us-gaap')}:{metric.get('concept') or key}",
                          periodStart=period.get('periodStart'), periodEnd=period.get('periodEnd'),
                          period=period.get('period'), periodType='TTM' if is_ttm else 'annual' if period in doc['annual'] else 'quarter')
            if derived:
                metric['source'] = 'SEC-derived'
                metric.setdefault('derivationMethod', 'operatingCashFlow_minus_capex' if key == 'freeCashFlow' else 'duration_weighted_annual_minus_ytd9m' if key == 'dilutedShares' else 'standalone_period_difference')
                metric['sourceFilings'] = [dict(accession=a, filed=filings.get(a, {}).get('filingDate')) for a in filing_ids(metric, period['metrics'])]
                if any((filings.get(f['accession'], {}).get('form') or '').endswith('/A') for f in metric['sourceFilings']):
                    metric['restated'] = True
            if (metric.get('form') or '').endswith('/A'):
                metric['restated'] = True
            if is_ttm:
                if key == 'freeCashFlow': metric['derivationMethod'] = 'sum_of_quarterly_ocf_minus_capex'
                dependencies = [key]
                if key == 'dilutedEps': dependencies = ['netIncomeToCommon', 'dilutedShares']
                if key == 'fcfPerShare': dependencies = ['freeCashFlow', 'dilutedShares']
                if key == 'freeCashFlow': dependencies = ['operatingCashFlow', 'capex']
                metric['inputs'] = [dict(quarter=q, metric=k, **{
                    f: quarters[q]['metrics'].get(k, {}).get(f)
                    for f in ('value', 'concept', 'accession', 'filed', 'derivedFrom', 'sourceFilings', 'isDerived')})
                    for q in period['quarters'] for k in dependencies]
                metric['definition'] += ':' + '|'.join(sorted({f"{i['metric']}:{i['concept']}" for i in metric['inputs']}))
                metric['filed'] = max([i['filed'] for i in metric['inputs'] if i['filed']]
                                      + [f['filed'] for i in metric['inputs'] for f in i.get('sourceFilings') or [] if f['filed']], default=None)
                if any(quarters[q]['metrics'].get(k, {}).get('restated') for q in period['quarters'] for k in dependencies):
                    metric['restated'] = True
            if key in ('dilutedShares', 'dilutedEps', 'fcfPerShare'):
                # No split-adjusted basis is asserted without explicit source evidence.
                metric['shareBasis'] = None
                metric['shareBasisStatus'] = 'unverified'
    return doc


def validate(doc, ticker, previous=None):
    """Fail closed before replacing any known-good file."""
    from stock_normalizer import StockNormalizer
    if ticker not in IDENTITIES or doc.get('$schema') != SCHEMA:
        raise ValueError('Unsupported ticker/schema')
    if doc.get('symbol') != ticker or doc.get('company', {}).get('cik') != IDENTITIES[ticker] or doc['company'].get('ticker') != ticker:
        raise ValueError('Company identity mismatch')
    meta = doc.get('metadata', {})
    if meta.get('methodVersion') != METHOD or not meta.get('secCompanyFactsUrl') or not meta.get('generatedAt'):
        raise ValueError('Missing source/method metadata')
    datetime.fromisoformat(meta['generatedAt'])
    if meta['secCompanyFactsUrl'] != f"https://data.sec.gov/api/xbrl/companyfacts/CIK{IDENTITIES[ticker]}.json":
        raise ValueError('Unexpected source URL')
    def finite(value):
        if isinstance(value, float) and not math.isfinite(value): raise ValueError('Non-finite metric')
        if isinstance(value, dict):
            for v in value.values(): finite(v)
        if isinstance(value, list):
            for v in value: finite(v)
    finite(doc)
    for collection in ('annual', 'quarterly'):
        periods = doc.get(collection)
        if not isinstance(periods, list) or not periods: raise ValueError('Missing periods')
        ends, fiscal = [], []
        for p in periods:
            start, end = date.fromisoformat(p['periodStart']), date.fromisoformat(p['periodEnd'])
            if start > end or not p.get('period') or not p.get('metrics'): raise ValueError('Invalid period')
            if type(p.get('fiscalYear')) is not int: raise ValueError('Missing fiscal year')
            if collection == 'quarterly':
                if p.get('fiscalPeriod') not in ('Q1', 'Q2', 'Q3', 'Q4') or p['period'] != str(p['fiscalYear']) + p['fiscalPeriod']:
                    raise ValueError('Invalid fiscal period')
                fiscal.append(p['fiscalYear'] * 4 + int(p['fiscalPeriod'][1]))
                if not 80 <= (end - start).days + 1 <= 100: raise ValueError('Abnormal quarter duration')
            else:
                fiscal.append(p['fiscalYear'])
                if p['period'] != f"FY{p['fiscalYear']}" or not 350 <= (end - start).days + 1 <= 378:
                    raise ValueError('Abnormal annual period')
            ends.append(end)
            for m in p['metrics'].values():
                if m.get('qualityStatus') not in ('available', 'unavailable'): raise ValueError('Invalid quality')
                if m.get('value') is not None and (type(m['value']) not in (int, float) or not m.get('unit') or not m.get('definition') or m.get('methodVersion') != METHOD):
                    raise ValueError('Invalid metric contract')
                if m.get('kind') == 'reported' and (not m.get('accession') or not m.get('concept') or not m.get('filed')):
                    raise ValueError('Missing reported provenance')
        if ends != sorted(set(ends)): raise ValueError('Duplicate/unordered periods')
        if fiscal != sorted(set(fiscal)): raise ValueError('Invalid fiscal ordering')
    recomputed = StockNormalizer(ticker).compute_ttm(doc['quarterly'])
    ttm = doc.get('ttm')
    if not recomputed or not ttm or ttm.get('quarters') != recomputed['quarters']:
        raise ValueError('Unsafe TTM continuity')
    quarter_map = {q['period']: q for q in doc['quarterly']}
    if (ttm.get('asOfPeriod') != recomputed['asOfPeriod']
            or ttm.get('periodStart') != quarter_map[ttm['quarters'][0]]['periodStart']
            or ttm.get('periodEnd') != quarter_map[ttm['quarters'][-1]]['periodEnd']):
        raise ValueError('Invalid TTM period metadata')
    for key, value in recomputed['metrics'].items():
        if ttm['metrics'].get(key, {}).get('value') != value.get('value'): raise ValueError('TTM mismatch')
    for key in ('revenue', 'netIncome'):
        if ttm['metrics'].get(key, {}).get('value') is None: raise ValueError('Missing core TTM')
    if previous:
        if previous.get('symbol') != ticker: raise ValueError('Existing identity mismatch')
        if previous.get('$schema') not in ('ntm-stock-v0', SCHEMA): raise ValueError('Unsupported existing schema')
        old_end = max((q['periodEnd'] for q in previous.get('quarterly', [])), default='')
        if doc['quarterly'][-1]['periodEnd'] < old_end: raise ValueError('Reporting period regression')
        for key, metric in (previous.get('ttm') or {}).get('metrics', {}).items():
            if metric.get('value') is not None and ttm['metrics'].get(key, {}).get('value') is None:
                raise ValueError(f'Degraded TTM availability: {key}')
    return True
