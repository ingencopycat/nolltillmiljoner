# Research Wave 3 — analytical workspaces

26 September 2026 · Local implementation and validation

Din tes now leads with the investment belief and what would disconfirm it. Assumptions, risks and notes use focused disclosures. A compact context column holds review timing, saved revision information, reviewed-change context and recovery. Save remains visible with the canonical confirmation/error and a separate unsaved-draft indicator. Mobile uses Min tes / Underlag without unmounting fields; deep links reveal the correct pane.

Granska places the existing grouped evidence beside the saved belief and decision controls on desktop, stacked on mobile. Versioner, Utfall and Exportera retain their secondary destinations. Publication remains an explicit, visible secondary thesis action with its existing saved-revision/private-data boundary. Recovery disclosures open for actionable blocked/error states.

Värdering leads with required annual EPS growth and the last calculated assumptions, including price origin. Bear/Base/Bull show aligned terminal prices, annual and total returns, and their assumptions. Original detailed tables and historical context remain available. Desktop places inputs alongside results; mobile uses Ändra antaganden. Edits preserve the existing stale state and require explicit recalculation; stale valuation still blocks thesis saving. Recalculation and returning to the thesis preserve the writing draft.

Sensitivity offers a selected growth/multiple combination and a three-cell slice copied exactly from the existing matrix. The full matrix remains accessible in a disclosure. No calculations, financial eligibility rules, revision payloads or persistence services were changed. The existing initial example calculation, including its manual EPS fallback of 1 when needed, remains unchanged; input edits do not silently recalculate.

## Screenshot review

Two passes captured NVDA, SOFI and CRWD at 1440, 768, 430, 390 and 360px in both themes (60 thesis/valuation captures per pass, plus state captures). Representative desktop, tablet and mobile images were visually inspected. The first pass exposed inherited form width, repeated save context, excessive result spacing and competing mobile selection styling. These were corrected; save feedback was also kept in view after submission. The second pass confirms a larger writing surface, dominant required growth and readable aligned scenarios. The existing company header still uses meaningful mobile space.

- [Final mobile valuation](qa/research-workspaces/pass-2/SOFI-390-light-valuation.png)
- [Final desktop thesis](qa/research-workspaces/pass-2/NVDA-1440-dark-thesis.png)
- [Review beside evidence](qa/research-workspaces/states/review-1440.png)
- [Mobile review](qa/research-workspaces/states/review-390.png)

## Validation

Exact equivalence against pre-Wave-3 commit `7fd530f8c77b191250c9ef6056d16a7143c32c44` passed for all three companies: identical reverse outputs, scenario outputs, full sensitivity text, valuation snapshots and complete saved revisions with controlled dates/IDs. See [equivalence evidence](qa/research-workspaces/equivalence.json).

Passed:

- New workspace browser passes 1 and 2: draft navigation, blocked stale save, explicit recalculation, successful save/reload, hidden/inert panes, historical inspection, selected-revision export, Back/Forward and responsive layout.
- Additional state checks: missing/negative/manual EPS, new reviewed evidence, read-only review, mobile deep links and draft recovery.
- Save/revision browser suite; shell navigation (210 cases); review/lifecycle (9 tests); change-feed and Wave-2 overview regression suites.
- Full browser smoke (43 tests); Wave5 publication (4 tests); social/privacy and real-SDK synthetic auth/session suites.
- Accessibility/CSP checks on nine company/workspace routes, both themes at desktop and narrow widths.
- Release validation: Python 310 passed / 1 existing skip; JavaScript 430 passed / 2 existing skips; generated artifacts, evidence, security, staging/CSP and local-reference checks.
- Final `git diff --check` and new-source syntax/whitespace checks.

QA navigation helpers now reveal the real notebook pane and open ancestor disclosures through normal UI. Two older review assertions gained this navigation setup; behavioral assertions were retained. No forced clicks or hidden/inert removal were introduced.

Locally release-ready based on these checks. Hosted authenticated writes were not exercised; auth/publication testing used synthetic or offline fixtures. No usability study was performed. Overview and Bolagsdata production code remain unchanged. Nothing was committed, pushed or deployed; Wave 4 was not started.
