document.addEventListener('DOMContentLoaded',()=>{
 const K=window.NTMKnowledgeCatalog;if(!K)return;
 const emit=name=>window.NTMEvents?.emit(name);
 if(document.querySelector('[data-knowledge-answer]'))emit('knowledge_answer_opened');
 const input=document.getElementById('knowledgeSearch'),select=document.getElementById('knowledgeCategory');
 if(input&&select){
  const list=document.getElementById('knowledgeList');
  list.classList.add('knowledge-disclosed');
  document.querySelector('.knowledge-categories').hidden=true;
  const note=document.querySelector('.knowledge-hero .note');
  if(note){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Om kunskapsbanken';details.className='knowledge-about';details.append(summary,note);document.querySelector('.knowledge-hero').append(details);}
  list.querySelectorAll('[data-knowledge-group]').forEach(group=>{
   const title=group.querySelector('h3'),items=group.querySelectorAll('[data-knowledge-card]');
   const details=document.createElement('details');details.className='knowledge-group';details.dataset.knowledgeGroup=group.dataset.knowledgeGroup;
   const summary=document.createElement('summary');summary.textContent=title.textContent;
   const count=document.createElement('span');count.className='knowledge-count';count.textContent=`${items.length} frågor & svar`;summary.append(count);
   details.append(summary,group.querySelector('.knowledge-list'));details.id=title.id;group.replaceWith(details);
  });
  const askSection=document.createElement('section');askSection.className='knowledge-ask';
  askSection.innerHTML='<h2>Fråga NTM</h2><p>Fråga bland NTM:s granskade svar.</p><form id="knowledgeAskForm"><label for="knowledgeAskInput">Din fråga</label><div class="knowledge-ask-row"><input id="knowledgeAskInput" type="search" maxlength="160" placeholder="Vad är PEG?" required /><button class="secondary-btn" type="submit">Hitta svar</button></div></form><div id="knowledgeAskResult" role="status" aria-live="polite"></div>';
  document.querySelector('[data-knowledge-featured]').before(askSection);
  askSection.querySelector('form').addEventListener('submit',event=>{
   event.preventDefault();const results=K.ask(askSection.querySelector('input').value),box=askSection.querySelector('#knowledgeAskResult');box.replaceChildren();
   if(!results.length){box.textContent='Jag hittade inget granskat svar på den frågan ännu.';return;}
   for(const entry of results){const article=document.createElement('article'),heading=document.createElement('h3'),a=document.createElement('a'),p=document.createElement('p');a.href=K.url(entry.id);a.textContent=entry.question;heading.append(a);p.textContent=entry.shortAnswer;article.append(heading,p);box.append(article);}
  });
  document.querySelector('[data-knowledge-controls]').hidden=false;
  let tracked=false;
  function filter(){
   const found=K.search(input.value,select.value),ids=new Set(found.map(e=>e.id));
   document.querySelectorAll('[data-knowledge-card]').forEach(n=>n.hidden=!ids.has(n.dataset.knowledgeCard));
   document.querySelectorAll('[data-knowledge-group]').forEach(n=>{n.hidden=!found.some(e=>e.category===n.dataset.knowledgeGroup);if(input.value.trim()||select.value)n.open=!n.hidden;else n.open=false;});
   document.querySelector('[data-knowledge-featured]').hidden=true;
   document.getElementById('knowledgeResults').hidden=!(input.value.trim()||select.value);
   document.getElementById('knowledgeResults').textContent=`${found.length} av ${K.publicEntries().length} svar visas`;
   document.getElementById('knowledgeEmpty').hidden=Boolean(found.length);
   document.querySelectorAll('[data-knowledge-category]').forEach(a=>{if(a.dataset.knowledgeCategory===select.value)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});
  }
  input.addEventListener('input',()=>{filter();if(input.value.trim()&&!tracked){emit('knowledge_search');tracked=true;}});
  select.addEventListener('change',filter);
  document.getElementById('knowledgeClear').addEventListener('click',()=>{input.value='';select.value='';filter();input.focus();});
  document.querySelectorAll('[data-knowledge-category]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();select.value=a.dataset.knowledgeCategory;filter();document.getElementById('category-'+select.value)?.querySelector('summary')?.focus();}));
  filter();
 }
 document.addEventListener('click',event=>{if(event.target.closest?.('a[data-knowledge-related]'))emit('knowledge_related_cta_clicked');});
});
