# Auth browser expired-session restoration race

2026-09-20. Local investigation and validation only; no commit, push, deployment or hosted authentication writes.

## Root cause and reproduction

The expired-session restoration case changed provider state and installed a clock two hours ahead **on an already signed-in page**, before registering `expect_response`. That page still had a running Supabase SDK. Its session/background work could refresh immediately, receive the fixture's HTTP 400 rejection, and clear the saved session before the test began waiting. The subsequent navigation correctly showed a logged-out account without another token request. The waiter then timed out after 30 seconds.

A disposable timing probe yielded for 250 ms between clock installation and waiter registration. The pre-fix [trace](../qa/auth-restore/clock-probe.log) records token request, route handling, fulfillment and HTTP 400 response **before** the waiter, followed by the same timeout. The ordinary baseline also passed locally, demonstrating scheduling sensitivity. The same probe [passes after the fix](../qa/auth-restore/fixed-clock-probe.log), with no token request before the waiter. The probe's delay is not part of the test fix.

This distinguishes the investigated possibilities:

| Possibility | Finding |
| --- | --- |
| Request never initiated | No: a token request was observed before the waiter. |
| Request failed before a response | No: the reproduced failure received HTTP 400. |
| Different auth configuration | The workflow test stages its own exact synthetic origin and public fixture key; it does not use hosted Auth or production credentials. |
| Initialization/timing race | Yes: active-page session work runs between clock installation and the later waiter. |
| Wrong observable | The response is appropriate, but the original wait started after the operation could already complete. |
| Product authentication regression | None found. Rejection and session removal behaved correctly. This is not a live-provider health check. |

The supplied CI excerpt identifies the failing waiter; a complete hosted log was not available. The matching failure was reproduced locally rather than inferred solely from that excerpt.

## Implementation audit and bounded fix

`cloud-adapter.js` uses the vendored official Supabase SDK with `persistSession: true`, `autoRefreshToken: true` and `detectSessionInUrl: false`. Restored sessions are checked with `getUser`; rejected identities are cleared. Session-change callbacks and automatic refresh are intentional. The deployment workflow uses pinned Playwright 1.62.0 and bundled Chromium, then runs `test_auth_browser.py` against a staged synthetic Auth fixture.

Only `scripts/test_auth_browser.py` changes executable behavior:

- Verify that login persisted an SDK session, then close the active page before changing provider/time state.
- Open a fresh page in the same persistent browser context, preserving the actual SDK-managed local storage. Install the expired clock before loading application code.
- Advance the blank page's clock another second and assert no rejected refresh occurred before navigation.
- Register the exact-origin refresh POST response waiter before navigation. Require HTTP 400, an exercised fixture rejection, a null adapter session and removal of the saved SDK session.
- Retain the separate automatic-refresh timer test and all existing isolation, restart, logout, stale-session, offline and no-silent-upload assertions.

No product authentication, SDK, CSP, workflow, timeout, RLS or account-separation implementation changed. This closes the timing window instead of extending a timeout or accepting a logged-out UI without testing refresh rejection.

Diagnostics keep at most 48 allowlisted lifecycle records (`request`, `handled`, `fulfilled`, `response`, `failed`), endpoint labels and numeric HTTP status codes. They omit URLs, query strings, headers, bodies, credentials, OTPs, tokens, identities and provider error text. Failure diagnostics identify the static test phase. A [privacy check](../qa/auth-restore/diagnostics-privacy.log) verified allowlisting, query/private-path exclusion and the record limit.

## Validation

All eight validation commands from the deployment workflow passed in order. Results are recorded in [workflow-results.json](../qa/auth-restore/workflow-results.json), with individual logs beside it.

| Check | Result |
| --- | --- |
| `validate_release.py` | PASS: 167 Python tests, 303 Node tests; Knowledge/history, SEO, rules, security, staging and release checks. No test skips. |
| `test_social_rls.cjs` | PASS: PostgreSQL/RLS, A/B/anonymous boundaries, ownership, stale tokens and cascades. |
| `browser_smoke.py` | PASS: all 39 tests, including calculator provenance. |
| `test_social_browser.py` | PASS: real-adapter social/account journeys. |
| `wave5_browser.py` | PASS: all four tests. |
| `test_auth_browser.py` in workflow sequence | PASS: complete SDK session lifecycle and no silent upload. |
| `quality_browser.py` | PASS: accessibility/CSP across 41 pages. |
| `check_workflows.py` | PASS: actionlint 1.7.7. |
| Focused `cloud-config.test.cjs` / `cloud-sync.test.cjs` | PASS: 15 tests. |
| Additional auth runs | PASS: three consecutive runs, the delayed scheduling probe and Python 3.12.5 with pinned Playwright. |
| Diagnostics privacy check | PASS: allowlisting, query/private-path exclusion and 48-record bound. |
| `git diff --check` | PASS. |

The full local sequence used Windows, Python 3.14.7 and Node 24.18.1; hosted CI uses Ubuntu, Python 3.12 and Node 22. The auth gate also passed under a separate local Python 3.12.5 virtual environment. Playwright 1.62.0, bundled Chromium, vendored Supabase SDK 2.116.0 and PGlite 0.5.8 match the intended fixture dependencies. This is workflow-equivalent local validation, not execution on GitHub's runner or a production login test.

The known auth-browser blocker is fixed and another push is expected to pass this gate. An actual hosted run and production configuration cannot be certified by these local checks. No commit, push or deployment was performed.
