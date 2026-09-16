/* Optional account controls. No analytics integration or silent upload on login. */
(() => {
  const el=id=>document.getElementById(id);
  if(!el('cloudAccount'))return;
  const states={local:'Sparat på enheten',pending:'Väntar på synk',synced:'Synkat',error:'Synkfel',conflict:'Konflikt'};
  let adapter,engine,busy=false;
  const notify=()=>setTimeout(()=>window.dispatchEvent(new CustomEvent('ntm-account-change')),0);
  const message=text=>{el('cloudMessage').textContent=text;};
  function render() {
    const logged=Boolean(engine?.owner());
    document.querySelector('.page-intro h1').textContent=logged?'Ditt konto':'Ta med NTM mellan dina enheter.';
    document.querySelector('.page-intro > p:last-child').hidden=logged;
    el('cloudLogin').hidden=logged;el('cloudConnected').hidden=!logged;
    document.querySelectorAll('[data-connected]').forEach(n=>n.hidden=!logged);
    if(!logged){el('cloudLastSync').textContent='Ingen bekräftad synk under denna inloggning.';el('cloudIdentity').textContent='';}
    el('cloudStatus').textContent=states[engine?.status() || 'local'];
    if(logged) {
      const count=engine.localCounts();
      const hasLocalWork=count.revisions+count.checkpoints+count.scenarios>0;
      const healthy=engine.status()==='synced';
      el('cloudSyncIntro').hidden=healthy;
      el('cloudMigration').textContent=healthy?'':hasLocalWork?'Du har data sparad på den här enheten.':'Inget nytt lokalt arbete att synka.';
      el('cloudMigration').hidden=healthy;
      el('cloudUpload').hidden=false;
      el('cloudUpload').className=healthy?'ghost-btn':'primary-btn';
      el('cloudUpload').textContent='Synka till ditt konto';
      el('cloudStayLocal').hidden=healthy||!hasLocalWork;
      const list=el('cloudQueue');list.replaceChildren();
      const inspection=engine.inspect(),ops=inspection.ops;
      el('cloudLastSync').textContent=inspection.lastSyncedAt?'Senast synkad '+new Date(inspection.lastSyncedAt).toLocaleString('sv-SE'):'Ingen bekräftad synk ännu.';
      el('cloudStayLocal').hidden=healthy||!hasLocalWork||ops.length>0;
      el('cloudRetry').hidden=!ops.some(op=>['pending','error'].includes(op.status));
      for(const state of ["pending","error","conflict"]) {
        const count=ops.filter(op=>op.status===state).length;if(!count)continue;
        const item=document.createElement('li');item.textContent=`${count} ${count===1?'ändring':'ändringar'}: ${states[state]}`;list.appendChild(item);
      }
      el('cloudProblems').hidden=!list.children.length;
    }
  }
  async function act(action,progress='',userInitiated=true,validateSession=true) {
    if(busy)return;busy=true;if(window.NTMAccount)window.NTMAccount.busy=true;const previousOwner=engine?.owner();
    const controls=[...el('cloudAccount').querySelectorAll('button[id^=cloud]')].map(b=>[b,b.disabled]);
    for(const [button] of controls)button.disabled=true;
    el('cloudAccount').setAttribute('aria-busy','true');if(progress)message(progress);
    if(userInitiated&&el('socialStatus'))el('socialStatus').textContent='';
    try {
      if(validateSession && engine?.owner() && !(await adapter.session())) {await engine.logout();message('Din inloggning har gått ut. Logga in igen för att fortsätta.');}
      else await action();
      render();
    }
    catch(e) {
      try{render();}catch(_){}
      message(e.code==='otp_expired'?'Koden är felaktig eller har gått ut. Använd den senaste koden eller välj Skicka ny kod.'
        :e.code==='otp_invalid'?'Koden kunde inte verifieras. Kontrollera siffrorna och försök igen.'
        :e.code==='auth_rate_limit'?'För många försök just nu. Vänta en stund innan du skickar en ny kod eller försöker igen.'
        :e.code==='cleanup'?'Kontot och molndata har raderats och du är utloggad lokalt, men enhetens städning eller serverutloggning kunde inte bekräftas. Kontrollera lokal backup och lagring.'
        :e.code==='conflict'?'En sparad version har olika innehåll på enheten och i molnet. Inget skrivs över. Exportera båda kopiorna för manuell granskning.'
        :'Det gick inte att slutföra åtgärden. Kontrollera anslutningen och försök igen. Det du sparat på enheten finns kvar.');
      if(engine?.owner()&&e.code==='conflict')el('cloudStatus').textContent='Konflikt';
    } finally {busy=false;el('cloudAccount').setAttribute('aria-busy','false');if(window.NTMAccount)window.NTMAccount.busy=false;for(const [button,disabled] of controls)button.disabled=disabled;if(previousOwner!==engine?.owner())notify();}
  }
  function download(text,name) {
    const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');
    a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  try {
    if(!window.NTMCloudConfig?.enabled) {
      el('cloudLogin').hidden=true;
      message('Konton och molnsynk är inte aktiverade på den här webbplatsen. Du kan fortsätta lokalt och exportera JSON-backup.');return;
    }
    adapter=window.NTMCloudAdapter.create(window.NTMCloudConfig);
    engine=window.NTMCloudSync.create({local:window.NTMLocalData,storage:localStorage,adapter});
    window.NTMAccount={adapter,engine};render();message('');
  } catch(_) {el('cloudLogin').hidden=true;message('Molnanslutningen är inte konfigurerad. Lokal användning fungerar som vanligt.');return;}
  const requestCode=()=>act(async()=>{
    if(!el('cloudEmail').reportValidity())return;
    await adapter.requestOtp(el('cloudEmail').value.trim());
    el('cloudEmailForm').hidden=true;el('cloudCodeForm').hidden=false;
    el('cloudCodeDestination').textContent='Kod begärd till '+el('cloudEmail').value.trim();
    message('Om adressen kan användas kommer koden via mejl. Skriv in den nedan.');el('cloudOtp').value='';el('cloudOtp').focus();
  },'Skickar engångskod…');
  el('cloudEmailForm').onsubmit=e=>{e.preventDefault();requestCode();};
  el('cloudResend').onclick=requestCode;
  el('cloudChangeEmail').onclick=()=>{el('cloudCodeForm').hidden=true;el('cloudEmailForm').hidden=false;el('cloudOtp').value='';message('');el('cloudEmail').focus();};
  el('cloudCodeForm').onsubmit=e=>{e.preventDefault();act(async()=>{
    if(!el('cloudOtp').reportValidity())return;
    await adapter.verifyOtp(el('cloudEmail').value.trim(),el('cloudOtp').value.trim());
    el('cloudIdentity').textContent='Inloggad som '+el('cloudEmail').value.trim();
    el('cloudOtp').value='';el('cloudEmail').value='';await engine.authenticate();
    el('cloudCodeForm').hidden=true;el('cloudEmailForm').hidden=false;
    message('Ditt NTM-konto är klart. Vill du synka det du redan har sparat på den här enheten? Du kan välja Inte nu och fortsätta privat.');
  },'Kontrollerar koden…');};
  el('cloudStayLocal').onclick=()=>message('Dina uppgifter behålls endast lokalt just nu. Redan bekräftade molnkopior påverkas inte.');
  el('cloudUpload').onclick=()=>act(async()=>{
    if(!confirm('Synka de visade sparade kategorierna till det inloggade kontot? Lokal data behålls. Exportera gärna backup först.'))return;
    engine.enqueue();render();await engine.flush();if(engine.status()==='synced' && el('cloudLastSync'))el('cloudLastSync').textContent='Senast synkat: '+new Date().toLocaleString('sv-SE');
    message(engine.status()==='synced'?'Dina sparade uppgifter har synkats. Lokal data finns kvar.':engine.status()==='conflict'?'En version skiljer sig mellan enheten och kontot. Inget skrivs över. Exportera båda kopiorna under Data & backup för granskning.':'Synken kunde inte slutföras. Kontrollera anslutningen och välj Försök synka igen.');
  },'Synkar ditt sparade arbete…');
  el('cloudRetry').onclick=()=>act(async()=>{await engine.flush();if(engine.status()==='synced' && el('cloudLastSync'))el('cloudLastSync').textContent='Senast synkat: '+new Date().toLocaleString('sv-SE');message('Synken har kontrollerats. Kvarstående fel och konflikter behöver din granskning.');});
  el('cloudRestore').onclick=()=>act(async()=>{
    const plan=await engine.previewRestore();
    if(!confirm(`Hämta ${plan.counts} sparade delar från ditt konto till denna enhet? Nya versioner kan bli senaste version. Om samma version har olika innehåll avbryts hämtningen. Sparat arbete och befintligt tema på enheten behålls.`))return;
    await engine.restore();notify();window.initMinNtmPage?.();message('Arbetet från ditt konto har slagits samman med det som finns på enheten. Ladda om för att använda ett importerat tema.');
  });
  el('cloudExport').onclick=()=>act(async()=>{const r=await engine.exportCloud();download(r.portable,'ntm-cloud-backup.json');message('Portabel molnbackup exporterad. Förvara filen privat.');});
  el('cloudAuditExport').onclick=()=>act(async()=>{const r=await engine.exportCloud();download(r.account,'ntm-account-records.json');message('Din privata kontodata har exporterats, inklusive tidigare inställningar. Använd portabel backup för lokal import.');});
  el('cloudLogout').onclick=()=>act(async()=>{await engine.logout();message('Utloggad. Lokal data och ännu inte synkade ändringar finns kvar på den här enheten.');},'',true,false);
  el('cloudDelete').onclick=()=>act(async()=>{
    const deleteLocal=el('cloudDeleteLocal').checked;
    if(!confirm(`Radera kontot, offentlig profil, publicerade analyser, följrelationer och all privat molndata permanent? ${deleteLocal?'Även denna enhets lokala NTM-data raderas.':'Denna enhets lokala data behålls.'} Exportera gärna backup först.`))return;
    await engine.deleteAccount({deleteLocal});el('cloudDeleteLocal').checked=false;window.initMinNtmPage?.();
    message(deleteLocal?'Konto, molndata och vald lokal data har raderats.':'Konto och molndata har raderats. Lokal data finns kvar.');
  });
  async function reconcileSession(){
    const session=await adapter.session();
    if(session && engine.owner()!==session.userId)await engine.authenticate();
    else if(!session && engine.owner())await engine.logout();
  }
  let restoreTimer;
  const restoreSession=async()=>{
    clearTimeout(restoreTimer);
    if(busy){restoreTimer=setTimeout(restoreSession,100);return;}
    try {
      const session=await adapter.session();
      if((session?.userId||null)!==engine.owner())act(reconcileSession,'',false);
    }catch(_){/* A transient network failure must not sign out a valid session. */}
  };
  adapter.onSessionChange(restoreSession);
  restoreSession();
  window.addEventListener('focus',restoreSession);
  const refresh=()=>{if(!busy){try{render();}catch(_){message('Enhetens sparade data kunde inte läsas. Kontrollera lokal lagring och backup.');}}};
  window.addEventListener('storage',refresh);
  el('themeToggle')?.addEventListener('click',refresh);
})();
