const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function app() {
  const saved=new Map();let id=0;
  const c=vm.createContext({console,URLSearchParams,setTimeout(){},
    document:{getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},readyState:'loading'},
    localStorage:{getItem:k=>saved.has(k)?saved.get(k):null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},
    location:{pathname:'/',search:''},crypto:{randomUUID:()=>`test-${++id}`}});
  c.window=c;
  for(const file of ['valuation-core.js','script.js','research-snapshot.js','thesis-storage.js','research-outcomes.js','research-export.js','change-detection.js','local-data.js','min-review.js']) vm.runInContext(fs.readFileSync(file,'utf8'),c);
  return {c,saved,store:c.NTMThesisStorage,backup:c.NTMLocalData};
}
const clone=x=>JSON.parse(JSON.stringify(x));
const key='investment-research-theses-v1';
const draft=()=>({text:'My belief',companyName:'Example Company',origin:'manual',companyIdentity:{type:'ticker',key:'ACME'},
  assumptions:['FCF becomes positive'],assumptionDetails:[{falsification:'FCF negative in FY2028',reviewBy:'2028-03-01',status:'current',assessment:'unreviewed',note:''}],
  reportQuestions:[{text:'Did margin improve?',status:'open',answer:''}],valuationSnapshot:null});

test('B55 shared Research reminders read latest storage, suppress inactive records and never write on display',()=>{
  const a=app(), node={hidden:true,textContent:''};
  a.c.document.getElementById=id=>id==='researchReminders'?node:null;
  a.store.save('ACME',{...draft(),reviewDate:'2000-01-01'});
  const before=a.saved.get(key);
  a.c.NTMMinReview.renderResearch({symbol:'ACME',manual:true});
  assert.equal(node.hidden,false);
  assert.match(node.textContent,/granskningsdatum/);
  assert.match(node.textContent,/öppna frågor/);
  assert.match(node.textContent,/Inga bakgrundsnotiser/);
  assert.equal(a.saved.get(key),before);
  const empty=a.c.NTMMinReview.attention(null,null,'2030-01-01');
  assert.equal(empty.length,0);
  const d=clone(a.store.get('ACME').thesis);d.reviewDate='2030-02-01';
  d.reportQuestions[0].status='answered';d.assumptionDetails[0].status='superseded';
  assert.equal(a.c.NTMMinReview.attention(d,null,'2030-01-31').length,0);
  assert.equal(a.c.NTMMinReview.attention(d,null,'2030-02-01').length,1);
  a.store.completeReview('ACME','close','Done');
  a.c.NTMMinReview.renderResearch();
  assert.match(node.textContent,/Inga aktiva påminnelser/);
  a.saved.set(key,'{broken');
  a.c.NTMMinReview.renderResearch();
  assert.match(node.textContent,/kunde inte kontrolleras/);
  assert.equal(a.saved.get(key),'{broken');
});

test('B68/B69 immutable criteria, questions, IDs, dates and duplicate suppression',()=>{
  const a=app(), original=draft();
  assert.equal(a.store.save('acme',original).created,true);
  const first=clone(a.store.get('ACME').thesis.revisions[0]), raw=a.saved.get(key);
  assert.equal(a.store.save('ACME',original).created,false);
  assert.equal(a.saved.get(key),raw);
  const next=clone(a.store.get('ACME').thesis);
  next.assumptionDetails[0].falsification='FCF negative in FY2029';
  next.assumptionDetails[0].status='reviewed';next.assumptionDetails[0].assessment='mixed';
  next.reportQuestions[0].status='answered';next.reportQuestions[0].answer='Margin fell; see report note';
  assert.equal(a.store.save('ACME',next).created,true);
  const latest=a.store.get('ACME').thesis;
  assert.deepEqual(clone(latest.revisions[0]),first);
  assert.equal(latest.reportQuestions[0].id,first.reportQuestions[0].id);
  assert.ok(latest.reportQuestions[0].answeredAt);assert.ok(latest.assumptionDetails[0].reviewedAt);
  assert.ok(Object.isFrozen(latest.assumptionDetails[0]));
  const reopened=clone(latest);reopened.reportQuestions[0].status='open';
  a.store.save('ACME',reopened);
  assert.equal(a.store.get('ACME').thesis.reportQuestions[0].answeredAt,null);
  assert.equal(a.store.get('ACME').thesis.revisions[1].reportQuestions[0].status,'answered');
});

test('B69 zero, one, three questions; invalid lifecycle records block writes/import without discarding raw data',()=>{
  for(const count of [0,1,3]) {
    const a=app(), d=draft();d.reportQuestions=Array.from({length:count},(_,i)=>({text:`Question ${i}`,status:'open'}));
    assert.equal(a.store.save('ACME',d).success,true);
    assert.equal(a.store.get('ACME').thesis.reportQuestions.length,count);
  }
  for(const mutate of [d=>d.reportQuestions.push(...d.reportQuestions,...d.reportQuestions,...d.reportQuestions),
    d=>d.reportQuestions[0].status='guessed',d=>d.assumptionDetails[0].reviewBy='2027-02-30',
    d=>d.assumptionDetails[0].assessment='automatic-success',d=>d.assumptionDetails.push(null),
    d=>d.companyIdentity.key='OTHER',d=>d.valuationSnapshot={schemaVersion:2}]) {
    const a=app();a.store.save('ACME',draft());const before=a.saved.get(key),d=draft();mutate(d);
    assert.equal(a.store.save('ACME',d).success,false);assert.equal(a.saved.get(key),before);
  }
  const a=app();a.store.save('ACME',draft());const backup=JSON.parse(a.backup.exportJSON());
  backup.data.theses.theses.ACME.revisions[0].reportQuestions[0].status='unknown';
  const before=a.saved.get(key);assert.throws(()=>a.backup.importJSON(JSON.stringify(backup)));assert.equal(a.saved.get(key),before);
  a.saved.set(key,JSON.stringify(backup.data.theses));const corrupt=a.saved.get(key);
  assert.ok(a.store.get('ACME').warning);assert.equal(a.store.save('ACME',draft()).success,false);
  assert.equal(a.store.remove('ACME').success,false);assert.equal(a.saved.get(key),corrupt);
});

test('B72 Avstod is an inactive revision, preserved in history and explicitly reopenable',()=>{
  const a=app();a.store.save('ACME',draft());const first=clone(a.store.get('ACME').thesis.revisions[0]);
  assert.equal(a.store.completeReview('ACME','abstain','Too uncertain',null,null,null,'Waited for evidence').success,true);
  let latest=a.store.get('ACME').thesis;
  assert.equal(latest.revisionCount,2);assert.equal(a.store.reviewStatus(latest),'abstained');
  assert.deepEqual(clone(a.c.NTMMinReview.attention(latest,null,'2030-01-01')),[]);
  assert.deepEqual(clone(latest.revisions[0]),first);
  a.store.save('ACME',{...latest,review:{decision:'revise',sourceRevisionId:latest.id,at:'2030-01-01',context:'Reopened'}});
  latest=a.store.get('ACME').thesis;
  assert.notEqual(a.store.reviewStatus(latest),'abstained');assert.equal(latest.revisions[1].review.decision,'abstain');
  assert.equal(latest.revisions[1].review.processNote,'Waited for evidence');
});

test('B73 user review dates only request reconsideration, never imply falsity; manual queue needs no data',()=>{
  const a=app();a.store.save('ACME',draft());const thesis=a.store.get('ACME').thesis;
  assert.equal(a.store.assumptionStatus(thesis.assumptionDetails[0],'2028-02-29'),'current');
  assert.equal(a.store.assumptionStatus(thesis.assumptionDetails[0],'2028-03-01'),'due');
  assert.equal(thesis.assumptionDetails[0].assessment,'unreviewed');
  const midnight=new Date(2030,0,2,0,30).toISOString();
  assert.equal(a.store.assumptionStatus({status:'reviewed',reviewBy:'2030-01-02',reviewedAt:midnight},'2030-01-02'),'reviewed');
  assert.equal(a.c.NTMMinReview.attention(thesis,null,'2028-03-01').length,2);
  const revised=clone(thesis);revised.reportQuestions[0].status='answered';
  revised.assumptionDetails[0].status='reviewed';revised.assumptionDetails[0].reviewedAt='2028-03-01T12:00:00Z';
  assert.equal(a.c.NTMMinReview.attention(revised,null,'2028-03-02').length,0);
  revised.assumptionDetails[0].reviewBy='2028-04-01';
  assert.equal(a.c.NTMMinReview.attention(revised,null,'2028-04-01').length,1);
  revised.assumptionDetails[0].status='superseded';
  assert.equal(a.c.NTMMinReview.attention(revised,null,'2030-01-01').length,0);
});

test('B80 manual identity, exports, backup roundtrip, deletion and future support preserve history',()=>{
  const a=app();a.store.save('ACME',draft());a.store.completeReview('ACME','abstain','Not proceeding');
  const original=clone(a.store.get('ACME').thesis), exported=a.backup.exportJSON(), b=app();
  b.backup.importJSON(exported);assert.deepEqual(clone(b.store.get('ACME').thesis),original);
  assert.deepEqual(JSON.parse(b.backup.exportJSON()).data,JSON.parse(exported).data);
  const doc=a.c.NTMResearchExport.build('ACME',original,original.id,'2030-01-01');
  const md=a.c.NTMResearchExport.markdown(doc);
  for(const value of ['FCF negative in FY2028','Did margin improve?','Avstod','Manuell tes','Not proceeding',original.assumptionDetails[0].id]) assert.ok(md.includes(value));
  assert.ok(!doc.sections.some(s=>s.heading==='Sparad finansiell snapshot'));
  assert.throws(()=>a.c.NTMResearchOutcomes.observe('ACME',original,{manual:true}));
  assert.equal(original.valuationSnapshot,null);
  const label=draft();label.companyIdentity={key:'MANUAL-123',type:'label'};
  b.store.save('MANUAL-123',label);assert.equal(b.store.get('MANUAL-123').thesis.companyIdentity.type,'label');
  b.backup.deleteTicker('ACME','all');assert.equal(b.store.get('ACME').thesis,null);assert.ok(b.store.get('MANUAL-123').thesis);
  a.store.save('ACME',{...original,origin:'supported',review:null});
  assert.equal(a.store.get('ACME').thesis.revisions[0].origin,'manual');
  assert.equal(a.store.get('ACME').thesis.companyIdentity.key,'ACME');
});

test('legacy assumptions gain no invented criteria/dates on read, export or an unchanged save',()=>{
  const a=app();a.saved.set(key,JSON.stringify({version:1,theses:{NVDA:{text:'Old',assumptions:['Old assumption'],createdAt:'2020-01-01'}}}));
  const raw=a.saved.get(key), thesis=a.store.get('NVDA').thesis;
  assert.equal(thesis.assumptionDetails,undefined);assert.equal(thesis.reportQuestions,undefined);
  a.c.NTMResearchExport.build('NVDA',thesis,thesis.id);assert.equal(a.saved.get(key),raw);
  assert.equal(a.store.save('NVDA',thesis).created,false);assert.equal(a.saved.get(key),raw);
});

test('B21 price outcomes cannot evaluate assumptions or process; dimensions remain separate',()=>{
  const a=app();const data=JSON.parse(fs.readFileSync('data/stocks/NVDA.json','utf8'));
  const snapshot={...a.c.NTMResearchSnapshot.fromStockData(data),ticker:'NVDA',valuationInputs:{stockPrice:100,years:5}};
  const revision={id:'source',text:'Belief',savedAt:'2025-01-01',valuationSnapshot:snapshot};
  for(const price of [50,100,200]) {
    const outcome=a.c.NTMResearchOutcomes.compare(revision,a.c.NTMResearchOutcomes.observe('NVDA',revision,data,price));
    for(const forbidden of ['score','success','failure','assumptionAssessment','processAssessment','winner','loser']) assert.equal(outcome[forbidden],undefined);
  }
  const ui=fs.readFileSync('research-outcome-ui.js','utf8');
  for(const dimension of ['assumptions','process','price']) assert.ok(ui.includes(`'data-outcome-dimension','${dimension}'`));
});

test('supported Outcome archives lifecycle evidence after source deletion and rejects malformed lifecycle imports',()=>{
  const a=app(),data=JSON.parse(fs.readFileSync('data/stocks/NVDA.json','utf8'));
  const value={...draft(),origin:'supported',companyIdentity:{type:'ticker',key:'NVDA'},
    valuationSnapshot:{...a.c.NTMResearchSnapshot.fromStockData(data),ticker:'NVDA'}};
  assert.equal(a.store.save('NVDA',value).success,true);
  const revision=a.store.get('NVDA').thesis.revisions[0];
  const observation=a.c.NTMResearchOutcomes.observe('NVDA',revision,data,150);
  assert.equal(a.c.NTMResearchOutcomes.save(observation).success,true);
  a.store.remove('NVDA');
  const copy=app();copy.backup.importJSON(a.backup.exportJSON());
  assert.deepEqual(clone(copy.c.NTMResearchOutcomes.read().checkpoints[0].sourceRevision),clone(revision));
  const bad=JSON.parse(a.backup.exportJSON());bad.data.outcomes.checkpoints[0].sourceRevision.reportQuestions[0].status='unknown';
  const before=copy.backup.exportJSON();assert.throws(()=>copy.backup.importJSON(JSON.stringify(bad)));
  assert.deepEqual(JSON.parse(copy.backup.exportJSON()).data,JSON.parse(before).data);
});
