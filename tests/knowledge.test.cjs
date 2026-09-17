const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const raw=require('../docs/internal/knowledge/catalog.cjs'),Core=require('../knowledge-core.js'),K=require('../knowledge-catalog.js'),R=require('../ntm-relations.js'),A=require('../academy-catalog.js'),Q=require('../scripts/knowledge_quality.cjs'),Builder=require('../scripts/build_knowledge.cjs');
const clone=x=>JSON.parse(JSON.stringify(x)),read=f=>fs.readFileSync(f,'utf8'),rules=JSON.parse(read('data/rule-registry.json'));
test('26 original questions have unique stable IDs/slugs and valid editorial/source metadata',()=>{
 assert.equal(K.publicEntries().length,26);assert.equal(K.categories.length,7);assert.deepEqual(Q.validate(raw,rules),[]);
 assert.equal(new Set(raw.entries.map(e=>e.id)).size,26);assert.equal(new Set(raw.entries.map(e=>e.slug)).size,26);
 assert.ok(raw.entries.every(e=>e.sources.length&&e.reviewedAt==='2026-09-15'));
 assert.ok(raw.entries.every(e=>e.fullAnswer!==A.lessons.find(l=>l.id===e.relatedLessonIds[0])?.sections.deep));
});
test('draft and needs-update content is excluded from catalog, search and generated pages',()=>{
 for(const status of ['draft','needs-update']){
  const data=clone(raw);data.entries[0].status=status;data.entries[0].question='PRIVATE DRAFT QUESTION';
  const publicCatalog=Core.create(data),generated=Builder.build(data);
  assert.equal(publicCatalog.url(data.entries[0].id),null);assert.equal(publicCatalog.search('PRIVATE').length,0);assert.equal(generated.pages.has(K.url(data.entries[0].id)),false);
  assert.ok(!generated.script.includes('PRIVATE DRAFT QUESTION'));assert.ok(!generated.pages.get('fragor-svar.html').includes('PRIVATE DRAFT QUESTION'));
 }
 const data=clone(raw);data.entries[0].status='reviewed';delete data.entries[0].publishedAt;assert.deepEqual(Q.validate(data,rules),[]);assert.ok(Core.create(data).url('pe'));
});
test('public projection excludes editorial notes, unknown keys and private source notes',()=>{
 const data=clone(raw);data.entries[0].internalEditorialNotes='PRIVATE-NOTE';data.entries[0].sources[0].internalNotes='PRIVATE-SOURCE';
 const generated=Builder.build(data);assert.ok(!generated.script.includes('PRIVATE'));assert.ok(![...generated.pages.values()].join().includes('PRIVATE'));
 assert.ok(!read('knowledge-catalog.js').includes('internalEditorialNotes'));assert.ok(!JSON.stringify(Core.project({...data,internal:'PRIVATE'})).includes('PRIVATE'));
});
test('search matches Swedish aliases, category, concepts and P/E punctuation',()=>{
 for(const [term,id] of [['vinst per aktie','eps'],['snittavkastning','cagr'],['mäklaravgift','fees'],['maklaravgift','fees'],['P/E','pe'],['price earnings growth','peg'],['USD SEK','fx']])assert.ok(K.search(term).some(e=>e.id===id),term);
 assert.equal(K.search('vinst per aktie')[0].id,'eps');assert.equal(K.search('nonexistent-secret').length,0);assert.equal(K.search('EPS','macro').length,0);
 assert.ok(K.search('','macro').every(e=>e.category==='macro'));assert.equal(K.search('Makro').length,3);assert.equal(K.search('<img onerror=alert(1)>').length,0);
});
test('reviewed question matching is deterministic and abstains on unknown input',()=>{
 assert.equal(K.ask('Vad är PEG?')[0].id,'peg');
 assert.equal(K.ask('Hur påverkar USD SEK min avkastning?')[0].id,'fx');
 assert.deepEqual(K.ask('Berätta om mina privata investeringar'),[]);
 assert.deepEqual(K.ask(''),[]);
 assert.ok(K.ask('PEG').every(e=>['reviewed','published'].includes(e.status)));
 assert.ok(!read('knowledge-ui.js').includes('fetch('));
});
test('direct definitions outrank shared concepts and preserve question intent',()=>{
 for(const [query,id] of [
  ['Vad är P/E?','pe'],['VAD AR P / E!!!','pe'],['Vad betyder P/E?','pe'],['P/E','pe'],
  ['Vad är forward P/E?','forward'],['Vad betyder trailing P/E?','forward'],
  ['Vad påverkar P/E?','pe'],['Varför spelar obligationsräntor roll för aktier?','bond-yields'],
  ['Vad är EPS?','eps'],['Vad är guidning?','guidance'],['LTTM','ttm'],['mäklaravgift','fees'],
 ]) {
  assert.equal(K.ask(query)[0]?.id,id,query);
  assert.deepEqual(K.ask(query).map(e=>e.id),K.ask(query).map(e=>e.id));
 }
 for(const query of ['Hur bakar jag pannkakor?','Vad är pepparkakor?','Berätta om mina privata investeringar'])assert.deepEqual(K.ask(query),[]);
 const data=clone(raw),direct=data.entries.find(e=>e.id==='pe');
 direct.question='Vad betyder '+('lång tydlig fråga ').repeat(12)+'P/E?';
 // An arbitrarily long overlapping alias must never overtake a direct question.
 data.entries.find(e=>e.id==='bond-yields').aliases.push(('lång tydlig fråga ').repeat(12).trim());
 assert.equal(Core.create(data).ask(direct.question.replace('betyder','är'))[0].id,'pe');
 data.entries.reverse();
 assert.equal(Core.create(data).ask(direct.question.replace('betyder','är'))[0].id,'pe');
});
test('publication gate rejects malformed sources, thin text, IDs, dates and references',()=>{
 for(const patch of [{id:'bad id'},{slug:'../../bad'},{status:'public'},{category:'missing'},{difficulty:'expert'},{reviewedAt:'2026-02-30'},{publishedAt:'2999-01-01'},{shortAnswer:''},{fullAnswer:''},{caveats:''},{sources:[]},{sources:[{title:'Unsafe',url:'javascript:alert(1)',reviewedAt:'2026-09-15'}]},{relatedLessonIds:['missing']},{aliases:null},{privateField:'secret'}]){
  const data=clone(raw);Object.assign(data.entries[0],patch);assert.ok(Q.validate(data,rules).length,JSON.stringify(patch));
 }
 const data=clone(raw);data.entries.push(clone(data.entries[0]));assert.ok(Q.validate(data,rules).some(e=>e.includes('duplicate')));
});
test('canonical relationships link every answer to Academy and tools and return to questions',()=>{
 const context=vm.createContext({});vm.runInContext(read('posts.js'),context);const catalog=R.catalog(vm.runInContext('NTM_POSTS',context));assert.deepEqual(R.validate(catalog,href=>require('../scripts/relation_destinations.cjs').destinationExists(process.cwd(),href)),[]);
 for(const e of K.publicEntries()){
  assert.ok(catalog.entities.some(n=>n.id==='knowledge-'+e.id&&n.url===K.url(e.id)));
  for(const id of e.relatedEntityIds)assert.ok(catalog.relations.some(r=>r.from==='knowledge-'+e.id&&r.to===id));
  for(const id of e.relatedLessonIds)assert.ok(catalog.relations.some(r=>r.from==='learn-'+id&&r.to==='knowledge-'+e.id));
 }
 assert.ok(read('academy-pe.html').includes('fragor-svar-pe-tal.html'));assert.ok(read('academy-currency.html').includes('fragor-svar-usd-sek-avkastning.html'));
});
test('each answer has unique metadata, indexable canonical, safe static text and sitemap entry',()=>{
 const titles=new Set(),sitemap=read('sitemap.xml');for(const e of K.publicEntries()){
  const html=read(K.url(e.id)),title=html.match(/<title>(.*?)<\/title>/)[1];assert.ok(!titles.has(title));titles.add(title);
  assert.ok(html.includes('name="robots" content="index, follow"'));assert.ok(html.includes('href="https://nolltillmiljoner.se/'+K.url(e.id)+'"'));assert.ok(sitemap.includes(K.url(e.id)));assert.ok(html.includes('data-knowledge-related'));assert.ok(html.includes(e.reviewedAt));
 }
 const data=clone(raw);data.entries[0].shortAnswer='<script>alert(1)</script> '+data.entries[0].shortAnswer;const generated=Builder.build(data);assert.ok(!generated.pages.get(K.url('pe')).includes('<script>alert(1)</script>'));assert.ok(generated.script.includes('\\u003cscript>'));
});
test('ISK uses current rule registry with no copied annual amounts and fails on overdue review',()=>{
 const e=K.entries.find(e=>e.id==='isk'),html=read(K.url(e.id)),r=rules.rules.find(r=>r.id==='isk');assert.equal(e.ruleId,'isk');assert.ok(html.includes('data-rule-registry="isk"'));assert.ok(html.includes(r.source));assert.ok(html.includes(r.nextReview));assert.ok(!JSON.stringify(e).includes('300000'));assert.ok(!JSON.stringify(e).includes('300 000'));
 const stale=clone(rules);stale.rules.find(r=>r.id==='isk').nextReview='2000-01-01';assert.ok(Q.validate(raw,stale).some(e=>e.includes('stale rule')));
});
test('worked examples match independent formulas and shared calculator math',()=>{
 const V=require('../valuation-core.js'),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8);
 near(V.multiple(150,6),25);near(V.cagr(10000,12100,2),.1);near((10*100+30*80)/40,85);near((1.1*.92-1)*100,1.2);near(30/15,2);near(10/125*100,8);near(20000000*50,1000000000);near((230/200-1)*100,15);near(.2*.5*100,10);near(9/300*100,3);
 for(const [id,text] of [['pe','P/E 25'],['cagr','21 %'],['gav','85 kr'],['fx','1,2 %'],['ttm','130'],['inflation','112,20']])assert.ok(K.entries.find(e=>e.id===id).example.includes(text));
});
test('knowledge analytics rejects search content and identifiers',()=>{
 const context=vm.createContext({document:{addEventListener(){},querySelector(){return null;}},location:{pathname:'/fragor-svar.html',search:'',origin:'https://test.local'},URL,URLSearchParams});context.window=context;vm.runInContext(read('ntm-product.js'),context);
 for(const name of ['knowledge_search','knowledge_answer_opened','knowledge_related_cta_clicked']){assert.equal(context.NTMEvents.emit(name,{query:'PRIVATE'}),false);assert.equal(context.NTMEvents.emit(name,{answer:'PRIVATE'}),false);assert.equal(context.NTMEvents.emit(name,{questionId:'PRIVATE'}),false);assert.equal(context.NTMEvents.emit(name),true);}
 assert.ok(!JSON.stringify(context.NTMEvents.snapshot()).includes('PRIVATE'));
});
