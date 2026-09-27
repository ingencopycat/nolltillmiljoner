const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../company-material-events.js'),O=require('../company-ownership.js'),K=require('../company-observations.js');
const feed=t=>JSON.parse(fs.readFileSync(`data/stocks/evidence/${t}.json`));
test('completion links acquisition stages without backdating completed status',()=>{
 const data=feed('VRT').materialEvents;
 for(const key of ['thermokey','purgerite','great-lakes']){
  const group=M.latest(data).find(g=>g.event.eventId==='VRT:completion/'+key);
  assert.equal(group.history.length,2);assert.equal(group.event.template,'acquisition_completed');
  const earlier=group.history.find(o=>o.template==='acquisition_agreed');
  const asof=M.latest(data,{until:earlier.publicationDate}).find(g=>g.event.eventId===earlier.eventId);
  assert.equal(asof.event.template,'acquisition_agreed');
 }
});
test('ownership reporting realignments never become sale-to-zero',()=>{
 for(const [t,a] of [['MU','0000102909-26-001910'],['VRT','0000102909-26-002519']]){
  const data=feed(t).ownershipEvidence;O.validate(data,t,feed(t).cik);
  const filing=data.filings.find(f=>f.accessionNumber===a),change=O.change(filing,data.filings);
  assert.equal(change.state,'not_comparable');assert.equal(change.shares,undefined);
 }
 const data=feed('MU').ownershipEvidence;
 const change=O.change(data.filings.find(f=>f.accessionNumber==='0001422849-26-000035'),data.filings);
 assert.equal(change.kind,'decrease');assert.equal(change.shares,-12530980);
});
test('annual backlog retains dates and approximate scope without quarterly growth inference',()=>{
 const f=feed('VRT'),data=f.reviewedEvidence;K.validate(data,'VRT',f.cik);
 const rows=data.observations.filter(o=>o.kind==='kpi');assert.equal(rows.length,2);
 assert.deepEqual(rows.map(o=>o.value.point),[7200000000,15000000000]);
 assert(rows.every(o=>o.value.approximate&&o.publicationDate==='2026-02-13'));
 assert.equal(K.compare(rows[0],rows[1]).comparable,false);
 assert.equal(K.asOf(data,'2026-02-12').filter(o=>o.kind==='kpi').length,0);
 assert.equal(feed('MU').reviewedEvidence.observations.filter(o=>o.kind==='kpi').length,0);
});
