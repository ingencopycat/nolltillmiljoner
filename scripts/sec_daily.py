"""Incremental admission policy over the existing SEC parsers and publication contracts.

Only public issuer data is read. Review state lives outside the staged website.
The caller's checkout is a candidate; the existing release job gates publication.
"""
import copy
import hashlib
import json
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
import xml.etree.ElementTree as ET

from company_evidence import PILOT, filing_events, earnings_documents, latest_report, validate_evidence
from company_insiders import metadata as insider_index, parse as parse_insider
from company_ownership import index as ownership_index
from stock_contract import IDENTITIES
from update_stocks import update_stock, save_atomic_json

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / 'scripts/source_reviews/daily_state.json'
START = '2026-09-01'
MAX_NEW = 100


class ReviewRequired(Exception):
    pass


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def discovery(submissions, ticker):
    cik = IDENTITIES[ticker]
    events = {e['accessionNumber']: e for e in filing_events(submissions, ticker, cik, 10000)}
    for collection in (insider_index(submissions, ticker, cik), ownership_index(submissions, ticker, cik)):
        if events.keys() & collection.keys():
            raise ValueError('Conflicting form identity')
        events.update(collection)
    return events


def review_reason(meta):
    form = meta['form']
    if form == '4/A':
        return 'Amendment scope and reconciliation require review.'
    if '13D' in form or '13G' in form:
        return 'Ownership entity, security class and comparability require review.'
    if form.startswith('10-'):
        return 'Review new/changed KPI, segment definitions, recasts and capital disclosures; no narrative observations auto-extracted.'
    if form.startswith('8-K'):
        if '2.02' in meta['items']:
            return 'Earnings: new KPI, changed segment definition or ambiguous guidance requires passage and comparability review.'
        return 'Unreviewed 8-K item/structure: ' + ', '.join(meta['items'])
    return 'Unsupported structure requires review.'


def review_item(meta, reason):
    return dict(ticker=meta['ticker'], accession=meta['accessionNumber'], form=meta['form'],
                filingDate=meta['filingDate'], url=meta.get('primaryDocUrl', meta.get('url')),
                recognized=meta.get('classification', meta['form']), reason=reason)


def guard_financials(old, new):
    """Same historical observation is immutable; additions need an established definition."""
    added = 0
    for group in ('annual', 'quarterly'):
        prior = {r['periodEnd']: r for r in old[group]}
        current = {r['periodEnd']: r for r in new[group]}
        if any(current.get(end) != row for end, row in prior.items()):
            raise ReviewRequired('Historical financial values/provenance changed or disappeared; review restatement.')
        definitions = {(key, m.get('definition'), m.get('unit'), m.get('kind'))
                       for row in prior.values() for key, m in row['metrics'].items() if m.get('value') is not None}
        for end, row in current.items():
            if end in prior:
                continue
            for key, metric in row['metrics'].items():
                if metric.get('value') is not None:
                    if (key, metric.get('definition'), metric.get('unit'), metric.get('kind')) not in definitions:
                        raise ReviewRequired('New financial definition/unit/derivation requires review.')
                    added += 1
    return added


def known_accessions(document):
    known = {e['accessionNumber'] for e in document['events']}
    for section in ('insiderEvidence', 'ownershipEvidence'):
        known.update(f['accessionNumber'] for f in document.get(section, {}).get('filings', []))
    known.update(document.get('materialEvents', {}).get('documents', {}))
    return known


def insider_candidate(xml, meta):
    parsed = parse_insider(xml, meta)  # Existing identity, numeric and XML safety boundary first.
    # Only XML paths actually exercised by reviewed pilot sources are auto-admitted.
    allowed = set(read(ROOT / 'scripts/source_reviews/insider_structure.json')['paths'])
    def paths(node, prefix=''):
        path = prefix + '/' + node.tag
        return {path} | set().union(*(paths(child, path) for child in node))
    if not paths(ET.fromstring(xml)).issubset(allowed):
        raise ReviewRequired('New ownership XML structure requires review.')
    if any(row['classification']['category'] == 'other' or row['code'] not in ('P', 'S', 'A', 'M', 'C', 'X', 'O', 'F')
           for row in parsed['transactions']):
        raise ReviewRequired('Unrecognized transaction classification requires review.')
    return parsed


def refresh_issuer(ticker, client, stock_dir, previous_state, statistics=None):
    target = stock_dir / 'evidence' / (ticker + '.json')
    document = read(target)
    validate_evidence(document, ticker, IDENTITIES[ticker])
    if document.get('status') != 'verified':
        raise ValueError('Daily refresh requires a verified production baseline')
    sub = client.get_submissions(IDENTITIES[ticker])
    index = discovery(sub, ticker)
    checkpoint = previous_state.get('through', START)
    dates = [e['filingDate'] for e in index.values()]
    if not dates or min(dates) > checkpoint:
        raise ValueError('SEC recent window gap; controlled catch-up required')
    seen = previous_state.get('seen', {})
    if any(a in index and fingerprint(index[a]) != digest for a, digest in seen.items()):
        raise ValueError('Previously discovered accession metadata changed')
    relevant = {a: e for a, e in index.items() if e['filingDate'] >= START}
    known = known_accessions(document)
    for section in [document['events'], document['insiderEvidence']['filings']]:
        for prior in section:
            meta = index.get(prior['accessionNumber'])
            if meta and any(prior.get(k) != v for k, v in meta.items()
                            if k not in ('documents', 'documentStatus')):
                raise ValueError('Published source metadata changed')
    new = [e for a, e in relevant.items() if a not in seen and a not in known]
    if statistics is not None:
        statistics['newFilings'] = len(new)
    if len(new) > MAX_NEW:
        raise ValueError('Catch-up exceeds 100 documents; controlled review required')
    state = copy.deepcopy(previous_state)
    pending = state.setdefault('review', {})
    # Never infer that one reviewed number resolves every ambiguity in a filing.
    # The owner closes this entry with the source review/regenerated evidence change.
    for key in ('reviewedEvidence', 'ownershipEvidence', 'materialEvents'):
        for row in document.get(key, {}).get('pendingReview', []):
            acc = row if isinstance(row, str) else row['accessionNumber']
            if acc in index:
                pending.setdefault(acc, review_item(index[acc], review_reason(index[acc])))
    accepted = 0
    candidate = copy.deepcopy(document)
    financials_done = False
    facts_cache = {}
    for meta in sorted(new, key=lambda e: (e['filingDate'], e['accessionNumber'])):
        if statistics is not None:
            statistics['currentSource'] = review_item(meta, 'Failed while processing this public source; retained issuer baseline.')
        acc, form = meta['accessionNumber'], meta['form']
        reason = None
        try:
            if form == '4':
                parsed = insider_candidate(client.get_ownership_xml(meta['url']), meta)
                candidate['insiderEvidence']['filings'].append(parsed)
                accepted += len(parsed['transactions']) + len(parsed['holdings'])
            elif form in ('10-K', '10-Q'):
                if not financials_done:
                    old = read(stock_dir / (ticker + '.json'))
                    class CachedSubmissions:
                        def resolve_cik(self, symbol): return IDENTITIES[symbol]
                        def get_submissions(self, cik): return sub
                        def get_company_facts(self, cik):
                            if cik not in facts_cache:
                                facts_cache[cik] = client.get_company_facts(cik)
                            return facts_cache[cik]
                    with tempfile.TemporaryDirectory() as temporary:
                        temp = Path(temporary) / (ticker + '.json')
                        temp.write_bytes((stock_dir / (ticker + '.json')).read_bytes())
                        update_stock(ticker, CachedSubmissions(), output_dir=temporary)
                        normalized = read(temp)
                        count = guard_financials(old, normalized)
                        required = {e['accessionNumber'] for e in new if e['form'] in ('10-K', '10-Q')}
                        if not required.issubset({r.get('accession') for r in normalized['annual'] + normalized['quarterly']}):
                            raise ValueError('Company facts not yet available for new periodic filing')
                        (stock_dir / (ticker + '.json')).write_bytes(temp.read_bytes())
                        accepted += count
                    financials_done = True
                candidate['events'].append(meta)
                accepted += 1
                reason = review_reason(meta)
            elif form == '8-K' and '2.02' in meta['items']:
                event = copy.deepcopy(meta)
                source = client.get_filing_html(event['primaryDocUrl'])
                if not isinstance(source, str) or len(source.encode()) > 2_000_000 or not re.search(r'<html\b', source, re.I):
                    raise ValueError('Malformed earnings filing HTML')
                event['documents'] = earnings_documents(event, source)
                if not event['documents']:
                    raise ReviewRequired('Unsupported or ambiguous earnings exhibit relationship.')
                event['documentStatus'] = 'verified'
                candidate['events'].append(event)
                accepted += 1
                reason = review_reason(meta)
            elif form == '8-K' and meta['items'] and set(meta['items']).issubset({'5.07', '9.01'}):
                # Known routine vote/exhibit-only metadata; no inferred material event.
                candidate['events'].append(meta)
                accepted += 1
            else:
                reason = review_reason(meta)
        except ReviewRequired as error:
            reason = str(error)
        if reason:
            pending[acc] = review_item(meta, reason)
    candidate['events'] = sorted(candidate['events'], key=lambda e: (e['filingDate'], e['accessionNumber']), reverse=True)[:24]
    latest = latest_report(candidate['events'])
    candidate['latestReportAccession'] = latest['accessionNumber'] if latest else None
    candidate['insiderEvidence']['filings'].sort(key=lambda e: (e['filingDate'], e['accessionNumber']), reverse=True)
    validate_evidence(candidate, ticker, IDENTITIES[ticker])
    if candidate != document:
        candidate['verifiedAt'] = datetime.now(timezone.utc).isoformat()
        save_atomic_json(candidate, str(target))
        save_atomic_json(dict(status='verified', checkedAt=candidate['verifiedAt']), str(target.with_name(ticker + '.status.json')))
    state['seen'] = {a: fingerprint(e) for a, e in relevant.items()}
    state['through'] = max(dates)
    if len(pending) > 2000:
        raise ValueError('Review backlog exceeds bound; owner action required')
    return state, len(new), accepted


def run(tickers, client, stock_dir=None, state_path=None, report_path=None):
    stock_dir = Path(stock_dir or ROOT / 'data/stocks')
    state_path = Path(state_path or STATE)
    report_path = Path(report_path or ROOT / 'artifacts/sec-refresh.json')
    if not tickers or any(t not in PILOT for t in tickers) or len(set(tickers)) != len(tickers):
        raise ValueError('Unsupported daily selection')
    state = read(state_path) if state_path.exists() else {'schema': 'ntm-sec-daily/1', 'issuers': {}}
    if state.get('schema') != 'ntm-sec-daily/1':
        raise ValueError('Unsupported refresh state')
    report = dict(issuersChecked=0, newFilings=0, acceptedObservationsEvents=0,
                  reviewRequired=0, rejectedFailed=0, productionDataChanged=False, issuers=[])
    # All issuer work is isolated. A failed issuer contributes no files or checkpoint.
    changes = {}
    for ticker in tickers:
        report['issuersChecked'] += 1
        item = dict(ticker=ticker, outcome='UNCHANGED')
        statistics = {'newFilings': 0}
        with tempfile.TemporaryDirectory() as temporary:
            staged = Path(temporary)
            names = [Path(ticker + '.json'), Path('evidence') / (ticker + '.json'), Path('evidence') / (ticker + '.status.json')]
            original = {name: (stock_dir / name).read_bytes() for name in names}
            for name, content in original.items():
                (staged / name).parent.mkdir(parents=True, exist_ok=True)
                (staged / name).write_bytes(content)
            try:
                updated, discovered, accepted = refresh_issuer(ticker, client, staged, state['issuers'].get(ticker, {}), statistics)
                state['issuers'][ticker] = updated
                report['acceptedObservationsEvents'] += accepted
                report['reviewRequired'] += len(updated['review'])
                item.update(newFilings=discovered, accepted=accepted, reviewRequired=len(updated['review']),
                            review=list(updated['review'].values())[:100], omittedReview=max(0, len(updated['review']) - 100))
                for name, content in original.items():
                    if (staged / name).read_bytes() != content:
                        changes[stock_dir / name] = (staged / name).read_bytes()
                item['outcome'] = 'AUTO-ACCEPT' if accepted else 'REVIEW REQUIRED' if updated['review'] else 'UNCHANGED'
            except Exception as error:
                report['rejectedFailed'] += 1
                # Never copy arbitrary transport/source error text into an artifact.
                item.update(outcome='REJECT/FAILED', reason=type(error).__name__ + ': issuer retained; inspect source/contract or retry.')
                if 'currentSource' in statistics:
                    item['failedSource'] = statistics['currentSource']
            report['newFilings'] += statistics['newFilings']
            report['issuers'].append(item)
    report['productionDataChanged'] = bool(changes)
    # Roll back local writes if the filesystem fails. CI publishes one validated git revision.
    backups = {path: path.read_bytes() if path.exists() else None for path in [*changes, state_path]}
    try:
        for path, content in changes.items():
            save_atomic_json(json.loads(content), str(path))
        save_atomic_json(state, str(state_path))
    except Exception:
        for path, content in backups.items():
            if content is None:
                path.unlink(missing_ok=True)
            else:
                path.write_bytes(content)
        raise
    save_atomic_json(report, str(report_path))
    print(json.dumps({k: v for k, v in report.items() if k != 'issuers'}))
    return report
