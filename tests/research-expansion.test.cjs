const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const tickers=['MU','MRVL','VRT','COHR','RKLB','TTMI','SNDK','FLY','CRWV'];
test('B78 publication, route, review queue and connected catalog allowlists agree',()=>{
 const R=require('../ntm-relations.js');
 assert.deepEqual([...R.supportedTickers].sort(),['NVDA','SOFI','CRWD',...tickers].sort());
 for(const file of ['research.js','min-review.js','ntm-product.js'])for(const t of tickers)assert.ok(fs.readFileSync(file,'utf8').includes("'"+t+"'"),file+': '+t);
 const html=fs.readFileSync('research.html','utf8');
 for(const t of tickers) assert.ok(require('../research-entry.js').companies.some(c=>c.ticker===t));
 assert.ok(!html.includes('research-company-card'));
 for(const t of ['AVEX','BULL','NBIS','TEM','GLXY','ASML'])assert.equal(R.supportedTickers.includes(t),false);
});
test('B78 actual data retains null EPS, source evidence, safe comparisons and explicit manual fallback',()=>{
 const c={window:{}};vm.createContext(c);for(const f of ['research-snapshot.js','change-detection.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
 for(const t of tickers){const data=JSON.parse(fs.readFileSync(`data/stocks/${t}.json`)),S=c.window.NTMResearchSnapshot;
 const snapshot=S.normalize({...S.fromStockData(data),ticker:t,capturedAt:'2026-09-15T23:00:00Z'});
 assert.equal(snapshot.ttmMetrics.eps,null);assert.ok(Number.isFinite(snapshot.ttmMetrics.revenue));
 assert.equal(S.comparable(snapshot,S.fromStockData(data),'dilutedShares').comparable,false);
 assert.equal(c.window.NTMChangeDetection.detect(snapshot,data).metrics.length,0);
 data.valuationBase.currency='SEK';assert.ok(c.window.NTMChangeDetection.detect(snapshot,data).blocked.length>0);
 assert.ok(snapshot.provenance.metrics.revenue.definition);assert.equal(snapshot.provenance.metrics.dilutedShares.shareBasis,null);
 }
});
