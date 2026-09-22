# Insider UI and regression review

Two passes use the actual 36-filing NVDA/SOFI/CRWD dataset, not synthetic screenshots. Each passed 24 combinations: three companies, widths 1440/360/390/430, dark/light. Screenshots include timeline, category filters, lazy transaction detail, history (where present) and methodology. Tests also exercise owner filtering, progressive disclosure, keyboard details, unavailable-refresh fallback, unsupported ticker absence and immutable saved Research revisions.

Pass 1 visual inspection: NVDA mobile/light timeline, CRWD desktop/dark timeline and mobile/light derivative detail, SOFI mobile/dark purchase history. Observed readable source footnotes, distinct exercise/derivative legs, neutral bars and no horizontal overflow. Fixed singular `rapport`/`rad` labels before pass 2.

Pass 2 visual inspection: NVDA mobile/dark amendment history, SOFI desktop/light filtered activity and mobile/light purchase history, CRWD mobile/dark timeline. Original/amendment distinction is visible; purchase precision is preserved; mobile text wraps cleanly and the primary flow keeps evidence collapsed. No color-coded bullish/bearish implication. Source names retain reported ordering. This is agent visual review, not external participant validation.

Regression results: release 240 Python / 377 JS (one optional PostgreSQL and two optional migration skips); browser smoke 42; Wave 4 four; accessibility/CSP 41 pages plus three pilots; observation/segment/capital browser matrices 24/40/24. Release security, staging, local-reference and diff checks pass. All 376 pre-existing reviewed observations are unchanged.

The first relocated Wave 4 run hit its pre-existing `OUT.parents[2]` path assumption. Rerunning at the expected directory depth (`../company-insiders-wave4`) passed all four tests; no product fix was needed. Logs retain the final successful run. Final source-negation hardening was followed by the 20-test focused parser suite; it does not change any actual pilot classifications or screenshots.

Artifacts: `pass-1/`, `pass-2/`, `accessibility.json`, `accessibility-pilots.json`, final gate logs here; previous-layer regression images are in each layer's `pass-insiders-regression/`. Optional database gates remain unexecuted without their test database configuration. No production smoke or deployment was performed.
