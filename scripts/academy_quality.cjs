// Publication checks complement, and do not replace, editorial review.
function validate(A,bank){
  const errors=[],ids=new Set(),slugs=new Set(),categoryIds=new Set(A.categories.map(c=>c.id));
  for(const l of A.lessons){
    if(ids.has(l.id)||slugs.has(l.slug))errors.push('Duplicate lesson '+l.id);
    ids.add(l.id);slugs.add(l.slug);
    if(l.status!=='published')continue;
    if(!categoryIds.has(l.category)||!['beginner','intermediate','advanced'].includes(l.difficulty))errors.push('Invalid classification '+l.id);
    if(!l.summary||!l.reviewedAt||!l.method||!['why','example','deep','mistake','exercise'].every(k=>typeof l.sections?.[k]==='string'&&l.sections[k].length>=70))errors.push('Incomplete lesson '+l.id);
    const words=[l.summary,...Object.values(l.sections||{}),...Object.values(l.extension||{})].join(' ').split(/\s+/).length;
    if(words<230)errors.push('Insufficient teaching content '+l.id);
    if(!l.relatedEntityIds?.length||!l.relatedConcepts?.length||l.relatedConcepts.some(id=>!A.url(id)))errors.push('Missing connections '+l.id);
    if(['statements','macro'].includes(l.category)&&!l.references.length)errors.push('Missing authoritative source '+l.id);
    for(const r of l.references)if(!r.title||!/^https:\/\//.test(r.url)||!validDate(r.reviewedAt))errors.push('Invalid source '+l.id);
  }
  const paths=new Set();
  for(const p of A.paths){if(paths.has(p.id)||!p.goal||!p.endpoint||!p.entity||!A.paths.some(n=>n.id===p.nextPath)||new Set(p.lessons).size!==p.lessons.length||p.lessons.some(id=>!A.url(id)))errors.push('Invalid journey '+p.id);paths.add(p.id);}
  errors.push(...validateBank(bank,A));return errors;
}
function validDate(d){return typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;}
function validateBank(bank,A){
  const errors=[],ids=new Set();
  if(bank?.version!==1||!Array.isArray(bank.entries))return ['Unsupported knowledge bank'];
  for(const e of bank.entries){
    if(!e||typeof e!=='object'){errors.push('Invalid knowledge entry');continue;}
    if(typeof e.id!=='string'||!/^[a-z][a-z0-9-]+$/.test(e.id)||ids.has(e.id))errors.push('Invalid knowledge ID');ids.add(e.id);
    if(e.relatedActivityIds!==undefined&&(!Array.isArray(e.relatedActivityIds)||e.relatedActivityIds.some(id=>!require('../academy-activities.js').url(id))))errors.push('Invalid knowledge activity '+e.id);
    const allowed=['id','question','answer','lessonId','category','sources','reviewedAt','reviewedBy','status','provenance','relatedActivityIds'];
    if(Object.keys(e).some(k=>!allowed.includes(k))||!['draft','reviewed','published'].includes(e.status)||!A.url(e.lessonId)||A.lessons.find(l=>l.id===e.lessonId)?.category!==e.category)errors.push('Invalid knowledge metadata '+e.id);
    if(typeof e.question!=='string'||!e.question.trim()||typeof e.answer!=='string'||!Array.isArray(e.sources))errors.push('Invalid knowledge content '+e.id);
    if(e.status!=='draft'&&(!validDate(e.reviewedAt)||typeof e.reviewedBy!=='string'||!e.reviewedBy.trim()||typeof e.answer!=='string'||e.answer.trim().length<80||e.provenance!=='real-user-question-reviewed'||!e.sources?.length))errors.push('Unreviewed knowledge entry '+e.id);
    for(const s of Array.isArray(e.sources)?e.sources:[])if(!s?.title||!/^https:\/\//.test(s.url))errors.push('Invalid knowledge source '+e.id);
  }
  return errors;
}
module.exports={validate,validateBank};
