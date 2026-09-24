const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const slug = 'trump-xi-washington-ai-handel-taiwan', file = `post-${slug}.html`;
test('news source registry, static article, discovery and text fallback agree', () => {
  const c = vm.createContext({document: {getElementById(){return null;}, querySelector(){return null;}, querySelectorAll(){return [];}, addEventListener(){}, readyState: 'loading'}, URL, URLSearchParams, location: {search:''}, console, setTimeout(){}});
  c.window = c;
  for (const f of ['posts.js', 'script.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), c);
  const p = vm.runInContext(`NTM_POSTS.find(p=>p.slug==='${slug}')`, c), html = fs.readFileSync(file, 'utf8');
  assert.equal(c.renderPostMedia(p), ''); assert.equal(c.renderPostMedia(p, true), '');
  assert.equal(c.getPostImages(p).length, 0); assert.equal(p.media.type, 'none');
  assert.equal(p.editorial.attribution, 'Noll till Miljoner (NTM)');
  assert.equal(p.editorial.sources.length, 5);
  for (const s of p.editorial.sources) { assert.ok(html.includes(s.url)); assert.equal(s.accessedAt, '2026-09-24'); }
  assert.equal((html.match(/<h1>/g)||[]).length, 1); assert.ok(html.includes('<h2>Varför bryr sig investerare?</h2>'));
  assert.ok(!html.includes('data-post-image')); assert.ok(!html.includes('carousel-slide'));
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema['@type'], 'Article'); assert.equal(schema.headline, p.title); assert.equal(schema.datePublished, p.date);
  assert.equal(schema.image, undefined); assert.ok(html.includes('images/ntm-social.png'));
  assert.ok(fs.readFileSync('inlagg.html','utf8').includes(file)); assert.ok(fs.readFileSync('sitemap.xml','utf8').includes(file));
  assert.ok(html.includes('research.html?ticker=NVDA')); assert.ok(html.includes('makro.html?from=content'));
  assert.equal(c.constrainPostMarkup('<h2>Heading</h2>'), '<h2>Heading</h2>');
  assert.ok(!c.constrainPostMarkup('<h2 onclick="evil()">x</h2><script>evil()</script>').includes('<h2 onclick'));
  const bad = structuredClone(p); bad.editorial.sources[0].url = 'javascript:evil()'; bad.editorial.sources[0].title = '<img onerror="evil()">';
  const rendered = c.renderPostView(bad); assert.ok(!rendered.includes('href="javascript:')); assert.ok(!rendered.includes('<img onerror='));
});
