/* Read-only Schedule 13D/G views. No live positions, trade or sentiment inference. */
(function(root){
 'use strict';
 const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s));
 const numeric=(v,max=Number.MAX_SAFE_INTEGER)=>typeof v==='string'&&/^\d+(?:\.\d+)?$/.test(v)&&Number(v)<=max;
 function validate(d,ticker,cik){
  if(d?.schema!=='ntm-company-ownership/1'||!Array.isArray(d.filings)||d.filings.length>5000||!Array.isArray(d.pendingReview))throw Error('Invalid Schedule evidence');
  const ids=new Set();
  for(const f of d.filings){
   const a=f.accessionNumber,base=`https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${a?.replaceAll('-','')}/`;
   if(!/^\d{10}-\d{2}-\d{6}$/.test(a)||ids.has(a)||f.ticker!==ticker||f.cik!==cik||!['13D','13G'].includes(f.family)||!date(f.filingDate)||!date(f.eventDate)||f.eventDate>f.filingDate||!f.security||!f.cusips?.length)throw Error('Invalid Schedule identity');ids.add(a);
   for(const [key,pattern] of [['url',/^[A-Za-z0-9_.-]+\.(?:xml|html?)$/],['renderedUrl',/^(?:xslSCHEDULE_13[DG]_X\d+\/)?[A-Za-z0-9_.-]+\.(?:xml|html?)$/]])if(!f[key]?.startsWith(base)||!pattern.test(f[key].slice(base.length)))throw Error('Unsafe Schedule URL');
   if(f.source?.url!==f.url||! /^[a-f0-9]{64}$/.test(f.source.sha256)||!f.persons?.length||!Number.isInteger(f.displayPerson)||!f.persons[f.displayPerson]||!['baseline','comparable','not_comparable'].includes(f.comparison?.state))throw Error('Invalid reviewed ownership');
   const people=new Set();for(const p of f.persons){if(!p.name||!p.entityId||people.has(p.entityId)||!numeric(p.shares)||!numeric(p.percent,100)||Object.values(p.powers||{}).length!==4||Object.values(p.powers).some(v=>!numeric(v)))throw Error('Invalid reporting person');people.add(p.entityId);}
  }
  for(const f of d.filings){if(! /^(?:SC|SCHEDULE) 13[DG](?:\/A)?$/.test(f.form)||f.family!==(f.form.includes('13D')?'13D':'13G')||f.comparison.state==='comparable'&&!f.previousAccession)throw Error('Invalid reporting basis');if(f.previousAccession){const p=d.filings.find(p=>p.accessionNumber===f.previousAccession);if(!p||p.seriesId!==f.seriesId||p.family!==f.family||p.filingDate>=f.filingDate)throw Error('Invalid Schedule history');}}
  return d;
 }
 function asOf(d,until=new Date().toISOString()){const day=String(until).slice(0,10);return date(day)?(d?.filings||[]).filter(f=>f.filingDate<=day):[];}
 const person=f=>f.persons[f.displayPerson];
 function change(f,filings){
  const p=filings.find(p=>p.accessionNumber===f.previousAccession);
  if(!p)return {state:'baseline',kind:'first_reviewed',reason:f.comparison.reason};
  const same=f.seriesId===p.seriesId&&f.family===p.family&&JSON.stringify(f.cusips)===JSON.stringify(p.cusips)&&JSON.stringify(f.persons.map(x=>x.entityId))===JSON.stringify(p.persons.map(x=>x.entityId))&&person(f).entityId===person(p).entityId&&f.eventDate>p.eventDate;
  if(f.comparison.state!=='comparable'||!same)return {state:'not_comparable',kind:'reporting_basis',reason:f.comparison.reason,previous:p};
  const shares=Number(person(f).shares)-Number(person(p).shares),percentagePoints=Number((Number(person(f).percent)-Number(person(p).percent)).toFixed(8));
  return {state:'comparable',kind:shares>0?'increase':shares<0?'decrease':percentagePoints?'percentage_changed':'amended',shares,percentagePoints,previous:p,reason:f.comparison.reason};
 }
 function latest(d,{history=false,until}={}){
  const filings=asOf(d,until),groups=new Map();
  for(const f of filings.filter(f=>f.historyOnly===history).sort((a,b)=>a.filingDate.localeCompare(b.filingDate)||a.accessionNumber.localeCompare(b.accessionNumber))){if(!groups.has(f.seriesId))groups.set(f.seriesId,[]);groups.get(f.seriesId).push(f);}
  return [...groups.values()].map(history=>({filing:history.at(-1),history,change:change(history.at(-1),filings)})).sort((a,b)=>b.filing.filingDate.localeCompare(a.filing.filingDate));
 }
 function changesSince(d,savedAt,until){
  if(!Number.isFinite(Date.parse(savedAt)))return {filings:[],count:0,amendments:0,changes:[]};
  const all=asOf(d,until),day=new Date(savedAt).toISOString().slice(0,10),filings=all.filter(f=>f.filingDate>day);
  return {filings,count:filings.length,amendments:filings.filter(f=>f.form.endsWith('/A')).length,changes:filings.map(f=>({accessionNumber:f.accessionNumber,seriesId:f.seriesId,...change(f,all)})),pendingReview:(d?.pendingReview||[]).filter(f=>f.filingDate>day&&f.filingDate<=String(until||new Date().toISOString()).slice(0,10)).length};
 }
 const api={validate,asOf,person,change,latest,changesSince};if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NTMCompanyOwnership=api;
})(typeof window==='undefined'?null:window);
