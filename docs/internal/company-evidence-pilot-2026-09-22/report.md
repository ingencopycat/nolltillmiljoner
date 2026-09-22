# SEC filing-event and earnings-document pilot

Implemented locally on 2026-09-22 for NVDA, SOFI and CRWD. Primary planning reference: `../free-data-audit-2026-09-22/report.md`. **Locally release-ready within the bounds below.** No commit, push or deployment was performed. The pre-existing untracked audit directory was left untouched.

## What was built

A small `ntm-company-evidence/1` contract extends the existing SEC pipeline. It reuses `SECClient`, the canonical CIK registry, the updater entry point, atomic JSON publication, static data staging, and Research's selected-revision lifecycle. It does not replace or renormalize statements/companyfacts. Its separate evidence files avoid churn in financial evidence and frozen Research snapshots.

Each event retains ticker/CIK, form, accession, filing date, report/event date, primary document, SEC URLs, item codes, amendment flag, classification and submissions provenance. Accession is the stable identity; exact duplicates collapse and conflicting duplicates reject the refresh. Events sort by filing date, then accession for deterministic same-day display (not claimed to be acceptance-time ordering).

Only 10-K, 10-Q, their amendments, 8-K and 8-K/A are supported. Classification has four values: annual report, quarterly report, item-2.02 results disclosure, and neutral other current report. Other 8-K items remain visible as filed metadata, without a broad taxonomy or inferred business consequences. Amendments have distinct accessions; they do not silently replace original reports. Latest periodic report is selected by report period and filing date, excluding amendments.

## Actual official evidence

Live submissions and primary filings were retrieved using the existing SEC identity/throttle. Production files retain 24 supported recent events per company: **72 events, 19 verified earnings-release relationships, one unsupported relationship**. The bounded history starts in April 2025 (NVDA), March 2025 (SOFI), and December 2024 (CRWD).

| Issuer | Latest earnings filing examined | SEC exhibit 99.1 | Latest periodic report accession |
|---|---|---|---|
| NVDA | 0001045810-26-000073, 2026-08-26 | q2fy27pr.htm | 0001045810-26-000075 |
| SOFI | 0001818874-26-000050, 2026-07-29 | a2026q2earningsrelease.htm | 0001818874-26-000054 |
| CRWD | 0001535527-26-000029, 2026-08-26 | crwd-20260826xex991.htm | 0001535527-26-000031 |

Every production event includes its full official URL. The fixture manifest additionally records source URLs, retrieval date, transformations and fragment hashes. Twenty small primary-filing excerpts preserve Item 2.02 and exhibit-table structure, not full releases. Two additional official SoFi metadata rows, 0001818874-24-000084 (8-K/A) and 0001818874-22-000058 (10-K/A), test amendments without a historical production backfill. Source reuse scope follows the audit; fixture rights/minimization are documented alongside the fixtures.

## Earnings relationships and limits

The parser requires SEC item 2.02, a bounded Item 2.02 text section that explicitly refers to a release and the exhibit number, and an exhibit-table row describing that release with one unambiguous link inside the same accession directory. It never classifies from a filename alone. Duplicate link fragments collapse; conflicting exhibit identities/URLs fail closed. Each document retains exhibit identity, document type, parent accession, SEC source, relationship evidence URL and primary-source SHA-256. Furnished status is recorded when explicitly supported; otherwise it remains unspecified.

CrowdStrike accession **0001104659-25-045244** is an item-2.02 disclosure whose relationship does not satisfy this supported structure. Its event remains available with `unsupported_relationship`; no release link is fabricated. CFO commentary and presentations remain outside the release-only parser. IR equivalence was not independently established, so no duplicate IR publications are recorded as evidence.

The feed establishes the release-to-8-K relationship. It deliberately does not manufacture a release-to-10-Q/10-K relationship from nearby dates. An 8-K event date is not a fiscal period end. The UI explains this and shows the latest periodic report and latest results disclosure separately. Release contents, guidance, issuer KPIs, commentary and financial tables are not extracted. No AI is involved.

## Product and Research integration

Research's existing filing section presents Swedish latest-report context, official release access, and at most eight recent events behind a disclosure. Its old filing list is hidden only after the validated pilot view loads; it remains the fallback on failure and for other issuers. Fundamental Profile gains only a link to this source context, with no changes to its descriptions or calculations.

The view reuses the currently selected saved revision's date and reports how many events in the bounded feed were filed after that date. Same-day order is explicitly unknown. A zero count means zero within this retained selection, not proof of no disclosures in an unlimited archive. This is neutral evidence context, not a thesis judgment. Existing metric change detection, saved revision payloads and Public Research snapshots remain unchanged. Public Research regression tests passed.

## Refresh, failure and security

Run `python -B scripts/update_stocks.py --evidence --ticker NVDA` for one issuer, or `--evidence --all` for the pilot. No companyfacts rebuild is needed. Each successful refresh reads submissions; unchanged verified accessions reuse their document relationships. Unsupported relationships are retried on the next normal refresh. Offline fixtures cannot be promoted to verified live evidence by cache reuse.

Workflow changes add the pilot to the existing weekday cadence and include evidence/status JSON in artifact and persistence paths. There is no new polling service. Per-company errors preserve the last verified evidence and publish an unavailable status, while other pilot companies can continue. The workflow permits this evidence step to report failure without discarding retained evidence; all release checks still run. This workflow was linted, not deployed or exercised in Actions. The audit's wider 12-company stock artifact mismatch is outside this three-company pilot and remains unresolved.

HTML handling is inert and bounded to 2 MB, accepts only HTML/XHTML, declines encoded responses, uses strict HTTPS SEC accession URLs, refuses redirects, and shares the SEC client throttle/user agent. It parses no scripts and renders no source HTML. Browser content uses text nodes and independently validates identities, dates, ordering, classifications, latest-report resolution and same-accession URLs. Missing, malformed or unavailable sources never generate invented earnings links. Refresh state and last verification date remain distinct. There is no claim that already-linked exhibits are downloaded on every refresh.

## Verification and scaling

Passed locally:

- 11 focused Python tests: all three official earnings cases, ordinary 8-K, 10-Q/K, official amendments, duplicate/conflicting accessions, malformed metadata, missing/unsafe exhibits, unsupported relationship, network/source failure and preservation, incremental caching, fixture/live separation, content-type/size/redirect handling, ordering, latest report, generated-data validation and synthetic scale.
- Two browser-contract JavaScript tests, plus a real Chrome pilot test covering all three issuers, document links, Fundamental Profile navigation, revision-date context, mobile reflow, stale/unavailable states and non-pilot isolation.
- Full release validator: **178 Python tests and 316 JavaScript tests**; includes SEC/financial evidence, Research, Fundamental Profile, change-detection and Public Research regressions, generated artifacts, staging, local references and security checks.
- Existing browser smoke: **41 tests passed**; added pilot smoke passed separately. Accessibility/CSP suite: **41 page records passed**. Workflow actionlint and `git diff --check` passed. Mobile screenshot inspected; adjacent link spacing corrected and pilot smoke rerun.

All CI tests use frozen/local data; no live SEC dependency. Logs are in the local temporary directory as `ntm-sec-pilot-release-final.log`, `ntm-sec-pilot-browser.log` and `ntm-sec-pilot-quality.log`; the quality artifact is `ntm-sec-pilot-quality.json`.

Synthetic metadata normalization for 10 and 100 distinct CIKs passed without company-specific parser configuration (about 0.02 seconds combined locally). This tests metadata processing, not SEC network capacity or issuer-wide parser coverage. Pilot JSON is approximately 22-23 KB per issuer. Expansion is limited by the single shared request budget, cold-start document requests, unsupported issuer layouts, recent-submissions history depth, operational monitoring, and the existing wider publication-path mismatch. Multiple workers would need a shared rate limiter. No throughput SLA is claimed.

## Files and conclusion

- `scripts/company_evidence.py`: event/relationship model, normalization and validation.
- `scripts/sec_client.py`, `scripts/update_stocks.py`: bounded HTML transport and evidence-only refresh/publication.
- `company-evidence.js`, `research.js`, `research.html`, `fundamental-profile-ui.js`: production presentation and selected-revision context.
- `data/stocks/evidence/`: three verified feeds and three refresh-status files.
- `tests/test_company_evidence.py`, `tests/company-evidence.test.cjs`, `tests/fixtures/company_evidence/`, `scripts/browser_smoke.py`: offline fixtures, contracts, failure/security/scale and UI tests.
- `.github/workflows/deploy.yml`: existing cadence/artifact integration.
- This report.

The pilot proves that the existing zero-cost SEC infrastructure can supply reusable, accession-bound filing and earnings-document evidence, with neutral Research context and honest failure states. Financial semantics, valuation, other products, prices and frozen public analyses were not changed.

**Single next step if the pilot proves useful:** define and review one guidance-observation contract against these verified release identities, with explicit source citation and human review before publication. Broad extraction or expanded issuer coverage should not precede that review.
