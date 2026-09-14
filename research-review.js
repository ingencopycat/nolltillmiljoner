/** Explicit review decisions use the existing immutable revision store. */
(() => {
  const el = id => document.getElementById(id);
  let data = null, pending = null;
  const status = text => { if (el('reviewStatus')) el('reviewStatus').textContent = text; };
  function fields() {
    const latest = window.NTMThesisStorage.get(data?.symbol).thesis;
    const assumptions=[], assumptionDetails=[], reportQuestions=[];
    let lifecycleError='';
    for (const i of [1,2,3]) {
      const text=el(`thesis-assumption-${i}`).value.trim();
      const old=latest?.assumptionDetails?.[i-1];
      const same=latest?.assumptions?.[i-1] === text;
      if (!text && (el(`assumption-falsification-${i}`).value.trim() || el(`assumption-date-${i}`).value || el(`assumption-note-${i}`).value.trim())) lifecycleError=`Skriv antagande ${i} för att spara dess motbevis och granskning.`;
      if (text) {
        assumptions.push(text);
        const status=el(`assumption-status-${i}`).value || 'current';
        const falsification=el(`assumption-falsification-${i}`).value.trim();
        const unchanged=same && old?.falsification === falsification;
        assumptionDetails.push({...same && old, id:same ? old?.id : null,
          createdAt:same ? old?.createdAt : null, falsification,
          reviewBy:el(`assumption-date-${i}`).value || null, status,
          reviewedAt:unchanged && old?.status === status ? old?.reviewedAt : null,
          assessment:el(`assumption-assessment-${i}`).value || 'unreviewed',note:el(`assumption-note-${i}`).value.trim()});
      }
      const question=el(`report-question-${i}`).value.trim();
      if(!question && el(`report-answer-${i}`).value.trim()) lifecycleError=`Skriv rapportfråga ${i} för att spara svaret.`;
      if(question) {
        const prev=latest?.reportQuestions?.[i-1], sameQuestion=prev?.text === question;
        const status=el(`report-status-${i}`).value || 'open';
        reportQuestions.push({...sameQuestion && prev,id:sameQuestion ? prev?.id : null,
          createdAt:sameQuestion ? prev?.createdAt : null,text:question,status,
          answer:el(`report-answer-${i}`).value.trim(),answeredAt:sameQuestion && prev?.status === status ? prev?.answeredAt : null});
      }
    }
    // An untouched legacy editor must not invent metadata or create a duplicate revision.
    const legacyUnchanged=!latest?.assumptionDetails && JSON.stringify(assumptions) === JSON.stringify(latest?.assumptions || [])
      && assumptionDetails.every(a=>!a.falsification && !a.reviewBy && a.status==='current' && a.assessment==='unreviewed' && !a.note);
    return {lifecycleError,assumptions, ...(legacyUnchanged ? {} : {assumptionDetails}),
      ...(reportQuestions.length || latest?.reportQuestions ? {reportQuestions} : {}),
      reviewDate:el('thesis-review-date')?.value || null,
      review: pending ? {...pending,context:el('reviewContext').value.trim(),processNote:el('reviewProcess').value.trim(),at:new Date().toISOString()} : latest?.review || null };
  }
  function init(stock) {
    if (!el('thesis-assumption-1')) return;
    data = stock; pending = null;
    const {thesis,error,warning} = window.NTMThesisStorage.get(stock.symbol);
    for (const i of [1,2,3]) el(`thesis-assumption-${i}`).value = thesis?.assumptions?.[i-1] || '';
    for (const i of [1,2,3]) {
      const a=thesis?.assumptionDetails?.[i-1], q=thesis?.reportQuestions?.[i-1];
      for(const [field,value] of Object.entries({
        [`assumption-falsification-${i}`]:a?.falsification, [`assumption-date-${i}`]:a?.reviewBy,
        [`assumption-status-${i}`]:a?.status || 'current', [`assumption-assessment-${i}`]:a?.assessment || 'unreviewed',
        [`assumption-note-${i}`]:a?.note, [`report-question-${i}`]:q?.text,
        [`report-status-${i}`]:q?.status || 'open', [`report-answer-${i}`]:q?.answer,
      })) {el(field).value=value || '';el(field).oninput=()=>{currentThesisState.isDirty=true;hideThesisSavedIndicator();};}
    }
    el('thesis-review-date').value = thesis?.reviewDate || '';
    for (const node of [1,2,3].map(i=>el(`thesis-assumption-${i}`)).concat(el('thesis-review-date'))) node.oninput = () => {
      currentThesisState.isDirty = true; hideThesisSavedIndicator();
    };
    // Editing the premise or its criterion needs a fresh explicit assessment.
    for(const i of [1,2,3]) for(const id of [`thesis-assumption-${i}`,`assumption-falsification-${i}`]) {
      el(id).oninput=()=>{currentThesisState.isDirty=true;hideThesisSavedIndicator();
        el(`assumption-status-${i}`).value='current';el(`assumption-assessment-${i}`).value='unreviewed';};
    }
    el('thesisReview').hidden = !thesis;
    if (!thesis) return;
    el('reviewBelief').textContent = thesis.text;
    el('reviewAssumptions').textContent = window.NTMThesisStorage.assumptionText(thesis,window.NTMThesisStorage.todayLocal());
    if(stock.manual) el('reviewEvidenceLinks').innerHTML='<a href="#thesisRevisionSelect">Läs den frysta versionen</a>';
    el('reviewQuestions').textContent = window.NTMThesisStorage.questionText(thesis);
    el('reviewContext').value = '';
    el('reviewProcess').value = '';
    el('reviewNextDate').value = '';
    const state = window.NTMThesisStorage.reviewStatus(thesis);
    const inactive=['closed','abstained'].includes(state);
    el('review-keep').disabled=inactive;
    el('review-revise').textContent=inactive ? 'Återöppna och revidera' : 'Revidera';
    status(error || warning || (state === 'abstained' ? 'Avstod. Tesen är inaktiv och historiken finns kvar. Revidera öppnar den igen när du sparar.' : state === 'closed' ? 'Tesen är stängd. Historiken finns kvar; Revidera kan öppna den igen.'
      : state === 'due' ? `Ditt planerade granskningsdatum ${thesis.reviewDate} har nåtts. Ingen brådska eller rekommendation antyds.`
      : thesis.reviewDate ? `Nästa granskning: ${thesis.reviewDate}. Du kan granska tidigare om du vill.` : 'Inget granskningsdatum valt. Granska när det passar dig.'));
    el('reviewDataContext').textContent = stock.manual ? 'Manuell tes — automatisk bolagsdata saknas. Granska dina egna underlag. Beslut sparas i en ny version utan finansiell snapshot.' : `Du granskar senaste versionen från ${formatRevisionDate(thesis.updatedAt)}. Aktuell Research-data avser ${stock.ttm?.asOfPeriod || 'senast tillgängliga rapportperiod'}. Läs förändringarna och den frysta versionen innan du bestämmer dig. Behåll/Stäng sparar beslutet med samma historiska värderingssnapshot; ingen ny värdering görs.`;
    for (const decision of ['keep','revise','close','abstain']) el(`review-${decision}`).onclick = () => {
      const current = window.NTMThesisStorage.get(stock.symbol);
      if (current.error || current.warning || current.thesis?.latestRevisionId !== thesis.latestRevisionId) {status('Historiken ändrades eller kunde inte läsas. Ladda om innan du granskar.');return;}
      if (decision === 'revise') {
        pending = {decision,sourceRevisionId:thesis.latestRevisionId,context:el('reviewContext').value.trim(),observedPeriod:stock.ttm?.asOfPeriod || null,
          changeKey:stock.manual ? null : JSON.stringify(window.NTMChangeDetection.detect(thesis.valuationSnapshot,stock))};
        el('thesis-review-date').value = el('reviewNextDate').value;
        currentThesisState.isDirty = true;
        status('Granskning pågår i arbetsformuläret. Redigera tes och antaganden; beräkna ändrad värdering och välj Spara ny version. Ingen historik har ändrats.');
        el('thesis-text').focus(); return;
      }
      if (currentThesisState.isDirty) {status('Spara dina ändringar i arbetsformuläret först, eller ladda om för att avstå från dem.');return;}
      const result = window.NTMThesisStorage.completeReview(stock.symbol,decision,el('reviewContext').value.trim(),el('reviewNextDate').value || null,stock.ttm?.asOfPeriod || null,
        stock.manual ? null : JSON.stringify(window.NTMChangeDetection.detect(thesis.valuationSnapshot,stock)), el('reviewProcess').value.trim());
      if (!result.success) {status(result.error);return;}
      window.NTMEvents?.emit('thesis_reviewed', { action: decision });
      if (el('reviewNextDate').value && el('reviewNextDate').value !== thesis.reviewDate) window.NTMEvents?.emit('review_date_set');
      currentThesisState.selectedRevisionId = result.revisionId;
      initThesisSection(stock); initChangeDetection(stock);
      status(decision === 'abstain' ? 'Avstod är sparat i en ny version. Tesen är inaktiv; historiken finns kvar.' : decision === 'close' ? 'Tesen är stängd i en ny version. Tidigare versioner och utfallskontroller behålls.' : 'Behåll är sparat i en ny version. Tidigare antaganden och värderingssnapshot är oförändrade.');
    };
  }
  window.NTMReview = {init,fields};
})();
