/** Local behavioral UI. All private text is rendered as text, never analytics or HTML. */
(() => {
  const api=window.NTMBehavioral,el=id=>document.getElementById(id);
  if(!el('behavioralSection'))return;
  const node=(tag,text,parent)=>{const n=document.createElement(tag);n.textContent=text;parent.appendChild(n);return n;};
  const button=(text,parent,fn)=>{const b=node('button',text,parent);b.type='button';b.className='ghost-btn';b.onclick=()=>act(fn);return b;};
  const input=(label,parent,id,value='',type='text')=>{const l=node('label',label,parent);l.htmlFor=id;const n=node('input','',parent);n.id=id;n.type=type;n.value=value;return n;};
  const link=(ticker,parent)=>{const a=node('a','Öppna tes '+ticker,parent);a.href='research.html?ticker='+encodeURIComponent(ticker)+'#thesisHistorySection';return a;};
  const day=x=>x && Number.isFinite(Date.parse(x))?new Date(x).toLocaleDateString('sv-SE'):'datum saknas';
  let preview=null;
  function act(fn){try {if(fn()===false)return;render();el('behavioralStatus').textContent='Sparat lokalt. Tidigare tesversioner är oförändrade.';}catch(e){el('behavioralStatus').textContent=e.message;}}
  function render() {
    const stored=api.read(),read=window.NTMThesisStorage.read();
    for(const id of ['pauseRecords','groupRecords','retrospectiveResult','methodRecords','pauseQueue'])el(id).replaceChildren();
    el('pauseQueue').hidden=true;
    if(stored.error){el('behavioralStatus').textContent=stored.error;return;}
    const rows=api.derive(stored.data),pauses=rows.filter(e=>e.type==='pause');
    const due=pauses.filter(p=>api.due(p));
    if(due.length){el('pauseQueue').hidden=false;node('h3','Beslut att ompröva',el('pauseQueue'));node('p',`${due.length} av dina valda återbesöksdatum har nåtts.`,el('pauseQueue'));const a=node('a','Öppna dina beslutspauser',el('pauseQueue'));a.href='#pausePanel';a.onclick=()=>{el('pausePanel').open=true;};}
    for(const p of pauses) {
      const box=node('article','',el('pauseRecords'));box.className='min-ntm-list-item';
      const body=node('div','',box);node('h3',p.company,body);
      node('p',`Du ville göra detta den ${day(p.createdAt)}: ${p.context}. Skäl: ${p.reason}`,body);
      node('p',`${api.labels[p.status]} · Återbesök: ${p.revisitDate || 'inget datum valt'}. Vill du fortfarande göra samma sak?`,body);
      const label=node('label','Din omprövning',body),select=node('select','',body);select.id='pause-status-'+p.id;label.htmlFor=select.id;
      for(const [value,title] of Object.entries(api.labels)){const o=node('option',title,select);o.value=value;}select.value=p.status;
      const note=input('Valfri reflektion',body,'pause-note-'+p.id);note.maxLength=2000;
      const date=input('Nästa valfria återbesök',body,'pause-date-'+p.id,p.revisitDate || '', 'date');
      button('Spara omprövning',body,()=>api.append('pause.review',{status:select.value,note:note.value.trim(),revisitDate:date.value || null},p.id));
      const details=node('details','',body);node('summary','Bevarad beslutshistorik',details);
      p.history.forEach(e=>node('p',`${day(e.at)} · ${e.kind==='pause.create'?'Skapad':api.labels[e.payload.status]} · ${e.payload.note || e.payload.reason || 'Ingen reflektion angiven'} · Återbesök: ${e.payload.revisitDate || 'inget datum'}`,details));
      if(p.ticker && read.theses[p.ticker])link(p.ticker,body);
    }
    if(!pauses.length)node('p','Inga beslutspauser sparade. Använd formuläret om du vill anteckna ett övervägande.',el('pauseRecords'));
    const groups=api.groups(stored.data,read.theses),groupSelect=el('groupSelect'),assumptions=el('assumptionSelect');
    const chosen=groupSelect.value;groupSelect.replaceChildren();assumptions.replaceChildren();
    for(const g of groups){const o=node('option',g.name,groupSelect);o.value=g.id;}if(groups.some(g=>g.id===chosen))groupSelect.value=chosen;
    for(const [ticker,t] of Object.entries(read.theses)){const r=t.revisions.at(-1);(r.assumptions || []).forEach((a,index)=>{const o=node('option',`${t.companyName || ticker}: ${a}`,assumptions);o.value=JSON.stringify({ticker,revisionId:r.id,index});});}
    el('groupLinkForm').hidden=!groups.length || !assumptions.options.length || Boolean(read.error || Object.keys(read.issues || {}).length);
    for(const g of groups) {
      const details=node('details','',el('groupRecords'));node('summary',`${g.name} · ${g.thesisCount} teser`,details);
      node('p',`${g.thesisCount} av dina teser har sparade antaganden i denna grupp. Även historiska kopplingar ingår; detta är inte ett riskmått.`,details);
      const name=input('Nytt gruppnamn',details,'rename-'+g.id,g.name);name.maxLength=100;
      button('Byt gruppnamn',details,()=>api.append('group.rename',{name:name.value.trim()},g.id));
      button('Ta bort grupp',details,()=>{if(!confirm('Ta bort gruppen från den aktiva vyn? Grupphistoriken bevaras i privat backup. Tesversionerna ändras inte.'))return false;return api.append('group.delete',{},g.id);});
      for(const l of g.links){node('p',`${l.ticker}: ${l.text || 'Antagandet eller versionen finns inte längre'} · ${l.current?'senaste version':'historisk koppling'}`,details);if(l.text)link(l.ticker,details);button('Koppla loss antagande',details,()=>api.append('link.detach',{},l.id));}
      const history=node('details','',details);node('summary','Gruppens historik',history);g.history.forEach(e=>node('p',`${day(e.at)} · ${e.payload.name || 'Borttagen'}`,history));
    }
    const out=el('retrospectiveResult'),checkpoints=window.NTMResearchOutcomes.read();
    if(read.error || Object.keys(read.issues || {}).length || checkpoints.error)node('p','Historiken kunde inte läsas fullständigt. Inga mönster beräknas förrän lagringen kan läsas.',out);
    else {
      const r=api.retrospective(read.theses,checkpoints.checkpoints,stored.data);
      if(r.insufficient)node('p','Du behöver fler sparade granskningar innan NTM kan visa mönster. Nedan visas endast tillgängliga antal.',out);
      node('h3','Process',out);
      const processLabels={revisions:'Sparade versioner efter första versionen',reviews:'Unika sparade granskningar',assumptionsChanged:'Versionsövergångar med ändrad antagandetext',criteriaRevisited:'Registrerade granskningar av antaganden/motbevis',criteriaDidNotHold:'Egna bedömningar: höll inte',questionsAnswered:'Registrerade besvaranden av rapportfrågor',secondReviews:'Teser med minst två granskningar'};
      Object.entries(r.process).forEach(([k,v])=>node('p',`${processLabels[k]}: ${v}`,out));
      node('h3','Beslut',out);const dl={keep:'Behåll',revise:'Revidera',close:'Stäng',abstain:'Avstod',reopen:'Återöppningar (ingår även i Revidera)'};
      Object.entries(r.decisions).forEach(([k,v])=>node('p',`${dl[k]}: ${v}`,out));
      const open=node('details','',out);node('summary',`Olösta frågor i senaste versionerna (${r.unresolved.length})`,open);
      r.unresolved.forEach(q=>{node('p',`${q.ticker}: ${q.text} · skapad ${day(q.since)}`,open);link(q.ticker,open);});
      const same=node('details','',out);node('summary','Antaganden med längst oförändrad text',same);
      r.unchanged.forEach(a=>node('p',`${a.ticker}: ${a.text} · sedan ${day(a.since)} · ${a.revisions} sammanhängande versioner`,same));
      if(r.categories.length){node('h3','Dina nuvarande grupper och historiska ändringar',out);node('p','Grupperna är dina nuvarande manuella kopplingar. Antalen visar samtidighet i kopplade tesers hela sparade historik, inte vad som orsakade en ändring.',out);r.categories.forEach(g=>node('p',`${g.name}: ${g.theses} teser, ${g.assumptionChangeRevisions} versionsövergångar med ändrade antaganden.`,out));}
      node('h3','Observerade utfall · separat från beslutsprocessen',out);node('p',`${r.outcomes.observations} uttryckligen sparade utfallskontroller i ${r.outcomes.theses} teser. Detta mäter inte beslutskvalitet.`,out);
      node('p','Antal avser kvarvarande sparad historik. Saknade eller raderade versioner kan inte återskapas. Oförändrad text jämförs på samma plats; den visar inte att en övertygelse var oförändrad.',out);
    }
    for(const t of rows.filter(e=>e.type==='template'))button('Förhandsgranska sparade mallval · '+day(t.createdAt),el('methodRecords'),()=>{showPreview(t.selected);return false;});
  }
  function showPreview(selected){preview=api.template(selected);el('methodPreview').value=api.markdown(preview);el('methodJSONPreview').textContent=JSON.stringify(preview,null,2);el('methodPreviewArea').hidden=false;}
  function download(format){if(!preview)throw Error('Förhandsgranska mallen först.');const value=format==='json'?JSON.stringify(preview,null,2):api.markdown(preview),url=URL.createObjectURL(new Blob([value],{type:format==='json'?'application/json':'text/markdown'}));const a=document.createElement('a');a.href=url;a.download='ntm-method.'+(format==='json'?'json':'md');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  el('pauseForm').onsubmit=e=>{e.preventDefault();act(()=>{api.append('pause.create',{company:el('pauseCompany').value.trim(),ticker:el('pauseTicker').value.trim().toUpperCase() || null,context:el('pauseContext').value.trim(),reason:el('pauseReason').value.trim(),revisitDate:el('pauseDate').value || null});e.target.reset();});};
  el('groupForm').onsubmit=e=>{e.preventDefault();act(()=>{api.append('group.create',{name:el('groupName').value.trim()});e.target.reset();});};
  el('groupLinkForm').onsubmit=e=>{e.preventDefault();act(()=>{const a=JSON.parse(el('assumptionSelect').value);api.attach(el('groupSelect').value,a.ticker,a.revisionId,a.index);});};
  el('methodForm').onsubmit=e=>{e.preventDefault();try {showPreview([...document.querySelectorAll('[name=methodPart]:checked')].map(n=>n.value));}catch(error){el('behavioralStatus').textContent=error.message;}};
  el('methodForm').onchange=()=>{preview=null;el('methodPreviewArea').hidden=true;};
  for(const [id,format] of [['methodMarkdown','md'],['methodJSON','json']])el(id).onclick=()=>{try{download(format);}catch(e){el('behavioralStatus').textContent=e.message;}};
  el('methodSave').onclick=()=>act(()=>{if(!preview)throw Error('Förhandsgranska först.');api.append('template.create',{selected:preview.sections.map(s=>s.key)});});
  window.NTMBehavioralUI={render};
  window.addEventListener('storage',render);
  window.addEventListener('focus',render);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')render();});
  render();
})();
