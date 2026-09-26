const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const context={window:{NTMFundamentalProfile:require('../fundamental-profile.js')}};
vm.runInNewContext(fs.readFileSync(path.join(root,'research-overview.js'),'utf8'),context);
const rows=context.window.NTMResearchOverview.rows;
const stock=t=>JSON.parse(fs.readFileSync(path.join(root,'data/stocks',t+'.json'),'utf8'));
test('overview selectors preserve normalized data and isolate annual from quarterly observations',()=>{
 for(const ticker of ['NVDA','SOFI','CRWD']){
  const d=stock(ticker),before=JSON.stringify(d);
  for(const mode of ['annual','quarterly']){
   const result=rows(d,'revenue',mode);assert.ok(result.filter(r=>r.available).length>=2);
   for(const r of result.filter(r=>r.available))assert.equal(r.fact.periodType,mode==='annual'?'annual':'quarter');
  }
  assert.equal(JSON.stringify(d),before);
 }
});
test('missing observations become labelled gaps, never synthetic zeroes',()=>{
 for(const mode of ['annual','quarterly']){
  const d=stock('NVDA'),key=mode==='annual'?'annual':'quarterly',period=d[key].at(-2).period;
  d[key].splice(d[key].length-2,1);
  const gap=rows(d,'revenue',mode).find(r=>r.period===period);
  assert.ok(gap);assert.equal(gap.available,false);assert.equal(gap.fact,undefined);
 }
 const d=stock('NVDA');d.quarterly.at(-1).metrics.revenue.value=null;
 assert.equal(rows(d,'revenue','quarterly').at(-1).available,false);
});
test('recasts, changed definitions, invalid units and periods cannot be plotted as comparable facts',()=>{
 for(const edit of [m=>m.restated=true,m=>m.definition='revenue:other',m=>m.currency='EUR',m=>m.periodStart='2020-01-01',m=>m.methodVersion='other',m=>m.qualityStatus='unavailable',m=>m.value=-1]){
  const d=stock('NVDA');edit(d.quarterly.at(-2).metrics.revenue);
  assert.equal(rows(d,'revenue','quarterly').at(-2).available,false);
 }
 const d=stock('NVDA');d.annual.at(-1).metrics.revenue.periodStart='2025-01-02';d.annual.at(-1).periodStart='2025-01-02';
 assert.equal(rows(d,'revenue','annual').at(-1).available,false);
});
test('financial-company eligibility and negative earnings are retained',()=>{
 const bank=stock('SOFI');for(const mode of ['annual','quarterly'])for(const key of ['freeCashFlow','operatingIncome'])assert.equal(rows(bank,key,mode).filter(r=>r.available).length,0);
 const saas=stock('CRWD');assert.ok(rows(saas,'operatingIncome','annual').some(r=>r.available&&r.fact.value<0));
});
