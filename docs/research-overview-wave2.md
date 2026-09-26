# Research Wave 2 — bounded company overview

26 September 2026 · implemented locally; no commit, push or deployment

Översikt now contains a compact identity header, applicable headline numbers, conditional analysis-change status, one financial trend, business drivers, guidance/latest reporting and at most two reviewed events. Detailed financial summaries and concept help remain accessible in Finansiellt; the four workspaces and their topic architecture are unchanged.

## Presentation rules

- **Headlines:** existing revenue TTM and eligible annual growth lead. Non-financial issuers use eligible annual operating margin, FCF TTM and net income TTM, with existing EPS as a fallback. SOFI uses net revenue, growth, net income and verified available EPS; no industrial FCF/margin placeholders. Missing measures are omitted, never duplicated to fill a slot. Periods, units, reported/derived labels and sources remain available.
- **Since analysis:** no revision leaves the modest existing thesis action; no changes gives a quiet dated status. Changed revisions show at most two group previews and a review link. Unavailable/stale coverage and storage errors remain explicit, with recovery routes. The existing comparison model still owns publication-date, same-day and latest-saved-baseline rules.
- **Trend:** revenue starts the view. Available revenue, operating income, net income, FCF and verified EPS series can be selected, with separate annual/quarterly modes. Up to six labelled periods use original facts. Missing observations remain gaps; ineligible facts are not plotted. Negative earnings keep their sign and a visible explanation of the dashed magnitude bars. Exact values, original units and provenance remain in an accessible table. Metric/period URL state survives refresh and Back/Forward.
- **Business:** existing segment selectors supply up to three labelled components and their existing shares. NVDA exposes Data Center; SOFI retains the segment-to-net-revenue reconciliation and member definition; CRWD includes ARR explicitly distinguished from recognized revenue. One reviewed KPI is shown where available.
- **Outlook:** at most two quantitative guidance observations, plus one relevant qualitative qualifier, retain target period, basis, publication date and notes. Latest reporting has a direct official-document link. No guidance history or filing list is embedded.
- **Events:** at most two reviewed event summaries published within the last 365 days, explicitly labelled by publication date. Older history remains in Rapport & utsikter. No empty event module or filter bar.
- **Depth:** ordinary shell links lead to Finansiellt, Verksamhet, Rapport & utsikter, event history, sources and thesis review. Existing source identities and full detailed observation histories are preserved.

## Screenshot review

Two passes captured NVDA, SOFI and CRWD at 1440, 768, 430, 390 and 360 px in both themes, plus saved-change and failure states. Representative full-page captures were visually inspected across companies, themes, desktop, tablet and narrow mobile.

Pass 1 exposed redundant help chrome and poorly prioritized qualitative guidance. Pass 2 moves that help beside detailed financials, prioritizes quantitative guidance, separates adjacent source/depth links, tightens spacing and omits older event previews. The desktop first view exposes identity, useful numbers and the beginning of the trend. Tablet retains two business/outlook columns; mobile stacks those two areas and uses two metric columns, falling back to compact single-column rows at 360 px. Primary content has no horizontal overflow.

The overview is finite and contains no full evidence histories or analytical forms. Narrow screens still require several viewports, particularly when necessary basis/coverage notes are present. The ten-second understanding target is a design aim, not a measured usability result.

- [Pass 1 captures](qa/research-overview/pass-1/)
- [Pass 2 captures](qa/research-overview/pass-2/)
- [Final desktop CRWD](qa/research-overview/pass-2/CRWD-1440-light.png)
- [Final tablet SOFI](qa/research-overview/pass-2/SOFI-768-light.png)
- [Final narrow NVDA](qa/research-overview/pass-2/NVDA-360-dark.png)

## Validation

| Check | Result |
|---|---|
| Release validation | Passed: Python 311 collected, 310 passed/1 existing skip; JavaScript 432 collected, 430 passed/2 existing skips; evidence, security, generated artifacts, staging and CSP checks passed |
| Full browser smoke | 43 passed |
| Research shell | 210 viewport/theme/workspace cases passed; drafts, stale valuation, routing, legacy anchors, export, manual and unavailable states |
| Shell edge checks | Passed; detailed SEC links/observation history preserved, keyboard, manual transitions and storage errors |
| New overview browser QA | Both passes passed: 30 company/viewport/theme captures per pass, metric/period/source controls, deep links, Back/Forward, refresh, saved/no-change/changed/unavailable/partial evidence |
| Overview selector regressions | 4 passed; immutable inputs, period isolation, missing gaps, incompatible/recast/invalid facts, financial-company eligibility and negative earnings |
| Publication Wave5 | 4 passed, including saved/private boundary and unsaved draft |
| Save/revision QA | 8 viewport/theme cases and persistence, duplicate suppression, baseline, draft, quota, failure and privacy checks passed |
| Company observations/guidance, segments, evidence presentation, Sedan din analys | Passed |
| Accessibility/CSP | Full existing page suite plus SOFI and CRWD passed; labels, focus, reduced motion, narrow reflow and CSP |
| `git diff --check` | Passed |

The evidence chart QA now calls the Wave 2 renderer and verifies explicit gaps rather than the old all-or-nothing chart. Smoke assertions locate the full OCF collection in Finansiellt and the new five-item NVDA headline strip. No behavioral financial, revision or publication assertions were removed.

**Locally release-ready.** No financial calculations, normalized evidence, valuation/revision semantics, privacy, SEC updater or comparison baseline model changed. Coverage is limited to existing verified facts and reviewed evidence; supported companies without reviewed business/guidance show that absence and retain existing report access. Hosted authenticated writes were not rerun. Wave 3 and other workspace redesigns were not started.
