/* Wave 3: three bounded, synthetic competency pilots. No personal financial data. */
(function(root){
 'use strict';
 const version=1,delay=7*86400000;
 const competencies=[
  {id:'per-share',version,title:'Bolagets tillväxt och din andel',lessons:['eps','dilution','revenue'],activities:['share-count','debt-study'],knowledge:['eps','dilution'],goal:'Skilj total vinst från jämförbar vinst per aktie.'},
  {id:'valuation-return',version,title:'Antaganden och möjlig avkastning',lessons:['pe','cagr','reverse','scenarios'],activities:['price-vs-profit','forward-demand','compare-investments'],knowledge:['pe','cagr'],goal:'Koppla EPS, tillväxt, slutmultipel och pris till en modellerad årsavkastning.'},
  {id:'real-fx',version,title:'Avkastning, köpkraft och valuta',lessons:['currency','inflation','compounding','avkastning'],activities:['fx-outcome','price-level','cost-timing'],knowledge:['fx','inflation','compounding'],goal:'Skilj nominellt utfall, valutaeffekt och köpkraft med samma period.'}
 ];
 const tasks=[];
 const contexts=['practice','practice','application','application','delayed','delayed'];
 // Different numerical and interpretative variants; no historical activity answer is reused.
 for(let n=0;n<contexts.length;n++){
  const context=contexts[n],variant='v'+(n+1),common={version,variant,context};
  const profit0=180+n*30,shares0=60+n*10,profit1=profit0*(1.18+n*.02),shares1=shares0*(1.30+n*.03),eps=profit1/shares1;
  tasks.push({...common,id:'per-share-'+variant,competency:'per-share',prompt:`Syntetiskt bolag, jämförbara helår och aktier. Vinst ${profit0} → ${profit1.toFixed(2)} miljoner SEK; genomsnittliga aktier ${shares0} → ${shares1.toFixed(2)} miljoner. Ange ny EPS (SEK/aktie). Vad hände med EPS trots högre total vinst?`,answer:eps,choice:1,choices:['EPS steg','EPS föll','EPS var oförändrad'],tolerance:.01,explanation:`Ny EPS är ${profit1.toFixed(2)} / ${shares1.toFixed(2)} = ${eps.toFixed(4)} SEK. Tidigare EPS var 3. Aktiebasen växte snabbare än vinsten. Samma period, valuta och jämförbar aktiebas behövs.`,scenario:null});
  const price=84+n*12,startEps=4+n*.5,growth=8+n,years=3+n%3,multiple=22+n,annual=((startEps*(1+growth/100)**years*multiple/price)**(1/years)-1)*100;
  tasks.push({...common,id:'valuation-return-'+variant,competency:'valuation-return',prompt:`Syntetiskt scenario: pris ${price} USD, EPS ${startEps} USD/aktie, EPS-tillväxt ${growth} %/år, ${years} år, slut-P/E ${multiple}. Inga utdelningar, avgifter eller skatt. Ange modellerad årsavkastning (%). Vad beskriver resultatet?`,answer:annual,choice:1,choices:['En garanterad avkastning','Ett utfall om de valda antagandena stämmer','En verifierad framtida kurs'],tolerance:.03,explanation:`Slut-EPS = ${startEps} × (1 + ${growth}/100)^${years}; slutpris = slut-EPS × ${multiple}. Årsavkastning = (slutpris / ${price})^(1/${years}) − 1 = ${annual.toFixed(4)} %. Det är ett scenario, inte ett löfte.`,scenario:{destination:'valuation-simple',inputs:{price,eps:startEps,growth,years,multiple}}});
  const asset=12+n*2,fx=-5-n,inflation=3+n*.5,nominal=(1+asset/100)*(1+fx/100)-1,real=(1+nominal)/(1+inflation/100)-1;
  tasks.push({...common,id:'real-fx-'+variant,competency:'real-fx',prompt:`Syntetiskt ettårigt innehav: avkastning i USD ${asset} %, USD kostar ${Math.abs(fx)} % färre SEK, svensk inflation ${inflation} %. Inga avgifter, skatter eller insättningar. Ange real avkastning i SEK (%). Vilken jämförelse stämmer?`,answer:real*100,choice:0,choices:['Real SEK-avkastning är lägre än nominell SEK-avkastning','Real och nominell SEK-avkastning är samma','Valutaförändringen kan ignoreras'],tolerance:.03,explanation:`Nominellt i SEK: (1 + ${asset}/100) × (1 + ${fx}/100) − 1 = ${(nominal*100).toFixed(4)} %. Köpkraft: (1 + nominell avkastning) / (1 + ${inflation}/100) − 1 = ${(real*100).toFixed(4)} %. Samma ettårsperiod; inflation dras inte bara från en flerårig totalsiffra.`,scenario:{destination:'fx-percent',inputs:{asset,fx,amount:10000}},savings:{destination:'savings-capital',inputs:{start:10000,monthly:0,years:1,rate:nominal*100,fee:0,inflation}}});
  if(context==='application'){
   const share=tasks.at(-3),valuation=tasks.at(-2),purchasing=tasks.at(-1);
   share.prompt=`En syntetisk rapport lyfter högre total vinst: ${profit0} → ${profit1.toFixed(2)} miljoner SEK. Jämförbar genomsnittlig aktiebas: ${shares0} → ${shares1.toFixed(2)} miljoner. Som ägare vill du jämföra utvecklingen per aktie. Ange EPS-förändringen i procent, inte ny EPS. Vilken riktning fick EPS?`;
   share.answer=(eps/3-1)*100;share.explanation+=` EPS-förändringen är (${eps.toFixed(4)} / 3 − 1) × 100 ≈ ${share.answer.toFixed(4)} %.`;
   valuation.prompt+=` Jämför dessutom med ett eget mål på 10 %/år.`;
   valuation.choices=['Scenariot överstiger 10 %/år, men är ingen garanti','Scenariot understiger 10 %/år','Priset garanterar målet'];valuation.choice=0;
   purchasing.prompt=`Ett syntetiskt målsparande börjar med 10 000 SEK utan insättningar. Under ett år ger tillgången ${asset} % i USD, USD kostar ${Math.abs(fx)} % färre SEK och svensk inflation är ${inflation} %. Inga avgifter eller skatter. Ange slutkapitalet i startårets köpkraft (SEK), inte avkastningen i procent. Vilken jämförelse stämmer?`;
   purchasing.answer=10000*(1+real);purchasing.tolerance=.5;purchasing.explanation+=` 10 000 × (1 + real avkastning) ≈ ${purchasing.answer.toFixed(2)} SEK i startårets köpkraft.`;
  }
 }
 const task=id=>tasks.find(t=>t.id===id);
 const grade=(t,n,c)=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n-t.answer)<=t.tolerance&&Number(c)===t.choice;
 const api={version,delay,competencies,tasks,task,grade};root.NTMAcademyCompetencies=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
