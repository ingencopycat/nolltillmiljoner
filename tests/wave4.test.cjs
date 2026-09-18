const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../fundamental-profile'),C=require('../research-continuity'),Calendar=require('../calendar-context');
const clone=x=>JSON.parse(JSON.stringify(x)),stock=t=>JSON.parse(fs.readFileSync(`data/stocks/${t}.json`)),statement=(d,k)=>P.build(d).statements.find(s=>s.dimension===k);
const ctx={window:{}};vm.createContext(ctx);for(const f of ['research-snapshot.js','change-detection.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);const S=ctx.window.NTMResearchSnapshot,D=ctx.window.NTMChangeDetection;
test('pilot datasets retain original data; all statements expose versioned evidence and all share bases remain unavailable',()=>{
 for(const ticker of ['NVDA','SOFI','CRWD','CRWV','FLY']){const d=stock(ticker),before=JSON.stringify(d),p=P.build(d);assert.equal(JSON.stringify(d),before);assert.deepEqual(p,P.build(d));assert.equal(p.statements.length,7);
  for(const s of p.statements){assert.equal(s.methodVersion,'ntm-fundamental/1');assert.ok(s.comparisonBasis);assert.equal(s.status==='available',s.eligibility.eligible);assert.ok(s.evidence.every(e=>Object.hasOwn(e,'fact')));if(!s.eligibility.eligible){assert.ok(s.eligibility.reason);assert.equal(s.calculation,null);}}
  assert.equal(statement(d,'perShare').status,'unavailable');
 }
 assert.equal(statement(stock('NVDA'),'growth').status,'available');assert.equal(statement(stock('SOFI'),'cash').status,'unavailable');assert.equal(statement(stock('SOFI'),'profitability').status,'unavailable');
 for(const ticker of ['CRWV','FLY'])assert.equal(statement(stock(ticker),'momentum').status,'unavailable');
});
test('positive annual revenue and margin math agree with independent constants',()=>{
 const d=stock('NVDA');assert.ok(Math.abs(statement(d,'growth').calculation.value-65.47353579009479)<1e-8);
 const m=statement(d,'profitability');assert.equal(m.calculation.unit,'procentenheter');assert.ok(Math.abs(m.calculation.values[1]-130387/215938*100)<1e-10);
 assert.equal(m.evidence.length,4);
});
test('adversarial evidence fails closed across period, definition, source, units, base and quality boundaries',()=>{
 const cases=[
  ['negative base','growth',d=>d.annual.at(-2).metrics.revenue.value=-1],['zero base','growth',d=>d.annual.at(-2).metrics.revenue.value=0],
  ['missing base','growth',d=>delete d.annual.at(-2).metrics.revenue],['mixed quarter','growth',d=>d.annual.at(-1).metrics.revenue.periodType='quarterly'],
  ['mixed TTM','growth',d=>d.annual.at(-1).metrics.revenue.periodType='TTM'],['duration','growth',d=>d.annual.at(-1).metrics.revenue.periodStart='2025-02-27'],
  ['currency','growth',d=>d.annual.at(-1).metrics.revenue.currency='SEK'],['definition','growth',d=>d.annual.at(-1).metrics.revenue.definition='other'],
  ['invalid common unit','growth',d=>d.annual.forEach(r=>r.metrics.revenue.unit='USD/shares')],
  ['malformed unit','growth',d=>d.annual.at(-1).metrics.revenue.unit=17],['null observation','growth',d=>d.annual[1]=null],
  ['overflow','growth',d=>d.annual.at(-2).metrics.revenue.value=1e-310],['margin overflow','profitability',d=>d.annual.at(-2).metrics.revenue.value=1e-310],
  ['invalid ISO date','balance',d=>{const r=d.annual.at(-1);r.periodStart='2025-02-30';Object.values(r.metrics).forEach(m=>m.periodStart=r.periodStart);} ],
  ['duplicate periods','growth',d=>d.annual.push(clone(d.annual.at(-1)))],['row mismatch','growth',d=>d.annual.at(-1).period='FY2099'],
  ['missing source','growth',d=>delete d.annual.at(-1).metrics.revenue.accession],['derived confusion','growth',d=>d.annual.at(-1).metrics.revenue.kind='derived'],
  ['missing margin','profitability',d=>delete d.annual.at(-1).metrics.operatingIncome],['financial profile','profitability',d=>d.metadata.profile='financial_services'],
  ['missing cash component','cash',d=>delete d.annual.at(-1).metrics.capex],['FCF withheld','cash',d=>d.annual.at(-1).metrics.freeCashFlow.unsupported=true],
  ['cash reconciliation','cash',d=>d.annual.at(-1).metrics.freeCashFlow.value++],['missing balance','balance',d=>delete d.annual.at(-1).metrics.debt],
  ['split','growth',d=>d.annual.at(-1).metrics.revenue.split=true],['restatement','growth',d=>d.annual.at(-1).metrics.revenue.restated=true],
  ['insufficient history','momentum',d=>d.annual.shift()],['missing observation','growth',d=>d.annual.splice(1,1)],['unknown profile','growth',d=>d.metadata.profile='unknown']
 ];
 for(const [label,dimension,mutate] of cases){const d=stock('NVDA');mutate(d);assert.equal(statement(d,dimension).status,'unavailable',label);}
});
function r6(){const d=stock('NVDA');for(const [i,row] of d.annual.slice(-2).entries()){
 const m=row.metrics;Object.assign(m.netIncomeToCommon,{value:i?150:100});Object.assign(m.dilutedEps,{value:i?1.2:1,shareBasis:'weighted_average_diluted',shareBasisStatus:'verified'});Object.assign(m.dilutedShares,{value:i?125:100,shareBasis:'weighted_average_diluted',shareBasisStatus:'verified'});
 }return d;}
test('R6 shows reproducible corresponding profit/EPS rates only with verified weighted share basis',()=>{
 const d=r6(),s=statement(d,'perShare');assert.equal(s.status,'available');assert.ok(Math.abs(s.calculation.values[0]-50)<1e-10);assert.ok(Math.abs(s.calculation.values[1]-20)<1e-10);assert.match(s.text,/växer snabbare/);
 for(const mutate of [d=>d.annual.at(-1).metrics.dilutedShares.shareBasis='current_shares',d=>d.annual.at(-1).metrics.dilutedShares.concept='EntityCommonStockSharesOutstanding',d=>d.annual.at(-1).metrics.dilutedEps.shareBasisStatus='unverified',d=>d.annual.at(-1).metrics.dilutedEps.value=9,d=>d.annual.at(-2).metrics.netIncomeToCommon.value=0,d=>d.annual.at(-2).metrics.netIncomeToCommon.value=-10,d=>d.annual.at(-1).metrics.dilutedShares.split=true,d=>d.annual.at(-1).metrics.dilutedEps.restated=true,d=>d.annual.at(-1).metrics.dilutedEps.period='FY2020']){const f=r6();mutate(f);assert.equal(statement(f,'perShare').status,'unavailable');}
});
test('R12 source accession/value/version/correction changes are reconstructable and timestamp churn is ignored',()=>{
 const d=stock('NVDA'),old=S.fromStockData(d),frozen=JSON.stringify(old);
 const fresh=clone(d);fresh.metadata.fetchedAt='2099-01-01';fresh.metadata.generatedAt='2099-01-01';assert.equal(D.detect(old,fresh).corrections.length,0);
 for(const mutate of [m=>m.inputs[0].accession='corrected-accession',m=>m.inputs[0].value++,m=>m.inputs[0].sourceVersion='2',m=>m.inputs[0].correction='formal-erratum-1']){
  const n=clone(d);mutate(n.ttm.metrics.revenue);const report=D.detect(old,n);assert.equal(report.corrections.length,1);const c=report.corrections[0];assert.ok(c.old&&c.current&&c.period&&c.fingerprint);assert.equal(JSON.stringify(old),frozen);
  const thesis={ticker:'NVDA',assumptionDetails:[],reportQuestions:[]},reasons=C.reasons(thesis,report,'2026-09-18',true),r=reasons.find(r=>r.type==='correction');assert.ok(r);assert.ok(!C.reasons(thesis,report).some(r=>r.type==='correction'));
  thesis.review={changeKey:C.reviewKey(thesis,[r.key])};assert.ok(!C.reasons(thesis,report,'2026-09-18',true).some(r=>r.type==='correction'));
  n.ttm.metrics.revenue.inputs[0].accession='another-correction';assert.ok(C.reasons(thesis,D.detect(old,n),'2026-09-18',true).some(r=>r.type==='correction'));
 }
 const reordered=clone(d);reordered.ttm.metrics.revenue.inputs.reverse();assert.equal(D.detect(old,reordered).corrections.length,0);
 const annual=clone(d);annual.annual.at(-1).metrics.revenue.accession='annual-correction';const report=D.detect(old,annual);assert.equal(report.corrections.length,1);assert.equal(report.corrections[0].metric,'annual:revenue');
 const legacy=clone(old);delete legacy.provenance.fundamental;assert.equal(D.detect(legacy,annual).corrections.length,0,'Never backfill legacy annual evidence');
 const normalized=S.normalize(old);assert.equal(JSON.stringify(normalized.provenance.fundamental),JSON.stringify(old.provenance.fundamental));
});
test('calendar context distinguishes unknown/revised/first-reported and zero actual without manufacturing consensus',()=>{
 const e={eventName:'CPI',actual:0,previous:2,forecast:null,date:'2026-09-18',time:'23:30',timezone:'America/New_York',swedishDate:'2026-09-19',fieldProvenance:{actual:{kind:'reported'}}};
 assert.match(Calendar.macro(e).state,/Utfall finns från/);assert.match(Calendar.macro(e).previous,/okänt/);assert.equal(Calendar.macro(e).concept,'macro-releases');assert.equal(e.forecast,null);assert.match(Calendar.macro(e).time,/2026-09-19/);
 e.isRevised=true;e.actualFirstReported=1;e.previousFirstReported=3;e.fieldProvenance.previous={revisionStatus:'revised'};assert.match(Calendar.macro(e).revision,/ursprungligt utfall 1/);assert.match(Calendar.macro(e).previous,/Ursprungligt: 3/);
 e.fieldProvenance.previous.revisionStatus='first_reported';assert.match(Calendar.macro(e).previous,/första publiceringen/);e.actual=null;assert.match(Calendar.macro(e).state,/utfall saknas/);
 assert.match(Calendar.earnings('2026-W53',new Date('2026-12-28')),/2026-12-28–2027-01-03/);
});
