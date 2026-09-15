# Academy V3 authoring and progression

Implemented 2026-09-15. The public entry is `academy.html`. This extends the existing Academy V2 lessons and local backup system.

## Architecture and persisted contract

`academy-catalog.js` remains the lesson source. `academy-activities.js` defines objective questions, exercises, scenarios, challenges, cases, roadmap, achievements, XP rules and level thresholds. `learningObjects()` provides a common authoring view with stable ID, type, category, skill, difficulty, recommended prerequisites, related concepts/entities, completion rule, publication status, access tier and XP. Prerequisites guide; they never gate access.

`academy-progress.js` stores immutable lesson events and boolean question attempts under the existing `ntm-academy-progress-v1` storage key. The inner envelope is now version 2: `{version:2, events:[], attempts:[]}`. Attempts contain only `id`, `objectId`, `questionId`, `correct`, `at`. Reflection text and selected/numeric answers are never persisted. Failed, successful and repeated attempts remain visible as counts. Activity progress resumes after reload; unsaved reflection text does not.

`academy-progression.js` is a deterministic projection of that history. XP, level, achievements, current path, question/activity completion, skill percentages and roadmap states are reconstructed from their persisted basis. There are no separately editable reward counters to drift from history. Unknown future IDs survive import but earn nothing until recognized by the catalog.

`academy-ui.js` bridges existing lessons/checks; `academy-v3-ui.js` renders progression and handles interactive forms. The static builders produce the home, 29 lessons and 29 activity pages. Reading, disclosures and navigation work without JavaScript; checking answers and saving progress require JavaScript. Activity pages are deliberately `noindex, follow` and omitted from the sitemap; existing substantial lesson pages remain indexable.

## Reward semantics

| Completion | XP |
| --- | ---: |
| First lesson completion | 5 |
| First correct objective question | 3 |
| Completed exercise | 5 |
| Completed scenario | 15 |
| Completed challenge | 40 |
| Completed case | 60 |
| Completed existing learning path | 25 |

A scenario's question XP and completion XP are additive. Shared new question IDs earn their question reward once across activities; each distinct completed activity can still earn its own completion reward. Legacy checks use their stable lesson/check identity. A challenge/case requires all its objective checks and its self-review step. Self-review gives no standalone question XP. The thesis challenge uses the same challenge reward, rather than a second overlapping thesis bonus.

Page views, opening tools, changing paths and wrong answers give zero XP. Repeating a completion, retrying, reloading or reimporting the same history cannot duplicate rewards. Marking a lesson ongoing for revision changes current lesson/skill/roadmap progress but retains its earned reward and achievements. Path bonuses depend on every member lesson having been completed at least once. Deleting all browser data removes the entire history; backup is the recovery mechanism.

Levels are Ny (0), Sparare (60), Investerare (180), Analytisk fördjupning (400), Avancerad tillämpning (750). These are activity levels, not credentials. Difficulty is independent. All levels and achievements are attainable with the initial catalog. Freeze reward amounts and IDs for this content version: changing amounts later would recalculate historical totals, so a future rebalance needs an explicit versioned migration.

## What completion means

Lesson completion is self-reported. Objective checks compare a selected answer, exact answer set, or numeric value with an explicit tolerance. True/false uses the same two-option choice engine. Every check explains its answer, including incorrect attempts.

Projects/cases add written reasoning and a checklist. The engine checks at least 30 words and explicit self-review; it does **not** assess the meaning or quality of the writing. The form and completion message say so. There is no AI grader and no claim of verified mastery. Skill percentages count completed catalog items, with separate lesson/exercise/scenario/project/case totals.

Progress is local and user-controlled. Editing localStorage can alter it. Schema validation, conflict detection and write verification protect ordinary reliability, not certification. Future paid or certified claims would need server validation. Concurrent writes are checked before saving but localStorage does not provide cross-tab transactions; timestamps also depend on the user's clock. Each history array is capped at 50,000 records; reaching the cap fails visibly without intentionally discarding existing history.

## Recommendations and connections

Recommendations use visible deterministic reasons: P/E before EPS suggests EPS; completed introductory concepts suggest the recovery scenario; P/E/EPS/CAGR suggest reverse valuation. Otherwise resume an unfinished activity, the latest ongoing lesson, then the first incomplete roadmap item. Nothing is personalized by an external service. The current path is the last explicitly selected existing learning path; selection gives no XP.

Activity and lesson destinations resolve through `ntm-relations.js`. Existing calculator and Research pages are reused, including FX, fees, purchase/recovery, valuation, scenarios, manual thesis, and NVDA/MU/CRWV research. Synthetic case numbers are clearly separated from those live research destinations. Opening or completing a real Research workflow is not required to pass an introductory activity and does not trigger an additional external-action reward.

The knowledge bank remains empty until real reviewed questions exist. An optional `relatedActivityIds` array links reviewed Q&A to published scenarios/other activities, alongside the existing lesson/category relation and the lesson's concepts. Publication validation rejects missing activities. No automated public Q&A is generated.

## Adding content

1. **Lesson:** add a stable entry in `academy-catalog.js` using the V2 source/method/content contract. Set category, difficulty, sections, real references, related concepts/entities and published/draft status. Add it to a path/roadmap only when pedagogically appropriate. The unified view supplies lesson completion and free-tier metadata.
2. **Objective question / quiz:** add a canonical question in `academy-activities.js`. Use `choice`, `numeric` or `multi`; a two-option choice handles true/false. Include units, assumptions, correct answer, numeric tolerance if applicable, and an explanation. Check arithmetic independently. Reuse the question ID when reusing the same learning check, so question XP cannot be farmed across activities.
3. **Exercise or scenario:** add a catalog object/definition with context, question references, skill/category, difficulty, related lesson IDs and canonical NTM entity IDs. The shared renderer creates its page and the relation catalog creates its links. An exercise may contain several questions; a scenario adds a coherent situation.
4. **Challenge or case:** use the same structure with multiple checks and a reflection rubric. Cases need a clearly synthetic or properly sourced historical dataset, consistent units/periods, and explicit uncertainty. Tailor the reflection prompt to the task; never present the word-count/self-review check as semantic grading. Keep real user financial information out of example text.
5. **Achievement:** add a stable achievement ID and a supported count threshold or completed-object target. New trigger types belong in the central projection and need a deterministic test. Do not add a page-local award counter.
6. **Publish:** run `node scripts/build_seo.cjs`, the V3 content checks/tests, the release suite and relevant browser checks. Edit catalog/templates, not generated pages. Retiring a published artifact requires an explicit plan; the build rejects orphan Academy pages.

All initial content is `free`. The activity model accepts `free`/`pro`, but the access value does not filter content, hide links or add locks. Payment, access enforcement and remote accounts are separate future work. Stable IDs and immutable attempt records allow a future dedicated Academy sync collection; current cloud encoding intentionally excludes Academy.

## Backup and analytics

The outer JSON backup remains schema 3. Import normalizes Academy V2's inner `{version:1,events}` envelope to the new shape. Attempts merge by immutable ID, duplicate records merge once, conflicting records fail before committing, and unrelated backup data remains intact. Outer schemas 1/2 without Academy remain supported. Older clients that only understand the old inner Academy version cannot consume a new V3 Academy backup; they must reject it rather than silently dropping attempts. Keep an older backup if downgrading.

Only event names enter analytics: `academy_xp_earned`, `academy_level_reached`, `academy_scenario_complete`, `academy_challenge_complete`, `academy_case_complete`, `academy_path_complete`, plus the existing Academy signals. No object IDs, answers, reflection text, search content, financial values or account identities are added. Rendering pre-existing history on page load emits no new completion/reward event. Reimporting newly recovered history can produce a UI reward-change event; analytics is not the authoritative reward ledger.
