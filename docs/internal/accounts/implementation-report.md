# Accounts & Cloud Foundation — implementation report

2026-09-14. B30/B31/B42/B43 repository foundation implemented; live connection
disabled and not claimed complete. No commit, push, deployment, purchase, live
account creation or email delivery. Existing uncommitted Growth pack work preserved.

1. **Provider/architecture:** optional Supabase Auth/PostgreSQL behind a small REST
   adapter. This fits static Pages and the relational ownership/history model without
   framework migration. Existing business logic remains provider-independent.
2. **B30:** email OTP interface and minimal Min NTM account disclosure; auth identity
   owns typed metadata/journal/revision/outcome/calculator/scenario/observation/theme
   records. Existing IDs, frozen snapshots, manual journals and savings plans are
   preserved. No public data, drafts or recent-tool state is uploaded. Configuration
   is disabled; login controls remain unavailable until owner setup.
3. **B31:** same stable key/content is idempotent; conflicting content stops the batch.
   SQL transactions and per-owner advisory locks protect import. Local restore uses
   the existing validator, merge and guarded commit/rollback. New revisions append;
   none are overwritten by last-write-wins. Preference snapshots can use latest
   server-receipt order on a fresh device; an existing local theme wins on restore.
4. **Offline queue:** owner-scoped localStorage queue survives reload; bounded three
   attempts with 2/4/8-second eligibility backoff, explicit retry, visible failures
   and acknowledgment states. No background scheduler or automatic login upload.
   New local edits invalidate “Synkat.” Account/epoch checks and queue comparisons
   reject stale responses and cross-account writes. Queue contains private records
   but no authentication secrets; full/blocked storage preserves source domain data.
5. **B42:** forced RLS, explicit authenticated owner SELECT/INSERT, composite ownership
   and parent FKs, no UPDATE/DELETE grant, no anonymous table/RPC access. Only own
   account deletion uses a restricted SECURITY DEFINER function with no owner argument.
   Actual PostgreSQL tests passed for A/B/anonymous, cross-owner reads/inserts/updates/
   deletes, immutable conflict rollback, parent ownership, cascade and post-deletion
   writes. Hosted JWT/email behavior is still unverified.
6. **B43:** unchanged local JSON backup/import, portable cloud backup, additional raw
   app-record/account-profile export, explicit non-destructive restore, intentional
   account deletion and session cleanup. Default deletion preserves local copies;
   an unchecked option clears local backed-up categories too. Recent tools, other
   account queues and other devices are explicitly outside that local deletion option.
   Cleanup failures are distinguished from confirmed server deletion. Synthetic
   restore was tested; no hosted disaster-recovery promise is made.
7. **Local → cloud:** first login identifies local category counts and the signed-in
   email. Upload requires a deliberate confirmation; “Behåll endast lokalt just nu”
   remains available. Local backup is linked. Stable IDs survive and source copies
   remain after confirmation. Login itself makes no private-record request.
8. **New device:** login, request a preview, explicitly merge the reviewed server
   snapshot, then consume restored data through existing Research/Min NTM stores.
   Other users' data stays invisible; local conflicts fail before mutation. Legacy
   revisions, manual data, snapshots, outcome archives, plans/observations and empty
   scenario groups round-trip. A portable export can seed a fresh account with a new
   owner and the same domain IDs.
9. **Privacy/logging:** no cloud analytics events or console logging; provider error
   bodies are not displayed/logged. Auth tokens are memory-only; email/code are not
   stored in the queue. Calls omit cookies/referrer and time out. The setup guide
   requires live processor/region/retention/log review and synthetic sentinel checks
   before activation; this code cannot guarantee managed infrastructure logging.
10. **Cost boundaries:** Free is sufficient for local testing/development scope.
    Verified provider references and capacity gates are in the README. Built-in
    email is restricted to project team addresses/two messages per hour, so a real
    user pilot needs an owner-verified free/existing SMTP allowance or a later funded
    decision. No paid plan or automatic upgrade; current ceiling remains 0 SEK/month.
11. **Owner setup:** create/select a private Free development project, apply migration,
    verify RLS in that project, configure OTP template and delivery, choose region,
    review processor/log/retention settings and public privacy copy, set public
    publishable config, regenerate exact-origin CSP, run synthetic live tests and
    decide separately whether to publish. No credentials were requested or fabricated.
12. **Files changed in this task:** new `cloud-config.js`, `cloud-sync.js`,
    `cloud-adapter.js`, `cloud-ui.js`, `scripts/cloud_config.cjs`,
    `scripts/test_cloud_rls.cjs`, `tests/cloud-sync.test.cjs`,
    `tests/test_cloud_foundation.py`,
    `supabase/migrations/202609140001_cloud_foundation.sql`, and this directory's
    `README.md`, `cloud-config.example.js`, `implementation-report.md`.
    Updated `.gitignore`, root `README.md`, `local-data.js`, `min-ntm.html`,
    `premium.css` (four narrowly scoped account rules), `scripts/browser_smoke.py`,
    `scripts/security_policy.cjs`, `scripts/stage_site.py` and the existing
    `docs/internal/growth/data-licenses.json` (disabled future Supabase processor).
    Earlier Growth/reminder files remain in the working tree and were not reverted.
13. **Tests added/updated:** ten executable cloud/sync Node contracts, five Python
    cloud/config/staging checks (including optional real SQL execution), a standalone
    PostgreSQL RLS runner and a browser account scenario using the real adapter with
    deterministic HTTP responses. Coverage includes legacy IDs, immutable records,
    observations, anonymous use, explicit migration, reload/backoff, fake receipts,
    account switching, late acknowledgments, quota/corrupt queues, conflicts, restore,
    export, default/local-opt-in deletion and no secret/token persistence. Existing
    backup/Research/revision tests remain intact and pass.
14. **Browser flows executed:** anonymous save; OTP UI; local data detected; stay local;
    explicit upload; confirmed status; second context/new device; other-account empty
    restore; same-account usable restore; conflicting-ID status without local writes;
    logout/relogin; default account deletion preserving local data; portable download;
    mobile 390px; both light/dark themes. Mock data uses reserved `.invalid` email
    addresses, with no actual emails/accounts. New mobile screenshots were inspected
    after theme transitions settled; no horizontal overflow. Local-opt-in deletion
    is also covered in Node tests.
15. **Validation results:** full release runner passed **149 Python tests and 129
    Node tests**, including real PGlite SQL execution (no skipped SQL test in this
    run). Full browser suite passed **28 tests** on Chrome 152; the cloud browser
    flow was rerun after account guards/theme checks and passed. All **12** existing
    accessibility/CSP page checks passed. Actionlint 1.7.7 passed. SEO remains
    **28 canonical URLs**, zero stale artifacts. Staging/local references, public
    configuration/secret patterns, backend/test exclusion, documentation references
    and whitespace checks passed. Existing macro warnings remain: partial upstream
    update and unpublished future 2027 schedules. No source data was fabricated.
16. **Remaining risks/limits:** hosted auth/JWT/SMTP and log policies need real checks;
    no persistent session across reload; explicit sync/restore only; three retries
    then manual recovery; no delta/pagination/automatic deletion propagation;
    concurrently created histories may need an explicit latest-version choice;
    browser storage/queue capacity is finite; local copies can contain another
    account's earlier data on shared devices. Local deletion is not cloud deletion,
    and later restore can reintroduce cloud history. No selective cloud delete or
    tombstone protocol is claimed. Provider backups/retention and a real restore
    drill must be established before production durability claims.
17. **Completion:** B30, B31, B42 and B43 are **complete as repository foundations**.
    Their **live production connection is not complete and remains disabled**.
    The outstanding steps are explicit owner/external-state tasks, not hidden
    credentials or pretend integrations. Payments, generic AI, paid data, mandatory
    cloud, BankID, brokers and framework migration were not introduced.

See [the setup and architecture guide](README.md) for operating details and official
provider references. PGlite 0.5.8 was integrity-checked and used from a temporary
tools directory, not installed into the public site. Test logs/performance data and
synthetic screenshots reside in OS temporary storage, not the deployed artifact.
