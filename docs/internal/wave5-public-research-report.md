# Wave 5 — selected, frozen and inspectable Public Research

Prepared 2026-09-18 against the existing Visual V3/Waves 0–4 baseline. Specification: Master Roadmap 3.0 §5.5 and §7/Wave 5, plus the supplied Wave 5 request.

**Local engineering checks pass. Production readiness is blocked by owner application of the migration, hosted verification and operational/editorial approval.** No commit, push, deployment, hosted migration or Wave 6 work was performed.

## 1. Existing V1 publication findings

V1 already separated private revisions from public snapshots, required an active optional public profile, supported saved local revisions without cloud upload, and provided preview/replacement/unpublish. Public data passed through security-definer RPCs while direct table access was denied. The main gaps were a prose-only snapshot, replacement through separate publication IDs, no structured financial evidence, no version-specific moderation reference and no reader continuation with source-version attribution. Those foundations remain in use.

## 2. Public Research V2 architecture

`public-report.js` defines the independent projection, observation envelope, current public-display gate, deterministic statement calculations and section diff. `public-report-ui.js` renders both the preview and the anonymous report using text nodes. `research-publication.js` extends the existing saved-revision dialog; `social-ui.js` dispatches V1/V2 rendering and retains profile/discovery/account behavior. No chart framework, live financial request or private object resolver was added to the public reader.

## 3. Public report/version data model

`ntm_report_heads` gives each author/scope a stable public UUID and current-version pointer. Existing `ntm_public_analyses` stores each immutable selected version; new fields are `report_id`, `version_number` and `frozen_author`. Public V2 responses contain only stable ID, public version ID/number, publication timestamp, selected `content` and frozen public display name/username. Private source scope/revision remain owner/internal metadata and are absent from anonymous projections.

The content envelope is `schemaVersion: 2`, `methodVersion: ntm-public-report/2`. Company, ticker, analysis date, saved-basis date and public thesis are mandatory. Selected optional prose, financial statements and chart are frozen JSON. The source revision identifier is deliberately not a public “basis” link: readers receive the saved date, never a reference that can resolve the author's private object.

## 4. Migration/schema changes

One new transactional migration, `202609190001_public_research_v2.sql`, adds the head/version model, snapshot validation, version-aware RPC wrappers and moderation references. Previous migrations are unchanged. The old RPC implementations become revoked internal `_v1` functions; public wrappers preserve legacy actions while preventing the legacy publish action from bypassing V2 ownership/version rules. Existing snapshot immutability is extended to all V2 identity/attribution fields. Unique indexes constrain version numbers and visible versions per report.

The full chain and an upgrade with a seeded V1 publication were executed locally in PostgreSQL/PGlite. `supabase/verify_public_research_v2.sql` is a separate read-only owner audit, also executed locally. Exact owner order and rollback limitations are in [the owner runbook](wave5-owner-review.md).

## 5. Public projection/allowlist

The projection constructs approved fields explicitly. It does not serialize a private thesis and delete known secrets. Text fields are `company`, `ticker`, `analysisDate`, `basisDate`, `thesis`, and optionally `summary`, `assumptions`, `risks`, `falsification`, `sources`, `followUp`, `reviewDate`, `correction`. Financial arrays have at most two approved statement types; chart rows are bounded to six. Text bounds are 160 characters for company, 128 for ticker, 6,000 per prose field, and a 64 KB overall validation ceiling.

Observations retain only metric/value/unit/currency/market, period identity/type/start/end, observation date, share basis, reported/model kind, source, method, retrieval status and rights. Nested source/rights/calculation/row objects also reject unknown keys. SQL repeats the public contract and independently checks calculation results. Future private fields cannot enter merely because a private schema grew.

## 6. Claim-ownership model

Visible labels distinguish **Bolagsrapporterad data**, **NTM-beräkning**, **Författarens antagande** and **Författarens bedömning** using existing Visual V3 semantic colors and text. Financial sections expose the reported operands separately from the NTM formula. Author prose is never labeled a verified fact. Manual-company reports can publish authored prose; manually entered financial facts are not eligible for the reported-data section in this wave.

The report explicitly says that publication is not a fresh verification against SEC and that NTM does not approve the conclusion. A provenance URL identifies a source, not an endorsement of the investment case. Client-origin snapshots cannot establish that a malicious author quoted a filing truthfully; that is a remaining moderation/editorial limitation, not a “verified” badge.

## 7. Publication preview

Only a selected saved local revision supplies the draft. Optional prose, statements and chart start unchecked. New summary/follow-up/correction fields require deliberate writing; private notes, review queue and hidden answers are not prefilled. The same V2 renderer shows exactly the selected public content, with anticipated version and frozen public attribution. Server-assigned publication time and UUIDs are necessarily assigned at confirmation.

Cancel leaves public state unchanged; back preserves form choices. Unsaved editor changes are identified as excluded. Confirmation rechecks the complete saved revision content, session user, expected public version and expected author display identity. Changes require a new preview. Freetext can still disclose information an author deliberately types; selection is not semantic redaction.

## 8. Republish diff

The preview shows added, removed and changed sections relative to the currently public content, including before/after values in keyboard-accessible disclosures. Structured financial/chart changes include their exact frozen fields. Removed optional sections are explicit. New reports show the selected public additions instead of suggesting there is an existing publication. After withdrawal, the comparison is against no currently public report, with a later version number on the retained stable identity.

## 9. Frozen-version semantics

`analys.html?id=REPORT_ID` resolves the current visible version. `&version=VERSION_ID` resolves that exact version only if it is still the current public version. Superseded, withdrawn or moderated versions are unavailable publicly; there is no fallback to another version for a pinned link and no public archive. Private edits, source refreshes and profile display-name changes do not alter a V2 snapshot.

Republish runs in one transaction with an author advisory lock and expected-version comparison. A stale competing request fails instead of overwriting; accepted identical request retries are idempotent. A retry of a version later hidden/replaced is rejected. V1 upgrade preserves its original public ID as the report ID and begins V2 numbering at version 2.

## 10. Financial-context publication

Eligible choices are revenue change and operating margin, derived from the selected snapshot's frozen Wave 4 annual evidence. Eligibility inherits the Fundamental Profile's period/definition/quality checks, then applies the stricter public-display policy. No current live dataset is substituted for missing historical operands or issuer identity. New saved snapshots include the public issuer CIK inside existing fundamental provenance; older snapshots without it offer prose-only publication until an explicit new save. Only supported reported SEC USD revenue/operating-income definitions, source dates/accessions and normalizer method 1 qualify. Restated/corrected/split/unsupported/derived or ambiguous-rights inputs are withheld.

Growth requires consecutive comparable annual periods and a positive earlier revenue base. Margin freezes both annual operating-income/revenue pairs with aligned dates and units. Inputs and formula are inspectable; client and SQL reproduce the IEEE double calculation. Arbitrary submitted “NTM conclusion” text is forbidden: display wording is deterministic under the pinned method. Financial-services operating margin remains withheld by the existing Fundamental Profile policy.

## 11. Chart publication

The single chart is an optional frozen annual revenue series, backed by an exact semantic table. It is a small CSS bar chart, not a live charting dependency. FY labels, annual classification, USD unit, source/date/accession, metric definition, normalizer version and full period dates remain inspectable. Missing years are explicit null rows/gaps, with a textual table alternative; they are not zero or interpolated. At least two approved observations are required. Chart-only and financial-only reports both work.

## 12. Valuation decision and blocker

**Valuation publication is intentionally excluded**, as permitted by the request. Existing saved valuation snapshots do not guarantee a complete frozen formula version, source/observation date for price and verified corresponding per-share interpretation basis for all supported paths. Publishing selected outputs would imply reproducibility the contract cannot guarantee. The author dialog explains the exclusion. No fair-value claim, live price, consensus estimate or recommendation is introduced.

## 13. Assumptions, risks and falsification

Each eligible public prose section requires its own explicit checkbox. Authors can rewrite their selected public wording and include several newline-separated items. The private structured arrays, question answers, notes, behavioral records and outcomes are not exported. Labels distinguish assumptions from judgments; falsification has its own “Vad kan göra detta fel?” section. Empty omitted sections do not reserve layout space.

## 14. Follow-up context

Authors may select a short written public follow-up plan and intended review date. These values are frozen and clearly described as author intent, not a scheduled update. Nothing is copied from Min NTM or the private review queue. A later private review has no public effect until a separate preview and publication.

## 15. Sources/provenance presentation

The source section separates SEC/company sources, NTM calculation methodology and author-written external references. Numeric disclosures include exact raw values, date ranges, units, accession, source date and method. Source links are constructed on the permitted SEC archive host with an accession-matching path; arbitrary provider URLs cannot enter financial sources. Author references remain plain text, so malicious HTML/JavaScript links are not interpreted. Advanced provenance stays behind disclosures while the first reading layer remains concise.

## 16. Private/public adversarial audit

Tests reject unknown roots, future private fields, nested private objects, added source annotations, unsupported method/provider/rights metadata, null required facts, malformed dates and inconsistent computations. HTML-like author input remains text. Oversized prose and company fields fail. Private note sentinels do not appear in outgoing publication snapshots or public rendering. Raw saved annotations are dropped by explicit source construction.

No public operation fetches a private revision by the report's internal source reference. Anonymous and signed-in non-author responses are identical. A changed/deleted local basis after preview blocks confirmation; after publication the report remains independently frozen. Session and server profile checks prevent cross-account attribution changes. The browser's owner controls are convenience only; SQL is the authorization boundary for writes.

## 17. V1 compatibility

Existing V1 rows, response shape, URLs and reader rendering remain supported. The upgrade test compares a seeded V1 public response exactly before/after migration. No financial history, frozen attribution or version number is invented for V1. An owner can explicitly upgrade by previewing and publishing a V2 selection; only then does the old public ID become a stable report identity. Legacy clients cannot overwrite that upgraded report through the old endpoint.

## 18. Reader experience

Company/author/dates/version lead into the selected summary/case, financial context, chart, assumptions, risks/falsification, follow-up and sources. Section anchors and native disclosures make long reports inspectable. Sparse reports omit unused blocks. V2 typography is scoped to the new report and uses canonical Visual V3 fonts, colors and spacing; the frozen design system and V1 presentation are not redesigned. Duplicate generic continuation UI is suppressed when V2's version-attributed continuation is present.

## 19. Reader → own Research continuation

The public page links to the same ticker in the reader's own Research, carrying only public report/version UUIDs. An origin banner links back to the exact public version and explains that the reader is working privately. It neither uploads nor creates a thesis automatically, nor resolves the author's private IDs. Existing reader work remains their own. Attribution is route/banner context; persistent imported-object attribution is not added in this bounded implementation.

## 20. Assumption copying

Not implemented. No assumption or author judgment is automatically copied, and no imported content is relabeled as NTM fact. The reader can deliberately write their own interpretation using normal Research. A future copy feature would need its own preview, selection, provenance and private-copy contract; there is no hidden partial copy mechanism here.

## 21. Upptäck Research

The existing recency list still leads with company/ticker, case excerpt, author and publication date. V2 rows add frozen-report version, selected financial-section count and chart presence. V1 and V2 coexist through the same list function. No popularity score, likes, follower-based ranking or engagement mechanism is added.

## 22. Public Profile

Published work uses the same richer list metadata, while the existing public profile contract is retained. Internal owner history remains on the account/Research management path. V2 author attribution is frozen to the public display identity at publication; current profile deactivation or suspension still controls visibility of all authored reports. Profile edits do not rewrite prior V2 attribution.

## 23. Moderation/reporting compatibility

“Rapportera denna version” requires authentication only when invoked; reading remains anonymous. Reports include stable report identity, exact publication version FK, version number and a fingerprint of the selected public JSON. They do not copy the private revision or duplicate the complete report into the moderation row. The existing reason/detail/status handling and one-report-per-profile-per-24-hours rate limit remain. Source errors, misleading claims and rights complaints can be described under Annat. Moderation-hidden history cannot be evaded by republishing that V2 report.

Operational owner assignment, takedown response times, retention duration and correction handling remain owner decisions. This wave does not create a moderation dashboard or promise operational staffing.

## 24. Retention, unpublish and deletion

Unpublish hides all versions under the report and clears the current pointer. Stable and pinned routes, profile lists and discovery stop returning it to anonymous and non-author readers. Private Research remains untouched. Superseded/withdrawn snapshots remain in the author's existing internal publication history and owner export until account deletion, consistent with the existing hidden-snapshot policy; there is no new public archive or automatic expiry.

Account deletion cascades through private cloud records, profile, heads and all publication snapshots. Existing moderation detail is retained under the established policy; reporter/target/version FKs become null when their referenced records are deleted. V2 additionally retains only public report UUID, version number and content fingerprint as minimal linkage, not withdrawn report prose or account identity. Fingerprints are equality aids, not authentication or recoverable content. Owner retention review is required. Third-party screenshots, caches and archives cannot be erased by this mechanism.

## 25. Correction semantics

A private edit changes only private work. A public republish creates a new immutable version. An explicit selected `correction` text makes a public correction visible in that new version. If a fact/source is later corrected, the existing report is not silently recalculated and the old author reasoning is not rewritten. The bounded operational response is owner review, author correction through republish, or takedown while resolving the issue. After withdrawal/deletion, there is no public correction tombstone that could expose removed personal content. Automated correction detection/notification and long-term public correction archives are outside this wave.

## 26. SEO behavior

Existing `noindex, follow` remains on public analysis/profile/discovery routes. No new sitemap entries, indexing switch or per-report SEO generation was added. Existing SEO generation checks pass with 85 canonical sitemap URLs and no outdated artifacts. Future indexing requires substantive reports, reviewed canonical/version rules, author controls, useful metadata and staffed moderation/retention/correction operations. That is a separate owner decision.

## 27. Licensing/rights architecture

Every observation carries explicit `rights.policy` and `rights.publicDisplay`. The current gate recognizes only `sec-public-facts/1` for a narrow set of supported reported annual facts; unknown providers, unknown policies and explicit restrictions fail closed in client and SQL. Source annotations and future licensed datasets are never accepted just because they exist in private Research. The policy identifier records a technical eligibility rule; it is not a blanket SEC-content license or a legal determination. Owner confirmation of this public-display use and a rights-complaint owner remain production prerequisites.

## 28. Future EOD compatibility

The provider-neutral observation shape supports value, currency, market, observation date, period type, source/date, optional accession, retrieval status and public-display rights. A unit test represents a future market observation successfully in that generic envelope and proves that current public eligibility still rejects it. Provider/source-policy restrictions live in the current public-display gate, not in an assumption that every observation must forever be SEC annual data. No EOD fetching, price history or estimates were implemented; a new provider would require a reviewed policy and coordinated validator migration.

## 29. Mobile

V2 stress fixtures cover dense, minimal, chart-only and financial-only reports at 360/390/430/1440 px in both themes. Long names, many sources, multiple risks and long prose wrap without document overflow. The new report's mobile heading and body sizing avoid inheriting V1's oversized opening text. Theme screenshots wait for the existing 250 ms color transition to finish. Artifacts are in `docs/qa/wave5`; historical regression screenshots were preserved and new captures copied into its `regressions` directory.

## 30. Accessibility

Reports use semantic sections/headings, labeled anchor navigation, native keyboard-accessible details, table captions/column and row headers, explicit chart alternatives, status regions and the existing focus-managed publication/report dialogs. The chart has no animation or pointer-only controls. Cancellation restores focus. Existing CSP and 41-route accessibility checks pass; the report fixture also asserts no CSP violations and no page exceptions. Automated reflow and keyboard checks do not replace owner zoom, contrast and assistive-technology review; those are in the runbook.

## 31. Performance impact

Measured unminified additions: contract 11,902 bytes, renderer 7,707 bytes, reader-origin helper 1,019 bytes and CSS 2,110 bytes. Approximate gzip sizes: 4,295 / 3,059 / 563 / 719 bytes. The origin helper is Research-only. The public reader adds about 21.7 KB raw JS/CSS, with no chart library. The financial source is already inside the frozen response; expanding disclosures does not fetch more data.

Sample content JSON: minimal 259 bytes; two financial sections 4,338; chart-only 2,243; combined 6,322. The chart adds 1,984 raw bytes over the financial-only sample. These exclude the small RPC wrapper and are fixture measurements, not universal sizes or field Core Web Vitals. `docs/qa/wave5/payload.json` and `performance.json` record the method and 41-route cold-localhost baseline. Anonymous V2 fixture reads invoke only the public analysis action before user interaction, with no session/private-record call.

## 32. Security/RLS findings

All new tables have forced RLS and no direct anon/authenticated table grants. Public wrappers use empty `search_path` and explicit authenticated-user existence/ownership/profile checks; revoked internal `_v1` functions cannot be invoked by clients. Source/version checks and immutable triggers are database enforced. Read access honors hidden/moderated/suspended/inactive states. Full-chain A/B/anonymous role tests and the existing private-cloud isolation tests pass.

The local tests use real PostgreSQL SQL behavior with a fixture Supabase auth schema; they do not prove hosted gateway/JWT configuration. No service credential was added to the frontend. Stored author prose/source references are rendered as text. Two bugs found during implementation—SQL JSON operator precedence rejecting valid financial objects and a legacy `report` variable shadowing the report action—were fixed and covered by actual database/browser execution.

## 33. Stress-matrix results

| Combination | Local evidence |
| --- | --- |
| Legacy V1, explicit V1→V2 upgrade | Exact pre/post migration response; existing browser reader; stable upgraded ID |
| Minimal/manual prose; no financial/chart/valuation | Publisher browser fixture and sparse V2 reader; unused sections absent |
| Dense text, long company/author, many sources, multiple assumptions/risks | Both themes, all required widths; no overflow |
| Financial only, chart only, both | SQL/JS contract checks and real-page fixtures |
| Missing chart year | Null-gap contract test and dense visual fixture/table alternative |
| Unsupported or restricted evidence | Client/SQL denials; author prose remains available |
| Anonymous, signed-in reader, author | Public projection equality; no automatic auth read; explicit author flow |
| Stale local basis, stale public version, changed author | Browser check and database compare-and-swap denial |
| Unpublished/superseded/moderated/deleted | Public route/list absence, denied replacement, cascade checks |
| Valuation | Deliberately unavailable; no incomplete scenario published |

## 34. Files changed

Runtime: new `public-report.js`, `public-report-ui.js`, `public-report-origin.js`, `public-report.css`; updated `research-publication.js`, `research-snapshot.js` (prospective frozen public issuer CIK), `social-ui.js`, `research.html`, `analys.html`. Data boundary: new V2 migration and read-only verification SQL. Release: `scripts/stage_site.py` requires the new assets; `.github/workflows/deploy.yml` includes the new browser gate. Tests: new public-report unit tests, PostgreSQL harness/wrapper and Wave 5 browser suite; existing social browser publication expectations updated to V2. Documentation and evidence live in these two internal Wave 5 documents and `docs/qa/wave5`.

No existing migration, stock dataset, private storage format, Visual V3 token file, SEO policy or Wave 6 feature was changed.

## 35. Tests added/changed

Nine `public-report.test.cjs` tests cover projection/diff/freeze, private/unknown fields, financial math, chart gaps, production evidence candidates, generic future-provider shape, bounds, nested rights/annotation handling and refusal to backfill old issuer identity. `report-v2-postgres.test.cjs` runs the complete `scripts/test_report_v2.cjs` migration/lifecycle/adversarial scenario when PGlite is configured. Deploy already configures the pinned PGlite dependency, so this test runs there rather than skipping.

Four `wave5_browser.py` tests exercise author selection/stale private basis, the full visual matrix, version-specific reporting, unavailable versions and safe reader continuation. `test_social_browser.py` retains existing opt-in/session/private-preservation journeys while expecting V2 payloads and stable report references. Local screenshots use isolated browser contexts; no live account writes occur.

## 36. Complete validation results

| Check | Result |
| --- | --- |
| `validate_release.py` | PASS: 166 Python tests, 269 JavaScript tests, zero skips with PGlite configured; SEO/calendar/rules/security/staging/references/diff checks |
| V2 PostgreSQL harness | PASS: upgrade, exact facts/calculations, nested denials, roles, immutable versions/author, CAS, retries, moderation, withdrawal, deletion, read-only audit |
| Existing social + cloud PostgreSQL suites | PASS: A/B/anonymous authorization, private isolation, owned mutations, cascades and stale credentials |
| General browser smoke | PASS: 38 tests |
| Wave 1 / 2 / 3 / 4 browser regressions | PASS: 7 / 9 / 7 / 4 tests |
| Wave 5 browser suite | PASS: 4 tests, including 32 dense/sparse/financial/chart theme-width captures |
| Offline social and persistent auth browser suites | PASS: publication/session/navigation/refresh/logout/deletion and no silent upload |
| Quality browser | PASS: 41 routes, accessibility/CSP and payload baseline |
| Workflow checks | PASS: actionlint 1.7.7 |
| Whitespace | PASS: `git diff --check` |

Existing calendar notices remain explicit: a partial upstream macro update and not-yet-published future 2027 schedules. They are not new Wave 5 failures. Windows PowerShell wraps Python's unittest stderr when redirecting logs; the recorded test summaries are all OK. Hosted verification is not included in these results.

## 37. Required hosted owner actions

Approve the bounded rights use and operational retention/correction/takedown responsibilities; back up; verify previous migration order; apply the single new migration once; run the read-only audit; release the reviewed frontend through existing gates; execute A/B/incognito tests. The [owner runbook](wave5-owner-review.md) supplies exact files, expected values, rollback limits and a reproducible author→reader→republish→withdrawal sequence.

## 38. Hosted verification status

**Pending.** No hosted schema/application, production network authorization test or production visual review was performed. Existing production data and services were not touched. Local PGlite, mocked-network browser tests and a read-only SQL script do not constitute hosted approval.

## 39. Owner review procedure

Use [wave5-owner-review.md](wave5-owner-review.md): saved CRWD private revision → explicit selection/preview/cancel → V2 publication → anonymous inspection → profile/discovery → reader B's own Research → private edit with unchanged public version → republish diff → stale preview denial → precise-version moderation → unpublish → disposable-account deletion. Repeat with a sparse/manual report, genuinely long content and legacy V1. Record exact environment, migration/revision, reviewer, date and redacted evidence.

## 40. Human/editorial evidence

**Pending separately from engineering validation.** The local visual self-review and automated fixtures are not independent investor/editor acceptance. Owner review must assess professional shareability, ownership labels, useful provenance, readable dense/sparse/mobile content and predictable publication behavior. Rights interpretation, moderation response ownership and retention duration also need explicit operational approval.

## 41. Deviations from Master Roadmap 3.0

The implementation takes the requested bounded route: two financial statements and one revenue chart. Valuation is deferred for the explicitly permitted contract blocker. Optional assumption copying is not implemented. Reader attribution is a route/banner link, without creating an imported private object. There is no archive, new moderation platform, SEO expansion or later-wave functionality. These limitations are explicit rather than represented as completed features.

## 42. Remaining limitations

Only supported annual USD SEC facts qualify under the current gate; old snapshots without the required frozen annual evidence can publish prose only. No server-side re-fetch verifies an author's submitted filing numbers. V1 attribution remains its legacy dynamic behavior; only V2 freezes display attribution. Old public versions are retained internally but unavailable through public pinned links. Same-profile reporting retains the existing 24-hour limit. No automatic correction alert, expiry/retention job, imported-assumption workflow, valuation publication or persistence of the reader-origin banner is provided.

## 43. Final self-critique

**Author:** Explicit checkboxes, common preview renderer and before/after disclosures make selection predictable; full private-basis and server-version checks protect stale confirmations. Dense structured diffs are technical, but optional disclosures preserve exact inspectability. Reopening publication starts a deliberate new selection rather than silently carrying all old fields forward.

**Investor:** A reader can distinguish opinion from selected historical facts and reconstruct the displayed formulas. This is more useful than a published form, without pretending that two metrics prove investment quality. Sparse reports remain authored cases, not apparently complete financial coverage.

**Privacy/security reviewer:** Public payloads omit private IDs/account fields; default-deny nested contracts and revoked internal RPCs strengthen the boundary. The server enforces ownership and versioning. A malicious author can still lie in approved prose or source values; provenance and moderation must not be marketed as independent verification.

**Editorial reviewer:** Ownership labels, source qualification and an explicit correction section avoid endorsement language. No decorative valuation, scores or empty “premium” blocks were added. Independent human review remains outstanding.

**Mobile user:** Legacy oversized report text was corrected only for V2. Headers, anchors, prose, chart gaps and disclosures fit the required widths in both themes. Exact financial tables are intentionally detailed and behind disclosures; keyboard/chart alternatives remain available. Automated screenshots cannot settle every reader's comfort or assistive-technology behavior.

## 44. Local engineering readiness

**Locally release-ready for owner review/application**, within the stated bounded scope and documented valuation exclusion. Relevant unit, migration, authorization, lifecycle, browser, regression, CSP, staging and release gates pass. No unresolved local engineering failure is being represented as a hosted-only blocker.

## 45. Production readiness

**Not fully production-release-ready.** Required owner migration/application, hosted A/B/anonymous verification, public-display rights/retention/moderation decisions and human/editorial approval remain pending. Nothing was committed, pushed, deployed or applied to production. Wave 6 was not started.
