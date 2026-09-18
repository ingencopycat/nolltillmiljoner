/* Bounded competency pilot, using canonical Knowledge and existing calculators. */
document.addEventListener('DOMContentLoaded',()=>{
 'use strict';
 const C=window.NTMAcademyCompetencies,E=window.NTMAcademyEvidence,P=window.NTMAcademyProgress,K=window.NTMKnowledgeCatalog,H=window.NTMWave1Context;
 const root=document.getElementById('academyCompetencies'),mini=document.getElementById('academyMiniHeading');if(!root&&!mini)return;
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,fn)=>{const b=node('button',text,'secondary-btn');b.type='button';b.onclick=fn;return b;};
 const link=(text,url)=>{const a=node('a',text);a.href=url;return a;};
 let active=null,selected=null,workspace,cards,status;
 function read(){const r=P.read();if(r.error)throw Error(r.error);return r.data;}
 function message(text){if(status)status.textContent=text;else document.getElementById('academyStatus').textContent=text;}
 const safe=fn=>()=>{try{fn();}catch(e){message(e.message);}};
 function summary(){
  const data=read(),states=E.derive(data),next=E.next(data);
  if(mini){const a=mini.parentElement.querySelector('[data-next-activity]');if(next&&next.state!=='new'){a.href='academy.html#competency='+next.id;a.textContent='Fortsätt lära: '+next.title;}return;}
  cards.replaceChildren();
  for(const s of states){const card=node('article',null,'card'),c=C.competencies.find(c=>c.id===s.id);card.append(node('h3',c.title),node('p',s.label),node('p',c.goal),button('Öppna '+c.title,safe(()=>open(c.id))));card.dataset.competency=s.id;card.id='competency='+s.id;cards.append(card);}
 }
 function open(id){
  if(active&&!confirm('Lämna detta påbörjade försök? Det finns kvar som påbörjat; ett nytt försök på samma variant räknas som repetition.'))return;
  active=null;selected=C.competencies.find(c=>c.id===id);if(!selected)return;
  P.set('competency-'+id,'ongoing');history.replaceState(null,'','#competency='+id);summary();show();
 }
 function help(container){
  const details=node('div');details.id='competencyKnowledge';details.hidden=true;
  container.append(button('Förklara med Knowledge',safe(()=>{
   if(active)E.record(active,'help');
   details.replaceChildren();for(const id of selected.knowledge){const entry=K.publicEntries().find(e=>e.id===id);if(!entry){details.append(node('p','Förklaringen är inte tillgänglig.'));continue;}
    details.append(node('h4',entry.question),node('p',entry.shortAnswer),node('p',entry.caveats,'note'));
    const a=link('Läs hela svaret (ny flik)',K.url(id)+'#task-help');a.target='_blank';a.rel='noopener noreferrer';details.append(a);
   }
   details.hidden=false;message(active?'Hjälp registrerad. Det här försöket räknas som övning.':'Läs före försöket om du vill. Inget bedömt försök pågår.');
  })),details);
 }
 function show(){
  const s=E.derive(read()).find(s=>s.id===selected.id);workspace.replaceChildren();workspace.append(node('h3',selected.title),node('p',s.label+' · '+selected.goal));
  workspace.append(node('p',s.state==='new'?'Börja med begreppet och pröva sedan ett eget svar.':s.laterFailure?'En senare återblick gick inte rätt. Din tidigare förståelse och historik finns kvar; repetera och pröva ett nytt exempel.':s.state==='demonstrated'?'Du har visat förståelse i detta avgränsade pilotmaterial: självständigt nytt exempel, tillämpning och senare återblick. Det är ingen certifiering.':s.first?'Ett självständigt nytt exempel finns. Fortsätt med tillämpning och en senare återblick.':'Läsning och övning finns, men de visar inte ännu självständig förståelse.'));
  if(s.legacy)workspace.append(node('p','Tidigare aktivitet finns kvar. Den saknar uppgifter om självständighet och räknas inte som visad förståelse.','note'));
  const lessons=node('p','Läs grunden: ');selected.lessons.forEach(id=>lessons.append(link(id,'academy-'+id+'.html'),document.createTextNode(' · ')));workspace.append(lessons);help(workspace);
  if(s.next)workspace.append(button(({practice:'Försök utan hjälp',application:'Tillämpa i ett nytt exempel',delayed:'Gör en senare återblick'})[s.next.context],safe(()=>begin(s.next))));
  if(s.waiting)workspace.append(node('p',`Senare återblick tidigast ${new Date(s.dueAt).toLocaleString('sv-SE')}. Sju dagar är pilotens regel, inte ett bevis på bestående behärskning.`));
  if(s.exhausted)workspace.append(node('p','Pilotens nya varianter för detta steg är använda. Repetera gärna; repetition kan inte ge ny självständig evidens. Fler granskade varianter behövs innan steget kan prövas på nytt.'));
  workspace.append(button('Repetera första exemplet',safe(()=>begin(C.tasks.find(t=>t.competency===selected.id&&t.context==='practice')))));
  const history=node('details');history.append(node('summary','Se vad du har gjort'));
  if(!s.history.length)history.append(node('p','Inga bedömda försök ännu.'));
  for(const a of s.history.slice(-12).reverse())history.append(node('p',`${new Date(a.start?.at||a.end?.at).toLocaleString('sv-SE')} · ${a.context==='application'?'Tillämpning':a.context==='delayed'?'Senare återblick':'Övning'} · ${a.end?(a.correct?'Rätt':'Behöver repetition'):'Påbörjat'} · ${!a.valid?'Underlaget kan inte bedömas':a.independent?'Självständigt nytt exempel':a.help||a.reveal?'Med hjälp eller visat svar':'Repetition eller ännu inte avslutat'}`));
  workspace.append(history);workspace.focus();
 }
 function scenario(t,which){
  // Opening an application tool is help; it never grades the learner or imports personal work.
  if(active)E.record(active,'help');
  const payload=H.createPractice({competency:t.competency,task:t.id,version:t.version},which),routes={'valuation-simple':'aktievarderingskalkylator.html','fx-percent':'valutajusterad-avkastning.html','savings-capital':'sparmalskalkylator.html'};
  let child;try{child=window.open('about:blank','_blank');if(!child)throw Error('Tillåt en ny flik för övningen. Försöket ligger kvar här.');child.opener=null;child.sessionStorage.clear();const token=crypto.randomUUID();child.sessionStorage.setItem(H.key,H.pack(token,payload));child.location.replace(routes[which.destination]+'#practice='+token);message('Övningsförhandsvisningen öppnades i en ny flik. Återgå hit och svara; att använda verktyget registrerar inte förståelse.');}catch(e){child?.close();throw e;}
 }
 function begin(t){
  active=E.start(t.id);summary();workspace.replaceChildren(node('h3',selected.title),node('p',t.context==='application'?'Tillämpning · syntetiskt exempel. Verktyg och hjälp är tillåtna och registreras separat.':t.context==='delayed'?'Senare återblick · försök utan hjälp.':'Nytt försök · försök utan hjälp.'));
  const form=node('form');form.id='competencyAttempt';form.className='academy-quiz';const field=node('fieldset');field.append(node('legend',t.prompt));
  const label=node('label','Ditt numeriska svar i frågans enhet'),input=node('input');input.name='number';input.type='number';input.step='any';input.required=true;input.inputMode='decimal';label.append(input);field.append(label);
  t.choices.forEach((text,i)=>{const l=node('label'),r=node('input');r.name='interpretation';r.type='radio';r.value=i;r.required=true;l.append(r,document.createTextNode(text));field.append(l);});form.append(field);
  const submit=node('button','Kontrollera mitt svar','secondary-btn');submit.type='submit';form.append(submit);const feedback=node('p');feedback.setAttribute('role','status');feedback.id='competencyFeedback';form.append(feedback);workspace.append(form);help(workspace);
  workspace.append(button('Visa svaret och öva',safe(()=>{E.record(active,'reveal');feedback.textContent=t.explanation;message('Svaret visat. Detta försök kan inte räknas som självständigt.');})));
  if(t.context==='application'&&t.scenario)workspace.append(button('Öppna syntetiskt kalkylatorexempel',safe(()=>scenario(t,t.scenario))));
  if(t.context==='application'&&t.savings)workspace.append(button('Pröva köpkraft i sparmål',safe(()=>scenario(t,t.savings))));
  form.onsubmit=e=>{e.preventDefault();try{const values=new FormData(form),value=values.get('number');if(value===''||values.get('interpretation')===null)return;const correct=C.grade(t,Number(value),values.get('interpretation'));E.record(active,'submit',correct);active=null;submit.disabled=true;feedback.textContent=(correct?'Rätt. ':'Inte rätt ännu. ')+t.explanation;summary();workspace.append(button('Se mitt nästa steg',safe(show)));}catch(error){message(error.message);}};
  input.focus();
 }
 if(root){root.replaceChildren(node('h2','Tre saker att förstå och använda'),node('p','Läs → försök själv → tillämpa → återkom senare. Tidigare XP och avslutade lektioner finns kvar som aktivitetshistorik.'));
  cards=node('div',null,'academy-grid');workspace=node('section',null,'card');workspace.id='competencyWorkspace';workspace.tabIndex=-1;status=node('p');status.id='competencyStatus';status.setAttribute('role','status');root.append(cards,workspace,status);
 }
 try{summary();if(root){const id=location.hash.startsWith('#competency=')?location.hash.slice(12):new URLSearchParams(location.search).get('competency');if(C.competencies.some(c=>c.id===id))open(id);}}catch(e){message(e.message);}
 window.addEventListener('storage',e=>{if(e.key===P.key){try{summary();if(active)message('Lärhistoriken ändrades i en annan flik. Ditt svar finns kvar. Försök med motstridig ordning kan inte räknas som självständiga.');}catch(err){message(err.message);}}});
 window.addEventListener('beforeunload',e=>{if(active){e.preventDefault();e.returnValue='';}});
});
