# NTM Research — IA & UX exploration

26 September 2026 · Exploration only

**Recommendation:** give Research four company-level destinations: **Översikt · Bolagsdata · Din tes · Värdering**. Make the overview a bounded explanation of the company; give detailed research a navigable home; give writing and valuation their own working surfaces. Preserve the existing data, calculations, provenance and revision model.

**Audit scope and confidence**

I inspected current HTML, renderers, CSS, navigation, chart construction, entry behavior and save/continuity logic, plus repository browser screenshots of real NVDA, SOFI and CRWD data. Screenshots cover desktop and 360/390/430px, dark/light themes, evidence expansion and saved work. These are existing QA captures, not fresh screenshots from this session. Browser control reported no available browser; attempts to open the local app in IAB and Chrome failed. Live interaction, current rendered DOM geometry and tablet behavior therefore remain unverified. Some older captures predate the current consolidated “Sedan din analys”; current source takes precedence for behavior. No user research or usability testing was performed.

**1. Diagnosis: local restraint, global overload**

The problem is primarily allocation of attention. Several components already have clean typography, meaningful numbers and collapsed evidence. They become cluttered when every component occupies the same reading path.

The code makes the ordering problem concrete. `company-evidence.js` inserts a host after the overview revenue chart, then calls guidance, segments, capital, insiders, ownership and events renderers. Each prepends its section. The resulting sequence puts events → ownership → insiders → capital/liquidity → business → guidance → reporting ahead of thesis work. That is a consequence of composition mechanics, rather than an investor’s sequence of questions.

The six current local links—Översikt, Din tes, Värdering, Bokslut & källor, Versioner, Utfall—are document anchors. They provide no comparable navigation to the large business, outlook or ownership layers. Adding more anchors would improve jumping but leave the underlying attention problem intact.

Three further causes matter:

- **Repeated visual starts.** Headings, explanatory notes, source disclosures and generous section gaps repeatedly restart the reading rhythm. Expanding one section can expose another hierarchy of disclosures.
- **Unequal information receives equal space.** The SOFI summary reserves prominent positions for operating margin and FCF even while saying those measures do not apply to financial companies. An inactive AI feature and export section also receive permanent document positions.
- **Analytical tasks inherit document structure.** Thesis editing is a sequence of large fields. Valuation places its main form before the results, then adds further scenario inputs before the scenario table. Saved-state feedback can occupy multiple banners.

Preserve the editorial serif, cyan accent, dark/light palette, restrained data strips, explicit periods and units, chart-to-source access, company-specific eligibility rules and local/private work. The compact metrics, comparable-only revenue chart, segment/KPI visuals and new grouped change feed are good foundations.

Selected screenshot evidence, inspected for this exploration:

| Recorded screen | What it establishes |
|---|---|
| [NVDA metrics, desktop dark](qa/evidence-presentation/pass-research-since/NVDA-1440-dark-numbers.png) | Large numbers and light separators already support fast reading. Preserve this visual grammar. |
| [SOFI reported development, 390px light](qa/evidence-presentation/pass-research-since/SOFI-390-light-growth-profitability.png) | Two inapplicable dimensions consume substantial summary space. The overview needs a financial-company variant. |
| [CRWD changes, 430px dark](qa/research-since/pass-2/CRWD-430-dark-default.png) | Useful grouped previews, but even the collapsed returning-user module occupies most of a mobile viewport. |
| [NVDA insiders, desktop dark](qa/company-insiders/pass-1/NVDA-1440-dark-filtered.png) | Filters, category chart and person-level reports constitute a deep research workspace by themselves. |
| [Saved thesis, desktop light](qa/research-save/saved-1440-light.png) | Save confirmation, saved indicator, privacy text and snapshot disclosure compete beneath the form. |
| [Research entry, 390px dark](qa/research-entry-hierarchy/entry-390-dark.png) | Search sits inside disclosure/panel structure, followed by alphabet controls and a nested manual-entry path. |

**2. Three coherent directions**

| Direction | Navigation and default hierarchy | Strength / tradeoff |
|---|---|---|
| **A. Company workspaces — recommended** | Four destinations: Översikt, Bolagsdata, Din tes, Värdering. Overview answers the immediate company questions. Bolagsdata has a small internal topic menu. Sources and analysis history have contextual utility links. | Stable for beginners and repeat users; supports deep links and mobile. Some detail requires a second navigation step, mitigated by direct overview links. |
| **B. Investor workflow** | Förstå bolaget → Pröva tesen → Följ upp. Data and outlook live in understanding; thesis and valuation share hypothesis testing; changes, review, revisions and outcomes live in follow-up. | Strong learning journey and returning-user story. Advanced users must interpret where a topic belongs; thesis and valuation may again become a crowded combined workspace. |
| **C. Editorial company brief** | A short curated brief with a persistent contents rail. Each section opens a focused detail view; an analysis action opens the thesis/valuation workspace. | Strong narrative and low initial navigation burden. Frequent transitions between the brief and detail views can weaken location awareness; less efficient for repeated cross-topic analysis. |

A best separates reading, investigation, writing and calculation while retaining familiar financial topics. Four is the smallest coherent top level here: three would either bury valuation in writing or overload the data destination. Seven or more would make the main navigation a feature inventory. Avoid configurable dashboards at this stage: choosing what to display would become another task before understanding a company.

**3. Content map: every major layer retains a home**

The internal menu under **Bolagsdata** is **Finansiellt · Verksamhet · Rapport & utsikter · Ägande & kapital**. Show one topic at a time. These are destinations, not accordions stacking the entire product.

| Existing capability | Primary home | Overview / contextual access |
|---|---|---|
| Company identity, fundamentals, TTM metrics, reported growth/profitability/cash generation | Översikt summary; full set in Bolagsdata → Finansiellt | Four or five applicable headline measures, explicitly labelled by period |
| Annual/quarterly financial charts, growth, margins and financial statement tables | Finansiellt | One switchable overview trend; link retaining the selected metric |
| Segments, business/revenue mix, company KPIs and their history | Verksamhet | A compact driver/mix visual and one key operating measure |
| Guidance, guidance revisions and outlook | Rapport & utsikter | Current reviewed outlook preview with target period and basis |
| Latest reporting, official documents, filings | Rapport & utsikter | Latest report date/period and direct official-document link |
| Material company events and full reviewed history | Rapport & utsikter → Händelser | Up to two recent reviewed events; full history one link away |
| Shares, SBC, buybacks, cash, debt, liquidity, funding and maturities | Ägande & kapital → Kapital | Only a compact relevant change preview when warranted |
| Form 4 filters, people, transactions, corrections and evidence | Ägande & kapital → Insiders | Dated activity summary with scope; no person list or filters |
| 13D/13G ownership, reporting entities, amendments, history and scope caveats | Ägande & kapital → Större ägare | Small dated preview within the capital overview; no ownership-history block on company overview |
| Saved thesis, conviction, counterevidence, assumptions, risks, notes, next-report questions, review date | Din tes | Continue/review action with accurate local-work status |
| Sedan din analys | Din tes → Granska, with an overview preview | Visible returning-user entry when reviewed changes exist |
| Review decisions, review reasons, continuity/draft recovery and data-change detection | Din tes → Granska | State-aware action; maintain distinct reviewed-evidence and saved-data comparisons |
| Reverse valuation, editable assumptions, Bear/Base/Bull, sensitivity | Värdering | Compact link from thesis; no calculator embedded in overview |
| Immutable revisions and version inspection | Din tes → Versioner | Revision selector/status within analytical workspaces |
| Outcomes, checkpoints and process review | Din tes → Utfall | Link from completed review; process remains distinct from price performance |
| Provenance, definitions, calculations, technical evidence, source/method | Shared Källor & metod destination/panel, filtered by context | Metric-level access remains; full source index available from company utilities |
| Exports and print | Exportera in company/workspace action menu | Explicit current/saved revision scope |
| Publication | Existing explicit publication flow, accessed from Din tes actions | Retain privacy and snapshot boundaries |
| Inactive/future AI Research | Secondary Research tools area | Preserve availability/status; no permanent empty overview section |
| Knowledge, Fråga NTM, educational disclosures and related content | Contextual concept help; restrained related links at relevant workspace end | One relevant help entry at the point of need; preserve explanations about separate tools and lack of automatic transfer |

Utilities are consistently visible as text links or an accessible labelled menu. They must not become a miscellaneous destination hiding important research.

**4. Overview composition: 10 seconds, then two minutes**

The initial desktop view should expose identity, the business driver, applicable headline numbers and the start of the primary chart. Reduce the current oversized company heading sufficiently to make this possible without sacrificing the serif identity. A short reviewed business description can accompany the name; it should not require a new generated-summary system.

Reading order:

1. **Identity and scale:** company, ticker, financial period context; revenue/net revenue, growth, applicable profitability and cash measures. Do not add market capitalisation or imply a live price from the manually entered valuation price.
2. **Returning-user strip, only when useful:** baseline revision date, concise reviewed-change previews and “Granska mot min tes.” Initially show at most two examples; open the existing grouped detail in review. Do not invent a materiality score or call every reviewed item significant.
3. **One dominant trend:** switch metric and annual/quarterly period using explicit controls. Revenue is the starting view. Keep actual values, accessible tabular access, gaps and comparison eligibility; do not mix annual, quarterly and TTM observations into a continuous series.
4. **Business driver plus current outlook:** paired desktop modules, stacked on mobile. Revenue mix explains what drives the company; guidance shows the target period, range and reported basis. Latest reporting sits with outlook.
5. **Recent events and research links:** at most two reviewed events, plus compact access to capital/ownership. No full histories or filter bars.

Company adaptation is essential. For **NVDA**, business mix should make Data Center discoverable. For **CRWD**, ARR and net new ARR belong prominently in business context but must remain distinguishable from recognised revenue. For **SOFI**, use the already-supported net revenue, earnings and business/KPI observations; surface bank capital/funding context where helpful. Keep explanations of inapplicable industrial-company FCF/margin measures in detail instead of reserving empty hero slots. Do not introduce new financial calculations to fill them.

“No saved revision” needs a modest invitation in the thesis action, not a full empty change panel. “No new reviewed changes” should be a quiet dated status. An unavailable feed is a distinct state: retain the last-verified warning and never let it imply that nothing changed. Show a storage-read error with a recovery route rather than a reassuring empty state. Selecting an older revision for inspection must not change the latest-saved baseline of Sedan din analys.

**5. Thesis and valuation as analytical workspaces**

**Din tes:** use a readable document/editor as the main column and a compact review context column on wide screens. Start with conviction and what would disconfirm it. Group assumptions, risks and next-report questions into focused editable sections. Keep review date, saved revision, draft status and the primary save action consistently discoverable. Existing fields and lifecycle operations should drive the presentation; avoid new conviction scores or automatic conclusions.

Review places the saved belief beside reviewed changes, then exposes the existing decision controls. On mobile, provide explicit “Min tes / Underlag” views without losing the draft. Versions and outcomes are secondary destinations within this workspace, not more sections after the editor. Consolidate redundant success messages while retaining local-device, sync and publication distinctions. A local draft is not a saved revision.

**Värdering:** lead with required annual EPS growth at the chosen price, a plain summary of the tested assumptions, then three aligned Bear/Base/Bull outcomes. Keep price origin, EPS basis, horizon, exit multiple and return requirement visible. Place editable controls alongside on desktop and behind a clearly labelled “Ändra antaganden” control on mobile. Before a valid calculation, show an honest setup state; after inputs change, mark outputs stale and keep the existing explicit recalculation requirement.

Sensitivity follows the outcomes. Desktop can retain the full matrix with a selected cell; mobile should offer one selected growth/multiple combination and a short slice of the same matrix, with full tabular access deeper. No interpolation, probability bands or new modelling. Preserve missing/negative EPS eligibility and manual-override behavior.

The code currently rejects thesis saving when valuation is stale and captures a valid valuation snapshot in the revision. Moving these screens apart must not sever that dependency. The thesis workspace needs a clear “Värdering behöver beräknas” link that preserves the writing draft and returns after calculation. Never silently recalculate, create a revision on navigation, or publish through saving.

**6. Visual system and evidence disclosure**

Use the existing visual tokens as the starting point. Keep serif page/section headings; use stable, tabular numerals and legible UI type for labels, filters and dense comparison. Reduce title dominance and avoid shrinking supporting context to fit more modules.

Spend whitespace between conceptual groups; tighten spacing within a related metric/value/period group. Prefer open sections and dividers to cards inside cards. Reserve a surface or border for interactive work, selected context and exceptional status. Use cyan consistently for primary actions and selected data, not every number.

Give the main chart more visual weight than its controls. Mix charts should use direct labels and a bounded number of visible categories, with the complete breakdown in Verksamhet. Guidance intervals must be labelled as reported ranges, not uncertainty estimates. Ownership must retain reporting/reference dates and reporting-entity caveats. Insider summaries must distinguish reports from transactions and shares, preserve category overlap and avoid a sentiment score.

Consolidate evidence **presentation**, not evidence identity. A contextual source panel should open directly to the selected metric, observation, event or revision, showing the same original values, quotations, methods and links. Preserve distinction between reported, derived and manual values. Keep interpretation-changing qualifiers—period, basis, non-comparability, recasts and stale coverage—beside the data. Technical identifiers, repeated document links and full method text can be one level deeper. Context help and provenance need separate labels and focus-return behavior.

**7. Entry and mobile**

On entry, put the labelled search field directly beneath “Analysera ett bolag.” Show up to three “Fortsätt där du slutade” items immediately below when present, with saved-work context. Follow with a simple supported-company list or browse link and “Skapa manuell tes.” The current 12-company universe does not need alphabet controls as its default presentation. Retain bounded search/pagination for future growth, manual identity semantics and explicit automatic-data coverage.

At desktop widths, use the four workspace links plus a short side menu inside Bolagsdata. Around tablet width, collapse that side menu into a labelled topic selector while keeping adequate chart width; do not compress a three-column desktop composition. At **430, 390 and 360px**, use the same content hierarchy and show only the active workspace/topic. A compact current-workspace button can open the four named destinations, avoiding a horizontally scrolling tab strip or ambiguous icons.

Use a two-column metric grid where labels fit; fall back to one column at 360px where necessary. Keep one chart, direct values and tap-accessible details. Switch detailed statements to metric/period selection and vertical rows by default; retain the complete table in detail. Avoid a large fixed bottom toolbar that competes with the keyboard. Restore scroll and focus on navigation, and keep evidence access operable without hover.

The recorded mobile screens demonstrate readable components, not a short overall journey. CSS already collapses insider filters to one column and capital metrics further at 390px: fitting the width can therefore substantially increase the page length. Workspace separation resolves that more directly than tighter spacing. Tablet needs fresh validation rather than extrapolation from existing screenshots.

**8. Implementation implications and phases**

Reuse the financial/evidence selectors, eligibility checks, provenance dialog, existing charts, storage, revision snapshots, continuity and export/publication services. This is predominantly a composition and navigation change, but the current global DOM dependencies make it more than moving HTML blocks.

Introduce a company shell with explicit render targets and one active workspace/topic. Stop using renderer call order plus `prepend()` to define the hierarchy. A small URL state such as `research.html?ticker=NVDA&view=data&topic=capital` is sufficient initially; a framework migration is unnecessary. Maintain aliases for existing anchors, including links from Knowledge, review and saved research. Back/forward navigation should restore location without saving or resetting work.

Keep view state separate from analytical state: company, workspace, topic and chart selection must not mutate thesis revisions or the change-feed baseline. Audit direct ID queries and form associations before unmounting editors. Initially retaining inactive analytical panels may be safer than rebuilding forms, provided hidden panels leave the focus order and accessibility tree. Resize charts when revealed; preserve request-generation guards during company switches. Exports must compose their intended report independently of which panel happens to be visible.

Suggested phases:

1. **Close the live-audit gap and establish baselines.** Fresh screenshots and interaction checks for the three companies; no-revision, no-change, changed, unavailable, draft/conflict and manual states; desktop, tablet, 430/390/360px in both themes. Record current calculation and revision results.
2. **Introduce navigation and explicit composition.** Separate destinations using existing components, preserve old deep links, keyboard navigation and draft continuity. Keep all major capabilities reachable.
3. **Compose the bounded overview.** Add profile-aware summaries, one trend, business/outlook previews and the conditional changes entry. Keep detailed modules intact in Bolagsdata.
4. **Refine analytical workspaces and shared evidence access.** Make outputs dominant, improve review composition and consolidate repeated chrome. Validate snapshot, export, sync and publication boundaries before retiring old layouts.

Major risks are lost drafts on navigation, stale results appearing current, hidden-panel chart sizing, duplicated IDs/events, broken legacy deep links, altered baseline selection, and source consolidation dropping critical qualifiers. Regression checks should compare identical calculation inputs/outputs and immutable snapshots, verify no save/publish side effects from navigation, and exercise keyboard/focus plus narrow-screen detail access.

For later usability validation, ask beginners to identify scale, growth and the business driver in ten seconds; ask returning users to find changes and start review; ask advanced users to reach a specific insider report, ownership caveat or source without traversing unrelated sections. These are proposed evaluation tasks, not measured outcomes.

Only this exploration document was added. Production UI, financial calculations, evidence, privacy and revision behavior were not modified; nothing was committed, pushed or deployed.
