> HISTORICAL: superseded by docs/visual-system-v3.md. Retained as Wave 1A implementation context.

# NTM Visual System V3

Wave 1A laboratory: company Research, private thesis workspace and public analysis. This is a reusable foundation, not a site-wide rollout.

## Principles

**Minimal för ögat. Djup för hjärnan.** Utility first. Creator second. Simple by default, powerful when needed.

Start with the user's investment or current question. Establish hierarchy with type, alignment and space before introducing a container. Treat reported facts, calculations, assumptions and judgments as different kinds of information. Never let polish imply data coverage, confidence or endorsement that the product does not have.

## Architecture and roles

`premium.css` owns the shared palette, spacing and semantic tokens. `research-v3.css` applies those roles only to `.visual-v3` pages. `research-v3.js` owns presentation: selector search, the annual revenue visual and contextual workspace entry. Financial logic, storage, publication and account state retain their existing owners.

| Role | Token / value | Use |
| --- | --- | --- |
| Display | `--type-display`, 32–56 px | Public report identity |
| Page title | `--type-page`, 30–40 px | Company identity, 32 px on mobile |
| Section title | existing `--font-section`, 19–24 px | Workspace sections |
| Body | `--type-body`, 16 px | Reading and editing, line height 1.6–1.75 |
| Dense data | `--type-data`, 14 px | Tables, controls, financial labels |
| Metadata | `--type-meta`, 13 px | Periods, ownership, sources |
| Primary financial | `--type-financial-primary`, 36–48 px | One leading result |
| Supporting financial | `--type-financial-secondary`, 24–28 px | Supporting numbers |
| Reading width | `--width-reading`, 720 px | Report shell with responsive gutters |
| Editing width | `--width-editor`, 800 px | Thesis, reviews, history |
| Workspace width | `--width-workspace`, 1248 px | Company data and comparisons |
| Control radius | `--radius-control`, 8 px in V3 | Inputs/buttons |
| Entity radius | existing `--radius-surface`, 12 px | Selectable companies, picker surface |
| Overlay radius | `--radius-dialog`, 16 px | Dialogs |
| Overlay shadow | `--shadow-overlay` | Dialog depth, not ordinary sections |
| Chart series | `--chart-revenue` → theme `--primary` | Historical revenue |
| State motion role | `--motion-state`, 140 ms | Reserved transition role; existing controls retain restrained shared transitions |

Keep the existing system font stack; no remote font. Financial numbers retain tabular numerals. Use actual units beside numbers and period context beside the group. A primary number is selectively larger; every metric must not shout at the same volume.

## Spacing and surfaces

Reuse `--space-1/2/3/4/6/8/12/16`: 4, 8, 12, 16, 24, 32, 48, 64 px. Within a group use 8–16 px; between distinct tasks use 24–48 px. Do not double gaps by combining a flex gap with equivalent fieldset margins.

The visible hierarchy is page (`--bg`), optional surface (`--panel`) and overlay. Existing `--panel-alt` remains available for dense legacy subcomponents; it is not a reason to nest another card. Section separators mark a transition or disclosure. Inputs, tables and selectable entities may have boundaries. Paragraphs, ordinary metrics and the report itself do not need cards.

Company directory entities remain cards because they are independently selectable. The selected company header, metrics, editor, lifecycle panels and public report use open composition. Tables scroll inside labelled regions; the page must not scroll sideways. Canvas width is constrained during responsive chart resizing.

## Controls and state

Each active task has one main action: **Formulera din tes**, **Granska antaganden**, **Spara tes**, **Spara ny version**. Existing saved theses can lead to **Se din tes**, and comparable changes to **Se vad som förändrats**. Use existing lifecycle state; never infer an investment recommendation from a review date.

Secondary actions support the current task. Text actions open related detail. Destructive actions live with history, retain danger color and keep existing confirmations. Publication stays owned by the publication module, including visibility, authentication, source selection and stale/private-revision warnings.

New thesis order:

1. Vad tror jag?
2. Vad skulle göra mig fel?
3. När ska jag granska det igen?

Assumptions, risks, notes and report questions live in **Fördjupa tesen**. Review, immutable versions and outcome observations have their own native disclosures and contextual links. Empty lifecycle wrappers disappear. Archived outcomes remain accessible after their source thesis is deleted. There is no new draft persistence or autosave behavior.

Use native `details`/`summary` and keep deep-link targets stable. Reveal ancestors on navigation and validation. Searchable company selection uses a labelled search field and ordinary links; this avoids an unnecessary custom combobox keyboard model. Escape closes it and returns focus. Search covers only the existing twelve supported companies; manual entry explicitly states that automatic data is unavailable.

## Provenance and claim ownership

First explain what the value represents. Then show value, source, period and calculation. Taxonomy, accession and method details are deeper. Preserve the original provenance object and all caveats.

Public report sections carry text ownership labels, not color alone:

- **Författarens antagande** uses the manual/informational role.
- **Författarens bedömning** uses secondary text.
- **Författarens källhänvisningar** identifies author-supplied sources.
- `data-claim="reported"` and `data-claim="calculated"` reserve styling for future **Bolagsrapporterad data** and **NTM-beräkning** blocks; do not render these claims until the public schema actually supplies that data.

The report explains that publication is not NTM endorsement. Analysis date and publication date remain separate. No version number is invented. Author management remains in the existing private Research/account publication flows and profile links.

## Charts

The overview has one chart: the existing validated annual revenue series, up to six supplied annual records. Revenue reveals business scale over time without requiring a stock-price feed or valuation assumption. Banks use **Nettointäkter**. Display only validated USD data with at least two finite values; retain the existing overview and tables when a chart cannot be supported.

Use discrete bars, original fiscal-year labels, visible units, no animation and no interpolated curve. Missing fiscal years create empty slots, never fabricated zeroes. The visual is accompanied by an exact-value table and individual source buttons using the existing provenance dialog. The accessible chart description points to that table. The existing deeper financial charts stay available.

## Themes, mobile and accessibility

Both themes inherit the existing semantic palette. Define theme-dependent aliases on the themed body, not only at `:root`; otherwise the alias may retain its dark value. Do not rely on darker borders to fix hierarchy. Light mode must retain the open editor and report, not resurrect legacy white cards.

At 360/390/430 px, use a compact selector beside local navigation; place company identity near the top. Give the primary financial result its own row and use two columns for supporting results. All metrics remain available through **Visa alla nyckeltal**. The editor and report use 20 px gutters. The global navigation is unchanged.

Keep semantic headings, labels, table captions/headers, status announcements, 44 px controls, focus outlines and native dialogs. The `hidden` attribute must override component display rules. Respect reduced motion. Allow long source strings and technical content to wrap. Avoid decorative icon families and financial number animation.

## Examples and anti-patterns

Use the final screenshots in `docs/qa/visual-v3/final/` as rendered examples, alongside the baseline and iteration notes. A successful overview starts with the company and ends in a useful next task. A successful editor can produce a first thesis without teaching the whole methodology. A successful report attributes its claims and reads comfortably.

Avoid card-inside-card layouts, paragraph disclaimers in special boxes, identical primary buttons, permanent empty history sections, broad-coverage claims, neon financial decoration, technical source jargon in the first layer and mobile layouts that merely stack desktop setup controls.

Before adopting V3 elsewhere, inspect that workflow independently. Do not attach `.visual-v3` to unrelated pages as a bulk migration.
