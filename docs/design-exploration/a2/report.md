> HISTORICAL EXPLORATION. Owner selection is final: A2.1 art direction + A2.2 typography. The sole canonical specification is docs/visual-system-v3.md and the active prototype is canonical/prototype.html.

# Direction A2 — premium art direction

Direction A remains the selected structural direction. These are three art-direction variants of that report, not a restarted exploration. No A2 winner has been selected.

## Owner review

Run from PowerShell:

```powershell
Set-Location 'C:\Users\Mirne\Desktop\investment-site'
python -B -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000/docs/design-exploration/**. Choose A Original, A2.1, A2.2 or A2.3; Research, Thesis or Public Analysis; desktop/mobile; light/dark. All data and fixture state load automatically. “Alla A2” includes original A and scrolls horizontally for immediate comparison. Open a frame in its own tab for unscaled desktop inspection.

Direct public-report links:

- [A2.1 — Midnight / Electric](prototype.html?direction=a&variant=1&surface=public&theme=light)
- [A2.2 — Graphite / Ice](prototype.html?direction=a&variant=2&surface=public&theme=light)
- [A2.3 — Deep Navy / Blue-Violet](prototype.html?direction=a&variant=3&surface=public&theme=light)
- [Original A](../prototype.html?direction=a&surface=public&theme=light)
- [Screenshot gallery](gallery.html)
- [Reference inspection and rendered critique](references-and-iteration.md)

The hub has a **Knappar & kontroller** link. Each prototype also exposes it in its footer. It opens a working local specimen of primary, secondary, tertiary, destructive and disabled buttons, search, writing input, semantic states and a disclosure. Hover, press, and Tab through the controls. This keeps secondary actions out of the report's first layer.

## What stays from A

Company-first report composition; editorial hierarchy; broad financial abstract; low-card presentation; integrated annual revenue chart and margin note; thesis case before machinery; public essay with separate NTM financial context. No financial values, product contracts or published fixtures were changed. No production UI was modified.

The original NTM logo is reused without recolouring, redrawing or replacing its cyan edge. Its new relationship to the typeset full brand name, descriptor, navigation and account controls is part of this isolated art-direction study. The site no longer reads as a green brand in any A2 variant. Green exists only in the control specimen's explicitly positive semantic state.

## A2.1 — Midnight / Electric

| Topic | Art direction |
| --- | --- |
| 1. Palette | Cool paper #f4f7f9 / midnight #101820. Ink #12212c / frost #eef4f8. Controlled petrol #005f80 in light, cyan #7cd6f2 in dark. Accent concentrates on action, latest year and selected financial context. |
| 2. Typography | Georgia report/reading; a confident italic NVIDIA in the public masthead; restrained Segoe UI subtitle, controls and financial numbers. The sans subtitle removes competing italics after pass 1. |
| 3. Header | Compact unchanged logo + full-name brand lockup; a strong thin masthead rule; small tracked navigation, clear underline, circular theme control and outlined account initial. |
| 4. Buttons/controls | 46px actions, 3px corners, precise 20px side padding, divided arrow zone. Outlined secondary, underlined tertiary, semantic destructive. Inputs and disclosures use matching fine edges. |
| 5. Numbers | Large proportional hierarchy with tabular numeric request, tight tracking, quiet units; revenue gets a controlled accent. No generic metric cards. |
| 6. Chart | Prior-year bars are cool translucent-looking solid tints with explicit outlines; latest is a confident accent fill. Dotted grid, direct values, branded tooltip and period-source dialog. There is no transparency/glass effect. |
| 7. Public Analysis | Large italic company, calm sans analytical subtitle and serif case. The opening case has a desktop accent rule. Attribution and NTM context remain explicit. |
| 8. Dark | Midnight rather than pure black; cool secondary type and restrained bright cyan give action/evidence a clear hierarchy. |
| 9. Light | Blue-white editorial paper, dark petrol actions and pale evidence bars. It is quieter and more paper-like than dark, with darker accent contrast. |
| 10. Mobile | Small integrated masthead, full-width action with anchored arrow, revenue then two secondary measures. The public subtitle wraps naturally; byline and source controls retain their own space. |
| 11. Personality | Precise, contemporary financial editorial with a technical edge. |
| 12. 2026 quality | The relationship between display type, contemporary numeric sans, source interactions and carefully scaled controls feels intentional rather than assembled. |
| 13. Generic risk | Could resemble a premium technology publication if cyan becomes widespread. Keep accent coverage constrained; do not add neon effects or tech decoration. |
| 14. Performance/a11y | System fonts only, no dependency or animation package. Exact chart values remain visible without hover. Focus ring, keyboard source access, readable text contrast and reduced-motion handling. |

## A2.2 — Graphite / Ice

| Topic | Art direction |
| --- | --- |
| 1. Palette | Off-white #f8f8f6 / graphite #1c1e21. Ink #24272b / paper #f2f2ef. Cool steel grays for chart history and separators; almost monochrome action identity. |
| 2. Typography | Georgia display, brand name and financial numerals; Segoe UI controls/metadata/body. Numbers become part of the editorial voice. Single precise rules replace pass 1's old-fashioned double rules. |
| 3. Header | More spacious masthead, restrained serif brand name, quiet horizontal navigation. A small dot plus weight marks selection without a colored tab slab. |
| 4. Buttons/controls | Square, strong ink/ice primary; sentence-case 12px labels, no decorative icon divider. Crisp outlined secondary and underlined tertiary. Underlined company selector feels like part of the report. |
| 5. Numbers | Confident 57px desktop serif metrics, aligned across a wide abstract. Units and periods use smaller sans type. Numeric character is the identity, rather than color. |
| 6. Chart | Monochrome steel annual bars, latest in ink/ice; continuous fine grid; serif value labels distinguish the report from a generic chart widget. |
| 7. Public Analysis | Company and subtitle on the left, compact author/date block on the right. The public financial appendix is divided by rules rather than a desktop background card. |
| 8. Dark | Graphite, soft whites and steel instead of stark black/white. Primary actions reverse to ice. |
| 9. Light | Deliberately paper-led, with precise ink rules and generous reading space. No washed-out gray-on-white action treatment. |
| 10. Mobile | Author block returns to a compact byline. The financial abstract becomes 1+2; full-width square primary. Appendix gets a light tonal region to clarify provenance on a narrow screen. |
| 11. Personality | Understated institutional research, confident and composed. |
| 12. 2026 quality | Editorial number scale, exceptionally restrained surfaces, modern action sizing and a unified control vocabulary. Premium comes from proportion and typography. |
| 13. Generic risk | Monochrome can feel anonymous or like a newspaper. The numeric role and brand lockup must carry identity; do not compensate with gold or luxury ornament. |
| 14. Performance/a11y | No web fonts or assets beyond the existing logo. Platform Georgia numeral/OpenType support differs; tabular alignment needs cross-platform review before production adoption. Color is never the only state cue. |

## A2.3 — Deep Navy / Blue-Violet

| Topic | Art direction |
| --- | --- |
| 1. Palette | Pale cool paper #f5f5fa / deep financial navy #131b32. Ink #182444 / pale type #eef0fa. Violet #5053ad / #babaff is limited to active/focus, short rules and fine evidence edges. |
| 2. Typography | Cambria editorial display/reading, Segoe UI controls and lighter large financial numbers. A different serif texture preserves A's report character without copying the other variants. |
| 3. Header | Clean sans brand lockup, open rule-based navigation, violet selected underline. Pass 1's tinted nav slab was removed. |
| 4. Buttons/controls | 5px corners, navy/ink primary in light and pale ink in dark; violet is in the small arrow division/focus rather than a large purple button. Explicit hover/press/disabled states. |
| 5. Numbers | Lighter sans numerals with firm units/periods; short violet section rule introduces the abstract. Data remains ink-colored. |
| 6. Chart | Desaturated blue historical bars; newest year in ink, with a fine violet edge. Period labels and direct values stay neutral. Tooltip and provenance share the report's navy hierarchy. |
| 7. Public Analysis | Confident Cambria masthead, selective italic subtitle and a short opening rule; a large readable case, then assumptions/risks and an explicitly sourced financial section. |
| 8. Dark | Deep navy, separate blue-black surfaces, muted violet detail. No gradient, glow, glass or neon. |
| 9. Light | Pale cool paper and financial navy with low violet coverage. Primary actions use the text/ink family, avoiding generic blue-button SaaS. |
| 10. Mobile | Same compact masthead and report reading sequence; expressive serif case and firm action hierarchy. No desktop sidebar or reduced dashboard. |
| 11. Personality | Established financial credibility with a restrained digital identity. |
| 12. 2026 quality | Editorial serif texture plus exact digital controls and controlled section accents; consistency across chart, writing and public report. |
| 13. Generic risk | Blue-violet can quickly become an AI/SaaS cliché. Pass 2 specifically reduced violet-filled areas; preserve that restraint in any later implementation. |
| 14. Performance/a11y | Cambria is referenced as a system font with Georgia fallback, never downloaded or bundled. Typography will vary off Windows. Native controls, visible focus and named source actions remain. |

## Control specifications and semantics

| Role | Shared treatment | Variant distinction |
| --- | --- | --- |
| Primary | 46px minimum height, 12px semibold, explicit hover/active/focus/disabled | Petrol/cyan with divided arrow; square graphite/ice; navy with fine violet detail |
| Secondary | Outline, same height/type; hover adds a quiet surface | Corner shape follows 3px / 0px / 5px |
| Tertiary | Underlined text, clear hover, 44px activation area | Text color follows each variant's secondary/action palette |
| Destructive | Explicit red semantic fill; never brand accent | Dark themes use a pale red fill with dark text, light themes deep red with paper text |
| Disabled | Muted text/surface, real disabled attribute, no press movement | Neutral in every variant |
| Inputs | Label above field, intentional inset/padding, hover edge, 2px visible focus | Radius matches variant; large writing area retains editorial type |
| Tabs | Existing Research surfaces and URL state | Underline / dot+weight / restrained violet underline |
| Theme | Named button with a drawn half-disc icon | Outlined circular utility, not a primary call to action |
| Disclosures | Single rule, deliberate spacing, readable label | Matches report rules and active color |
| Positive / negative / warning | Green / red / ochre, with explicit text and symbols | Restricted to semantic specimen states; not brand identity or fabricated finance values |

The company selector, thesis input, provenance dialog, author-preview dialog and review/lifecycle actions receive the same art direction. The control specimen is illustrative and does not perform real lifecycle actions. Actual seeded thesis actions still use the existing isolated in-memory behavior.

## Financial fidelity and chart rules

All variants fetch the same existing `data/stocks/NVDA.json`: TTM revenue **302,97 md USD**, FCF **127,01 md USD**, diluted EPS **7,91 USD/aktie**; annual revenue **60,92 / 130,50 / 215,94 md USD** for FY2024–FY2026. The source dataset, precise values, period metadata and normalization logic are unchanged. TTM and annual observations remain separate.

Value, unit, period and source remain attached to each metric. The annual chart uses a common zero-based scale. Latest-year styling denotes recency, not positive investment performance. Tooltips repeat visible annual values; source dialogs give the underlying period and filing metadata. No price, forecast, growth rate, margin or valuation is invented. Future percentage views should use named denominators/periods and the same aligned numeric roles; current fixtures remain unchanged.

Public Analysis remains the same fixture author, dates and case. The financial appendix explicitly uses latest local NTM data rather than claiming a publication snapshot. This task changes presentation only; it does not implement Public Research V2.

## Fonts, dependencies and isolation

Georgia, Cambria, Segoe UI, Times New Roman and Arial are system-family requests with fallbacks. No font files were downloaded, redistributed or added as production dependencies. No font licensing purchase is required for this prototype's use of installed fonts. Exact cross-platform matching would require a later licensed/bundled font decision and performance review; these prototypes make no such commitment.

A2's HTML reuses the existing isolated renderer and original data. Styling, link preservation, branded tooltips and local control specimens live under `docs/design-exploration/a2/`. The original A prototype and its original screenshots remain intact. The review hub is updated; `index-abc.html` preserves the earlier three-direction hub. All code changes are inside the design-exploration directory. No deploy, commit, push, Supabase, RLS, financial data or production UI change.

## Rendered iteration and review evidence

Every variant went through pass 1 → screenshot inspection → documented critique → meaningful revision → pass 2. There are **72 captures per pass**, covering all required surfaces, sizes and themes plus editing, full mobile public reports, control specimens, selector and provenance. Additional final evidence covers chart hover/keyboard focus and button states.

The gallery includes direct **A original / A2.1 / A2.2 / A2.3** Public Analysis comparisons in both themes and desktop/mobile, plus Research comparisons. Review the public reports first, then compare the same variant's writing and source interactions.

Automated checks cover data loading, fixture reset, variant-preserving navigation, both themes, no page overflow, keyboard chart/source behavior, focus return, additional reflow widths, control states and computed color contrast. Results are recorded under `qa/`. These checks are prototype verification, not a complete screen-reader or cross-browser certification.

Final results: **164 PNG evidence files**, no page exceptions, no overflow in the required set or 54 additional reflow states, and a minimum **4.79:1** among checked text/semantic/control color pairings. All **184** production baseline hashes remain unchanged. Report-section anchors stay within their selected A2 variant. No prototype requests a third-party font or service.

No winner is assigned. A's structure is retained; the owner chooses the art direction next.
