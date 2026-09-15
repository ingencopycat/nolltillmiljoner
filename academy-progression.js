/* Deterministic derived progression; persistence lives in academy-progress.js. */
(function(root){
 'use strict';
 const A=typeof module!=='undefined'?require('./academy-catalog.js'):root.NTMAcademyCatalog;
 const C=typeof module!=='undefined'?require('./academy-activities.js'):root.NTMAcademyActivities;
 const P=typeof module!=='undefined'?require('./academy-progress.js'):root.NTMAcademyProgress;
 function derive(input){
  const data=P.validate(input),states=P.state(data),learned=new Set(data.events.filter(e=>e.status==='complete'&&A.url(e.lessonId)).map(e=>e.lessonId));
  const passed=new Set(data.attempts.filter(e=>e.correct).map(e=>e.objectId+':'+e.questionId));
  const attempted=new Set(data.attempts.map(e=>e.objectId));
  const complete=new Set(),rewards=new Map(),correctQuestions=new Set();
  for(const id of learned)rewards.set('lesson:'+id,C.rules.lesson);
  for(const o of C.published()){
    for(const q of o.questions)if(q.kind!=='reflection'&&passed.has(o.id+':'+q.id))correctQuestions.add(o.id.startsWith('check-')?o.id+':'+q.id:q.id);
    if(o.questions.every(q=>passed.has(o.id+':'+q.id))){complete.add(o.id);rewards.set('object:'+o.id,C.rules[o.type]);}
  }
  for(const id of correctQuestions)rewards.set('question:'+id,C.rules.question);
  const paths=A.paths.filter(p=>p.lessons.every(id=>learned.has(id)));
  paths.forEach(p=>rewards.set('path:'+p.id,C.rules.path));
  const xp=[...rewards.values()].reduce((a,b)=>a+b,0),level=C.levels.filter(l=>xp>=l.xp).at(-1),nextLevel=C.levels.find(l=>l.xp>xp)||null;
  const counts=Object.fromEntries(['exercise','scenario','challenge','case'].map(type=>[type,C.published().filter(o=>o.type===type&&complete.has(o.id)).length]));
  counts.lesson=learned.size;counts.path=paths.length;
  const achievements=C.achievements.filter(a=>a.kind==='object'?complete.has(a.target):counts[a.kind]>=a.target);
  const skills=A.categories.map(c=>{
    const lessons=A.published().filter(l=>l.category===c.id),objects=C.published().filter(o=>o.skill===c.id);
    const lessonDone=lessons.filter(l=>states.get(l.id)?.status==='complete').length;
    const parts=Object.fromEntries(['exercise','scenario','challenge','case'].map(type=>{const relevant=objects.filter(o=>o.type===type);return [type,{done:relevant.filter(o=>complete.has(o.id)).length,total:relevant.length}];}));
    const done=lessonDone+objects.filter(o=>complete.has(o.id)).length,total=lessons.length+objects.length;
    return {id:c.id,title:c.title,lessons:{done:lessonDone,total:lessons.length},...parts,done,total,percent:total?Math.round(done/total*100):0};
  });
  const roadmap=C.roadmap.map(s=>{
    const done=s.lessons.filter(id=>states.get(id)?.status==='complete').length+Number(complete.has(s.milestone)),total=s.lessons.length+1;
    const started=s.lessons.some(id=>states.has(id))||attempted.has(s.milestone);
    return {...s,done,total,state:done===total?'complete':started?'ongoing':'available'};
  });
  const visit=data.attempts.filter(e=>e.questionId==='visit'&&A.paths.some(p=>'path-'+p.id===e.objectId)).sort((a,b)=>b.at.localeCompare(a.at)||b.id.localeCompare(a.id))[0];
  const currentPath=A.paths.find(p=>'path-'+p.id===visit?.objectId)||null;
  let recommendation;
  const lesson=(id,reason)=>({type:'lesson',id,title:A.lessons.find(l=>l.id===id).title,url:A.url(id),reason});
  const activity=(id,reason)=>({type:'activity',id,title:C.objects.find(o=>o.id===id).title,url:C.url(id),reason});
  if(states.get('pe')?.status==='complete'&&states.get('eps')?.status!=='complete')recommendation=lesson('eps','P/E bygger på EPS. Repetera nämnaren innan nästa värderingssteg.');
  else if(['aktier','fonder','risk'].every(id=>states.get(id)?.status==='complete')&&!complete.has('recovery'))recommendation=activity('recovery','Du har läst grundbegreppen. Pröva nu återhämtningsmatematiken.');
  else if(['pe','eps','cagr'].every(id=>states.get(id)?.status==='complete')&&states.get('reverse')?.status!=='complete')recommendation=lesson('reverse','Värderingsgrunderna är klara. Undersök vad priset kräver.');
  else {
    const ongoing=[...states.values()].filter(e=>e.status==='ongoing'&&A.url(e.lessonId)).sort((a,b)=>b.at.localeCompare(a.at))[0];
    const unfinished=C.published().find(o=>!complete.has(o.id)&&attempted.has(o.id));
    if(unfinished)recommendation=activity(unfinished.id,'Fortsätt den övning du har påbörjat.');
    else if(ongoing)recommendation=lesson(ongoing.lessonId,'Din senast påbörjade lektion.');
    else {const stage=roadmap.find(s=>s.state!=='complete');if(stage){const id=stage.lessons.find(id=>states.get(id)?.status!=='complete');recommendation=id?lesson(id,'Nästa ej avslutade lektion i färdplanen.'):activity(stage.milestone,'Pröva etappens praktiska milstolpe.');}}
  }
  return {xp,level,nextLevel,levelPercent:nextLevel?Math.round((xp-level.xp)/(nextLevel.xp-level.xp)*100):100,rewards,passed,complete,counts,achievements,skills,roadmap,currentPath,recommendation};
 }
 const api={derive};root.NTMAcademyProgression=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
