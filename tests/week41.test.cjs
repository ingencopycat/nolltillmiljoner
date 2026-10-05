const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const W = require('../scripts/check_weekly_events.cjs');

test('Week 41 release instants respect Central/Eastern DST and Swedish day rollover', () => {
  const m = W.loadRepository(), w = m.data.macroWeeks['2026-W41'];
  const expected = [
    ['us-ism-services','05','16:00','2026-10-05T14:00:00.000Z'],
    ['us-trade-balance','06','14:30','2026-10-06T12:30:00.000Z'],
    ['us-fed-logan','07','01:00','2026-10-06T23:00:00.000Z'],
    ['us-fomc-minutes','07','20:00','2026-10-07T18:00:00.000Z'],
    ['us-consumer-credit','07','21:00','2026-10-07T19:00:00.000Z'],
    ['us-jobless-claims','08','14:30','2026-10-08T12:30:00.000Z'],
    ['us-wholesale-trade','08','16:00','2026-10-08T14:00:00.000Z'],
    ['us-fed-schmid','09','15:30','2026-10-09T13:30:00.000Z'],
    ['us-michigan','09','16:00','2026-10-09T14:00:00.000Z']
  ];
  assert.equal(w.events.length, expected.length);
  for (const [id,day,time,utc] of expected) {
    const e = w.events.find(e => e.id.startsWith(id)), n = m.macro.normalizeMacroEvent(e,w.sourceTimezone);
    assert.equal(n.swedishDate,`2026-10-${day}`);assert.equal(n.swedishTime,time);
    assert.equal(n.dateTime.toISOString(),utc);
    assert.equal(e.scheduleVerifiedAt,'2026-10-05');
    if (utc > '2026-10-05T15:00:00.000Z') {
      assert.equal(e.actual,null);assert.equal(e.fieldProvenance.actual.kind,'unavailable');
      assert.equal(e.officialBaseline,undefined);
    }
    for (const field of ['actual','previous','forecast']) {
      if(e[field] !== null) assert.ok(e.fieldProvenance[field].sourceUrl);
      if(field==='forecast' && e[field] !== null) {
        assert.equal(e.fieldProvenance.forecast.kind,'manual');
        assert.equal(e.fieldProvenance.forecast.sourceUrl,'./images/makro/week-41.png');
      }
    }
  }
  assert.equal(w.events.find(e=>e.id.startsWith('us-ism')).actual,'54.9');
  assert.equal(w.events.find(e=>e.id.startsWith('us-michigan')).previous,'48.1');
  assert.equal(w.events.find(e=>e.id.startsWith('us-wholesale')).previous,'1.3%');
  assert.ok(w.events.find(e=>e.id.startsWith('us-wholesale')).eventName.includes('inventories'));
  assert.equal(m.macro.groupHomepageMacroReleases(w.events.map(e=>m.macro.normalizeMacroEvent(e,w.sourceTimezone))).length,9);
  assert.equal(m.macro.homepageMacroPriority(w.events.find(e=>e.id.startsWith('us-fomc'))),5);
});

test('Week 41 preserves all 20 image identities, verified dates and release/call semantics', () => {
  const m=W.loadRepository(), rows=m.data.earningsWeeks['2026-W41'].reports;
  const expected={
    '2026-10-05':[], '2026-10-06':['APOG','RPM','LW','PENG','STZ','WS','NEOG','SAR'],
    '2026-10-07':['APLD','LEVI','RELL','RGP'], '2026-10-08':['PEP','TLRY','BYRN','NG','HELE','ANGO'],
    '2026-10-09':['DAL','HOVR']
  };
  for(const [date,tickers] of Object.entries(expected)) assert.deepEqual(rows.filter(e=>e.date===date).map(e=>e.ticker),tickers);
  assert.deepEqual(rows.filter(e=>e.timing==='unknown').map(e=>e.ticker),['PENG','LEVI','DAL']);
  assert.deepEqual(rows.filter(e=>e.priority==='high').map(e=>e.ticker),['PENG','STZ','APLD','LEVI','PEP','TLRY','DAL']);
  const by=ticker=>rows.find(e=>e.ticker===ticker);
  assert.equal(by('LW').releaseAt,'2026-10-06T12:00:00Z');
  assert.equal(by('PEP').releaseAt,'2026-10-08T10:00:00Z');
  assert.ok(by('LW').releaseTimeApproximate && by('PEP').releaseTimeApproximate);
  assert.equal(by('STZ').callAt,'2026-10-07T12:00:00Z');
  assert.equal(by('RELL').callAt,'2026-10-08T14:00:00Z');
  for(const r of rows) {
    assert.match(r.sourceUrl,/^https:\/\//);assert.equal(r.scheduleVerifiedAt,'2026-10-05');
    if(!['LW','PEP'].includes(r.ticker)) assert.equal(r.releaseAt,undefined);
    if(r.timing==='unknown') assert.ok(r.referenceTiming && r.verificationNote);
  }
  const issuers=JSON.parse(fs.readFileSync('data/issuer-registry.json','utf8')).issuers;
  assert.deepEqual(rows.filter(r=>issuers.some(i=>i.ticker===r.ticker && i.financial)),[],'no unsupported Research links');
  // The shared real resolver still binds an earlier supported report to Research.
  const c=vm.createContext({window:{NTMIssuerRegistry:{get:t=>issuers.find(i=>i.ticker===t)}}});
  const source=fs.readFileSync('script.js','utf8');
  vm.runInContext(source.slice(source.indexOf('function getEarningsIdentity('),source.indexOf('function getEarningsTimingText(')),c);
  assert.equal(c.getEarningsIdentity(m.data.earningsWeeks['2026-W40'].reports.find(r=>r.ticker==='MU')).url,'research.html?ticker=MU');
  for(const r of rows) assert.equal(c.getEarningsIdentity(r).url,null);
});

test('W39/W40/W41 resolve independently at Stockholm ISO boundaries and retain reviewed artifacts', () => {
  const m=W.loadRepository();
  for(const [date,key] of [['2026-09-27','2026-W39'],['2026-09-28','2026-W40'],['2026-10-04','2026-W40'],['2026-10-05','2026-W41'],['2026-10-11','2026-W41']]) {
    for(const [kind,field] of [['macro','events'],['earnings','reports']]) {
      assert.equal(m.api.resolve(m.data[kind+'Weeks'],date,field).key,key);
      assert.ok(m.api.resolve(m.data[kind+'Weeks'],date,field).available);
    }
    assert.deepEqual(W.check(m,new Date(date+'T15:00:00Z')).filter(i=>i.level==='error'),[]);
  }
  assert.equal(m.api.weekKey(m.api.dateKey(new Date('2026-10-04T21:59:59Z'))),'2026-W40');
  assert.equal(m.api.weekKey(m.api.dateKey(new Date('2026-10-04T22:00:00Z'))),'2026-W41');
  assert.equal(m.api.resolve(m.data.earningsWeeks,'2026-10-12','reports').available,false,'never substitute W41 for missing W42');
});
