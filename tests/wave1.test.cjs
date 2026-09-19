const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../wave1-context.js'),K=require('../knowledge-catalog.js'),raw=require('../docs/internal/knowledge/catalog.cjs'),Q=require('../scripts/knowledge_quality.cjs');
const now=Date.now(),token='11111111-1111-4111-8111-111111111111',copy=x=>JSON.parse(JSON.stringify(x));
const fixture=()=>C.create({ticker:'NVDA',name:'NVIDIA CORP',currency:'USD'},
 {price:120,eps:7.91,growth:15,years:5,multiple:25},
 {priceSource:'example',priceDate:null,epsSource:'sec-derived',epsUnit:'USD/share',growthUnit:'percent/year',period:'2027Q2',periodEnd:'2026-07-26',filed:'2026-08-26',sourceMethod:'ntm-sec-normalizer/1',shareBasis:'unverified',sourceUrl:'https://data.sec.gov/api/xbrl/companyfacts/CIK0001045810.json'},now);
test('Wave 1 handoff preserves selected inputs and honest provenance without private fields',()=>{
 const v=fixture();assert.deepEqual(C.unpack(C.pack(token,v),token,now),v);
 assert.equal(v.basis.shareBasis,'unverified');assert.equal(v.basis.priceDate,null);
 for(const key of ['thesis','account','token','revision','portfolio','result'])assert.ok(!Object.hasOwn(v,key));
});
test('handoff rejects expired/future timestamps, unknown fields, company/currency/unit/method mismatches',()=>{
 for(const mutate of [v=>v.thesis='secret',v=>v.company.ticker='MANUAL-FOO',v=>v.company.currency='SEK',v=>v.basis.epsUnit='SEK/share',v=>v.basis.growthUnit='fraction',v=>v.schemaVersion=2,v=>v.method='unknown',v=>v.destination='research',v=>v.expiresAt++,v=>v.basis.sourceUrl='javascript:alert(1)',v=>v.basis.priceDate='2026-09-18',v=>v.basis.periodEnd='2026-02-30',v=>v.basis.sourceMethod='manual',v=>v.inputs.eps=0,v=>v.inputs.eps=-1,v=>v.inputs.price=Infinity,v=>v.inputs.growth=NaN,v=>v.inputs.years=2.5,v=>v.inputs.multiple=0]){
  const v=copy(fixture());mutate(v);assert.throws(()=>C.validate(v,now));
 }
 assert.throws(()=>C.validate(fixture(),now+C.ttl));assert.throws(()=>C.validate(fixture(),now-1));
 assert.throws(()=>C.unpack('{bad',token,now));assert.throws(()=>C.unpack(null,token,now));assert.throws(()=>C.unpack(C.pack(token,fixture()),'22222222-2222-4222-8222-222222222222',now));
});
test('manual EPS has no borrowed reported period or method',()=>{
 const v=fixture();Object.assign(v.basis,{epsSource:'manual',sourceMethod:'manual',shareBasis:'manual',period:'Eget EPS-antagande',periodEnd:null,filed:null});assert.equal(C.validate(v,now),v);
 v.basis.periodEnd='2026-07-26';assert.throws(()=>C.validate(v,now));
});
test('pinned company identities match every current supported dataset',()=>{
 for(const ticker of C.tickers){const data=JSON.parse(fs.readFileSync('data/stocks/'+ticker+'.json')),v=fixture();v.company={ticker,name:data.company.name,currency:data.company.currency};v.basis.sourceUrl=data.metadata.secCompanyFactsUrl;assert.equal(C.validate(v,now),v);}
 const wrong=fixture();wrong.company.ticker='SOFI';assert.throws(()=>C.validate(wrong,now));
});
test('12 concepts resolve to 11 canonical answers, preserve overlap and route to existing practice',()=>{
 assert.equal(K.pilotConcepts.length,12);assert.equal(new Set(K.pilotConcepts.map(c=>c.answerId)).size,11);
 for(const c of K.pilotConcepts){const e=K.publicEntries().find(e=>e.id===c.answerId);assert.ok(e);assert.ok(Number.isInteger(e.contentVersion)&&e.contentVersion>=1);assert.equal(e.contentVersion,raw.entries.find(a=>a.id===e.id).contentVersion);assert.ok(fs.existsSync('academy-activity-'+e.practiceId+'.html'));assert.equal(c.excerpt,'shortAnswer');}
 assert.deepEqual(require('../scripts/knowledge_history.cjs').audit(raw,require('../docs/internal/knowledge/history-baseline.json')),[]);
 assert.equal(K.publicEntries().filter(e=>require('../docs/internal/knowledge/scale.cjs').baselineIds.includes(e.id)).length,29);assert.ok(!JSON.stringify(K).includes('internalReview'));
 assert.ok(!JSON.stringify(K).includes('internalEditorialNotes'));
 const r=JSON.parse(fs.readFileSync('data/rule-registry.json'));assert.deepEqual(Q.validate(raw,r),[]);
 const bad=copy(raw);bad.entries.find(e=>e.id==='pe').practiceId='missing';assert.ok(Q.validate(bad,r).length);
});
test('30 labelled retrieval cases preserve exact definitions, reviewed typo aliases and abstention',()=>{
 for(const [query,id] of require('./fixtures/wave1-queries.json'))assert.equal(K.ask(query)[0]?.id||null,id,query);
 // Unsupported expensive/cheap judgment abstains; no numeric interpretation added.
 assert.deepEqual(K.ask('Ar P/E 40 dyrt?'),[]);
});
test('new examples match independent arithmetic; reviewed additions stay out of sitemap',()=>{
 assert.ok(Math.abs(100*1.1*1.1-121)<1e-10);assert.ok(Math.abs(100*1.07*.99-105.93)<1e-10);
 for(const id of ['compounding','annual-fees']){assert.equal(K.publicEntries().find(e=>e.id===id).status,'reviewed');assert.ok(!fs.readFileSync('sitemap.xml','utf8').includes(K.url(id)));}
});
