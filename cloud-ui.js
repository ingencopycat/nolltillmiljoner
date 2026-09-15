/* Optional account controls. No analytics integration or silent upload on login. */
(() => {
  const el=id=>document.getElementById(id);
  if(!el('cloudAccount'))return;
  const states={local:'Sparat lokalt',pending:'Väntar på synk',synced:'Synkat',error:'Synkfel',conflict:'Konflikt'};
  let adapter,engine,busy=false;
  const message=text=>{el('cloudMessage').textContent=text;};
  function render() {
    const logged=Boolean(engine?.owner());
    el('cloudLogin').hidden=logged;el('cloudConnected').hidden=!logged;
    el('cloudStatus').textContent=states[engine?.status() || 'local'];
    if(logged) {
      const count=engine.localCounts();
      el('cloudMigration').textContent=`Du har sparad NTM-data i den här webbläsaren: ${count.revisions} thesis-versioner, ${count.checkpoints} utfallskontroller och ${count.scenarios} scenarier/planer. Synk omfattar även sparade antaganden, rapportfrågor, manuella journaler, observationer och tema. Academy-lärhistorik, beslutspauser, antagandegrupper, mallval, osparade utkast och senaste verktyg skickas inte.`;
      const list=el('cloudQueue');list.replaceChildren();
      for(const op of engine.inspect().ops) {
        const item=document.createElement('li');item.textContent=`${op.record.kind}: ${states[op.status==='ack'?'synced':op.status]}, försök ${op.attempts}/3`;list.appendChild(item);
      }
    }
  }
  async function act(action) {
    if(busy)return;busy=true;
    for(const button of el('cloudAccount').querySelectorAll('button'))button.disabled=true;
    try {await action();render();}
    catch(e) {
      try{render();}catch(_){}
      message(e.code==='cleanup'?'Kontot och molndata har raderats och du är utloggad lokalt, men enhetens städning eller serverutloggning kunde inte bekräftas. Kontrollera lokal backup och lagring.'
        :e.code==='conflict'?'Konflikt: samma ID har olika innehåll. Inget skrivs över. Exportera båda kopiorna för manuell granskning.'
        :'Åtgärden kunde inte bekräftas. Kontrollera anslutning, inloggning eller lokal lagring. Dina lokala källposter raderas inte av synk.');
      el('cloudStatus').textContent=e.code==='conflict'?'Konflikt':'Synkfel';
    } finally {busy=false;for(const button of el('cloudAccount').querySelectorAll('button'))button.disabled=false;}
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
    engine=window.NTMCloudSync.create({local:window.NTMLocalData,storage:localStorage,adapter});render();
  } catch(_) {el('cloudLogin').hidden=true;message('Molnanslutningen är inte konfigurerad. Lokal användning fungerar som vanligt.');return;}
  el('cloudRequestOtp').onclick=()=>act(async()=>{
    if(!el('cloudEmail').reportValidity())return;
    await adapter.requestOtp(el('cloudEmail').value.trim());
    message('Om e-postadressen kan användas skickas en engångskod. Ingen lokal data har laddats upp.');
  });
  el('cloudVerifyOtp').onclick=()=>act(async()=>{
    await adapter.verifyOtp(el('cloudEmail').value.trim(),el('cloudOtp').value.trim());
    el('cloudIdentity').textContent='Inloggad som '+el('cloudEmail').value.trim();
    el('cloudOtp').value='';el('cloudEmail').value='';await engine.authenticate();
    message('Inloggad. Ingen uppladdning eller import har gjorts. Välj själv nästa steg. Exportera gärna lokal backup först.');
  });
  el('cloudStayLocal').onclick=()=>message('Dina uppgifter behålls endast lokalt just nu. Redan bekräftade molnkopior påverkas inte.');
  el('cloudUpload').onclick=()=>act(async()=>{
    if(!confirm('Synka de visade sparade kategorierna till det inloggade kontot? Lokal data behålls. Exportera gärna backup först.'))return;
    engine.enqueue();render();await engine.flush();
    message(engine.status()==='synced'?'Servern har bekräftat de köade posterna. Lokal data finns kvar.':'Kön väntar på nytt försök eller innehåller ett fel. Senare lokala ändringar kräver ny synk.');
  });
  el('cloudRetry').onclick=()=>act(async()=>{await engine.flush();message('Kön har kontrollerats. Högst tre försök per post; fel och konflikter finns kvar för granskning.');});
  el('cloudRestore').onclick=()=>act(async()=>{
    const plan=await engine.previewRestore();
    if(!confirm(`Slå samman ${plan.counts} molnposter med denna enhet? Nya versioner kan bli senaste version. Samma ID med olika innehåll stoppar importen; lokala poster och befintligt tema behålls.`))return;
    await engine.restore();window.initMinNtmPage?.();message('Molnposter har slagits samman med lokal data och kontrollästs. Ladda om för att använda ett importerat tema.');
  });
  el('cloudExport').onclick=()=>act(async()=>{const r=await engine.exportCloud();download(r.portable,'ntm-cloud-backup.json');message('Portabel molnbackup exporterad. Förvara filen privat.');});
  el('cloudAuditExport').onclick=()=>act(async()=>{const r=await engine.exportCloud();download(r.account,'ntm-account-records.json');message('Alla egna molnposter exporterade, inklusive preferenshistorik. Använd portabel backup för lokal import.');});
  el('cloudLogout').onclick=()=>act(async()=>{await engine.logout();message('Utloggad. Lokal data och väntande kö finns kvar på den här enheten.');});
  el('cloudDelete').onclick=()=>act(async()=>{
    const deleteLocal=el('cloudDeleteLocal').checked;
    if(!confirm(`Radera kontot och all privat molndata permanent? ${deleteLocal?'Även denna enhets lokala NTM-data raderas.':'Denna enhets lokala data behålls.'} Exportera gärna backup först.`))return;
    await engine.deleteAccount({deleteLocal});el('cloudDeleteLocal').checked=false;window.initMinNtmPage?.();
    message(deleteLocal?'Konto, molndata och vald lokal data har raderats.':'Konto och molndata har raderats. Lokal data finns kvar.');
  });
  window.addEventListener('focus',()=>{if(!busy)act(async()=>{});});
})();
