# NTM Master Roadmap 3.0 — Wave 3 engineering report

18 September 2026. Baseline `48e4d49ff0384df02fa92a38984a3f483a96a2fc`. Authority: §17 / Wave 3 of [Master Roadmap 3.0](ntm-master-roadmap-3.0.md) and the owner's bounded implementation request. **The engineering portion is release-ready against the local automated gates. Owner content/rubric acceptance, immediate human usability and actual delayed-learning evidence remain pending.** No commit, push, deployment or Wave 4 work was performed.

## 1. Existing Academy mapping findings

Inspected the existing Academy catalog, activities, progress/progression, home/roadmap generators, canonical Knowledge public projection, Wave 1 context contract, stock/FX/savings formula owners, savings follow-up, Min NTM and local backup validation. Existing attempts record correctness and time but cannot establish independence, help exposure or novel/delayed application. Existing XP remains activity evidence. Existing reviewed explanations and calculator modes cover this bounded pilot; no new Knowledge publication or calculator formula was needed.

| Competency | Existing lessons | Existing activities | Canonical Knowledge |
| --- | --- | --- | --- |
| `per-share` | `eps`, `dilution`, `revenue` | `share-count`, `debt-study` | `eps`, `dilution` |
| `valuation-return` | `pe`, `cagr`, `reverse`, `scenarios` | `price-vs-profit`, `forward-demand`, `compare-investments` | `pe`, `cagr` |
| `real-fx` | `currency`, `inflation`, `compounding`, `avkastning` | `fx-outcome`, `price-level`, `cost-timing` | `fx`, `inflation`, `compounding` |

These mappings preserve prior activity. They do not upgrade old completion into a new competency claim. New assessment variants supply the evidence the existing records never collected.

## 2. Three pilot competencies

The pilot covers company versus per-share growth, valuation assumptions versus implied annual return, and nominal/real/FX outcomes. There are 18 bounded synthetic tasks: two practice, two application and two delayed variants per competency. They are data records rendered in one workspace, not 18 new pages. Application changes the question: EPS percentage development rather than only EPS, return against a stated target, and purchasing power of savings rather than only a percentage.

## 3. Competency data model

`academy-competencies.js` owns versioned competency IDs, goal, existing content mappings and finite task records. Tasks have stable ID/version/variant/context, prompt, numerical tolerance, interpretation choices, feedback and optional allowlisted synthetic calculator inputs. `academy-evidence.js` derives state from immutable records; it adds no competing mutable mastery score. Current rubric version is 1; delay is 604,800,000 ms.

## 4. Introducerat semantics

Opening a competency records an encounter using the existing progress event mechanism. A mapped lesson encounter also establishes introduction. Introduction does not imply a correct answer or independent understanding. Untouched competencies display Inte påbörjat.

## 5. Övat semantics

A submitted pilot attempt or mapped legacy activity establishes practice, including wrong, helped or repeated attempts. Missing independence evidence never becomes mastery. A later eligible delayed failure returns the current label to Övat while keeping the original evidence intact.

## 6. Visat förståelse semantics

Requires all three: a correct novel practice without recorded help/reveal; a correct separately labelled application; and a correct different delayed variant started at least 168 hours after the first qualifying practice, without help/reveal. The latest eligible delayed failure prevents the current demonstrated label. Application may use tools/help and is labelled accordingly. The UI calls this bounded pilot understanding and explicitly rejects certification. Local evidence cannot prove that no external help occurred.

## 7. Attempt evidence model

The existing version-2 progress envelope and legacy attempt fields remain. New attempts can add a strictly validated `evidence` object: schema/rubric/competency/task versions, competency ID, variant, attempt ID/order, phase, help/reveal flags, independent flag, practice/application/delayed context, anchor attempt, start time and clock validity. Start/help/reveal/submit append separate records. Eligibility is recomputed from the whole group; a stored independent flag alone cannot grant it. Duplicate starts, competing order, mismatched identity/version, invalid ordering and future/regressing clock evidence fail closed. Raw numeric answers and free-text reasoning are not persisted.

## 8. Legacy-history handling

Version-1 progress normalizes through the existing adapter; old version-2 attempts still validate without evidence. They remain activity history and XP input. Missing task version means ineligible/unknown evidence, not a failed assessment or mastery. Changed schema, rubric, competency or task versions do not silently carry a prior demonstration into a different task contract. Historical records remain readable.

## 9. Help/revealed-answer handling

Opening canonical help, revealing the worked answer or opening an application tool appends exposure before the action. Write failure prevents the action from being treated as clean evidence. The submit record is persisted before feedback is shown. Any exposure within a group disqualifies independence, including when the last record falsely claims otherwise. Reading Knowledge outside an assessed attempt is allowed without marking an assessment helped.

## 10. Novel-variant behavior

A prior start consumes that variant even if abandoned. Correct retries after feedback, cross-tab repeats and reopened same variants cannot become novel. A distinct unused variant can qualify. Two variants per context deliberately bound the pilot; exhaustion is stated and repetition remains available without a new independence claim. The system does not generate endless unreviewed questions.

## 11. Delayed-check behavior

Delayed evidence is pinned to the first eligible practice and uses elapsed milliseconds, not a calendar-date shortcut. Starting too early, wrong anchors, changed versions, help or repeated variants cannot satisfy the rule. Automated clock fixtures cover due behavior, success, subsequent failure and preserved history. Browser/device clock and imported local records are not a proctoring or tamper-proof time authority. Actual delayed human results remain pending.

## 12. Application/transfer evidence

Application has its own context and task variant. A correct answer plus interpretation is required; merely visiting or calculating grants nothing. Tools are allowed and marked as help. Company/per-share application interprets a report's total-profit claim against EPS development. Valuation applies a personal hypothetical target; FX/savings converts a one-year scenario to real SEK capital. No private Research prose is read or graded, and no thesis is altered or published.

## 13. Knowledge integration

The UI reads canonical public entries at use through `NTMKnowledgeCatalog.publicEntries()`, rendering their short answer and caveats. Full articles open separately with the existing task-help fragment. The original live answer form remains intact. No independently maintained Academy definition or new Knowledge status/source assertion was introduced. Help during a task is recorded before the snippet appears.

## 14. Calculator integration

Uses existing stock simple valuation, FX percentage mode and savings capital mode. The destination preview lists each input and unit, labels the entire scenario synthetic, requires explicit replacement consent, and does not calculate/save automatically. Any intervening form edit clears consent. Applied values select USD for stock, percent FX and real SEK capital for savings. Existing successful-plan saving, reload and explicit saved-plan selection were verified; its immutable original basis survived. `script.js`, `valuation-core.js` and savings storage were not changed.

## 15. Numerical oracle results

All 18 task answers and all corresponding valuation, FX, real-return and savings projections matched independently calculated Decimal reference constants within 1e-8. Tests also require the correct interpretation choice. Display tolerance is 0.01 EPS/percentage points for the per-share task, 0.03 percentage points for valuation/real-return and 0.5 SEK for real-capital application.

Representative v3 application checks: per-share EPS 2.6911764705882355 implies −10.294117647058815%; valuation annual return is 12.342525636014857%; FX-adjusted nominal return is 7.88%; inflation 4% gives real return 3.730769230769231% and real capital 10,373.076923076924 SEK. Formula owners were tested without adjusting them to fit an exercise.

## 16. Safe-return/context behavior

Extends the existing Wave 1 transport with one bounded `academy-scenario` kind, not a global state service. Fields are schema/source/destination/time/expiry, public exercise identity/version, exact method/units and allowlisted inputs. Lifetime is 15 minutes. The same token/session envelope validator is reused. Destination, competency, task naming/version, exact keys, finite ranges, integer years, method and units are checked. Unknown, stale, malformed, future and wrong-destination payloads fail before applying.

A deliberately opened same-origin tab receives only the envelope after clearing the browser's cloned session storage; its opener is severed. The URL contains an opaque token, never amounts, answers, evidence or private work. The original Academy tab remains live. Cancel/expiry leaves calculator fields unchanged; explicit apply consumes the token. Closing the exercise tab returns to the source tab. Active assessed navigation warns; returning after abandoning a task cannot relabel its variant novel. No automatic upload or analytics event was added.

## 17. Min NTM learning continuation

The existing lower Academy section receives one derived continuation when pilot work is active. Due/later-failed learning can be selected there; investment-review ownership and ordering stay unchanged above it. There is no badge, streak, notification system or second queue.

## 18. Academy orientation changes

The home page begins with three competency cards and one selected task workspace. Curated sequence links point to these competencies. The existing roadmap is described as an overview; the prior skill breakdown is labelled activity by topic. Existing XP recommendations are secondary. New scripts load on the home and Min NTM surfaces as needed, not on every lesson page. Canonical V3 classes, controls and tokens are reused; no art-direction variants or full Academy redesign were added.

## 19. XP/level preservation

No reward definitions, earned history, level thresholds or XP formulas changed. New synthetic task/encounter IDs do not map to legacy rewarded activity IDs. Regression tests verify existing completion reward semantics and that new competency attempts do not manufacture XP. Historical XP never grants a demonstrated label.

## 20. Large-catalog scalability

A test temporarily appends 600 synthetic task objects and verifies that state derivation still exposes three competency choices and one next task. The UI renders one task and at most 12 recent pilot attempts in a disclosure; stored history is retained. The synthetic test publishes no extra pages or objects. This is bounded navigation evidence, not an unlimited history/performance guarantee; the existing 50,000-record storage cap remains.

## 21. Answer-leak testing

Strict scenario projection excludes answers, correct choices, feedback, independence and private prose. Unit tests inspect every transferable scenario; browser tests inspect the actual child-tab payload and reject an injected correctness field. Canonical EPS help is checked not to contain the assessed numeric answer and preserves typed input. The savings payload carries the necessary intermediate nominal rate, never the graded real-capital answer. Formula inputs naturally permit calculation. Deterministic grading answers exist in local JavaScript; this is not a secure examination against DevTools inspection.

## 22. Backup/import compatibility

The existing local backup validator delegates Academy validation to the extended progress owner. Old backups round-trip; new evidence exports/imports; same-ID conflicting histories reject without writes. Concurrent same-order attempt groups cannot grant independence. No second store, reset or cloud learning sync was added. New optional evidence requires this updated validator; restoring into an older deployed client is not promised. Local storage deletion/loss still removes local learning unless backed up.

## 23. Mobile/theme/keyboard/accessibility

New journeys pass at 360/390/430 in both themes, including numeric/radio keyboard input and preview consent/apply via Space/Enter, visible focus, retained input and no horizontal overflow. Forms use labels, fieldset/legend, native buttons and live status text. Screenshots use reduced motion to capture the final theme rather than an intermediate transition. Light/dark learning and preview artifacts were visually inspected. The existing 39-route accessibility/CSP audit and 246 route/theme/contrast checks pass. These checks do not substitute for an assistive-technology user study.

## 24. Files changed

New runtime files: `academy-competencies.js`, `academy-evidence.js`, `academy-competency-ui.js`, `academy-scenario-ui.js`. Integrations: `academy-progress.js`, `wave1-context.js`, `academy.html`, `min-ntm.html`, `aktievarderingskalkylator.html`, `valutajusterad-avkastning.html`, `sparmalskalkylator.html`. Generator owners: `scripts/build_academy.cjs`, `scripts/build_academy_v3.cjs`. Tests: `tests/academy-evidence.test.cjs`, `scripts/wave3_browser.py`. Documentation: this report, owner procedure and `docs/qa/roadmap-wave3/` evidence. Historical screenshots overwritten by existing suites were restored. Research lifecycle, data, accounts, publication, RLS and formula owners remain unchanged.

## 25. Tests added/changed

Twelve new JavaScript tests cover legacy states/XP, first wrong/right/helped/revealed/retry/novel, full evidence chain, early/helped/repeated delayed checks, later failure, clock anomalies, abandoned starts, versions, forged flags, competing order, backup conflicts, payload boundaries, 600 synthetic objects and numerical oracles. Seven focused browser tests cover live learning/help/feedback, calculator explicit replacement/safe return, FX/real savings and saved-plan resume, delayed fixtures/Min NTM, malformed payloads, mobile keyboard learning and preview. One test expectation was corrected to select a saved savings plan explicitly after reload; production saving behavior was not altered to satisfy the test.

## 26. Complete release-gate results

| Gate | Result |
| --- | --- |
| Python release suite | 166 passed |
| JavaScript release suite | 253 passed, zero skipped; includes 12 new tests |
| Existing browser/product suite | 38 passed |
| Wave 1 / Wave 2 | 7 / 9 passed |
| Wave 3 real-browser journeys | 7 passed |
| Accessibility/CSP route audit | 39 routes passed |
| Site-wide V3 audit | 246 route/theme checks; no overflow; canonical canvas; visible primary contrast ≥4.5:1 |
| Cloud/social RLS | Actual local PostgreSQL/PGlite isolation, ownership, conflict, projection and deletion suites passed |
| Account/session browser | Persistence, restart, refresh, logout, deletion, offline and no silent upload passed |
| Publication/social browser | Preview/cancel, allowlist, unpublish/private preservation, privacy, mobile passed |
| SEO/staging/security | 85 canonical sitemap URLs; no outdated generated files, missing staged references or new CSP/security failures |
| Workflow | actionlint 1.7.7 passed |
| Diff hygiene | `git diff --check` passed |

The release suite includes Academy/activities/progress, Knowledge, numerical calculator correctness, savings, Min NTM, Research, backup and account/publication regressions. Existing partial macro-source and not-yet-published 2027 schedule notices remain explicit. These are local/staged/mock endpoint checks, not a new hosted deployment certification. PowerShell may wrap unittest stderr as NativeCommandError even when its captured unittest summary is OK; retained logs show the actual results.

Evidence and commands: [validation summary](../qa/roadmap-wave3/validation-summary.json), [release log](../qa/roadmap-wave3/release.log), [browser log](../qa/roadmap-wave3/browser.log) and named suite logs in the same directory. Reproduce using the same commands as the Wave 2 report, substituting Wave 3 QA output paths, plus `python -B scripts/wave3_browser.py`. Use installed Edge, the local Node binary and actual PGlite module; do not accept skipped PostgreSQL tests.

## 27. Owner/pilot procedure

[Exact launch, owner rehearsal and five-person immediate/delayed procedure](roadmap-3-wave3-owner-test.md) includes URLs, test profiles, units/rubric approval, help/repeat checks, explicit calculator consent, saved-plan continuation, keyboard/mobile use and outcome sheets. Immediate target is at least four of five unassisted application workflows. Owner review must independently check content/examples rather than treating passing code as editorial approval.

## 28. Human/delayed evidence still pending

No owner content/rubric sign-off, recruited five-user immediate observation or actual seven-day return result is claimed. Automated clock changes are explicitly synthetic. Real delayed checks require elapsed time and continued participant use. Usability success, independent answer evidence and delayed learning outcomes must be reported separately.

## 29. Deviations from Master Roadmap 3.0

No feature-scope expansion. Bounded implementation choices: 18 tasks, two variants per context, 15-minute existing transport lifetime, 168-hour elapsed delay, last-12 visible history, helped application allowed but independent practice/delayed required. Requiring correct separately labelled application for the demonstrated state is the conservative interpretation of the three-part pilot evidence basis. Real Research application remains optional and was not added. Human gates are separated from engineering readiness as explicitly requested.

## 30. Remaining limitations

Finite new variants can be exhausted; further assessment then needs newly reviewed variants/versioning. Local clocks and flags cannot prove external independence or prevent deliberate tampering. Leaving/reloading an unfinished attempt preserves its start, not a resumable typed-answer draft; the warning and consumed-variant rule are deliberate. Browser storage remains fallible and subject to existing optimistic cross-tab writes/capacity. New backup evidence requires the updated application. The seven-day rule is a product hypothesis. Content and human/assistive-technology evidence still need owner-led validation.

## 31. Engineering release readiness

**Yes, for this bounded local Wave 3 implementation.** The full automated gate and scoped real-browser journeys pass with preserved formulas and existing private/public boundaries. This does not mark the roadmap's human completion criteria passed. No commit, push or deployment occurred, and Wave 4 has not begun.
