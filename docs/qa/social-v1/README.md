# Public profiles V1 — local verification

Verified on 2026-09-16. Screenshots use synthetic content, including deliberate HTML-looking bio text to verify plain-text rendering. No real account data or hosted sessions are included.

- 212 JavaScript tests passed across `tests/*.test.cjs`.
- Cloud foundation: 5 Python tests passed, including local PostgreSQL execution and safe site staging.
- Social PostgreSQL/PGlite: migration execution, case-insensitive/reserved usernames, role/ownership checks, deny-by-default table access, minimized anonymous RPC responses, Academy controls, asymmetric follows, report limit, source ownership, immutable snapshots, idempotent retry, unpublish, deactivation/reactivation, deletion and stale tokens passed.
- Existing two-device cloud browser test passed on `konto.html`: explicit sync, A/B isolation, fresh restore, export, conflict and account deletion.
- Offline social browser test passed: skip/setup, required permanent-name confirmation, publication preview/cancel, Escape and focus return, selected-field request inspection, no automatic upload, private revision preservation after unpublish, profile visibility, follow/unfollow `aria-pressed`, report form, search, follow lists and mobile menu.
- Public pages checked at 360, 390 and 430px in dark/light, with no horizontal overflow. Account checked at all three widths; existing cloud browser regression also checks dark/light. Generated screenshots were visually reviewed. Reduced-motion rendering avoids capturing an intermediate theme transition.
- 6 SEO foundation tests passed. Four new pages are explicitly excluded from sitemap/indexing in the existing generator.

Browser requests were intercepted for these original local social UI tests. Subsequent real hosted verification and the passed owner-confirmed cleanup audit are recorded separately in [public-profiles-live-verification.md](../../internal/accounts/public-profiles-live-verification.md) and `hosted-results.json`. No manual screen-reader session is claimed. Owner release steps: [public-profiles-v1.md](../../internal/accounts/public-profiles-v1.md).
