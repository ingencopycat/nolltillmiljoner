# Research scale-out — MU and VRT

26 September 2026 · Local implementation · Baseline `b3c4cff`

MU and VRT now use the existing Research workspaces and generic evidence services. Enrollment is **12 financial / 5 evidence / 5 daily**; evidence and daily members are NVDA, SOFI, CRWD, MU and VRT. The 06:35 UTC schedule and owner dispatch remain unchanged. Neither new issuer meets **Full NTM Research**: unresolved coverage is explicit, rather than silently treated as absence.

## Baseline and coverage

SEC submissions identities were checked against the existing registry: MU / 0000723125 / MICRON TECHNOLOGY INC and VRT / 0001674101 / Vertiv Holdings Co. Both retain `standard_company`. MU retains its nearest-Thursday-to-August-31 fiscal mapping (submissions year-end metadata `0903`); VRT retains December 31. Each has three annual rows, ten quarterly rows, TTM and 25 retained filing records. Latest financial quarters remain MU FY2026 Q3 and VRT FY2026 Q2. Comparable automatic valuation EPS remains unavailable; manual EPS remains explicit.

All 12 financial JSON documents and the original NVDA/SOFI/CRWD feeds and status documents match the baseline exactly as parsed JSON. Existing financial SEC fixtures were not replaced during onboarding. New evidence indices are separately captured, bounded SEC submissions records. This is not a claim that every existing financial field is complete.

| Layer | MU accepted coverage | VRT accepted coverage | Effort |
|---|---|---|---|
| Reporting | 24 retained filing events, verified earnings exhibit relationships | Same bounded event contract | Generic discovery + light relationship review |
| Guidance | Two quarterly revenue ranges, FY2026 Q3/Q4 | Four net-sales observations: quarterly and full-year guidance across Q1/Q2 releases | Issuer-specific period, basis and passage mapping; generic absolute-tolerance support added for MU |
| KPIs | No standalone KPI admitted from the two reviewed earnings releases; broader review remains open | Same explicit partial disposition | Issuer-specific review; no invented KPI or claim of issuer-wide absence |
| Business mix | Two quarters; Cloud Memory, Core Data Center, Mobile and Client, Automotive and Embedded, and All Other; 12 observations including totals | Two quarters; Americas, Asia Pacific, Europe/Middle East/Africa; 8 observations including totals | Issuer-specific taxonomy and reconciliation mapping |
| Capital | 16 observations: cash, short-term investments, current/noncurrent debt components, SBC cash-flow addback, actual outstanding shares, weighted diluted shares and actual program repurchase cash | 14 observations: cash, investments, noncurrent debt, quarterly SBC, actual outstanding shares, weighted diluted shares and reported liquidity context | Issuer-specific scope review; existing generic schema |
| Form 4 | 3 filings in captured index from 1 August 2026 | 13 filings from 1 September 2026 | Generic parsing + light bounded-window review |
| Ownership | 2 selected XML snapshots; Capital World Investors and Vanguard Capital Management | 2 selected XML snapshots; Vanguard Capital Management and BlackRock | Issuer-specific entity/security/amendment review; histories remain partial |
| Material events | 2 factual August leadership appointments | 1 completed senior-notes offering | Issuer-specific passage review; 2 reusable event templates added |
| Sources, candidate and daily enrollment | Combined source validation, coverage decision, safe initial checkpoint, repeat-run checks | Same | Shared engineering; no issuer-specific loader or UI |

MU's four prominent business categories alone did not reconcile. The accepted mapping therefore uses the two official 10-Q tables, including reported **All Other**, without inventing a residual. The current taxonomy does not stitch older business-unit histories. VRT's geographical reporting groups reconcile to reported net sales; missing prior-year comparison periods remain non-comparable.

Actual shares outstanding remain distinct from weighted diluted shares. MU repurchases are actual program cash outflows, excluding employee withholding; they are not authorizations. MU SBC is a year-to-date cash-flow addback; VRT SBC observations are quarterly. Debt components are not relabelled total debt, and no generic net-debt calculation was enabled. VRT financing facts preserve the original offering source rather than pretending to provide a complete maturity ladder.

Primary reviewed reporting sources: [MU Q2 release](https://www.sec.gov/Archives/edgar/data/723125/000072312526000004/a2026q2ex991-pressrelease.htm), [MU Q3 release](https://www.sec.gov/Archives/edgar/data/723125/000072312526000013/a2026q3ex991-pressrelease.htm), [VRT Q1 release](https://www.sec.gov/Archives/edgar/data/1674101/000162828026026379/q12026exhibit991vrt04222026.htm), [VRT Q2 release](https://www.sec.gov/Archives/edgar/data/1674101/000162828026050323/q22026exhibit991vrt07292026.htm). Exact periodic-filing URLs, source hashes, original passages, period contexts and extraction recipes are in [company_observations.json](../scripts/source_reviews/company_observations.json). Ownership and event identities are pinned in their corresponding review registries.

## Source lifecycle and activation

[financial_sources.py](../scripts/financial_sources.py) now preserves accepted financial submissions/companyfacts inputs and their manifest alongside generated financial data in the existing staged candidate. It verifies issuer identity and exact reproduction of annual, quarterly, TTM and valuation-base objects before acceptance. Each structured JSON input is bounded to 32 MB; hashes use UTF-8 text with LF newlines for checkout portability.

The combined offline closure now reproduces **all 12 financial datasets**, as well as all five evidence feeds. Workflow artifact transfer and `git add` include the financial manifest and both input files for every daily-enrolled issuer. Git-index validation rejects an omitted or stale input even if the working tree contains a repaired file. No release check needs live SEC access.

Deep-evidence preservation retains bounded factual excerpts/structured tables, original source hashes, excerpt hashes, source/index metadata and transformation/rights dispositions. Full permitted SEC ownership XML is retained. Raw full earnings releases fetched during review remain outside the repository. Source URLs are evidence identities, not a blanket assertion of republication rights.

[issuer_onboarding.py](../scripts/issuer_onboarding.py) composes reviewed candidate packages offline using the existing reporting, observation, insider, ownership and event parsers. Its activation function validates the combined candidate before writes and rolls back local writes on failure. This is **local rollback, not a filesystem transaction**; hosted publication remains one validated Git revision. The actual MU/VRT packages were prepared in an isolated candidate before registry/feed/source/checkpoint activation. Coverage decisions are checked against [issuer_coverage.json](../scripts/source_reviews/issuer_coverage.json) during source closure.

Initial checkpoints retain the discovered index and review backlog: MU through 28 August; VRT through 25 September. The global discovery start and cadence were not reset. The bounded older MU Form 4 window is deliberately retained. First daily runs and reruns accept no duplicate observations and leave canonical files unchanged; simulated retrieval failure retains the verified baseline.

## Remaining coverage and change-feed semantics

Both issuers remain partial for standalone KPI history, complete capital/debt/funding scope, ownership continuity and material-event backlog. MU has 13 pending event filings and 3 pending ownership filings; VRT has 28 and 3 respectively. Those are filing queues, not claims that every entry is material. Initial daily review queues retain 16 MU and 31 VRT entries. Later candidate acceptance still requires source capture and semantic review.

No additional EPS numerator, debt completeness or share-basis interpretation was introduced into financial normalization. No checked absence was inferred from an unreviewed window. These explicit gaps prevent a Full NTM Research claim for either issuer.

Sedan din analys uses the canonical envelopes through the existing selector. Tests cover publication dates, conservative same-day exclusion, late ingestion, latest-saved revision selection, pending-review exclusion and failure retention. A newly saved analysis has no historical changes merely because the evidence was imported today. A returning-user fixture sees the previously published observations; private draft text stays out of the feed.

## UI and verification

The new [browser journey](../scripts/issuer_onboarding_browser.py) exercises both issuers through visible navigation at 1440, 768, 390 and 360 pixels, in dark and light themes: 16 viewport/theme cases per pass, seven workspace/topic visits per case. It verifies hidden/inert workspaces, no horizontal overflow, preserved unsaved drafts and immutable saved revisions, manual EPS, explicit recalculation and rejected stale saves. No forced clicks or direct calls to publication functions are used.

Two screenshot passes were captured and representative images visually reviewed. Pass 1 found damaged Swedish characters in the new event templates; they were corrected before pass 2. Pass 2 confirmed readable wrapping, the existing bounded overview and explicit manual-EPS state. Eight selected captures and both result manifests are retained under [qa/issuer-onboarding](qa/issuer-onboarding). Full temporary capture sets include capital, reporting, business, thesis and valuation views.

Selected evidence: [MU desktop overview, pass 1](qa/issuer-onboarding/pass-1/MU-1440-dark-overview.png), [VRT mobile overview, pass 1](qa/issuer-onboarding/pass-1/VRT-390-light-overview.png), [MU mobile overview, pass 2](qa/issuer-onboarding/pass-2/MU-360-dark-overview.png), [VRT desktop overview, pass 2](qa/issuer-onboarding/pass-2/VRT-1440-light-overview.png), [MU manual valuation](qa/issuer-onboarding/pass-2/MU-390-light-valuation.png), [VRT private draft](qa/issuer-onboarding/pass-2/VRT-360-dark-thesis.png).

Validation: [recorded results](qa/issuer-onboarding/validation.json).

- Full Python suite: **324 run, 323 passed, 1 optional PostgreSQL test skipped** in the release run.
- Full JavaScript suite: **439 run, 437 passed, 2 optional PostgreSQL tests skipped** in the release run.
- The optional checks were then run with the available local PGlite engine: Python cloud foundation **5/5**, including its skipped RLS case, and both JavaScript publication/migration tests **2/2**. Thus every one of the **324 Python and 439 JavaScript tests** has a passing result across the release and supplementary runs.
- All 12 financial datasets reproduced offline; all 5 evidence feeds passed source closure. New MU/VRT packages also reproduced exactly through candidate composition.
- Stock pipeline, daily/source lifecycle, guidance/KPI/segment, capital, insider, ownership, event, revision and valuation unit regressions are included in the full suites. Added cases cover real MU/VRT packages, absolute guidance, reconciliation failure, source identity, rollback, first-run/idempotency, retained failures, financial-input omission from the actual Git index, share/debt/repurchase distinctions and since-analysis dates.
- Main browser smoke **43/43**; publication Wave 5 **4/4**; original-company Research shell **210 visual/state cases**; overview, since-analysis, analytical workspaces and shell-edge checks passed.
- MU/VRT browser checks: **two passes, 16 viewport/theme cases each**, with seven topic/workspace visits per case. Accessibility/CSP: **41 existing pages plus MU and VRT**, desktop/320px and both themes.
- Workflow/actionlint, security, complete release validation, staging/reference validation and `git diff --check` passed. Existing macro partial-source/future-calendar notices remain unrelated and unchanged.

## Scale-out assessment

Identity reuse, feed loading, routes, report discovery, supported Form 4 parsing, source closure and workspace composition scaled generically. Guidance, taxonomy/reconciliation, shares, debt scope, ownership entities and event facts still required explicit issuer mapping. Shared engineering was limited to financial-input preservation/transfer, candidate activation and coverage gates, absolute guidance tolerance and two factual event templates. No company-specific page, calculator or evidence renderer was introduced.

The next planned issuer batch remains **MRVL + COHR + RKLB**, with COHR's financial metric gaps reviewed separately. First resolve or explicitly retain the remaining MU/VRT coverage exclusions; this batch demonstrates reusable enrollment, not unattended full-research generation. Neither issuer should be advertised as Full NTM Research yet.

Nothing committed, pushed or deployed. No other issuer, price/EOD feed, paid data, AI feature, UI redesign or cadence change was introduced.
