const test = require('node:test'), assert = require('node:assert/strict');
const math = require('../valuation-core.js');
const { check } = require('../scripts/check_calendar_coverage.cjs');
const near = (a,b) => assert.ok(Math.abs(a-b) < 1e-9, `${a} != ${b}`);
test('hand-calculated valuation fixtures and inverse identities', () => {
  // EPS 4 -> 5 -> 6.25 at 25%; 20x earnings -> 125. Price 80 -> 100 -> 125.
  const model = math.scenario(80,4,25,2,20);
  near(model.futureEPS,6.25); near(model.targetPrice,125); near(model.cagr,.25);
  near(model.currentPE,20); near(model.totalReturn,.5625); near(model.peg,.8);
  const reversed = math.reverse(80,4,2,25,20);
  near(reversed.futurePriceRequired,125); near(reversed.requiredFutureEPS,6.25); near(reversed.requiredEPSCAGR,.25);
  for (const price of [10,100,1000]) for (const years of [1,5,20]) {
    const target = math.reverse(price,4,years,10,20);
    near(math.cagr(price,target.futurePriceRequired,years),.1);
    assert.ok(math.reverse(price,4,years,15,20).futurePriceRequired > target.futurePriceRequired);
    for (const growth of [-50,0,10,50]) {
      const low = math.scenario(price,4,growth,years,10), high = math.scenario(price,4,growth,years,20);
      near(high.targetPrice,2*low.targetPrice); assert.ok(high.cagr > low.cagr);
    }
  }
});
test('invalid and negative edge cases never leak non-finite numbers', () => {
  for (const value of [null,undefined,NaN,Infinity,-Infinity,'10',0,-1,1e308]) {
    for (const output of [math.scenario(value,value,value,value,value), math.reverse(value,value,value,value,value)])
      for (const number of Object.values(output)) assert.ok(number === null || Number.isFinite(number));
  }
  assert.equal(math.cagr(100,0,5),-1);
  assert.equal(math.cagr(-100,50,5),null);
  assert.equal(math.multiple(100,-5),null);
  assert.equal(math.scenario(100,-5,10,5,20).targetPrice,null);
  assert.equal(math.future(100,-100,5),0);
  assert.equal(math.future(100,10,0),100);
  assert.equal(math.toPercent(null),null);
  assert.equal(math.future(100,-101,5),null);
});
test('year coverage is deterministic and never fabricates next-year dates', () => {
  const calendar = {stockholm:{years:{2026:{}}},usa:{years:{2026:{}}}};
  const weeks = {week:{events:[{date:'2026-04-01'}]}};
  const original = JSON.stringify(calendar);
  assert.equal(check(calendar,weeks,new Date('2026-01-01')).length,0);
  assert.equal(check(calendar,weeks,new Date('2026-11-01')).filter(i=>i.level==='warning').length,3);
  assert.equal(check(calendar,weeks,new Date('2027-01-01')).filter(i=>i.level==='error').length,2);
  assert.equal(JSON.stringify(calendar),original);
});
