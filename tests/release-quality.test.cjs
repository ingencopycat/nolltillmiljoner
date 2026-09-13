const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {check} = require('../scripts/check_rules.cjs');
const security = require('../scripts/security_policy.cjs');
test('rule reviews fail at their deadline and when a new ISK income year is unmaintained', () => {
  const registry = JSON.parse(fs.readFileSync('data/rule-registry.json','utf8'));
  assert.deepEqual(check(registry,'2026-09-14'),[]);
  assert.ok(check(registry,'2026-12-01').some(i=>i.includes('isk: owner review due')));
  assert.ok(check(registry,'2027-01-01').some(i=>i.includes('income year')));
  registry.rules[0].source='javascript:alert(1)'; registry.rules[1].lastVerified='2028-01-01';
  assert.ok(check(registry,'2026-09-14').length>=2);
});
test('CSP is deterministic, hashes executable inline code and forbids arbitrary script attributes', () => {
  const html='<head><meta charset="utf-8"><script>window.example=1;</script></head>';
  const result=security.apply(html);
  assert.equal(security.apply(result),result);
  assert.match(result,/sha256-/);
  assert.match(result,/script-src-attr 'none'/);
  assert.doesNotMatch(security.policy(html).split(';').find(d=>d.trim().startsWith('script-src ')),/unsafe-inline|unsafe-eval|\*/);
  assert.notEqual(security.policy(html),security.policy(html.replace('=1','=2')));
  for(const file of fs.readdirSync('.').filter(f=>f.endsWith('.html'))){
    const source=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
    assert.equal(security.apply(source),source,file+' policy drift');
    assert.doesNotMatch(source,/\son(?:click|load|error|change|submit)\s*=/i,file);
  }
});
