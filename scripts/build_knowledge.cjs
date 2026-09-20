const fs=require('node:fs'),path=require('node:path');
const presentation=require('./knowledge_presentation.cjs');
const raw=require('../docs/internal/knowledge/catalog.cjs'),Core=require('../knowledge-core.js'),R=require('../ntm-relations.js');
const root=path.resolve(__dirname,'..'),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function build(input=raw,options={}){
 if(input.synthetic&&!options.synthetic)throw new Error('Synthetic catalogs require explicit in-memory test generation');
 const K=Core.create(input);
 const registry=JSON.parse(fs.readFileSync(path.join(root,'data/rule-registry.json'),'utf8'));
 const errors=require('./knowledge_quality.cjs').validate(input,registry);if(errors.length)throw new Error(errors.join('\n'));
 const catalog=R.catalog([]),entity=id=>catalog.entities.find(e=>e.id===id);
 const link=(id,label,extra='')=>{const answer=id.startsWith('knowledge-')&&K.entries.find(e=>e.id===id.slice(10)),e=answer?{url:K.url(answer.id),title:answer.question}:entity(id);if(!e?.url)throw new Error('Unknown knowledge destination '+id);return `<a href="${esc(e.url)}" ${extra}>${esc(label||e.title)}</a>`;};
 const shell=fs.readFileSync(path.join(root,'min-ntm.html'),'utf8').match(/<body[^>]*>([\s\S]*?)<main\b/)[1].replace('brand-subtitle">Min NTM','brand-subtitle">Fråga NTM');
 const page=(title,description,body,answer=false)=>`<!DOCTYPE html>\n<html lang="sv"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${esc(title)} | NTM Frågor &amp; svar</title><meta name="description" content="${esc(description)}" /><link rel="stylesheet" href="style.css" /><link rel="stylesheet" href="premium.css" /><link rel="stylesheet" href="knowledge.css" /><link rel="stylesheet" href="wave1.css" /><link rel="stylesheet" href="visual-v3-tokens.css" /><link rel="stylesheet" href="knowledge-experience.css" /></head><body class="visual-v3">${shell}<main id="main-content" class="container knowledge-shell" tabindex="-1">${body}</main><script src="knowledge-core.js"></script><script src="knowledge-catalog.js"></script><script src="ntm-product.js"></script><script src="valuation-core.js"></script><script src="script.js"></script><script src="academy-catalog.js"></script><script src="academy-activities.js"></script><script src="ntm-relations.js"></script><script src="knowledge-ui.js"></script><script src="knowledge-experience.js" defer></script><script src="wave1-context.js"></script><script src="wave1-ui.js"></script><script src="ntm-ui.js"></script></body></html>\n`;
 const categories=K.categories,category=id=>categories.find(c=>c.id===id).title;
 const pages=new Map();
 pages.set('fragor-svar.html',page('Fråga NTM','Granskade svar om investeringar och ekonomi, med exempel, källor och nästa steg i NTM.',presentation.landing(K)));
 for(const e of K.publicEntries()){
  const rows=R.query(catalog,'knowledge-'+e.id,{limit:20}),lessonRows=rows.filter(r=>r.to.startsWith('learn-')),toolRows=rows.filter(r=>!r.to.startsWith('learn-'));
  let rule='';if(e.ruleId){const r=registry.rules.find(r=>r.id===e.ruleId);rule=`<p class="note" data-rule-registry="${esc(r.id)}">Aktuella årsparametrar: ${link('tool-tax','ISK-kalkylatorn')}. Regelversion ${esc(r.effectiveFrom)}, källkontrollerad ${esc(r.lastVerified)}, nästa granskning ${esc(r.nextReview)}. <a href="${esc(r.source)}">Skatteverkets underlag för inkomstår ${r.effectiveYear}</a>.</p>`;}
  pages.set(K.url(e.id),page(e.question,e.shortAnswer,presentation.answer(e,K,rows,rule),true));
 }
 // Static category pages provide bounded, crawlable no-JS access. No synthetic answers.
 for(const c of categories){const answers=K.publicEntries().filter(e=>e.category===c.id);for(let offset=0;offset<answers.length;offset+=12){const number=offset/12+1,name=`fragor-svar-omrade-${c.id}-${number}.html`;pages.set(name,page(c.title+' – frågor och svar','Granskade frågor inom '+c.title.toLowerCase()+'.',`<h1>${esc(c.title)}</h1><p><a href="fragor-svar.html">Frågor &amp; svar</a></p><ul>${answers.slice(offset,offset+12).map(e=>`<li><a href="${K.url(e.id)}">${esc(e.question)}</a></li>`).join('')}</ul>${offset+12<answers.length?`<a href="fragor-svar-omrade-${c.id}-${number+1}.html">Nästa sida</a>`:''}`));}}
 for(const m of input.merges||[]){const target=K.url(m.toId);pages.set('fragor-svar-'+m.fromSlug+'.html',page('Svaret har flyttat','Den här granskade frågan har slagits samman med ett annat svar.',`<h1>Svaret har flyttat</h1><p><a href="${target}">Öppna det granskade svaret</a></p>`));}
 const payloads=new Map(Core.project(input).entries.map(e=>['data/knowledge/answers/'+e.id+'.json',JSON.stringify(e)+'\n']));
 const serialized=JSON.stringify(Core.index(input)).replace(/</g,'\\u003c');
 const script=`/* Generated compact index. Answer bodies are loaded on demand. */\n(function(root){const core=typeof module!=='undefined'?require('./knowledge-core.js'):root.NTMKnowledgeCore;const api=typeof module!=='undefined'?require('./scripts/knowledge_source.cjs'):core.create(${serialized});root.NTMKnowledgeCatalog=api;if(typeof module!=='undefined')module.exports=api;})(typeof window!=='undefined'?window:globalThis);\n`;
 return {pages,script,payloads};
}
module.exports={build};
