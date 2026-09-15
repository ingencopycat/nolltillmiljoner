/* Local Academy activity controls. No answer text or financial inputs are stored. */
document.addEventListener('DOMContentLoaded',()=>{
 const A=window.NTMAcademyCatalog,C=window.NTMAcademyActivities,P=window.NTMAcademyProgress,G=window.NTMAcademyProgression;
 if(!A||!C||!P||!G)return;
 const object=C.objects.find(o=>o.id===document.querySelector('[data-academy-activity]')?.dataset.academyActivity);
 let previous;
 const emit=name=>window.NTMEvents?.emit(name);
 function render(){
  const read=P.read();
  if(read.error){document.querySelectorAll('[data-xp-label],[data-activity-progress]').forEach(n=>n.textContent=read.error);document.querySelectorAll('[data-activity-question] button').forEach(b=>b.disabled=true);return;}
  const s=G.derive(read.data);
  if(previous){
   if(s.xp>previous.xp)emit('academy_xp_earned');
   if(s.level.id>previous.level.id)emit('academy_level_reached');
   for(const type of ['scenario','challenge','case','path'])if(s.counts[type]>previous.counts[type])emit('academy_'+type+'_complete');
  }
  previous=s;
  document.querySelectorAll('[data-xp-label]').forEach(n=>n.textContent=`Nivå ${s.level.id} · ${s.level.title} · ${s.xp} XP`);
  document.querySelectorAll('[data-xp-bar]').forEach(n=>{n.max=100;n.value=s.levelPercent;});
  document.querySelectorAll('[data-xp-next]').forEach(n=>n.textContent=s.nextLevel?`${s.nextLevel.xp-s.xp} XP till ${s.nextLevel.title}`:'Högsta Academy-nivån i detta material');
  document.querySelectorAll('[data-current-path]').forEach(n=>n.textContent=s.currentPath?'Ditt valda spår: '+s.currentPath.title:'Välj ett lärspår eller följ färdplanen.');
  document.querySelectorAll('[data-next-activity]').forEach(n=>{n.href=s.recommendation?.url||'academy.html#practice';n.textContent=s.recommendation?(read.data.events.length||read.data.attempts.length?'Fortsätt: ':'Starta här: ')+s.recommendation.title:'Repetera en aktivitet';});
  document.querySelectorAll('[data-next-reason]').forEach(n=>n.textContent=s.recommendation?.reason||'Du har avslutat färdplanen. Repetition ger inga extra XP.');
  for(const stage of s.roadmap)document.querySelectorAll(`[data-stage-status="${stage.id}"]`).forEach(n=>{n.textContent=({available:'Tillgänglig',ongoing:'Pågår',complete:'Klar'})[stage.state]+` · ${stage.done} av ${stage.total}`;n.closest('[data-roadmap]').dataset.state=stage.state;});
  for(const skill of s.skills){
   document.querySelectorAll(`[data-skill-bar="${skill.id}"]`).forEach(n=>n.value=skill.percent);
   document.querySelectorAll(`[data-skill="${skill.id}"]`).forEach(n=>n.textContent=`${skill.percent} % · Lektioner ${skill.lessons.done}/${skill.lessons.total} · Övningar ${skill.exercise.done}/${skill.exercise.total} · Scenarier ${skill.scenario.done}/${skill.scenario.total} · Projekt ${skill.challenge.done}/${skill.challenge.total} · Case ${skill.case.done}/${skill.case.total}`);
  }
  document.querySelectorAll('[data-achievement]').forEach(n=>{const earned=s.achievements.some(a=>a.id===n.dataset.achievement);n.querySelector('span').textContent=earned?'Uppnådd':'Inte nådd';n.classList.toggle('is-earned',earned);});
  document.querySelectorAll('[data-activity-status]').forEach(n=>n.textContent=s.complete.has(n.dataset.activityStatus)?'Klar':read.data.attempts.some(a=>a.objectId===n.dataset.activityStatus)?'Pågår':'Tillgänglig');
  if(object){
   const done=object.questions.filter(q=>s.passed.has(object.id+':'+q.id)).length;
   document.querySelector('[data-activity-progress]').textContent=`${done} av ${object.questions.length} steg klara`+(s.complete.has(object.id)?' · Aktiviteten är klar och sparad lokalt.':'');
   for(const q of object.questions){const attempts=read.data.attempts.filter(a=>a.objectId===object.id&&a.questionId===q.id),node=document.querySelector(`[data-question-history="${q.id}"]`);if(node)node.textContent=`${attempts.length} försök · ${attempts.filter(a=>a.correct).length} godkända kontroller`+(s.passed.has(object.id+':'+q.id)?' · Steget är klart':'');}
   document.querySelectorAll('[data-activity-question] button').forEach(b=>b.disabled=false);
  }
  return s;
 }
 document.querySelectorAll('[data-activity-question]').forEach(form=>form.addEventListener('submit',event=>{
  event.preventDefault();const q=object?.questions.find(q=>q.id===form.dataset.activityQuestion),output=form.querySelector('[data-answer-feedback]');if(!q)return;
  const values=new FormData(form),answer=q.kind==='reflection'?{text:values.get('reflection'),reviewed:values.has('reviewed')}:q.kind==='multiple'?values.getAll('answer'):values.get('answer');
  if(answer===null||answer===''||(Array.isArray(answer)&&!answer.length)){output.textContent='Ange ett svar innan du kontrollerar.';return;}
  try{
   const before=render();if(!before)return;
   const correct=C.grade(q,answer);P.attempt(object.id,q.id,correct);const after=render();
   output.textContent=(correct?(q.kind==='reflection'?'Självgranskningen är registrerad. Textens innehåll bedöms inte automatiskt. ':'Rätt. '):'Inte klart ännu. Försök igen. ')+(q.explanation||'Skriv minst 30 ord och granska mot samtliga kriterier.')+(after.xp>before.xp?` +${after.xp-before.xp} XP.`:correct?' Redan belönade steg ger inga nya XP.':'');
  }catch(e){output.textContent=e.message;}
 }));
 document.addEventListener('academy-check',event=>{
  try{P.attempt(event.detail.objectId,'answer',event.detail.correct);render();}catch(e){event.detail.output.textContent=e.message;}
 });
 document.querySelectorAll('[data-academy-path]').forEach(a=>a.addEventListener('click',()=>{try{P.attempt('path-'+a.dataset.academyPath,'visit',false);}catch(e){document.querySelector('[data-current-path]')?.replaceChildren(document.createTextNode(e.message));}}));
 window.NTMAcademyV3Refresh=render;
 window.addEventListener('storage',e=>{if(e.key===P.key||e.key===null)render();});
 render();
});
