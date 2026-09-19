'use strict';
const Core=require('../knowledge-core.js');
const intents=['definition','calculation','comparison','interpretation','limitation','misconception','process','application'];
const contexts=['knowledge','research','calculator','macro','public-report','academy-reminder'];
const relationTypes=['prerequisite','common-confusion','related-metric','deeper','next-question'];
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const safeURL=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&!/[\s<>]/.test(s);}catch{return false;}};
function validate(data,registry){
 const errors=[],fail=(message,id)=>errors.push(message+' '+(id||'')),ids=new Map(data.entries.map(e=>[e.id,e])),concepts=new Set(),questions=new Map(),aliases=new Map();
 const keys=(v,allowed,label)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!allowed.includes(k)))fail('Invalid '+label);};
 for(const c of data.knowledgeConcepts||[]){
  keys(c,['id','term','category','synonyms','abbreviations','related','metric'],'concept fields');
  if(!/^[a-z0-9-]+$/.test(c.id)||concepts.has(c.id)||!c.term||c.term.length>100||!data.categories.some(k=>k.id===c.category)||!['synonyms','abbreviations','related'].every(k=>Array.isArray(c[k])))fail('Invalid concept',c.id);
  concepts.add(c.id);
 }
 for(const c of data.knowledgeConcepts||[])if(c.related.some(id=>!concepts.has(id)||id===c.id))fail('Invalid concept relation',c.id);
 for(const e of data.entries){
  if(!intents.includes(e.intent)||!Array.isArray(e.conceptRefs)||!e.conceptRefs.length||e.conceptRefs.some(id=>!concepts.has(id)))fail('Invalid concept/intent',e.id);
  if(JSON.stringify(e).length>24000||e.question?.length>240||e.aliases?.length>32||e.aliases?.some(a=>a.length>240||/[<>\u0000-\u001f]/.test(a)))fail('Oversized or unsafe retrieval content',e.id);
  const q=Core.normalize(e.question).replace(/^(vad (ar|betyder|innebar)|betyder)\s+/,'');if(questions.has(q))fail('Duplicate normalized question',e.id);questions.set(q,e.id);
  for(const a of e.aliases||[]){const n=Core.normalize(a),previous=aliases.get(n);if(previous&&previous!==e.id&&!data.retrieval.clarifications?.some(c=>Core.normalize(c.query)===n&&c.answerIds.includes(previous)&&c.answerIds.includes(e.id)))fail('Unresolved alias collision',n);aliases.set(n,e.id);}
  keys(e.reviewPolicy,['risk','overdue'],'review policy');
  if(!['stable','methodology','rule'].includes(e.reviewPolicy?.risk)||!['label','suppress','needs-update'].includes(e.reviewPolicy?.overdue)||e.reviewDue&&!date(e.reviewDue))fail('Invalid review policy',e.id);
  if(e.reviewPolicy?.risk==='rule'&&(!e.ruleId||!registry.rules.some(r=>r.id===e.ruleId)))fail('Missing current rule registry',e.id);
  if(e.jurisdiction!==undefined&&!['SE','US','EU','global','issuer-specific'].includes(e.jurisdiction)||e.period!==undefined&&!/^(?:20\d{2}(?:-\d{2}-\d{2})?|FY20\d{2}|TTM|annual|timeless)$/.test(e.period))fail('Invalid jurisdiction/period',e.id);
  if(/^\d{4}-\d{2}-\d{2}$/.test(e.period||'')&&!date(e.period))fail('Invalid period date',e.id);
  if(e.ruleId&&e.period!==undefined&&e.period!==String(registry.rules.find(r=>r.id===e.ruleId)?.effectiveYear))fail('Rule period differs from verified registry',e.id);
  if(e.reviewPolicy?.overdue==='needs-update'&&e.reviewDue<new Date().toISOString().slice(0,10)&&Core.visible(e))fail('Needs update before publication',e.id);
  if(!e.editorial?.owner||!['inherited-not-independent','pending','accepted'].includes(e.editorial.approval))fail('Missing editorial responsibility',e.id);
  if(e.editorial?.approval==='inherited-not-independent'&&!require('../docs/internal/knowledge/scale.cjs').baselineIds.includes(e.id)&&data.synthetic!==true)fail('New answer cannot inherit seed approval',e.id);
  keys(e.sections,['inline','formula','comparison','interpretation'],'typed sections');
  const s=e.sections||{};
  if(s.inline){keys(s.inline,['field','contexts'],'inline');if(s.inline.field!=='shortAnswer'||!Array.isArray(s.inline.contexts)||s.inline.contexts.some(c=>!contexts.includes(c)))fail('Invalid inline contract',e.id);}
  if(s.formula){keys(s.formula,['template','explanationField','limitationField','example'],'formula');if(s.formula.template!=='pe/1'||s.formula.explanationField!=='shortAnswer'||s.formula.limitationField!=='caveats')fail('Unapproved formula',e.id);const x=s.formula.example;if(!x||x.inputs?.price!==150||x.inputs?.eps!==6||x.inputs?.currency!=='SEK'||x.inputs?.period!=='annual'||x.result!==25)fail('Formula example requires revalidation',e.id);}
  if(s.comparison){keys(s.comparison,['leftLabel','rightLabel','axes','limitations'],'comparison');if(e.intent!=='comparison'||!Array.isArray(s.comparison.axes)||!s.comparison.axes.length||s.comparison.axes.length>8||typeof s.comparison.limitations!=='string')fail('Invalid comparison',e.id);else for(const a of s.comparison.axes){keys(a,['label','left','right'],'comparison axis');if(!['label','left','right'].every(k=>typeof a[k]==='string'&&a[k].length>0&&a[k].length<=1000))fail('Invalid comparison axis',e.id);}}
  if(s.interpretation){keys(s.interpretation,['field','unsuitableField'],'interpretation');if(s.interpretation.field!=='fullAnswer'||s.interpretation.unsuitableField!=='caveats')fail('Invalid interpretation fields',e.id);}
  if(s.comparison&&!['leftLabel','rightLabel'].every(k=>typeof s.comparison[k]==='string'&&s.comparison[k].length>0&&s.comparison[k].length<=80))fail('Missing comparison column labels',e.id);
  for(const r of e.relatedAnswers||[])if(!ids.has(r.id)||r.id===e.id||!relationTypes.includes(r.type)||Object.keys(r).some(k=>!['id','type'].includes(k)))fail('Invalid answer relation',e.id);
  for(const source of e.sources||[])if(!safeURL(source.url)||!['primary','secondary','unclassified'].includes(source.authority)||!['definition','methodology','rule','reference'].includes(source.type)||!Array.isArray(source.supports)||source.supports.some(k=>!['shortAnswer','fullAnswer','caveats','example','formula','comparison'].includes(k)))fail('Invalid claim/source metadata',e.id);
  if(e.editorial?.approval!=='inherited-not-independent'&&Core.visible(e)){
   if(e.editorial?.approval!=='accepted'||!e.editorial.reviewer||!date(e.editorial.reviewedAt)||e.editorial.reviewedAt!==e.reviewedAt)fail('Unapproved substantive answer',e.id);
   for(const claim of ['shortAnswer','fullAnswer','caveats'])if(!e.sources?.some(s=>s.supports.includes(claim)&&s.evidenceStatus==='checked'&&s.checked&&s.limitations!==undefined&&s.authority!=='unclassified'))fail('Unverified claim '+claim,e.id);
   if(e.reviewPolicy?.risk!=='stable'&&(!date(e.reviewDue)||!e.jurisdiction||!e.period))fail('Missing sensitive scope/review date',e.id);
  }
  if(e.contentVersion>1&&(!Array.isArray(e.history)||!e.history.some(h=>h.from===e.contentVersion-1&&h.to===e.contentVersion&&h.reason&&h.reviewer&&date(h.date))))fail('Missing substantive correction history',e.id);
 }
 const r=data.retrieval;keys(r,['version','typos','aliases','clarifications','protectedAcronyms'],'retrieval');
 for(const a of [...(r?.aliases||[]),...(r?.typos||[])]){const key=Core.normalize(a.query).replace(/^(vad (ar|betyder|innebar)|betyder)\s+/,''),previous=aliases.get(key)||questions.get(key);if(previous&&previous!==a.answerId&&!r.clarifications?.some(c=>Core.normalize(c.query)===key&&c.answerIds.includes(previous)&&c.answerIds.includes(a.answerId)))fail('Unresolved configured alias collision',key);aliases.set(key,a.answerId);}
 if(!Number.isInteger(r?.version)||r.version<1)fail('Invalid retrieval version');
 for(const kind of ['aliases','typos','clarifications'])for(const row of r?.[kind]||[]){keys(row,kind==='clarifications'?['query','answerIds']:['query','answerId'],'retrieval row');if(!row.query||row.query.length>240||/[<>]/.test(row.query)||(row.answerIds||[row.answerId]).some(id=>!ids.has(id)))fail('Invalid retrieval target');}
 const redirects=new Map();for(const m of data.merges||[]){keys(m,['fromId','fromSlug','toId','reason','reviewer','date'],'merge');if(ids.has(m.fromId)||data.entries.some(e=>e.slug===m.fromSlug)||!ids.has(m.toId)||!Core.visible(ids.get(m.toId))||!m.reason||!m.reviewer||!date(m.date)||! /^[a-z0-9-]+$/.test(m.fromSlug)||redirects.has(m.fromSlug))fail('Invalid merge/redirect',m.fromId);redirects.set(m.fromSlug,m.toId);}
 return errors;
}
module.exports={validate:(...args)=>{try{return validate(...args);}catch(e){return ['Malformed Knowledge scale structure: '+e.message];}},intents,contexts,relationTypes,safeURL};
