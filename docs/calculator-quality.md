# Calculator quality standard

Scope: priority surfaces are compound growth, daily leverage, recovery, ISK,
mortgage and Research valuation. Other tools adopt this standard when changed;
this pack does not certify every possible input combination in every calculator.

Use the existing `CalcState` contract: return `true` (or `{success:true}`) only
after validating all inputs and derived outputs; return an actionable Swedish
error string otherwise. Compute before rendering. Never render NaN/Infinity.
Neutral means not calculated; edits mark results stale; failure means error,
even after an earlier success. Old results may remain for context, but the status
explicitly says they do not apply. Recalculation is explicit. Preserve inputs.

| Surface | zero / negative / impossible cases | Meaningful stress case |
| --- | --- | --- |
| Compound | Zero return is linear saving; fee-adjusted zero must match. Negative net growth and total loss supported. Negative initial capital/saving rejected by the form. | Finite extreme growth or explicit overflow error; chart endpoint matches result. |
| Daily leverage | Positive capital/leverage; zero move and fee valid; daily move at least −100%; fee 0–100%. Zero balance cannot recover. | Daily loss beyond leveraged capital floors at zero. Overflow must not replace table/chart. |
| Recovery | Zero loss needs zero gain; 100% loss is impossible to reverse by a finite percentage; negative loss rejected. Optional amount may be zero. | 99.999% loss has a very large finite required gain; reject non-finite input. |
| ISK | Zero capital and capital below available allowance produce zero tax; negative amounts rejected. | Exhausted shared allowance; overflow in summed quarterly capital must error. |
| Mortgage | Zero rate valid; negative balances/rates invalid. Exact 50% and 70% LTV use the lower band. | Principal repaid early; bank assessment remains outside the model. |
| Research | Negative/unavailable EPS is not a meaningful positive-multiple basis; manual EPS is explicitly labeled. | Non-comparable share basis, missing fundamentals, stale assumptions; unavailable is preferable to fabricated results. |

Result content pattern (reuse existing sections, not a new universal layout):

1. Primary result with unit and horizon (SEK/USD, %, month/year).
2. Assumptions: contributions/timing, rates/fees, price provenance or rule version.
3. A relevant stress or boundary example, not a prediction.
4. Plain Swedish explanation; deeper formulas may live in a disclosure.
5. Existing relevant next step (change scenario, save thesis, related tool).

Calculation precision stays unrounded internally. Display rounding uses existing
Swedish formatters; label percent versus percentage-point changes. Tests compare
unrounded values with numerical tolerances, not localized strings alone. Money
display rounding is not an accounting/tax filing promise.

Daily model: V[t] = V[t−1] × max(0, 1+L×r[t]) × max(0, 1−f).
Constant L and f, no flows. Reordering the same daily percentages preserves final
value (multiplication commutes); intermediate values and fee amounts can differ.
100 with +10%, −10% yields 99 underlying and 91 at 3x with no fee, in either order.
Different sets of returns with the same index endpoint can produce different
leveraged endpoints. This is the supported path dependence, not a claim that
permuting the same returns changes final wealth. Financing, spread, intraday
events, taxes and actual product reset/termination terms are not simulated.

Regression changes must exercise the loaded script/page, plus independent
recurrence/oracle cases. Relevant suites: `calculator-reliability.test.cjs`,
`valuation-core.test.cjs`, `research-workflow.test.cjs`, `browser_smoke.py`.
