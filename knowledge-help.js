/* Optional compact help for public metric IDs. Never reads form values or report text. */
document.addEventListener('DOMContentLoaded',()=>{
 const K=window.NTMKnowledgeCatalog;if(!K)return;let origin=null,request=0;
 const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text||'';return n;};
 const dialog=node('dialog');dialog.className='wave1-dialog';dialog.id='knowledgeHelp';dialog.setAttribute('aria-labelledby','knowledgeHelpTitle');document.body.append(dialog);
 dialog.addEventListener('close',()=>{request++;if(origin?.isConnected)origin.focus();});
 dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const items=[...dialog.querySelectorAll('a,button,summary')].filter(e=>e.getClientRects().length),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
 document.addEventListener('click',async event=>{
  const trigger=event.target.closest('[data-knowledge-help]');if(!trigger||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();origin=trigger;const current=++request;
  dialog.replaceChildren();const h=node('h2','Förklaring'),status=node('p','Öppnar granskat svar …'),close=node('button','Tillbaka till mitt arbete');h.id='knowledgeHelpTitle';status.setAttribute('role','status');close.type='button';close.className='secondary-btn';close.addEventListener('click',()=>dialog.close());dialog.append(h,status,close);if(!dialog.open)dialog.showModal();close.focus();
  let view;try{view=await K.explain(trigger.dataset.knowledgeHelp,trigger.dataset.knowledgeContext||'calculator','compact');}catch(_){}
  if(current!==request||!dialog.open)return;
  if(!view){status.textContent='Förklaringen kunde inte öppnas. Ditt arbete är kvar.';return;}
  h.textContent=view.question;status.textContent=view.excerpt;const caveats=node('p',view.caveats),a=node('a','Läs hela svaret (ny flik)');a.href=view.url+'#task-help';a.target='_blank';a.rel='noopener noreferrer';dialog.insertBefore(caveats,close);dialog.insertBefore(a,close);if(view.stale)dialog.insertBefore(node('p','Ny granskning behövs; kontrollera källunderlaget.'),close);
 });
});
