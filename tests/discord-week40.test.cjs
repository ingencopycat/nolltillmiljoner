const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const os = require('node:os'), path = require('node:path');
const D = require('../scripts/discord_weekly.cjs'), W = require('../scripts/check_weekly_events.cjs');
const selections = require('../docs/internal/week40-distribution.json');

test('Week 40 original selections preserve canonical review and reject mismatched approval', () => {
  for (const a of selections.artifacts) {
    const m = W.loadRepository(), before = JSON.stringify(m.review), p = D.preview(m, a.kind, a.week);
    assert.equal(p.text, `${a.kind === 'macro' ? 'Makro' : 'Rapporter'} — Vecka 40, 2026`);
    assert.equal(p.image, a.image); assert.equal(W.digest(m.root, p.image), a.sha256);
    assert.equal(p.identity, `${a.kind}:2026-W40:${a.sha256}`);
    assert.notEqual(p.identity, D.preview(m, a.kind, '2026-W39').identity);
    assert.equal(JSON.stringify(m.review), before);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ntm-discord-w40-'));
    try {
      fs.mkdirSync(path.join(root, path.dirname(a.image)), {recursive: true});
      fs.copyFileSync(path.resolve(m.root, a.image), path.join(root, a.image));
      fs.mkdirSync(path.join(root, 'docs/internal'), {recursive: true});
      m.root = root;
      assert.throws(() => D.preview(m, a.kind, a.week), /reference_image_requires_corrected/);
      for (const field of ['kind', 'week', 'image', 'sha256']) {
        const altered = structuredClone(selections); altered.artifacts.find(r => r.kind === a.kind)[field] = 'wrong';
        fs.writeFileSync(path.join(root, 'docs/internal/week40-distribution.json'), JSON.stringify(altered));
        assert.throws(() => D.preview(m, a.kind, a.week), /reference_image_requires_corrected/);
      }
    } finally {
      assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep + 'ntm-discord-w40-'));
      fs.rmSync(root, {recursive: true, force: true});
    }
  }
  const m = W.loadRepository();
  m.review.artifacts.find(a => a.kind === 'macro' && a.week === '2026-W39').distributionBlockedReason = 'test block';
  assert.throws(() => D.preview(m, 'macro', '2026-W39'), /reference_image_requires_corrected/);
});

test('Week 40 dry-run never uses network even when live configuration is enabled', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('dry-run must not access Discord or ledger'));
  const logs = [];
  t.mock.method(console, 'log', value => logs.push(JSON.parse(value)));
  for (const kind of ['earnings', 'macro']) await D.main([kind, '2026-W40', '--dry-run'], {NTM_DISCORD_ENABLED: 'true'});
  assert.deepEqual(logs.map(p => p.text), ['Rapporter — Vecka 40, 2026', 'Makro — Vecka 40, 2026']);
});

test('Week 40 mocked sends attach original bytes only, preserve Week 39 history and prevent duplicates', async () => {
  const m = W.loadRepository(), publications = {};
  for (const kind of ['macro', 'earnings']) publications[D.preview(m, kind, '2026-W39').identity] = {status: 'sent', messageId: '123', channel: kind};
  const history = structuredClone(publications);
  let data = {version: 1, publications}, revision = 0;
  const ledger = {async read() { return {data: structuredClone(data), sha: revision}; }, async write(s) {
    assert.equal(s.sha, revision); data = structuredClone(s.data); s.sha = ++revision;
  }};
  const env = {NTM_DISCORD_ENABLED: 'true', DISCORD_MAKRO_WEBHOOK_URL: 'https://discord.com/api/webhooks/123/mock', DISCORD_RAPPORTER_WEBHOOK_URL: 'https://discord.com/api/webhooks/456/mock'};
  for (const kind of ['macro', 'earnings']) {
    const p = D.preview(m, kind, '2026-W40'); let calls = 0;
    const mockSend = async (url, options) => {
      calls++;
      assert.equal(url, env[kind === 'macro' ? 'DISCORD_MAKRO_WEBHOOK_URL' : 'DISCORD_RAPPORTER_WEBHOOK_URL'] + '?wait=true');
      assert.deepEqual(JSON.parse(options.body.get('payload_json')), {
        content: p.text, allowed_mentions: {parse: []}, attachments: [{id: 0, filename: 'week-40.png'}]
      });
      assert.deepEqual([...options.body.keys()], ['payload_json', 'files[0]']);
      assert.deepEqual(Buffer.from(await options.body.get('files[0]').arrayBuffer()), fs.readFileSync(p.image));
      return {ok: true, json: async () => ({id: '456'})};
    };
    await assert.rejects(D.deliver(p, m.root, {...env, NTM_DISCORD_ENABLED: 'false'}, ledger, mockSend), /live_disabled/);
    assert.equal(calls, 0);
    assert.equal((await D.deliver(p, m.root, env, ledger, mockSend)).status, 'sent');
    assert.equal((await D.deliver(p, m.root, env, ledger, mockSend)).status, 'already_sent');
    assert.equal(calls, 1);
  }
  for (const [id, value] of Object.entries(history)) assert.deepEqual(data.publications[id], value);
  const workflow = fs.readFileSync('.github/workflows/discord-weekly.yml', 'utf8');
  assert.match(workflow, /default: false/);
  assert.match(workflow, /needs: preview/);
  assert.match(workflow, /if: inputs.send && vars.NTM_DISCORD_ENABLED == 'true' && github.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /environment: discord-distribution/);
});
