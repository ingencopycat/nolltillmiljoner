# Editorial Cleanup Batch 0 — owner checklist

As of 2026-09-19. This is a pending review package, not an approval record. Read with [the implementation report](knowledge100-report.md) and [authoring reference](knowledge100-owner-review.md). Exact current short/full/example/caveat text, source metadata and fingerprints for all 29 objects are preserved in [the audit snapshot](../qa/knowledge-batch0/audit.json). Sources below are existing catalog references, not newly verified citations.

## Classification and disposition

1. Safe structural/metadata: generated the inventory, deduplicated URL-to-object checklist, missing-section labels and planning counts. **Zero catalog fields changed; zero issue records closed.** No genuinely clerical correction was found within the 41 reported records.
2. Owner editorial decision: all 16 missing schedules. All source/mapping tasks also need owner acceptance after evidence is obtained.
3. External source verification: 17 claim-mapping records and 8 unique restricted URLs. Overlap is intentional: these are 41 issue records, not 41 answers.
4. Intentionally acceptable limitation: no unresolved evidence gap or missing schedule was reclassified as acceptable. The separate bounded-product limitations below can remain; owner acceptance is not presumed.

## Claim mappings: 17 source tasks, then owner acceptance

For each object, compare all three missing sections with actual source passages; the synthetic example also needs an arithmetic/scope check. Do not populate supports merely to clear a warning.

### gav — category 3 → category 2

**Hur räknar jag GAV?** Current short answer: GAV är ditt genomsnittliga anskaffningsvärde per aktie. För enkla köp summerar du kostnaderna och delar med det sammanlagda antalet aktier.

Current full answer: Antalet aktier väger varje inköpspris. Ett vanligt medelvärde av två kurser fungerar därför bara när du köpt lika många till båda priserna. Bestäm om courtage ska ingå och använd samma avgränsning hela vägen.

Current limitation: Ett lägre GAV visar vad du betalat, inte att nästa köp är attraktivt. Split, försäljningar och andra bolagshändelser kan kräva justeringar. NTM:s inköpskalkyl ersätter inte en skatteberäkning.

Current sources: [Investor.gov: How Fees and Expenses Affect Your Investment Portfolio](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] The fee bulletin is not automatically evidence for weighted acquisition cost, splits or disposal adjustments. Find primary support for each scope; keep the calculator-versus-tax distinction; independently check the 85 kr example.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### peg — category 3 → category 2

**Vad betyder PEG?** Current short answer: PEG ställer P/E i relation till en årlig vinsttillväxt uttryckt i procenttal. Det är en förenklad jämförelse mellan priset på vinst och den tillväxt du antar.

Current full answer: Vanligen divideras P/E med den förväntade EPS-tillväxten, men både vinstbas och prognosperiod varierar mellan tjänster. Kontrollera om P/E är historiskt eller framåtblickande och hur många års tillväxt prognosen avser.

Current limitation: PEG under 1 är ingen allmän köpregel. Måttet saknar bland annat explicit risk, skuld och tillväxtens varaktighet. Vid noll eller negativ tillväxt blir den vanliga tolkningen olämplig.

Current sources: [Fidelity: Research glossary, P/E och PEG](https://www.fidelity.com/webcontent/ap010098-etf-content/19.02.0/help/research/learn_er_glossary_3.shtml). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] Access the Fidelity definition and identify growth units, forecast horizon and unsuitable denominator cases. Support the no-buy-rule caveat separately; never map the whole glossary by title alone.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### market-cap — category 3 → category 2

**Vad är börsvärde?** Current short answer: Börsvärdet är marknadsvärdet på bolagets aktier: aktiekursen multiplicerad med antalet utestående aktier. Det är inte samma sak som värdet på hela verksamheten.

Current full answer: En låg kurs per aktie betyder därför inte ett litet eller billigt bolag. För bolag med flera aktieslag måste beräkningen hantera respektive antal och pris. Börsvärdet förändras när pris eller aktieantal ändras.

Current limitation: Börsvärdet inkluderar inte en separat skuldjustering. Enterprise value, EV, börjar förenklat med börsvärdet och lägger till skuld samt drar av kassa. Metoden kan kräva fler justeringar.

Current sources: [FINRA: Market Cap Explained](https://www.finra.org/investors/insights/market-cap). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] Check FINRA for outstanding-share basis and multiple share classes; obtain explicit EV/debt/cash evidence for the caveat if absent.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### guidance — category 3 → category 2

**Vad betyder guidance i en rapport?** Current short answer: Guidance är bolagsledningens kommunicerade utsikter för en kommande period. Det kan vara ett intervall för exempelvis omsättning, marginal eller vinst.

Current full answer: Skilj ledningens utsikter från analytikernas prognoser och från redan rapporterade resultat. Spara datum, period, mått och förutsättningar. Ett nytt intervall kan vara mer relevant än att den senaste historiska siffran var stark.

Current limitation: Guidance kan ändras eller dras tillbaka. Kontrollera valuta, förvärv och om måtten är justerade. Ett intervall för omsättningen är inte automatiskt en prognos för EPS eller kassaflöde.

Current sources: [NVIDIA: Exempel på bolagets egen outlook och definitioner](https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Financial-Results-for-Fourth-Quarter-and-Fiscal-2026/). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] Check the dated NVIDIA outlook only as a company example. Separately substantiate general statements about withdrawal, adjusted metrics and comparability; retain the fictional example as fictional.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### revenue — category 3 → category 2

**Vad är revenue eller omsättning?** Current short answer: Revenue betyder intäkter; för ett vanligt rörelsedrivande bolag talar man ofta om omsättning. Det är försäljningen som redovisats under perioden, innan många av verksamhetens kostnader dragits av.

Current full answer: När en intäkt redovisas beror på vad bolaget har levererat och de redovisningsregler som gäller. Inbetalningen kan komma vid en annan tidpunkt. Omsättning är därför varken samma sak som vinst eller som pengar på kontot.

Current limitation: Tillväxt kan komma från fler sålda enheter, högre priser, förvärv eller valuta. Leta efter en uppdelning innan du kallar hela ökningen organisk tillväxt.

Current sources: [IFRS Foundation: IFRS 15 Revenue](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] Map IFRS 15 to revenue recognition. Obtain explicit evidence for the organic/acquisition/FX growth caveat rather than assuming the standards overview supports it.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### debt — category 3 → category 2

**Vad säger skuld och nettoskuld om ett bolag?** Current short answer: Skuld visar åtaganden som måste hanteras. Nettoskuld är vanligen räntebärande skulder minus kassa och likvida medel, men exakt avgränsning måste kontrolleras.

Current full answer: Bedöm också när skulderna förfaller, räntan, villkoren och vilken kassa som faktiskt är tillgänglig. Två bolag med samma nettoskuld kan ha helt olika risk om det ena behöver låna om snart.

Current limitation: Leasing, spärrad kassa och andra åtaganden kan ändra bilden. Att nettoskuld/EBITDA är lågt garanterar inte betalningsförmåga: EBITDA är inte ett mått på fritt tillgängliga pengar.

Current sources: [SEC: Beginners’ Guide to Financial Statements](https://www.sec.gov/about/reports-publications/investorpubsbegfinstmtguide); [FINRA: Bonds](https://www.finra.org/investors/investing/investment-products/bonds). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] Separate balance-sheet debt, net-debt convention, maturity and liquidity claims. Verify lease/restricted-cash/EBITDA limitations in appropriate notes or methodology; broad beginner pages may not cover them.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### dividends — category 3 → category 2

**Är utdelning gratis avkastning?** Current short answer: Nej. En utdelning för över värde från bolaget till aktieägarna. Bedöm avkastningen som kursförändring och utdelning tillsammans, med hänsyn till kostnader och skatt.

Current full answer: När rätten till utdelningen skiljs av är bolaget, allt annat lika, värt mindre med det utdelade beloppet. Det betyder inte att börskursen måste falla exakt så mycket just den dagen; annan information kan samtidigt påverka.

Current limitation: En hög direktavkastning kan bero på en fallande kurs och risk för sänkt utdelning. Historiska utbetalningar är inget löfte om framtida utdelningar. Granska finansieringen bakom dem.

Current sources: [Investor.gov: Stocks](https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] Verify ex-dividend mechanics and total-return framing. Independently support the payout-risk caveat; distinguish theoretical all-else-equal adjustment from actual daily price movement.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### fx — category 3 → category 2

**Hur påverkar USD/SEK min avkastning?** Current short answer: För en investering i USD påverkas värdet i SEK både av investeringens avkastning och av hur många kronor en dollar kostar. Effekterna multipliceras.

Current full answer: Utan mellanliggande kassaflöden blir SEK-avkastningen (1 + avkastning i USD) × (1 + förändring i USD/SEK) − 1. Här betyder högre USD/SEK att dollarn stärkts mot kronan.

Current limitation: Addera inte bara procenttalen. Utdelningar, växlingsavgifter och olika köpdatum kräver mer underlag. En valutasäkrad produkt kan bete sig annorlunda, och handelsvalutan avslöjar inte hela den ekonomiska valutaexponeringen.

Current sources: [Investor.gov: International Investing](https://www.investor.gov/introduction-investing/investing-basics/investment-products/international-investing). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] Confirm direction of USD/SEK and multiplicative return math; check the no-intermediate-cash-flow assumptions and hedged-product caveat against appropriate sources.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### isk — category 3 → category 2

**Hur fungerar skatt på ISK i grunden?** Current short answer: ISK beskattas genom en årlig schablonberäkning i stället för separat skatt på varje vinstaffär. Kontots värden och insättningar påverkar underlaget.

Current full answer: Du behöver normalt inte redovisa varje försäljning inne i kontot. Skatt kan uppstå även ett år då placeringarna faller i värde. Årsparametrar och den gemensamma grundnivån hämtas här från NTM:s daterade regelregister, inte från en fast siffra i svaret.

Current limitation: Förluster inne i ISK är inte avdragsgilla. Utländsk källskatt och särskilda kontovillkor kan kräva egen kontroll. Välj rätt inkomstår i kalkylatorn och läs Skatteverkets regler för din situation.

Current sources: [Skatteverket: Skatt på investeringssparkonto](https://www.skatteverket.se/privat/skatter/vardepapper/investeringssparkontoisk.4.5fc8c94513259a4ba1d800037851.html). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] Check Skatteverket for capital base, loss treatment and foreign withholding scope, alongside the existing income-year registry. Keep personal tax situations outside the generic answer; do not alter rule values here.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### fees — category 3 → category 2

**Vad är courtage och hur påverkar det små köp?** Current short answer: Courtage är en avgift för en värdepappersaffär. Den kan exempelvis vara procentuell med ett minimibelopp, vilket gör små affärer relativt dyra.

Current full answer: Läs prislistan för ditt konto, din marknad och din orderstorlek. Courtage är bara en kostnad: spread, valutaväxling och produktavgifter kan tillkomma. Räkna på både köp och en eventuell framtida försäljning.

Current limitation: Avgiftsfritt courtage betyder inte att all handel är gratis. Fler affärer kan ge högre sammanlagd kostnad. Jämför hela kostnadsbilden och gör inte större köp enbart för att sänka avgiftsprocenten.

Current sources: [Investor.gov: How Fees and Expenses Affect Your Investment Portfolio](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] Check whether the fee bulletin supports minimum commission and both sides of a trade. Broker/exchange terms may be needed for examples of spread/FX/product costs; do not insert a current price list as universal.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### ttm — category 3 → category 2

**Vad betyder TTM?** Current short answer: TTM betyder trailing twelve months: de senaste tolv månaderna. För ett flödesmått används ofta de fyra senast rapporterade kvartalen.

Current full answer: TTM är ett rullande historiskt fönster, inte en prognos. Det kan sluta mitt i ett kalenderår. Kontrollera slutdatumet och använd fristående kvartal så att en ackumulerad halvårs- eller niomånaderssiffra inte dubbelräknas.

Current limitation: Balansräkningsposter som kassa och skuld är ögonblicksbilder och ska inte summeras till TTM. EPS kräver dessutom hänsyn till aktiebas och definition. Datum är en del av måttet.

Current sources: [Fidelity: Research glossary, trailing twelve months](https://www.fidelity.com/webcontent/ap010098-etf-content/19.07.0/help/research/learn_er_glossary_2.shtml); [SEC: Beginners’ Guide to Financial Statements](https://www.sec.gov/about/reports-publications/investorpubsbegfinstmtguide). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] Check the glossary for rolling period definition and accounting evidence for flow-versus-stock/accumulated-quarter restrictions. Verify EPS aggregation caveats independently.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### interest-rates — category 3 → category 2

**Hur kan styrräntan påverka investeringar?** Current short answer: Styrräntan påverkar andra räntor och därmed finansieringskostnader, sparande och efterfrågan. Effekten på en viss investering beror på verksamheten och vad marknaden redan väntat sig.

Current full answer: Högre lånekostnader kan minska utrymmet för konsumtion eller företagsinvesteringar. Samtidigt kan vissa verksamheter gynnas av ett annat ränteläge. Det är därför inte en automatisk regel att varje räntehöjning sänker alla aktier.

Current limitation: Styrränta och långa marknadsräntor är olika saker. Förändringar verkar med fördröjning, och bundna lån påverkas på andra tider. Skilj ett väntat beslut från en överraskning.

Current sources: [Riksbanken: Så påverkar penningpolitiken inflationen](https://www.riksbank.se/sv/penningpolitik/vad-ar-penningpolitik/sa-paverkar-penningpolitiken-inflationen/). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] Map the Riksbank mechanism carefully; distinguish transmission, lags and expectations from a claim that all shares respond predictably.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### bond-yields — category 3 → category 2

**Varför spelar obligationsräntor roll för aktier?** Current short answer: Obligationsräntor påverkar avkastningsalternativ och finansieringsvillkor. Högre avkastningskrav kan också sänka nuvärdet av framtida vinster, om allt annat hålls lika.

Current full answer: För en obligation med fasta betalningar rör sig pris och marknadens avkastningskrav normalt åt motsatta håll. För aktier tillkommer förändringar i tillväxt, risk och vinst. Orsaken till ränterörelsen är därför viktig.

Current limitation: Kupongränta, löpande avkastning och avkastning till förfall är olika mått. En stigande obligationsränta kan spegla inflation, kreditrisk eller starkare ekonomi. Ingen enkel procentsats översätter rörelsen till aktiemarknaden.

Current sources: [FINRA: Bonds](https://www.finra.org/investors/investing/investment-products/bonds); [FINRA: Stocks and investment risks](https://www.finra.org/investors/investing/investment-products/stocks). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] Use bond-method evidence for price/yield and distinctions between coupon/current yield/yield-to-maturity; support equity discounting separately and recalculate the present-value example.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### earnings — category 3 → category 2

**Varför kan en aktie falla trots en bra rapport?** Current short answer: En rapport kan vara stark jämfört med förra året men svagare än marknadens förväntningar. Kursen påverkas också av utsikter, risk och det pris investerarna redan betalat.

Current full answer: Skilj historisk förbättring från en positiv överraskning. Läs mer än rubrikens omsättning och EPS: kassaflöde, marginaler, orderingång och framtida utsikter kan ge en annan bild. Orsaken till en dags kursrörelse går inte alltid att fastställa.

Current limitation: En kursreaktion bevisar inte att din långsiktiga tes är rätt eller fel. Jämför rapporten med daterade, mätbara antaganden och var tydlig med vilka förklaringar som bara är hypoteser.

Current sources: [FINRA: Stocks and investment risks](https://www.finra.org/investors/investing/investment-products/stocks). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] The broad stocks page may not establish the asserted explanation for a particular reaction. Preserve the hypothetical nature and owner-approve the interpretation method and causal limits.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### estimates — category 3 → category 2

**Vad är analytikerestimat och konsensus?** Current short answer: Analytikerestimat är prognoser för exempelvis vinst eller omsättning. Konsensus sammanfattar ett urval av sådana prognoser, ofta med ett genomsnitt eller en median.

Current full answer: Konsensus är inte ett rapporterat bolagsresultat och inte nödvändigtvis alla marknadsaktörers förväntan. Tjänster kan använda olika analytiker, uppdateringsdatum, perioder och definitioner. Därför kan två konsensussiffror skilja sig utan att någon är ett enkelt räknefel.

Current limitation: Visa prognosens datum och källa. Skillnaden mellan högsta och lägsta estimat kan vara viktig. En träff mot konsensus visar inte i sig att aktiens pris är rimligt.

Current sources: [SEC: Analyzing Analyst Recommendations](https://www.sec.gov/about/reports-publications/investorpubsanalystshtm). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] The SEC analyst-recommendations page is not automatically a consensus-aggregation methodology. Obtain the actual method for mean/median, coverage and timestamps; distinguish estimates from recommendations.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### diversification — category 3 → category 2

**Vad innebär diversifiering?** Current short answer: Diversifiering innebär att sprida exponeringen så att ett enskilt innehav eller en gemensam risk inte dominerar hela portföljen. Antalet innehav är bara en del av bilden.

Current full answer: Titta på vad innehaven påverkas av: bransch, kunder, geografi, valuta och finansiering. Flera fonder kan äga samma stora bolag. Även många olika aktier kan samtidigt vara känsliga för samma ekonomiska förändring.

Current limitation: Riskspridning tar inte bort marknadsrisk och lovar ingen vinst. Samband mellan tillgångar kan förändras i stress. Anpassa riskbedömningen till tidshorisont, likviditetsbehov och hur stora förluster du kan bära.

Current sources: [Investor.gov: Asset Allocation and Diversification](https://www.investor.gov/introduction-investing/getting-started/asset-allocation). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] Map concentration, overlap and market-risk limits separately. Recalculate the weight-times-loss example; retain horizon/liquidity statements as general boundaries, not personalized allocation advice.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

### eps-comparison — category 3 → category 2

**Varför skiljer sig EPS mellan olika sajter?** Current short answer: Ofta jämför sajterna olika EPS-mått: period, rapporterad eller justerad vinst, grundläggande eller utspädd aktiebas, eller historik mot prognos.

Current full answer: Börja vid bolagets egen rapport och anteckna periodens slutdatum, valuta och definition. Följ sedan varje tjänsts metodbeskrivning. En leverantör kan ha uppdaterat den senaste rapporten medan en annan fortfarande använder äldre data.

Current limitation: Välj inte automatiskt den högsta EPS-siffran för att få ett lägre P/E. Om justeringar inte går att förklara är jämförelsen osäker. Redovisa skillnaden i stället för att dölja den.

Current sources: [IFRS Foundation: IAS 33 Earnings per Share](https://www.ifrs.org/issued-standards/list-of-standards/ias-33-earnings-per-share/); [SEC: Non-GAAP Financial Measures, inklusive FCF](https://www.sec.gov/rules-regulations/staff-guidance/corporation-finance-interpretations/non-gaap-financial-measures). Missing mappings: shortAnswer, fullAnswer, caveats.

- [ ] Map IAS 33 to share basis and SEC guidance to adjusted measures; issuer/provider methodology is needed for freshness and period differences. Check the quarter-versus-TTM example.
- [ ] Owner accepts evidence-to-section mapping (or requests a substantive correction); record actual reviewer/date and precise passage references. Why: A supports association asserts evidence. Source reachability, title similarity and the old date do not prove support. Owner must approve the resulting mapping and any prose correction.

## Review schedules: 16 owner decisions (category 2)

All deadlines are currently null. The existing date below is historical catalog metadata, not evidence of independent review in Batch 0. Sources and full text are listed by the same ID above and in audit.json. Cadences are proposals, not new review dates or applied risk classes.

| Object / current question | Current date / policy | Proposed action | Why owner review |
| --- | --- | --- | --- |
| `gav` — Hur räknar jag GAV? | 2026-09-15; stable/label | [ ] Approve 365 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Stable does not mean exempt from review. |
| `peg` — Vad betyder PEG? | 2026-09-15; stable/label | [ ] Approve 180 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Consider methodology risk instead of inherited stable; this is a proposal, not an applied reclassification. |
| `market-cap` — Vad är börsvärde? | 2026-09-15; stable/label | [ ] Approve 365 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Stable does not mean exempt from review. |
| `guidance` — Vad betyder guidance i en rapport? | 2026-09-15; stable/label | [ ] Approve 180 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Consider methodology risk instead of inherited stable; this is a proposal, not an applied reclassification. |
| `revenue` — Vad är revenue eller omsättning? | 2026-09-15; stable/label | [ ] Approve 180 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Consider methodology risk instead of inherited stable; this is a proposal, not an applied reclassification. |
| `debt` — Vad säger skuld och nettoskuld om ett bolag? | 2026-09-15; stable/label | [ ] Approve 180 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Consider methodology risk instead of inherited stable; this is a proposal, not an applied reclassification. |
| `dividends` — Är utdelning gratis avkastning? | 2026-09-15; stable/label | [ ] Approve 365 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Stable does not mean exempt from review. |
| `fx` — Hur påverkar USD/SEK min avkastning? | 2026-09-15; stable/label | [ ] Approve 365 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Stable does not mean exempt from review. |
| `fees` — Vad är courtage och hur påverkar det små köp? | 2026-09-15; stable/label | [ ] Approve 365 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Stable does not mean exempt from review. |
| `ttm` — Vad betyder TTM? | 2026-09-15; stable/label | [ ] Approve 180 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Consider methodology risk instead of inherited stable; this is a proposal, not an applied reclassification. |
| `interest-rates` — Hur kan styrräntan påverka investeringar? | 2026-09-15; stable/label | [ ] Approve 365 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Stable does not mean exempt from review. |
| `bond-yields` — Varför spelar obligationsräntor roll för aktier? | 2026-09-15; stable/label | [ ] Approve 365 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Stable does not mean exempt from review. |
| `earnings` — Varför kan en aktie falla trots en bra rapport? | 2026-09-15; stable/label | [ ] Approve 180 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Consider methodology risk instead of inherited stable; this is a proposal, not an applied reclassification. |
| `estimates` — Vad är analytikerestimat och konsensus? | 2026-09-15; stable/label | [ ] Approve 180 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Consider methodology risk instead of inherited stable; this is a proposal, not an applied reclassification. |
| `diversification` — Vad innebär diversifiering? | 2026-09-15; stable/label | [ ] Approve 365 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Stable does not mean exempt from review. |
| `eps-comparison` — Varför skiljer sig EPS mellan olika sajter? | 2026-09-15; stable/label | [ ] Approve 180 days from actual review; appoint reviewer; recheck on source/method change | Setting reviewDue controls stale behavior and maintenance commitments. Do not backdate a review or start a fresh clock from this audit. Consider methodology risk instead of inherited stable; this is a proposal, not an applied reclassification. |

**Scheduling decision form:** reviewer = ___; accepted cadence = ___; source-change trigger owner = ___; actual review completed = ___; then derive reviewDue. Do not update reviewedAt, editorial.approval or contentVersion merely for scheduling. Evidence metadata changes are fingerprinted and require explicit version/history under the existing workflow.

## Access-restricted sources: 8 checks (category 3)

These are the previous audit's 403 HEAD results, not new measurements. Batch 0 did not retry access or research alternative sources. None is declared broken, verified or acceptable evidence by HTTP status alone. Other 200 responses also never proved claim support.

- [ ] **source:01 — `fcf`, `eps-comparison`:** [exact current URL](https://www.sec.gov/rules-regulations/staff-guidance/corporation-finance-interpretations/non-gaap-financial-measures). Open SEC non-GAAP guidance; locate FCF and adjusted-measure passages and issuer reconciliation limitations. Attach passage references, not just a successful response. Record access date, source title/version, passage references, supported/unsupported claims and any access limitation. Keep unverified if inaccessible; do not bypass access restrictions. A replacement is a proposal until approved.
- [ ] **source:02 — `peg`, `forward`:** [exact current URL](https://www.fidelity.com/webcontent/ap010098-etf-content/19.02.0/help/research/learn_er_glossary_3.shtml). Open Fidelity glossary in a normal browser or locate an official current replacement; check P/E, PEG, forecast-growth conventions and trailing/forward basis separately. Record access date, source title/version, passage references, supported/unsupported claims and any access limitation. Keep unverified if inaccessible; do not bypass access restrictions. A replacement is a proposal until approved.
- [ ] **source:03 — `guidance`:** [exact current URL](https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Financial-Results-for-Fourth-Quarter-and-Fiscal-2026/). Open the exact NVIDIA fiscal-2026 Q4 release or its official investor-relations archive copy. Verify release identity/date and outlook definitions; do not silently substitute another quarter. Record access date, source title/version, passage references, supported/unsupported claims and any access limitation. Keep unverified if inaccessible; do not bypass access restrictions. A replacement is a proposal until approved.
- [ ] **source:04 — `margins`, `debt`, `ttm`:** [exact current URL](https://www.sec.gov/about/reports-publications/investorpubsbegfinstmtguide). Open SEC financial-statements guide; verify which margin, debt and flow/stock claims it actually covers. Obtain additional primary evidence for unsupported caveats. Record access date, source title/version, passage references, supported/unsupported claims and any access limitation. Keep unverified if inaccessible; do not bypass access restrictions. A replacement is a proposal until approved.
- [ ] **source:05 — `ttm`:** [exact current URL](https://www.fidelity.com/webcontent/ap010098-etf-content/19.07.0/help/research/learn_er_glossary_2.shtml). Open Fidelity trailing-period glossary or an official replacement; verify TTM definition. Do not assume it proves accumulated-quarter/EPS arithmetic rules. Record access date, source title/version, passage references, supported/unsupported claims and any access limitation. Keep unverified if inaccessible; do not bypass access restrictions. A replacement is a proposal until approved.
- [ ] **source:06 — `estimates`:** [exact current URL](https://www.sec.gov/about/reports-publications/investorpubsanalystshtm). Open SEC analyst material and check relevance: recommendations are not the same as consensus estimates. Supplement with primary aggregation methodology if necessary. Record access date, source title/version, passage references, supported/unsupported claims and any access limitation. Keep unverified if inaccessible; do not bypass access restrictions. A replacement is a proposal until approved.
- [ ] **source:07 — `macro-releases`:** [exact current URL](https://www.bls.gov/cpi/questions-and-answers.htm). Open BLS CPI FAQ; identify passages for population/basket, total/core, periodic changes and revision/adjustment scope. Record access date, source title/version, passage references, supported/unsupported claims and any access limitation. Keep unverified if inaccessible; do not bypass access restrictions. A replacement is a proposal until approved.
- [ ] **source:08 — `macro-releases`:** [exact current URL](https://www.bls.gov/bls/empsitquickguide.htm). Open BLS Employment Situation methods; identify establishment-versus-household survey, jobs-versus-people and revision passages. Record access date, source title/version, passage references, supported/unsupported claims and any access limitation. Keep unverified if inaccessible; do not bypass access restrictions. A replacement is a proposal until approved.

## Acceptable product limits, separately identified (category 4)

- Only pe/1 is executable. Planned formula/example objects are explanatory content, not permission for new executable templates. Owner can retain this boundary; requested additional execution would require separate engineering validation.
- Knowledge is bounded reviewed coverage; unsupported buy/sell judgments and uncovered questions continue to abstain. Expansion does not promise a general adviser.
- Static no-JavaScript pages require timely regeneration/withdrawal; they cannot self-expire. Owner must assign an operational review owner before relying on deadlines.
- Synthetic/browser tests do not establish learning, independent editorial correctness, accessibility for every assistive technology or low-end-device field performance. Keep those human checks separate.

These are documented design boundaries, not newly approved waivers. Restricted source access, missing mappings and missing review schedules remain open work.
