#!/usr/bin/env python3
"""
update_stocks.py - Automated Stock Fundamentals & Filing Pipeline for NTM Research

Fetches verified SEC EDGAR XBRL company facts and submissions, normalizes fundamentals,
and writes atomic JSON outputs to data/stocks/{TICKER}.json.

Usage:
    python scripts/update_stocks.py --ticker SOFI
    python scripts/update_stocks.py --all
    python scripts/update_stocks.py --ticker SOFI --offline
"""

import argparse
import copy
import json
import os
import sys
import tempfile
from typing import Optional

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_STOCKS_DIR = os.path.join(WORKSPACE_DIR, 'data', 'stocks')
FIXTURES_DIR = os.path.join(WORKSPACE_DIR, 'tests', 'fixtures')

# Add scripts directory to module path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sec_client import SECClient, SECClientError
from stock_normalizer import StockNormalizer, COMPANY_PROFILES
from stock_contract import validate, IDENTITIES


def same_published_content(previous: dict, refreshed: dict) -> bool:
    """Ignore only run timestamps when deciding whether to republish a stock.

    A successful fetch with unchanged SEC evidence must not churn protected
    Research snapshots. Values, source provenance, status, and formatting of
    an existing file remain untouched; any other change is still published.
    """
    old, new = copy.deepcopy(previous), copy.deepcopy(refreshed)
    for document in (old, new):
        document.get('company', {}).pop('lastUpdated', None)
        metadata = document.get('metadata', {})
        for key in ('lastUpdated', 'generatedAt', 'fetchedAt'):
            metadata.pop(key, None)
    return old == new


def save_atomic_json(data: dict, target_path: str) -> None:
    """Atomically write JSON data to target path using a temporary file."""
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    target_dir = os.path.dirname(os.path.abspath(target_path))
    
    # Write to a temp file in the same directory to guarantee atomic replace
    temp_fd, temp_path = tempfile.mkstemp(prefix='stock_', suffix='.json.tmp', dir=target_dir)
    try:
        with os.fdopen(temp_fd, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False, allow_nan=False)
            f.write('\n')
        
        # Verify JSON validity before renaming
        with open(temp_path, 'r', encoding='utf-8') as f:
            _ = json.load(f)
            
        os.replace(temp_path, target_path)
    except Exception:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
        raise


def update_stock(
    ticker: str,
    client: Optional[SECClient] = None,
    offline: bool = False,
    output_dir: str = DATA_STOCKS_DIR,
) -> str:
    """
    Fetch and update normalized stock fundamentals for a ticker.
    Returns path of generated JSON file.
    """
    ticker_upper = ticker.strip().upper()
    if ticker_upper not in IDENTITIES:
        raise ValueError('Unsupported stock ticker')
    print(f"[*] Processing stock fundamentals for {ticker_upper}...")

    if offline:
        print(f"    [Offline mode] Loading SEC fixtures from {FIXTURES_DIR}")
        sub_file = os.path.join(FIXTURES_DIR, f'sec_{ticker_upper.lower()}_submissions.json')
        facts_file = os.path.join(FIXTURES_DIR, f'sec_{ticker_upper.lower()}_companyfacts.json')
        
        if not os.path.exists(sub_file) or not os.path.exists(facts_file):
            raise FileNotFoundError(f"Missing offline fixtures for {ticker_upper} in {FIXTURES_DIR}")
            
        with open(sub_file, 'r', encoding='utf-8') as f:
            sub_data = json.load(f)
        with open(facts_file, 'r', encoding='utf-8') as f:
            facts_data = json.load(f)
        cik = str(sub_data.get('cik', '')).zfill(10)
    else:
        sec_client = client or SECClient()
        print(f"    Resolving CIK for {ticker_upper} via SEC company_tickers.json...")
        cik = sec_client.resolve_cik(ticker_upper)
        print(f"    Verified CIK: {cik}")
        
        print(f"    Fetching SEC submissions metadata for CIK {cik}...")
        sub_data = sec_client.get_submissions(cik)
        
        print(f"    Fetching SEC XBRL company facts for CIK {cik}...")
        facts_data = sec_client.get_company_facts(cik)

    if (not isinstance(sub_data, dict) or not isinstance(facts_data, dict)
            or str(sub_data.get('cik', '')).zfill(10) != IDENTITIES[ticker_upper]
            or str(facts_data.get('cik', '')).zfill(10) != IDENTITIES[ticker_upper]
            or not facts_data.get('facts') or not sub_data.get('filings', {}).get('recent')):
        raise ValueError('Incomplete or mismatched SEC response')
    print("    Normalizing company profile, annual & quarterly fundamentals, TTM, and filings...")
    normalizer = StockNormalizer(ticker_upper)
    normalized_doc = normalizer.normalize(sub_data, facts_data)

    target_file = os.path.join(output_dir, f'{ticker_upper}.json')
    previous = None
    if os.path.exists(target_file):
        with open(target_file, encoding='utf-8') as f:
            previous = json.load(f)
    validate(normalized_doc, ticker_upper, previous)
    normalized_doc['metadata'].update(
        qualityStatus='validated', updateStatus='offline_fixture' if offline else 'success',
        fetchedAt=None if offline else normalized_doc['metadata']['generatedAt'])
    if previous is not None and same_published_content(previous, normalized_doc):
        print(f"[OK] Verified unchanged SEC evidence for {ticker_upper}; kept published file intact: {target_file}")
        return target_file
    save_atomic_json(normalized_doc, target_file)
    print(f"[OK] Successfully generated verified fundamentals: {target_file}")
    return target_file


def main():
    parser = argparse.ArgumentParser(description="Fetch and normalize SEC EDGAR fundamentals for NTM Research.")
    parser.add_argument('--ticker', type=str, default='SOFI', help="Stock ticker symbol (default: SOFI)")
    parser.add_argument('--all', action='store_true', help="Process all configured stock tickers")
    parser.add_argument('--offline', action='store_true', help="Run in offline mode using fixtures")
    parser.add_argument('--daily', action='store_true', help='Incremental pilot admission; same path for scheduled and owner runs')
    parser.add_argument('--evidence', action='store_true', help='Refresh only the three-company filing evidence pilot')
    parser.add_argument('--reviewed', action='store_true', help='Revalidate reviewed guidance and operating KPI passages')
    parser.add_argument('--insiders', action='store_true', help='Incrementally refresh SEC Form 4 ownership evidence')
    parser.add_argument('--ownership', action='store_true', help='Refresh reviewed Schedule 13D/G evidence and review queue')
    parser.add_argument('--material-events', action='store_true', help='Refresh reviewed material 8-K events and review queue')
    parser.add_argument('--reverify-material-events', action='store_true', help='Re-fetch reviewed material-event documents')
    parser.add_argument('--reverify-ownership', action='store_true', help='Re-fetch reviewed Schedule sources without rewriting history')
    parser.add_argument('--reverify-insiders', action='store_true', help='Also re-fetch retained ownership documents; changes require review')
    args = parser.parse_args()

    if args.daily:
        if args.offline or args.evidence or args.reviewed or args.insiders or args.ownership or args.material_events or args.reverify_insiders or args.reverify_ownership or args.reverify_material_events:
            parser.error('--daily uses its own admission policy; do not combine refresh modes')
        from sec_daily import run
        from company_evidence import PILOT
        result = run(list(PILOT) if args.all else [args.ticker.upper()], SECClient())
        if result['rejectedFailed']:
            raise SystemExit(1)
        return

    if args.evidence:
        from company_evidence import PILOT
        client = SECClient()
        failures = []
        for ticker in (PILOT if args.all else [args.ticker.upper()]):
            try:
                update_evidence(ticker, client, offline=args.offline, reviewed=args.reviewed, insiders=args.insiders or args.reverify_insiders, reverify_insiders=args.reverify_insiders, ownership=args.ownership or args.reverify_ownership, reverify_ownership=args.reverify_ownership, material_events=args.material_events or args.reverify_material_events, reverify_material_events=args.reverify_material_events)
            except Exception as error:
                failures.append(ticker)
                print(f"Evidence refresh failed for {ticker}: {error}", file=sys.stderr)
        if failures:
            raise SystemExit(1)
        return

    tickers_to_process = list(COMPANY_PROFILES.keys()) if args.all else [args.ticker.upper()]

    success_count = 0
    for t in tickers_to_process:
        try:
            update_stock(t, offline=args.offline)
            success_count += 1
        except Exception as exc:
            print(f"[!] Error updating {t}: {exc}", file=sys.stderr)
            sys.exit(1)

    print(f"\nCompleted {success_count}/{len(tickers_to_process)} tickers successfully.")


def update_evidence(ticker, client, offline=False, output_dir=None, reviewed=False, insiders=False, reverify_insiders=False, ownership=False, reverify_ownership=False, material_events=False, reverify_material_events=False):
    """Independent refresh cadence; shares SEC transport, identities and atomic publication."""
    from company_evidence import PILOT, refresh, validate_evidence
    from datetime import datetime, timezone
    from pathlib import Path
    if ticker not in PILOT:
        raise ValueError('Outside evidence pilot')
    directory = Path(output_dir or os.path.join(DATA_STOCKS_DIR, 'evidence'))
    target = directory / (ticker + '.json')
    previous = json.loads(target.read_text(encoding='utf-8')) if target.exists() else None
    now = datetime.now(timezone.utc).isoformat()
    try:
        if previous:
            validate_evidence(previous, ticker, IDENTITIES[ticker])
        if offline:
            fixtures = Path(FIXTURES_DIR) / 'company_evidence'
            submissions = json.loads((fixtures / (ticker + '.json')).read_text(encoding='utf-8'))
            def fetch(url):
                accession = url.split('/')[-2]
                accession = accession[:10] + '-' + accession[10:12] + '-' + accession[12:]
                return (fixtures / (accession + '.html')).read_text(encoding='utf-8')
        else:
            submissions = client.get_submissions(IDENTITIES[ticker])
            fetch = client.get_filing_html
        cached = previous if previous and previous.get('status') == 'verified' and not offline else None
        document = refresh(submissions, ticker, IDENTITIES[ticker], fetch, cached)
        if reviewed:
            from reviewed_company_evidence import build
            if offline:
                def reviewed_fetch(url):
                    acc = url.split('/')[-2]
                    acc = acc[:10] + '-' + acc[10:12] + '-' + acc[12:]
                    return (Path(FIXTURES_DIR) / 'company_observations' / (acc + '.html')).read_text(encoding='utf-8')
            else:
                from reviewed_company_evidence import REVIEWS
                periodic = {r['document']['url'] for r in json.loads(REVIEWS.read_text(encoding='utf-8'))['documents']
                            if r['document']['documentType'] == 'periodic_filing'}
                def reviewed_fetch(url):
                    return client.get_filing_html(url, max_bytes=10_000_000) if url in periodic else fetch(url)
            document['reviewedEvidence'] = build(document, reviewed_fetch)
            if previous and previous.get('status') == 'verified':
                old = {o['id'] for o in previous.get('reviewedEvidence', {}).get('observations', [])}
                new = {o['id'] for o in document['reviewedEvidence']['observations']}
                if not old.issubset(new):
                    raise ValueError('Refresh would remove reviewed historical observations')
        elif previous and previous.get('reviewedEvidence'):
            document['reviewedEvidence'] = previous['reviewedEvidence']
            newest = max(o['publicationDate'] for o in document['reviewedEvidence']['observations'])
            document['reviewedEvidence']['pendingReview'] = [e['accessionNumber'] for e in document['events']
                if e['classification'] == 'results_disclosure' and e['filingDate'] > newest]
        if insiders:
            from company_insiders import refresh as refresh_insiders
            insider_submissions=submissions
            if offline:
                ownership_fixtures=Path(FIXTURES_DIR)/'company_insiders'
                insider_submissions=json.loads((ownership_fixtures/(ticker+'.json')).read_text(encoding='utf-8'))
                def fetch_xml(url):
                    a=url.split('/')[-2];a=a[:10]+'-'+a[10:12]+'-'+a[12:]
                    return (ownership_fixtures/(a+'.xml')).read_text(encoding='utf-8')
            else:
                fetch_xml=client.get_ownership_xml
            document['insiderEvidence']=refresh_insiders(insider_submissions,ticker,IDENTITIES[ticker],fetch_xml,
                previous.get('insiderEvidence') if previous and not offline else None,reverify=reverify_insiders)
        elif previous and previous.get('insiderEvidence'):
            document['insiderEvidence']=previous['insiderEvidence']
        if ownership:
            from company_ownership import refresh as refresh_ownership
            ownership_submissions=submissions
            if offline:
                ownership_fixtures=Path(FIXTURES_DIR)/'company_ownership'
                ownership_submissions=json.loads((ownership_fixtures/(ticker+'.json')).read_text(encoding='utf-8'))
                def ownership_fetch(url):
                    a=url.split('/')[-2];a=a[:10]+'-'+a[10:12]+'-'+a[12:]
                    return (ownership_fixtures/(a+('.xml' if url.endswith('.xml') else '.html'))).read_text(encoding='utf-8')
            else:
                def ownership_fetch(url):
                    return client.get_ownership_xml(url) if url.endswith('.xml') else client.get_filing_html(url)
            document['ownershipEvidence']=refresh_ownership(ownership_submissions,ticker,IDENTITIES[ticker],ownership_fetch,
                previous.get('ownershipEvidence') if previous and not offline else None,reverify=reverify_ownership)
        elif previous and previous.get('ownershipEvidence'):
            document['ownershipEvidence']=previous['ownershipEvidence']
        if material_events:
            from company_material_events import refresh as refresh_material
            material_submissions=submissions
            if offline:
                material_fixtures=Path(FIXTURES_DIR)/'company_material_events'
                material_submissions=json.loads((material_fixtures/(ticker+'.json')).read_text(encoding='utf-8'))
                def material_fetch(url):
                    a=url.split('/')[-2];a=a[:10]+'-'+a[10:12]+'-'+a[12:]
                    return (material_fixtures/(a+'.html')).read_text(encoding='utf-8')
            else:
                material_fetch=client.get_filing_html
            document['materialEvents']=refresh_material(material_submissions,ticker,IDENTITIES[ticker],material_fetch,
                previous.get('materialEvents') if previous and not offline else None,reverify=reverify_material_events)
        elif previous and previous.get('materialEvents'):
            document['materialEvents']=previous['materialEvents']
        validate_evidence(document, ticker, IDENTITIES[ticker])
        document.update(verifiedAt=now, status='offline_fixture' if offline else 'verified')
        save_atomic_json(document, str(target))
        save_atomic_json(dict(status=document['status'], checkedAt=now), str(directory / (ticker + '.status.json')))
        return document
    except Exception:
        # Never replace the last verified evidence with an empty or partial refresh.
        save_atomic_json(dict(status='unavailable', checkedAt=now), str(directory / (ticker + '.status.json')))
        raise


if __name__ == '__main__':
    main()
