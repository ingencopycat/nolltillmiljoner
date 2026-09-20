/* Reviewed retrieval only. No query/value persistence, telemetry payload or remote inference. */
document.addEventListener('DOMContentLoaded',()=>{
 'use strict';
 const K=window.NTMKnowledgeCatalog;if(!K)return;
 const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const link=e=>{const a=node('a',e.question);a.href=K.url(e.id);return a;};
 const emit=name=>window.NTMEvents?.emit(name);
 if(location.hash==='#task-help')document.querySelectorAll('a[href^="fragor-svar.html?id="]').forEach(a=>a.hash='task-help');
 const direct=document.querySelector('[data-knowledge-answer]');if(direct){emit('knowledge_answer_opened');const e=K.entries.find(e=>e.id===direct.dataset.knowledgeAnswer);if(e?.reviewDue&&e.reviewDue<=new Date().toISOString().slice(0,10)){const notice=node('p','Granskningsdatumet har passerat. Svaret behöver kontrolleras mot aktuellt underlag.');notice.setAttribute('role','status');if(e.reviewPolicy?.overdue==='suppress'){direct.replaceChildren(node('h1','Svaret väntar på ny granskning'),notice);const a=node('a','Till kunskapsbanken');a.href='fragor-svar.html';direct.append(a);}else direct.prepend(notice);}}
 document.addEventListener('click',event=>{if(event.target.closest?.('a[data-knowledge-related]'))emit('knowledge_related_cta_clicked');});
});
