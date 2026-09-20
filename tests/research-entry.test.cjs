const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../research-entry.js');
test('selector catalog matches the supported Research registry without duplicate tickers', () => {
  const tickers = E.companies.map(c=>c.ticker);
  assert.equal(new Set(tickers).size, tickers.length);
  assert.deepEqual(tickers.slice().sort(), [...require('../ntm-relations.js').supportedTickers].sort());
});
test('selector finds exact ticker first, names, partial names and normalized case', () => {
  assert.equal(E.search(E.companies, ' nvDa ')[0].ticker, 'NVDA');
  assert.equal(E.search(E.companies, 'nvidia')[0].ticker, 'NVDA');
  assert.equal(E.search(E.companies, 'crowd')[0].ticker, 'CRWD');
  assert.deepEqual(E.search(E.companies, ''), []);
  assert.deepEqual(E.search(E.companies, 'unknown'), []);
  const similar = [{ticker:'ABC',name:'Shared Name'}, {ticker:'AB',name:'Shared Name'}, {ticker:'XYZ',name:'ABC Holdings'}];
  assert.equal(E.search(similar, 'abc')[0].ticker, 'ABC');
  assert.deepEqual(E.search(similar, 'Shared').map(c=>c.ticker), ['AB','ABC']);
});
test('100 and 550 companies retain all matches and only populated alphabetical groups', () => {
  for (const count of [100, 550]) {
    const rows = Array.from({length:count}, (_,i)=>({ticker:`T${i}`,name:`${i%2?'Alpha':'Zulu'} Holdings ${i}`}));
    assert.equal(E.search(rows, 'holdings').length, count);
    assert.equal(E.search(rows, `t${count-1}`)[0].ticker, `T${count-1}`);
    assert.deepEqual(E.groups(rows), ['A','Z']);
  }
});
test('recents are dated, bounded, deduplicated and do not invent manual coverage', () => {
  const now = Date.parse('2026-09-20');
  assert.deepEqual(E.recent(E.companies, {}, [], now), []);
  const theses = {PRIVATE:{companyName:'My manual company',updatedAt:'2026-09-19'},NVDA:{companyName:'NVIDIA',updatedAt:'2026-09-18'}};
  const visits = ['SOFI','CRWD','NVDA','UNKNOWN'].map(t=>({url:`research.html?ticker=${t}`,lastUsedAt:'2026-09-17'}));
  const rows = E.recent(E.companies, theses, visits, now);
  assert.equal(rows.length, 3); assert.equal(rows[0].ticker, 'PRIVATE'); assert.equal(rows[0].manual, true);
  assert.equal(rows.filter(r=>r.ticker==='NVDA').length,1);
  assert.ok(!rows.some(r=>r.ticker==='UNKNOWN'));
  assert.deepEqual(E.recent(E.companies, {NVDA:{updatedAt:'invalid'},SOFI:{updatedAt:'2099-01-01'}}, [], now), []);
});
