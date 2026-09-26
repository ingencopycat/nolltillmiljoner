const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{NTMIssuerRegistry:require('../ntm-product.js').registry,},document:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('company-evidence.js','utf8'),context);
const api=context.window.NTMCompanyEvidence;
const read=t=>JSON.parse(fs.readFileSync(`data/stocks/evidence/${t}.json`,'utf8'));
test('pilot sources validate and neutral revision comparison excludes same-day uncertainty',()=>{
 for(const t of ['NVDA','SOFI','CRWD']){const d=read(t);assert.equal(api.validate(d,t),d);assert.equal(api.since(d,'invalid').length,0);assert.equal(api.since(d,'2030-01-01T00:00:00Z').length,0);assert.ok(api.since(d,'2025-01-01T00:00:00Z').length);const day=d.events[0].filingDate;assert.equal(api.since(d,day+'T00:00:00Z').length,0);}
});
test('untrusted exhibit URLs and cross-company relationships fail closed',()=>{
 for(const mutation of [d=>d.events[0].primaryDocUrl='javascript:alert(1)',d=>d.cik='0000000001',d=>d.events.push(d.events[0]),d=>{const e=d.events.find(e=>e.documents.length);e.documents[0].url='https://evil.test/x.htm';},d=>{const e=d.events.find(e=>e.documents.length);e.documents[0].accessionNumber='0000000000-26-000001';}]){const d=read('NVDA');mutation(d);assert.throws(()=>api.validate(d,'NVDA'));}
});
