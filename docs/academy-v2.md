# Academy V2 — content depth and release readiness

## Delivery

Academy now has **29 published Swedish lessons**, six categories, six guided paths and eleven optional understanding checks. All original 25 stable IDs and progress records are retained. Four additions fill material gaps: `financial-statements`, `enterprise-value`, `forward-metrics` and `position-sizing`. This is a reviewed static learning area, not a live forecast or AI service.

The [internal editorial audit](internal/academy/editorial-audit.md) records a per-lesson before/after score and specific weakness/correction for all 25 original lessons. The review covered all requested dimensions, not just length. Every original lesson gained a distinct worked comparison and interpretation inside its existing advanced disclosure. Original short answers remain accessible. The four new lessons use the same short answer, relevance, worked example, depth, mistakes, exercise and source structure.

## Final curriculum

| Category | Published lessons |
|---|---|
| Kom igång | Aktier; Fonder; ETF; Avkastning; Risk; Diversifiering; Positionsstorlek |
| Sparande & kostnader | Ränta på ränta; Avgifter/courtage; GAV; ISK; Valutarisk |
| Förstå bolaget | Rapportens tre perspektiv; Omsättning; EPS; FCF; Marginal; Skuld; Utspädning |
| Värdering | P/E; CAGR; Omvänd värdering; Bear/Base/Bull; EV/EBITDA; Historik/prognos/konsensus |
| Makro | Inflation/köpkraft; Räntor/obligationspriser |
| Din egen analys | Investeringstes; Rapportuppföljning |

Market cap and dividends are developed in Aktier/Avkastning, PEG and multiples in P/E, operating cash flow and CapEx in FCF/Rapportens tre perspektiv, buybacks in Utspädning, and yield curve/unemployment in Räntor. These do not need separate thin pages. ROIC/ROE, complete bond valuation and more specialised sector accounting remain future candidates.

Paths now provide a goal, ordered lessons, completion count/percentage, a practical NTM endpoint and a suggested subsequent path:

- **Jag är helt ny:** 7 lessons → compare a saving plan.
- **Jag vill analysera aktier:** 8 → write a Research thesis.
- **Jag vill förstå värdering:** 8 → test scenarios.
- **Jag vill förstå makro:** 4 → read a calendar release's period/unit/source.
- **Jag vill förstå finansiella rapporter:** 7 → trace report lines to source.
- **Jag vill bygga en investeringstes:** 5 → save assumptions, falsification and review point.

Grund / Fördjupning / Avancerat communicate complexity. Paths do not gate access. Reaching the last URL does not count as completing a path: all its saved lesson states must be complete. Undo immediately removes completion. On completion, the next incomplete lesson or a new-path choice is shown. The home path card links to the practical workflow when finished. The completion button becomes enabled only after progress has loaded and its handler is ready.

Home adds recent completions (maximum three), descriptions of categories, goal-oriented paths, clear new-user versus returning-user actions and shortcuts to search/paths. Lesson browsing uses compact ordered rows rather than a wall of lesson cards. Category views use shareable `academy.html?category=...#lessons` URLs and the same canonical home; they do not generate thin category SEO pages. Queries filter local catalog data and are not saved.

## Content, trust and discovery

Aliases now include mäklaravgift, snittavkastning, pris/vinst, fritt kassaflöde, börsvärde, buybacks and Swedish report names. Eleven checks cover risk, CAGR, EPS, reverse valuation, currency, P/E, GAV, financial statements, EV, forward estimates and position sizing. Checks test reasoning, show explanations and never store answers or gate completion.

Shared relations automatically publish new lesson entities and destinations. Reusable concept-help links are demonstrated in Research, the return/valuation/purchase calculators and the portfolio article; generated hrefs resolve through `NTMRelations.conceptHref`. No calculator math or Research data was changed. EV teaching explicitly tells users not to put EBITDA into the P/E calculator's EPS field.

Examples were recalculated, including CAGR/reverse/PEG against the existing pure valuation module. Source metadata was expanded for accounting and macro, including IFRS IAS 33, IAS 7 and IFRS 15, SEC statements/non-GAAP guidance, ESMA ETF replication, BLS definitions and the existing Investor.gov, Riksbanken, BEA and Skatteverket sources. Sources are placed in disclosures and dated 2026-09-15. The ISK rule registry remains the sole home for current parameter values. The review is an implementation-agent editorial review, not a claim of independent expert sign-off.

## Architecture and knowledge bank

`academy-catalog.js` remains the maintained source. Its optional `extension` contains a titled worked comparison and interpretation. Path metadata adds `goal`, `endpoint`, `entity` and `nextPath`; category metadata adds learning purpose. `journey(id, states)` derives completion without storing a second progress model. V1 local event schema and backup V3 are unchanged. Cloud payloads and queues still exclude Academy progress.

`scripts/academy_quality.cjs` validates publication structure, content floor, sources, related lessons and journey integrity before the SEO builder can generate pages. A minimum word count guards against accidental truncation; editorial quality is assessed separately. All 29 lesson pages have static body content, unique metadata and query-free canonicals. Unpublished/stale artifacts remain blocked. Total site sitemap: 58 canonical URLs.

`docs/internal/academy/knowledge-bank.json` is deliberately empty. It is outside the public staging allowlist. No invented questions, public submission endpoint, public FAQ pages or live AI were added. `validateBank` supports:

```text
version: 1
entries[]: id, question, answer, lessonId, category, sources[{title,url}],
           reviewedAt, reviewedBy, status, provenance
status: draft | reviewed | published
provenance for reviewed/published: real-user-question-reviewed
```

Workflow: obtain a real question with permission → remove private information → manual editorial review → write and verify an answer with relevant sources → record reviewer/date and stable IDs → reviewed knowledge-bank entry → optional human-approved lesson update. The schema enforces review metadata, not truth; a person must actually perform the review. Before any public bank renderer is added, explicitly extract **published entries only** into a public artifact. Never expose this internal draft store. Any retained raw correspondence belongs outside the repository. Future AI must use reviewed material as its grounding source.

Two additional name-only events, `academy_search` and `academy_path_completed`, reuse the existing memory-only bounded allowlist. Search emits once per page interaction, without text; completion emits on a real incomplete→complete transition, not every render. No lesson IDs, quiz details, financial inputs or profiling payloads are added.

## Change inventory and validation

Main changes: catalog, UI, CSS, Academy/SEO builders, shared event allowlist, calculator concept-help markup, generated Academy pages and portfolio article, sitemap, publication/knowledge-bank validator, tests and documentation. No progress/backup/cloud schema or financial-tool formulas changed. Earlier uncommitted Research expansion work was preserved.

Tests add publication rejection, source/alias integrity, derived path completion and undo, numerical fixtures, knowledge-bank review validation, private-event payload rejection, and real-browser completion/resume/undo/category/quiz/related-link flows. Existing legacy backup, cloud exclusion and Connected Experience coverage remains active. Browser tests exercise 375/1440 widths, both themes, reduced motion, native keyboard disclosures, and static reading with JavaScript disabled. Screenshots are inspected, not merely generated.

Final command results and screenshot evidence are recorded in [Academy V2 validation](academy-v2-validation.md).

## Scope and V3

V2 is designed to be released as a foundational learning area. It does not claim exhaustive finance coverage or measured teaching effectiveness before real use. After public usage, prioritize observed misunderstood examples, path abandonment and genuine reviewed questions. Consider ROIC/ROE, a Swedish annual-report walkthrough or a deeper bond lesson only when those needs are evidenced. A future cloud adapter needs explicit opt-in and clock/conflict semantics; more AI features are not a prerequisite for teaching quality.
