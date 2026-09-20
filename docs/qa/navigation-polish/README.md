# Homepage modules and global navigation polish

Locally release-ready. No commit, push or deployment performed.

## Homepage spacing

Makro and Rapporter retain their existing surfaces, information, columns and responsive stacking. The V3 override previously removed horizontal padding and bottom breathing room. Both modules now use 20px top, 24px horizontal and 24px bottom padding; at <=600px, 16px top, 18px horizontal and 20px bottom. Headers have 14px separation from content (12px on mobile); list/status rows have 12px gaps. The top-right links have a 44px minimum touch height and can wrap at constrained widths. Empty-state and populated-state padding now agree. Partial/missing-data messages retain their text, color, visibility and resolution logic.

The approved compact hero has no further copy, typography, spacing or CTA changes. Its measured height is identical to the previous refinement at every shared test width. No financial data or Discord state changed.

## Navigation and naming

Before: Verktyg · Research · Min NTM · Lär dig · account, with Academy and Frågor & svar inside Lär dig.

After: **Verktyg · Research · Fråga NTM · Academy · Min NTM · Mer · Konto**. Konto is the persistent account destination; its existing session-aware label still becomes Logga in, Konto or @username. This preserves account behavior rather than forcing an incorrect session label. The link is now present in static HTML and reused by the existing account adapter, with no duplicate link.

Mer contains exactly Inlägg och videor, Resurser, Makro, Rapporter and Community. It reuses the existing native details/summary, outside-click backdrop, Escape handling and focus restoration. No nested submenu or new menu library. Internal `nav-learn` class names remain compatible; visible Lär dig navigation is gone.

The product-name audit changed generated global/mobile navigation, Knowledge category return links, and Knowledge HTML/OG/Twitter title suffixes. Landing title is now “Fråga NTM | Noll till Miljoner”; answer titles retain the question and use “| Fråga NTM”. Existing Knowledge breadcrumbs, main heading, accessible product context and Connected Experience links already used Fråga NTM and remain unchanged. Generic “frågor och svar” descriptions of category content are not product names and remain. Historical documentation, slugs, IDs and content contracts were not globally replaced.

All URLs are preserved, including `fragor-svar.html`, canonical answers, category pages, query/hash deep links and redirects. A comparison against HEAD verified unchanged canonical and OG URLs in all 207 regenerated HTML files. The Knowledge landing main element is byte-identical to HEAD. Homepage metadata and the previously corrected Instagram/article semantics are unchanged.

## Active states and responsive behavior

Exact landing destinations use `aria-current="page"`. Knowledge answers and category pages highlight Fråga NTM with `aria-current="location"`; Academy lessons/activities highlight Academy. Calculators highlight Verktyg; public profiles/analyses/discovery highlight Research. Articles mark Inlägg och videor inside Mer. Makro/Rapporter mark their exact link inside Mer, and Mer indicates it contains the current section. At most one navigation link is current.

The full desktop hierarchy fits at 1201, 1280, 1440 and 1920px, including a long account-label fit probe. Navigation font size remains .9rem. Long desktop usernames are bounded with ellipsis without changing the accessible text or destination. All link targets have >=44px height.

The shared mobile layout now applies through 1200px, avoiding a cramped row at 1024px. It retains the existing hamburger, theme control and one Mer disclosure. Links are full-width, and the menu scrolls within the viewport when needed. No horizontal overflow at 320/360/390/430/640/768/1024/1200/1201/1280/1440/1920px in either theme. The breakpoint adjustment is limited to navigation; the logo, header height and hero layout remain intact.

## Screenshot reviews

Pass 1 inspected the actual local homepage, empty modules, desktop Mer and mobile navigation. The new hierarchy and insets fit the existing V3 system. Review/validation then identified an inherited empty-state header margin that still compressed the gap and a light-theme specificity rule that hid the expanded mobile menu after a theme change. Both were corrected. Link targets were normalized to at least 44px.

Pass 2 inspected dark/light desktop headers, mobile menus at 360/390/430, tablet/intermediate layouts, homepage hero, empty and populated modules, active Mer sections and Fråga NTM identity. Populated screenshots use the existing `ntmDate=2026-09-23` override and published local records, including the unmodified partial-data notice. Expansion from three to seven earnings rows passed. Screenshots under `pass1-*` and `pass2-*` retain the actual local pages; some show keyboard focus intentionally.

## Validation

- `validate_release.py`: passed Python and JavaScript suites, SEO generation check, Knowledge editorial/history, calendar, weekly data, rules, security/CSP, staging and local references. Python: 167 run, one existing skip. JavaScript: 312 passed, two existing database-integration skips, zero failures.
- `browser_smoke.py`: all 41 passed, including homepage weekly/current-day behavior, calculators/provenance, Research, Min NTM, Knowledge/Academy journeys, theme switching, keyboard and reduced motion. Expectations were updated only for the approved navigation order and five Mer links.
- `navigation_polish_browser.py`: 24 width/theme combinations; 15 page families at desktop/mobile; active-state exclusivity, account fit, module insets, populated earnings expansion, keyboard Tab/Enter, Escape/focus return, outside click, touch height, no overflow and CSP passed.
- `quality_browser.py`: accessibility/CSP checks passed across 41 representative routes, both themes and narrow reflow; `quality.json` contains local measurements.
- `test_auth_browser.py`: real SDK with synthetic Auth passed session restore, reload/restart, refresh, logout, deletion and no silent upload.
- `test_social_browser.py`: offline Public Research/account contracts passed, including privacy, previews, request boundaries, menu behavior and mobile/theme overflow. Fresh screenshots were copied here; historical tracked QA screenshots were restored.
- `check_workflows.py`: passed actionlint. `git diff --check`: passed.
- Static naming audit found no old Frågor & svar product labels or Lär dig navigation in production root HTML. Generated-output checks cover all shared headers, not just sampled browser pages.

## Files and limitations

Source changes: `premium.css`, `ntm-ui.js`, `scripts/build_seo.cjs`, `scripts/build_knowledge.cjs`. Shared navigation/title output regenerated across 207 root HTML pages. Updated existing checks: `tests/test_seo_foundation.py`, `scripts/browser_smoke.py`. Added focused verification: `scripts/navigation_polish_browser.py` and this QA folder. The prior uncommitted compact-hero refinement and its evidence are retained.

Chromium is the tested browser. 640/320 CSS-pixel layouts cover equivalent 200%/400% reflow at a 1280px base; native browser zoom and manual screen-reader testing were not performed. Third-party widgets are excluded from deterministic screenshot/quality runs. Auth/Public Research tests use local fixtures, not hosted writes. Existing partial upstream macro and unpublished 2027 schedule notices remain; no data or verification dates were changed to silence them. Existing optional database-integration skips remain outside this local gate.
