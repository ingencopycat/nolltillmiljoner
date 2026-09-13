/** Explicit review decisions use the existing immutable revision store. */
(() => {
  const el = id => document.getElementById(id);
  let data = null, pending = null;
  const status = text => { if (el('reviewStatus')) el('reviewStatus').textContent = text; };
  function fields() {
    const latest = window.NTMThesisStorage.get(data?.symbol).thesis;
    return { assumptions:[1,2,3].map(i => el(`thesis-assumption-${i}`)?.value.trim() || '').filter(Boolean),
      reviewDate:el('thesis-review-date')?.value || null,
      review: pending ? {...pending,context:el('reviewContext').value.trim(),at:new Date().toISOString()} : latest?.review || null };
  }
  function init(stock) {
    if (!el('thesis-assumption-1')) return;
    data = stock; pending = null;
    const {thesis,error,warning} = window.NTMThesisStorage.get(stock.symbol);
    for (const i of [1,2,3]) el(`thesis-assumption-${i}`).value = thesis?.assumptions?.[i-1] || '';
    el('thesis-review-date').value = thesis?.reviewDate || '';
    for (const node of [1,2,3].map(i=>el(`thesis-assumption-${i}`)).concat(el('thesis-review-date'))) node.oninput = () => {
      currentThesisState.isDirty = true; hideThesisSavedIndicator();
    };
    el('thesisReview').hidden = !thesis;
    if (!thesis) return;
    el('reviewBelief').textContent = thesis.text;
    el('reviewAssumptions').textContent = thesis.assumptions.length ? thesis.assumptions.map((a,i)=>`${i+1}. ${a}`).join('\n') : 'Den sparade versionen saknar uttryckliga antaganden. Du kan lägga till dem genom Revidera.';
    el('reviewContext').value = '';
    el('reviewNextDate').value = '';
    const state = window.NTMThesisStorage.reviewStatus(thesis);
    status(error || warning || (state === 'closed' ? 'Tesen är stängd. Historiken finns kvar; Revidera kan öppna den igen.'
      : state === 'due' ? `Ditt planerade granskningsdatum ${thesis.reviewDate} har nåtts. Ingen brådska eller rekommendation antyds.`
      : thesis.reviewDate ? `Nästa granskning: ${thesis.reviewDate}. Du kan granska tidigare om du vill.` : 'Inget granskningsdatum valt. Granska när det passar dig.'));
    el('reviewDataContext').textContent = `Du granskar senaste versionen från ${formatRevisionDate(thesis.updatedAt)}. Aktuell Research-data avser ${stock.ttm?.asOfPeriod || 'senast tillgängliga rapportperiod'}. Läs förändringarna och den frysta versionen innan du bestämmer dig. Behåll/Stäng sparar beslutet med samma historiska värderingssnapshot; ingen ny värdering görs.`;
    for (const decision of ['keep','revise','close']) el(`review-${decision}`).onclick = () => {
      const current = window.NTMThesisStorage.get(stock.symbol);
      if (current.error || current.warning || current.thesis?.latestRevisionId !== thesis.latestRevisionId) {status('Historiken ändrades eller kunde inte läsas. Ladda om innan du granskar.');return;}
      if (decision === 'revise') {
        pending = {decision,sourceRevisionId:thesis.latestRevisionId,context:el('reviewContext').value.trim(),observedPeriod:stock.ttm?.asOfPeriod || null,
          changeKey:JSON.stringify(window.NTMChangeDetection.detect(thesis.valuationSnapshot,stock))};
        el('thesis-review-date').value = el('reviewNextDate').value;
        currentThesisState.isDirty = true;
        status('Granskning pågår i arbetsformuläret. Redigera tes och antaganden; beräkna ändrad värdering och välj Spara ny version. Ingen historik har ändrats.');
        el('thesis-text').focus(); return;
      }
      if (currentThesisState.isDirty) {status('Spara dina ändringar i arbetsformuläret först, eller ladda om för att avstå från dem.');return;}
      const result = window.NTMThesisStorage.completeReview(stock.symbol,decision,el('reviewContext').value.trim(),el('reviewNextDate').value || null,stock.ttm?.asOfPeriod || null,
        JSON.stringify(window.NTMChangeDetection.detect(thesis.valuationSnapshot,stock)));
      if (!result.success) {status(result.error);return;}
      window.NTMEvents?.emit('thesis_reviewed', { action: decision });
      if (el('reviewNextDate').value && el('reviewNextDate').value !== thesis.reviewDate) window.NTMEvents?.emit('review_date_set');
      currentThesisState.selectedRevisionId = result.revisionId;
      initThesisSection(stock); initChangeDetection(stock);
      status(decision === 'close' ? 'Tesen är stängd i en ny version. Tidigare versioner och utfallskontroller behålls.' : 'Behåll är sparat i en ny version. Tidigare antaganden och värderingssnapshot är oförändrade.');
    };
  }
  window.NTMReview = {init,fields};
})();
