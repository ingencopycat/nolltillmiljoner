/* Bounded Research base-scenario handoff. No journal, account or global state. */
(function(root){
 'use strict';
 const ttl=15*60*1000,key='ntm-wave1-handoff-v1';
 const tickers=['NVDA','SOFI','CRWD','MU','MRVL','VRT','COHR','RKLB','TTMI','SNDK','FLY','CRWV'];
 const companies={"COHR":{"name":"COHERENT CORP.","sourceUrl":"https://data.sec.gov/api/xbrl/companyfacts/CIK0000820318.json"},"CRWD":{"name":"CrowdStrike Holdings, Inc.","sourceUrl":"https://data.sec.gov/api/xbrl/companyfacts/CIK0001535527.json"},"CRWV":{"name":"CoreWeave, Inc.","sourceUrl":"https://data.sec.gov/api/xbrl/companyfacts/CIK0001769628.json"},"FLY":{"name":"Firefly Aerospace Inc.","sourceUrl":"https://data.sec.gov/api/xbrl/companyfacts/CIK0001860160.json"},"MRVL":{"name":"Marvell Technology, Inc.","sourceUrl":"https://data.sec.gov/api/xbrl/companyfacts/CIK0001835632.json"},"MU":{"name":"MICRON TECHNOLOGY INC","sourceUrl":"https://data.sec.gov/api/xbrl/companyfacts/CIK0000723125.json"},"NVDA":{"name":"NVIDIA CORP","sourceUrl":"https://data.sec.gov/api/xbrl/companyfacts/CIK0001045810.json"},"RKLB":{"name":"Rocket Lab Corp","sourceUrl":"https://data.sec.gov/api/xbrl/companyfacts/CIK0001819994.json"},"SNDK":{"name":"Sandisk Corp","sourceUrl":"https://data.sec.gov/api/xbrl/companyfacts/CIK0002023554.json"},"SOFI":{"name":"SoFi Technologies, Inc.","sourceUrl":"https://data.sec.gov/api/xbrl/companyfacts/CIK0001818874.json"},"TTMI":{"name":"TTM TECHNOLOGIES INC","sourceUrl":"https://data.sec.gov/api/xbrl/companyfacts/CIK0001116942.json"},"VRT":{"name":"Vertiv Holdings Co","sourceUrl":"https://data.sec.gov/api/xbrl/companyfacts/CIK0001674101.json"}};
 const shape=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===keys.slice().sort().join(',');
 const text=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[<>\u0000-\u001f]/.test(v);
 const date=v=>v===null||typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 const number=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
 function validate(v,now=Date.now()){
  if(v?.kind==='academy-scenario')return validatePractice(v,now);
  if(!shape(v,['kind','schemaVersion','source','destination','createdAt','expiresAt','company','method','inputs','basis']))throw Error('Ogiltigt överföringsformat. Öppna en ny förhandsvisning från Research.');
  if(v.kind!=='research-base-scenario'||v.schemaVersion!==1||v.source!=='research'||v.destination!=='valuation-simple'||v.method!=='research-base-inputs/1')throw Error('Okänd version eller beräkningsgrund.');
  if(!Number.isSafeInteger(v.createdAt)||!Number.isSafeInteger(v.expiresAt)||v.expiresAt-v.createdAt!==ttl||v.createdAt>now||now>=v.expiresAt)throw Error('Överföringen har gått ut eller har fel tid. Öppna den igen från Research.');
  if(!shape(v.company,['ticker','name','currency'])||!tickers.includes(v.company.ticker)||!text(v.company.name,160)||v.company.name!==companies[v.company.ticker]?.name||v.company.currency!=='USD')throw Error('Bolag eller valuta stöds inte i denna överföring.');
  const i=v.inputs,b=v.basis;
  if(!shape(i,['price','eps','growth','years','multiple'])||!number(i.price,.01,1e9)||!number(i.eps,.01,1e9)||!number(i.growth,-99.9,1000)||!number(i.years,1,50)||!Number.isInteger(i.years)||!number(i.multiple,.1,1000))throw Error('Ange giltiga värden och positiv EPS i Research innan du fortsätter.');
  if(!shape(b,['priceSource','priceDate','epsSource','epsUnit','growthUnit','period','periodEnd','filed','sourceMethod','shareBasis','sourceUrl']))throw Error('Källunderlag saknas.');
  if(!['example','manual','historical'].includes(b.priceSource)||b.priceDate!==null||!['manual','sec-derived'].includes(b.epsSource)||b.epsUnit!=='USD/share'||b.growthUnit!=='percent/year'||!date(b.periodEnd)||!date(b.filed)||!text(b.period,80)||!text(b.sourceMethod,100)||!['verified','unverified','manual'].includes(b.shareBasis))throw Error('Enhet, datum eller källgrund stämmer inte.');
  if(b.sourceUrl!==companies[v.company.ticker].sourceUrl||!/^https:\/\/data\.sec\.gov\/api\/xbrl\/companyfacts\/CIK\d{10}\.json$/.test(b.sourceUrl))throw Error('Källadressen stöds inte.');
  if(b.epsSource==='sec-derived'&&(b.periodEnd===null||b.filed===null||b.sourceMethod==='manual'||b.shareBasis==='manual'))throw Error('EPS-underlaget är ofullständigt.');
  if(b.epsSource==='manual'&&(b.shareBasis!=='manual'||b.sourceMethod!=='manual'||b.period!=='Eget EPS-antagande'||b.periodEnd!==null||b.filed!==null))throw Error('Manuell EPS får inte presenteras som bolagsdata.');
  return v;
 }
 const practiceMethods={
  'valuation-simple':{method:'stock-simple/1',units:'USD,USD/share,percent/year,years,PE',fields:{price:[.01,1e9],eps:[.01,1e9],growth:[-99.9,1000],years:[1,50],multiple:[.1,1000]}},
  'fx-percent':{method:'fx-multiplicative/1',units:'percent,SEK',fields:{asset:[-100,1000],fx:[-100,1000],amount:[0,1e9]}},
  'savings-capital':{method:'savings-effective-rate/1',units:'SEK,SEK/month,years,percent/year',fields:{start:[0,1e9],monthly:[0,1e8],years:[1,50],rate:[-99.9,1000],fee:[0,99],inflation:[-99,1000]}}
 };
 function validatePractice(v,now=Date.now()){
  if(!shape(v,['kind','schemaVersion','source','destination','createdAt','expiresAt','exercise','method','units','inputs'])||v.schemaVersion!==1||v.source!=='academy'||!shape(v.exercise,['competency','task','version'])||!['per-share','valuation-return','real-fx'].includes(v.exercise.competency)||!new RegExp('^'+v.exercise.competency+'-v[1-6]$').test(v.exercise.task)||v.exercise.version!==1)throw Error('Okänd övning eller överföringsversion.');
  const m=practiceMethods[v.destination];if(!m||v.method!==m.method||v.units!==m.units||!shape(v.inputs,Object.keys(m.fields))||Object.entries(m.fields).some(([k,[min,max]])=>!number(v.inputs[k],min,max))||v.inputs.years!==undefined&&!Number.isInteger(v.inputs.years))throw Error('Övningens enheter, metod eller inmatningar stämmer inte.');
  if((v.destination==='valuation-simple')!==(v.exercise.competency==='valuation-return')||v.destination!=='valuation-simple'&&v.exercise.competency!=='real-fx')throw Error('Fel verktyg för övningen.');
  if(!Number.isSafeInteger(v.createdAt)||!Number.isSafeInteger(v.expiresAt)||v.expiresAt-v.createdAt!==ttl||v.createdAt>now||now>=v.expiresAt)throw Error('Övningsöverföringen har gått ut eller har fel tid. Öppna en ny förhandsvisning.');
  return v;
 }
 function createPractice(exercise,scenario,now=Date.now()){
  const m=practiceMethods[scenario.destination];return validatePractice({kind:'academy-scenario',schemaVersion:1,source:'academy',destination:scenario.destination,createdAt:now,expiresAt:now+ttl,exercise,method:m?.method,units:m?.units,inputs:{...scenario.inputs}},now);
 }
 function create(company,inputs,basis,now=Date.now()){
  return validate({kind:'research-base-scenario',schemaVersion:1,source:'research',destination:'valuation-simple',createdAt:now,expiresAt:now+ttl,company,method:'research-base-inputs/1',inputs,basis},now);
 }
 function pack(token,payload){if(!/^[a-f0-9-]{36}$/.test(token))throw Error('Ogiltig referens.');return JSON.stringify({token,payload:validate(payload)});}
 function unpack(raw,token,now=Date.now()){
  if(typeof raw!=='string'||raw.length>6000||!/^[a-f0-9-]{36}$/.test(token))throw Error('Överföringen saknas i denna flik. Öppna den igen från Research.');
  let record;try{record=JSON.parse(raw);}catch(_){throw Error('Överföringen kunde inte läsas.');}
  if(!shape(record,['token','payload'])||record.token!==token)throw Error('Överföringen tillhör en annan förhandsvisning.');
  return validate(record.payload,now);
 }
 const api={ttl,key,tickers,validate,create,createPractice,pack,unpack};root.NTMWave1Context=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
