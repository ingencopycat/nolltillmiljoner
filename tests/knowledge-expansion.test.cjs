const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const raw=require('../docs/internal/knowledge/catalog.cjs'),before=require('../docs/qa/knowledge-expansion/before.json'),Core=require('../knowledge-core.js'),K=Core.create(raw);
test('Expansion preserves the starting 41 objects exactly and adds 59 distinct reviewed objects',()=>{
 assert.equal(before.entries.length,41);for(const e of before.entries)assert.deepEqual(raw.entries.find(n=>n.id===e.id),e,e.id);
 assert.equal(raw.entries.length,100);const added=raw.entries.filter(e=>!before.entries.some(b=>b.id===e.id));assert.equal(added.length,59);
 for(const e of added){assert.equal(e.status,'reviewed');assert.equal(e.editorial.approval,'accepted');assert.ok(e.sources.some(s=>s.evidenceStatus==='checked'));assert.equal(e.contentVersion,1);assert.ok(e.relatedAnswers.length);assert.ok(!e.sections.formula);}
 assert.deepEqual(require('../scripts/knowledge_history.cjs').audit(raw,require('../docs/internal/knowledge/history-baseline.json')),[]);
});
test('Spread definition exception is complete-question only and requires its reviewed canonical object',()=>{
 assert.equal(K.respond('Vad är köp- och säljspread?').answerId,'order-spread');
 for(const q of ['Vad är köp- och säljspread och ska jag köpa?','Ska jag köpa en aktie med låg spread?','köp','sälj','buy ETF','sell ETF','Vad är köp- och säljspread i min portfölj?','Vad är courtage och hur påverkar det små köp och ska jag köpa?'])assert.equal(K.respond(q).kind,'ABSTAIN_UNSUPPORTED_JUDGMENT',q);
 const d=structuredClone(raw);d.entries.find(e=>e.id==='order-spread').status='draft';assert.notEqual(Core.create(d).respond('Vad är köp- och säljspread?').kind,'ANSWER');
});
test('New tax answers suppress when overdue and unsupported formulas remain unavailable',async()=>{
 const d=structuredClone(raw);for(const id of ['isk-inputs','isk-year-scope'])d.entries.find(e=>e.id===id).reviewDue='2000-01-01';const k=Core.create(d);
 for(const id of ['isk-inputs','isk-year-scope']){assert.equal(k.respond(d.entries.find(e=>e.id===id).question).kind,'ABSTAIN_NO_COVERAGE');assert.equal(await k.explain(id,'calculator'),null);}
 for(const id of ['loss-recovery','discounting','earnings-surprise','gross-margin'])assert.equal(K.calculate(id,{price:100,eps:5,currency:'SEK',period:'annual'}).kind,'ABSTAIN_NO_COVERAGE');
});
test('All 100 exact questions survive both full and compact retrieval; bodies remain lazy',()=>{
 const compact=Core.create(Core.index(raw));for(const e of raw.entries){assert.equal(K.respond(e.question).answerId,e.id,e.id);assert.equal(compact.respond(e.question).answerId,e.id,e.id);}
 assert.ok(Core.index(raw).entries.every(e=>!e.fullAnswer&&!e.sources&&!e.caveats&&!e.example));
});
