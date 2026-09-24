const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const D = require('../scripts/discord_weekly.cjs');
const root = path.resolve(__dirname, '..'), slug = 'trump-xi-washington-ai-handel-taiwan';
const env = {NTM_DISCORD_ENABLED: 'true', DISCORD_NYHETER_WEBHOOK_URL: 'https://discord.com/api/webhooks/789/private_test_token'};
function ledger() {
  let data = {version: 1, publications: {}}, revision = 0;
  return {async read() {return {data: structuredClone(data), sha: revision};}, async write(s) {
    assert.equal(s.sha, revision); data = structuredClone(s.data); s.sha = ++revision;
  }};
}
function released() { return {ok: true, arrayBuffer: async () => fs.readFileSync(path.join(root, `post-${slug}.html`))}; }
test('news preview uses canonical text-only article and stable identity, with no network/secrets', () => {
  const p = D.previewNews(root, slug);
  assert.equal(p.channel, 'nyheter'); assert.equal(p.image, null); assert.equal(p.identity, `news:${slug}`);
  assert.match(p.text, /väntas/); assert.ok(p.text.includes(p.url)); assert.ok(p.text.length < 2000);
  for (const input of ['../posts', 'missing', '__proto__']) assert.throws(() => D.previewNews(root, input));
});
test('changed source/page, unreviewed article and unsafe caption fail closed', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ntm-news-'));
  try {
    fs.mkdirSync(path.join(temp, 'docs/internal'), {recursive: true});
    const files = ['posts.js', `post-${slug}.html`, 'docs/internal/news-distribution.json'];
    const reset = () => files.forEach(f => fs.copyFileSync(path.join(root, f), path.join(temp, f)));
    reset(); fs.appendFileSync(path.join(temp, `post-${slug}.html`), 'changed');
    assert.throws(() => D.previewNews(temp, slug), /page_mismatch/);
    reset(); fs.appendFileSync(path.join(temp, 'posts.js'), '\nNTM_POSTS.find(p=>p.slug===\"trump-xi-washington-ai-handel-taiwan\").title="Changed";');
    assert.throws(() => D.previewNews(temp, slug), /review_mismatch/);
    for (const text of ['@everyone', 'https://evil.invalid', '<img>', 'x'.repeat(1501)]) {
      reset(); const m = JSON.parse(fs.readFileSync(path.join(temp, files[2]))); m.articles[slug].text = text;
      fs.writeFileSync(path.join(temp, files[2]), JSON.stringify(m));
      assert.throws(() => D.previewNews(temp, slug), /invalid_news_caption/);
    }
    reset(); const m = JSON.parse(fs.readFileSync(path.join(temp, files[2]))); delete m.articles[slug];
    fs.writeFileSync(path.join(temp, files[2]), JSON.stringify(m));
    assert.throws(() => D.previewNews(temp, slug), /review_mismatch/);
  } finally {fs.rmSync(temp, {recursive: true, force: true});}
});
test('news sends text/link without attachments or embeds, reserves first and deduplicates', async () => {
  const p = D.previewNews(root, slug), l = ledger(); let posts = 0;
  const fetcher = async (url, options) => {
    if (url === p.url) return released();
    posts++; assert.equal(url, env.DISCORD_NYHETER_WEBHOOK_URL + '?wait=true');
    assert.equal((await l.read()).data.publications[p.identity].status, 'reserved');
    const body = JSON.parse(options.body.get('payload_json'));
    assert.equal(body.content, p.text); assert.equal(body.flags, 4); assert.deepEqual(body.allowed_mentions, {parse: []});
    assert.equal(body.attachments, undefined); assert.equal(body.embeds, undefined); assert.equal(options.body.get('files[0]'), null);
    return {ok: true, json: async () => ({id: '123'})};
  };
  assert.equal((await D.deliver(p, root, env, l, fetcher)).status, 'sent');
  assert.equal((await D.deliver(p, root, env, l, fetcher)).status, 'already_sent'); assert.equal(posts, 1);
});
test('unpublished, stale or unavailable website cannot reserve or send', async () => {
  const p = D.previewNews(root, slug);
  for (const result of [{ok: false}, {ok: true, arrayBuffer: async () => Buffer.from('stale')}]) {
    const l = ledger();
    await assert.rejects(D.deliver(p, root, env, l, async url => {assert.equal(url, p.url); return result;}), /news_not_published/);
    assert.deepEqual((await l.read()).data.publications, {});
  }
});
test('kill switch, missing news secret and tampered preview stop before network', async () => {
  const p = D.previewNews(root, slug), never = async () => assert.fail('network not allowed');
  for (const e of [{}, {...env, NTM_DISCORD_ENABLED: 'false'}, {...env, DISCORD_NYHETER_WEBHOOK_URL: ''}])
    await assert.rejects(D.deliver(p, root, e, ledger(), never));
  await assert.rejects(D.deliver({...p, text: 'tampered'}, root, env, ledger(), never), /review_mismatch/);
});
test('ambiguous news delivery preserves reservation and redacts secrets; concurrent runs send once', async () => {
  const p = D.previewNews(root, slug), l = ledger(); let posts = 0;
  const failure = async url => {if (url === p.url) return released(); posts++; throw Error(env.DISCORD_NYHETER_WEBHOOK_URL);};
  for (let i = 0; i < 2; i++) await assert.rejects(D.deliver(p, root, env, l, failure), e => e.message === 'delivery_uncertain_manual_review_required');
  assert.equal(posts, 1);
  const concurrent = ledger(); posts = 0;
  await Promise.allSettled([1, 2].map(() => D.deliver(p, root, env, concurrent, async url => {
    if (url === p.url) return released(); posts++; return {ok: true, json: async () => ({id: '123'})};
  })));
  assert.equal(posts, 1);
});
