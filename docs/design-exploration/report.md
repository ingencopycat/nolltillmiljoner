> HISTORICAL EXPLORATION. Owner selection is final: A2.1 art direction + A2.2 typography. The sole canonical specification is docs/visual-system-v3.md and the active prototype is canonical/prototype.html.

# NTM Visual System V3 — three directions for owner review

Completed design exploration, 18 September 2026. No direction selected. Production files, financial data and contracts are unchanged. Nothing committed, pushed or deployed.

## Open locally

Run in PowerShell:

```powershell
Set-Location 'C:\Users\Mirne\Desktop\investment-site'
python -B -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000/docs/design-exploration/**. Keep the terminal running. No build, dependency installation, login, seed command or browser storage setup is needed.

The review hub switches direction, surface, theme and desktop/mobile viewport. “Öppna i egen flik” opens at your browser's actual width. Desktop evidence is 1440 × 960; mobile is 390 × 844. The hub's desktop preview scales to fit without changing its internal viewport. Mobile remains a 390 × 844 iframe.

- A: `http://127.0.0.1:8000/docs/design-exploration/prototype.html?direction=a&surface=overview&theme=light`
- B: `http://127.0.0.1:8000/docs/design-exploration/prototype.html?direction=b&surface=overview&theme=light`
- C: `http://127.0.0.1:8000/docs/design-exploration/prototype.html?direction=c&surface=overview&theme=light`
- All three mobile: `http://127.0.0.1:8000/docs/design-exploration/?direction=all&surface=overview&theme=dark&size=mobile`
- Evidence: `http://127.0.0.1:8000/docs/design-exploration/gallery.html`

Use `surface=thesis` or `surface=public` for seeded workspaces and publications; `theme=dark` for dark mode. The hub does this for you. B deliberately gives Public Analysis a separate reading masthead; return through the hub to change surfaces.

## Evidence and scope

Each direction has two rendered passes, each covering overview, thesis, public analysis in both themes and both sizes, plus thesis depth, public financial context and provenance. **63 captures per pass, 126 total**, plus full-page views and direct old/A/B/C comparisons. [Iteration critique](iteration.md) explains what changed after pass 1; [reference research](references.md) records sources and reasons.

The before image comes from the existing **pre-Wave** `docs/qa/visual-v3/before/overview-1440-{theme}.png`, not from the cleaned-up Wave 1A implementation. Both comparisons use the same NVDA fixture state. Different compositions naturally put different information above the fold; the older first viewport is not cropped or repositioned to exaggerate the comparison.

Only `docs/design-exploration/` was added in this task. It can be deleted as one directory. The production stage script copies root HTML/CSS/JS and data/images/vendor; this docs directory is outside that staging set. The prototypes fetch the existing NVDA JSON and existing NTM logo. They import no production UI modules, use no localStorage/sessionStorage, and perform no backend writes. The baseline audit covers 184 production/data/migration files, including the existing uncommitted Wave 1A work.

## Content fidelity

Financial values are read at runtime from `data/stocks/NVDA.json`, not copied into display fixtures. Dataset source: SEC EDGAR; local fetched timestamp 2026-09-14T19:35:10.693065+00:00; dataset quality `validated`; TTM through `2027Q2`.

| Measure | Exact local value | Display |
| --- | --- | --- |
| Revenue TTM | 302,969,000,000 USD | 302,97 md USD |
| Free cash flow TTM | 127,006,000,000 USD | 127,01 md USD |
| Operating income TTM | 197,579,000,000 USD | 197,58 md USD |
| Diluted EPS TTM | 7.91 USD/share | 7,91 USD/aktie |
| FY2024 revenue | 60,922,000,000 USD | 60,92 md USD |
| FY2025 revenue | 130,497,000,000 USD | 130,50 md USD |
| FY2026 revenue | 215,938,000,000 USD | 215,94 md USD |

TTM is derived; annual revenue is reported. Provenance dialogs show the raw metric metadata, source URL and dates. Calendar dates are not relabelled as fiscal periods. Charts never combine the TTM total with annual columns. NTM validation describes the local pipeline status, not an independent verification of the SEC source in this task.

The existing thesis text and public thesis/assumptions/risks/falsification are reused from the Wave 1A runner. The public author remains **Research fixture / research_fixture**, published 16 September 2026, analysis date 15 September. The private review state uses the prior deliberately overdue **1 January 2020** fixture date. The public subtitle is editorial presentation copy, not an additional financial claim. Public financial context is explicitly the latest local NTM dataset, **not** a publication-time snapshot and **not** author opinion.

## A — Financial Editorial

| Topic | Direction |
| --- | --- |
| 1. Philosophy | An interactive investment report: read the company, inspect the financial abstract, then examine evidence. |
| 2. Identity | Warm paper/forest ink, broad report masthead, serif hierarchy, thin rules and editorial margin notes. |
| 3. Typography | Georgia for company, reading and prominent numbers; Segoe UI for controls and metadata. System fonts, no external dependency. |
| 4. Layout | Horizontal financial abstract followed by a two-column evidence/editorial-margin composition. The thesis uses a reading column and a review margin. |
| 5. Numbers | Three aligned figures, explicit labels/units/TTM, large revenue; numeric alignment instead of isolated cards. Values use Swedish locale and tabular numeral request. |
| 6. Chart | Zero-based annual columns, restrained green highlight on latest year, direct values and period labels. Clicking/focusing a year opens its evidence. |
| 7. Surfaces | Paper is the primary surface. Lines divide report sections. Tonal backgrounds mark review controls and NTM's separate public data context. |
| 8. Navigation | Slim masthead, small horizontal section navigation, right-aligned utilities. The logo remains unchanged. |
| 9. Thesis | Large serif case, a narrow accent rule for falsification, collapsed assumptions/history; editing becomes a generous writing area. |
| 10. Public Analysis | A publishable essay: company, analytical subtitle, byline, reading index and sourced financial appendix. Opinion and data are separated by attribution and surface. |
| 11. Mobile | Revenue leads a 1+2 metric arrangement. The CTA becomes full width. Source information remains attached; margin content becomes follow-on reading. Owner tools move after the essay. |
| 12. Themes | Light uses paper warmth; dark uses green-black and off-white, with subdued gray-green surfaces. Both preserve editorial contrast. |
| 13. Strengths | Clear report credibility, calm long-form reading, strong public sharing, accessible conceptual model for less experienced investors. |
| 14. Weaknesses | Can feel more like a publication than daily software. A large dataset needs careful table density. The chart still spans beyond a mobile first viewport. |
| 15. Complexity | Medium-high: requires report templates and separate reading/UI type roles across Research, not a CSS coat on old cards. |
| 16. Performance | No web fonts, images beyond the existing logo, framework or chart library. SVG chart and native disclosures are inexpensive. |
| 17. Accessibility | Semantic tables, discrete values, dialog keyboard support, visible focus. Small provenance text should remain secondary; font rendering varies by OS. |
| 18. Difference | Serif company and financial abstract replace the dashboard silhouette. Open editorial space and margin notes carry the hierarchy instead of bordered modules. |

## B — High-tech Financial Workspace

| Topic | Direction |
| --- | --- |
| 1. Philosophy | Serious investor software: one active evidence object with context available beside it. |
| 2. Identity | Neutral graphite/chalk, crisp sans type, quiet navigation rail, tightly controlled tonal depth. |
| 3. Typography | Segoe UI throughout, medium display weights and tabular financial numbers; restrained 11–12px metadata, larger reading text. No font install. |
| 4. Layout | Location bar, company/action header, selected revenue and chart with a financial inspector. Workspace width is used for research rather than boxes. |
| 5. Numbers | Large selected measure plus aligned inspector rows. Other TTM measures remain visible without competing equally. |
| 6. Chart | A connected annual observation plot: discrete labeled points, zero baseline, no smoothing or future segment. The line indicates successive annual observations, not prices. |
| 7. Surfaces | The elevated surface is the actual chart work object; inspector shares its boundary. Thesis has one contextual review panel. |
| 8. Navigation | Private Research gets a subdued left rail and location bar. Public reading gets a minimal masthead and right-side document index. |
| 9. Thesis | Writing canvas with compact inspector; falsification is a quiet inset. Review and lifecycle actions are reachable without opening every research section. |
| 10. Public Analysis | A composed research document separated from private workspace navigation. Company, author case and a clean reading column are foregrounded. |
| 11. Mobile | The rail becomes a small top section strip. The chart remains the central object; two secondary measures follow below it. Extra financials remain in the table. |
| 12. Themes | Dark uses separated graphite luminance levels; light uses chalk/neutral gray. Muted blue-gray accents signal selection, not market direction. |
| 13. Strengths | Efficient repeat research, strongest visible operational context, straightforward path to denser tools, precise controls. |
| 14. Weaknesses | Closest to contemporary productivity software; least inherently ownable. A rail consumes desktop width and needs disciplined future navigation limits. |
| 15. Complexity | High: separate workspace/public shells and responsive inspector behavior must be engineered deliberately. |
| 16. Performance | Still static HTML/CSS/JS and one SVG. No animations, font requests or runtime UI library. A future workspace should not accumulate heavy tooling by default. |
| 17. Accessibility | Clear text selection state, keyboard-operable observation points, native source dialogs. The annual plot also has a table; no hover-only information. |
| 18. Difference | A working research canvas replaces the old full-width card stack. Navigation recedes and the selected financial question owns the screen. |

## C — NTM Signature

| Topic | Direction |
| --- | --- |
| 1. Philosophy | Company and financial evidence form one visual identity; decisions follow a numbered research sequence. |
| 2. Identity | Oversized paired company/value typography, mineral paper/deep green, broad tonal bands, small numbered section labels. |
| 3. Typography | Arial/system grotesk, tight display tracking, lighter large numbers, plain reading sans. No new font dependency; a custom typeface remains a later optional brand decision. |
| 4. Layout | Company and main financial value occupy two balanced territories. Below, a horizontal history ledger sits beside explicit period/source context. |
| 5. Numbers | Revenue is almost company-name size. Secondary figures are compact and aligned; history values have a dedicated right edge. |
| 6. Chart | Horizontal annual bars embedded in ledger rows, common zero/250 scale, direct values and full-row source access. Data and chart are one object. |
| 7. Surfaces | Broad full-width mobile financial and falsification regions; desktop relies primarily on proportion and separators. The initial oversized number card was removed. |
| 8. Navigation | A confident horizontal research spine, compact ticker tag and unchanged logo. Section numbering creates continuity across the product's research surfaces. |
| 9. Thesis | The case is a typographic statement; falsification is a separate tonal region; review has its own aligned column. |
| 10. Public Analysis | Large company masthead, a byline region and an emphatic authored case; the sourced data appendix carries the same numbered/ledger identity. |
| 11. Mobile | Company, action, financial region, then history. The ledger is touch-friendly. Review status appears before the writing body without replacing the case. |
| 12. Themes | Light is pale mineral/green ink; dark is deep green with soft mineral type and a pale accent. It is a deliberate palette, not a binary color inversion. |
| 13. Strengths | Recognisable screenshot silhouette, strong numerical identity, brand continuity through research, deliberate mobile rhythm. |
| 14. Weaknesses | More assertive than A/B; large numerals cost density. Green must not imply positive returns. Long company names and negative/very large values need wider content testing before adoption. |
| 15. Complexity | High: identity-specific layout, number scaling rules and chart/table patterns must generalise across company profiles. |
| 16. Performance | No decorative textures, gradients, images or external fonts. Ledger bars are CSS, so rendering and interaction are lightweight. |
| 17. Accessibility | Full-row 44px+ chart targets, visible exact numbers, source dialogs and independent textual state. Color does not encode gain/loss. |
| 18. Difference | The paired company/value silhouette and horizontal evidence ledger are unlike old NTM's bordered section system. It has a repeatable visual signature beyond palette. |

## Comparison — no overall score or winner

These are design judgments from the rendered prototypes, not user research results.

| Criterion | A — Editorial | B — Workspace | C — Signature |
| --- | --- | --- | --- |
| Premium feeling | Composed institutional report | Precise professional software | Assertive financial identity |
| Financial credibility | Strong report conventions | Strong evidence/operation clarity | Strong number/source pairing |
| Modernity | Contemporary editorial | Contemporary product tooling | Contemporary brand-led research |
| Distinctiveness | Serif/editorial, familiar category | Moderate; productivity resemblance | Strong company/value silhouette |
| Information density | Moderate | Highest of the three | Moderate-low opening; dense ledger |
| Readability | Strong long-form reading | Strong scanning and working | Strong opening; large type dominates |
| Advanced users | Good depth, slower scan | Most compact work context | Good evidence sequence, less density |
| Beginners | Familiar report reading | More software conventions | Clear company/number sequence |
| Public Research quality | Essay/report identity | Clean technical research document | Memorable branded report |
| Mobile | Reading-first | Chart/task-first | Number/evidence-first |
| Dark mode | Quiet forest/ink | Graphite workspace | Distinct deep green |
| Light mode | Warm paper | Neutral chalk | Pale mineral |
| Implementation complexity | Medium-high | High; two shells | High; generalising signature |
| Scalability across NTM | Strong for knowledge/report pages; tools need adaptation | Strong for tools/research; editorial needs its reading shell | Strong brand continuity; highest need for proportional rules |

## Chart language and financial formatting

All directions show only actual reported annual observations. Latest year is highlighted as recency, not positive performance. Direct numeric labels survive without color. A/B observations offer native tooltip text and keyboard/click source dialogs; C rows make both value and source affordance persistent. Each has a values table. There is no fabricated live price, decorative sparkline, modeled forecast or valuation.

Provisional rules for later implementation: modelled values must be explicitly labeled and visually dashed/hollow with a boundary after actuals; never silently join actual and future periods. Missing data must be a gap and “Saknas”, never zero or interpolation. The current NVDA-only prototype does **not** implement a generic missing/modelled series renderer. It proves the historical presentation with the complete verified fixture; production edge cases remain later engineering work.

Revenue/FCF use `md USD`; EPS uses `USD/aktie`; dates use readable Swedish labels plus exact dates in source dialogs. For future growth/margin views, use the same tabular alignment with an explicit `%` unit and named denominator/period. Valuation requires a dated price/model input and should show an unavailable state until such input exists. No ratio or valuation is invented to fill this study.

## Provisional tokens — extracted after visual composition

These are observations from the prototypes, not an adopted design system.

| Token role | A | B | C |
| --- | --- | --- | --- |
| Light canvas / text | #f7f5ef / #242c29 | #fafafa / #202126 | #f3f3e9 / #153c32 |
| Dark canvas / text | #1b211f / #f0efe6 | #191a1e / #ededf0 | #102b24 / #edf1dc |
| Light accent | #28594c | #414b69 | #225542 |
| Dark accent | #becfba | #c3cce5 | #d9e4a5 |
| Display | Georgia, 79px desktop company | Segoe UI, 52px workspace company | Arial, 100px company / 96px value |
| Reading | Georgia 23–32px leads; sans body | Sans 23–27px leads | Sans 25–38px leads |
| Primary boundary | 1px horizontal rules | Neutral luminance + fine boundary | Tonal region + section rule |
| Radius | 0, except identity avatar | 4–7px work objects | 0, except identity avatar |
| Spacing rhythm | 18 / 26 / 38 / 50 | 16 / 24 / 30 / 42 | 22 / 30 / 35 / 60 |

All have fallbacks and zero font downloads. Georgia's numerals are an editorial trade-off: tabular CSS requests do not make every platform's system font support identical OpenType features. Production would require type testing across supported OSes before standardising.

## Interaction and verification limits

Working: surface/theme navigation, NVDA search and empty result, financial disclosure, annual/TTM sources, thesis editing with in-memory save/reset, review dialog/date, lifecycle preview, public author-to-private-workspace preview, and all owner review controls. No control publishes or mutates an account. The company search intentionally includes only NVDA; this study is not a second stock browser.

Automated Chromium checks cover all required viewport/theme combinations, no horizontal page overflow, no page exceptions, representative metrics, search empty state, Escape dismissal, disclosures, theme toggling, edit/save/reload reset, review, and zero browser storage writes. Additional checks cover chart keyboard access, focus return, palette contrast, wider mobile widths, zoom-like reflow and the hub. Results live under `qa/`. This is visual prototype QA, not production feature certification, a screen-reader audit or cross-browser certification.

The three directions remain intentionally separate. Owner selection is the next decision; this work does not start production rollout.
