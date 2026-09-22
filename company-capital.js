/* Capital views over reviewed evidence. No discovery, forecasts or Research writes. */
(function(root){
 'use strict';
 const rows=data=>(data?.observations||[]).filter(o=>o.kind==='capital');
 const days=(a,b)=>(Date.parse(b)-Date.parse(a))/86400000;
 const duration=o=>o.period.start?days(o.period.start,o.period.end)+1:0;
 const point=o=>o?.value?.kind==='point'&&Number.isFinite(o.value.point);
 const same=(a,b)=>['ticker','kind','metricId','unit','currency','basis','definitionVersion'].every(k=>a[k]===b[k])&&a.period.type===b.period.type&&['scope','sectorBasis','shareBasis','debtScope','calculationBasis'].every(k=>a.capital?.[k]===b.capital?.[k]);
 function compare(a,b,interval='auto'){
  if(!a||!b)return {comparable:false,reason:'Historik saknas'};
  if(!same(a,b))return {comparable:false,reason:'Ej jämförbart · ändrad definition eller aktiebas'};
  if(!point(a)||!point(b))return {comparable:false,reason:'Kvalitativ uppgift'};
  const gap=days(a.period.end,b.period.end),equal=a.period.start===b.period.start&&a.period.end===b.period.end;
  const year=gap>=350&&gap<=378,quarter=gap>=80&&gap<=105;
  const validPeriod=a.period.type==='instant'||Math.abs(duration(a)-duration(b))<=8;
  if(!validPeriod||!(interval==='year'?year:interval==='quarter'?quarter:equal||year||quarter)||a.period.type==='year_to_date'&&!equal&&!year)return {comparable:false,reason:'Ej jämförbart · olika perioder'};
  return {comparable:true,change:b.value.point-a.value.point,changePercent:a.value.point>0?(b.value.point/a.value.point-1)*100:null,recast:[a,b].some(o=>o.capital.recast!=='as_reported'),inputs:[a.id,b.id],method:'(Senare värde / tidigare värde − 1) × 100, endast vid samma definition, aktiebas och jämförbar periodlängd.'};
 }
 function history(data,metricId,asOf=new Date().toISOString()){
  const selected=rows(data).filter(o=>o.metricId===metricId&&o.publicationDate<=String(asOf).slice(0,10)),periods=new Map();
  for(const o of selected){
   const key=[o.ticker,o.period.type,o.period.start,o.period.end,o.capital.scope].join('|'),prior=periods.get(key);
   if(!prior||o.publicationDate>prior.publicationDate)periods.set(key,o);
   else if(o.publicationDate===prior.publicationDate&&o.id!==prior.id)periods.set(key,{...prior,conflict:true});
  }
  return [...periods.values()].sort((a,b)=>a.period.end.localeCompare(b.period.end)||a.publicationDate.localeCompare(b.publicationDate));
 }
 const latest=(data,id,asOf)=>{const o=history(data,id,asOf).at(-1);return o&&!o.conflict?o:null;};
 function view(data,id,asOf){
  const all=history(data,id,asOf),last=all.at(-1);if(!last||last.conflict)return {available:false,reason:last?'Motstridiga observationer':'Underlag saknas'};
  const prior=all.find(o=>days(o.period.end,last.period.end)>=350&&days(o.period.end,last.period.end)<=378);
  const yoy=prior?.conflict?{comparable:false,reason:'Motstridiga observationer'}:compare(prior,last,'year');
  const trend=[last];let historyBreak=false;
  for(let i=all.length-2;i>=0&&trend.length<5;i--){const p=all[i];if(p.conflict||!compare(p,trend[0],'quarter').comparable){historyBreak=true;break;}trend.unshift(p);}
  return {available:true,latest:last,yoy,history:all,trend:trend.length>=3?trend:[],historyBreak};
 }
 const matching=(a,b)=>a&&b&&point(a)&&point(b)&&a.ticker===b.ticker&&a.currency===b.currency&&a.unit===b.unit&&a.basis===b.basis&&a.capital.scope===b.capital.scope&&a.period.start===b.period.start&&a.period.end===b.period.end&&a.period.type===b.period.type&&a.source.accessionNumber===b.source.accessionNumber;
 function derive(metric,inputs){
  const [a,b]=inputs;if(!matching(a,b))return {available:false,reason:'Oförenliga beräkningsunderlag'};
  if(metric==='sbc_revenue'&&a.metricId==='sbc_expense'&&b.metricId==='revenue_basis'&&a.capital.calculationBasis==='recognized-sbc-expense'&&['consolidated-gaap-revenue','consolidated-gaap-net-revenue'].includes(b.capital.calculationBasis)&&a.period.type==='quarter'&&b.value.point>0)return {available:true,metricId:metric,label:'SBC / intäkter',value:a.value.point/b.value.point*100,unit:'percent',inputs:inputs.map(o=>o.id),method:'Kostnadsförd SBC / GAAP-koncernintäkter × 100, samma kvartal och rapport. SoFi använder nettointäkter efter räntekostnad. Inte utspädning.'};
  const debt=b.metricId==='debt_total'||b.metricId==='debt_noncurrent'&&b.capital.debtScope==='all-borrowings-no-current-notes';
  if(metric==='cash_less_debt'&&a.metricId==='cash'&&debt&&a.capital.calculationBasis==='cash-equivalents-excluding-restricted'&&b.capital.calculationBasis==='all-borrowings-carrying-excluding-leases'&&a.period.type==='instant'&&a.unit==='USD'&&inputs.every(o=>o.capital.sectorBasis==='industrial'))return {available:true,metricId:metric,label:'Kassa minus låneskuld',value:a.value.point-b.value.point,unit:'USD',inputs:inputs.map(o=>o.id),method:'Kassa och likvida medel minus redovisad räntebärande låneskuld, samma balansdag och rapport. Värdepapper, spärrade medel, leasing och rörelseskulder ingår inte. Skulden är efter emissionskostnader; inte nominellt belopp.'};
  return {available:false,reason:'Definitionen stöder inte beräkningen'};
 }
 function derived(data,asOf){
  return [derive('sbc_revenue',[latest(data,'sbc_expense',asOf),latest(data,'revenue_basis',asOf)]),derive('cash_less_debt',[latest(data,'cash',asOf),latest(data,'debt_total',asOf)||latest(data,'debt_noncurrent',asOf)])].filter(d=>d.available);
 }
 function changesSince(data,savedAt,until=new Date().toISOString()){
  if(!Number.isFinite(Date.parse(savedAt)))return [];
  const all=rows(data).filter(o=>o.publicationDate<=String(until).slice(0,10));
  return all.filter(o=>o.publicationDate>String(savedAt).slice(0,10)).map(o=>{
   const candidates=all.filter(p=>p.ticker===o.ticker&&p.metricId===o.metricId&&p.capital.scope===o.capital.scope&&p.period.type===o.period.type&&p.publicationDate<o.publicationDate&&p.period.end<=o.period.end);
   const samePeriod=candidates.filter(p=>p.period.end===o.period.end&&p.period.start===o.period.start);
   const previous=(samePeriod.length?samePeriod:candidates).sort((a,b)=>a.period.end.localeCompare(b.period.end)||a.publicationDate.localeCompare(b.publicationDate)).at(-1);
   return {observation:o,previous:previous||null,comparison:compare(previous,o),historicalValueChanged:!!previous&&previous.period.end===o.period.end&&JSON.stringify(previous.value)!==JSON.stringify(o.value),scopeChanged:!!previous&&!same(previous,o),issuerRecast:o.capital.recast!=='as_reported'};
  });
 }
 const api={rows,compare,history,latest,view,derive,derived,changesSince};if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NTMCompanyCapital=api;
})(typeof window==='undefined'?null:window);
