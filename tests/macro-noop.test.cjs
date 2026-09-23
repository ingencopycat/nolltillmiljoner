const {test} = require('node:test');
const assert = require('node:assert/strict');
const {content} = require('../scripts/preserve_macro_noop.cjs');
test('run timestamps alone do not publish; values and failed status still do', () => {
  const source = (time, actual=10, status='ok') => `window.NTM_WEEKLY_EVENTS={meta:{lastFetchAttempt:'${time}',status:'${status}'},macro:[{actual:${actual},fetchedAt:'${time}'}]};`;
  assert.deepEqual(content(source('a')), content(source('b')));
  assert.notDeepEqual(content(source('a')), content(source('b', 11)));
  assert.notDeepEqual(content(source('a')), content(source('b', 10, 'fetch_error')));
});
