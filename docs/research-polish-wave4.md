# Research Wave 4 — final product polish

26 September 2026 · Local implementation

## Changes

- **Entry:** search is directly exposed beneath the introduction. Up to three recent items precede browsing, with saved/manual status and last-use dates. The current 12-company catalog displays as one simple list; larger catalogs retain alphabet groups and pagination. A local-storage read error has an explicit Min NTM recovery/backup link.
- **Bolagsdata:** consistent topic headings, section spacing, thin source dividers, readable context and 44px controls. Existing charts, filters, histories, comparability notes and empty/unavailable states remain intact.
- **Källor & metod:** reporting, guidance, KPI, segment, capital, insider, ownership and event evidence use the existing native provenance dialog. It moves and restores the original disclosure nodes, preserving IDs, handlers, official links, original passages and lazy-loaded report details. Guidance/KPI values and segment amounts can open their contextual source directly; matching evidence rows receive focus. Financial metric provenance continues through its existing dialog flow. The fundamental-source index and legacy anchor disclosures remain available.
- **Learning and utilities:** restrained guidance and sensitivity explanations link to existing Knowledge pages. Existing EPS help remains next to assumptions. Versions, outcomes, exports, publication, privacy and inactive tools retain the subordinate positions approved in Waves 1–3; no new utility hierarchy was necessary.
- **States:** the existing distinctions between empty, inapplicable, unavailable, partial/stale and unchanged data were retained. A blocked save can disable its button and drop focus to the page body; save feedback now remains in view based on the submit attempt rather than button focus alone.

## Browser and screenshot findings

A fresh pre-change audit covered 33 company/routes plus entry using real NVDA, SOFI and CRWD data. Two polish passes each covered 33 company/routes, ten entry width/theme combinations and seven source contexts. The matrix rotates desktop, tablet, 430, 390 and 360px across the three companies and both themes rather than repeating every combination. Dedicated regression suites additionally exercise the full responsive company matrices and saved/draft/valuation states.

Representative screenshots were visually inspected in both passes. Entry lost its nested panel chrome; detailed topics remain deliberately dense. Inspection caught an obsolete alphabet label, inherited narrow dialog width, a full-width close button squeezing the title, and dialog-level horizontal overflow. These were corrected. Wide source tables now scroll inside labelled keyboard-accessible regions; the dialog title and close action remain usable. Page-width checks were supplemented with dialog-width and title-width assertions.

- [Entry, desktop dark](qa/research-polish/pass-2/entry-1440-dark.png)
- [Entry, mobile light](qa/research-polish/pass-2/entry-390-light.png)
- [Outlook, mobile](qa/research-polish/pass-2/SOFI-data-topic-outlook-360-dark.png)
- [Evidence after keyboard navigation](qa/research-polish/pass-2/segmentSources-open.png)
- [Pass 1 records](qa/research-polish/pass-1/results.json) · [Pass 2 records](qa/research-polish/pass-2/results.json)

Keyboard checks verify modal focus containment, Escape/close return, direct-value focus, and closing evidence on browser history navigation. Hidden workspaces remain hidden/inert. Reduced motion and forced colors were exercised. The shared interaction uses one delegated click listener and one observer for newly mounted evidence; it does not construct charts or write analytical state. Existing asynchronous company-generation guards and chart ownership are unchanged. This is rendering sanity validation, not a field performance benchmark or screen-reader usability study.

## Correctness and validation

Against approved pre-Wave-4 commit `6aec46b5aeea9001167b939cb8e781e6c65e7f6d`, all three companies retain exact financial objects, reverse/scenario outputs, sensitivity values, valuation snapshots and complete saved revision payloads under controlled timestamps/IDs. Normalized company and evidence JSON are equal to that baseline; canonical hashes are recorded in [equivalence evidence](qa/research-polish/equivalence.json). Dialog tests also compare source content and original DOM-node identity before/open/after.

Passed validation:

- Entry: seven browser tests, including 12/100/550-company catalogs, keyboard search, manual entry and zoom/reflow.
- Shell: 210 responsive cases, routing, legacy links, manual/unavailable states and export.
- Overview; guidance/KPI; segments; capital; insiders; ownership; material events; evidence presentation; Sedan din analys.
- Thesis save/revision, draft recovery, missing/negative/manual EPS, analytical navigation, historical inspection, sensitivity and selected-revision export.
- Review/lifecycle: nine tests. Publication Wave5: four tests. Offline social/privacy and real-SDK synthetic auth/session tests, including sync boundaries and no silent upload.
- Full browser smoke: 43 tests. Accessibility/CSP: 22 entry/company/workspace routes, both themes and desktop/narrow widths.
- Release validation: Python 310 passed / one existing skip; JavaScript 430 passed / two existing skips; evidence, generated artifacts, security, staging/CSP and local references.
- `git diff --check` and syntax/whitespace checks for new sources.

Older evidence tests now close the modal with Escape before using background controls. Their financial, source, filter, privacy and revision assertions remain intact. The small-catalog test checks the simple list while retaining alphabet and pagination assertions for large synthetic catalogs.

## Before / after and remaining limits

Compared with the pre-redesign structure in [the exploration](research-ia-ux-exploration.md), the default journey is bounded by the selected workspace instead of a long stack of unrelated tasks. Entry makes company selection obvious; writing and valuation have their own hierarchy; full research depth remains in explicit data topics. Evidence is available from its context without repeatedly expanding the document, and mobile retains the same location model. Typography, controls and spacing now read as one system.

Deep capital/ownership history is still long when deliberately opened. Complete source tables still require horizontal scrolling on narrow screens. The existing company header consumes meaningful mobile space. Beginner and advanced-user task testing, screen-reader testing and hosted authenticated writes remain future validation work; local auth/publication checks used synthetic/offline fixtures. No numerical UX score or claim of perfection is implied.

Locally release-ready based on the recorded checks. No financial calculations, normalized evidence, SEC updater, revision/baseline semantics, cloud/publication boundaries or export scope were changed. No further redesign wave was started. Nothing was committed, pushed or deployed.
