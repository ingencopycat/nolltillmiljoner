const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const clone = (value) => JSON.parse(JSON.stringify(value));
const stock = (ticker = 'NVDA') => JSON.parse(read(`data/stocks/${ticker}.json`));
const key = 'investment-research-theses-v1';

test('standalone and Research valuation adapters agree with a hand-calculated oracle', () => {
  const c=app().context;
  const scenario=c.calculateStockScenario(80,4,25,2,20);
  assert.equal(scenario.futureEPS,6.25); assert.equal(scenario.targetPrice,125);
  assert.equal(c.calculateRequiredFuturePrice(80,4,25,2,20),125);
  assert.equal(c.calculateRequiredFutureEPS(80,4,25,2,20),6.25);
  assert.equal(c.calculateRequiredEpsCAGR(80,4,25,2,20),25);
  for(const price of [0,NaN,Infinity]) {
    assert.equal(c.calculateStockScenario(price,4,25,2,20).cagr,null);
    assert.equal(c.calculateRequiredEpsCAGR(price,4,25,2,20),null);
  }
});

test('comparability gate blocks incompatible evidence consistently in Change Detection and Outcomes', () => {
  const a = app(), c = a.context;
  const data = stock();
  for (const m of Object.values(data.ttm.metrics)) m.shareBasis = 'test-only-verified-basis';
  const before = c.NTMResearchSnapshot.normalize({ ...c.NTMResearchSnapshot.fromStockData(data), ticker: 'NVDA' });
  const original = JSON.stringify(before);
  const current = clone(data); current.ttm.metrics.dilutedEps.value *= 1.2;
  assert.equal(c.NTMChangeDetection.detect(before, current).metrics.length, 1);
  const compare = (snapshot, live, metric = 'eps') => {
    const gate = c.NTMResearchSnapshot.comparable(snapshot, c.NTMResearchSnapshot.fromStockData(live), metric);
    const observation = { currentSnapshot: c.NTMResearchSnapshot.fromStockData(live), observedAt: '2026-09-13' };
    const outcome = c.NTMResearchOutcomes.compare({ valuationSnapshot: snapshot }, observation).metrics.find((m) => m.key === metric);
    const report = c.NTMChangeDetection.detect(snapshot, live);
    assert.equal(outcome.pct, null);
    assert.equal(outcome.reason, gate.reason);
    assert.ok(report.blocked.some((m) => m.reason === gate.reason));
    return gate.reason;
  };
  const cases = [
    [d => d.valuationBase.currency = 'SEK', /valuta/],
    [d => d.ttm.metrics.dilutedEps.shareBasis = 'split', /aktiebasen/],
    [d => d.ttm.metrics.dilutedEps.periodStart = '2026-07-01', /period/],
    [d => d.ttm.metrics.dilutedEps.definition = 'different', /definition/],
    [d => d.ttm.metrics.dilutedEps.unit = 'SEK\/shares', /enhet/],
    [d => d.ttm.metrics.dilutedEps.kind = 'manual', /källa/],
    [d => d.ttm.metrics.dilutedEps.restated = true, /omräkning/],
    [d => d.ttm.metrics.dilutedEps.inputs[0].value += 1, /omräkning/],
    [d => d.metadata.methodVersion = 'future', /metod/],
    [d => d.ttm.metrics.dilutedEps.quartersIncluded.pop(), /kvartals/],
  ];
  for (const [mutate, reason] of cases) { const live = clone(current); mutate(live); assert.match(compare(before, live), reason); }
  const legacy = clone(before); delete legacy.provenance;
  assert.match(compare(legacy, current), /metadata/);
  assert.equal(c.NTMResearchSnapshot.normalize(legacy).ttmMetrics.eps, before.ttmMetrics.eps);
  assert.equal(c.NTMResearchSnapshot.normalize(legacy).provenance, undefined);
  const priced = clone(before); priced.valuationInputs.stockPrice = 100;
  const observation = { currentSnapshot: c.NTMResearchSnapshot.fromStockData(current),
    observedAt: '2026-09-13', manualPrice: { value: 120, currency: 'USD', source: 'manual' } };
  assert.ok(Math.abs(c.NTMResearchOutcomes.compare({ valuationSnapshot: priced }, observation).priceReturnPct - 20) < 1e-10);
  observation.currentSnapshot.provenance.metrics.dilutedShares.shareBasis = null;
  assert.equal(c.NTMResearchOutcomes.compare({ valuationSnapshot: priced }, observation).priceReturnPct, null);
  assert.equal(observation.manualPrice.value, 120);
  assert.equal(JSON.stringify(before), original);
});
function comparisonBaseline(c, metrics) {
  return c.NTMResearchSnapshot.normalize({ ...c.NTMResearchSnapshot.fromStockData(stock()), ttmMetrics: metrics });
}
function testProvenance(c, end) {
  const p = clone(c.NTMResearchSnapshot.fromStockData(stock()).provenance);
  for (const metric of Object.values(p.metrics)) {
    metric.periodStart = end.slice(0, 4) + '-01-01'; metric.periodEnd = end;
    metric.quartersIncluded = [1, 2, 3, 4].map((q) => end.slice(0, 4) + 'Q' + q);
    metric.shareBasis = 'synthetic-test-adjusted-basis';
  }
  return p;
}


function restorationFixture(snapshot) {
  const a = app(new Map([[key, JSON.stringify({ version: 1, theses: { NVDA: {
    text: 'Historical thesis', createdAt: '2024-04-01', valuationSnapshot: snapshot,
  } } })]]));
  const data = stock();
  const historical = a.context.NTMThesisStorage.get('NVDA').thesis.latestRevisionId;
  a.save(data);
  a.context.selectThesisRevision(historical, data);
  return { ...a, data, historical, restore: () => a.nodes.get('revisionRestoreBtn').onclick() };
}

const restoreSnapshot = () => ({
  schemaVersion: 2, asOfPeriod: '2024Q1',
  valuationInputs: { stockPrice: 81, requiredReturn: 12, years: 7, exitPE: 30, epsSource: 'sec', epsBasis: 999 },
  valuationResults: { peRatio: 987, requiredFutureEPS: 654, requiredFuturePrice: 321 },
  ttmMetrics: { eps: 999, revenue: 999 },
  scenarios: Object.fromEntries(['bear', 'base', 'bull'].map((name, i) => [name,
    { growth: 3 + i * 10, exitPE: 16 + i * 10, futureEPS: 999, futurePrice: 888, cagr: 777 }])),
});

test('restore historical assumptions only; preserve storage, fundamentals, text, outputs and baseline', () => {
  const a = restorationFixture(restoreSnapshot());
  const before = a.saved.get(key), dataBefore = JSON.stringify(a.data);
  const baseline = a.nodes.get('changeBaselineLabel').textContent;
  const output = a.nodes.get('rev-future-price-result').textContent;
  let writes = 0;
  const setItem = a.context.localStorage.setItem;
  a.context.localStorage.setItem = (...args) => { writes++; setItem(...args); };
  a.nodes.get('thesis-text').value = 'Unsaved text';
  let prompts = 0; a.context.confirm = () => { prompts++; return false; };
  a.restore();
  for (const [id, value] of Object.entries({ 'val-price': 81, 'val-return': 12, 'val-years': 7, 'val-exit-pe': 30,
    'sc-bear-growth': 3, 'sc-base-growth': 13, 'sc-bull-growth': 23, 'sc-bear-pe': 16, 'sc-base-pe': 26, 'sc-bull-pe': 36 })) {
    assert.equal(Number(a.nodes.get(id).value), value);
  }
  assert.equal(Number(a.nodes.get('val-eps').value), Number(a.data.valuationBase.ttmDilutedEps.value.toFixed(2)));
  assert.equal(a.nodes.get('val-eps-badge').textContent, 'SEC TTM');
  assert.equal(a.nodes.get('thesis-text').value, 'Unsaved text');
  assert.equal(a.nodes.get('rev-future-price-result').textContent, output);
  assert.equal(a.saved.get(key), before);
  assert.equal(JSON.stringify(a.data), dataBefore);
  assert.equal(a.nodes.get('thesisRevisionSelect').value, a.historical);
  assert.equal(a.nodes.get('changeBaselineLabel').textContent, baseline);
  assert.equal(vm.runInContext('valuationState.stale', a.context), true);
  a.submit(); assert.equal(a.saved.get(key), before);
  a.restore(); assert.equal(prompts, 0); assert.equal(a.saved.get(key), before);
  assert.equal(writes, 0);
  assert.match(a.nodes.get('assumptionRestoreNotice').textContent, /2024Q1.*historiskt sparad/);
  a.context.calculateValuation(a.data);
  assert.equal(vm.runInContext('valuationState.stale', a.context), false);
  a.submit();
  const latest = a.context.NTMThesisStorage.get('NVDA').thesis;
  assert.equal(latest.revisionCount, 3);
  assert.equal(latest.valuationSnapshot.valuationInputs.stockPrice, 81);
  assert.equal(latest.valuationSnapshot.ttmMetrics.revenue, a.data.ttm.metrics.revenue.value);
  assert.deepEqual(JSON.parse(a.saved.get(key)).theses.NVDA.revisions[0], JSON.parse(before).theses.NVDA.revisions[0]);
});

test('explicit historical manual EPS restores source and survives calculate/save', () => {
  const snapshot = restoreSnapshot(); snapshot.valuationInputs.epsSource = 'manual'; snapshot.valuationInputs.epsBasis = 4.25;
  const a = restorationFixture(snapshot); a.restore();
  assert.equal(a.nodes.get('val-eps').value, '4.25');
  assert.equal(a.nodes.get('val-eps-badge').textContent, 'Manuell');
  a.context.calculateValuation(a.data); a.submit();
  assert.equal(a.context.NTMThesisStorage.get('NVDA').thesis.valuationSnapshot.valuationInputs.epsSource, 'manual');
});

test('SEC restore cannot replace manual fallback when current positive SEC EPS is unavailable', () => {
  for (const eps of [null, -1, 0]) {
    const a = restorationFixture(restoreSnapshot());
    a.data.valuationBase.ttmDilutedEps.value = eps;
    a.begin(a.data); a.context.selectThesisRevision(a.historical, a.data);
    const before = a.nodes.get('val-eps').value; a.restore();
    assert.equal(a.nodes.get('val-eps').value, before);
    assert.equal(a.nodes.get('val-eps-badge').textContent, 'Manuell');
    assert.match(a.nodes.get('assumptionRestoreNotice').textContent, /EPS-fältet.*behölls/);
  }
});

test('legacy partial restore skips missing, invalid and unknown EPS assumptions', () => {
  const a = restorationFixture({ valuationInputs: { stockPrice: 65, years: 2.5, requiredReturn: null, exitPE: -1, epsBasis: 999 },
    scenarios: { bear: { growth: -100, exitPE: 2000 }, base: { growth: 0 } } });
  const before = a.context.readEditableAssumptions(); a.restore();
  const after = a.context.readEditableAssumptions();
  assert.deepEqual(clone(after), { ...clone(before), 'val-price': 65, 'sc-base-growth': 0 });
  for (const value of Object.values(after)) assert.ok(![null, undefined, 'NaN', 'null', 'undefined'].includes(value));
  assert.match(a.nodes.get('assumptionRestoreNotice').textContent, /Vissa antaganden saknas/);
});

test('empty and unsupported revisions disable restore without writes or stale state', () => {
  for (const snapshot of [null, {}, { schemaVersion: 99, valuationInputs: { stockPrice: 55 } }]) {
    const a = restorationFixture(snapshot); const before = a.saved.get(key);
    assert.equal(a.nodes.get('revisionRestoreBtn').disabled, true);
    a.restore(); assert.equal(a.saved.get(key), before);
    assert.equal(vm.runInContext('valuationState.stale', a.context), false);
  }
});

test('uncalculated edits prompt only when changed assumptions would actually be overwritten', () => {
  const a = restorationFixture(restoreSnapshot());
  a.nodes.get('val-price').value = '150'; a.nodes.get('val-price').oninput();
  let prompts = 0; a.context.confirm = () => { prompts++; return false; };
  const before = clone(a.context.readEditableAssumptions());
  a.restore(); assert.equal(prompts, 1); assert.deepEqual(clone(a.context.readEditableAssumptions()), before);
  a.context.confirm = () => { prompts++; return true; };
  a.restore(); assert.equal(prompts, 2); assert.equal(a.nodes.get('val-price').value, '81');
  a.restore(); assert.equal(prompts, 2);
  const partial = restorationFixture({ valuationInputs: { stockPrice: 81 } });
  partial.nodes.get('val-eps').value = '7'; partial.nodes.get('val-eps').oninput();
  partial.context.confirm = () => { throw new Error('Unrelated edits must not prompt'); };
  partial.restore(); assert.equal(partial.nodes.get('val-eps').value, '7');
});

test('equivalent numeric formatting and already-matching edits do not prompt', () => {
  const a = restorationFixture(restoreSnapshot());
  a.nodes.get('val-price').value = '120.00'; a.nodes.get('val-price').oninput();
  a.nodes.get('val-return').value = '12'; a.nodes.get('val-return').oninput();
  a.context.confirm = () => { throw new Error('No work lost'); };
  a.restore(); assert.equal(a.nodes.get('val-price').value, '81');
});

function element() {
  const classes = new Set();
  return {
    value: '', textContent: '', innerHTML: '', style: {}, children: [], dataset: {},
    classList: { add(name) { classes.add(name); }, remove(name) { classes.delete(name); }, contains(name) { return classes.has(name); } },
    appendChild(child) { this.children.push(child); },
    append(...children) { this.children.push(...children); }, after() {}, before() {}, scrollIntoView() {},
    replaceChildren() { this.children = []; }, focus() {}, remove() {}, click() {},
    addEventListener() {}, setAttribute() {},
  };
}

function app(saved = new Map()) {
  // Minimal DOM boundary; every product function below runs unmodified.
  const nodes = new Map([...read('research.html').matchAll(/\bid="([^"]+)"/g)]
    .map((match) => [match[1], Object.assign(element(), { id: match[1] })]));
  nodes.get('researchPublishBtn').parentElement = element();
  const context = vm.createContext({
    document: {
      body: element(), title: 'Research',
      getElementById(id) { return nodes.get(id) || null; },
      createElement: (tag) => {const e=Object.assign(element(),{tagName:tag});Object.defineProperty(e,'id',{set(value){nodes.set(value,e);},get(){return '';}});return e;}, createTextNode: text => ({textContent:text}), addEventListener() {},
      querySelector() { return null; }, querySelectorAll() { return []; }, readyState: 'loading',
    },
    URLSearchParams, Blob, location: { pathname: '/research.html', search: '?ticker=NVDA' },
    scrollY: 0, scrollTo() {}, print() {}, addEventListener() {}, sessionStorage:{getItem(){return null;},removeItem(){}},
    console: { error() {} }, setTimeout() {}, confirm() { return true; },
    localStorage: {
      getItem(name) { return saved.get(name) ?? null; },
      setItem(name, value) { saved.set(name, value); }, removeItem(name){saved.delete(name);},
    },
  });
  context.window = context;
  // Follow the real page's script order so missing dependencies fail the workflow.
  for (const [, file] of read('research.html').matchAll(/<script src="([^"]+)"/g)) {
    if (file.startsWith('https:') || file.startsWith('vendor/')) continue; // Simulate unavailable chart dependency; real vendor covered in browser.
    vm.runInContext(read(file), context, { filename: file });
  }
  const begin = (data) => {
    context.data = data;
    vm.runInContext('currentStockData = data', context);
    context.initValuationSection(data);
    context.initThesisSection(data);
    context.initChangeDetection(data);
  };
  const submit = () => nodes.get('thesisForm').onsubmit({ preventDefault() {} });
  const save = (data) => {
    begin(data);
    nodes.get('thesis-text').value = 'My original thesis';
    submit();
    return context.NTMThesisStorage.get(data.symbol).thesis;
  };
  return { context, nodes, saved, begin, save, submit };
}

function replaceMetrics(data, values) {
  for (const [metric, value] of Object.entries(values)) data.ttm.metrics[metric] = { ...data.ttm.metrics[metric], value };
  return data;
}

const exportedText = (node) => [node.textContent, ...node.children.map(exportedText)].join('\n');

for (const ticker of ['NVDA', 'SOFI', 'CRWD']) test(`quality: ${ticker} complete load/render and cross-feature workflow without Chart CDN`, async () => {
  const a = app(); const data = stock(ticker);
  a.context.fetch = async (url) => { assert.equal(url, `data/stocks/${ticker}.json`); return { ok: true, json: async () => data }; };
  await a.context.loadStockData(ticker);
  assert.equal(a.nodes.get('researchDetail').style.display, 'block');
  assert.equal(a.nodes.get('annualTableBody').children.length, data.annual.length);
  assert.equal(a.nodes.get('quarterlyTableBody').children.length, data.quarterly.length);
  assert.match(a.nodes.get('researchChartStatus').textContent, /kunde inte laddas/);
  assert.match(a.nodes.get('companyLastUpdated').textContent, /Rapportperiod.*inl\u00e4mnad.*h\u00e4mtad/);
  const metrics = exportedText(a.nodes.get('keyMetricsGrid'));
  if (ticker === 'SOFI') assert.doesNotMatch(metrics, /Fritt kassaflöde TTM|Rörelseresultat TTM|Rapporterad skuldkomponent/);
  if (ticker === 'CRWD') {
    assert.equal(a.nodes.get('val-eps-badge').textContent, 'Manuell');
    assert.match(a.nodes.get('val-eps-help').textContent, /räkneexempel/);
    assert.match(metrics, /Långfristig skuld \(ej kortfristig del\)/);
  } else assert.equal(a.nodes.get('val-eps-badge').textContent, 'SEC TTM');
  a.nodes.get('thesis-text').value = `${ticker} original`; a.submit();
  const first = a.context.NTMThesisStorage.get(ticker).thesis.latestRevisionId;
  a.nodes.get('val-price').value = '200'; a.nodes.get('val-price').oninput();
  a.context.calculateValuation(data); a.nodes.get('thesis-text').value = `${ticker} revised`; a.submit();
  assert.equal(a.context.NTMThesisStorage.get(ticker).thesis.revisionCount, 2);
  a.context.selectThesisRevision(first, data);
  const baseline = a.nodes.get('changeBaselineLabel').textContent, before = a.saved.get(key);
  a.nodes.get('revisionRestoreBtn').onclick();
  assert.equal(a.saved.get(key), before); assert.equal(a.nodes.get('changeBaselineLabel').textContent, baseline);
  const download = interceptDownload(a); a.nodes.get('researchExportMarkdown').onclick();
  assert.match(await download.blob.text(), new RegExp(`${ticker} original`));
  a.nodes.get('outcomeSave').onclick();
  assert.equal(a.context.NTMResearchOutcomes.read().checkpoints[0].sourceRevisionId, first);
  assert.equal(a.saved.get(key), before);
  assert.match(exportedText(a.nodes.get('outcomeCheckpointContent')), new RegExp(`${ticker} original`));
});

test('quality: entry does not fetch financial files for unselected companies', async () => {
  const a = app(); let calls = 0;
  a.context.fetch = async () => { calls++; throw Error('Entry must not fetch fundamentals'); };
  await a.context.showIndexView();
  assert.equal(calls, 0);
  assert.equal(a.nodes.get('researchIndex').style.display, 'block');
});

test('quality: loading, unsupported ticker, HTTP errors and wrong-company JSON fail safely', async () => {
  const a = app(); let calls = 0;
  a.context.fetch = async () => { calls++; assert.equal(a.nodes.get('researchLoading').style.display, 'flex'); return { ok: false, status: 404 }; };
  await a.context.loadStockData('UNKNOWN'); assert.equal(calls, 0);
  await a.context.loadStockData('NVDA'); assert.equal(a.nodes.get('researchError').style.display, 'block');
  assert.equal(a.nodes.get('researchDetail').style.display, 'none');
  a.context.fetch = async () => ({ ok: true, json: async () => stock('SOFI') });
  await a.context.loadStockData('NVDA'); assert.match(a.nodes.get('researchErrorMessage').textContent, /fel ticker/);
  assert.equal(vm.runInContext('currentStockData', a.context), null);
});

test('quality: incomplete metrics render safely and charts use gaps, not invented zeroes', () => {
  const a = app(); const data = stock();
  delete data.ttm.metrics.netIncome; delete data.annual[0].metrics.revenue;
  delete data.quarterly[0].metrics.netIncome;
  const charts = [];
  a.context.Chart = class { constructor(canvas, config) { charts.push(config); } destroy() {} };
  a.context.renderStockDetail(data);
  assert.equal(charts[0].data.datasets[0].data[0], null);
  assert.equal(charts[1].data.datasets[1].data[0], null);
  a.context.Chart = class { constructor() { throw new Error('canvas failure'); } };
  assert.doesNotThrow(() => a.context.renderStockDetail(data));
  assert.match(a.nodes.get('researchChartStatus').textContent, /kunde inte visas/);
  assert.equal(typeof a.nodes.get('thesisForm').onsubmit, 'function');
});

test('quality: invalid horizons, infinities and overflow never replace results or become saved snapshots', () => {
  for (const [id, value] of [['val-years', '2.5'], ['val-years', '51'], ['val-price', 'Infinity'], ['val-price', '1.7e308'], ['val-eps', '1e-308']]) {
    const a = app(); const data = stock(); a.save(data);
    const before = a.saved.get(key), output = a.nodes.get('sc-bull-price').textContent;
    a.nodes.get(id).value = value;
    a.context.calculateValuation(data); a.submit();
    assert.equal(vm.runInContext('valuationState.stale', a.context), true);
    assert.equal(a.nodes.get('sc-bull-price').textContent, output);
    assert.equal(a.saved.get(key), before);
    assert.doesNotMatch(a.nodes.get('valuationStatusBanner').textContent, /Infinity|NaN/);
  }
});

test('quality: sensitivity center reflects valid low P/E and negative-growth Base scenario', () => {
  const a = app(); const data = stock(); a.begin(data);
  a.nodes.get('sc-base-growth').value = '-60'; a.nodes.get('sc-base-pe').value = '2';
  a.context.calculateValuation(data);
  const center = a.nodes.get('sensitivityTable').innerHTML.match(/sens-cell sens-cell-base[\s\S]*?<span class="sens-cell-price">\$(.*?)<\/span>/)[1];
  const basePrice = Number(a.nodes.get('sc-base-price').textContent.slice(1));
  assert.ok(Math.abs(Number(center) - basePrice) <= 0.05);
});

test('quality: no-op Thesis refresh must not calculate an unsubmitted Outcome price', () => {
  const a = app(); a.save(stock());
  a.nodes.get('outcomeManualPrice').value = '95'; a.nodes.get('outcomeManualPrice').oninput();
  const before = exportedText(a.nodes.get('outcomeResults'));
  a.submit();
  assert.equal(a.nodes.get('outcomeSave').disabled, true);
  assert.equal(exportedText(a.nodes.get('outcomeResults')), before);
  a.nodes.get('outcomeSave').onclick();
  assert.equal(a.saved.has(a.context.NTMResearchOutcomes.key), false);
});

test('quality: provenance uses keyboard buttons and distinguishes derived, missing and limited data', () => {
  const a = app(); const metric = { value: 15, unit: 'USD', label: 'Cash flow', isDerived: true, notes: 'Limited source' };
  const cell = a.context.createMetricCell(metric);
  assert.equal(cell.children[0].tagName, 'button'); cell.children[0].onclick();
  assert.match(a.nodes.get('provenanceDialogContent').innerHTML, /Härlett värde|Limited source/);
  a.context.openProvenanceDialog('Missing', { notes: 'No compatible shares' });
  assert.match(a.nodes.get('provenanceDialogContent').innerHTML, /Ej tillgängligt/);
  assert.doesNotMatch(a.nodes.get('provenanceDialogContent').innerHTML, /undefined|null \(unsupported\)/);
  a.context.showThesisSavedIndicator(null);
  assert.equal(a.nodes.get('thesisSavedTime').textContent, 'datum saknas');
});

test('Research editorial labels never expose metric keys and preserve values, units and source concepts',()=>{
 const a=app(),data=stock(),before=JSON.stringify(data);
 const keys=new Set();
 for(const ticker of ['SOFI','NVDA','CRWD','MU','MRVL','VRT','COHR','RKLB','TTMI','SNDK','FLY','CRWV']) {
  const d=stock(ticker);
  for(const section of [d.ttm,...d.quarterly])for(const key of Object.keys(section.metrics))keys.add(key);
  a.context.renderKeyMetrics(d);
 }
 for(const key of keys)assert.notEqual(a.context.researchMetricLabel(key),'Nyckeltal',key);
 const metric={...data.ttm.metrics.operatingCashFlow,label:'operatingCashFlow',concept:'NetCashProvidedByUsedInOperatingActivities'};
 const cell=a.context.createMetricCell(metric,'operatingCashFlow');cell.children[0].onclick();
 const dialog=a.nodes.get('provenanceDialogContent').innerHTML;
 assert.match(dialog,/Operativt kassaflöde/);assert.doesNotMatch(dialog,/operatingCashFlow/);
 assert.ok(dialog.includes(metric.concept));assert.ok(dialog.includes(metric.unit));
 assert.equal(cell.children[0].textContent,a.context.formatCurrency(metric.value,2));
 assert.equal(JSON.stringify(data),before);
});

test('Research example, manual and restored price states disclose missing quote date and model basis',()=>{
 const a=app();a.nodes.get('val-price').value='120';
 for(const [source,label] of [['example','Exempelpris'],['manual','Pris angivet av dig'],['historical','Historiskt sparat pris']]) {
  vm.runInContext(`valuationState.priceSource='${source}'`,a.context);
  a.context.renderValuationPriceStatus(true);
  assert.ok(a.nodes.get('valuationPriceInputStatus').textContent.startsWith(label));
  assert.match(a.nodes.get('valuationPriceInputStatus').textContent,/Verifierat kursdatum saknas/);
  assert.match(a.nodes.get('valuationPriceResultStatus').textContent,/modellerade utifrån detta pris och dina antaganden/);
 }
 const html=read('research.html');
 assert.doesNotMatch(html,/dagens aktiekurs|Vad prisar marknaden in|Ingen inloggning, ingen moln, ingen delning/);
 assert.match(html,/Sparas lokalt på den här enheten\. Valfri synk kopierar privata data till ditt konto\. En analys blir offentlig först när du själv publicerar den/);
 assert.doesNotMatch(read('research.js'),/osparade \?ndringar/);
});

function outcomeFixture() {
  const a = app();
  const source = { id: 'source-1', text: 'Original source thesis', savedAt: '2024-01-01T00:00:00Z',
    valuationSnapshot: a.context.NTMResearchSnapshot.normalize({ schemaVersion: 2, ticker: 'NVDA', currency: 'USD',
      asOfPeriod: '2023Q4', periodEnd: '2023-12-31', provenance: testProvenance(a.context, '2023-12-31'),
      ttmMetrics: { revenue: 100, netIncome: 20, eps: 2, dilutedShares: 10, fcf: 10, fcfPerShare: 1, netMargin: 20, fcfMargin: 10 },
      valuationInputs: { stockPrice: 40, epsBasis: 2, epsSource: 'sec', years: 5 },
      scenarios: { bear: { growth: 0, futurePrice: 60 }, base: { growth: 10, futurePrice: 100 }, bull: { growth: 20, futurePrice: 140 } },
    }) };
  const currentSnapshot = a.context.NTMResearchSnapshot.normalize({ schemaVersion: 2, ticker: 'NVDA', currency: 'USD',
    asOfPeriod: '2025Q4', periodEnd: '2025-12-31', provenance: testProvenance(a.context, '2025-12-31'),
    ttmMetrics: { revenue: 121, netIncome: 30, eps: 2.42, dilutedShares: 12, fcf: 15, fcfPerShare: 1.25, netMargin: 25, fcfMargin: 12 },
  });
  const observation = { schemaVersion: 1, ticker: 'NVDA', sourceRevisionId: source.id, sourceRevision: source,
    observedAt: '2026-01-01T00:00:00Z', currentSnapshot, manualPrice: null };
  return { ...a, source, observation, api: a.context.NTMResearchOutcomes };
}

test('outcome: all eight fundamentals compare correctly using report dates and immutable inputs', () => {
  const { source, observation, api } = outcomeFixture();
  const before = JSON.stringify({ source, observation });
  const results = api.compare(source, observation);
  assert.equal(results.metrics.length, 8);
  const deltas = { revenue: 21, netIncome: 10, eps: 0.42, dilutedShares: 2, fcf: 5, fcfPerShare: 0.25, netMargin: 5, fcfMargin: 2 };
  for (const metric of results.metrics) assert.ok(Math.abs(metric.absolute - deltas[metric.key]) < 1e-10);
  assert.equal(results.metrics[0].pct, 21);
  assert.ok(Math.abs(results.metrics[0].cagr - ((1.21 ** (1 / results.reportingYears) - 1) * 100)) < 1e-10);
  assert.equal(results.metrics[6].pct, null); assert.equal(results.metrics[6].cagr, null);
  assert.equal(JSON.stringify({ source, observation }), before);
});

test('outcome: zero, negative and incompatible bases never produce invalid CAGR', () => {
  const { source, observation, api } = outcomeFixture();
  for (const [start, end, pct] of [[0, 2, null], [-2, 2, 200], [-2, -1, 50], [2, -1, -150], [2, 0, -100]]) {
    source.valuationSnapshot.ttmMetrics.eps = start; observation.currentSnapshot.ttmMetrics.eps = end;
    const metric = api.compare(source, observation).metrics.find((m) => m.key === 'eps');
    assert.equal(metric.cagr, null); assert.equal(metric.pct, pct);
  }
  source.valuationSnapshot.ttmMetrics.eps = 2; observation.currentSnapshot.ttmMetrics.eps = 3;
  observation.currentSnapshot.periodEnd = '2024-06-30';
  assert.equal(api.compare(source, observation).metrics[2].cagr, null);
  observation.currentSnapshot.periodEnd = '2022-12-31';
  assert.equal(api.compare(source, observation).reportingYears, null);
  observation.currentSnapshot.periodEnd = null;
  assert.equal(api.compare(source, observation).metrics[2].cagr, null);
});

test('outcome: missing legacy fields, unknown currencies, and unsupported snapshots are not backfilled', () => {
  const { source, observation, api } = outcomeFixture();
  source.valuationSnapshot = { ttmMetrics: { ttmRevenue: 10 }, currency: 'USD' };
  let result = api.compare(source, observation);
  assert.equal(result.metrics[0].historical, 10); assert.equal(result.metrics[1].historical, null);
  assert.equal(result.metrics[1].absolute, null); assert.equal(result.metrics[0].cagr, null);
  source.valuationSnapshot.currency = null;
  assert.equal(api.compare(source, observation).metrics[0].absolute, null);
  source.valuationSnapshot = { schemaVersion: 99 };
  result = api.compare(source, observation);
  assert.ok(result.metrics.every((m) => m.historical === null && m.absolute === null));
  assert.ok(result.scenarios.every((s) => s.expected === null));
});

test('outcome: horizon uses elapsed revision time, caps model paths, and never assigns a score', () => {
  const { source, observation, api } = outcomeFixture();
  const year = 365.25 * 86400000;
  observation.observedAt = new Date(Date.parse(source.savedAt) + 2.5 * year).toISOString();
  let result = api.compare(source, observation);
  assert.equal(result.elapsed, 2.5); assert.equal(result.remaining, 2.5); assert.equal(result.horizonPct, 50);
  assert.equal(result.eligibleForFinal, false);
  for (const years of [5, 6]) {
    observation.observedAt = new Date(Date.parse(source.savedAt) + years * year).toISOString();
    result = api.compare(source, observation);
    assert.equal(result.eligibleForFinal, true); assert.equal(result.remaining, 0); assert.equal(result.pathYears, 5);
    assert.equal(Object.hasOwn(result, 'score'), false);
  }
  observation.observedAt = '2023-01-01'; assert.equal(api.compare(source, observation).elapsed, null);
  source.savedAt = null; assert.equal(api.compare(source, observation).eligibleForFinal, false);
});

test('outcome: all scenario EPS paths use saved basis and annual growth; manual bases are distinguished', () => {
  const { source, observation, api } = outcomeFixture();
  const result = api.compare(source, observation);
  for (const [i, growth] of [0, 0.1, 0.2].entries()) {
    assert.ok(Math.abs(result.scenarios[i].expected - 2 * (1 + growth) ** result.elapsed) < 1e-10);
  }
  source.valuationSnapshot.valuationInputs.epsSource = 'manual'; source.valuationSnapshot.valuationInputs.epsBasis = 4;
  const manual = api.compare(source, observation);
  assert.equal(manual.manualEps, true); assert.equal(manual.scenarios[0].expected, 4);
  assert.ok(manual.scenarios.every((scenario) => scenario.epsGapPct === null));
  source.valuationSnapshot.valuationInputs.epsSource = null;
  assert.ok(api.compare(source, observation).scenarios.every((scenario) => scenario.expected === null));
});

test('outcome: incompatible and overflowing model paths remain unavailable', () => {
  const { source, observation, api } = outcomeFixture();
  source.valuationSnapshot.scenarios.bear.growth = -100;
  source.valuationSnapshot.scenarios.base.growth = Number.MAX_VALUE;
  source.valuationSnapshot.scenarios.bull.growth = null;
  assert.ok(api.compare(source, observation).scenarios.every((scenario) => scenario.expected === null));
  source.valuationSnapshot.valuationInputs.epsBasis = -1;
  assert.ok(api.compare(source, observation).scenarios.every((scenario) => scenario.expected === null));
});

test('outcome: manual price uses saved starting price and old targets, handles every interval boundary', () => {
  const { source, observation, api } = outcomeFixture();
  observation.manualPrice = { source: 'manual', value: 80, currency: 'USD' };
  const result = api.compare(source, observation);
  assert.equal(result.priceReturnPct, 100); assert.ok(Math.abs(result.scenarios[1].targetGapPct + 20) < 1e-10);
  const positions = [[40, 'Under'], [60, 'Vid gammalt Bear'], [80, 'Mellan gamla Bear'], [100, 'Vid gammalt Base'],
    [120, 'Mellan gamla Base'], [140, 'Vid gammalt Bull'], [160, 'Över']];
  for (const [price, label] of positions) assert.ok(api.position(price, [60, 100, 140]).startsWith(label));
  for (const targets of [[60, 60, 140], [100, 60, 140], [null, 100, 140], [-1, 100, 140]]) assert.equal(api.position(80, targets), null);
  source.valuationSnapshot.valuationInputs.stockPrice = null;
  assert.equal(api.compare(source, observation).priceReturnPct, null);
  observation.manualPrice.currency = 'SEK'; assert.equal(api.compare(source, observation).position, null);
});

test('outcome: selecting history, updating price and saving a checkpoint leave valuation, revisions and CD unchanged', () => {
  const snapshot = restoreSnapshot(); snapshot.currency = 'USD';
  const a = restorationFixture(snapshot); const key = a.context.NTMResearchOutcomes.key;
  const before = a.saved.get('investment-research-theses-v1');
  const inputs = clone(a.context.readEditableAssumptions());
  const valuation = vm.runInContext('JSON.stringify(valuationState)', a.context);
  const baseline = a.nodes.get('changeBaselineLabel').textContent;
  assert.equal(a.saved.has(key), false);
  a.nodes.get('outcomeManualPrice').value = '95'; a.nodes.get('outcomeManualPrice').oninput();
  assert.equal(a.nodes.get('outcomeSave').disabled, true); a.nodes.get('outcomeSave').onclick();
  assert.equal(a.saved.has(key), false);
  a.nodes.get('outcomeForm').onsubmit({ preventDefault() {} });
  assert.equal(a.saved.has(key), false);
  a.nodes.get('outcomeSave').onclick();
  const checkpoint = a.context.NTMResearchOutcomes.read().checkpoints[0];
  assert.equal(checkpoint.sourceRevisionId, a.historical);
  assert.equal(checkpoint.sourceRevision.valuationSnapshot.ttmMetrics.revenue, 999);
  assert.equal(checkpoint.manualPrice.value, 95);
  assert.equal(a.saved.get('investment-research-theses-v1'), before);
  assert.deepEqual(clone(a.context.readEditableAssumptions()), inputs);
  assert.equal(vm.runInContext('JSON.stringify(valuationState)', a.context), valuation);
  assert.equal(a.nodes.get('changeBaselineLabel').textContent, baseline);
});

test('outcome: multiple explicit checkpoints, stable IDs, duplicate suppression and revision linkage survive reload', () => {
  const { source, observation, api, saved } = outcomeFixture();
  let writes = 0; const a = app(saved); const originalSet = a.context.localStorage.setItem;
  a.context.localStorage.setItem = (...args) => { writes++; originalSet(...args); };
  const store = a.context.NTMResearchOutcomes;
  const first = store.save(observation); assert.equal(first.created, true);
  assert.equal(store.save(observation).created, false); assert.equal(writes, 1);
  observation.observedAt = '2026-01-01T12:00:00Z'; assert.equal(store.save(observation).created, false);
  observation.observedAt = '2026-01-02T00:00:00Z'; assert.equal(store.save(observation).created, true);
  observation.manualPrice = { source: 'manual', value: 80, currency: 'USD' }; assert.equal(store.save(observation).created, true);
  observation.sourceRevisionId = 'source-2'; observation.sourceRevision = { ...source, id: 'source-2' };
  assert.equal(store.save(observation).created, true);
  const reloaded = app(saved).context.NTMResearchOutcomes.read().checkpoints;
  assert.equal(reloaded.length, 4); assert.equal(reloaded[0].id, first.checkpoint.id);
  assert.equal(reloaded.filter((record) => record.sourceRevisionId === 'source-1').length, 3);
  assert.equal(new Set(reloaded.map((record) => record.id)).size, 4);
  assert.equal(Object.isFrozen(store.read().checkpoints[0].currentSnapshot), true);
});

test('outcome: deleted source revisions retain self-contained archival checkpoints, including after all-delete and reload', () => {
  const a = restorationFixture(restoreSnapshot());
  a.nodes.get('outcomeSave').onclick();
  const stored = a.saved.get(a.context.NTMResearchOutcomes.key);
  const checkpoint = a.context.NTMResearchOutcomes.read().checkpoints[0];
  a.nodes.get('revisionDeleteBtn').onclick();
  assert.equal(a.saved.get(a.context.NTMResearchOutcomes.key), stored);
  assert.ok(a.nodes.get('outcomeCheckpointSelect').children.some((option) => option.textContent.includes('källversion raderad')));
  a.nodes.get('thesisDeleteBtn').onclick();
  const b = app(a.saved); b.begin(stock());
  assert.equal(b.nodes.get('outcomeCurrent').hidden, true);
  assert.equal(b.nodes.get('outcomeSection').hidden, false);
  b.nodes.get('outcomeCheckpointSelect').value = checkpoint.id; b.nodes.get('outcomeCheckpointSelect').onchange();
  assert.match(exportedText(b.nodes.get('outcomeCheckpointContent')), /Historical thesis/);
  assert.equal(b.saved.get(b.context.NTMResearchOutcomes.key), stored);
  assert.equal(b.context.NTMResearchOutcomes.read().checkpoints[0].sourceRevisionId, a.historical);
});

test('outcome: corrupt and unsupported outcome storage blocks writes and preserves raw bytes', () => {
  const { observation } = outcomeFixture();
  for (const raw of ['{', '', 'null', JSON.stringify({ schemaVersion: 99, checkpoints: [] }),
    JSON.stringify({ schemaVersion: 1, checkpoints: [null] }),
    JSON.stringify({ schemaVersion: 1, checkpoints: [{ ...observation, id: 'x', schemaVersion: 99 }] }),
    JSON.stringify({ schemaVersion: 1, checkpoints: [{ ...observation, id: 'x' }, { ...observation, id: 'x' }] })]) {
    const a = app(); const api = a.context.NTMResearchOutcomes; a.saved.set(api.key, raw);
    assert.ok(api.read().error); assert.equal(api.save(observation).success, false); assert.equal(a.saved.get(api.key), raw);
  }
});

test('outcome: quota/access failure and invalid observations never alter existing checkpoint records', () => {
  const { observation } = outcomeFixture(); const a = app(); const api = a.context.NTMResearchOutcomes;
  api.save(observation); const before = a.saved.get(api.key);
  observation.manualPrice = { source: 'manual', value: -1, currency: 'USD' };
  assert.equal(api.save(observation).success, false);
  observation.manualPrice = null; observation.observedAt = '2026-02-01';
  a.context.localStorage.setItem = () => { throw new Error('quota'); };
  assert.equal(api.save(observation).success, false); assert.equal(a.saved.get(api.key), before);
  a.context.localStorage.getItem = () => { throw new Error('blocked'); };
  assert.ok(api.read().error); assert.equal(api.save(observation).success, false);
});

test('outcome: SOFI unavailable FCF and CRWD missing share basis remain unavailable in observations', () => {
  const { source } = outcomeFixture(); const a = app(); const api = a.context.NTMResearchOutcomes;
  for (const ticker of ['SOFI', 'CRWD']) {
    const data = stock(ticker);
    const revision = clone(source); revision.valuationSnapshot.ticker = ticker;
    if (ticker === 'CRWD') { data.ttm.metrics.dilutedShares = { value: null }; data.ttm.metrics.dilutedEps = { value: null }; }
    const observation = api.observe(ticker, revision, data);
    const result = api.compare(revision, observation);
    for (const name of ticker === 'SOFI' ? ['fcf', 'fcfPerShare', 'fcfMargin'] : ['dilutedShares', 'eps']) {
      assert.equal(result.metrics.find((metric) => metric.key === name).actual, null);
      assert.equal(result.metrics.find((metric) => metric.key === name).cagr, null);
    }
  }
});

test('outcome: invalid manual input blocks checkpoint save and legacy observation UI has no invalid numeric tokens', () => {
  const a = restorationFixture({ valuationInputs: {}, ttmMetrics: {} });
  for (const raw of ['0', '-1', 'Infinity', 'bad']) {
    a.nodes.get('outcomeManualPrice').value = raw; a.nodes.get('outcomeManualPrice').oninput();
    a.nodes.get('outcomeForm').onsubmit({ preventDefault() {} }); a.nodes.get('outcomeSave').onclick();
    assert.equal(a.saved.has(a.context.NTMResearchOutcomes.key), false);
  }
  a.nodes.get('outcomeManualPrice').value = ''; a.nodes.get('outcomeForm').onsubmit({ preventDefault() {} });
  assert.doesNotMatch(exportedText(a.nodes.get('outcomeResults')), /\b(?:NaN|undefined|null|Infinity)\b/);
  a.nodes.get('outcomeSave').onclick(); assert.equal(a.context.NTMResearchOutcomes.read().checkpoints.length, 1);
});
function interceptDownload(a) {
  let blob, revoked, clicked = 0, removed = 0;
  const timers = [];
  a.context.URL = { createObjectURL(value) { blob = value; return 'blob:export-test'; },
    revokeObjectURL(value) { revoked = value; } };
  a.context.setTimeout = (callback) => timers.push(callback);
  const create = a.context.document.createElement;
  a.context.document.createElement = (tag) => {
    const node = create(tag);
    if (tag === 'a') { node.click = () => { clicked++; }; node.remove = () => { removed++; }; }
    return node;
  };
  return { timers, get blob() { return blob; }, get revoked() { return revoked; },
    get clicked() { return clicked; }, get removed() { return removed; } };
}

test('latest export uses saved thesis and outputs, excludes unsaved form changes, and cleans download URL', async () => {
  const a = app(); const thesis = a.save(stock());
  const before = a.saved.get(key), baseline = a.nodes.get('changeBaselineLabel').textContent;
  a.nodes.get('thesis-text').value = 'THIS UNSAVED TEXT MUST NOT EXPORT';
  a.nodes.get('val-price').value = '987654'; a.nodes.get('val-price').oninput();
  a.context.localStorage.setItem = () => { throw new Error('Export must never write'); };
  const download = interceptDownload(a);
  a.nodes.get('researchExportMarkdown').onclick();
  const md = await download.blob.text();
  assert.equal(download.blob.type, 'text/markdown;charset=utf-8');
  assert.match(md, /# NVDA — NTM Research/);
  assert.match(md, /Senaste sparade version/);
  assert.match(md, /My original thesis/);
  assert.doesNotMatch(md, /THIS UNSAVED|987654/);
  assert.match(md, /SEC-härledd EPS vid spartillfället/);
  assert.doesNotMatch(md, /\| Manuell EPS \|/);
  const model = a.context.NTMResearchExport.build('NVDA', thesis.revisions[0], thesis.latestRevisionId, '2026-09-13T12:00:00Z');
  const rows = model.sections.find((section) => section.heading === 'Sparade värderingsresultat').rows;
  assert.equal(rows[0][1], new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(thesis.valuationSnapshot.valuationResults.peRatio) + '×');
  assert.equal(download.clicked, 1); assert.equal(download.removed, 1);
  assert.equal(download.revoked, undefined);
  download.timers.forEach((callback) => callback()); assert.equal(download.revoked, 'blob:export-test');
  assert.equal(a.saved.get(key), before);
  assert.equal(a.nodes.get('changeBaselineLabel').textContent, baseline);
});

test('historical Markdown and print use exactly the selected saved revision, never current fundamentals', async () => {
  const snapshot = restoreSnapshot(); snapshot.currency = 'USD';
  const a = restorationFixture(snapshot);
  const before = a.saved.get(key), baseline = a.nodes.get('changeBaselineLabel').textContent;
  a.data.ttm.metrics.revenue.value = 1234567890123;
  a.context.localStorage.setItem = () => { throw new Error('Export must never write'); };
  const download = interceptDownload(a); a.nodes.get('researchExportMarkdown').onclick();
  const md = await download.blob.text();
  assert.match(md, /Historisk sparad version/); assert.match(md, /Historical thesis/);
  assert.match(md, /TTM Revenue \| 999 USD/); assert.doesNotMatch(md, /1234567890123|My original thesis/);
  assert.match(md, /Resultat: framtida kurs \| 888 USD/);
  assert.match(a.nodes.get('researchExportSource').textContent, /historisk version/);
  a.nodes.get('researchExportPrint').onclick();
  const printed = exportedText(a.nodes.get('researchPrintContent'));
  assert.match(printed, /Historical thesis/); assert.match(printed, /999 USD/);
  assert.match(printed, /2024Q1/); assert.doesNotMatch(printed, /1234567890123|My original thesis/);
  assert.equal(a.nodes.get('researchPrintView').hidden, false);
  assert.equal(a.context.document.body.classList.contains('research-export-preview'), true);
  let prints = 0; a.context.print = () => { prints++; };
  a.nodes.get('researchPrintSubmit').onclick(); assert.equal(prints, 1);
  a.nodes.get('researchPrintBack').onclick();
  assert.equal(a.nodes.get('researchPrintView').hidden, true);
  assert.equal(a.context.document.body.classList.contains('research-export-preview'), false);
  assert.equal(a.context.document.title, 'Research');
  assert.equal(a.nodes.get('thesisRevisionSelect').value, a.historical);
  assert.equal(a.nodes.get('changeBaselineLabel').textContent, baseline);
  assert.equal(a.saved.get(key), before);
});

test('manual export labels valuation EPS separately from historical SEC EPS', () => {
  const snapshot = restoreSnapshot(); snapshot.currency = 'USD';
  snapshot.valuationInputs.epsSource = 'manual'; snapshot.valuationInputs.epsBasis = 4.25;
  const a = restorationFixture(snapshot);
  const thesis = a.context.NTMThesisStorage.get('NVDA').thesis;
  const md = a.context.NTMResearchExport.markdown(a.context.NTMResearchExport.build('NVDA', thesis.revisions[0], thesis.latestRevisionId));
  assert.match(md, /\| Manuell EPS \| 4,25 USD/);
  assert.ok(md.includes('TTM EPS \\(SEC\\) | 999 USD'));
  assert.doesNotMatch(md, /SEC-härledd EPS vid spartillfället/);
});

test('legacy, missing and unsupported snapshots export safely without current-data backfills', () => {
  for (const snapshot of [null, {}, { schemaVersion: 99 }, { ttmMetrics: { ttmRevenue: 123, ttmFcf: null },
    scenarios: { base: { growth: 5 } }, valuationInputs: { epsBasis: null } }]) {
    const a = restorationFixture(snapshot);
    const thesis = a.context.NTMThesisStorage.get('NVDA').thesis;
    const model = a.context.NTMResearchExport.build('NVDA', thesis.revisions[0], thesis.latestRevisionId);
    const md = a.context.NTMResearchExport.markdown(model);
    assert.match(md, /Historical thesis/); assert.match(md, /Ej tillgängligt/);
    assert.match(md, /ursprunglig källa ej dokumenterad/);
    assert.match(md, /Verifierat kursdatum/);
    assert.doesNotMatch(md, /\b(?:NaN|undefined|null|Infinity)\b/);
    assert.ok(model.sections.filter((s) => s.rows).every((s) => s.rows.length));
    a.nodes.get('researchExportPrint').onclick();
    assert.doesNotMatch(exportedText(a.nodes.get('researchPrintContent')), /\b(?:NaN|undefined|null|Infinity)\b/);
  }
});

test('export filename is deterministic, sanitized and bounded', () => {
  const a = app(); const api = a.context.NTMResearchExport;
  assert.equal(api.filename({ ticker: 'NVDA', exportedAt: '2026-09-13T12:34:56Z' }), 'NTM-NVDA-Research-2026-09-13.md');
  assert.equal(api.filename({ ticker: '../../nvda<>:"/\\|?*', exportedAt: 'bad' }), 'NTM-NVDA-Research-utan-datum.md');
  assert.equal(api.filename({ ticker: '...', exportedAt: 'bad' }), 'NTM-ANALYS-Research-utan-datum.md');
});

test('Markdown escapes table delimiters and HTML; print renders user content as text', () => {
  const a = app();
  const model = a.context.NTMResearchExport.build('NVDA', { id: 'one', text: '<script>alert(1)</script>\n# header | test',
    companyName: 'Company | A\nB' }, 'one', '2026-09-13');
  const md = a.context.NTMResearchExport.markdown(model);
  assert.doesNotMatch(md, /<script>/); assert.match(md, /&lt;script&gt;/);
  assert.ok(md.includes('Company \\| A<br>B'));
  const container = element(); a.context.NTMResearchExport.renderPrint(model, container);
  assert.match(exportedText(container), /<script>alert\(1\)<\/script>/);
  const all = (node) => [node, ...node.children.flatMap(all)];
  assert.equal(all(container).some((node) => node.tagName === 'script'), false);
});

test('no saved analysis disables both exports and never autosaves', () => {
  const a = app(); a.begin(stock());
  assert.equal(a.nodes.get('researchExportMarkdown').disabled, true);
  assert.equal(a.nodes.get('researchExportPrint').disabled, true);
  assert.match(a.nodes.get('researchExportSource').textContent, /Spara en analysversion/);
  a.nodes.get('researchExportMarkdown').onclick(); a.nodes.get('researchExportPrint').onclick();
  assert.equal(a.saved.size, 0);
});

test('removed selected revision does not silently export latest, and download failures release URLs', () => {
  const a = restorationFixture(restoreSnapshot());
  a.context.NTMThesisStorage.removeRevision('NVDA', a.historical);
  const before = a.saved.get(key); const download = interceptDownload(a);
  a.nodes.get('researchExportMarkdown').onclick();
  assert.equal(download.blob, undefined); assert.match(a.nodes.get('researchExportSource').textContent, /kan inte längre läsas/);
  assert.equal(a.saved.get(key), before);
  const latest = a.context.NTMThesisStorage.get('NVDA').thesis;
  a.context.selectThesisRevision(latest.latestRevisionId, a.data);
  const create = a.context.document.createElement;
  a.context.document.createElement = (tag) => {
    const node = create(tag); if (tag === 'a') node.click = () => { throw new Error('download blocked'); }; return node;
  };
  a.nodes.get('researchExportMarkdown').onclick();
  assert.match(a.nodes.get('researchExportSource').textContent, /kunde inte startas/);
  download.timers.forEach((callback) => callback()); assert.equal(download.revoked, 'blob:export-test');
  assert.equal(a.saved.get(key), before);
});

test('print CSS isolates document, hides controls and provides white A4 layout and table pagination', () => {
  const css = read('style.css');
  assert.match(css, /body\.research-export-preview > :not\(#researchPrintView\)/);
  assert.match(css, /@page\s*\{ size: A4; margin: 16mm;/);
  assert.match(css, /\.research-print-controls \{ display: none !important;/);
  assert.match(css, /\.research-print-view tr \{ break-inside: avoid;/);
  assert.match(css, /\.research-print-view thead \{ display: table-header-group;/);
  assert.match(css, /body\.research-export-preview \{ background: #fff; color: #111;/);
});

test('capture -> real submit -> localStorage -> fresh context -> compare supported metrics and block unverified share basis', () => {
  const first = app();
  const data = stock();
  const thesis = first.save(data);
  assert.ok(thesis);
  const snapshot = thesis.valuationSnapshot;
  assert.equal(snapshot.schemaVersion, 2);
  assert.deepEqual(Object.keys(snapshot.ttmMetrics),
    ['revenue', 'netIncome', 'eps', 'dilutedShares', 'fcf', 'fcfPerShare', 'netMargin', 'fcfMargin']);
  assert.equal(snapshot.ttmMetrics.revenue, data.ttm.metrics.revenue.value);
  assert.equal(snapshot.ttmMetrics.netIncome, data.ttm.metrics.netIncome.value);
  assert.equal(snapshot.valuationInputs.epsSource, 'sec');
  assert.equal(snapshot.asOfPeriod, data.ttm.asOfPeriod);
  assert.equal(snapshot.periodEnd, data.quarterly.at(-1).periodEnd);
  assert.ok(Date.parse(snapshot.capturedAt));
  assert.deepEqual(clone(snapshot.quarters), data.ttm.quarters);
  const serialized = first.saved.get(key);
  const later = app(first.saved);
  const updated = clone(data);
  for (const metric of ['revenue', 'netIncome', 'dilutedEps', 'dilutedShares', 'freeCashFlow', 'fcfPerShare']) {
    updated.ttm.metrics[metric].value *= 1.2;
  }
  later.begin(updated);
  const baseline = later.context.NTMThesisStorage.get('NVDA').thesis.valuationSnapshot;
  const report = later.context.NTMChangeDetection.detect(baseline, updated);
  assert.equal(report.metrics.length, 3);
  assert.equal(report.blocked.length, 3, 'unverified share basis blocks per-share comparisons');
  for (const change of report.metrics) assert.ok(Math.abs(change.pct - 20) < 1e-8);
  assert.equal(later.nodes.get('thesis-text').value, 'My original thesis');
  assert.match(later.nodes.get('changeDetectionContent').innerHTML, /TTM Revenue/);
  assert.equal(later.saved.get(key), serialized, 'reload/comparison must not mutate the baseline');
});

test('both legacy naming conventions normalize idempotently without persisting migration', () => {
  for (const metrics of [
    { revenue: 100, netIncome: 10, eps: 2, dilutedShares: 5, fcf: 20, fcfPerShare: 4 },
    { ttmRevenue: 100, ttmNetIncome: 10, ttmEps: 2, ttmDilutedShares: 5, ttmFcf: 20, ttmFcfPerShare: 4 },
  ]) {
    const legacy = { text: 'Legacy', createdAt: '2025-01-01', valuationSnapshot: {
      capturedAt: '2025-01-01', asOfPeriod: '2025Q1', ttmMetrics: metrics,
      valuationInputs: { epsBasis: 7, epsSource: 'manual' },
    } };
    const saved = new Map([[key, JSON.stringify({ version: 1, theses: { NVDA: legacy } })]]);
    const before = saved.get(key);
    const { context: c } = app(saved);
    const migrated = c.NTMThesisStorage.get('NVDA').thesis.valuationSnapshot;
    assert.equal(migrated.schemaVersion, 2);
    assert.equal(migrated.ttmMetrics.revenue, 100);
    assert.equal(migrated.ttmMetrics.netMargin, 10);
    assert.equal(migrated.ttmMetrics.fcfMargin, 20);
    assert.equal(migrated.valuationInputs.epsBasis, 7);
    assert.equal(migrated.valuationInputs.epsSource, 'manual');
    assert.deepEqual(clone(c.NTMResearchSnapshot.normalize(migrated)), clone(migrated));
    assert.equal(saved.get(key), before);
  }
});

test('actual old capture names with missing revenue never invent revenue, net income or margins', () => {
  const { context: c } = app();
  const legacy = { ttmMetrics: { revenue: null, eps: 1, fcf: 100 },
    valuationInputs: { epsBasis: 999, epsSource: 'manual' } };
  const normalized = c.NTMResearchSnapshot.normalize(legacy);
  assert.equal(normalized.ttmMetrics.revenue, null);
  assert.equal(normalized.ttmMetrics.netIncome, null);
  const report = c.NTMChangeDetection.detect(legacy, stock());
  assert.equal(report.metrics.length, 0);
  assert.equal(report.blocked.length, 2);
  assert.equal(normalized.ttmMetrics.eps, 1, 'manual valuation EPS is not reported SEC EPS');
  assert.equal(report.margins.length, 0);
});

test('margins use percentage points, including a zero historical numerator', () => {
  const { context: c } = app();
  const baseline = comparisonBaseline(c, { revenue: 1000, netIncome: 100, fcf: 0 });
  const current = replaceMetrics(stock(), { revenue: 2000, netIncome: 240, freeCashFlow: 40 });
  const report = c.NTMChangeDetection.detect(baseline, current);
  assert.deepEqual(clone(report.margins).map((m) => [m.name, m.marginChange, m.unit]),
    [['Net Margin', 2, 'pp'], ['FCF Margin', 2, 'pp']]);
});

test('thresholds remain strictly >1 percent and >0.5 pp', () => {
  const { context: c } = app();
  const baseline = comparisonBaseline(c, { revenue: 1000, netIncome: 100, fcf: 200, netMargin: 10, fcfMargin: 20 });
  const current = replaceMetrics(stock(), { revenue: 1010, netIncome: 106.05, freeCashFlow: 207.05 });
  assert.equal(c.NTMChangeDetection.detect(baseline, current).metrics.filter((m) => m.name === 'TTM Revenue').length, 0);
  // Use exact binary-representable values for boundary assertions.
  current.ttm.metrics.revenue.value = 1000;
  current.ttm.metrics.netIncome.value = 105;
  current.ttm.metrics.freeCashFlow.value = 205;
  assert.equal(c.NTMChangeDetection.detect(baseline, current).margins.length, 0);
  current.ttm.metrics.netIncome.value = 106;
  assert.equal(c.NTMChangeDetection.detect(baseline, current).margins.length, 1);
});

test('zero/null/nonfinite baselines and zero revenue never produce NaN or Infinity', () => {
  const { context: c } = app();
  const current = replaceMetrics(stock(), { revenue: 0, netIncome: 10, dilutedEps: 0 });
  const baseline = comparisonBaseline(c, { revenue: 0, netIncome: 0, eps: 0, fcf: NaN, fcfPerShare: Infinity });
  const report = c.NTMChangeDetection.detect(baseline, current);
  assert.equal(report.metrics.length, 1);
  assert.equal(report.metrics[0].absolute, 10);
  assert.equal(report.metrics[0].pct, null);
  assert.match(c.NTMChangeDetection.formatChange(report.metrics[0]), /basvärde 0/);
  assert.equal(report.margins.length, 0);
  c.renderChangeDetection(report, { valuationSnapshot: { capturedAt: new Date().toISOString() } }, current);
  const normalized = c.NTMResearchSnapshot.normalize(baseline);
  assert.equal(normalized.ttmMetrics.fcf, null);
  assert.equal(normalized.ttmMetrics.fcfPerShare, null);
});

test('negative-to-positive earnings use absolute historical denominator', () => {
  const { context: c } = app();
  const report = c.NTMChangeDetection.detect(comparisonBaseline(c, { netIncome: -10 }),
    replaceMetrics(stock(), { netIncome: 5 }));
  assert.equal(report.metrics[0].pct, 150);
});

test('SOFI and CRWD unavailable metrics stay null through capture/storage/reload', () => {
  for (const ticker of ['SOFI', 'CRWD']) {
    const first = app();
    const thesis = first.save(stock(ticker));
    const later = app(first.saved);
    const snapshot = later.context.NTMThesisStorage.get(ticker).thesis.valuationSnapshot;
    if (ticker === 'SOFI') {
      assert.equal(snapshot.ttmMetrics.fcf, null);
      assert.equal(snapshot.ttmMetrics.fcfPerShare, null);
      assert.equal(snapshot.ttmMetrics.fcfMargin, null);
    } else {
      assert.equal(snapshot.ttmMetrics.eps, null);
      assert.equal(snapshot.ttmMetrics.dilutedShares, null);
      assert.equal(snapshot.ttmMetrics.fcfPerShare, null);
      assert.equal(snapshot.valuationInputs.epsSource, 'manual');
      assert.equal(snapshot.valuationInputs.epsBasis, 1);
    }
    assert.equal(later.context.NTMChangeDetection.detect(snapshot, stock(ticker)).hasChanges, false);
    assert.ok(thesis.text);
  }
});

test('new baseline save and delete immediately clear a visible old report', () => {
  const first = app();
  first.save(stock());
  const later = app(first.saved);
  const updated = stock();
  updated.ttm.metrics.revenue.value *= 2;
  later.begin(updated);
  assert.equal(later.nodes.get('changeDetectionSection').style.display, 'block');
  later.submit();
  assert.equal(later.nodes.get('changeDetectionSection').style.display, 'block');
  assert.match(later.nodes.get('changeDetectionContent').innerHTML, /aktiebasen/);
  assert.match(later.nodes.get('thesisSnapshotPreview').innerHTML, /Värderingsantaganden/);
  updated.ttm.metrics.revenue.value *= 2;
  later.context.initChangeDetection(updated);
  assert.equal(later.nodes.get('changeDetectionSection').style.display, 'block');
  later.nodes.get('thesisDeleteBtn').onclick();
  assert.equal(later.context.NTMThesisStorage.get('NVDA').thesis, null);
  assert.equal(later.nodes.get('changeDetectionSection').style.display, 'none');
  assert.equal(later.nodes.get('changeDetectionContent').innerHTML, '');
  assert.equal(later.nodes.get('thesisSnapshotPreview').innerHTML, '');
});

test('stale valuation blocks save; submit recalculates and stores edited assumptions', () => {
  const a = app();
  a.save(stock());
  const before = a.saved.get(key);
  const price = a.nodes.get('val-price');
  price.value = '150';
  price.oninput();
  a.submit();
  assert.equal(a.saved.get(key), before);
  a.nodes.get('valuationForm').onsubmit({ preventDefault() {} });
  a.submit();
  const snap = a.context.NTMThesisStorage.get('NVDA').thesis.valuationSnapshot;
  assert.equal(snap.valuationInputs.stockPrice, 150);
  assert.equal(snap.valuationResults.peRatio, 150 / snap.valuationInputs.epsBasis);
});

test('corrupt and future records do not crash reload, preview, or destroy other records', () => {
  const future = { text: 'Future thesis', valuationSnapshot: { schemaVersion: 99, mystery: 10 } };
  const raw = { version: 1, theses: { NVDA: null, CRWD: future, BAD: [], SOFI: {
    text: 'Valid notes', risks: {}, valuationSnapshot: {
      ttmMetrics: { eps: 'not a number', revenue: { value: 50 } }, capturedAt: 'bad date',
      valuationInputs: { stockPrice: 'oops' }, scenarios: { base: { futurePrice: {} } },
    },
  } } };
  const a = app(new Map([[key, JSON.stringify(raw)]]));
  assert.doesNotThrow(() => a.begin(stock('SOFI')));
  assert.doesNotThrow(() => a.begin(stock('CRWD')));
  assert.equal(a.context.NTMThesisStorage.get('CRWD').thesis.valuationSnapshot, null);
  assert.equal(a.context.NTMThesisStorage.get('NVDA').thesis, null);
  const migrated = a.context.NTMThesisStorage.get('SOFI').thesis.valuationSnapshot;
  assert.equal(migrated.ttmMetrics.eps, null);
  assert.equal(migrated.ttmMetrics.revenue, 50);
  a.save(stock('SOFI'));
  assert.deepEqual(JSON.parse(a.saved.get(key)).theses.CRWD.revisions[0].valuationSnapshot, future.valuationSnapshot);
  assert.equal(JSON.parse(a.saved.get(key)).theses.CRWD.revisions[0].text, future.text);
});

test('invalid envelopes and inaccessible/full storage fail explicitly without overwriting', () => {
  for (const raw of ['broken JSON', '{"version":99,"theses":{}}', '{"version":1,"theses":[]}']) {
    const a = app(new Map([[key, raw]]));
    assert.doesNotThrow(() => a.begin(stock()));
    assert.ok(a.context.NTMThesisStorage.read().error);
    a.nodes.get('thesis-text').value = 'New notes';
    a.submit();
    assert.equal(a.saved.get(key), raw);
  }
  const a = app();
  a.context.localStorage.setItem = () => { const error = new Error('full'); error.name = 'QuotaExceededError'; throw error; };
  assert.equal(a.context.NTMThesisStorage.save('NVDA', { text: 'notes' }).success, false);
  a.context.localStorage.getItem = () => { throw new Error('blocked'); };
  assert.doesNotThrow(() => a.begin(stock()));
  assert.ok(a.context.NTMThesisStorage.read().error);
});

test('period, filing filters/limit and old-analysis warning remain functional', () => {
  const { context: c } = app();
  const data = stock();
  data.filings = [null, { form: '10-Q', filingDate: 'invalid' },
    { form: '8-K', filingDate: '2026-02-20' }, ...[1, 2, 3, 4].map((day) => ({
      form: '10-Q', filingDate: `2026-02-0${day}`, reportPeriod: '2026-01-31',
    }))];
  const snapshot = { asOfPeriod: '2025Q1', capturedAt: '2025-01-01T00:00:00Z' };
  const report = c.NTMChangeDetection.detect(snapshot, data);
  assert.deepEqual(clone(report.periodChange), { from: '2025Q1', to: data.ttm.asOfPeriod });
  assert.equal(report.filings.length, 3);
  assert.equal(report.filings[0].filingDate, '2026-02-04');
  assert.equal(c.NTMChangeDetection.isSnapshotStale(snapshot), true);
  assert.equal(c.NTMChangeDetection.isSnapshotStale({ capturedAt: new Date().toISOString() }), false);
  assert.equal(c.NTMChangeDetection.isSnapshotStale({ capturedAt: 'bad' }), false);
  assert.equal(c.NTMChangeDetection.isSnapshotStale({}), false);
  assert.equal(c.NTMChangeDetection.getFilingsSinceSnapshot({ capturedAt: 'bad' }, data).length, 0);
  assert.equal(c.NTMChangeDetection.detect({ schemaVersion: 99 }, data).hasChanges, false);
});

test('snapshot metadata survives updates; unrelated and unsupported records are preserved', () => {
  const a = app();
  a.save(stock());
  const original = JSON.parse(a.saved.get(key));
  original.theses.NVDA.revisions[0].createdAt = '2025-01-01T00:00:00Z';
  original.theses.NVDA.revisions[0].savedAt = '2025-01-01T00:00:00Z';
  original.theses.CRWD = { text: 'Future format', valuationSnapshot: { schemaVersion: 99 } };
  a.saved.set(key, JSON.stringify(original));
  // Reopen the explicitly changed baseline before editing; Wave 2 rejects stale editors.
  a.context.initThesisSection(stock());
  a.nodes.get('thesis-text').value = 'Revised notes';
  a.submit();
  const revised = a.context.NTMThesisStorage.get('NVDA').thesis;
  assert.equal(revised.createdAt, original.theses.NVDA.revisions[0].createdAt);
  assert.notEqual(revised.updatedAt, original.theses.NVDA.revisions[0].savedAt);
  assert.equal(revised.text, 'Revised notes');
  assert.deepEqual(JSON.parse(a.saved.get(key)).theses.CRWD, original.theses.CRWD);
  const beforeReject = a.saved.get(key);
  assert.equal(a.context.NTMThesisStorage.save('NVDA', {
    text: 'Unsupported', valuationSnapshot: { schemaVersion: 99 },
  }).success, false);
  assert.equal(a.saved.get(key), beforeReject);
});

test('explicit null/unsupported values are authoritative; manual EPS never fills missing SEC EPS', () => {
  const { context: c } = app();
  const baseline = { schemaVersion: 2, ttmMetrics: { eps: null, ttmEps: 100 },
    valuationInputs: { epsBasis: 200, epsSource: 'manual' } };
  assert.equal(c.NTMResearchSnapshot.normalize(baseline).ttmMetrics.eps, null);
  const data = stock();
  data.ttm.metrics.dilutedEps = { value: null };
  data.ttm.metrics.freeCashFlow = { value: 10, unsupported: true };
  const current = c.NTMResearchSnapshot.fromStockData(data);
  assert.equal(current.ttmMetrics.eps, null);
  assert.equal(current.ttmMetrics.fcf, null);
  assert.equal(current.ttmMetrics.fcfMargin, null);
  assert.equal(c.NTMChangeDetection.detect(baseline, data).metrics.length, 0);
});

test('both Research and Min NTM load the shared schema before storage and comparison', () => {
  for (const page of ['research.html', 'min-ntm.html']) {
    const html = read(page);
    const order = ['research-snapshot.js', 'thesis-storage.js', 'change-detection.js'].map((file) => html.indexOf(`src="${file}"`));
    assert.ok(order[0] >= 0 && order[1] > order[0] && order[2] > order[1]);
  }
});

test('existing Min NTM list renders valid and partial migrated theses without numeric crashes', () => {
  const a = app();
  a.save(stock());
  const raw = JSON.parse(a.saved.get(key));
  raw.theses.SOFI = { revisions: [{ id: 'partial', text: 'Partial old notes', valuationSnapshot: {
    valuationResults: { requiredEpsCAGR: 'bad' }, scenarios: { base: { futurePrice: 100, cagr: null } },
  } }] };
  a.saved.set(key, JSON.stringify(raw));
  const sections = new Map(['scenarios', 'scenarios-empty', 'scenarios-status', 'theses', 'theses-empty',
    'theses-status', 'recent-tools', 'recent-empty', 'recent-status'].map((name) => [`[data-min-ntm-${name}]`, element()]));
  a.context.document.querySelector = (selector) => selector === '[data-min-ntm]'
    ? { querySelector: (name) => sections.get(name) || null } : null;
  assert.doesNotThrow(() => a.context.initMinNtmPage());
  const html = sections.get('[data-min-ntm-theses]').innerHTML;
  assert.match(html, /NVDA/);
  assert.match(html, /SOFI/);
  assert.match(html, /Thesis utan värdering/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test('V1 becomes a stable first revision without changing text, dates or raw snapshot', () => {
  const legacy = { text: '  Original text\n', risks: 'Risk', triggerChange: 'Trigger', notes: 'Notes',
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2025-02-03T12:30:00Z',
    valuationSnapshot: { capturedAt: '2025-02-03T12:30:00Z', ttmMetrics: { eps: 1 } } };
  const raw = JSON.stringify({ version: 1, theses: { NVDA: legacy } });
  const a = app(new Map([[key, raw]]));
  const first = a.context.NTMThesisStorage.get('NVDA').thesis.revisions[0];
  const reload = app(a.saved);
  assert.equal(reload.context.NTMThesisStorage.get('NVDA').thesis.id, first.id);
  assert.equal(a.saved.get(key), raw, 'reading must not persist a migration');
  assert.equal(first.createdAt, legacy.createdAt);
  assert.equal(first.savedAt, legacy.updatedAt);
  assert.equal(first.text, legacy.text);
  assert.equal(first.valuationSnapshot.ttmMetrics.netIncome, null);
  assert.equal(first.valuationSnapshot.ttmMetrics.revenue, null);
  a.save(stock());
  const stored = JSON.parse(a.saved.get(key));
  assert.equal(stored.version, 2);
  assert.equal(stored.theses.NVDA.revisions.length, 2);
  const migrated = stored.theses.NVDA.revisions[0];
  for (const field of Object.keys(legacy)) assert.deepEqual(migrated[field], legacy[field]);
  assert.equal(migrated.id, first.id);
});

test('second meaningful save preserves first revision verbatim and read results are immutable', () => {
  const a = app();
  a.save(stock());
  const first = JSON.parse(a.saved.get(key)).theses.NVDA.revisions[0];
  a.nodes.get('thesis-text').value = 'A revised thesis';
  a.submit();
  const raw = JSON.parse(a.saved.get(key)).theses.NVDA.revisions;
  assert.equal(raw.length, 2);
  assert.notEqual(raw[0].id, raw[1].id);
  assert.deepEqual(raw[0], first);
  const normalized = a.context.NTMThesisStorage.get('NVDA').thesis.revisions[0];
  assert.ok(Object.isFrozen(normalized));
  assert.ok(Object.isFrozen(normalized.valuationSnapshot.ttmMetrics));
  assert.equal(Reflect.set(normalized.valuationSnapshot.ttmMetrics, 'eps', 999), false);
  assert.deepEqual(JSON.parse(a.saved.get(key)).theses.NVDA.revisions[0], first);
});

test('reload defaults to latest; choosing history compares its baseline without changing editor', () => {
  const first = app();
  first.save(stock());
  const updated = stock();
  updated.ttm.metrics.revenue.value *= 2;
  first.save(updated);
  const a = app(first.saved);
  a.begin(updated);
  const thesis = a.context.NTMThesisStorage.get('NVDA').thesis;
  assert.equal(a.nodes.get('thesisRevisionSelect').value, thesis.latestRevisionId);
  assert.equal(a.nodes.get('changeDetectionSection').style.display, 'block');
  a.nodes.get('thesis-text').value = 'Unsaved work';
  a.nodes.get('thesis-text').oninput();
  const price = a.nodes.get('val-price').value;
  a.nodes.get('thesisRevisionSelect').value = thesis.revisions[0].id;
  a.nodes.get('thesisRevisionSelect').onchange();
  assert.match(a.nodes.get('revisionSelectionLabel').textContent, /Historisk version/);
  assert.equal(a.nodes.get('revisionText').textContent, 'My original thesis');
  assert.match(a.nodes.get('changeDetectionContent').innerHTML, /TTM Revenue/);
  assert.match(a.nodes.get('changeBaselineLabel').textContent, /Historisk version/);
  assert.equal(a.nodes.get('thesis-text').value, 'Unsaved work');
  assert.equal(a.nodes.get('val-price').value, price);
  const after = app(a.saved);
  after.begin(updated);
  assert.equal(after.nodes.get('thesisRevisionSelect').value, thesis.latestRevisionId);
});

test('duplicate saves ignore capture timestamps and whitespace; renders create no revisions', () => {
  const a = app();
  a.save(stock());
  const before = a.saved.get(key);
  a.context.renderRevisionHistory(stock());
  a.context.initChangeDetection(stock());
  a.begin(stock());
  assert.equal(a.saved.get(key), before);
  a.nodes.get('thesis-text').value = '  My  original\n thesis  ';
  a.submit();
  assert.equal(a.saved.get(key), before);
  assert.equal(a.context.NTMThesisStorage.get('NVDA').thesis.revisionCount, 1);
  assert.match(a.nodes.get('thesisStatusBanner').textContent, /Inga ändringar/);
  const snap = clone(a.context.NTMThesisStorage.get('NVDA').thesis.valuationSnapshot);
  snap.capturedAt = '2030-01-01T00:00:00Z';
  const result = a.context.NTMThesisStorage.save('NVDA', { text: 'My original thesis', valuationSnapshot: snap });
  assert.equal(result.created, false);
  assert.equal(a.saved.get(key), before);
});

test('valuation-only revisions append but manual prices are never company-data changes', () => {
  const a = app();
  a.save(stock());
  const firstId = a.context.NTMThesisStorage.get('NVDA').thesis.id;
  a.nodes.get('val-price').value = '250';
  a.nodes.get('val-price').oninput();
  a.nodes.get('valuationForm').onsubmit({ preventDefault() {} });
  a.submit();
  const thesis = a.context.NTMThesisStorage.get('NVDA').thesis;
  assert.equal(thesis.revisionCount, 2);
  assert.equal(thesis.valuationSnapshot.valuationInputs.stockPrice, 250);
  a.context.selectThesisRevision(firstId, stock());
  assert.match(a.nodes.get('changeDetectionContent').innerHTML, /aktiebasen/);
  assert.doesNotMatch(a.nodes.get('changeDetectionContent').innerHTML, /change-row-header/);
});

test('single revision delete preserves others, latest deletion promotes predecessor, final hides baseline', () => {
  const a = app();
  a.save(stock());
  a.nodes.get('thesis-text').value = 'Second'; a.submit();
  a.nodes.get('thesis-text').value = 'Third'; a.submit();
  const all = clone(a.context.NTMThesisStorage.get('NVDA').thesis.revisions);
  a.context.selectThesisRevision(all[1].id, stock());
  a.nodes.get('revisionDeleteBtn').onclick();
  let thesis = a.context.NTMThesisStorage.get('NVDA').thesis;
  assert.deepEqual(clone(thesis.revisions), [all[0], all[2]]);
  assert.equal(thesis.latestRevisionId, all[2].id);
  a.nodes.get('revisionDeleteBtn').onclick();
  thesis = a.context.NTMThesisStorage.get('NVDA').thesis;
  assert.equal(thesis.latestRevisionId, all[0].id);
  assert.equal(a.nodes.get('thesisRevisionSelect').value, all[0].id);
  assert.equal(a.nodes.get('thesis-text').value, all[0].text);
  a.nodes.get('revisionDeleteBtn').onclick();
  assert.equal(a.context.NTMThesisStorage.get('NVDA').thesis, null);
  assert.equal(a.nodes.get('thesisHistorySection').hidden, true);
  assert.equal(a.nodes.get('changeDetectionSection').style.display, 'none');
  assert.equal(a.nodes.get('changeDetectionContent').innerHTML, '');
});

test('cancelled single/all deletes do nothing and deleting latest retains unsaved editing', () => {
  const a = app(); a.save(stock());
  const before = a.saved.get(key);
  a.context.confirm = () => false;
  a.nodes.get('revisionDeleteBtn').onclick();
  a.nodes.get('thesisDeleteBtn').onclick();
  assert.equal(a.saved.get(key), before);
  a.nodes.get('thesis-text').value = 'Unsaved notes';
  a.nodes.get('thesis-text').oninput();
  a.context.confirm = () => true;
  a.nodes.get('revisionDeleteBtn').onclick();
  assert.equal(a.nodes.get('thesis-text').value, 'Unsaved notes');
  assert.equal(a.nodes.get('changeDetectionSection').style.display, 'none');
});

test('V2 malformed revisions, duplicate IDs and unsupported envelopes reject destructive writes', () => {
  const valid = { id: 'one', text: 'Preserve me' };
  for (const raw of [
    { version: 99, theses: {} },
    { version: 2, theses: { NVDA: { revisions: [valid, null] } } },
    { version: 2, theses: { NVDA: { revisions: [valid, valid] } } },
    { version: 2, theses: { NVDA: { revisions: 'bad' } } },
  ]) {
    const a = app(new Map([[key, JSON.stringify(raw)]]));
    const before = a.saved.get(key);
    assert.doesNotThrow(() => a.begin(stock()));
    assert.equal(a.context.NTMThesisStorage.save('NVDA', { text: 'Replacement' }).success, false);
    assert.equal(a.context.NTMThesisStorage.removeRevision('NVDA', 'one').success, false);
    assert.equal(a.saved.get(key), before);
  }
});

test('quota failure preserves every revision and selected baseline', () => {
  const a = app(); a.save(stock());
  const before = a.saved.get(key);
  const selected = a.nodes.get('thesisRevisionSelect').value;
  a.context.localStorage.setItem = () => { const error = new Error('full'); error.name = 'QuotaExceededError'; throw error; };
  a.nodes.get('thesis-text').value = 'More research'; a.submit();
  assert.equal(a.saved.get(key), before);
  assert.equal(a.nodes.get('thesisRevisionSelect').value, selected);
  a.nodes.get('revisionDeleteBtn').onclick();
  assert.equal(a.saved.get(key), before);
});

test('Min NTM displays only the latest revision with its count and valuation', () => {
  const a = app(); a.save(stock());
  a.nodes.get('val-price').value = '200';
  a.nodes.get('sc-base-pe').value = '40';
  a.nodes.get('val-price').oninput();
  a.nodes.get('valuationForm').onsubmit({ preventDefault() {} }); a.submit();
  const thesis = a.context.NTMThesisStorage.get('NVDA').thesis;
  const list = element();
  a.context.document.querySelector = (selector) => selector === '[data-min-ntm]'
    ? { querySelector: (name) => name === '[data-min-ntm-theses]' ? list : null } : null;
  a.context.initMinNtmPage();
  assert.match(list.innerHTML, /2 versioner/);
  assert.ok(list.innerHTML.includes(thesis.valuationSnapshot.scenarios.base.futurePrice.toFixed(2)));
  assert.equal((list.innerHTML.match(/min-ntm-thesis-item/g) || []).length, 1);
});

test('selected legacy baseline never backfills missing metrics and all-delete affects only its ticker', () => {
  const legacy = { text: 'Old thesis', createdAt: '2025-01-01', valuationSnapshot: {
    capturedAt: '2025-01-01', asOfPeriod: '2025Q1', ttmMetrics: { eps: 1 },
  } };
  const a = app(new Map([[key, JSON.stringify({ version: 1, theses: { NVDA: legacy } })]]));
  a.save(stock());
  a.context.NTMThesisStorage.save('SOFI', { text: 'Keep this other ticker' });
  a.context.selectThesisRevision('legacy-NVDA', stock());
  const html = a.nodes.get('changeDetectionContent').innerHTML;
  assert.match(html, /TTM EPS/);
  assert.doesNotMatch(html, /TTM Revenue|TTM Net Income|Net Margin|FCF Margin/);
  a.nodes.get('thesisDeleteBtn').onclick();
  assert.equal(a.context.NTMThesisStorage.get('NVDA').thesis, null);
  assert.equal(a.context.NTMThesisStorage.get('SOFI').thesis.text, 'Keep this other ticker');
});
