# Company segments / business mix — 2026-09-22

**Locally release-ready.** Added 124 reviewed business-mix observations to the existing company-evidence feed. No commit, push or deployment; no separate owner production approval is implied.

## What the issuers report

| Issuer | Normalized reality | Useful current view |
| --- | --- | --- |
| NVDA | Two accounting segments: Compute & Networking and Graphics. Separately, market platforms Data Center and Edge Computing, with Hyperscale and AI Clouds, Industrial & Enterprise nested within Data Center. Preserved the older five-platform presentation. | Data Center: $89.023bn, 92.5% of revenue, +116.6% YoY. A selector exposes the distinct accounting and Data Center market views without adding them together. |
| SOFI | Three reportable segments: Lending, Technology Platform, Financial Services. Corporate/Other is a reconciliation, **not** a fourth operating segment. GAAP net revenue is kept separate from adjusted revenue. | Lending +63.4%, Financial Services +28.6%, Technology Platform −23.1% YoY. Shares use $1.275581bn of segment revenue; Corporate/Other of −$56.905m reconciles to $1.218676bn consolidated revenue. |
| CRWD | One operating/reportable segment. Subscription and professional services are **revenue categories**, not accounting segments. | Subscription: $1.400291bn, 95.2% of revenue, +27.0% YoY. Professional services: $70.606m, +7.0% YoY. |

Primary evidence: [NVIDIA Q2 FY2027 10-Q](https://www.sec.gov/Archives/edgar/data/1045810/000104581026000075/nvda-20260726.htm), [SoFi Q2 2026 earnings exhibit](https://www.sec.gov/Archives/edgar/data/1818874/000181887426000050/a2026q2earningsrelease.htm), [CrowdStrike Q2 FY2027 10-Q](https://www.sec.gov/Archives/edgar/data/1535527/000153552726000031/crwd-20260731.htm). The registry retains every historical source URL and exact passage.

## Model, history and comparability

The existing `reviewedEvidence.observations` now accepts `kind: business_mix`, with reusable `category`, `group` and `recast` metadata. These preserve category identity/role, issuer terminology, classification, group membership/total, optional parent, scope version and issuer-recast state. Existing fields retain value, USD unit, quarter start/end, publication date, basis, definition and exact SEC provenance. No issuer-specific revenue columns or second publication store were introduced.

Coverage: **NVDA 60 observations** from three 10-Qs; **SOFI 40** from four earnings exhibits; **CRWD 24** from three earnings exhibits and its latest 10-Q. Repeated observations preserve what each publication actually said. SoFi covers five quarters through Q2 2026; CRWD covers eight through Q2 FY2027, displaying the latest five. NVIDIA preserves selected legacy/comparative quarters, three consecutive comparable market-platform quarters, and the separate accounting/submarket comparisons. This is a bounded review, not a complete archive.

NVIDIA changed its market-platform presentation in Q1 FY2027 and reclassified a customer from ACIE to Hyperscale in Q2. Its original Q1 Hyperscale revenue of **$37.869bn** and subsequently recast **$43.050bn** both remain. Current QoQ uses the latter: approximately **+13.1%**, not the misleading approximately +28.6% against the old basis. No Edge Computing series is reconstructed from similarly named old categories.

As-of views select only sources published by that date. Charts stop at scope changes, missing quarters or incomplete groups. Latest YoY uses matching issuer-recast comparatives where supplied. Submarket/accounting views with insufficient consecutive history show mix and valid YoY without a trend chart. A label-only rename can retain an explicitly reviewed identity; matching text never establishes equivalence. Rename behavior is tested synthetically; actual NVIDIA reorganizations/recasts supply the production cases.

Publication rejects missing/duplicate categories, incompatible periods/scopes, negative operating-category revenue and groups that do not reconcile to their stated total. Corporate eliminations remain signed reconciliation rows rather than being silently discarded or plotted as operating businesses.

## Presentation and Research

**Vad driver intäkterna?** follows the existing financial overview. It shows a large relevant total, horizontal mix, compact revenue/share/YoY rows and zero-based stacked quarterly bars where comparable. A single closed **Källor & metod** contains exact USD history, original/recast status, definitions, SEC links and original passages. Unsupported issuers receive no empty section. Visual V3 and existing profile layout are preserved.

`NTMCompanySegments.history`, `view`, `compare` and `changesSince` expose read-only evidence for later Research comparisons, including newly reported periods, changed historical values and changed scope. The shared observation identity now includes category/group, preventing one business line from superseding another. Saved Research revisions remain unchanged. The final “Sedan din analys” UI is not built.

## Source and review boundary

Reused the SEC client, normalized HTML/table extraction, pinned review registry, offline fixture directory, status files and atomic refresh. Four reviewed periodic filings extend the existing earnings-document allowlist. Larger periodic reports use an explicit bounded 10 MB transport option; ordinary exhibits retain the 2 MB default and existing URL/content-type/redirect safeguards.

Deterministic selectors parse numbers from exact reviewed official table passages, with signed corporate values supported. No AI extraction, secondary providers or paid data. Classification, column/period mapping, scope and recasts require source/implementation review. New disclosures wait for review; missing/changed/ambiguous sources fail closed and retain the last verified file. A live reviewed refresh succeeded for all three issuers. Prior **63 guidance/KPI observations are unchanged** against HEAD.

Limitations: revenue only; no segment-profit, geographic or customer-concentration expansion. NVIDIA history is intentionally discontinuous across incompatible presentations. SoFi's Technology Platform branding is not automatically treated as a segment rename. Review remains necessary for new releases and taxonomy changes; the implementation review is not independent human sign-off.

## Validation

Passed:

- Full release gate: **200 Python tests (one optional skip); 343 JavaScript tests (341 passed, two optional skips)**. Financial/evidence/Research regressions, generated artifacts, staging, local references, security and `git diff --check` passed.
- **42 browser smoke tests**, **4 Fundamental Profile/Wave 4 tests**, and **24 existing guidance/KPI presentation regression cases**.
- **41-page accessibility/CSP audit**, plus a dedicated audit of all three pilot pages.
- **Two screenshot passes, 80 group/viewport/theme cases**, at 1440/360/390/430 px in dark/light. Checked closed defaults, group switching, source/definition expansion, keyboard/focus, no document overflow, missing-category failure, stale-source retention and unchanged Research revisions.

Pass 1 prompted a narrower desktop selector and a shared chart unit label instead of repeated per-bar units. Pass 2 confirms clean mobile rows and useful comparable trends; incompatible NVIDIA series stay disconnected. Representative screenshots were visually inspected. These practical checks are not a claim of exhaustive accessibility certification.

[Pass 1](../../qa/company-segments/pass-1/results.json) · [Pass 2](../../qa/company-segments/pass-2/results.json) · [Accessibility/CSP](../../qa/company-segments/quality.json) · [Pilot accessibility](../../qa/company-segments/pilot-accessibility.json)

[Desktop NVDA](../../qa/company-segments/pass-2/NVDA-market-platforms-1440-light-default.png) · [Mobile SoFi](../../qa/company-segments/pass-2/SOFI-accounting-segments-390-light-default.png) · [Mobile NVDA submarkets](../../qa/company-segments/pass-2/NVDA-data-center-markets-360-dark-default.png) · [Desktop CRWD](../../qa/company-segments/pass-2/CRWD-revenue-categories-1440-light-default.png) · [Expanded source history](../../qa/company-segments/pass-2/NVDA-market-platforms-1440-dark-sources.png)

Next: review the next issuer disclosures through this same pipeline, then separately scope the Research comparison experience using the preserved as-of/recast evidence.
