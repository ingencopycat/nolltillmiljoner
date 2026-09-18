# Wave 1A — baseline visual audit

Captured and inspected in Chromium before implementation, 2026-09-17. Evidence: `docs/qa/visual-v3/before/`, 40 screenshots across 1440 / 360 / 390 / 430 px and both themes. Public analysis uses an intercepted public API fixture, never a real publication. New, saved and expanded assumption states use real local Research interactions.

## Findings

- Company overview: the eye starts at an inventory of thirteen navigation pills and a large manual-entry container. At 390 px the company appears far below navigation. The selected investment is visually subordinate to setup.
- Desktop wastes its first screen on selection and technical company metadata. The TTM numbers are four equal cells rather than an intentional financial hierarchy. Historical data is buried in disclosure.
- Light mode reintroduces header and metric boxes despite dark-mode flattening. Source pills and CIK compete with company identity. Explanatory links interrupt the metric heading.
- New thesis resembles a compliance form: a bordered outer card, fieldset rules, nested assumption disclosures, repeated instructions and tiny captions. Three detailed assumptions arrive before falsification and the review date. Saving requires traversing unrelated optional fields.
- Existing thesis exposes review decisions, editor, version management and outcomes as independent full sections. There is no concise current-case entry point. Deletion and publication compete with saving.
- Deep states retain useful capability but their repeated lines and narrow mobile fields exaggerate administrative density. Typography does too little grouping.
- Public analysis is a small generic card inside a mostly empty desktop canvas, with redundant site preamble. On mobile the report title starts after extensive chrome; its disclaimer competes with the thesis. Date becomes a full content section. Author judgment has no editorial ownership treatment.
- No horizontal overflow in this baseline set. Keyboard and data semantics must remain intact while restructuring. Existing source detail and existing financial values must be preserved.

## Implementation direction

Company identity first; compact searchable selection in a disclosure; a restrained financial strip and one historical revenue chart. A three-question thesis editor with optional depth and contextual lifecycle entry points. Public reports use a reading measure, report metadata and clearly attributed author sections. Reuse existing palette, spacing and controls; introduce semantic typography/width/depth roles without changing unrelated pages.
