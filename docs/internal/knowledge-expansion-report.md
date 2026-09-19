# Knowledge 100 — complete content expansion

2026-09-19. Local implementation and evidence record. **41 preserved + 59 added = 100 canonical objects, across 43 concepts.** New content uses the owner's explicit delegated scope approval; it is not presented as independent human editorial review. No commit, push, deployment, database migration, production account operation, AI feature or new calculator was performed.

Authoritative scope: the six-part complete-expansion request, [Knowledge implementation](knowledge100-report.md), [authoring contract](knowledge100-owner-review.md), and [Batch 0 plan](knowledge-batch0-coverage-plan.md). The delegated approval in the current request supersedes the older plan's per-object approval pauses.

Evidence: [metrics](../qa/knowledge-expansion/metrics.json), [100-object coverage](knowledge-expansion-coverage.md), [source checks](../qa/knowledge-expansion/source-evidence.json), [retrieval results](../qa/knowledge-expansion/benchmark.json), [release/browser results](../qa/knowledge-expansion/regression.json). Reports describe bounded tests, not guarantees about every possible question or investment situation.

## 1. Starting canonical state

41 objects: the original 29 plus six Batch 1A and six Batch 1B objects. A raw [starting snapshot](../qa/knowledge-expansion/before.json) and history snapshot were taken. Deep equality verifies every starting object, including prose, IDs, sources, aliases, approval and review metadata, remains unchanged.

## 2. Batch 1A preserved

`balance-sheet`, `income-statement`, `cash-flow-statement`, `profit-versus-cash`, `capex`, `working-capital` were reused. Their six objects were not recreated or reapproved. PP&E and depreciation remain bounded explanations rather than two unrequested extra objects.

## 3. Batch 1B preserved

`reported-adjusted`, `fcf-limitations`, `pe-interpretation`, `pe-losses`, `ps`, `pe-versus-ps` already existed. They were preserved and their browser/retrieval regressions rerun. No duplicate P/S or executable P/S calculator was introduced.

## 4. Batch 1C results

Four Research-method objects: facts versus assumptions, scenario design, falsification and source provenance. They explain the actual NTM workflow and identify it as a method. They do not promise that a checklist eliminates bias. Scenario inputs in illustrative revenue/margin examples are distinguished from actual EPS/growth/years/P-E calculator fields.

## 5. Batch 1D results

Four objects: guidance versus consensus, same-basis earnings surprise, additive-flow TTM construction and estimate age. Quarterly versus year-to-date values are explicit; summing reported EPS is not presented as a generally valid TTM method. No universal estimate-expiry threshold or provider surprise convention is invented.

## 6. Batch 2 results

21 objects complete the planned 20 plus the income-year limitation originally placed later: ten returns/risk/tool-input objects, nine ownership/fund/index objects, and two ISK objects. Definitions precede fund/ETF/trading comparisons. Concentration includes underlying overlap; volatility is not equated with permanent loss. US educational material does not establish Swedish fund regulation or taxation.

## 7. Batch 3 results

16 objects: eight Macro comparisons/methods/limitations and eight estimates, Research/version literacy and revenue-growth objects. CPI/PCE scope, units, seasonal adjustment, revisions, survey populations and real/nominal GDP are distinct questions. Macro surprises never become deterministic stock-market forecasts.

## 8. Later-coverage results

14 remaining objects cover EBIT/EBITDA, gross margin, maturities, EV, PEG limits, discounting, cash-flow returns, withdrawal sequence, price versus value, spread, splits and index weighting. The fifteenth planned later object, ISK year scope, was researched with its tax dependency in Batch 2. This is a sequencing change, not an extra object.

## 9. Final object count

100 canonical objects: 26 published and 74 reviewed/noindex. All 59 additions are reviewed/noindex; none was mass-published for indexing. The 29 inherited approval states remain explicitly inherited, so “100 canonical” does not mean 100 independently human-reviewed answers.

## 10. Final concept count

43 registered concepts, up from 31 at this task's start. Twelve new concepts fill actual dependencies. Existing concept IDs are reused for multiple intents. The older Academy relation vocabulary remains separate from the Knowledge concept registry.

## 11. Objects collapsed as duplicates

None required removal after scope separation. Definition versus mechanism, application, comparison and limitation were kept distinct. The original 41 were reused rather than reauthored. The duplicate heuristic still flags shared-concept pairs; those flags are review prompts, not an assertion that 48 duplicate answers exist.

## 12. Objects left pending

No object in the delegated 59-object scope remains draft/pending. Independent human review remains pending. The original Batch 0 editorial work remains open. No outside-scope PP&E/depreciation answer or future calculator was silently counted.

## 13. Material narrowing during verification

- Exact real return uses the ratio of gross nominal return to gross inflation; a central-bank subtraction explainer is not cited as proof of the exact formula.
- Earnings surprise uses an explicitly stated denominator convention. Negative/near-zero cases do not establish a universal provider convention.
- TTM examples use additive flows; period, fiscal calendar and year-to-date scope are checked.
- EBIT is not automatically identical to operating income. EBITDA/FCF definitions and issuer reconciliations remain necessary.
- EV examples are simplified conventions, not a full acquisition-price calculation. PEG still depends on risk, cash flows and growth assumptions.
- Guidance ranges, consensus dispersion and bear/base/bull scenarios are not probability distributions.
- Valuation sensitivity illustrates future price, not discounted present value. A cash-flow return example does not invent a TWR/IRR output.
- Core PCE's food boundary is described with its specific scope, not generalized as every restaurant expense.
- Organic-growth residuals are not automatically certified organic growth. Frozen reports do not promise permanent public availability of every historical version.

Per-object decisions are retained in the batch `*-decisions.json` evidence files.

## 14. Source hierarchy

Primary regulators, statistical agencies, tax authority, accounting-standard overviews, issuer reports/reconciliations and original methodology take priority. CFA and original valuation/performance methodology support bounded interpretation. Local NTM source files establish product behavior only. A generic glossary does not certify a whole answer, and outside sources are not portrayed as endorsing NTM.

## 15. Primary-source verification

The [source ledger](../qa/knowledge-expansion/source-evidence.json) records 55 distinct source references for the new objects, affected IDs, supported sections, checks, scope and limitations. References include local product contracts as well as external sources. Important evidence includes SEC non-GAAP guidance; IFRS IAS 34 overview; LSEG estimate metadata; NVIDIA and Microsoft issuer reporting; Nestlé growth reconciliation; BLS/BEA methods; investor.gov/FINRA education; MSCI weighting methodology; GIPS performance methods; and Skatteverket's 2026 rules. Public summaries and selected passages were read; restricted full standards and entire long handbooks are not claimed as fully audited.

## 16. Restricted/inaccessible handling

The previous eight restricted URL records are historical and remain open. Some current BLS material was accessible during this expansion, but access to one page does not close all old source/claim tasks. An obsolete LSEG path that redirected to a generic page was not accepted as claim verification; the relevant methodology page was used. An empty bid/ask glossary path was replaced with the actual ask-price entry. No 403 was treated as proof of a broken source and no HTTP success was treated as evidence by itself.

## 17. Arithmetic and formula verification

65 independent Python Decimal checks pass, plus the Research-method scope gate. Examples include 50% loss requiring 100% recovery; 8% gross return and 1% multiplicative fee yielding 6.92%; cash-flow timing; TTM de-accumulation; same-basis surprise; EV; split ownership; discounted value; and withdrawal sequence. Values remain synthetic. Only existing `pe/1` executes; prose formulas do not silently add calculators. Unsupported execution requests abstain.

## 18. Time-sensitive content

Dated inputs are distinguished from stable methods. Macro scope identifies US series and revisions. Issuer-specific definitions and fiscal calendars require checking the actual report. Source and snapshot dates are separate from editorial review dates. There are no live consensus feeds or copied current market values.

## 19. Swedish tax verification

The two new ISK answers were checked against Skatteverket's 2026 rule and account guidance and the existing NTM registry/calculator contract. Income year 2026 is distinguished from declaration year 2027. The existing rate/allowance registry was corroborated, not rewritten. New prose does not freeze the rate or allowance into timeless text. The 125,000 kr worked capital basis is not represented as tax payable. Both answers use the ISK rule reference, SE/2026 scope and 2026-12-01 deadline; overdue suppression is tested. Personal tax outcomes remain outside scope.

## 20. Review cadence and history

New objects have real task verification date 2026-09-19, content version 1, initial history and transparent owner-delegated/Codex reviewer provenance. Stable definitions generally use a 365-day deadline; interpretation/method content generally uses 180 days, with tighter explicit dates for Macro/product/tax scope. Original schedules and fingerprints are preserved. Navigation-only corrections do not rewrite claim history. New source or prose corrections after this baseline require an explicit version/history change.

## 21. Batch 0 issues resolved

Zero formally closed. New relevant evidence is recorded, but no inherited claim mapping, deadline or approval was silently changed. This deliberately preserves the requested Batch 1A/1B and inherited state.

## 22. Batch 0 issues still open

Original 41 issue records remain: 17 claim-mapping gaps, 16 unscheduled reviews and 8 restricted-source checks. See the [exact owner checklist](knowledge-batch0-owner-checklist.md). These counts describe issue records, not 41 different bad answers. They remain an editorial maintenance limitation of the existing catalog.

## 23. Retrieval aliases

118 new authored aliases are inventoried per object in [coverage.json](../qa/knowledge-expansion/coverage.json). They express bounded questions rather than personalized buy/sell intents. Existing typo handling remains curated, with its existing typo regression; no broad fuzzy matching or question logging was added.

## 24. Retrieval benchmark

234 fixtures pass, including 133 expansion fixtures. All 100 canonical questions additionally pass in full and compact/lazy engines. Existing comparison expectations were updated only where approved new coverage now answers them; debt clarification includes the distinct maturity answer. See the full expected/actual ledger, not just the aggregate.

## 25. Wrong confident matches

Zero in the labeled 234-case benchmark. Testing found two educational canonical questions blocked by the broad Swedish buy/sell guard: spread and the inherited commission question containing “köp”. The fix permits only those complete, unique, visible canonical questions. Appended personal requests and missing/draft objects remain blocked. Zero in this fixture set is not a guarantee for arbitrary language.

## 26. Clarification

Ambiguous concepts continue to clarify; multiple answer intents are not reduced to a single definition. Existing clarification fixtures pass, including debt versus debt maturity. New CPI/PCE comparison coverage answers that specific comparison without hijacking general Macro queries.

## 27. Abstention

Personal investment decisions, uncovered questions, unsuitable formula execution, invalid input and overdue tax coverage retain honest non-answer behavior. The UI never claims an educational definition resolves a buy/sell decision. No investment suitability ranking was added.

## 28. Relationship graph

All 100 have relationships and all 43 concepts have coverage. New-object navigation was audited after a template default incorrectly linked unrelated objects to NVIDIA Research. It now points to relevant existing workflows/tools and Academy lessons. The [navigation audit](../qa/knowledge-expansion/navigation-audit.json) records the exact new-only changes. Legacy relation labels were reconciled with the existing graph; core concept references remain precise.

## 29. Research

The existing thesis help adds facts/assumptions, falsification and provenance alongside its existing explanation. Existing financial statement and multiple help remains. Context uses public concept IDs, not private prose; opening and closing help preserves task state and focus. No report input, source revision or calculation contract changed.

## 30. Calculators

Existing help/details now connect returns to average/CAGR and cash-flow limits; compounding to timing; fees to double-counting; purchase to spread; ISK to inputs/year scope; leverage to losses; FIRE to sequence risk. Existing valuation help remains. These explain current boundaries; they do not add EV, TWR, IRR, DCF, ETF trading or probability engines.

## 31. Academy and answer leakage

New answers link to relevant existing lessons, with reciprocal graph behavior. No new mastery award or assessment solution was installed. Wave 3 and existing answer-leak tests pass. Independent comprehension testing of new prose remains a human task.

## 32. Macro

Existing help links expose CPI/PCE, period units and causal limitations. The generator now labels those links `macro`, not `calculator`; the browser test checks actual BLS answer content, not merely an open dialog. Calendar/source values, schedules and provider behavior were not changed.

## 33. Public Research

Generic reader help now includes frozen report/date/version scope. Existing financial metric help remains. Snapshot provenance, immutability, visibility, report versioning and authorization are unchanged. Wave 5 local UI/database tests pass; no new hosted production authorization run is claimed.

## 34. Duplicate and collision results

100 unique canonical IDs/questions, no orphan concepts and no unintegrated objects. The heuristic finds 48 related pairs, primarily shared concepts/intents. See [pair dispositions](../qa/knowledge-expansion/duplicate-dispositions.json). Scope separation includes ETF versus fund, definition versus index weighting, reported/adjusted basis versus cross-site EPS, and process fields versus thesis overview. No count-padding variants were added.

## 35. Coverage

The [complete map](knowledge-expansion-coverage.md) lists every question, intent, concept and approval state. Runtime categories: valuation 12, metrics 13, saving 16, basics 13, reports 16, Macro 12, risk 18. Intents: definition 27, comparison 22, calculation 8, interpretation 10, misconception 5, process 10, application 11, limitation 7. These are runtime categories, not a change to the nine-domain planning taxonomy.

## 36. Real-corpus scale

Measured the actual 100-object catalog, not only the earlier synthetic 1,200-object experiment. Browser evidence includes category rendering, card limits, lazy-body loading and representative answer journeys. The detailed [performance file](../qa/knowledge-expansion/knowledge_expansion_browser/actual-corpus-performance.json) states browser, viewport and measurement method.

## 37. Initial payload

The compact script is about 102.5 KB uncompressed; the Knowledge HTML is 10,555 bytes. All answer bodies total about 280.6 KB, fetched individually rather than eagerly. The actual-corpus browser assertion observes zero full bodies initially loaded. This is the Knowledge-specific payload, not the total shared site JS/CSS/network cost; the [quality report](../qa/knowledge-expansion/quality.json) contains complete observed page requests.

## 38. Search and Fråga NTM performance

Local Chromium measurements use 100 warmed synchronous samples without CPU/network throttling. The measured search, exact answer and category operations are sub-millisecond at p95 in this run. Consult the current JSON for exact values. Local initial load is not a field Web Vitals result, and timer resolution can produce zero-duration samples. No vector service or database was needed.

## 39. Mobile and reflow

All 59 new pages were checked at 360/390/430 CSS pixels in light/dark themes; all also render with JavaScript disabled. Three comparison pages were checked at 200% text sizing and 360px reflow, with screenshots. Broader quality checks include 320px and desktop. This is automated/text-resize evidence, not a claim to have tested every browser's native zoom implementation.

## 40. Accessibility

Single H1, named visible controls, disclosure keyboard operation, Escape/focus return, reduced motion, source visibility and horizontal overflow checks pass across the recorded pages. Screenshots were inspected for comparison/table and source layout. This is targeted regression coverage, not a WCAG certification or independent screen-reader/usability audit.

## 41. Security and privacy

Existing authored-field validation and output-safety tests cover hostile markup, source URLs/labels, aliases, excessive fields, malformed formula/relations and redirects. CSP and credential-pattern checks pass. Anonymous access remains. No raw question logging, formula-value storage, private Research collection, external AI request or new third-party script was introduced.

## 42. SEO

Generation/check passes. New reviewed pages have canonical URLs and noindex, remain outside the 85-URL sitemap, and keep actual editorial status/date semantics. No duplicate thin indexed variants were introduced. Homepage SEO, creator copy and canonical Visual V3 were not reopened. Existing seven article records remain governed by their own metadata.

## 43. Complete release gates

All 12 groups in the final [regression ledger](../qa/knowledge-expansion/regression.json) pass: **297 Node tests, 167 Python tests, 84 browser tests and accessibility/CSP checks across 112 pages**. The groups cover release, browser smoke, Waves 1–5, Knowledge 100, Batches 1A/1B and expansion browser tests. Release includes schema/history, arithmetic, retrieval, generation, relations, calculators, accounts/cloud/publication/RLS through local fixtures, workflow/actionlint, staging/local references and whitespace checks. Final generation reports zero outdated files; history and `git diff --check` pass. Existing Macro upstream-partial/future-schedule notices remain explicit; no source values were fabricated to silence them. Hosted production verification is outside this local task.

## 44. Files changed

New content: 59 JSON files in `docs/internal/knowledge/answers/`, 12 concept records, new history records, retrieval fixture additions and internal evidence/authoring scripts. Runtime edits are limited to the narrow educational guard and existing help connections in `knowledge-core.js`, `wave1-ui.js`, `public-report-ui.js`, and the SEO/help generator. Generated compact index, individual payloads/pages and related existing page sections reflect the catalog. Reports/evidence live under `docs/internal/knowledge-expansion*` and `docs/qa/knowledge-expansion*`. The starting worktree was already dirty with prior work; this report does not attribute all current git changes to this task.

## 45. Tests added/changed

Added `tests/knowledge-expansion.test.cjs`, 133 labeled expansion queries, Decimal arithmetic script, actual-corpus/mobile/journey browser suite, regression runner and reproducible report inventory. The combined benchmark now includes expansion cases; the old uncovered CPI/PCE comparison and debt-choice expectations were deliberately updated to reflect new coverage. Tests were not weakened to hide wrong answers. The Macro content assertion was strengthened after the final link audit.

## 46. Independent human validation

Still pending: fluent Swedish editorial reading, learner comprehension, independent finance/accounting judgment, real assistive-technology use and owner acceptance of the overall experience. Owner-delegated source checking is recorded honestly and does not impersonate any of these reviewers.

## 47. Substantive limitations

The inherited 29 retain their old review provenance and Batch 0 issues. New explanations are bounded educational material, not personal advice, current company analysis or a guarantee of comparability across accounting jurisdictions. Synthetic examples simplify actual fees, financing, tax, index and cash-flow conventions. Public source accessibility can change. Retrieval covers authored intents and a finite tested set, not unrestricted language understanding.

## 48. Knowledge → NTM connection map

| Surface | Implemented connection / boundary |
| --- | --- |
| Fråga NTM / search | 100 canonical questions, bounded aliases, multi-intent answers and lazy depth |
| Research | Metric help plus thesis fact/assumption, falsification and provenance help; no private prose sent to retrieval |
| Fundamental Profile | Existing metric help/relation consumption benefits from canonical depth; no new metric/provider schema |
| Calculators | Existing details/help and task-preserving dialogs; formulas remain prose except pe/1 |
| Academy | Relevant lesson/answer graph; existing reminder/assessment boundaries preserved |
| Macro | CPI/PCE, units and uncertainty help in Macro context; underlying data unchanged |
| Public Research | Generic date/version/snapshot help, outside immutable authored snapshot |
| Min NTM | Existing public relationships/workflow navigation only; no new account-specific knowledge profiling or personal recommendations |

## 49. Recommended Knowledge UX 100 scope

Plan a separate user-facing entry around Fråga NTM, with search and browse as complementary routes. Make the distinction between direct answer, clarification and no coverage clear; expose source depth, limitations and return-to-task links. Test a small set of investor journeys on mobile before visual implementation. This task did not begin that redesign.

## 50. Future AI grounding readiness, without AI

Stable IDs, reviewed sections, sources, timestamps, versions, explicit limits and typed relations are suitable future grounding inputs. Any later AI proposal must separately enforce answer eligibility, stale suppression, citation/provenance and explicit user-selected context. No embeddings, prompts, model/provider integration, vector database or AI-specific pipeline was added.

## 51. Deviations

ISK year scope moved from later coverage into the tax group; total remains 100. No extra PP&E/depreciation pages were needed. Minor formula/convention scope was narrowed where evidence required it. Two exact educational guard false positives were fixed, and new navigation/context metadata was corrected. Native browser zoom and independent human evaluation are not claimed by the automated text-reflow tests. No large UX or financial data change was made.

## 52. Local release readiness

**Yes: the implementation is locally release-ready in reviewed/noindex state.** Every entry in the final regression ledger is zero, and the final generated/history/whitespace checks pass. New content is eligible for that existing release state under the delegated scope; this does not close inherited editorial gaps or authorize mass indexing. No known failing technical gate remains from this expansion. Independent human validation remains pending, and production deployment has not occurred.

## 53. Exact owner review procedure

1. Read sections 13, 19, 22, 46–47 and the coverage map; review the stated limitations before changing publication status.
2. Run the existing local static preview. Walk the 13 recorded browser questions, then follow source details and return to Research/calculator context.
3. Sample each of the eight new micro-groups, prioritizing TTM, non-GAAP, negative/near-zero denominators, cash-flow timing, Macro units, ISK year scope and snapshot dates.
4. For a correction, edit the canonical object, increment content version with actual reason/reviewer/date, update evidence and rerun history/schema/retrieval/generated checks. Do not rewrite an old baseline to conceal the correction.
5. Record independent human acceptance only after it occurs. Address the exact Batch 0 checklist separately. Keep new pages reviewed/noindex unless deliberately approved for publication.

## 54. Recommended commit/deploy sequence — not executed

Review the full existing dirty worktree and separate prior authorized work from this expansion. Inspect generated diffs and evidence, rerun `node scripts/build_seo.cjs --check`, history and `python -B scripts/validate_release.py` with Node/PGlite configured, and confirm all browser evidence matches the final tree. Only after separate authorization stage the intended files, commit, push and use the existing deployment workflow. No migration is needed. After deployment, anonymously smoke-test Knowledge, source links and contextual help on production; do not use the owner's private Research.

## 55. Recommended next product task

**Knowledge UX 100**, scoped as a separate task after owner review of this corpus. Focus on making the existing reviewed layer useful through Fråga NTM and connected task journeys, not another bulk-content project. It has not been started.
