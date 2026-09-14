const test=require('node:test'),assert=require('node:assert/strict');
const V=require('../scripts/check_weekly_events.cjs');
function model(){return V.loadRepository();}
const today=new Date('2026-09-14T12:00:00Z');
const codes=m=>V.check(m,today).filter(i=>i.level==='error').map(i=>i.code);
test('published weekly artifacts and homepage resolve; honest partial/future statuses stay visible',()=>{
  const m=model();assert.deepEqual(codes(m),[]);
  const issues=V.check(m,today);assert.ok(issues.some(i=>i.code==='partial_update'&&i.level==='warning'));
  assert.ok(issues.some(i=>i.code==='not_yet_published'&&i.level==='notice'));
  for(const kind of ['macro','earnings'])assert.ok(m.api.resolve(m.data[kind+'Weeks'],'2026-09-14',kind==='macro'?'events':'reports').available);
});
test('shared Stockholm week resolution handles Monday/Sunday/year rollover and never substitutes another week',()=>{
  const {api}=model();
  for(const [date,key] of [['2026-09-14','2026-W38'],['2026-09-20','2026-W38'],['2026-09-21','2026-W39'],['2027-01-01','2026-W53'],['2027-01-04','2027-W01']])assert.equal(api.weekKey(date),key);
  assert.equal(api.dateKey(new Date('2026-09-13T22:30:00Z')),'2026-09-14');
  assert.equal(api.weekKey(api.dateKey(new Date('2026-09-13T21:59:00Z'))),'2026-W37');
  assert.equal(api.resolve({'2026-W37':{events:[1]},'2026-W39':{events:[2]}},'2026-09-14','events').available,false);
  assert.equal(api.resolve({'2026-W38':{events:[]}},'2026-09-14','events').available,true);
});
test('missing current weeks and image/structured mismatches fail for both feeds',()=>{
  for(const kind of ['macro','earnings']){
    let m=model();delete m.data[kind+'Weeks']['2026-W38'];assert.ok(codes(m).includes('missing_current_week'));assert.ok(codes(m).includes('image_data_mismatch'));
    m=model();m.review.artifacts.find(a=>a.kind===kind&&a.week==='2026-W38').sha256='changed';assert.ok(codes(m).includes('unreviewed_image'));
    m=model();m.review.artifacts.find(a=>a.kind===kind&&a.week==='2026-W38').records.pop();assert.ok(codes(m).includes('image_data_mismatch'));
    m=model();m.artifacts.push({kind,week:'2026-W39',image:'./images/'+(kind==='macro'?'makro':'rapporter')+'/week-38.png'});assert.ok(codes(m).some(c=>['image_data_mismatch','unreviewed_image'].includes(c)));
  }
});
test('malformed dates, wrong weeks, duplicate identities and false provenance are rejected',()=>{
  for(const kind of ['macro','earnings']){
    const field=kind==='macro'?'events':'reports';
    let m=model();m.data[kind+'Weeks']['2026-W38'][field][0].date='2026-02-30';assert.ok(codes(m).includes('malformed_date'));
    m=model();m.data[kind+'Weeks']['2026-W38'][field][0].date='2026-09-21';assert.ok(codes(m).includes('wrong_week'));
    m=model();const rows=m.data[kind+'Weeks']['2026-W38'][field];rows.push({...rows[0]});assert.ok(codes(m).includes('duplicate_record'));
  }
  const m=model();m.data.macroWeeks['2026-W38'].events[0].fieldProvenance.forecast={status:'available',kind:'reported'};assert.ok(codes(m).includes('field_provenance'));
});
test('partial upstream failure may not claim successful complete fetch',()=>{
  let m=model();m.data.meta.status='ok';assert.ok(codes(m).includes('false_success'));
  m=model();m.data.meta.lastCompleteFetch=m.data.meta.lastFetchAttempt;assert.ok(codes(m).includes('false_success'));
  m=model();m.data.meta.lastSuccessfulUpdate=m.data.meta.lastFetchAttempt;assert.ok(codes(m).includes('false_success'));
  m=model();const w=m.data.macroWeeks['2026-W38'];assert.equal(w.events.filter(e=>e.date==='2026-09-14').length,0);assert.deepEqual(codes(m),[]);
});
test('future authoritative unavailability has a dated explicit exception; current missing week does not',()=>{
  const m=model();m.data.macroWeeks['2027-W01']={availability:'not_yet_published',availabilitySourceUrl:'https://www.bls.gov/schedule/',reviewAfter:'2026-11-01'};
  assert.deepEqual(codes(m),[]);delete m.data.macroWeeks['2026-W38'];assert.ok(codes(m).includes('missing_current_week'));
});
