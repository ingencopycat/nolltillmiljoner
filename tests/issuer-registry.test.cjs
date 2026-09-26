const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../ntm-product.js').registry;
const canonical=JSON.parse(fs.readFileSync('data/issuer-registry.json','utf8'));
test('browser projection and all catalogs preserve canonical identity and order',()=>{
 assert.deepEqual(R.issuers,canonical.issuers);
 assert.deepEqual(R.tickers('financial'),['NVDA','SOFI','CRWD','MU','MRVL','VRT','COHR','RKLB','TTMI','SNDK','FLY','CRWV']);
 assert.deepEqual(R.tickers('evidence'),['NVDA','SOFI','CRWD']);assert.deepEqual(R.tickers('daily'),R.tickers('evidence'));
 assert.deepEqual(require('../research-entry.js').companies,R.catalog());
 assert.deepEqual(require('../ntm-relations.js').supportedTickers,R.tickers('financial'));
 const c={window:{NTMIssuerRegistry:R},document:{addEventListener(){}}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('research.js','utf8'),c);
 assert.deepEqual(Array.from(vm.runInContext('SUPPORTED_TICKERS',c)),R.tickers('financial'));
 assert(Object.isFrozen(R.issuers));assert(Object.isFrozen(R.get('SOFI')));
 assert.equal(R.get('UNKNOWN'),null);assert.equal(R.has('UNKNOWN','financial'),false);
 assert.equal(R.has('MU','financial'),true);assert.equal(R.has('MU','evidence'),false);assert.equal(R.has('MU','daily'),false);
 assert.equal(R.get('MU').evidence,'unavailable');assert.equal(R.get('SOFI').profile,'financial_services');
 assert.equal(R.has('NVDA','evidence'),true);assert.equal(R.has('NVDA','daily'),true);
});
test('evidence eligibility derives from injected contract, with identity and health still validated',()=>{
 const source=fs.readFileSync('company-evidence.js','utf8');
 const feed=JSON.parse(fs.readFileSync('data/stocks/evidence/NVDA.json','utf8'));
 function api(registry){const c={window:{NTMIssuerRegistry:registry},document:{}};vm.runInNewContext(source,c);return c.window.NTMCompanyEvidence;}
 assert.throws(()=>api(R).validate({...feed,ticker:'MU',cik:R.get('MU').cik},'MU'));
 assert.throws(()=>api(R).validate({...feed,cik:'0009999999'},'NVDA'));
 // Test-only enrollment exercises the real browser validator without a ticker-list edit.
 const future={has:(t,cap)=>t==='TEST'&&cap==='evidence',get:t=>t==='TEST'?{cik:feed.cik}:null};
 assert.doesNotThrow(()=>api(future).validate({...feed,ticker:'TEST',events:feed.events.map(e=>({...e,ticker:'TEST'}))},'TEST'));
 assert.equal(R.has('TEST','evidence'),false);
});
