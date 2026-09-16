# Research unpublishing and discovery

## Production action completed

The user requested unpublishing analysis `043e2bd8-74a0-4405-b712-abbefca87efb` (NVIDIA CORP). OTP authentication confirmed a normal `user` profile and that this profile owned the exact requested analysis. The existing `unpublish` RPC was then called for that ID only.

Hosted verification passed 12 checks:

- Ownership and non-admin role were confirmed before mutation.
- Anonymous `analysis` returned `null` for the ID.
- Anonymous profile `analyses` and discovery `recent` lists excluded the ID, including pagination.
- The actual production direct URL displayed “Analysen finns inte eller är inte offentlig.”
- Actual production profile and Upptäck pages omitted the analysis.
- Private hosted Research export was exactly unchanged before/after.
- The verification browser's local Research storage was unchanged; it was a fresh browser, not the user's existing browser profile.
- No private-upload or account-deletion request occurred.
- Owner-only publication history retained the record with `hidden=true`.

The account was preserved. Only public availability of the specified analysis changed. No frontend deployment, commit, or push was performed.

## Server semantics

No new migration is needed. `unpublish` already marks the owned public snapshot hidden, and all public retrieval paths exclude hidden snapshots. This removes the analysis from the profile, discovery, anonymous API lookup, and direct public URL. It does not delete private Research or alter its saved revisions. Owner-only publication history is not a public retrieval path.

## UI changes

- Replace “Ta bort från profil” with contextual **Avpublicera** and a confirmation titled **Avpublicera analys**.
- Exact confirmation: “Analysen tas bort från din profil och Upptäck Research och är inte längre offentligt tillgänglig. Din privata analys finns kvar.”
- Unpublished/private source: **Publicera analys**.
- Published source: **Publicerad**, **Visa analys**, **Avpublicera**. Hide the redundant publish action.
- A newer saved private revision additionally shows **Nyare privat version** and **Uppdatera publicerad analys**. Updating previews that newer saved revision, even if another historical revision was previously selected.
- Unpublishing remains available when the source is absent from the current device.
- Account history labels hidden snapshots **Avpublicerad** and avoids linking them to unavailable public pages.
- Remove the small discovery link beside the publication action.
- Add a restrained local **Analysera / Upptäck Research** navigation row to Research and Upptäck, with an active-page indicator. Global navigation is unchanged.

## Validation

Focused social browser and PostgreSQL authorization tests passed before the final archive gate. Added coverage checks contextual actions, cancel versus confirm, exact confirmation, unpublish without a local source, restored publish action, journey navigation, and anonymous exclusion from direct lookup/profile/discovery.

The isolated Git-archive release gate passed: 166 Python tests, 216 JavaScript tests, staging, generated artifacts, security checks and CSP. Focused social browser tests and PostgreSQL authorization passed. The complete browser suite passed 37 tests; accessibility/CSP checks passed all 36 pages. Mobile navigation was visually checked on Research and Upptäck. The production unpublish action was verified independently of the frontend release.
