/** Compact review queue from user dates and existing Change Detection, never recommendations. */
(() => {
  let generation = 0;
  function attention(thesis, data, today) {
    const state = window.NTMThesisStorage.reviewStatus(thesis,today);
    if (state === 'closed' || state === 'abstained' || state === 'missing') return [];
    const reasons = state === 'due' ? ['Ditt granskningsdatum har nåtts'] : [];
    if ((thesis.assumptionDetails || []).some(a=>window.NTMThesisStorage.assumptionStatus(a,today) === 'due')) reasons.push('Ditt granskningsdatum för ett antagande har nåtts');
    if ((thesis.reportQuestions || []).some(q=>q.status === 'open')) reasons.push('Du har öppna frågor inför rapport — ingen tidsfrist antyds');
    if (thesis.origin !== 'manual' && data && thesis.valuationSnapshot) {
      const report = window.NTMChangeDetection.detect(thesis.valuationSnapshot,data);
      if (report.hasChanges && thesis.review?.changeKey !== JSON.stringify(report)) reasons.push('Research-data har ändrats jämfört med din sparade snapshot');
    }
    return reasons;
  }
  async function render() {
    const list=document.getElementById('reviewQueue'), message=document.getElementById('reviewQueueStatus'), closed=document.getElementById('closedTheses');
    if (!list) return;
    const token=++generation, store=window.NTMThesisStorage.read();
    list.replaceChildren();closed.replaceChildren();message.textContent='Kontrollerar sparade teser och tillgänglig Research-data…';
    const rows=await Promise.all(Object.values(store.theses).map(async thesis => {
      if (['close','abstain'].includes(thesis.review?.decision)) return {thesis,reasons:[],closed:true};
      let data=null, unavailable=false;
      if (thesis.origin !== 'manual' && ['NVDA','SOFI','CRWD'].includes(thesis.ticker)) {
        try { const response=await fetch(`data/stocks/${thesis.ticker}.json`);if(!response.ok)throw new Error('data');data=await response.json(); }
        catch (_) {unavailable=true;}
      } else unavailable=thesis.origin !== 'manual';
      return {thesis,reasons:attention(thesis,data),unavailable};
    }));
    if(token!==generation)return;
    for(const row of rows) {
      if (!row.closed && !row.reasons.length) continue;
      const item=document.createElement('article');item.className='min-ntm-list-item';
      const text=document.createElement('div'), title=document.createElement('h3'), detail=document.createElement('p'), link=document.createElement('a');
      title.textContent=row.thesis.companyIdentity?.type === 'label' ? row.thesis.companyName : `${row.thesis.ticker} · ${row.thesis.companyName || ''}`;
      const savedDate=Date.parse(row.thesis.updatedAt);
      detail.textContent=`Senaste version: ${Number.isFinite(savedDate) ? new Date(savedDate).toLocaleDateString('sv-SE') : 'datum saknas'}. ${row.thesis.origin === 'manual' ? 'Manuell tes — automatisk bolagsdata saknas. ' : 'Research med bolagsdata. '}${row.closed ? (row.thesis.review?.decision === 'abstain' ? 'Avstod; historiken finns kvar.' : 'Stängd tes; historiken finns kvar.') : row.reasons.join('. ')+'.'}`;
      link.href=`research.html?ticker=${encodeURIComponent(row.thesis.ticker)}&review=1#thesisReview`;
      link.className='secondary-btn';link.textContent=row.closed?'Läs inaktiv tes':'Granska tes';
      text.append(title,detail);item.append(text,link);(row.closed?closed:list).appendChild(item);
    }
    const incomplete=store.error || Object.keys(store.issues || {}).length || rows.some(r=>r.unavailable);
    message.textContent=incomplete ? 'Vissa sparade poster eller Research-data kunde inte kontrolleras. Granskningslistan kan vara ofullständig; lagringen är oförändrad.'
      : rows.some(r=>r.reasons.length) ? 'Utifrån dina valda datum och tillgängliga bolagsdata. Du avgör själv om något behöver ändras.'
      : 'Du har inget som behöver granskas just nu utifrån sparade datum och tillgängliga Research-data.';
  }
  window.NTMMinReview={render,attention};
})();
