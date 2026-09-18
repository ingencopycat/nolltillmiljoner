# NTM Master Roadmap 3.0 — Wave 2 engineering report

18 September 2026. Baseline: `448fca35b9d112376c9e9e12301ccfb3245a19c1`. Scope: [Roadmap §17 / Wave 2](ntm-master-roadmap-3.0.md), plus the owner's attached Wave 2 implementation request. Wave 1, Wave 0 and canonical Visual V3 remain the baseline. No commit, push, deployment, hosted migration or provider purchase.

**Status: engineering release-ready.** Complete local automated release gate passed. Human formative evidence and second-return observations remain pending; they are not represented as engineering test results.

## 1. Current-state findings

Inspected `research.js`, `research-review.js`, `research-v3.js`, `thesis-storage.js`, `change-detection.js`, `research-snapshot.js`, outcomes, Min NTM, `local-data.js`, private sync, publication projection, Wave 1 and their existing fixtures before connecting the implementation.

The baseline already appended immutable review revisions, preserved outcome snapshots, supported manual companies and closed/declined states, detected comparable changes, and prioritized due reviews. It lacked a durable local draft choice and exact queue target. Min NTM carried ticker plus `review=1`; acknowledgements compared the whole change-report JSON. Existing metadata already had the required `review.changeKey` string. These are extensions of those owners, not replacement storage or review systems. Existing behavioral groups, publication/session repairs and calculator formulas were not rebuilt.

## 2. Derived lifecycle model

`research-continuity.js` supplies pure `select`, `reasons`, fingerprint and target functions. No lifecycle status column or mutable parallel journal was added. Records remain the authority; UI context only identifies an explicitly requested review, unresolved restore, current draft or deliberate revision operation. `research-v3.js` uses this selector for its primary action and workspace summary.

No thesis → formulate; active → continue; due → review chosen dates; comparable new facts/filings → inspect changes; unfinished draft → continue local work; explicit revision → finish the editor. Checkpoint/outcome contexts route to the existing outcome section. Closed/declined records offer history or explicit reopening and emit no active reasons.

## 3. Lifecycle overlap behavior

Unresolved restore/conflict/error precedes exact requested review, then due review, unacknowledged comparable change, unfinished draft and active continuation. Blocked comparisons and open questions are informational, not a manufactured urgent lifecycle. Inactive work is excluded from active attention; explicit Revidera supplies transient editing intent, and only a saved revision reopens it. The selector tests exercise the overlapping flags rather than merely testing six isolated states.

## 4. Draft contract

One strict companion per company under `ntm-research-work-v1:<existing company key>`. Version 1 contains only `{version, draft, snoozes}`. Draft fields are a fixed allowlist of existing thesis, assumption, question, review and valuation inputs; a frozen source-revision fingerprint, EPS-origin mode, optional pending revise context and edit timestamp accompany them. No unknown fields are accepted.

Bounds: 20 local workspaces, 200,000 serialized characters per workspace, 20,000 per field, 100 snoozes; restore window 14 days. Expired/future-clock or changed-base drafts remain downloadable/discardable, never silently applied or deleted. Empty companions are removed. There is no automatic saved revision, cloud write or publication. Input events preserve local work; reload asks **Återställ** or **Kasta**. Restore also confirms if the visible form changed after the page opened. Navigation warns for pending/dirty/error work; Wave 1's conservative navigation warning remains.

Restored financial values become explicitly historical/manual assumptions, with manual EPS and a stale result requiring calculation before a thesis save. Previously SEC-derived EPS is described as a copied historical value, not newly verified current SEC data. Normal Research initialization and formulas remain unchanged.

## 5. Exact-review reference contract

Min NTM captures the displayed company/journal key, latest revision ID and full immutable revision fingerprint, reason fingerprints, assumption/question IDs, normalized comparison evidence and creation time. The object stays in same-tab session storage at `ntm-research-review-target-v1`; the URL contains only the existing company route, a public `review=exact` marker, normal section hash and existing allowlisted campaign context.

Targets expire after 24 hours and reject future-clock creation times, unknown shape/version, missing or replaced revisions, changed evidence and missing/changed referenced reasons. A newer current revision does not silently substitute for the selected one. Section navigation and reload preserve the exact marker. Opening a copied link without its local reference fails visibly. Saving consumes the target and removes the marker. No cross-device exact-target promise is made.

## 6. Min NTM grouping/prioritization

One active queue item per thesis, with due-date items first. Reasons distinguish **Valt granskningsdatum** from information to inspect when useful. Open questions have no invented deadline. Draft and pause continuations are separate from active attention; closed/declined work stays in existing history. Read/fetch failures produce an explicit incomplete-list message, not “nothing to review.” Fetch responses must match the intended company. No background notifications were added.

## 7. R1/R2/R7/R9 refinements

R1 deduplicates known filing accessions and includes distinct `10-K/A` / `10-Q/A` amendments. The existing bounded three-filing presentation remains; form/date and the existing evidence links retain accession/source detail. R2 reuses the existing comparability gates and strictly >1% / >0.5 percentage-point display triggers; zero-base absolute comparisons remain. No trigger is called investment materiality.

R7 uses each open question's stable ID and text. R9 uses the chosen thesis date or assumption ID/date/criterion/text; superseded and appropriately reviewed assumptions remain suppressed. Local calendar dates follow the existing local-date convention. A changed question, criterion, chosen date or eligible fact produces new evidence; unchanged reviewed evidence stays quiet.

## 8. R3 provenance behavior

Existing example/manual/historical price provenance remains at inputs and results. Review explicitly states that quote observation date is unverified and revision time is not quote time. There is no universal age limit, live-price claim, automatic stale-price queue alarm or hidden price refresh. Restoration makes copied financial inputs historical/manual and requires explicit recalculation. Manual theses do not acquire a fabricated financial snapshot.

## 9. Evidence fingerprints and acknowledgement

Versioned canonical JSON fingerprints sort object keys and evidence rows; comparison capture timestamps are excluded. Filing identity, changed before/after metrics/margins, period changes, blocked evidence, question identity and date/criterion basis remain. `review.changeKey` now holds `{version:2, ack:[fingerprints]}` in its existing string field, bounded to the latest 100 acknowledged fingerprints. Legacy whole-report acknowledgements remain readable and suppress the same normalized evidence without rewriting old records.

The review lists checkboxes. Date/data/comparison reasons start selected; open questions start unselected. Saving a decision acknowledges only selected evidence and carries prior acknowledgements. Acknowledging an open question leaves its answer/status unchanged. Review display and queue rendering do not mutate saved history. The bounded acknowledgement history may allow very old evidence to reappear after more than 100 distinct reasons; this is disclosed, not indefinite suppression.

## 10. Snooze/reschedule policy

Pause selected exact fingerprints until a user-chosen future local calendar date. They return on that date; new fingerprints are not paused. Pauses live only in the companion and do not change history, answer questions or constitute a review. Users can replace a pause date or explicitly reactivate that company's pauses. Min NTM retains a continuation for local pause records. A saved next-review date reschedules the thesis through the existing immutable review decision. Assumption dates remain editable in a deliberate new version. No automatic time-based thesis status mutation occurs.

## 11. Review flow

Real-page tests execute save → leave → Min NTM reason → exact review → inspect existing change/frozen evidence → decision → saved revision → Min NTM. The review retains beliefs, assumptions/questions, optional rationale/process note, next date, four decisions and outcome continuation. The user sees dates, evidence and questions, not serialized fingerprints or internal journal mechanics.

## 12. Keep/revise/close/decline

Unchanged keep is a valid new review revision retaining the original snapshot. Revidera sets pending review context and opens the existing editor; input autosave does not complete it. Reload can restore that pending revision draft; explicit thesis save completes the revision. Close and decline append decisions and suppress active attention. Reopening is explicit. Unselected open questions remain open and visible; selected acknowledgement does not fabricate an answer. Unsaved thesis edits still block keep/close/decline until deliberately saved or discarded.

## 13. Checkpoint/outcome continuation

For supported companies, the review links to the existing outcome/checkpoint section. Manual theses link to the existing process-note disclosure instead of an unavailable financial outcome. Its price observations, archived original basis, process notes and calculation method remain owned by the existing outcome implementation. No score or automatic checkpoint is created. Existing Research/outcome regression tests cover archived source deletion, invalid/manual prices, method boundaries and separation of investment outcome from process quality.

## 14. Manual-company behavior

Ticker and private-label theses use their established identity contract. Date, assumption and question reviews work without stock fetches; no metrics are invented. Draft restore, snooze, keep/revise/close/decline and explicit reopen are exercised on a manual company. Existing opaque manual-label route keys remain unchanged; private labels are not inserted into URLs or analytics.

## 15. Failure/stale-target handling

Save/review checks reread the actual source revision and compare its full fingerprint, including same-ID mutation. Other-tab storage events surface a conflict; original typed text remains available for download. Target failure explicitly states that another version is not being reviewed in its place; existing history remains inspectable. Corrupt companion bytes are retained for explicit download/deletion. Corrupt journal bytes block writes. Expired/mismatched drafts require download/discard rather than rebase.

Unavailable supported-company data retains the established Research error view; it does not convert the company to a manual thesis or allow an exact review against missing current evidence. Saved journal/backup remains intact. No offline supported-company review UI was invented; the owner can retry or inspect saved work through existing exports/history when available.

## 16. Storage/backup/private-sync compatibility

No journal, backup, cloud table, RLS or publication schema migration. Existing V1/V2 history and older backup imports remain supported. Drafts and snoozes are explicitly excluded from ordinary backup and private sync; the Research panel and Min NTM backup notice say so. Draft downloads are private reading/recovery copies, not a new import format. Backup import never silently applies a draft; source changes make its restore fingerprint fail.

Full ticker/local deletion includes companion keys in guarded, verified rollback-aware deletion. Research deletion of all history or its last revision also removes its companion. Full local/ticker/history deletion clears the pending same-tab review reference; an open Research tab invalidates its reference on cross-tab journal changes. As with an already-open form, other tab memory is not remotely erasable; stale targets always fail resolution. Existing checkpoint-retention semantics remain. Normal save/import/cloud payloads retain their established allowlists. Strict cloud/RLS fixtures and immutable review-key backup round trips verify compatibility.

## 17. Privacy/publication boundaries

No network API, analytics event or public projection was added for drafts, review references, questions or fingerprints. Existing coarse action events remain. Public campaign routing is preserved through native link navigation and remains allowlisted by the existing product layer. Private source/revision/reason data stays in local/session storage. Publication still uses its independent allowlist and explicit preview. No account/session/auth/RLS behavior was expanded.

## 18. Mobile/keyboard/accessibility

Actual review controls are native buttons, labelled checkboxes/date inputs, a fieldset/legend and status text. Restore returns focus to the thesis field; section links open existing disclosures. Scoped CSS reuses canonical Visual V3 surfaces and controls. Automated checks cover desktop and 360/390/430, both themes, no horizontal overflow, keyboard checkbox toggles and deliberate keep. Screenshots are in `docs/qa/roadmap-wave2/`; both light and dark review screenshots were inspected. Global accessibility/CSP and route contrast checks remain part of the gate. Automated checks are not a screen-reader user study.

## 19. Files changed

New `research-continuity.js`, `research-continuity-ui.js`, `tests/continuity.test.cjs`, `scripts/wave2_browser.py`, this report, the owner procedure and Wave 2 QA artifacts. Integration edits: `research.html`, `min-ntm.html`, `research.js`, `research-review.js`, `research-v3.js`, `research-v3.css`, `min-review.js`, `change-detection.js`, `thesis-storage.js`, `local-data.js`. Existing test harnesses: lifecycle, local-data, Research workflow and browser smoke. Financial formula owners, data files, publication/cloud schema and account code are unchanged. Historical QA screenshots overwritten by existing test scripts are restored rather than included as unrelated changes.

## 20. Tests added/changed

Twelve new continuity tests cover lifecycle overlaps/inactive/reopening, stable/legacy acknowledgement, blocked comparisons, exact target failure cases, malformed drafts/concurrent writes, scoped snooze, immutable decisions and backup round trips, draft exclusion/deletion, filing amendments/deduplication, quota/deletion rollback and capacity. Nine new real-browser tests cover all four decisions, draft restore/discard, stale/concurrent targets, manual pause/reactivation, expired/corrupt work, reopened pending drafts, unavailable fetch/corrupt journal, exact reload/deletion, and six mobile/theme combinations.

Existing minimal DOM harness now supports the new page module. One fixture explicitly reopens an intentionally changed baseline before editing, matching the new stale-editor guard. Existing reminder assertions use per-assumption/question wording and explicitly discard the unsaved draft they previously lost on navigation. No failure was hidden by removing an acceptance scenario.

## 21. Complete validation results

All required local gates passed. Reproducible evidence: [validation summary](../qa/roadmap-wave2/validation-summary.json), [release log](../qa/roadmap-wave2/release.log), [existing browser log](../qa/roadmap-wave2/smoke.log), [Wave 2 browser log](../qa/roadmap-wave2/browser.log), and the other named logs/artifacts in that directory.

| Gate | Final result |
| --- | --- |
| Python release suite | 166 passed |
| JavaScript suite | 241 passed, zero skipped, including 12 new continuity tests |
| Existing browser/product suite | 38 passed; Research/history/change/outcome/backup/Min NTM/publication regression included |
| Wave 2 actual return/failure suite | 9 passed; all four decisions, unchanged keep, drafts, stale/deleted/concurrent targets, manual reopen and pause/reactivation |
| Wave 1 connected experience | 7 passed |
| Accessibility/CSP/performance-route audit | 39 routes passed |
| Site-wide Visual V3 audit | 246 route/theme checks passed; no overflow, canonical canvas and primary contrast at least 4.5:1 |
| Wave 2 mobile/keyboard | 360/390/430, light/dark, native keyboard controls and complete keep journey passed |
| Cloud and social RLS | Actual local PostgreSQL/PGlite suites passed; isolation, ownership, conflicts, projection, deletion and stale-token boundaries |
| Account/session browser | SDK restart/reload/refresh/logout/deletion/offline fixtures passed |
| Publication/social browser | Explicit preview/cancel, request allowlist, no silent upload, unpublish/privacy and mobile passed |
| SEO/staging/security/rules | 85 canonical sitemap URLs; no stale generated files, missing staged local references, CSP/security or rule-registry issues |
| Workflow | actionlint 1.7.7 passed |
| Diff hygiene | `git diff --check` passed |

Existing partial macro-update and unpublished 2027 schedule notices remain; no new validation warning was suppressed. Initial regressions were fixed: the reminder test now makes an explicit draft choice, and native review navigation preserves the pre-existing public campaign context. The complete 38-test browser suite was rerun successfully after those fixes.

Commands below use fresh contexts, local PostgreSQL/PGlite and staged/mock account endpoints; they do not establish current hosted deployment behavior.

```powershell
$env:NODE_BINARY='C:\Users\Mirne\AppData\Local\Programs\Python\Python314\Lib\site-packages\playwright\driver\node.exe'
$env:PGLITE_MODULE="$env:TEMP/ntm-pglite-zddk8hjw/package/dist/index.js"
$env:NTM_BROWSER_CHANNEL='msedge'
python -B scripts/validate_release.py
python -B scripts/browser_smoke.py
python -B scripts/wave2_browser.py
$env:NTM_WAVE1_QA='docs/qa/roadmap-wave2/wave1'
python -B scripts/wave1_browser.py
python -B scripts/quality_browser.py --output docs/qa/roadmap-wave2/quality.json
& $env:NODE_BINARY scripts/test_cloud_rls.cjs
& $env:NODE_BINARY scripts/test_social_rls.cjs
python -B scripts/test_auth_browser.py
python -B scripts/test_social_browser.py
$env:NTM_V3_QA_DIR='docs/qa/roadmap-wave2'
python -B scripts/visual_v3_route_audit.py
python -B scripts/check_workflows.py
git -c core.safecrlf=false diff --check
```

Use the installed PGlite module's absolute `dist/index.js` path if the temporary installation location changes. There must be no skipped PostgreSQL compatibility tests. Browser harnesses own disposable localhost servers. Existing partial macro-source and unpublished-2027-schedule notices remain explicit; this wave does not claim to repair or refresh their upstream data.

## 22. Human owner/pilot evidence

[Exact launch, rehearsal and five-person procedure](roadmap-3-wave2-owner-test.md). Pending: five consenting participants, at least four unassisted journeys without data loss/wrong version, and a second relevant return check. No participation, retention or comprehension percentage is claimed from automated tests. Owner methodology/content approval and actual observed usability remain human responsibilities.

## 23. Deviations from Roadmap 3.0

No scope expansion into Wave 3 or parked systems. Engineering completion is separated from human pilot acceptance exactly as the owner requested. Companion exclusion from backup/sync, 14-day draft restoration, 24-hour exact targets, capacity limits and explicit per-reason pauses are bounded implementation decisions where the brief required a policy. The existing journal and hosted schema did not need migration. Restoring financial draft inputs conservatively as historical/manual is deliberate provenance behavior, not a formula change.

## 24. Remaining limitations

Browser local/session storage can be blocked, cleared or lost; downloaded draft copies are not importable backups. Companion data does not travel to another device. LocalStorage offers optimistic verification rather than an atomic cross-tab database transaction. Human pilot/assistive-technology evidence is pending. A supported-company fetch failure blocks its current-data review instead of offering a new offline mode. The existing bounded filing list and 100-fingerprint acknowledgement history remain finite. Historical QA and mocked/staged account evidence are not a live production certification.

## 25. Engineering release readiness

**Yes: the engineering portion is release-ready against the local repository and the complete automated gate.** The actual return journey and historical/private boundaries passed. No commit, push or deployment has been performed. Completing engineering does not mark the roadmap's human acceptance gate complete and does not authorize Wave 3.
