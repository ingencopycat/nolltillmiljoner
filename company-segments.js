/* Business mix views over the existing reviewed observations, never a second feed. */
(function(root){
 'use strict';
 const rows=data=>(data?.observations||[]).filter(o=>o.kind==='business_mix');
 const day=s=>String(s).slice(0,10),days=(a,b)=>(Date.parse(b)-Date.parse(a))/86400000;
 const same=(a,b)=>['ticker','metricId','unit','currency','basis','definitionVersion'].every(k=>a[k]===b[k])&&a.category.id===b.category.id&&a.group.id===b.group.id&&a.group.version===b.group.version&&a.group.type===b.group.type&&a.category.role===b.category.role&&JSON.stringify(a.group.parent)===JSON.stringify(b.group.parent)&&JSON.stringify(a.group.members)===JSON.stringify(b.group.members)&&a.period.type===b.period.type;
 function compare(a,b,interval='quarter'){
  if(!a||!b)return {comparable:false,reason:'Historik saknas'};
  if(!same(a,b))return {comparable:false,reason:'Ej jämförbart · ändrad indelning'};
  const distance=days(a.period.end,b.period.end),duration=o=>days(o.period.start,o.period.end)+1;
  if(![a,b].every(o=>o.period.type==='quarter'&&duration(o)>=80&&duration(o)<=99)||!(interval==='year'?distance>=350&&distance<=378:distance>=80&&distance<=105))return {comparable:false,reason:'Ej jämförbart · olika perioder'};
  if(a.value.kind!=='point'||b.value.kind!=='point'||!Number.isFinite(a.value.point)||!Number.isFinite(b.value.point)||a.value.point<=0)return {comparable:false,reason:'Jämförelsebas saknas'};
  return {comparable:true,changePercent:(b.value.point/a.value.point-1)*100,change:b.value.point-a.value.point,recast:a.recast.status==='issuer_recast'||b.recast.status==='issuer_recast'};
 }
 function bundle(observations){
  const first=observations[0];if(!first)return {available:false,reason:'Underlag saknas'};
  const group=first.group,ids=observations.map(o=>o.category.id),expected=[...group.members,group.totalId];
  if(ids.length!==expected.length||new Set(ids).size!==ids.length||expected.some(id=>!ids.includes(id))||observations.some(o=>o.ticker!==first.ticker||o.period.end!==first.period.end||o.period.start!==first.period.start||o.source.accessionNumber!==first.source.accessionNumber||o.currency!==first.currency||o.unit!==first.unit||o.basis!==first.basis||JSON.stringify(o.group)!==JSON.stringify(group)||!Number.isFinite(o.value.point)))return {available:false,reason:'Ofullständig eller motstridig uppdelning'};
  const total=observations.find(o=>o.category.id===group.totalId),categories=observations.filter(o=>o.category.role==='category'),reconciliation=observations.filter(o=>o.category.role==='reconciliation');
  if(total.category.role!=='total'||categories.some(o=>o.value.point<0)||!categories.length||total.value.point<=0)return {available:false,reason:'Ogiltig mixbas'};
  const denominator=categories.reduce((n,o)=>n+o.value.point,0),bridge=reconciliation.reduce((n,o)=>n+o.value.point,0);
  if(Math.abs(denominator+bridge-total.value.point)>1)return {available:false,reason:'Uppdelningen stämmer inte med redovisad total'};
  return {available:true,group,period:first.period,publicationDate:first.publicationDate,total,categories,reconciliation,denominator,bridge};
 }
 function history(data,groupId,asOf=new Date().toISOString()){
  const before=rows(data).filter(o=>o.group.id===groupId&&o.publicationDate<=day(asOf)),bySource=new Map();
  for(const o of before){const key=[o.ticker,o.period.end,o.publicationDate,o.source.accessionNumber].join('|');if(!bySource.has(key))bySource.set(key,[]);bySource.get(key).push(o);}
  const periods=new Map();
  for(const observations of bySource.values()){
   const o=observations[0],previous=periods.get(o.period.end);
   if(!previous||o.publicationDate>previous.publicationDate)periods.set(o.period.end,{...bundle(observations),period:o.period,publicationDate:o.publicationDate});
   else if(o.publicationDate===previous.publicationDate)periods.set(o.period.end,{available:false,period:o.period,publicationDate:o.publicationDate,reason:'Motstridiga källor samma dag'});
  }
  return [...periods.values()].sort((a,b)=>a.period.end.localeCompare(b.period.end));
 }
 function view(data,groupId,asOf){
  const all=history(data,groupId,asOf),latest=all.at(-1);if(!latest?.available)return latest||{available:false,reason:'Underlag saknas'};
  const trend=[latest];let historyBreak=false;
  for(let i=all.length-2;i>=0&&trend.length<5;i--){const previous=all[i],next=trend[0];if(!previous.available||next.categories.some(o=>!compare(previous.categories.find(p=>p.category.id===o.category.id),o).comparable)){historyBreak=true;break;}trend.unshift(previous);}
  const values=latest.categories.map(o=>{
   const prior=all.find(p=>days(p.period.end,o.period.end)>=350&&days(p.period.end,o.period.end)<=378);
   return {...o,share:o.value.point/latest.denominator*100,yoy:compare(prior?.available?prior.categories.find(p=>p.category.id===o.category.id):null,o,'year')};
  });
  return {...latest,values,history:all,trend:trend.length>=3?trend:[],historyBreak};
 }
 function changesSince(data,savedAt,until=new Date().toISOString()){
  if(!Number.isFinite(Date.parse(savedAt)))return [];
  const before=rows(data).filter(o=>o.publicationDate<=day(until));
  return before.filter(o=>o.publicationDate>day(savedAt)).map(o=>{
   const previous=before.filter(p=>p.publicationDate<o.publicationDate&&p.ticker===o.ticker&&p.group.id===o.group.id&&p.category.id===o.category.id&&p.period.end===o.period.end).sort((a,b)=>a.publicationDate.localeCompare(b.publicationDate)).at(-1);
   return {observation:o,previous:previous||null,newPeriod:!previous,historicalValueChanged:!!previous&&previous.value.point!==o.value.point,scopeChanged:!!previous&&!same(previous,o),issuerRecast:o.recast.status==='issuer_recast'};
  });
 }
 const api={rows,compare,bundle,history,view,changesSince};if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NTMCompanySegments=api;
})(typeof window==='undefined'?null:window);
