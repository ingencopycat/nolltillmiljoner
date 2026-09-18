/* Wave 2: derived reasons, exact local targets, bounded local drafts. No network. */
(function(root){
 'use strict';
 const prefix='ntm-research-work-v1:',targetKey='ntm-research-review-target-v1',limit=200000,life=14*86400000;
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const day=(v=new Date())=>{const d=new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 const scope=v=>typeof v==='string'&&/^[A-Z0-9.-]{1,80}$/.test(v);
 const stable=v=>JSON.stringify(sort(v));
 function sort(v){return Array.isArray(v)?v.map(sort):object(v)?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,sort(v[k])])):v;}
 const canonicalRows=rows=>(rows||[]).map(sort).sort((a,b)=>stable(a).localeCompare(stable(b)));
 function evidence(report){return {metrics:canonicalRows(report?.metrics),margins:canonicalRows(report?.margins),filings:canonicalRows(report?.filings),periodChange:report?.periodChange||null,blocked:canonicalRows(report?.blocked),...(report?.corrections?.length?{corrections:canonicalRows(report.corrections)}:{})};}
 function acknowledgements(thesis){try{const v=JSON.parse(thesis?.review?.changeKey);return v?.version===2&&Array.isArray(v.ack)&&v.ack.every(x=>typeof x==='string')?v.ack:[];}catch(_){return [];}}
 function reasons(thesis,report,today=day(),research=false){
  if(!thesis||['close','abstain'].includes(thesis.review?.decision))return [];
  const rows=[],add=(type,category,label,basis,ids={})=>rows.push({type,category,label,key:stable({ruleVersion:1,type,basis}),basis,...ids});
  if(thesis.reviewDate&&thesis.reviewDate<=today)add('date','due','Ditt granskningsdatum har nåtts',{date:thesis.reviewDate});
  for(const [i,a] of (thesis.assumptionDetails||[]).entries())if(a.status!=='superseded'&&a.reviewBy&&a.reviewBy<=today&&(!a.reviewedAt||a.reviewBy>day(a.reviewedAt)))add('assumption','due',`Antagande ${i+1}: ditt granskningsdatum har nåtts`,{id:a.id,date:a.reviewBy,criterion:a.falsification,text:thesis.assumptions?.[i]},{assumptionId:a.id});
  for(const q of thesis.reportQuestions||[])if(q.status==='open')add('question','information','Öppen fråga – ingen tidsfrist',{id:q.id,text:q.text},{questionId:q.id});
  const e=evidence(report);
  // No structured fact links exist in the current assumption schema. R12 stays
  // in Research; never infer a link from private prose or notify every thesis.
  if(research)for(const c of report?.corrections||[])add('correction','information',`Källunderlaget för ${c.metric} (${c.period}) har reviderats`,{fingerprint:c.fingerprint});
  for(const f of e.filings)add('filing','observation',`${f.form||'Rapport'} ${f.filingDate||''}${f.form?.endsWith('/A')?' – ändringsrapport':''}: finns efter ditt sparade underlag`,f);
  if(e.metrics.length||e.margins.length)add('metrics','observation','Jämförbara uppgifter har ändrats – granska underlaget',{metrics:e.metrics,margins:e.margins,period:e.periodChange});
  else if(e.periodChange)add('period','information','Rapportperioden har ändrats; jämförbar förändring är inte fastställd',e.periodChange);
  if(e.blocked.length)add('blocked','information','Vissa jämförelser saknar jämförbart underlag',e.blocked);
  const ack=new Set(acknowledgements(thesis));
  // Preserve old complete-review acknowledgements without rewriting legacy data.
  let legacy=false;try{const old=JSON.parse(thesis.review?.changeKey);legacy=old?.version!==2&&stable(evidence(old))===stable(e)&&Boolean(old&&report);}catch(_){}
  return rows.filter(r=>!ack.has(r.key)&&!(legacy&&['filing','metrics','period','blocked'].includes(r.type)));
 }
 function reviewKey(thesis,selected){return JSON.stringify({version:2,ack:[...new Set([...acknowledgements(thesis),...selected])].slice(-100)});}
 function select({error=false,restore=false,exact=false,thesis=null,reasons:rows=[],draft=false,editing=false,context=null}={}){
  if(error||restore)return {state:'blocked',label:'Lös återställningen eller läsfelet',href:'#researchContinuity'};
  if(!editing&&['close','abstain'].includes(thesis?.review?.decision))return {state:thesis.review.decision==='close'?'closed':'declined',label:'Läs inaktiv tes eller återöppna',href:'#thesisReview'};
  if(exact)return {state:'exact',label:'Fortsätt den valda granskningen',href:'#thesisReview'};
  if(rows.some(r=>r.category==='due'))return {state:'due',label:'Granska dina valda datum',href:'#thesisReview'};
  if(rows.some(r=>['filing','metrics'].includes(r.type)))return {state:'changed',label:'Granska vad som förändrats',href:'#thesisReview'};
  if(draft)return {state:'draft',label:'Fortsätt ditt lokala utkast',href:'#researchContinuity'};
  if(editing)return {state:'update',label:'Färdigställ din revidering',href:'#thesisSection'};
  if(context==='checkpoint'||context==='outcome')return {state:context,label:'Fortsätt din utfallskontroll',href:'#outcomeSection'};
  return thesis?{state:'active',label:'Fortsätt med din tes',href:'#thesisSection'}:{state:'new',label:'Formulera din första tes',href:'#thesisSection'};
 }
 const fieldIds=['thesis-text','thesis-risks','thesis-trigger','thesis-notes','thesis-review-date','manualCompanyName','reviewContext','reviewProcess','reviewNextDate',
  ...[1,2,3].flatMap(i=>[`thesis-assumption-${i}`,`assumption-falsification-${i}`,`assumption-date-${i}`,`assumption-status-${i}`,`assumption-assessment-${i}`,`assumption-note-${i}`,`report-question-${i}`,`report-status-${i}`,`report-answer-${i}`]),
  'val-price','val-eps','val-return','val-years','val-exit-pe',...['bear','base','bull'].flatMap(s=>[`sc-${s}-growth`,`sc-${s}-pe`])];
 function validate(record){
  if(!object(record)||Object.keys(record).sort().join()!=='draft,snoozes,version'||record.version!==1||!Array.isArray(record.snoozes)||record.snoozes.length>100||record.snoozes.some(s=>!object(s)||Object.keys(s).sort().join()!=='key,until'||typeof s.key!=='string'||s.key.length>50000||!date(s.until)))throw Error('Lokal arbetsdata kunde inte läsas. Originalet är bevarat.');
  const d=record.draft;
  if(d!==null&&(!object(d)||Object.keys(d).sort().join()!=='base,fields,mode,pending,updatedAt'||!Number.isSafeInteger(d.updatedAt)||!(d.base===null||typeof d.base==='string')||!object(d.fields)||Object.keys(d.fields).some(k=>!fieldIds.includes(k)||typeof d.fields[k]!=='string'||d.fields[k].length>20000)||!['manual','sec','example'].includes(d.mode)||!(d.pending===null||object(d.pending)&&d.pending.decision==='revise'&&typeof d.pending.sourceRevisionId==='string'&&typeof d.pending.changeKey==='string'&&Object.keys(d.pending).every(k=>['decision','sourceRevisionId','context','observedPeriod','changeKey'].includes(k)))))throw Error('Utkastet har ett okänt format. Ingen data ändrades.');
  if(stable(record).length>limit)throw Error('Arbetsdata är för stor. Ladda ner utkastet och minska textmängden.');
  return record;
 }
 const empty=()=>({version:1,draft:null,snoozes:[]});
 function read(ticker){if(!scope(ticker))return {value:empty(),raw:null,error:'Ogiltig bolagsnyckel.'};try{const raw=root.localStorage.getItem(prefix+ticker);if(raw&&raw.length>limit)throw Error('Lokal arbetsdata är för stor.');return {value:raw?validate(JSON.parse(raw)):empty(),raw,error:null};}catch(e){return {value:empty(),raw:null,error:e.message};}}
 function keys(ticker){return Object.keys(root.localStorage).filter(k=>k.startsWith(prefix)&&scope(k.slice(prefix.length))&&(!ticker||k===prefix+ticker));}
 function write(ticker,value,expected){
  if(!scope(ticker))throw Error('Ogiltig bolagsnyckel.');validate(value);
  if(root.localStorage.getItem(prefix+ticker)!==expected)throw Error('Arbetet ändrades i en annan flik. Ladda ner ditt utkast innan du väljer vilken version du vill behålla.');
  if(!value.draft&&!value.snoozes.length){root.localStorage.removeItem(prefix+ticker);if(root.localStorage.getItem(prefix+ticker)!==null)throw Error('Arbetsdata kunde inte rensas.');return null;}
  if(expected===null&&keys().length>=20)throw Error('Högst 20 lokala arbetsutkast stöds. Radera ett avslutat utkast först.');
  const raw=JSON.stringify(value);root.localStorage.setItem(prefix+ticker,raw);if(root.localStorage.getItem(prefix+ticker)!==raw)throw Error('Utkastet kunde inte kontrolläsas.');return raw;
 }
 function clear(ticker){for(const k of keys(ticker))root.localStorage.removeItem(k);}
 function visible(rows,work,today=day()){return rows.filter(r=>!work.snoozes.some(s=>s.key===r.key&&s.until>today));}
 function snooze(ticker,reasonKeys,until,today=day()){
  if(!date(until)||until<=today)throw Error('Välj ett senare datum.');
  const w=read(ticker);if(w.error)throw Error(w.error);
  const wanted=new Set(reasonKeys);w.value.snoozes=w.value.snoozes.filter(s=>s.until>today&&!wanted.has(s.key));w.value.snoozes.push(...reasonKeys.map(key=>({key,until})));write(ticker,w.value,w.raw);
 }
 function revisionStamp(t){return t?stable(t.revisions?.find(r=>r.id===t.latestRevisionId)||t):null;}
 function makeTarget(ticker,thesis,rows,report,now=Date.now()){
  return {version:1,ticker,revision:thesis.latestRevisionId,stamp:revisionStamp(thesis),reasonKeys:rows.map(r=>r.key),assumptionIds:rows.map(r=>r.assumptionId).filter(Boolean),questionIds:rows.map(r=>r.questionId).filter(Boolean),evidence:stable(evidence(report)),createdAt:now};
 }
 function resolve(target,ticker,thesis,report,now=Date.now()){
  if(!object(target)||Object.keys(target).sort().join()!=='assumptionIds,createdAt,evidence,questionIds,reasonKeys,revision,stamp,ticker,version'||target.version!==1||target.ticker!==ticker||!scope(target.ticker)||!Number.isSafeInteger(target.createdAt)||target.createdAt>now||now-target.createdAt>86400000||!['reasonKeys','assumptionIds','questionIds'].every(k=>Array.isArray(target[k])&&target[k].length<=100&&target[k].every(x=>typeof x==='string'&&x.length<=50000)))throw Error('Den valda granskningslänken saknas, är ogiltig eller har gått ut. Öppna en ny från Min NTM.');
  if(!thesis||target.revision!==thesis.latestRevisionId||target.stamp!==revisionStamp(thesis))throw Error('Den valda versionen har raderats eller en nyare version finns. Ingen annan version har valts åt dig. Öppna historiken eller välj en ny granskning i Min NTM.');
  if(target.evidence!==stable(evidence(report)))throw Error('Underlaget har ändrats sedan länken skapades. Gå tillbaka till Min NTM och välj den nya granskningen.');
  const all=reasons(thesis,report),known=new Set(all.map(r=>r.key));
  if(target.reasonKeys.some(k=>!known.has(k))||target.assumptionIds.some(id=>!thesis.assumptionDetails?.some(a=>a.id===id))||target.questionIds.some(id=>!thesis.reportQuestions?.some(q=>q.id===id)))throw Error('Granskningsorsaken har ändrats. Välj en ny granskning i Min NTM.');
  return target;
 }
 const api={prefix,targetKey,life,fieldIds,day,date,stable,evidence,reasons,reviewKey,select,read,write,clear,keys,visible,snooze,revisionStamp,makeTarget,resolve,empty,validate};root.NTMContinuity=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
