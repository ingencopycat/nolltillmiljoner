# B30/B31/B42/B43 — Accounts & cloud foundation

For the current activation attempt, configuration commands, corrective migration,
and evidence gaps, see [the activation report and runbook](activation-report.md).
Its generated-site setup supersedes the manual config-copy instructions below.

Prepared 2026-09-14. Live connection **disabled**. No project, hosted account,
email delivery, paid plan or production database was created. Prior Growth &
Business pack changes are preserved. This is an optional infrastructure boundary,
not a replacement for local Research/Min NTM.

The [17-point implementation report](implementation-report.md) lists files, executed
flows, validation results and the distinction between repository and live completion.

## Decision and architecture

Supabase Auth + PostgreSQL is the chosen hosted adapter because owner-scoped
relational records, transactional idempotency and explicit RLS fit the existing
immutable-history model. The site remains plain HTML/JS on Pages. A custom auth/API
server would add credential/session/operations work; a framework migration has no
product justification. A document-oriented backend would not simplify the current
relational ownership and parent checks. No provider abstraction leaks into Research,
scenario calculations, snapshots or Connected Experience.

Local domain stores ↔ `local-data.js` validation/guarded merge ↔ `cloud-sync.js`
queue/serialization ↔ `cloud-adapter.js` REST boundary ↔ Supabase. Min NTM's small
native disclosure hosts `cloud-ui.js`. Default disabled config hides login controls
and explains that local data/backup still work. No mock is loaded in production.

## B30 — Account/data model

Email OTP is V1: request code, verify code, then explicitly choose upload or remain
local. Supabase's email template must show the OTP, because its default template
uses a magic link. No token-bearing callback URL is used. Google is a future optional
provider; BankID, brokers, payments and AI are out of scope.

Access tokens live only in adapter memory. Refresh tokens are not retained. Reload
or token expiry requires signing in again; the owner-scoped offline queue survives.
This is a deliberate small foundation, not a polished persistent-session product.
The app shows the verified email in memory, clears code/email inputs after login,
and never places them in analytics. Losing network or auth does not prevent local
editing, export or calculations. Sync is only available on Min NTM in V1; navigate
back and explicitly sync newly saved changes.

`auth.users` owns account identity. `ntm_private_records` stores one logical object
per row, with relational owner FK, `(owner_id,kind,scope,id)` primary key, immutable
record envelope, server receive sequence/date, owner-scoped parent FKs and indices.
It is a typed record relation, not a single user-backup blob. This keeps existing
JSON shapes intact while enforcing ownership/parent links relationally.

| Kind | Identity / contents | Relationship |
| --- | --- | --- |
| metadata | `ntm/envelopes`; version and preserved extra envelope metadata | Account |
| journal | `theses/<existing ticker or manual journal key>`; container metadata | Account; no broker/company-account coupling |
| revision | journal scope + existing revision ID; exact saved revision | Same-owner journal FK |
| outcome | ticker scope + existing checkpoint ID | Account; retains its frozen source-revision archive even if the journal was deleted |
| calculator | `scenarios/<calculator ID>` | Account; preserves empty saved-scenario groups |
| scenario | calculator scope + existing scenario ID, including frozen savings plan | Same-owner calculator FK |
| observation | JSON `[calculator,scenarioID]` scope + existing observation ID | Same-owner scenario FK |
| preference | theme scope + new stable preference-event UUID | Account; explicit uploaded theme snapshot |

Revision payload retains review decisions, assumption/falsification details, report
questions, manual identity, timestamps and minimum already-frozen financial snapshot.
Scenarios and savings plans stay in the same logical offline envelope. Observations
are separated in transit and restored to their original plan. Metadata preserves
unknown supported backup extensions; differing same-ID metadata conflicts rather
than being discarded. Existing IDs, including deterministic legacy revision IDs,
are preserved. No local migration/write happens merely by exporting or logging in.

The transport envelope has `kind`, `scope`, `id`, `createdAt`, `sourceVersion` and
`payload`; owner comes exclusively from authenticated server identity. Missing
legacy dates stay null. Server receive time is separate from historical creation.
Preference UUID/time represents when a scalar theme is first explicitly queued,
not a fabricated historical theme-change date. Public stock JSON, macro data,
articles, recent tools and unsaved drafts are excluded. Historical snapshot numbers
already needed for reproducibility remain; whole public datasets are not copied.

## B31 — Sync, conflict and queue

Login performs no capture/upload/import. Explicit “Synka till mitt konto” lists
categories, recommends/links backup and asks for a final confirmation. It snapshots
only validated saved records into `ntm-sync-queue-v1:<owner UUID>`. Sources stay local.
The queue contains private data but **no auth/session/config secrets**. It is not
encrypted and must be treated like the existing private local stores.

Each operation has a stable record, pending/ack/error/conflict status, attempt count
and next eligible attempt. A request increments/persists its attempt before sending.
Backoff is 2/4/8 seconds; at most three attempts, with no timer/service worker or
background retry. Reopening/re-authenticating lets the user explicitly retry an
already authorized queue. “Synka” snapshots new saved changes; “Försök med väntande
kö” processes only existing eligible operations. Exhausted operations remain visible.
No automatic reset/discard button circumvents the bound. Owner-assisted recovery
uses private local/account exports and inspection before any queue reset.

Server batch import is transactional and serialized per owner. Same key + same
JSONB record is a no-op; same key + different content raises a bounded conflict
code and rolls back the whole batch. UPDATE/row DELETE are unavailable, including
for the owner. Response must identify the current owner and acknowledge every
submitted key before marking ack. Lost responses retry idempotently. “Synkat” means
that the currently captured local data matches a confirmed submission/restore; new
local edits revert to “Sparat lokalt.” No claim of continuous cloud backup.

Queue writes compare the stored value read earlier and fail on concurrent-tab
changes rather than overwrite a newer queue. localStorage is not transactional
across tabs; explicit sync in one tab at a time is the pilot rule. Server idempotency
still protects duplicate in-flight calls. Logout invalidates in-flight acknowledgments.
Queued operations are permanently account-scoped: signing into B does not send A's
queue. Shared local domain stores remain device-scoped; the displayed account and
explicit category confirmation are essential before uploading to another account.

Independent new IDs are appended, never edited. Restore previews one server snapshot
then revalidates current local stores at commit using the existing rollback/guard
implementation. Local version order remains; new remote revisions append in server
receive order and may become latest, explicitly stated in confirmation. Concurrent
branches are retained; V1 does not claim automatic semantic reconciliation or a
globally identical “latest” choice on every device. Review and save a deliberate new
revision when needed. Same-ID content conflicts stop merge completely; export both
valid copies and inspect privately. Never rename an old ID to hide a conflict.

Local deletion is intentionally **not** propagated: no tombstone protocol is
claimed. Old cloud rows remain until explicit account deletion, and later restore
can reintroduce locally deleted history. This is disclosed in the UI. Queued saved
copies likewise remain inspectable until account cleanup. Selective cloud deletion
requires a separate reviewed tombstone design before enabling automatic bidirectional
sync. No cloud restore/upload runs just because a user opened a page or logged in.

## B42 — Security boundaries

[Migration](../../../supabase/migrations/202609140001_cloud_foundation.sql): RLS is
enabled and forced; authenticated SELECT/INSERT require non-null `auth.uid()` equal
to owner. Parent FKs include owner, preventing attachment across accounts. Anonymous
roles have no table/RPC privileges. No UPDATE/DELETE grant or policy exists. Import
and export RPCs use invoker security and an empty search path. Account deletion is
the only SECURITY DEFINER RPC, accepts **no user ID argument**, uses `auth.uid()` and
cascades through the account FK. Only authenticated callers can execute it. Its
owner must remain the project database owner; do not grant client SQL/admin access.

Account deletion may leave already-issued JWTs cryptographically valid until expiry.
Rows are gone, and the deleted owner FK rejects subsequent inserts. The adapter
clears session memory even when logout fails. Live gateway revocation/expiry behavior
still needs verification; RLS tests alone do not test Supabase's JWT/email gateway.
No service-role key, database password or admin token is sent to the browser.

`cloud-config.js` contains only disabled/public settings. Runtime and SEO build reject
non-Supabase origins and non-`sb_publishable_` keys. The build adds only the exact
configured origin to Min NTM CSP when enabled; no wildcard connect permission.
Authentication/record calls have no referrer, omit cookies, have a 15-second timeout,
and surface bounded errors rather than provider response bodies. The normal Pages
artifact excludes migrations/tests/internal docs/private environment files.

## B43 — Export, restore and deletion

Existing local JSON import/export is unchanged. Portable cloud export is the same
NTM backup format and can be imported into an empty browser, then explicitly uploaded
to a fresh account with existing object IDs and a new authenticated owner. An additional
account-record export preserves all private typed records, preference-event history,
owner UUID and minimal auth profile (email/creation date). It excludes credentials,
provider security internals and infrastructure logs. Use portable JSON for local
restore; raw account-record JSON is a forensic/export format, not the local importer.

An empty device signs in, requests cloud merge, previews counts, explicitly accepts
and receives usable existing NTM records. Corrupt/unsupported records, duplicate IDs,
invalid snapshots and conflicting current data fail before local commit. Partial local
write failure uses existing rollback; a failed rollback is not claimed successful.
No account disaster-recovery SLA is promised; tests cover synthetic app data restore,
not recovery of the hosted provider after an outage.

Account delete requires a confirmation and an unchecked-by-default option to delete
local synced categories too. Server confirmation precedes local account-queue cleanup
and session clearing. Default preserves local domain data; selecting local deletion
clears analyses, outcomes, scenarios/plans/observations and theme through a guarded
local commit. Recent tools and other accounts' queues are outside that option, as
disclosed. Other devices' local copies/backups cannot be remotely erased. Cleanup
failure is reported separately from confirmed cloud deletion. Export beforehand;
there is no undelete button or assumption of provider-managed recovery.

## Privacy, retention and logging

Until enabled, no new processor receives user data. After explicit activation and
consent, Supabase would hold authentication email/identity and the listed private
records in the owner-selected region (choose and verify an EU region if appropriate;
none is currently selected). Purpose: durability and device continuity. No portfolio
recommendations, tracking identity, public content personalization or generic AI.

Application code does not log thesis text, assumptions, amounts, prices, notes,
tokens or HTTP response bodies; no cloud events are added to NTM analytics.
Use only bounded operation/error counts in later operational telemetry. Before a
real pilot, inspect provider API/database/auth logs with synthetic sentinel data,
disable request-body/SQL-parameter logging and review error capture. Prefer no SQL
statement logging for private endpoints and verify parameter truncation settings
(`log_parameter_max_length`, `log_parameter_max_length_on_error`) with the owner.
Managed platform logs are outside this repository's control; no blanket “never
logged anywhere” promise is made. Keep email/auth metadata separate from product
analytics. Restrict staff/database access and review processor terms and retention.

Private records persist until explicit account deletion in V1; there is no silent
inactivity purge. Owner must define a communicated retention policy before a live
pilot, including infrastructure logs/backups, deletion requests and any legal duties.
Provider backups/logs may have different retention from live tables; verify this
rather than promising instant deletion from every system. Local backups/queues are
user-managed private copies. This is engineering/privacy preparation, not legal advice.

## Free-tier and cost boundaries

Checked 2026-09-14 against [Supabase pricing](https://supabase.com/pricing): Free
lists 500 MB database/project, 5 GB egress, 50,000 monthly active users, and pausing
after one inactive week. Automatic backups/PITR and uptime SLA are not included.
Pro lists a starting $25/month, with resource/other charges to review separately.
These limits are not guarantees and must be rechecked before activation.

The [built-in email service](https://supabase.com/docs/guides/auth/auth-smtp) is
limited to project team addresses and currently two messages/hour, without a delivery
SLA. It does **not** support an unrestricted real-user pilot. Development can use
deterministic tests or local Supabase mail capture. Real pilot email requires an
owner-verified existing/free SMTP allowance or an explicitly justified later expense;
no SMTP service is selected, purchased or enabled here. Do not add users as project
administrators merely to bypass the team-address restriction.

Proposed owner review thresholds (not vendor rules): 70% of free DB/egress capacity,
email allowance exhaustion, repeated pauses or a justified backup/SLA requirement.
Pause recruitment and preserve local use/export if quota/service is unavailable;
sync errors stay queued, and the UI cannot promise a server backup. No auto-upgrade.
Current authorized ceiling is **0 SEK/month**. A later ~$25/month starting plan is
only a cost-review trigger, not a purchase recommendation; include SMTP, exchange
rates/tax, storage growth and support in B57. Use actual pilot payload sizes and
return frequency rather than inferring capacity from the 50k auth-user allowance.

V1 uses one atomic export and one batch per explicit upload (SQL import cap 10,000
records/20 MB, client decode cap 100,000 records). It is intentionally a small pilot
design; pagination/cursors, queue compaction, backup-size UI and delta-sync are future
work. Above limits or browser quota, preserve sources, report failure, export locally
and stop growth until a reviewed capacity design exists. No paid infrastructure is
needed to run tests.

## Owner setup — not executed

1. Run local tests below. Review schema, conflict/deletion behavior, privacy copy
   and region/processor terms. Keep `enabled: false` until each live check passes.
2. For a private development project, create/select Supabase **Free** yourself; do
   not enable billing. Apply the migration once through the CLI/migration runner
   or SQL editor as the database owner. Never paste credentials into source, chat,
   issue logs or browser config. Verify RLS/grants in the real project after migration.
3. Enable email OTP and set the template to display `{{ .Token }}`. Set the exact
   production/staging URLs as appropriate and restrict signup during testing. Test
   email delivery/expiry/rate limiting using synthetic accounts. Google is deferred.
4. Review mail delivery limitations above. Review logs, consent, privacy disclosures,
   retention, export and deletion in the selected region before onboarding real users.
5. Copy the shape of [the example config](cloud-config.example.js) into root
   `cloud-config.js`; replace with the project URL and **public publishable** key.
   Private keys/passwords belong only in owner tooling. Set enabled true only in
   the intended pilot checkout, then run `node scripts/build_seo.cjs` to generate
   its exact-origin CSP. Staging/production configuration must not cross projects.
6. Re-run full checks and the twelve browser flows against two synthetic users and
   an anonymous browser on that project. Verify network failure, JWT expiry, account
   cascade/deleted-session writes, SMTP abuse controls and log redaction. The supplied
   mocks cannot establish real delivery or gateway settings. Verify download/restore
   before describing cloud as a durable backup. Publication is a separate owner action.

For local Supabase database development, install its CLI/Docker using official
[local-development instructions](https://supabase.com/docs/guides/local-development),
run `supabase init` if config is absent, `supabase start`, then `supabase db reset`
only against that disposable local stack. No reset against a live project. Migrations
are already in `supabase/migrations`. The browser adapter deliberately accepts only
HTTPS hosted origins; local browser QA uses the deterministic HTTP fixture, not a
production CSP exception for localhost Supabase. No Docker is required for Node/
Python/browser tests or the optional PGlite PostgreSQL test.

## Validation commands

`python -B scripts/validate_release.py` runs Python + all Node contracts, SEO,
calendar/rules, temporary staging, local references and diff whitespace.
`python -B scripts/browser_smoke.py` includes the two-device cloud fixture flow.
`python -B scripts/quality_browser.py --output <private-temp-path>` runs CSP/accessibility.
`python -B scripts/check_workflows.py` validates CI workflows.

For actual local SQL policy execution, install `@electric-sql/pglite` into a temporary
tools directory, set `PGLITE_MODULE` to its `dist/index.js`, then run
`node scripts/test_cloud_rls.cjs`. With that variable the Python suite also executes
SQL tests; otherwise it explicitly skips only that optional engine test. No remote
credentials are needed. This session used PGlite 0.5.8 from npm, integrity checked,
outside the repository; it is not a production dependency. The SQL test creates a
minimal Auth claims fixture, then runs the real migration/grants/RLS/FKs/transactions
in PostgreSQL. It does not pretend the fixture is Supabase Auth's JWT verifier.

Windows in this workspace uses the already installed Playwright-bundled Node via
`NODE_BINARY`, and installed Chrome via `NTM_BROWSER_CHANNEL=chrome`.

## Remaining boundaries

Repository foundation is implemented for B30/B31/B42/B43; **live production connection
is not complete or enabled**. Remaining work: project/region/configuration, real OTP
delivery/abuse testing, managed logs/retention/processor review, production JWT checks,
operational backup/restore drill and owner release decision. Persistent sessions,
automatic deletion sync/tombstones, selective cloud deletion, merge branch UI,
pagination/deltas and richer retry recovery are deliberately not claimed. Existing
local workflows continue regardless. No commits, pushes, payment, AI, paid data,
broker connections or framework migration are part of this task.
