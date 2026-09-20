const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const D = require('../scripts/discord_weekly.cjs'), W = require('../scripts/check_weekly_events.cjs');
const env = {NTM_DISCORD_ENABLED: 'true', DISCORD_MAKRO_WEBHOOK_URL: 'https://discord.com/api/webhooks/123/test_secret', DISCORD_RAPPORTER_WEBHOOK_URL: 'https://discord.com/api/webhooks/456/test_secret'};
function ledger() {
  let data = {version: 1, publications: {}}, revision = 0;
  return {async read() { return {data: structuredClone(data), sha: revision}; }, async write(s) {
    assert.equal(s.sha, revision, 'CAS conflict'); data = structuredClone(s.data); s.sha = ++revision;
  }};
}
function fixture(kind = 'macro') { const m = W.loadRepository(); return {m, p: D.preview(m, kind, '2026-W38')}; }
test('both dry-runs use reviewed canonical image, week, destination and bounded title', () => {
  for (const [kind, channel] of [['macro', 'makro'], ['earnings', 'rapporter']]) {
    const {m, p} = fixture(kind);
    assert.equal(p.channel, channel); assert.equal(p.week, '2026-W38');
    assert.equal(p.image, `./images/${channel}/week-38.png`);
    assert.match(p.text, /Vecka 38, 2026$/); assert.equal(p.identity, `${kind}:2026-W38:${W.digest(m.root, p.image)}`);
    assert.deepEqual(Object.keys(p), ['channel', 'week', 'text', 'image', 'identity']);
    assert.ok(!JSON.stringify(p).includes('secret'));
  }
});
test('unknown week, malformed input, missing image, changed hash and records fail closed', () => {
  const {m} = fixture();
  assert.throws(() => D.preview(m, 'macro', '2030-W01'), /unpublished/);
  assert.throws(() => D.preview(m, 'macro', '../../x'), /invalid/);
  assert.throws(() => D.preview(m, 'other', '2026-W38'), /invalid/);
  for (const mutate of [
    m => { m.root += '/missing'; },
    m => { m.artifacts.find(a => a.kind === 'macro' && a.week === '2026-W38').image = '../escape.png'; },
    m => { m.review.artifacts.find(a => a.kind === 'macro' && a.week === '2026-W38').sha256 = 'bad'; },
    m => { m.data.macroWeeks['2026-W38'].events.pop(); }
  ]) { const {m} = fixture(); mutate(m); assert.throws(() => D.preview(m, 'macro', '2026-W38')); }
});
test('successful delivery uploads only title and approved bytes, then skips all reruns', async () => {
  for (const kind of ['macro', 'earnings']) {
    const {m, p} = fixture(kind), l = ledger(); let calls = 0;
    const send = async (url, options) => {
      calls++; assert.equal(url, env[p.channel === 'makro' ? 'DISCORD_MAKRO_WEBHOOK_URL' : 'DISCORD_RAPPORTER_WEBHOOK_URL'] + '?wait=true');
      assert.equal(options.redirect, 'error');
      const payload = JSON.parse(options.body.get('payload_json'));
      assert.equal(payload.content, p.text); assert.deepEqual(payload.allowed_mentions, {parse: []});
      assert.deepEqual(Buffer.from(await options.body.get('files[0]').arrayBuffer()), fs.readFileSync(p.image));
      assert.equal((await l.read()).data.publications[p.identity].status, 'reserved');
      return {ok: true, json: async () => ({id: '12345', privateProviderField: 'not stored'})};
    };
    assert.equal((await D.deliver(p, m.root, env, l, send)).status, 'sent');
    assert.equal((await D.deliver(p, m.root, env, l, send)).status, 'already_sent'); assert.equal(calls, 1);
    assert.ok(!JSON.stringify(await l.read()).includes('privateProviderField'));
  }
});
test('network, rate limit, rejected response and malformed acknowledgement stay reserved; no site mutation or duplicate', async () => {
  const {m, p} = fixture(), before = fs.readFileSync('data/weekly-events.js');
  for (const failure of [async () => { throw new Error(env.DISCORD_MAKRO_WEBHOOK_URL); }, async () => ({ok: false, status: 429}), async () => ({ok: false, status: 500}), async () => ({ok: true, json: async () => ({})})]) {
    const l = ledger(); let calls = 0;
    const send = async () => { calls++; return failure(); };
    await assert.rejects(D.deliver(p, m.root, env, l, send), /delivery_uncertain_manual_review_required/);
    await assert.rejects(D.deliver(p, m.root, env, l, send), /delivery_uncertain_manual_review_required/);
    assert.equal(calls, 1);
  }
  assert.deepEqual(fs.readFileSync('data/weekly-events.js'), before);
});
test('disabled/missing/untrusted configuration never sends; errors contain no secrets', async () => {
  const {m, p} = fixture();
  for (const e of [{}, {...env, NTM_DISCORD_ENABLED: 'false'}, {...env, DISCORD_MAKRO_WEBHOOK_URL: ''}, {...env, DISCORD_MAKRO_WEBHOOK_URL: 'https://evil.invalid/test_secret'}]) {
    await assert.rejects(D.deliver(p, m.root, e, ledger(), async () => assert.fail('must not send')), error => !error.message.includes('test_secret'));
  }
});
test('reservation persistence failure stops POST; post-send persistence failure prevents resending', async () => {
  const {m, p} = fixture(); let calls = 0;
  const send = async () => { calls++; return {ok: true, json: async () => ({id: '123'})}; };
  const l = ledger(), write = l.write;
  l.write = async () => { throw new Error('storage unavailable'); };
  await assert.rejects(D.deliver(p, m.root, env, l, send)); assert.equal(calls, 0);
  let writes = 0;
  l.write = async s => { if (++writes === 2) throw new Error('storage unavailable'); await write(s); };
  await assert.rejects(D.deliver(p, m.root, env, l, send)); assert.equal(calls, 1);
  await assert.rejects(D.deliver(p, m.root, env, l, send), /uncertain/); assert.equal(calls, 1);
});
test('GitHub ledger requires existing state and writes same branch with SHA; provider failures are redacted', async () => {
  const e = {GITHUB_REPOSITORY: 'owner/repo', GITHUB_TOKEN: 'private_secret'}; let writes = 0;
  const l = D.githubLedger(e, async (url, options) => {
    if (options.method === 'GET') {
      assert.ok(url.endsWith('?ref=ntm-distribution-state'));
      return {ok: true, json: async () => ({sha: 'one', content: Buffer.from(JSON.stringify({version: 1, publications: {}})).toString('base64')})};
    }
    writes++; const body = JSON.parse(options.body); assert.equal(body.sha, 'one'); assert.equal(body.branch, 'ntm-distribution-state');
    assert.ok(!body.content.includes(e.GITHUB_TOKEN)); return {ok: true, json: async () => ({content: {sha: 'two'}})};
  });
  const s = await l.read(); await l.write(s); assert.equal(s.sha, 'two'); assert.equal(writes, 1);
  for (const responder of [async () => ({ok: false, status: 404}), async () => { throw new Error('private_secret'); }, async () => ({ok: true, json: async () => ({sha: 'x', content: 'bad'})})]) {
    await assert.rejects(D.githubLedger(e, responder).read(), error => !error.message.includes('private_secret'));
  }
});
test('concurrent workers cannot both reserve the same identity', async () => {
  const {m, p} = fixture(), l = ledger(); let calls = 0;
  const send = async () => { calls++; return {ok: true, json: async () => ({id: '123'})}; };
  await Promise.allSettled([D.deliver(p, m.root, env, l, send), D.deliver(p, m.root, env, l, send)]);
  assert.equal(calls, 1);
});
test('adapter and webhook config stay outside public staging and deploy workflow', () => {
  const stage = fs.readFileSync('scripts/stage_site.py', 'utf8');
  assert.ok(!stage.includes('discord_weekly')); assert.ok(!fs.readFileSync('.github/workflows/deploy.yml', 'utf8').includes('DISCORD_'));
  for (const file of fs.readdirSync('.').filter(f => /\.(js|html|css)$/.test(f))) assert.ok(!fs.readFileSync(file, 'utf8').includes('DISCORD_MAKRO_WEBHOOK_URL'));
  const workflow = fs.readFileSync('.github/workflows/discord-weekly.yml', 'utf8');
  assert.match(workflow, /default: false/); assert.match(workflow, /environment: discord-distribution/);
});
