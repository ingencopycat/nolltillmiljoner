const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../academy-catalog.js'),C=require('../academy-activities.js'),P=require('../academy-progress.js'),G=require('../academy-progression.js');
let sequence=0;
const event=(d,id,status='complete')=>d.events.push({id:'e-'+(++sequence),lessonId:id,status,at:new Date(1700000000000+sequence).toISOString()});
const attempt=(d,o,q,correct=true)=>d.attempts.push({id:'a-'+(++sequence),objectId:o,questionId:q,correct,at:new Date(1700000000000+sequence).toISOString()});
function finish(d,id){const o=C.objects.find(o=>o.id===id);o.questions.forEach(q=>attempt(d,id,q.id));}
test('V3 content counts, stable IDs, references and open tier metadata',()=>{
 assert.deepEqual(require('../scripts/academy_v3_quality.cjs').validate(),[]);
 assert.equal(C.questions.length,20);assert.equal(C.roadmap.length,10);assert.equal(C.achievements.length,10);
 for(const [type,count] of [['scenario',8],['challenge',4],['case',2],['exercise',15]])assert.equal(C.published().filter(o=>o.type===type).length,count);
 assert.equal(new Set(C.objects.map(o=>o.id)).size,C.objects.length);
 for(const o of C.objects){assert.ok(['free','pro'].includes(o.accessTier));assert.ok(o.questions.length);assert.ok(o.relatedConcepts.every(id=>A.url(id)));assert.ok(o.relatedEntityIds.length);assert.equal(o.completion,'all-questions');}
 const o=C.objects[0],old=o.accessTier;try{o.accessTier='pro';assert.ok(C.url(o.id));assert.ok(C.published().includes(o));}finally{o.accessTier=old;}
});

test('publication rejects broken learning references and missing grading definitions',()=>{
 const Q=require('../scripts/academy_v3_quality.cjs'),o=C.objects[0],prior=o.prerequisites,q=o.questions[0],answer=q.answer;
 try{o.prerequisites=['missing'];q.answer=999;assert.ok(Q.validate().some(e=>e.includes('metadata')));assert.ok(Q.validate().some(e=>e.includes('options')));}finally{o.prerequisites=prior;q.answer=answer;}
 const bank=require('../scripts/academy_quality.cjs');assert.ok(bank.validateBank({version:1,entries:[{id:'fixture',question:'Fixture',answer:'',lessonId:'eps',category:'statements',sources:[],status:'draft',relatedActivityIds:['missing']}]},A).some(e=>e.includes('activity')));
});

test('activity pages remain crawlable but are deliberately excluded from search indexing',()=>{
 const fs=require('node:fs'),sitemap=fs.readFileSync('sitemap.xml','utf8');
 for(const o of C.published()){const html=fs.readFileSync(C.url(o.id),'utf8');assert.ok(html.includes('name="robots" content="noindex, follow"'));assert.ok(!sitemap.includes(C.url(o.id)));assert.ok(html.includes('data-academy-activity="'+o.id+'"'));assert.ok(html.includes('data-academy-tool'));}
});
test('empty and page-open ongoing history never earn XP',()=>{
 const d=P.empty();assert.equal(G.derive(d).xp,0);A.published().forEach(l=>event(d,l.id,'ongoing'));assert.equal(G.derive(d).xp,0);assert.equal(G.derive(d).counts.lesson,0);
});
test('lesson rewards and achievements survive repetition without duplication',()=>{
 const d=P.empty();event(d,'aktier');assert.equal(G.derive(d).xp,5);event(d,'aktier','ongoing');assert.equal(G.derive(d).xp,5);assert.equal(G.derive(d).skills.find(s=>s.id==='start').lessons.done,0);event(d,'aktier');assert.equal(G.derive(d).xp,5);assert.equal(G.derive(d).achievements.length,1);
});
test('incorrect attempts give no XP; successful retries and reloads award once',()=>{
 const d=P.empty(),o=C.objects.find(o=>o.id==='recovery');attempt(d,o.id,o.questions[0].id,false);assert.equal(G.derive(d).xp,0);finish(d,o.id);const s=G.derive(d);assert.ok(s.complete.has(o.id));assert.equal(s.xp,18);finish(d,o.id);attempt(d,o.id,o.questions[0].id,false);assert.equal(G.derive(JSON.parse(JSON.stringify(d))).xp,18);assert.equal(G.derive(d).achievements.filter(a=>a.id==='first-scenario').length,1);
});
test('projects require every objective check and self-review before completion XP',()=>{
 const d=P.empty(),o=C.objects.find(o=>o.id==='analyse-company');for(const q of o.questions.filter(q=>q.kind!=='reflection'))attempt(d,o.id,q.id);
 assert.equal(G.derive(d).complete.has(o.id),false);assert.equal(G.derive(d).xp,9);attempt(d,o.id,'review',false);assert.equal(G.derive(d).xp,9);attempt(d,o.id,'review');assert.equal(G.derive(d).xp,49);assert.ok(G.derive(d).complete.has(o.id));
});
test('shared questions cannot be farmed across activities',()=>{
 const d=P.empty();finish(d,'analyse-company');const before=G.derive(d).xp;finish(d,'exercise-gross-margin');assert.equal(G.derive(d).xp-before,5);
});
test('grade numeric, choice, true/false, multi-select and self-review explicitly',()=>{
 const q=id=>C.questions.find(q=>q.id===id);
 assert.equal(C.grade(q('fx-sek'),'1,2'),true);assert.equal(C.grade(q('fx-sek'),''),false);assert.equal(C.grade(q('fx-sek'),'Infinity'),false);assert.equal(C.grade(q('fx-sek'),1.3),false);
 assert.equal(C.grade(q('cash-growth'),['0','1']),true);assert.equal(C.grade(q('cash-growth'),['0','2']),false);
 assert.equal(C.grade(q('price-demand'),null),false);assert.equal(C.grade(q('risk-return'),'1'),true);
 const r=C.objects.find(o=>o.id==='analyse-company').questions.at(-1);assert.equal(C.grade(r,{text:'word '.repeat(30),reviewed:true}),true);assert.equal(C.grade(r,{text:'word '.repeat(29),reviewed:true}),false);assert.equal(C.grade(r,{text:'word '.repeat(30),reviewed:false}),false);
});
test('roadmap, skills, levels and all milestones are attainable',()=>{
 const d=P.empty();A.published().forEach(l=>event(d,l.id));C.published().forEach(o=>finish(d,o.id));const s=G.derive(d);assert.equal(s.level.id,5);assert.equal(s.nextLevel,null);assert.equal(s.levelPercent,100);assert.ok(s.roadmap.every(s=>s.state==='complete'));assert.ok(s.skills.every(s=>s.percent===100));assert.equal(s.achievements.length,10);assert.equal(s.counts.path,A.paths.length);assert.equal(s.recommendation,undefined);
});
test('recommendations explain prerequisites and resume incomplete activities',()=>{
 const d=P.empty();assert.equal(G.derive(d).recommendation.id,'aktier');event(d,'pe');assert.equal(G.derive(d).recommendation.id,'eps');event(d,'eps');event(d,'cagr');assert.equal(G.derive(d).recommendation.id,'reverse');
 const fresh=P.empty();attempt(fresh,'read-report','report-period',false);assert.equal(G.derive(fresh).recommendation.id,'read-report');attempt(fresh,'path-beginner','visit',false);assert.equal(G.derive(fresh).currentPath.id,'beginner');assert.equal(G.derive(fresh).xp,0);
});
test('legacy V2 migrates losslessly; malformed or forged reward fields are rejected',()=>{
 const old={version:1,events:[]};event(old,'eps');const d=P.validate(old);assert.equal(d.version,2);assert.deepEqual(d.attempts,[]);assert.deepEqual(d.events,old.events);assert.equal(G.derive(d).xp,5);assert.throws(()=>P.validate({...d,xp:99999}));attempt(d,'recovery','drawdown');d.attempts[0].correct='true';assert.throws(()=>P.validate(d));
});
