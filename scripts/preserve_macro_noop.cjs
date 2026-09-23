// Preserve published bytes when only successful-check timestamps changed.
const fs = require('node:fs');
const cp = require('node:child_process');
const vm = require('node:vm');
const {isDeepStrictEqual} = require('node:util');
function content(source) {
  const context = {window: {}};
  vm.runInNewContext(source, context, {timeout: 1000});
  const times = new Set(['fetchedAt', 'lastFetchAttempt', 'lastSuccessfulUpdate', 'lastCompleteFetch']);
  return JSON.parse(JSON.stringify(context.window.NTM_WEEKLY_EVENTS, (key, value) => times.has(key) ? undefined : value));
}
if (require.main === module) {
  const file = 'data/weekly-events.js';
  const previous = cp.execFileSync('git', ['show', 'HEAD:' + file]);
  if (isDeepStrictEqual(content(previous.toString('utf8')), content(fs.readFileSync(file, 'utf8')))) {
    fs.writeFileSync(file, previous);
    console.log('Unchanged macro content: retained published bytes.');
  }
}
module.exports = {content};
