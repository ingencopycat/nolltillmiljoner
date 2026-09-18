const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function app(){const raw={};const storage={getItem:k=>raw[k]??null,setItem:(k,v)=>{raw[k]=v;Object.defineProperty(storage,k,{value:v,configurable:true,enumerable:true});},removeItem:k=>{delete raw[k];delete storage[k];}};const session=new Map();let id=0;
 const c=vm.createContext({localStorage:storage,sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},console,crypto:{randomUUID:()=>`id-${++id}`},document:{readyState:'loading',getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){}},location:{pathname:'/'},setTimeout(){}});c.window=c;
 for(const f of ['valuation-core.js','script.js','research-snapshot.js','thesis-storage.js','research-continuity.js','change-detection.js','research-outcomes.js','behavioral.js','academy-progress.js','local-data.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
 return {c,C:c.NTMContinuity,S:c.NTMThesisStorage,storage};}
const clone=x=>JSON.parse(JSON.stringify(x));
const thesis=()=>({text:'Belief',origin:'manual',companyName:'ACME',companyIdentity:{type:'ticker',key:'ACME'},valuationSnapshot:null,reviewDate:'2020-01-01',assumptions:['Margin'],assumptionDetails:[{id:'a',reviewBy:'2020-01-01',status:'current',falsification:'Below own criterion',assessment:'unreviewed',note:''}],reportQuestions:[{id:'q',text:'Why?',status:'open',answer:''}]});
const change=()=>({metrics:[{name:'Revenue',snapshot:100,current:110,absolute:10,pct:10}],margins:[],filings:[{form:'10-Q',accessionNumber:'a',filingDate:'2026-01-01'}],blocked:[],periodChange:{from:'FY2024',to:'FY2025'},snapshotDate:'2020-01-01'});

test('derived states and exact overlap order; inactive does not create attention',()=>{
 const {C}=app(),t=thesis(),due=C.reasons(t,null),changed=C.reasons({...t,reviewDate:null,assumptionDetails:[],reportQuestions:[]},change());
 const all={thesis:t,reasons:[...due,...changed],draft:true,exact:true,error:true};
 assert.equal(C.select(all).state,'blocked');delete all.error;all.restore=true;assert.equal(C.select(all).state,'blocked');delete all.restore;
 assert.equal(C.select(all).state,'exact');delete all.exact;assert.equal(C.select(all).state,'due');all.reasons=changed;assert.equal(C.select(all).state,'changed');all.reasons=[];assert.equal(C.select(all).state,'draft');delete all.draft;assert.equal(C.select(all).state,'active');
 assert.equal(C.select().state,'new');assert.equal(C.select({thesis:t,editing:true}).state,'update');for(const context of ['checkpoint','outcome'])assert.equal(C.select({thesis:t,context}).state,context);
 for(const decision of ['close','abstain']){const closed={...t,review:{decision}};assert.equal(C.reasons(closed,change()).length,0);assert.ok(['closed','declined'].includes(C.select({...all,thesis:closed}).state));}
});
test('ack fingerprints ignore capture time/order, retain unanswered questions, reopen only changed evidence',()=>{
 const {C}=app(),t=thesis(),r=change(),rows=C.reasons(t,r),selected=rows.filter(x=>x.type!=='question').map(x=>x.key);
 t.review={decision:'keep',changeKey:C.reviewKey(t,selected)};
 assert.deepEqual(clone(C.reasons(t,{...r,snapshotDate:'2099-01-01'}).map(x=>x.type)),['question']);
 r.metrics[0].current=111;assert.deepEqual(clone(C.reasons(t,r).map(x=>x.type)),['question','metrics']);
 t.reviewDate='2021-01-01';assert.ok(C.reasons(t,r).some(x=>x.type==='date'));
 t.reportQuestions[0].text='New question';assert.notEqual(C.reasons(t,r).find(x=>x.type==='question').key,rows.find(x=>x.type==='question').key);
});
test('legacy whole-report acknowledgements remain quiet without rewriting original storage',()=>{
 const {C}=app(),r=change(),t={...thesis(),reviewDate:null,assumptionDetails:[],reportQuestions:[],review:{decision:'keep',changeKey:JSON.stringify(r)}};
 assert.equal(C.reasons(t,{...r,snapshotDate:'changed'}).length,0);
});
test('blocked/incomparable observations never become comparable-change lifecycle',()=>{
 const {C}=app(),t={...thesis(),reviewDate:null,assumptionDetails:[],reportQuestions:[]},rows=C.reasons(t,{blocked:[{name:'EPS',reason:'share basis'}]});
 assert.equal(rows[0].type,'blocked');assert.equal(C.select({thesis:t,reasons:rows}).state,'active');
});
test('exact target rejects deleted, replaced, mutated, expired, unknown-version and changed-evidence targets',()=>{
 const {C,S}=app();S.save('ACME',thesis());const t=S.get('ACME').thesis,r=change(),target=C.makeTarget('ACME',t,C.reasons(t,r),r);
 assert.equal(C.resolve(target,'ACME',t,r),target);
 for(const bad of [null,{...t,latestRevisionId:'other'},{...t,revisions:t.revisions.map(v=>({...v,text:'tampered'}))}])assert.throws(()=>C.resolve(target,'ACME',bad,r));
 for(const bad of [{...target,version:99},{...target,createdAt:0},{...target,createdAt:Date.now()+99999},{...target,questionIds:['missing']},{...target,reasonKeys:['unknown']}])assert.throws(()=>C.resolve(bad,'ACME',t,r));
 assert.throws(()=>C.resolve(target,'OTHER',t,r));assert.throws(()=>C.resolve(target,'ACME',t,{...r,metrics:[]}));
});
test('draft validation, corruption, quota and optimistic concurrent writes preserve original bytes',()=>{
 const {C,storage}=app(),value={...C.empty(),draft:{base:null,fields:{'thesis-text':'private'},mode:'manual',pending:null,updatedAt:Date.now()}};
 const raw=C.write('ACME',value,null);assert.equal(C.read('ACME').raw,raw);
 assert.throws(()=>C.write('ACME',{...value,draft:null},null));assert.equal(C.read('ACME').raw,raw);
 for(const bad of [{...value,extra:1},{...value,draft:{...value.draft,fields:{authToken:'secret'}}},{...value,draft:{...value.draft,fields:{'thesis-text':'x'.repeat(20001)}}}])assert.throws(()=>C.validate(bad));
 storage.setItem(C.prefix+'ACME','{bad');assert.ok(C.read('ACME').error);assert.equal(storage.getItem(C.prefix+'ACME'),'{bad');
});
test('snooze is scoped to exact evidence until the chosen local date, no journal mutation',()=>{
 const {C,S,storage}=app();S.save('ACME',thesis());const before=storage.getItem(S.key),rows=C.reasons(S.get('ACME').thesis,change(),'2026-01-01');
 C.snooze('ACME',[rows[0].key],'2026-02-01','2026-01-01');const w=C.read('ACME').value;
 assert.equal(C.visible(rows,w,'2026-01-31').length,rows.length-1);assert.equal(C.visible(rows,w,'2026-02-01').length,rows.length);
 assert.equal(storage.getItem(S.key),before);assert.throws(()=>C.snooze('ACME',[rows[0].key],'2026-01-01','2026-01-01'));
});
test('keep, revise, close, decline preserve append-only history and acknowledgement through backup/import',()=>{
 for(const decision of ['keep','revise','close','abstain']){const {C,S,c}=app();S.save('ACME',thesis());const first=clone(S.get('ACME').thesis.revisions[0]),t=S.get('ACME').thesis,key=C.reviewKey(t,C.reasons(t,null).map(x=>x.key));
  const result=decision==='revise'?S.save('ACME',{...t,text:'Revised',review:{decision,at:new Date().toISOString(),sourceRevisionId:t.latestRevisionId,context:'Reason',changeKey:key}}):S.completeReview('ACME',decision,'Reason',null,null,key);
  assert.equal(result.success,true);assert.deepEqual(clone(S.get('ACME').thesis.revisions[0]),first);
  const backup=c.NTMLocalData.exportJSON();const b=app();b.c.NTMLocalData.importJSON(backup);assert.equal(b.S.get('ACME').thesis.review.changeKey,key);
 }
});
test('drafts excluded from backup; import leaves drafts untouched; full deletion includes companions',()=>{
 const {C,S,c,storage}=app();S.save('ACME',thesis());const d={...C.empty(),draft:{base:null,fields:{'thesis-text':'PRIVATE DRAFT'},mode:'manual',pending:null,updatedAt:Date.now()}};C.write('ACME',d,null);
 const exported=c.NTMLocalData.exportJSON();assert.ok(!exported.includes('PRIVATE DRAFT'));c.NTMLocalData.importJSON(exported);assert.ok(C.read('ACME').value.draft);
 c.sessionStorage.setItem(C.targetKey,JSON.stringify({ticker:'ACME',stamp:'private'}));
 c.NTMLocalData.deleteTicker('ACME','all');assert.equal(c.sessionStorage.getItem(C.targetKey),null);assert.equal(storage.getItem(C.prefix+'ACME'),null);
 C.write('ACME',d,null);c.sessionStorage.setItem(C.targetKey,JSON.stringify({ticker:'ACME'}));c.NTMLocalData.clearAll();assert.equal(c.sessionStorage.getItem(C.targetKey),null);assert.equal(storage.getItem(C.prefix+'ACME'),null);
 S.save('ACME',thesis());C.write('ACME',d,null);assert.equal(S.remove('ACME').success,true);assert.equal(storage.getItem(C.prefix+'ACME'),null);
});
test('filing accession deduplication distinguishes amendments and keeps unsupported forms out',()=>{
 const {c}=app(),data={filings:[{form:'10-Q',filingDate:'2026-01-01',accessionNumber:'a'},{form:'10-Q',filingDate:'2026-01-01',accessionNumber:'a'},{form:'10-Q/A',filingDate:'2026-01-02',accessionNumber:'b'},{form:'8-K',filingDate:'2026-01-03',accessionNumber:'c'}]};
 const rows=c.NTMChangeDetection.getFilingsSinceSnapshot({capturedAt:'2025-01-01'},data);assert.equal(rows.length,2);assert.equal(rows[0].form,'10-Q/A');
});
test('draft quota failure and full-deletion failure preserve journal and companion',()=>{
 const {C,S,storage}=app(),d={...C.empty(),draft:{base:null,fields:{'thesis-text':'private'},mode:'manual',pending:null,updatedAt:Date.now()}};
 S.save('ACME',thesis());const raw=C.write('ACME',d,null),journal=storage.getItem(S.key),set=storage.setItem,remove=storage.removeItem;
 storage.setItem=()=>{throw Error('QuotaExceededError');};assert.throws(()=>C.write('ACME',{...d,draft:{...d.draft,updatedAt:1}},raw));assert.equal(storage.getItem(C.prefix+'ACME'),raw);storage.setItem=set;
 storage.removeItem=k=>{if(k===C.prefix+'ACME')throw Error('blocked');return remove(k);};assert.equal(S.remove('ACME').success,false);assert.equal(storage.getItem(S.key),journal);assert.equal(storage.getItem(C.prefix+'ACME'),raw);
});
test('bounded workspaces, empty cleanup and explicitly reopened draft priority',()=>{
 const {C}=app(),d={...C.empty(),draft:{base:null,fields:{'thesis-text':'private'},mode:'manual',pending:null,updatedAt:Date.now()}};
 for(let i=0;i<20;i++)C.write('C'+i,d,null);assert.throws(()=>C.write('C21',d,null));
 C.write('C0',C.empty(),C.read('C0').raw);assert.equal(C.keys().length,19);C.write('C21',d,null);
 assert.equal(C.select({thesis:{...thesis(),review:{decision:'close'}},draft:true,editing:true}).state,'draft');
});
