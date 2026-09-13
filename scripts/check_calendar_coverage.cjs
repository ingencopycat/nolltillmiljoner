/** Read-only coverage validation; never creates holiday or release dates. */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function check(calendar, weeks, today = new Date(), coverage = {}) {
  const year = today.getUTCFullYear(), issues = [];
  const approaching = (Date.UTC(year + 1, 0, 1) - today.getTime()) / 86400000 <= 120;
  for (const exchange of ['stockholm', 'usa']) {
    const years = calendar?.[exchange]?.years || {};
    if (!years[year]) issues.push({ level: 'error', message: `${exchange}: market calendar missing ${year}` });
    if (approaching && !years[year + 1]) issues.push({ level: 'warning', message: `${exchange}: verified holidays needed for ${year + 1}` });
  }
  const events = Object.values(weeks || {}).flatMap((week) => week.events || []);
  for (const target of approaching ? [year, year + 1] : [year]) {
    if (!events.some((event) => String(event.date).startsWith(`${target}-`))) {
      const pending = coverage.macro?.[target];
      const waiting = target > year && pending?.status === 'not_yet_published' && today < new Date(pending.reviewAfter);
      issues.push({ level: waiting ? 'notice' : 'warning', message: waiting
        ? `Macro ${target}: complete schedules not yet published at last check; recheck ${pending.reviewAfter}`
        : `Macro releases missing for ${target}; recheck official schedules now (coverage incomplete)` });
    }
  }
  return issues;
}
module.exports = { check };
if (require.main === module) {
  const root = path.resolve(__dirname, '..'), context = vm.createContext({ window: {} });
  for (const file of ['market-calendar.js', 'weekly-events.js']) vm.runInContext(fs.readFileSync(path.join(root, 'data', file), 'utf8'), context);
  const coverage = JSON.parse(fs.readFileSync(path.join(root, 'data/calendar-coverage.json'), 'utf8'));
  const issues = check(context.window.NTM_MARKET_CALENDAR, context.window.NTM_WEEKLY_EVENTS.macroWeeks, new Date(), coverage);
  for (const issue of issues) console.log(`::${issue.level}::${issue.message}`);
  if (!issues.length) console.log('Calendar coverage available for validation horizon; individual release completeness is not guaranteed.');
  process.exitCode = issues.some((i) => i.level === 'error') ? 1 : 0;
}
