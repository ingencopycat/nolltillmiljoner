const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const W=require('../scripts/check_weekly_events.cjs');
const {assertActualLifecycle}=require('./helpers/macro-lifecycle.cjs');

test('W42 macro preserves verified schedules, provider identities, grouping and actual lifecycle',()=>{
  const m=W.loadRepository(),w=m.data.macroWeeks['2026-W42'];
  assert.equal(w.events.length,20);
  for(const e of w.events){
    assert.equal(e.scheduleVerifiedAt,'2026-10-11');assert.equal(e.refYear,2026);
    assertActualLifecycle(e,w,m.macro);
    if(e.forecast!==null){assert.equal(e.fieldProvenance.forecast.kind,'manual');assert.equal(e.fieldProvenance.forecast.sourceUrl,'./images/makro/week-42.png');}
  }
  const by=id=>w.events.find(e=>e.id.startsWith(id+'-2026'));
  const n=e=>m.macro.normalizeMacroEvent(e,w.sourceTimezone);
  assert.equal(by('us-nfib').time,null);assert.equal(n(by('us-nfib')).hasTime,false);
  assert.equal(by('us-existing-home-sales').previous,'3.98M');
  assert.equal(by('us-retail-sales').previous,null);
  assert.equal(w.events.filter(e=>e.id.includes('warsh')).length,1);
  assert.ok(!w.events.some(e=>/treasury/i.test(e.eventName)));
  assert.equal(n(by('us-cpi')).dateTime.toISOString(),'2026-10-14T12:30:00.000Z');
  assert.equal(n(by('us-cpi')).swedishTime,'14:30');
  assert.equal(n(by('us-fed-warsh')).swedishDate,'2026-10-16');
  assert.equal(n(by('us-fed-warsh')).swedishTime,'05:30');
  const central=n({...by('us-jobless-claims'),time:'07:30',timezone:'America/Chicago'});
  assert.equal(central.dateTime.toISOString(),'2026-10-15T12:30:00.000Z');assert.equal(central.swedishTime,'14:30');
  const provider=w.events.filter(e=>e.calUid);
  assert.equal(provider.length,7);
  for(const e of provider){assert.equal(e.fieldProvenance.previous.kind,'provider_derived');assert.equal(e.fieldProvenance.previous.methodVersion,'ntm-macro/1');}
  const grouped=m.macro.groupHomepageMacroReleases(w.events.map(n));
  assert.equal(grouped.length,14); // four CPI, three PPI and two G.17 rows become three releases
  const thursday=grouped.filter(e=>e.swedishDate==='2026-10-15');
  const selected=m.macro.selectHomepageMacro(thursday).selected;
  assert.equal(selected.length,3);
  assert.deepEqual(new Set(selected.map(e=>e.id)),new Set(['us-retail-sales-2026-10-15','us-jobless-claims-2026-10-15','us-ppi-2026-10-15']));
});

test('W42 lifecycle accepts a later verified actual and rejects premature or unproven values',()=>{
  const m=W.loadRepository(),w=m.data.macroWeeks['2026-W42'];
  const e=structuredClone(w.events.find(e=>e.id==='us-cpi-2026-10-14'));
  e.actual='0.5%';e.fieldProvenance.actual={kind:'provider_derived',status:'available',source:e.source,sourceUrl:e.sourceUrl,fetchedAt:'2026-10-14T12:35:00Z',methodVersion:'ntm-macro/1'};
  assert.doesNotThrow(()=>assertActualLifecycle(e,w,m.macro,new Date('2026-10-15T00:00:00Z')));
  assert.throws(()=>assertActualLifecycle(e,w,m.macro,new Date('2026-10-14T12:29:59Z')));
  e.fieldProvenance.actual.kind='manual';
  assert.throws(()=>assertActualLifecycle(e,w,m.macro,new Date('2026-10-15T00:00:00Z')));
  const undatedClock=structuredClone(w.events.find(e=>e.id==='us-nfib-2026-10-13'));
  undatedClock.actual='99.0';undatedClock.fieldProvenance.actual={...e.fieldProvenance.actual,kind:'reported',fetchedAt:'2026-10-13T12:00:00Z'};
  assert.doesNotThrow(()=>assertActualLifecycle(undatedClock,w,m.macro,new Date('2026-10-14T12:00:00Z')));
  assert.throws(()=>assertActualLifecycle(undatedClock,w,m.macro,new Date('2026-10-13T20:00:00Z')));
  assert.throws(()=>assertActualLifecycle(undatedClock,w,m.macro,new Date('2026-10-12T00:00:00Z')));
});

test('all 43 W42 image companies retain dates, separate calls and conservative release sessions',()=>{
  const m=W.loadRepository(),rows=m.data.earningsWeeks['2026-W42'].reports;
  const days={13:'UNH JPM GS WFC DPZ JNJ C ACI FBK AZZ',14:'ASML BAC MS BLK PGR STT FAST SOTK EQBK HOMB',15:'TSM CMC ERIC SCHW MAN PNC MRSH BNY BSVN FHN AA IBKR INDB JBHT WSE WAFD SFNC CNS',16:'MTB TRV TFC RF CFG'};
  assert.equal(rows.length,43);assert.equal(rows.filter(e=>e.date==='2026-10-12').length,0);
  for(const [day,tickers] of Object.entries(days))assert.deepEqual(rows.filter(e=>e.date===`2026-10-${day}`).map(e=>e.ticker),tickers.split(' '));
  assert.deepEqual(rows.filter(e=>e.timing==='unknown').map(e=>e.ticker),['WFC','JNJ','PGR','TSM','CMC','SCHW','CFG']);
  const by=t=>rows.find(e=>e.ticker===t);
  assert.equal(by('JPM').releaseAt,'2026-10-13T11:00:00Z');assert.ok(by('JPM').releaseTimeApproximate);
  assert.equal(by('DPZ').releaseAt,'2026-10-13T10:05:00Z');
  assert.equal(by('FAST').releaseAt,'2026-10-14T11:00:00Z');assert.equal(by('FAST').callAt,'2026-10-14T14:00:00Z');
  assert.equal(by('BSVN').callAt,'2026-10-15T14:00:00Z');
  assert.equal(by('AZZ').callAt,'2026-10-14T15:00:00Z');assert.equal(by('WAFD').callAt,'2026-10-16T14:00:00Z');
  assert.equal(by('ASML').releaseAt,undefined);assert.match(by('ASML').verificationNote,/CET\/CEST/);
  for(const r of rows){
    assert.match(r.sourceUrl,/^https:\/\//);assert.equal(r.scheduleVerifiedAt,'2026-10-11');
    if(r.timing==='unknown'){assert.equal(r.releaseAt,undefined);assert.ok(r.referenceTiming&&r.verificationNote);}
    if(r.releaseAt&&r.callAt)assert.ok(Date.parse(r.releaseAt)<Date.parse(r.callAt));
  }
  const issuers=JSON.parse(fs.readFileSync('data/issuer-registry.json','utf8')).issuers;
  const c=vm.createContext({window:{NTMIssuerRegistry:{get:t=>issuers.find(i=>i.ticker===t)}}}),s=fs.readFileSync('script.js','utf8');
  vm.runInContext(s.slice(s.indexOf('function getEarningsIdentity('),s.indexOf('function getEarningsTimingText(')),c);
  for(const r of rows)assert.equal(c.getEarningsIdentity(r).url,null);
  assert.equal(c.getEarningsIdentity(m.data.earningsWeeks['2026-W40'].reports.find(r=>r.ticker==='MU')).url,'research.html?ticker=MU');
});

test('W42 resolves at Stockholm midnight; absent or malformed W42 never substitutes history',()=>{
  const m=W.loadRepository();
  for(const [instant,key] of [['2026-10-11T21:59:59Z','2026-W41'],['2026-10-11T22:00:00Z','2026-W42'],['2026-10-18T21:59:59Z','2026-W42'],['2026-10-18T22:00:00Z','2026-W43']])
    assert.equal(m.api.weekKey(m.api.dateKey(new Date(instant))),key);
  for(const [kind,field] of [['macro','events'],['earnings','reports']]){
    const weeks=m.data[kind+'Weeks'];
    for(const [date,key] of [['2026-09-20','2026-W38'],['2026-09-27','2026-W39'],['2026-10-04','2026-W40'],['2026-10-11','2026-W41'],['2026-10-12','2026-W42'],['2026-10-18','2026-W42']]){
      assert.equal(m.api.resolve(weeks,date,field).key,key);assert.ok(m.api.resolve(weeks,date,field).available);
    }
    const absent={...weeks};delete absent['2026-W42'];assert.equal(m.api.resolve(absent,'2026-10-12',field).available,false);
    absent['2026-W42']={...weeks['2026-W42'],[field]:null};assert.equal(m.api.resolve(absent,'2026-10-12',field).available,false);
  }
  assert.deepEqual(W.check(m,new Date('2026-10-12T12:00:00Z')).filter(i=>i.level==='error'),[]);
});
