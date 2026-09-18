/* V2 public contract. Build explicit fields; never sanitize a copied private object. */
(function(root){
 'use strict';
 const method='ntm-public-report/2', policy='sec-public-facts/1';
 const textKeys=['company','ticker','analysisDate','thesis','summary','assumptions','risks','falsification','sources','followUp','reviewDate','correction','basisDate'];
 const labels={thesis:'Investeringscaset',summary:'Sammanfattning',financial:'Finansiellt sammanhang',chart:'Intäkter över tid',assumptions:'Valda antaganden',risks:'Risker',falsification:'Vad kan göra detta fel?',followUp:'Uppföljning',reviewDate:'Avsett granskningsdatum',sources:'Författarens externa källor',correction:'Offentlig rättelse',company:'Bolag',ticker:'Ticker',analysisDate:'Analysdatum',basisDate:'Sparat underlag'};
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v),clone=v=>JSON.parse(JSON.stringify(v));
 const fail=()=>{throw Error('Rapportens underlag eller format kan inte publiceras säkert.');};
 const exact=(v,keys)=>{if(!object(v)||Object.keys(v).some(k=>!keys.includes(k)))fail();};
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 const stable=v=>JSON.stringify(Array.isArray(v)?v.map(x=>JSON.parse(stable(x))):object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(stable(v[k]))])):v);
 const freeze=v=>{if(object(v)||Array.isArray(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
 const number=n=>n.toLocaleString('sv-SE',{maximumFractionDigits:2});
 const factKeys=['metric','value','unit','currency','market','period','periodType','periodStart','periodEnd','observationDate','shareBasis','kind','source','methodVersion','retrievalStatus','rights'];
 const definitions={revenue:['RevenueFromContractWithCustomerExcludingAssessedTax','RevenueFromContractWithCustomerIncludingAssessedTax','Revenues','RevenuesNetOfInterestExpense'],operatingIncome:['OperatingIncomeLoss']};
 // Provider-neutral envelope. Shape eligibility is NOT permission to redistribute.
 function observationShape(f){
  exact(f,factKeys);if(Object.keys(f).length!==factKeys.length||!Number.isFinite(f.value))fail();
  for(const k of ['metric','unit','period','kind','methodVersion','retrievalStatus'])if(typeof f[k]!=='string'||!f[k]||f[k].length>160)fail();
  for(const k of ['currency','market','shareBasis'])if(f[k]!==null&&(typeof f[k]!=='string'||f[k].length>160))fail();
  if(!['annual','quarterly','ttm','point'].includes(f.periodType)||!date(f.observationDate)||!date(f.periodEnd)||(f.periodStart!==null&&!date(f.periodStart)))fail();
  exact(f.source,['provider','url','accession','date','definition']);
  for(const k of ['provider','url','definition'])if(typeof f.source[k]!=='string'||!f.source[k])fail();
  if(f.source.accession!==null&&typeof f.source.accession!=='string'||f.source.date!==null&&!date(f.source.date))fail();
  exact(f.rights,['policy','publicDisplay']);if(typeof f.rights.policy!=='string'||typeof f.rights.publicDisplay!=='boolean')fail();
  return f;
 }
 function validateFact(f){
  observationShape(f); // Current public-display policy: SEC annual revenue/operating income only.
  exact(f,factKeys);if(Object.keys(f).length!==factKeys.length)fail();
  if(!['revenue','operatingIncome'].includes(f.metric)||(!Number.isFinite(f.value)||Math.abs(f.value)>1e100)||f.kind!=='reported'||f.periodType!=='annual'||!/^FY\d{4}$/.test(f.period)||!date(f.periodStart)||!date(f.periodEnd)||f.observationDate!==f.periodEnd||f.shareBasis!==null||f.market!==null||!['USD'].includes(f.currency)||f.unit!==f.currency||f.retrievalStatus!=='frozen'||f.methodVersion!=='ntm-sec-normalizer/1')fail();
  const days=(Date.parse(f.periodEnd)-Date.parse(f.periodStart))/86400000+1;if(days<350||days>378)fail();
  exact(f.source,['provider','url','accession','date','definition']);exact(f.rights,['policy','publicDisplay']);
  if(f.source.provider!=='SEC'||!/^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/\d+\/\d+\/$/.test(f.source.url)||!/^\d{10}-\d{2}-\d{6}$/.test(f.source.accession)||!date(f.source.date)||f.source.date<f.periodEnd||typeof f.source.definition!=='string'||f.source.definition.length>160||!f.source.definition.startsWith(f.metric+':us-gaap:')||f.rights.policy!==policy||f.rights.publicDisplay!==true)fail();
  if(!definitions[f.metric].some(concept=>f.source.definition===f.metric+':us-gaap:'+concept)||!f.source.url.endsWith('/'+f.source.accession.replaceAll('-','')+'/'))fail();
  return f;
 }
 function projectFact(metric,m,cik){
  if(!m||m.kind!=='reported'||m.qualityStatus!=='available'||m.isDerived!==false||m.restated||m.split||m.correction||m.unsupported||m.source!=='SEC'||!/^\d{10}-\d{2}-\d{6}$/.test(m.accession||''))fail();
  if(m.publicDisplay===false||(m.rights!==undefined&&(m.rights?.policy!==policy||m.rights?.publicDisplay!==true))||!/^\d{1,10}$/.test(String(cik)))fail();
  return validateFact({metric,value:m.value,unit:m.unit,currency:m.currency,market:null,period:m.period,periodType:m.periodType,periodStart:m.periodStart,periodEnd:m.periodEnd,observationDate:m.periodEnd,shareBasis:null,kind:'reported',source:{provider:'SEC',url:`https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${m.accession.replaceAll('-','')}/`,accession:m.accession,date:m.filed,definition:m.definition},methodVersion:m.methodVersion,retrievalStatus:'frozen',rights:{policy,publicDisplay:true}});
 }
 function comparable(a,b){
  if(a.metric!==b.metric||a.unit!==b.unit||a.currency!==b.currency||a.source.definition!==b.source.definition||Number(b.period.slice(2))!==Number(a.period.slice(2))+1||Date.parse(b.periodStart)-Date.parse(a.periodEnd)!==86400000||Math.abs((Date.parse(b.periodEnd)-Date.parse(b.periodStart))-(Date.parse(a.periodEnd)-Date.parse(a.periodStart)))>86400000)fail();
 }
 function statement(type,observations){
  if(!Array.isArray(observations))fail();observations.forEach(validateFact);
  let text,calculation,dimension;
  if(type==='revenue-change'&&observations.length===2){const [a,b]=observations;comparable(a,b);if(a.metric!=='revenue'||a.value<=0||b.value<0)fail();const value=(b.value/a.value-1)*100;if(!Number.isFinite(value))fail();dimension='growth';text=`Intäkterna ändrades ${number(value)} % mellan ${a.period} och ${b.period}.`;calculation={formula:'(nytt / tidigare − 1) × 100',values:[value],unit:'%'};}
  else if(type==='operating-margin'&&observations.length===4){const [a,b,c,d]=observations;comparable(a,c);comparable(b,d);if(a.metric!=='operatingIncome'||b.metric!=='revenue'||b.value<=0||d.value<=0||![['period','periodStart','periodEnd','currency','unit']].every(([...keys])=>keys.every(k=>a[k]===b[k]&&c[k]===d[k])))fail();const values=[a.value/b.value*100,c.value/d.value*100];if(!values.every(Number.isFinite))fail();dimension='profitability';text=`Rörelsemarginalen gick från ${number(values[0])} % till ${number(values[1])} %.`;calculation={formula:'rörelseresultat / intäkter × 100',values,unit:'%'};}
  else fail();
  return {type,dimension,methodVersion:'ntm-fundamental/1',observations:clone(observations),calculation};
 }
 function validate(input){
  exact(input,['schemaVersion','methodVersion',...textKeys,'financial','chart']);
  if(input.schemaVersion!==2||input.methodVersion!==method)fail();
  for(const key of textKeys)if(Object.hasOwn(input,key)&&(typeof input[key]!=='string'||input[key].length>6000))fail();
  if(!input.company?.trim()||input.company.length>160||!input.ticker?.trim()||input.ticker.length>128||input.thesis?.trim().length<30||!input.thesis||!date(input.analysisDate)||!date(input.basisDate)||input.reviewDate&&!date(input.reviewDate))fail();
  if(!Array.isArray(input.financial)||input.financial.length>2||new Set(input.financial.map(s=>s.type)).size!==input.financial.length)fail();
  for(const s of input.financial){exact(s,['type','dimension','methodVersion','observations','calculation']);if(stable(s)!==stable(statement(s.type,s.observations)))fail();}
  if(input.chart!==undefined){exact(input.chart,['type','rows']);if(input.chart.type!=='revenue-annual'||!Array.isArray(input.chart.rows)||input.chart.rows.length<2||input.chart.rows.length>6)fail();let previous=null,defined=[];
   for(const row of input.chart.rows){exact(row,['period','observation']);if(!/^FY\d{4}$/.test(row.period)||previous&&Number(row.period.slice(2))!==Number(previous.slice(2))+1)fail();previous=row.period;
    if(row.observation!==null){const f=validateFact(row.observation);if(f.metric!=='revenue'||f.period!==row.period||f.value<0)fail();defined.push(f);}}
   if(defined.length<2||defined.some(f=>f.currency!==defined[0].currency||f.source.definition!==defined[0].source.definition))fail();
  }
  const facts=[...input.financial.flatMap(s=>s.observations),...(input.chart?.rows.map(r=>r.observation).filter(Boolean)||[])];
  if(facts.some(f=>f.source.date>input.analysisDate))fail();
  if(new TextEncoder().encode(JSON.stringify(input)).length>64000)fail();return freeze(clone(input));
 }
 function project(selection){
  exact(selection,[...textKeys,'financial','chart']);const out={schemaVersion:2,methodVersion:method};
  for(const k of textKeys)if(Object.hasOwn(selection,k)){if(typeof selection[k]!=='string')fail();const value=selection[k].trim();if(value||['company','ticker','thesis','analysisDate','basisDate'].includes(k))out[k]=value;}
  out.financial=selection.financial||[];if(selection.chart!==undefined)out.chart=selection.chart;return validate(out);
 }
 function candidates(revision,ticker){
  const snapshot=revision?.valuationSnapshot,f=snapshot?.provenance?.fundamental;
  if(!f||f.version!==1||f.statementMethod!=='ntm-fundamental/1'||snapshot.ticker!==ticker||!/^\d{1,10}$/.test(String(f.cik))||!root.NTMFundamentalProfile)return {statements:[],chart:null};
  const cik=f.cik;
  const data={$schema:'ntm-stock-v1',symbol:ticker,metadata:{methodVersion:snapshot.provenance.methodVersion,qualityStatus:'validated',profile:f.profile},annual:f.annual};
  const available=root.NTMFundamentalProfile.build(data).statements,statements=[];
  for(const s of available.filter(s=>s.status==='available'&&['revenue-change','operating-margin'].includes(s.statementType)))try{statements.push(statement(s.statementType,s.evidence.map(e=>projectFact(e.metric,e.fact,cik))));}catch(_){}
  let chart=null;try{const rows=f.annual,first=Number(rows[0].period.slice(2)),last=Number(rows.at(-1).period.slice(2));if(last-first>5)fail();const observations=[];
   for(let y=first;y<=last;y++){const period='FY'+y,row=rows.find(r=>r.period===period);let observation=null;try{observation=projectFact('revenue',row?.metrics?.revenue,cik);}catch(_){}observations.push({period,observation});}
   const test={company:'Test',ticker,thesis:'Synthetic validation of the frozen chart contract.',analysisDate:'9999-12-31',basisDate:'2026-01-01',financial:[],chart:{type:'revenue-annual',rows:observations}};chart=project(test).chart;
  }catch(_){}return {statements,chart};
 }
 function diff(before,after){return [...textKeys,'financial','chart'].filter(k=>stable(before?.[k]??null)!==stable(after?.[k]??null)).map(k=>({key:k,label:labels[k]||k,state:after?.[k]===undefined?'removed':before?.[k]===undefined?'added':'changed',before:before?.[k]??null,after:after?.[k]??null}));}
 const describe=s=>s.type==='revenue-change'?`Intäkterna ändrades ${number(s.calculation.values[0])} % mellan ${s.observations[0].period} och ${s.observations[1].period}.`:`Rörelsemarginalen gick från ${number(s.calculation.values[0])} % till ${number(s.calculation.values[1])} %.`;
 const api={observationShape,describe,method,policy,labels,textKeys,validate,project,projectFact,validateFact,statement,candidates,diff,stable};root.NTMPublicReport=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
