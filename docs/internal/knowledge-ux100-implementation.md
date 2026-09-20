# Knowledge UX 100 — FINAL A production implementation

2026-09-20. Owner-approved FINAL A implemented on the real Knowledge routes. No commit, push or deployment. Review the production implementation at `http://127.0.0.1:8765/fragor-svar.html`, not the exploration hub.

**Knowledge UX 100 is locally release-ready for owner review. The final isolated release gate passed**, including 167 Python tests (one existing skip), 303 Node tests, SEO/history/editorial/security, staging and local references. Full shared-working-tree release readiness is assessed separately from the two owner-added, unregistered week-39 images intended for later publication. Those files remain untouched. Do not interpret that weekly-publication failure as a Knowledge failure or silently omit it from a release.

## Implementation and preservation

| Requested topic | Result |
| --- | --- |
| 1. Production baseline replaced | Removed the old JavaScript FAQ/search-group enhancement from `knowledge-ui.js`. The generated landing now presents one Fråga/Sök/Utforska experience. The bounded, crawlable category pages remain the no-JS discovery path. |
| 2. FINAL A mapping | Centered reading column, illuminated composer, three modes, progressive answer depth, sources, Använd det, Fortsätt utforska, then ask again. No B/C branches, prototype controls, fixture loader or separate action JSON is shipped. |
| 3. Fråga NTM | Default landing calls the existing `NTMKnowledgeCatalog.respond`. Starter questions use reviewed retrieval. No remote inference, AI controls or generated answers. |
| 4. Composer | Exact requested placeholder: **Fråga om investeringar och ekonomi...**. A two-line native textarea wraps the full text on small screens; font remains 20px mobile/21px desktop before and after answers. Enter submits, Shift+Enter permits a line break, and IME composition is protected. The arrow button has accessible name Skicka fråga and a 44px/46px target. Glow and a separate focus outline persist after answering. |
| 5. Retrieval integration | Core, compact catalog, aliases, typos, clarifications, intent rules and formula resolver are unchanged. Benchmark: 234 cases, zero wrong confident matches, mismatches or alias collisions. |
| 6. Answer rendering | Lazy canonical bodies supply short answer, full explanation, example, caveats, typed comparison/formula, jurisdiction/period and review information. Text is inserted as text, not interpreted HTML. |
| 7. Progressive depth | Explanation/example/caveats use native details; only supported comparison and executable P/E sections appear. Empty product/relationship sections are hidden. Static pages keep their full explanation open initially for direct/no-JS readers. |
| 8. Clarification | Only canonical choices are offered. Selecting a choice loads that reviewed answer. Ambiguity is not converted into a confident answer. |
| 9. Comparison | Canonical axes and limitations render with caption, row/column headers and wrapping cells. No invented comparison content. |
| 10. Calculations | Existing `K.calculate('pe', …)` and `pe/1` contract only. Unit and period choices remain explicit; invalid inputs show a safe boundary. Values stay in the current DOM and are absent from URL, history, storage and analytics. Shared links open the explanation rather than reconstructing private calculations. |
| 11. Abstention and failure | Distinct clarification, personal-judgment, invalid-input and no-coverage states. Lazy failures and mixed versions show no answer body. Suppressed entries are excluded; unknown IDs cannot retry into an unrelated default P/E answer. Request sequencing prevents a late response from replacing a newer view. |
| 12. Sources/trust | Canonical sources and section-support metadata are used. Review date, source limitations and stale notices remain visible through progressive disclosure. Source count is not presented as a quality score. Static pages retain source checks and content version. |
| 13. Använd det | Appears before reviewed question continuations in DOM/keyboard order. Destinations come from the existing `NTMRelations` catalog/query, not a parallel registry. Real Academy, calculator, Research and Macro destinations open with `noopener noreferrer` and no value/prose transfer. |
| 14. Fortsätt utforska | Uses canonical typed `relatedAnswers`, with labels such as Förstå grunden, Jämför med, Vanlig förväxling, Fördjupa and Närliggande begrepp. No token-similarity recommendations. |
| 15. Search | Blank, whitespace, punctuation-only and one-character normalized queries show no inventory and do not call Search. Meaningful queries use unchanged canonical matching/ranking, optionally filtered by existing category/intent. At most 12 rows; refine-query guidance replaces pagination. |
| 16. Explore | Seven canonical categories; at most ten concept disclosures at a time and eight questions within an opened concept. Further discovery is bounded. No initial inventory dump. |
| 17. Direct canonical pages | All 100 answer routes retain their URLs, content and metadata/index policy. Generated static reading uses the same hierarchy and V3 typography, and works without JavaScript. Category pages and merge compatibility generation remain intact. |
| 18. Contextual Knowledge | Research, calculators, Fundamental Profile, Academy, Macro and Public Research keep their compact help. `knowledge-help.js`, assessed-help logic and frozen Public Research rendering were not replaced by the full shell. |
| 19. Return behavior | Existing new-tab and `#task-help` contracts remain. Continuing from a standalone help answer into Fråga NTM retains the safe fragment and close/return notice. Product actions leave the answer tab available. No private return URL or editor text is serialized. |
| 20. Browser navigation | Public answer IDs and modes are deep-linkable. Back/Forward and refresh are tested. A maximum-five public-ID trail is held in history. Raw questions and numeric inputs are not stored; form fields are cleared on pagehide. Coarse boundary states can refresh without retaining the question. |
| 21. Privacy | Only existing coarse `knowledge_search`, `knowledge_answer_opened` and related-click events are used, without query/value payloads. Tests inspect requests, analytics, URL, history and browser storage for a synthetic private sentinel. All protected tracked source/data files remain unchanged. |
| 22. Accessibility | Native forms/buttons/details, labelled textarea and filters, article headings, polite status, table headers, focus restoration, keyboard clarification, Enter/touch submission, reduced motion and forced colors are checked. 200%/400% reflow equivalents use 720/360 CSS px from a 1440px reference; this is not a claim of manual screen-reader or native browser-zoom certification. |
| 23. Mobile | Production state matrix covers 360, 390, 430, 768, 1440 and 1920 CSS px. Long input remains editable within the wrapping textarea. No horizontal page overflow in tested answer, comparison, calculation, source, Search or Explore states. |
| 24. Light/dark | Both themes use canonical V3 colors. No site-wide palette changes. Screenshot review fixed inherited label/formula styling, and final captures finish theme transitions before comparing colors. |
| 25. Performance | Existing compact index/lazy-body architecture retained. Initial DOM does not grow with catalog size. No backend, vectors or full initial answer corpus. See measured table below. |
| 26. Scale | Actual 100 objects and in-browser synthetic 500/1,200 compact-index responses tested. Synthetic content is not staged or registered. |
| 27. Compatibility | `fragor-svar.html`, all canonical answer/category URLs and category fragments remain. Category fragments open Explore. Existing contextual `#task-help` is retained. New `?id=<public-id>` and `?mode=search|explore` contain no raw question. Obsolete DOM selectors were migrated in browser tests; external routes were not renamed. |
| 28. Screenshot review | Two review passes on production routes covered landing, post-answer, modes, Search, Explore and mobile/light/dark. Additional final comparison, interpretation, direct-answer and source captures are under `visual-review`. Corrected inherited pill styling, missing relation dependencies and narrow formula styling before acceptance review. |
| 29. Files changed | Runtime: new `knowledge-experience.js`/`.css`; reduced `knowledge-ui.js`. Generation: `scripts/build_knowledge.cjs`, new `knowledge_landing.html`/`knowledge_presentation.cjs`; 113 regenerated landing/answer/category HTML files. Staging adds the two runtime assets. No canonical content/data files changed. |
| 30. Tests added/changed | New six-test `knowledge_ux100_browser.py` covers the production state matrix, history/privacy/return, failure injection, touch, scale and reflow/no-JS. New `knowledge_ux100_regression.py` records release gates. Existing smoke, Knowledge 100/batch/expansion, V3 screenshot selectors and one Wave 1 practice-link label were migrated to the approved interface; underlying expected content/security outcomes remain. |
| 31. Release gates | Final isolated release: PASS. All requested Knowledge, Wave, auth/social/RLS, smoke and quality gates passed. See evidence and the explicit owner-image qualification below. No failed assertion was hidden to claim a green shared working tree. |
| 32. Remaining limitations | Deterministic reviewed coverage only; P/E is the sole executable formula. Search retains the existing engine's broad substring candidates. Performance is local, uncompressed and unthrottled, not field Core Web Vitals. Native screen-reader/zoom acceptance remains an owner review activity. Future weekly-image publication is outside this task. |
| 33. Deviations from exploration | The exact longer placeholder requested for production uses a wrapping textarea instead of the prototype's shortened one-line text. The prototype-only acronym intersection is omitted to obey the explicit instruction not to change retrieval semantics: e.g. P/E Search retains the engine's broader candidates, while Fråga still resolves precisely. Existing production header/footer and canonical direct pages are retained instead of copying mock site chrome. |
| 34. Local release readiness | Knowledge UX 100 is locally release-ready: its final isolated release and relevant browser gates pass. The complete shared working tree cannot pass weekly publication while the owner's two future images remain unregistered. They were preserved, not moved or deleted. |
| 35. Owner procedure | Follow the procedure below on the real production routes. No commit/push/deploy has been performed. |

## Measured scale

Latest production-browser measurements: [scale.json](../qa/knowledge-ux100/knowledge_ux100_browser/scale.json). Chromium 151, 390px viewport, 50 warmed samples. Values below are rounded; sub-millisecond zeros reflect timer resolution. Interaction times include browser automation.

| Objects | Compact index bytes | Initial DOM nodes | Initial answer-body requests | Ask p95 | Search + render p95 | Explore interaction | Lazy answer interaction |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 actual | 102,101 | 196 | 0 | 0.1ms | 1.8ms | 67ms | 55ms |
| 500 synthetic | 508,349 | 196 | 0 | <0.1ms | 7.3ms | 73ms | 79ms |
| 1,200 synthetic | 1,221,083 | 196 | 0 | <0.1ms | 15.8ms | 60ms | 178ms |

Observed initial decoded resource totals were approximately 806KB, 1,212KB and 1,925KB respectively, including shared site assets. The synthetic index grows; the initial interface and body-request count remain bounded. Search renders at most 12, Explore at most ten concepts/eight opened questions.

## Validation evidence and owner-added files

[Regression results](../qa/knowledge-ux100/regression.json) link each named gate to its `.log` in the same directory. Passed checks include the 234-case retrieval benchmark (zero wrong confident matches), catalog/editorial/history/relationship checks, arithmetic, all 39 browser smoke tests, all Knowledge batch/expansion browser tests, Waves 1–5, auth/session, social/RLS, actionlint, and the accessibility/CSP/payload suite.

An earlier complete release run passed 167 Python tests (one existing skip), all 303 Node tests, generated SEO, history/editorial, calendar/rules, credential/CSP scans, staging/local references and diff checking. The final shared-tree rerun correctly rejected these newly appeared files:

- `images/makro/week-39.png`
- `images/rapporter/week-39.png`

The owner confirmed they were added separately for later use. They have no published week/data mapping yet. They remain unchanged in the shared workspace. The final release-only checkout copies the current Knowledge changes onto the same repository revision while excluding those two untracked future inputs; no commit is created. Its exact path, copied files and result are in [isolated-release.json](../qa/knowledge-ux100/isolated-release.json), with [full log](../qa/knowledge-ux100/isolated-release.log). This distinction must be retained when deciding what to publish.

[Preservation evidence](../qa/knowledge-ux100/preservation.json) records the 100 canonical body hashes and zero changes in protected tracked data/catalog/core/relations/contextual/frozen-report code. Historical QA artifacts remain historical; current evidence is under `docs/qa/knowledge-ux100/` (Wave 4 uses the sibling folder required by its existing fixture paths).

The [exact implementation file manifest](../qa/knowledge-ux100/implementation-files.json) lists modified tracked files and new source/report files. Screenshot and execution artifacts are kept separately in the QA directory.

## Owner production-review procedure

1. Open `http://127.0.0.1:8765/fragor-svar.html`. Check the full placeholder and send arrow at desktop and 360/390/430 widths, in both themes. If the local server is stopped, run `python -B -m http.server 8765 --bind 127.0.0.1` in the repository.
2. Ask **Vad är P/E?**, **Är P/E 40 dyrt?**, **marginal**, and **P/E vs P/S**. Check directness, clarification and typed comparison. Open depth/sources, then confirm Använd det precedes Fortsätt utforska. Follow a related answer, use Back/Forward, and reload.
3. Ask **Aktien kostar 100 SEK och årlig EPS är 5 SEK vad är P/E?**. Check 20 gånger. Try the explicit formula with missing/negative values, then **Är NVIDIA ett köp?** and an uncovered question. No unrelated answer should replace a boundary or failure.
4. Switch to Sök: blank means no inventory; P/E shows compact canonical candidates and refinement guidance. Switch to Utforska, open an area/concept and browse the bounded questions.
5. Open `fragor-svar-pe-tal.html` directly and without JavaScript. From Research/calculator/Academy help, open a full answer, continue into Fråga NTM and return to the untouched work tab. Check one product action opens separately without copying values. Review the final screenshots under `docs/qa/knowledge-ux100/visual-review/` if useful.

The owner-added weekly images need their own publication decision before a full working-tree release. This implementation task does not publish or register them.
