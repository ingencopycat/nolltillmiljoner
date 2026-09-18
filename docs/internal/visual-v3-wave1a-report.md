# NTM Work Audit 2.0 — Wave 1A implementation report

Implemented locally, 2026-09-17. Scope is the Research company overview, private thesis workspace and current Public Analysis reader. No deployment or real publication was performed.

## Before: the presentation problem

The required browser audit preceded product edits. See [baseline audit](visual-v3-audit.md) and [screenshot index](../qa/visual-v3/README.md).

The selected company appeared after a large pill inventory and permanent manual-entry panel. Equal-size financial cells, nested editor cards, repeated instructions and lifecycle controls competed for attention. The public report was a generic bordered card, with dates as content sections and little claim ownership. Light mode retained boxes that dark mode had partially removed.

At 390 px, the baseline company heading began at approximately **705 px dark / 714 px light**. Final captures put it at approximately **174 / 182 px**, over 530 px earlier. At 360 px it moved from approximately 782–791 px to 174–182 px. These are observed viewport coordinates for the local fixture, not a general performance metric.

## System, typography and surfaces

[Visual System V3](../visual-system-v3.md) defines principles, roles, responsive composition and anti-patterns for subsequent work. Shared palette and spacing remain in `premium.css`; the two Research pages opt into scoped V3 composition. There is no bulk redesign of other pages.

Added named roles for display/page/data/metadata/financial type, 720 px reading / 800 px editing / 1248 px data widths, dialog depth, chart color and motion. Existing spacing, colors and semantic status roles are reused. System fonts and tabular numerals remain; no font or icon package was added.

The selected-company header, TTM metrics, thesis, review/history/outcome panels and public report no longer rely on outer cards. Directory companies retain cards as selectable entities. Forms retain input boundaries; disclosures and document transitions use restrained separators. Light and dark now use the same surface hierarchy.

## Company overview and selection

A compact **Byt bolag** disclosure replaces the permanent inventory. It contains labelled search across the existing twelve supported companies, a result-status announcement, ordinary keyboard-accessible links and the manual-thesis entry. It does not imply broader coverage. Escape closes the picker and returns focus.

Company identity comes first. Industry/ticker remain available; source freshness and CIK are progressively disclosed. Existing coverage warnings remain visible. The primary action responds to saved state: formulate, view current thesis, review due assumptions or inspect comparable changes. Unsupported and manual company behavior remains.

TTM revenue receives the largest number; supporting metrics use smaller, aligned tabular figures. Mobile uses a leading result and two supporting columns. All original metrics and source buttons remain behind **Visa alla nyckeltal**. No amount, unit conversion, formula or comparability rule was changed.

## Chart and provenance

One overview chart shows **annual revenue**, chosen because it explains historical business scale using existing verified data without introducing prices or forecasts. It uses the existing validated USD annual records, fiscal periods and discrete bars. SoFi is labelled with net revenue. Missing years remain empty slots; an unverified or insufficient series does not render. An exact-value table and per-period source buttons provide the alternative to the visual. Deeper financial charts and tables remain available.

The source dialog now begins with a human explanation and retains value, period, filing information and calculation. XBRL concept, accession and method details are disclosed further down. Original provenance objects remain untouched. The heading is **Källa och beräkning**.

## New thesis and existing workspace

The initial task is three questions: belief, falsification and next review. Assumptions, risks, notes and report questions move into **Fördjupa tesen**. Existing IDs, values, save handlers and immutable-version semantics are preserved. New save copy is **Spara tes**; subsequent saves use **Spara ny version**.

Saved work gains a compact version/review summary and links to review and history. Review decisions, history and outcomes have contextual disclosures. Deep links reveal their ancestors. All-history deletion is grouped with version management rather than the main save row. Existing destructive confirmations remain.

The state model is unchanged: there is no invented autosave or persistent draft. A changed comparable-data baseline can lead to **Se vad som förändrats**; a due thesis or assumption can lead to **Granska antaganden**. Publication still uses the existing explicit private-to-public workflow and selected saved revision. New private revisions never silently update a published report.

Empty outcome sections disappear when neither a thesis nor an archived observation exists. Archived evidence remains available after source-version deletion. Manual theses expose the new history/review wrappers without exposing stock-data features. Existing review decisions, restoration, checkpoints, exports and process/outcome separation remain tested.

## Public Analysis

The report uses an editorial reading width, company/ticker identity, author profile link, publication date and separate analysis date. The outer card is removed. Current public fields become semantic sections with **Författarens bedömning**, **Författarens antagande** or author-source ownership. The non-endorsement statement remains explicit.

Reported-data and calculated-data styles are documented for later adoption, but no unsupported public data blocks or version numbers are fabricated. All author-supplied text still enters through text nodes and the existing public allowlist. Author editing/unpublishing remains in the existing private Research/account management flow; public reading acquires no editor controls.

## Browser review and iteration

There were three intermediate rendered review sets and a final set, beyond the baseline. Each covers desktop and 360/390/430 px in both themes. The final set also captures chart, filtered selection, source dialogs and due review. See the [QA index](../qa/visual-v3/README.md).

1. Initial implementation: reduced setup and cards, but exposed old copy, type/specificity conflicts and incorrect chart sizing. Corrected these.
2. Second review: improved density and financial hierarchy; restored mobile source access and removed doubled form spacing.
3. Third review/adversarial pass: found the legacy light-theme card override, a generic bright-blue public link, a narrow source-dialog heading, an oversized metric-info control and a canvas resize overflow. Fixed them and captured again.

Final assertions found no page overflow in the capture set. The company selector, native disclosures, labelled controls, source dialogs, reduced motion, financial scroll regions and existing keyboard/focus behavior remain covered. The UI test steps now open new disclosures with actual summary clicks; existing financial, privacy and lifecycle assertions were retained.

## Validation

All local equivalents of the CI release-validation commands passed:

| Check | Result |
| --- | --- |
| `scripts/validate_release.py` | 166 Python tests (1 existing skip), 222 Node tests (221 pass, 1 existing skip); SEO, rules/calendar, security scanning, clean diff checks and staged local references passed |
| `scripts/browser_smoke.py` | 38 real Chromium tests passed, including Research/valuation/history/lifecycle/manual/exports, cloud state, deep links, CSP, contrast and responsive behavior |
| `scripts/test_social_browser.py` | Offline publication/profile reader flows, opt-in/preview/cancel, XSS text handling, unpublish/privacy and 360/390/430 px theme checks passed |
| `scripts/test_auth_browser.py` | SDK persistence, reload/restart, refresh, cross-tab logout, account deletion and offline behavior passed |
| `scripts/test_social_rls.cjs` | All migrations and authorization checks passed against local PGlite 0.5.8 |
| `scripts/quality_browser.py` | 36-page accessibility/CSP and payload sweep passed |
| `scripts/check_workflows.py` | actionlint workflow validation passed |
| `scripts/visual_v3.py final` | Screenshots, viewport assertions, missing-year chart gap, unverified-series suppression and stock-input immutability passed |

No hosted/RLS configuration was modified, and these local checks do not claim live production verification. Existing calendar diagnostics still explicitly report partial upstream macro coverage and unpublished future schedules; the design work does not change those data facts.

## Performance and scope preservation

Measured cold local payloads in [payload comparison](../qa/visual-v3/payload-comparison.json): Research increased from **1,515,988 to 1,541,221 decoded bytes** (~25 KB, 1.7%; 28 → 30 requests). Public shell increased from **770,859 to 786,434 bytes** (~15.6 KB, 2.0%; 14 → 15 requests). The two new assets total approximately **5.8 KB gzipped**. Local timings are recorded but are not field Core Web Vitals or evidence of a speed improvement.

No new libraries, fonts, images or animation framework. No financial data files, formulas, snapshot/history contracts, publication allowlists, cloud architecture, migrations/RLS or account behavior changed. Other product areas and global navigation were not redesigned. No financial correctness issue was discovered in this work.

## Final independent-style critique

The first screen now establishes the investment and the editor begins with the user's reasoning. The report is more coherent, but presentation is not the same as a complete premium research product.

- Advanced assumptions, valuation and outcome inspection still use conventional form/table layouts. They are accessible on demand, but an eventual focused review experience could reduce repeated controls further. That requires its own interaction audit.
- The current public schema remains sparse: a short author submission still produces a short report. Rich financial evidence, structured citations and version-aware public reporting belong in Public Research V2; fabricated content would weaken trust.
- The chart's usefulness is limited by the supplied verified annual history (three NVIDIA years in the fixture). It deliberately offers no invented longer history or price comparison.
- Mobile puts the company and key numbers on the first screen; chart and editor follow below. All four destinations and detailed sources cannot occupy one phone screen without making the information harder to read.
- Global brand chrome and some deeper legacy controls retain their existing character. The laboratory proves a calmer financial/editorial direction, but a coherent whole-site rollout still needs separate work.
- Existing page payloads remain substantial, particularly shared legacy scripts/styles and chart/vendor code. This wave adds modest presentation assets rather than solving that pre-existing loading budget.

Reasonable within-scope defects from that critique were fixed: residual light cards, unnecessary header clutter, visible empty outcomes, competing deletion, source jargon, accidental source hiding, native-hidden display conflicts and responsive canvas overflow. The remaining points are recorded rather than concealed behind a claim that the entire product is now finished.
