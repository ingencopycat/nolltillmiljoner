# Research redesign — Wave 1

26 September 2026. Structural composition only; no Wave 2 redesign, commit, push or deployment.

## Structure and routing

- **Översikt:** existing headline metrics, reported development, annual revenue trend and a compact saved-analysis/change status. Related learning links remain in a disclosure.
- **Bolagsdata → Finansiellt:** the complete existing metrics renderer, growth/margins, annual and quarterly charts, statement tables and their sources.
- **Bolagsdata → Verksamhet:** segments/revenue mix and operating KPIs, including original history, definitions and source passages.
- **Bolagsdata → Rapport & utsikter:** reporting, official documents, guidance/revisions and material events/history.
- **Bolagsdata → Ägande & kapital:** capital/liquidity, shares/SBC/buybacks/debt, Form 4 and 13D/13G with existing filters and caveats.
- **Din tes:** mounted original editor and publication action; secondary destinations Granska, Versioner, Utfall and Exportera. Review contains the full Sedan din analys and the separate saved-data comparison. Markdown/PDF retain the selected saved revision scope.
- **Värdering:** original assumptions, reverse valuation, Bear/Base/Bull and sensitivity. A stale-valuation link from the thesis leads here; an explicit link returns to the draft.
- **Research-verktyg:** secondary disclosure for the existing inactive AI capability/status.

URLs use `ticker`, `view=overview|data|thesis|valuation`, `topic=financials|business|outlook|capital` and optional thesis `section=review|versions|outcomes|export`. For example, `research.html?ticker=NVDA&view=data&topic=capital`. Invalid view/topic values fall back to a valid destination. Existing anchors resolve their containing workspace/topic, including async evidence anchors and Knowledge/Min NTM/review links. `review=exact` remains supported.

Workspace history uses `pushState`/`popstate` without reinitializing analytical forms. Company selection retains normal document navigation. History crossing the existing inline manual-entry path reloads the correct company through the existing continuity flow. Navigation focuses and scrolls to the selected destination; it does not promise restoration of an exact previous pixel offset.

## State and implementation boundaries

`research-shell.js` explicitly composes mounted nodes and assigns stable evidence render slots. Renderer completion/call order no longer determines the company hierarchy. Guidance and KPI rendering share their existing selector and presentation code with a kind filter; original observations are not modified.

Hidden workspaces/topics have `hidden` and `inert`: no layout height, focusable descendants or accessibility-tree content. Desktop uses labelled links with `aria-current`; tablet/mobile use labelled native selects without horizontal navigation strips. Charts resize after reveal/disclosure changes. IDs and form associations remain unique.

Workspace/topic changes preserve draft text, assumptions, stale calculation state, selected revisions and the latest-saved change baseline. They do not save, publish, recalculate or write analytical storage. Existing save/calculation eligibility, local draft recovery, privacy and publication services retain ownership of those operations.

## Verification

- Release gate: 311 Python cases (one existing skip); 428 Node cases (426 passed, two hosted migration cases skipped). Evidence reproduction, SEO/generated artifacts, calendar/rules, security, staged references/CSP and `git diff --check` pass.
- Full browser smoke: all 43 cases pass, with navigation updated to reach the newly separated workspaces. Calculation, save/history, restore, outcomes, exports, privacy and existing journeys remain covered.
- Auth/session browser checks pass with synthetic Auth: signed in, browser restart, token renewal and expired/offline sign-out; no silent upload.
- Offline publication/social browser checks pass: preview/cancel/focus, explicit publication scope, privacy, unpublish and request allowlist.
- Accessibility/CSP/performance browser checks and workflow syntax validation pass. Real screen-reader and hosted database checks were not performed.
- `research_shell_browser.py`: two passes, each **210 visual cases** across NVDA/SOFI/CRWD, 1440/768/430/390/360px, dark/light, all four workspaces and data topics. Also checks no revision, no changes, changed fixture, stale valuation, unsaved drafts, immutable revisions, Back/Forward, refresh, legacy links, company switching, exports, manual entry and unavailable status.
- `research_shell_edges.py`: keyboard navigation/focus, hidden-panel exclusion, revealed chart sizing, missing coverage, corrupt storage, supported-to-manual entry and company history restoration.
- Identical-input before/after comparison passes for all three companies: calculation state/results, financial snapshots and saved revision payloads. Only generated IDs and timestamps differ. All existing SEC links and all guidance/KPI history rows match the original composition.

## Screenshot review

The first pass found a tablet metric overflow and an orphaned metrics toggle. The final composition puts complete metrics in Finansiellt, links to them from Overview and uses two metric columns at tablet width. Review also exposed overlap between the existing EPS help button and source badge; a bounded layout fix separates them, with a geometry assertion. The refreshed second pass has no horizontal overflow. Thesis and valuation retain their existing forms and visual language; data topics contain only their assigned research layers.

At 1440px in fresh, unsaved contexts, default document height changed from **14,451 → 2,242px (NVDA)**, **15,456 → 2,242px (SOFI)** and **14,597 → 2,413px (CRWD)**. Content remains reachable through the workspace/topic navigation. The large existing company heading and detailed-topic density remain intentionally for later waves.

Artifacts: [pass 1](qa/research-shell/pass-1/), [pass 2](qa/research-shell/pass-2/), [equivalence](qa/research-shell/equivalence.json), [source/height checks](qa/research-shell/edges.json).

**Locally release-ready for Wave 1.** Hosted migration tests remain environment-dependent skips; existing calendar/upstream-data warnings remain unchanged. No financial normalization, valuation mathematics, revision/storage schema, privacy boundary or SEC updater changed.
