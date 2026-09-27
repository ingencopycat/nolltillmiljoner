# MU + VRT completion review

27 September 2026 · Baseline `d44d070` · Local changes only

**Neither issuer yet qualifies as Full NTM Research.** This pass adds supported evidence and automatic EPS without treating unresolved capital history or event mappings as complete. Enrollment remains **12 financial / 5 evidence / 5 daily**; the five are NVDA, SOFI, CRWD, MU and VRT. The daily schedule remains **06:35 UTC**.

| Area | MU | VRT |
|---|---|---|
| KPI | Reviewed bounded non-selection: bit-volume/ASP descriptions use approximate verbal ranges; no exact standalone series manufactured. Business mix remains available. | Two reported year-end backlog observations: approximately $7.2bn in 2024 and $15bn in 2025. Both were published in the 2025 annual filing; cancellable/reschedulable order definition and acquisition scope retained. Not current 2026 backlog or organic growth. |
| Capital | Latest reviewed debt carrying total $5.722bn **including finance leases**; $10bn authorization, $2.156bn reported remaining capacity, existing actual repurchases, and funding/maturity context remain distinct. | Reviewed debt-note carrying total $2.9398bn **excluding leases**, $2.4836bn revolver availability net of letters of credit, $2.1bn notes proceeds, $3bn authorization, $2.4bn remaining capacity and explicit no-2026-repurchase statement through June 30. |
| Ownership | Two to five filings. Capital World Investors has a reviewed comparable June–December 2025 sequence. Vanguard reorganization zero is non-comparable, not a sale. Original later snapshot is preserved. | Two to five filings. Vanguard reorganization and BlackRock filer change are not joined into artificial increases/decreases. All discovered XML candidates in the retained scope reviewed; not a shareholder register. |
| Events | All 13 pending candidates reviewed: five filings accepted as six observations, one excluded from this layer, seven retain explicit reasons. Total accepted observations: 2 → 8. | All 28 pending candidates reviewed: 11 accepted stages, 13 reporting/routine-distribution exclusions, four retain explicit reasons. Three acquisition agreement/completion pairs linked. Total observations: 1 → 12 (nine underlying events). |
| Valuation | Automatic normalized GAAP TTM EPS **44.31 USD/share**. | Automatic normalized GAAP TTM EPS **4.42 USD/share**. |
| Full Research | **No** — capital-history reconciliation and seven event dispositions remain open. | **No** — capital-history reconciliation and four event dispositions remain open. |

The capital totals do **not** enable generic net debt. Financial-series total-debt mapping remains unavailable; evidence-note totals retain their own scope. Longer issuance/repurchase and noncash-financing histories remain partial. No new financial formula, price, or automatic recalculation was introduced.

## What remains

MU: tender commencement versus pricing/expiration/settlement; conditional CHIPS funding and project commitments; historical revolving-facility replacement; term-loan replacement and separate compensation disclosures; future board retirements; and the August 2025 guidance revision’s exhibit/history. The primary reports are captured, but the unresolved stage/amount/conditions are not published as resolved events.

VRT: term-loan amendment economics, dividend-policy increase, conditional CFO retirement preceding the accepted successor announcement, and announced director resignation. The latter event forms expose bounded template-mapping work; they are not evidence of missing disclosures. No general schema expansion was needed for the evidence accepted in this pass.

Every accession’s decision, original excerpt, review date and reason is retained in [event recipes](../scripts/source_reviews/company_material_events.json) and the company feed’s `reviewDecisions`. Exclusions do not establish that no event occurred. Existing daily checkpoint/review records are preserved; resolving the evidence queue does not silently erase separate owner-review records.

## EPS and preservation

[EPS review decisions](../scripts/source_reviews/valuation_basis.json) reference eight annual/quarterly note sources. Basic and diluted numerator identity, weighted shares, GAAP status, units and trailing-period reconciliation support the explicit issuer mappings to `NetIncomeLoss`; this is not a generic fallback from consolidated profit. The existing annual-minus-YTD quarter derivation and duration-weighted TTM share calculation are unchanged. Manual override and stale-result/save rules remain. Historical snapshot share-basis comparison stays conservative rather than acquiring an unreviewed global share-basis identifier.

MU uses FY2025 Q4 plus FY2026 Q1–Q3; VRT uses 2025 Q3–Q4 plus 2026 Q1–Q2. The annual notes also reconcile the retained annual numerator history. Financial fixtures reproduce all four financial groups for all 12 issuers offline.

[Baseline receipt](../scripts/source_reviews/completion_baseline.json) records immutable accepted-object hashes, unchanged issuer/enrollment/checkpoint hashes, and before/after financial/profile hashes. Only MU/VRT common-income/EPS fields and their profile descriptions change in financial output; an independent digest protects every other field. Historical Phase 2 audit hashes remain recorded as the before-state.

All previous reporting, guidance, mix, capital, Form 4, ownership and material-event observations remain unchanged. Six ownership XML sources, 41 bounded primary-report event excerpts and six additional periodic-note artifacts are retained. Two existing MU note excerpts were extended; their original artifacts and hashes remain in `company_observations/history`, and original source identities/digests remain intact. Complete earnings releases and full periodic reports were not added to the repository.

## Shared engineering and UI

- Source-backed rejected/review-required event dispositions and an acquisition-completion template with restricted Item 7.01 eligibility.
- EPS review/source gates, per-observation review dates, and verified historical excerpt retention. Missing or changed required notes fail release closure.
- Ownership selector preserves explicit non-comparability without requiring a predecessor.
- Existing capital detail displays revolver availability/proceeds and qualitative repurchase context; debt labels retain lease scope. Source wording now accommodates periodic filings. No workspace redesign.

These are reusable admission/provenance fixes, not issuer-specific layouts. Current quarterly KPI comparison gates deliberately reject annual backlog comparisons; both dated annual values remain readable without an invented quarterly growth rate.

## Verification

The completion browser checks both companies at desktop/dark and 390px/light through all four workspaces and data topics, shared sources/focus return, hidden/inert panels, saved revisions, unsaved drafts, automatic EPS and stale-valuation save blocking. [Four captures and results](qa/issuer-completion/results.json) are the bounded visual review; the wider legacy interaction matrices run with capture output disabled, with their behavioral assertions retained.

Daily offline replay covers both issuers: no-change/idempotent runs, supported new metadata, review-required filing, accepted financial-period replay, source/input hash preservation, old checkpoint continuity and failure retention. It uses captured SEC fixtures and synthetic discovery metadata; it does not certify a hosted scheduler run or unrestricted automatic narrative acceptance.

Final validation: **329 Python tests, 442 JavaScript tests, 43 browser smoke tests and four Wave 5 publication tests passed**. Shell, overview and analytical-workspace browser journeys passed. Accessibility/CSP passed on 41 existing page cases plus MU/VRT; four completion screenshots were inspected. Registry/workflow parity, all-12 financial reproduction, evidence/source closure, generated artifacts, security scans, release staging/local references and `git diff --check` passed. The release retained its pre-existing macro partial-update/future-schedule notices; this task did not alter those feeds.

**Next:** resolve these narrowly identified capital/event mappings before another activation batch. The next issuer batch remains MRVL + COHR + RKLB; none was onboarded here. Nothing committed, pushed or deployed.
