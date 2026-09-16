/* Only saved local revisions and explicitly approved public fields enter this flow. */
(() => {
 'use strict';
 const trigger=document.getElementById('researchPublishBtn');if(!trigger)return;
 const C=window.NTMSocialCore,node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const shell=node('div');shell.className='social-shell research-publication';
 const dialog=node('dialog'),heading=node('h2','Publicera analys'),status=node('p'),body=node('div'),cancel=node('button','Avbryt');
 heading.id='researchPublicationTitle';heading.tabIndex=-1;dialog.setAttribute('aria-labelledby',heading.id);
 status.id='researchPublicationStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 cancel.type='button';cancel.onclick=()=>dialog.close();dialog.append(heading,status,body,cancel);shell.append(dialog);document.body.append(shell);
 const publicState=node('div');publicState.id='researchPublicState';trigger.parentElement.after(publicState);
 let adapter,busy=false,owner=null,mine=null,own=[],sourceProblem=false;
 const tell=text=>status.textContent=text;
 const link=(label,url)=>{const a=node('a',label);a.href=url;return a;};
 const button=(label,fn)=>{const b=node('button',label);b.type='button';b.className='secondary-btn';b.onclick=()=>run(fn);return b;};
 async function run(fn){if(busy){tell('Vänta tills åtgärden är klar.');return;}busy=true;dialog.setAttribute('aria-busy','true');
   const controls=[...body.querySelectorAll('button')];controls.forEach(b=>b.disabled=true);
   try{await fn();}catch(e){tell(e.code==='auth'?'Logga in för att publicera analyser.':e.code==='forbidden'?'Publicering nekades av servern. Kontrollera profilens status.':e.code==='invalid'?'Servern godkände inte publiceringen. Kontrollera de valda fälten.':'Åtgärden kunde inte bekräftas. Kontrollera anslutningen och försök igen.');}
   finally{busy=false;dialog.setAttribute('aria-busy','false');controls.forEach(b=>b.disabled=false);}}
 function saved(){sourceProblem=false;const scope=currentStockData?.symbol,id=currentThesisState?.selectedRevisionId;if(!scope)return null;
   const result=window.NTMThesisStorage.get(scope);if(result.error){sourceProblem=true;return null;}if(!id)return null;
   const rev=result.thesis?.revisions.find(r=>r.id===id);return rev?{scope,rev}:null;}
 const stillSaved=s=>window.NTMThesisStorage.get(s.scope).thesis?.revisions.some(r=>r.id===s.rev.id);
 async function identity(){const session=await adapter.session();owner=session?.userId||null;mine=owner?await adapter.socialWrite('mine'):null;
   own=mine&&!mine.suspended?await adapter.socialWrite('ownAnalyses'):[];refreshSource();}
 function show(){tell('');if(!dialog.open)dialog.showModal();heading.focus();}
 dialog.addEventListener('close',()=>trigger.focus());
 function refreshSource(){publicState.replaceChildren();const s=saved();if(!s)return;
   const active=own.find(a=>a.sourceScope===s.scope&&!a.hidden&&!a.moderated);if(!active)return;
   publicState.append(node('p','Publicerad'),link('Visa',C.analysisUrl(active.id)));
   if(window.NTMThesisStorage.get(s.scope).thesis?.latestRevisionId!==active.sourceRevision)publicState.append(node('p','Du har en nyare privat version.'));
   publicState.append(button('Uppdatera publicerad analys',open),button('Ta bort från profil',async()=>{show();body.replaceChildren(node('p','Den offentliga kopian döljs. Din privata Research finns kvar.'));
     const user=owner;body.append(button('Bekräfta borttagning',async()=>{if((await adapter.session())?.userId!==user){tell('Inloggningen har ändrats. Öppna publiceringen igen.');return;}await adapter.socialWrite('unpublish',{id:active.id});await identity();body.replaceChildren();tell('Analysen har tagits bort från profilen.');}));}));}
 function login(){tell('Logga in för att publicera analyser.');const form=node('form'),email=node('input'),emailLabel=node('label','E-post'),otp=node('input'),otpLabel=node('label','Engångskod');
   email.type='email';email.required=true;email.autocomplete='email';email.id='publicationEmail';emailLabel.htmlFor=email.id;
   otp.id='publicationOtp';otp.autocomplete='one-time-code';otp.inputMode='numeric';otpLabel.htmlFor=otp.id;
   const send=node('button','Skicka engångskod');send.type='submit';form.append(emailLabel,email,send);form.onsubmit=e=>{e.preventDefault();run(async()=>{await adapter.requestOtp(email.value.trim());tell('Om adressen kan användas skickas en engångskod.');});};
   body.append(form,otpLabel,otp,button('Logga in',async()=>{await adapter.verifyOtp(email.value.trim(),otp.value.trim());await open();}));}
 async function open(){show();body.replaceChildren();const s=saved();if(!s){tell(sourceProblem?'Den sparade Research-datan kan inte läsas säkert. Kontrollera lokal backup innan du fortsätter.':'Spara analysen innan du publicerar den.');return;}
   if(!window.NTMCloudConfig?.enabled){tell('Publicering är inte tillgänglig i denna miljö. Din sparade Research finns kvar.');return;}
   adapter ||= window.NTMSocialAdapter||window.NTMCloudAdapter.create(window.NTMCloudConfig);window.NTMSocialAdapter=adapter;
   await identity();if(!owner){login();return;}
   if(!mine){tell('Skapa en offentlig profil för att publicera analyser.');body.append(link('Skapa offentlig profil','konto.html#socialAccount'));return;}
   if(mine.suspended){tell('Profilen är dold av moderering. Publicering är inte tillgänglig.');return;}
   if(!mine.active){tell('Aktivera din offentliga profil för att publicera analyser.');body.append(link('Hantera profil','konto.html#socialAccount'));return;}
   compose(s,owner,mine.username);
 }
 function compose(s,userId,username){body.replaceChildren();tell('');body.append(node('p','Sparad privat version: '+s.scope+' · '+(s.rev.savedAt||s.rev.createdAt||'Datum saknas')+' · '+s.rev.id));
   if(currentThesisState.isDirty)body.append(node('p','Du har osparade ändringar. De ingår inte; publiceringen utgår från den valda sparade versionen.'));
   body.append(node('p','Privat → offentligt: endast fälten du godkänner nedan kopieras. Privata anteckningar, utfall och dolda svar följer aldrig med.'));
   const form=node('form');form.noValidate=true;const draft=C.draft(s.scope,s.rev),inputs={},checks={};
   for(const [key,labelText] of Object.entries(C.fields)){const optional=!['company','ticker','thesis','analysisDate'].includes(key),label=node('label',labelText),input=node(['company','ticker','analysisDate'].includes(key)?'input':'textarea');
     input.id='publish_'+key;label.htmlFor=input.id;input.value=draft[key];input.maxLength=key==='company'?160:key==='ticker'?128:6000;
     if(input.tagName==='INPUT')input.type=key==='analysisDate'?'date':'text';else input.rows=4;
     if(optional){const check=node('input'),wrap=node('label');check.type='checkbox';check.id='include_'+key;wrap.append(check,document.createTextNode('Ta med '+labelText.toLowerCase()));checks[key]=check;form.append(wrap);
       input.hidden=label.hidden=true;input.disabled=true;check.onchange=()=>{input.hidden=label.hidden=!check.checked;input.disabled=!check.checked;};}
     else input.required=true;inputs[key]=input;form.append(label,input);
   }
   const preview=node('button','Förhandsgranska publicering');preview.type='submit';form.append(preview);
   form.onsubmit=e=>{e.preventDefault();run(async()=>{const selected={};for(const key of Object.keys(C.fields))if(!checks[key]||checks[key].checked)selected[key]=inputs[key].value;
     let snapshot;try{snapshot=C.snapshot(selected);}catch(_){tell('Fyll i bolag, ticker och analysdatum. Den offentliga tesen måste innehålla minst 30 tecken; övriga texter får innehålla högst 6 000 tecken.');return;}
     if(!form.checkValidity()){tell('Kontrollera de markerade fälten innan du förhandsgranskar.');form.reportValidity();return;}
     const previous=own.find(a=>a.sourceScope===s.scope&&!a.hidden&&!a.moderated),requestId=crypto.randomUUID();
     body.replaceChildren(node('h3','Det här kommer att bli offentligt'),node('p','Publiceras av @'+username+'. Endast följande innehåll visas:'));
     for(const [key,label] of Object.entries(C.fields))if(Object.hasOwn(snapshot,key)){const text=node('p',snapshot[key]);text.className='social-text';body.append(node('h3',label),text);}
     if(previous)body.append(node('p','Den här godkända kopian ersätter din tidigare synliga analys för bolaget.'));
     tell('');body.append(button('Tillbaka',()=>{body.replaceChildren(form);tell('');}),button('Publicera',async()=>{
       if((await adapter.session())?.userId!==userId){tell('Inloggningen har ändrats. Öppna publiceringen igen.');return;}
       if(!stillSaved(s)){tell('Den valda sparade versionen finns inte längre. Öppna publiceringen igen.');return;}
       const result=await adapter.socialWrite('publish',{scope:s.scope,revision:s.rev.id,snapshot,requestId,confirmed:true,...(previous?{supersedes:previous.id}:{})});
       body.replaceChildren(link('Visa analys',C.analysisUrl(result.id)),node('p'),link('Visa min profil',C.profileUrl(username)));tell('Analysen är publicerad.');await identity();window.NTMEvents?.emit('public_analysis_published');
     }));heading.focus();});};body.append(form);
 }
 trigger.onclick=()=>run(open);window.NTMResearchPublication={refreshSource};
 if(window.NTMCloudConfig?.enabled){adapter=window.NTMSocialAdapter||window.NTMCloudAdapter.create(window.NTMCloudConfig);window.NTMSocialAdapter=adapter;
   identity().catch(()=>{});adapter.onSessionChange(()=>{if(!busy)identity().catch(()=>{});});}
})();
