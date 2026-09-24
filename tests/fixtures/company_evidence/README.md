# Frozen SEC evidence fixtures

Retrieved 2026-09-22 using the existing SEC client identity and throttle. JSON files contain only selected official submissions columns (24 supported recent filings per pilot issuer). HTML files contain only verbatim Item 2.02 and exhibit-table fragments; wrappers were added for parsing. These are inert parser fixtures, not full earnings releases, screenshots, charts, or editorial content. No scripts are executed or served in the staged site.

Canonical source: https://data.sec.gov/submissions/CIK{CIK}.json. CIKs: NVDA 0001045810, SOFI 0001818874, CRWD 0001535527. Each HTML filename is the accession; find its primaryDocument in the corresponding JSON. Official URL: https://www.sec.gov/Archives/edgar/data/{integer CIK}/{accession without hyphens}/{primaryDocument}.

amendments.json contains two additional official SoFi rows (2024 8-K/A and 2022 10-K/A) solely to test amendment semantics; no broad historical backfill. Synthetic mutations in tests are explicitly synthetic, not source facts. Fragment hashes differ from full-source production hashes by design.

Scope follows the audit's SEC EDGAR reuse finding and https://www.sec.gov/about/webmaster-frequently-asked-questions . Only the minimum source structure needed for deterministic relationship checks is retained. CI never fetches these sources. IR equivalence is unverified and no duplicate IR evidence is recorded.

## Daily source preservation

New earnings relationships retain bounded Item 2.02 text and exhibit rows with inert HTML wrappers, not whole filings. The manifest separately records the fragment hash and original-document sourceSha256; JSON/text hashes use UTF-8 with LF. New snippets must reproduce legal status as well as exhibit relationships. Legacy fragments retain their original relationship-only contract; the historical SoFi legal-status/full-document hash discrepancy is documented in [the lifecycle audit](../../../docs/internal/sec-source-lifecycle-2026-09-24.md).
