const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
function app() {
  const saved = new Map(); let id = 0;
  const context = vm.createContext({console,URLSearchParams,setTimeout(){},
    document:{getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},readyState:'loading'},
    localStorage:{getItem:k => saved.has(k) ? saved.get(k) : null,setItem:(k,v) => saved.set(k,v),removeItem:k => saved.delete(k)},
    location:{pathname:'/',search:''},crypto:{randomUUID:() => 'id-'+(++id)}});
  context.window=context;
  for (const file of ['valuation-core.js','script.js','research-snapshot.js','thesis-storage.js','research-outcomes.js','research-export.js','change-detection.js','local-data.js','min-review.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context);
  function seed(ticker='NVDA') {
    const data=JSON.parse(fs.readFileSync(`data/stocks/${ticker}.json`,'utf8'));
    const snapshot={...context.NTMResearchSnapshot.fromStockData(data),schemaVersion:2,ticker,
      valuationInputs:{stockPrice:120,priceSource:'example',epsBasis:3,epsSource:'sec',years:5},scenarios:{}};
    assert.equal(context.NTMThesisStorage.save(ticker,{text:'First',valuationSnapshot:snapshot}).success,true);
    assert.equal(context.NTMThesisStorage.save(ticker,{text:'Second',valuationSnapshot:snapshot}).success,true);
    const revision=context.NTMThesisStorage.get(ticker).thesis.revisions[0];
    assert.equal(context.NTMResearchOutcomes.save(context.NTMResearchOutcomes.observe(ticker,revision,data,150)).success,true);
    return revision;
  }
  return {c:context,saved,seed,api:context.NTMLocalData};
}
test('complete backup round trip, repeat merge, conflict rejection, legacy migration and privacy allowlist',()=>{
  const a=app(); a.seed(); a.seed('SOFI');
  a.c.NTMScenarioStorage.save('ranta-pa-ranta',{name:'My scenario',mode:'growth',inputs:{x:{value:'123',type:'number'}}});
  a.saved.set('investment-theme','light'); a.saved.set('unrelated-secret','excluded'); a.saved.set('investment-recent-tools-v1','transient');
  const before=JSON.stringify([...a.saved]), backup=a.api.exportJSON();
  assert.equal(JSON.stringify([...a.saved]),before); assert.ok(!backup.includes('excluded')); assert.ok(!backup.includes('transient'));
  const b=app(); assert.equal(b.api.importJSON(backup).success,true);
  assert.deepEqual(JSON.parse(b.api.exportJSON()).data,JSON.parse(backup).data);
  const imported=JSON.stringify([...b.saved]); b.api.importJSON(backup); assert.equal(JSON.stringify([...b.saved]),imported);
  const conflict=JSON.parse(backup); conflict.data.theses.theses.NVDA.revisions[0].text='Conflicting immutable record';
  assert.throws(()=>b.api.importJSON(JSON.stringify(conflict)),/ID/); assert.equal(JSON.stringify([...b.saved]),imported);
  for(const invalid of ['{',JSON.stringify({...JSON.parse(backup),schemaVersion:99}),backup.replace('"value": 150','"value": 1e999')]) {
    assert.throws(()=>b.api.importJSON(invalid)); assert.equal(JSON.stringify([...b.saved]),imported);
  }
  const legacy=JSON.parse(backup); legacy.data.theses={version:1,theses:{CRWD:{text:'Old record',createdAt:'2020-01-01',custom:'keep',valuationSnapshot:null}}};
  b.api.importJSON(JSON.stringify(legacy));
  const record=JSON.parse(b.api.exportJSON()).data.theses.theses.CRWD.revisions[0];
  assert.equal(record.id,'legacy-CRWD'); assert.equal(record.createdAt,'2020-01-01'); assert.equal(record.valuationSnapshot,null); assert.equal(record.custom,'keep');
  const badShape=JSON.parse(backup); badShape.data.outcomes.checkpoints[0].sourceRevisionId='wrong';
  const safeBefore=JSON.stringify([...b.saved]);
  assert.throws(()=>b.api.importJSON(JSON.stringify(badShape))); assert.equal(JSON.stringify([...b.saved]),safeBefore);
});
test('single/history deletion retains checkpoints; deliberate full delete is isolated and corruption blocks it',()=>{
  const a=app(), old=a.seed(); a.seed('SOFI');
  const sofi=JSON.stringify(a.c.NTMThesisStorage.get('SOFI').thesis);
  assert.equal(a.c.NTMThesisStorage.removeRevision('NVDA',old.id).success,true);
  assert.equal(a.c.NTMResearchOutcomes.read().checkpoints.length,2);
  assert.equal(a.c.NTMThesisStorage.remove('NVDA').success,true);
  assert.equal(a.c.NTMResearchOutcomes.read().checkpoints[0].sourceRevision.text,'First');
  a.api.deleteTicker('NVDA','all');
  assert.equal(a.c.NTMThesisStorage.get('NVDA').thesis,null);
  assert.equal(a.c.NTMResearchOutcomes.read().checkpoints.length,1);
  assert.equal(JSON.stringify(a.c.NTMThesisStorage.get('SOFI').thesis),sofi);
  a.api.deleteTicker('SOFI','outcomes'); assert.ok(a.c.NTMThesisStorage.get('SOFI').thesis);
  assert.equal(a.c.NTMResearchOutcomes.read().checkpoints.length,0);
  for(const key of [a.c.NTMThesisStorage.key,a.c.NTMResearchOutcomes.key,a.c.NTMScenarioStorage.key]) {
    const prior=a.saved.get(key); a.saved.set(key,'{bad'); const raw=JSON.stringify([...a.saved]);
    assert.throws(()=>a.api.deleteTicker('SOFI','all')); assert.throws(()=>a.api.exportJSON()); assert.equal(JSON.stringify([...a.saved]),raw);
    if(prior===undefined)a.saved.delete(key);else a.saved.set(key,prior);
  }
  a.saved.set(a.c.NTMThesisStorage.key,JSON.stringify({version:2,theses:{SOFI:{revisions:[null]}}}));
  assert.equal(a.c.NTMThesisStorage.remove('SOFI').success,false);
  const full=app();full.seed();full.seed('SOFI');
  const all=JSON.parse(full.api.exportJSON()).data;
  full.api.deleteTicker('NVDA','all');
  const remaining=JSON.parse(full.api.exportJSON()).data;
  assert.equal(remaining.theses.theses.NVDA,undefined);
  assert.deepEqual(remaining.theses.theses.SOFI,all.theses.theses.SOFI);
  assert.deepEqual(remaining.outcomes.checkpoints,all.outcomes.checkpoints.filter(r=>r.ticker==='SOFI'));
});
test('write failure rolls back earlier keys; corrupt current store never gets replaced by valid import',()=>{
  const source=app();source.seed();const backup=source.api.exportJSON();
  const target=app(); target.saved.set('investment-theme','dark');
  const prior=JSON.stringify([...target.saved]), setter=target.c.localStorage.setItem;
  target.c.localStorage.setItem=(key,value)=>{if(key===target.c.NTMResearchOutcomes.key)throw new Error('quota');setter(key,value);};
  assert.throws(()=>target.api.importJSON(backup),/bevarade/);assert.equal(JSON.stringify([...target.saved]),prior);
  target.c.localStorage.setItem=setter; target.saved.set(target.c.NTMThesisStorage.key,'');
  const corrupt=JSON.stringify([...target.saved]);assert.throws(()=>target.api.importJSON(backup));assert.equal(JSON.stringify([...target.saved]),corrupt);
});

test('assumptions and explicit reviews survive immutable history, exports, merge and legacy reads',()=>{
  const a=app();a.seed();const storage=a.c.NTMThesisStorage;
  const first=JSON.stringify(storage.get('NVDA').thesis.revisions[0]);
  for(let n=0;n<=3;n++) {
    const assumptions=Array.from({length:n},(_,i)=>'Condition '+i);
    const result=storage.save('NVDA',{...storage.get('NVDA').thesis,text:'Assumptions '+n,assumptions,reviewDate:'2020-01-01'});
    assert.equal(result.success,true);
    assert.deepEqual(Array.from(storage.get('NVDA').thesis.assumptions),assumptions);
  }
  const latest=storage.get('NVDA').thesis;
  assert.equal(storage.reviewStatus(latest,'2026-09-13'),'due');
  assert.equal(storage.reviewStatus({...latest,reviewDate:'2027-01-01'},'2026-09-13'),'active');
  const before=JSON.stringify([...a.saved]);
  assert.equal(storage.save('NVDA',latest).created,false);assert.equal(JSON.stringify([...a.saved]),before);
  assert.equal(storage.save('NVDA',{...latest,assumptions:['a','b','c','d']}).success,false);
  assert.equal(storage.save('NVDA',{...latest,reviewDate:'2026-02-30'}).success,false);
  const data=JSON.parse(fs.readFileSync('data/stocks/NVDA.json','utf8'));
  data.ttm.metrics.revenue.value *= 1.1;
  const report=a.c.NTMChangeDetection.detect(latest.valuationSnapshot,data);
  assert.equal(report.hasChanges,true);
  assert.equal(storage.completeReview('NVDA','keep','Still holds','2027-01-01',data.ttm.asOfPeriod,JSON.stringify(report)).success,true);
  const kept=storage.get('NVDA').thesis;
  assert.deepEqual(kept.valuationSnapshot,latest.valuationSnapshot);
  assert.deepEqual(Array.from(a.c.NTMMinReview.attention(kept,data,'2026-09-13')),[]);
  data.ttm.metrics.revenue.value *= 1.1;
  assert.ok(a.c.NTMMinReview.attention(kept,data,'2026-09-13').length);
  assert.equal(storage.completeReview('NVDA','close','No longer my case').success,true);
  assert.equal(storage.reviewStatus(storage.get('NVDA').thesis),'closed');
  assert.equal(a.c.NTMMinReview.attention(storage.get('NVDA').thesis,data).length,0);
  assert.equal(JSON.stringify(storage.get('NVDA').thesis.revisions[0]),first);
  assert.equal(a.c.NTMResearchOutcomes.read().checkpoints[0].sourceRevision.assumptions.length,0);
  const exported=a.c.NTMResearchExport;
  const model=exported.build('NVDA',kept,kept.latestRevisionId);
  assert.ok(JSON.stringify(model).includes('Condition 2'));assert.ok(JSON.stringify(model).includes('Still holds'));
  assert.ok(!JSON.stringify(exported.build('NVDA',JSON.parse(first),kept.latestRevisionId)).includes('Condition 2'));
  const b=app();b.api.importJSON(a.api.exportJSON());assert.deepEqual(JSON.parse(b.api.exportJSON()).data,JSON.parse(a.api.exportJSON()).data);
  const raw=JSON.stringify({version:1,theses:{NVDA:{text:'Legacy',createdAt:'2020-01-01'}}});
  b.saved.set(storage.key,raw);assert.equal(b.c.NTMThesisStorage.get('NVDA').thesis.assumptions.length,0);assert.equal(b.saved.get(storage.key),raw);
  assert.equal(b.c.NTMThesisStorage.completeReview('NVDA','keep','Legacy review').success,true);
  assert.equal(b.c.NTMThesisStorage.get('NVDA').thesis.revisionCount,2);
});
