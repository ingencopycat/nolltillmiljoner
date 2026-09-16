# B78 Phase 2 completion report

Completed 2026-09-15. **Four companies added; 12 supported in total.** No commit or push. Existing Phase 1 workspace changes were preserved.

## Candidate outcomes

1. **TTMI: added, B.** Exact filing context plus reported Monday-nearest-December-31 fiscal convention resolves the January annual-label conflict. FY2023–FY2025, ten quarters, TTM through 2026Q2.
2. **SNDK: added, B with limited history.** FY2026 only, June 28, 2025–July 3, 2026. Four consecutive post-spin quarters support TTM. The 53-week year and 14-week Q1 remain explicit; predecessor/mixed-spin history is excluded.
3. **FLY: added, B for fundamentals.** FY2025 and five published quarters, TTM through 2026Q2. IPO/reverse-split history is disclosed; share/EPS basis remains unverified and suppressed.
4. **CRWV: added, B with restricted metrics.** Reported operating fundamentals and TTM through 2026Q2. CapEx, FCF and total debt are disabled because cash PP&E purchases do not capture the full financing/investment scope.
5. **GLXY: deferred, C.** Reorganization/common ownership scope and gross trading revenue require a reviewed financial profile. Two revenue concepts differ in the same annual filing; no silent concept substitution or industrial metrics are published.

See [decisions and authoritative sources](research-phase2.md) and [exact filing/period audit](research-phase2-audit.json).

## Availability and valuation

All four additions intentionally omit diluted shares, EPS, FCF/share, a reconciled common-income numerator, complete total debt and combined deferred revenue. CoreWeave additionally omits CapEx and FCF. Missing values remain null with reasons. Manual EPS is required; initial illustrative EPS and manual prices retain their existing explicit labels. No current share count is applied to historical earnings. Valuation does not invent an automatic per-share basis.

TTMI uses a narrow fiscal-calendar rule. Sandisk and Firefly use `limited_history`; CoreWeave uses `financing_sensitive`. New profiles explicitly select configured units. Existing schemas, provenance requirements and publication thresholds were not relaxed. All eight pre-existing output files and profiles match their recorded SHA-256 baselines.

### Cross-platform baseline correction (2026-09-16)

The original data hashes were recorded from a Windows CRLF checkout. Git stores LF, so Linux CI rejected SOFI first; all eight raw file hashes differ for this same reason. Comparing SOFI, NVDA, CRWD, MU, MRVL, VRT, COHR and RKLB against baseline-introduction commit `0699f91215f5236a45159cfff1ae54d3d3c07de3` found no semantic JSON differences: financial values, periods, schema and provenance are unchanged. This is a test portability defect, not a later data update or financial regression.

The test now normalizes only LF/CRLF to the historical CRLF representation before hashing. Original expected hashes and stock files remain unchanged. Every other byte remains protected; a regression test checks that value, unit, provenance and field-name mutations still fail. Phase 2 also passes from a temporary Git archive containing the LF files used by CI.

## Files changed for Phase 2

- Data: `data/stocks/TTMI.json`, `SNDK.json`, `FLY.json`, `CRWV.json`.
- Pipeline and identities: `scripts/stock_normalizer.py`, `scripts/stock_contract.py`.
- Research and discovery: `research.html`, `research.js`, `min-review.js`, `ntm-product.js`, `ntm-relations.js`.
- Tests: `tests/test_research_phase2.py` (eight tests), updated `tests/test_research_expansion.py`, `tests/research-expansion.test.cjs`, `tests/relations.test.cjs`, `scripts/browser_smoke.py`, `scripts/quality_browser.py`.
- SEC fixtures: `tests/fixtures/sec_{ttmi,sndk,fly,crwv,glxy}_{submissions,companyfacts}.json` (ten files, including deferred Galaxy evidence).
- Documentation: `README.md`, `docs/internal/growth/data-licenses.json`, `docs/research-coverage.md`, `docs/research-phase2.md`, `docs/research-phase2-audit.json`, this report.

Other uncommitted Phase 1 files shown by Git are not new Phase 2 edits. No new one-off company page, external relationship, account integration or paid data source was introduced.

## Validation results

| Check | Result |
|---|---|
| Full Python suite | **163 run: 162 passed, 1 optional PGLITE_MODULE test skipped** |
| Full JavaScript suite | **164 passed** |
| Stock publication | All four pass the existing validator; fixtures reproduce annual, quarterly, TTM and valuation data |
| Special cases | Fiscal conflicts, spin boundary, IPO shares, financing exclusions, Galaxy non-equivalent concepts, wrong-currency rejection and failed-refresh preservation pass |
| Existing eight | Output bytes and profile hashes unchanged |
| Full browser suite | **31 passed**, including all nine Phase 1/2 additions in the expanded workflow test |
| Focused final Research workflow | Passed after final explanatory-panel/calendar-label changes |
| Accessibility/CSP | **16 pages passed**, including each new ticker |
| Staging/local references | Passed in disposable staging |
| SEO | 28 canonical URLs, seven existing articles, zero outdated generated files |
| Calendar/rules and Git whitespace | Passed; pre-existing partial macro-source/future-calendar notices remain explicit |

Commands: `python -B scripts/validate_release.py`, `python -B scripts/browser_smoke.py`, `python -B scripts/quality_browser.py --output <temporary-report.json>`. Node was supplied through `NODE_BINARY`; browsers used installed Edge (`NTM_BROWSER_CHANNEL=msedge`), Chromium 153.0.4234.32.

Browser checks used isolated temporary local origins and synthetic private records, with external requests excluded. Each added company was opened at desktop/mobile sizes, sampled in both themes, and checked for provenance, missing-metric explanations and manual EPS. Thesis/revisions, Change Detection, Outcome saves, Markdown exports and JSON backup restore passed. Additional screenshots were inspected for all four companies. This is local application QA, not a production third-party-service availability test.

## Remaining scope

**AVEX D / BULL C / NBIS C / TEM D / ASML C remain deferred.** Phase 2 is complete with four safe admissions and an evidenced Galaxy deferral. A targeted Phase 3 source/normalization investigation is justified; further production expansion should pause until those individual blockers are resolved.
