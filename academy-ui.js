/* Enhances the static Academy. Reading and links work without JavaScript. */
document.addEventListener('DOMContentLoaded',()=>{
  const A=window.NTMAcademyCatalog,P=window.NTMAcademyProgress;if(!A||!P)return;
  const emit=name=>window.NTMEvents?.emit(name);
  const current=document.querySelector('[data-academy-lesson]')?.dataset.academyLesson;
  const message=document.getElementById('academyStatus');
  const error=e=>{if(message)message.textContent=e.message;};
  const labels={ongoing:'Pågår',complete:'Klar'};
  const params=new URLSearchParams(location.search),path=A.paths.find(p=>p.id===params.get('path')&&p.lessons.includes(current));
  function nextLesson(states){
    if(path)return path.lessons.find(id=>id!==current&&states.get(id)?.status!=='complete')||null;
    const lesson=A.lessons.find(l=>l.id===current);
    return A.published().find(l=>l.id!==current&&l.category===lesson?.category&&states.get(l.id)?.status!=='complete')?.id;
  }
  function render(){
    const result=P.read();if(result.error){error(new Error(result.error));document.querySelectorAll('[data-academy-complete]').forEach(b=>b.disabled=true);return;}
    const states=P.state(result.data),summary=P.summarize(A.published(),result.data);
    document.querySelectorAll('[data-academy-progress]').forEach(node=>{
      node.textContent=`${summary.done} av ${summary.total} lektioner klara — ${summary.percent} %`;
    });
    document.querySelectorAll('[data-academy-bar]').forEach(b=>{b.max=summary.total;b.value=summary.done;});
    document.querySelectorAll('[data-academy-status]').forEach(n=>{n.textContent=labels[states.get(n.dataset.academyStatus)?.status]||'Inte påbörjad';});
    document.querySelectorAll('[data-category-progress]').forEach(n=>{const s=P.summarize(A.published().filter(l=>l.category===n.dataset.categoryProgress),result.data);n.textContent=`${s.done} av ${s.total} klara · ${s.percent} %`;});
    const latest=[...states.values()].filter(e=>A.url(e.lessonId)&&e.status==='ongoing').sort((a,b)=>b.at.localeCompare(a.at))[0];
    const next=latest?.lessonId||A.published().find(l=>states.get(l.id)?.status!=='complete')?.id;
    document.querySelectorAll('[data-academy-continue]').forEach(a=>{a.href=next?A.url(next):'academy.html#lessons';a.textContent=next?(states.size?'Fortsätt där du slutade: ':'Börja här: ')+A.lessons.find(l=>l.id===next).title:'Alla lektioner klara — utforska igen';});
    document.querySelectorAll('[data-academy-complete]').forEach(b=>{b.disabled=false;const done=states.get(current)?.status==='complete';b.textContent=done?'Markera som pågår':'Markera som klar';b.setAttribute('aria-pressed',String(done));});
    const hasHistory=A.published().some(l=>states.has(l.id));
    document.querySelectorAll('[data-academy-start]').forEach(n=>n.hidden=hasHistory);
    document.querySelectorAll('[data-path-progress]').forEach(n=>{const s=A.journey(n.dataset.pathProgress,states);n.textContent=s.complete?'Spåret är klart — pröva det du lärt dig':`${s.done} av ${s.total} klara · ${Math.round(s.done/s.total*100)} %`;});
    document.querySelectorAll('[data-academy-path]').forEach(a=>{const p=A.paths.find(p=>p.id===a.dataset.academyPath),s=A.journey(p.id,states);a.href=A.url(s.next||p.lessons[0])+'?path='+p.id;if(!a.closest('[data-academy-start]')&&!a.closest('[data-path-end]'))a.textContent=s.complete?'Läs spåret igen':s.done||p.lessons.some(id=>states.has(id))?'Fortsätt spåret':'Börja spåret';});
    document.querySelectorAll('[data-path-lesson]').forEach(a=>{a.href=a.href.split('?')[0]+'?path='+a.dataset.pathLesson;});
    document.querySelectorAll('[data-path-end]').forEach(n=>n.hidden=!A.journey(n.dataset.pathEnd,states).complete);
    const list=document.querySelector('[data-recent-list]');
    if(list){const recent=[...states.values()].filter(e=>A.url(e.lessonId)&&e.status==='complete').sort((a,b)=>b.at.localeCompare(a.at)||b.id.localeCompare(a.id)).slice(0,3);list.replaceChildren();for(const e of recent){const li=document.createElement('li'),a=document.createElement('a');a.href=A.url(e.lessonId);a.textContent=A.lessons.find(l=>l.id===e.lessonId).title;li.append(a);list.append(li);}list.closest('[data-academy-recent]').hidden=!recent.length;}
    const previousNode=document.getElementById('academyPathPrevious'),sequence=path?.lessons||A.published().filter(l=>l.category===A.lessons.find(l=>l.id===current)?.category).map(l=>l.id),previous=sequence[sequence.indexOf(current)-1];if(previousNode&&previous){previousNode.hidden=false;previousNode.href=A.url(previous)+(path?'?path='+path.id:'');}
    const nextNode=document.getElementById('academyPathNext'),stateNode=document.getElementById('academyPathState');
    if(current&&nextNode){const next=nextLesson(states),complete=path&&A.journey(path.id,states).complete;nextNode.hidden=false;nextNode.href=next?A.url(next)+(path?'?path='+path.id:''):'academy.html#paths';nextNode.textContent=next?'Nästa: '+A.lessons.find(l=>l.id===next).title:'Välj nästa spår';if(stateNode)stateNode.textContent=complete?'Spåret är klart. '+path.endpoint:path?`${A.journey(path.id,states).done} av ${path.lessons.length} klara i spåret.`:'';}
  }
  if(current){
    emit('academy_lesson_opened');
    try{const r=P.read();if(r.error)throw new Error(r.error);if(P.state(r.data).get(current)?.status!=='complete')P.set(current,'ongoing',true);}catch(e){error(e);}
    document.querySelector('[data-academy-complete]')?.addEventListener('click',()=>{try{const r=P.read();if(r.error)throw new Error(r.error);const before=P.state(r.data),status=before.get(current)?.status==='complete'?'ongoing':'complete';P.set(current,status);const after=P.state(P.read().data);if(status==='complete'){emit('academy_lesson_completed');if(A.paths.some(p=>!A.journey(p.id,before).complete&&A.journey(p.id,after).complete))emit('academy_path_completed');}render();window.NTMAcademyV3Refresh?.();const next=nextLesson(after);if(message)message.textContent=status==='complete'?'Klar och sparad lokalt. '+(next?'Nästa: '+A.lessons.find(l=>l.id===next).title+'.':'Välj ett nytt spår eller pröva ett NTM-verktyg.'):'Lektionen är markerad som pågår. Du kan fortsätta när du vill.';}catch(e){error(e);}});
  }
  function filter(){const q=document.getElementById('academySearch')?.value||'',category=document.getElementById('academyCategory')?.value||'';const ids=new Set(A.search(q,category).map(l=>l.id));document.querySelectorAll('[data-lesson-card]').forEach(n=>n.hidden=!ids.has(n.dataset.lessonCard));const status=document.getElementById('academyResults');if(status)status.textContent=`${ids.size} lektioner visas`;const description=document.getElementById('academyCategoryDescription'),c=A.categories.find(c=>c.id===category);if(description)description.textContent=c?c.goal+'. '+c.description:'Välj område eller sök. Lektionerna går från grunder till tillämpning.';}
  let searchTracked=false;
  document.getElementById('academySearch')?.addEventListener('input',e=>{filter();if(e.target.value.trim()&&!searchTracked){emit('academy_search');searchTracked=true;}});document.getElementById('academyCategory')?.addEventListener('change',filter);
  const categorySelect=document.getElementById('academyCategory');if(categorySelect&&A.categories.some(c=>c.id===params.get('category')))categorySelect.value=params.get('category');
  document.querySelectorAll('[data-category-select]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();categorySelect.value=a.dataset.categorySelect;filter();history.replaceState(null,'','?category='+categorySelect.value+'#lessons');categorySelect.focus();}));
  document.querySelectorAll('[data-academy-path]').forEach(a=>a.addEventListener('click',()=>emit('academy_path_started')));
  document.querySelectorAll('.academy-quiz[data-quiz]').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();const quiz=A.lessons.find(l=>l.id===current)?.quiz[Number(form.dataset.quiz)];const answer=new FormData(form).get('answer');const output=form.querySelector('[role=status]');output.textContent=answer===null?'Välj ett alternativ för att se förklaringen.':(Number(answer)===quiz.answer?'Så är det. ':'Tänk på underlaget. ')+quiz.explanation;if(answer!==null)document.dispatchEvent(new CustomEvent('academy-check',{detail:{objectId:'check-'+current+'-'+form.dataset.quiz,correct:Number(answer)===quiz.answer,output}}));}));
  document.addEventListener('click',event=>{const a=event.target.closest?.('a[data-academy-tool]');if(a)emit('academy_tool_cta_clicked');});
  window.addEventListener('storage',e=>{if(e.key===P.key||e.key===null)render();});
  window.NTMAcademyRefresh=render;
  render();filter();
});
