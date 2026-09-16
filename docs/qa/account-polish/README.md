# Account/profile screenshot and browser audit

2026-09-16. Synthetic fixtures, local staged site, Chromium. The original visual pass used synthetic local fixtures; the subsequent focused hosted run is documented separately.

## Capture and inspection

`python -B scripts/test_social_browser.py` regenerates the account/social images. It checks page overflow at **360, 390, 430 and 1440px**, in dark and light themes, and dialog overflow and visible control labels in representative states. Saved images use 390px and representative 1440px widths. `quality.json` records the separate 36-page accessibility/CSP sweep, including existing product pages, at 320/1440px.

Images were opened and visually inspected, not just generated:

- Login and OTP: `login-dark-390.png`, `otp-dark-390.png`, `otp-light-390.png`.
- Account: `account-dark-390.png`, `account-light-390.png`.
- Username: `username-dark-390.png`, `username-light-390.png`.
- Public identity: `profil-light-390.png`, `profile-dark-1440.png`.
- System role: `role-dark-390.png`, `role-light-390.png`; the browser test also verifies that an ordinary display name of ADMIN creates no role badge.
- Lists/discovery: `followers-light-390.png`, `upptack-dark-390.png`.
- Publishing/reading: `publication-preview-dark-390.png`, `analys-light-390.png`.
- Reporting/deletion/recovery: `report-light-390.png`, `deletion-light-390.png`, `sync-error-dark-390.png`.
- Existing-product comparisons: all five `reference-*.png` images (home, Academy, Research, Min NTM, knowledge bank).

The initial V1 mobile account/profile screenshots in `../social-v1/` were inspected before edits. Final screenshots were regenerated after visual corrections. The profile bio containing literal HTML-like text is intentional XSS test content.

## Findings and corrections

- Reduced long mobile account forms using optional editor/publication disclosures.
- Moved destructive controls below backup/privacy.
- Replaced large follower buttons with compact, touch-accessible counters.
- Made identity and company headings lead the public pages.
- Removed the competing Instagram promotion from account/social surfaces.
- Used existing surface, border, accent and focus tokens in both themes.
- Made publication confirmation a primary action and username permanence prominent.
- Removed whitespace-only status decoration; avoided stale unrelated success notices during subsequent account actions.
- Hid ineffective retry controls when only immutable-version conflicts remain; the conflict explanation directs users to export both copies.
- Scrolled to page top before full-page captures to avoid screenshot artifacts from the offscreen fixed skip link.

## Evidence boundaries

This is visual and deterministic browser evidence, not a physical-device or manual screen-reader certification. Real data authorization is exercised by `scripts/test_social_rls.cjs`; the prior hosted evidence is separately documented in `docs/internal/accounts/public-profiles-live-verification.md`. The new availability migration is applied and its [hosted verification](../../internal/accounts/username-hosted-verification.md) passed, including account cleanup.

See [the 23-section release report](../../internal/accounts/account-polish-release-audit.md) for test results, remaining limitations and exact owner actions.
