/** Compact review queue from user dates and existing Change Detection, never recommendations. */
(() => {
  let generation = 0;
  let researchData = null;
  const localNotice = 'Lokala påminnelser visas när du öppnar eller återvänder till sidan. Inga bakgrundsnotiser skickas.';
  function attention(thesis, data, today) {
    return window.NTMContinuity.reasons(thesis,report(thesis,data),today).map(r=>r.label);
  }
  function report(thesis,data){return thesis?.origin!=='manual'&&data&&thesis?.valuationSnapshot?window.NTMChangeDetection.detect(thesis.valuationSnapshot,data):null;}
  async function render() {
    const list=document.getElementById('reviewQueue'), message=document.getElementById('reviewQueueStatus'), closed=document.getElementById('closedTheses');
    if (!list) return;
    const token=++generation, store=window.NTMThesisStorage.read();
    list.replaceChildren();closed.replaceChildren();message.textContent='Kontrollerar sparade teser och tillgänglig Research-data…';
    const rows=await Promise.all(Object.values(store.theses).map(async thesis => {
      if (['close','abstain'].includes(thesis.review?.decision)) return {thesis,reasons:[],closed:true};
      let data=null, unavailable=false;
      if (thesis.origin !== 'manual' && ['NVDA','SOFI','CRWD', 'MU', 'MRVL', 'VRT', 'COHR', 'RKLB', 'TTMI', 'SNDK', 'FLY', 'CRWV'].includes(thesis.ticker)) {
        try { const response=await fetch(`data/stocks/${thesis.ticker}.json`);if(!response.ok)throw new Error('data');data=await response.json();if(data.symbol!==thesis.ticker)throw new Error('company'); }
        catch (_) {unavailable=true;data=null;}
      } else unavailable=thesis.origin !== 'manual';
      const C=window.NTMContinuity,work=C?.read(thesis.ticker),evidence=report(thesis,data),all=C?.reasons(thesis,evidence),reasons=all?C.visible(all,work.value):null;
      return {thesis,evidence,work,details:reasons,reasons:reasons?reasons.map(r=>r.label):attention(thesis,data),unavailable:unavailable||!!work?.error};
    }));
    if(token!==generation)return;
    rows.sort((a,b)=>Number(!!b.details?.some(r=>r.category==='due'))-Number(!!a.details?.some(r=>r.category==='due')));
    for(const row of rows) {
      if (!row.closed && !row.reasons.length) continue;
      const item=document.createElement('article');item.className='min-ntm-list-item';
      const text=document.createElement('div'), title=document.createElement('h3'), detail=document.createElement('p'), link=document.createElement('a');
      title.textContent=row.thesis.companyIdentity?.type === 'label' ? row.thesis.companyName : `${row.thesis.ticker} · ${row.thesis.companyName || ''}`;
      const savedDate=Date.parse(row.thesis.updatedAt);
      detail.textContent=`Senaste version: ${Number.isFinite(savedDate) ? new Date(savedDate).toLocaleDateString('sv-SE') : 'datum saknas'}. ${row.thesis.origin === 'manual' ? 'Manuell tes — automatisk bolagsdata saknas. ' : 'Research med bolagsdata. '}${row.closed ? (row.thesis.review?.decision === 'abstain' ? 'Avstod; historiken finns kvar.' : 'Stängd tes; historiken finns kvar.') : row.reasons.join('. ')+'.'}`;
      link.href=`research.html?ticker=${encodeURIComponent(row.thesis.ticker)}&review=1#thesisReview`;
      link.className='secondary-btn';link.textContent=row.closed?'Läs inaktiv tes':'Granska tes';
      if(!row.closed&&window.NTMContinuity){
        const C=window.NTMContinuity,target=C.makeTarget(row.thesis.ticker,row.thesis,row.details,row.evidence);
        detail.textContent=(row.details.some(r=>r.category==='due')?'Valt granskningsdatum. ':'Information att granska när det passar. ')+detail.textContent;
        link.href=`research.html?ticker=${encodeURIComponent(row.thesis.ticker)}&review=exact#thesisReview`;
        link.onclick=e=>{try{sessionStorage.setItem(C.targetKey,JSON.stringify(target));const url=new URL(link.href,location.href);url.searchParams.set('review','exact');url.hash='thesisReview';link.href=url.href;}catch(_){e.preventDefault();message.textContent='Granskningen kunde inte öppnas säkert. Lokal sessionslagring är blockerad; ingen data ändrades.';}};
      }
      text.append(title,detail);item.append(text,link);(row.closed?closed:list).appendChild(item);
    }
    const incomplete=store.error || Object.keys(store.issues || {}).length || rows.some(r=>r.unavailable);
    message.textContent=incomplete ? 'Vissa sparade poster eller Research-data kunde inte kontrolleras. Granskningslistan kan vara ofullständig; lagringen är oförändrad.'
      : rows.some(r=>r.reasons.length) ? 'Utifrån dina valda datum och tillgängliga bolagsdata. Du avgör själv om något behöver ändras.'
      : 'Du har inget som behöver granskas just nu utifrån sparade datum och tillgängliga Research-data.';
    const C=window.NTMContinuity;
    if(C){let continuation=document.getElementById('reviewContinuations');if(!continuation){continuation=document.createElement('div');continuation.id='reviewContinuations';list.after(continuation);}continuation.replaceChildren();
      try{for(const key of C.keys()){const ticker=key.slice(C.prefix.length),work=C.read(ticker);if(work.error){message.textContent='Lokalt arbetsdata kunde inte läsas. Granskningslistan kan vara ofullständig. Originalet är bevarat.';continue;}
        if(['close','abstain'].includes(store.theses[ticker]?.review?.decision)&&work.value.draft?.pending?.decision!=='revise')continue;
        if(!work.value.draft&&!work.value.snoozes.length)continue;
        const p=document.createElement('p'),a=document.createElement('a');a.textContent=work.value.draft?'Fortsätt lokalt utkast':'Öppna pausade granskningsorsaker';a.href=`research.html?ticker=${encodeURIComponent(ticker)}#${work.value.draft?'researchContinuity':'thesisReview'}`;p.append(document.createTextNode(`${store.theses[ticker]?.companyName||ticker} · `),a);continuation.append(p);
      }}catch(_){message.textContent='Lokal arbetslagring kunde inte kontrolleras. Listan kan vara ofullständig.';}
    }
  }
  function renderResearch(stock = researchData) {
    researchData = stock;
    const node = document.getElementById('researchReminders');
    if (!node || !stock) return;
    const result = window.NTMThesisStorage.get(stock.symbol);
    node.hidden = !result.thesis && !result.error && !result.warning;
    const reasons = attention(result.thesis, stock.manual ? null : stock);
    node.textContent = result.error || result.warning
      ? 'Sparade påminnelser kunde inte kontrolleras fullständigt. Lagringen är oförändrad.'
      : (reasons.length ? reasons.join('. ') + '. ' : 'Inga aktiva påminnelser utifrån dina sparade datum och frågor. ') + localNotice;
  }
  function refresh() {
    if (document.visibilityState === 'hidden') return;
    if (document.getElementById('reviewQueue')) render();
    renderResearch();
  }
  window.addEventListener?.('focus', refresh);
  window.addEventListener?.('storage', refresh);
  document.addEventListener('visibilitychange', refresh);
  window.NTMMinReview={render,attention,renderResearch};
})();
