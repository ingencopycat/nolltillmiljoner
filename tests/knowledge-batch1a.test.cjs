const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const raw=require('../docs/internal/knowledge/catalog.cjs'),Core=require('../knowledge-core.js'),K=Core.create(raw),ids=['balance-sheet','income-statement','cash-flow-statement','profit-versus-cash','capex','working-capital'];
test('Batch 1A keeps its six accepted objects without preventing future reviewed additions',()=>{
 assert.equal(K.publicEntries().filter(e=>ids.includes(e.id)).length,6);
 for(const id of ['balance-sheet','income-statement','cash-flow-statement','capex','working-capital'])assert(raw.knowledgeConcepts.some(c=>c.id===id));
 const baseline=require('../docs/qa/knowledge-batch0/audit.json');
 for(const e of baseline.objects){const current=raw.entries.find(a=>a.id===e.id);assert(current);if(current.contentVersion===e.contentVersion)assert.equal(require('../scripts/knowledge_history.cjs').fingerprint(current),e.fingerprint);}
 assert.deepEqual(require('../scripts/knowledge_history.cjs').audit(raw,require('../docs/internal/knowledge/history-baseline.json')),[]);
 for(const id of ids){const e=raw.entries.find(e=>e.id===id);assert(Core.visible(e));assert.equal(e.editorial.approval,'accepted');assert.equal(e.reviewedAt,e.editorial.reviewedAt);assert(e.contentVersion>=1);assert(e.reviewDue>e.reviewedAt);if(e.status==='reviewed')assert(!e.publishedAt);assert(!e.sections.formula);for(const section of ['shortAnswer','fullAnswer','example','caveats'])assert(e.sources.some(s=>s.supports.includes(section)&&s.evidenceStatus==='checked'&&s.authority==='primary'&&s.checked&&s.limitations));}
});
test('Batch 1A arithmetic is independently checked with the approved scope',()=>{
 // Equality/reconciliation tests, separate from the prose and from all runtime formulas.
 assert.equal(1000-600,400);assert.equal(1000-800,200);
 assert.equal([300,-180,-50].reduce((a,b)=>a+b,0),70);
 const opening={receivables:40,inventory:50,payables:20},closing={receivables:70,inventory:70,payables:35};
 const cash=100-(closing.receivables-opening.receivables)-(closing.inventory-opening.inventory)+(closing.payables-opening.payables);
 assert.equal(cash,65);
 assert.match(K.entries.find(e=>e.id==='income-statement').example,/inklusive alla kostnader och skatt/);
 assert.match(K.entries.find(e=>e.id==='working-capital').example,/Utan andra justeringar/);
 assert.match(K.entries.find(e=>e.id==='cash-flow-statement').example,/valutakurseffekter/);
 for(const id of ids)assert.equal(K.calculate(id,{}).kind,'ABSTAIN_NO_COVERAGE');
});
test('Batch 1A aliases preserve neutral limitations and abstain for adjacent unreviewed judgments',()=>{
 for(const [q,kind,id] of require('./fixtures/knowledge-batch1a-queries.cjs')){const actual=K.respond(q);assert.equal(actual.kind,kind,q);assert.equal(actual.answerId,id,q);}
 assert.match(K.entries.find(e=>e.id==='capex').shortAnswer,/inte automatiskt dåligt/);
 const wc=K.entries.find(e=>e.id==='working-capital');assert.match(wc.shortAnswer,/inte automatiskt dåligt/);assert.match(wc.shortAnswer,/inte automatiskt bra/);
});
test('Batch 1A explanations use shared contexts and do not leak editorial approval text',async()=>{
 for(const id of ids){for(const context of ['research','public-report','academy-reminder']){const e=await K.explain(id,context,'full');assert.equal(e.id,id);assert(e.sources.length);}assert.equal(await K.explain(id,'macro','full'),null);}
 assert(!JSON.stringify(Core.index(raw)).includes('source mapping and arithmetic'));
 const academy=require('../academy-competencies.js');assert(academy.competencies.find(c=>c.id==='per-share').knowledge.includes('income-statement'));
 assert(fs.readFileSync('public-report-ui.js','utf8').includes("'profit-versus-cash'"));
});
