const test=require('node:test'),assert=require('node:assert/strict');
const V=require('../scripts/check_weekly_events.cjs'),D=require('../scripts/discord_weekly.cjs');
test('release grouping preserves strongest priority and never merges different dates',()=>{
  const m=V.loadRepository(),w=m.data.macroWeeks['2026-W40'];
  const events=w.events.map(r=>m.macro.normalizeMacroEvent(r,w.sourceTimezone));
  const original=JSON.stringify(events),groups=m.macro.groupHomepageMacroReleases(events);
  assert.equal(groups.length,13);
  const pce=groups.find(r=>r.eventName.startsWith('PCE /'));
  assert.equal(m.macro.homepageMacroPriority(pce),4);
  assert.equal(JSON.stringify(events),original);
  assert.equal(m.macro.groupHomepageMacroReleases([pce,{...pce,swedishDate:'2026-10-30'}]).length,2);
});
test('week 40 verified schedules, Swedish times, empty actuals and historical values',()=>{
  const m=V.loadRepository(),w=m.data.macroWeeks['2026-W40'];
  assert.equal(w.events.length,21);
  for(const r of w.events){
    assert.equal(r.actual,null);assert.equal(r.fieldProvenance.actual.status,'unavailable');
    assert.match(r.scheduleSourceUrl||r.sourceUrl,/^https:\/\//);
    const n=m.macro.normalizeMacroEvent(r,w.sourceTimezone);
    assert.equal(n.swedishDate,r.date);
    assert.equal(n.swedishTime,({'08:15':'14:15','08:30':'14:30','10:00':'16:00'})[r.time]);
  }
  const jolts=w.events.find(r=>r.id.startsWith('us-jolts'));
  assert.equal(jolts.period,'Aug.');assert.equal(jolts.previous,'7.27M');
  const jobs=w.events.find(r=>r.id.startsWith('us-nonfarm'));
  assert.equal(jobs.previous,'162K');assert.equal(jobs.fieldProvenance.previous.kind,'provider_derived');
  for(const date of ['2026-09-27','2026-09-28','2026-10-02','2026-10-04']){
    assert.deepEqual(V.check(m,new Date(date+'T12:00:00Z')).filter(i=>i.level==='error'),[]);
    assert.equal(m.api.resolve(m.data.earningsWeeks,date,'reports').key,date==='2026-09-27'?'2026-W39':'2026-W40');
  }
});
test('week 40 reports preserve verified sessions, unknowns, exact release versus call and identity',()=>{
  const m=V.loadRepository(),rows=m.data.earningsWeeks['2026-W40'].reports;
  assert.equal(rows.length,20);
  assert.equal(rows.find(r=>r.ticker==='GNS').companyName,'Genius Group');
  assert.equal(rows.find(r=>r.ticker==='MU').companyName,undefined,'name comes from issuer registry');
  assert.equal(rows.find(r=>r.ticker==='MU').callAt,'2026-09-30T20:30:00Z');
  assert.equal(rows.find(r=>r.ticker==='MU').releaseAt,undefined);
  assert.equal(rows.find(r=>r.ticker==='IVA').timing,'unknown');
  assert.equal(rows.find(r=>r.ticker==='MTN').timing,'after-close');
  assert.equal(rows.find(r=>r.ticker==='KMX').timing,'before-open');
  assert.equal(rows.find(r=>r.ticker==='AYI').releaseAt,'2026-10-01T10:00:00Z');
  assert.equal(rows.find(r=>r.ticker==='NKE').releaseAt,'2026-10-01T20:15:00Z');
  assert.ok(!rows.some(r=>r.ticker==='ATCH'||r.date==='2026-10-02'));
  assert.ok(rows.every(r=>/^https:\/\//.test(r.sourceUrl)));
  for(const kind of ['macro','earnings'])assert.throws(()=>D.preview(m,kind,'2026-W40'),/reference_image_requires_corrected/);
});
