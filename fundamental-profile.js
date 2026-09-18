/* Bounded Wave 4 evidence. Pure, deterministic; no scores, storage or network. */
(function(root){
 'use strict';
 const VERSION='ntm-fundamental/1', copy=v=>JSON.parse(JSON.stringify(v)), finite=Number.isFinite;
 const profiles=['standard_company','software_saas','financial_services','financing_sensitive','limited_history'];
 const titles={growth:'Tillväxt',profitability:'Lönsamhet',cash:'Kassagenerering',balance:'Balansräkning',perShare:'Per aktie',momentum:'Rapporterad utveckling',quality:'Datakvalitet'};
 const fmt=n=>n.toLocaleString('sv-SE',{maximumFractionDigits:2});
 const days=m=>(Date.parse(m?.periodEnd)-Date.parse(m?.periodStart))/86400000+1;
 const iso=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&finite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 function factReason(m,method){
  if(!m||!finite(m.value)||m.unsupported||m.qualityStatus!=='available')return 'Värde saknas eller är undanhållet.';
  if(!['definition','unit','source','methodVersion'].every(k=>typeof m[k]==='string'&&m[k])||m.methodVersion!==method)return 'Definition, enhet, källa eller metod saknas eller skiljer sig.';
  if(!['reported','derived'].includes(m.kind)||m.isDerived!==(m.kind==='derived'))return 'Rapporterad och härledd uppgift kan inte fastställas.';
  if(m.restated||m.split||m.correction)return 'Omräkning, rättelse eller split kräver granskning.';
  if(m.periodType!=='annual'||!/^FY\d{4}$/.test(m.period||'')||!iso(m.periodStart)||!iso(m.periodEnd)||!finite(days(m))||days(m)<350||days(m)>378)return 'Jämförbara helårsperioder saknas.';
  if(m.unit!=='shares'&&(typeof m.currency!=='string'||!m.currency||!m.unit.startsWith(m.currency)))return 'Valuta eller enhet saknas eller stämmer inte.';
  if(m.kind==='reported'&&(!m.accession||!m.concept))return 'Rapportens accession eller begrepp saknas.';
  if(m.kind==='derived'&&(!m.derivationMethod||!Array.isArray(m.sourceFilings)||!m.sourceFilings.length||m.sourceFilings.some(s=>!s?.accession)))return 'Härledningens metod eller rapportkällor saknas.';
  return null;
 }
 function compare(a,b,method){
  const invalid=factReason(a,method)||factReason(b,method);if(invalid)return invalid;
  for(const key of ['definition','unit','currency','kind','source','derivationMethod'])if(a[key]!==b[key])return 'Definition, enhet, valuta eller härledning skiljer sig.';
  if(Number(b.period.slice(2))!==Number(a.period.slice(2))+1||Date.parse(b.periodStart)-Date.parse(a.periodEnd)!==86400000)return 'Perioder saknas, överlappar eller följer inte på varandra.';
  // At most one leap day. 52/53-week changes require a separate reviewed method.
  if(Math.abs(days(a)-days(b))>1)return 'Periodernas längd skiljer sig.';
  return null;
 }
 function aligned(ms){return ms.every(m=>m&&m.period===ms[0]?.period&&m.periodStart===ms[0]?.periodStart&&m.periodEnd===ms[0]?.periodEnd);}
 function build(data){
  const method=data?.metadata?.methodVersion,profile=data?.metadata?.profile;
  let base=data?.$schema!=='ntm-stock-v1'||data?.metadata?.qualityStatus!=='validated'||!profiles.includes(profile)?'Datamängd eller bolagsprofil stöds inte.':null;
  const annual=Array.isArray(data?.annual)?data.annual:[],last=annual.at(-1),prior=annual.at(-2),earlier=annual.at(-3);
  if(annual.some(r=>!r||typeof r.period!=='string')||new Set(annual.map(r=>r?.period)).size!==annual.length||annual.some((r,i)=>i&&r?.period<=annual[i-1]?.period))base='Helårsperioder saknas, är dubblerade eller inte kronologiska.';
  if(annual.slice(-3).some(row=>Object.values(row?.metrics||{}).some(m=>m&&finite(m.value)&&['period','periodStart','periodEnd'].some(k=>m[k]!==row[k]))))base='Periodens identitet stämmer inte med dess observationer.';
  const get=(row,key)=>row?.metrics?.[key]||null;
  function metricReason(row,key){
   const m=get(row,key),r=factReason(m,method);if(r)return r;
   if(!m.definition.startsWith(key+':'))return 'Måttets definition motsvarar inte dess identitet.';
   const unit=key==='dilutedShares'?'shares':key==='dilutedEps'?m.currency+'/shares':m.currency;
   return m.unit!==unit?'Enheten motsvarar inte måttets definition.':null;
  }
  const result=[],evidence=(rows,keys)=>rows.flatMap(row=>keys.map(metric=>({metric,period:row?.period||null,fact:copy(get(row,metric))})));
  function add(dimension,type,rows,keys,reason,text,calculation=null,limitations=''){
   const r=base||reason;
   const s={schemaVersion:1,methodVersion:VERSION,dataMethodVersion:method||null,company:data?.symbol||null,profile:profile||null,dimension,statementType:type,
    status:r?'unavailable':'available',eligibility:{eligible:!r,reason:r||null},text:r?'Otillräckligt underlag för att bedöma utvecklingen.':text,
    comparisonBasis:type==='dated-components'?'Senaste tillgängliga helårets balansdag':'På varandra följande helår; högst en dags längdskillnad',
    evidence:evidence(rows,keys),calculation:r?null:calculation,interpretationKind:'descriptive',userAssumptions:[],limitations};
   result.push(s);return s;
  }
  const pair=key=>metricReason(prior,key)||metricReason(last,key)||compare(get(prior,key),get(last,key),method);
  const revA=get(prior,'revenue'),revB=get(last,'revenue');
  let reason=pair('revenue')||(revA.value<=0?'Procentutveckling kräver ett positivt basvärde.':null)||(revB.value<0?'Negativa intäkter kräver särskild metod.':null);
  const growth=reason?null:(revB.value/revA.value-1)*100;
  if(growth!==null&&!finite(growth))reason='Förändringen kan inte beräknas som ett ändligt tal.';
  add('growth','revenue-change',[prior,last],['revenue'],reason,` ${profile==='financial_services'?'Nettointäkterna':'Omsättningen'} ${growth>0?'ökade':growth<0?'minskade':'var oförändrad'} mellan ${prior?.period} och ${last?.period}${growth===0?'.':` med ${fmt(Math.abs(growth||0))} %.`}`.trim(),{kind:'NTM calculation',formula:'(nytt / tidigare − 1) × 100',value:growth,unit:'%'});
  const opA=get(prior,'operatingIncome'),opB=get(last,'operatingIncome');
  reason=profile==='financial_services'?'Industrimarginal används inte för finansiella bolag.':pair('revenue')||pair('operatingIncome')||(!aligned([revA,opA])||!aligned([revB,opB])?'Täljare och nämnare har olika perioder.':null)||(revA.value<=0||revB.value<=0?'Marginal kräver positiva intäkter.':null);
  const margins=reason?null:[opA.value/revA.value*100,opB.value/revB.value*100];
  if(margins&&(!margins.every(finite)||!finite(margins[1]-margins[0])))reason='Marginalförändringen kan inte beräknas som ett ändligt tal.';
  add('profitability','operating-margin',[prior,last],['operatingIncome','revenue'],reason,margins?`Rörelsemarginalen gick från ${fmt(margins[0])} % till ${fmt(margins[1])} % (${fmt(margins[1]-margins[0])} procentenheter).`:'',margins?{kind:'NTM calculation',formula:'rörelseresultat / intäkter × 100; ny marginal − tidigare marginal',values:margins,value:margins[1]-margins[0],unit:'procentenheter'}:null,'Marginalens riktning avgör inte investeringens utfall.');
  const cashKeys=['freeCashFlow','operatingCashFlow','capex'];
  reason=profile==='financial_services'?'FCF är undanhållet för denna finansiella bolagsprofil.':cashKeys.map(pair).find(Boolean);
  if(!reason)for(const row of [prior,last]){
   const [fcf,ocf,capex]=cashKeys.map(k=>get(row,k));
   if(!aligned([fcf,ocf,capex])||new Set([fcf.currency,ocf.currency,capex.currency]).size!==1||fcf.derivationMethod!=='operatingCashFlow_minus_capex'||capex.value<0||Math.abs(fcf.value-(ocf.value-capex.value))>0.01)reason='FCF-komponenter eller avstämning stöds inte.';
  }
  const cf=reason?null:[get(prior,'freeCashFlow').value,get(last,'freeCashFlow').value];
  add('cash','fcf-change',[prior,last],cashKeys,reason,cf?`Fritt kassaflöde gick från ${fmt(cf[0])} till ${fmt(cf[1])} ${get(last,'freeCashFlow').currency}.`:'',cf?{kind:'NTM calculation',formula:'operativt kassaflöde − CapEx',values:cf,unit:get(last,'freeCashFlow').unit}:null,'FCF enligt befintlig definition. Förvärv, finansiering och aktiebaserad ersättning dras inte separat av. Inte universellt jämförbart mellan branscher.');
  const cash=get(last,'cashAndCashEquivalents'),debt=get(last,'debt');
  reason=metricReason(last,'cashAndCashEquivalents')||metricReason(last,'debt')||(!aligned([cash,debt])||cash.currency!==debt.currency?'Balanskomponenternas datum eller valuta skiljer sig.':null);
  add('balance','dated-components',[last],['cashAndCashEquivalents','debt'],reason,reason?'':`På balansdagen ${cash.periodEnd}: likvida medel ${fmt(cash.value)} ${cash.currency}; rapporterad skuldkomponent ${fmt(debt.value)} ${debt.currency}.`,null,'Skuldkomponentens definition visas i underlaget. Ingen slutsats om nettokassa, fullständig skuldsättning, likviditetskvalitet eller fritt disponibla medel.');
  const psKeys=['netIncomeToCommon','dilutedEps','dilutedShares'];
  reason=psKeys.map(pair).find(Boolean);
  if(!reason)for(const row of [prior,last]){
   const [income,eps,shares]=psKeys.map(k=>get(row,k));
   if(!aligned([income,eps,shares])||income.currency!==eps.currency||eps.unit!==income.currency+'/shares'||shares.unit!=='shares')reason='Vinst, EPS och antal aktier har oförenliga perioder eller enheter.';
   else if([eps,shares].some(m=>m.shareBasisStatus!=='verified'||m.shareBasis!=='weighted_average_diluted')||shares.concept!=='WeightedAverageNumberOfDilutedSharesOutstanding')reason='Verifierad, splitjämförbar vägd utspädd aktiebas saknas. Punktantal aktier får inte användas.';
   else if(income.value<=0||eps.value<=0||shares.value<=0)reason='R6 kräver positiva vinst-, EPS- och aktiebaser i båda perioderna.';
   else if(Math.abs(income.value/shares.value-eps.value)>0.011)reason='Rapporterad EPS kan inte stämmas av mot motsvarande vinst och aktienämnare.';
  }
  const rates=reason?null:psKeys.slice(0,2).map(k=>(get(last,k).value/get(prior,k).value-1)*100);
  if(rates&&(!rates.every(finite)||!finite(rates[0]-rates[1])))reason='Per-aktie-jämförelsen kan inte beräknas som ett ändligt tal.';
  add('perShare','R6',[prior,last],psKeys,reason,rates?`Vinsten till stamaktieägare ändrades ${fmt(rates[0])} % och utspädd vinst per aktie ${fmt(rates[1])} %.${rates[0]>rates[1]+0.1&&rates[0]>0?' Vinsten växer snabbare än vinsten per aktie.':''}`:'',rates?{kind:'NTM calculation',formula:'(nytt / tidigare − 1) × 100 för vinst respektive EPS',values:rates,gap:rates[0]-rates[1],displayTolerance:0.1,unit:'procentenheter'}:null,'R6:s tolerans 0,1 procentenhet är en visningsregel, inte investeringsväsentlighet. Ingen automatisk slutsats om utspädningsproblem.');
  reason=metricReason(earlier,'revenue')||compare(get(earlier,'revenue'),revA,method)||pair('revenue')||([get(earlier,'revenue'),revA,revB].some(m=>m.value<=0)?'Tre positiva, jämförbara observationer krävs.':null);
  const momentum=reason?null:[(revA.value/get(earlier,'revenue').value-1)*100,(revB.value/revA.value-1)*100];
  if(momentum&&!momentum.every(finite))reason='Årsförändringarna kan inte beräknas som ändliga tal.';
  add('momentum','revenue-rate-direction',[earlier,prior,last],['revenue'],reason,momentum?`Intäkternas årsförändring gick från ${fmt(momentum[0])} % till ${fmt(momentum[1])} %.`:'',momentum?{kind:'NTM calculation',formula:'(nytt / tidigare − 1) × 100 för två intilliggande årpar',values:momentum,unit:'%'}:null,'Avser rapporterade fundamenta. Säger inget om aktiekursens momentum eller framtida utveckling.');
  const blocked=result.filter(s=>s.status==='unavailable').map(s=>({dimension:s.dimension,reason:s.eligibility.reason}));
  const quality=add('quality','coverage-diagnostic',[],[],base,`${result.length-blocked.length} av ${result.length} avgränsade beskrivningar har underlag. ${blocked.length} saknar jämförbart underlag. Senaste tillgängliga helår: ${last?.period||'saknas'}, slutdatum ${last?.periodEnd||'saknas'}.`,null,'Diagnostik av NTM:s underlag, inte bolagets kvalitet. Hämtningstid är inte rapportperiod.');
  quality.diagnostics={annualObservations:annual.length,latestPeriodEnd:last?.periodEnd||null,fetchedAt:data?.metadata?.fetchedAt||null,updateStatus:data?.metadata?.updateStatus||'unknown',blocked};
  return {schemaVersion:1,methodVersion:VERSION,company:data?.symbol||null,statements:result};
 }
 const api={version:VERSION,titles,build,compare,factReason};root.NTMFundamentalProfile=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
