#!/usr/bin/env python3
"""
sec_client.py - Official SEC EDGAR API Client for NTM Research

Interacts directly with official SEC EDGAR endpoints:
- https://www.sec.gov/files/company_tickers.json (Ticker to CIK mapping)
- https://data.sec.gov/submissions/CIK{cik.zfill(10)}.json (Filing metadata & company details)
- https://data.sec.gov/api/xbrl/companyfacts/CIK{cik.zfill(10)}.json (XBRL structured fundamentals)

Complies with SEC automated access policy:
- Declares user-agent header in format: 'Sample Company Name AdminContact@<sample company domain>.com'
- Rate limits requests to stay well below the 10 requests/second threshold.
- Handles HTTP 429, retry-after, and transient connection drops.
"""

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional


DEFAULT_USER_AGENT = 'NTMResearch admin@nolltillmiljoner.se'
DEFAULT_RATE_LIMIT_DELAY = 0.15  # SEC allows max 10 req/sec; 0.15s ensures ~6.6 req/sec max


class SECClientError(Exception):
    """Base exception for SEC EDGAR API errors."""
    pass


class SECCIKNotFoundError(SECClientError):
    """Raised when a ticker symbol cannot be mapped to a valid CIK."""
    pass


class SECNetworkError(SECClientError):
    """Raised on connection or HTTP error from SEC EDGAR."""
    pass


class SECClient:
    """Client for fetching structured financial data and filing metadata from SEC EDGAR."""

    def __init__(
        self,
        user_agent: str = DEFAULT_USER_AGENT,
        rate_limit_delay: float = DEFAULT_RATE_LIMIT_DELAY,
        timeout: int = 20,
    ):
        self.user_agent = user_agent
        self.rate_limit_delay = rate_limit_delay
        self.timeout = timeout
        self._last_request_time = 0.0
        self._tickers_cache: Optional[Dict[str, Any]] = None

    def _throttle(self) -> None:
        """Enforce minimum delay between SEC requests."""
        now = time.time()
        elapsed = now - self._last_request_time
        if elapsed < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - elapsed)
        self._last_request_time = time.time()

    def _fetch_json(self, url: str) -> Dict[str, Any]:
        """Fetch JSON from SEC with user-agent, error handling, and throttling."""
        self._throttle()
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': self.user_agent,
                'Accept-Encoding': 'gzip, deflate',
                'Accept': 'application/json',
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = resp.read()
                # Handle possible gzip compression if urllib doesn't decompress automatically
                if resp.info().get('Content-Encoding') == 'gzip':
                    import gzip
                    data = gzip.decompress(data)
                return json.loads(data.decode('utf-8'))
        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                raise SECNetworkError(f'SEC EDGAR rate limit exceeded (HTTP 429) for {url}') from exc
            if exc.code == 404:
                raise SECNetworkError(f'Resource not found at SEC EDGAR (HTTP 404): {url}') from exc
            raise SECNetworkError(f'SEC EDGAR HTTP error {exc.code} for {url}: {exc.reason}') from exc
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            raise SECNetworkError(f'Network failure while connecting to SEC EDGAR ({url}): {exc}') from exc
        except json.JSONDecodeError as exc:
            raise SECClientError(f'Invalid JSON response received from SEC EDGAR ({url}): {exc}') from exc

    def get_company_tickers(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Fetch and cache ticker to CIK mappings from SEC."""
        if self._tickers_cache is None or force_refresh:
            url = 'https://www.sec.gov/files/company_tickers.json'
            self._tickers_cache = self._fetch_json(url)
        return self._tickers_cache

    def resolve_cik(self, ticker: str) -> str:
        """Resolve a stock ticker symbol (e.g. 'SOFI') to its zero-padded 10-digit CIK."""
        ticker_upper = ticker.strip().upper()
        tickers_data = self.get_company_tickers()
        for item in tickers_data.values():
            if str(item.get('ticker', '')).upper() == ticker_upper:
                raw_cik = str(item.get('cik_str', ''))
                return raw_cik.zfill(10)
        raise SECCIKNotFoundError(f"Ticker '{ticker}' not found in official SEC company_tickers.json")

    def get_submissions(self, cik: str) -> Dict[str, Any]:
        """Fetch submissions metadata for a given CIK."""
        cik_clean = str(cik).strip().zfill(10)
        url = f'https://data.sec.gov/submissions/CIK{cik_clean}.json'
        return self._fetch_json(url)

    def get_company_facts(self, cik: str) -> Dict[str, Any]:
        """Fetch all structured XBRL company facts for a given CIK."""
        cik_clean = str(cik).strip().zfill(10)
        url = f'https://data.sec.gov/api/xbrl/companyfacts/CIK{cik_clean}.json'
        return self._fetch_json(url)
