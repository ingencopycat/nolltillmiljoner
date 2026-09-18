/* Research owns evidence detail. Uses canonical V3 and Wave 1 help. */
(() => {
 'use strict';
 const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 function render(data){
  let section=document.getElementById('fundamentalProfile');
  if(!section){section=node('section',undefined,'card fundamental-profile');section.id='fundamentalProfile';document.getElementById('overviewRevenue')?.before(section);}
  section.replaceChildren();section.hidden=!!data.manual;if(data.manual)return;
  const profile=window.NTMFundamentalProfile.build(data);
  section.append(node('h2','Vad visar bolagets rapporterade utveckling?'),node('p','Fundamental profil · avgränsad pilot. Beskrivningar av historiska uppgifter, ingen bedömning av aktien.','note'));
  const deeper=node('details');deeper.append(node('summary','Fler dimensioner och datakvalitet'));
  for(const [i,s] of profile.statements.entries()){
   const article=node('article');article.dataset.dimension=s.dimension;article.dataset.evidenceStatus=s.status;
   article.append(node('h3',window.NTMFundamentalProfile.titles[s.dimension]),node('p',s.text));
   if(s.eligibility.reason)article.append(node('p',s.eligibility.reason,'note'));
   const detail=node('details');detail.append(node('summary','Visa underlag och metod'));
   detail.append(node('p',`${s.comparisonBasis}. Metod ${s.methodVersion}. Datametod ${s.dataMethodVersion||'saknas'}.`));
   for(const e of s.evidence){
    const m=e.fact,row=node('div',undefined,'fundamental-evidence');
    row.append(node('p',`${window.researchMetricLabel(e.metric)} · ${e.period||'period saknas'}: ${Number.isFinite(m?.value)?m.value.toLocaleString('sv-SE',{maximumFractionDigits:8}):'saknas'} ${m?.unit||''}`));
    if(m){row.append(node('p',`${m.kind==='reported'?'Rapporterad uppgift':'NTM-beräkning'} · ${m.periodType||'periodtyp saknas'} · ${m.periodStart||'?'}–${m.periodEnd||'?'} · ${m.definition||'definition saknas'}`,'note'));
     const b=node('button','Visa källuppgift','ghost-btn');b.type='button';b.onclick=()=>window.openProvenanceDialog(`${e.metric} ${e.period}`,m);row.append(b);}
    detail.append(row);
   }
   if(s.calculation)detail.append(node('p',`NTM-beräkning: ${s.calculation.formula}. Resultat: ${(s.calculation.values||[s.calculation.value]).map(v=>Number.isFinite(v)?v.toLocaleString('sv-SE',{maximumFractionDigits:8}):'saknas').join(' → ')} ${s.calculation.unit}.`));
   detail.append(node('p','Beskrivande tolkning: '+s.text));
   if(s.limitations)detail.append(node('p',s.limitations,'note'));
   if(s.diagnostics)detail.append(node('p',`Hämtad: ${s.diagnostics.fetchedAt||'okänt'}. Uppdateringsstatus: ${s.diagnostics.updateStatus}.`));
   const raw=node('details');raw.append(node('summary','Fullständigt versionsbundet underlag'),node('pre',JSON.stringify(s,null,2)));detail.append(raw);
   article.append(detail);(i<2?section:deeper).append(article);
  }
  section.append(deeper);
  const helpDepth=node('details');helpDepth.append(node('summary','Förstå begreppen med Knowledge'));
  const help=node('div',undefined,'wave1-actions');
  for(const [id,label] of [['growth','Tillväxt'],['margins','Marginal'],['fcf','Fritt kassaflöde'],['dilution','Antal aktier']]){const b=node('button',`Förklara ${label}`,'ghost-btn');b.type='button';b.dataset.conceptHelp=id;help.append(b);}
  const correction=node('a','Metod och rättelser');correction.href='om-metod.html#rattelser';help.append(correction);helpDepth.append(help);section.append(helpDepth);
 }
 window.NTMFundamentalProfileUI={render};
})();
