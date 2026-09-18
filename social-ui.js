/* UI uses text nodes for all user content. Auth and private sync stay in the existing adapter. */
(() => {
 'use strict';
 const C=window.NTMSocialCore,$=id=>document.getElementById(id),page=document.querySelector('[data-social-page]')?.dataset.socialPage;
 if(!page)return;
 $('socialStatus').textContent='';
 let adapter=window.NTMAccount?.adapter,mine=null,busy=false,opener=null,actionOpener=null,own=[],selected=null,accountVersion=0,refreshPending=false,accountListening=false;
 const params=new URLSearchParams(location.search),status=text=>{$('socialStatus').textContent=text;if($('dialogStatus'))$('dialogStatus').textContent=text;};
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(label,fn)=>{const b=node('button',label,label==='Publicera analys'?'primary-btn':'secondary-btn');b.type='button';b.onclick=()=>run(fn);return b;};
 const link=(label,url)=>{const a=node('a',label);a.href=url;return a;};
 const emit=name=>window.NTMEvents?.emit(name);
 function field(form,label,id,value='',type='text',max=6000){
   const l=node('label',label);l.htmlFor=id;const n=node(type==='textarea'?'textarea':'input');n.id=id;
   if(type!=='textarea')n.type=type;else n.rows=4;n.value=value;n.maxLength=max;form.append(l,n);return n;
 }
 function check(form,label,id,value=false){const l=node('label'),n=node('input');n.type='checkbox';n.id=id;n.checked=value;l.append(n,document.createTextNode(label));form.append(l);return n;}
 async function run(fn){if(busy)return;if(window.NTMAccount?.busy){status('Vänta tills kontoåtgärden är klar.');return;}busy=true;status('');
   if(fn!==account&&$('cloudMessage')&&mine)$('cloudMessage').textContent='';
   // Disabling a focused button can move focus to body before the dialog opens.
   actionOpener=document.activeElement;
   const accountButtons=[...document.querySelectorAll('.social-shell button:not([id^="cloud"])')].map(b=>[b,b.disabled]);accountButtons.forEach(([b])=>b.disabled=true);document.querySelector('.social-shell').setAttribute('aria-busy','true');status('Arbetar…');
   try{await fn();}catch(e){status(e.code==='conflict'?'Användarnamnet är inte tillgängligt. Välj ett annat.':e.code==='auth'?'Logga in igen för att fortsätta.':
   e.code==='rate_limit'?'Du har redan rapporterat profilen under de senaste 24 timmarna.':e.code==='forbidden'?'Åtgärden är inte tillgänglig. Kontrollera profilens status.':
   e.code==='invalid'?'Kontrollera uppgifterna. Användarnamnet kan vara reserverat eller otillåtet.':
   'Åtgärden kunde inte bekräftas. Kontrollera inloggning och anslutning och försök igen.');}
   finally{busy=false;actionOpener=null;document.querySelector('.social-shell').setAttribute('aria-busy','false');if($('socialStatus').textContent==='Arbetar…')status('');accountButtons.forEach(([b,disabled])=>b.disabled=disabled);if(refreshPending){refreshPending=false;queueMicrotask(()=>run(account));}}}
 function dialog(title){opener=actionOpener||document.activeElement;$('socialDialogTitle').textContent=title;$('socialDialogBody').replaceChildren();
   const message=node('p');message.id='dialogStatus';message.setAttribute('role','status');message.setAttribute('aria-live','polite');$('socialDialogBody').append(message);
   $('socialDialogTitle').tabIndex=-1;$('socialDialog').showModal();$('socialDialogTitle').focus();return $('socialDialogBody');}
 function close(){if($('socialDialog').open)$('socialDialog').close();}
 $('socialDialogClose').onclick=close;$('socialDialog').addEventListener('close',()=>opener?.isConnected&&opener.focus());
 function content(parent,s){for(const [key,label] of Object.entries(C.fields)){if(!s[key])continue;parent.append(node('h3',label),node('p',s[key],'social-text'));}}
 function profileCard(p){const card=node('section',undefined,'card'),head=node('div',undefined,'social-header');
   head.append(node('div',(p.displayName||p.username).slice(0,2).toUpperCase(),'social-avatar'));
   const title=node('div');title.append(node('h2',p.displayName),link('@'+p.username,C.profileUrl(p.username)));if(p.role==='admin'||p.role==='moderator')title.append(node('span',p.role==='admin'?'ADMIN':'MODERATOR','social-role'));
   head.append(title);card.append(head,node('p',p.bio,'social-text'));
   if(p.level!==null)card.append(node('p','Academy: '+p.level));if(p.xp!==null)card.append(node('p',p.xp+' XP'));
   if(p.level!==null||p.xp!==null)card.append(node('p','Academy-uppgifter delade av användaren.','social-note'));
   const stats=node('div',undefined,'social-stats');stats.append(button(p.followers+' följare',()=>relations(p,'followers')),button(p.following+' följer',()=>relations(p,'following')),node('span','Medlem sedan '+new Date(p.memberSince+'T12:00:00').toLocaleDateString('sv-SE',{year:'numeric',month:'long'})));card.append(stats);
   return card;
 }
 async function relations(p,kind){const body=dialog(kind==='followers'?'Följare':'Följer');await list(body,kind,{username:p.username},'profiles');}
 async function list(parent,action,args={},kind='analyses',offset=0){
   const rows=await adapter.socialRead(action,{...args,offset});if(offset===0)parent.replaceChildren();
   if(!rows?.length){if(!offset)parent.append(node('p',action==='search'?'Vi hittade ingen offentlig profil med det användarnamnet.':action==='followers'?'Inga följare ännu.':action==='following'?'Följer inga offentliga profiler ännu.':action==='recent'?'Inga analyser har publicerats ännu.':kind==='profiles'?'Inga offentliga profiler att visa.':'Inga analyser publicerade här ännu.'));return;}
   for(const r of rows){const item=node('div',undefined,'social-item');
     if(kind==='profiles')item.append(link(r.displayName+' · @'+r.username,C.profileUrl(r.username)));
     else {const title=node('h3');title.append(link(r.content.company+' · '+r.content.ticker,C.analysisUrl(r.id)));item.append(title,node('p','Av @'+r.author.username+' · '+new Date(r.publishedAt).toLocaleDateString('sv-SE'),'social-note'),node('p',r.content.thesis.slice(0,180)+(r.content.thesis.length>180?'…':'')));}
     parent.append(item);
   }
   if(rows.length===20){const more=button('Visa fler',async()=>{await list(parent,action,args,kind,offset+20);more.remove();});parent.append(more);}
 }
 async function publicProfile(username,parent){const p=await adapter.socialRead('profile',{username});parent.replaceChildren();
   if(!p){parent.append(node('p','Profilen finns inte eller är inte offentlig.'));return;}
   const card=profileCard(p);parent.append(card);if(page==='profil'){document.querySelector('.page-intro h1').hidden=true;card.querySelector('h2').replaceWith(node('h1',p.displayName));}
   if(mine?.active && mine.username!==p.username){let follows=await adapter.socialWrite('followState',{username});
     const follow=button(follows?'Följer · sluta följa':'Följ',async()=>{follows=await adapter.socialWrite(follows?'unfollow':'follow',{username});
       follow.textContent=follows?'Följer · sluta följa':'Följ';follow.setAttribute('aria-pressed',String(follows));if(follows)emit('profile_followed');
       await publicProfile(username,parent);status(follows?'Du följer nu @'+username+'.':'Du följer inte längre @'+username+'.');parent.querySelector('[aria-pressed]')?.focus();});
     follow.setAttribute('aria-pressed',String(follows));card.append(follow);
   }else if(mine?.username!==p.username){const logged=await adapter.session();card.append(link(logged?'Skapa eller aktivera din offentliga profil för att följa':'Logga in för att följa',logged?'#socialAccount':'konto.html?u='+encodeURIComponent(username)));}
   if(mine?.username===p.username)card.append(button('Redigera profil',()=>{$('profileEdit').open=true;$('displayName').focus();}));
   else if(await adapter.session())card.append(button('Rapportera profil',()=>report(p)));
   else card.append(link('Rapportera profil (logga in)','konto.html?u='+encodeURIComponent(username)+'&report=1'));
 }
 function report(p){const body=dialog('Rapportera @'+p.username),form=node('form'),label=node('label','Orsak');label.htmlFor='reportReason';
   const reason=node('select');reason.id='reportReason';for(const [value,text] of Object.entries({impersonation:'Identitetsintrång',abuse:'Kränkande användarnamn eller profil',spam:'Bedrägeri eller spam',threat:'Trakasserier eller hot',illegal:'Olagligt innehåll',other:'Annat'})){
     const opt=node('option',text);opt.value=value;reason.append(opt);}
   form.append(label,reason);const detail=field(form,'Detaljer (valfritt, högst 500 tecken)','reportDetail','','textarea',500);
   form.append(node('p','Rapporten visas bara för moderering. Din identitet och rapporten blir inte offentliga. Undvik känsliga personuppgifter.'));
   const send=node('button','Skicka rapport','secondary-btn');send.type='submit';form.append(send);form.onsubmit=e=>{e.preventDefault();run(async()=>{
     await adapter.socialWrite('report',{username:p.username,reason:reason.value,detail:detail.value});emit('profile_report_submitted');close();status('Rapporten har skickats för granskning.');});};body.append(form);
 }
 async function account(){const version=++accountVersion;close();mine=null;const box=$('profileSettings');box.replaceChildren();$('publicationPanel').hidden=true;
   const logged=await adapter.session();if(!logged){box.append(node('p','Logga in ovan för att skapa eller hantera din valfria offentliga profil.'));$('profileExport').replaceChildren();return;}
   const result=await adapter.socialWrite('mine');if(version!==accountVersion)return;mine=result;
   if($('cloudIdentity'))$('cloudIdentity').textContent=mine?'@'+mine.username:'Privat konto';
   window.dispatchEvent(new CustomEvent('ntm-profile-change'));
   if(!mine){box.append(node('p','Vill du skapa en offentlig NTM-profil? Ditt privata konto fungerar även utan profil.'),button('Skapa offentlig profil',setup),button('Inte nu',()=>{box.replaceChildren(node('p','Ditt konto fortsätter vara privat. Du kan skapa en profil senare.'),button('Skapa offentlig profil',setup));}));}
   else if(mine.suspended){box.append(node('p','Profilen är dold av moderering. Ditt privata konto fungerar fortfarande.'));}
   else settings(box);
   $('publicationPanel').hidden=false;
   if(!mine||mine.suspended){$('ownAnalyses').replaceChildren(node('p',mine?.suspended?'Profilen är dold av moderering. Publicering är inte tillgänglig.':'Skapa och aktivera en offentlig profil ovan för att publicera en analys. Din privata Research förblir privat.'));}
   else {await publications();}
   $('profileExport').replaceChildren(button('Exportera profildata och egna rapporter',async()=>{const data=await adapter.socialWrite('export');const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
     const a=link('Export',url);a.download='ntm-profile-export.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Profildata exporterad. Filen kan innehålla dolda publiceringar och dina egna rapporter. Förvara den privat.');}));
   if(params.get('u')){let target=$('accountTarget');if(!target){target=node('section');target.id='accountTarget';$('socialAccount').after(target);}await publicProfile(C.normalizeUsername(params.get('u')),target);}
 }
 function setup(){const body=dialog('Skapa offentlig profil'),form=node('form');
   const username=field(form,'Permanent användarnamn','profileUsername','','text',64);username.pattern='[A-Za-z0-9_]{3,24}';username.minLength=3;username.required=true;username.autocomplete='off';username.spellcheck=false;
   const preview=node('p','@ditt_användarnamn','username-preview'),feedback=node('p','3–24 tecken: a–z, siffror och understreck.','social-note');feedback.id='usernameFeedback';feedback.setAttribute('role','status');username.setAttribute('aria-describedby','usernameFeedback');form.append(preview,feedback);
   let availability=null,validated='',generation=0,timer;
   username.oninput=()=>{const candidate=C.normalizeUsername(username.value),version=++generation;clearTimeout(timer);availability=null;validated='';preview.textContent='@'+(candidate||'ditt_användarnamn');username.removeAttribute('aria-invalid');
     if(candidate.length<3||candidate.length>24){feedback.textContent='Använd 3–24 tecken.';username.setAttribute('aria-invalid','true');return;}
     if(!/^[a-z0-9_]+$/.test(candidate)){feedback.textContent='Använd bara a–z, siffror och understreck.';username.setAttribute('aria-invalid','true');return;}
     feedback.textContent='Kontrollerar användarnamnet…';timer=setTimeout(async()=>{try{const result=await adapter.usernameAvailability(candidate);if(version!==generation||!username.isConnected)return;
       availability=result;validated=candidate;feedback.textContent=({available:'✓ @'+candidate+' är ledigt',unavailable:'Det användarnamnet är upptaget.',reserved:'Det användarnamnet är reserverat.',blocked:'Det användarnamnet är inte tillåtet.',invalid:'Använd bara a–z, siffror och understreck.',length:'Använd 3–24 tecken.'})[result]||'Det gick inte att kontrollera namnet. Försök igen.';
       username.setAttribute('aria-invalid',String(result!=='available'));
     }catch(_){if(version===generation&&username.isConnected)feedback.textContent='Namnet kunde inte kontrolleras. Kontrollera anslutningen och skriv namnet igen.';}},250);};
   const name=field(form,'Visningsnamn','profileName','','text',60);name.required=true;
   form.append(node('h3','Användarnamnet kan inte ändras senare.'),node('p','Din profil är offentlig och kan hittas via användarnamnet. Din privata NTM-data publiceras inte automatiskt.'));
   const confirm=check(form,'Jag vill skapa en offentlig profil och förstår att användarnamnet är permanent.','profileConfirm');confirm.required=true;
   const send=node('button','Skapa profil','secondary-btn');send.type='submit';form.append(send);form.onsubmit=e=>{e.preventDefault();run(async()=>{
     if(!form.reportValidity())return;if(availability!=='available'||validated!==C.normalizeUsername(username.value)){status('Välj ett ledigt användarnamn och vänta tills kontrollen är klar.');username.focus();return;}await adapter.socialWrite('create',{username:C.normalizeUsername(username.value),displayName:name.value.trim(),confirmed:confirm.checked});
     emit('public_profile_created');close();await account();status('Din offentliga profil är skapad. Inga analyser eller Academy-uppgifter har publicerats.');});};body.append(form);
 }
 function settings(box){box.append(node('h3','@'+mine.username),node('p',mine.active?'Profilen är offentlig.':'Profilen är inaktiv och dold. Användarnamnet är fortfarande ditt.'));
   if(mine.active)box.append(button('Visa min profil',async()=>{const body=dialog('Din offentliga profil');body.append(profileCard(await adapter.socialRead('profile',{username:mine.username})),link('Öppna offentlig profillänk',C.profileUrl(mine.username)),button('Redigera profil',()=>{$('profileEdit').open=true;opener=$('displayName');close();opener.focus();}));}));
   const edit=node('details',undefined,'social-disclosure');edit.id='profileEdit';edit.append(node('summary','Redigera profil'),node('p','@'+mine.username+' är ditt permanenta användarnamn.','social-note'));box.append(edit);
   const form=node('form'),name=field(form,'Visningsnamn','displayName',mine.displayName,'text',60),bio=field(form,'Kort presentation (klartext, högst 200 tecken)','profileBio',mine.bio,'textarea',200);name.required=true;
   const active=check(form,'Offentlig profil aktiv','profileActive',mine.active);
   form.append(node('p','När du inaktiverar profilen döljs även analyser och följrelationer. De bevaras och blir synliga igen när du aktiverar profilen. Ditt privata konto påverkas inte.'));
   const level=check(form,'Visa min Academy-nivå','showLevel',mine.showLevel),xp=check(form,'Visa exakt XP','showXp',mine.showXp);
   form.append(node('p','Endast valda sammanfattningar från denna enhet delas när du sparar. Inga svar, försök, utmärkelser eller lärhistorik publiceras.'));
   const save=node('button','Spara profil och synlighet','secondary-btn');save.type='submit';form.append(save);form.onsubmit=e=>{e.preventDefault();run(async()=>{
     let summary=null;if(level.checked||xp.checked){const read=window.NTMAcademyProgress.read();if(read.error)throw new Error('academy');summary=window.NTMAcademyProgression.derive(read.data);}
     const args={displayName:name.value.trim(),bio:bio.value,active:active.checked,showLevel:level.checked,showXp:xp.checked,
       level:level.checked?'Nivå '+summary.level.id+' · '+summary.level.title:null,xp:xp.checked?summary.xp:null};
     if(args.active===mine.active&&args.showLevel===mine.showLevel&&args.showXp===mine.showXp){await adapter.socialWrite('settings',args);await account();status('Profilens inställningar har sparats.');return;}
     const body=dialog('Bekräfta profilens synlighet');body.append(node('p',args.active?'Detta blir offentligt på din profil:':'Din profil, analyser och följrelationer döljs.'),node('h3',args.displayName),node('p',args.bio,'social-text'));
     if(args.level)body.append(node('p',args.level));if(args.xp!==null)body.append(node('p',args.xp+' XP'));
     body.append(button('Bekräfta ändringar',async()=>{await adapter.socialWrite('settings',args);close();await account();status('Profilens inställningar har sparats.');}));});};edit.append(form);
 }
 async function publications(){
   own=await adapter.socialWrite('ownAnalyses');const list=$('ownAnalyses');list.replaceChildren();
   list.append(node('p',own.filter(a=>!a.hidden&&!a.moderated).length+' publicerade'));
   if(mine?.active)list.append(link('Visa profil',C.profileUrl(mine.username)));
   for(const a of own){const item=node('div',undefined,'social-item');
     item.append(a.hidden?node('span',a.content.company):link(a.content.company,C.analysisUrl(a.id)),node('p',a.moderated?'Dold av moderering':a.hidden?'Avpublicerad':'Publicerad'),link('Hantera i Research','research.html?ticker='+encodeURIComponent(a.sourceScope)));
     list.append(item);
   }
 }
 async function init(){try{status('Hämtar…');if(!adapter){if(!window.NTMCloudConfig?.enabled){status('Konton och offentliga profiler är inte aktiverade här ännu. Din lokala Research fungerar som vanligt.');return;}adapter=window.NTMCloudAdapter.create(window.NTMCloudConfig);}window.NTMSocialAdapter=adapter;
   if(page==='konto'){if(!accountListening){accountListening=true;window.addEventListener('ntm-account-change',()=>{accountVersion++;close();if(busy){refreshPending=true;return;}run(account);});}await account();}
   if(page==='profil'){const username=C.normalizeUsername(params.get('u'));await publicProfile(username,$('publicProfile'));await list($('publicAnalyses'),'analyses',{username});}
   if(page==='analys'){const a=await adapter.socialRead('analysis',{id:params.get('id')});if(!a){status('');$('publicAnalysis').append(node('p','Analysen finns inte eller är inte offentlig.'));return;}
     document.querySelector('.page-intro h1').hidden=true;
     const report=$('publicAnalysis'),header=node('header',undefined,'report-header');
     header.append(node('p',a.content.ticker+' · Investeringsanalys','section-kicker'),node('h1',a.content.company));
     const byline=node('div',undefined,'report-byline');byline.append(link('Av @'+a.author.username,C.profileUrl(a.author.username)));header.append(byline);
     const dates=node('div',undefined,'report-dates');
     dates.append(node('span','Publicerad '+new Date(a.publishedAt).toLocaleDateString('sv-SE')));
     if(a.content.analysisDate)dates.append(node('span','Analysdatum '+a.content.analysisDate));header.append(dates);
     header.append(node('p','Publicerad av användaren. Resonemanget är användarens eget och innebär inget godkännande från NTM.','report-ownership'));report.append(header);
     const body=node('div',undefined,'report-body'),index=node('nav',undefined,'report-index'),copy=node('div',undefined,'report-copy');
     index.setAttribute('aria-label','I analysen');body.append(index,copy);report.append(body);
     for(const [key,label] of Object.entries(C.fields)){
       if(['company','ticker','analysisDate'].includes(key)||!a.content[key])continue;
       const section=node('section',undefined,'report-section');section.id='report-'+key;
       index.append(link(label,'#'+section.id));
       const ownership=node('span',key==='assumptions'?'Författarens antagande':key==='sources'?'Författarens källhänvisningar':'Författarens bedömning','claim-label');
       ownership.dataset.claim=key==='assumptions'?'assumption':'judgment';
       section.append(ownership,node('h2',label),node('p',a.content[key],'social-text'));copy.append(section);
     }
   }
   if(page==='upptack'){$('userSearch').onsubmit=e=>{e.preventDefault();run(async()=>{const username=C.normalizeUsername($('usernameSearch').value.replace(/^@/,''));if(!/^[a-z0-9_]{3,24}$/.test(username))return;await list($('searchResults'),'search',{username},'profiles');emit('user_search_used');});};await list($('recentAnalyses'),'recent');}
   if($('socialStatus').textContent==='Hämtar…')status('');
 }catch(_){status('Det gick inte att hämta profildata. Kontrollera anslutningen och försök igen.');$('socialStatus').append(button('Försök igen',init));}}
 init();
})();
