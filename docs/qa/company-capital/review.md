# Capital presentation review

Two passes use the checked-in, primary-source NVDA/SOFI/CRWD observations, not synthetic screenshots. Each pass covers desktop 1440px and mobile 360/390/430px in dark and light themes: 24 cases, with ownership, liquidity and expanded-source captures; desktop also captures a source passage. Results are in `pass-1/results.json` and `pass-2/results.json` (78 images per pass).

Pass 1: inspected all three companies across desktop/mobile and both themes, including source history. The 430px NVIDIA cash-minus-debt value wrapped its currency onto a separate line. A full-width third metric on narrow screens fixes that. Chart values were scaled but the heading said only USD; pass 2 explicitly names billions/millions in the heading. Source passages were tightened to the selected inline fact's surrounding statement text.

Pass 2: reviewed NVIDIA desktop/dark and mobile/light; SoFi desktop/light and mobile/dark; CrowdStrike desktop/dark source history and mobile/light ownership. Amounts, periods, scope labels, split-adjusted history and source disclosure remain legible. No horizontal document overflow in any case. Source tables scroll within their own expanded container. Charts start at zero, expose numeric accessible names and never join incompatible series. No empty SoFi buyback tile or industrial net-debt calculation.

Both passes exercise keyboard source expansion/collapse and focus return, definition/history selection, debt-history selection, retained data after source failure and unsupported-company suppression. Saved Research revisions remain byte-equivalent. The final pass was rerun after calculation-eligibility checks and funding-note review; default values and visual layout are unchanged.

Existing browser smoke, Wave 4, guidance and segment browser gates passed. `accessibility.json` covers the existing 41-page gate; `pilot-accessibility.json` covers all three pilot pages. These are the repository's practical accessibility/CSP checks, not a claim of exhaustive accessibility certification. Wave 4 captures are isolated in `wave4/`; older QA artifacts were restored unchanged.
