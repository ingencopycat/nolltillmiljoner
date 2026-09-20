/* FINAL A production presentation. Canonical retrieval and lazy-body validation are unchanged. */
(() => {
 'use strict';
 const shell=document.getElementById('knowledgeExperience');if(!shell)return;
 const p=new URLSearchParams(location.search),$=id=>document.getElementById(id);
 let searched=false;
 shell.hidden=false;document.getElementById('knowledgeFallback').hidden=true;
 let K=window.NTMKnowledgeCatalog,sequence=0,trail=[],currentId=null;
 const n=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 const button=(text,fn,cls='text-button')=>{const b=n('button',text,cls);b.type='button';b.onclick=fn;return b;};
 const a=(text,url)=>{const el=n('a',text);el.href=url;return el;};
 const setStatus=text=>$('status').textContent=text;
 if(!K){$('ask').replaceChildren(n('h1','Kunskapsbanken kunde inte laddas'),a('Läs granskade svar','fragor-svar-omrade-valuation-1.html'));return;}
 const entry=id=>K.entries.find(e=>e.id===id),safeEntry=id=>K.publicEntries().find(e=>e.id===id);
 const labels={definition:'Förklara',comparison:'Jämför',interpretation:'Tolka',calculation:'Räkna',limitation:'Begränsningar',misconception:'Vanliga missförstånd',process:'Arbetssätt',application:'Använd i praktiken'};
 const actions=async()=>{
  const R=window.NTMRelations;if(!R)throw Error('Relations unavailable');
  const catalog=R.catalog([]),result={};
  for(const e of K.publicEntries())result[e.id]=R.query(catalog,'knowledge-'+e.id,{limit:5}).map(r=>({...r.destination,relationId:r.id}));
  return result;
 };
 function url(id,mode='ask'){const u=new URL('fragor-svar.html',location.href);if(id&&safeEntry(id))u.searchParams.set('id',id);if(mode!=='ask')u.searchParams.set('mode',mode);if(location.hash==='#task-help')u.hash='task-help';return u.pathname+u.search+u.hash;}
 function remember(id,mode='ask'){history.pushState({id:id||null,mode,trail:trail.slice(-5)},'',url(id,mode));}
 function mode(name,save=true){if(!['ask','search','explore'].includes(name))name='ask';sequence++;for(const m of ['ask','search','explore']){$(m).hidden=m!==name;const b=document.querySelector(`[data-mode="${m}"]`);if(m===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}if(save)remember(name==='ask'?currentId:null,name);if(name==='search'){renderSearch();$('searchInput').focus();}else if(name==='explore')renderCategories();}
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode(b.dataset.mode);if(b.dataset.mode==='ask')$('question').focus();});
 function renderTrail(){const el=$('trail');el.replaceChildren();if(trail.length<2)return;el.append(n('span','Din frågeresa','eyebrow'));for(const id of trail.slice(-5)){const e=entry(id);if(e)el.append(button(e.question,()=>show({kind:'ANSWER',answerId:id}),id===currentId?'trail-current':'text-button'));}}
 function disclosure(title,content,cls){const d=n('details',undefined,cls);d.append(n('summary',title),content);return d;}
 function related(e){const box=n('section',undefined,'related');box.append(n('h2','Fortsätt utforska'));
  const types={'prerequisite':'Förstå grunden','deeper':'Fördjupa','comparison':'Jämför med','common-confusion':'Vanlig förväxling','related-metric':'Närliggande begrepp','next-question':'Nästa fråga','application':'Använd i praktiken'};
  // The lazy body projection intentionally cannot resolve other IDs alone.
  // Typed cross-answer links belong to the complete compact index.
  const refs=entry(e.id)?.relatedAnswers||[];if(!refs.some(r=>safeEntry(r.id)))box.hidden=true;
  for(const r of refs.slice(0,6)){const next=safeEntry(r.id);if(!next)continue;const link=a('',url(r.id));link.className='related-link';link.append(n('small',types[r.type]||'Fördjupa'),n('span',next.question+' ↗'));link.onclick=ev=>{if(ev.ctrlKey||ev.metaKey||ev.shiftKey||ev.altKey)return;ev.preventDefault();show({kind:'ANSWER',answerId:r.id});};box.append(link);}return box;
 }
 async function use(e){const box=n('section',undefined,'use');box.append(n('h2','Använd det'));let rows=[];try{rows=(await actions())[e.id]||[];}catch(_){box.append(n('p','Fortsättningslänkarna kunde inte laddas.'));return box;}
  for(const r of rows.slice(0,4)){const target=new URL(r.url,location.origin);if(target.origin!==location.origin||!target.pathname.endsWith('.html'))continue;const label=(r.type==='learn'?'Träna i Academy: ':r.type==='research'?'Öppna ':r.type==='workflow'?'Använd i Research: ':r.type==='macro'?'Se i Makro: ':'Testa: ')+r.title;const link=a(label+' ↗',target.pathname+target.search+target.hash);link.target='_blank';link.rel='noopener noreferrer';link.dataset.product='';link.dataset.knowledgeRelated='';link.dataset.relationId=r.relationId;box.append(link);}
  if(!rows.length)box.hidden=true;
  box.append(n('p',rows.length?'Öppnas i ny flik. Svaret är kvar här. Inga värden eller texter förs över.':'Ingen publicerad produktfortsättning är kopplad till detta svar.'));return box;
 }
 function trust(e){const list=n('div',undefined,'source-list');list.append(n('p','Senast granskad '+e.reviewedAt));const supports={shortAnswer:'Kort svar',fullAnswer:'Fördjupning',example:'Exempel',caveats:'Begränsningar',comparison:'Jämförelse'};
  for(const s of e.sources||[]){const row=n('section'),link=a(s.title,s.url);link.target='_blank';link.rel='noopener noreferrer';row.append(link,n('p',s.supports?.length?'Underlag för: '+s.supports.map(v=>supports[v]).filter(Boolean).join(', ')+'.':'Källan är angiven i svaret; avsnittsstöd är inte specificerat.'));if(s.reviewedAt)row.append(n('p','Granskningsdatum: '+s.reviewedAt));if(s.limitations)row.append(n('p',s.limitations));list.append(row);}
  list.append(n('p','Antalet källor är inte ett kvalitetsbetyg. Läs vad underlaget stödjer.'));const count=(e.sources||[]).length;const d=disclosure(`Källor & granskning · ${count} ${count===1?'källa':'källor'}`,list,'sources');d.id='sources';return d;
 }
 function comparison(c){const table=n('table',undefined,'comparison'),head=n('thead'),hr=n('tr'),body=n('tbody');table.append(n('caption','Jämförelse av begreppen'));for(const text of ['Aspekt',c.leftLabel,c.rightLabel]){const th=n('th',text);th.scope='col';hr.append(th);}head.append(hr);table.append(head);for(const x of c.axes){const row=n('tr'),th=n('th',x.label);th.scope='row';row.append(th,n('td',x.left),n('td',x.right));body.append(row);}table.append(body);return table;}
 function formula(){const box=n('div');box.append(n('p','Endast P/E. Pris och EPS ska ha samma valuta och aktiebas.'));
  const form=n('form');form.className='formula-form';for(const [name,text]of [['price','Pris per aktie'],['eps','EPS per aktie']]){const lab=n('label',text),input=n('input');input.type='number';input.step='any';input.name=name;input.required=true;lab.append(input);form.append(lab);}for(const [name,text,opts]of [['currency','Valuta',[['SEK','SEK'],['USD','USD'],['EUR','EUR'],['GBP','GBP']]],['period','EPS-period',[['annual','Helt år'],['ttm','Senaste tolv månaderna'],['forward','Kommande helt år – antagande']]]]){const lab=n('label',text),select=n('select');select.name=name;for(const [value,title]of opts){const o=n('option',title);o.value=value;select.append(o);}lab.append(select);form.append(lab);}const submit=n('button','Beräkna P/E');submit.type='submit';form.append(submit);form.onsubmit=ev=>{ev.preventDefault();const f=form.elements;show(K.calculate('pe',{price:Number(f.price.value),eps:Number(f.eps.value),currency:f.currency.value,period:f.period.value}));};box.append(form);return disclosure('Pröva P/E med egna exempelvärden',box,'formula');}
 async function show(outcome,save=true){mode('ask',false);const ticket=++sequence;currentId=null;$('answer').replaceChildren();$('answer').dataset.outcome=outcome.kind;$('starts').hidden=true;$('again').hidden=false;shell.classList.add('has-answer');setStatus('');
  if(outcome.kind!=='ANSWER'){
   const view=n('section',undefined,'boundary'),copy={CLARIFY:['Menar du…','Välj den granskade fråga som passar det du vill förstå.'],INVALID_INPUT:['Lite mer underlag behövs','För P/E behövs pris, EPS, samma valuta och en helårsperiod. Använd fälten nedan.'],ABSTAIN_UNSUPPORTED_JUDGMENT:['Ett nyckeltal kan inte fatta ditt beslut','Kunskapsbanken avgör inte vad du bör köpa eller sälja. Du kan förstå metoden och pröva dina egna antaganden.'],ABSTAIN_NO_COVERAGE:['Här saknas ett granskat svar','Prova en tydligare fråga eller utforska kunskapsbanken. NTM fyller inte luckan med ett påhittat svar.']}[outcome.kind]||['Svaret är inte tillgängligt','Prova en annan fråga.'];
   const heading=n('h2',copy[0]);heading.tabIndex=-1;view.append(heading,n('p',copy[1]));if(outcome.kind==='CLARIFY')for(const id of outcome.choices){const e=safeEntry(id);if(e)view.append(button(e.question,()=>show({kind:'ANSWER',answerId:id}),'choice'));}
   if(outcome.kind==='INVALID_INPUT'){const f=formula();f.open=true;view.append(f);}if(outcome.kind==='ABSTAIN_UNSUPPORTED_JUDGMENT'){view.append(button(entry('pe-interpretation').question,()=>show({kind:'ANSWER',answerId:'pe-interpretation'}),'choice'));const link=a('Bygg en egen tes i Research ↗','/research.html');link.target='_blank';link.rel='noopener noreferrer';view.append(link,n('p','Research öppnas separat. Ingen tes skrivs åt dig.'));}view.append(button('Ställ en annan fråga',()=>$('question').focus()));$('answer').append(view);if(save){const kind={CLARIFY:'clarify',INVALID_INPUT:'invalid',ABSTAIN_UNSUPPORTED_JUDGMENT:'judgment',ABSTAIN_NO_COVERAGE:'none'}[outcome.kind]||'none';history.pushState({mode:'ask',kind,choices:outcome.choices||[],trail:trail.slice(-5)},'',(()=>{const u=new URL(url(null),location.origin);u.searchParams.set('outcome',kind);return u.pathname+u.search+u.hash;})());}setStatus(copy[0]);heading.focus();renderTrail();return;
  }
  const meta=safeEntry(outcome.answerId);if(!meta){unavailable('Svaret väntar på granskning eller länken är okänd.');return;}
  setStatus('Öppnar granskat svar…');let e;try{e=await K.load(meta.id);if(!await K.explain(meta.id,'knowledge','compact'))throw Error();}catch(_){if(ticket===sequence)unavailable('Svaret kunde inte laddas säkert. Inget ofullständigt eller felaktigt versionsunderlag visas.',meta.id);return;}if(ticket!==sequence)return;
  currentId=e.id;if(trail.at(-1)!==e.id)trail.push(e.id);trail=trail.slice(-5);if(save)remember(e.id);renderTrail();window.NTMEvents?.emit('knowledge_answer_opened');
  const grid=n('div',undefined,'answer-grid'),article=n('article',undefined,'answer-reading');article.append(n('p',K.categories.find(c=>c.id===e.category)?.title||'Granskat svar','eyebrow'));const h=n('h2',e.question);h.tabIndex=-1;h.id='answerTitle';article.setAttribute('aria-labelledby',h.id);article.dataset.knowledgeAnswer=e.id;article.append(h,n('p',e.shortAnswer,'lead'));
  if(e.period&&e.period!=='timeless')article.append(n('p',`Gäller ${e.jurisdiction==='SE'?'Sverige · ':''}${e.period}`,'scope'));if(e.reviewDue&&e.reviewDue<=new Date().toISOString().slice(0,10))article.append(n('p','Ny granskning behövs. Läs med denna begränsning.','scope'));
  if(outcome.calculation){const c=outcome.calculation,calc=n('section',undefined,'calculated');calc.append(n('h3','Beräknat resultat'));if(c.value===null)calc.append(n('p','Negativ EPS — ingen vanlig P/E-tolkning.'));else{calc.append(n('p',Number(c.value.toPrecision(8))+' gånger','result-number'),n('p',`${c.inputs.price} ${c.inputs.currency}/aktie ÷ ${c.inputs.eps} ${c.inputs.currency}/aktie = ${Number(c.value.toPrecision(8))}`),n('p','Pris per aktie / vinst per aktie · '+{annual:'helt år',ttm:'senaste tolv månaderna',forward:'kommande helt år – antagande'}[c.inputs.period]));}calc.append(n('p','Beräkningen avgör inte om aktien är billig eller dyr. Exempelvärden sparas inte; en delad länk öppnar förklaringen.'));article.append(calc);}
  const depth=n('div',undefined,'depth-body');depth.append(n('p',e.fullAnswer));if(e.example)depth.append(n('h3','Exempel'),n('p',e.example));depth.append(n('h3','Begränsningar'),n('p',e.caveats));const d=disclosure('Fördjupa · exempel & begränsningar',depth,'depth');d.id='depth';article.append(d);
  if(e.sections?.comparison)article.append(comparison(e.sections.comparison),n('p',e.sections.comparison.limitations,'note'));
  if(e.sections?.formula?.template==='pe/1')article.append(formula());
  const source=trust(e),relations=related(e),product=await use(e);if(ticket!==sequence)return;
  const canonical=a('Läs den fristående svarssidan ↗','/'+K.url(e.id));canonical.target='_blank';canonical.rel='noopener noreferrer';
  article.append(source,product,relations,canonical);grid.append(article);
  $('answer').append(grid);setStatus('Granskat svar öppnat.');h.focus({preventScroll:true});
 }
 function unavailable(message,id){setStatus('Svaret är inte tillgängligt.');$('answer').replaceChildren(n('h2','Vi kunde inte öppna svaret'),n('p',message),...(id&&safeEntry(id)?[button('Försök igen',()=>show({kind:'ANSWER',answerId:id}))]:[]),a('Till granskade svar','/fragor-svar.html'));}
 function ask(q){$('question').value=q;return show(K.respond(q));}
 $('question').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('composer').requestSubmit();}});
 $('composer').onsubmit=ev=>{ev.preventDefault();ask($('question').value);};document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>ask(b.dataset.query));$('newQuestion').onclick=()=>{$('question').value='';$('question').focus();$('composer').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
 function rows(entries,target){target.replaceChildren();for(const e of entries){const link=a('',url(e.id));link.className='result-row';link.dataset.knowledgeCard=e.id;link.append(n('small',(K.categories.find(c=>c.id===e.category)?.title||'')+' · '+labels[e.intent]),n('span',e.question+' ↗'));link.onclick=ev=>{if(ev.ctrlKey||ev.metaKey||ev.shiftKey||ev.altKey)return;ev.preventDefault();show({kind:'ANSWER',answerId:e.id});};target.append(link);}}
 function renderSearch(){
   const meaningful=window.NTMKnowledgeCore.normalize($('searchInput').value).length>=2;
   $('search').querySelector('.filters').hidden=!meaningful;
   let empty=$('searchBlank');if(!empty){empty=n('div',undefined,'search-blank');empty.id='searchBlank';empty.append(n('p','Sök efter en fråga eller ett begrepp, till exempel P/E.'),button('Vill du upptäcka något? Utforska →',()=>mode('explore')));$('results').before(empty);}empty.hidden=meaningful;
   if(!meaningful){$('results').replaceChildren();$('searchStatus').textContent=$('searchInput').value.trim()?'Skriv minst två bokstäver eller siffror för att söka.':'';return;}
   if(!searched){window.NTMEvents?.emit('knowledge_search');searched=true;}
   const found=K.search($('searchInput').value,$('category').value).filter(e=>!$('intent').value||e.intent===$('intent').value);
   rows(found.slice(0,12),$('results'));
   $('searchStatus').textContent=!found.length?'Inga granskade svar matchar. Prova ett annat begrepp.':found.length>12?`${found.length} matchande svar. De första 12 visas. Precisera sökningen eller välj område för att hitta rätt.`:`${found.length} matchande svar`;
 }
 for(const c of K.categories){const o=n('option',c.title);o.value=c.id;$('category').append(o);}for(const [id,title]of Object.entries(labels)){const o=n('option',title);o.value=id;$('intent').append(o);}for(const id of ['searchInput','category','intent'])$(id).addEventListener(id==='searchInput'?'input':'change',renderSearch);
 function renderCategories(){$('categories').replaceChildren();$('concepts').replaceChildren();for(const c of K.categories){const b=button(c.title,()=>renderConcepts(c.id),'category-row');b.append(n('span','Utforska →'));$('categories').append(b);}}
 function renderConcepts(category,offset=0){const box=$('concepts');box.replaceChildren();const title=n('h2',K.categories.find(c=>c.id===category).title);title.tabIndex=-1;box.append(title);const valid=new Set(K.publicEntries().filter(e=>e.category===category).flatMap(e=>e.conceptRefs||[])),concepts=K.knowledgeConcepts.filter(c=>valid.has(c.id));for(const c of concepts.slice(offset,offset+10)){const group=n('details'),s=n('summary',c.term),list=n('div');group.append(s,list);let page=0;const render=()=>{const found=K.publicEntries().filter(e=>e.conceptRefs?.includes(c.id));rows(found.slice(page*8,page*8+8),list);if(found.length>8)list.append(button(page*8+8<found.length?'Fler frågor →':'Till första frågorna',()=>{page=page*8+8<found.length?page+1:0;render();}));};group.ontoggle=()=>{if(group.open)render();else list.replaceChildren();};box.append(group);}if(concepts.length>10)box.append(button(offset+10<concepts.length?'Fler begrepp →':'Till första begreppen',()=>renderConcepts(category,offset+10<concepts.length?offset+10:0)));title.focus();}
 window.addEventListener('popstate',ev=>{const v=ev.state||{};trail=(v.trail||[]).filter(id=>safeEntry(id)).slice(-5);$('question').value='';if(v.id||new URLSearchParams(location.search).get('id'))show({kind:'ANSWER',answerId:v.id||new URLSearchParams(location.search).get('id')},false);else if(v.kind)show({kind:{clarify:'CLARIFY',invalid:'INVALID_INPUT',judgment:'ABSTAIN_UNSUPPORTED_JUDGMENT',none:'ABSTAIN_NO_COVERAGE'}[v.kind],choices:(v.choices||[]).filter(id=>safeEntry(id))},false);else{mode(v.mode||'ask',false);if((v.mode||'ask')==='ask'){$('answer').replaceChildren();delete $('answer').dataset.outcome;$('starts').hidden=false;$('again').hidden=true;$('trail').replaceChildren();setStatus('');shell.classList.remove('has-answer');}}});
 window.addEventListener('pagehide',()=>{$('question').value='';$('searchInput').value='';document.querySelectorAll('.formula-form input').forEach(el=>el.value='');});
 history.replaceState({mode:p.get('mode')||'ask',trail:[]},'');
 function restore(){const state=new URLSearchParams(location.search),category=location.hash.replace('#category-','');
  if(state.has('id'))show({kind:'ANSWER',answerId:state.get('id')},false);
  else if(K.categories.some(c=>c.id===category)){mode('explore',false);renderConcepts(category);}
  else if(state.has('outcome'))show({kind:{invalid:'INVALID_INPUT',judgment:'ABSTAIN_UNSUPPORTED_JUDGMENT',none:'ABSTAIN_NO_COVERAGE',clarify:'CLARIFY'}[state.get('outcome')]||'ABSTAIN_NO_COVERAGE',choices:[]},false);
  else mode(state.get('mode')||'ask',false);
 }
 window.addEventListener('hashchange',restore);restore();
})();
