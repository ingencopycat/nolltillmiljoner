# Production-readiness review

## Verdict

**Ready for release review within the Accounts & Cloud verification scope;
not deployed or enabled in production.** Hosted OTP, isolation, sync, restore, conflict, export and account
deletion evidence is in [live-verification.md](live-verification.md). The owner
confirms both live account deletion tests complete. This review found no connected
browser or Dashboard session. The owner subsequently supplied the hosted audit
JSON: its schema sections pass comparison with the repository migrations. The
owner has now completed the guided provider configuration and log-sample checks
recorded below. No unresolved technical blocker was found in those checks.
Public privacy and deletion wording has been corrected locally for the confirmed
configuration and must accompany any future cloud activation. Provider retention
periods are published statements, not independently observed deletion guarantees.

No commit, push, deployment, paid feature, provider configuration change, additional
test email or private-data upload was performed during this review.

## Schema catalog evidence

**PASS — hosted output supplied by the owner and reviewed.** All eight schema
sections were compared to the same audit run against both repository migrations
in local PostgreSQL: table inventory/RLS/owner, columns, constraints, indices,
policies, table privileges, sequence privileges and functions. Definitions match
after whitespace normalization. The local engine lists NOT NULL separately in
`pg_constraint`; the supplied output does not. Every column's NOT NULL flag was
independently matched, so this catalog representation difference is not a missing
constraint. Results: one public table, ten columns, ten CHECK/FK/PK/UNIQUE
constraints (all validated), four valid indices, two policies and three matching
RPCs. RLS is enabled and forced; postgres owns the table and all RPCs. Grants and
the single SECURITY DEFINER operation match the intended architecture.

The schema catalog blocker is closed for the scope of this audit. No migration or
permission changes are needed. The following query instructions remain as the
repeatable evidence-collection procedure.

Run the entire [production_readiness_audit.sql](../../../supabase/production_readiness_audit.sql)
in Supabase SQL Editor as the project owner. It returns one JSON cell, containing:

- Public table inventory, owner, enabled/forced RLS.
- Column types/nullability and identity sequence.
- Constraint definitions and validation flags, including stable-ID uniqueness,
  same-owner parent FK, Auth deletion cascade and complete-parent check.
- Index definitions, validity and uniqueness.
- Policy definitions and effective anon/authenticated table/sequence privileges.
- The three RPC definitions, ownership, invoker/definer mode, search path and
  effective execution permissions.
- Allowlisted PostgreSQL logging settings and database/role overrides.

The query is one read-only SELECT. It does not select private table contents, auth
identities, SMTP configuration or credentials. It was successfully executed against
both repository migrations in disposable local PostgreSQL/PGlite. **Hosted output
has now been reviewed.** The older multi-result `verify_cloud_foundation.sql` remains
available; this query makes copying all results from SQL Editor easier.

Expected schema: `ntm_private_records` has enabled and forced RLS, validated
constraints and valid indices. Anon has no table/RPC privileges; authenticated has
SELECT/INSERT but not UPDATE/DELETE/TRUNCATE. Authenticated sequence USAGE is allowed,
sequence UPDATE is not. Owner equality guards both policies. Only account deletion
is SECURITY DEFINER; its owner must be the database owner and its body must derive
the target exclusively from `auth.uid()`. Both other functions are invoker; all
search paths are empty. Review unexpected tables, policies, overloads or functions
against the migration source rather than accepting the names alone.

## Provider documentation findings

### Supplied PostgreSQL logging settings

| Setting | Supplied value | Assessment |
| --- | --- | --- |
| log_statement | ddl | Logs DDL, not blanket SELECT/INSERT/UPDATE/DELETE logging |
| log_min_duration_statement / log_min_duration_sample | -1 / -1 | Duration-based statement logging disabled |
| log_transaction_sample_rate | 0 | Transaction sampling disabled |
| log_statement_sample_rate | 1 | Does not activate duration sampling while its threshold is -1 |
| log_parameter_max_length | -1 | Unlimited bind values if non-error statement logging is triggered; does not itself enable logging |
| log_parameter_max_length_on_error | 0 | Dedicated error bind-parameter logging disabled |
| log_min_error_statement | error | Statements causing errors can still be logged |
| log_error_verbosity | default | Error DETAIL/CONTEXT are not suppressed; inspect failed-row/error paths |
| pgaudit.log / pgaudit.log_parameter | none / off | pgAudit classes and parameter logging disabled in supplied session |
| pgaudit.log_statement | on | Does not by itself activate pgAudit classes |

Only the supplied supabase_admin, supabase_auth_admin and supabase_storage_admin
overrides set log_statement=none. No authenticator/anon/authenticated logging
override appears in this result. These SQL Editor/session and role settings are
useful evidence, but do not prove every runtime connection or provider logger's
behavior. In particular, disabling error bind-parameter logging does not suppress
all statement literals, error messages or failing-row DETAIL. There is no evidence
here that a private payload actually leaked; the required next step is inspection
of the synthetic test logs, not a blanket logging shutdown.
[PostgreSQL logging semantics](https://www.postgresql.org/docs/16/runtime-config-logging.html).

### Supabase

Free users can access one day of logs; the window depends on plan. This dashboard
window is not proof of deletion from every underlying system.
[Supabase log-access windows](https://supabase.com/docs/guides/troubleshooting/check-usage-for-monthly-active-users-mau-MwZaBs).

Auth events are recorded in external log storage, with optional additional storage
in `auth.audit_log_entries`. The setting is Authentication → Audit Logs → Write
audit logs to the database. Events can include user ID, IP and user-agent metadata.
Do not assume application account deletion removes separate audit records.
[Auth audit logs](https://supabase.com/docs/guides/auth/audit-logs).

Statement, duration and parameter logging can expose private input. The audit
collects the settings and overrides needed to review these paths; an SQL Editor
session's values alone do not prove the effective PostgREST role/session behavior.
[Postgres configuration](https://supabase.com/docs/guides/database/custom-postgres-config).

Postgres statement/error details can appear in `event_message`; checking only
`parsed.query` or `parsed.detail` can miss them. Inspect success and rejected-write
events from the live synthetic test window before asserting no private payloads
were captured. [Log filtering](https://supabase.com/docs/guides/observability/advanced-log-filtering).

### Resend

Resend states that email/log data is retained for 30 days on Free, Pro and Scale;
backups persist seven days. It describes remaining customer-data deletion within
90 days after termination of the Resend service. Deleting an NTM end-user account
does not terminate the NTM Resend account or delete that user's sent mail history.
Resend stores customer data in the US; selecting an EU sending region does not
move stored data to the EU. [Resend data/retention statement](https://resend.com/security/gdpr).

Turning off message-content storage requires a paid add-on and eligibility; it
is not a Free setting we can enable. No purchase is proposed. OTP message contents
and delivery metadata must be treated as provider-retained information under the
normal configuration. [Message storage](https://resend.com/docs/knowledge-base/how-do-i-ensure-sensitive-data-isnt-stored-on-resend).

Open/click tracking is configurable at the sending-domain level. NTM does not need
engagement tracking for OTP delivery; verify both are off for this use case.
[Tracking settings](https://resend.com/docs/dashboard/domains/tracking).

These are published provider statements checked during this review, not a legal
compliance determination or independent inspection of NTM's provider accounts.

## Owner-reported dashboard inspection (2026-09-16)

- Supabase plan: **Free**. Log Drains shows **Upgrade required**; owner confirms
  no drains are available/configured. This closes the configured-drain check;
  manual exports and other separately retained copies are not covered.
- Supabase primary project region: owner reports **Ireland (`eu-west-1`)**.
- Resend domain `nolltillmiljoner.se`: only **Configure** shown for tracking
  metrics; owner confirms tracking is not configured. No tracking was enabled
  during this review. Separate open/click toggle values were not displayed.
- Resend webhooks: owner reports **none configured**.
- Resend Settings > Team > Exports: owner reports **none listed**. This does
  not establish whether separately saved files or copies exist elsewhere.
- Owner reports **no separately saved Supabase or Resend provider logs**, apart
  from the schema audit and conversation snippets excluded from the question.
- Resend transactional plan: owner confirms **Free**. Published policy checked
  on 2026-09-16: email/log data retained for 30 days, backups persist seven days,
  customer data stored in the US. These are provider-stated periods, not an
  independently observed deletion test. Application account deletion does not
  remove previously sent authentication emails from Resend.
- Resend test-email sample: body visible, containing only login/OTP content and
  branding; no journal, financial or synced record content visible. This sample
  passes the unintended-content check and confirms stored authentication-email
  content must be covered by the retention disclosure.
- Associated Resend log: owner reports it was available, with no journal,
  financial or synced record content and no API key or SMTP password visible.

These are owner-reported observations of the September 15 live test window,
not direct assistant inspection or proof that every provider log path is clean.

- Postgres rejected parent-completeness write: no DETAIL, failing-row contents
  or record values visible; statement used `$1` placeholders. Searching
  `Synthetic` returned no matches.
- Successful API Gateway upload request: no request/response body, synthetic
  record text or Authorization token visible.
- Successful Auth verification: no OTP or access/refresh token visible;
  email/IP metadata was visible and needs retention coverage.
- Standalone PostgREST logs: owner found entries in the test window, but only
  startup/configuration messages. Inspection of that source is recorded with
  no request-level sample available; it does not prove request-body redaction.
- Authentication **Write audit logs to the database: off**; no retention
  setting shown. This disables additional database writes, not external Auth
  logs. Owner subsequently ran `select count(*) from auth.audit_log_entries`
  and reported **0**. No historical entries remain in that table at inspection;
  this does not establish deletion from provider logs or backups.

The inspected samples pass the content-exposure check. Configured forwarding
and export checks are complete as owner-reported above. Published Resend
retention is identified; no claim covers unsampled log paths or independently
verifies provider deletion schedules.

## Final checklist and evidence limits

1. **Supabase catalog: complete.** Owner-supplied single-cell JSON passed review;
   no repeat needed unless the schema changes.
2. **Supabase Dashboard: complete for the requested configuration checks.**
   Free plan, Ireland region, no drains, database audit writing off, zero audit
   table entries and no separately saved provider logs reported. The Free log
   access window is not proof of deletion from all underlying systems.
3. **Supabase logs:** the owner-reported Postgres/API Gateway/Auth samples above
   passed. Standalone PostgREST showed only startup/configuration messages,
   leaving no request-level sample to inspect. For further
   inspection, use the live test
   period. Search for `Synthetic live verification thesis`, `Synthetic frozen
   snapshot`, `Synthetic conflicting same ID` and `Synthetic pending reload`.
   Report matches as counts/categories only. Check request bodies, bind parameters
   and failing-row/error details. Do not paste raw logs containing JWTs, OTPs,
   email addresses or financial/text payloads. If the test window has expired,
   report that; a fresh controlled test will be needed for log-content evidence.
4. **Resend Dashboard:** Free plan, stored OTP-only email sample, unconfigured
   tracking, no webhooks and no exports reported. Published retention recorded.
   Associated request-log sample passed the unintended-content/credential check.
5. **Provider retention disclosure: updated locally.** `om-metod.html#integritet`
   now covers optional accounts, Ireland primary storage, authentication email processing,
   US storage at Resend, retained mail/audit records and separate local copies.
   `min-ntm.html` links to it before requesting an OTP and at account deletion.
   Normal provider retention is not by itself an automatic demand for a paid plan;
   it must be understood and described accurately before public activation.

A connected signed-in Dashboard session can replace manual collection. No secret
key, database password, service-role credential or admin token needs to be shared.
There is no safe way to derive these owner-only facts using the publishable key.

## Validation in this review

- New single-result audit executed successfully against both migrations in local
  PostgreSQL; returned expected relation, functions and corrective constraint.
- Supplied hosted schema compared with locally generated catalogs: all eight
  sections matched, with NOT NULL representation normalized as described above.
- Documentation reviewed against official provider sources.
- Final disclosure edits: product-trust tests passed (two Python tests, including
  executable JavaScript contracts), staged local references reported no missing
  links, and targeted `git diff --check` passed. The first test invocation lacked
  Node on PATH; rerunning with the installed `NODE_BINARY` resolved it.
- No application runtime/schema migration changes; prior full-suite/live results
  remain applicable. Hosted schema evidence is reviewed; owner-reported live
  log samples passed within the limits documented above.

**Remaining blockers in this review: none identified.** Release remains unperformed
at the owner's instruction; the corrected disclosure must ship with cloud activation.
PostgREST request-level sampling was unavailable (only startup/configuration
messages). Samples do not establish universal absence of sensitive logging, and
the Supabase dashboard access window does not establish a deletion deadline for
every underlying copy. These limitations are explicitly retained, not marked as
tested guarantees. This closes the requested catalog/provider review; it does not
replace broader operational backup/restore, abuse/load or release checks outside
the recorded verification scope.
