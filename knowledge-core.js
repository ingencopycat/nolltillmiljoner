/* Shared public catalog projection/search. Editorial source files are never deployed. */
(function(root){
 'use strict';
 const fields=['id','slug','question','shortAnswer','fullAnswer','example','caveats','category','concepts','aliases','relatedEntityIds','relatedLessonIds','sources','reviewedAt','publishedAt','status','difficulty','ruleId','featured','contentVersion','reviewDue','practiceId','conceptRefs','intent','sections','reviewPolicy','relatedAnswers','jurisdiction','period'];
 const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bp\s*\/\s*e\b/g,'pe').replace(/[^a-z0-9]+/g,' ').trim();
 const visible=e=>['reviewed','published'].includes(e.status);
 const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>value?.[k]!==undefined).map(k=>[k,value[k]]));
 function sections(s){if(!s)return undefined;return {
  ...(s.inline?{inline:pick(s.inline,['field','contexts'])}:{}),
  ...(s.formula?{formula:pick(s.formula,['template','explanationField','limitationField'])}:{}),
  ...(s.comparison?{comparison:{leftLabel:s.comparison.leftLabel,rightLabel:s.comparison.rightLabel,axes:s.comparison.axes.map(a=>pick(a,['label','left','right'])),limitations:s.comparison.limitations}}:{}),
  ...(s.interpretation?{interpretation:pick(s.interpretation,['field','unsuitableField'])}:{})};}
 function project(data){const publicIds=new Set(data.entries.filter(visible).map(e=>e.id)),conceptIds=new Set(data.entries.filter(visible).flatMap(e=>e.conceptRefs||[]));return {version:1,engineVersion:2,compact:!!data.compact,
  retrieval:{version:data.retrieval?.version||1,typos:(data.retrieval?.typos||[]).filter(a=>publicIds.has(a.answerId)).map(a=>pick(a,['query','answerId'])),aliases:(data.retrieval?.aliases||[]).filter(a=>publicIds.has(a.answerId)).map(a=>pick(a,['query','answerId'])),clarifications:(data.retrieval?.clarifications||[]).filter(a=>a.answerIds.length&&a.answerIds.every(id=>publicIds.has(id))).map(a=>pick(a,['query','answerIds'])),protectedAcronyms:data.retrieval?.protectedAcronyms||[]},
  knowledgeConcepts:(data.knowledgeConcepts||[]).filter(c=>conceptIds.has(c.id)).map(c=>({...pick(c,['id','term','category','synonyms','abbreviations','metric']),related:(c.related||[]).filter(id=>conceptIds.has(id)),normalizedTerm:normalize(c.term)})),
  pilotConcepts:(data.pilotConcepts||[]).filter(c=>publicIds.has(c.answerId)).map(c=>({id:c.id,title:c.title,answerId:c.answerId,excerpt:c.excerpt})),categories:data.categories.map(c=>({id:c.id,title:c.title})),
  entries:data.entries.filter(visible).map(e=>Object.fromEntries(fields.filter(k=>e[k]!==undefined).map(k=>[k,k==='sources'?e[k].map(s=>pick(s,['title','url','reviewedAt','type','authority','supports','evidenceStatus','checked','limitations'])):k==='sections'?sections(e[k]):k==='reviewPolicy'?pick(e[k],['risk','overdue']):k==='relatedAnswers'?e[k].filter(r=>publicIds.has(r.id)).map(r=>pick(r,['id','type'])):e[k]])))};}
 function index(data){const p=project(data);p.compact=true;p.entries=p.entries.map(e=>{const v={...e};for(const k of ['fullAnswer','example','caveats','sources','sections'])delete v[k];if(e.sections?.formula)v.sections={formula:e.sections.formula};return v;});return p;}
 function create(data){
  const catalog=project(data),entries=catalog.entries,byId=new Map(entries.map(e=>[e.id,e]));
  const publicEntries=()=>entries.filter(e=>visible(e)&&!(stale(e)&&e.reviewPolicy?.overdue==='suppress'));
  const url=id=>{const e=byId.get(id);return e&&visible(e)&&!(stale(e)&&e.reviewPolicy?.overdue==='suppress')?'fragor-svar-'+e.slug+'.html':null;};
  const searchText=new Map(entries.map(e=>[e.id,normalize([e.question,...e.aliases,...e.concepts,...(e.conceptRefs||[]).flatMap(id=>{const c=catalog.knowledgeConcepts.find(c=>c.id===id);return c?[c.term,...c.synonyms]:[];}),e.intent,e.category,catalog.categories.find(c=>c.id===e.category)?.title].join(' '))]));
  const search=(query='',category='')=>{
   if(typeof query!=='string'||query.length>240||/[<>\u0000-\u001f]/.test(query))return [];
   const terms=normalize(query).split(' ').filter(Boolean);
   const score=e=>e.aliases.some(a=>normalize(a)===normalize(query))?100:normalize(e.question).includes(normalize(query))?50:0;
   return publicEntries().filter(e=>!category||e.category===category).filter(e=>terms.every(term=>searchText.get(e.id).includes(term))).sort((a,b)=>score(b)-score(a));
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
  const definition=value=>normalize(value).replace(/^(vad (ar|betyder|innebar)|betyder)\s+/,'');
  const exact=new Map(),aliases=new Map();
  const add=(map,key,e)=>{if(key)map.set(key,[...new Set([...(map.get(key)||[]),e.id])]);};
  for(const e of entries){add(exact,normalize(e.question),e);add(exact,definition(e.question),e);for(const a of e.aliases)add(aliases,definition(a),e);}
  for(const a of catalog.retrieval.aliases||[])if(byId.has(a.answerId))add(aliases,definition(a.query),byId.get(a.answerId));
  const outcome=(kind,reason,ids=[],extra={})=>({kind,reason,answerId:kind==='ANSWER'?ids[0]:null,choices:kind==='CLARIFY'?ids.slice(0,5):[],retrievalVersion:catalog.retrieval.version,...extra});
  const stale=e=>e?.reviewDue&&e.reviewDue<=new Date().toISOString().slice(0,10);
  function resolve(ids,reason){ids=[...new Set(ids||[])].filter(id=>byId.has(id)&&!(stale(byId.get(id))&&byId.get(id).reviewPolicy?.overdue==='suppress'));return ids.length===1?outcome('ANSWER',reason,ids,{stale:!!stale(byId.get(ids[0]))}):ids.length>1?outcome('CLARIFY',reason,ids):outcome('ABSTAIN_NO_COVERAGE','no-reviewed-answer');}
  // Only one approved template; no expression evaluator, market data or investment conclusion.
  function calculate(id,values){
   const e=byId.get(id);if(e?.sections?.formula?.template!=='pe/1')return outcome('ABSTAIN_NO_COVERAGE','unsupported-template');
   const v=values||{},keys=['price','eps','currency','period'];
   if(Object.keys(v).some(k=>!keys.includes(k))||!['SEK','USD','EUR','GBP'].includes(v.currency)||!['annual','ttm','forward'].includes(v.period)||!['price','eps'].every(k=>typeof v[k]==='number'&&Number.isFinite(v[k])&&Math.abs(v[k])<=1e12)||v.price<=0||v.eps===0)return outcome('INVALID_INPUT','price-eps-units-period-required');
   if(v.eps<0)return outcome('ANSWER','negative-eps-limitation',[id],{calculation:{template:'pe/1',value:null,unit:'gånger',limitation:'negative-eps'}});
   if(!Number.isFinite(v.price/v.eps))return outcome('INVALID_INPUT','numeric-overflow');
   return outcome('ANSWER','approved-formula',[id],{calculation:{template:'pe/1',value:v.price/v.eps,unit:'gånger',inputs:{...v},expression:'pris per aktie / vinst per aktie'}});
  }
  function respond(input){
   if(typeof input!=='string'||input.length>240||!input.trim()||/[<>\u0000-\u001f]/.test(input))return outcome('INVALID_INPUT','invalid-question');
   const q=normalize(input),d=definition(input);
   if(/\b(kopa|salja|kop|salj|buy|sell|borde jag|ska jag|min portfolj|mina pengar)\b/.test(q))return outcome('ABSTAIN_UNSUPPORTED_JUDGMENT','personal-investment-decision');
   if(exact.has(q)||exact.has(d))return resolve(exact.get(q)||exact.get(d),'exact-question');
   const clarification=catalog.retrieval.clarifications?.find(c=>normalize(c.query)===d);if(clarification){const choices=clarification.answerIds.filter(id=>byId.has(id)&&!(stale(byId.get(id))&&byId.get(id).reviewPolicy?.overdue==='suppress'));return choices.length?outcome('CLARIFY','reviewed-ambiguity',choices):outcome('ABSTAIN_NO_COVERAGE','no-reviewed-answer');}
   if(aliases.has(d))return resolve(aliases.get(d),'reviewed-alias');
   const typo=catalog.retrieval.typos?.find(c=>normalize(c.query)===d);if(typo)return resolve([typo.answerId],'curated-typo');
   const numeric=input.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bp\s*\/\s*e\b/g,'pe').replace(/(\d),(\d)/g,'$1.$2').replace(/[?,!]/g,'').replace(/\s+/g,' ').trim();
   const supplied=numeric.match(/^(?:aktien kostar|pris(?:et)?(?: ar)?) (\d+(?:\.\d+)?) (sek|usd|eur|gbp) och (arlig|ttm|forward) eps (?:ar )?(-?\d+(?:\.\d+)?) (sek|usd|eur|gbp)(?: vad (?:ar|blir) pe)?$/);
   if(supplied){if(supplied[2]!==supplied[5])return outcome('INVALID_INPUT','currency-mismatch');return calculate('pe',{price:Number(supplied[1]),eps:Number(supplied[4]),currency:supplied[2].toUpperCase(),period:supplied[3]==='arlig'?'annual':supplied[3]});}
   // Number questions require the explicit form with units/period, never guess them from prose.
   if(/\d/.test(q))return outcome(/\b(dyr|dyrt|billig|billigt|bra|rimlig)\b/.test(q)?'ABSTAIN_UNSUPPORTED_JUDGMENT':'INVALID_INPUT',/\b(dyr|dyrt|billig|billigt|bra|rimlig)\b/.test(q)?'unreviewed-interpretation':'use-formula-inputs');
   if(/\b(dyr|dyrt|billig|billigt|bra|rimlig|bast|battre|saker)\b/.test(q))return outcome('ABSTAIN_UNSUPPORTED_JUDGMENT','unreviewed-judgment');
   const matched=catalog.knowledgeConcepts.filter(c=>[c.term,...c.synonyms,...c.abbreviations].some(t=>(' '+d+' ').includes(' '+normalize(t)+' ')));
   const comparison=/\b(skillnad|skiljer|jamfor|versus|vs)\b/.test(q);
   if(comparison||matched.length>1){const unknownAcronym=(catalog.retrieval.protectedAcronyms||[]).some(a=>(' '+q+' ').includes(' '+normalize(a)+' ')&&!matched.some(c=>c.abbreviations.includes(a)));if(unknownAcronym)return outcome('ABSTAIN_NO_COVERAGE','comparison-not-reviewed');const ids=entries.filter(e=>e.intent==='comparison'&&matched.length>1&&matched.every(c=>e.conceptRefs?.includes(c.id))).map(e=>e.id);if(ids.length)return outcome('CLARIFY','reviewed-comparison-candidates',ids);if(comparison)return outcome('ABSTAIN_NO_COVERAGE','comparison-not-reviewed');}
   if(matched.length){
    const intent=/^(varfor|hur|nar)\b/.test(q)||/\b(tolka|paverkar|innebar for|begransning)\b/.test(q)?'interpretation':'definition';
    // Concept mentions alone must not turn an unrelated sentence into an answer.
    const residual=d.split(' ').filter(t=>!matched.some(c=>normalize([c.term,...c.synonyms,...c.abbreviations].join(' ')).split(' ').includes(t)));
    if(residual.length&&intent==='definition')return outcome('ABSTAIN_NO_COVERAGE','unrecognized-intent');
    const ids=entries.filter(e=>e.intent===intent&&matched.every(c=>e.conceptRefs?.includes(c.id))).map(e=>e.id);
    return intent==='interpretation'&&ids.length?outcome('CLARIFY','confirm-interpretation',ids):resolve(ids,'concept-intent');
   }
   // Bounded one-edit matching of a single long term; protected acronyms never fuzz.
   const protectedTerms=(catalog.retrieval.protectedAcronyms||[]).map(normalize);
   if(d.length>=7&&d.length<=32&&!d.includes(' ')&&!protectedTerms.includes(d)){
    const near=(a,b)=>{if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,n=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;}else{if(++n>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}}return n+(i<a.length||j<b.length?1:0)<=1;};
    const ids=[];for(const [term,found] of [...aliases,...exact])if(term.length>=7&&!term.includes(' ')&&near(d,term))ids.push(...found);
    if(ids.length)return resolve(ids,'bounded-typo');
   }
   return outcome('ABSTAIN_NO_COVERAGE','no-reviewed-answer');
  }
  const cache=new Map(),pending=new Map();
  async function load(id){
   const e=byId.get(id);if(!e)return null;if(e.fullAnswer)return e;if(cache.has(id))return cache.get(id);if(pending.has(id))return pending.get(id);
   const request=(async()=>{const response=await fetch(`data/knowledge/answers/${encodeURIComponent(id)}.json`,{credentials:'omit',cache:'no-cache',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('Knowledge unavailable');const body=await response.json();if(body.id!==id||body.contentVersion!==e.contentVersion||body.question!==e.question||!visible(body)||typeof body.fullAnswer!=='string'||typeof body.caveats!=='string'||body.shortAnswer!==e.shortAnswer||!Array.isArray(body.sources)||body.sources.some(s=>typeof s.title!=='string'||!/^https:\/\//.test(s.url))||!Array.isArray(body.sections?.inline?.contexts))throw Error('Knowledge version mismatch');const clean=project({...catalog,entries:[body]}).entries[0];cache.set(id,clean);if(cache.size>24)cache.delete(cache.keys().next().value);return clean;})();pending.set(id,request);try{return await request;}finally{pending.delete(id);}
  }
  async function explain(id,context='knowledge',mode='compact'){
   if(!['compact','full','reminder'].includes(mode))return null;
   const resolved=byId.has(id)?id:catalog.pilotConcepts.find(c=>c.id===id)?.answerId;
   const e=await load(resolved);if(!e||!e.sections?.inline?.contexts.includes(context)||stale(e)&&e.reviewPolicy?.overdue==='suppress')return null;
   return {id:e.id,question:e.question,excerpt:e.shortAnswer,caveats:e.caveats,url:url(e.id),contentVersion:e.contentVersion,reviewedAt:e.reviewedAt,stale:!!stale(e),...(mode==='full'?{fullAnswer:e.fullAnswer,example:e.example,sources:e.sources,sections:e.sections}:{})};
  }
  return {...catalog,publicEntries,url,search,ask,respond,calculate,load,explain};
 }
 const api={fields,normalize,visible,project,index,create};root.NTMKnowledgeCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
