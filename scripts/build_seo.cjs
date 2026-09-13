// Materialize metadata and existing articles; run --check in tests. No network/dependencies.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const relations = require('../ntm-relations.js');
const { destinationExists } = require('./relation_destinations.cjs');
const root = path.resolve(__dirname, '..');
const base = 'https://nolltillmiljoner.se/';
const image = base + 'images/ntm-social.png';
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
const overrides = {
  'index.html': ['Investeringar, aktieanalys och börsverktyg | Noll till Miljoner', 'Utforska kalkylatorer för sparande, ränta på ränta och investeringar. Följ makro, bolagsrapporter och aktieanalys med Noll till Miljoner.'],
  'verktyg.html': ['Börsverktyg och kalkylatorer för ditt sparande | Noll till Miljoner', 'Räkna på ränta på ränta, utdelningar, FIRE, sparmål och aktievärdering. Välj bland Noll till Miljoners kalkylatorer för investeringar och privatekonomi.'],
  'ranta-pa-ranta.html': ['Investeringskalkylator – ränta på ränta och utdelningar | Noll till Miljoner', 'Beräkna ränta på ränta med startkapital och månadssparande. Använd utdelningsläget för att räkna på utdelningar och återinvestering över tid.'],
  'research.html': ['Aktieanalys med SEC-data och värderingsscenarier | Noll till Miljoner', 'Analysera NVIDIA, SoFi och CrowdStrike med normaliserad SEC-data. Räkna på värdering, jämför scenarier och spara din investeringstes lokalt.'],
  'resurser.html': ['Resurser för investeringar – YouTube, poddar och böcker | Noll till Miljoner', 'Upptäck NTM:s utvalda YouTube-kanaler, poddar och böcker om investeringar, ekonomi och personlig utveckling. Fler perspektiv för din egen research.'],
  'makro.html': ['Makrokalender – veckans ekonomiska händelser | Noll till Miljoner', 'Följ veckans makrohändelser, ekonomiska statistik och kommande publiceringar. Se kalendern och tidigare veckor hos Noll till Miljoner.'],
  'rapporter.html': ['Rapportkalender – veckans bolagsrapporter | Noll till Miljoner', 'Se veckans utvalda bolagsrapporter och bläddra bland tidigare rapportveckor. Planera din bevakning med Noll till Miljoners rapportkalender.'],
  'inlagg.html': ['Investeringsinlägg, bolagsnyheter och analyser | Noll till Miljoner', 'Läs NTM:s inlägg om bolag, investeringar och marknadsteman. Utforska nyheter, portföljidéer och sammanfattningar av utvalda videor.'],
  'community.html': ['Community för investeringar och sparande | Noll till Miljoner', 'Hitta Noll till Miljoners community och diskutera investeringar, sparande och marknaden med andra som delar intresset.'],
  'min-ntm.html': ['Min NTM – dina lokalt sparade analyser | Noll till Miljoner', 'Öppna dina sparade analyser, kalkylatorscenarier och senaste verktyg. Uppgifterna lagras lokalt i din webbläsare.'],
  'post.html': ['Öppna ett inlägg | Noll till Miljoner', 'Välj ett inlägg i Noll till Miljoners arkiv för att läsa analyser, bolagsnyheter och investeringstankar.'],
  'calculator.html': ['Kalkylatorn har flyttat | Noll till Miljoner', 'Öppna Noll till Miljoners investeringskalkylator för ränta på ränta och utdelningar.'],
  'investeringar.html': ['Inläggsarkivet har flyttat | Noll till Miljoner', 'Besök inläggsarkivet hos Noll till Miljoner för nyheter och investeringstankar.'],
};
const excluded = new Set(['min-ntm.html', 'post.html', 'calculator.html', 'investeringar.html']);
const redirects = { 'calculator.html': 'ranta-pa-ranta.html', 'investeringar.html': 'inlagg.html' };
const outputs = new Map();
function navigation(html, file) {
  html = html.replace(/\s*<footer class="trust-footer">[\s\S]*?<\/footer>/g, '');
  if (html.includes('src="script.js"')) html = html.replace('</main>', '</main>\n    <footer class="trust-footer"><a href="om-metod.html">Om NTM, integritet, metod och rättelser</a></footer>');
  const secondary = [['inlagg.html','Inlägg och videor'],['resurser.html','Resurser'],['makro.html','Makro'],['rapporter.html','Rapporter'],['community.html','Community']];
  const link = ([url,label]) => `<a href="${url}"${url === file ? ' class="active" aria-current="page"' : ''}>${label}</a>`;
  return html.replace(/<nav class="main-nav"[^>]*>([\s\S]*?)<\/nav>/, (_, body) => {
    const theme = body.match(/<div class="mobile-theme-row">[\s\S]*?<\/div>/)?.[0] || '';
    return `<nav class="main-nav" aria-label="Huvudnavigering">${theme}${[['verktyg.html','Verktyg'],['research.html','Research'],['min-ntm.html','Min NTM']].map(link).join('')}<details class="nav-learn"><summary>Lär dig</summary><div class="nav-learn-links">${secondary.map(link).join('')}</div></details></nav>`;
  });
}
function metadata(html, file, title, description, schema) {
  const canonical = base + (file === 'index.html' ? '' : redirects[file] || file);
  // Managed head fields remain static in delivered HTML, including social preview metadata.
  html = html.replace(/\s*<!-- SEO START -->[\s\S]*?<!-- SEO END -->/g, '')
    .replace(/\s*<title>[\s\S]*?<\/title>/g, '')
    .replace(/\s*<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[^>]*>/g, '')
    .replace(/\s*<link rel="(?:canonical|icon)"[^>]*>/g, '');
  const fields = { description, robots: excluded.has(file) ? 'noindex, follow' : 'index, follow',
    'og:title': title, 'og:description': description, 'og:url': canonical,
    'og:type': schema?.['@type'] === 'Article' ? 'article' : 'website', 'og:site_name': 'Noll till Miljoner',
    'og:locale': 'sv_SE', 'og:image': image, 'og:image:alt': 'Noll till Miljoner',
    'twitter:card': 'summary', 'twitter:title': title, 'twitter:description': description,
    'twitter:image': image, 'twitter:image:alt': 'Noll till Miljoner' };
  const block = '\n    <!-- SEO START -->\n    <title>' + escape(title) + '</title>\n'
    + Object.entries(fields).map(([key, value]) => `    <meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escape(value)}" />`).join('\n')
    + `\n    <link rel="canonical" href="${escape(canonical)}" />\n    <link rel="icon" type="image/png" href="images/ntm-icon.png" />`
    + (schema ? `\n    <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>` : '')
    + '\n    <!-- SEO END -->\n';
  return html.replace('</head>', block + '</head>');
}
for (const file of fs.readdirSync(root).filter((name) => name.endsWith('.html') && !name.startsWith('post-'))) {
  const html = read(file);
  const title = overrides[file]?.[0] || decode(html.match(/<title>(.*?)<\/title>/s)[1]);
  const description = overrides[file]?.[1] || decode(html.match(/<meta name="description" content="([^"]+)"/)[1]);
  const schema = file === 'index.html' ? { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Noll till Miljoner', url: base, inLanguage: 'sv' } : null;
  outputs.set(file, navigation(metadata(html, file, title, description, schema), file));
}
// Reuse the actual page renderer so article content and interactive structure cannot drift.
const context = vm.createContext({ document: { getElementById() { return null; }, querySelector() { return null; },
  querySelectorAll() { return []; }, addEventListener() {}, readyState: 'loading' },
  URL, URLSearchParams, location: { pathname: '/', search: '' }, console, setTimeout() {} });
context.window = context;
vm.runInContext(read('posts.js'), context);
vm.runInContext(read('ntm-relations.js'), context);
vm.runInContext(read('valuation-core.js'), context);
vm.runInContext(read('script.js'), context);
const posts = vm.runInContext('NTM_POSTS', context);
const relationCatalog = relations.catalog(posts);
// Generated articles may be new. Validate their canonical paths against the post registry.
const postFiles = new Set(posts.map(post => `post-${post.slug}.html`));
const relationErrors = relations.validate(relationCatalog, href => postFiles.has(href) || destinationExists(root, href));
if (relationErrors.length) throw new Error(relationErrors.join('\n'));
const postTemplate = outputs.get('post.html').replace('<script src="script.js">', '<script src="ntm-relations.js"></script>\n<script src="script.js">');
outputs.set('post.html', postTemplate.replace(/(?:<script src="ntm-relations.js"><\/script>\s*){2}/g, '<script src="ntm-relations.js"></script>\n'));
for (const [file, sources] of Object.entries(relations.placements)) {
  let html = outputs.get(file);
  if (!html) throw new Error('Missing relation surface: ' + file);
  if (sources.some(id => !relationCatalog.entities.some(e => e.id === id))) throw new Error('Unknown relation source for ' + file);
  const block = '<!-- NTM RELATIONS START -->\n' + sources.map(id => relations.render(relationCatalog, id)).join('\n') + '\n<!-- NTM RELATIONS END -->';
  html = html.replace(/\s*<!-- NTM RELATIONS START -->[\s\S]*?<!-- NTM RELATIONS END -->/g, '');
  html = html.replace('</main>', block + '\n    </main>');
  if (file === 'research.html' && !html.includes('src="ntm-relations-ui.js"')) html = html.replace('</body>', '<script src="ntm-relations-ui.js"></script>\n</body>');
  outputs.set(file, html);
}
let archive = '';
for (const post of posts) {
  if (!/^[a-z0-9-]+$/.test(post.slug)) throw new Error('Invalid article slug');
  const file = `post-${post.slug}.html`;
  const template = outputs.get('post.html').replace('id="postView"', `id="postView" data-post-slug="${post.slug}"`)
    .replace(/(<section id="postView"[^>]*>)[\s\S]*?(<\/section>)/, (_, start, end) => start + context.renderPostView(post) + end);
  const schema = { '@context': 'https://schema.org', '@type': 'Article', headline: post.title,
    description: post.excerpt, datePublished: post.date, dateModified: post.editorial.updatedAt, inLanguage: 'sv', mainEntityOfPage: base + file };
  outputs.set(file, metadata(template, file, `${post.title} | Noll till Miljoner`, post.excerpt, schema));
  archive += `<article class="resource-card"><h2 class="resource-card-title"><a href="${file}">${escape(post.title)}</a></h2><p>${escape(post.excerpt)}</p></article>`;
}
outputs.set('inlagg.html', outputs.get('inlagg.html').replace(/(<div id="postResults" class="archive-grid">)[\s\S]*?(<\/div><nav id="postPagination")/, `$1${archive}$2`));
const urls = [...outputs.keys()].filter((file) => !excluded.has(file)).sort().map((file) => base + (file === 'index.html' ? '' : file));
outputs.set('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map((url) => `  <url><loc>${escape(url)}</loc></url>`).join('\n') + '\n</urlset>\n');
outputs.set('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${base}sitemap.xml\n`);
const stale = [];
for (const [file, content] of outputs) {
  const previous = fs.existsSync(path.join(root, file)) ? read(file).replace(/\r\n/g, '\n') : null;
  const normalized = content.replace(/\r\n/g, '\n');
  if (previous !== normalized) {
    stale.push(file);
    if (!process.argv.includes('--check')) fs.writeFileSync(path.join(root, file), normalized, 'utf8');
  }
}
if (process.argv.includes('--check') && stale.length) { console.error('Run node scripts/build_seo.cjs: ' + stale.join(', ')); process.exitCode = 1; }
else console.log(`SEO: ${urls.length} canonical sitemap URLs, ${posts.length} existing articles; ${stale.length} files ${process.argv.includes('--check') ? 'outdated' : 'updated'}.`);
