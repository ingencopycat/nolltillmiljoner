/* Reviewed company observations. Pure, issuer-scoped evidence APIs; no snapshot writes. */
(function(root){
 'use strict';
 const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 function validate(data,ticker,cik){
  if(data?.schema!=='ntm-reviewed-observations/1'||!Array.isArray(data.observations)||!Array.isArray(data.pendingReview))throw Error('Invalid observations');
  const seen=new Set();
  for(const o of data.observations){
   if(o.ticker!==ticker||o.cik!==cik||seen.has(o.id)||typeof o.id!=='string'||!iso(o.publicationDate)||!['guidance','kpi'].includes(o.kind)||!['quarter','annual','instant'].includes(o.period?.type)||!o.period.label||o.period.end&&!iso(o.period.end)||!o.basis||!o.definitionVersion||!o.metricId||o.review?.status!=='reviewed')throw Error('Invalid observation');
   seen.add(o.id);
   const s=o.source,acc=s?.accessionNumber,base=`https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc?.replaceAll('-','')}/`;
   if(!/^\d{10}-\d{2}-\d{6}$/.test(acc)||!s.url?.startsWith(base)||! /^[A-Za-z0-9_-]+\.html?$/.test(s.url.slice(base.length))||!s.quote||! /^[a-f0-9]{64}$/.test(s.quoteSha256))throw Error('Invalid provenance');
   const v=o.value;if(!v||!['point','range','qualitative','withdrawn'].includes(v.kind)||v.kind==='point'&&!Number.isFinite(v.point)||v.kind==='range'&&(!Number.isFinite(v.lower)||!Number.isFinite(v.upper)||v.lower>v.upper)||v.kind==='qualitative'&&!v.text)throw Error('Invalid value');
  }
  return data;
 }
 const group=o=>[o.ticker,o.kind,o.metricId,o.period.type,o.period.label,o.period.end].join('|');
 const sameBasis=(a,b)=>['ticker','kind','metricId','unit','currency','basis','definitionVersion'].every(k=>a[k]===b[k])&&a.period.type===b.period.type;
 const bounds=o=>o.value.kind==='point'?[o.value.point,o.value.point]:o.value.kind==='range'?[o.value.lower,o.value.upper]:null;
 function compare(a,b){
  if(!a||!b)return {comparable:false,reason:'Historik saknas'};
  if(!sameBasis(a,b))return {comparable:false,reason:'Ej jämförbart · ändrad definition eller basis'};
  if(a.kind==='guidance'&&group(a)!==group(b))return {comparable:false,reason:'Olika målperioder'};
  if(a.kind==='kpi'){
   const days=(Date.parse(b.period.end)-Date.parse(a.period.end))/86400000;
   if(!Number.isFinite(days)||days<60||days>105)return {comparable:false,reason:'Sammanhängande kvartal saknas'};
  }
  const x=bounds(a),y=bounds(b);
  if(!x||!y)return {comparable:false,reason:b.value.kind==='withdrawn'?'Återkallad guidning':'Kvalitativ uppgift',textChanged:JSON.stringify(a.value)!==JSON.stringify(b.value)};
  const direction=x[0]===y[0]&&x[1]===y[1]?'unchanged':y[0]>=x[0]&&y[1]>=x[1]?'raised':y[0]<=x[0]&&y[1]<=x[1]?'lowered':'mixed';
  const oldWidth=x[1]-x[0],newWidth=y[1]-y[0];
  const equalWidth=Math.abs(newWidth-oldWidth)<=Number.EPSILON*8*Math.max(1,...x.map(Math.abs),...y.map(Math.abs));
  return {comparable:true,direction,width:equalWidth?'unchanged':newWidth>oldWidth?'widened':'narrowed',changePercent:a.kind==='kpi'&&x[0]!==0?(y[0]/x[0]-1)*100:null,approximate:a.value.approximate||b.value.approximate};
 }
 function asOf(data,date){
  const day=String(date).slice(0,10);if(!iso(day))return [];
  const items=data.observations.filter(o=>o.publicationDate<=day).sort((a,b)=>a.publicationDate.localeCompare(b.publicationDate)||a.id.localeCompare(b.id));
  return items.map(o=>{const later=items.filter(x=>group(x)===group(o)&&x.publicationDate>o.publicationDate).at(-1);return {...o,status:later?'superseded':o.value.kind==='withdrawn'?'withdrawn':'latest_disclosed',supersededBy:later?.id||null};});
 }
 function changesSince(data,savedAt,until=new Date().toISOString()){
  if(!Number.isFinite(Date.parse(savedAt)))return [];
  const day=new Date(savedAt).toISOString().slice(0,10),history=asOf(data,until);
  return history.filter(o=>o.publicationDate>day).map(o=>{
   const previous=history.filter(p=>p.publicationDate<o.publicationDate&&p.kind===o.kind&&p.metricId===o.metricId&&p.ticker===o.ticker&&(o.kind==='kpi'?p.period.type===o.period.type:group(p)===group(o))).at(-1);
   return {observation:o,previous:previous||null,newGuidance:o.kind==='guidance',comparison:compare(previous,o)};
  });
 }
 const fmt=(v,unit)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:unit==='USD'?4:2}).format(v/(unit==='USD'&&Math.abs(v)>=1e9?1e9:unit==='USD'&&Math.abs(v)>=1e6?1e6:unit==='count'&&Math.abs(v)>=1e6?1e6:1));
 function valueLabel(o){const v=o.value;if(v.kind==='withdrawn')return 'Återkallad';if(v.kind==='qualitative')return 'Kvalitativ uppgift';const number=v.kind==='range'?`${fmt(v.lower,o.unit)}–${fmt(v.upper,o.unit)}`:fmt(v.point,o.unit);const n=v.point??v.upper;return (v.approximate?'≈ ':'')+number+(o.unit==='percent'?' %':o.unit==='USD/share'?' USD/aktie':o.unit==='USD'?(n>=1e9?' md USD':n>=1e6?' mn USD':' USD'):o.unit==='count'&&n>=1e6?' mn':'');}
 const api={validate,compare,asOf,changesSince,valueLabel};
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.NTMCompanyObservations=api;
})(typeof window==='undefined'?null:window);

