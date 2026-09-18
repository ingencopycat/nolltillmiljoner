/* Shared public catalog projection/search. Editorial source files are never deployed. */
(function(root){
 'use strict';
 const fields=['id','slug','question','shortAnswer','fullAnswer','example','caveats','category','concepts','aliases','relatedEntityIds','relatedLessonIds','sources','reviewedAt','publishedAt','status','difficulty','ruleId','featured','contentVersion','reviewDue','practiceId'];
 const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bp\s*\/\s*e\b/g,'pe').replace(/[^a-z0-9]+/g,' ').trim();
 const visible=e=>['reviewed','published'].includes(e.status);
 function project(data){return {version:1,pilotConcepts:(data.pilotConcepts||[]).map(c=>({id:c.id,title:c.title,answerId:c.answerId,excerpt:c.excerpt})),categories:data.categories.map(c=>({id:c.id,title:c.title})),entries:data.entries.filter(visible).map(e=>Object.fromEntries(fields.filter(k=>e[k]!==undefined).map(k=>[k,k==='sources'?e[k].map(s=>({title:s.title,url:s.url,reviewedAt:s.reviewedAt})):e[k]])))};}
 function create(data){
  const catalog=project(data),entries=catalog.entries;
  const publicEntries=()=>entries.filter(visible);
  const url=id=>{const e=publicEntries().find(e=>e.id===id);return e?'fragor-svar-'+e.slug+'.html':null;};
  const search=(query='',category='')=>{
   const terms=normalize(query).split(' ').filter(Boolean);
   const score=e=>e.aliases.some(a=>normalize(a)===normalize(query))?100:normalize(e.question).includes(normalize(query))?50:0;
   return publicEntries().filter(e=>!category||e.category===category).filter(e=>{const hay=normalize([e.question,...e.aliases,...e.concepts,e.category,catalog.categories.find(c=>c.id===e.category)?.title].join(' '));return terms.every(term=>hay.includes(term));}).sort((a,b)=>score(b)-score(a));
  };
  function ask(question){
   // Apply definition synonyms to both sides; keep how/why/driver intent intact.
   const definition=value=>normalize(value).replace(/^(vad (ar|betyder|innebar)|betyder)\s+/,'');
   const raw=normalize(question),q=definition(question);
   if(q.length<2)return [];
   const terms=q.split(' ').filter(t=>!['vad','hur','varfor','kan','ar','min','mina','och','det','ett','en'].includes(t));
   const contains=(text,phrase)=>(' '+text+' ').includes(' '+phrase+' ');
   const scored=publicEntries().map(e=>{
    const title=normalize(e.question),aliases=e.aliases.map(definition),concepts=e.concepts.map(normalize);
    const phrases=[...aliases,...concepts].filter(v=>v.length>=3&&contains(q,v));
    const hits=terms.filter(t=>title.includes(t)||aliases.some(a=>a.includes(t)));
    // Separate tiers: broad overlaps, however long, cannot outrank direct questions.
    const tier=title===raw?7:definition(e.question)===q?6:aliases.includes(q)?5:
     contains(title,q)?4:concepts.includes(q)?3:
     hits.length===terms.length&&hits.length>=1?2:phrases.length?1:0;
    return {entry:e,tier,specificity:Math.max(0,...phrases.map(v=>v.length))};
   }).filter(v=>v.tier>0).sort((a,b)=>b.tier-a.tier||b.specificity-a.specificity||a.entry.id.localeCompare(b.entry.id));
   return scored.slice(0,3).map(v=>v.entry);
  }
  return {...catalog,publicEntries,url,search,ask};
 }
 const api={fields,normalize,visible,project,create};root.NTMKnowledgeCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
