/** Versioned local backup and deliberate ticker deletion. No network or automatic writes. */
(() => {
  const keys = { theses: 'investment-research-theses-v1', outcomes: 'ntm-research-outcomes-v1',
    scenarios: 'investment-scenarios-v1', theme: 'investment-theme', behavioral: 'ntm-behavioral-v1', academy:'ntm-academy-progress-v1' };
  const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const clone = v => JSON.parse(JSON.stringify(v));
  const stable = v => JSON.stringify(v, function(k, value) {
    return object(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value;
  });
  function safeTree(value) {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Backup innehåller ogiltiga tal.');
    if (object(value) || Array.isArray(value)) for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Backup innehåller en osäker nyckel.');
      safeTree(child);
    }
  }
  function validate(data) {
    if (object(data) && !Object.hasOwn(data,'academy')) data={...data,academy:window.NTMAcademyProgress.empty()};
    if (object(data) && !Object.hasOwn(data,'behavioral')) data={...data,behavioral:window.NTMBehavioral.empty()};
    if (!object(data) || Object.keys(data).sort().join() !== Object.keys(keys).sort().join()) throw new Error('Backup saknar stödda datadelar eller innehåller okända datadelar.');
    safeTree(data);
    const behavioral=window.NTMBehavioral.validate(data.behavioral);
    const theses = window.NTMThesisStorage.backupData(JSON.stringify(data.theses));
    for (const [ticker, record] of Object.entries(theses.theses)) {
      if (!/^[A-Z0-9.-]+$/i.test(ticker)) throw new Error('Ogiltig ticker i backup.');
      for (const revision of record.revisions) {
        if (revision.valuationSnapshot?.ticker && revision.valuationSnapshot.ticker !== ticker.toUpperCase()) throw new Error('Snapshot tillhör annan ticker.');
      }
    }
    const outcome = window.NTMResearchOutcomes.read(JSON.stringify(data.outcomes));
    const scenario = window.NTMScenarioStorage.read(JSON.stringify(data.scenarios));
    if (outcome.error || scenario.error) throw new Error(outcome.error || scenario.error);
    if (data.theme !== null && !['light', 'dark'].includes(data.theme)) throw new Error('Okänt tema i backup.');
    return { ...clone(data), theses, behavioral, academy:window.NTMAcademyProgress.validate(data.academy) };
  }
  function capture() {
    const raw = Object.fromEntries(Object.entries(keys).map(([name,key]) => [name,window.localStorage.getItem(key)]));
    const data = validate({
      theses: raw.theses === null ? {version:2,theses:{}} : JSON.parse(raw.theses),
      outcomes: raw.outcomes === null ? {schemaVersion:1,checkpoints:[]} : JSON.parse(raw.outcomes),
      scenarios: raw.scenarios === null ? {version:1,calculators:{}} : JSON.parse(raw.scenarios),
      theme: raw.theme,
      behavioral: raw.behavioral === null ? window.NTMBehavioral.empty() : JSON.parse(raw.behavioral),
      academy: raw.academy === null ? window.NTMAcademyProgress.empty() : JSON.parse(raw.academy)
    });
    return {raw,data};
  }
  function counts(data) {
    return { revisions: Object.values(data.theses.theses).reduce((n,r) => n+r.revisions.length,0),
      checkpoints:data.outcomes.checkpoints.length, behavioralEvents:data.behavioral.events.length, academyEvents:data.academy.events.length+data.academy.attempts.length,
      scenarios:Object.values(data.scenarios.calculators).reduce((n,r) => n+r.length,0) };
  }
  function exportJSON() {
    return JSON.stringify({application:'NTM',schemaVersion:3,exportedAt:new Date().toISOString(),data:capture().data},null,2);
  }
  function union(a,b) {
    const result = clone(a);
    for (const [key,value] of Object.entries(b)) {
      if (Object.hasOwn(result,key) && stable(result[key]) !== stable(value)) throw new Error(`Konflikt i ${key}. Ingen data har importerats.`);
      result[key] = clone(value);
    }
    return result;
  }
  function mergeRecords(a,b) {
    const result = clone(a), byId = new Map(result.map(r => [r.id,r]));
    for (const record of b) {
      if (byId.has(record.id)) {
        if (stable(byId.get(record.id)) !== stable(record)) throw new Error(`Samma ID har olika innehåll: ${record.id}. Ingen data har importerats.`);
      } else { result.push(clone(record)); byId.set(record.id,record); }
    }
    return result;
  }
  function mergeScenarios(a, b) {
    const result = clone(a);
    for (const record of b) {
      const existing = result.find(r => r.id === record.id);
      if (!existing) { result.push(clone(record)); continue; }
      if (existing.followup && record.followup) {
        const left = clone(existing), right = clone(record);
        left.followup.observations = []; right.followup.observations = [];
        if (stable(left) !== stable(right)) throw new Error('Originalplanen har olika innehåll. Ingen data har importerats.');
        existing.followup.observations = mergeRecords(existing.followup.observations, record.followup.observations);
      } else mergeRecords([existing], [record]);
    }
    return result;
  }
  function mergeData(a,b) {
    const result = clone(a);
    const {theses: at, ...ae} = a.theses, {theses: bt, ...be} = b.theses;
    result.theses = {...union(ae,be),theses:clone(at)};
    for (const [key,record] of Object.entries(bt)) {
      const existingKey = Object.keys(result.theses.theses).find(k => k.toUpperCase() === key.toUpperCase()) || key;
      const existing = result.theses.theses[existingKey];
      if (!existing) result.theses.theses[existingKey] = clone(record);
      else {
        const {revisions: ar,...ax} = existing, {revisions:br,...bx} = record;
        result.theses.theses[existingKey] = {...union(ax,bx),revisions:mergeRecords(ar,br)};
      }
    }
    const {checkpoints: ac,...ao} = a.outcomes, {checkpoints:bc,...bo} = b.outcomes;
    result.outcomes = {...union(ao,bo),checkpoints:mergeRecords(ac,bc)};
    const {calculators: as,...ax} = a.scenarios, {calculators:bs,...bx} = b.scenarios;
    result.scenarios = {...union(ax,bx),calculators:clone(as)};
    for (const [key,records] of Object.entries(bs)) result.scenarios.calculators[key] = mergeScenarios(as[key] || [],records);
    result.theme = a.theme ?? b.theme;
    result.behavioral = {version:1,events:mergeRecords(a.behavioral.events,b.behavioral.events)};
    result.academy = {version:2,events:mergeRecords(a.academy.events,b.academy.events),attempts:mergeRecords(a.academy.attempts,b.academy.attempts)};
    return validate(result);
  }
  function prepare(text) {
    const backup = JSON.parse(text);
    if (!object(backup) || backup.application !== 'NTM' || ![1,2,3].includes(backup.schemaVersion)
        || typeof backup.exportedAt !== 'string' || !Number.isFinite(Date.parse(backup.exportedAt))
        || Object.keys(backup).sort().join() !== ['application','schemaVersion','exportedAt','data'].sort().join()) throw new Error('Backupformatet stöds inte. Ingen data ändrades.');
    if(backup.schemaVersion>=2 && !Object.hasOwn(backup.data || {},'behavioral')) throw new Error('Backup saknar beteendehistorik.');
    if(backup.schemaVersion===3 && !Object.hasOwn(backup.data || {},'academy')) throw new Error('Backup saknar lärhistorik.');
    const incoming = validate(backup.data), current = capture();
    return {...current,next:mergeData(current.data,incoming),incoming:counts(incoming)};
  }
  function workKeys(ticker) {return Object.keys(window.localStorage).filter(k=>k.startsWith("ntm-research-work-v1:") && (!ticker || k === "ntm-research-work-v1:"+ticker));}
  function clearReviewReference(ticker) {
    const storage=window.sessionStorage;if(!storage)return;
    const key='ntm-research-review-target-v1',raw=storage.getItem(key);if(!raw)return;
    let target;try{target=JSON.parse(raw);}catch(_){target=null;}
    if(!ticker||!target||target.ticker===ticker){storage.removeItem(key);if(storage.getItem(key)!==null)throw new Error('Den lokala granskningslänken kunde inte rensas. Ingen sparad data raderades.');}
  }
  function commit(raw,next, names = Object.keys(keys), removeKeys = []) {
    const locations={...keys}; raw={...raw}; names=[...names];
    for(const k of removeKeys){locations[k]=k;raw[k]=window.localStorage.getItem(k);names.push(k);}
    const nextRaw = Object.fromEntries(names.map(name => [name,removeKeys.includes(name) ? null : name === 'theme' ? next.theme : JSON.stringify(next[name])]));
    const changed = names.filter(name => raw[name] !== nextRaw[name]);
    // Guard against changes since validation, then verify each write and rollback on failure.
    for (const name of names) if (window.localStorage.getItem(locations[name]) !== raw[name]) throw new Error('Lagringen ändrades i en annan flik. Försök igen.');
    const attempted = [];
    try {
      for (const name of changed) {
        attempted.push(name);
        if (nextRaw[name] === null) window.localStorage.removeItem(locations[name]);
        else window.localStorage.setItem(locations[name],nextRaw[name]);
        if (window.localStorage.getItem(locations[name]) !== nextRaw[name]) throw new Error('Kontrolläsning misslyckades.');
      }
    } catch (error) {
      let restored = true;
      for (const name of attempted.reverse()) {
        try {
          if (window.localStorage.getItem(locations[name]) !== raw[name]) {
            if (raw[name] === null) window.localStorage.removeItem(locations[name]);
            else window.localStorage.setItem(locations[name],raw[name]);
          }
          if (window.localStorage.getItem(locations[name]) !== raw[name]) restored = false;
        } catch (_) { restored = false; }
      }
      throw new Error(restored ? 'Skrivning misslyckades (full eller blockerad lagring). Tidigare data är bevarade.'
        : 'Skrivning och återgång misslyckades. Data kan vara delvis ändrade. Behåll backupfilen och kontrollera lagringen innan du fortsätter.');
    }
    return {success:true};
  }
  function importJSON(text) { const plan = prepare(text); return commit(plan.raw,plan.next); }
  function deleteTicker(ticker, scope) {
    ticker = String(ticker).trim().toUpperCase();
    if (!/^[A-Z0-9.-]+$/.test(ticker) || !['all','outcomes'].includes(scope)) throw new Error('Välj ticker och raderingsomfattning.');
    const {raw,data} = capture(), next = clone(data), names = [];
    next.outcomes.checkpoints = next.outcomes.checkpoints.filter(r => r.ticker !== ticker);
    if (next.outcomes.checkpoints.length !== data.outcomes.checkpoints.length) names.push('outcomes');
    if (scope === 'all' && raw.theses !== null) {
      next.theses = JSON.parse(raw.theses);
      for (const key of Object.keys(next.theses.theses)) if (key.toUpperCase() === ticker) {
        delete next.theses.theses[key];
        if (!names.includes('theses')) names.push('theses');
      }
    }
    if(scope==='all') {
      const removed=new Set(next.behavioral.events.filter(e=>['pause.create','link.create'].includes(e.kind) && e.payload.ticker===ticker).map(e=>e.entityId));
      next.behavioral.events=next.behavioral.events.filter(e=>!removed.has(e.entityId));
      if(removed.size)names.push('behavioral');
    }
    // Full ticker deletion deliberately excludes global calculators and theme preferences.
    if(scope==='all')clearReviewReference(ticker);
    return commit(raw,next,names,scope === 'all' ? workKeys(ticker) : []);
  }
  window.NTMLocalData = {exportJSON,importJSON,inspectImport:text => prepare(text).incoming,deleteTicker,counts:() => counts(capture().data),
    // Cloud uses the same validation, non-destructive merge and guarded commit as JSON restore.
    validateData: validate,
    previewData: incoming => counts(mergeData(capture().data,validate(incoming))),
    clearAll: () => { const {raw} = capture(); clearReviewReference(); return commit(raw,{theses:{version:2,theses:{}},
      outcomes:{schemaVersion:1,checkpoints:[]},scenarios:{version:1,calculators:{}},theme:null,behavioral:window.NTMBehavioral.empty(),academy:window.NTMAcademyProgress.empty()},Object.keys(keys),workKeys()); }
  };

  const exportButton = document.getElementById('localDataExport');
  if (!exportButton) return;
  const status = document.getElementById('localDataStatus');
  const act = async (fn, deleting = false) => { try { await fn(); } catch (error) {
    status.textContent = error.message; window.NTMStatus?.set(status, 'error', error.message);
    if (deleting) window.NTMEvents?.emit('delete_error');
  } };
  exportButton.onclick = () => act(() => {
    const blob = new Blob([exportJSON()],{type:'application/json'}), url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`ntm-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
    window.NTMEvents?.emit('backup_exported');
    status.textContent='JSON-backup exporterad. Förvara filen privat; den innehåller dina texter och antaganden.';
  });
  document.getElementById('localDataImport').onclick = () => act(async () => {
    const file = document.getElementById('localDataFile').files[0];
    if (!file) throw new Error('Välj en JSON-backup först.');
    if (file.size > 20 * 1024 * 1024) throw new Error('Backupfilen är större än 20 MB. Ingen data ändrades.');
    const text = await file.text(), summary = prepare(text).incoming;
    if (!confirm(`Slå samman ${summary.revisions} versioner, ${summary.checkpoints} utfallskontroller, ${summary.scenarios} scenarier, ${summary.behavioralEvents} beteendehändelser och ${summary.academyEvents} ändringar i lärhistoriken? Nya versioner läggs sist och kan bli senaste version. Samma ID med olika innehåll stoppar hela importen. Befintligt tema behålls.`)) return;
    importJSON(text); window.initMinNtmPage?.(); window.NTMAcademyRefresh?.(); window.NTMAcademyV3Refresh?.();
    window.NTMEvents?.emit('backup_imported');
    status.textContent='Backup importerad och kontrolläst. Befintliga poster behölls; identiska ID:n duplicerades inte. Ladda om för att använda ett importerat tema.';
  });
  for (const [id,scope] of [['localDataDeleteAll','all'],['localDataDeleteOutcomes','outcomes']]) document.getElementById(id).onclick = () => act(() => {
    const ticker = document.getElementById('localDataTicker').value.trim().toUpperCase();
    if (!/^[A-Z0-9.-]+$/.test(ticker)) throw new Error('Ange en giltig ticker.');
    const description = scope === 'all' ? 'alla thesis-versioner, snapshots och utfallskontroller inklusive arkivkopior' : 'alla utfallskontroller inklusive arkivkopior; thesis-historiken behålls';
    if (!confirm(`Radera för ${ticker}: ${description}? Andra bolag och kalkylatorscenarier behålls. Detta kan inte ångras. Exportera gärna backup först.`)) return;
    deleteTicker(ticker,scope); window.initMinNtmPage?.();
    window.NTMEvents?.emit('delete_completed');
    status.textContent = scope === 'all' ? `All privat Research-data för ${ticker} har raderats och kontrollästs. Andra bolag och kalkylatorscenarier behålls.` : `Utfallskontroller och arkivkopior för ${ticker} har raderats och kontrollästs. Thesis-historiken behålls.`;
  }, true);
})();
