# Public Profiles V1 — hosted verification

Status: **hosted application/API verification and owner-confirmed cleanup audit passed**. The owner reported successful application of `202609160001_public_profiles.sql` and completion of the read-only verification. The supplied function-permission screenshot matches the intended entry-RPC/helper grants and empty search paths. The owner subsequently returned the final cleanup query result; every value matches its expected result.

Testing uses the real project configured through ignored `.env.local`, a separate temporary static site served on loopback, fresh nonpersistent Edge contexts, and the two owner-designated disposable test accounts. No production site deployment, migration execution by the agent, commit or push. Auth sessions and OTPs remain in process/browser memory. The temporary server serves only staged public assets.

## Completed hosted checks

- Anonymous direct reads of all five social tables and private records denied. Anonymous social/private writes denied. Public read RPC available; empty/wildcard username searches return no directory; recent results are bounded.
- Both real emailed OTP logins succeeded. Both dedicated accounts were confirmed to have no preexisting private records or public profile before test mutations. Login did not upload anything.
- Required permanent-name checkbox blocks UI profile creation. Server normalizes case, rejects reserved/blocked/invalid handles and mixed-case duplicates. Account-only B remains absent from discovery and cannot follow; it can report without a profile.
- Both accounts denied direct profile insertion, targeted updates/deletion, and reads of internal profile/follow/snapshot/report/reservation tables. Injected owner, username and admin role are ignored by the settings RPC. Hosted Auth admin API denied.
- Self-follow rejected; duplicate follow idempotent; asymmetric counts and public follow lists correct. Level and exact XP can be exposed independently.
- Same reporter/target rejected with HTTP 429. Two concurrent reports produced exactly one success and one 429. Private report exports isolated by reporter. Actual 24-hour expiry is not waited out; local PostgreSQL tests cover expiry using an aged timestamp.
- Synthetic Research saved locally and explicitly synced through the real Account UI. B cannot read A's private rows. A conflicting batch returned 409 and rolled back the entire batch.
- Publishing rejects missing confirmation, another account's or unsynced source revision, unknown private fields and nested content. UI preview contains only selected fields, publishes nothing until confirmed, and restores focus on Escape.
- A real UI publication created one snapshot. Repeating its request returned the same public ID. B cannot unpublish/replace A's content; direct snapshot PATCH/DELETE denied.
- A newer private revision did not silently update the public snapshot. Explicit new publication replaced visibility while retaining publication history. Deactivation hid profile, analyses, discovery and follow counts; reactivation restored the expected visibility/relationships.
- UI unpublish hid the public URL while preserving private browser data. Public RPC responses contain exactly the intended profile fields and no auth UUIDs, private revision references, private-note sentinels or report text. Session tokens absent from localStorage; app metrics contain no usernames/private content.
- Public profile/analysis/discovery rendered against real hosted responses at 360, 390 and 430px in dark/light, without horizontal overflow. Hosted search and follow-list dialog worked; no uncaught JS errors or CSP violations observed.
- Private portable/account JSON downloads parsed. Social export included hidden authored publications and the caller's own report. Temporary downloads removed.
- UI privacy preview/save, independent Academy sharing and deactivate/reactivate worked. HTML-looking bio rendered as plain text with no injected image or clickable external URL.
- All four optional publication fields were explicitly selected and matched the real public response. A successful hosted publication receipt was deliberately replaced with a failure at the browser boundary; UI retry returned the same snapshot without a duplicate. Successful writes/readbacks were real hosted responses, not mocks.
- A and B both completed another real emailed-OTP login in fresh browsers, without uploading data on login. A's empty browser restored both private revisions; repeated restore was idempotent. Public-profile management loaded independently of private sync.
- Fresh-browser B followed/unfollowed A through the actual UI; hosted counts and `aria-pressed` matched. The report dialog displayed the real HTTP 429 limit, and Escape returned focus.
- Both dedicated accounts were deleted through the existing Account UI. Local data was preserved. Profiles and authored analyses became inaccessible; B remained intact after A's deletion, and its following count dropped as the edge was removed. Both original-session and fresh-session stale tokens were rejected. Public browser pages displayed unavailable after deletion.
- Sanitized evidence labels: `docs/qa/social-v1/hosted-results.json`. No token, OTP, email or auth UUID is written to that artifact.

## Final owner-confirmed audit

The owner ran `supabase/verify_public_profiles_hosted_cleanup.sql` and supplied this result on 2026-09-16. This is owner-supplied database evidence, separate from the agent-executed API/browser checks.

| Check | Result |
| --- | --- |
| RLS enabled and forced on all five tables | true |
| No direct client table access | true |
| Synthetic profiles remaining | 0 |
| Synthetic analysis rows remaining | 0 |
| Synthetic reports expected / retained | 2 / 2 |
| Retained reports with account/profile references | 0 |

The test accounts and all four synthetic public snapshots have been removed. Two synthetic moderation reports remain, as designed, with reporter/target references cleared. The hosted verification run is complete within the documented scope below. No application or migration correction was needed from the hosted tests. No commit, push or site deployment occurred; completion of verification does not deploy or launch the feature.

## Harness findings

Supabase's safeguard rejects unfiltered PATCH requests with HTTP 400 before the permission check. Retesting with explicit target filters returned the expected HTTP 403. The reusable harness now targets rows explicitly.

An out-of-band RPC change followed by an injected UI refresh let the browser test briefly see old buttons. The harness now waits for the new publication-list render. This was a harness synchronization correction, not an application or migration change.

Administrative badge assignment/suspension through owner SQL is not performed in this run. Client privilege escalation is tested against the actual hosted API; trusted role/trigger definitions were applied by the owner. Provider retention/log settings are not changed or newly certified by these tests.
