# Hosted Supabase verification

Remaining catalog/provider review and current release blockers are tracked in
[production-readiness.md](production-readiness.md).

This report supersedes the earlier blocked statuses in `activation-report.md`.
Tests use the real configured Supabase project, the owner's two dedicated test
accounts, and fresh non-persistent Edge contexts served at `127.0.0.1:8765`.
Only synthetic NTM data was used. No personal browser profile was accessed.

## Executed hosted checks

| Area | Evidence |
| --- | --- |
| Configuration | Ignored `.env.local`; generated staged public config and exact-origin CSP; source remains disabled |
| Migrations | Owner reports both applied successfully; private table/RPCs respond; corrective parent constraint rejects an incomplete parent identity with 23514 |
| Email OTP | Both dedicated accounts verified through the real app using emailed numeric codes; separate fresh-browser A login and A re-login after reload also passed |
| Signup scope | Both test identities were created/requested in the earlier test sequence; final run verified their OTPs. A new never-used third identity was not created under the final SMTP configuration |
| Invalid OTP | Invalid numeric OTP rejected by hosted Auth; app showed a bounded error and created no session |
| Anonymous access | Table SELECT and all three RPCs denied with HTTP 401 / SQLSTATE 42501 |
| A/B isolation | Each owns separate records; direct cross-owner reads return zero rows; cross-owner INSERT/PATCH/DELETE denied in both directions |
| Immutability | Owner PATCH/DELETE also denied as designed; whole-account deletion uses the authorized RPC |
| Local use | Synthetic manual thesis, public-stock frozen snapshot, outcome checkpoint, scenario/plan/observation and Academy event prepared without cloud writes |
| Explicit sync | Login makes no upload; clicking the existing confirmed upload sends saved data; local sources retained |
| Types | All eight kinds uploaded: metadata, journal, revision, outcome, calculator, scenario, observation, preference |
| Acknowledgement | During a real upload UI showed waiting; server committed, then test interception deliberately discarded the response; queue stayed unacknowledged/error |
| Retry | Explicit retry acknowledged the same records; repeated upload did not duplicate them |
| Network/reload | A later request was deliberately blocked before reaching Supabase; failed queue and sources survived reload; fresh OTP login and explicit retry completed the upload |
| Fresh browser | Separate empty context signed into A with its own OTP and explicitly restored Research/Min NTM, scenarios, outcomes, observations and theme; displayed Synkat |
| Repeat restore | Repeating restore retained the same local records without duplicate IDs |
| Local-only categories | Academy history remained on its source browser and was absent on the restored device; behavioral history is also outside the cloud schema |
| Conflict RPC | Different content with an existing immutable ID returned 409 and rolled back a batch including a new record |
| Conflict UI | Synthetic same-ID local edit produced Konflikt on upload and restore; neither local nor hosted copy was overwritten |
| Export | Downloaded portable and raw account exports parsed and matched expected hosted contents; temporary test downloads removed |
| Logout | Existing UI cleared login state and retained local sources |
| Mobile/CSP | Real-hosted account flow checked at 390px in light/dark; no horizontal overflow, CSP violations or uncaught JS errors |
| Client privacy | No synthetic text/test email in app telemetry; no session token in localStorage; no response bodies logged by app |

The network tests intercept only the intended failing request/response. Successful
auth, record writes, exports, restore, conflicts and deletion use hosted responses;
no mock database or mocked successful receipt was substituted.

## Deletion finding and correction

Deleting A removed its hosted rows and Auth identity, rejected stale-token writes,
cleared the deleting browser's account queue and retained local data. B's records
remained intact. The existing client then attempted Auth logout; Supabase returned
HTTP 403 with `error_code: user_not_found` because deletion had already succeeded.
This caused a misleading cleanup warning.

`cloud-adapter.js` now recognizes only that specific error on the logout endpoint
as an already-invalid session. Other 403 failures still surface as failures. The
adapter clears session memory in either case. The regression test checks both
the expected response and an unrelated forbidden response. No RLS/grants changed.

B's final OTP login and account deletion completed. Both accounts and their
synthetic cloud records are now deleted; each browser retained its local data.
B's deleting browser still had the old adapter cached, so its UI displayed the old
cleanup warning despite successful deletion. Runtime source inspection confirmed
that the correction was not loaded in that page.

The updated adapter was then explicitly loaded and exercised against the actual
hosted logout endpoint with B's captured, now-deleted session. The harness seeded
only that captured session in memory (it did not repeat Auth verification); the
logout request/403 user_not_found response was real. The corrected adapter completed
without error and cleared session memory. This is a live adapter regression check,
not a claim of a second complete fresh-auth/UI deletion run. The browser fixture
also now returns the observed hosted 403 response after deletion to cover the full
UI cleanup path. Stale-token inserts and Auth user access were denied for B.

## Final repository validation

- Full Python suite: 163 passed, including local PostgreSQL RLS execution.
- Full JavaScript suite: 209 passed, including the new logout regression.
- Full browser smoke: 37 passed after the client correction.
- Final full-UI cloud regression with the observed post-delete 403 response: passed.
- SEO, staging/local references, credential-pattern scan, staged CSP and
  `git diff --check`: passed.
- Workflow syntax: actionlint 1.7.7 passed.
- Earlier 32-page quality-browser CSP/accessibility run passed; the additional
  hosted mobile/CSP checks above passed in this run.

Logs: `%TEMP%/ntm-live-final-validation.log` and
`%TEMP%/ntm-live-final-browser.log`. Existing macro partial-data/2027 schedule
notices remain; no new validation failures.

## Boundaries and remaining owner checks

- Access-token persistence/refresh and magic-link callbacks remain unsupported by
  the existing foundation. Reload requires another OTP; this was exercised.
- Actual time-based OTP/JWT expiry was not waited out. Invalid OTP and deleted-user
  stale-token rejection were tested; these are not claims of elapsed-time expiry QA.
- The owner applied the migrations and subsequently supplied the administrative
  catalog audit. Schema definitions, constraints/indices, forced RLS, owners and
  privileges passed comparison with the migrations; see production-readiness.md.
- Supabase region, provider logging/retention and Resend operational configuration
  were not independently inspected. SMTP/domain setup and credential rotation are
  owner-reported; successful code delivery was independently demonstrated.
- Local-only: Academy progress/attempts/answers, behavioral decision pauses/groups/
  templates, unsaved drafts and recent tools. Public datasets are not copied to cloud.
- Cloud-supported contents and Free-tier limits remain documented in the activation
  report. No plan upgrade, purchase, commit, push or deployment occurred.

## Readiness

- **Local development:** ready with the configured staged build and existing OTP-only
  session behavior.
- **Isolated staging/pilot:** ready for controlled testing; core hosted behavior,
  test-account cleanup and release checks passed. Use a fresh build/browser load
  so the logout correction is present; the exact live-retest scope is above.
- **Public production:** not signed off. The catalog review passed; finish the
  provider operations/privacy checks, and explicitly accept the documented session,
  retry, deletion-sync and Free-tier limits before activating production config.
