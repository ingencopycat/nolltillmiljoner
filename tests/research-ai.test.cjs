const test=require('node:test'), assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const fixtures=require('./fixtures/research-ai-evals-v1.json');
function app(){const c={window:{},TextEncoder,URL,Date};vm.createContext(c);for(const f of ['research-snapshot.js','change-detection.js','research-ai.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);return c.window;}
const clone=x=>JSON.parse(JSON.stringify(x));
function setup(){const w=app(),data=JSON.parse(fs.readFileSync('tests/fixtures/research-ai-baseline-v1.json'));for(const m of Object.values(data.ttm.metrics))m.shareBasis='verified-test';const snapshot={...w.NTMResearchSnapshot.fromStockData(data),ticker:data.symbol};return {w,data,revision:{id:'test',text:'Revenue supports thesis',assumptions:['Revenue remains strong'],assumptionDetails:[{falsification:'Revenue declines',note:'PRIVATE'}],reportQuestions:[{text:'Will revenue grow?',answer:'PRIVATE'}],notes:'PRIVATE',valuationSnapshot:snapshot}};}
for(const fixture of fixtures){test('frozen evaluation: '+fixture.id,async()=>{
 const {w,data,revision}=setup(); const ai=w.NTMResearchAI;
 if(fixture.mutation==='growth')data.ttm.metrics.revenue.value*=1.2;
 if(fixture.mutation==='decline')data.ttm.metrics.revenue.value*=.8;
 if(fixture.mutation==='negative') {revision.valuationSnapshot.ttmMetrics.eps=-2;data.ttm.metrics.dilutedEps.value=-1;}
 if(fixture.mutation==='missing')data.ttm.metrics.freeCashFlow.value=null;
 if(fixture.mutation==='split')data.ttm.metrics.dilutedEps.shareBasis='split';
 if(fixture.mutation==='currency')data.valuationBase.currency='SEK';
 if(fixture.mutation==='restated')data.ttm.metrics.revenue.restated=true;
 if(fixture.mutation==='source')data.ttm.metrics.revenue.source=null;
 if(fixture.mutation==='unsupported')data.symbol='OTHER';
 if(fixture.mutation==='manual')revision.valuationSnapshot=null;
 if(fixture.mutation==='vague')revision.assumptions=['AI efterfrågan kommer fortsätta vara stark.'];
 data.document=fixture.hostile || 'UNRELATED';data.analyticsId='PRIVATE';
 const r=ai.buildRequest(fixture.task || 'changes',revision,data),before=JSON.stringify(revision);
 if(fixture.hostile) {r.untrusted_documents=[{text:fixture.hostile,trust:'untrusted'}];r.thesis.summary=fixture.hostile;}
 const o=await ai.createProvider({mode:'mock',environment:'test'}).generate(r);
 assert.equal(ai.validateOutput(r,o),true);assert.equal(JSON.stringify(revision),before);
 assert.equal(JSON.stringify(r).includes('PRIVATE'),false);assert.equal(JSON.stringify(r).includes('UNRELATED'),false);
 if(fixture.metric)assert.equal(r.evidence.some(e=>e.metric_id===fixture.metric),fixture.available);
 if(fixture.id==='no-meaningful-change')assert.ok(r.evidence.every(e=>e.change===null));
 if(fixture.mutation==='negative') {const e=r.evidence.find(e=>e.metric_id==='eps');assert.equal(e.previous,-2);assert.equal(e.current,-1);assert.equal(e.change.absolute,1);assert.equal(e.change.pct,50);}
 if(['growth','decline'].includes(fixture.mutation))assert.equal(Math.sign(r.evidence.find(e=>e.metric_id==='revenue').change.pct),fixture.mutation==='growth'?1:-1);
 if(fixture.expect==='abstained')assert.equal(o.status,'abstained');
 if(fixture.expect==='questions') {assert.ok(o.questions_to_review.length);assert.ok(o.suggestions.length);}
 if(fixture.hostile)assert.equal(JSON.stringify(o).includes(fixture.hostile),false);
 if(fixture.reject){const bad=clone(o);if(fixture.reject==='citation' && bad.evidence_items.length)delete bad.evidence_items[0].source_id;
 else if(fixture.reject==='confidence' && bad.evidence_items.length)bad.evidence_items[0].confidence='certain';
 else if(fixture.reject==='mapping')bad.affected_assumptions=[{assumption_id:'invented',evidence_ids:['invented']}];
 else bad.summary=fixture.reject;assert.equal(ai.validateOutput(r,bad),false);}
});}
test('report minimization, unresolved questions and exact deterministic deltas',()=>{const {w,data,revision}=setup();data.ttm.metrics.revenue.value*=1.2;const r=w.NTMResearchAI.buildRequest('report',revision,data);assert.deepEqual(Array.from(r.evidence,e=>e.metric_id),['revenue']);const diff=w.NTMChangeDetection.detect(revision.valuationSnapshot,data);assert.equal(r.evidence[0].change.pct,diff.metrics.find(m=>m.name==='TTM Revenue').pct);assert.equal(w.NTMResearchAI.mockOutput(r).unresolved_questions[0].status,'unresolved');assert.ok(r.evidence[0].provenance.after[0].source);});
test('disabled and unknown live providers make zero network calls; mock deterministic and bounded',async()=>{const {w,data,revision}=setup(),ai=w.NTMResearchAI,r=ai.buildRequest('challenge',revision,data);for(const config of [{},{mode:'live'},{mode:'mock',environment:'production'}])assert.equal((await ai.createProvider(config).generate(r)).status,'unavailable');const p=ai.createProvider({mode:'mock',environment:'test'});assert.deepEqual(await p.generate(r),await p.generate(r));for(let i=0;i<8;i++)await p.generate(r);assert.equal((await p.generate(r)).status,'unavailable');assert.throws(()=>ai.buildRequest('chat',revision,data));assert.doesNotMatch(fs.readFileSync('research-ai.js','utf8'),/fetch\(|XMLHttpRequest|sendBeacon|localStorage/);});
test('deterministic conflicts never call a provider and unknown conflicts abstain',()=>{const ai=app().NTMResearchAI;for(const key of ['currency','periodType','periodStart','periodEnd','definition','shareBasis','source'])assert.equal(ai.explainConflict({[key]:'a'},{[key]:'b'}).reason,key);assert.equal(ai.explainConflict({restated:true},{}).status,'blocked');assert.equal(ai.explainConflict({value:1},{value:2}).status,'abstained');});
