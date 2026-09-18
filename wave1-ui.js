/* Reviewed help and explicit handoff, scoped to the Wave 1 pilot surfaces. */
document.addEventListener('DOMContentLoaded',()=>{
 'use strict';
 const K=window.NTMKnowledgeCatalog,C=window.NTMWave1Context,$=id=>document.getElementById(id);
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,fn)=>{const b=node('button',text,'secondary-btn');b.type='button';b.addEventListener('click',fn);return b;};
 const link=(text,url)=>{const a=node('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
 let origin=null;
 const dialog=node('dialog',null,'wave1-dialog');dialog.id='wave1Help';dialog.setAttribute('aria-labelledby','wave1HelpTitle');document.body.append(dialog);
 dialog.addEventListener('close',()=>origin?.isConnected&&origin.focus());
 dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const items=[...dialog.querySelectorAll('a[href],button,summary')].filter(n=>n.getClientRects().length&&!n.disabled);
  const first=items[0],last=items.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 });
 function help(id,trigger){
  const concept=K.pilotConcepts?.find(c=>c.id===id)||(['macro-releases','interest-rates'].includes(id)?{answerId:id,excerpt:'shortAnswer'}:null),entry=concept&&K.publicEntries().find(e=>e.id===concept.answerId);
  origin=trigger;dialog.replaceChildren();
  const h=node('h2',entry?.question||'Förklaringen är inte tillgänglig');h.id='wave1HelpTitle';dialog.append(h);
  if(entry){
   dialog.append(node('p',entry[concept.excerpt]),node('p',entry.caveats,'note'),node('p',`Innehållsversion ${entry.contentVersion} · källgranskat ${entry.reviewedAt}`,'note'));
   const details=node('details'),summary=node('summary','Förklaring, källor och exempel');details.append(summary,node('p',entry.fullAnswer),node('p',entry.example));
   for(const s of entry.sources)details.append(link(s.title+' (ny flik)',s.url));dialog.append(details);
   dialog.append(link('Läs hela svaret (ny flik)',K.url(entry.id)+'#task-help'),node('p','Ditt arbete ligger kvar i den ursprungliga fliken. Stäng läsfliken och återgå hit.','note'));
  }else dialog.append(link('Sök ett granskat svar (ny flik)','fragor-svar.html'));
  dialog.append(button('Tillbaka till mitt arbete',()=>dialog.close()));dialog.showModal();dialog.querySelector('button').focus();
 }
 function helpButton(id,label){const b=button(label||'Förklara',()=>help(id,b));b.dataset.wave1Concept=id;return b;}
 document.addEventListener('click',event=>{const trigger=event.target.closest('[data-concept-help]');if(trigger){event.preventDefault();help(trigger.dataset.conceptHelp,trigger);}});
 function attach(container,ids){if(!container||container.querySelector('[data-wave1-help]'))return;const d=node('details',null,'wave1-help');d.dataset.wave1Help='';d.append(node('summary','Förstå begreppen utan att lämna arbetet'));const row=node('div',null,'wave1-actions');for(const id of ids){const c=K.pilotConcepts.find(c=>c.id===id);if(c)row.append(helpButton(id,c.title));}d.append(row);container.append(d);}
 attach($('valuationSection'),['pe','forward-basis','eps','growth','valuation-assumptions']);
 attach($('stock-calculator-heading')?.closest('section'),['pe','forward-basis','eps','growth','valuation-assumptions']);
 attach(document.querySelector('.savings-goal-card')||document.querySelector('body:has(#goal-monthly-target) .calculator-card'),['compounding','annual-fees','inflation']);
 attach($('keyMetricsGrid')?.parentElement,['eps','dilution','fcf','margins','growth']);
 attach($('thesisSection'),['review-falsification']);
 // Place help next to the editable field as well as in the bounded concept disclosure.
 for(const [field,id] of [['val-eps','eps'],['val-exit-pe','pe'],['stock-eps','eps'],['stock-future-pe','pe'],['goal-monthly-fee','annual-fees'],['goal-monthly-inflation','inflation']]){
  const input=$(field);if(input)input.parentElement.append(helpButton(id,'Förklara '+K.pilotConcepts.find(c=>c.id===id).title));
 }
 if(location.hash==='#task-help'){
  const p=node('aside',null,'wave1-context');p.append(node('p','Ditt ursprungliga arbete ligger kvar i den andra fliken. Stäng denna flik när du vill fortsätta där.'),button('Stäng läsfliken och återgå',()=>window.close()));document.querySelector('main')?.prepend(p);
 }
 const section=$('valuationSection');
 // Navigation guards, not drafts/autosave (Wave 2). Leaving is always the user's
 // choice; help and handoff leave this document alive and never serialize forms.
 let edited=false;
 if(section||$('stock-valuation-form')||$('goal-monthly-target')){
  document.querySelector('main')?.addEventListener('input',event=>{if(event.isTrusted&&event.target.closest('form'))edited=true;});
  window.addEventListener('beforeunload',event=>{if(edited){event.preventDefault();event.returnValue='';}});
 }
 if(section){
  const area=node('div',null,'wave1-context'),status=node('p');status.setAttribute('role','status');
  area.append(button('Pröva Base i värderingskalkylatorn (ny flik)',()=>{
   let payload;try{payload=window.NTMWave1Research();}catch(e){status.textContent=e.message;return;}
   let child;try{
    // Open synchronously in the user's click, sever opener before navigation. Only
    // this allowlisted envelope is written; no source-tab storage is copied by us.
    child=window.open('about:blank','_blank');if(!child)throw Error('Tillåt en ny flik för förhandsvisningen. Ditt arbete är kvar här.');
    child.opener=null;
    // A browser may clone sessionStorage from the opener. Remove that clone in
    // the new, disposable tab before passing the one bounded handoff.
    child.sessionStorage.clear();
    const token=crypto.randomUUID();child.sessionStorage.setItem(C.key,C.pack(token,payload));
    child.location.replace('aktievarderingskalkylator.html#handoff='+token);
    status.textContent='Förhandsvisningen öppnades i en ny flik. Alla Research-inmatningar ligger kvar här.';
   }catch(e){if(child)child.close();status.textContent=e.message||'Överföringen kunde inte öppnas. Ditt arbete är kvar här.';}
  }),node('p','Överför endast synliga Base-inmatningar: pris, EPS, tillväxt, år och slut-P/E. Förhandsgranska och välj Använd i den nya fliken. Avkastningskrav och andra scenarier förs inte över.','note'),status);section.append(area);
 }
 if($('stock-valuation-form')&&location.hash.startsWith('#handoff')){
  const area=node('section',null,'wave1-context');area.id='wave1Preview';area.setAttribute('aria-label','Research-överföring');$('stock-valuation-form').before(area);
  const token=location.hash.slice('#handoff='.length);let payload;
  const fail=message=>{try{sessionStorage.removeItem(C.key);}catch(_){}area.replaceChildren(node('h2','Ingen överföring tillämpad'),node('p',message),node('p','Dina kalkylatorvärden är oförändrade. Återgå till Research-fliken för en ny förhandsvisning.'));};
  try{payload=C.unpack(sessionStorage.getItem(C.key),token);}catch(e){fail(e.message);return;}
  const expiry=setTimeout(()=>fail('Förhandsvisningen har gått ut. Öppna den igen från Research.'),Math.max(0,payload.expiresAt-Date.now()));
  const i=payload.inputs,b=payload.basis;
  area.append(node('h2',`Förhandsgranska ${payload.company.name} (${payload.company.ticker})`),node('p','Från Research · Base → Enkel värdering · USD. Detta är nuvarande inmatningar, inte ett sparat resultat.'));
  const fields=[['stock-price','price','Pris (USD)'],['stock-eps','eps','EPS (USD/aktie)'],['stock-growth','growth','EPS-tillväxt (%/år)'],['stock-years','years','År'],['stock-future-pe','multiple','Slut-P/E']];
  const list=node('ul');for(const [,k,label] of fields)list.append(node('li',`${label}: ${i[k]}`));area.append(list);
  const priceLabels={example:'Räkneexempel',manual:'Manuellt pris',historical:'Historiskt sparat pris'};
  area.append(node('p',`${priceLabels[b.priceSource]} · kursdatum okänt, inte livekurs. EPS: ${b.epsSource==='manual'?'eget antagande':'NTM-beräkning från SEC'} · ${b.period} · periodslut ${b.periodEnd||'ej angivet'} · inlämnat ${b.filed||'ej angivet'}. Aktiebas: ${b.shareBasis==='unverified'?'inte verifierad':b.shareBasis==='manual'?'eget antagande':'verifierad'}. Metod: ${b.sourceMethod}.`),link('SEC-underlag (ny flik)',b.sourceUrl),node('p','Tillväxt och slut-P/E är egna scenarioantaganden. Research-fliken ligger kvar. Förhandsvisningen gäller i 15 minuter.','note'));
  const label=node('label'),check=node('input');check.type='checkbox';check.id='wave1Replace';label.htmlFor=check.id;label.append(check,document.createTextNode(' Jag vill ersätta värdena i Enkel med dessa fem inmatningar och USD.'));area.append(label);
  const status=node('p');status.setAttribute('role','status');let applied=false;
  const apply=button('Använd dessa antaganden',()=>{
   if(!check.checked){status.textContent='Bekräfta först vilka inmatningar som ska ersättas.';check.focus();return;}
   try{const current=C.unpack(sessionStorage.getItem(C.key),token);if(JSON.stringify(current)!==JSON.stringify(payload))throw Error('Förhandsvisningen har ändrats. Öppna den igen från Research.');}catch(e){fail(e.message);return;}
   document.querySelector('[data-stock-mode="simple"]').click();
   for(const [id,k] of fields){$(id).value=i[k];$(id).dispatchEvent(new Event('input',{bubbles:true}));}
   $('stock-currency').value=payload.company.currency;$('stock-currency').dispatchEvent(new Event('change',{bubbles:true}));
   try{sessionStorage.removeItem(C.key);}catch(_){}
   clearTimeout(expiry);
   history.replaceState(null,'',location.pathname);
   label.remove();apply.remove();cancel.remove();status.textContent='Tillämpat på Enkel. Välj Beräkna för ett nytt resultat. Källunderlaget ovan gäller de överförda inmatningarna; egna ändringar är dina antaganden.';
   applied=true;edited=true;
   $('stock-price').focus();
  });
  const cancel=button('Avstå från överföringen',()=>{clearTimeout(expiry);history.replaceState(null,'',location.pathname);fail('Du avstod. Inga värden ändrades.');});area.append(apply,cancel,status);
  // Changing destination inputs after preview requires renewed explicit consent.
  const changed=()=>{check.checked=false;if(applied)status.textContent='Du har ändrat kalkylatorns inmatningar. Underlaget ovan visar den ursprungliga överföringen, inte dina nuvarande värden. Välj Beräkna på nytt.';};
  $('stock-valuation-form').addEventListener('input',changed);
  $('stock-valuation-form').addEventListener('change',changed);
 }
});
