/* Wave 4 presentation contract: absence never becomes a value or confirmation. */
(function(root){
 'use strict';
 const present=v=>v!==null&&v!==undefined&&v!=='';
 function macro(event){
  const name=String(event.eventName||'');
  const concept=/\b(CPI|PCE|GDP|payrolls?|unemployment|employment situation)\b|consumer price|gross domestic|nonfarm|inflation/i.test(name)?'macro-releases':/\b(FOMC|Fed|federal funds|Federal Reserve|Federal Open Market)\b|interest rate|styrränta/i.test(name)?'interest-rates':null;
  const actual=present(event.actual),verified=['reported','provider_derived'].includes(event.fieldProvenance?.actual?.kind);
  const state=actual?(verified?'Utfall finns från angiven källa':'Utfall finns · fältkälla ej verifierad'):'Schemalagd uppgift · utfall saknas';
  const revision=event.isRevised?'Utfall markerat som reviderat; ursprungligt utfall '+(present(event.actualFirstReported)?String(event.actualFirstReported):'saknas i underlaget')+'.':'Utfall: revisionsstatus inte angiven.';
  const p=event.fieldProvenance?.previous;
  const previous=!present(event.previous)?'Föregående värde saknas.':p?.revisionStatus==='revised'?'Föregående är reviderat. Ursprungligt: '+(present(event.previousFirstReported)?String(event.previousFirstReported):'saknas i underlaget')+'.':p?.revisionStatus==='first_reported'?'Föregående avser första publiceringen.':'Föregående: ursprungligt eller reviderat är okänt.';
  return {concept,state,revision,previous,time:`Källtid: ${event.date||'datum saknas'} ${event.time||'tid saknas'} · ${event.timezone||'America/New_York'}. Visning: Europe/Stockholm${event.swedishDate?' · '+event.swedishDate:''}.`};
 }
 function earnings(weekKey,start){
  const end=new Date(start);end.setUTCDate(end.getUTCDate()+6);
  return `Urval: endast bolagen i veckans Earnings Whispers-bild, inte hela marknaden eller hela Research-urvalet. ${weekKey}: ${start.toISOString().slice(0,10)}–${end.toISOString().slice(0,10)}. Sessioner avser America/New_York; svenskt datum kan skilja sig. Exakt klockslag och emittentbekräftelse: okända. Senast verifierad mot bolagens IR: okänt. Bildavskriften fastställer inte bekräftad eller preliminär rapportdag.`;
 }
 const api={macro,earnings};root.NTMCalendarContext=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
