# NTM Master Roadmap 3.0 — Wave 4 engineering report

18 September 2026. Baseline `a7129b69507f0d5983b6efc098cc7ced938114b8`. Authority: owner request and Master Roadmap 3.0 §7/Wave 4, §5.4, §5.9, §5.12 and §14. Canonical Visual V3 and Waves 0–3 remain the baseline. No commit, push, deployment or Wave 5 work.

## 1. Existing-data findings

The 12 existing normalized stock files contain reported and derived observations with definitions, units, periods, accession/provenance and quality metadata. Their dataset validation does not establish every comparison. All current annual EPS/share observations mark the share basis unverified. CRWV, FLY and SNDK have one annual row. SOFI is `financial_services`; industrial margins/FCF remain inappropriate. Source files and their historical values were not edited. This work did not independently re-audit the underlying SEC filings.

## 2. Fundamental Profile architecture

`fundamental-profile.js` is a pure deterministic engine; `fundamental-profile-ui.js` renders its output in actual Research. The engine has seven bounded dimensions, no persistence, network, ranking or score. It accepts existing validated company profiles and uses annual observations only. No new ticker coverage or provider was added. Two descriptions are initially visible; other dimensions, evidence, technical contract and canonical help use native disclosures.

## 3. Statement/evidence contract

Schema 1 / method `ntm-fundamental/1` contains company/profile, dimension, statement type, eligibility with blocked reason, comparison basis, data-method version, literal text, copied evidence by metric/period, original units/currency/source metadata, calculation/formula/result and limitations. Facts retain `reported` versus `derived`; calculations are explicitly NTM calculations; the sentence is descriptive interpretation. `userAssumptions` is empty because this profile does not incorporate personal assumptions. Full contract is inspectable in each statement and in [pilot evidence](../qa/roadmap-wave4/pilot-evidence.json).

## 4. Eligibility/comparability rules

Requires validated schema/profile, finite available values, expected metric identity and units, matching definitions/currency/kind/source/method, reported accession/concept or derived method/source filings, matching enclosing period metadata, unique chronological annual rows, contiguous years and actual dates. Annual durations must be 350–378 days and differ by at most one day. A 52/53-week transition therefore blocks rather than quietly claiming like-for-like growth. Quarterly/TTM mixtures, gaps, zero/negative percentage bases, flags for restatement/split/correction and malformed units fail closed. Cross-metric calculations require aligned dates and units. Unknown or blocked does not mean neutral.

## 5. Growth implementation

Revenue growth between the latest two comparable annual rows uses `(new / prior − 1) × 100` with positive prior revenue and nonnegative new revenue. SOFI is labelled nettointäkter. No inferred adjusted/organic growth, forecasts, universal profit-growth assessment or percentage interpretation of negative/zero bases. The limited pilot prioritizes revenue evidence over adding weak statements.

## 6. Profitability implementation

Operating margin is operating income / positive revenue × 100 for each year. Movement is the difference in percentage points. Negative operating income is a valid ratio; it does not receive a percentage-growth verdict. Financial-services profiles are withheld. Neither higher margin nor its direction is an investment conclusion.

## 7. Cash-generation implementation

Only existing annual FCF with the existing `operatingCashFlow_minus_capex` definition is used. Both periods must have eligible FCF, operating cash flow and CapEx, aligned periods/currency and arithmetic reconciliation within 0.01 base currency units. Negative CapEx or missing/withheld components block. The display shows absolute levels, not percentage growth from a loss. Exclusions describe acquisitions, financing and share-based compensation; it does not call all FCF distributable or universally comparable. SOFI remains withheld.

## 8. Balance-sheet implementation

Shows the latest annual balance date and the separately reported cash and debt components only when both are eligible and aligned. The debt definition is visible. Missing components stay missing; no net cash, leverage/liquidity quality or freely available cash is inferred. More recent quarterly figures are not silently substituted into the annual profile.

## 9. Per-share/R6 implementation

Compares common-shareholder profit and diluted EPS across identical annual pairs, with a corresponding positive diluted weighted-average denominator. Requires explicit verified `weighted_average_diluted` share basis, the weighted-average concept, compatible currency/units, no split/restatement flags and income/shares reconciliation to EPS within 0.011 currency/share for reporting precision. Shows both growth calculations; “vinsten växer snabbare” requires positive total-profit growth and a gap greater than 0.1 percentage point. The tolerance is a display rule, not investment materiality. All real pilot datasets fail the share-basis gate; only labelled synthetic fixtures demonstrate the eligible branch. No dilution-problem label or Min NTM alert is created.

## 10. Fundamental-momentum implementation

Three consecutive positive comparable revenue observations yield two year-on-year rates. The literal statement says that the rate went from X% to Y%; no opaque acceleration label or forecast is added. This describes fundamentals, explicitly not price momentum. Insufficient history is unavailable.

## 11. Data-quality implementation

A separate diagnostic reports how many of the six descriptions have eligible evidence, annual observation count, latest annual period/end date, fetched time, update status and blocked reasons. These are NTM coverage/freshness facts, never a company-quality grade. No wall-clock threshold or investment score is introduced.

## 12. Pilot-company findings

| Company | Defensible current evidence | Boundaries |
| --- | --- | --- |
| NVDA | Revenue +65.47%; operating margin 62.42% → 60.38%; FCF 60.853bn → 96.676bn USD; dated cash/debt components; revenue rates 114.20% → 65.47% | FY2025/FY2026 comparison; annual share basis unverified |
| SOFI | Net revenue +35.09%; revenue rates 26.01% → 35.09% | No industrial margin/FCF; missing balance component; annual share basis unverified |
| CRWD | Revenue +21.71%; negative operating margins −2.94% → −6.10%; FCF and dated balance components; revenue rates 29.39% → 21.71% | Actual unrounded margin movement is −3.15pp; annual share basis unverified |
| CRWV | Honest one-year coverage diagnostic | Comparison history and required balance evidence unavailable; no inferred leverage assessment |
| FLY | Honest one-year coverage diagnostic | Comparison history and required balance evidence unavailable; no invented trend |

Values above are generated from the unchanged repository datasets, not newly fetched observations. Owner accuracy/comprehension review remains pending.

## 13. R12/source-correction implementation

`research-snapshot.js` compares normalized metric/period/type/unit/currency identities in frozen versus current evidence. Different value, source, accession, source version, method, definition or formal correction produces old/new evidence plus a deterministic `R12/1` fingerprint. It includes overlapping TTM inputs and frozen annual facts. Fetch/generated timestamps, label/URL changes and source-array ordering do not count. Conflicting duplicate identities cannot establish a correction. A changed unit/period identity is not silently treated as the same fact.

## 14. Research integration

The profile appears before the existing annual revenue overview and reuses V3 tokens, cards, native details, source dialog and Wave 1 help. It displays evidence as Swedish metric names, reported/NTM calculation labels, dates, units and original definitions. Technical JSON is deeper. Current annual facts/profile/method are copied into new saved snapshot provenance, enabling later annual corrections; original revisions are immutable. Existing valuation remains user-controlled and separate. No new valuation assessment is emitted without dated price evidence.

## 15. Wave 2 lifecycle/Min NTM integration

R12 adds Research-only reason fingerprints to the existing review acknowledgement contract. Keep/revise/close/decline do not rewrite the old evidence. Identical acknowledged corrections stay quiet; new fingerprints can appear. Due-review ordering and grouped existing reasons stay intact. Current assumptions have no explicit fact-link contract, so R12/R6 are not sent to Min NTM and private prose is not interpreted as a link. Exact-review evidence detects changed correction evidence; no new global notification store was added.

## 16. Knowledge integration/content

Research reuses the canonical growth, margins, FCF and dilution help. A single reviewed `macro-releases` object was added to the canonical editorial source, bringing the catalog to 29; the original 12 Wave 1 concept mappings remain unchanged. It includes intent, short answer, full explanation, limitations, synthetic checked example, units, primary sources, claim map, duplicate check, version/date/reviewer and pending owner acceptance. Existing inflation/interest-rate lessons receive generated links. It is a reviewed local engineering artifact, excluded from the published sitemap, not independently approved content.

## 17. Macro improvements

Shows coverage as a selected mainly US release universe, selected dates, display timezone, original source date/time, outcome/source status, existing per-field provenance, explicit unknown revision basis and genuinely represented revision values. The existing partial-source/last-successful-fetch behavior remains. No forecast, consensus, surprise, sentiment score or market direction is fabricated.

## 18. Macro → Knowledge

CPI/PCE/payroll/employment/BNP names map to the new canonical release-reading answer; supported Fed/policy-rate names map to the existing interest-rate answer. Canonical inflation limitations are also available through the existing Knowledge infrastructure. The Wave 1 dialog now includes the canonical full explanation in its source/example disclosure. Escape restores focus, and full articles open separately. Browser tests preserve selected week, URL and scroll position. Unmapped events do not receive a guessed definition.

## 19. Earnings improvements

The text transcription explicitly identifies the limited image universe, ISO week with dated range, America/New_York session basis, possible Swedish date crossover, unknown exact time, issuer confirmation and last IR verification. Existing images and transcription remain accessible. No individual issuer date becomes “confirmed” or “provisional” without supporting data; no complete earnings universe is claimed.

## 20. Calendar reliability

Existing Python/JS/browser fixtures cover year/week boundaries, Stockholm DST, US/Swedish crossover, missing/partial weeks, event priority, duplicate identities, failed refresh and stale retained data. New fixtures cover revised/first-reported/unknown values, a zero actual with missing forecast, 2026-W53 → January 2027 and a revised late-US event on the next Swedish date. Existing notices about partial upstream Macro coverage and unpublished 2027 schedules remain visible.

## 21. Provenance/correction behavior

Each profile statement exposes raw provenance and formula. New snapshots retain three annual rows and statement-method/profile metadata inside the existing version-2 provenance envelope; old snapshots without annual evidence are not backfilled. R12 cannot claim an annual correction to an old revision that never captured annual facts, or compare facts that no longer exist in current coverage. Research links to the existing correction framework. Owner must confirm monitoring/triage of the existing Instagram contact; no mailbox was invented and no contact was sent.

## 22. Financial adversarial tests

`tests/wave4.test.cjs` exercises positive growth, negative/zero/missing bases, mixed annual/quarterly/TTM, duration/period gaps, currency and definition mismatch, invalid common units, missing provenance, reported/derived confusion, percentage-point movement, missing margin, financial profile exclusion, cash reconciliation/missing/withheld FCF, missing balance components, per-share mismatch, point-in-time versus weighted shares, split/restatement, insufficient history, duplicate/null observations, accession/source-version/formal corrections, timestamp-only refreshes, legacy annual absence and acknowledgement reopening only for changed evidence. All blocked cases fail closed. No stock-file editing was used to satisfy assertions.

## 23. Browser/mobile/theme/accessibility review

Automated actual-page inspection covers NVDA/SOFI/CRWD/CRWV/FLY, Macro and Earnings at 1440/360/390/430px in dark/light, with disclosure activation, source dialogs, keyboard help and focus return. R12 save→correction→acknowledge→reload preserves the original revision and keeps the unlinked correction out of Min NTM. Representative screenshots were visually inspected, including incomplete and financial-company states. The mobile profile was shortened by moving help buttons into a disclosure. A separate 41-route audit checks 1440/320px, themes, visible control names, focus, overflow and CSP. This is not a full screen-reader audit or human comprehension study.

## 24. Files changed

Core/UI: `fundamental-profile.js`, `fundamental-profile-ui.js`, `calendar-context.js`, `research.js`, `research.html`, `research-v3.css`, `research-snapshot.js`, `change-detection.js`, `research-continuity.js`, `research-continuity-ui.js`, `week-pages.js`, `makro.html`, `rapporter.html`, `wave1-ui.js`.

Canonical/generated Knowledge: `docs/internal/knowledge/catalog.cjs`, `knowledge-catalog.js`, `fragor-svar.html`, `fragor-svar-tolka-makroslapp.html`, `academy-inflation.html`, `academy-interest-rates.html`. Tests/runners: files listed below. Reports: this report, owner procedure and `docs/qa/roadmap-wave4/` evidence. Historical QA images regenerated by old runners are archived under Wave 4; their baseline files are preserved.

## 25. Tests added/changed

Added six grouped adversarial/contract tests in `tests/wave4.test.cjs` and four browser journeys in `scripts/wave4_browser.py`. Updated Knowledge counts in `tests/knowledge.test.cjs`, `tests/wave1.test.cjs` and `scripts/browser_smoke.py`; added `dataset` support to the Research test DOM boundary. Added Macro/new Knowledge to `scripts/quality_browser.py`. Existing formula/storage/security assertions remain enabled.

## 26. Complete release-gate results

| Gate | Result |
| --- | --- |
| Python release suite | 166 passed, no skips with PGlite configured |
| JavaScript release suite | 259 passed, no skips with PGlite configured |
| Existing browser suite | 38 passed |
| Wave 1 / Wave 2 / Wave 3 browser journeys | 7 / 9 / 7 passed |
| Wave 4 browser journeys | 4 passed; 56 company/calendar size-theme combinations plus correction/revision fixtures |
| Accessibility/CSP | 41 routes passed |
| Cloud/social PostgreSQL RLS | Both passed using local PGlite |
| Publication migration | Passed deployed-schema upgrade/authorization compatibility fixture |
| Accounts/session/cloud browser | Passed staged real-SDK tests with synthetic Auth endpoints |
| Social/publication browser | Passed preview, allowlist, private preservation, unpublish and mobile checks |
| SEO/staging | Generated files current; 85 published sitemap URLs; no missing staged local references |
| Security/workflow/diff | Credential-pattern and staged CSP checks, actionlint 1.7.7 and `git diff --check` passed |

Logs are retained in `docs/qa/roadmap-wave4/`. These include Research, financial data/provenance, Change Detection, lifecycle, Min NTM, Knowledge, Macro/Earnings, calculators and Academy regression. Initial failures were an incomplete test DOM shim, stale catalog-count assertions, and missing Node environment configuration; the final runs pass. PowerShell wraps unittest stderr as NativeCommandError even when unittest's final result is OK; inspect the final summary. No fresh hosted production certification or deployment was performed.

## 27. Owner/editorial review procedure

Use [the owner procedure](roadmap-3-wave4-owner-test.md) to reconstruct calculations, compare representative company types, identify evidence gaps, examine source corrections and test Macro/Earnings comprehension. Record reviewer/date/build and concrete accept/change decisions; specifically approve statement definitions/tolerances and the one new Knowledge object before treating editorial work as accepted.

## 28. Human evidence still pending

Owner substantive content/method approval; independent financial/sector/share-basis review; correction-channel monitoring/triage assignment; external-user comprehension and calendar usability observations; manual screen-reader testing. No human pilot or user-validation claim is made.

## 29. Deviations from Master Roadmap 3.0

No later-wave features. The intentionally narrow first implementation uses comparable annual revenue, operating margin, reconciled FCF and balance components, rather than every potential metric or TTM history. R6's executable eligible branch is synthetic-only because existing real annual share bases do not qualify. R6/R12 queue linkage is withheld because no active structured fact links exist; this honors the roadmap's restriction rather than inferring them from text. Owner/editorial/pilot completion is separate from engineering completion.

## 30. Remaining limitations

No live price, new feed, forecast, broad stock coverage, valuation verdict, recommendation, ranking or fundamental assessment labels. No source licensing or operational ownership is established by tests. Comparability rules are conservative and block 52/53-week changes and represented restatements pending methodology review. Source data can still contain errors. Legacy snapshots cannot provide uncaptured annual evidence. Earnings remains an unverified image transcription. Macro retains partial coverage and unknown previous-value revision bases when not supplied.

## 31. Engineering release readiness

**The engineering portion is release-ready against the local automated gates.** This does not claim owner/editorial acceptance, independently verified financial methodology, external-user validation or live deployment readiness. The requested implementation and review artifacts are prepared without committing, pushing, deploying or starting Wave 5.
