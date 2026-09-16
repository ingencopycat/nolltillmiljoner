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
    args = parser.parse_args()

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


if __name__ == '__main__':
    main()
