/* Reviewed retrieval only. No query/value persistence, telemetry payload or remote inference. */
document.addEventListener('DOMContentLoaded',()=>{
 'use strict';
 const K=window.NTMKnowledgeCatalog;if(!K)return;
 const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const link=e=>{const a=node('a',e.question);a.href=K.url(e.id);return a;};
 const emit=name=>window.NTMEvents?.emit(name);
 const direct=document.querySelector('[data-knowledge-answer]');if(direct){emit('knowledge_answer_opened');const e=K.entries.find(e=>e.id===direct.dataset.knowledgeAnswer);if(e?.reviewDue&&e.reviewDue<=new Date().toISOString().slice(0,10)){const notice=node('p','Granskningsdatumet har passerat. Svaret behöver kontrolleras mot aktuellt underlag.');notice.setAttribute('role','status');if(e.reviewPolicy?.overdue==='suppress'){direct.replaceChildren(node('h1','Svaret väntar på ny granskning'),notice);const a=node('a','Till kunskapsbanken');a.href='fragor-svar.html';direct.append(a);}else direct.prepend(notice);}}
 const input=document.getElementById('knowledgeSearch'),select=document.getElementById('knowledgeCategory');
 if(input&&select){
  const list=document.getElementById('knowledgeList');list.classList.add('knowledge-disclosed');
  document.querySelector('.knowledge-categories').hidden=true;
  const note=document.querySelector('.knowledge-hero .note');if(note){const d=node('details'),s=node('summary','Om kunskapsbanken');d.className='knowledge-about';d.append(s,note);document.querySelector('.knowledge-hero').append(d);}
  list.querySelectorAll('[data-knowledge-group]').forEach(group=>{
   const title=group.querySelector('h3'),d=node('details'),s=node('summary',title.textContent);d.className='knowledge-group';d.dataset.knowledgeGroup=group.dataset.knowledgeGroup;d.id=title.id;
   const count=node('span',`${K.entries.filter(e=>e.category===d.dataset.knowledgeGroup).length} frågor & svar`);count.className='knowledge-count';s.append(count);d.append(s,group.querySelector('.knowledge-list'));group.replaceWith(d);
   d.addEventListener('toggle',()=>{if(d.open&&!input.value&&!select.value)renderGroup(d,K.search('',d.dataset.knowledgeGroup));});
  });
  function renderGroup(group,entries,total=entries.length){const box=group.querySelector('.knowledge-list');box.replaceChildren();for(const e of entries.slice(0,12)){const a=node('article'),h=node('h4');a.dataset.knowledgeCard=e.id;h.append(link(e));a.append(h,node('p',e.shortAnswer));box.append(a);}if(total>12){const a=node('a','Fler frågor i området');a.href=`fragor-svar-omrade-${group.dataset.knowledgeGroup}-1.html`;box.append(a);}}
  const section=node('section');section.className='knowledge-ask';
  section.innerHTML='<h2>Fråga NTM</h2><p>Hitta ett granskat svar eller välj mellan förtydliganden. NTM skriver inte nya svar på din fråga.</p><form id="knowledgeAskForm"><label for="knowledgeAskInput">Din fråga</label><div class="knowledge-ask-row"><input id="knowledgeAskInput" type="search" maxlength="240" placeholder="Vad är PEG?" required /><button class="secondary-btn" type="submit">Hitta svar</button></div></form><div id="knowledgeAskResult" role="status" aria-live="polite"></div>';
  document.querySelector('[data-knowledge-featured]').before(section);
  const result=section.querySelector('#knowledgeAskResult');let request=0;
  async function show(outcome){const current=++request;result.replaceChildren();result.dataset.outcome=outcome.kind;
   if(outcome.kind==='CLARIFY'){result.append(node('p','Menar du …'));for(const id of outcome.choices){const e=K.entries.find(e=>e.id===id);if(!e)continue;const b=node('button',e.question);b.type='button';b.className='secondary-btn';b.addEventListener('click',()=>show({kind:'ANSWER',answerId:id}));result.append(b);}return;}
   if(outcome.kind!=='ANSWER'){result.textContent=outcome.kind==='INVALID_INPUT'?'Kontrollera frågan. Använd räkneexemplet nedan för pris och EPS med enhet och period.':outcome.kind==='ABSTAIN_UNSUPPORTED_JUDGMENT'?'Det finns inget granskat svar som avgör det investeringsbeslutet. En definition eller ett räkneexempel kan inte avgöra om du bör köpa eller sälja.':'Jag hittade inget granskat svar på den frågan ännu.';return;}
   result.textContent='Öppnar det granskade svaret …';let e;try{e=await K.explain(outcome.answerId,'knowledge','full');}catch(_){}
   if(current!==request)return;result.replaceChildren();if(!e){result.textContent='Svaret kunde inte öppnas. Försök igen eller öppna dess sida från Sök.';return;}
   const h=node('h3');h.append(link({...e,id:outcome.answerId}));result.append(h,node('p',e.excerpt));
   if(outcome.calculation){const c=outcome.calculation;result.append(node('p',c.value===null?'Negativ EPS: det vanliga P/E-talet är inte ett meningsfullt värderingsmått.':`Räkneexempel: ${c.inputs.price} ${c.inputs.currency}/aktie ÷ ${c.inputs.eps} ${c.inputs.currency}/aktie (${{annual:'helår',ttm:'senaste tolv månaderna',forward:'kommande helår – antagande'}[c.inputs.period]}) = ${Number(c.value.toPrecision(8))} gånger. Detta avgör inte om aktien är billig eller dyr.`));}
   result.append(node('p',e.caveats));if(e.stale)result.append(node('p','Granskningsdatumet har passerat. Använd förklaringen med denna begränsning.'));
   const d=node('details');d.append(node('summary','Fördjupning och källor'),node('p',e.fullAnswer));if(e.example)d.append(node('p',e.example));for(const s of e.sources){const a=node('a',s.title);a.href=s.url;const p=node('p');p.append(a);d.append(p);}result.append(d);
   if(e.sections?.comparison){const c=e.sections.comparison,t=node('table'),head=node('thead'),row=node('tr'),body=node('tbody');t.append(node('caption',e.question));for(const label of ['Aspekt',c.leftLabel||'Begrepp A',c.rightLabel||'Begrepp B']){const th=node('th',label);th.scope='col';row.append(th);}head.append(row);t.append(head);for(const axis of c.axes){const r=node('tr'),th=node('th',axis.label);th.scope='row';r.append(th,node('td',axis.left),node('td',axis.right));body.append(r);}t.append(body);d.append(t,node('p',c.limitations));}
  }
  section.querySelector('form').addEventListener('submit',e=>{e.preventDefault();show(K.respond(section.querySelector('input').value));});
  const formula=node('details');formula.className='knowledge-formula';formula.innerHTML='<summary>Pröva P/E med egna exempelvärden</summary><p>Pris och årlig EPS måste avse samma valuta och aktiebas. Endast ett räkneexempel, ingen köprekommendation.</p><form id="knowledgeFormula"><label>Pris per aktie<input name="price" type="number" min="0.000001" max="1000000000000" step="any" required /></label><label>EPS per aktie<input name="eps" type="number" min="-1000000000000" max="1000000000000" step="any" required /></label><label>Gemensam valuta<select name="currency"><option>SEK</option><option>USD</option><option>EUR</option><option>GBP</option></select></label><label>EPS-period<select name="period"><option value="annual">Helt räkenskapsår</option><option value="ttm">Senaste tolv månaderna</option><option value="forward">Kommande helt år – antagande</option></select></label><button class="secondary-btn">Beräkna exempel</button></form>';
  section.append(formula);formula.querySelector('form').addEventListener('submit',event=>{event.preventDefault();const f=event.target.elements;show(K.calculate('pe',{price:Number(f.price.value),eps:Number(f.eps.value),currency:f.currency.value,period:f.period.value}));});
  document.querySelector('[data-knowledge-controls]').hidden=false;let tracked=false;
  function filter(){const active=!!(input.value.trim()||select.value),found=K.search(input.value,select.value),capped=found.slice(0,12);
   for(const group of list.querySelectorAll('[data-knowledge-group]')){const rows=capped.filter(e=>e.category===group.dataset.knowledgeGroup);group.hidden=active&&!rows.length;group.open=active&&!group.hidden;if(active)renderGroup(group,rows,found.filter(e=>e.category===group.dataset.knowledgeGroup).length);}
   document.querySelector('[data-knowledge-featured]').hidden=true;const status=document.getElementById('knowledgeResults');status.hidden=!active;status.textContent=`${Math.min(12,found.length)} av ${found.length} matchande svar visas${found.length>12?' – precisera sökningen eller utforska ett område':''}`;document.getElementById('knowledgeEmpty').hidden=!!found.length;
  }
  input.addEventListener('input',()=>{filter();if(input.value.trim()&&!tracked){emit('knowledge_search');tracked=true;}});select.addEventListener('change',filter);document.getElementById('knowledgeClear').addEventListener('click',()=>{input.value='';select.value='';filter();input.focus();});filter();
 }
 document.addEventListener('click',event=>{if(event.target.closest?.('a[data-knowledge-related]'))emit('knowledge_related_cta_clicked');});
});
