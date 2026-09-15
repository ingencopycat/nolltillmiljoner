/* Reviewed synthetic teaching activities. No prices, advice, services or private data. */
(function(root){
 'use strict';
 const A=typeof module!=='undefined'?require('./academy-catalog.js'):root.NTMAcademyCatalog;
 const choice=(id,prompt,options,answer,explanation)=>({id,kind:'choice',prompt,options,answer,explanation});
 const numeric=(id,prompt,answer,tolerance,explanation)=>({id,kind:'numeric',prompt,answer,tolerance,explanation});
 const multi=(id,prompt,options,answer,explanation)=>({id,kind:'multiple',prompt,options,answer,explanation});
 const reflection=(id,prompt,rubric)=>({id,kind:'reflection',prompt,rubric,explanation:'Jämför ditt resonemang med kriterierna. Denna del är självgranskad, inte automatiskt bedömd. Texten lämnar inte formuläret och sparas inte.'});
 const questions=[
  choice('price-demand','Omsättning +25 %, EPS +10 %, kurs +50 %. Vad har stigit?', ['P/E-talet','Vinst per aktie med 50 %','Kassaflödet med säkerhet'],0,'P/E förändras med 1,50 / 1,10 ≈ 1,364. Priset har ökat snabbare än vinsten per aktie. Kursuppgången bevisar inte högre kassaflöde.'),
  numeric('fx-sek','Aktien +10 % i USD, USD/SEK −8 %. Avkastning i SEK, procent?',1.2,.01,'1,10 × 0,92 − 1 = 0,012, alltså 1,2 %. Valutakursen anges som SEK per USD. Ingen skatt, avgift eller utdelning ingår.'),
  numeric('forward-pe','P/E är 40. Kursen är oförändrad och jämförbar EPS växer 20 %. Nytt P/E?',33.333333,.05,'40 / 1,20 ≈ 33,33. Ett lägre forward-tal bygger här på att vinstprognosen faktiskt uppfylls.'),
  multi('cash-growth','Försäljningen växer men FCF faller. Vilka två förändringar kan förklara det?', ['Mer pengar binds i kundfordringar','Större kontanta investeringar','En aktiesplit skapar ett kontant utflöde'],[0,1],'Mer rörelsekapital och större CapEx kan minska CFO minus CapEx. En ren split ändrar antal/pris, inte bolagets kassa.'),
  numeric('drawdown','Ett innehav faller 50 %. Vilken uppgång i procent krävs för återhämtning?',100,.01,'100 blir 50. För att nå 100 behöver 50 fördubblas. Återhämtningen är 100 %, inte 50 %.'),
  choice('fee-model','100 kr växer 7 %, sedan tas 1 % av det nya värdet i avgift. Vad återstår?', ['106 kr exakt','105,93 kr','107 kr'],1,'100 × 1,07 × 0,99 = 105,93. Avgiften tas på det nya värdet. NTM:s avgiftsmodell måste jämföras med samma timing.'),
  numeric('dilution-eps','Vinsten ökar från 100 till 120, aktierna från 100 till 150. Ny EPS?',.8,.001,'120 / 150 = 0,80, mot tidigare 1. Bolagsvinsten ökade men den jämförbara vinsten per aktie föll.'),
  choice('inflation-level','Inflationen faller från 10 % till 2 %. Har prisnivån därmed fallit?', ['Ja','Nej'],1,'Lägre positiv inflation innebär långsammare prisökning. Deflation betyder fallande allmän prisnivå; de två är inte samma sak.'),
  numeric('gross-margin','Omsättning 200, kostnad för sålda varor 120. Bruttomarginal i procent?',40,.01,'(200 − 120) / 200 × 100 = 40 %. Rörelsekostnader, ränta och skatt ligger inte i denna förenklade bruttomarginal.'),
  numeric('operating-margin','Bruttoresultat 80, övriga rörelsekostnader 50, omsättning 200. Rörelsemarginal i procent?',15,.01,'(80 − 50) / 200 × 100 = 15 %. Nettomarginalen kan bli lägre efter ränta och skatt.'),
  choice('report-period','Års-EPS är 5 och kvartals-EPS 1,20. Är kvartalet automatiskt sämre än årsprognosen?', ['Ja','Nej'],1,'Perioderna skiljer sig. Säsong, återstående kvartal, aktiebas och redovisningsdefinition behöver granskas innan en helårsbedömning ändras.'),
  multi('thesis-evidence','Vilka två formuleringar går att följa upp?', ['Marginalen ska vara minst 15 % om fyra kvartal','Kundbortfall över 10 % utlöser omprövning','Aktien känns som en vinnare'],[0,1],'Mått, trösklar och tidsperioder gör antaganden prövbara. Trösklarna är egna analysval, inte universella köp- eller säljregler.'),
  numeric('compound-check','100 kr växer 10 % per år i två år utan insättningar. Slutvärde?',121,.01,'100 × 1,10 × 1,10 = 121. Den andra ökningen räknas på 110, inte på det ursprungliga beloppet.'),
  numeric('ev-check','Börsvärde 800, räntebärande skuld 300, kassa 100. Förenklat EV?',1000,.01,'800 + 300 − 100 = 1 000. Verkliga bolag kan kräva leasing-, minoritets- och andra justeringar.'),
  choice('leverage-case','Ett bolag har skuld 300 och kassa 20. Nästa års stora förfall är 200. Vilken fråga är mest angelägen?', ['Kan det refinansiera eller betala förfallet?','Är aktiekursen lägre än 100 kr?','Hur många decimaler har P/E?'],0,'Skuldens förfall och likviditet kan vara avgörande innan en slutmultipel ens blir relevant. Nettoskulden ensam beskriver inte betalningsförmågan.'),
  multi('cycle-case','Ett cykliskt bolag visar rekordvinst. Vad bör kontrolleras innan ett lågt P/E kallas billigt?', ['Om vinstnivån kan normaliseras nedåt','Lager, investeringar och skuldförfall','Om låg multipel garanterar låg risk'],[0,1],'Toppvinster kan få en cyklisk aktie att se billig ut. Undersök normalisering och finansiering; en multipel är ingen riskgaranti.'),
  numeric('recovery-weight','Ett innehav väger 20 % och faller 50 %, övriga står stilla. Portföljens förlust i procent?',10,.01,'0,20 × 50 % = 10 %. Om flera innehav faller samtidigt blir förlusten större; exemplet isolerar ett innehav.'),
  choice('cash-quality','CFO är 80 och CapEx 30. Kan hela FCF 50 automatiskt delas ut?', ['Ja','Nej'],1,'Skulder, leasing, likviditetsbehov och andra investeringar kan kräva pengar. CFO minus kontant CapEx är ett avgränsat mått, inte ett utdelningslöfte.'),
  numeric('reverse-check','Pris 100, avkastningskrav 10 %, två år, slut-P/E 20. Erforderlig EPS?',6.05,.001,'Slutpris 100 × 1,10² = 121. 121 / 20 = 6,05. Kravet är ditt antagande; ingen framtida avkastning är utlovad.'),
  choice('risk-return','En hög möjlig uppsida räcker för att bestämma positionsstorlek. Sant eller falskt?', ['Sant','Falskt'],1,'Sannolikheter, förluster, likviditet, tidshorisont och portföljens övriga risk behövs också. Risk/reward-belopp ensamma ger inte ett lämpligt innehav.')
 ];
 const q=id=>questions.find(q=>q.id===id);
 const definitions=[
  ['price-vs-profit','scenario','När priset springer före vinsten','valuation',['pe','eps'],'tool-valuation','Ett fiktivt mjukvarubolag ökar omsättningen 25 %, EPS 10 % och aktiekursen 50 %. Marginalen faller. Alla jämförelser avser samma år och jämförbar aktiebas. Vilken del av kraven på bolaget har förändrats?',['price-demand']],
  ['fx-outcome','scenario','Två valutor, ett sparutfall','saving',['currency','avkastning'],'tool-fx','Du äger en fiktiv investering i USD. Den stiger 10 % medan dollarn kostar 8 % färre SEK. Bortse från avgifter, skatt och kassaflöden. Övningen testar avkastningen för en svensk sparare.',['fx-sek']],
  ['forward-demand','scenario','Lägre multipel utan lägre kurs','valuation',['pe','forward-metrics'],'tool-valuation','En aktie handlas till P/E 40 på historisk EPS. Nästa års jämförbara EPS antas växa 20 %. Håll kursen stilla och undersök skillnaden mellan historik och prognos.',['forward-pe']],
  ['growth-cash','scenario','Tillväxt som binder pengar','statements',['revenue','fcf'],'research-nvda','Ett fiktivt industribolags intäkter stiger samtidigt som FCF faller. Kundfordringarna ökar och bolaget bygger en ny fabrik. Ledningen beskriver detta som tillväxt. Du behöver förstå kassaflödet innan du accepterar förklaringen.',['cash-growth']],
  ['recovery','scenario','Vägen tillbaka efter ett fall','start',['risk','position-sizing'],'tool-purchase','Ett innehav har halverats. Pröva återhämtningsmatematiken innan du tolkar ett uppgångsscenario. Inga sannolikheter eller tid till återhämtning kan utläsas ur själva procenttalet.',['drawdown']],
  ['cost-timing','scenario','När dras avgiften?','saving',['fees','compounding'],'tool-fees','Du jämför två kostnadsmodeller. I den här uttryckliga modellen växer 100 kr först 7 %, därefter tas 1 % av det nya värdet. Frågan handlar om avgiftsunderlaget, inte om vilken fond du ska välja.',['fee-model']],
  ['share-count','scenario','Vinsttillväxt med fler aktier','statements',['dilution','eps'],'tool-valuation','Ett fiktivt bolags årsresultat ökar från 100 till 120 miljoner. Den jämförbara genomsnittliga aktiebasen ökar från 100 till 150 miljoner. Bortse från preferensvillkor och andra EPS-justeringar.',['dilution-eps']],
  ['price-level','scenario','Inflationstakten faller','macro',['inflation','interest-rates'],'macro-calendar','Tidningsrubriken säger att inflationen sjunker från 10 % till 2 %. Du vill skilja prisnivå från förändringstakt innan du drar slutsatser om köpkraft. Båda talen avser jämförbar årstakt.',['inflation-level']],
  ['analyse-company','challenge','Analysera ett förenklat bolag','research',['revenue','marginal','thesis'],'workflow-manual-thesis','Arbeta med samma fiktiva år: omsättning 200, kostnad för sålda varor 120 och övriga rörelsekostnader 50. Beräkna två marginaler, skilj observationer från antaganden och formulera vad nästa rapport behöver visa.',['gross-margin','operating-margin','thesis-evidence']],
  ['read-report','challenge','Milstolpe: förstå en rapport','statements',['financial-statements','report','fcf'],'research-nvda','Din tidigare tes gällde helåret. Rapporten innehåller kvartals-EPS 1,20, CFO 80 och kontant CapEx 30. Följ källan, perioden och pengarna. Bedöm sedan vilka delar av tesen som kan följas upp utan att blanda perioder.',['report-period','cash-quality']],
  ['build-thesis','challenge','Bygg en enkel investeringstes','research',['thesis','scenarios','report'],'workflow-manual-thesis','Skriv en tes för det fiktiva bolaget Lärdata AB: återkommande intäkter 100, rörelsemarginal 15 %, kundbortfall 8 %. Du antar intäktstillväxt 10 % nästa år. Pröva kravet mot priset och skriv mätbara antaganden. Du kan sedan använda Research för en egen tes, men lämna inga privata uppgifter här.',['thesis-evidence','reverse-check']],
  ['compare-investments','challenge','Milstolpe: jämför två investeringar','valuation',['cagr','enterprise-value','risk'],'tool-scenarios','A har 10 % jämn antagen avkastning i två år. B har EV-underlag 800 i börsvärde, 300 i skuld och 100 i kassa. Underlagen är avsiktligt olika: du ska både kunna räkna och upptäcka att ett framtida avkastningsantagande inte direkt kan jämföras med ett företagsvärde.',['compound-check','ev-check','risk-return']],
  ['cycle-study','case','Case: rekordåret i halvledarbolaget','valuation',['pe','fcf','position-sizing'],'research-mu','Helt syntetiskt bolag: Nordchip. Omsättning år 1/2/3: 100/160/200. EPS: 2/5/8. Kurs: 80. CFO: 20/35/30. CapEx: 10/20/35. Skuld: 40, kassa: 10. Rekord-EPS ger P/E 10, men FCF år 3 är −5. Undersök hur cykel, kapitalbehov och portföljvikt kan ändra tolkningen. Research-länken är ett separat källövningsverktyg, inte en källa för dessa påhittade tal.',['cycle-case','cash-growth','recovery-weight']],
  ['debt-study','case','Case: tillväxt, skuld och utspädning','statements',['debt','dilution','financial-statements'],'research-crwv','Helt syntetiskt bolag: Infrastruktur X. Omsättningen stiger 100 till 150, vinst 100 till 120 och aktier 100 till 150. Skuld är 300, kassa 20 och ett förfall på 200 väntar nästa år. CFO är 80, CapEx 30. Måtten har olika enheter: resultat/skuld är miljoner kronor och aktieantal miljoner. Undersök ägarens resultat och finansieringen före en optimistisk multipel.',['dilution-eps','leverage-case','cash-quality']]
 ];
 const objects=definitions.map(([id,type,title,category,concepts,entity,context,questionIds])=>({id,type,title,category,skill:category,difficulty:['case'].includes(type)?'advanced':type==='challenge'?'intermediate':'beginner',context,questions:questionIds.map(q),relatedConcepts:concepts,relatedEntityIds:[entity],prerequisites:concepts.map(id=>'lesson-'+id),completion:'all-questions',status:'published',accessTier:'free'}));
 for(const o of objects.filter(o=>['challenge','case'].includes(o.type)))o.questions.push(reflection('review',
   o.id==='build-thesis'?'Skriv tre antaganden, ett motbevis och ett granskningsdatum.':'Skriv vad du observerade, ett antagande och vad som skulle få dig att ompröva slutsatsen.',
   ['Skilj fakta från egna antaganden.','Ange minst ett mätbart motbevis och en kontrollpunkt.','Beskriv en begränsning i underlaget och nästa praktiska steg.']));
 const checks=A.lessons.flatMap(l=>l.quiz.map((v,i)=>({id:'check-'+l.id+'-'+i,type:'exercise',title:'Kontroll: '+l.title,category:l.category,skill:l.category,difficulty:l.difficulty,context:l.summary,questions:[choice('answer',v.question,v.options,v.answer,v.explanation)],relatedConcepts:[l.id],relatedEntityIds:l.relatedEntityIds,prerequisites:['lesson-'+l.id],completion:'all-questions',status:'published',accessTier:'free'})));
 objects.push(...checks);
 // Four focused exercises make all 20 new objective questions independently reachable.
 for(const [id,title,category,concept,entity] of [['gross-margin','Bruttomarginal','statements','marginal','research-nvda'],['operating-margin','Rörelsemarginal','statements','marginal','research-nvda'],['ev-check','Företagsvärde','valuation','enterprise-value','research-crwv'],['risk-return','Uppsida och risk','start','risk','tool-purchase']])objects.push({id:'exercise-'+id,type:'exercise',title,category,skill:category,difficulty:'intermediate',context:'Pröva begreppet med ett förenklat underlag. Använd lektionen om du vill repetera före svaret.',questions:[q(id)],relatedConcepts:[concept],relatedEntityIds:[entity],prerequisites:['lesson-'+concept],completion:'all-questions',status:'published',accessTier:'free'});
 const rules=Object.freeze({lesson:5,question:3,exercise:5,scenario:15,challenge:40,case:60,path:25});
 const levels=[['Ny',0],['Sparare',60],['Investerare',180],['Analytisk fördjupning',400],['Avancerad tillämpning',750]].map(([title,xp],i)=>({id:i+1,title,xp}));
 const roadmap=[
  ['start','Kom igång',['aktier','fonder','etf'],'recovery'],
  ['saving','Sparande och kostnader',['compounding','fees','gav','isk'],'cost-timing'],
  ['returns','Avkastning och valuta',['avkastning','currency','cagr'],'fx-outcome'],
  ['metrics','Förstå nyckeltal',['revenue','eps','marginal','dilution'],'share-count'],
  ['reports','Läs rapporterna',['financial-statements','fcf','debt'],'read-report'],
  ['valuation','Pröva värderingen',['pe','forward-metrics','enterprise-value','reverse','scenarios'],'compare-investments'],
  ['portfolio','Risk och portfölj',['risk','diversifiering','position-sizing'],'cycle-study'],
  ['macro','Tolka makro',['inflation','interest-rates'],'price-level'],
  ['research','Bygg och följ upp tesen',['thesis','report'],'build-thesis'],
  ['advanced','Tillämpa helheten',[],'debt-study']
 ].map(([id,title,lessons,milestone])=>({id,title,lessons,milestone,difficulty:['valuation','advanced'].includes(id)?'advanced':'intermediate'}));
 const achievements=[['first-lesson','Första lektionen','lesson',1],['ten-lessons','Tio lektioner','lesson',10],['first-check','Första kontrollen','exercise',1],['first-scenario','Första scenariot','scenario',1],['all-scenarios','Åtta perspektiv','scenario',8],['first-challenge','Första praktiska projektet','challenge',1],['first-case','Första caset','case',1],['first-path','Första lärspåret','path',1],['valuation-milestone','Värdering i praktiken','object','compare-investments'],['thesis-milestone','En prövbar övningstes','object','build-thesis']].map(([id,title,kind,target])=>({id,title,kind,target}));
 const published=()=>objects.filter(o=>o.status==='published');
 const url=id=>published().some(o=>o.id===id)?'academy-activity-'+id+'.html':null;
 function grade(question,answer){
  if(!question)return false;
  if(question.kind==='reflection')return typeof answer?.text==='string'&&answer.text.trim().split(/\s+/).length>=30&&answer.reviewed===true;
  if(question.kind==='numeric'){const text=String(answer??'').trim().replace(',','.');return text!==''&&Number.isFinite(Number(text))&&Math.abs(Number(text)-question.answer)<=question.tolerance;}
  if(question.kind==='multiple')return Array.isArray(answer)&&new Set(answer.map(Number)).size===question.answer.length&&[...new Set(answer.map(Number))].sort().join()===question.answer.slice().sort().join();
  return answer!==null&&answer!==''&&Number(answer)===question.answer;
 }
 // Common authoring view for lessons and interactive objects; stable IDs survive expansion.
 const learningObjects=()=>[
  ...A.published().map(l=>({id:'lesson-'+l.id,type:'lesson',title:l.title,category:l.category,relatedConcepts:l.relatedConcepts,relatedEntityIds:l.relatedEntityIds,skill:l.category,difficulty:l.difficulty,prerequisites:[],accessTier:'free',status:l.status,completion:'self-marked',xp:rules.lesson,url:A.url(l.id)})),
  ...published().map(o=>({...o,xp:rules[o.type],url:url(o.id)}))
 ];
 const api={version:1,objects,questions,rules,levels,roadmap,achievements,published,url,grade,learningObjects};
 root.NTMAcademyActivities=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
