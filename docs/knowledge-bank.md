# Knowledge Engine 100 — Scale Foundation

NTM's public knowledge product is **Frågor & svar** (`fragor-svar.html`). It retrieves reviewed editorial explanations; it does not generate answers. Academy remains the structured learning and assessment product. This foundation implements Master Roadmap 3.0 §5.7 and §9 without starting another wave.

There are **41 visible answers** in the local canonical catalog: 26 original published seeds, three earlier reviewed answers, six Batch 1A reviewed answers and six Batch 1B reviewed answers. Batch 1B preserves all preceding 35 objects, including fingerprints and review/history metadata. Both batches have explicit owner approval of substantive scope, with primary-source mapping and arithmetic verification by Codex; this does not claim independent human source review. The additions are visible but noindex, with no publication date. See [Batch 1A](internal/knowledge-batch1a-report.md) and [Batch 1B](internal/knowledge-batch1b-report.md). They have not been deployed by these tasks.

## Sources of truth and delivery

| Source | Responsibility |
| --- | --- |
| `docs/internal/knowledge/catalog.cjs` | Existing editorial prose and sources |
| `docs/internal/knowledge/scale.cjs` | Small concept registry, seed intent mapping, structural sections and curated relationships |
| `docs/internal/knowledge/answers/*.json` | Future answer files; loaded automatically, drafts excluded |
| `docs/internal/knowledge/retrieval.json` | Versioned aliases, curated typos, explicit clarification groups, protected acronyms |
| `docs/internal/knowledge/merges.json` | Explicit reviewed retirements/targets and reasons; initially empty |
| `docs/internal/knowledge/history-baseline.json` | Substantive fingerprint/version baseline; no automatic approval/update |
| `data/rule-registry.json` | Existing annual rule parameters and verification deadlines |
| `knowledge-core.js` | Allowlisted public projection, compact index, deterministic retrieval, approved formula and shared context contract |
| `scripts/build_knowledge.cjs`, `scripts/build_seo.cjs` | Static pages, metadata and public payload generation |

The generated `knowledge-catalog.js` contains a compact searchable index: questions, short excerpts, routing, intent and relationship metadata. It excludes full explanations, worked-example prose, caveats and sources. Those are in generated `data/knowledge/answers/<id>.json`, loaded only when requested. Node uses the internal source through its public projection; internal files are never staged. The browser never requests `docs/` or `scripts/`.

Requests contain an allowlisted answer ID, not the question, supplied financial values or Research prose. They omit credentials and referrer. A 24-answer memory cache and in-flight deduplication bound retained bodies; no localStorage/query history. Missing payloads and version mismatches fail visibly. The static answer page remains the no-JavaScript fallback.

## Concepts and distinct answer intents

A concept has a stable ID, preferred Swedish term, derived normalized term, category, synonyms, abbreviations, optional metric ID and related-concept IDs. `conceptRefs` points to these concepts. The older `concepts` field remains the Academy/Connected Experience vocabulary for compatibility; do not confuse the two namespaces.

An answer has its own stable ID/slug, one question, one intent, concept references, short/full explanation, caveats, optional example, reviewed aliases, sources, editorial responsibility, version and status. One concept can have several answers: EPS definition and provider-comparison; P/E definition and trailing/forward comparison. An interpretation question is not an alias for a definition merely because both contain P/E.

Intent vocabulary: `definition`, `calculation`, `comparison`, `interpretation`, `limitation`, `misconception`, `process`, `application`. Do not add finer intent labels unless a concrete retrieval/editorial need justifies them.

Optional typed sections:

- `inline`: canonical `shortAnswer` reference and explicitly allowed consumer contexts.
- `formula`: approved versioned template ID, explanation/limitation field references, independently testable example. Currently only `pe/1` executes; no expression evaluator.
- `comparison`: bounded axes with label/left/right and limitations. The pilot restructures the existing forward/trailing and CAGR/total-return sentences without introducing new financial claims.
- `interpretation`: references existing full explanation and unsuitable-case caveats; debt and report reaction exercise this contract.
- `relatedAnswers`: manually curated `prerequisite`, `common-confusion`, `related-metric`, `deeper`, or `next-question` edges. No similarity-generated public recommendations.

## Evidence, reviews and corrections

A source record carries title, HTTPS URL, actual checked date, `type` (`definition`, `methodology`, `rule`, `reference`), authority (`primary`, `secondary`, `unclassified`), supported sections, evidence status, what was checked, and limitations where newly verified. A reachable URL does not establish support for a claim. A provider convention must not be described as universal. ChatGPT is not a primary source.

Legacy entries are explicitly marked `inherited-not-independent`; inherited section mappings are retained, and unmapped sections are reported. Only the 29 seed IDs can use this exception. New visible entries require accepted editorial responsibility, named reviewer/date matching the answer, and checked section-level sources for short answer, full explanation and caveats. No tooling sets accepted status automatically.

`contentVersion` changes only with substantive content. `retrieval.version` changes for matching configuration. Correcting an alias must not fabricate a new content review date. `knowledge_history.cjs` checks substantive fingerprints against the saved baseline. A correction records `{from, to, reason, reviewer, date}` in internal `history`; changed prose without a newer version and corresponding history fails the release gate. Keep the baseline as evidence until a deliberate editorial baseline update; never refresh it just to silence a failure.

Review policies distinguish `stable`, `methodology` and `rule`. Overdue behavior is explicit: `label`, `suppress`, or `needs-update`. Suppressed answers are not returned as answers/explanations; needs-update cannot remain visible. Stable legacy entries without a scheduled review are reported for owner scheduling rather than assigned fabricated dates. ISK reuses the rule registry deadline, validates current verified rules at build time, and carries no copied annual threshold/rate in its evergreen explanation.

| Status | Public content | Search indexing |
| --- | --- | --- |
| draft | Excluded | Excluded |
| reviewed | Visible after validation | noindex, follow |
| published | Visible after validation | Canonical and sitemap |
| needs-update | Excluded | Excluded |

## Retrieval, search and calculations

`respond(question)` returns `kind`, reason, answer ID or reviewed choices, and retrieval version. Outcomes: `ANSWER`, `CLARIFY`, `ABSTAIN_NO_COVERAGE`, `ABSTAIN_UNSUPPORTED_JUDGMENT`, `INVALID_INPUT`.

Priority is exact reviewed question, definition-equivalent phrasing, reviewed alias, curated typo, then conservative concept/intent matching and bounded typo assistance. Specific direct questions always outrank overlap. Broader interpretation/comparison candidates require confirmation; an unrelated sentence containing a metric does not receive its definition. Legacy `ask()` remains available for compatibility; production Fråga NTM uses `respond()`.

Typos: curated exceptions first, then at most one edit for a single 7–32-character term, considering reviewed aliases/definition terms. Multiple nearby answers produce choices. Short acronyms are not fuzzed into other financial metrics. Existing reviewed `LTTM` is a deliberate exception, not a general EPS/PE/PEG/CPI/PCE correction rule.

`avkastning` clarifies CAGR/FX/compounding; `avgift` clarifies trading/annual fees. Choices are real reviewed questions, not invented answers. Unsupported comparisons do not combine independent definitions into a winner. “Är P/E 40 dyrt?” abstains because a reviewed answer to that interpretation is absent; it never returns the P/E definition as the answer. A future independently reviewed interpretation is an ordinary new answer file, not an engine rewrite.

`calculate(answerId, {price, eps, currency, period})` executes only an approved `pe/1` template. Price is positive, EPS finite and nonzero, both bounded to 10¹², same explicit currency (SEK/USD/EUR/GBP), and annual/TTM/forward period. Negative EPS returns the canonical limitation rather than a misleading negative valuation multiple. The caller must use the same per-share basis; no FX conversion or EPS-basis inference occurs.

The form supplies these fields explicitly. A bounded text template also accepts, for example, **“Aktien kostar 100 SEK och årlig EPS är 5 SEK, vad är P/E?”** or **“Pris 123,45 USD och TTM EPS 2,5 USD”**. Mixed currencies, missing units/period, unsupported expressions and ambiguous prose require explicit form inputs. It never parses arbitrary mathematics, forecasts a price or decides buy/sell. Results include the calculation, basis and limitation.

Search is deliberately broader: normalized question, alias, concept, category and intent. All terms must match; results are capped at 12 in the UI. Ask returns a bounded outcome instead of a list that silently implies confidence. Neither query is stored or sent to analytics. Only existing name-only events remain.

## UX, browsing and SEO

The initial page shows Fråga, Sök and collapsed Utforska areas, not the inventory. Search shows at most 12 cards. Opening a category renders at most 12; larger areas have paginated static category pages (12 links each). Category pages are `noindex, follow`; they provide navigation, not thin search-target pages. Reviewed/published answer URLs retain their previous status and canonical destination. Full answer pages work without JavaScript.

Merges are editorial actions with source ID/slug, active target ID, reason, reviewer and date. Targets must be active answers: chains/loops are rejected. The old static URL provides a clear link and canonical target, with noindex. This is a static-host compatibility page, **not an HTTP 301**. No merge was performed in the pilot. Retire obsolete answer HTML/JSON explicitly; the generator rejects orphan artifacts so a withdrawn answer cannot silently remain deployed.

Visual V3 remains canonical. Native forms, details/summary, tables with headers, live status, dialog focus return, keyboard operation, reduced motion and narrow-screen reflow are maintained. Google controls indexing/snippets; no rich-result promise or mass SEO generation is made. Homepage SEO is unchanged by this work.

## Shared consumer contract

Use `await NTMKnowledgeCatalog.explain(answerOrPilotConceptId, context, mode)`. Contexts are `knowledge`, `research`, `calculator`, `macro`, `public-report`, `academy-reminder`; modes are `compact`, `full`, `reminder`. Compact/reminder return canonical excerpt, caveat, URL, version/date and stale flag. Full additionally returns explanation, example, sources and sections. Invalid contexts/IDs return no explanation. Never pass form values, thesis prose or account state.

| Consumer | Behavior |
| --- | --- |
| Research + Fundamental Profile | Existing Wave 1/4 IDs resolve through shared lazy full help; inputs and return focus preserved |
| Valuation + savings | Existing P/E/EPS/assumptions/compounding/fees/inflation help retained |
| CAGR, GAV, FX, compounding, annual-fee, ISK calculators | Bounded canonical help disclosure through `knowledge-help.js`; formulas remain calculator-owned |
| Leverage/FIRE/withdrawal tools | Existing method explanations retained; missing dedicated Knowledge coverage is not invented |
| Academy | Reminder through the shared contract; help is recorded before loading/exposure, and a changed attempt invalidates an in-flight response |
| Macro | Existing release/rate help uses canonical explanations and preserves calendar context |
| Public Research + preview | Generic revenue/margin/thesis terminology, separate from frozen author claims; opening help does not mutate publication data |

## Authoring and maintenance

See [the owner procedure](internal/knowledge100-owner-review.md) and the five local [examples](internal/knowledge/examples/definition.json). Use new JSON answer files instead of extending the seed helper, whose defaults belong only to the original batch.

```text
node scripts/knowledge_editorial.cjs template definition my-definition docs/internal/knowledge/answers/my-definition.json
node scripts/knowledge_editorial.cjs validate
node scripts/knowledge_editorial.cjs preview docs/internal/knowledge/answers/my-definition.json docs/internal/knowledge/my-preview.html
node scripts/knowledge_editorial.cjs report
node scripts/knowledge_editorial.cjs sources
node scripts/knowledge_history.cjs
node scripts/knowledge_history.cjs --record-new
node scripts/build_seo.cjs
node scripts/build_seo.cjs --check
node scripts/knowledge_benchmark.cjs
node scripts/knowledge_scale.cjs
python -B scripts/validate_release.py
python -B scripts/knowledge100_regression.py
```

Template kinds are `definition`, `formula`, `comparison`, `interpretation`, `sensitive`. The optional output path writes UTF-8 safely, refuses overwrite and stays inside internal Knowledge. Templates contain copied seed prose for orientation and remain **drafts**; replace it and its evidence before approval. The preview is visibly an unpublished draft, escaped, noindex and outside staging. Publishing is a source edit by the reviewer followed by generation/release, never a CLI promotion shortcut. After accepting new answers, explicitly run `knowledge_history.cjs --record-new` to register their initial fingerprints; it requires accepted source metadata, records only new visible IDs and never changes an existing baseline or review date. The audit follows consecutive correction-history steps across later versions, including substantive typed sections and source-evidence changes. Date-only reviews and retrieval aliases do not alter that fingerprint. Seed structural defaults preserve explicit editorial overrides. Regression counts assert the original 29 IDs without prohibiting future validated additions.

Validators reject duplicate IDs/slugs/questions, unresolved alias collisions, bad concept/lesson/answer references, unsafe source URLs, malformed/unknown sections/formulas, unknown private answer fields, oversize content, invalid review/scope metadata and unsafe merges. A separate maintenance report lists concept × intent × context coverage, source gaps, review age/deadlines, orphan concepts, unintegrated answers, formula revalidation and possible duplicates. Similarity results require editorial judgment; nothing merges automatically. Source HEAD checks distinguish reachable, broken and access/network-unverified; they are not financial verification.

## Evaluation and scale limits

The durable labeled benchmark is `tests/fixtures/knowledge100-queries.cjs`, including reasons, expected outcomes/IDs, acceptable choices, forbidden fallback IDs and version. Existing Wave 0/1 fixtures remain. Results separately report exact answers, clarification, abstention, invalid input and wrong confident matches; failures are individually inspectable. Formula units/boundaries, public projection, stale state, mixed-deployment loading and malicious inputs have separate tests.

`knowledge_scale.cjs` creates only in-memory synthetic 100/500/1,200-answer catalogs; synthetic generation requires an explicit test option. It does not publish files or content. Browser tests substitute the compact index through a local intercepted response. Report generation/index/payload, warmed search/ask/category/traversal, rough heap and mobile behavior separately. Repeated seed prose compresses unusually well: gzip fixture sizes are not a realistic content forecast. Browser heap values are rounded and not isolated retained-memory measurements.

Static delivery remains appropriate at the measured sizes. Revisit category-partitioned indexes if real compressed index size exceeds roughly 250 KB or p95 interaction exceeds 50 ms on representative low-end phones. These are review triggers, not proven universal performance budgets. Do not introduce a database or external search service merely because 1,000 entries are possible.

## Privacy and future question intake

Anonymous use remains the default. No new API/provider, AI, embeddings, chatbot memory, account requirement, raw-query telemetry or submission collection was added. The future gap loop is optional explicit submission → private editorial backlog → generalized question → source/review → publish. Before implementation the owner must define consent, retention/deletion, access and moderation responsibility. A failed Ask query alone is never consent to collect it.

Engineering test results and independent substantive/editorial review are separate gates. See [the implementation report](internal/knowledge100-report.md) and [machine-readable evidence](qa/knowledge100/regression.json).
