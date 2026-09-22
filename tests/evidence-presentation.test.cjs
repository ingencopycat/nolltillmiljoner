const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const profile=require('../fundamental-profile.js');
const c={window:{},document:{}};vm.createContext(c);
for(const file of ['fundamental-profile-ui.js','company-evidence.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const ui=c.window.NTMFundamentalProfileUI,evidence=c.window.NTMCompanyEvidence;
test('compact summaries use unchanged canonical calculations and preserve unavailable gates',()=>{
 for(const ticker of ['NVDA','SOFI','CRWD']){
  const data=JSON.parse(fs.readFileSync(`data/stocks/${ticker}.json`,'utf8')),before=JSON.stringify(data),model=profile.build(data);
  for(const s of model.statements.filter(s=>['growth','profitability','cash'].includes(s.dimension))){
   const summary=ui.summary(s);
   if(s.status==='unavailable'){assert.equal(summary.value,'—');continue;}
   const expected=s.dimension==='growth'?Math.abs(s.calculation.value):s.dimension==='profitability'?s.calculation.values[1]:s.calculation.values[1]/(Math.max(...s.calculation.values.map(Math.abs))>=1e9?1e9:1e6);
   assert.ok(summary.value.includes(expected.toLocaleString('sv-SE',{minimumFractionDigits:1,maximumFractionDigits:1})));
   assert.ok(summary.label.includes(data.annual.at(-1).period));
  }
  assert.equal(JSON.stringify(data),before);
 }
});
test('fiscal quarter labels require an exact period and accession match',()=>{
 for(const ticker of ['NVDA','SOFI','CRWD']){
  const stock=JSON.parse(fs.readFileSync(`data/stocks/${ticker}.json`,'utf8')),feed=JSON.parse(fs.readFileSync(`data/stocks/evidence/${ticker}.json`,'utf8'));
  const latest=feed.events.find(e=>e.accessionNumber===feed.latestReportAccession);
  assert.match(evidence.reportLabel(latest,stock),/^Q[1-4] FY\d{4}$/);
  assert.equal(evidence.reportLabel({...latest,accessionNumber:'unverified'},stock),'Periodslut '+latest.reportDate);
 }
});
