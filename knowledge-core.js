/* Shared public catalog projection/search. Editorial source files are never deployed. */
(function(root){
 'use strict';
 const fields=['id','slug','question','shortAnswer','fullAnswer','example','caveats','category','concepts','aliases','relatedEntityIds','relatedLessonIds','sources','reviewedAt','publishedAt','status','difficulty','ruleId','featured'];
 const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bp\s*\/\s*e\b/g,'pe').replace(/[^a-z0-9]+/g,' ').trim();
 const visible=e=>['reviewed','published'].includes(e.status);
 function project(data){return {version:1,categories:data.categories.map(c=>({id:c.id,title:c.title})),entries:data.entries.filter(visible).map(e=>Object.fromEntries(fields.filter(k=>e[k]!==undefined).map(k=>[k,k==='sources'?e[k].map(s=>({title:s.title,url:s.url,reviewedAt:s.reviewedAt})):e[k]])))};}
 function create(data){
  const catalog=project(data),entries=catalog.entries;
  const publicEntries=()=>entries.filter(visible);
  const url=id=>{const e=publicEntries().find(e=>e.id===id);return e?'fragor-svar-'+e.slug+'.html':null;};
  const search=(query='',category='')=>{
   const terms=normalize(query).split(' ').filter(Boolean);
   const score=e=>e.aliases.some(a=>normalize(a)===normalize(query))?100:normalize(e.question).includes(normalize(query))?50:0;
   return publicEntries().filter(e=>!category||e.category===category).filter(e=>{const hay=normalize([e.question,...e.aliases,...e.concepts,e.category,catalog.categories.find(c=>c.id===e.category)?.title].join(' '));return terms.every(term=>hay.includes(term));}).sort((a,b)=>score(b)-score(a));
  };
  return {...catalog,publicEntries,url,search};
 }
 const api={fields,normalize,visible,project,create};root.NTMKnowledgeCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
