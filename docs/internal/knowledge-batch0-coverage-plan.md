# Knowledge Engine 100 — Editorial Cleanup Batch 0 and Coverage Plan

As of 2026-09-19. Planning and local audit only. Authoritative references: [implementation](knowledge100-report.md), [authoring](knowledge100-owner-review.md). No answer prose, source claims, review dates, approvals, public files, accounts or schema changed. No new wave, AI, commit, push or deployment.

## 1. Cleanup completed automatically

Reconciled the live catalog with the reported **17 mapping gaps, 16 unscheduled reviews and 8 restricted source URLs**. Created 41 individually classified records, an exact current-content snapshot and a deduplicated source-to-object checklist. There are **no safe category-1 catalog edits**: adding unsupported mappings or invented deadlines would change the meaning of the metadata. All 29 objects and their fingerprints are preserved; all 41 issues remain honestly open.

## 2. Owner editorial decisions required

Use [the owner checklist](knowledge-batch0-owner-checklist.md). Approve a review owner/cadence for each of 16 named objects; proposed defaults are 180 days for methodology/interpretation-heavy objects, 365 for stable concepts, both measured from actual review with earlier change triggers. These are proposed operating choices, not applied policy. Accept each claim mapping only after source passages establish support; approve any necessary correction separately with version/history. The original inherited approval state remains unchanged for all 29.

## 3. Source checks required

The checklist names all 17 object-specific evidence tasks and all 8 exact restricted URLs, including affected objects. The previous HEAD audit is historical evidence only. No new external research was performed, no 403 was treated as a broken link, and no successful response was treated as claim verification. GAV's fee source, estimates' analyst-recommendations source and broad beginner pages deserve specific scope checks rather than automatic whole-answer mappings. These are suspected evidence-scope gaps, not a finding that their prose is false.

## 4. Accepted limitations

Retain the documented bounded-answer, pe/1-only execution and static-host constraints. Independent editorial, learning and accessibility validation remain separate. Category 4 describes those existing boundaries; it does not assert new owner acceptance or excuse any of the 41 open records.

## 5. Current coverage map

29 answer objects / 25 registered concepts / 7 runtime categories. The following nine planning domains are a reporting view, not a runtime taxonomy change. Each current answer is assigned once for counting; its concept links may span domains. Cross-linked PEG is not a second P/E answer; margins and macro-releases remain single bundled objects.

| Planning domain | Current count | Existing IDs |
| --- | --- | --- |
| Investing basics | 0 | No dedicated answer; existing introductions are prerequisites |
| Stocks / funds / ETFs / indexes | 3 | `dilution`, `market-cap`, `dividends` |
| Financial statements / fundamentals | 6 | `eps`, `fcf`, `revenue`, `margins`, `debt`, `eps-comparison` |
| Valuation | 3 | `pe`, `peg`, `forward` |
| Returns / risk | 3 | `cagr`, `fx`, `diversification` |
| Macroeconomics | 4 | `inflation`, `interest-rates`, `bond-yields`, `macro-releases` |
| Earnings / estimates / guidance | 4 | `guidance`, `ttm`, `earnings`, `estimates` |
| Research / investment process | 1 | `thesis` |
| Saving / tax relevant to NTM tools | 5 | `gav`, `isk`, `fees`, `compounding`, `annual-fees` |

Current intents: definition 12; calculation 3; comparison 4; interpretation 2; limitation 0; misconception 2; process 2; application 4. Reuse these answers before drafting. Existing calculation examples do not imply executable templates.

## 6. Proposed ~100-object target map

**29 existing + 71 proposed = 100 total**, not 100 new. Proposal IDs are planning labels, not registered answers or promises of exact final count. If review finds a duplicate, enrich the existing object or remove the proposal; do not manufacture an answer to meet a quota. Existing 29 still require the inherited editorial review; 100 is a target of eventual reviewed objects, not current independent approvals.

| Domain | Existing | B1 | B2 | B3 | Later | Target |
| --- | --- | --- | --- | --- | --- | --- |
| Investing basics | 0 | 0 | 3 | 0 | 2 | 5 |
| Stocks / funds / ETFs / indexes | 3 | 0 | 6 | 0 | 2 | 11 |
| Financial statements / fundamentals | 6 | 8 | 0 | 1 | 3 | 18 |
| Valuation | 3 | 4 | 0 | 0 | 5 | 12 |
| Returns / risk | 3 | 0 | 7 | 0 | 2 | 12 |
| Macroeconomics | 4 | 0 | 0 | 8 | 0 | 12 |
| Earnings / estimates / guidance | 4 | 4 | 0 | 3 | 0 | 11 |
| Research / investment process | 1 | 4 | 0 | 4 | 0 | 9 |
| Saving / tax relevant to NTM tools | 5 | 0 | 4 | 0 | 1 | 10 |

### Reading the proposal matrix

P1 = direct existing-product gap or error-prevention; P2 = useful depth after prerequisites. Priority does not bypass evidence or duplicate review. Every row states concept, canonical question, one supported intent, rationale, candidate existing surfaces, required treatments, expected source type, temporal sensitivity and seed reuse. These are proposed consumers; no new links/help hooks were installed. All new concepts require owner-approved registry entries before draft validation. Formula examples remain prose unless the existing pe/1 contract is explicitly applicable.

| Surface | Existing page |
| --- | --- |
| Research | `research.html` |
| Public Research | `analys.html` |
| Academy | `academy.html` |
| Valuation | `aktievarderingskalkylator.html` |
| Returns | `avkastningskalkylator.html` |
| Savings | `sparmalskalkylator.html` |
| FIRE | `fire-kalkylator.html` |
| Compounding | `ranta-pa-ranta.html` |
| Fees | `avgifter.html` |
| Purchase | `aktiekopskalkylator.html` |
| Leverage | `havstang.html` |
| ISK | `isk-skattkalkylator.html` |
| Macro | `makro.html` |

### Source-type key (research directions, not verified sources)

| Key | Evidence expected |
| --- | --- |
| ACCOUNTING | Primary accounting standards (IFRS/IAS or relevant US GAAP), audited report and notes; identify jurisdiction and reporting basis. |
| NON_GAAP | Regulator guidance plus issuer reconciliation and stated definition; generic glossary alone is insufficient. |
| VALUATION | Regulator/exchange investor education and documented valuation methodology; independently check worked arithmetic and conventions. |
| NTM_METHOD | Existing NTM workflow/specification as primary evidence for product behavior; identify NTM editorial method explicitly. External investing evidence only where broader claims are made. |
| ESTIMATES | Issuer releases and the actual estimate provider methodology, timestamp and coverage definition; no provider integration or data acquisition is implied. |
| REGULATOR | Primary investor education from a securities regulator, with market/jurisdiction scope. Product-specific claims require current product documents. |
| MATH_METHOD | Explicit mathematical derivation plus independently recalculated synthetic examples; primary methodological reference for interpretation. |
| RISK_METHOD | Primary regulator risk material plus a documented risk-methodology reference; no universal risk threshold. |
| NTM_MATH | Existing calculator source/method contract plus independent arithmetic; distinguish implementation convention from universal investing fact. |
| SE_TAX | Skatteverket primary rules and the existing dated NTM rule registry; verify income year, jurisdiction and review deadline. No copied timeless allowance. |
| FUND_DOCS | Regulator fund education plus applicable prospectus/KID and dealing rules; avoid generalizing one product to all funds. |
| INDEX_METHOD | Index administrator methodology and change history; distinguish the general concept from one index implementation. |
| MACRO_STATS | BLS/BEA or relevant national statistical office methodology and revision notes; specify geography, units, adjustment and vintage. |
| CENTRAL_BANK | Central bank primary methodological/explanatory publications; do not infer a deterministic price reaction. |
| ISSUER | Dated primary issuer releases/reconciliations and comparative prior release; a company example is not universal policy. |
| RETURN_METHOD | Primary performance-measurement methodology plus transparent cash-flow/withdrawal examples; identify the tool boundary. |
| EXCHANGE | Primary exchange/regulator order-execution documentation; specify market and product scope. |

### Multi-intent priorities and duplication boundaries

- **P/E:** retain definition and trailing/forward comparison; add interpretation, denominator limitation and P/E–P/S comparison. Never answer “buy?” through an alias. Existing pe/1 already serves simple calculation; do not create a redundant calculation object.
- **EPS:** retain definition and cross-site comparison; narrower reported/adjusted comparison must teach a distinct basis, not restate eps-comparison.
- **FCF:** retain definition; add definition-comparability limitation. Profit-versus-cash and working-capital interpretation are separate questions.
- **Margins:** retain the three-margin comparison; proposed gross-margin calculation must have a distinct worked-input objective. Do not split every paragraph into a new answer.
- **Outlook / TTM:** retain guidance, consensus and TTM definitions; add comparison, construction, revision/age process and dispersion interpretation.
- **Return / CAGR / compounding / fees:** reuse current calculation/comparison/application answers; add real-return, cash-flow and loss limitations only where the user question differs.
- **Thesis:** retain overview; add field-level processes, falsification application and scenario misconception. Explain NTM methodology as a method, not universal investing truth.
- **Macro:** retain the bundled release overview; comparison, revision process and causality limitation are distinct intents. Avoid duplicate CPI/PCE/payroll/BNP dictionary pages.
- **ISK:** retain base process; proposed input application and income-year limitation depend on the same rule registry. Do not produce standalone current-year tax-number answers.
- **New fund/ETF/index and EV concepts:** establish the definition before comparisons. Review fund-etf versus etf, EV definition versus EV–market-cap, and price-value versus market-cap for overlap. Collapse proposals if their teaching objective is already fully satisfied.

## 7. Batch 1 recommendation — Research and valuation foundations

20 objects; cumulative target 49. First resolve evidence/cadence for reused seed dependencies. Author in micro-groups: statements/FCF; EPS/P-S/P-E basis; outlook/TTM; Research method. Define ps before pe-versus-ps. Keep reported-adjusted and fcf-limitations only if they add a distinct user task.

| ID / concept | Canonical question / intent / priority | Why / consumers | Treatment / source / sensitivity | Reuse seed IDs |
| --- | --- | --- | --- | --- |
| `balance-sheet` / `new:balance-sheet` | Vad visar en balansräkning? — definition; P1 | Explain stock-versus-flow inputs — Research, Academy | example, limitation / ACCOUNTING / stable;method updates | debt, revenue |
| `income-statement` / `new:income-statement` | Vad visar en resultaträkning? — definition; P1 | Orient report reading before valuation — Research, Academy | example, limitation / ACCOUNTING / stable;method updates | revenue, margins, eps |
| `cash-flow-statement` / `new:cash-flow-statement` | Vad visar en kassaflödesanalys? — definition; P1 | Explain cash source before FCF use — Research, Academy | example, limitation / ACCOUNTING / stable;method updates | fcf |
| `profit-versus-cash` / `new:cash-flow-statement` | Varför kan vinst och kassaflöde skilja sig? — comparison; P1 | Stop interchangeable metric inputs — Research, Public Research | comparison, example, limitation / ACCOUNTING / stable;method updates | revenue, fcf |
| `capex` / `new:capex` | Vad betyder CapEx? — definition; P1 | Explain FCF investment input — Research, Academy | example, limitation / ACCOUNTING / stable;method updates | fcf |
| `working-capital` / `new:working-capital` | Hur kan rörelsekapital påverka kassaflödet? — interpretation; P1 | Explain cash conversion changes — Research, Public Research | example, limitation / ACCOUNTING / stable;method updates | fcf, revenue |
| `reported-adjusted` / `eps` | Vad skiljer rapporterad från justerad vinst? — comparison; P1 | Compare basis before entering EPS — Research, Valuation, Academy | comparison, example, limitation / NON_GAAP / stable;issuer definitions vary | eps, eps-comparison |
| `fcf-limitations` / `fcf` | När blir en jämförelse av fritt kassaflöde missvisande? — limitation; P1 | Surface incompatible FCF definitions — Research, Public Research | example, limitation / NON_GAAP / stable;issuer definitions vary | fcf |
| `pe-interpretation` / `pe` | Vad behöver jag kontrollera innan jag tolkar ett P/E-tal? — interpretation; P1 | Answer bounded interpretation gap without price verdict — Valuation, Research | example, limitation / VALUATION / stable;assumptions dated | pe, forward, debt |
| `pe-losses` / `pe` | Varför är P/E svårt att använda vid negativ eller nära noll vinst? — limitation; P1 | Explain unsuitable denominator separately — Valuation, Research | example, limitation / VALUATION / stable | pe, eps |
| `ps` / `new:ps` | Vad betyder P/S? — definition; P1 | Prepare the missing sales-multiple comparison — Valuation, Research | formula example, limitation / VALUATION / stable | revenue, market-cap |
| `pe-versus-ps` / `pe` | Vad skiljer P/E från P/S? — comparison; P1 | Close explicit comparison abstention gap — Valuation, Research | comparison, example, limitation / VALUATION / stable | pe, revenue |
| `fact-assumption` / `thesis` | Hur skiljer jag fakta från antaganden i en investeringstes? — process; P1 | Improve provenance of authored reports — Research, Public Research | example, limitation / NTM_METHOD / stable;workflow changes | thesis |
| `scenario-design` / `thesis` | Hur bygger jag jämförbara bear-, base- och bull-scenarier? — process; P1 | Make existing scenario fields inspectable — Research, Valuation | example, limitation / NTM_METHOD / stable;assumptions dated | thesis, forward |
| `falsification` / `thesis` | Hur formulerar jag ett motbevis som går att följa upp? — application; P1 | Make existing invalidation fields useful — Research, Public Research | example, limitation / NTM_METHOD / stable;workflow changes | thesis |
| `source-provenance` / `thesis` | Vilka källuppgifter behöver jag spara för ett analysantagande? — process; P1 | Improve source/date/period consistency — Research, Public Research | example, limitation / NTM_METHOD / stable;workflow changes | thesis, eps-comparison |
| `guidance-consensus` / `outlook` | Vad skiljer bolagets guidance från analytikerkonsensus? — comparison; P1 | Prevent forecast provenance confusion — Research, Public Research | comparison, example, limitation / ESTIMATES / stable;method definitions vary | guidance, estimates |
| `earnings-surprise` / `earnings` | Hur jämför jag rapporterat utfall med ett daterat estimat? — calculation; P1 | Explain same-basis surprise comparison — Research, Academy | formula example, limitation / ESTIMATES / stable;input dates required | earnings, estimates, eps-comparison |
| `ttm-construction` / `ttm` | Hur bygger jag TTM utan att dubbelräkna ackumulerade kvartal? — calculation; P1 | Prevent manual period input errors — Research, Valuation | formula example, limitation / ACCOUNTING / stable;fiscal period scope | ttm, eps |
| `estimate-age` / `outlook` | Hur bedömer jag om ett estimat är för gammalt för min jämförelse? — process; P1 | Explain dated source revisions — Research, Public Research | example, limitation / ESTIMATES / time-sensitive inputs;stable method | estimates, guidance |

## 8. Batch 2 recommendation — tool inputs, returns and fund basics

20 objects; cumulative target 69. Use current tools as the test context. Define fund, ETF and index before comparisons; define drawdown before loss-recovery. ISK input content remains blocked on current primary-rule verification and owner review.

| ID / concept | Canonical question / intent / priority | Why / consumers | Treatment / source / sensitivity | Reuse seed IDs |
| --- | --- | --- | --- | --- |
| `nominal-real` / `return` | Vad skiljer nominell från real avkastning? — comparison; P1 | Explain purchasing power in savings scenarios — Returns, Savings, FIRE | comparison, formula example, limitation / REGULATOR / stable | cagr, inflation |
| `arithmetic-geometric` / `cagr` | Varför skiljer sig medelavkastning från CAGR? — comparison; P1 | Prevent average-rate misuse — Returns, Compounding, Academy | comparison, formula example, limitation / MATH_METHOD / stable | cagr, compounding |
| `drawdown` / `new:drawdown` | Vad betyder drawdown? — definition; P1 | Explain loss path alongside return — Research, Academy | formula example, limitation / RISK_METHOD / stable | cagr, diversification |
| `loss-recovery` / `new:drawdown` | Hur stor uppgång krävs för att återhämta en procentuell förlust? — calculation; P1 | Make leverage downside understandable — Leverage, Returns | formula example, limitation / MATH_METHOD / stable | compounding |
| `volatility-risk` / `new:volatility` | Är volatilitet samma sak som risken att förlora pengar permanent? — comparison; P1 | Avoid a single risk proxy — Research, Academy | comparison, example, limitation / RISK_METHOD / stable | diversification, thesis |
| `concentration` / `diversification` | Hur bedömer jag koncentration utöver antalet innehav? — application; P1 | Extend existing diversification to inspection — Research, Purchase | example, limitation / REGULATOR / stable | diversification |
| `leverage-downside` / `new:leverage` | Hur förstärker hävstång både vinst och förlust? — calculation; P1 | Canonical explanation for existing leverage tool — Leverage, Academy | formula example, limitation / REGULATOR / stable;financing terms vary | compounding, diversification |
| `contribution-timing` / `compounding` | Varför spelar insättningarnas tidpunkt roll i en sparkalkyl? — application; P1 | Explain existing monthly contribution convention — Compounding, Savings | formula example, limitation / NTM_MATH / stable;tool convention | compounding, cagr |
| `fee-double-count` / `fees` | Hur undviker jag att dra av samma avgift två gånger? — misconception; P1 | Prevent net/gross assumption errors — Fees, Compounding | example, limitation / REGULATOR / stable;product definitions vary | annual-fees, fees |
| `savings-target` / `compounding` | Hur tolkar jag tiden till ett sparmål när avkastningen är ett antagande? — interpretation; P1 | Keep existing goal results conditional — Savings, FIRE | example, limitation / NTM_MATH / stable;assumptions dated | compounding |
| `isk-inputs` / `isk` | Vilka värden och insättningar behöver jag för ISK-kalkylatorn? — application; P1 | Help existing tax input workflow — ISK | example, limitation / SE_TAX / time-sensitive;SE income year and registry | isk |
| `asset-ownership` / `shares` | Vad innebär det att äga en aktie? — definition; P1 | Foundation before per-share metrics — Academy, Research | example, limitation / REGULATOR / stable;jurisdiction caveats | dilution, dividends |
| `risk-horizon` / `new:time-horizon` | Varför behöver tidshorisonten vara tydlig innan jag väljer risk? — application; P1 | Clarify scenario assumptions without advice — Academy, Savings, Research | example, limitation / REGULATOR / stable | diversification, thesis |
| `liquidity` / `new:liquidity` | Vad betyder likviditet för en investering? — definition; P1 | Explain exit and cash-need constraints — Academy, Research | example, limitation / REGULATOR / stable | diversification |
| `fund` / `new:fund` | Vad är en fond? — definition; P1 | Basic object missing beside fee tools — Academy, Fees | example, limitation / FUND_DOCS / stable;product terms vary | annual-fees, diversification |
| `etf` / `new:etf` | Vad är en ETF? — definition; P1 | Explain exchange-traded fund context — Academy, Fees, Purchase | example, limitation / FUND_DOCS / stable;product terms vary | fees, diversification |
| `index` / `new:index` | Vad är ett aktieindex? — definition; P1 | Explain benchmark and macro context — Academy, Macro | example, limitation / INDEX_METHOD / stable;method updates | market-cap |
| `active-passive` / `new:fund` | Vad skiljer aktiv från passiv fondförvaltning? — comparison; P2 | Context for fee comparison without ranking — Academy, Fees | comparison, example, limitation / FUND_DOCS / stable;mandates vary | annual-fees |
| `fund-etf` / `new:etf` | Vad skiljer handel i en ETF från handel i en traditionell fond? — comparison; P2 | Explain costs and execution differences — Academy, Purchase, Fees | comparison, example, limitation / FUND_DOCS / stable;market and fund terms vary | fees |
| `fund-overlap` / `diversification` | Hur upptäcker jag överlapp mellan fondinnehav? — process; P2 | Turn diversification caveat into procedure — Academy, Research | example, limitation / FUND_DOCS / time-sensitive holdings;stable method | diversification |

## 9. Batch 3 recommendation — Macro and review/version literacy

16 objects; cumulative target 85. Resolve both BLS access tasks before Macro authoring. Sequence CPI/PCE and units before revision/causal limitations. Validate product-version explanations against the existing report contract, not assumptions about future features.

| ID / concept | Canonical question / intent / priority | Why / consumers | Treatment / source / sensitivity | Reuse seed IDs |
| --- | --- | --- | --- | --- |
| `cpi-pce` / `macro` | Vad skiljer CPI från PCE:s prisindex? — comparison; P1 | Close explicit Macro comparison gap — Macro, Academy | comparison, example, limitation / MACRO_STATS / stable;US methodology changes | macro-releases, inflation |
| `headline-core` / `inflation` | Vad skiljer total inflation från kärninflation? — comparison; P1 | Explain release filters — Macro, Academy | comparison, example, limitation / MACRO_STATS / stable;measure and country scope | macro-releases, inflation |
| `mom-yoy` / `macro` | Vad skiljer månadsförändring från årsförändring? — comparison; P1 | Prevent unit confusion in release cards — Macro, Academy | comparison, formula example, limitation / MACRO_STATS / stable | macro-releases |
| `seasonal-adjustment` / `macro` | Vad betyder säsongsjusterat i ett makrosläpp? — definition; P2 | Explain observed release basis — Macro | example, limitation / MACRO_STATS / stable;method revisions | macro-releases |
| `macro-revisions` / `macro` | Hur läser jag reviderade makrovärden utan att blanda versioner? — process; P1 | Explain previous value and vintage — Macro, Research | example, limitation / MACRO_STATS / time-sensitive vintages;stable method | macro-releases |
| `jobs-unemployment` / `macro` | Varför kan payrolls och arbetslöshet ge olika bilder? — comparison; P2 | Distinguish surveys in existing calendar — Macro, Academy | comparison, example, limitation / MACRO_STATS / stable;US survey definitions | macro-releases |
| `real-nominal-gdp` / `macro` | Vad skiljer real från nominell BNP? — comparison; P2 | Explain existing GDP series — Macro, Academy | comparison, example, limitation / MACRO_STATS / stable;country and annualization scope | macro-releases, inflation |
| `macro-no-forecast` / `macro` | Varför ger ett makroutfall ingen säker riktning för börsen? — limitation; P1 | Prevent causal verdict from calendar outcome — Macro, Research | example, limitation / CENTRAL_BANK / stable;no current-market claim | macro-releases, interest-rates |
| `estimate-dispersion` / `outlook` | Vad säger spridningen mellan analytikerestimat? — interpretation; P2 | Improve context beyond a single consensus — Research, Public Research | example, limitation / ESTIMATES / time-sensitive inputs;stable method | estimates |
| `guidance-revision` / `outlook` | Hur jämför jag två versioner av bolagets guidance? — process; P1 | Explain tracked outlook changes — Research, Public Research | comparison, example, limitation / ISSUER / time-sensitive releases;stable method | guidance, estimates |
| `fiscal-calendar` / `ttm` | Vad skiljer räkenskapsår från kalenderår i en rapport? — comparison; P2 | Prevent mismatched forecast periods — Research, Valuation | comparison, example, limitation / ACCOUNTING / stable;issuer calendars vary | ttm, forward |
| `update-thesis` / `thesis` | Hur uppdaterar jag en tes utan att skriva om dess historik? — process; P1 | Support existing review/version workflow — Research, Public Research | example, limitation / NTM_METHOD / stable;workflow version | thesis |
| `scenario-probability` / `thesis` | Är ett bear-, base- eller bull-scenario en sannolikhetsprognos? — misconception; P1 | Prevent false certainty in published ranges — Research, Valuation, Public Research | example, limitation / NTM_METHOD / stable | thesis, forward |
| `valuation-sensitivity` / `thesis` | Hur undersöker jag vilket antagande som driver min värdering? — application; P1 | Use existing scenario controls deliberately — Valuation, Research | example, limitation / VALUATION / stable;input assumptions dated | pe, forward, thesis |
| `report-snapshot` / `thesis` | Vad betyder datum och version när jag läser en publicerad NTM-analys? — application; P1 | Explain frozen report scope and provenance — Public Research, Research | example, limitation / NTM_METHOD / time-sensitive product contract | thesis |
| `revenue-growth` / `revenue` | Hur skiljer jag organisk tillväxt från förvärv och valuta? — interpretation; P2 | Explain growth bridge instead of headline — Research, Public Research | example, limitation / ISSUER / stable;issuer reconciliation varies | revenue, fx |

## 10. Later coverage — focused depth after the first three batches

15 objects; cumulative target 100. Depends on earlier fund/index, statement, P/S and risk coverage. Complete EV before EV comparisons/limitations. Reconsider these priorities after owner walkthroughs of Batches 1–3; do not collect raw questions to choose topics. The P1 ISK year-boundary item can move earlier by swapping a slot if owner review identifies an immediate need.

| ID / concept | Canonical question / intent / priority | Why / consumers | Treatment / source / sensitivity | Reuse seed IDs |
| --- | --- | --- | --- | --- |
| `ebit-ebitda` / `new:ebitda` | Vad skiljer EBIT från EBITDA? — comparison; P2 | Support debt and margin reading — Research, Academy | comparison, example, limitation / NON_GAAP / stable;definitions vary | margins, debt, fcf |
| `gross-margin` / `margins` | Hur räknar jag bruttomarginal på jämförbara intäkter och kostnader? — calculation; P2 | Separate calculation from three-margin overview — Research, Academy | formula example, limitation / ACCOUNTING / stable;classification varies | margins, revenue |
| `debt-maturity` / `debt` | Varför kan skuldförfall vara viktigare än nettoskuldens storlek? — interpretation; P2 | Deepen existing debt risk explanation — Research, Public Research | example, limitation / ACCOUNTING / time-sensitive debt schedule;stable method | debt |
| `enterprise-value` / `new:enterprise-value` | Vad betyder enterprise value? — definition; P2 | Clarify equity versus business value — Research, Valuation, Academy | formula example, limitation / VALUATION / stable;conventions vary | market-cap, debt |
| `ev-market-cap` / `new:enterprise-value` | Vad skiljer enterprise value från börsvärde? — comparison; P2 | Prevent numerator mismatch — Research, Academy | comparison, example, limitation / VALUATION / stable | market-cap, debt |
| `ev-ebitda-limits` / `new:enterprise-value` | Vilka begränsningar har EV/EBITDA? — limitation; P2 | Avoid cash-flow or universal-value inference — Research, Academy | example, limitation / VALUATION / stable;sector and definition scope | debt, fcf |
| `peg-limitations` / `peg` | När blir PEG missvisande? — limitation; P2 | Separate denominator and duration caveats — Valuation, Research | example, limitation / VALUATION / stable;forecast basis dated | peg, forward |
| `discounting` / `new:discounting` | Varför påverkar avkastningskravet ett framtida belopps nuvärde? — interpretation; P2 | Explain existing rate-sensitivity concept — Valuation, Research, Macro | formula example, limitation / VALUATION / stable;assumptions dated | bond-yields, interest-rates |
| `cashflow-return` / `return` | Varför räcker inte CAGR när jag sätter in eller tar ut pengar? — limitation; P2 | Explain existing return-tool boundary — Returns, FIRE | example, limitation / RETURN_METHOD / stable | cagr, compounding |
| `sequence-risk` / `return` | Varför spelar avkastningens ordning roll när jag gör uttag? — interpretation; P2 | Improve existing FIRE withdrawal understanding — FIRE, Returns | example, limitation / RETURN_METHOD / stable;model assumptions | cagr, compounding |
| `price-value` / `market-cap` | Är en aktie med låg kurs automatiskt billig? — misconception; P2 | Prevent per-share price anchoring — Academy, Purchase, Valuation | example, limitation / REGULATOR / stable | market-cap, pe |
| `order-spread` / `new:spread` | Vad är köp- och säljspread? — definition; P2 | Explain cost omitted from commission label — Purchase, Fees, Academy | example, limitation / EXCHANGE / stable;market mechanics vary | fees |
| `split-dilution` / `shares` | Vad skiljer en aktiesplit från utspädning? — comparison; P2 | Explain GAV/share-count events — Purchase, Research, Academy | comparison, formula example, limitation / REGULATOR / stable;event terms vary | dilution, gav |
| `index-weighting` / `new:index` | Vad betyder det att ett index är börsvärdesviktat? — definition; P2 | Explain concentration in index exposure — Academy, Macro | example, limitation / INDEX_METHOD / stable;index rules vary | market-cap, diversification |
| `isk-year-scope` / `isk` | Varför måste inkomståret anges i en ISK-beräkning? — limitation; P1 | Avoid using a current parameter for another year — ISK, Academy | example, limitation / SE_TAX / time-sensitive;SE income year and registry | isk |

## 11. Exact authoring workflow for Batch 1

1. Owner accepts/reorders the 20 **questions and scope**, not answers. Resolve the relevant Batch 0 evidence/scheduling items first (especially revenue, debt, estimates, guidance, ttm, eps-comparison and restricted FCF/statement sources). Assign a reviewer; no existing inherited date counts as fresh approval.
2. Compare each proposal with its seed reuse list and the duplicate report. Start with balance-sheet, income-statement and cash-flow-statement; add approved concept records to scale.cjs first. These registry entries describe vocabulary, not answer claims. Preserve IDs/URLs of existing answers.
3. Create one unpublished draft at a time. The commands below are **future instructions, not executed by Batch 0**. Use definition for balance-sheet/income-statement/cash-flow-statement/capex/ps; comparison for profit-versus-cash/reported-adjusted/pe-versus-ps/guidance-consensus; interpretation for working-capital/pe-interpretation. For limitation/process/application drafts use the closest template, set the requested intent and remove irrelevant copied sections. For earnings-surprise and ttm-construction start with a definition template, set calculation intent, and put the worked formula in prose; do not copy pe/1 into an unsupported executable formula.

~~~text
node scripts/knowledge_editorial.cjs template definition balance-sheet docs/internal/knowledge/answers/balance-sheet.json
node scripts/knowledge_editorial.cjs validate
node scripts/knowledge_editorial.cjs preview docs/internal/knowledge/answers/balance-sheet.json docs/internal/knowledge/balance-sheet-preview.html
node scripts/knowledge_editorial.cjs report
~~~

4. Replace every copied template field: question, prose, example, caveats, aliases, conceptRefs, related links, source claims, scope, review policy and any copied deadline. Keep status draft and approval pending; reviewedAt remains null. Remove irrelevant template formula/comparison/interpretation, practice and rule metadata. The same-source/intent validator must pass; the local preview stays under docs, never public staging. No drafts were created by this planning task.
5. Research primary evidence. For each short/full/caveat section record the specific passage, source date/version, what was checked, limitations, supports and checked evidence status only after actual verification. Independently recalculate all examples and units, distinguish fiscal/annual/TTM/forward periods, and include unsuitable cases. NTM-process claims cite the actual product contract; external sources must not be portrayed as endorsing NTM.
6. Owner independently reviews the draft and preview. Record real reviewer/date, accepted editorial state and matching reviewedAt only after acceptance. Approve reviewDue/risk/overdue behavior. If not accepted, leave draft/pending. New sensitive content needs jurisdiction/period/registry and deadline. Existing source-mapping changes alter the fingerprint: use a version increment and explicit history reason/reviewer/date; never reset the baseline to hide a change.
7. Only after approval choose reviewed (visible noindex) or published (actual publication date). Add curated aliases/relations and proposed context hooks where appropriate; a consumer listed in this plan is not an integration already implemented. Existing context mechanics can be reused; a genuinely new UI hook or executable formula needs its own engineering checks. Register only accepted new IDs, then audit/generate/check:

~~~text
node scripts/knowledge_editorial.cjs validate
node scripts/knowledge_history.cjs --record-new
node scripts/knowledge_history.cjs
node scripts/build_seo.cjs
node scripts/build_seo.cjs --check
node scripts/knowledge_benchmark.cjs
node --test tests/knowledge.test.cjs tests/knowledge100.test.cjs tests/wave1.test.cjs
python -B scripts/validate_release.py
~~~

Use the installed Node executable (or set NODE_BINARY for Python) if node is not in PATH; configure the existing local PGlite module for the complete database gates. Add labeled retrieval fixtures for accepted questions, aliases, ambiguity, unsuitable cases and nearby requests that must still abstain. Review exact-match preservation and ensure that unsupported personalized advice never becomes a definition fallback.
8. Inspect generated diffs and draft exclusion, run the existing Knowledge/mobile and affected Wave browser regressions, inspect direct pages/no-JS/source depth and context behavior. Perform independent editorial/comprehension/accessibility review. Document evidence before any separately authorized release. Commit/push/deploy are not authorized by this workflow or task.

## 12. Validation results

The generator checks 29 existing unique objects; exactly 17/16/8 issue counts; 41 unique issue records; 71 unique proposal IDs/questions; no collision with current IDs/questions; valid existing intent/concept/reuse references; all named consumer pages exist; primary-domain totals reconcile; batches 20/20/16/15 and target 100. The audit stores unchanged content fingerprints and approval/review metadata. See [validation.json](../qa/knowledge-batch0/validation.json) for the current run, including catalog/history, generated SEO and retrieval checks. This is structural/editorial planning validation, not source verification or owner acceptance. No full browser rerun is required for documentation-only output; previous implementation browser evidence remains historical, not a new Batch 0 test claim.
