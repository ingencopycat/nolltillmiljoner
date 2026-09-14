const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const R = require('../ntm-relations.js');
const { destinationExists } = require('../scripts/relation_destinations.cjs');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const c = vm.createContext({}); vm.runInContext(read('posts.js'), c);
const posts = vm.runInContext('NTM_POSTS', c);
const fresh = () => JSON.parse(JSON.stringify(R.catalog(posts)));

test('relation schema rejects corrupt IDs, references, vocabulary, metadata and unsupported routes', () => {
  assert.deepEqual(R.validate(fresh(), href => destinationExists(root, href)), []);
  const corruptions = [
    d => d.entities.push(d.entities[0]), d => delete d.entities[0].id,
    d => d.relations.push(d.relations[0]), d => d.relations[0].to = 'absent',
    d => d.relations[0].from = 'absent', d => d.relations[0].type = 'random',
    d => d.relations[0].cta = '', d => d.relations[0].reason = '',
    d => d.relations[0].priority = NaN, d => d.entities[0].concepts = ['arbitrary'],
    d => d.entities[0].tickers = ['nvda'], d => d.entities[0].concepts = null,
    d => d.entities[0].url = 'javascript:alert(1)', d => d.entities[0].url = '//evil.test/a.html',
    d => d.entities[0].concept = 'pe', d => d.entities[0].themes = ['random'],
    d => d.entities.find(e => e.id === 'learn-pe').url = 'academy.html',
    d => d.entities.find(e => e.id === 'research-nvda').url = 'research.html?ticker=MU',
    d => d.entities.find(e => e.id === 'research-sofi').tickers = ['NVDA']
  ];
  for (const corrupt of corruptions) { const d = fresh(); corrupt(d); assert.ok(R.validate(d).length, String(corrupt)); }
});

test('missing files and fragments fail validation, including the actual mode-link contract', () => {
  for (const url of ['missing.html', 'research.html?ticker=NVDA#not-real', 'aktievarderingskalkylator.html#not-real']) {
    const d = fresh(); d.entities[0].url = url;
    assert.ok(R.validate(d, href => destinationExists(root, href)).some(e => e.startsWith('Missing destination')));
  }
  for (const url of ['aktievarderingskalkylator.html#reverse', 'aktievarderingskalkylator.html#scenarios', 'research.html?ticker=CRWD#thesisSection']) {
    assert.ok(destinationExists(root, url));
  }
});

test('queries are deterministic, bounded, explicit and suppress planned Academy links', () => {
  const d = fresh(), reversed = fresh(); reversed.relations.reverse();
  assert.deepEqual(R.query(d, 'research-nvda'), R.query(reversed, 'research-nvda'));
  assert.deepEqual(R.query(d, 'unknown'), []);
  assert.deepEqual(R.query(d, 'tool-valuation', { type: 'learn' }), []);
  assert.equal(R.query(d, 'research-nvda', { limit: 1 })[0].to, 'workflow-nvda-thesis');
  assert.equal(R.query(d, 'tool-valuation', { ticker: 'NVDA' })[0].to, 'research-nvda');
  assert.equal(R.query(d, 'tool-valuation', { concept: 'thesis' })[0].to, 'research-nvda');
  assert.equal(R.query(d, 'research-nvda', { limit: -1 }).length, 0);
  const micron = d.entities.find(e => e.id === 'post-micron-ai-memory');
  assert.deepEqual(micron.tickers, ['MU']); assert.deepEqual(micron.companies, ['Micron']);
  assert.ok(d.entities.find(e => e.id === 'post-jordi-visser-linjart-exponentiellt-ai-trading').tickers.length === 0);
  assert.equal(micron.title, posts.find(p => p.slug === 'micron-ai-memory').title);
  assert.ok(d.entities.filter(e => e.type === 'research').every(e => R.supportedTickers.includes(e.tickers[0])));
});

test('one renderer produces escaped, descriptive, crawlable anchors in all generated placements', () => {
  const d = fresh();
  for (const entity of d.entities) {
    const html = R.render(d, entity.id);
    if (!html) continue;
    assert.doesNotMatch(html, /academy\.html|ticker=MU|Du kanske också gillar/);
    assert.ok((html.match(/<a /g) || []).length <= 5);
    for (const r of R.query(d, entity.id)) {
      assert.ok(html.includes(r.cta));
      assert.ok(html.includes(r.reason.replace(/&/g, '&amp;')));
    }
    const file = Object.entries(R.placements).find(([, ids]) => ids.includes(entity.id))?.[0]
      || (entity.id.startsWith('post-') ? entity.url : null);
    if (file) assert.ok(read(file).includes(html), file + ' must contain the exact static renderer output');
  }
  assert.match(R.render(d, 'research-nvda'), /href="#thesisSection"/); // preserves unsaved local editor
  d.entities.find(e => e.id === 'tool-reverse').title = '<img onerror="bad">';
  const unsafe = d.relations.find(r => r.id === 'exponential-reverse');
  unsafe.reason = '<script>bad</script>';
  const escaped = R.render(d, unsafe.from);
  assert.ok(escaped.includes('&lt;img')); assert.ok(escaped.includes('&lt;script&gt;'));
  assert.ok(!escaped.includes('<script>'));
});

test('a future Learn publication slots in without changing the renderer or exposing placeholders now', () => {
  const d = fresh(), source = 'tool-valuation';
  assert.ok(!R.render(d, source).includes('Lär dig P/E'));
  const topic = d.entities.find(e => e.id === 'learn-pe'); topic.status = 'published'; topic.url = 'learn-pe.html';
  assert.ok(R.validate(d, href => destinationExists(root, href)).some(e => e === 'Missing destination: learn-pe.html'));
  assert.deepEqual(R.validate(d, href => href === 'learn-pe.html' || destinationExists(root, href)), []);
  assert.ok(R.render(d, source).includes('href="learn-pe.html"'));
});

test('relation click analytics are coarse and reject IDs, tickers, URLs, values and unknown enums', () => {
  let ready, click;
  const ctx = vm.createContext({ URL, URLSearchParams, location: { pathname: '/research.html', search: '?ticker=NVDA&price=999' },
    document: { referrer: '', addEventListener(name, fn) { if (name === 'DOMContentLoaded') ready = fn; if (name === 'click') click = fn; } } });
  ctx.window = ctx; vm.runInContext(read('ntm-product.js'), ctx); ready();
  const link = { dataset: { relationType: 'continue', destinationType: 'workflow', relationId: 'nvda-thesis' } };
  click({ target: { closest(selector) { return selector === 'a[data-relation-id]' ? link : null; } } });
  const event = JSON.parse(JSON.stringify(ctx.NTMEvents.snapshot().at(-1)));
  assert.deepEqual(event, { event: 'relation_click', category: 'research', source: 'direct_or_unknown', tool: 'research',
    relation_type: 'continue', source_surface: 'research', destination_type: 'workflow' });
  for (const key of ['ticker', 'url', 'relation_id', 'text', 'assumptions', 'price']) assert.equal(ctx.NTMEvents.emit('relation_click', { [key]: 'private' }), false);
  for (const key of ['relation_type', 'source_surface', 'destination_type']) assert.equal(ctx.NTMEvents.emit('relation_click', { [key]: 'NVDA' }), false);
  assert.doesNotMatch(JSON.stringify(ctx.NTMEvents.snapshot()), /NVDA|999|nvda-thesis/);
});
