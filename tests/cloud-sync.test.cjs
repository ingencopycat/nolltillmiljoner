const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const clone=v=>JSON.parse(JSON.stringify(v));
function app(saved=new Map()) {
  let id=0;
  const c=vm.createContext({URL,URLSearchParams,setTimeout(){},clearTimeout(){},AbortController,
    document:{getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},readyState:'loading'},
    localStorage:{getItem:k=>saved.has(k)?saved.get(k):null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},
    location:{pathname:'/',search:''},crypto:{randomUUID:()=>`new-${++id}`}});
  c.window=c;
  for(const file of ['valuation-core.js','script.js','research-snapshot.js','thesis-storage.js','research-outcomes.js','behavioral.js','local-data.js','cloud-sync.js','cloud-adapter.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
  const manual=()=>c.NTMThesisStorage.save('ACME',{text:'PRIVATE thesis',origin:'manual',companyName:'Manual',companyIdentity:{type:'ticker',key:'ACME'},
    assumptions:['Evidence'],assumptionDetails:[{status:'current',assessment:'unreviewed',falsification:'Counterevidence',reviewBy:'2030-01-01'}],
    reportQuestions:[{text:'Report question',status:'open'}],valuationSnapshot:null});
  return {c,saved,local:c.NTMLocalData,api:c.NTMCloudSync,manual};
}
function server(api) {
  const users=new Map();let writes=0,fail=0;
  const err=code=>Object.assign(new Error(code),{code});
  function adapter(uid) {
    let current=uid;
    const requireUser=()=>{if(!current)throw err('auth');return current;};
    return {session:async()=>current?{userId:current}:null,
      async put(records){const user=requireUser();if(fail-->0)throw err('offline');
        const rows=clone(users.get(user)||[]);
        for(const r of records){api.checkRow(r);const prior=rows.find(p=>api.key(p)===api.key(r));
          if(prior && api.stable(prior)!==api.stable(r))throw err('conflict');if(!prior)rows.push(clone(r));}
        users.set(user,rows);writes++;return {userId:user,accepted:records.map(api.key)};},
      async list(){const user=requireUser();return {userId:user,records:clone(users.get(user)||[])};},
      async deleteAccount(){const user=requireUser();users.delete(user);current=null;return {deletedUserId:user};},
      async logout(){current=null;},switchUser:user=>{current=user;}};
  }
  return {adapter,users,writes:()=>writes,fail:n=>{fail=n;}};
}
function setup(a,s,uid='user-a',clock=()=>Date.now()) {
  const adapter=s.adapter(uid);let n=0;
  return {adapter,e:a.api.create({local:a.local,storage:a.c.localStorage,adapter,now:clock,id:()=>`pref-${++n}`})};
}

test('anonymous/login never uploads; migration is explicit, idempotent and restores manual history and preferences',async()=>{
  const a=app();a.manual();a.saved.set('investment-theme','dark');a.saved.set('secret-token','NEVER');a.saved.set('investment-recent-tools-v1','EXCLUDED');
  const s=server(a.api),{e}=setup(a,s),before=a.local.exportJSON();
  assert.equal(e.status(),'local');await e.authenticate();assert.equal(s.writes(),0);assert.deepEqual(JSON.parse(a.local.exportJSON()).data,JSON.parse(before).data);
  e.enqueue();assert.equal(e.status(),'pending');await e.flush();assert.equal(e.status(),'synced');
  e.enqueue();await e.flush();assert.equal(s.writes(),1);
  assert.ok(!JSON.stringify(s.users).includes('NEVER'));
  const exported=await e.exportCloud();assert.ok(!exported.account.includes('NEVER'));assert.ok(!exported.account.includes('EXCLUDED'));
  const b=app(),next=setup(b,s);await next.e.authenticate();assert.equal(b.local.counts().revisions,0);
  await next.e.restore();assert.deepEqual(JSON.parse(b.local.exportJSON()).data,JSON.parse(before).data);
  const fresh=setup(b,s,'user-b');await fresh.e.authenticate();fresh.e.enqueue();await fresh.e.flush();
  assert.deepEqual((await fresh.adapter.list()).records.filter(r=>r.kind!=='preference'),(await next.adapter.list()).records.filter(r=>r.kind!=='preference'));
});

test('supported snapshots, archived outcomes, scenario plans/observations and envelope metadata round-trip',()=>{
  const a=app(),stock=JSON.parse(fs.readFileSync('data/stocks/NVDA.json','utf8'));
  const snapshot={...a.c.NTMResearchSnapshot.fromStockData(stock),schemaVersion:2,ticker:'NVDA',valuationInputs:{stockPrice:120,years:5},scenarios:{}};
  a.c.NTMThesisStorage.save('NVDA',{text:'Frozen',valuationSnapshot:snapshot});
  const rev=a.c.NTMThesisStorage.get('NVDA').thesis.revisions[0];
  assert.equal(a.c.NTMResearchOutcomes.save(a.c.NTMResearchOutcomes.observe('NVDA',rev,stock,123)).success,true);
  a.c.NTMScenarioStorage.save('sparmal',{name:'Plan',mode:'monthly',inputs:{test:{value:'10',type:'number'}}});
  const data=JSON.parse(a.local.exportJSON()).data;
  const scenario=data.scenarios.calculators.sparmal[0];
  scenario.followup={version:1,plan:{startDate:'2020-01-01',currency:'SEK',start:100,monthlySavings:10,target:1000,months:12,annualReturn:5,annualFee:0,inflation:2,moneyMode:'nominal',monthlyRate:Math.pow(1.05,1/12)-1},
    observations:[{id:'observation-1',createdAt:'2020-02-01T00:00:00Z',date:'2020-02-01',amount:115}]};
  data.theses.custom='retain';
  const rows=a.api.encode(data,a.local),restored=a.api.decode(rows,a.local);
  assert.deepEqual(clone(restored),data);assert.ok(rows.some(r=>r.kind==='observation'));
  assert.equal(restored.outcomes.checkpoints[0].sourceRevision.text,'Frozen');
});

test('queue reload, bounded backoff, inspectable failures, no duplicate retry and cross-account separation',async()=>{
  const a=app();a.manual();let time=0;
  const s=server(a.api),first=setup(a,s,'user-a',()=>time);await first.e.authenticate();first.e.enqueue();s.fail(1);
  await assert.rejects(()=>first.e.flush());assert.equal(first.e.status(),'error');
  const b=app(a.saved),second=setup(b,s,'user-a',()=>time);await second.e.authenticate();
  await second.e.flush();assert.equal(s.writes(),0);time=3000;await second.e.flush();assert.equal(second.e.status(),'synced');
  const other=setup(b,s,'user-b');await other.e.authenticate();assert.equal(other.e.inspect().ops.length,0);
  a.c.NTMThesisStorage.save('ACME',{...a.c.NTMThesisStorage.get('ACME').thesis,text:'New'});second.e.enqueue();s.fail(10);
  for(let i=0;i<3;i++){time+=20000;await assert.rejects(()=>second.e.flush());}
  assert.equal(second.e.inspect().ops.filter(o=>o.status==='error')[0].attempts,3);
  time+=20000;await second.e.flush();assert.equal(second.e.status(),'error');
  const raw=a.saved.get(a.api.PREFIX+'user-a');assert.ok(!raw.includes('access_token'));
});

test('conflicting IDs and corrupt cloud/local data never overwrite history; receipts require confirmation',async()=>{
  const a=app();a.manual();const s=server(a.api),{e,adapter}=setup(a,s);await e.authenticate();e.enqueue();await e.flush();
  const before=JSON.parse(a.local.exportJSON()).data;
  s.users.get('user-a').find(r=>r.kind==='revision').payload.text='CONFLICT';
  await assert.rejects(()=>e.restore());assert.deepEqual(JSON.parse(a.local.exportJSON()).data,before);
  const b=app(),be=setup(b,s);await be.e.authenticate();s.users.get('user-a').push({kind:'unknown'});
  await assert.rejects(()=>be.e.restore());assert.equal(b.local.counts().revisions,0);
  a.saved.set('investment-research-theses-v1','{broken');assert.throws(()=>e.enqueue());
  const c=app();c.manual();const fake=setup(c,s,'user-c');await fake.e.authenticate();fake.e.enqueue();
  fake.adapter.put=async()=>({userId:'user-c',accepted:[]});await assert.rejects(()=>fake.e.flush());assert.equal(fake.e.status(),'error');
});

test('cloud deletion preserves local by default; explicit local removal and logout retain their boundaries',async()=>{
  const a=app();a.manual();const s=server(a.api),one=setup(a,s);await one.e.authenticate();one.e.enqueue();await one.e.flush();
  const before=JSON.parse(a.local.exportJSON()).data;await one.e.deleteAccount();
  assert.equal(one.e.owner(),null);assert.equal(s.users.has('user-a'),false);assert.deepEqual(JSON.parse(a.local.exportJSON()).data,before);
  assert.equal(a.saved.has(a.api.PREFIX+'user-a'),false);
  const two=setup(a,s,'user-b');await two.e.authenticate();two.e.enqueue();await two.e.flush();await two.e.deleteAccount({deleteLocal:true});
  assert.equal(a.local.counts().revisions,0);
  a.manual();const three=setup(a,s,'user-c');await three.e.authenticate();three.e.enqueue();await three.e.logout();
  assert.equal(three.e.status(),'local');assert.equal(a.local.counts().revisions,1);assert.ok(a.saved.has(a.api.PREFIX+'user-c'));
});

test('real adapter rejects private/malformed config and does not persist session or echo error bodies',async()=>{
  const a=app(),valid={enabled:true,url:'https://ntm-test.supabase.co',publishableKey:'sb_publishable_testOnly'};
  for(const c of [{...valid,url:'https://evil.test'}, {...valid,publishableKey:'sb_secret_forbidden'}, {...valid,publishableKey:'eyJlegacyAdminKey'}])assert.throws(()=>a.c.NTMCloudAdapter.validConfig(c));
  let time=0;const calls=[];
  const adapter=a.c.NTMCloudAdapter.create(valid,{now:()=>time,fetch:async(url,options)=>{
    calls.push({url,options});return {ok:true,status:200,json:async()=>({access_token:'TEST_MEMORY_TOKEN',refresh_token:'DO_NOT_STORE',user:{id:'user-a'},expires_in:1})};}});
  await adapter.verifyOtp('test@example.invalid','000000');assert.equal((await adapter.session()).userId,'user-a');
  assert.equal(a.saved.size,0);time=1001;assert.equal(await adapter.session(),null);
  await assert.rejects(()=>adapter.list());
});

test('legacy IDs, empty scenario groups, additional histories and read-only local use survive cloud preparation',async()=>{
  const a=app();a.saved.set('investment-research-theses-v1',JSON.stringify({version:1,theses:{ACME:{text:'Legacy',createdAt:'2020-01-01',custom:'preserve',valuationSnapshot:null}}}));
  a.saved.set('investment-scenarios-v1',JSON.stringify({version:1,calculators:{sparmal:[]}}));
  const raw=a.saved.get('investment-research-theses-v1'),data=JSON.parse(a.local.exportJSON()).data;
  const restored=a.api.decode(a.api.encode(data,a.local),a.local);
  assert.deepEqual(clone(restored),data);assert.equal(data.theses.theses.ACME.revisions[0].id,'legacy-ACME');
  assert.equal(a.saved.get('investment-research-theses-v1'),raw);
  const s=server(a.api),{e}=setup(a,s);await e.authenticate();e.enqueue();await e.flush();
  const prior=clone(data.theses.theses.ACME.revisions[0]);a.c.NTMThesisStorage.save('ACME',{text:'A later local review',valuationSnapshot:null});
  assert.equal(e.status(),'local');e.enqueue();await e.flush();
  const b=app(),next=setup(b,s);await next.e.authenticate();await next.e.restore();
  assert.equal(b.local.counts().revisions,2);assert.deepEqual(JSON.parse(b.local.exportJSON()).data.theses.theses.ACME.revisions[0],prior);
});

test('queue corruption, blocked writes and concurrent tab changes fail without replacing a queue or local source',async()=>{
  const a=app();a.manual();const s=server(a.api),{e,adapter}=setup(a,s);await e.authenticate();e.enqueue();
  const queueKey=a.api.PREFIX+'user-a',raw=a.saved.get(queueKey),local=JSON.parse(a.local.exportJSON()).data;
  a.saved.set(queueKey,'{bad');assert.throws(()=>e.enqueue());assert.equal(a.saved.get(queueKey),'{bad');
  a.saved.set(queueKey,raw);const originalPut=adapter.put;
  adapter.put=async records=>{const receipt=await originalPut(records);a.saved.set(queueKey,raw+' ');return receipt;};
  await assert.rejects(()=>e.flush());assert.equal(a.saved.get(queueKey),raw+' ');
  assert.deepEqual(JSON.parse(a.local.exportJSON()).data,local);
  a.saved.set(queueKey,raw);a.c.localStorage.setItem=()=>{throw new Error('quota');};
  assert.throws(()=>e.enqueue());assert.equal(a.saved.get(queueKey),raw);
});

test('server conflicts surface explicitly and logout prevents a late receipt being marked synced',async()=>{
  const a=app();a.manual();const s=server(a.api),one=setup(a,s);await one.e.authenticate();one.e.enqueue();await one.e.flush();
  const b=app();b.local.importJSON(a.local.exportJSON());
  const bad=JSON.parse(b.saved.get('investment-research-theses-v1'));bad.theses.ACME.revisions[0].text='Same ID conflict';b.saved.set('investment-research-theses-v1',JSON.stringify(bad));
  const two=setup(b,s);await two.e.authenticate();two.e.enqueue();await assert.rejects(()=>two.e.flush());assert.equal(two.e.status(),'conflict');
  const c=app();c.manual();const three=setup(c,s,'user-c');await three.e.authenticate();three.e.enqueue();
  let release;three.adapter.put=records=>new Promise(resolve=>{release=()=>resolve({userId:'user-c',accepted:records.map(c.api.key)});});
  const pending=three.e.flush();await new Promise(resolve=>setImmediate(resolve));await three.e.logout();release();
  await assert.rejects(()=>pending);assert.equal(three.e.status(),'local');
  assert.ok(JSON.parse(c.saved.get(c.api.PREFIX+'user-c')).ops.every(op=>op.status!=='ack'));
});

test('account changes during authorization cannot write another owner queue or delete that other account',async()=>{
  const a=app();a.manual();const s=server(a.api),{e,adapter}=setup(a,s);await e.authenticate();e.enqueue();
  const source=a.saved.get(a.api.PREFIX+'user-a');
  adapter.switchUser('user-b');await assert.rejects(()=>e.deleteAccount());assert.equal(e.owner(),'user-a');
  await assert.rejects(()=>e.flush());assert.equal(s.writes(),0);assert.equal(a.saved.has(a.api.PREFIX+'user-b'),false);
  assert.equal(JSON.parse(a.saved.get(a.api.PREFIX+'user-a')).owner,'user-a');
  assert.equal(JSON.parse(source).ops.length,e.inspect().ops.length);
});
