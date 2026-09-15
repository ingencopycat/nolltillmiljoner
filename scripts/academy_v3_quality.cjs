const A=require('../academy-catalog.js'),C=require('../academy-activities.js');
function validate(){
 const errors=[],all=C.learningObjects(),ids=new Set(all.map(o=>o.id));
 if(ids.size!==all.length)errors.push('Duplicate learning object ID');
 for(const o of all){
  if(!/^[a-z][a-z0-9-]+$/.test(o.id)||!['lesson','exercise','scenario','challenge','case'].includes(o.type)||!['free','pro'].includes(o.accessTier)||!['beginner','intermediate','advanced'].includes(o.difficulty)||!A.categories.some(c=>c.id===o.skill)||o.prerequisites.some(id=>!ids.has(id)))errors.push('Invalid learning metadata '+o.id);
  if(o.type==='lesson')continue;
  if(!o.context||!o.relatedEntityIds.length||!o.relatedConcepts.every(id=>A.url(id))||!o.questions.length||o.completion!=='all-questions')errors.push('Incomplete activity '+o.id);
  if(new Set(o.questions.map(q=>q?.id)).size!==o.questions.length)errors.push('Duplicate question '+o.id);
  for(const q of o.questions){
   if(!q||!q.id||!q.prompt||!q.explanation||!['choice','numeric','multiple','reflection'].includes(q.kind)){errors.push('Invalid question '+o.id);continue;}
   if(q.kind==='numeric'&&(!Number.isFinite(q.answer)||!Number.isFinite(q.tolerance)||q.tolerance<0))errors.push('Invalid numeric answer '+q.id);
   if(['choice','multiple'].includes(q.kind)&&(!Array.isArray(q.options)||q.options.length<2||!(q.kind==='choice'?[q.answer]:q.answer).every(i=>Number.isInteger(i)&&i>=0&&i<q.options.length)))errors.push('Invalid options '+q.id);
   if(q.kind==='reflection'&&(!q.rubric?.length||q.rubric.some(r=>typeof r!=='string'||r.length<20)))errors.push('Missing self-review criteria '+q.id);
  }
 }
 for(const s of C.roadmap)if(s.lessons.some(id=>!A.url(id))||!C.url(s.milestone))errors.push('Invalid roadmap '+s.id);
 for(const a of C.achievements)if(a.kind==='object'&&!C.url(a.target))errors.push('Invalid achievement '+a.id);
 if(C.levels.some((l,i)=>i&&l.xp<=C.levels[i-1].xp))errors.push('Unordered levels');
 return errors;
}
module.exports={validate};
