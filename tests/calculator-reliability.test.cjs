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
function app(values = {}) {
  const nodes = new Map(Object.entries(values).map(([key,value]) => [key,element(value)]));
  const charts = [], saved = new Map();
  const context = vm.createContext({console, URLSearchParams, setTimeout(){},
    document: {getElementById(id){return nodes.get(id) || null;},
      querySelector(selector){return nodes.get(selector.slice(1)) || null;}, querySelectorAll(){return [];},
      createElement(){return element();}, addEventListener(){}, readyState:'loading', body:element()},
    getComputedStyle(){return {getPropertyValue(){return '';}};},
    Chart: function(canvas, config){charts.push(config); this.destroy = () => {};},
    location:{pathname:'/',search:''},
    localStorage:{getItem(key){return saved.has(key) ? saved.get(key) : null;},setItem(key,value){saved.set(key,value);}}
  });
  context.window = context;
  vm.runInContext(fs.readFileSync('valuation-core.js','utf8'),context);
  // Load the complete script, including later declarations and page-level wiring.
  vm.runInContext(process.env.NTM_BASELINE ? require('node:child_process').execFileSync('git',['show','HEAD:script.js'],{encoding:'utf8'}) : fs.readFileSync('script.js','utf8'),context);
  return {context,nodes,charts,saved};
}

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
