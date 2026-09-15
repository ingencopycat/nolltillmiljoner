# Supabase activation — 2026-09-15

**Current hosted evidence and readiness:** [live verification](live-verification.md).
The checkpoints below retain the earlier setup history; their pending/blocked
statuses are superseded by that report.

## Outcome

### Latest live verification update

The owner reports both repository migrations completed successfully and supplied
two dedicated test inboxes. The hosted table and all three RPCs now reject anonymous
requests with HTTP 401 / PostgreSQL 42501 (permission denied). Both test-account OTP
requests returned HTTP 200. The owner confirmed both emails contain links only.
Inbox A's link was clicked by the owner before the test browser could verify a code.
Both Confirm signup and Magic Link templates need `{{ .Token }}` content from
`email-otp-template.html` before fresh code requests. No resend has been attempted.
Authenticated A/B isolation, browser upload/restore and deletion remain pending.
No private records were uploaded or deleted. The earlier missing-schema result
below describes the pre-migration check, not the current endpoint state.

Repository preparation and public connection checks are complete; **full hosted
activation remains blocked**. The owner reports an existing Free project with these Auth
settings: Site URL `https://nolltillmiljoner.se`; redirects
`https://nolltillmiljoner.se/**`, `http://127.0.0.1:8765/**`, and
`http://localhost:8765/**`. Those Dashboard settings have not been independently
verified. The owner subsequently supplied the public URL and publishable key, now
saved in ignored `.env.local`. Hosted Auth settings returned HTTP 200 with email
enabled and email auto-confirmation disabled. A zero-row anonymous table probe
returned HTTP 404 / PGRST205: the table is absent from the exposed schema/cache;
this is not evidence of RLS enforcement. No connected browser/Dashboard session
was available. Dashboard access and two dedicated test inboxes remain outstanding.
No hosted migrations, test emails, uploads or account deletions were performed.
No commit, push or deployment.

## 1–5. Connection, configuration, schema, RLS and Auth

1. **Live connection:** public Auth connection verified via HTTP and a fresh browser.
   Ignored `.env.local` configures the staged preview. Source `cloud-config.js`
   remains disabled. Database and authenticated operations remain unverified.
2. **Configuration:** `scripts/configure_cloud.cjs` reads only the two named public
   variables and writes the existing config shape (`enabled`, URL, publishable key)
   into a separately staged site. It regenerates CSP with that exact origin only on
   pages loading the cloud adapter. It rejects secret/legacy JWT keys, non-Supabase
   origins and the source directory. There are no new external scripts or SDKs.
   `.env.local` is ignored; `.env.example` has public placeholders only.
3. **Migrations:** neither migration was applied remotely. Both ran in disposable
   PostgreSQL via PGlite. The original `202609140001_cloud_foundation.sql` is retained.
   New `202609150001_complete_parent_identity.sql` fixes a SQL NULL loophole: partial
   parent keys could otherwise evade composite foreign keys and CHECK constraints.
   It adds a complete-or-absent parent constraint without changing grants or RLS.
   Existing invalid rows make this correction fail; inspect them privately rather
   than deleting them or weakening the constraint. No migration reset is needed.
4. **RLS:** local PostgreSQL passed A/B/anonymous isolation, cross-owner insert
   denial, immutable owner/cross-owner UPDATE/DELETE denial, parent FK checks,
   partial-null parent denial, idempotency, atomic conflict rollback, account cascade
   and stale-identity write denial. **Hosted RLS is untested.** The only application
   private relation is `public.ntm_private_records`; `auth.users` belongs to Supabase
   Auth. `supabase/verify_cloud_foundation.sql` provides read-only catalog evidence
   for tables, constraints, uniqueness, indices, forced RLS, policies and RPC grants.
5. **Auth/OTP:** existing email-code flow retained. Access token stays in memory;
   refresh tokens are discarded; reload/expiry requires another login. No password
   auth was added. UI explains reload behavior. Real delivery, expired/invalid codes,
   hosted logout and session gateway behavior remain untested. The app does not
   implement magic-link callbacks, persistent refresh or redirect token parsing.
   Configure an OTP template containing `{{ .Token }}`; allowed redirects alone do
   not activate magic links. See [Supabase passwordless email documentation](https://supabase.com/docs/guides/auth/auth-email-passwordless).

## 6–10. Local mode, migration, queue, conflicts and another device

6. **Local-only:** anonymous Academy, Research, theses, calculators, Min NTM and
   JSON backup remain available. Existing browser and domain tests exercise them.
7. **Local → cloud:** fixture tests verify explicit upload, category preview,
   unchanged stable IDs, acknowledgement before synced status, repeat idempotency
   and retention of local source data. Login alone never captures/uploads records.
   No personal browser profile or local user dataset was accessed. Hosted result pending.
8. **Queue:** existing account-scoped localStorage queue retained; pending writes,
   reload/re-auth recovery, transient failure, bounded retry, duplicate retry,
   lost/bad acknowledgements and concurrent queue changes are covered by Node
   contracts. Three attempts maximum; retry is explicit with backoff, not automatic.
   Exhausted operations stay visible. Hosted queue result pending.
9. **Conflicts:** same ID/content is a no-op; different immutable content fails
   explicitly and rolls back the batch. Local tests and browser conflict UI pass.
   Row updates and selective deletes are intentionally denied even to the owner.
   Account deletion is the permitted deletion operation. Hosted result pending.
10. **Fresh device:** fresh browser fixture restores the same account's Research
    history and Min NTM, with explicit merge and no duplicate IDs. Local conflicts
    stop restore. Fixed a status mismatch: local-only Academy/behavioral defaults
    are now excluded on both sides of the confirmed-restore comparison, so a fresh
    restore correctly displays Synkat. Login alone does not download/merge. Hosted result pending.

## 11–12. Exact data boundary

| Cloud-supported kind | Content |
| --- | --- |
| metadata | Supported backup envelope metadata |
| journal | Research/manual journal container metadata |
| revision | Saved thesis history, assumptions, review decisions, report questions, manual identity, frozen valuation snapshot |
| outcome | Saved outcome checkpoints and their archived source revision |
| calculator | Saved calculator group identity, including empty groups |
| scenario | Saved calculator scenarios and frozen savings plans |
| observation | Saved plan follow-up observations |
| preference | Explicitly uploaded theme snapshots |

Academy events, attempts, learning progress/answers; behavioral decision pauses,
assumption groups and template choices; unsaved drafts; recent tools; public stock,
macro, article and catalog datasets remain outside cloud sync. Academy and behavioral
history are included in the existing local JSON backup. Min NTM is a view of these
stores, not a separate cloud table. Session tokens, queue internals and arbitrary
browser storage are not synced. The UI now explicitly lists Academy among exclusions.

## 13–15. Export/deletion, privacy and Free limits

13. **Export/deletion:** fixture tests cover portable backup, raw account-record
    export, explicit account deletion and local retention by default. Opting into
    local deletion separately clears local-data.js stores, including Academy and
    behavioral history; the label now names those categories. Other accounts' queues,
    recent tools and other devices remain separate. Live deletion/export pending.
14. **Privacy:** adapter/UI/sync contain no console logging or analytics calls.
    Provider failure bodies are neither displayed nor logged by the client. Exported
    private data and local queues remain sensitive and unencrypted at this layer.
    Existing analytics allowlists and synthetic sentinel checks pass locally.
    Supabase Auth/API/database logs, SMTP provider logging, retention and region
    were not inspected. No guarantee about managed-provider logging is made.
15. **Free limits, checked 2026-09-15:** 500 MB database, 50,000 MAU, 5 GB egress,
    another 5 GB cached egress, 1 GB file storage, two active Free projects and
    inactivity pausing after one week. Cached/file-storage allowances do not expand
    the private Postgres allowance. Free does not include automatic backups/PITR or
    an uptime SLA. [Supabase pricing](https://supabase.com/pricing).

Default SMTP is restricted to project-team addresses, currently two messages/hour,
with no delivery SLA; do not grant test users admin membership to bypass this. An
owner-controlled SMTP arrangement is required for broader sign-ins, with its own
allowance reviewed. No service was purchased or configured.
[Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

If the project pauses or quota prevents requests, account requests/sync fail, sources
stay local, and the bounded queue remains available for explicit retry. Restore the
project in Dashboard when needed. Monitor database growth, uncached egress, MAU,
email allowance/errors, pauses and failed syncs; review capacity at 70% usage as an
NTM operating threshold. A need for higher quotas, backup/SLA guarantees or avoiding
pauses triggers an owner cost review, never an automatic upgrade. Preserve local
exports; there is no hosted disaster-recovery guarantee.
[Supabase pausing documentation](https://supabase.com/docs/guides/platform/free-project-pausing).

## Local development runbook

Use Node 22+ and Python. Copy `.env.example` to ignored `.env.local` and fill only
the public project URL and publishable key. Do not place admin credentials anywhere
in the public source or config. Serve only the staged directory, so `.env.local` and
internal tooling cannot be served by the local HTTP server.

```powershell
$ntmStage = Join-Path $env:TEMP 'ntm-hosted-preview'
python -B scripts/stage_site.py $ntmStage
node --env-file=.env.local scripts/configure_cloud.cjs --site $ntmStage
node scripts/check_cloud_security.cjs --site $ntmStage
python -m http.server 8765 --bind 127.0.0.1 --directory $ntmStage
```

`stage_site.py` empties its destination: use only the dedicated disposable directory
above. Open `http://127.0.0.1:8765/min-ntm.html` in a fresh, non-persistent browser
context for synthetic tests. Restaging restores disabled config, so configure again
after each restage. Existing Windows tooling can be selected with `NODE_BINARY`
(the Playwright driver Node) and `NTM_BROWSER_CHANNEL=msedge`.

## Hosted owner steps before deployment

1. Supply the `.env.local` path, an already authenticated Dashboard session and two
   dedicated disposable inboxes. No admin credential needs to be shared.
2. Verify the target project/Free plan/region. Check migration history before applying
   anything. Apply unapplied repository migrations in filename order via Dashboard
   SQL editor or the existing owner-controlled migration runner. Do not rerun the
   CREATE TABLE migration on an existing schema or reset the live database.
3. Run `supabase/verify_cloud_foundation.sql`. Expect enabled/forced RLS; owner-scoped
   read/insert policies only; no anon table access; authenticated select/insert only;
   all constraints validated, including `ntm_private_parent_complete`; composite PK
   and owner receive/parent indices; anon RPC execute false; authenticated execute
   true; only account delete security-definer and owned by the database owner.
   Inspect any additional application private tables separately before claiming
   that every private table is protected.
4. Verify OTP template and email delivery. Run the prepared integration check:

   ```powershell
   node --env-file=.env.local scripts/test_cloud_hosted.cjs --dedicated-test-accounts
   ```

   It prompts for two test emails and OTPs, refuses pre-existing cloud records,
   writes synthetic journals, tests the one private table's A/B/anonymous access,
   idempotency/conflict and raw export, then **deletes both dedicated accounts**.
   Sessions stay in memory. Failure output excludes provider bodies; failed runs
   may leave test accounts/rows for owner cleanup. This runner has only been syntax
   checked; no successful hosted execution is claimed. It does not replace browser
   queue/restore tests, catalog inspection or provider logging review.
5. Complete all fourteen requested hosted browser flows in fresh contexts with
   synthetic Research/scenario data. Verify invalid/expired OTP and document that
   redirect-based magic links are unsupported in this foundation. Verify mobile
   light/dark, download contents, local retention after cloud deletion, repeated
   migration, delayed/lost acknowledgement, offline retry, conflict and fresh restore.
6. Inspect provider logs with synthetic sentinels and settle mail/retention/backup
   operations. Re-run repository validation before any publication.

## Production configuration

The Pages build has an opt-in generation step after staging. After hosted validation,
set repository Actions **variables** `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and
`NTM_CLOUD_ENABLED=true` for the intended project. The last variable is an explicit
activation switch; unset/false keeps accounts disabled. URL/key are public by design.
The build writes only the staged runtime config and corresponding CSP, then scans
the public artifact. No variables were set remotely and no workflow was triggered.
Staging deployments must use their intended project settings and repeat live QA;
do not reuse a production user's browser storage for tests.

## 16–20. Changes, validation and readiness

Changed files:

- `.env.example`, `.gitignore`: public placeholders and ignored generated site.
- `scripts/cloud_config.cjs`, `scripts/security_policy.cjs`, `scripts/configure_cloud.cjs`:
  shared config validation and isolated public config/CSP generation.
- `.github/workflows/deploy.yml`: opt-in public configuration and artifact security check.
- `scripts/check_cloud_security.cjs`, `scripts/validate_release.py`, `tests/cloud-config.test.cjs`:
  credential-pattern scan, staged CSP verification and config safety regression tests.
- `supabase/migrations/202609150001_complete_parent_identity.sql`,
  `supabase/verify_cloud_foundation.sql`, `scripts/test_cloud_rls.cjs`:
  parent-integrity correction, catalog verification and executed regression cases.
- `scripts/test_cloud_hosted.cjs`: prepared dedicated-account hosted check.
- `cloud-ui.js`, `min-ntm.html`: Swedish queue states, data exclusions, account benefit,
  reload limitation and complete local-deletion copy.
- `cloud-sync.js`, `tests/cloud-sync.test.cjs`, `scripts/browser_smoke.py`: confirmed
  fresh-restore status corrected and regression-tested without syncing local-only data.
- `docs/internal/accounts/README.md`, this report: activation instructions and evidence.

Final validation:

| Check | Result |
| --- | --- |
| Full Python suite | 163 passed, including optional PGlite SQL execution; no skips |
| Full JavaScript suite | 208 passed; no failures/skips; includes Research, Academy, backup, queue, conflicts and config |
| Full browser smoke | 37 passed using installed Edge/Chromium 153 in fresh contexts |
| Final cloud browser regression after restore-status fix | Passed; explicit Synkat assertion and mobile light/dark screenshots |
| Quality browser | 32 pages passed CSP/accessibility, desktop/mobile and light/dark checks |
| Local PostgreSQL | Both migrations executed; A/B/anon isolation, parent-null rejection, atomic conflicts and deletion passed |
| Hosted runner | Syntax checked only; not executed against Supabase |
| Hosted public connection | Auth settings HTTP 200; fresh browser fetch passed CSP; email enabled |
| Anonymous table probe | HTTP 404 / PGRST205 with limit=0; missing exposed relation/cache, not an RLS pass |
| Enabled staged browser | Fresh Edge context at 127.0.0.1:8765; optional login visible; local status; mobile dark/light passed; zero CSP violations/cloud writes |
| SEO | 85 canonical sitemap URLs; seven existing articles; zero outdated files |
| Staging/local references | Passed; private config/tooling absent from public artifact |
| Credential-pattern/public-config/staged-CSP checks | Passed |
| Workflow validation | actionlint 1.7.7 passed |
| Whitespace | git diff --check passed |

Existing calendar diagnostics remain explicit: upstream macro data is partially
updated and full 2027 authoritative schedules are not yet available (review date
2026-11-01). These were notices/warnings, not test failures. Node was absent from
PATH, so checks used the installed Playwright-driver Node via NODE_BINARY. The
initial default browser launch failed because managed Chromium was missing; the
complete rerun used installed Edge successfully. No browser installation was needed.

Local logs are in `%TEMP%/ntm-activation-validation-final.log`,
`ntm-activation-browser.log`, `ntm-activation-cloud-final.log`,
`ntm-activation-quality.log` and `ntm-activation-quality.json`.

The secret scan covers
nonignored current working-tree files and the generated public artifact, not all
git history or provider settings. It is a bounded pattern scan, not proof that no
possible credential exists. No secret/service-role credential was supplied or added.

| Environment | Readiness |
| --- | --- |
| Local product/development | Local mode validated; public hosted Auth connection and enabled preview verified; schema and authenticated flows pending |
| Staging/test deployment | Suitable for an isolated owner testing session after project setup; not yet live-validated or deployed |
| Production accounts/cloud | **Not ready**: live migration/RLS/Auth/queue/restore/deletion/logging evidence outstanding |

No commits, pushes, deployments, paid features or purchases were performed.
