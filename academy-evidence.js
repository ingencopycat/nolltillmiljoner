/* Derives conservative evidence; stored booleans never grant competence by themselves. */
(function(root){
 'use strict';
 const C=typeof module!=='undefined'?require('./academy-competencies.js'):root.NTMAcademyCompetencies;
 const P=typeof module!=='undefined'?require('./academy-progress.js'):root.NTMAcademyProgress;
 function attempts(data,now=Date.now()){
  const records=P.validate(data).attempts.filter(e=>e.evidence),groups=new Map();
  for(const e of records){const id=e.evidence.attemptId;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(e);}
  const starts=records.filter(e=>e.evidence.phase==='start');
  return [...groups.values()].map(events=>{
   events.sort((a,b)=>a.at.localeCompare(b.at)||['start','help','reveal','submit'].indexOf(a.evidence.phase)-['start','help','reveal','submit'].indexOf(b.evidence.phase)||a.id.localeCompare(b.id));
   const start=events.find(e=>e.evidence.phase==='start'),end=events.find(e=>e.evidence.phase==='submit'),ev=start?.evidence,t=C.task(start?.objectId);
   const same=!!t&&events.every(e=>e.objectId===t.id&&e.evidence.competencyId===t.competency&&e.evidence.competencyVersion===C.competencies.find(c=>c.id===t.competency)?.version&&e.evidence.taskVersion===t.version&&e.evidence.rubricVersion===C.version&&e.evidence.schemaVersion===1&&e.evidence.variant===t.variant&&e.evidence.context===t.context&&e.evidence.order===ev.order&&e.evidence.startedAt===start.at&&e.evidence.anchorId===ev.anchorId);
   const ordered=!!start&&events[0]===start&&events.filter(e=>e.evidence.phase==='start').length===1&&events.filter(e=>e.evidence.phase==='submit').length<=1&&(!end||events.at(-1)===end);
   const collision=!!start&&starts.some(s=>s.id!==start.id&&s.evidence.competencyId===ev.competencyId&&s.evidence.order===ev.order);
   const clock=events.every(e=>e.evidence.clockValid&&Date.parse(e.at)<=now&&Date.parse(e.at)>=Date.parse(ev?.startedAt));
   // A prior start consumes a variant, even when abandoned or answered in another tab.
   const novel=!!start&&!starts.some(s=>s.id!==start.id&&s.evidence.competencyId===ev.competencyId&&s.evidence.variant===ev.variant&&s.evidence.order<ev.order);
   const help=events.some(e=>e.evidence.helpExposed||e.evidence.phase==='help'),reveal=events.some(e=>e.evidence.answerExposed||e.evidence.phase==='reveal');
   const valid=same&&ordered&&!collision&&clock;
   return {id:ev?.attemptId,task:t,start,end,valid,novel,help,reveal,independent:valid&&novel&&!help&&!reveal&&!!end?.evidence.independent,correct:!!end?.correct,context:t?.context,anchorId:ev?.anchorId};
  });
 }
 function derive(data,now=Date.now(),catalog=C.competencies){
  const all=attempts(data,now),history=P.state(data);
  return catalog.map(c=>{
   const own=all.filter(a=>a.task?.competency===c.id),submitted=own.filter(a=>a.end),independent=own.filter(a=>a.context==='practice'&&a.independent&&a.correct).sort((a,b)=>a.end.at.localeCompare(b.end.at)),first=independent[0];
   const applications=own.filter(a=>a.context==='application'&&a.valid&&a.correct);
   const delayed=own.filter(a=>a.context==='delayed'&&a.valid&&a.novel&&a.end&&first&&a.anchorId===first.id&&Date.parse(a.start.at)-Date.parse(first.end.at)>=C.delay).sort((a,b)=>a.end.at.localeCompare(b.end.at));
   const lastDelayed=delayed.at(-1),passed=delayed.find(a=>a.independent&&a.correct),laterFailure=!!lastDelayed&&!lastDelayed.correct;
   const demonstrated=!!first&&!!passed&&applications.length>0&&!laterFailure;
   const legacy=data.attempts.some(e=>!e.evidence&&(c.activities?.includes(e.objectId)||C.task(e.objectId)?.competency===c.id));
   const introduced=history.has("competency-"+c.id)||own.length>0||c.lessons?.some(id=>history.has(id));
   const state=demonstrated?'demonstrated':submitted.length||legacy?'practiced':introduced?'introduced':'new';
   const dueAt=first?Date.parse(first.end.at)+C.delay:null;
   const used=new Set(own.map(a=>a.task.variant));
   let context=!first?'practice':!applications.length?'application':dueAt<=now&&(!passed||laterFailure)?'delayed':null;
   const next=C.tasks.find(t=>t.competency===c.id&&t.context===context&&!used.has(t.variant));
   return {id:c.id,title:c.title,state,label:{new:'Inte påbörjat',introduced:'Introducerat',practiced:'Övat',demonstrated:'Visat förståelse'}[state],first,applications,delayed,passed,laterFailure,dueAt,next,history:own,legacy,waiting:!!first&&dueAt>now,exhausted:!!context&&!next};
  });
 }
 function next(data,now=Date.now(),catalog=C.competencies){const states=derive(data,now,catalog);return states.find(s=>s.laterFailure)||states.find(s=>s.next?.context==='delayed')||states.find(s=>s.state!=='new'&&s.next)||states.find(s=>s.next)||null;}
 function start(taskId,now=Date.now()){
  const t=C.task(taskId);if(!t)throw Error('Okänd uppgift.');const r=P.read();if(r.error)throw Error(r.error);
  const own=derive(r.data,now).find(s=>s.id===t.competency),prior=r.data.attempts.filter(a=>a.evidence),clockValid=!prior.some(e=>Date.parse(e.at)>now);
  const order=prior.filter(e=>e.evidence.competencyId===t.competency&&e.evidence.phase==='start').reduce((n,e)=>Math.max(n,e.evidence.order),0)+1;
  const evidence={schemaVersion:1,rubricVersion:C.version,competencyId:t.competency,competencyVersion:C.competencies.find(c=>c.id===t.competency).version,taskVersion:t.version,variant:t.variant,attemptId:root.crypto.randomUUID(),order,phase:'start',helpExposed:false,answerExposed:false,independent:false,context:t.context,anchorId:own.first?.id||null,startedAt:new Date(now).toISOString(),clockValid};
  P.attempt(t.id,'competency',false,evidence,now);return evidence.attemptId;
 }
 function record(id,phase,correct=false,now=Date.now()){
  const r=P.read();if(r.error)throw Error(r.error);const a=attempts(r.data,now).find(a=>a.id===id);if(!a?.start||a.end)throw Error('Försöket är avslutat eller saknas. Starta ett nytt övningsförsök.');
  const ev={...a.start.evidence,phase,helpExposed:a.help||phase==='help',answerExposed:a.reveal||phase==='reveal',independent:phase==='submit'&&a.valid&&a.novel&&!a.help&&!a.reveal,clockValid:a.start.evidence.clockValid&&!r.data.attempts.some(e=>Date.parse(e.at)>now)};
  P.attempt(a.task.id,'competency',correct,ev,now);return ev;
 }
 const api={attempts,derive,next,start,record};root.NTMAcademyEvidence=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
