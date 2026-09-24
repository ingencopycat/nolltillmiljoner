const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const slug = 'aktier-och-fonder-vad-ar-skillnaden', file = `post-${slug}.html`;
test('education uses canonical native article, semantic comparison, discovery, schema and real Academy links', () => {
  const c = vm.createContext({document: {getElementById(){return null;}, querySelector(){return null;}, querySelectorAll(){return [];}, addEventListener(){}, readyState:'loading'}, URL, URLSearchParams, location:{search:''}, console, setTimeout(){}});
  c.window = c;
  for (const f of ['posts.js','script.js']) vm.runInContext(fs.readFileSync(f,'utf8'), c);
  const p = vm.runInContext(`NTM_POSTS.find(p=>p.slug==='${slug}')`, c), html = fs.readFileSync(file,'utf8');
  assert.equal(p.title, 'Aktier och fonder – vad är skillnaden?');
  assert.equal(p.category, 'Utbildning'); assert.equal(p.media.type,'none');
  assert.equal(c.renderPostMedia(p),''); assert.equal(c.getPostImages(p).length,0);
  assert.equal((html.match(/<h1>/g)||[]).length,1);
  assert.equal((html.match(/<dt>/g)||[]).length,6); assert.equal((html.match(/<dd>/g)||[]).length,12);
  assert.ok(!html.includes('<table')); assert.ok(!html.includes('carousel-slide')); assert.ok(!html.includes('undefined'));
  assert.match(html,/Förstå vad du äger, vilken risk du tar och varför du investerar/);
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema['@type'],'Article'); assert.equal(schema.headline,p.title); assert.equal(schema.image,undefined);
  assert.equal(schema.mainEntityOfPage,'https://nolltillmiljoner.se/'+file);
  for(const f of ['inlagg.html','sitemap.xml']) assert.ok(fs.readFileSync(f,'utf8').includes(file));
  for(const id of ['aktier','fonder','diversifiering']) {
    assert.ok(html.includes(`academy-${id}.html?from=content`)); assert.ok(fs.existsSync(`academy-${id}.html`));
  }
  for(const source of p.editorial.sources) {assert.ok(html.includes(source.url)); assert.equal(source.accessedAt,'2026-09-24');}
  assert.equal(c.constrainPostMarkup('<dl><dt>Val</dt><dd>Beskrivning</dd></dl>'),'<dl><dt>Val</dt><dd>Beskrivning</dd></dl>');
  assert.ok(!c.constrainPostMarkup('<dd onclick="evil()">x</dd>').includes('<dd onclick'));
  // Check the rendered article's local destinations, including shared navigation.
  for(const match of html.matchAll(/href="([^"#]+)(?:#[^"]*)?"/g)) {
    const url=new URL(match[1].replace(/&amp;/g,'&'),'https://nolltillmiljoner.se/');
    if(url.origin==='https://nolltillmiljoner.se') assert.ok(fs.existsSync(path.join('.',decodeURIComponent(url.pathname)||'index.html')) || url.pathname==='/');
  }
});
