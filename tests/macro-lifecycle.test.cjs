const test=require('node:test'),assert=require('node:assert/strict');
const V=require('../scripts/check_weekly_events.cjs');
const {assertActualLifecycle}=require('./helpers/macro-lifecycle.cjs');

test('historical actual assertions accept verified updates and reject future or unverified values',()=>{
  const m=V.loadRepository(),w=m.data.macroWeeks['2026-W40'];
  const event=structuredClone(w.events.find(e=>e.id==='us-jolts-job-openings-2026-09-29'));
  const before=new Date('2026-09-29T13:59:59Z'),after=new Date('2026-09-29T14:01:00Z');
  event.actual=null;event.fieldProvenance.actual={kind:'unavailable',status:'unavailable'};
  assertActualLifecycle(event,w,m.macro,before);
  assertActualLifecycle(event,w,m.macro,after); // A released event may still await verification.
  event.actual='7.08M';
  event.fieldProvenance.actual={kind:'provider_derived',status:'available',source:'U.S. Bureau of Labor Statistics',
    sourceUrl:'https://www.bls.gov/jlt/',fetchedAt:'2026-09-29T14:00:00Z',methodVersion:'ntm-macro/1'};
  assertActualLifecycle(event,w,m.macro,after);
  assert.throws(()=>assertActualLifecycle(event,w,m.macro,before));
  for(const change of [{kind:'manual'},{kind:'unknown'},{status:'unavailable'},{source:''},
    {sourceUrl:'./images/makro/week-40.png'},{methodVersion:'unverified'},
    {fetchedAt:'invalid'},{fetchedAt:'2026-09-29T13:59:59Z'},{fetchedAt:'2026-09-30T14:00:00Z'}]) {
    const bad=structuredClone(event);Object.assign(bad.fieldProvenance.actual,change);
    assert.throws(()=>assertActualLifecycle(bad,w,m.macro,after),JSON.stringify(change));
  }
});
