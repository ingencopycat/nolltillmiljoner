/* Presentation only. Canonical statements and their evidence remain unchanged. */
(() => {
 'use strict';
 const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const fmt=(v,d=1)=>v.toLocaleString('sv-SE',{minimumFractionDigits:d,maximumFractionDigits:d});
 const signed=v=>(v>0?'+':v<0?'−':'')+fmt(Math.abs(v));
 function summary(s){
  const periods=[...new Set(s.evidence.map(e=>e.period).filter(Boolean))];
  if(s.status!=='available')return {value:'—',unit:'',label:s.dimension==='profitability'?'Rörelsemarginal':s.dimension==='cash'?'Fritt kassaflöde':'Årlig intäktstillväxt',context:s.profile==='financial_services'&&['cash','profitability'].includes(s.dimension)?'Används inte för finansiella bolag':'Jämförbart underlag saknas'};
  if(s.dimension==='growth'){
   const values=s.evidence.map(e=>e.fact.value),scale=Math.max(...values.map(Math.abs))>=1e9?1e9:1e6,unit=scale===1e9?'md USD':'mn USD';
   return {value:signed(s.calculation.value),unit:'%',label:`${s.profile==='financial_services'?'Nettointäkter':'Omsättning'} ${periods.join(' → ')}`,context:`${fmt(values[0]/scale)} → ${fmt(values[1]/scale)} ${unit}`};
  }
  if(s.dimension==='profitability')return {value:fmt(s.calculation.values[1]),unit:'%',label:`Rörelsemarginal ${periods.at(-1)}`,context:`${fmt(s.calculation.values[0])}% föregående år · ${signed(s.calculation.value)} procentenheter`};
  const values=s.calculation.values,scale=Math.max(...values.map(Math.abs))>=1e9?1e9:1e6;
  return {value:fmt(values[1]/scale),unit:scale===1e9?'md USD':'mn USD',label:`Fritt kassaflöde ${periods.at(-1)}`,context:`${fmt(values[0]/scale)} ${scale===1e9?'md':'mn'} USD föregående år`};
 }
 function render(data){
  let section=document.getElementById('fundamentalProfile');
  if(!section){section=node('section',undefined,'fundamental-profile');section.id='fundamentalProfile';document.getElementById('overviewRevenue')?.before(section);}
  section.replaceChildren();section.hidden=!!data.manual;if(data.manual)return;
  const profile=window.NTMFundamentalProfile.build(data);
  const header=node('div',undefined,'section-title-row');header.append(node('h2','Rapporterad utveckling'),node('span','Helår · jämfört med föregående år','note'));section.append(header);
  const metrics=node('div',undefined,'fundamental-metrics');
  for(const s of profile.statements.filter(s=>['growth','profitability','cash'].includes(s.dimension))){
   const article=node('article');article.dataset.dimension=s.dimension;article.dataset.evidenceStatus=s.status;
   const v=summary(s),value=node('p',undefined,'fundamental-value');value.append(node('span',v.value),node('small',v.unit));
   article.append(node('h3',window.NTMFundamentalProfile.titles[s.dimension]),value,node('p',v.label,'fundamental-label'),node('p',v.context,'note'));metrics.append(article);
  }
  section.append(metrics);
  const detail=node('details',undefined,'financial-sources');detail.id='fundamentalSources';detail.append(node('summary','Källor & metod'));
  for(const s of profile.statements){
   const block=node('section',undefined,'fundamental-source-section');block.dataset.sourceDimension=s.dimension;
   block.append(node('h3',window.NTMFundamentalProfile.titles[s.dimension]),node('p',s.text));
   if(s.eligibility.reason)block.append(node('p',s.eligibility.reason,'note'));
   block.append(node('p',`${s.comparisonBasis}. Metod ${s.methodVersion}. Datametod ${s.dataMethodVersion||'saknas'}.`,'note'));
   for(const e of s.evidence){
    const m=e.fact,row=node('div',undefined,'fundamental-evidence');
    row.append(node('p',`${window.researchMetricLabel(e.metric)} · ${e.period||'period saknas'}: ${Number.isFinite(m?.value)?m.value.toLocaleString('sv-SE',{maximumFractionDigits:8}):'saknas'} ${m?.unit||''}`));
    if(m){row.append(node('p',`${m.kind==='reported'?'Rapporterad uppgift':'NTM-beräkning'} · ${m.periodType||'periodtyp saknas'} · ${m.periodStart||'?'}–${m.periodEnd||'?'} · ${m.definition||'definition saknas'}`,'note'));
     const b=node('button','Visa källuppgift','ghost-btn');b.type='button';b.setAttribute('aria-label',`Visa källuppgift: ${window.researchMetricLabel(e.metric)} ${e.period}`);b.onclick=()=>window.openProvenanceDialog(`${window.researchMetricLabel(e.metric)} ${e.period}`,m);row.append(b);}
    block.append(row);
   }
   if(s.calculation)block.append(node('p',`Beräkning: ${s.calculation.formula}. Resultat: ${(s.calculation.values||[s.calculation.value]).map(v=>Number.isFinite(v)?v.toLocaleString('sv-SE',{maximumFractionDigits:8}):'saknas').join(' → ')} ${s.calculation.unit}.`));
   if(s.limitations)block.append(node('p',s.limitations,'note'));
   if(s.diagnostics)block.append(node('p',`Hämtad: ${s.diagnostics.fetchedAt||'okänt'}. Uppdateringsstatus: ${s.diagnostics.updateStatus}.`,'note'));
   detail.append(block);
  }
  const help=node('div',undefined,'wave1-actions');
  for(const [id,label] of [['growth','Tillväxt'],['margins','Marginal'],['fcf','Fritt kassaflöde'],['dilution','Antal aktier']]){const b=node('button',`Förklara ${label}`,'ghost-btn');b.type='button';b.dataset.conceptHelp=id;help.append(b);}
  const correction=node('a','Metod och rättelser');correction.href='om-metod.html#rattelser';help.append(correction);detail.append(help);
  const raw=node('details',undefined,'evidence-technical');raw.append(node('summary','Fullständigt versionsbundet underlag'),node('pre',JSON.stringify(profile,null,2)));detail.append(raw);section.append(detail);
 }
 window.NTMFundamentalProfileUI={render,summary};
})();
