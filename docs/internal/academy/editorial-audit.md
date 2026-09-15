# Academy V2 editorial audit — 2026-09-15

Internal assessment by the implementation agent; not an external finance certification. Scores are editorial judgments, not learner grades or claims of measured learning outcomes. No scores or audit files are shipped by the static staging process.

Every V1 lesson was read for beginner clarity, practical relevance, worked example, experienced-reader depth, mistakes, terminology, length, repetition, abstraction, context, applicable formulas, NTM exercise and source/method discipline. Existing short answers generally worked. The recurring weakness was that the deeper section named limitations without walking through their consequences. Formula-heavy lessons needed a second comparison; qualitative lessons needed an observable decision or review example. Reusing the same generic caveats was less useful than explaining each concept's specific failure mode.

Score dimensions (each 0–2): **C** clarity/context; **E** examples and applicable calculations; **D** useful depth and misconceptions; **T** terminology/source discipline; **A** actionable NTM connection. 0 missing, 1 usable but incomplete, 2 sufficient for this foundational lesson's stated scope. Passing this review does not imply a complete course or expert-level coverage.

| Lesson | V1 C/E/D/T/A | V2 C/E/D/T/A | Finding and targeted correction |
|---|---|---|---|
| aktier | 2/1/1/2/2 | 2/2/2/2/2 | Share price versus market cap needed contrasting companies; added dividend value transfer and funding question. |
| fonder | 2/1/1/2/2 | 2/2/2/2/2 | Index/benchmark comparison too brief; added comparable return periods, weighting and mandate checks. |
| etf | 2/1/1/2/2 | 2/2/2/2/2 | Bid/ask wording ambiguous; clarified the retail perspective and added NAV premium, replication and order limits. |
| avkastning | 2/1/1/1/2 | 2/2/2/2/2 | Cash flows named without an example; added end-period deposit and time-/money-weighted distinction. Own arithmetic method. |
| risk | 2/2/1/2/2 | 2/2/2/2/2 | Risk capacity and horizon abstract; added loss amount, need date, price risk and probability limitation. |
| diversifiering | 2/1/1/2/2 | 2/2/2/2/2 | Overlap warning lacked calculation; added 70% aggregate sector exposure and shared-driver risk map. |
| compounding | 2/2/1/1/2 | 2/2/2/2/2 | Deposit timing and withdrawals underexplained; added exact staged contribution example and sequence risk. Own arithmetic. |
| fees | 2/2/1/2/2 | 2/2/2/2/2 | Approximate rate subtraction could feel exact; contrasted 105.93 with 106 under explicit fee timing. |
| gav | 2/1/1/1/2 | 2/2/2/2/2 | Equal-sized orders did not teach weighting; added unequal quantities, split treatment and previous-fee handling. Not tax accounting. |
| isk | 2/1/1/2/2 | 2/2/2/2/2 | Capital base too abstract; added quarterly average without deposits, retained registry/year dependency and hypothetical tax example. |
| currency | 2/2/1/1/2 | 2/2/2/2/2 | Needed apparently cancelling percentages and inverted quote caveat; added +10/−10 = −1%, dividend timing. |
| revenue | 2/1/1/1/2 | 2/2/2/2/2 | Missing organic/acquired bridge and accounting context; added 100→130 with 25 acquired and source metadata. |
| eps | 2/2/1/1/2 | 2/2/2/2/2 | Weighted average named without demonstration; added half-year share issue and IAS 33 source. |
| fcf | 2/2/1/1/2 | 2/2/2/2/2 | Needed profit-to-cash bridge; added working-capital/CapEx example and IAS 7 source. |
| marginal | 2/2/1/1/2 | 2/2/2/2/2 | Gross versus operating distinction incomplete; added successive cost layers and source. |
| debt | 2/1/1/1/2 | 2/2/2/2/2 | No debt-service stress example; added interest coverage 3→1 and liquidity limitations. |
| dilution | 2/1/1/1/2 | 2/2/2/2/2 | Buybacks only mentioned; added EPS arithmetic, cash cost and offsetting compensation. |
| pe | 2/2/1/1/2 | 2/2/2/2/2 | PEG lacked units/example; added 20/10 = 2, invalid growth cases and capital needs. |
| cagr | 2/2/1/1/2 | 2/2/2/2/2 | Arithmetic mean trap needed worked contrast; added +50/−50 and zero/negative value boundaries. |
| reverse | 2/2/1/1/2 | 2/2/2/2/2 | Formula needed sensitivity; added lower exit P/E and resulting ~27% EPS growth requirement. |
| scenarios | 2/2/1/1/2 | 2/2/2/2/2 | Scenarios versus sensitivity underdeveloped; added isolated multiple comparison and probability/position limits. |
| inflation | 2/2/1/2/2 | 2/2/2/2/2 | Base effects and price level missing; added index 100→110→112.2 and KPIF/CPI/PCE interpretation. |
| interest-rates | 2/2/1/2/2 | 2/2/2/2/2 | Yield curve and labour data superficial; added curve example, expectations/premia and BLS definition. |
| thesis | 2/1/1/1/2 | 2/2/2/2/2 | Motbevis needed a measurable review decision; added product-margin horizon and missing-data response. Own research process. |
| report | 2/2/1/2/2 | 2/2/2/2/2 | Historical/forecast timing needed a practical trap; added annual-versus-quarter EPS and observation/response/checkpoint split. |

## Four selected additions

All four score 2/2/2/2/2 against their stated foundational scope after review. Financial statements bridges the existing isolated metrics; EV/EBITDA separates enterprise and equity value; forward metrics separates facts, guidance and consensus; position sizing connects risk to a usable NTM workflow. ROIC/ROE and dedicated bond, index, guidance and macro sub-lessons were not added automatically.

## Finance and final reading pass

All 29 lessons have useful short answers, relevance, examples, depth, misconception and exercise. The 25 additions sit inside the advanced disclosure; they do not burden the default reading. A second pass checked the text as delivered in the generated lesson structure, including source labels and NTM destination meaning. New financial-statement example deliberately excludes tax and all other transactions. EPS example uses relevant profit and time-weighted shares; EV is explicitly a simplified bridge; EBITDA is not cash flow; fees distinguish the actual model from a subtraction approximation; ISK does not duplicate current rates; scenario probabilities and PEG remain assumptions/tumregler.

Numerical checks cover weighted GAV 85, FX −1%, drawdown recovery 100%, EPS weighted denominator 2.5m, gross margin 40%, EV 1,000/EBITDA 100 = 10, CFO 80/FCF 50, balance equation 130, CAGR 10%, reverse required EPS 6.05 and PEG 2. Other simple examples were recalculated in the editorial pass. No observed numerical contradiction remained.

Sources reviewed on 2026-09-15: Investor.gov stocks, ETF structure, fees and allocation; SEC financial statements and non-GAAP interpretations; IFRS IAS 33/IAS 7 summaries; Skatteverket ISK; Riksbanken inflation/monetary policy; BLS CPI and labour-force definitions; BEA CPI/PCE differences. Sources support relevant definitions, not every original hypothetical number or an endorsement of NTM. Regulatory frameworks can differ, and those differences are noted rather than presented as universal rules.

Residual limits: no full professional accounting course, exhaustive sector taxonomy, live forecast feed, individual tax assessment or demonstrated learner-outcome data. Scores should be revisited after real reader questions, not increased merely by word count. The build-time minimum-content check is a guard against accidental truncation; this editorial assessment provides the qualitative review.
