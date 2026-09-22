# Reviewed guidance and operating KPIs

Implemented locally on the existing NVDA/SOFI/CRWD SEC evidence feed. No commit, push or deployment. Locally release-ready based on the completed checks below; this implementation review is not a separate owner production approval.

## Coverage

Twelve actual SEC earnings exhibits, four consecutive releases per issuer, provide **63 observations** (47 guidance, 16 operating KPI). Original numbers are parsed deterministically, not supplied by an LLM extraction service. No secondary provider or search-engine scraping is involved.

| Issuer | Guidance captured | Operating KPI selection |
| --- | --- | --- |
| NVDA | Quarterly revenue midpoint ±2%; quarterly non-GAAP gross margin ±50 bp; FY2027 tax ranges; qualitative China revenue assumption | No independent operating KPI selected. Data Center/Edge revenue belongs to revenue breakdowns, and product-performance claims do not establish a consistent operating series. Explicitly unsupported here. |
| SOFI | Annual adjusted net revenue, EBITDA and EPS; Q1 2026 adjusted revenue; Q2 2026 adjusted net income margin | Members and total products: useful measures of customer reach and product adoption, with cumulative/not-active definitions disclosed. |
| CRWD | Quarterly/annual revenue and, where disclosed, ARR; quarterly/annual non-GAAP diluted EPS | ARR for recurring contract scale; net new ARR for quarterly additions. These are not GAAP revenue. |

Actual revisions include SoFi FY2026 adjusted revenue from approximately $4.655bn to $4.75–4.85bn; CrowdStrike FY2027 revenue from $5,914.7–5,958.7m to $5,991.1–6,011.1m (raised and narrowed); NVIDIA FY2027 tax guidance from 17–19% to 16–18%, then unchanged. Different target quarters are never classified as guidance revisions.

No CapEx field or other unsupported metric is invented. The model accommodates point, range, qualitative and withdrawal records without forcing a common issuer template. No real withdrawal occurred in this sample; withdrawal behavior is covered with an explicitly synthetic test.

## Architecture and provenance

`reviewedEvidence` extends the existing `data/stocks/evidence/{ticker}.json` payload; there is no parallel publication store. `scripts/reviewed_company_evidence.py` shares the current SEC HTML parser, transport, identities, evidence relationships, refresh/status files and atomic publication path. The scheduled evidence command now includes `--reviewed`; the financial-statement pipeline and Research snapshot/publication contracts are unchanged.

Each observation carries an issuer-scoped metric identity and issuer label, point/range/text value, unit/currency, target/report period and type, stated basis and definition version, publication date, stable source-bound ID, exact SEC accession/exhibit URL, reviewed passage and SHA-256, supporting definition/context, and review method/date. Source receipts retain the normalized complete document hash. The review registry also retains the original verified 8-K/exhibit relationship, allowing a reviewed historical source to survive the recent-filings window rolling forward. NVIDIA target-quarter end dates remain null where the guidance passage does not disclose them.

The versioned registry is `scripts/source_reviews/company_observations.json`. Its bounded selectors identify reviewed passages; numeric named captures plus declared unit scales parse the original disclosure. Decimal conversion avoids binary scaling artifacts. The publication validator reproduces values from the recipes and rejects changed values, periods, basis, identity, source or passage. Review dates mean source/implementation review in this task, not independent human sign-off.

Existing observations are retained by ID; a refresh that would remove reviewed history fails. `asOf()` derives latest/superseded/withdrawn state using only information published by the requested date, preserving the original observations rather than overwriting them. The same day's ordering cannot be resolved from date-only publication metadata.

## Automation and review boundary

- **Automatic:** SEC relationship ingestion; deterministic extraction/revalidation of the allowlisted, reviewed passages; unit conversion; comparable revisions and quarterly KPI changes; validation and atomic publication.
- **Ingested, review required:** newer earnings events remain available in the filing feed, but cannot produce canonical guidance/KPI values until a recipe, definition and period review is added. A visible pending-review message retains the previous verified observations.
- **Reviewed manually in the implementation:** metric relevance, passage/column and period mapping, stated adjustment basis, definition changes, and inclusion/exclusion decisions. This deliberately conservative pilot is not a universal earnings-release parser.
- **Unavailable:** missing, duplicated, changed or malformed passages and source outages reject the refresh; the previous verified file remains byte-for-byte intact and its status signals the failure. Offline excerpts are labelled `offline_fixture` and cannot be presented as live verification.

To add a release: use its verified SEC exhibit relationship; inspect target periods, units, definitions and basis; append immutable review recipes and minimal official-text fixtures; run offline extraction/comparison tests and the live reviewed refresh. Keep old recipes/observations. An edited historical source or an intended correction requires explicit review; it is not silently reinterpreted.

## Comparability

- SoFi members: four comparable observations, Q3 2025–Q2 2026; latest 15,814,418, approximately +7.5% QoQ.
- SoFi products: four original published counts, latest 24,380,974. Crypto launch in Q4 2025, the Invest counting change in Q1 2026, and Plus/Smart Card inclusion in Q2 2026 are pinned in source context. Conservative separate definition versions block a combined trend and show **Ej jämförbart**. No invented recast is applied.
- CrowdStrike ARR: four comparable quarterly observations, Q3 FY2026–Q2 FY2027; latest approximately $5.84bn. ARR includes contractual renewal assumptions and is rounded by the issuer, so derived changes are marked approximate. Net new ARR is a quarterly flow, separately modelled.
- CrowdStrike EPS: pre/post four-for-one July 2026 split bases remain distinct. Old EPS guidance is preserved, never silently divided by four or described as a cut.
- NVIDIA non-GAAP margin: FY2027 includes stock-based compensation; FY2026 excludes it. Definition versions preserve this break even though the different target quarters already prevent revision comparisons.
- Same labels never authorize cross-company comparison. Currency, unit, period type, definition and basis must agree. KPI charts require consecutive comparable quarters. There is insufficient one-year history here for YoY charts; no YoY percentage is inferred.

Excluded ambiguities: SoFi's October 2025 release combines dollar and cents wording for EPS; CrowdStrike's December 2025 table attaches “million” to per-share guidance. Both EPS records remain review-required rather than normalized by guesswork.

## UI and Research

The existing overview now shows compact guidance rows, useful large numbers, period, prior same-period guidance and mechanical change. Revenue leads. Comparable KPI bars share a zero baseline and show four quarters. The qualitative China assumption is a short context line, not a giant numeric card. No investment conclusion is produced.

One closed **Källor & metod** disclosure contains the full observation history, basis, superseded labels, SEC links, original passages and definitions. A restrained link uses the existing canonical Knowledge answer about guidance revisions. Raw IDs do not appear in the default reading flow. Desktop/mobile and dark/light use the existing Visual V3 styling.

`NTMCompanyObservations.validate`, `asOf`, `compare` and `changesSince` expose read-only normalized evidence for Research. They identify newly published guidance, comparable changes and tracked KPI changes after a saved revision date. Saved revision bytes remain unchanged. The complete new “Sedan din analys” experience is intentionally not implemented; the existing filing count is preserved.

## Verification and visual review

- Full release gate: **191 Python tests, one optional PostgreSQL integration test skipped; 332 JavaScript tests, 330 passed and two optional migration tests skipped**. SEO/generated data, Knowledge, calendar/rules, security, static staging and local references passed. Existing macro partial-coverage notices remain unrelated to this change.
- **42 browser smoke tests** passed; **4 Fundamental Profile/Wave 4 tests** passed.
- Accessibility/CSP audit passed across **41 page records**. The dedicated presentation matrix separately exercises all three pilot issuers.
- **Two screenshot passes: 48 issuer/viewport/theme cases**, at 1440/360/390/430 px in both themes. Default sources stay closed, native keyboard disclosure works, original passages open, document-level horizontal overflow is absent, and saved Research revisions remain unchanged. Mobile source tables scroll within their container.
- Live `python -B scripts/update_stocks.py --evidence --reviewed --all` succeeded for all three issuers on 2026-09-22. Offline fixtures reproduce all 63 published observations.

Pass 1 identified an oversized qualitative placeholder and revenue appearing after secondary metrics. Pass 2 leads with revenue, uses a compact assumption line and shorter split context. Final mobile and desktop captures confirm clear numbers, useful comparable bars and accessible deeper source detail. Final captures use viewport screenshots to avoid a Chromium tall-element capture artifact involving the offscreen skip link; the product's skip-link behavior is unchanged.

[Pass 1 results](../../qa/company-observations/pass-1/results.json) · [Pass 2 results](../../qa/company-observations/pass-2/results.json) · [Accessibility/CSP](../../qa/company-observations/quality.json)

[Desktop NVDA](../../qa/company-observations/pass-2/NVDA-1440-light-default.png) · [Desktop SoFi](../../qa/company-observations/pass-2/SOFI-1440-dark-default.png) · [Mobile CRWD KPIs](../../qa/company-observations/pass-2/CRWD-390-light-kpis.png) · [Expanded source passage](../../qa/company-observations/pass-2/SOFI-1440-dark-source-passage.png)

## Readiness and next step

Locally release-ready for this bounded, reviewed three-company layer; the final release gate passed. Coverage is intentionally small, new releases need review, no standalone NVDA KPI is forced, and ambiguous EPS disclosures remain excluded. No commit, push or deploy performed.

Logical next step: use the normalized as-of/change APIs for a separately scoped Research comparison view, while reviewing the next earnings releases through this same pipeline before considering more companies.

