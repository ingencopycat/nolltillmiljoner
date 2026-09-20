const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function element(value = '') {
  return { value: String(value), style: {}, dataset: {}, children: [], handlers: {},
    classList: { add(){}, remove(){}, toggle(){} },
    setAttribute(key, value){this[key] = value;},
    addEventListener(type, fn){this.handlers[type] = fn;},
    querySelector(){return null;}, querySelectorAll(){return [];},
    appendChild(child){this.children.push(child);}, after(){}, prepend(){} };
}
function app(values = {}, attribution) {
  const nodes = new Map(Object.entries(values).map(([key,value]) => [key,element(value)]));
  const charts = [], saved = new Map();
  const context = vm.createContext({console, URL, URLSearchParams, setTimeout(){},
    document: {getElementById(id){return nodes.get(id) || null;},
      querySelector(selector){return nodes.get(selector.slice(1)) || null;}, querySelectorAll(){return [];},
      createElement(){return element();}, addEventListener(){}, readyState:'loading', body:element()},
    getComputedStyle(){return {getPropertyValue(){return '';}};},
    Chart: function(canvas, config){charts.push(config); this.destroy = () => {};},
    location:{pathname: attribution ? '/ranta-pa-ranta.html' : '/',search:attribution?.query || ''},
    localStorage:{getItem(key){return saved.has(key) ? saved.get(key) : null;},setItem(key,value){saved.set(key,value);}}
  });
  context.window = context;
  if (attribution) {
    context.document.referrer = attribution.referrer || '';
    vm.runInContext(fs.readFileSync('ntm-product.js','utf8'),context);
  }
  vm.runInContext(fs.readFileSync('valuation-core.js','utf8'),context);
  // Load the complete script, including later declarations and page-level wiring.
  vm.runInContext(process.env.NTM_BASELINE ? require('node:child_process').execFileSync('git',['show','HEAD:script.js'],{encoding:'utf8'}) : fs.readFileSync('script.js','utf8'),context);
  return {context,nodes,charts,saved};
}

test('completion uses canonical provenance before DOMContentLoaded without exposing calculation inputs', () => {
  for (const [query, source, cta, referrer] of [
    ['?from=home&via=home_calculator', 'home', 'home_calculator'],
    ['?from=content&via=ai_reverse', 'content', 'ai_reverse'],
    ['', 'direct_or_unknown'],
    ['?from=instagram&via=assumption', 'instagram', 'assumption'],
    ['?from=%3Cscript%3EPRIVATE%3C%2Fscript%3E&via=PRIVATE', 'direct_or_unknown'],
    ['?from=__proto__&via=constructor', 'direct_or_unknown'],
    ['?from=search', 'direct_or_unknown'],
    ['', 'search', undefined, 'https://www.google.com/search?q=PRIVATE']
  ]) {
    const {context:c} = app({}, {query: query + (query ? '&' : '?') + 'amount=918273&text=PRIVATE', referrer});
    // Use the real shared calculation state manager, before any DOM ready callback.
    vm.runInContext(`const completion = new CalcState({onCalculate:()=>({success:true, amount:918273, text:'PRIVATE'})}); completion.calculate();`, c);
    const events = JSON.parse(JSON.stringify(c.NTMEvents.snapshot()));
    assert.deepEqual(events, [{event:'calculator_completed',category:'tools',source,tool:'compound',
      ...(cta ? {cta} : {}),result:'success'}]);
    assert.doesNotMatch(JSON.stringify(events), /PRIVATE|918273|amount|text|referrer|url/);
  }
});

test('failed and incomplete calculations emit no completion event', () => {
  const {context:c} = app({}, {query:'?from=home&via=home_calculator'});
  for (const result of [false, null, undefined, 'Incomplete input', {success:false, error:'Invalid input'}]) {
    c.calculationResult=result;
    vm.runInContext('new CalcState({onCalculate:()=>calculationResult}).calculate()',c);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(c.NTMEvents.snapshot())), []);
});

test('FIRE fixed purchasing-power withdrawals and nominal inflation linkage match independent oracles',()=>{
 const c=app().context,close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
 const s=c.simulateFire({monthlyExpenses:1000,currentCapital:300000,monthlySavings:0,nominalReturn:2,inflation:2,withdrawalRate:4,currentAge:60});
 close(s.fireTarget,300000);close(s.realAnnualReturn,0);
 const post=c.buildPostFireProjection(s);
 close(post.series[12].value,288000);close(post.series[24].value,276000);
 close(post.series[24].withdrawal,1000);close(post.series[300].value,0);close(post.series[301].withdrawal,0);
 // Changing portfolio growth does not turn spending into a percentage of the balance.
 const growing=c.buildPostFireProjection({...s,realAnnualReturn:.12});
 close(growing.series[24].withdrawal,1000);
 const inputs={startCapital:1000000,monthlyWithdrawal:1000,nominalReturn:0,annualFee:0,inflation:12,inflationLinked:true};
 const nominal=c.simulateFireWithdrawal(inputs);
 close(nominal.series[12].withdrawal,1120);close(nominal.series[24].withdrawal,1254.4);
 const sum=Array.from({length:12},(_,i)=>1000*1.12**((i+1)/12)).reduce((a,b)=>a+b,0);
 close(nominal.series[12].value,1000000-sum);
 close(c.simulateFireWithdrawal({...inputs,inflationLinked:false}).series[24].value,976000);
});

test('comparison cards and chart use selected fees, month-end saving and nominal values in both modes',()=>{
 for(const mode of ['growth','dividend']) {
  const a=app({startkapital:10000,manadssparande:100,ar:2,avgift:1,inflation:9,
   'dividend-startkapital':20000,'dividend-manadssparande':200,'dividend-ar':3,'dividend-avgift':2,
   'dividend-inflation':8,scenarioGrid:'',scenarioChart:'',scenarioBasis:''});
  const tab=element();tab.dataset.mode=mode;a.nodes.set('mode-tab.active',tab);
  a.context.renderScenarioComparison();
  const start=mode==='growth'?10000:20000,saving=mode==='growth'?100:200,years=mode==='growth'?2:3,fee=mode==='growth'?.01:.02;
  const values=[7,10,20].map(rate=>{
   let value=start;const factor=((1+rate/100)*(1-fee))**(1/12);
   for(let m=0;m<years*12;m++)value=value*factor+saving;
   return value;
  });
  const chart=a.charts.at(-1);
  values.forEach((value,i)=>{
   assert.ok(Math.abs(chart.data.datasets[0].data[i]-value)<1e-6);
   assert.ok(a.nodes.get('scenarioGrid').innerHTML.includes(a.context.formatCurrency(value)));
  });
  assert.match(a.nodes.get('scenarioBasis').textContent,/nominellt slutvärde efter vald årlig avgift/);
  assert.match(a.nodes.get('scenarioBasis').textContent,/utan inflationsjustering/);
  assert.match(a.nodes.get('scenarioGrid').innerHTML,/20% · högt illustrativt scenario/);
  if(mode==='dividend')assert.match(a.nodes.get('scenarioBasis').textContent,/utdelningsmodellens.*ingår inte/);
  else assert.ok(Math.abs(values[0]-a.context.calculateProjection(start,saving,7,fee*100,years).futureValue)<1e-6);
 }
});

test('FIRE definition agrees across body, FAQ and structured data',()=>{
 const html=fs.readFileSync('fire-kalkylator.html','utf8');
 const definition='4 %-regeln är en historisk tumregel: första årets uttag är ungefär 4 % av portföljens värde vid pensionens början. Därefter justeras uttagsbeloppet för inflation, inte till 4 % av portföljens nya värde varje år. Det är ingen garanti.';
 assert.equal(html.split(definition).length-1,3);
 assert.match(html,/beloppet månadsvis från första månaden/);
 assert.doesNotMatch(html,/4 % av portföljen (i början av varje år|per år)/);
});

test('yearly compound path: hand oracle, constant parity, contributions, fee and loss boundaries',()=>{
 const c=app().context,close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
 const path=[50,25,40,-10,15];
 const r=c.calculateProjection(100,0,0,0,5,path);close(r.futureValue,271.6875);close(r.arithmetic,24);close(r.portfolioValues.at(-1),r.futureValue);
 close(c.calculateProjection(1000,100,7,.5,5,[7,7,7,7,7]).futureValue,c.calculateProjection(1000,100,7,.5,5).futureValue);
 const cash=c.calculateProjection(1000,100,0,0,2,[0,0]);close(cash.futureValue,3400);close(cash.totalInvested,3400);
 close(c.calculateProjection(100,0,0,1,2,[50,-50]).futureValue,75*.99*.99);
 close(c.calculateProjection(100,0,0,0,1,[-100]).futureValue,0);
 close(c.calculateProjection(100,10,0,0,1,[-100]).futureValue,10);
 assert.notEqual(c.calculateProjection(100,10,0,0,2,[50,-50]).futureValue,c.calculateProjection(100,10,0,0,2,[-50,50]).futureValue);
 for(const values of [[NaN],[Infinity],[-101],[]])assert.throws(()=>c.calculateProjection(100,0,0,0,1,values));
 assert.throws(()=>c.calculateProjection(100,0,0,0,100,Array(100).fill(1e300)));
});

test('yearly scenario records roundtrip and reject missing years; legacy scenarios remain valid',()=>{
 const c=app().context,inputs={'growth-yearly-mode':{type:'checkbox',checked:true},ar:{value:'2'},'growth-year-1':{value:'50'},'growth-year-2':{value:'-50'}};
 const saved=c.saveScenario('ranta-pa-ranta',{mode:'growth',name:'Path',inputs});assert.equal(saved.ok,true);assert.equal(c.getSavedScenarios('ranta-pa-ranta').scenarios[0].inputs['growth-year-2'].value,'-50');
 assert.equal(c.validYearlyScenario({inputs:{}}),true);delete inputs['growth-year-2'];assert.equal(c.saveScenario('ranta-pa-ranta',{mode:'growth',name:'Broken',inputs}).ok,false);
 const raw=JSON.stringify({version:1,calculators:{'ranta-pa-ranta':[{id:'bad',name:'bad',mode:'growth',createdAt:'2026-09-15',inputs}]}});assert.ok(c.readScenarioStore(raw).error);
});

test('quality boundaries: recovery zero, impossible and non-finite values; error replaces success state', () => {
  const a = app(), c = a.context;
  assert.equal(c.calculateRecoveryRequiredGain(0, 0).requiredGain, 0);
  assert.equal(c.calculateRecoveryRequiredGain(50, 1000).requiredGain, 100);
  for (const drop of [NaN, Infinity, -1, 100]) assert.throws(() => c.calculateRecoveryRequiredGain(drop, 100));
  for (const amount of [NaN, Infinity, -1]) assert.throws(() => c.calculateRecoveryRequiredGain(10, amount));
  assert.ok(Object.values(c.calculateRecoveryRequiredGain(99.999, 1e100)).every(Number.isFinite));
  c.testForm = element(); c.testContainer = element(); c.callback = () => true;
  const state = vm.runInContext('new CalcState({container:testContainer,form:testForm,onCalculate:()=>callback()})',c);
  state.calculate(); state.handleInputChange(); assert.equal(state.state,'stale');
  c.callback = () => '<img src=x onerror=alert(1)>';
  state.calculate(); assert.equal(state.state,'error');
  assert.equal(c.testContainer['data-calc-state'],'error');
  assert.match(state.statusBanner.textContent, /<img/);
  c.callback = () => true; state.calculate(); assert.equal(state.state,'calculated');
});

test('leverage explanation oracle: same returns reordered, volatility drag and zero absorption', () => {
  const a=app({'daily-startbelopp':100,'daily-havstang':3,'daily-avgift':0});
  const moves=[element(10),element(-10)], container=element(); container.querySelectorAll=()=>moves;
  a.nodes.set('daily-moves-container',container);
  for(const id of ['daily-underlying-value','daily-underlying-return','daily-leverage-label','daily-leveraged-value','daily-leveraged-return','daily-total-fees','daily-leverage-table-body','dailyLeverageChart']) a.nodes.set(id,element());
  for (const returns of [[10,-10],[-10,10]]) {
    returns.forEach((v,i)=>moves[i].value=v);
    assert.equal(a.context.calculateDailyLeverage(),true);
    const series=a.charts.at(-1).data.datasets;
    assert.ok(Math.abs(series[0].data.at(-1)-99)<1e-10);
    assert.ok(Math.abs(series[1].data.at(-1)-91)<1e-10);
  }
  moves[0].value=-40; moves[1].value=100;
  assert.equal(a.context.calculateDailyLeverage(),true);
  assert.equal(a.charts.at(-1).data.datasets[1].data.at(-1),0);
  moves[0].value=1e308; const count=a.charts.length;
  assert.equal(typeof a.context.calculateDailyLeverage(),'string'); assert.equal(a.charts.length,count);
});

test('content allows only inert formatting and HTTPS links; rule parameters match executable constants', () => {
  const c=app().context;
  assert.equal(c.constrainPostMarkup('<strong>safe</strong>'),'<strong>safe</strong>');
  for(const attack of ['<img src=x onerror=alert(1)>','<svg/onload=alert(1)>','<script>alert(1)</script>','<p onclick="x()">x</p>','<a href="javascript:alert(1)">x</a>','&lt;img src=x onerror=x&gt;']) {
    assert.doesNotMatch(c.constrainPostMarkup(attack), /<(?:img|svg|script|a\b|p\s)/i);
  }
  for(const url of ['javascript:alert(1)','data:text/html,x','//evil.test','https://user:pass@example.com']) assert.equal(c.safePostLink(url),'#');
  assert.equal(c.safePostLink('https://example.com/'),'https://example.com/');
  for(const rule of JSON.parse(fs.readFileSync('data/rule-registry.json','utf8')).rules){
    const actual=vm.runInContext(rule.id==='isk'?'ISK_TAX_RULES[2026]':'MORTGAGE_RULES',c);
    for(const [key,value] of Object.entries(rule.parameters)) assert.deepEqual(JSON.parse(JSON.stringify(actual[key])),value);
  }
});

test('independent monthly cash-flow oracle, fee monotonicity, FX identity and margins', () => {
  const c = app().context;
  // 1% monthly growth, twelve end-of-month deposits: use a recurrence, not the closed formula.
  const annual = 12.682503013196978;
  let expected = 1000;
  for(let month=0;month<12;month++) expected = expected * 1.01 + 100;
  assert.ok(Math.abs(c.calculateProjection(1000,100,annual,0,1).futureValue-expected)<1e-8);
  assert.equal(c.calculateProjection(1000,100,0,0,2).futureValue,3400);
  assert.ok(c.calculateProjection(1000,100,10,2,20).futureValue < c.calculateProjection(1000,100,10,1,20).futureValue);
  for(const rate of [-100,-50,0,10,100]) {
    const result = c.calculateCurrencyAdjustedReturn({investmentReturnPct:rate,purchaseFx:10,currentFx:10,amount:1000});
    assert.ok(Math.abs(result.adjReturnPct-rate)<1e-10);
  }
  const fx = c.calculateCurrencyAdjustedReturn({investmentReturnPct:20,purchaseFx:10,currentFx:8,amount:1000});
  assert.ok(Math.abs(fx.amountDetails.actualFinalValue-960)<1e-10);
  vm.runInContext(fs.readFileSync('research-snapshot.js','utf8'),c);
  const metrics=c.NTMResearchSnapshot.normalize({ttmMetrics:{revenue:200,netIncome:-20,fcf:50}}).ttmMetrics;
  assert.equal(metrics.netMargin,-10); assert.equal(metrics.fcfMargin,25);
});

test('loaded leverage callback submits through CalcState and renders real table/chart', () => {
  const a = app({'daily-startbelopp':1000,'daily-havstang':2,'daily-avgift':0});
  const moves = [element(-10),element(10)];
  const container = element(); container.querySelectorAll = () => moves;
  a.nodes.set('daily-moves-container',container);
  for(const id of ['daily-underlying-value','daily-underlying-return','daily-leverage-label','daily-leveraged-value','daily-leveraged-return','daily-total-fees','daily-leverage-table-body','dailyLeverageChart']) a.nodes.set(id,element());
  a.context.testForm = element(); a.context.testContainer = element();
  const state = vm.runInContext('new CalcState({container:testContainer, form:testForm, onCalculate:calculateDailyLeverage})',a.context);
  const submit = () => a.context.testForm.handlers.submit({preventDefault(){}});
  submit();
  assert.equal(state.state,'calculated'); assert.equal(state.statusBanner.hidden,false);
  assert.equal(a.nodes.get('daily-leverage-table-body').children.length,3);
  assert.equal(a.charts[0].data.datasets[1].data.at(-1),960);
  for(const [id,value] of [['daily-startbelopp',0],['daily-havstang',0],['daily-havstang',''],['daily-avgift',-1]]){
    const node = a.nodes.get(id), previous = node.value; node.value = String(value);
    a.context.testForm.handlers.input(); const count = a.charts.length; submit();
    assert.equal(state.statusBanner.hidden,false); assert.equal(a.charts.length,count);
    node.value = previous; submit(); assert.equal(state.statusBanner.hidden,false);
  }
  moves[0].value = ''; submit(); assert.equal(state.statusBanner.hidden,false);
});

test('loaded compound form uses finite chart series agreeing with the main result', () => {
  const a = app({'calculator-form':'','growth-mode-panel':'','startkapital':10000,'manadssparande':500,
    avkastning:0,avgift:0,inflation:0,ar:10,slutvarde:'','insatt-kapital':'','avkastning-resultat':'',
    'dagens-varde':'','avgifter-totalt':'',investmentChart:''});
  for(const [rate,fee] of [[0,0],[25,20],[8,1],[-5,1],[-100,0]]){
    a.nodes.get('avkastning').value = rate; a.nodes.get('avgift').value = fee;
    a.nodes.get('calculator-form').handlers.submit({preventDefault(){}});
    const chart = a.charts.at(-1);
    for(const dataset of chart.data.datasets) assert.ok(dataset.data.every(Number.isFinite));
    const result = a.context.calculateProjection(10000,500,rate,fee,10);
    assert.equal(chart.data.datasets[0].data.at(-1),result.futureValue);
    assert.equal(a.nodes.get('slutvarde').textContent,a.context.formatCurrency(result.futureValue));
    let expected = 10000, monthly = Math.pow((1+rate/100)*(1-fee/100),1/12)-1;
    for(let month=0;month<120;month++) expected=expected*(1+monthly)+500;
    assert.ok(Math.abs(expected-result.futureValue)<1e-6);
  }
});

test('scenario corruption and unsupported shapes block every write and retain raw recovery data', () => {
  const a = app(), api = a.context.NTMScenarioStorage, key = api.key;
  const scenario = {name:'Test',mode:'growth',inputs:{}};
  for(const raw of ['{broken','', 'null','{"version":2,"calculators":{}}','{"version":1,"calculators":null}',
    '{"version":1,"calculators":[]}','{"version":1,"calculators":{"growth":{}}}',
    '{"version":1,"calculators":{"growth":[null]}}']){
    a.saved.set(key,raw);
    assert.equal(api.save('growth',scenario).ok,false);
    assert.equal(api.remove('growth','missing').ok,false);
    assert.equal(a.saved.get(key),raw); assert.equal(api.read().raw,raw);
    assert.ok(api.get('growth').error);
  }
  a.saved.delete(key);
  const saved = api.save('growth',scenario); assert.equal(saved.ok,true);
  let store = JSON.parse(a.saved.get(key)); store.extension = {keep:42};
  store.calculators.growth[0].unknown = 'preserved'; a.saved.set(key,JSON.stringify(store));
  const second = api.save('growth',scenario); assert.equal(second.ok,true);
  assert.equal(api.remove('growth',second.scenario.id).ok,true);
  store = JSON.parse(a.saved.get(key)); assert.equal(store.extension.keep,42);
  assert.equal(store.calculators.growth[0].unknown,'preserved');
  const before = a.saved.get(key);
  a.context.localStorage.setItem = () => {throw new Error('QuotaExceededError');};
  for(const result of [api.save('growth',scenario),api.remove('growth',saved.scenario.id)]){
    assert.equal(result.ok,false); assert.match(result.error,/full eller blockerad/);
  }
  assert.equal(a.saved.get(key),before);
  a.context.localStorage.getItem = () => {throw new Error('SecurityError');};
  assert.equal(api.save('growth',scenario).ok,false);
  assert.equal(api.remove('growth',saved.scenario.id).ok,false);

  // A store can become corrupt after the UI has already populated its selection.
  const b = app(), storage = b.context.NTMScenarioStorage;
  const selected = storage.save('growth',scenario).scenario;
  for(const id of ['saved-scenario-select','save-scenario','load-scenario','delete-scenario','saved-scenario-name','saved-scenario-status']) b.nodes.set(id,element());
  b.context.initSavedScenarios({calculatorId:'growth',modeLabels:{growth:'Growth'},
    getActiveMode:()=> 'growth',getModeForm:()=>null,getTrackedStates:()=>[]});
  b.nodes.get('saved-scenario-select').value=selected.id;
  b.nodes.get('saved-scenario-name').value='New scenario';
  b.saved.set(storage.key,'{broken');
  for(const button of ['save-scenario','delete-scenario']){
    b.nodes.get(button).handlers.click();
    assert.match(b.nodes.get('saved-scenario-status').textContent,/blockerade/);
    assert.equal(b.saved.get(storage.key),'{broken');
  }
});


test('FIRE stress examples remain finite and reject zero/extreme rates', () => {
  const c = app().context;
  assert.deepEqual(Array.from(c.fireStressRows(25000,4),r=>r.capital),[10000000,7500000,6000000]);
  for (const rate of [0,-1,101,Infinity,NaN]) assert.equal(c.fireStressRows(25000,rate).length,0);
  assert.equal(c.fireStressRows(25000,0.5)[0].capital,null);
  assert.equal(c.fireStressRows(25000,100)[2].capital,null);
  assert.ok(c.fireStressRows(1e308,4).every(r=>r.capital===null));
});

test('GAV optional conversion cost is included once and zero keeps the original result',()=>{
  const a=app({'gav-currency':'SEK','gav-existing-shares':100,'gav-current-average':50,'gav-new-shares':40,'gav-new-price':35,'gav-brokerage':0,'gav-currency-cost':0});
  for(const id of ['gav-average-result','gav-shares-result','gav-invested-result','gav-new-money-result','gav-change-result']) a.nodes.set(id,element());
  assert.equal(a.context.calculateGavMode(),true);
  assert.equal(a.nodes.get('gav-invested-result').textContent,a.context.formatPurchaseCurrency(6400,'SEK'));
  a.nodes.get('gav-brokerage').value='10';a.nodes.get('gav-currency-cost').value='20';
  assert.equal(a.context.calculateGavMode(),true);
  assert.equal(a.nodes.get('gav-invested-result').textContent,a.context.formatPurchaseCurrency(6430,'SEK'));
  assert.equal(a.nodes.get('gav-average-result').textContent,a.context.formatPurchaseCurrency(6430/140,'SEK'));
  a.nodes.get('gav-currency-cost').value='-1';assert.equal(typeof a.context.calculateGavMode(),'string');
});


test('FX teaching example compounds to eight percent and unchanged FX preserves asset return',()=>{
  const c=app().context;
  const result=c.calculateCurrencyAdjustedReturn({investmentReturnPct:20,purchaseFx:10,currentFx:9,amount:10000});
  assert.ok(Math.abs(result.amountDetails.actualFinalValue-10800)<1e-9);
  const unchanged=c.calculateCurrencyAdjustedReturn({investmentReturnPct:20,purchaseFx:10,currentFx:10,amount:10000});
  assert.ok(Math.abs(unchanged.amountDetails.actualFinalValue-12000)<1e-9);
});


test('homepage earnings selects the date week, not insertion order, with no priority exclusion',()=>{
  const a=app(),c=a.context;
  vm.runInContext(fs.readFileSync('data/weekly-events.js','utf8'),c);
  const weeks=c.NTM_WEEKLY_EVENTS.earningsWeeks;
  c.NTM_WEEKLY_EVENTS.earningsWeeks={'2026-W37':weeks['2026-W37'],'2026-W38':weeks['2026-W38']};
  const current=c.getWeeklyRecords(new Date('2026-09-14T12:00:00Z'));
  assert.equal(current.earningsAvailable,true);
  assert.deepEqual(Array.from(current.earnings.filter(e=>e.date==='2026-09-14'),e=>e.ticker),['RFIL','HAIN','HITI','PLAY','HYFT','KMTS']);
  assert.ok(c.getWeeklyRecords(new Date('2026-09-08T12:00:00Z')).earnings.some(e=>e.priority==='low'));
  assert.equal(c.getWeeklyRecords(new Date('2026-09-21T12:00:00Z')).earningsAvailable,false);
  assert.equal(c.getWeeklyRecords(new Date('2026-09-13T22:30:00Z')).earnings[0].date,'2026-09-14'); // Stockholm Monday
  assert.equal(c.getWeeklyWeekKey('2027-01-01'),'2026-W53');
  assert.equal(c.getWeeklyWeekKey('2027-01-04'),'2027-W01');
  for(const id of ['ntmMacroList','ntmEarningsList']) { const el=element();el.closest=()=>null;a.nodes.set(id,el); }
  c.renderWeeklyEvents(new Date('2026-09-14T12:00:00Z'));
  const html=a.nodes.get('ntmEarningsList').innerHTML;
  assert.match(html,/Visa 3 rapporter till/);assert.match(html,/KMTS/);assert.equal((html.match(/class="ntm-event-item"/g)||[]).length,6);
  c.renderWeeklyEvents(new Date('2026-09-18T12:00:00Z'));
  assert.match(a.nodes.get('ntmEarningsList').innerHTML,/Inga bolagsrapporter i kalendern idag/);
  c.renderWeeklyEvents(new Date('2026-09-21T12:00:00Z'));
  assert.match(a.nodes.get('ntmEarningsList').innerHTML,/veckan saknas/);
  c.NTM_WEEKLY_EVENTS={earnings:[{date:'2026-09-14',ticker:'SMALL',priority:'low'}]};
  c.renderWeeklyEvents(new Date('2026-09-14T12:00:00Z'));
  assert.match(a.nodes.get('ntmEarningsList').innerHTML,/SMALL/);
  assert.doesNotMatch(a.nodes.get('ntmEarningsList').innerHTML,/ntm-earnings-more/);
});

test('latest published earnings image has matching structured records for every day',()=>{
  const c=app().context;
  vm.runInContext(fs.readFileSync('data/weekly-events.js','utf8'),c);
  vm.runInContext(fs.readFileSync('week-pages.js','utf8').split('const archiveContainer')[0]+';window.imageWeeks=earningsWeekData;',c);
  const latest=Object.keys(c.imageWeeks).sort().at(-1),week=c.NTM_WEEKLY_EVENTS.earningsWeeks[latest];
  assert.ok(week && Array.isArray(week.reports),'Publish homepage earnings records with every new weekly image');
  c.imageWeeks[latest].schedule.forEach((text,index)=>{
    const tickers=Array.from(text.matchAll(/(?<![\p{L}\p{N}])[A-Z][A-Z0-9.-]*(?![\p{L}\p{N}])/gu),m=>m[0].replace(/\.$/,''));
    const records=Array.from(week.reports.filter(r=>new Date(r.date+'T12:00:00Z').getUTCDay()===index+1),r=>r.ticker);
    assert.deepEqual(records.sort(),tickers.sort(),`${latest}, day ${index+1}: image and homepage must agree`);
  });
});
