# Research publication repair — verification record

## Status

**The local frontend passed hosted verification using the existing dedicated non-admin account that reproduced the issue.** The owner manually applied the migration. No commit, push, migration application, or frontend deployment was performed by this agent. The deployed production frontend remains unchanged, so the production rollout is still pending. The exact disabled/nonfunctional state in the owner's original browser session was not captured and cannot be conclusively attributed retrospectively.

## Findings and limits

- The deployed `research-publication.js` redirected a saved revision to Account. The deployed publication JavaScript matched the checkout after line-ending normalization.
- The existing migration's SQL definition requires a matching private cloud revision before accepting `publish`. This independently prevents local-only publication. Syncing cannot fix the separate preview interaction issue because the preview itself does not call `publish`.
- Account's cloud and social components both disabled and later restored overlapping button sets. Interleaving operations can restore a stale disabled state. Their locks now cover their own controls. This is a code-level defect; it has not yet been established as the exact cause in the owner's production session.
- The old composer also depended on native form validation and mapped snapshot validation failures to generic account errors. The new composer shows explicit publication validation messages, including the 30-character public-thesis minimum.
- Previous browser fixtures supplied a valid long thesis, bypassed CSP, and accepted publish requests without the hosted cloud-source rule. They were not proof that the real hosted normal-user flow worked.

## Architecture and UX

Research reads the specifically selected saved revision through `NTMThesisStorage`. It opens its own dialog, identifies the revision/date, distinguishes unsaved edits, allows only the existing public fields, previews an immutable snapshot, and requires explicit Publish. It never invokes the private sync engine or sends a private revision payload.

The dialog supports OTP login. Missing, inactive, and suspended public profiles have distinct messages. Corrupt local storage fails closed with a backup message. Profile setup remains on Account; the publication composer does not.

Success provides analysis and profile links. Research displays existing publication state and a newer-private-version notice. Replacement and unpublishing are explicit. Account retains a count, public links, and links to manage the source in Research. Discovery remains available.

## Migration audit

Run `supabase/migrations/202609170001_local_research_publication.sql` in full. It is a transactional `CREATE OR REPLACE FUNCTION public.ntm_social_write(text,jsonb)` migration with the existing signature and return type.

The only function-body change replaces the private-record existence requirement in the publish branch with bounded string validation of source references. These references are client correlation identifiers, not server-attested proof of local storage or ownership. Public ownership continues to derive from `auth.uid()` and its profile. Replacement and unpublish still enforce the current profile's ownership.

No table, policy, grant, private-sync function, deletion function, public projection, snapshot allowlist, or stored record is changed. Existing synced requests and idempotent retries remain compatible with the deployed frontend. Applying this migration does not fix or deploy the old frontend.

Compatibility was verified against the repository's existing migration chain. No privileged inspection of the hosted function definition was performed; out-of-band database changes are outside that comparison.

`scripts/test_publication_migration.cjs` creates the previous schema, inserts private records and an existing publication, applies the new migration, and compares API data and catalog state exactly. Function OIDs, owners, ACLs, security settings, table grants, and RLS remain identical. It also exercises old-request retry, local-only replacement, private-record preservation, unpublishing, and deletion.

## Validation

- Migration upgrade, private-cloud PostgreSQL authorization, and social PostgreSQL authorization passed.
- Research JavaScript workflow: 70 tests passed.
- Configured-stage social browser checks passed with CSP enforced: local-only preview/publication, allowlist, no private upload, unsaved exclusion, explicit replacement/removal, prerequisite states, keyboard/pointer, normal/admin preview, mobile sizing and theme checks.
- SDK auth lifecycle passed on rerun. An earlier concurrent run timed out waiting for an expired-session refresh response.
- Git archive prepared with `core.autocrlf=false`, overlaid with proposed changes. The exact Actions Python command passed: 166 tests. `validate_release.py` passed: 166 Python tests and 216 JavaScript tests, generated artifacts, security scan, staging and CSP.
- Full browser suite: 37 tests passed on isolated rerun. Accessibility/CSP: 36 pages passed. Workflow validation: actionlint passed. One initial concurrent browser run failed a Research table resize assertion; that test passed in isolation and in the complete rerun.

The first archive attempt used the Windows Git conversion setting and changed archive line endings, including pinned vendor bytes. The archive was rebuilt with conversion disabled. Vendor files and expected hashes were not changed.

## Hosted verification completed

`scripts/research_publication_hosted.py --dedicated-test-account` stages the local frontend against the configured hosted project. It accepts the dedicated email and OTP through stdin, then verifies unsynced publication, anonymous reads/profile listing, public API minimization, no private cloud writes, unchanged public content after private editing, explicit replacement, unpublish, optional explicit sync and republish, and dedicated-account cleanup. It uses no admin credentials and deploys nothing.

The owner confirmed successful manual application of the migration (no rows returned) and supplied the existing dedicated non-admin account. The local configured frontend used real hosted Supabase Auth and RPCs, with no network mocks, admin credentials, or CSP bypass. Result: **22 checks passed; one dedicated test account deleted during the requested cleanup.**

Verified in the hosted run:

1. Research UI created a saved local revision; OTP login succeeded.
2. The existing public profile had role `user`, was active, and was not suspended.
3. The local source had no private cloud receipt.
4. Keyboard preview and explicit publication succeeded inside Research.
5. Anonymous API reads returned exactly the four selected public fields.
6. Unsaved editor text was excluded and the saved private source remained unchanged.
7. Private cloud records exactly matched their pre-test baseline; no `ntm_put_records` request occurred during local-only publication.
8. The profile's public analysis listing included the new publication.
9. A newer saved private revision left the public snapshot unchanged.
10. Explicit republishing replaced the earlier visible public copy.
11. Unpublishing made the public copy unavailable and preserved local Research.
12. Optional, explicit Account sync uploaded the source. Publishing that synced source then succeeded without another private-cloud mutation.
13. Public analysis/profile/list APIs contained no private-note sentinel, unsaved text, source references, owner ID, or session token.
14. A fresh anonymous browser displayed the public analysis and profile entry.
15. Browser error and CSP-violation collections were empty.
16. Requested dedicated-account deletion succeeded; the test profile and publication became unavailable, and local Research was preserved through deletion.

The harness was adjusted to accept an existing profile and compare private records with their pre-test baseline. Its first login wait used `wait_for_function`, which CSP blocked. This test-harness error was fixed with a DOM assertion; a fresh OTP was used for the successful run. CSP remained enforced throughout the final run. No production credentials, OTPs, or private account data are recorded in this report.

## Changed files

- `research-publication.js`: Research-native composer, prerequisites, OTP, immutable preview, explicit publication/update/unpublish, saved-source checks.
- `research.html`, `research.js`, `social.css`: dependencies/CSP discovery, local revision-state refresh, dialog presentation.
- `konto.html`, `social-ui.js`, `cloud-ui.js`: compact Account publication management and separate ownership of button locks.
- `supabase/migrations/202609170001_local_research_publication.sql`: backward-compatible publish-source rule change.
- `scripts/test_social_browser.py`: Research-native regression flow, prerequisites, unsaved exclusion, mobile/theme/keyboard/admin checks, enforced CSP.
- `scripts/test_social_rls.cjs`: local-only publication, bounded references, profile ownership, no private writes and account isolation.
- `scripts/test_publication_migration.cjs`, `tests/publication-migration.test.cjs`: populated-schema upgrade and catalog/API preservation.
- `tests/research-workflow.test.cjs`: minimal DOM fixture support for the new dialog; existing financial assertions remain intact.
- `scripts/research_publication_hosted.py`: repeatable interactive hosted verification and cleanup.
- This report: evidence and remaining limitations.

Protected stock JSON files and Phase 2 expected hashes were not changed.

## Release decision and remaining limits

Private cloud sync is no longer required. The new Research-native flow is verified against the real hosted backend with the reported dedicated normal-user account. Existing release, browser, authorization, and accessibility/CSP results are listed above; product code did not change during hosted verification.

The production website still serves the old frontend because deployment was explicitly prohibited. The original deployed-site incident therefore cannot be called rolled out or resolved in production yet. Also, although overlapping Account button locks and poor validation feedback were addressed, the exact cause of the owner's original preview state remains unproven without a trace of that original browser state. The successful hosted run demonstrates the replacement flow works; it does not manufacture that missing historical diagnosis.
