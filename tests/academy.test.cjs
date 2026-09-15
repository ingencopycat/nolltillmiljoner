const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const A=require('../academy-catalog.js'),R=require('../ntm-relations.js');
const read=f=>fs.readFileSync(f,'utf8');
function app(){const saved=new Map();let n=0;const c=vm.createContext({console,URL,URLSearchParams,setTimeout(){},document:{getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},readyState:'loading'},localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},location:{pathname:'/',search:''},crypto:{randomUUID:()=>`event-${++n}`}});c.window=c;for(const f of ['valuation-core.js','script.js','research-snapshot.js','thesis-storage.js','research-outcomes.js','behavioral.js','academy-progress.js','local-data.js','cloud-sync.js'])vm.runInContext(read(f),c);return {c,saved,P:c.NTMAcademyProgress,B:c.NTMLocalData};}
test('Academy catalog has complete, unique, published lessons, valid paths and explicit relation destinations',()=>{
 assert.equal(A.published().length,29);assert.equal(new Set(A.lessons.map(l=>l.id)).size,A.lessons.length);assert.equal(new Set(A.lessons.map(l=>l.slug)).size,A.lessons.length);
 const catalog=R.catalog([]),ids=new Set(catalog.entities.map(e=>e.id));
 for(const l of A.lessons){assert.match(l.id,/^[a-z][a-z0-9-]+$/);assert.ok(A.categories.some(c=>c.id===l.category));assert.ok(['beginner','intermediate','advanced'].includes(l.difficulty));assert.ok(l.summary.length>70);assert.ok(Object.values(l.sections).every(v=>typeof v==='string'&&v.length>70));assert.ok(Object.values(l.sections).join(' ').split(/\s+/).length>130,l.id);for(const id of l.relatedEntityIds)assert.ok(ids.has(id));for(const id of l.relatedConcepts)assert.ok(A.url(id));for(const r of l.references){assert.match(r.url,/^https:\/\//);assert.equal(r.reviewedAt,'2026-09-15');}}
 for(const p of A.paths){assert.ok(p.lessons.length>=4);assert.equal(new Set(p.lessons).size,p.lessons.length);p.lessons.forEach(id=>assert.ok(A.url(id)));}
});
test('aliases, Swedish diacritics and category searches work without external search',()=>{
 assert.ok(A.search('vinst per aktie').some(l=>l.id==='eps'));assert.ok(A.search('courtage').some(l=>l.id==='fees'));assert.ok(A.search('ranta pa ranta').some(l=>l.id==='compounding'));assert.equal(A.search('unfindablexyz').length,0);assert.ok(A.search('','macro').every(l=>l.category==='macro'));
});
test('each published lesson has original static content, unique SEO and crawlable links; drafts are not generated',()=>{
 for(const file of fs.readdirSync('.').filter(f=>/^academy-.+\.html$/.test(f)))assert.ok(A.published().some(l=>A.url(l.id)===file)||require('../academy-activities.js').published().some(o=>require('../academy-activities.js').url(o.id)===file),'Unpublished artifact: '+file);
 const titles=new Set(),canonicals=new Set();for(const l of A.published()){const html=read(A.url(l.id));assert.ok(html.includes(l.sections.deep.replaceAll('&','&amp;')));assert.match(html,/<details><summary>Fördjupa/);assert.match(html,/<h1>/);assert.match(html,/name="robots" content="index, follow"/);assert.match(html,/data-academy-tool/);const title=html.match(/<title>(.*?)<\/title>/)[1],canonical=html.match(/rel="canonical" href="([^"]+)"/)[1];assert.ok(!titles.has(title));titles.add(title);assert.ok(!canonicals.has(canonical));canonicals.add(canonical);assert.ok(read('sitemap.xml').includes(canonical));}
 const lesson=A.lessons[0],old=lesson.status;try{lesson.status='draft';assert.equal(A.url(lesson.id),null);assert.ok(!A.published().includes(lesson));}finally{lesson.status=old;}
});
test('published learn entities and concept hooks resolve through Connected Experience',()=>{
 const c=vm.createContext({});vm.runInContext(read('posts.js'),c);const catalog=R.catalog(vm.runInContext('NTM_POSTS',c));
 assert.deepEqual(R.validate(catalog,url=>require('../scripts/relation_destinations.cjs').destinationExists(process.cwd(),url)),[]);
 for(const id of ['cagr','eps','pe','fcf','gav'])assert.equal(R.conceptHref(catalog,id),A.url(id));assert.equal(R.conceptHref(catalog,'missing'),null);
 assert.ok(R.query(catalog,'tool-valuation',{type:'learn'}).length);assert.ok(R.query(catalog,'post-ai-portfolj').some(r=>r.destination.type==='learn'));assert.ok(read('research.html').includes('data-concept-help="eps"'));
});
test('progress reload, category totals, completion reversal and unknown future IDs stay consistent',()=>{
 const a=app();a.P.set('eps','ongoing');a.P.set('eps','complete');a.P.set('cagr','complete');a.P.set('future-lesson','complete');const data=a.P.read().data;
 assert.equal(a.P.summarize(A.published(),data).done,2);assert.equal(a.P.summarize(A.published().filter(l=>l.category==='statements'),data).done,1);
 const b=app();b.saved.set(b.P.key,a.saved.get(a.P.key));assert.equal(b.P.state(b.P.read().data).get('eps').status,'complete');a.P.set('eps','ongoing');assert.equal(a.P.summarize(A.published(),a.P.read().data).done,1);
});
test('backup V3 roundtrip, legacy V1/V2 merge, conflicts and failed writes preserve progress',()=>{
 const a=app();a.P.set('cagr','complete');const backup=JSON.parse(a.B.exportJSON());assert.equal(backup.schemaVersion,3);const b=app();b.B.importJSON(JSON.stringify(backup));assert.deepEqual(JSON.parse(b.B.exportJSON()).data,backup.data);b.B.importJSON(JSON.stringify(backup));assert.equal(b.P.read().data.events.length,1);
 for(const version of [1,2]){const old=JSON.parse(JSON.stringify(backup));old.schemaVersion=version;delete old.data.academy;if(version===1)delete old.data.behavioral;b.B.importJSON(JSON.stringify(old));assert.equal(b.P.read().data.events.length,1);const fresh=app();fresh.B.importJSON(JSON.stringify(old));assert.equal(fresh.P.read().data.events.length,0);}
 const bad=JSON.parse(JSON.stringify(backup));bad.data.academy.events[0].status='ongoing';const before=b.saved.get(b.P.key);assert.throws(()=>b.B.importJSON(JSON.stringify(bad)),/ID/);assert.equal(b.saved.get(b.P.key),before);
 const missing=JSON.parse(JSON.stringify(backup));delete missing.data.academy;assert.throws(()=>b.B.importJSON(JSON.stringify(missing)),/lärhistorik/);
 b.saved.set(b.P.key,'{broken');assert.throws(()=>b.P.set('eps','complete'));assert.equal(b.saved.get(b.P.key),'{broken');assert.throws(()=>b.B.exportJSON());
 const d=app();d.c.localStorage.setItem=()=>{throw Error('full');};assert.throws(()=>d.P.set('eps','complete'));assert.equal(d.saved.size,0);
});
test('Academy never enters current cloud rows or queue and a cloud restore preserves local learning',async()=>{
 const a=app();a.P.set('private-learning-id','complete');const cloud=a.c.NTMCloudSync,rows=cloud.encode(JSON.parse(a.B.exportJSON()).data,a.B);assert.ok(!JSON.stringify(rows).includes('private-learning-id'));const data=cloud.decode(rows,a.B);assert.equal(data.academy.events.length,0);a.B.importJSON(JSON.stringify({application:'NTM',schemaVersion:1,exportedAt:new Date().toISOString(),data}));assert.equal(a.P.read().data.events.length,1);
 const sync=cloud.create({local:a.B,storage:a.c.localStorage,adapter:{session:async()=>({userId:'test-user'})},id:()=> 'queue-id'});await sync.authenticate();sync.enqueue();assert.ok(!JSON.stringify([...a.saved].filter(([k])=>k.includes('sync-queue'))).includes('private-learning-id'));
});

test('V3 attempts round-trip, merge once, migrate V2 Academy and reject conflicts atomically',()=>{
 const a=app();a.P.set('eps','complete');a.P.attempt('recovery','drawdown',false);a.P.attempt('recovery','drawdown',true);
 const backup=JSON.parse(a.B.exportJSON()),b=app();b.B.importJSON(JSON.stringify(backup));b.B.importJSON(JSON.stringify(backup));assert.equal(b.P.read().data.attempts.length,2);assert.deepEqual(JSON.parse(b.B.exportJSON()).data,backup.data);
 const legacy=JSON.parse(JSON.stringify(backup));legacy.data.academy={version:1,events:legacy.data.academy.events};b.B.importJSON(JSON.stringify(legacy));assert.equal(b.P.read().data.attempts.length,2);const fresh=app();fresh.B.importJSON(JSON.stringify(legacy));assert.equal(fresh.P.read().data.events.length,1);assert.equal(fresh.P.read().data.attempts.length,0);
 const bad=JSON.parse(JSON.stringify(backup));bad.data.academy.attempts[0].correct=true;const before=b.saved.get(b.P.key);assert.throws(()=>b.B.importJSON(JSON.stringify(bad)),/ID/);assert.equal(b.saved.get(b.P.key),before);
 const cloud=a.c.NTMCloudSync.encode(backup.data,a.B);assert.ok(!JSON.stringify(cloud).includes('drawdown'));
 b.c.localStorage.setItem=()=>{throw Error('quota');};assert.throws(()=>b.P.attempt('recovery','drawdown',true));assert.equal(b.saved.get(b.P.key),before);
});
test('optional checks have valid answers and explanations; no quiz or identity analytics payload',()=>{
 for(const l of A.lessons)for(const q of l.quiz){assert.ok(q.options.length>=2);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length);assert.ok(q.explanation.length>40);}
 const c=vm.createContext({document:{addEventListener(){},querySelector(){return null;}},location:{pathname:'/academy.html',search:'',origin:'https://test.local'},URL,URLSearchParams});c.window=c;vm.runInContext(read('ntm-product.js'),c);
 for(const event of ['academy_lesson_opened','academy_lesson_completed','academy_path_started','academy_tool_cta_clicked']){assert.equal(c.NTMEvents.emit(event,{answer:'SECRET',lessonId:'PRIVATE',query:'PRIVATE'}),false);c.NTMEvents.emit(event);}
 const output=JSON.stringify(c.NTMEvents.snapshot());assert.ok(!output.includes('SECRET'));assert.ok(!output.includes('PRIVATE'));assert.ok(output.includes('academy_lesson_completed'));assert.ok(!read('academy-ui.js').includes('emit(\'quiz'));
});
test('ISK lesson delegates dated parameters to the verified rule registry',()=>{
 const l=A.lessons.find(l=>l.id==='isk'),rules=JSON.parse(read('data/rule-registry.json'));assert.ok(rules.rules.some(r=>r.id===l.ruleId));assert.match(read(A.url(l.id)),/data-rule-registry="isk"/);assert.ok(!JSON.stringify(l.sections).includes('300000'));assert.ok(l.relatedEntityIds.includes('tool-tax'));
});

test('V2 publication rejects thin, unsourced, or disconnected lessons and invalid paths',()=>{
 const Q=require('../scripts/academy_quality.cjs'),bank=JSON.parse(read('docs/internal/academy/knowledge-bank.json'));
 assert.deepEqual(Q.validate(A,bank),[]);
 const l=A.lessons.find(l=>l.id==='eps'),old={sections:l.sections,references:l.references};
 try{l.sections={...l.sections,deep:''};l.references=[];assert.ok(Q.validate(A,bank).some(e=>e.includes('Incomplete lesson eps')));assert.ok(Q.validate(A,bank).some(e=>e.includes('Missing authoritative source eps')));}finally{Object.assign(l,old);}
 const p=A.paths[0],original=p.lessons;try{p.lessons=['unpublished'];assert.ok(Q.validate(A,bank).some(e=>e.includes('Invalid journey')));}finally{p.lessons=original;}
 assert.equal(A.lessons.filter(l=>l.extension).length,25);
 for(const l of A.lessons.filter(l=>l.extension)){assert.ok(l.extension.example.length>150,l.id);assert.ok(l.extension.interpretation.length>150,l.id);}
});

test('V2 beginner aliases resolve actual catalog topics',()=>{
 for(const [term,id] of [['börsvärde','aktier'],['fritt kassaflöde','fcf'],['snittavkastning','cagr'],['mäklaravgift','fees'],['pris/vinst','pe'],['balansräkning','financial-statements'],['återköp','dilution']])assert.ok(A.search(term).some(l=>l.id===id),term);
});

test('path completion depends on all saved states and reverses after undo',()=>{
 const p=A.paths.find(p=>p.id==='beginner'),states=new Map();states.set(p.lessons.at(-1),{status:'complete'});
 assert.equal(A.journey(p.id,states).complete,false);assert.equal(A.journey(p.id,states).next,p.lessons[0]);
 p.lessons.forEach(id=>states.set(id,{status:'complete'}));assert.equal(A.journey(p.id,states).complete,true);assert.equal(A.journey(p.id,states).next,null);
 states.set('fonder',{status:'ongoing'});assert.equal(A.journey(p.id,states).complete,false);assert.equal(A.journey(p.id,states).next,'fonder');assert.equal(A.journey('missing',states),null);
});

test('worked financial examples agree with independent fixtures and shared valuation math',()=>{
 const V=require('../valuation-core.js'),near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
 near(V.cagr(10000,12100,2),.1);near(V.multiple(100,5),20);near(V.reverse(100,5,2,10,20).requiredFutureEPS,6.05);
 near(V.scenario(100,5,10,2,20).targetPrice,121);near(V.scenario(100,5,10,2,20).peg,2);
 near((10*100+30*80)/40,85);near(1.1*.9-1,-.01);near(1/(1-.5)-1,1);
 near((800+300-100)/100,10);near(100+20-40-30,50);near(50+80,130);
 const fixtures=[['gav','85 kr'],['currency','−1 procent'],['position-sizing','100 procent'],['enterprise-value','1 000'],['financial-statements','−50 kr'],['eps','2,5 miljoner'],['marginal','40 procent']];
 for(const [id,expected] of fixtures){const l=A.lessons.find(l=>l.id===id);assert.ok(JSON.stringify([l.sections,l.extension]).includes(expected),id);}
 near(V.cagr(100,0,2),-1);assert.equal(V.cagr(-100,120,2),null);
});

test('knowledge bank starts empty and publication requires real reviewed provenance',()=>{
 const Q=require('../scripts/academy_quality.cjs'),bank=JSON.parse(read('docs/internal/academy/knowledge-bank.json'));assert.deepEqual(bank,{version:1,entries:[]});
 const entry={id:'synthetic-test-only',question:'Synthetic fixture, never published',answer:'A'.repeat(100),lessonId:'eps',category:'statements',sources:[{title:'IFRS',url:'https://www.ifrs.org/'}],reviewedAt:'2026-09-15',reviewedBy:'test-editor',status:'reviewed',provenance:'real-user-question-reviewed'};
 assert.deepEqual(Q.validateBank({version:1,entries:[entry]},A),[]);
 for(const change of [{provenance:'invented'},{reviewedBy:''},{reviewedAt:'2026-02-30'},{sources:[]},{sources:'bad'},{answer:42},{id:undefined},{category:'saving'},{lessonId:'draft-only'},{privateEmail:'not-allowed'}])assert.ok(Q.validateBank({version:1,entries:[{...entry,...change,status:'published'}]},A).length);
 assert.ok(Q.validateBank({version:1,entries:[entry,entry]},A).length);
});

test('new analytics signals accept no search, quiz, or financial content',()=>{
 const c=vm.createContext({document:{addEventListener(){},querySelector(){return null;}},location:{pathname:'/academy.html',search:'',origin:'https://test.local'},URL,URLSearchParams});c.window=c;vm.runInContext(read('ntm-product.js'),c);
 for(const event of ['academy_search','academy_path_completed','academy_xp_earned','academy_level_reached','academy_scenario_complete','academy_challenge_complete','academy_case_complete','academy_path_complete']){assert.equal(c.NTMEvents.emit(event,{query:'PRIVATE'}),false);assert.equal(c.NTMEvents.emit(event,{answer:'PRIVATE'}),false);assert.equal(c.NTMEvents.emit(event),true);}
 assert.ok(!JSON.stringify(c.NTMEvents.snapshot()).includes('PRIVATE'));
});
