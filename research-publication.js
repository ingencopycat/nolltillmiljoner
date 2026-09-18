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
 let adapter,busy=false,owner=null,mine=null,own=[],sourceProblem=false,opener=null;
 const tell=text=>status.textContent=text;
 const link=(label,url)=>{const a=node('a',label);a.href=url;return a;};
 const button=(label,fn)=>{const b=node('button',label);b.type='button';b.className='secondary-btn';b.onclick=()=>run(fn);return b;};
 async function run(fn){if(busy){tell('Vänta tills åtgärden är klar.');return;}busy=true;dialog.setAttribute('aria-busy','true');
   const controls=[...body.querySelectorAll('button')];controls.forEach(b=>b.disabled=true);
   try{await fn();}catch(e){tell(e.code==='conflict'?'Förhandsgranskningen är inaktuell. Öppna publiceringen igen och granska ändringarna.':e.code==='auth'?'Logga in för att publicera analyser.':e.code==='forbidden'?'Publicering nekades av servern. Kontrollera profilens status.':e.code==='invalid'?'Servern godkände inte publiceringen. Kontrollera de valda fälten.':'Åtgärden kunde inte bekräftas. Kontrollera anslutningen och försök igen.');}
   finally{busy=false;dialog.setAttribute('aria-busy','false');controls.forEach(b=>b.disabled=false);}}
 function saved(){sourceProblem=false;const scope=currentStockData?.symbol,id=currentThesisState?.selectedRevisionId;if(!scope)return null;
   const result=window.NTMThesisStorage.get(scope);if(result.error){sourceProblem=true;return null;}if(!id)return null;
   const rev=result.thesis?.revisions.find(r=>r.id===id);return rev?{scope,rev}:null;}
 const stillSaved=s=>window.NTMThesisStorage.get(s.scope).thesis?.revisions.some(r=>r.id===s.rev.id&&window.NTMPublicReport.stable(r)===window.NTMPublicReport.stable(s.rev));
 async function identity(){const session=await adapter.session();owner=session?.userId||null;mine=owner?await adapter.socialWrite('mine'):null;
   own=mine&&!mine.suspended?await adapter.socialWrite('ownAnalyses'):[];refreshSource();}
 function show(title='Publicera analys'){tell('');heading.textContent=title;if(!dialog.open){opener=document.activeElement;dialog.showModal();}heading.focus();}
 dialog.addEventListener('close',()=>{const target=opener?.isConnected&&!opener.hidden?opener:trigger.hidden?publicState.querySelector('a,button'):trigger;target?.focus();});
 function refreshSource(){publicState.replaceChildren();trigger.hidden=false;const scope=currentStockData?.symbol;if(!scope)return;
   const active=own.find(a=>a.sourceScope===scope&&!a.hidden&&!a.moderated);if(!active)return;
   trigger.hidden=true;publicState.append(node('p','Publicerad'),link('Visa analys',C.analysisUrl(active.id)));
   const journal=window.NTMThesisStorage.get(scope).thesis,latest=journal?.revisions.find(r=>r.id===journal.latestRevisionId);
   const sourceIndex=journal?.revisions.findIndex(r=>r.id===active.sourceRevision)??-1;
   const newer=latest&&latest.id!==active.sourceRevision&&(sourceIndex>=0?journal.revisions.indexOf(latest)>sourceIndex:Date.parse(latest.savedAt||latest.createdAt)>Date.parse(active.publishedAt));
   if(newer)publicState.append(node('p','Nyare privat version'),button('Uppdatera publicerad analys',()=>open({scope,rev:latest})));
   publicState.append(button('Ändra urval / publicera ny version',()=>open()));
   publicState.append(button('Avpublicera',async()=>{show('Avpublicera analys');body.replaceChildren(node('p','Analysen tas bort från din profil och Upptäck Research och är inte längre offentligt tillgänglig. Din privata analys finns kvar.'));
     const user=owner;body.append(button('Avpublicera analys',async()=>{if((await adapter.session())?.userId!==user){tell('Inloggningen har ändrats. Öppna publiceringen igen.');return;}await adapter.socialWrite('unpublish',{id:active.id});await identity();body.replaceChildren();tell('Analysen är avpublicerad. Din privata analys finns kvar.');}));}));}
 function login(){tell('Logga in för att publicera analyser.');const form=node('form'),email=node('input'),emailLabel=node('label','E-post'),otp=node('input'),otpLabel=node('label','Engångskod');
   email.type='email';email.required=true;email.autocomplete='email';email.id='publicationEmail';emailLabel.htmlFor=email.id;
   otp.id='publicationOtp';otp.autocomplete='one-time-code';otp.inputMode='numeric';otpLabel.htmlFor=otp.id;
   const send=node('button','Skicka engångskod');send.type='submit';form.append(emailLabel,email,send);form.onsubmit=e=>{e.preventDefault();run(async()=>{await adapter.requestOtp(email.value.trim());tell('Om adressen kan användas skickas en engångskod.');});};
   body.append(form,otpLabel,otp,button('Logga in',async()=>{await adapter.verifyOtp(email.value.trim(),otp.value.trim());await open();}));}
 async function open(selected=null){show();body.replaceChildren();const s=selected&&stillSaved(selected)?selected:saved();if(!s){tell(sourceProblem?'Den sparade Research-datan kan inte läsas säkert. Kontrollera lokal backup innan du fortsätter.':'Spara analysen innan du publicerar den.');return;}
   if(!window.NTMCloudConfig?.enabled){tell('Publicering är inte tillgänglig i denna miljö. Din sparade Research finns kvar.');return;}
   adapter ||= window.NTMSocialAdapter||window.NTMCloudAdapter.create(window.NTMCloudConfig);window.NTMSocialAdapter=adapter;
   await identity();if(!owner){login();return;}
   if(!mine){tell('Skapa en offentlig profil för att publicera analyser.');body.append(link('Skapa offentlig profil','konto.html#socialAccount'));return;}
   if(mine.suspended){tell('Profilen är dold av moderering. Publicering är inte tillgänglig.');return;}
   if(!mine.active){tell('Aktivera din offentliga profil för att publicera analyser.');body.append(link('Hantera profil','konto.html#socialAccount'));return;}
   compose(s,owner,mine.username);
 }
 function compose(s,userId,username){
   const R=window.NTMPublicReport;s=JSON.parse(JSON.stringify(s));body.replaceChildren();tell('');
   body.append(node('p','Sparad privat version: '+s.scope+' · '+(s.rev.savedAt||s.rev.createdAt||'Datum saknas')));
   if(currentThesisState.isDirty)body.append(node('p','Osparade ändringar ingår inte. Urvalet utgår från den valda sparade versionen.'));
   body.append(node('p','Endast valda fält blir offentliga. Privata anteckningar, svar, utfall, portfölj, bevakningar och kontouppgifter följer inte med. Granska även din fritext.'));
   const form=node('form'),draft=C.draft(s.scope,s.rev),inputs={},checks={},fields={...C.fields,summary:'Sammanfattning',followUp:'Offentlig uppföljningsplan',reviewDate:'Avsett granskningsdatum',correction:'Offentlig rättelse'};
   for(const [key,labelText] of Object.entries(fields)){
     const optional=!['company','ticker','thesis','analysisDate'].includes(key),label=node('label',labelText),input=node(['company','ticker','analysisDate','reviewDate'].includes(key)?'input':'textarea');
     input.id='publish_'+key;label.htmlFor=input.id;input.value=draft[key]||'';input.maxLength=key==='company'?160:key==='ticker'?128:6000;
     if(input.tagName==='INPUT')input.type=key.endsWith('Date')?'date':'text';else input.rows=4;
     if(optional){const check=node('input'),wrap=node('label');check.type='checkbox';check.id='include_'+key;wrap.append(check,document.createTextNode('Ta med '+labelText.toLowerCase()));checks[key]=check;form.append(wrap);
       input.hidden=label.hidden=true;input.disabled=true;check.onchange=()=>{input.hidden=label.hidden=!check.checked;input.disabled=!check.checked;};}
     else input.required=true;inputs[key]=input;form.append(label,input);
   }
   const candidates=R.candidates(s.rev,s.scope),selectedFinancial=[];
   form.append(node('h3','Fryst finansiellt sammanhang'),node('p','Endast jämförbara SEC-helår i det sparade underlaget kan väljas. Urvalet intygar inte en ny kontroll mot SEC.'));
   for(const statement of candidates.statements){const label=node('label'),check=node('input');check.type='checkbox';check.dataset.statement=statement.type;label.append(check,document.createTextNode(R.describe(statement)));form.append(label);selectedFinancial.push({check,statement});}
   if(!candidates.statements.length)form.append(node('p','Inget publicerbart finansiellt underlag i denna sparade version. Du kan publicera ditt resonemang utan det.'));
   const chartCheck=node('input');chartCheck.type='checkbox';chartCheck.id='include_chart';
   if(candidates.chart){const label=node('label');label.append(chartCheck,document.createTextNode('Ta med intäktsdiagram med tabell och källor'));form.append(label);}
   form.append(node('p','Värdering ingår inte: sparat underlag saknar en fullständig fryst formel-, kursdatum- och aktiebas.'));
   const preview=node('button','Förhandsgranska publicering');preview.type='submit';form.append(preview);
   form.onsubmit=e=>{e.preventDefault();run(async()=>{
     if(!form.reportValidity())return;
     const selection={basisDate:(s.rev.savedAt||s.rev.createdAt||'').slice(0,10),financial:selectedFinancial.filter(x=>x.check.checked).map(x=>x.statement)};
     for(const key of Object.keys(fields))if(!checks[key]||checks[key].checked)selection[key]=inputs[key].value;
     if(chartCheck.checked&&candidates.chart)selection.chart=candidates.chart;
     let snapshot;try{snapshot=R.project(selection);}catch(_){tell('Kontrollera bolag, datum och tes (minst 30 tecken). Valda källor måste vara tillgängliga vid analysdatum. Underlaget kan inte publiceras i detta format.');return;}
     const history=own.filter(a=>a.sourceScope===s.scope),previous=history.find(a=>!a.hidden&&!a.moderated),head=previous||history.filter(a=>a.versionId).sort((a,b)=>b.versionNumber-a.versionNumber)[0],requestId=crypto.randomUUID(),author={username:mine.username,displayName:mine.displayName};
     body.replaceChildren(node('h3','Det här kommer att bli offentligt'));
     window.NTMPublicReportUI.render(body,snapshot,{author,versionNumber:(head?.versionNumber||(previous?1:0))+1});
     const changes=node('section');changes.className='report-diff';changes.append(node('h3',previous?'Ändringar mot nu publicerad version':'Ditt valda offentliga urval'));
     for(const change of R.diff(previous?.content,snapshot)){const d=node('details');d.append(node('summary',({added:'Tillagt',removed:'Borttaget',changed:'Ändrat'})[change.state]+': '+change.label));
       for(const [label,value] of [['Tidigare',change.before],['Efter',change.after]])d.append(node('h4',label),node('pre',value===null?'Ingår inte':typeof value==='string'?value:JSON.stringify(value,null,2)));changes.append(d);}
     body.append(changes,node('p','Bekräftelsen skapar en ny fryst offentlig version. Senare privata ändringar påverkar inte rapporten. En ersatt version blir otillgänglig offentligt.'));
     tell('');body.append(button('Tillbaka',()=>{body.replaceChildren(form);tell('');}),button('Publicera',async()=>{
       if((await adapter.session())?.userId!==userId){tell('Inloggningen har ändrats. Öppna publiceringen igen.');return;}
       if(!stillSaved(s)){tell('Den sparade versionen har ändrats eller tagits bort. Öppna publiceringen igen.');return;}
       const result=await adapter.socialWrite('publishV2',{scope:s.scope,revision:s.rev.id,snapshot,requestId,confirmed:true,author,...(head?{reportId:head.id,expectedVersion:previous?(previous.versionId||previous.id):null}:{})});
       body.replaceChildren(link('Visa analys',C.analysisUrl(result.id)),node('p'),link('Visa min profil',C.profileUrl(username)));tell('Rapporten är publicerad.');await identity();window.NTMEvents?.emit('public_analysis_published');
     }));heading.focus();
   });};body.append(form);
 }
 trigger.onclick=()=>run(open);window.NTMResearchPublication={refreshSource};
 if(window.NTMCloudConfig?.enabled){adapter=window.NTMSocialAdapter||window.NTMCloudAdapter.create(window.NTMCloudConfig);window.NTMSocialAdapter=adapter;
   identity().catch(()=>{});adapter.onSessionChange(()=>{if(!busy)identity().catch(()=>{});});}
})();
