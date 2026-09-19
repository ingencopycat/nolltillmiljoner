# Knowledge Engine 100 — implementation and release report

Date: 2026-09-19. Scope: Master Roadmap 3.0 §5.7/§9 Scale Foundation, preserving Waves 0–5 and canonical Visual V3. Local implementation only: no commit, push, deployment, production schema change, provider integration or owner-account access.

Engineering verification and substantive approval are separate. The 29 existing answers retain their substantive prose, URLs and review history. Five authoring examples are unpublished drafts; synthetic scale catalogs never enter production files.

## 1. Existing Knowledge baseline

29 answers: 26 original `published` seeds, two Wave 1 `reviewed` answers and the Wave 4 `macro-releases` answer. Seven categories, the 12-concept Wave 1 help contract, canonical Academy/tool relationships, exact-question regressions, static answer URLs and name-only analytics were already present. The old landing embedded every answer card, and the browser catalog contained all answer prose.

## 2. Architecture changes

Separate small concepts, answer intents, typed sections, retrieval configuration, editorial state/history, compact delivery and lazy answer bodies. The existing static repository/generator remains the publishing system. No database, CMS, AI, embeddings or external search dependency was added.

## 3. Concept model

25 small concepts: stable ID, Swedish term, derived normalized term, category, synonyms, abbreviations, optional metric and related IDs. Answers use `conceptRefs`. Existing Academy `concepts` remain unchanged as a separate compatibility vocabulary. Draft-only concept, pilot and retrieval metadata are excluded from public projection.

## 4. Answer/intent model

Stable ID/slug plus one question/intent, canonical short/full/caveat/example, concept refs, sources, optional typed sections and relationships. EPS has definition and comparison answers; P/E has definition and trailing/forward comparison. Interpretation does not collapse into a definition.

## 5. Intent vocabulary

`definition`, `calculation`, `comparison`, `interpretation`, `limitation`, `misconception`, `process`, `application`. The validator rejects unknown intent labels. Coverage gaps remain explicit rather than spawning placeholder answers.

## 6. Source/claim model

Sources can record supported sections, type, primary/secondary/unclassified authority, actual review date, evidence status, what was checked and limitations. New accepted content requires checked short/full/caveat mappings. Legacy mappings are inherited, not retroactively upgraded. The maintenance report identifies **17 answers missing complete inherited section mapping**. Of 26 unique URLs probed, 18 were reachable and 8 returned access-restricted responses; none returned 404/410. HTTP success is not claim verification, and restricted responses remain unverified.

## 7. Content versioning

All original substantive versions/dates are preserved. Retrieval configuration has its own version. A fingerprint baseline and release audit detect substantive edits without a newer content version and explicit correction history. Internal history/reviewer metadata never enters public JSON/JavaScript.

## 8. Review/stale semantics

Risk classes: stable, methodology, rule. Explicit overdue behavior: label, suppress, needs-update. Suppressed content is withheld from answers/help/search at runtime; direct browser answer pages show an overdue notice instead of the suppressed answer. Static no-JavaScript content still requires timely editorial regeneration/withdrawal. The build rejects stale rule registries. **16 legacy answers have no scheduled review deadline**; these are owner scheduling work, not fabricated deadlines.

## 9. Merge/redirect behavior

Reviewed merge records require source ID/slug, active target ID, reason, reviewer and date. Targets cannot be retired redirect nodes, so loops/chains fail validation. Old URLs remain navigable static compatibility pages with canonical target and noindex. They are not server-side HTTP 301s. No actual answer was merged. Orphan old HTML and JSON require explicit retirement.

## 10. Retrieval V2

The new `respond()` API returns typed outcomes/reasons rather than implying every overlap is a confident answer. Exact question and definition-equivalent phrasing precede aliases, curated typos and conservative concept/intent matching. Unsupported interpretation/comparison candidates do not become definition answers. Legacy `ask()` remains for compatibility; the public Ask UI uses V2.

## 11. Exact-question preservation

Original Knowledge/Wave 1 tests remain, including the 30 labeled fixtures, direct P/E versus forward P/E, EPS, guidance, LTTM and arbitrarily long overlap-ranking regression. Positive Wave 1 fixtures are also checked against V2. No financial prose was changed to fit a retrieval expectation.

## 12. Typo handling

Reviewed typo aliases first; then one edit for single 7–32-character terms. Ambiguous candidates clarify. Short financial acronyms are protected; `EP` is not silently changed to EPS. The existing curated LTTM exception is preserved.

## 13. Clarification behavior

`avkastning` offers CAGR/FX/compounding; `avgift` offers trading/annual fees; `marginal` offers the actual combined margin comparison. The engine does not invent three independent margin definitions. Choices are keyboard-operable reviewed questions. Unknown or missing coverage abstains.

## 14. Comparison behavior

Existing trailing/forward and CAGR/total-return sentences become labeled comparison axes with the original caveat. Full pages and Ask depth can display the same structured axes. Other existing comparisons retain their prose. `P/E vs P/S` and CPI-versus-PCE requests without a reviewed comparison abstain; no winner is synthesized.

## 15. Supplied-number calculations

Approved `pe/1` divides supplied price/share by EPS/share using the same explicit currency and annual/TTM/forward basis. The form and bounded text template execute the same function. Independent numeric assertions cover 150/6=25, 80/4=20 and 123.45/2.5=49.38. Zero EPS, nonfinite/oversized inputs, overflow, mixed currencies, unsupported periods/expressions and missing basis fail. Negative EPS shows the reviewed limitation. This never produces a buy/sell conclusion.

## 16. Contextual interpretation

Debt and earnings reaction exercise the existing interpretation-plus-caveat structure. The form's negative-EPS outcome exercises unsuitable-case handling. “Är P/E 40 dyrt?” correctly abstains because that specific reviewed interpretation is absent. Adding such an answer later is editorial work with evidence/approval, not permission to broaden the definition alias.

## 17. Abstention classes

`ANSWER`, `CLARIFY`, `ABSTAIN_NO_COVERAGE`, `ABSTAIN_UNSUPPORTED_JUDGMENT`, `INVALID_INPUT`. Outcomes carry a bounded reason and retrieval version. UI copy distinguishes missing coverage, unsupported investment decision and invalid/missing numeric inputs.

## 18. Search

Search matches normalized question, alias, concept, category and intent, with all terms required. Results are capped at 12. Search is broader discovery; Ask uses confidence/intent boundaries. Queries are not persisted, added to URLs or sent to analytics.

## 19. Browse/category scaling

Zero answer cards in initial landing HTML. Categories render at most 12 cards per open group; larger categories link to static 12-item pages. Filtered large categories retain their “more questions” route. No-JavaScript browsing remains possible. Synthetic 100/500/1,200-answer tests verify bounded initial DOM and mobile categories.

## 20. Knowledge page UX

Existing Visual V3, Swedish labels and native controls retained. Search, Ask and collapsed exploration are distinct. No giant initial FAQ wall or chatbot theater. Formula inputs, examples and source depth remain optional disclosures. The source/method pages still work without JavaScript.

## 21. Fråga NTM UX

Direct answer, real clarification choices, optional full explanation/sources/comparison and explicit abstention. A local loading message refers to opening reviewed content, not model generation. Failures/mixed deployments fail visibly; no silent fallback to an unrelated answer.

## 22. Shared rendering contract

`explain(publicAnswerOrPilotId, approvedContext, compact|full|reminder)` returns canonical content/date/version/caveat. Full adds body/example/sources/sections. No private text or financial values are accepted as contextual retrieval input. Source projection is allowlisted; body requests contain only public answer IDs.

## 23. Research integration

Wave 1/4 Research and Fundamental Profile help now consumes lazy canonical full explanations. Unsaved inputs, storage boundaries and return focus are preserved. A slow request can be cancelled without reopening a dialog after Escape. Existing handoff/source-provenance behavior remains covered by Wave 1/2 regressions.

## 24. Calculator integration

Valuation and savings retain their existing help. CAGR, GAV, FX, compounding, annual fees and ISK have bounded canonical disclosures through `knowledge-help.js`; no calculator formula was changed. Leverage and withdrawal-method explanations remain in their established calculator contracts because dedicated reviewed Knowledge coverage is absent.

## 25. Academy integration

Shared reminder mode replaces direct full-catalog access. Help is recorded before loading/exposure. If the active attempt/selection changes during loading, the old explanation is discarded. Existing assisted-versus-independent evidence tests pass; opening Knowledge does not grant comprehension or XP.

## 26. Macro integration

Existing release/rate explanation hooks use the canonical context contract and preserve calendar position. No new macro provider, forecast, market-move attribution or copied current-year rule values were introduced.

## 27. Public Research integration

Preview and anonymous reader expose generic revenue/margin/thesis help separately from the frozen author's claims. The browser regression verifies frozen report text is unchanged by opening/closing terminology help. Publication, versioning, moderation, privacy and account/RLS regressions remain separate.

## 28. Related-content model

Typed curated answer relationships supplement existing Academy/tool edges. Missing/self/unknown-type relations fail validation. Hidden targets are not projected as public answer relations. Similarity suggestions never become automatic public recommendations.

## 29. Editorial workflow

Question/gap → draft → source/claim check → formula/example check → actual editorial review → explicit status change → generation/release → integration → later correction. Code can validate structure and arithmetic, not approve a financial claim. Seed inheritance cannot be assigned to arbitrary new answers.

## 30. Authoring workflow

Five UTF-8 JSON templates and local escaped previews demonstrate definition, formula, comparison, interpretation and time-sensitive scope. `knowledge_editorial.cjs template … OUTPUT` refuses overwrite; `preview` stays inside docs. New `answers/*.json` files load automatically. See the exact commands/checklist in [the owner review procedure](knowledge100-owner-review.md).

## 31. Validator

Checks IDs/slugs/questions, concept/intent refs, aliases/configured collisions, typed fields, source URLs/mappings, dates/scope, statuses/approval, bounds, formula metadata, related IDs and merges. Legacy quality gates remain. Dangerous structure fails; inherited review/source gaps and possible duplicates are reported honestly. The generator still escapes authored HTML as text.

## 32. Duplicate detection

Maintenance reports deterministic same-intent/shared-concept and word-overlap candidates with IDs, intents and shared/primary concept distinctions. Current candidates include financially distinct neighbors such as P/E/PEG and EPS/dilution; they are **not asserted duplicates**. No automatic merge or slug change occurs.

## 33. Coverage report

`editorial.json` reports concept × intent × context, status, review age/deadline, claim mapping, formula/example presence and integrations. All 25 concepts have an answer and all 29 answers have existing integrations. Counts are internal maintenance data, not a public quality/completion score.

## 34. Retrieval benchmark

Versioned fixture with query, outcome/ID, acceptable choices, forbidden fallback IDs, category and reason. Covers direct/definition/alias/acronym/typo/ambiguity/interpretation/comparison/limitation/misconception/numbers/judgment/missing/unrelated/adversarial/security cases. Older fixtures remain independent.

## 35. Retrieval benchmark results

Final machine-readable results are in [retrieval.json](../qa/knowledge100/retrieval.json). **49 queries: 26 answers, 4 clarifications, 14 correct abstentions, 5 invalid-input outcomes; zero wrong confident answers, zero top-answer mismatches and zero failures.** Unit tests separately prove alias collision rejection and typo ambiguity; zero ambiguous cases in the ordinary production fixture is not proof that ambiguity is impossible.

## 36. Synthetic scale/performance results

The final fixture adds unique synthetic concept vocabulary as well as 100/500/1,200 answer objects; bodies repeat seed prose and are not publishable content. Node measurements in [scale.json](../qa/knowledge100/scale.json): approximately 33/82/193 ms full in-memory generation, 2.2/5.3/12.9 ms index projection, and 0.24/1.04/2.85 ms p95 search. At 1,200, no-coverage/typo Ask paths were about 1.48/1.37 ms p95. Initial generated landing stayed about 8.6 KB and zero cards. [Browser measurements](../qa/knowledge100/browser-scale.json) separately record localhost load, search/Ask/category and approximate heap at 390 pixels. These are local synthetic timings, not production Core Web Vitals or low-end-device guarantees.

## 37. Payload/loading strategy

At 1,200 synthetic answers the compact index is approximately 1.13 MB uncompressed versus 2.58 MB full public corpus; bodies load individually. Repeated text makes compressed fixture sizes optimistic. In the real 29-answer site, generated catalog fell from 45,163 to 27,546 bytes, core grew from 3,387 to 14,602 bytes, and landing fell from 19,120 to 10,554 bytes. Exact final sizes are recorded in [payload-before-after.json](../qa/knowledge100/payload-before-after.json). No initial body downloads; bounded memory cache; no backend.

## 38. URL/SEO behavior

Existing answer slugs/canonicals and published-versus-reviewed indexing remain. Seven navigation category pages are noindex/follow and omitted from the sitemap. Useful answer pages retain heading hierarchy and escaped substantive text. No placeholder answer pages, automatic article dates or mass rich-result schema. Homepage SEO work was not reopened; `index.html` and `script.js` remain unchanged by this task.

## 39. Correction/maintenance workflow

Actual substantive correction increments version and records reason/reviewer/date; retrieval edits use their separate version. Baseline/history check joins the release gate. Reports cover due/needs-update, source access, changed rules, duplicates, orphans, missing integrations and formula revalidation. The owner deliberately retires withdrawn HTML/JSON or creates an approved merge record.

## 40. Time-sensitive content behavior

The ISK explanation continues to depend on the existing verified rule registry, not copied tax allowances. Stale registry generation fails. Runtime help/Ask withholds suppressed content and direct browser pages show a review-needed state. Static hosting cannot rewrite already delivered no-JavaScript HTML at midnight: timely regeneration/withdrawal remains an operational duty.

## 41. Knowledge-gap intake decision

Collection intentionally unimplemented. No raw question, numeric value or private Research text logging. Future opt-in submission requires explicit consent, retention/deletion, access and moderation ownership before implementation. A failed query is not consent.

## 42. Initial architecture pilot content

Existing P/E/EPS/forward/CAGR/debt/margins/fees/macro/ISK and their related answers exercise multiple intents, approved formula, comparisons, limitations, ambiguity, excerpts, source metadata and relationships. Five local drafts demonstrate future authoring. No new financial answer, source claim or owner approval was invented.

## 43. Privacy

Anonymous retrieval; no account needed. Public IDs only in body requests, credentials/referrer omitted. No query in URL/storage/events. Draft aliases, pilot labels, concept text, answer bodies and editorial/history/source notes do not leak through projection. Owner account/private Research were not accessed. Auth/Social regression uses isolated synthetic fixtures and temporary staging, not production accounts.

## 44. Security/output safety

Escaped static text and DOM `textContent`; HTTPS source validation; no expression evaluation. Tests cover hostile markup/questions/aliases, unsafe URLs, oversized prose, bad references/formulas, loops/chains, draft projection, missing/mixed-version payloads and numeric overflow. Existing CSP/credential scan and staged boundary checks pass. No production schema or RLS policy changed.

## 45. Mobile

360/390/430 in both themes: initial page, search, Ask, clarification, formula/negative EPS, abstention, category browsing, direct/long/comparison pages and sources. No horizontal overflow in checked cases. Screenshots live under `docs/qa/knowledge100/`; existing Wave suites add Research/Academy/Macro/report evidence. Synthetic category rendering is also checked at 390.

## 46. Accessibility

Keyboard entry/submit, real buttons for clarification, native disclosures, source links, labeled formula fields, caption/header comparison tables, live outcome/loading messages, dialog focus return/cancellation, reduced motion and text-zoom/reflow tested. The existing 41-page accessibility/CSP browser sweep passes. This is practical automated evidence, not an independent screen-reader audit.

## 47. Performance impact

Current small-catalog savings are modest because the richer core adds code; future answer bodies no longer grow every initial visit. ID routing is map-based, normalized search metadata precomputed, exact retrieval indexed and DOM bounded. Keep static delivery. Revisit partitioning if real compressed index exceeds roughly 250 KB or low-end-phone p95 interaction exceeds 50 ms; these are review triggers, not measured universal limits. Synthetic heap deltas include generation intermediates and browser heap is rounded.

## 48. Files changed

Core/UI: `knowledge-core.js`, generated `knowledge-catalog.js`, `knowledge-ui.js`, `knowledge-help.js`, `knowledge.css`, `wave1-ui.js`, `academy-competency-ui.js`, `public-report-ui.js`. Editorial: catalog structural hook, `scale.cjs`, retrieval/merge/history files and five examples. Build/quality: Knowledge generator, SEO integration, quality/history/editorial/benchmark/scale scripts and release checks. Generated: 29 JSON bodies, seven category pages, existing relevant answer/calculator/Research/report pages. Tests/docs/QA: new Knowledge fixtures/unit/browser/runner, bounded-list/no-JS smoke assertions, isolated QA-output options, canonical documentation and owner/report package. Full path inventory is saved in `docs/qa/knowledge100/changed-files.txt`.

## 49. Tests added/changed

Added Knowledge100 unit contracts, a 49-query labeled benchmark, browser cases for lazy loading/failure, small-screen outcomes/formula/depth, canonical calculator/Public Research help, slow-help cancellation and synthetic scale. Existing smoke inventory assertions were replaced by stricter zero-initial-card and category/no-JS navigation checks required by the new bounded UI. Existing exact ranking, privacy, formula and Wave 1–5 protections were retained. Baseline cardinality assertions are scoped to the original IDs, permitting validated future additions; content-version checks now use history validation rather than permanently requiring version 1. Test-output path options prevent overwriting prior Wave 5 evidence.

## 50. Complete release-gate results

Final authoritative statuses/logs: [regression.json](../qa/knowledge100/regression.json). Python **167 passed**; Node **285 passed**, no skipped database gates with the existing local PGlite module configured. Existing browser smoke **38**, Waves 1/2/3/4/5 **7/9/7/4/4**, Knowledge browser **6**, Auth SDK and Social synthetic browser contracts, **41-page** accessibility/CSP sweep and pinned **actionlint 1.7.7** pass. SEO generation/check, history/validator, current rule/calendar checks, cloud/RLS/publication migrations, staging/local references and `git diff --check` pass. Source reachability's 8 restricted responses remain explicitly unverified. Hosted Supabase was not retested or changed by this local task.

## 51. Owner review procedure

Use [knowledge100-owner-review.md](knowledge100-owner-review.md) for the exact local URL, product walkthrough, five authoring examples, commands, expected errors and review/publish checklist. It separates testing mechanics from content acceptance and uses fresh local/synthetic data.

## 52. Substantive content requiring owner approval

No new substantive public financial content. Independent review of the inherited seed remains pending, as before. The owner should address 17 mapping gaps, 16 unscheduled reviews, 8 access-restricted source rechecks and future interpretation/comparison coverage. Authoring examples remain drafts. Passing numeric tests does not constitute independent editorial approval.

## 53. Deviations from Master Roadmap 3.0

No new wave, provider work, AI or mass expansion. Bounded explicit formula grammar is deliberately narrower than arbitrary conversation. Static merge pages provide canonical navigation rather than unavailable server-side 301s. Gap intake is documented but not collected because policy is undefined. These limits preserve the roadmap's honest reviewed-system boundary.

## 54. Remaining limitations

Coverage is still 29 answers; some legitimate questions abstain. Only `pe/1` is executable. Static deployment needs timely review/withdrawal; no-JavaScript pages cannot self-expire. Synthetic repeated prose and desktop Chromium are not field/low-end-mobile evidence. Eight source URLs need manual access verification. Independent human/editorial, screen-reader and learning validation are not replaced by this test package. No actual unresolved product defect is known from the completed engineering checks.

## 55. Engineering readiness

**The Scale Foundation engineering implementation is release-ready based on the completed local gates**, with the documented static-host and bounded-coverage limits. Independent content acceptance, owner review cadence and future intake policy remain separate. The work is uncommitted and undeployed. No Wave 6 work was begun.
