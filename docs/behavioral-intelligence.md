# Behavioral Intelligence: B70, B71, B74, B75

Implemented as local, private V1 features. No new AI, paid APIs, account requirement, recommendations, user scoring, background notifications or public publishing. Existing immutable Research revisions and financial calculations are unchanged.

## Product behavior

**B70 — voluntary decision pause.** Min NTM offers a collapsed form for company/manual name, optional ticker/manual thesis key, intended action/context, short reason and optional revisit date. Creation time is generated locally. Users can record pending, still relevant, changed mind or abstained, with an optional reflection and next date. Each review appends an event; the original action and all prior reviews remain visible. Only pending pauses with a user-selected date on/before the local calendar day appear under Att granska. Undated pauses remain accessible without inventing a deadline. Nothing blocks a transaction or suggests that waiting is better. Reminders refresh on page open, focus and visibility; no notification service exists.

**B71 — shared assumptions.** Users create and rename custom groups, explicitly link assumptions from latest saved theses, detach links, and remove groups from the active view. Links reference a ticker/manual thesis key, immutable revision ID and assumption position. Existing links stay pinned to that exact text when a later revision changes it; the UI labels historical links. Counts deduplicate theses, include valid historical links, and exclude missing/deleted source revisions. Missing links are shown so users can detach them. Groups can share assumptions; none are assigned automatically. Group deletion is a tombstone: the private backup retains group history, while Research text remains unchanged. Group names describe user-defined intellectual dependencies, not portfolio risk. Links navigate to existing Research history; users select historical versions there.

**B74 — retrospective.** Derived on demand, never stored as another copy of private history. The view separates:

- Process: saved versions after the first, unique reviews, version transitions with changed assumption text, registered assumption/criterion reviews, user-recorded did-not-hold assessments, question-answer registrations, and theses with at least two reviews.
- Decisions: keep, revise, close, abstain and reopen. Reopen is a revise following an inactive decision and is explicitly also included in revise.
- Outcomes: counts of explicitly saved observations and observed theses, without prices, returns, success rates or quality judgments.

Review identity uses saved review timestamp + source revision ID + decision, so inherited review fields on later revisions are not counted twice. Consecutive identical assumption wording in the same position provides an oldest unchanged-text list, with saved dates and number of versions. This is not a claim about unchanged conviction; reorderings break continuity. Open questions come from latest saved versions only. Archived questions removed from the latest version are not counted as currently unresolved.

Group-related revision counts use current manual group membership and the linked theses' full remaining history. They cannot establish that a theme caused a revision or reconstruct past group membership at the time of each investment decision. The UI states this explicitly. Fewer than two unique reviews shows an honest insufficient-history message while still showing raw available counts. Corrupt/partial thesis or outcome storage blocks retrospective calculation. Deleted history is not inferred or reconstructed.

**B75 — method sharing.** Users select blank thesis, assumption, falsification, pre-report question and checklist sections. Preview is mandatory before downloadable Markdown/JSON. Both exact formats can be inspected; the readonly Markdown area is copyable. Exports are constructed exclusively from a fixed version-1 prompt allowlist, not by redacting user text. They cannot include thesis text, notes, company names, amounts, prices, personal identifiers, outcomes or private revision IDs. No sanitized personal example, arbitrary custom text or hosting is implemented. Optional saved template selections are private, backed up, and can be previewed again. Changing selections invalidates the previous preview. Version-1 prompts should not be silently redefined; introduce a new method schema if their meaning changes.

## Architecture and integrity

`behavioral.js` supplies a pure validation/derivation layer plus explicit local writes. `behavioral-ui.js` renders the Min NTM workflow with textContent and labelled native controls. Research links to this local tool. Existing Research storage is read-only from these modules.

Local key: `ntm-behavioral-v1`. Envelope: `{version:1, events:[]}`. Events have globally unique UUID IDs, entity IDs, previous-event IDs, timestamps, typed kinds and strictly allowlisted payloads. Entity types are pause, group, link and template. Each entity has one create event followed by a single causal chain; group removal/link detachment are terminal tombstones. Validation rejects unknown fields, malformed dates, broken chains, branches, duplicate IDs and orphaned group references. Maximum 5,000 events and bounded text fields prevent unbounded local records.

Mutation reads and validates the current store, checks that the raw value is unchanged immediately before writing, verifies the write and attempts restoration on failure. This is an optimistic localStorage guard, not a cross-tab database transaction. Conflicting independent histories cannot be silently merged: backups reject divergent branches. Reads never migrate or repair corrupt storage automatically.

## Backup and cloud compatibility

Portable local backups now use NTM backup schemaVersion 2 with a behavioral section. Version-1 backups are still accepted with an empty incoming behavioral section; merging them preserves existing behavioral records. Re-importing an identical backup does not duplicate events. Same-ID differing contents or divergent entity histories reject the entire import before writes. Existing multi-key rollback and pre-write guards remain in place. Older site versions cannot restore the new section; retain an up-to-date site and private backup.

Full ticker deletion also removes pause entities with that exact ticker and their complete history, and matching assumption-link entities. It retains global groups, template choices, unrelated records, and free-standing pauses without a ticker. This scope is described in the UI. Global local clear includes behavioral records. Group removal itself preserves history; it is not a privacy erasure action.

The current cloud adapter remains unchanged. New behavioral records are **local only**: the sync capture deliberately excludes them, including from queue signatures. Existing sync uploads/restores continue to work, and importing a cloud restore preserves local behavioral records. Min NTM explicitly explains this limitation; local JSON backup is the portability path. No new cloud table, provider cost or RLS migration is required. The cloud's own portable export does not contain local-only behavioral records.

Future cloud support can map stable event/entity IDs to private owner-scoped records. It must enforce owner isolation, causal-chain/conflict handling and explicit migration consent. Retrospectives should continue to be derived. Method selections remain private unless the user explicitly exports/shares them.

## Privacy and future AI

The modules emit no analytics events at all. Existing backup events remain coarse; no behavioral text, group names, company/ticker associations, decisions, notes or prices are added to them. No new network calls occur. Private DOM text never becomes HTML. Downloads happen only from explicit user actions.

A future suggestion system could inspect structured group links, explicit assumptions or the factual retrospective, but there is no AI connection now. Suggestions must stay separate and require explicit user acceptance before any event is appended; an AI summary must not become a stored historical fact automatically. Cloud activation and AI activation are separate consent boundaries.

## Verification and limitations

Ten new JavaScript tests cover pause histories/due states, explicit group linking and tombstones, retrospective oracles, inherited review deduplication, criteria/question counts, method privacy, legacy/new backups, conflicts, corrupt/blocked storage, deletion scopes, cloud payload/signature exclusion and absence of analytics/network/AI calls. Existing local-data/lifecycle/cloud harnesses now load the new domain dependency.

One integrated browser flow covers an empty retrospective, seeded synthetic manual thesis history, decision pause and reminder, changed-mind resolution, two-thesis grouping, method previews and downloads, explicit saved template selections, unchanged Research history, UI backup export/clear/import roundtrip, keyboard activation, desktop/mobile and both themes. Existing Research, Connected Experience, cloud, backup, security and accessibility suites are retained.

No claim about impulsiveness, investment quality, causality or winning is made. Current limitations are local-only behavioral sync, current-version question reporting, wording/position-based continuity, no arbitrary user-authored share templates, no hosting, no background reminders and the localStorage concurrency boundary described above. These do not require paid APIs or a live account.

## Final implementation report — 2026-09-14

1. B70: completed voluntary create/revisit/changed-mind/abstain flow with immutable event history, manual companies, optional user dates and Min NTM due reminders.
2. B71: completed custom group create/rename, explicit two-or-more-thesis linking, safe detach, tombstone deletion, historical-link labels and distinct-thesis counts.
3. B74: completed factual process/decision/observed-outcome separation, review deduplication, reopen counts, unchanged-wording list, latest unresolved questions and honest insufficient-history state.
4. B75: completed allowlisted blank-method selection, exact Markdown and JSON previews, copyable text, explicit downloads and private saved selections. No private source data is copied into method exports.
5. Min NTM: four collapsed workflows under Beslutsminne & metod; due pauses appear beside the existing review queue. Research history links to the local workflow.
6. Backup/cloud: local backup V2 includes all behavioral events; V1 import remains supported. Merge rejects conflicting histories before writes. Existing cloud behavior remains compatible and explicitly excludes the new local-only records, even from queue signatures.
7. Privacy: no new analytics, external calls or automatic publishing. Native labelled controls and textContent rendering preserve private text boundaries. Existing financial and thesis histories remain unchanged.
8. Future AI: stable typed IDs, explicit links and derived factual outputs support a future suggestion layer, but there is no AI integration. Any future suggestion requires explicit user acceptance and a separate privacy review before external transmission.
9. Files changed for this pack: `behavioral.js`, `behavioral-ui.js`, `local-data.js`, `cloud-sync.js`, `min-ntm.html`, `research.html`, `script.js`, `style.css`, `scripts/stage_site.py`, `scripts/browser_smoke.py`, `tests/behavioral.test.cjs`, `tests/local-data.test.cjs`, `tests/lifecycle.test.cjs`, `tests/cloud-sync.test.cjs`, `docs/behavioral-intelligence.md`, `README.md`. Earlier uncommitted AI-foundation changes were preserved.
10. Tests: ten new domain/integration JavaScript tests, one integrated real-browser flow, and three existing test harnesses updated for the new backup dependency.
11. Browser flows: create pause, due reminder, changed-mind resolution and retained history; explicit group with two synthetic manual theses; empty and populated retrospective; keyboard-driven method preview; exact JSON privacy preview; Markdown/JSON downloads; saved method selection; unchanged Research data; UI backup export/clear/import equality; 320/375/1440 widths; light/dark; enforcing CSP. Mobile method preview was visually inspected.
12. Validation: 149 Python tests passed; 162 JavaScript tests passed; all 30 browser tests passed on installed Edge Chromium 153.0.4234.32. The 12-page accessibility/CSP matrix passed. Research, backup, Connected Experience, cloud compatibility and privacy tests are included in those suites. SEO artifacts, calendar/rule checks, isolated staging/local references and git diff --check passed. Targeted behavioral/browser tests passed again after final preview/layout refinements. Existing macro-source notices remain: partial upstream data and not-yet-published 2027 schedules; no new failure was introduced.
13. Limitations: new behavioral records use local JSON portability, not current cloud sync; no notifications or hosted sharing; group counts include labelled valid historical links; current groups do not prove historical causation; unresolved questions refer to latest versions; unchanged-text continuity uses position; removed history cannot be recovered; localStorage uses optimistic guards. Group deletion retains private history. The empty template library is intentionally fixed rather than accepting arbitrary private example text.
14. B70/B71/B74/B75 are complete for the requested local V1 product scope. No commit or push was performed.
