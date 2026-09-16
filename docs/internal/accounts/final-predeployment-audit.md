# Final pre-deployment release gate — 2026-09-16

## 1. Git / diff status

Audited the complete working tree against HEAD `39b7573` (`accounts`), including unstaged changes and non-ignored untracked files. The index is empty. No staging, commit, push, deployment, GitHub setting change or hosted schema change was performed.

The only release-blocker repairs made during this audit are the deployment regression gate, its workflow contract test, and the social browser runner's support for bundled Chromium in Linux CI. This report and the requested owner-bootstrap procedure are new documentation. Existing account/profile implementation changes remain uncommitted.

## 2. Secret scan

Passed: tracked files, current diff, non-ignored untracked files and 1,320 reachable historical Git blobs across local refs. Initial working-tree scan covered 479 files. Scanned credential patterns include Resend, Supabase secrets/JWTs, GitHub tokens, database credential URLs, private keys, credential assignments and the known verification OTPs/test email addresses. Two current and five historical assignment matches were reviewed: they are explicit `TEST_MEMORY_TOKEN` / `DO_NOT_STORE` test fixtures, not credentials. No actual credential finding remains.

`.env.local` is ignored and untracked. It contains only the allowed public configuration fields; no additional private environment value was available for exact-value comparison. Public Supabase URL/publishable key are browser configuration, not service credentials. No secret, service-role key, SMTP password or Resend key belongs in browser configuration. This is a practical pattern/history audit, not a guarantee about unknown secrets or remote-only unreachable history.

## 3. Hosted test-data cleanup

Prior hosted evidence confirms the dedicated verification accounts were deleted. The owner-provided cleanup result recorded zero synthetic profiles/analyses, both expected reports retained with null account/profile references, forced RLS on all five social tables and no direct client table access. The later focused username run also verified account deletion and stale-token rejection.

Current production-like artifact scanning found no dedicated email, hosted synthetic handle, private verification sentinel or local filesystem path. Synthetic IDs and report markers remain only in intentional tests/internal evidence. Those files are excluded from the website artifact. No new hosted mutation was needed for this audit. Report retention is intentional, not incomplete cleanup.

## 4. Production account configuration — OWNER ACTION REQUIRED

Read-only GitHub API inspection found all three repository Actions variables absent: `NTM_CLOUD_ENABLED`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`. Source `cloud-config.js` correctly defaults to disabled, so production accounts would otherwise remain disabled.

Before the production push, the owner must:

1. In repository **Settings → Secrets and variables → Actions → Variables**, set `NTM_CLOUD_ENABLED` to `true` and copy `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` from the already verified project's local public configuration. Use the publishable key, never a service/secret key.
2. In **Settings → Pages**, change Source from **Deploy from a branch** to **GitHub Actions**. Preserve `nolltillmiljoner.se` and the current DNS/domain settings.
3. Coordinate these changes with the intended release. The existing weekday scheduled workflow can run independently of a manual push; do not manually dispatch the old revision as the account release.

The repaired workflow fails closed if account enablement is absent; config generation rejects missing/invalid public fields. A temporary staged build generated configuration successfully using the verified local public values. OTP requests target that Supabase origin; the client does not connect directly to Resend. Relevant account/social CSP permits the exact project origin. Local-only usage remains available without login.

## 5. Privacy / disclosures

The production artifact includes the reviewed local/cloud, optional account, optional profile, explicit Research publication and deletion disclosures. Provider email/log retention and residual local copies are disclosed; the interface does not promise instant deletion of every provider log or backup. Public report retention after account removal is disclosed. No stronger legal conclusion is made by this technical release audit.

## 6. Public profiles and public-data minimization

Passed source review, local PostgreSQL authorization regression and existing hosted evidence for permanent normalized usernames, case-insensitive uniqueness, reserved/blocked names, authenticated availability checks, optional profiles, follows, restrained search/discovery, reports, immutable allowlisted Research snapshots, replacement/unpublish, deactivation/reactivation and server-controlled badges.

Public RPC projections expose only selected public profile/analysis fields. They do not expose email, private cloud/Research payloads, private Academy details, sync queues, tokens or provider credentials. Academy level/XP require explicit visibility settings. All five social tables force RLS and deny direct client access; RPC ownership and role checks operate server-side. Protection does not depend on CSS hiding.

## 7. Deferred features

No active portfolio sharing, forum, DMs, feed, reactions, comments, notifications, reputation, public achievements, avatar uploads, social OAuth, payment/Pro flow or live AI provider was found in the release surface. Initials are generated profile decoration, not an upload system. Existing external community links are not OAuth. AI remains an unavailable foundation; the explicit loopback-only mock is a test hook with no live provider.

## 8. Build / staging

Passed an isolated 213-file production-like stage with generated public config, exact CSP, local reference checks and the existing custom domain. Account, profile, discovery and public-analysis pages and their scripts/styles are present. Generic noindex metadata keeps dynamic personal pages out of the generated sitemap. SEO/robots validation passed.

The stage excludes `.env`, `.git`, `docs`, `tests`, `scripts` and `supabase`; no localhost URL, Windows user path or hosted test identity was found in its content. Generated `cloud-config.js` belongs only in the temporary Pages artifact; do not replace the safe disabled source with local project settings.

## 9. Full validation results

- Full Python suite: 164 tests passed after adding the deployment-gate regression.
- Full JavaScript suite: 213 tests passed, zero skipped.
- General browser suite: 37 tests passed.
- Local cloud RLS regression and separate social PostgreSQL/PGlite regression: passed with the optional database dependency supplied.
- Social browser suite: passed, including explicit publication, cancellation/focus, privacy, XSS-as-text, unpublish/private preservation and mobile overflow.
- Accessibility/CSP quality browser suite: passed across 36 pages, mobile/desktop and both themes.
- SEO generation checks, calendar/weekly rules, security scans, staging/local references, actionlint and `git diff --check`: passed.

These suites cover account/cloud, profiles, Research/publication, Academy, Knowledge Bank, calculators, macro/earnings, backup and Connected Experience. No failing test was skipped. Browser tests used installed Chrome locally; CI installs Playwright Chromium. Automated accessibility checks do not replace manual assistive-technology testing. Performance measurements are local diagnostics, not production latency guarantees.

## 10. Production-like browser release smoke

Passed homepage, Account/login/OTP UI, local-only use, profile setup/availability, public profile, discovery, public analysis, Academy, Research and Min NTM on the staged artifact. Checked 360/390/430/1440 widths and both themes. CSP was enforced without bypass; no overflow or browser errors were observed. No automatic private upload occurred.

Auth/public responses were supplied by an isolated network fixture harness at the configured origin; fixtures were not written into production files. This run verifies staged client behavior and configuration, not new email delivery. Real hosted behavior is covered by the completed prior verification.

## 11. Workflow / deployment findings

The previous deployment build did not enforce the full release suite. Repaired locally: its exact selected revision now runs complete release, cloud/social RLS, browser/social browser, quality and actionlint checks before Pages artifact upload. CI test dependencies are isolated outside the website artifact. A regression test asserts this gate precedes upload and cannot silently continue on error.

The data-update job can commit only its four explicitly listed data files. The build checks out that job's emitted revision; it does not depend on a bot push triggering another workflow. Publishing uses only `_site`, preserves CNAME and requires the build job. No Supabase migration or destructive SQL runs in deployment. Provider data API secrets remain confined to the data preparation step.

Actual hosted Pages configuration is still legacy branch publishing and must be corrected as above. `main` is currently unprotected. Branch protection was not changed; requiring PR checks is an owner hardening decision. The newly repaired deployment gate has been validated locally/actionlint, but has not run on GitHub because pushing/deploying is prohibited in this task.

GitHub's documented [Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) and [custom workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) behavior support the required Actions source. [GITHUB_TOKEN behavior](https://docs.github.com/en/actions/concepts/security/github_token) explains why the explicit revision/job chain matters.

## 12. A — SHOULD COMMIT

Commit the intended implementation, migration history and regression tooling together:

```text
.github/workflows/deploy.yml
analys.html
cloud-adapter.js
cloud-ui.js
konto.html
min-ntm.html
ntm-product.js
ntm-ui.js
profil.html
research.html
research-publication.js
script.js
social-core.js
social-ui.js
social.css
upptack.html
scripts/browser_smoke.py
scripts/build_seo.cjs
scripts/quality_browser.py
scripts/stage_site.py
scripts/test_social_browser.py
scripts/test_social_rls.cjs
supabase/migrations/202609160001_public_profiles.sql
supabase/migrations/202609160002_username_availability.sql
supabase/verify_public_profiles.sql
tests/cloud-config.test.cjs
tests/cloud-sync.test.cjs
tests/social-core.test.cjs
tests/test_release_quality.py
docs/internal/accounts/README.md
docs/internal/accounts/account-polish-release-audit.md
docs/internal/accounts/public-profiles-live-verification.md
docs/internal/accounts/public-profiles-v1.md
docs/internal/accounts/username-hosted-verification.md
docs/internal/accounts/final-predeployment-audit.md
docs/internal/accounts/owner-bootstrap-after-deployment.md
```

Both new migrations are already applied to hosted Supabase; committing their history does not mean rerunning them. Existing generated sitemap/SEO assets remain required and validated; no generated diff is pending. The temporary configured Pages artifact is generated by CI, not committed.

## 13. B — SHOULD NOT COMMIT; C — OPTIONAL

**B — Exclude:** `.env.local`, any other private environment/credential file, `_site`, temporary audit logs/scripts, browser profiles/storage dumps, account exports, OTPs, tokens, personal audio/transcriber material. Currently ignored unrelated items include `YouTube Transcriber.spec`, `youtube-transcriber/`, the two WAV files and `gpu-test/` under `micron-transcription-test/`. Do not force-add ignored files.

**C — Owner decision:**

```text
docs/qa/account-polish/             (all sanitized screenshot/JSON/README evidence)
docs/qa/social-v1/                  (all sanitized screenshot/JSON/README evidence)
supabase/verify_public_profiles_hosted_cleanup.sql
scripts/social_hosted_audit.py
scripts/social_hosted_driver.py
scripts/social_hosted_extra.py
scripts/verify_username_hosted.py
```

These are internal QA provenance/tooling, not runtime dependencies. Keeping the sanitized QA directories preserves links from the verification reports; omitting them requires adjusting those links. The cleanup SQL is read-only and scoped to the historical synthetic run. Hosted drivers are manual test tools; older interactive selectors may need updating before reuse. They must never run automatically in deployment. The repository is public: inclusion makes even website-excluded evidence public source. Reviewed evidence contains synthetic fixtures, not live credentials.

## 14. Remaining risks / owner actions

The missing repository variables and wrong Pages source remain unresolved owner configuration actions. Do not push as an account release until they are corrected. Local tests cannot prove future GitHub runner/network availability or the final published domain behavior. After the authorized deployment, inspect its successful gate and perform a short real-origin login/local-only/profile smoke. Manual screen-reader testing and protected-branch adoption remain owner follow-up decisions, not claims established by this audit.

## 15. Exact post-deployment owner bootstrap

Follow [owner-bootstrap-after-deployment.md](owner-bootstrap-after-deployment.md) only after deployment. It contains the exact owner-only transaction for confirmed Auth user UUID → reserved `@nolltillmiljoner` → server-controlled `admin`, plus verification and failure handling. It does not disable RLS, triggers or client restrictions. The reservation is restored within the same locked transaction. The procedure was tested in isolated PGlite, including repeat refusal and denial of normal-client reserved-name creation/ADMIN escalation. No permanent hosted identity was created.

## 16. Final verdict

**B. SAFE AFTER LISTED MINOR OWNER ACTIONS**

The local repository release gate passes. Set the three public Actions variables and switch Pages to GitHub Actions before the production push. Until then, the intended account release is not correctly configured for production. Nothing was committed, pushed or deployed.
