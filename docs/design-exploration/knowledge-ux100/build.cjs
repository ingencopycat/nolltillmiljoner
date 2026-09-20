/* Local review artifacts only. Run from the repository root. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),out=__dirname;
const K=require(path.join(root,'scripts/knowledge_source.cjs'));
const R=require(path.join(root,'ntm-relations.js')).catalog([]);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const actions={};
for(const e of K.entries)actions[e.id]=[...new Set([...(e.relatedEntityIds||[]),...(e.relatedLessonIds||[]).map(id=>'learn-'+id)])].map(id=>R.entities.find(r=>r.id===id&&r.status==='published'&&r.url)).filter(Boolean).map(({title,url,type})=>({title,url,type}));
fs.writeFileSync(path.join(out,'actions.json'),JSON.stringify(actions));
const queries=['Vad är P/E?','Är P/E 40 dyrt?','marginal','P/E vs P/S','Aktien kostar 100 SEK och årlig EPS är 5 SEK vad är P/E?','Och forward då?','Vad är en aktie?','Hur fungerar kvantdatorer?','Är NVIDIA ett köp?'];
fs.writeFileSync(path.join(out,'fixtures.json'),JSON.stringify(queries.map(question=>({question,outcome:K.respond(question)})),null,2));
const e=K.entries.find(e=>e.id==='pe');
const sources=e.sources.map(s=>`<li><a href="${esc(s.url)}" rel="noreferrer">${esc(s.title)}</a></li>`).join('');
fs.writeFileSync(path.join(out,'direct.html'),`<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(e.question)} · NTM lokal utforskning</title><link rel="stylesheet" href="/visual-v3-tokens.css"><link rel="stylesheet" href="./exploration.css"></head><body class="visual-v3 direct-page"><a class="skip" href="#main">Till svaret</a><header class="site-header"><a class="brand" href="./app.html"><img src="/images/ntm-logo.webp" alt="" width="34" height="34">NOLL TILL MILJONER</a><nav aria-label="Huvudnavigering"><a href="/verktyg.html">Verktyg</a><a href="/research.html">Research</a><a href="./app.html">Fråga NTM</a></nav><button id="theme" aria-label="Växla tema">◐</button></header><main id="main" class="direct-reading"><p class="eyebrow">NTM:s granskade kunskapsbank</p><h1>${esc(e.question)}</h1><p class="lead">${esc(e.shortAnswer)}</p><p class="trust">Senast granskad ${esc(e.reviewedAt)}</p><h2>Fördjupa</h2><p>${esc(e.fullAnswer)}</p><h2>Exempel</h2><p>${esc(e.example)}</p><h2>Begränsningar</h2><p>${esc(e.caveats)}</p><h2>Källor</h2><ul>${sources}</ul><h2>Fortsätt utforska</h2>${e.relatedAnswers.map(r=>`<p><a href="./app.html?id=${r.id}">${esc(K.entries.find(x=>x.id===r.id).question)}</a></p>`).join('')}<p><a href="./app.html" class="primary-btn">Ställ en fråga till NTM →</a></p><p><a href="/${K.url(e.id)}">Befintlig kanonisk sida</a> · Lokal layoututforskning, ingen ny publicering.</p></main><script src="./direct.js"></script></body></html>`);
const files=cp.execFileSync('git',['ls-files','-z'],{cwd:root}).toString().split('\0').filter(Boolean).filter(f=>!f.startsWith('docs/design-exploration/knowledge-ux100/'));
const baseline=path.join(out,'production-baseline.json');
if(!fs.existsSync(baseline))fs.writeFileSync(baseline,JSON.stringify(Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')])),null,2));
console.log(`Built local public relation projection and static P/E page; ${K.entries.length} objects / ${K.knowledgeConcepts.length} concepts. Production files untouched.`);
