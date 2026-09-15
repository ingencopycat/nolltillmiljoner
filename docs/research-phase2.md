# B78 Phase 2 decisions — 2026-09-15

Current supported count: **12** — NVDA, SOFI, CRWD, RKLB, COHR, VRT, MRVL, MU, **TTMI, SNDK, FLY, CRWV**. Galaxy remains deferred. This report supersedes the historical Phase 1 decisions for these five candidates. [Source/period audit](research-phase2-audit.json) records exact identities, accessions, accepted/filed dates, units, concepts, output periods and SHA-256 baselines for the eight unchanged companies.

## Current decision matrix

| Candidate / CIK | Final status | Profile and handling | TTM / annual history | Intentionally unavailable / EPS mode |
|---|---|---|---|---|
| TTMI / 0001116942 | **B — added** | Standard company; Monday-nearest-December-31 calendar | 2026Q2; FY2023–FY2025; 10 quarters | Total debt, common-income numerator, deferred revenue, diluted shares/EPS and FCF/share; manual EPS |
| SNDK / 0002023554 | **B — added with short history** | `limited_history`; complete post-spin fiscal year only; exact filing labels | 2026Q4; FY2026 only; four quarters, 53 weeks | Same exclusions; prior-year comparisons unavailable; manual EPS |
| FLY / 0001860160 | **B — fundamentals added** | `limited_history`; IPO-aware share exclusion | 2026Q2 from 2025Q3–2026Q2; FY2025, five quarters | Same exclusions; pre/post-IPO per-share values suppressed; manual EPS |
| CRWV / 0001769628 | **B — restricted metrics added** | `financing_sensitive`; reported operating metrics | 2026Q2 from 2025Q3–2026Q2; FY2025, five quarters | Same exclusions **plus CapEx and FCF**; manual EPS |
| GLXY / 0001859392 | **C — deferred** | No production profile or route; needs financial/restructured metric reconciliation | Not published | All unavailable in Research; no automatic valuation |

All five exact current SEC registrants report domestic 10-K/10-Q statements in USD. No alternate tickers, paid data, currency conversions or current-share substitutions were used. Latest reports end June 29, 2026 (TTMI), July 3, 2026 (SNDK), and June 30, 2026 (FLY/CRWV/GLXY). Fixtures retain unmodified SEC observations for selected concepts and full submissions; they are reduced in breadth, not synthetic financial data.

## TTMI: deterministic fiscal labels

[TTMI FY2025 10-K](https://investors.ttm.com/sec-filings/all-sec-filings/content/0001193125-26-051976/ttmi-20251229.htm) states the Monday-nearest-December-31 convention and identifies FY2023/2024/2025 as ending January 1, 2024 / December 30, 2024 / December 29, 2025. The [company fiscal results index](https://investors.ttm.com/financial-information/financial-results) independently labels these years.

The opt-in rule uses exact-accession revenue context, earliest current-period start (YTD), bounded duration and the reported calendar. The year containing YTD start + 180 days is the fiscal year; annual end must match its calculated Monday. Quarter number comes from YTD duration and must agree with the exact filing's current-quarter label. Conflicts fail closed. Periods before FY2023 are excluded from this narrowly verified history. Annual Company Facts `fy` is deliberately not trusted for the January 1, 2024 annual period. Dates and values never shift. Q4 remains FY minus nine months, with existing provenance and continuity checks. Two complete Q1–Q4 sequences and annual revenue reconciliation are tested.

## SNDK: post-spin boundary

[Sandisk FY2026 10-K](https://www.sec.gov/Archives/edgar/data/2023554/000162828026057406/sndk-20260703.htm) describes the February 21, 2025 separation, historical carve-out allocations, and a 53-week FY2026 with a 14-week first quarter. The admitted boundary is **June 28, 2025**, through July 3, 2026. This is the first complete fiscal year after separation: a conservative coverage boundary, not a claim that no earlier standalone quarter exists.

FY2025 and its Q4 are excluded because deriving that Q4 would rely on a mixed pre/post-spin annual/YTD pair. FY2026 Q4 derives only from FY2026 and its own nine months. Exact filing labels prevent the July year-end from becoming FY2027. Four consecutive quarters now support TTM; no predecessor period is included. There is no year-over-year comparison yet. Shares/EPS remain unavailable because a verified diluted common numerator/share basis is not implemented. Annual EPS and example values are never relabelled TTM EPS.

## FLY: fundamentals versus IPO share basis

[Firefly Q2 2026 10-Q, Notes 1 and 13](https://www.sec.gov/Archives/edgar/data/1860160/000186016026000023/fly-20260630.htm) identifies IPO completion on August 8, 2025 and a 1-for-3.2544 reverse split with retrospectively adjusted shares. Q2 2025 is pre-IPO, Q3 spans the IPO, and Q4 2025 onward is post-IPO. FY2025 and four consecutive trailing quarters provide reported consolidated fundamentals, including OCF and cash PP&E purchases.

Retrospective split adjustment alone does not establish a compatible diluted common numerator through preferred conversions and the IPO. All published diluted shares, EPS and FCF/share are null, including annual valuation fallback. Historical earnings are not divided by today's shares. Manual EPS remains a labelled user assumption; the initial example is not SEC EPS. This is reported consolidated history, not constant-scope or organic growth.

## CRWV: financing exclusions

[CoreWeave Q2 2026 10-Q](https://www.sec.gov/Archives/edgar/data/1769628/000176962826000366/crwv-20260630.htm) reports cash PP&E purchases, substantial non-cash additions, finance leases, OEM/software financing, and changed recourse/non-recourse debt presentation. The 2025 IPO/preferred conversion and multiple share classes also require denominator care.

Revenue, operating income, net income and OCF retain reported SEC definitions. `PaymentsToAcquirePropertyPlantAndEquipment` exists in the source but is deliberately not marketed as total CapEx. CapEx, simple OCF-minus-CapEx FCF, FCF/share and total debt are disabled. Cash purchases alone cannot imply a complete capital-investment measure. Shares/EPS remain unverified and disabled. The overview uses net income as its secondary metric and labels it accordingly. Exclusions are profile rules, not valuation opinions.

## GLXY: why deferred

[Galaxy Q2 2026 10-Q](https://www.sec.gov/Archives/edgar/data/1859392/000185939226000091/glxy-20260630.htm), read directly from SEC, identifies the May 13, 2025 Delaware reorganization and GDH LP accounting predecessor. Its USD statement records principal digital-asset transactions gross, largely offset by transaction expenses. The [Q2 company release](https://investor.galaxy.com/news-releases/news-release-details/galaxy-announces-second-quarter-2026-financial-results) also describes the restructuring.

The revenue concepts are non-equivalent: in the same FY2025 filing, `Revenues` is USD 60,406,728,000 while `RevenueFromContractWithCustomerExcludingAssessedTax` is USD 60,243,860,000. The latter stops at 2026Q1 in current Company Facts; total `Revenues` continues into Q2. Switching concepts to get a continuous series changes scope. Gross trading revenue and industrial margins would obscure operating economics. EPS/common ownership scope is not reconciled across restructuring. Generic operating income, FCF and debt are not approved. A reviewed financial/restructured mapping could be justified later; no speculative production profile is added now. Differing-concept evidence and the unsupported registry gate are tested.

## UI, workflows and regression

The four additions use existing Research routes, thesis, assumptions/reviews/revisions, manual price, Change Detection, Outcome, Markdown export, JSON backup, AI foundation, Min NTM and connected catalog. No separate company UI or invented article relationships. Coverage notices and a metric list explain nulls. Supported-company allowlists agree. Profiles control availability and labels only.

All eight existing output files and profile definitions are SHA-256 pinned and tested unchanged. No shared-pipeline bug required changing them. The publication contract remains unchanged apart from four explicit CIK admissions. New profiles select configured units explicitly; wrong-currency data fails publication. Fixtures test annual/quarterly/TTM values, provenance, finite values, null per-share states, fiscal conflicts, spin history, financing exclusions, Galaxy deferral, discontinuous TTM rejection and failed-refresh preservation.

## Remaining Phase 3 candidates

| Candidate | Classification retained | Next prerequisite |
|---|---|---|
| AVEX | **D — deferred** | Sufficient annual/consecutive history and IPO allocation review |
| BULL | **C — deferred** | Explicit foreign-issuer 20-F/6-K and financial-business normalization |
| NBIS | **C — deferred** | Foreign-issuer reporting, restructuring and comparable business scope |
| TEM | **D — deferred** | Source/period comparability and IPO share reconciliation |
| ASML | **C — deferred** | Foreign-issuer periods, currencies and per-share basis |

Phase 2 is complete with four admissions and one evidenced deferral. Pause further production admissions pending targeted source/normalization work. A bounded Phase 3 investigation is justified; bulk expansion is not. See [validation and changed files](research-phase2-validation.md).
