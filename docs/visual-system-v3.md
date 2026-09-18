# NTM Visual System V3 — canonical specification

**Owner decision: final. A2.1 Midnight / Electric art direction + A2.2 Graphite / Ice typography.** This document supersedes the Wave 1A visual tokens and all A/B/C/A2 exploration recommendations. No alternatives remain under active consideration.

**Status: owner-approved Research implementation extended across the production site; not deployed.** The canonical design remains frozen. Financial data, formulas, persistence, publication and security contracts remain unchanged. See the [site-wide implementation report](internal/visual-v3-sitewide-report.md), [migration inventory](internal/visual-v3-sitewide-inventory.md) and [QA gallery](qa/visual-v3/sitewide/index.html).

## Canonical artifacts and precedence

- [Review hub](design-exploration/canonical/index.html) and [prototype](design-exploration/canonical/prototype.html).
- [v3.css](design-exploration/canonical/v3.css): one editable stylesheet, without imports, variant selectors or stacked exploration overrides.
- [v3.js](design-exploration/canonical/v3.js): canonical presentation interactions and control specimen.
- [Verified gallery](design-exploration/canonical/gallery.html) and [verification results](design-exploration/canonical/qa/verification.json).

This specification owns the decisions. The owner-approved real Research/Thesis/Public Analysis implementation is the production reference and takes precedence over older exploration artifacts. The prototype remains historical demonstration, not a source of fixture logic for production. Its isolated `exploration.js` renderer is never loaded by production routes.

`consolidate.py` is the one-time extraction record, not a build step. Do not rerun it over canonical edits. Future work should edit/use `v3.css` and this document directly.

## Deliberate conflict resolution

| Concern | Final decision |
| --- | --- |
| Composition, surfaces and palette | A2.1. Open editorial company report, financial abstract, chart and margin note. No Graphite/Ice palette substitution. |
| Header structure, logo, tabs and byline position | A2.1. Original logo preserved. The typeset brand name receives A2.2 serif typography. No A2.2 side-byline layout or dot-selected tab. |
| Controls and buttons | A2.1: 3px radius, 46px primary, divided arrow, accent fill, outlined secondary and semantic destructive. No square A2.2 control treatment. |
| Display, reading and financial families | A2.2: Georgia, Times New Roman, serif. Segoe UI, Arial, sans-serif for UI, metadata, units and ordinary body copy. |
| Public company title | A2.2 upright serif replaces A2.1 italic company lettering. |
| Public subtitle | A2.2 serif with selective italic continuation replaces A2.1 sans subtitle, within A2.1's composition. |
| Metrics and chart labels | A2.2 serif number treatment within A2.1 layout/color hierarchy. Tabular numeral request retained. |
| Chart marks, grid and interactions | A2.1 outlined historical bars, accented latest year, dotted grid, tooltip and source access. Only the numeric typography comes from A2.2. |
| Wave 1A | Structural UX and functional contracts stay binding. Its old visual values are superseded. |

These are one resolved system. Light/dark are themes, not additional variants.

## Principles and composition

**Minimal för ögat. Djup för hjärnan.** Utility first. Creator second. Simple by default, powerful when needed.

Company or investment case comes first. Use alignment, typography and space before containers. Ordinary metrics, paragraphs and report sections are not cards. Selectable entities, overlays and distinct review/data contexts may use surfaces. The report shell is approximately 1296px, with an approximately 800px reading column and editorial margin. Public Analysis must read as an attributed financial report, not form output.

## Palette

| Role/token | Light | Dark |
| --- | --- | --- |
| Canvas `--bg` | #f4f7f9 | #101820 |
| Main text `--ink` | #12212c | #eef4f8 |
| Secondary `--secondary` | #394f60 | #c8d7e2 |
| Muted `--muted` | #536574 | #a4b6c4 |
| Separator `--line` | #cbd5dc | #334552 |
| Surface `--surface` | #e9f0f4 | #192632 |
| Soft selection `--soft` | #dceaf1 | #273d4c |
| Accent `--accent` | #005f80 | #7cd6f2 |
| On-accent `--accent-ink` | #ffffff | #10232d |
| Hover `--hover` | #004961 | #b1eaff |
| Focus `--focus` | #007da6 | #9de4fb |
| Historical bar `--bar` | #d0e1eb | #263b49 |
| Historical edge `--bar-stroke` | #58788c | #789aaf |
| Positive `--positive` | #286743 | #a0d2b1 |
| Negative `--negative` | #9d3849 | #f4a2ae |
| Warning `--warning` | #805517 | #e6c08b |

Green is semantic only. Cyan/petrol is controlled, not a universal fill. Latest-year styling means recency, not positive investment performance. Ownership and state require text, not color alone. No gradients, glass, glow, fake tickers or decorative charts.

## Typography

| Role | Canonical treatment |
| --- | --- |
| Research company | Georgia regular, approximately 98px desktop / 62px mobile, tight tracking |
| Public company | Georgia upright, 113px / 74px |
| Public subtitle | Georgia 38px / 30px, selective italic continuation |
| Primary financial | Georgia 57px desktop / 48px mobile, tight tracking and tabular-nums request |
| Supporting financial | Georgia 57px desktop abstract / 33px mobile; smaller contextual figures in appendices |
| Chart labels | Georgia 19px desktop / 25px mobile SVG viewBox units; verify actual rendered size |
| Editorial lead | Georgia approximately 29px / 25px, generous 1.6 line height |
| Writing input | Georgia approximately 27px / 23px |
| UI/body/metadata | Segoe UI, Arial, sans-serif; body 15–16px, controls 12px, metadata 10–12px |
| Units and periods | Sans-serif, explicit and adjacent to value/group |
| Brand name | Georgia 21px / 14px; descriptor remains sans-serif |

No remote font dependency or redistributed font files. All are installed-system family requests with fallbacks. Georgia numeral/OpenType support differs across platforms; tabular CSS is not a guarantee. Test alignment and font fallbacks across supported production platforms. Do not silently substitute a new type family.

## Header and controls

Preserve the original logo beside the typeset name and quiet descriptor. Header approximately 91px desktop / 71px mobile. Navigation uses an accent underline, stronger selected text and `aria-current`. Theme is a named circular utility; mobile hides nonessential account utilities while retaining surface navigation.

Primary: 46px minimum height, approximately 20px horizontal padding, 12px semibold sans, 3px radius, accent fill/on-accent text, divided arrow on directional actions. Hover changes fill; press moves 1px; keyboard focus uses a 2px outline. Reduced-motion disables transitions.

Secondary is outlined; tertiary is underlined text; destructive uses semantic negative color with existing confirmation. Disabled has an actual disabled attribute, neutral styling and no press movement. Inputs have labels, deliberate padding, hover edge and focus outline. The writing field retains editorial typography. Native disclosures divide depth without new cards.

Search uses labeled input and ordinary result links, not a new combobox model. Escape closes the dialog and returns focus. Source buttons have metric-specific accessible names. Preserve semantic headings, labels, table captions/headers, `hidden` and status announcements. Primary actions have 44px+ targets; smaller inline source controls require clear separation and accessible names.

## Binding Wave 1A UX and contracts

- Company-first composition, searchable supported-company selection and contextual existing/new thesis action.
- Preserve the existing supported-company coverage and manual-entry semantics. This NVDA-only prototype does not reduce the product's supported companies.
- Verified revenue history, freshness/provenance and deeper financial statements remain reachable.
- Thesis first layer: investment idea, falsification, review date/state. Assumptions, risks, notes and report questions remain progressive depth.
- Preserve review lifecycle, immutable versions, change comparisons and outcomes. Hide empty wrappers without removing archived outcomes.
- Preserve stable deep links, disclosure expansion on navigation/validation, and existing save behavior. No new draft persistence or autosave is implied.
- Public author, analysis date and publication date stay distinct. Attribute opinions and assumptions, separate sourced data and retain the non-endorsement semantics.
- Keep financial calculations, storage, publication, account, privacy, Supabase and RLS with their existing owners. Presentation cannot reinterpret those contracts.

Production uses `visual-v3-tokens.css` as the single palette owner and shared primitive layer on every styled route, activated by `body.visual-v3`. `premium.css` owns shared composition and controls; `academy.css`, `knowledge.css` and `social.css` own their template families. `research-v3.css` retains the approved Research/report layouts unchanged by the site-wide rollout. Academy and Knowledge generators emit the canonical stylesheet and body class. Legacy palette blocks were removed from `style.css` and `premium.css`, alongside obsolete gradients and green action glow. Chart secondary series use the approved historical edge color; palette changes do not alter values or formulas.

## Financial evidence and charts

Keep value, label, unit, period, state and source connected. Read existing verified values and unchanged provenance. Swedish display formatting never changes underlying values. Explain understandable source/period/calculation first, and expose taxonomy/accession metadata at deeper levels. No invented growth, margin, price or valuation is allowed to fill a composition.

Use zero-based annual bars with original fiscal labels and visible units/values. Muted outlined historical bars; accent latest year. Hover/focus repeats visible data; click/Enter opens period provenance. Keep the values table. No smoothing, forecast blending or number animation.

Production's existing rules stay binding: validated data, at least two finite supported observations, correct profile-specific revenue terminology, and missing fiscal-year gaps rather than zeros. Unsupported profiles/currencies/states retain their current fallback. Future/modelled series need explicit separation. The complete NVDA fixture does not certify all data-edge cases.

Public financial context in the demo is explicitly latest local NTM data, not an author's publication snapshot. Production must not add that block until its publication contract supplies/permits the corresponding data. This handoff does not implement Public Research V2.

## Mobile and accessibility

At 390px use approximately 22px gutters, company first, a full-width primary, leading financial value above two supporting values. Editorial margin becomes follow-on reading. The thesis remains dominant, with a compact due-state link near the title. Public byline and ownership remain visible; author tools follow reading. Exact chart values are available without hover.

Verify 360/390/430px and wider reflow, no page-wide horizontal overflow, and labeled local scrolling for dense tables. Preserve focus return, keyboard activation, reduced motion, labels and text statuses. Targeted palette checks do not replace supported-browser, zoom, screen-reader and long-content integration checks.

## Local review and verification

```powershell
Set-Location 'C:\Users\Mirne\Desktop\investment-site'
python -B -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000/docs/design-exploration/canonical/**. The former review-hub URL redirects here. There is no active variant selector. Choose surface, theme and viewport; NVIDIA and private/public fixtures load automatically. Edits stay in memory and reset on reload.

Existing prototype checks adapted to the single canonical target:

```powershell
python -B docs/design-exploration/canonical/capture.py final
python -B docs/design-exploration/canonical/verify.py
```

Passed: 24 core/interaction captures in desktop/mobile and both themes; 18 additional 360/430/720px reflow states; data loading, edit/reset, canonical links, chart/source keyboard behavior, focus return, control states and hub navigation. No page exceptions, overflow, browser storage writes or external data/font requests. Checked text/control contrast meets 4.5:1. All 184 production/data/migration baseline hashes remain unchanged.

## Implementation handoff

**This single canonical direction is now implemented in production source. No additional visual exploration or selection is needed.** The isolated prototype remains a reference. Production uses real company data and current safe public snapshots, retaining the Wave 1A contracts. Review the [production captures](qa/visual-v3/production/gallery.html) and implementation report before release.

Local production integration checks are recorded in the implementation report. Hosted service validation, physical-device and assistive-technology acceptance remain explicit limits. Nothing committed, pushed or deployed.
