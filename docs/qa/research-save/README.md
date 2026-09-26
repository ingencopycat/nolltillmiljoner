# Research save investigation — 26 September 2026

## Finding

The reproduced production defect is off-screen save feedback, especially validation failure. At 390 × 844, clicking the empty form left the button in view while the required-thesis error appeared at **y = −791 px**. No revision was created, as required, but the viewport gave no explanation. The main successful-save message likewise appeared above the viewport and was automatically hidden after three seconds. Draft/conflict guards could return before that banner was updated at all.

A valid production save **succeeded**: one immutable revision was stored and recovered on reload, with no JavaScript errors and no network writes. The existing smaller “Sparad just nu” indicator was visible in that successful case. This is not evidence of a production database/RLS failure. The owner's exact original form/session state is unavailable, so the reproduction establishes the feedback defect, not a claim that every reported click had the same validation cause.

Production Research JS, storage, continuity, and Visual V3 code matched local sources after newline normalization. The production HTML differed only in its configured Supabase CSP origin. Public-source hashes are recorded in `production-source-manifest.json`; reproduction results and original screenshots are retained alongside this report.

## End-to-end contract

`thesisForm` submit → `saveThesis` → continuity/draft/concurrency gate → required thesis, calculated/stale valuation and lifecycle validation → snapshot normalization → `NTMThesisStorage.save` → checked localStorage write → append-only revision or fingerprint no-op → local state/history/preview → `Sedan din analys` recomputation.

**Auth/session → persistence request → database/RLS is not the Research button's transaction.** Research has always saved locally, including while signed out. Optional private account sync is explicitly initiated on Konto. Its separate path validates the SDK session, queues private revision records, calls `ntm_put_records`, and applies PostgreSQL ownership/RLS and immutable/idempotent record semantics before acknowledging the account copy. Login and local save must not silently upload private text. No auth, database, RLS, sync, schema or baseline semantics were changed.

## Fix

- Moved the existing live status banner immediately below the save actions. It remains visible until editing or another status replaces it; there is no three-second timeout or browser alert. Off-screen messages scroll the nearest amount into view.
- Successful save says **“Analysen sparad.”**, whether the new revision includes valuation, that earlier revisions remain, and **“Sparat på den här enheten · [timestamp]”**. **“Visa sparad version”** opens the existing versions disclosure. Existing metadata continues to distinguish optional account sync from local persistence.
- No-op saves say **“Analysen är redan sparad. Inga ändringar att spara; ingen ny version skapades.”** The canonical fingerprint still prevents duplicate revisions. A transaction guard and temporary button busy/disabled state prevent reentrant submission.
- Continuity blockers now also appear at the save action, with their specific draft/conflict resolution. Local storage and validation errors remain actionable. Unexpected exceptions retain form text; a failure after a confirmed write truthfully says the analysis was saved but the view could not fully update.
- The UI clears stale success feedback when the user edits. No private text is logged, sent to external services, or copied to the new status output.

## Baseline and history verification

Real browser clicks verified first save, rapid repeats, reload, leaving Research for Min NTM and returning, and a meaningful second revision with the first revision unchanged. The latest revision's `savedAt` is the comparison baseline. Controlled-clock saves also verified that later reviewed evidence appears after its publication date, and that a later save advances the baseline and clears those changes. Existing deterministic since-analysis tests retain pre-baseline/late-ingestion exclusion and comparability boundaries. No baseline code changed.

## Validation

- Production-origin reproduction: isolated disposable browser, synthetic local text, network writes intercepted; valid save/reload passed, no JS errors, zero attempted network writes. No hosted user records were written.
- Save browser matrix: 1440/360/390/430 px, dark/light, actual button clicks and viewport checks; required/stale validation, pending draft, quota failure, unexpected pre/post-commit errors, no-op/double click, reload/reopen, history link, revision immutability, publication timing, later baseline, and offline save.
- Real Supabase SDK on an isolated configured stage: saves while signed in, after browser-session restoration, after token renewal, and signed out after an expired offline session; no silent uploads. Existing expiry rejection, cross-tab logout and stale-session tests retained.
- Account browser suite: network/database 503 and RLS-style 403/42501 rejection preserve local revisions and show actionable sync failure; retry remains separate from local save.
- Actual local PostgreSQL/PGlite suites: private-record A/B/anonymous isolation, ownership, idempotency, transactional conflicts, denied UPDATE/DELETE and stale-token writes; social/public-research RLS tests also passed. No hosted RLS mutation or credential use.
- Full release: **311 Python tests** (one optional skip), **428 JS tests** (426 passed, two skips), zero failures; source, SEO, security, staging/CSP and whitespace gates passed. The optional PostgreSQL suites were run separately and passed.
- Final focused Research + since-analysis tests: **83/83 passed**. Full browser smoke: **43/43 passed**. Accessibility/CSP suite passed. Logs and screenshot artifacts are in this directory.

## Readiness

Locally release-ready. Real authenticated production writes were not attempted; signed-in/session and backend-failure states were tested against controlled providers and actual local PostgreSQL. Production valid local persistence was verified directly. No commit, push or deployment was performed.
