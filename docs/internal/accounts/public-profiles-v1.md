# Account Experience & Public Profiles V1

## Delivery status

Implemented in the checkout, with additive migration and local PostgreSQL/browser verification. The owner has applied the hosted migration. Real hosted application/API verification and the owner-confirmed physical-cleanup audit have passed. See [hosted verification](public-profiles-live-verification.md) for scope and evidence. **No site deployment, commit or push.**

Subsequent account polish is documented in [the release audit](account-polish-release-audit.md). That pass adds a separate authenticated availability function in `202609160002_username_availability.sql`; this migration is now applied and its [focused hosted verification](username-hosted-verification.md) passed, including cleanup. The existing `202609160001` hosted evidence refers to the original V1 baseline.

The supplied brief stops after section 48's first username-test bullet. All preceding feature requirements informed this implementation.

## Product and routes

- `konto.html`: the existing OTP adapter and sync engine, account/email, explicit sync and restore, session sync time, backup/export, deletion, optional profile setup and management, Research publication.
- `profil.html?u=username`: public identity, default initials avatar, role badge, visible Academy summary, follower/following lists, follow and report entry points, published analyses.
- `analys.html?id=public-snapshot-uuid`: immutable public content, author and publication date. The identifier names a public analysis, never an auth identity.
- `upptack.html`: explicit username-prefix search (minimum three characters) and recent public analyses, bounded to 20 per page. No all-user directory, rank, popularity ordering or private-account search.
- Research's “Publicera på min profil” carries only a local ticker/version reference to Account. A local revision must be explicitly synced using the existing cloud flow before publication. Publishing itself never uploads private records.

Account and profile remain separate. No login callback creates a profile or uploads data. Profile setup is skippable. The existing memory-only login policy is preserved: navigating/reloading requires a new login for private actions. Public follow/report links open Account with the target username, where the user signs in and acts. This avoids adding persistent tokens or a second auth system. A private-account-only user can report without creating a profile; following requires an active public identity.

The compact main-navigation entry reads “Logga in” while signed out and the username or “Konto” during the active account session. Public pages remain anonymously readable.

## Data boundary

Migration: `supabase/migrations/202609160001_public_profiles.sql`.

Private base tables use ENABLE/FORCE RLS and **no policies or API table grants**, so direct access is denied. A small pair of owner-owned, security-definer functions (`ntm_social_read`, `ntm_social_write`) performs explicit authorization with an empty search path. This is intentional: granting SELECT on a profile row would also expose its private ownership columns. The read RPC instead returns a fixed JSON projection. Helper functions are not executable by client roles.

Public profile representation: username, displayName, bio, role, memberSince, visible level/XP, counts. `memberSince` is the public identity's creation date. No owner/profile UUID, email, auth metadata, private revision reference, detailed Academy history or report data is public. Snapshot responses include only public analysis ID, public content, publication date and that public author representation.

All writes derive ownership from `auth.uid()` and check the auth user still exists. A per-account transaction lock serializes writes, reports and account deletion. Clients cannot pass an owner, change roles, change usernames, unsuspend themselves or modify another user's snapshot. Public search is a literal prefix (`starts_with`); `_` is not interpreted as a wildcard.

The snapshot allowlist is company, ticker, thesis, analysisDate and explicitly selected assumptions, risks, falsification, sources. All are bounded strings. Optional fields start unselected. No valuation export in V1; the brief allows this to remain optional. Source references are plain text, not automatically clickable external URLs. Display uses text nodes, including HTML-looking input. The database rejects unknown/nested fields. Selecting ordinary free text remains the author's responsibility; preview makes that choice explicit.

Snapshots are frozen by a database trigger. Updates require a new preview and new row; the earlier publication becomes hidden and remains in internal history. A request UUID makes retries of the same preview idempotent. A replay never reactivates an unpublished snapshot. Private revision changes do not update any public content. Account shows a newer-private-version indicator. Unpublish changes only public visibility.

Deactivation hides profile, analyses, incoming/outgoing lists and counts; the username and relationships remain. Reactivation restores visibility, except individually unpublished or moderated analyses. Suspension is owner-controlled and cannot be reversed in profile settings.

Deletion uses the unchanged `ntm_delete_account`: auth deletion cascades the profile, all authored snapshots, both sides of follows and existing private records. Reports retain their moderation content, with deleted reporter/target foreign keys set to NULL. Report detail can itself contain personal information, so this is **not** a claim of full textual anonymization. The existing explicit local-delete checkbox governs browser data. Social export is a separate private JSON download, including hidden authored publications and own reports; it is not a restore/import format.

## Owner migration and release procedure

The owner has already applied the new migration in this project. Do not rerun it. The steps below remain the setup/release procedure for a fresh environment; current verification is recorded in the hosted report linked above.

1. Apply existing foundation migrations first if setting up a fresh nonproduction project. Existing verified production accounts need only the new additive migration.
2. Run local checks below. Review the new migration in Supabase SQL Editor as database owner, then apply `202609160001_public_profiles.sql` to a nonproduction project first. Do not run it twice; it is a one-time transactional migration.
3. Run `supabase/verify_public_profiles.sql` as owner. Confirm direct table/helper permissions are false, RLS flags true, and only the two entry RPCs have the intended grants. Check the original cloud audit remains satisfactory.
4. Use the existing public-config staging workflow (`scripts/stage_site.py`, then `scripts/configure_cloud.cjs --site <separate-staged-directory>` with the project's publishable key). It derives exact-origin CSP permissions for the four pages loading the adapter. Never put service-role credentials in frontend code. Source `cloud-config.js` stays disabled.
5. In two fresh browser contexts with disposable accounts A and B, exercise the scenarios below against the nonproduction hosted project. Inspect actual network responses and confirm the public field list above. Only after that review should the owner choose when to apply the additive migration to production and separately authorize site deployment.

Hosted acceptance scenarios: account-only A remains absent from username search; reserved and mixed-case duplicate names fail; B cannot change A's profile or role through REST; direct table reads fail for anon/A/B; anonymous public RPCs work; self/duplicate follows are prevented; lists hide inactive participants; same reporter/target fails within 24 hours; private fields never enter the public snapshot request/response; publishing an unsynced or another account's revision fails; repeated preview request returns the same ID; unpublish and deactivate hide direct URLs; reactivation restores only intended content; account deletion cascades public content and rejects stale-token writes. Include existing sync/conflict/restore/export/deletion regression flow. Do not run destructive account-deletion tests against real member accounts.

The existing provider/log review must also cover new RPC bodies, particularly bios and private report details. Do not enable request/statement/parameter logging of these payloads when applying the migration. This file does not change database logging settings or make a new claim about hosted log retention.

## First administrator

Role badges are server data; no username grants privileges. For an already-created profile, owner SQL is:

```sql
-- Replace the email in the OWNER'S SQL editor; never ship this to a browser.
update public.ntm_public_profiles p
set role = 'admin'
from auth.users u
where p.owner_id = u.id and u.email = 'OWNER_EMAIL_HERE'
returning p.username, p.role;
```

Verify exactly one expected profile is returned. Moderator assignment uses `role='moderator'`. These roles are a trusted foundation and visible badge; V1 report inspection/action happens through the database owner, not a public admin dashboard.

If the first owner specifically wants a **reserved** username before profile creation, first identify the correct auth user in the owner console, then use this one transaction with deliberate values:

```sql
begin;
lock table public.ntm_username_rules in access exclusive mode;
-- Replace all three values below. Lowercase, valid username; existing account UUID.
delete from public.ntm_username_rules where term = 'chosen_reserved_name' and kind='reserved';
insert into public.ntm_public_profiles(owner_id,username,display_name,role)
values ('00000000-0000-0000-0000-000000000000','chosen_reserved_name','Chosen display name','admin');
insert into public.ntm_username_rules(term,kind) values ('chosen_reserved_name','reserved');
commit;
```

The table lock prevents concurrent ordinary profile creation from using the temporary reservation exception; rollback restores it if anything fails. The actual handle is never assumed in JavaScript. Already-confirmed usernames are immutable, including through ordinary owner UPDATE. An exceptional future rename needs a reviewed migration covering identity links and impersonation; no self-service rename or general bypass switch is implemented.

## Moderation and retention

`ntm_username_rules` is owner-maintained. Reserved system names match after lowercase/underscore normalization. A short blocked-term list rejects explicit slur/abusive identity strings. It is deliberately narrow; it is not a general profanity/political-opinion filter. Bios and analyses do not have a broad profanity filter. NTM can remove illegal content, threats, targeted harassment, scams, impersonation and clearly abusive material using suspension or per-analysis moderation.

Initial owner workflow:

```sql
select r.id, r.reason, r.detail, r.created_at, r.status,
       p.username as target_username
from public.ntm_profile_reports r
left join public.ntm_public_profiles p on p.id=r.target
where r.status='pending' order by r.created_at;
-- Use a reviewed report ID and the affected username/public analysis ID:
update public.ntm_profile_reports set status='reviewed' where id='REPORT_UUID';
update public.ntm_public_profiles set suspended=true where username='TARGET_USERNAME';
update public.ntm_public_analyses set moderated=true where id='PUBLIC_ANALYSIS_UUID';
-- Finish the report with status='dismissed' or status='actioned'.
```

Reporter identities and report counts never enter a public response. The per-reporter lock enforces the rolling 24-hour limit across concurrent requests, not just calendar days. Optional detail is limited to 500 characters. Owner should review pending reports regularly and purge ordinary closed reports after 90 days, using `created_at`, with pending reports reviewed within that window. There is no scheduled job installed by this migration; arrange and verify that operational cleanup before launch. Retention beyond the ordinary window requires a documented case-specific reason. Do not publish report text in analytics or public moderation notes.

## SEO, analytics and future scope

All four shells use `noindex, follow`, and are excluded from sitemap additions in the existing SEO generator. Query-string routes work on GitHub Pages without a 404 router or framework migration. Metadata and canonical links identify only the generic static shells; no user/profile content is automatically indexed or presented as editorial metadata. Any future indexable analysis requires per-analysis canonical URLs and substantive content rendering first.

Six coarse events are added to the existing allowlisted memory-only event system: `public_profile_created`, `profile_followed`, `public_analysis_published`, `public_analysis_unpublished`, `profile_report_submitted`, `user_search_used`. Call sites pass no usernames, text, identities or reports. Existing metadata filtering rejects arbitrary fields.

The profile's separate internal ID and timestamped asymmetric follow edge can support later feeds/notifications. No payment, DM, forum, feed, comment, reaction, notification, portfolio, leaderboard, reputation, upload/storage or OAuth-provider feature was added. Future portfolio visibility should be explicit `private`, `holdings only`, or `holdings + weights`; exact SEK values must not be assumed public.

## Verification

```text
node --test tests/social-core.test.cjs tests/cloud-sync.test.cjs tests/cloud-config.test.cjs
PGLITE_MODULE=<installed @electric-sql/pglite/dist/index.js> node scripts/test_social_rls.cjs
PGLITE_MODULE=<same module> node scripts/test_cloud_rls.cjs
python -B scripts/test_social_browser.py
NTM_BROWSER_CHANNEL=chrome python -B scripts/browser_smoke.py BrowserSmoke.test_cloud_account_foundation_two_devices_and_isolation
```

The PGlite tests execute real PostgreSQL grants, RLS, functions, constraints and cascades; only Supabase Auth claims/users are fixtures. Browser social tests intercept hosted requests and verify UI/payload contracts, not hosted RLS. They cover opt-in/skip, required username confirmation, preview before publication, Escape/focus restoration, allowlisted payloads, no silent upload, private-history preservation, visibility controls, follow/unfollow state, report submission, search/lists, text-node XSS handling and mobile menu. Mobile overflow checked at 360/390/430 in dark/light for public pages. Screenshots: `docs/qa/social-v1/`. Existing two-device cloud browser test now targets Account and still covers sync, cross-account isolation, fresh restore, conflict, backup and deletion.

Limits: hosted test results and their scope are recorded in the separate hosted report; no manual screen-reader session claimed. Last sync time covers the current sign-in session. Academy summaries are user-shared local values, not certified achievement data. Offset pagination is bounded, not a general export/discovery API. No anonymous reporting. Network errors leave preview open for retry; publication retries reuse the preview's request ID.
