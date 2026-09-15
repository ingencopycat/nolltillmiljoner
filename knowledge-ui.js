document.addEventListener('DOMContentLoaded',()=>{
 const K=window.NTMKnowledgeCatalog;if(!K)return;
 const emit=name=>window.NTMEvents?.emit(name);
 if(document.querySelector('[data-knowledge-answer]'))emit('knowledge_answer_opened');
 const input=document.getElementById('knowledgeSearch'),select=document.getElementById('knowledgeCategory');
 if(input&&select){
  document.querySelector('[data-knowledge-controls]').hidden=false;
  let tracked=false;
  function filter(){
   const found=K.search(input.value,select.value),ids=new Set(found.map(e=>e.id));
   document.querySelectorAll('[data-knowledge-card]').forEach(n=>n.hidden=!ids.has(n.dataset.knowledgeCard));
   document.querySelectorAll('[data-knowledge-group]').forEach(n=>n.hidden=!found.some(e=>e.category===n.dataset.knowledgeGroup));
   document.querySelector('[data-knowledge-featured]').hidden=Boolean(input.value.trim()||select.value);
   document.getElementById('knowledgeResults').textContent=`${found.length} av ${K.publicEntries().length} svar visas`;
   document.getElementById('knowledgeEmpty').hidden=Boolean(found.length);
   document.querySelectorAll('[data-knowledge-category]').forEach(a=>{if(a.dataset.knowledgeCategory===select.value)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});
  }
  input.addEventListener('input',()=>{filter();if(input.value.trim()&&!tracked){emit('knowledge_search');tracked=true;}});
  select.addEventListener('change',filter);
  document.getElementById('knowledgeClear').addEventListener('click',()=>{input.value='';select.value='';filter();input.focus();});
  document.querySelectorAll('[data-knowledge-category]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();select.value=a.dataset.knowledgeCategory;filter();select.focus();}));
  filter();
 }
 document.addEventListener('click',event=>{if(event.target.closest?.('a[data-knowledge-related]'))emit('knowledge_related_cta_clicked');});
});
