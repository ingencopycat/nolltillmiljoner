# FINAL A — Conversational Focus, owner-feedback resolution

2026-09-20. **Ready for owner acceptance and as the basis for production implementation.** This task stops at the isolated prototype. Production implementation has not begun.

**Review hub:** http://127.0.0.1:8765/docs/design-exploration/knowledge-ux100/

**Direct FINAL A:** http://127.0.0.1:8765/docs/design-exploration/knowledge-ux100/app.html?d=final

[56 final screenshots](final-a-gallery.html) · [Validation results](final-a-validation.json) · [Measured placeholder fit](final-a-placeholder.json) · [Server/review commands](README.md)

## 1. Direction A elements preserved

Fråga NTM remains the dominant entry. The centered editorial answer, five-public-ID compact question trail, Enter submission, reviewed continuations, progressive depth, source disclosures and single-column reading flow remain A. No B sidebar or C answer-view navigation has been introduced. Fråga/Sök/Utforska remain separate modes.

The prototype still calls the actual deterministic Knowledge resolver, approved P/E calculator and lazy-body validator. It retains exact-question/alias behavior, clarification, comparison, judgment/no-coverage boundaries, unsuitable-input behavior and time-sensitive suppression. There are no generated answers, AI calls, account dependencies or new content approvals.

## 2. Composer identity before and after an answer

A restrained accent border and static low-opacity glow now apply in both landing and post-answer states. After answering the glow is modestly quieter, but the surface and electric edge remain. A distinct two-pixel focus outline is independent of the decorative glow; keyboard focus does not rely on a shadow alone. Both themes use existing Visual V3 palette tokens. No pulsing, animation, neon gradient or sticky composer was introduced.

The post-answer field keeps the same 20px mobile input typography as the landing. The prior mobile reduction to 17px is removed for FINAL A. Desktop uses 21px. The composer stays editable above the answer; **Ställ en ny fråga** still clears it and restores focus from the end of the reading flow.

## 3. Submit control

Removed the visible **Visa svar ↗** treatment in FINAL A. A simple upward-arrow SVG now sits within a 46px desktop / 44px mobile accent button. It is decorative to assistive technology; the real submit button has accessible name **Skicka fråga** and an Enter hint. The input exposes `enterkeyhint="send"` for mobile keyboards.

Native form submission still handles Enter. Mouse and touch retain a visible control. The arrow is an upward submit affordance, not the external-link arrow used on actual destination links. No chat avatar, fake AI indicator or extra composer toolbar was added.

## 4. Continuation hierarchy

After reviewed explanation/depth/source controls, **Använd det now precedes Fortsätt utforska in the actual DOM**, not merely through CSS order. Reading and keyboard order agree. The final sequence is understand → use → reviewed continuations → ask again.

All product links still come from the existing canonical public relation projection. P/E retains Aktievärdering, Nvidia Research and the published Academy links. No new action or destination was fabricated.

## 5. Mode navigation

Exactly three controls remain. Desktop mode labels are now 16px semibold with 48px targets; mobile uses 15px semibold and an evenly divided row. The selected mode has both accent underline and restrained surface emphasis. Ordinary keyboard navigation and `aria-current` remain intact. These are product controls, not large navigation cards, and they remain secondary to the current question/search/exploration task.

## 6–9. Search semantics, blank state, queried results and inventory removal

FINAL A Search requires a meaningful query: at least two normalized letters/digits. Blank, whitespace, punctuation and a single character do **not invoke `K.search`**, render answer rows or reveal inventory through category filters. Blank Search shows one calm invitation and a route to Utforska. Filters appear only when a query is meaningful.

Real queries still call the existing `K.search` and preserve its ordering. Focused inspection found that the core's loose substring search returns incidental matches for `PE`, including CapEx and period-related entries. For recognized short acronyms only, FINAL A additionally intersects those candidates with the catalog's existing canonical concept references. It uses `NTMKnowledgeCore.normalize` and the current concept term/abbreviation registry. It does not alter the engine, invent aliases, infer new concept links or create a new ranking system.

`PE` now shows nine genuinely P/E-linked reviewed objects: `pe`, `peg`, `forward`, `pe-interpretation`, `pe-losses`, `pe-versus-ps`, `peg-limitations`, `price-value` and `valuation-sensitivity`. PEG remains because its existing metadata explicitly links it to P/E. CapEx and bond yields are not included merely because text contains the letters `pe`. Results retain canonical question titles and compact category/question-type context; full answer bodies are not rendered in the result list.

For a broad meaningful query, at most **12 matching rows** are rendered. The message asks the user to refine the query or choose an area when more matches exist. There is **no next-page button, numbered pagination, infinite loading or browse-all path in FINAL A Search**. The old Search paging control is removed from the FINAL A DOM. A result cap is not a prompt to page through the bank; full discovery belongs to Utforska.

## 10. Placeholder decision

Selected **“Fråga om investeringar…”** after focused measurement. The proposed “Fråga om investeringar och ekonomi…” requires 344px at the approved 20px Georgia font; it does not fit the available width at any of the three mobile sizes with the compact submit control. The shorter wording is 223px and remains explicit about investing. Supported economics/NTM questions continue to work; the placeholder does not define engine coverage.

| Mobile width | Available text width | Selected placeholder | Longer proposed wording | Font, placeholder and entered text |
| --- | --- | --- | --- | --- |
| 360 | 234px | 223px — fits | 344px — does not fit | 20px / 20px |
| 390 | 264px | 223px — fits | 344px — does not fit | 20px / 20px |
| 430 | 304px | 223px — fits | 344px — does not fit | 20px / 20px |

The same measurements hold before and after an answer. No smaller placeholder typography, multiline placeholder, clipping or overlap was used to force a fit. These are measurements in the local Chromium/system-font environment, not a guarantee of identical glyph widths on every platform.

## 11–12. Mobile composer and continuing after an answer

The full placeholder fits at 360/390/430. Both themes and answer states retain the electric border/shadow. Enter and visible-button submission work for the first and subsequent questions. The field remains in the normal page flow; there is no bottom overlay or large sticky chat bar.

A long entered question was separately tested at the normal 20px mobile / 21px desktop size. Its complete editable value is retained. Native single-line input scrolling allows editing long text without making the page overflow; this is separate from placeholder fit, which requires no input scrolling. Returning through **Ställ en ny fråga** empties the field and gives it visible focus.

## 13. Explore preservation

Utforska retains categories → concept groups → reviewed questions. Category controls remain seven; concept rendering is bounded to ten groups per page and each expanded group to eight question rows. Explore's existing browsing controls remain available. Search does not duplicate that inventory behavior. The same real 100-object compact index and lazy bodies support both modes.

## 14. Accessibility, trust, privacy and continuity

Focused checks passed for accessible control names, keyboard submission, source disclosure, relation activation, mode switching, modal Escape/focus return, and the new 44px+ submit target. Decorative glow does not replace the focus outline. Reduced motion disables motion while keeping the static identity. Text/control colors continue to use the canonical high-contrast V3 tokens.

200%/400% layout-reflow equivalents were checked using 720/360 CSS-pixel viewports from a 1440px desktop, in both themes. No horizontal page overflow was found. This is layout/reflow verification, not certification of native browser zoom or a screen-reader audit.

Browser Back/Forward, refresh and related-answer URLs retain `d=final` and public canonical answer IDs. Direct static and production P/E pages remain readable without JavaScript. Context entry from Research, calculator, Macro and Public Research still uses the real compact explanation contract. Source and product URLs, separate-tab targets and `noopener noreferrer` are preserved.

Product safety copy is slightly shorter: **“Öppnas i ny flik. Svaret är kvar här. Inga värden eller texter förs över.”** This remains visible, not hidden in a tooltip. No assumption, calculator input or private Research prose is transferred. No raw question/search text or supplied values enter history, storage, analytics or request URLs. No analytics infrastructure was loaded or added. Privacy sentinels and storage checks passed.

## 15. Scale and performance

The same canonical core was tested with real 100 entries and metadata-only synthetic 500/1,200 entries. Synthetic concepts also grow. No synthetic full answers are created. Timing is local desktop Chromium, 20 query-render samples per size, without mobile CPU/network throttling.

| Objects | Compact fixture bytes | Build/index | Blank Search rows | PE rows | Broad synthetic query cap | Search render p95 | Concept groups | Initial body requests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 100 | 102,101 | 4.0ms | 0 | 9 | 12 maximum | 2.5ms | 8 | 0 |
| 500 | 415,655 | 10.5ms | 0 | 9 | 12 | 5.2ms | 10 | 0 |
| 1,200 | 966,287 | 23.4ms | 0 | 9 | 12 | 10.4ms | 10 | 0 |

Blank Search remains empty even if an area filter already has a value. The 500/1,200 synthetic broad-query tests hit the 12-row cap without offering more pages. Known-query relevance stays stable as unrelated synthetic entries are added. The compact index still grows approximately linearly, so production should retain explicit payload budgeting; the UI does not solve that by loading all bodies.

## 16. Files changed in the isolated exploration

All changes remain under `docs/design-exploration/knowledge-ux100/`.

Updated:

- `app.js`: FINAL A selection, submit affordance, action order, bounded query-only Search and canonical-acronym filtering; A/B/C historical branches remain.
- `app.html`: loads the scoped FINAL A stylesheet.
- `index.html`, `hub.js`: FINAL A default, explicit required states and optional previous-A comparison.
- `README.md`, `REPORT.md`: current owner guide and a historical-report notice.

Added:

- `final-a.css`: scoped composer, navigation and compact safety/search styling.
- `final-a-gallery.html`, `final-a-gallery.js`: the final-only screenshot review.
- `final_a_measure.py`, `final-a-placeholder.json`: repeatable input-fit measurements.
- `final_a_validate.py`, `final-a-validation.json`, `final-a-validation.log`: focused checks and results.
- `final-a-screenshots/`, `final-a-screenshots.json`: 56 final state/theme/viewport captures.
- `final-a-first-look.png`: initial visual check of the resolved composition.
- `FINAL-A.md`: this report.

All **3,831 pre-existing tracked-file hashes** still match the production baseline. Git shows only the isolated exploration directory. No production Knowledge code, stylesheet, page, catalog, body, schema, metadata, route or generated SEO artifact was changed.

## 17. Owner acceptance readiness

**Ready.** The review hub lands on FINAL A and exposes landing, post-answer composer, interpretation, action order, blank/PE Search, Explore, mobile sizes and both themes. Historical A/B/C remain explicitly labeled as history; the task did not create new competing directions.

Validation: **168 state checks, 56 screenshots, eight theme/viewport interaction journeys, three synthetic catalog sizes, placeholder measurements, no-JS direct pages, privacy/history/context checks and `git diff --check` passed.** No uncaught JavaScript errors were recorded during the state matrix. Visual inspection covered narrow dark landing, post-answer light composer, blank desktop Search and queried PE results.

Owner selection of A is already recorded. Acceptance of this final refinement is not presumed. This is prototype readiness, not a production release claim.

## 18. Exact production implementation implications

| Area | Required production work after acceptance |
| --- | --- |
| Landing and HTML | Implement A's ask-first composition in the production Knowledge landing, keeping exactly three modes and static/no-JS navigation. Move the icon submit's accessible markup into the initial HTML rather than prototype-time decoration. |
| CSS | Port only FINAL A's centered reading, compact history, persistent restrained composer identity and larger mode controls into scoped Knowledge styles using V3 tokens. Do not port B/C, review-frame styling or gallery CSS. |
| Question runtime | Reuse core `respond`, `calculate`, `load` and `explain`; add A's outcome/depth renderer and cancellation handling. Preserve `pe/1` scope and honest boundaries. |
| Search runtime | Port the blank/short-query guard, recognized-acronym concept intersection, existing engine ordering, 12-result cap and refinement guidance. Omit Search pagination entirely. Add explicit regression fixtures for PE versus incidental CapEx/period matches. |
| Explore | Retain bounded category/concept/question browsing and lazy loading; do not move inventory into Search. |
| Relations | Consume the canonical relation source/build projection and compact-index typed relations. Put product actions before related questions, preserve exact published URLs and separate-tab/no-transfer semantics. Do not hand-maintain a parallel actions catalog. |
| URLs and history | Decide the production shell's public-ID route encoding without changing existing canonical answer URLs. Retain Back/Forward and clear nonpersistent question/calculation state on leaving. |
| Sources and static pages | Preserve real review/scope/suppression rules and crawlable generated direct answers. Do not replace static answer pages with JavaScript-only rendering. |
| Accessibility | Keep labeled native form, icon-hidden semantics, focus outline independent of glow, semantic source disclosures and DOM reading order. Perform native zoom and assistive-technology review for the actual production shell. |
| Privacy/analytics | No raw question, supplied number, private text or arbitrary answer dimension. Use only separately accepted existing coarse analytics hooks; no new collection system is required. |
| Validation/release | Add production browser tests for this resolution and run the existing Knowledge/retrieval, static generation, context, privacy and release gates against the actual implementation. The prototype's synthetic/fault hooks must not ship. |

**No engine schema, reviewed content, new calculation template or AI work is required for the resolved FINAL A behavior.** Production implementation remains a separate task. No commit, push or deployment was performed.
