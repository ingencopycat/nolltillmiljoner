# Persistent account sessions — release fix

## Root cause and production reproduction

The live `cloud-adapter.js` matched the local source byte-for-byte after line-ending normalization. It used `let auth=null`, retained only the access token in memory, discarded the refresh token, and cleared auth on token expiry. It did not use Supabase's session lifecycle. Account initialization also never restored the sync owner.

A disposable persistent browser profile loaded the real production pages, with all Supabase requests intercepted by synthetic fixtures (no real owner credentials or hosted mutation). Initial authentication succeeded. Returning through Min NTM, Research and a public profile lost it; reload, cache-disabled reload, closing/reopening a tab, and closing/reopening the browser all lost it. The old expiry guard required another OTP rather than refreshing.

## Implementation

- Self-hosted, integrity-checked official Supabase JS 2.116.0 bundle with MIT license and package/bundle checksums in `vendor/supabase/`. No CDN script permission or new third-party connection is added.
- SDK `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: false`; OTP remains the login entry point. The SDK owns standard browser storage, locking, refresh rotation and cross-tab events. No custom token persistence, cookie emulation or copying into NTM stores/queues/exports.
- Account restores the owner on initialization and identity changes. Auth `getUser()` validates restored identity against the server. Transient network failures do not clear stored credentials. Restoration never enqueues, uploads or imports private data.
- Explicit logout uses SDK local-session sign-out (revokes that server session). The request boundary lets SDK local cleanup finish if server revocation is unreachable, then reports the network failure separately. It does not claim remote revocation succeeded. Account deletion retains receipt validation and existing queue/local-data cleanup before SDK logout. Deleted-user/401 responses are rejected and SDK credentials removed.
- Other browser profiles/devices require OTP. Same-profile persistence depends on browser storage being retained; private browsing, cleared site data or server-revoked sessions require login again. A static site uses the SDK's supported JavaScript-accessible browser storage, not HttpOnly server cookies. Existing CSP and server RLS remain essential and unchanged.

## Regression coverage

`scripts/test_auth_browser.py` exercises the actual SDK on a configured staged site with CSP enforced and intercepted synthetic Auth: navigation, reload, cache-disabled reload, tab reopening, persistent-browser restart, fresh device, automatic timed refresh, refresh rotation, cross-tab logout, logout across restart, deletion, restored deleted-user rejection and offline logout. It asserts zero private uploads and removal of SDK credentials after logout/deletion. No token/profile state is exported from the temporary browser profile.

Existing social/browser fixtures now supply realistic refresh-token fields and assert session restoration rather than expecting re-login on navigation. Credentials are allowed only in the SDK's own storage entry; domain storage and backups must remain credential-free. The deployment workflow runs the new session suite before artifact upload.

Validation passed: the new SDK lifecycle suite (including access expiry in transit,
invalid refresh credentials and offline logout with both valid and expired access),
social browser suite, 165 Python tests, 213 JavaScript tests, 37 general browser
tests, accessibility/CSP checks, cloud/social PostgreSQL regression, staging/SEO/
security checks, actionlint and `git diff --check`. Browser verification used the
pinned Playwright Chromium on Windows; Linux CI itself has not been run for this
uncommitted change. Generated screenshots were restored and are not part of the patch.

References: [Supabase Auth persistence](https://supabase.com/docs/reference/javascript/auth), [sessions and refresh tokens](https://supabase.com/docs/guides/auth/sessions), [sign-out behavior](https://supabase.com/docs/reference/javascript/auth-signout).

This is a local release fix with production-equivalent verification. The production site is unchanged until the owner deploys it. The old memory-only session cannot be migrated after its page is gone; one fresh OTP login is needed after deploying this fix to establish a persistent session.
