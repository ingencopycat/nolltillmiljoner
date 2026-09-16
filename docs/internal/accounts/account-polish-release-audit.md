# Account Experience V1 — premium polish and release audit

Date: 2026-09-16. Scope: account/profile presentation and recovery flows in the existing working tree. No commit, push or deployment was performed. The later focused hosted verification is now complete; see [hosted username verification](username-hosted-verification.md).

## 1. UX weaknesses found

The initial audit inspected the existing UI, source and stored mobile screenshots before editing. The account page combined login, sync, backup and deletion in one nested card, placed deletion above profile management, exposed the full editor/publisher immediately, and repeated privacy explanations. OTP errors were presented as sync failures. Username checking happened only on creation. Public identity was below a generic page title, follower controls were oversized, and a sitewide Instagram promotion competed with user content.

## 2. Changes made

Separated account tasks, introduced email-first login, added safe error mapping and recovery controls, collapsed optional editors, moved deletion to the bottom, refined public identity and analysis hierarchy, and added an authenticated read-only username availability function. Existing private data storage, sync engine, session persistence policy, publication allowlist and social write authorization were retained.

The availability function is additive because search omits inactive profiles and cannot establish whether a username is available. The existing unique constraint and creation guard remain authoritative if another user claims the name after a check.

## 3. Final login/onboarding flow

Email → request code → code entry with destination, resend and change-email controls → private account → local work summary → explicit sync or skip → optional public profile. Enter submits both login forms. No data is uploaded by authentication or profile creation. The account remains usable without a public identity.

Wrong/expired codes, rate limits and network failures use bounded Swedish messages. Supabase can report invalid/expired codes together, so the UI deliberately avoids claiming it can always distinguish them. Mapping references: [Auth error codes](https://supabase.com/docs/guides/auth/debugging/error-codes) and [OTP verification failures](https://supabase.com/docs/guides/troubleshooting/otp-verification-failures-token-has-expired-or-otp_expired-errors-5ee4d0).

## 4. Final sync experience

Statuses: Sparat på enheten, Väntar på synk, Synkat, Synkfel, Konflikt. Local counts identify saved Research versions, outcome checks and scenarios/plans. Supported categories and local-only exclusions have separate disclosures. Retry appears when changes need attention. Conflicts retain both copies and direct the user to exports. Successful sync records a timestamp for the current login. Backup/export errors no longer falsely relabel healthy sync as failed.

Sync stays explicit. Later local changes require another sync; local deletions do not automatically remove cloud copies. Theme and cross-tab storage changes refresh status without uploading.

## 5. Final Account page

Account/email/logout → saved work and sync → optional public profile → optional publication → data/backup → privacy → collapsed deletion. Signed-in heading becomes “Ditt konto”; logged-out heading explains the account's value. Export tools are grouped under backup. Editing and publication forms start collapsed; a Research publication link opens the relevant editor.

## 6. Final public-profile flow

Optional creation includes live normalized @username preview, length/character checks, available/unavailable/reserved/blocked feedback, a prominent permanence statement, and required confirmation. A failed availability request prevents creation and explains how to retry. Server checks are still the final authority. No email/account existence lookup was added.

## 7. Profile design

Avatar, display name and username lead; bio, compact follower counts and membership context follow. ADMIN and MODERATOR use server-provided, compact role styling. User text remains text nodes and cannot create role markup. The current account offers “Visa min profil” and “Redigera profil” without a self-follow action. The in-account preview retains the existing memory-only session; opening the standalone public URL starts the normal anonymous page context.

## 8. Discovery design

Search accepts an optional leading @ and requires at least three username characters. Helpful empty/no-result copy explains public-only results. Recent analyses show company/ticker, author, date and a short thesis excerpt. No random-account discovery or feed was added.

## 9. Follow experience

Follow/unfollow uses an explicit pressed state, refreshes the authoritative count, restores focus and reports success. Failed requests keep the existing state and allow retry. Follower/following lists remain compact, paginated and public-only, with distinct empty messages.

## 10. Public Research publishing

Research links to the selected saved private version. Optional safe fields remain opt-in. The preview is headed “Det här kommer att bli offentligt” and renders exactly the selected public content. Publication remains explicit and does not upload a private revision silently. A retry reuses its request identity. A newer private version prompts explicit replacement; unpublishing preserves private versions. Public reading starts with company/ticker and author/date, identifies user authorship, and links to Research, tools, Academy and the knowledge bank.

## 11. Privacy improvements

The page distinguishes private account, optional public profile and per-analysis publication in short explanations. Exact sync exclusions remain accessible. Profile exports, including private reports, live under backup. Deletion separately offers local-device removal; provider retention remains linked rather than overloading the main page. The prior hosted cleanup result remains valid: zero synthetic profiles/analyses, two retained reports, no retained account/profile references, forced RLS and no direct client table access.

## 12. Moderation/report UX

Six existing reasons, optional bounded detail, private-report explanation, clear success and a human-readable 24-hour limit. Moderation internals are not exposed. Deactivation confirmation explains hidden public content, retained username and unaffected private account. Normal name/bio edits no longer require a second confirmation; visibility changes still do.

## 13. Mobile findings

Deterministic account/social flows were checked at 360, 390 and 430 pixels in both themes; key states were also checked at 1440 pixels. No horizontal page/dialog overflow was found. Compact counters replace full-width follower buttons. Checkbox labels and actions have at least 44-pixel target height. Long forms scroll inside native dialogs. Screenshot capture scrolls to the top to avoid off-viewport fixed skip-link artifacts in full-page images.

## 14. Theme findings

Existing Premium UI/Color System V2 variables supply surfaces, borders, text, accent and focus colors. Both themes were inspected for OTP, account, username creation, public profile/analysis, discovery, follow lists, reporting and publication. Publication confirmation received the primary-action treatment. No separate palette or design system was introduced.

## 15. Accessibility findings

Visible control names, associated labels, native forms, Enter submission, username status announcements, required confirmation, dialog focus/Escape/return, pressed follow state, mobile-menu Escape and reduced-motion behavior were exercised. Busy actions disable buttons; no provider body or stack trace is shown. Shared contrast/reflow tests passed. Automated checks and visual inspection are not a manual screen-reader certification; no physical-device or VoiceOver/NVDA test was performed here.

## 16. Security regression results

Local PostgreSQL/PGlite executes all migrations and tests A/B/anonymous isolation, forced-deny direct tables, role/username immutability, safe projections, report limits, owned snapshots, immutable publication, deactivation, deletion cascades and stale credentials. The new function rejects anonymous, missing and deleted-user identities, checks inactive usernames, and returns only a bounded status string. No table grants or existing RLS policies changed.

Browser tests inspect outgoing publication payloads and exclude private sentinels. Actual database read projections are checked separately; fixture response checks alone are not treated as authorization evidence. Credential-pattern scanning and staged CSP checks pass. The scan covers the working tree/stage, not all git history.

## 17. Files changed in this polish pass

- UI: `konto.html`, `profil.html`, `analys.html`, `upptack.html`, `social.css`, `social-ui.js`, `cloud-ui.js`, `cloud-adapter.js`, and the scoped promotion guard in `script.js`.
- Database: `supabase/migrations/202609160002_username_availability.sql`; metadata check in `supabase/verify_public_profiles.sql`.
- Verification: `scripts/test_social_browser.py`, `scripts/test_social_rls.cjs`, `scripts/browser_smoke.py`, `scripts/quality_browser.py`, `tests/cloud-sync.test.cjs`.
- Evidence/docs: this report, account documentation links, and `docs/qa/account-polish/`.

Earlier uncommitted Public Profiles V1 implementation and hosted-verification files remain in the working tree. They were not committed or discarded.

## 18. Tests and browser flows

- Full Python: 163 passed.
- Full JavaScript: 213 passed, including the new OTP error-boundary test.
- Full browser smoke: 37 passed, including two-device sync/restore/export/conflict/deletion, Research, Academy, calculators, knowledge bank, navigation, accessibility and CSP.
- Expanded deterministic social browser: passed login errors/resend, username variants and confirmation, settings/Academy visibility, own preview, search, follow/unfollow/failure, lists, publication preview/cancel/retry/republish/unpublish, report/limit, deactivate/reactivate, sync error/retry/conflict and deletion preserving local work.
- Focused hosted username verification: passed, including account cleanup and stale-token rejection; see the linked hosted record. A deletion-message regression was fixed and the deterministic social browser suite passed again.
- PostgreSQL/PGlite social authorization suite: passed with the new migration.
- Accessibility/CSP quality sweep: see `docs/qa/account-polish/quality.json` for per-page evidence; includes the four social/account shells and existing product pages.
- SEO generation/check, calendar/weekly/rules checks, credential scan, temporary staging/local references and `git diff --check`: passed.

Existing calendar checks retain informational warnings about partial upstream macro data and unpublished future schedules; no false completeness claims were introduced.

## 19. Screenshots inspected

See [screenshot audit](../../qa/account-polish/README.md). Inspection included both themes for representative account states and five existing-product reference screenshots. Findings led to reduced form density, compact follower controls, removal of the competing promotion, stronger publication confirmation and consistent focus styling. Screenshots contain synthetic data only; the HTML-like profile bio is an intentional text-rendering test.

## 20. Remaining limitations

The new availability migration is applied and its focused hosted verification and cleanup passed. The earlier full hosted V1 audit remains separate evidence. OTP sessions intentionally remain in memory: reload or page navigation requires login again for private actions. Availability is advisory, not a username reservation. Detailed live delivery timing, a physical-device pass and manual screen-reader use were not repeated. Public shell metadata stays generic/noindex as in V1.

## 21. Deferred features

Portfolio, forum, DMs, feed, likes, comments, notifications, reputation, public achievements, avatar uploads, Instagram/Discord OAuth, Pro and payments remain deferred. No related product features were implemented.

## 22. Release readiness

The polished implementation passes local release verification and the focused hosted availability verification. The additional migration gate is closed. It is ready for the owner release decision within the documented scope and limitations; this is not a claim of manual screen-reader or physical-device certification.

## 23. Exact remaining owner actions

1. No additional Supabase migration is required for this task. Both `202609160001` and `202609160002` are applied; do not rerun them.
2. Review [the hosted verification and cleanup record](username-hosted-verification.md) and the visual evidence.
3. Decide whether to authorize commit, push and deployment separately, accounting for the documented login and accessibility limits. None has been performed.

Launch copy: “Synka ditt NTM mellan enheter.” / “Skapa en offentlig profil när du vill dela ditt arbete.” / “Du väljer själv vad som publiceras.”
