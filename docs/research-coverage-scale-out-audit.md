# NTM Research — coverage and scale-out audit

26 September 2026 · Audit only · Repository baseline `f60b85c`

**Recommendation:** keep Waves 1–4 as the presentation system. First make issuer capabilities and enrollment a single validated contract, preserving the existing 12 financial issuers and three evidence pilots. Then onboard **MU and VRT** as the first evidence batch. The principal gap is a repeatable admission process, not another Research UI.

## 1. Actual registry and current support

There is no single comprehensive registry today. The authoritative financial identity contract is [`IDENTITIES`](../scripts/stock_contract.py), paired with [`COMPANY_PROFILES`](../scripts/stock_normalizer.py). Its 12 issuers agree with the current [selector](../research-entry.js), [Research route allowlist](../research.js) and the 12 published stock datasets. Display names differ in capitalization/abbreviation from SEC legal names; CIKs agree. These are separate definitions that can drift, not one generated catalog.

| Ticker | Published issuer name | CIK | Configured profile | Current support |
|---|---|---|---|---|
| NVDA | NVIDIA CORP | 0001045810 | standard_company | Financials + deep evidence pilot |
| SOFI | SoFi Technologies, Inc. | 0001818874 | financial_services | Financials + deep evidence pilot |
| CRWD | CrowdStrike Holdings, Inc. | 0001535527 | software_saas | Financials + deep evidence pilot; manual valuation EPS |
| MU | MICRON TECHNOLOGY INC | 0000723125 | standard_company | Financials; manual valuation EPS |
| MRVL | Marvell Technology, Inc. | 0001835632 | standard_company | Financials; manual valuation EPS |
| VRT | Vertiv Holdings Co | 0001674101 | standard_company | Financials; manual valuation EPS |
| COHR | COHERENT CORP. | 0000820318 | standard_company | Financials with additional metric gaps; manual EPS |
| RKLB | Rocket Lab Corp | 0001819994 | standard_company | Financials; manual valuation EPS |
| TTMI | TTM TECHNOLOGIES INC | 0001116942 | standard_company | Financials; special fiscal calendar; per-share gaps |
| SNDK | Sandisk Corp | 0002023554 | limited_history | Post-separation financial history; per-share gaps |
| FLY | Firefly Aerospace Inc. | 0001860160 | limited_history | Short/pre-and-post-IPO financial history; per-share gaps |
| CRWV | CoreWeave, Inc. | 0001769628 | financing_sensitive | Financials; CapEx/FCF/debt and per-share scope restricted |

The **three-company evidence enrollment differs deliberately from financial support**: [`company_evidence.PILOT`](../scripts/company_evidence.py), the [browser feed loader](../company-evidence.js), [source-closure validator](../scripts/evidence_sources.py) and [daily workflow](../.github/workflows/deploy.yml) enroll only NVDA/SOFI/CRWD. The other nine have no canonical company-evidence feed. `update_stocks.py --all` addresses all financial profiles, whereas `--daily --all` and `--evidence --all` address only the pilots. Thus the nine are not receiving the scheduled SEC financial refresh merely because they are selectable.

Other duplicated 12-ticker lists exist in `ntm-product.js`, `ntm-relations.js`, `min-review.js` and `wave1-context.js`. No conflicting membership was found. Publication itself is broader: [`social-core.js`](../social-core.js) and the [public-report SQL contract](../supabase/migrations/202609190001_public_research_v2.sql) validate snapshot fields rather than imposing the three-pilot ticker list. Manual journals/publication are not evidence-enrollment authorization.

## 2. Coverage matrix

**Current-state vocabulary:** **C — COMPLETE** at the explicitly bounded existing pilot standard; **P — PARTIAL** legitimate data exists but depth, history or a component is missing; **M — MISSING** no canonical layer; **N — NOT APPLICABLE** only where the concept truly does not apply. C is not an assertion of exhaustive SEC history or current live freshness.

**Next-work vocabulary:** **G — GENERIC READY**, reusable infrastructure subject to admission gates; **R — REVIEW MAPPING**, issuer definitions/relationships must be reviewed; **E — ENGINEERING GAP**, infrastructure must change. These are kept separate from current coverage: a missing layer does not turn green because a parser exists.

All 12 have **C issuer identity, C SEC identity and C configured profile**. All financial/history counts below were read from dataset contents, and all four financial objects (`annual`, `quarterly`, `ttm`, `valuationBase`) reproduced exactly from their existing SEC fixtures. P therefore describes scope, not a failed validation.

| Issuer | Annual/history | Quarterly/history | TTM | Latest quarter | Financial EPS / valuation limitations |
|---|---|---|---|---|---|
| NVDA | C: 3, FY2024–26 | C: 10 | C | FY2027 Q2 | TTM EPS 7.91 available |
| SOFI | C: 3, FY2023–25 | C: 10 | P | FY2026 Q2 | TTM EPS 0.47; industrial operating margin/FCF N; generic debt scope unavailable |
| CRWD | C: 3, FY2024–26 | C: 10 | P | FY2027 Q2 | Quarterly EPS exists; comparable TTM EPS unavailable across split basis |
| MU | P: 3, FY2023–25 | P: 10 | P | FY2026 Q3 | Common/diluted numerator and total debt unverified |
| MRVL | P: 3, FY2024–26 | P: 10 | P | FY2027 Q2 | Same restrictions; filing fiscal labels configured |
| VRT | P: 3, FY2023–25 | P: 10 | P | FY2026 Q2 | Common/diluted numerator and total debt unverified |
| COHR | P: 3, FY2024–26 | P: 10 | P | FY2026 Q4 | Also latest-quarter operating income and diluted EPS absent |
| RKLB | P: 3, FY2023–25 | P: 10 | P | FY2026 Q2 | Common/diluted numerator and total debt unverified |
| TTMI | P: 3, FY2023–25 | P: 10 | P | FY2026 Q2 | Diluted EPS/shares and latest total liabilities absent; special year-end mapping |
| SNDK | P: 1, FY2026 | P: 4 | P | FY2026 Q4 | Post-separation only; 53-week year; no verified comparable share basis |
| FLY | P: 1, FY2025 | P: 5 | P | FY2026 Q2 | No verified share basis; latest equity absent |
| CRWV | P: 1, FY2025 | P: 5 | P | FY2026 Q2 | No verified share basis; cash-only CapEx is insufficient for investment/financing scope |

TTM objects exist for all 12; this does **not** mean every TTM metric is available. All nine nonpilots intentionally lack verified TTM EPS and total debt, and their generic deferred-revenue scope is also unavailable. SNDK/FLY/CRWV history boundaries must not be filled by joining incomparable predecessor/share-basis periods. Sources: [normalizer profiles](../scripts/stock_normalizer.py), [published datasets](../data/stocks).

| Issuer | Latest reporting event | Official report/earnings documents | Guidance | Company KPIs | Segments/mix | Comparison history |
|---|---|---|---|---|---|---|
| NVDA | C | C | C: 14 observations | M: explicitly no standalone KPI selected | C: 60 observations | P: financial + reviewed bounded history |
| SOFI | C | C | P: 13; explicit EPS exclusion | C: 8, members/products | C: 40 | P: financial + reviewed bounded history |
| CRWD | C | C | P: 20; explicit EPS exclusion | C: 8, ARR/net new ARR | C: 24 | P: financial + reviewed bounded history |
| MU | P | P | M | M | M | P: financial only |
| MRVL | P | P | M | M | M | P: financial only |
| VRT | P | P | M | M | M | P: financial only |
| COHR | P | P | M | M | M | P: financial only |
| RKLB | P | P | M | M | M | P: financial only |
| TTMI | P | P | M | M | M | P: financial only |
| SNDK | P | P | M | M | M | P: financial only, limited |
| FLY | P | P | M | M | M | P: financial only, limited |
| CRWV | P | P | M | M | M | P: financial only, limited |

Nonpilots have official primary filing metadata/links (5–25 retained filings), not the pilot reporting-event envelope or reviewed earnings-exhibit relationships. Do not label their report access entirely missing. Conversely, do not call an unreviewed filing link guidance coverage. NVDA's unselected standalone KPI is **not** proof that KPIs are inherently inapplicable. Pilot guidance preserves exclusions for ambiguous SoFi FY2025 EPS wording and CrowdStrike FY2026 per-share units. [Reviewed feed contents](../data/stocks/evidence) and [recipes](../scripts/source_reviews/company_observations.json) are authoritative.

| Issuer | Share structure | SBC | Buybacks | Cash | Debt/borrowings | Liquidity/funding/maturities | Form 4 | 13D/G | Material events | Since-analysis | Scheduled daily | Offline sources |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NVDA | C | C | C | C | C | P | C: 14 filings | P: 3 | P: 4 observations | C* | C* | C* |
| SOFI | C | C | M | C | P: borrowings, not generic total debt | P | C: 10 | P: 10 | P: 5 | C* | C* | C* |
| CRWD | C | C | C | C | P: noncurrent reviewed scope | P | C: 23 | P: 2 | P: 3 | C* | C* | C* |
| MU | P | P | M | P | M | M | M | M | M | P* | M | P* |
| MRVL | P | P | M | P | M | M | M | M | M | P* | M | P* |
| VRT | P | P | M | P | M | M | M | M | M | P* | M | P* |
| COHR | P | P | M | P | M | M | M | M | M | P* | M | P* |
| RKLB | P | P | M | P | M | M | M | M | M | P* | M | P* |
| TTMI | M | P | M | P | M | M | M | M | M | P* | M | P* |
| SNDK | M | P | M | P | M | M | M | M | M | P* | M | P* |
| FLY | M | P | M | P | M | M | M | M | M | P* | M | P* |
| CRWV | M | P | M | P | M | M | M | M | M | P* | M | P* |

Here nonpilot SBC/cash P means normalized financial series exist but the richer capital evidence layer does not; share P means diluted weighted shares exist, not a full outstanding-share/issuance/corporate-action history. The last four profiles disable the comparable diluted basis. Missing buybacks or ownership do not establish that no such disclosures exist.

Pilot capital has **74/59/56** reviewed observations respectively. SoFi includes deposits, bank CET1/total-capital ratios, securities and funding context; corporate net-cash/industrial FCF treatment is N. Funding prose exists for all three, but there is no standalone normalized maturity ladder. Form 4 coverage starts 2026-09-01 with explicitly separate older examples; it is not lifetime coverage. Ownership is selected reviewed disclosure history, not a shareholder register. Material-event feeds retain **9/9/7 pending-review entries** respectively; hence P rather than a misleading complete-event claim.

**Asterisks:** since-analysis selectors are reusable, but [`research-since.js`](../research-since.js) requires a verified company-evidence feed. Nonpilots retain local revisions and the distinct saved-data comparison machinery, while the reviewed change feed is unavailable. Daily C means enrollment in the restricted admission policy below, not automatic narrative refresh. Offline C means bounded deep-evidence closure plus financial fixtures; nonpilot P means financial fixtures reproduce but deep-evidence artifacts do not exist. None is a live SEC freshness assertion.

## 3. What scales, and meaningful hardcoding

| Layer | Reusable now | Next work to fill missing coverage |
|---|---|---|
| SEC identity and transport | CIK resolution, response identity checks, SEC submissions/companyfacts transport | G after explicit identity registration; no guessed identity |
| Annual/quarterly/TTM history | Deterministic normalization, period differences, provenance and validation | G for reviewed mappings; R for concepts, calendars, numerator/share basis, debt/FCF scope |
| Reporting discovery | Generic periodic/8-K classification, latest report, bounded earnings-exhibit relationship | G after enrollment/source capture; R for ambiguous exhibit relationships |
| Guidance/KPIs/mix | Generic observation schemas, comparison gates, reviewed passage/XBRL extraction and existing UI | R: pinned passages, definitions, basis, target period, taxonomy, recasts; no general unattended semantic discovery |
| Capital | Generic observations/selectors and a bank-aware scope model | R: share changes, buybacks, financing, debt completeness and noncash additions; E only if a required concept exceeds the schema |
| Form 4 | Generic index/parser, transaction classifications and source retention | G for supported unamended forms; R for amendments, unknown codes or reconciliation |
| 13D/G | Generic discovery/XML parsing; reviewed legacy HTML | R for reporting entities, security classes, amendments and comparable histories; not unattended auto-accept |
| Material events | Generic filing discovery and reviewed event model | R for passages, grouping, corrections and event classification; extraction is not materiality judgment |
| Sources and daily admission | Existing bounded source closure, candidate checks and rollback | E: registry-driven enrollment, onboarding/bootstrap and wider publication/source lifecycle integration |

Actual blockers, rather than every ticker occurrence:

1. **Feed activation:** `company-evidence.js` validates CIK against a three-entry map and returns before fetching other issuers. Adding a valid JSON file alone will not render it.
2. **Admission/enrollment:** `company_evidence.PILOT`, `update_evidence()` and `sec_daily.run()` reject nonpilots. Daily run assumes an existing verified stock/feed/status baseline and insider section; it cannot bootstrap a company or a genuinely absent evidence category.
3. **Closure coverage:** `evidence_sources.validate_repository()` loops over PILOT. Per-feed validation is reusable, but an unenrolled feed would not receive equivalent repository-wide guarantees simply by appearing on disk.
4. **Workflow transfer/commit:** dispatch options, stock artifact paths and `git add` name only three financial JSONs. Widening the Python loop alone would drop additional stock updates between jobs. Preserve the existing evidence/source artifact paths and index validation.
5. **Capability-dependent presentation:** overview loading text and `research-since-ui.js`'s reviewed-company flag embed the three pilots. The overview wording should follow capability/health; the flag has no other consumer found and is not independently a functional blocker.

Issuer-specific profile mappings, fiscal calendars, NVDA KPI caveat, SoFi banking scope and CRWD split handling are **legitimate mappings**, not things to delete. Example valuation prices are explicitly examples with a fallback, not a feed-enrollment blocker. Reviewed recipes being issuer-specific is intentional; the missing scalable piece is their onboarding/review process.

## 4. Daily updater readiness

The deployed workflow definition schedules `--daily --all` at **06:35 UTC**, plus explicit owner dispatch, for the pilots only. This audit did not inspect hosted run success. The nine remaining profiles can use the manual generic fundamentals command, but they are **not enrolled in daily admission**. [Policy](../scripts/sec_daily.py), [CLI](../scripts/update_stocks.py), [workflow](../.github/workflows/deploy.yml).

| Layer | Discovery / retrieval / preservation | Validation and acceptance |
|---|---|---|
| Fundamentals / 10-K,Q | Recent submissions; companyfacts fetched once per issuer; event index retained | Auto additions only under established definitions; changed/disappearing historical rows require review; new filing facts must exist. Narrative disclosures still enter review |
| Earnings 8-K 2.02 | Fetch primary HTML; preserve bounded Item 2.02/exhibit rows, index, fragment/full-source hashes | Auto reporting-event/exhibit relationship if supported; guidance/KPI semantics remain review-required |
| Routine 8-K 5.07/9.01 | Metadata/index | Auto metadata only, not a material-event conclusion |
| Form 4 | Fetch XML; bounded full XML and submissions metadata preserved | Auto supported, unamended transaction/holding structures; unknown structures fail review gates |
| 4/A, 13D/G, other/amended reports | Discovered and routed with source URL/reason; daily path does not generally fetch and preserve their full candidate content | Review required; reviewed refresh tools/registries handle semantic admission |
| Guidance/KPIs/segments/capital | Filing-level candidates routed to review | No daily auto-extraction/acceptance of new narrative observations |
| Material events | 8-K discovery and pending queue | No automatic semantic grouping/publication |

Failure retention is strong: issuer work is isolated, existing source metadata cannot silently change, the recent-window gap and 100-new-document bound fail closed, and review backlog is bounded. Combined candidates undergo offline source closure before production/checkpoint writes. Local multi-file writes roll back on I/O failure; they are not a filesystem transaction. Hosted publication is one validated Git revision, with a second closure check on the actual index. A failed issuer can retain its baseline while other valid issuers progress; a combined closure failure blocks the candidate.

**Two lifecycle limits matter for scale-out.** The daily financial branch caches fresh companyfacts in memory but does not refresh the corresponding `sec_*_companyfacts.json`/submissions fixtures. Current published financial objects reproduce exactly, but that audit result is not a guarantee for future auto-added financial periods: deep-evidence closure does not regenerate the financial dataset. Also, review queue links are not preserved reviewed source artifacts; review must capture sources before canonical acceptance. Extend the existing candidate contract rather than weakening either distinction.

## 5. UI readiness

The four workspaces already serve all 12 financial issuers. Overview eligibility is driven by finite/available values and profile rules; financial-services handling is profile-based. Limited history and financing-sensitive missing metrics remain explicit. Thesis, revisions, manual journals, export and publication do not require a deep-pilot identity. Valuation correctly needs manual EPS when the comparable base is unavailable; onboarding must not substitute reported/consolidated earnings to bypass that rule.

Business mix, KPI, guidance, capital, insiders, ownership, events and shared evidence presentation consume generic schemas. Their principal obstacle is the loader/enrollment gate, not a missing layout. Since-analysis additionally needs a valid evidence envelope and consistent publication dates. New taxonomy/group types or financing concepts outside the supported schema would require bounded engineering; none should be smuggled into an existing label. No new UI redesign is recommended. This is a source/contract audit, not a new live browser usability certification.

## 6. Canonical onboarding contract and “Full NTM Research”

Use one **candidate issuer package** containing identity/profile, enabled capabilities and explicit coverage dispositions, financial data, reviewed feed/status, review recipes, source indexes/artifacts and manifests, comparison definitions and initial update checkpoint. Activation is a separate validated step.

1. **Register and verify — AUTO + REVIEW:** resolve ticker/CIK through SEC; verify both submissions and facts identities; review legal/profile identity, calendar and allowed metrics. Generate/check all consumer registries from the same contract.
2. **Build generic candidate — AUTO:** normalize financial history, discover reports and supported ownership/insider filing candidates. Store deterministic source inputs in bounded, reproducible form. Do not publish merely because parsing succeeded.
3. **Map semantics — REVIEW REQUIRED:** approve guidance/KPI/non-GAAP definitions, segment reconciliation and versions, share basis, capital/debt/funding scope, ownership entities and amendments, event grouping, and explicit exclusions. Reuse current recipe formats. Unknown taxonomy/units or ambiguous relationships stay pending.
4. **Validate candidate — AUTO / FAIL CLOSED:** enforce schemas, identities, dates, units, bounds, unique accessions, source URL/hash relationships, historical immutability and comparison eligibility. Reproduce every enabled layer offline. Include all unchanged issuers in combined validation. Required missing/corrupt sources, incomplete indexes, unsupported mappings or drift reject activation.
5. **Review coverage decision — REVIEW REQUIRED:** distinguish disclosed evidence, checked bounded absence, genuinely inapplicable concepts, and unavailable/unreviewed evidence. Record review scope/date and unresolved exclusions. Public SEC access alone must not be treated as unrestricted republication rights: preserve existing bounded-excerpt/full-XML distinctions and record source/transformation/rights disposition; do not import full copyrighted releases by default.
6. **Activate and enroll — AUTO after approval:** validate exact staged contents; publish package and registry changes together as one release revision. Initialize a verified baseline and safe checkpoint; use controlled catch-up rather than resetting the global start date or skipping backlog. No live SEC dependency in release validation.
7. **Verify existing UI — AUTO + bounded review:** financial/industrial variant, limited history, evidence links/focus, missing data, saved draft, stale valuation, immutable revisions and change-feed baseline; desktop and narrow screens. No auto-save, publication or hidden financial recalculation from navigation.

**Full NTM Research is a coverage contract, not “every cell has a number.”** Minimum requirements:

- **Overview:** verified identity; applicable headline data and trend; honest short-history/missing coverage; business/report context from reviewed data or a documented bounded absence.
- **Bolagsdata:** all applicable capabilities enabled with reviewed definitions/history; each category contains evidence or a dated, defensible absent/inapplicable disposition. An unreviewed/missing feed is not an absence disposition.
- **Din tes:** private draft/save/revision/review/outcome lifecycle works independently of coverage; immutable revision and export/publication boundaries hold.
- **Värdering:** valid comparable EPS or an explicit manual/setup path; stale and eligibility rules unchanged. Automatic EPS is not mandatory when legitimately unavailable.
- **Sedan din analys:** verified baseline-compatible evidence envelope, publication-date/definition gates, latest-saved revision baseline and explicit unavailable/partial status. No new observations must not be inferred from a failed fetch.
- **Provenance:** every accepted observation has its original values, period/basis, definition, source and reproducible artifact; relevant qualifiers stay visible. Historical comparison only when verified compatible.
- **Updates:** enrolled capabilities, bounded discovery/catch-up, owner review route, preserved failures and atomically validated source/data releases. Required applicable coverage cannot remain silently unresolved.

A genuine checked absence of 13D/G does not prevent completion. No feed or an unchecked recent window does. Existing pilots are architectural exemplars, not proof that all current event backlog is resolved. Completion must be assessed against declared current coverage scope and material unresolved exclusions.

## 7. Implementation batches, effort and next task

These are engineering batches, not an investment ranking. Choices are based on the current profiles and gaps, not an unperformed survey of issuer disclosures.

| Batch | Issuers / purpose | Automated work | Reviewed work / likely obstacle | Effort class |
|---|---|---|---|---|
| Foundation | Existing 12 identities; existing 3 evidence enrollments only | Registry consistency and candidate validation | Preserve pilot behavior and source closure; no new issuer activation | E, shared infrastructure |
| First scale-out | **MU + VRT**: mature financial history, two existing industries/profiles, fewer special restrictions than later batches | Existing history, report discovery, supported Form 4, source handling | Guidance/mix/KPIs, EPS numerator, complete debt and ownership/event review; enrollment/bootstrap gates first | Moderate issuer mapping |
| Second | MRVL + COHR + RKLB | Same machinery and financial history | MRVL fiscal labels; COHR operating-income/EPS gaps; RKLB business-specific metrics and capital/event relationships | Moderate, COHR potentially heavy |
| Third | TTMI + SNDK + FLY | Discovery, validated retained history, supported filing parsing | Fiscal calendar; separation/IPO boundaries; share basis; limited comparison history | Heavy/special-case |
| Financing case | CRWV | Reporting, permitted financials, filing discovery | Noncash investment/OEM/lease financing and complete debt scope; determine whether current capital schema suffices before implementation | Heavy/special-case |

Steady-state refresh of a normal issuer with approved definitions can become **mostly automatic**. A new issuer matching existing patterns may require **light review** once candidate capture and registry enrollment are routine. The current nine should not be described as “mostly automatic full Research”: their deep mappings have not been reviewed. Novel accounting/taxonomies need moderate mapping; restructurings, IPOs and financing structures drive heavier work.

Ordered engineering work that unlocks the most issuers:

1. Single issuer/capability contract and consistency gates across Python, browser, routes, closure and CI paths.
2. Reproducible candidate bootstrap and explicit per-layer absent/pending/verified coverage; remove assumptions that every enrolled issuer already has all pilot sections.
3. Extend financial-input preservation/reproduction to daily candidates and artifact/index transfer; retain all current source-closure checks.
4. Bounded discovery-to-review package generation using current recipes; explicit approval/rejection/queue closure, without adding heuristic auto-acceptance.
5. Registry-driven daily enrollment and per-issuer catch-up/checkpoint handling; then issuer mapping batches. Expand schemas only for demonstrated unsupported semantics.

**Immediate next implementation task:** introduce the canonical issuer/capability registry and parity validator, migrate its existing consumers while keeping the current **12 financial / 3 evidence / 3 daily** enrollment unchanged, and prove unchanged outputs and publication/source closure. Include workflow transfer/commit path validation. Do not onboard MU/VRT in that same change. This exposes configuration drift without mixing infrastructure migration with new financial semantics.

## 8. Verification and scope

Read all 12 actual stock datasets, all three evidence feeds and their coverage/pending fields; inspected normalizer, selectors/renderers, recipes, source closure, daily admission and workflow publication paths. Fresh checks:

- All 12 published documents pass `stock_contract.validate`.
- All 12 reproduce **exact annual, quarterly, TTM and valuationBase objects** from their existing offline SEC submissions/companyfacts fixtures, in memory without writes.
- `test_stock_pipeline.py`: **25 passed**.
- `test_sec*.py` (daily admission and source lifecycle): **32 passed**.
- `scripts/evidence_sources.py`: **passed** offline source closure.
- `git diff --check`: passed.

No live SEC requests, hosted run audit, new issuer extraction or fresh browser matrix was performed. Findings describe repository capability and published repository coverage; they do not independently verify the owner's deployed-release statement. Only this audit document was added. No production code/data/UI, cadence or evidence semantics changed; nothing committed, pushed or deployed.
