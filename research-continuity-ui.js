/* Local Research work only. Saved history remains owned by thesis-storage. */
(() => {
 'use strict';
 const C=window.NTMContinuity,$=id=>document.getElementById(id);
 let stock=null,base=null,work=null,error='',restore=false,exact=null,rows=[],restored=false,openedFields='';
 const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const report=t=>!stock?.manual&&t?.valuationSnapshot?window.NTMChangeDetection.detect(t.valuationSnapshot,stock):null;
 const latest=()=>window.NTMThesisStorage.get(stock?.symbol);
 function panel(){let p=$('researchContinuity');if(!p){p=node('section');p.id='researchContinuity';p.className='workspace-state';p.setAttribute('aria-label','Fortsätt ditt arbete');$('thesisForm').before(p);}return p;}
 function message(text){const n=$('continuityStatus');if(n)n.textContent=text;}
 function button(parent,text,id,fn){const b=node('button',text);b.type='button';b.id=id;b.className='secondary-btn';b.onclick=fn;parent.append(b);return b;}
 function fields(){return Object.fromEntries(C.fieldIds.filter(id=>$(id)).map(id=>[id,$(id).value]));}
 function draft(){return {base,fields:fields(),mode:stock.manual?'manual':valuationState.isManualEps?'manual':'sec',pending:window.NTMReview?.draftState()||null,updatedAt:Date.now()};}
 function download(){const text=JSON.stringify({localOnly:true,ticker:stock.symbol,draft:draft()},null,2),url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=node('a');a.href=url;a.download='ntm-local-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function state(){if(!stock)return null;const t=latest();return C.select({error:error||t.error||t.warning,restore,exact:!!exact,thesis:t.thesis,reasons:C.visible(rows,work?.value||C.empty()),draft:restored||!!work?.value.draft,editing:!!window.NTMReview?.draftState()});}
 function update(){window.NTMVisualV3?.workspace(stock);}
 function init(data){
  stock=data;const t=latest();base=C.revisionStamp(t.thesis);work=C.read(stock.symbol);error=t.error||t.warning||work.error||'';restore=!!work.value.draft;restored=false;exact=null;rows=C.reasons(t.thesis,report(t.thesis),C.day(),true);
  if(new URLSearchParams(location.search).get('review')==='exact')try{const raw=sessionStorage.getItem(C.targetKey);exact=C.resolve(raw?JSON.parse(raw):null,stock.symbol,t.thesis,report(t.thesis));}catch(e){error=e.message;}
  openedFields=C.stable(fields());draw();update();
  if(error&&new URLSearchParams(location.search).get('review')==='exact'){$('reviewDataContext').textContent=error;$('reviewBelief').textContent='Den begärda granskningen kunde inte öppnas. Ingen annan version granskas i dess ställe.';$('reviewAssumptions').textContent='';$('reviewQuestions').textContent='';}
  if(new URLSearchParams(location.search).get('review')==='exact'){$('thesisReviewDepth').open=true;(error?panel():$('thesisReview')).scrollIntoView({block:'start'});}
 }
 function draw(){
  const p=panel();p.replaceChildren();p.append(node('strong',restore?'Ett lokalt utkast väntar':'Fortsätt ditt arbete'));
  const status=node('p',error||'Utkast sparas bara i den här webbläsaren. De ingår inte i backup, privat synk eller publicering.');status.id='continuityStatus';status.setAttribute('role','status');p.append(status);
  if(restore){const d=work.value.draft,valid=d.base===base&&Date.now()>=d.updatedAt&&Date.now()-d.updatedAt<=C.life;
   p.append(node('p',`Utkast senast ändrat ${new Date(d.updatedAt).toLocaleString('sv-SE')}. ${valid?'Välj återställ eller kasta innan du fortsätter.':'Sparad version har ändrats eller utkastets 14 dagar har gått ut. Texten finns kvar för nedladdning; automatisk återställning är blockerad.'}`));
   button(p,'Återställ utkast','draftRestore',()=>{
    if(!valid||!checkBase())return;
    if(C.stable(fields())!==openedFields&&!confirm('Formuläret har ändrats sedan sidan öppnades. Ersätt de synliga inmatningarna med det väntande utkastet? Ladda ner formuläret först om du vill behålla båda.'))return;
    for(const [id,value] of Object.entries(d.fields))if($(id)){$(id).value=value;$(id).dispatchEvent(new Event('input',{bubbles:true}));}
    // Restored financial inputs are historical manual assumptions, never current SEC facts.
    if(!stock.manual){valuationState.isManualEps=true;valuationState.priceSource='historical';valuationState.stale=true;renderValuationPriceStatus();$('val-eps-badge').textContent='Manuell';$('val-eps-badge').classList.add('manual');$('val-eps-help').textContent=d.mode==='sec'?'Kopierad historisk SEC EPS från ditt lokala utkast. Behandlas som manuellt antagande; kontrollera mot aktuellt underlag.':'Manuell EPS från ditt lokala utkast. Kontrollera innan du beräknar.';}
    window.NTMReview?.restorePending(d.pending);currentThesisState.isDirty=true;restore=false;restored=true;draw();message('Utkast återställt. Värderingsvärden är historiska manuella antaganden. Beräkna igen innan du sparar en version.');update();$('thesis-text').focus();
   }).disabled=!valid||!!error;
   button(p,'Ladda ner väntande utkast','draftDownloadStored',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(work.value)],{type:'application/json'})),a=node('a');a.href=url;a.download='ntm-pending-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
   button(p,'Kasta väntande utkast','draftDiscard',()=>{try{const next={...work.value,draft:null};work.raw=C.write(stock.symbol,next,work.raw);work.value=next;restore=false;draw();update();}catch(e){error=e.message;message(error);}});
  }
  button(p,'Ladda ner texten i formuläret','draftDownload',download);
  if(work.error){
   button(p,'Ladda ner oläsbar lokal arbetsdata','draftDownloadRaw',()=>{const raw=localStorage.getItem(C.prefix+stock.symbol),url=URL.createObjectURL(new Blob([raw||''],{type:'text/plain'})),a=node('a');a.href=url;a.download='ntm-unreadable-local-work.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
   button(p,'Radera oläsbar lokal arbetsdata','draftDeleteCorrupt',()=>{if(!confirm('Radera endast detta bolags oläsbara lokala utkast och pauser? Sparade tesversioner behålls. Ladda ner originalet först om du behöver det.'))return;try{C.clear(stock.symbol);init(stock);}catch(e){message(e.message);}});
  }
  if(error){const reload=node('a','Ladda om och läs aktuell lagring');reload.href=location.href;p.append(reload);}
  const back=node('a','Till Min NTM');back.href='min-ntm.html';back.className='secondary-btn';p.append(back);
  let controls=$('reviewReasons');if(!controls){controls=node('fieldset');controls.id='reviewReasons';$('reviewDataContext').after(controls);}controls.replaceChildren();controls.append(node('legend','Vad har du granskat?'));
  controls.append(node('p','Markerade orsaker kvitteras när du sparar beslutet. Öppna frågor kan lämnas omarkerade och fortsätter då synas. En kvittering ändrar inte frågans svar eller ditt historiska underlag.'));
  const targeted=exact?rows.filter(r=>exact.reasonKeys.includes(r.key)):rows;
  for(const r of targeted){const label=node('label'),input=node('input');input.type='checkbox';input.value=r.key;input.checked=r.type!=='question';label.append(input,document.createTextNode(' '+({due:'Valt datum',observation:'Uppgift att granska',information:'Information'}[r.category])+': '+r.label));controls.append(label);}
  if(!targeted.length)controls.append(node('p','Ingen okvitterad orsak. Du kan ändå göra en avsiktlig granskning.'));
  const dateLabel=node('label','Pausa markerade orsaker till '),date=node('input');date.type='date';date.id='reviewSnoozeDate';dateLabel.append(date);controls.append(dateLabel);
  button(controls,'Pausa markerade orsaker','reviewSnooze',()=>{try{if(!canSave())return;const keys=selected();if(!keys.length)throw Error('Markera minst en orsak.');C.snooze(stock.symbol,keys,date.value);work=C.read(stock.symbol);message('De markerade orsakerna är pausade till '+date.value+'. Nytt underlag påverkas inte.');update();}catch(e){message(e.message);}});
  if(work.value.snoozes.length)button(controls,'Återaktivera bolagets pausade orsaker','reviewUnsnooze',()=>{try{if(!canSave())return;const next={...work.value,snoozes:[]};work.raw=C.write(stock.symbol,next,work.raw);work.value=next;message('Bolagets pauser har tagits bort. Sparad historik är oförändrad.');update();}catch(e){message(e.message);}});
  const provenance=node('p',stock.manual?'Manuell tes utan automatisk bolagsdata eller värderingssnapshot. Granska dina egna daterade källor; sparad versions tidpunkt är inte kursdatum.':'Prisets observationsdatum är inte verifierat. Sparad versions tidpunkt är inte kursdatum. Historiska/manuella scenarier är inga livekurser; ingen generell åldersgräns används.');provenance.id='reviewPriceAge';controls.append(provenance);
  const outcomes=node('a',stock.manual?'Valfritt: dokumentera din process':'Valfritt: dokumentera process och utfall');outcomes.href=stock.manual?'#processReviewEditor':'#outcomeSection';controls.append(outcomes);
 }
 function selected(){return [...document.querySelectorAll('#reviewReasons input[type=checkbox]:checked')].map(n=>n.value);}
 function checkBase(){const t=latest();if(t.error||t.warning||base!==C.revisionStamp(t.thesis)){error=t.error||t.warning||'Historiken ändrades i en annan flik. Ladda ner formuläret och öppna den avsedda versionen igen.';message(error);update();return false;}return true;}
 function canSave(){if(!stock)return true;if(!checkBase())return false;if(error||restore){message(error||'Återställ eller kasta det väntande utkastet först.');return false;}if(exact)try{C.resolve(exact,stock.symbol,latest().thesis,report(latest().thesis));}catch(e){error=e.message;message(error);return false;}return true;}
 function capture(){if(!stock||restore||error)return;try{if(!checkBase())return;const next={...work.value,draft:draft()};work.raw=C.write(stock.symbol,next,work.raw);work.value=next;restored=true;message('Lokalt utkast sparat. Ingen ny tesversion, synk eller publicering har skapats.');update();}catch(e){error=e.message;message(error);update();}}
 function saved(){if(!stock)return;try{const next={...work.value,draft:null};work.raw=C.write(stock.symbol,next,work.raw);work.value=next;restored=false;restore=false;sessionStorage.removeItem(C.targetKey);if(new URLSearchParams(location.search).get('review')==='exact'){const url=new URL(location.href);url.searchParams.delete('review');url.hash='thesisReview';history.replaceState(null,'',url);}}catch(e){error='Beslutet sparades, men utkastet kunde inte rensas. '+e.message;message(error);}}
 document.addEventListener('input',e=>{if(C.fieldIds.includes(e.target.id))capture();});
 window.addEventListener('storage',e=>{if(e.key===window.NTMThesisStorage.key)try{sessionStorage.removeItem(C.targetKey);}catch(_){}if(stock&&(e.key===window.NTMThesisStorage.key||e.key===C.prefix+stock.symbol)){error='Lokalt arbete ändrades i en annan flik. Ladda ner formuläret innan du laddar om.';message(error);update();}});
 window.addEventListener('beforeunload',e=>{if(stock&&(restore||error||currentThesisState.isDirty)){e.preventDefault();e.returnValue='';}});
 window.NTMContinuityUI={init,state,canSave,capture,saved,key:()=>C.reviewKey(latest().thesis,selected())};
})();
