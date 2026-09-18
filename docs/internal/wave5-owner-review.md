# Wave 5 owner application and review

Prepared 2026-09-18. **Hosted application, hosted authorization checks, rights/retention decisions and human editorial approval are pending.** No migration has been applied remotely; nothing has been committed, pushed or deployed by this task.

## Application order

1. Review `wave5-public-research-report.md`, the migration, and the read-only verification SQL. Name an operational owner for takedowns, source-rights complaints, corrections and retention. Confirm the narrowly scoped `sec-public-facts/1` public-display policy before enabling publication. This policy identifier is an engineering rule, not a legal license determination.
2. Export/back up the hosted database using the existing owner procedure. Record migration history, application revision and the previous working frontend. Rehearse this sequence in an isolated hosted test project first, with disposable accounts A and B and a legacy V1 publication.
3. Verify these existing migrations have already been applied in this exact order; do not blindly rerun them:
   - `202609140001_cloud_foundation.sql`
   - `202609150001_complete_parent_identity.sql`
   - `202609160001_public_profiles.sql`
   - `202609160002_username_availability.sql`
   - `202609170001_local_research_publication.sql`
4. Apply **only** `supabase/migrations/202609190001_public_research_v2.sql` once, through the established Supabase migration procedure. It is transactional. Stop on error; do not manually continue individual statements. The `_v1` rename is intentional and makes reapplication inappropriate.
5. Run `supabase/verify_public_research_v2.sql` with an administrative SQL session. It starts a read-only transaction and returns catalogs/aggregate counts, not private report text. Save the results privately. RLS/force must be true for all listed tables; direct anon/authenticated privileges must be false. Only `ntm_social_read` allows anon execution; only the two public RPC wrappers allow authenticated execution. All four invariant counts must be zero; both version indexes and the immutable trigger must exist. Investigate any difference before continuing.
6. Publish the reviewed frontend through the existing gated release workflow only after schema verification. The workflow now runs the V2 PostgreSQL test through the release suite and the Wave 5 browser suite explicitly. This document does not authorize the agent to deploy. Apply schema before the frontend: the previous frontend continues serving V1, but cannot replace a report after it has been explicitly upgraded to V2. Rolling back only the frontend preserves data but removes V2 management/rendering; do not treat that as a complete rollback. Restore the tested release or use a separately reviewed forward repair. Never drop the new tables to roll back after V2 writes.
7. Perform the hosted tests below with two disposable accounts and a genuinely signed-out/incognito context. Do not use a service key in the browser. Catalog checks and local PGlite tests do not replace real Supabase JWT/PostgREST/RLS verification.
8. Record test date, environment, exact code revision/migration IDs, browser/version, screenshots, observed network actions and reviewer sign-off. Keep any account identifiers, tokens or private exports out of public QA artifacts. Production readiness remains blocked until required hosted checks and owner decisions pass.

## Reproducible author → reader → author test

1. **Private basis:** Account A creates an active public profile. Open `research.html?ticker=CRWD`. Write a thesis of at least 30 characters, multiple assumptions/risks/falsification items, and a distinctive private note. Save a revision. A supported annual dataset is useful here because NVDA's 52/53-week comparability may legitimately withhold a growth statement. Cloud-syncing this revision is not a prerequisite.
2. **Selection:** Open publication. Confirm all optional fields, financial statements and chart start unchecked. Check revenue growth, operating margin when eligible, and the annual revenue chart. Select one public risk and write a short public follow-up plan. Confirm private notes, questions, review queue, portfolio and unsaved edits are absent. Change a form value, preview, go back, and check that the choice is retained. Cancel once: no report should appear.
3. **Preview → publish:** Preview again. Check the author, company/ticker, analysis date, saved-basis date, anticipated public version, selected prose, exact chart/table/source data and section diff. Confirm. Record stable report ID and version-specific URL from the public page. Network writes should use `ntm_social_write` with `publishV2`, selected snapshot and opaque source reference; they must not upload private records.
4. **Anonymous inspection:** Open the stable URL in incognito. No login is needed. Confirm the report loads through `ntm_social_read('analysis')` without a private/account read. Check labels distinguishing company data, NTM calculations, author assumptions and author judgments. Recalculate at least one percentage from its full values and formula. Check date ranges, USD units, SEC accession/source date, definitions and method IDs. Expand chart table; missing observations must say missing, not zero. Compare with preview; only assigned publication time/version identifiers are new metadata.
5. **Profile/discovery:** Open A's public profile and Upptäck Research. Find one current report entry with company, case excerpt, author, date and V2 version/section metadata. A legacy V1 entry must remain readable. Ordering must remain publication recency; there is no popularity ranking.
6. **Reader B:** Read the report while signed in as B; content must match anonymous content. Open “Börja din egen privata Research.” Confirm the same ticker opens with the source-version attribution banner. B can save their own interpretation. A's prose/assumptions must not be copied automatically, A's private revision must never be requested, and A's publication must not change. The banner/link is route attribution, not a persistent imported thesis object.
7. **Private edit:** In A's Research, edit and save a new private thesis. Refresh the anonymous public page: content and version must be unchanged. Delete an unrelated/local source revision if appropriate in the disposable test; public content remains independently frozen. A should still be able to unpublish without the source revision.
8. **Republish:** Choose the newer revision or “Ändra urval / publicera ny version.” Remove the previously public risk, select a different assumption and optionally enter an explicit correction. Preview must show additions, changes and removals, including the prior values. Cancel once and confirm no change. Then confirm: the stable report ID stays the same, version ID changes and version number increments. The old pinned URL becomes unavailable; the stable URL shows only the new version.
9. **Concurrent/stale preview:** Open two previews against the same current version. Publish one, then try the other. The second must fail as stale rather than overwrite. Also change A's public display name or alter/remove the selected saved revision after preview: confirmation must require a fresh preview. A double click/network retry of the same accepted request must not create duplicate versions.
10. **Report/moderation:** As B, use “Rapportera denna version,” choose Annat, and submit a source issue. Admin inspection must show the precise report identity/version/number and content fingerprint. A second report against that profile within 24 hours must hit the inherited rate limit. Republish must not retarget the original complaint. Test a moderator-hidden version and suspended profile; public access and replacement must remain denied. Establish who handles complaints and response times before launch.
11. **Unpublish:** A cancels unpublish once, then confirms. Check stable URL, pinned URL, profile and discovery anonymously and as B: the report must be absent/unavailable everywhere. Private Research stays present. No public archive is introduced. Explicit republishing after withdrawal reuses the stable report identity and creates a later version; no hidden version becomes public automatically.
12. **Account deletion:** With disposable A only, delete the account using the existing account UI. Confirm private cloud records, profile, report heads and all publication snapshots disappear under the existing cascades. Stale credentials cannot publish or mutate anything. Existing moderation detail is retained under the previous policy, while deleted profile/version FKs become null; the new minimal public report identity, version number and fingerprint remain. No recovery promise applies to screenshots, third-party archives or caches.

## Stress and editorial review

Repeat the reader and preview checks at **360, 390, 430 and desktop widths**, light/dark, keyboard-only and browser zoom. Use these cases:

| Case | Expected behavior |
| --- | --- |
| Minimal manual company, thesis only | Company/case/author/dates; no empty financial, chart, source or follow-up blocks |
| Long report | Near-limit thesis, long company/display name, many source lines and multiple risks remain readable and wrap |
| Financial only / chart only | Each works independently, with accessible exact data and provenance |
| Missing chart year | Explicit gap in bars and table; no fabricated zero or interpolated value |
| Restricted/unknown provider or insufficient old snapshot | Financial selection unavailable; authored prose can still be published |
| Legacy V1 | Existing rendering/URL works; upgrade happens only after explicit new preview and publication |
| Hidden/superseded/deleted | No public content through any route; no silent fallback to a different pinned version |

For each, answer: Does it feel worth sharing? Can an investor distinguish source facts, calculations and author opinion? Can the calculation be reconstructed? Does provenance help without dominating? Can the author predict republishing? Is anything unexpectedly private visible? Is the mobile layout comfortable? Save comments and approval from the owner/editor; automated screenshots are not independent human evidence.

## Local reproduction

Use the repository's documented Python/Playwright and Node setup. Install the existing pinned isolated PGlite test dependency and set `PGLITE_MODULE` to its `dist/index.js`; set `NODE_BINARY` if Node is not on PATH. No Supabase secrets are needed for local checks.

```text
python -B scripts/validate_release.py
node scripts/test_report_v2.cjs
node scripts/test_social_rls.cjs
node scripts/test_cloud_rls.cjs
python -B scripts/wave5_browser.py
python -B scripts/test_social_browser.py
python -B scripts/test_auth_browser.py
python -B scripts/browser_smoke.py
python -B scripts/wave1_browser.py
python -B scripts/wave2_browser.py
python -B scripts/wave3_browser.py
python -B scripts/wave4_browser.py
python -B scripts/quality_browser.py --output docs/qa/wave5/performance.json
python -B scripts/check_workflows.py
git diff --check
```
