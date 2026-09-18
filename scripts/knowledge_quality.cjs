const A=require('../academy-catalog.js'),Core=require('../knowledge-core.js');
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
function validate(data,registry){
 const errors=[],ids=new Set(),slugs=new Set();
 if(data?.version!==1||!Array.isArray(data.entries)||!Array.isArray(data.categories))return ['Invalid knowledge envelope'];
 const pilotIds=new Set();
 for(const c of data.pilotConcepts||[]){
  if(!c||!c.id||pilotIds.has(c.id)||!c.title||c.excerpt!=='shortAnswer'||!data.entries.some(e=>e.id===c.answerId))errors.push('Invalid pilot concept');
  pilotIds.add(c?.id);
 }
 const Activities=require('../academy-activities.js');
 const categories=new Set();for(const c of data.categories){if(!c?.id||!c.title||categories.has(c.id))errors.push('Invalid knowledge category');categories.add(c.id);}
 for(const e of data.entries){
  if(!e||typeof e!=='object'){errors.push('Invalid knowledge entry');continue;}
  for(const [key,set] of [['id',ids],['slug',slugs]]){if(typeof e[key]!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e[key])||set.has(e[key]))errors.push('Invalid/duplicate knowledge '+key);set.add(e[key]);}
  if(Object.keys(e).some(k=>![...Core.fields,'internalEditorialNotes','internalReview'].includes(k))||!['draft','reviewed','published','needs-update'].includes(e.status)||!categories.has(e.category)||!['beginner','intermediate','advanced'].includes(e.difficulty))errors.push('Invalid editorial metadata '+e.id);
  if(e.contentVersion!==undefined && (!Number.isInteger(e.contentVersion)||e.contentVersion<1||!date(e.reviewDue)||e.reviewDue<=e.reviewedAt||!Activities.published().some(a=>a.id===e.practiceId)))errors.push('Invalid Wave 1 metadata '+e.id);
  if(e.contentVersion!==undefined && (!e.internalReview?.owner||e.internalReview.excerpt!=='shortAnswer'||!['pending','accepted'].includes(e.internalReview.acceptance)||!Array.isArray(e.internalReview.sourceClaims)||e.internalReview.sourceClaims.length!==3||e.internalReview.sourceClaims.some(c=>!['shortAnswer','fullAnswer','caveats'].includes(c.section)||!Array.isArray(c.sources)||!c.sources.length||c.sources.some(url=>!e.sources?.some(s=>s.url===url)))))errors.push('Incomplete pilot source/reviewer mapping '+e.id);
  if(!Core.visible(e))continue;
  if(!date(e.reviewedAt)||e.reviewedAt>new Date().toISOString().slice(0,10)||e.status==='published'&&(!date(e.publishedAt)||e.publishedAt>e.reviewedAt))errors.push('Invalid review/publication date '+e.id);
  if((typeof e.question!=='string'||e.question.length<8)||!['shortAnswer','fullAnswer','caveats'].every(k=>typeof e[k]==='string'&&e[k].trim().length>=25))errors.push('Incomplete answer '+e.id);
  if(e.example!==undefined&&typeof e.example!=='string')errors.push('Invalid example '+e.id);
  const words=[e.shortAnswer,e.fullAnswer,e.example,e.caveats].join(' ').trim().split(/\s+/).length;
  if(words<90)errors.push('Thin answer '+e.id);
  for(const key of ['aliases','concepts','relatedEntityIds','relatedLessonIds'])if(!Array.isArray(e[key])||!e[key].length||e[key].some(v=>typeof v!=='string'||!v.trim())||new Set(e[key]).size!==e[key].length)errors.push('Invalid '+key+' '+e.id);
  if(!Array.isArray(e.relatedLessonIds)||e.relatedLessonIds.some(id=>!A.url(id)))errors.push('Missing Academy lesson '+e.id);
  if(!Array.isArray(e.sources)||!e.sources.length||e.sources.some(s=>!s?.title||typeof s.url!=='string'||!/^https:\/\/[^\s<>]+$/.test(s.url)||!date(s.reviewedAt)||s.reviewedAt>e.reviewedAt))errors.push('Invalid source metadata '+e.id);
  if(e.ruleId){const r=registry?.rules?.find(r=>r.id===e.ruleId);if(!r||r.status!=='verified'||!date(r.lastVerified)||!date(r.nextReview)||r.nextReview<=new Date().toISOString().slice(0,10))errors.push('Unavailable or stale rule '+e.id);}
 }
 return errors;
}
module.exports={validate};
