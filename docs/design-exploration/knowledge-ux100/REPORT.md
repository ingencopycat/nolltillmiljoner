# Knowledge UX 100 — product and interaction exploration

**Historical A/B/C report. Owner selection is now complete: A is selected. See [FINAL A](FINAL-A.md) for the current resolved prototype, validation and readiness. The findings below describe the earlier exploration.**

2026-09-20. Isolated owner-review environment. **Ready for owner selection; no direction selected.**

**Review:** http://127.0.0.1:8765/docs/design-exploration/knowledge-ux100/

The hub opens the product immediately, with A/B/C, viewport, theme and state controls outside the product frame. [Short review procedure](README.md). [Gallery](gallery.html). No production files were edited.

## 1. Current production baseline

`fragor-svar.html` leads with “Frågor & svar”, “Hitta ditt svar”, filters, core questions and category disclosures. `knowledge-ui.js` inserts Fråga NTM between the search/category controls and featured questions. Answers appear within a status region with full-answer links and deeper disclosure. This works, but places question answering inside a broader FAQ/discovery hierarchy. The main interactive answer view does not currently render the catalog’s typed follow-up relationships as a question journey.

Production already provides static, crawlable direct answer pages and paginated area pages. The actual URLs are `fragor-svar-*.html`, not `/kunskap/...`. Those URLs, canonicals, indexing states and generated files remain unchanged.

## 2. Engine capabilities available to UX

The current public compact index contains 100 objects and 43 concepts. `knowledge-core.js` supplies exact/alias retrieval, intent boundaries, reviewed clarifications, judgment/no-coverage abstention, input validation, only the approved `pe/1` calculation, search, visibility/review policies and lazy body loading. Lazy loading verifies identity, question, short answer, content version and source shape, deduplicates pending loads and bounds its cache. The prototype calls those APIs directly.

`fixtures.json` records actual outcomes. “Vad är P/E?” resolves to `pe`; “Är P/E 40 dyrt?” to `pe-interpretation`; “P/E vs P/S” to `pe-versus-ps`. “marginal” returns a clarification containing the existing bundled `margins` answer, not three invented margin objects. “Och forward då?” returns no coverage. The short numeric request without currency/period is invalid; the explicit SEK/annual version calculates 20.

## 3. Product goals

Make a reviewed answer the first useful result. Keep depth available without exposing the whole inventory. Separate asking, finding and discovering. Explain boundaries without alarming error treatment. Connect understanding to actual published tools and learning material. Keep the experience anonymous and clearly reviewed rather than generative.

The five-second first-screen goal is a design hypothesis for owner review, not a measured user-study result. Each landing exposes the Fråga NTM heading, one labeled composer, a short trust line and three public starting questions.

## 4. Canonical vocabulary recommendation

| Purpose | Copy |
| --- | --- |
| Product entry | Fråga NTM |
| Content identity | NTM:s granskade kunskapsbank |
| Modes | Fråga / Sök / Utforska |
| Trust | Svar från NTM:s granskade kunskapsbank. Inga AI-genererade svar. |
| Depth | Fördjupa · exempel & begränsningar |
| Provenance | Källor & granskning / Senast granskad / Gäller |
| Continuity | Fortsätt utforska / Ställ en ny fråga |
| Typed continuations | Förstå grunden / Fördjupa / Vanlig förväxling / Närliggande begrepp / Nästa fråga |
| Action | Använd det, followed by the actual published destination |

This does not rename production navigation or URLs. “Granskat” reflects existing catalog state; this task performed no new source or editorial review. Source count is explicitly not a quality score.

## 5–7. A — Samtal: philosophy and two passes

**Philosophy:** centered editorial question/answer flow with a compact visible question trail. It feels continuous without bubbles, avatars or an accumulating transcript. Previous questions are canonical titles, not stored user questions.

**Pass 1:** the centered composer and reading rhythm were clear. The initial renderer incorrectly looked for typed relations only in the lazy body projection; that produced an empty continuation block. Several answers also devoted too much space to a visible loading/completion status and a large programmatic focus outline.

**Pass 2:** use typed relations from the full compact index, keep announcements available to assistive technology while visually quiet, refine the compact trail, simplify the input label to “Din fråga”, and retain inline source disclosure. A maximum of five public IDs forms the trail; mobile gives that vertical list a bounded region. No persistence creates fictitious returning-user activity. Historical pass-one captures are `pass1-a-*.png`; final captures are in the gallery.

## 8–10. B — Arbetsyta: philosophy and two passes

**Philosophy:** a two-column reading workspace on desktop. The question and answer stay central; source disclosure, related questions and product links share a secondary side column. It is not a three-column documentation portal. History appears as a compact wrapping trail.

**Pass 1:** simultaneous answer and continuation visibility reduced the need to scroll on desktop, but the header retained unnecessary landing spacing after a question. Long action labels crowded the narrow margin. Source details could compete with body reading.

**Pass 2:** remove the answer-state landing gap, reduce sidebar metadata/action type size, correct singular source labels, and preserve the full-width reading block before the sidebar on mobile. The source panel remains collapsed until requested. The same compact-index relation correction applies. Historical captures: `pass1-b-*.png`.

## 11–13. C — NTM Fokus: philosophy and two passes

**Philosophy:** one reviewed answer in a financial reading frame. A restrained underlined question entry gives it a distinctive NTM identity. Beneath the answer, three depth views—Förstå mer, Granska underlaget, Använd det—change the supporting material. These are answer-level views, not extra top-level product modes. Browser Back/Forward carries the question history; no visible transcript.

**Pass 1:** the larger split landing worked, but the Fråga NTM masthead remained large after answering and competed with the answer. Opening sources together with the long-answer fixture exposed two views at once, weakening the single-focus model.

**Pass 2:** shrink the masthead and composer once an answer opens, keep the answer prominent, tighten depth-view spacing and keep one support view visible at a time. Source opening is deliberate and the state is represented by `aria-expanded`/`aria-controls`. Long-reading and source screenshots are separate where necessary. Historical captures: `pass1-c-*.png`.

## 14–26, 28–30, 43. A/B/C comparison

No scores, winner or automatic recommendation are assigned.

| Characteristic | A — Samtal | B — Arbetsyta | C — NTM Fokus |
| --- | --- | --- | --- |
| Landing / first visual emphasis | Centered question invitation | Left-aligned question workspace | Split editorial heading and underline composer |
| Asking the first question | One visible input + submit | Same | Same |
| Direct answer | Canonical title and short answer | Same, beside supporting material | Larger reading lead, single focal answer |
| Initially visible depth | Short answer; depth collapsed | Short answer; sidebar available | Short answer; support view chosen below |
| Progressive depth | Inline prose, example and limitation disclosure | Same in reading column | Same within Förstå mer |
| Question-session model | Five-ID vertical compact history | Five-ID wrapping trail | Current answer + browser history |
| After five questions | Bounded five titles; no full transcript | Bounded wrapping trail | Current answer only; Back remains usable |
| Clarification | Inline reviewed choices | Same central task area | Same focused task area |
| Abstention | Calm boundary with relevant next action | Same | Same |
| Calculation | Marked calculated result, separate reviewed explanation | Same in reading column | Same above depth views |
| Comparison | Semantic side-by-side table | Same, sidebar alongside on desktop | Same before depth views |
| Related questions | Below the explanation/source layer | Desktop margin; below answer on mobile | Within Förstå mer |
| Product continuation | Inline Använd det | Desktop margin / mobile below | Dedicated Använd det view |
| Search discovery | Secondary top mode; compact results | Same | Same |
| Explore discovery | Secondary top mode; category → concept → questions | Same | Same |
| Sources | Inline native disclosure | Margin disclosure on desktop | Granska underlaget view; opens source disclosure |
| Desktop efficiency | One reading path with more scrolling | Context available alongside answer | Fewer simultaneous support areas |
| Mobile | Single column, compact vertical trail | Sidebar moves below reading, trail wraps | Same focused views, no transcript |
| Long answer | Editorial prose in the reading flow | Reading plus inspectable side context | Reading view remains quiet; switch to sources |
| Starting over | Ställ en ny fråga returns focus and clears composer | Same | Same |
| Light/dark | Canonical V3 tokens | Same | Same |
| 1,000+ objects | Bounded Search/Explore rendering | Same | Same |
| Relative implementation work | Session trail and inline composition | Responsive two-column composition and trail | Answer-level view state and visibility/focus logic |
| Engine compatibility | Existing resolver/body APIs | Same | Same |

The shared Search/Explore model is intentional: philosophy differs where the owner is choosing how answers, depth and continuity work, rather than changing the meaning of retrieval between directions.

## 27. Direct canonical-page behavior

The hub’s direct-page state is `direct.html`, a local static P/E reading page generated from the actual public object. It contains the short/full answer, example, limitations, source links and related questions in delivered HTML. It works with JavaScript disabled. It presents no invented previous session and has a clear Fråga NTM continuation. All directions share this standalone reading foundation with their type treatment.

Real canonical links also remain available from each interactive answer and point to the existing production HTML. The production P/E page was tested without JavaScript. The local page has `noindex,nofollow`, no new canonical claim and no sitemap registration. A production implementation must retain server/generated static content and per-object reviewed/noindex/published policy; a client-only replacement is not sufficient.

## 31. Accessibility findings

The 528-state matrix checks accessible names on visible controls and no horizontal overflow at 1440/360/390/430, both themes, all directions. Complete journeys exercised keyboard submission, native disclosure activation, related links, modal Escape/focus restoration, mode switching and return to the composer. Comparison tables retain captions and column/row headers. Calculations expose text, units and basis without color-only meaning. Status announcements are separate from the answer, avoiding a whole long article as a live region. Headings and landmarks remain semantic.

Reflow was tested at 720 and 360 CSS pixels, equivalent to the layout viewport of a 1440px window at 200% and 400%. This is not a native browser-zoom or screen-reader certification. Reduced-motion behavior was checked. Canonical text/background token-pair contrast is at least **5.24:1** in light and **7.38:1** in dark for the tested body/secondary/muted/accent/control pairs. Focus outlines remain on interactive controls; programmatically focused answer headings do not gain a distracting rectangle.

Remaining owner/usability checks: actual assistive-technology reading order, perceived discoverability of C’s source view, and A’s small bounded history scroll area after several questions. The prototypes do not claim an independent accessibility audit.

## 32, 37. Performance and synthetic scale

Cold local landing payload: approximately **202 kB uncompressed**, including logo, HTML, canonical V3 tokens, real core/index and isolated UI files (exact current measurement in `review-checks.json`). The compact catalog is 102,500 bytes. **Zero full answer bodies** and no action projection are requested initially. The initial DOM contains only the landing and seven category controls when Explore is opened, not 100 answer cards.

The scaling harness uses the same core, retaining the real 100 entries and adding clearly named synthetic metadata-only entries/concepts. It does not create fake answer bodies or claim that 1,200 reviewed answers exist. Concept cardinality increases too, rather than simply placing every synthetic question in one group.

| Objects | Compact fixture JSON bytes | Build/index ms | Retrieval p95 ms | Search p95 ms | Explore p95 ms | Search rows | Concept rows | DOM after browse |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 100 | 102,101 | 3.6 | 0.1 | 0.9 | 0.4 | 12 | 8 | 185 |
| 500 | 415,655 | 10.2 | 0.1 | 1.4 | 0.8 | 12 | 10 | 192 |
| 1,200 | 966,287 | 24.1 | 0.1 | 2.3 | 1.4 | 12 | 10 | 192 |

Twenty operations per timing sample, local desktop Chromium, without mobile CPU/network throttling. Sub-millisecond measurements approach timer resolution; they are not device-independent latency guarantees. Search pages contain at most 12 rows, concept pages at most 10 groups, and each opened concept at most eight question rows. Pagination replaces rows instead of appending an unbounded inventory. The UI is bounded, but compact-index bytes grow approximately linearly; future production payload budgeting at 1,200+ remains necessary. There is no reason to fetch all full bodies to implement any direction.

## 33. Privacy and analytics

No LLM, remote inference, upload, account integration or analytics SDK is loaded. No local/session storage is used by the prototypes. Only public answer IDs, mode and a maximum five-ID trail enter browser state; raw questions, financial values and private Research content do not enter URLs, storage or network requests. Current input/result values exist only in the current document and clear on leaving it. Sharing/reloading a calculation link restores the reviewed explanation, not the user's numbers.

`ntm-product.js` currently allows `knowledge_search`, `knowledge_answer_opened` and `knowledge_related_cta_clicked`, with a strict metadata allowlist. No arbitrary ID, question, ticker, number or new outcome dimension should be added casually. Exploration emits none of them. Future production can reuse those coarse events; mode/clarification/abstention events would require a separate deliberate contract decision, not a new telemetry system built here.

Tests use fresh browser contexts so a real product popup's own normal local initialization is not mistaken for prototype storage. Privacy sentinels never appeared in history state, URL or outgoing requests.

## 34. Browser history and deep links

Each reviewed answer navigates to the isolated shell with a public `id` parameter. Back, Forward, copied answer URL, refresh and a six-question sequence passed in every direction. An unknown ID fails honestly. Search text is deliberately not encoded; Search can be reopened but a raw search is not restored. A and B's compact trail lives only in the current history entry, not durable “recent activity”. C omits visible history. A copied answer URL starts with the current answer, not a fabricated previous conversation.

Abstention/invalid outcome URLs retain only their class. Clarification choices remain public IDs in transient history, not query text; a refreshed clarification link cannot reconstruct the raw query and asks again rather than manufacturing context. Calculation values are not recoverable after refresh by design. These are explicit privacy tradeoffs for owner review.

## 35. Context entry and return

Research/FCF, calculator/P-E, Macro/release overview and Public Research/FCF states call `K.explain` with the real allowlisted context. The initial entry block demonstrates the help affordance rather than inventing private Research content. Native dialog close/Escape restores focus; deepening enters the full answer. Public Research copy explicitly separates NTM's explanation from the author's analysis.

The existing `knowledge-help.js` / `wave1-ui.js` contract uses compact help in a dialog, and deeper static reading in a new tab with `#task-help`, leaving original work untouched. `wave1-context.js` has a different, tightly validated Research/Academy assumption handoff requiring preview/apply. It is not a generic Knowledge return-payload mechanism.

The exploration consequently opens canonical product destinations in new tabs, with no copied assumptions, thesis text or calculator inputs. Closing the product tab returns to the unchanged Knowledge tab. No new arbitrary return URL or cross-product storage protocol is invented. Product continuations are projected from actual published entity/lesson references; even a company-specific Research destination is retained as catalog-authored, not inferred from the visitor. Academy receives ordinary links, no mastery awards or fabricated help-exposure records.

## 36. Real fixtures used

`pe`, `pe-interpretation`, `margins`, `pe-versus-ps`, `fcf-limitations`, `falsification`, `isk-year-scope`, `eps`, `forward`, `pe-losses`, `fcf`, `macro-releases` and `asset-ownership` are real fixtures. Search/Explore use all current visible entries, not a parallel curated design catalog. `fcf-limitations` is among the deeper current objects (1,119 characters across full answer/example/caveats); it tests experienced-user depth without padded invented prose.

Time-sensitive scope displays real `SE`/`2026` metadata from `isk-year-scope`. The expired-rule demonstration changes only its date in an in-memory fixture and labels the scenario. No stale substantive answer is displayed. Load failure and version-corruption demos invoke the actual core's rejection behavior through isolated response faults. The test additionally removes each fault and verifies successful retry. Index failure and malformed-link views offer static reading or a safe restart.

## 38. ENGINE GAPS DISCOVERED BY UX

| Desired experience | Current boundary | Possible future decision | Necessary now? |
| --- | --- | --- | --- |
| “Och forward då?” after P/E | No contextual pronoun/follow-up resolver; returns no coverage | Deterministic bounded follow-up grammar could be researched separately; not inherently an AI requirement | No: use the actual reviewed forward continuation or ask an explicit question |
| “Price 100, EPS 5” as arbitrary math | Approved grammar requires currency and annual/TTM/forward period; only `pe/1` executes | Keep explicit input form; approve any new template separately | No |
| Three margin-specific choices | Current clarification points to one bundled reviewed comparison | Editorial decision before creating separate answers | No |
| Typed relations from one lazy body | Single-body public projection filters cross-object links | Join already-public compact-index relations in the UI, as done here | No core change required |
| Recover raw question/calculation on refresh | Deliberately absent for privacy | Explicit opt-in retention would need its own design/privacy review | No |
| Same-tab generic Knowledge → product → return | No current generic safe public-ID handoff | Design only if new-tab continuity proves inadequate; do not reuse private scenario payloads | No |
| Live market synthesis or a buy/sell verdict | Not an engine capability | Remain outside reviewed deterministic answers; no future AI implemented | No |

No engine gap has been silently simulated or implemented in production.

## 39. CONTENT GAPS DISCOVERED BY UX

- **“marginal”**: separate gross/operating/net dictionary choices are absent as separate objects; the existing `margins` comparison is honest coverage. Splitting it only for a prettier chooser is not justified. Low priority until user tasks prove the need.
- **P/E follow-up set:** the seed `pe` object currently links to EPS, forward and PEG. Interpretation/losses/P-S coverage exists, but not every desired next-question edge exists on that seed. The exploration shows actual edges. Consider an editorial relationship review, not invented UI recommendations.
- **Broad wording “om investeringar, ekonomi eller NTM”** reaches beyond 100 reviewed questions. `Hur fungerar kvantdatorer?` intentionally demonstrates no coverage; it is not a proposed financial-content expansion. Unknown NTM operational questions should continue to abstain until authored.
- Some inherited sources do not have section support mappings. The source view says support is unspecified instead of inventing it. Existing Batch 0/editorial work owns those gaps; this task does not change approval dates or evidence claims.

## 40, 45. Production implementation maps

| Area | REUSE EXISTING, all directions | NEW UX CODE if A selected | NEW UX CODE if B selected | NEW UX CODE if C selected |
| --- | --- | --- | --- | --- |
| HTML | Static direct pages, semantic navigation, sources, robots/canonicals | Ask-first landing + inline answer | Ask-first landing + reading/aside structure | Ask-first landing + focused answer views |
| CSS | V3 token file, Georgia/Segoe, button/focus conventions | Centered reading/trail rules | Desktop grid + mobile stacking | Underline composer + depth-view hierarchy |
| Runtime | Core `respond`, `calculate`, `load`, `explain`, public index | Bounded trail and renderer | Trail, renderer and sidebar placement | Renderer, controlled view visibility/focus |
| URL/history | Existing public canonical destinations | Public-ID shell routing + trail snapshots | Same with wrapping trail | Public-ID routing; current-only display |
| Retrieval | Same outcome classes and reviewed aliases | Outcome renderer | Same | Same |
| Lazy loading | Existing identity/version checks and bounded cache | Race cancellation and retry UI | Same | Same plus hidden-view management |
| Search/Explore | Core search, categories, concepts, public entries | Compact paginated views | Shared views | Shared views |
| Context/return | Existing inline help / new-tab contract | Adapt composer entry/focus | Adapt sidebar/full answer entry | Adapt focused answer entry |
| Analytics | Existing coarse Knowledge events only | Explicit hooks after acceptance | Same | Same; no answer-view dimensions by default |
| Accessibility | Semantic controls, sources, static fallback | Trail focus and announcements | DOM order and responsive reading order | View controls, focus and hidden content |
| Tests | Existing retrieval/SEO/history/content tests | Add shell/history/privacy cases | Add grid/mobile/source order | Add view and Back/Forward cases |
| Migration | Retain public URLs and generated no-JS answers | Replace landing progressively | Same | Same |

**ENGINE CHANGE REQUIRED:** none for the demonstrated directions. Contextual natural-language follow-up, new math templates or a generic same-tab transfer are separate potential work, not prerequisites. Do not copy the exploration's response-fault injection, scale fixture hook or local review controls into production. Production should consume the canonical relation catalog/build path rather than manually maintain `actions.json`.

## 41. Files created

Everything is under `docs/design-exploration/knowledge-ux100/`:

- `index.html`, `hub.js`: owner controls and comparison frames.
- `app.html`, `app.js`, `exploration.css`: three isolated compositions using shared real-engine adapters.
- `direct.html`, `direct.js`: generated static standalone P/E exploration.
- `actions.json`, `fixtures.json`, `build.cjs`: canonical public relation projection, recorded outcomes and local artifact builder.
- `gallery.html`, `gallery.js`, `screenshots.json`, `screenshots/`: lazy screenshot gallery and 132 final captures.
- `capture_pass1.py`, six `pass1-*.png`: first-pass evidence.
- `validate.py`, `review_checks.py`, `validation.json`, `review-checks.json`, logs: repeatable checks and measurements.
- `production-baseline.json`: hashes of all 3,831 pre-existing tracked files.
- `README.md`, this report: owner procedure and implementation comparison.

## 42. Production unchanged

All **3,831** pre-existing tracked-file hashes match the baseline. Git shows only this new exploration directory. No production Knowledge HTML/CSS/JS, catalog, answer body, SEO output, navigation, schema, review state or dates changed. No Research-selector, provenance, authentication or site-wide Visual V3 work was reopened. No commit, push or deployment.

## 44. Owner-review instructions

Use the hub, spend roughly two minutes in each direction without reading this report first, then inspect the required states and mobile variants. Open the selected product separately to test browser history. Use the gallery for direct state/theme comparisons. Express a preferred philosophy and any specific source/history treatment you want to borrow. The hub uses neutral labels and no ranking.

## 46. Risks by direction

**A:** longer scrolling as sources/relations/actions accumulate; the compact five-ID history must not evolve into an endless transcript. **B:** desktop sidebar can pull attention away from the answer; its mobile stacking needs continued testing with unusually long sources. **C:** sources/actions require a deliberate view change; users may overlook them, and view state must not hide focus or duplicate content. All share the index-size growth and bounded-engine coverage limitations described above.

## 47. Shared components supported by real repeated states

Question composer, answer header, native depth disclosure, source renderer, clarification chooser, boundary renderer, approved P/E result/form, semantic comparison table, typed continuation links, canonical product actions, compact Search rows and paginated Explore groups. These are plain DOM functions, not a new framework. The real engine and static page generator remain separate responsibilities.

## 48. Do not combine blindly

Do not combine A's visible trail, B's full sidebar and C's three support views: that duplicates navigation and overloads the answer. Do not display the same sources in both sidebar and focus view, or copy all three landing treatments onto one screen. A borrowed source treatment must have one location and one focus path. Keep just Fråga/Sök/Utforska at the product level.

## 49. Remaining owner judgments

Choose visible continuity versus a wrapping trail versus current-answer focus; source discoverability versus visual quiet; sidebar desktop efficiency versus a single reading path; the desired prominence of product actions; and whether new-tab continuity is sufficient. Confirm the broad composer wording against current coverage. No answer-content approval is implied by choosing a layout.

## 50. Completion and validation result

Ready for owner selection. All three directions are interactive, use identical real retrieval semantics, and offer the required states in dark/light and desktop/mobile. **528** responsive state checks, complete journeys in all three directions, **132** gallery captures, source inspection, actual failure/retry, no-JS direct pages, 100/500/1,200 scaling, privacy checks, hub/side-by-side/gallery checks and `git diff --check` passed. Supplementary results are in `review-checks.json`; primary results are in `validation.json`.

The automated checks and visual review support local exploration readiness. They do not constitute owner preference, production implementation approval, an independent editorial review, native screen-reader certification or a live deployment test. The next task begins only after owner selection.
