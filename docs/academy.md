# NTM Academy / Learning Room V1 foundation

**Current release: [Academy V2](academy-v2.md).** The following records the original V1 design. V2 has 29 lessons, six paths and eleven checks; its guide supersedes the counts and workflow details below. The local progress and backup foundation remains unchanged.

Academy is a Swedish, local-first learning area with **25 published lessons**, six categories, four optional paths and five optional understanding checks. It follows “simple by default, powerful when you want it”: a short explanation and practical example are visible; accounting nuance, formulas and references sit in native disclosure controls. No login, paid API, live AI, scores or prerequisites.

## Architecture and editorial ownership

`academy-catalog.js` is the single maintained catalog: stable ID/slug, title, category, difficulty, aliases, summary, sections, related concepts/entity IDs, source metadata, quiz, order and publication status. All lesson prose and examples are original Swedish teaching material. Source references support definitions and regulatory context, not investment recommendations. English terms are explained where they are commonly used.

`scripts/build_academy.cjs` renders the home and one static `academy-<slug>.html` per published lesson. It runs through `scripts/build_seo.cjs`, which supplies navigation, metadata, canonical URLs, CSP and sitemap membership. Do not edit generated lesson HTML. Adding a lesson normally requires one catalog row, source review and any desired path membership; tools and related links resolve through the shared catalog.

`academy-ui.js` adds local progress, search/category filters, optional checks, path continuation and a compact Min NTM summary. Core reading and navigation work without JavaScript; the page discloses which enhancements need it. `academy.css` uses the existing container, Premium UI and Color System V2 tokens. Shared navigation adds Academy under “Lär dig”; the rest of the site is not redesigned.

## Published curriculum

| Category | Lessons |
|---|---|
| Kom igång | Vad är en aktie?; Vad är en fond?; ETF; Avkastning; Risk; Diversifiering |
| Sparande & kostnader | Ränta på ränta; Avgifter och courtage; GAV; ISK; Valutarisk |
| Förstå bolaget | Omsättning; EPS; FCF; Marginal; Skuld; Utspädning |
| Värdering | P/E; CAGR; Omvänd värdering; Bear/Base/Bull |
| Makro | Inflation och köpkraft; Räntor och obligationspriser |
| Din egen analys | Investeringstes; Rapportuppföljning |

Börsvärde, utdelning, multiplar, PEG, avkastningskrav, KPI/KPIF/CPI/PCE, arbetsmarknadsdata and the three principal financial statements are introduced inside the relevant lessons. They are not thin standalone pages. Each lesson includes practical relevance, a worked numerical or process example, advanced nuance, common mistakes, a specific exercise, related concepts and a method statement. Mathematical examples state their simplifying assumptions. Research lessons distinguish SEC data from manual values and explain unavailable metrics.

The ISK lesson does not hardcode a current tax rate. It links its stable `ruleId: isk` to `data/rule-registry.json` and the year-sensitive ISK calculator. Its numerical example explicitly uses a hypothetical rate. Review the registry before changing any dated tax guidance.

## Paths and discovery

- **Jag är helt ny:** aktier → fonder → risk → diversifiering → ränta på ränta → avgifter → ISK.
- **Jag vill analysera aktier:** omsättning → marginal → EPS → FCF → skuld → utspädning → tes → rapport.
- **Jag vill förstå värdering:** avkastning → CAGR → EPS → P/E → omvänd värdering → scenarier.
- **Jag vill förstå makro:** inflation → räntor → valuta → risk.

Paths are ordered subsets, not gates. The `path` query parameter carries next-lesson context while canonical URLs remain query-free. A user can open any lesson directly. Home shows the latest unfinished lesson based on local progress events, or the next unfinished lesson in catalog order. This is transparent local continuation, not inferred investor profiling.

Search normalizes Swedish accents and case, splits the query into terms and matches titles, summaries, aliases, concept IDs and category names. Category selection and an explicit zero-result count work without a service. No search strings are stored or emitted as analytics.

## Local progress and backup V3

`academy-progress.js` owns `ntm-academy-progress-v1`:

```json
{"version":1,"events":[{"id":"stable-uuid","lessonId":"cagr","status":"complete","at":"2026-09-15T12:00:00.000Z"}]}
```

No event means “Inte påbörjad”; opening an unfinished lesson records “Pågår”; the completion button switches between “Klar” and “Pågår”. Revisiting an unfinished lesson updates local continuation; revisiting a completed one does not undo completion. Completion has no quiz requirement. Overall and category counts include currently published lessons only, while unknown future lesson IDs survive backup/import.

Events are immutable, merged by ID and rejected if the same ID contains different content. State resolves by timestamp, then ID. Local clocks are not an authoritative cross-device ordering service; cloud V2 must address clock skew before enabling distributed progress edits. Writes check storage and read back the result, with failure messages and attempted rollback. Corrupt/unsupported data is not silently discarded. LocalStorage is not a transactional multi-tab database.

Portable backup exports **schemaVersion 3**, adding `data.academy`. V1/V2 imports synthesize an empty Academy history and merge without erasing current progress. V3 requires the Academy field. All existing stores retain their merge/conflict/rollback rules. Ticker-specific deletion does not delete Academy. Explicit “clear all local data” includes learning history and the account-deletion checkbox names it.

Academy is **not sent to the current optional cloud adapter or persistent sync queue**. Existing cloud restores merge an empty Academy history while preserving local learning. Stable lesson/event IDs and a versioned store prepare a future adapter; no cloud schema or account requirement has been activated.

## Connected Experience and inline help

The relation catalog publishes `learn-<lessonId>` entities from the Academy catalog. Lesson exercises use existing tool/workflow IDs; related concepts use learn entities. Existing planned links now resolve to real pages. Tools link back to concepts, Research links to learning, and the portfolio article links to thesis education. Research retains its existing thesis, valuation and article journeys alongside Academy. Relation queries deduplicate destinations and remain bounded.

`NTMRelations.conceptHref(catalog, 'eps')` is the reusable concept hook. Static pages can add `<a data-concept-help="eps">…</a>`; the SEO builder supplies its canonical href and label. Research uses this for EPS. CAGR, P/E, FCF and GAV also resolve through the same API. Unknown hooks fail generation rather than create dead links. No private financial inputs are copied across links.

## Checks, analytics and accessibility

Risk, CAGR, EPS, FX and reverse valuation each have one optional radio-button check. A submitted answer produces an immediate explanation; answers and scores are neither persisted nor tracked. Users can complete a lesson without answering. Each question has a fieldset/legend, labelled controls, submit button and live status.

Events use the existing bounded, memory-only allowlist: `academy_lesson_opened`, `academy_lesson_completed`, `academy_path_started`, `academy_tool_cta_clicked`. The implementation emits names only; lesson IDs, free text, searches, quiz answers and account identifiers are not accepted as event metadata. This is not a learning-profile analytics service.

Pages have semantic headings, labelled native progress bars plus textual counts, native disclosures, labelled search/category controls, visible keyboard focus and mobile controls. Color is not the only progress indicator. Min NTM contains one compact progress/continue section and points to the existing backup panel.

## SEO and publication

All 25 lesson bodies are present in delivered HTML with unique titles, descriptions and canonicals. They appear in the sitemap with Academy home. No artificial ratings, course credentials, FAQ claims or unreviewed structured data are added. Only published catalog lessons generate output. Unpublishing a previously generated page requires explicitly retiring its HTML artifact and checking incoming relations; do not leave stale indexable files behind. `build_seo.cjs --check` must pass before release.

## Future knowledge bank and AI

The reviewed static catalog remains the source of truth. Proposed workflow:

1. A real user question is selected with appropriate permission; remove personal/account details.
2. An editor writes and verifies an answer, sources, applicability and review date.
3. Store the reviewed answer under a stable knowledge-bank ID with editorial status.
4. Promote recurring material to a lesson or FAQ only after human review; preserve provenance and redirects.

No public submission endpoint or live AI is implemented. Future “förklara enklare” or “ge ett exempel” must be grounded in reviewed passages and preserve definition/example/assumption distinctions. Do not let generated answers silently change tax rules or financial inputs.

## Remaining content gaps and V2

V1 is foundational, not a complete investing curriculum. Dedicated bond/duration analysis, portfolio allocation exercises, fund-document walkthroughs, advanced valuation, Swedish financial statements, richer macro releases and a reviewed FAQ bank remain future work. Prioritize observed learner questions and content quality before adding more pages. A future cloud progress adapter should define clock/conflict behavior and obtain clear opt-in. A printable learning plan and better cross-lesson navigation can precede any AI work.

See [validation and delivery inventory](academy-validation.md) for final checks and screenshots.
