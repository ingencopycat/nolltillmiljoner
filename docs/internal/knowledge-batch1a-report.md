# Knowledge Content Batch 1A — Financial Statements & Cash

Review date: 2026-09-19. Explicit substantive owner approval was supplied in the task. Codex performed primary-source mapping, synthetic arithmetic, schema integration and engineering verification. This is not a claim of independent human source review. Local only: no commit, push, deployment, owner-account access or schema work.

## 1. Six objects created

| ID | Question | Intent / state |
| --- | --- | --- |
| `balance-sheet` | Vad visar en balansräkning? | definition / reviewed (noindex) |
| `income-statement` | Vad visar en resultaträkning? | definition / reviewed (noindex) |
| `cash-flow-statement` | Vad visar en kassaflödesanalys? | definition / reviewed (noindex) |
| `profit-versus-cash` | Varför kan vinst och kassaflöde skilja sig? | comparison / reviewed (noindex) |
| `capex` | Vad betyder CapEx? | definition / reviewed (noindex) |
| `working-capital` | Hur kan rörelsekapital påverka kassaflödet? | interpretation / reviewed (noindex) |

Canonical source: `docs/internal/knowledge/answers/*.json`. Six drafts were validated while the public projection still contained 29 answers; [draft-validation.json](../qa/knowledge-batch1a/draft-validation.json) records that boundary. The drafts were then explicitly accepted under the supplied owner authorization, initial fingerprints recorded and public artifacts generated. Draft previews remain internal QA, not staged content.

## 2. Concepts registered/reused

Five registered concepts: balance-sheet, income-statement, cash-flow-statement, capex, working-capital. Profit-versus-cash reuses income-statement and cash-flow-statement as a comparison. Existing debt/revenue/EPS/FCF/margins remain canonical related answers and Academy concepts; none was replaced or re-reviewed. Registered concepts: 25 → 30.

## 3. Exact source mappings

Each source has primary authority, type, checked evidence status, actual check date, section supports, precise checked scope and explicit limits. Below is the full canonical mapping; [source-mappings.json](../qa/knowledge-batch1a/source-mappings.json) also indexes each section separately. Source titles/locations support the stated scope, not every claim indiscriminately. All examples are NTM synthetic illustrations rather than historical issuer facts.

### balance-sheet

| Primary source | Supported sections | Passage / check | Evidence limit |
| --- | --- | --- | --- |
| [SEC: Beginners’ Guide to Financial Statements](https://www.sec.gov/about/reports-publications/investorpubsbegfinstmtguide) | shortAnswer, fullAnswer, example, caveats | Avsnitten Balance Sheets, Cash Flow Statements och Bringing It All Together: balansidentitet, datum kontra period och rapporternas samband. NTM:s 1 000 = 600 + 400 har räknats separat. | Grundläggande investerarvägledning från 2007, inte fullständig redovisningsstandard. Kassans storlek ges ingen universell kvalitetsbedömning; exemplet är syntetiskt. |

### income-statement

| Primary source | Supported sections | Passage / check | Evidence limit |
| --- | --- | --- | --- |
| [SEC: Beginners’ Guide to Financial Statements](https://www.sec.gov/about/reports-publications/investorpubsbegfinstmtguide) | shortAnswer, fullAnswer, example | Income Statements och Cash Flow Statements: intäkter, kostnader, delresultat samt skillnaden mellan resultat och betalningar. Det syntetiska 1 000 − 800 = 200 har kontrollerats separat. | SEC:s förenklade EPS-beskrivning används inte som exakt aktiebas; IAS 33 stöder den preciseringen. |
| [IFRS Foundation: IAS 33 Earnings per Share](https://www.ifrs.org/issued-standards/list-of-standards/ias-33-earnings-per-share/) | shortAnswer, fullAnswer, caveats | About: EPS-resultat hänförligt till stamaktieägare, grundläggande/utspädd EPS och periodens vägda aktiebas. | Översikt, inte en komplett EPS-beräkning eller en ny exekverbar formel. |
| [IFRS Foundation: IFRS 18, tillämpning och presentation](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-18-presentation-and-disclosure-in-financial-statements/) | caveats | About: IFRS 18 ändrar presentation och definierade delsummeringar; tillämpning från perioder som börjar 2027-01-01, tidigare tillämpning tillåten. | Stöder behovet att kontrollera regelverk och tillämpning, inte att US GAAP och IFRS är identiska. |

### cash-flow-statement

| Primary source | Supported sections | Passage / check | Evidence limit |
| --- | --- | --- | --- |
| [IFRS Foundation: IAS 7, översikt och standardhistorik](https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows/) | shortAnswer, fullAnswer, example, caveats | About: kassa/likvida medel, tre verksamhetskategorier, indirekt metod, transaktioner utan betalning och avstämning mot finansiell ställning. Standard history beskriver ändrad startpunkt och klassificering genom IFRS 18. | Översikten ersätter inte fullständig IAS 7 eller US GAAP. +70 är NTM:s separat kontrollerade illustration under uttryckliga antaganden. |
| [SEC: Beginners’ Guide to Financial Statements](https://www.sec.gov/about/reports-publications/investorpubsbegfinstmtguide) | fullAnswer, caveats | Cash Flow Statements, Operating/Investing/Financing Activities: grundmekanismer och en amerikansk introduktion med nettoresultatavstämning. | Inte grund för att likställa all klassificering mellan regelverk eller att bedöma en aktie. |
| [IFRS Foundation: IFRS 18, tillämpning och presentation](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-18-presentation-and-disclosure-in-financial-statements/) | caveats | About: tillämpningsdatum och tidigare tillämpning; läs tillsammans med IAS 7:s standardhistorik. | Ingen aktuell rapport antas ha valt en viss version utan kontroll. |

### profit-versus-cash

| Primary source | Supported sections | Passage / check | Evidence limit |
| --- | --- | --- | --- |
| [SEC: Beginners’ Guide to Financial Statements](https://www.sec.gov/about/reports-publications/investorpubsbegfinstmtguide) | shortAnswer, fullAnswer, caveats, comparison | Income Statements (avskrivningar), Operating Activities (icke-kontanta poster) och Investing Activities (maskinköp): separata resultat- och betalningsmått. Bringing It All Together stöder läsning av rapporterna tillsammans. | Ingen kausal diagnos av ett enskilt bolag. Den neutrala Research-frågan är NTM:s godkända pedagogiska tillämpning. |
| [IFRS Foundation: IAS 7, översikt och standardhistorik](https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows/) | fullAnswer, example, caveats, comparison | About: indirekt justering för icke-kontanta poster och periodiseringar; investeringarnas betalningar skiljs från löpande verksamhet. | De tre fallen är syntetiska mekanismer, inte nya bolagsfakta. |
| [IFRS Foundation: IAS 16 Property, Plant and Equipment](https://www.ifrs.org/issued-standards/list-of-standards/ias-16-property-plant-and-equipment/) | fullAnswer, example | About: redovisning av materiella långlivade tillgångar och avskrivningskostnader. | Avser redovisningsprincipen; inga påståenden om en specifik avskrivningstid. |

### capex

| Primary source | Supported sections | Passage / check | Evidence limit |
| --- | --- | --- | --- |
| [IFRS Foundation: IAS 16 Property, Plant and Equipment](https://www.ifrs.org/issued-standards/list-of-standards/ias-16-property-plant-and-equipment/) | shortAnswer, fullAnswer | About: PP&E är materiella tillgångar som används i verksamheten under mer än en period; redovisat värde och avskrivning behandlas separat. | Ingen universell bolagsspecifik CapEx-avgränsning härleds ur rubriken PP&E. |
| [IFRS Foundation: IAS 7, översikt och standardhistorik](https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows/) | fullAnswer, example, caveats | About: förvärv av långlivade tillgångar som investeringar; affärer utan betalning skiljs från kassaflöden. | 180 är ett syntetiskt kontantköp; PP&E-förändring antas inte vara samma mått. |
| [IFRS Foundation: CMAC november 2024, återgivna IAS 7 punkter 50–51](https://www.ifrs.org/content/dam/ifrs/meetings/2024/november/cmac/ap5-scfrm.pdf) | shortAnswer, fullAnswer, example | CMAC 2024-11-08, bild 7 samt appendix bild 15: uppdelning tillväxt/underhåll och återgivna IAS 7 punkter 50–51 om ökad respektive bibehållen kapacitet. | Ett offentligt staff paper, inte ett nytt normbeslut. Endast återgivna krav och försiktigt beskriven analytisk uppdelning används; hög/låg CapEx ges inget generellt betyg. |
| [SEC: Non-GAAP Financial Measures, fråga 102.07](https://www.sec.gov/rules-regulations/staff-guidance/corporation-finance-interpretations/non-gaap-financial-measures) | caveats | Fråga 102.07: vanlig CFO-minus-CapEx-beräkning, avsaknad av enhetlig definition, behov av förklaring/avstämning och begränsning om disponibla pengar. | Amerikansk SEC-vägledning; inte en universell FCF-standard eller utdelningsregel. |

### working-capital

| Primary source | Supported sections | Passage / check | Evidence limit |
| --- | --- | --- | --- |
| [IFRS Foundation: IAS 7, översikt och standardhistorik](https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows/) | shortAnswer, fullAnswer, example | About: indirekt metod justerar resultat för periodiseringar av operativa betalningar och icke-kontanta poster. Tecknen i den förenklade betalningsavstämningen och 65 har kontrollerats separat. | Inte en allmän formel från nettoresultat till OCF i alla regelverk; bara de tre angivna posterna ingår i exemplet. |
| [IFRS Foundation: IASB september 2025, rörelsekapital och avstämning](https://www.ifrs.org/content/dam/ifrs/meetings/2025/september/iasb/ap20a-approach-to-disaggregation.pdf) | fullAnswer, caveats | IASB staff paper september 2025, punkter 26–30: typiska operativa fordringar, lager och skulder; kopplingen till balansräkningens poster kan vara oklar. Punkt 30 hänvisar till IAS 7.20. | Staff analysis, inte ett nytt standardkrav. Stöder försiktighet om avgränsning/avstämning, inte en universell positiv eller negativ tolkning. |
| [SEC: Beginners’ Guide to Financial Statements](https://www.sec.gov/about/reports-publications/investorpubsbegfinstmtguide) | shortAnswer, caveats | Operating Activities och Bringing It All Together: operativa tillgångar/skulder justerar resultat; rapporterna behöver läsas tillsammans. | Den neutrala tolkningen är den godkända pedagogiska begränsningen, inte en prognos eller bolagsbedömning. |

The SEC guide (Balance Sheets, Income Statements, Cash Flow Statements and Bringing It All Together) was read directly. IAS 7/16/33 and IFRS 18 official overviews were read. SEC non-GAAP Q102.07 supplies the FCF limitation. Official staff papers were used only for identified passages: CMAC 2024-11-08 slide 7 and appendix slide 15 (reproducing IAS 7.50–51), IASB September 2025 paragraphs 26–30 (operating working-capital items and reconciliation). Staff discussion is not presented as a new accounting standard. The direct full IAS 7 PDF fetch was unavailable; no full-standard audit is claimed.

## 4. Wording narrowed during verification

- Income statement: the 800 includes **all costs and tax**, with no other income, so 200 really is net income in the example. A simplified top-to-bottom reading is not a universal layout. EPS uses the period/share basis supported by IAS 33 rather than copying the SEC primer's overly simple outstanding-share description.
- Cash-flow statement: +70 is the change only **without FX or other reconciliation effects** in the example. Indirect method reconciles **a stated profit measure**, rather than claiming net income is the starting point under every framework/version. IFRS 18 changes that presentation; earlier adoption is possible. US GAAP/IFRS classifications are not declared identical.
- Working capital: the example concerns the three specified **operating** items, assumes no other adjustments and explicitly omits depreciation. It is not a universal definition of all working capital or a complete OCF formula. Balance changes are not assumed to map unadjusted to cash flows.
- CapEx: cash purchase is distinguished from carrying-value movement in PP&E. Maintenance/growth is a disclosed analytical distinction, not two universally comparable report rows. FCF is a common convention requiring definition/reconciliation, not a standard universal measure.
- No universal company-quality verdict was added. Cash size, profit/cash divergence, high CapEx and movements in receivables/inventory/payables require context. These refinements preserve the approved educational scope.

## 5. Formulas/examples independently checked

`tests/knowledge-batch1a.test.cjs` independently verifies: 1 000 − 600 = 400; 1 000 − 800 = 200; 300 − 180 − 50 = 70; and a separate opening/closing working-capital ledger yields 100 − 30 − 20 + 15 = 65. The 180 cash machine purchase is an illustrative investment payment, not a future return. Profit-versus-cash uses three qualitative mechanisms, not new numerical claims. No executable formula was added: pe/1 remains the only approved template.

## 6. Aliases and retrieval fixtures

25 added labeled cases, preserving the original 49, make 74 total. The duplicate report retains only the five pre-existing candidates; no new alias collision or same-intent/shared-concept duplicate was reported. Manual scope review keeps statement definitions separate from the profit/cash comparison and working-capital interpretation. Six exact questions plus representative Swedish/English aliases; reviewed neutral responses for high CapEx, rising inventory/receivables/payables; abstention for universal cash/stock quality and personal buy/sell questions; unrelated mentions, an unreviewed comparison, PP&E/depreciation definitions and unsupported numeric OCF computation. The two value-laden aliases return explicit neutral limitations in the short answer, not a negative or positive verdict. Retrieval version is 2; content versions remain 1.

| Object | Representative aliases |
| --- | --- |
| balance-sheet | balansräkning; balance sheet; Vad är en balansräkning? |
| income-statement | resultaträkning; income statement; Vad är en resultaträkning? |
| cash-flow-statement | kassaflödesanalys; cash flow statement; Vad är en kassaflödesanalys? |
| profit-versus-cash | vinst och kassaflöde; resultat jämfört med kassaflöde; Varför är vinst inte samma sak som kassaflöde? |
| capex | CapEx; capital expenditures; kapitalinvesteringar; Är hög CapEx dåligt? |
| working-capital | rörelsekapital och kassaflöde; Hur påverkar kundfordringar kassaflödet?; Är ökande lager dåligt?; Är ökande kundfordringar dåligt?; Är ökande leverantörsskulder bra? |

## 7. Relations and integrations

New canonical answers link to each other and existing debt/revenue/EPS/FCF/margins as appropriate. Balance-sheet links to income-statement, cash-flow-statement, debt and working-capital. Existing Academy financial-statements/FCF/debt/revenue pages gain generated related-answer links, not duplicate prose.

- Research: one additional cash-flow-statement button inside the existing metrics help disclosure, using shared full explanation and focus return. Its related questions lead to the rest of the batch. No field values are serialized or changed. A scoped Knowledge table rule now allows header wrapping: the new comparison exposed a 3-pixel overflow at 360px/200% text zoom caused by inherited nowrap styling. No layout redesign was needed.
- Academy: income-statement is added to the existing per-share competency reminder. Help remains recorded as assisted exposure before loading, with no assessment/grade/XP rule change.
- Public Research: one profit-versus-cash link inside the existing generic terminology disclosure. Shared contextual renderer; author snapshot and financial claims remain untouched.
- No new help-icon system, broad UI redesign or new activity content.

## 8. Review/version metadata

All six: status reviewed; contentVersion 1; reviewedAt/source checks 2026-09-19; owner NTM owner; reviewer convention explicitly distinguishes **NTM owner (substantive approval)** from **Codex (source verification and arithmetic)**. Approval accepted applies only to these six. Methodology risk, label-on-overdue; 180-day cadence is advanced to **2026-12-31** for the known IFRS 18 transition before 2027. Earlier source/method changes also trigger review. Global educational scope, timeless illustrative periods, with framework differences explicit. There is no publishedAt. Initial baselines were added by the canonical --record-new command; all old 29 fingerprints, review dates, approvals and schedules are unchanged.

## 9. Resulting catalog count

**35 canonical visible objects = original 29 + six accepted reviewed objects.** Six individual JSON bodies and static answer pages were generated, with canonical URLs and noindex/follow under the existing reviewed-state policy. Sitemap remains 85 canonical URLs: the new reviewed objects are not promoted to published/indexed. This is the production-bound local catalog; the hosted site has not changed because there was no deployment.

## 10. Tests and complete validation

[regression.json](../qa/knowledge-batch1a/regression.json) records the actual completed gates; [retrieval.json](../qa/knowledge-batch1a/retrieval.json) records outcomes and failures. Required validation covers schema, history, source-section completeness and limits, owner-state separation, arithmetic, duplicate/collision review, exact seed preservation, 74 retrieval cases, all Knowledge unit tests, Waves 1/3/4/5, mobile/themes/reduced-motion/keyboard, 200% text reflow, no-JavaScript pages, shared help state/focus, Academy exposure and frozen Public Research content. Complete release includes Python/Node, local PGlite authorization/migration invariants, generated SEO, staging/CSP/local references, rules/calendar checks and credential scanning. Quality browser includes the original 41 pages plus six new pages. All QA is local and synthetic; no hosted account or JWT verification is implied. See the final validation summary beside the logs; failures must be resolved before release-ready status.

## 11. Remaining editorial/source limitations

Owner substantive approval is real and task-provided; a separate human read of source mappings is not claimed. Full IAS 7 PDF retrieval was unavailable; verified official summaries and identified staff-paper passages suffice for these bounded explanations, not jurisdiction-specific accounting advice. No issuer-specific CapEx assertion required a company filing. The 17 legacy mapping gaps and 16 unscheduled legacy reviews are untouched. SEC guide and non-GAAP pages were readable via web research in this batch despite historical HEAD restrictions, but this does not close every inherited source/claim task. Other previously restricted URLs were not rechecked.

Source taxonomy and context language can be reviewed again when IFRS 18 changes become applicable. A text fixture or browser pass cannot establish comprehension or independent accessibility with every assistive technology. Static no-JavaScript stale-content maintenance remains an operational duty.

## 12. PP&E/depreciation backlog decision

Recorded in [the separate recommendations](knowledge-batch1a-backlog.md), with no registered concepts, answers, aliases or URLs. The approved target stays **35 accepted + 65 proposed = 100**; they are uncounted recommendations pending an owner-approved substitution or explicit target revision. No Batch 1B work began.

## 13. Release readiness

**Batch 1A is release-ready as a reviewed/noindex local implementation.** All nine required gate groups pass: 289 Node tests, 167 Python tests, 74 retrieval cases with no failures or wrong confident matches, 69 browser tests across the required suites and a 47-page accessibility/CSP sweep. No database tests were skipped. See [final-summary.json](../qa/knowledge-batch1a/final-summary.json). The observed 3-pixel zoom overflow was fixed and retested; no unresolved product defect is known from these checks. The scope is six accepted reviewed answers and bounded integrations. No commit, push or deployment was performed. Publication/indexing is not silently substituted for the requested reviewed state.
