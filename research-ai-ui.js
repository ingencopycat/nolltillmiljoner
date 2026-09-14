/** Research-only progressive disclosure. Mock requires loopback + explicit test injection. */
(() => {
  const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  const provider=window.NTMResearchAI.createProvider(local && window.NTM_AI_TEST_MODE===true ? {mode:'mock',environment:'test'} : {});
  const el=id=>document.getElementById(id);
  const node=(tag,value,parent)=>{const n=document.createElement(tag);n.textContent=value;parent.appendChild(n);return n;};
  let generation=0;
  function init(data,revision) {
    const root=el('researchAI');if(!root)return;
    const token=++generation;root.hidden=!revision;
    el('aiResult').replaceChildren();el('aiDraft').value='';el('aiDraftArea').hidden=true;
    el('aiConflicts').replaceChildren();
    if(revision) {
      try {
        const blocked=window.NTMResearchAI.buildRequest('changes',revision,data).unavailable;
        if(blocked.length) {
          const details=node('details','',el('aiConflicts'));
          node('summary','Källkonflikter och saknade jämförelser · utan AI',details);
          blocked.forEach(e=>node('p',`${e.metric_id}: ${e.reason}. ${e.conflict.text}`,details));
        }
      } catch {node('p','Jämförelseunderlaget är inte tillgängligt.',el('aiConflicts'));}
    }
    el('aiState').textContent=provider.mode==='mock'?'TESTDEMO – lokala fasta mallar, ingen riktig AI.': 'AI är inte aktiverad. Inga uppgifter skickas. Funktionerna kräver en framtida konfigurerad leverantör.';
    for(const task of ['changes','challenge','report']) {
      const button=el(`ai-${task}`);button.disabled=provider.mode==='disabled' || !revision;
      button.onclick=async()=>{
        const out=el('aiResult');out.replaceChildren();el('aiDraftArea').hidden=true;
        try {
          const request=window.NTMResearchAI.buildRequest(task,revision,data);
          const result=await provider.generate(request);if(token!==generation)return;
          node('p',result.summary || result.message,out);if(result.status==='unavailable')return;
          if(task!=='challenge') node('h4','Viktigaste förändringarna / oförändrade mått',out);
          for(const item of result.evidence_items) {
            node('p',item.statement,out);
            const evidence=request.evidence.find(e=>e.id===item.evidence_id);
            const details=node('details','',out);node('summary','Varför säger AI detta?',details);
            const pre=node('pre',JSON.stringify(evidence,null,2),details);pre.style.whiteSpace='pre-wrap';pre.style.overflowWrap='anywhere';
            if(evidence.source_url){const link=node('a','Öppna källa: SEC company facts',details);link.href=evidence.source_url;link.target='_blank';link.rel='noopener noreferrer';}
          }
          if(result.affected_assumptions.length) node('h4','Antaganden som kan vara berörda',out);
          result.affected_assumptions.forEach(a=>node('p',`${a.assumption_id}: ${a.reason} (${a.evidence_ids.join(', ')})`,out));
          node('h4','Frågor att undersöka / olösta rapportfrågor',out);
          [...result.questions_to_review,...result.unresolved_questions].forEach(q=>node('p',`${q.assumption_id || q.question_id}: ${q.text}`,out));
          for(const suggestion of result.suggestions) {
            node('p',`${suggestion.assumption_id}: ${suggestion.text}`,out);
            const use=node('button','Använd som utkast',out);use.type='button';use.onclick=()=>{
              el('aiDraftArea').hidden=false;el('aiDraft').value=suggestion.text;el('aiDraft').focus();
            };
          }
          node('h4','Begränsningar och manuell granskning',out);
          result.limitations.forEach(t=>node('p',t,out));
          request.filings.forEach(f=>{if(f.url){const a=node('a',`${f.form} · ${f.reportPeriod} · öppna rapport`,out);a.href=f.url;a.target='_blank';a.rel='noopener noreferrer';}});
          const preview=node('details','',out);node('summary','Test: exakt minimerat underlag',preview);
          const pre=node('pre',JSON.stringify(request,null,2),preview);pre.style.whiteSpace='pre-wrap';pre.style.overflowWrap='anywhere';
        } catch(error) {node('p',error.message,out);}
      };
    }
  }
  window.NTMResearchAIUI={init};
})();
