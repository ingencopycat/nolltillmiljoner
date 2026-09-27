const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const W = require('../scripts/check_weekly_events.cjs');
test('weekly content adapter accepts archived transcriptions and new verified weeks without markup', () => {
  const m = W.loadRepository(), source = fs.readFileSync('week-pages.js', 'utf8');
  const c = vm.createContext({window: {location: {pathname: '/rapporter.html'}, NTM_WEEKLY_EVENTS: m.data},
    getIsoWeekStartDate: () => new Date('2026-09-28T00:00:00Z'),
    formatSwedishDayHeader: date => date, formatIsoWeekLabel: week => week,
    getPriorityValue: () => 0, getEarningsIdentity: row => ({name: row.companyName || row.ticker, url: row.ticker === 'MU' ? 'research.html?ticker=MU' : null}),
    getEarningsTimingText: row => row.timing
  });
  vm.runInContext(source.split('const archiveContainer')[0] + ';globalThis.weeks=earningsWeekData;', c);
  vm.runInContext(source.slice(source.indexOf('function getEarningsWeekContent('), source.indexOf('function renderEarningsWeek(')), c);
  const legacy = c.getEarningsWeekContent('2026-W39', c.weeks['2026-W39']);
  const verified = c.getEarningsWeekContent('2026-W40', c.weeks['2026-W40']);
  assert.equal(legacy.days.length, 5); assert.equal(verified.days.length, 5);
  assert.match(JSON.stringify(legacy.days), /COST, LGCY, SCHL/);
  assert.match(JSON.stringify(verified.days), /Genius Group/);
  assert.ok(!JSON.stringify(verified.days).includes('ATCH'));
  assert.ok(verified.days.flat().some(p => p.url === 'research.html?ticker=MU'));
  assert.equal(verified.reports.length, 20);
  // A future week needs data only, not a new renderer or a week-number condition.
  m.data.earningsWeeks['2026-W41'] = {dateRange: 'new range', reports: []};
  const future = c.getEarningsWeekContent('2026-W41', {reviewed: true});
  assert.equal(future.days.length, 5); assert.match(future.heading, /new range/);
  assert.deepEqual(Object.keys(future), Object.keys(verified));
});
test('page owns exactly one image/text/navigation shell and week renderer cannot insert grid siblings', () => {
  const html = fs.readFileSync('rapporter.html', 'utf8'), js = fs.readFileSync('week-pages.js', 'utf8').replace(/\r\n/g, '\n');
  assert.match(html, /class="archive-layout" id="earnings-week-layout"/);
  assert.ok(html.indexOf('id="weekVisual"') < html.indexOf('id="earnings-readable"'));
  assert.ok(html.indexOf('id="earnings-readable"') < html.indexOf('id="earnings-week-navigation"'));
  const renderer = js.slice(js.indexOf('function renderEarningsWeek('), js.indexOf('if (visual) {\n  visual.addEventListener'));
  assert.doesNotMatch(renderer, /visual\.(before|after)\(|2026-W\d\d|style\.(grid|width)|renderReviewedEarnings/);
  assert.match(renderer, /getEarningsWeekContent\(weekKey, item\)/);
  assert.match(renderer, /days\.className = 'earnings-days'/);
});
