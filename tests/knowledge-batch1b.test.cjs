const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const raw=require('../docs/internal/knowledge/catalog.cjs'),Core=require('../knowledge-core.js'),K=Core.create(raw),H=require('../scripts/knowledge_history.cjs');
const ids=['reported-adjusted','fcf-limitations','pe-interpretation','pe-losses','ps','pe-versus-ps'];
test('Batch 1B accepted scope, evidence and prior 35 version integrity',()=>{
 const before=require('../docs/qa/knowledge-batch1b/before.json');
 assert.equal(before.entries.length,35);
 for(const old of before.entries){const e=raw.entries.find(e=>e.id===old.id);assert(e);if(e.contentVersion===old.contentVersion)assert.equal(H.fingerprint(e),H.fingerprint(old));}
 assert.deepEqual(H.audit(raw,require('../docs/internal/knowledge/history-baseline.json')),[]);
 assert(raw.knowledgeConcepts.some(c=>c.id==='ps'));
 for(const id of ids){const e=raw.entries.find(e=>e.id===id);assert(Core.visible(e));assert.equal(e.editorial.approval,'accepted');assert.equal(e.editorial.reviewedAt,e.reviewedAt);assert(e.reviewDue>e.reviewedAt);assert(!e.sections.formula);for(const field of ['shortAnswer','fullAnswer','example','caveats'])assert(e.sources.some(s=>s.supports.includes(field)&&s.evidenceStatus==='checked'&&s.checked&&s.limitations));}
});
test('Batch 1B arithmetic and shared denominator assumptions',()=>{
 assert.equal(800+100,900);assert.equal(1000-400,600);
 assert.equal(150/5,30);assert.equal(150/7.5,20);
 for(const [eps,pe] of [[-2,-50],[1,100],[.5,200],[.1,1000]])assert.equal(100/eps,pe);
 assert.equal(20/10,2);
 for(const [profit,pe] of [[200,25],[20,250]]){assert.equal(5000/1000,5);assert.equal(5000/profit,pe);}
 for(const shares of [10,100,250])assert.equal((200*shares)/1000,200/(1000/shares));
 assert.match(K.entries.find(e=>e.id==='reported-adjusted').example,/ingen skatteeffekt/);
 assert.match(K.entries.find(e=>e.id==='ps').example,/exakt samma aktieantal/);
 assert.match(K.entries.find(e=>e.id==='pe-versus-ps').fullAnswer,/aktieantalet är oförändrat/);
 for(const id of ids)assert.equal(K.calculate(id,{}).kind,'ABSTAIN_NO_COVERAGE');
 const negative=K.calculate('pe',{price:100,eps:-2,currency:'SEK',period:'annual'});
 assert.equal(negative.reason,'negative-eps-limitation');assert.equal(negative.calculation.value,null);
 assert.equal(K.calculate('pe',{price:100,eps:0,currency:'SEK',period:'annual'}).kind,'INVALID_INPUT');
});
test('Batch 1B curated intents are separated and personal decisions still abstain',()=>{
 for(const [q,kind,id] of require('./fixtures/knowledge-batch1b-queries.cjs')){const actual=K.respond(q);assert.equal(actual.kind,kind,q);assert.equal(actual.answerId,id,q);}
 for(const q of ['Är P/E 40 dyrt?','Är P/E dyrt?'])assert.equal(K.respond(q).answerId,'pe-interpretation');
 for(const [id,phrase] of [['reported-adjusted','inte automatiskt mer korrekt'],['fcf-limitations','inte automatiskt bra'],['pe-interpretation','avgör inte ensamt'],['pe-losses','inte att aktien är superbillig'],['pe-versus-ps','Inget av måtten är universellt bäst']])assert(K.entries.find(e=>e.id===id).shortAnswer.includes(phrase));
});
test('Batch 1B shared contextual explanations and noindex publication boundary',async()=>{
 for(const id of ids){for(const context of ['research','calculator','public-report'])assert.equal((await K.explain(id,context,'full')).id,id);const e=raw.entries.find(e=>e.id===id);if(e.status==='reviewed'){assert(!e.publishedAt);assert(!fs.readFileSync('sitemap.xml','utf8').includes('fragor-svar-'+id+'.html'));}}
 assert(fs.readFileSync('wave1-ui.js','utf8').includes("'pe-interpretation'"));
 assert(fs.readFileSync('public-report-ui.js','utf8').includes("'reported-adjusted'"));
});
