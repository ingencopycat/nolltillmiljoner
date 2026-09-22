# Data first, evidence on demand

**Locally release-ready.** Presentation refinement only; no commit, push or deployment. Canonical financial calculations, SEC ingestion/evidence semantics, company coverage, immutable Research and Public Research contracts are unchanged. No guidance/KPI work.

## Presentation

- Preserved **Bolaget i siffror**. Growth, operating margin and FCF now use large values, secondary units, clear annual periods and short comparisons derived from the existing Fundamental Profile calculations. No new metric cards or visual system.
- Removed repeated source labels, method prose, version strings, internal identifiers and source buttons from the default Fundamental Profile flow. All observations, periods, units, formulas, eligibility reasons, limitations, diagnostics and the complete versioned payload remain under **Källor & metod**. Existing source dialogs still provide SEC provenance and canonical educational help remains available there.
- Retained the verified revenue chart, expanded it to the available width and moved its explanatory sidebar into its disclosure. Plotting now reuses the canonical comparability checks: incompatible definitions, currencies, periods, missing years or restatements do not produce a trend. The original observations remain inspectable.
- Moved **Senaste rapportering** into the overview after the chart. Fiscal-quarter labels require an exact period/accession match; otherwise a period-end label is used. **Öppna 10-Q/10-K**, **Läs resultatmeddelande** and **Se SEC-filing (8-K)** lead directly to verified official destinations. Reports are not reproduced inside NTM. The release remains associated with its own 8-K, without inventing a relationship to the periodic report.
- **Sedan din analys** shows a compact count only when a saved revision exists. Coverage limits, same-day uncertainty, recent events and complete accession/document provenance live in the reporting disclosure. Failed refreshes remain visible and unsupported release relationships are explicitly unverified.

## Screenshot review

Two passes used unchanged NVDA/SOFI/CRWD production JSON across 1440/360/390/430 pixels and both themes: **48 company/viewport/theme cases**. Captures cover overview, Bolaget i siffror, growth/profitability, revenue, reports/documents, closed/expanded evidence and saved-Research comparison. Additional first-visit captures confirm the comparison stays hidden without a saved revision.

Pass 1 exposed an obsolete empty chart-sidebar column and oversized unavailable placeholders for SoFi. Pass 2 removes that column and makes SoFi's unsupported margin/FCF states compact without inventing values. Reviewed full reading-flow captures and contact sheets confirm scannable numbers, restrained borders and clear report actions.

- [Final desktop reading flow](../../qa/evidence-presentation/pass-2/NVDA-1440-light-reading-flow.png)
- [Final mobile reading flow](../../qa/evidence-presentation/pass-2/CRWD-390-dark-reading-flow.png)
- [Pass 1 results](../../qa/evidence-presentation/pass-1/results.json) / [Pass 2 results](../../qa/evidence-presentation/pass-2/results.json)

## Verification

Passed: release validation (**178 Python tests, one existing optional PostgreSQL test skipped; 318 JavaScript tests**), all **42 browser smoke tests**, **4 Fundamental Profile/Wave 4 browser tests**, and accessibility/CSP checks across **41 page records**. These include financial evidence, SEC pilot, Research lifecycle, provenance and Public Research regressions. Generated artifacts, staging, security and `git diff --check` passed.

The presentation matrix verified no horizontal overflow at 360/390/430, native disclosure keyboard controls, source-dialog Escape/focus return, and unchanged saved revisions. Official actions have 44-pixel minimum height. Focused checks reject incompatible chart observations and verify source-bound fiscal labels. This is automated and visual QA, not a claim of complete screen-reader/WCAG certification.

Changed shared presentation: `fundamental-profile-ui.js`, `company-evidence.js`, `research-v3.js`, `research-v3.css`, `research.html`. Updated browser tests/DOM test boundary and added presentation tests, a reproducible screenshot runner and review artifacts. Production data files are unchanged.
