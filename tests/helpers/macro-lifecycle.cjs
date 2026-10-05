const assert = require('node:assert/strict');

function assertVerifiedField(event, field, now) {
  const p = event.fieldProvenance?.[field];
  assert.equal(event.provenanceVersion, 1, event.id);
  assert.equal(p?.status, 'available', `${event.id}: ${field}`);
  assert.ok(['reported', 'provider_derived'].includes(p.kind), `${event.id}: verified ${field} kind`);
  assert.ok(p.source?.trim(), `${event.id}: ${field} source`);
  assert.match(p.sourceUrl, /^https:\/\//);
  assert.match(p.methodVersion, /^ntm-(macro|primary-review)\/1$/);
  const fetched = Date.parse(p.fetchedAt);
  assert.ok(Number.isFinite(fetched) && fetched <= now.getTime(), `${event.id}: ${field} fetch timestamp`);
  return fetched;
}

function assertActualLifecycle(event, week, macro, now = new Date()) {
  const release = macro.normalizeMacroEvent(event, week.sourceTimezone).dateTime.getTime();
  assert.ok(Number.isFinite(release), `${event.id}: release instant`);
  if (release > now.getTime() || event.actual === null) {
    assert.equal(event.actual, null, `${event.id}: future actual`);
    assert.deepEqual(event.fieldProvenance.actual, {kind:'unavailable', status:'unavailable'});
    return;
  }
  assert.equal(typeof event.actual, 'string');
  assert.ok(event.actual.trim(), `${event.id}: nonempty actual`);
  const fetched = assertVerifiedField(event, 'actual', now);
  assert.ok(fetched >= release, `${event.id}: actual verified before release`);
}

module.exports = {assertActualLifecycle, assertVerifiedField};
