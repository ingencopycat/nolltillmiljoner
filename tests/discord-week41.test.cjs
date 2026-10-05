const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const os=require('node:os'),path=require('node:path');
const D=require('../scripts/discord_weekly.cjs'),W=require('../scripts/check_weekly_events.cjs');
const selection=require('../docs/internal/week41-distribution.json');

test('W41 references are independently selected; wrong scope, hash or review fails closed',()=>{
  for(const a of selection.artifacts){
    const m=W.loadRepository(),before=JSON.stringify(m.review),p=D.preview(m,a.kind,a.week);
    assert.equal(p.text,`${a.kind==='macro'?'Makro':'Rapporter'} — Vecka 41, 2026`);
    assert.equal(p.image,a.image);assert.equal(W.digest(m.root,p.image),a.sha256);
    assert.equal(p.identity,`${a.kind}:2026-W41:${a.sha256}`);
    assert.equal(JSON.stringify(m.review),before);
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'ntm-discord-w41-'));
    try {
      fs.mkdirSync(path.join(root,path.dirname(a.image)),{recursive:true});
      fs.copyFileSync(path.resolve(m.root,a.image),path.join(root,a.image));
      fs.mkdirSync(path.join(root,'docs/internal'),{recursive:true});m.root=root;
      const file=path.join(root,'docs/internal/week41-distribution.json');
      assert.throws(()=>D.preview(m,a.kind,a.week),/reference_image_requires_corrected/);
      for(const field of ['kind','week','image','sha256']){
        const wrong=structuredClone(selection);wrong.artifacts.find(r=>r.kind===a.kind)[field]='wrong';
        fs.writeFileSync(file,JSON.stringify(wrong));
        assert.throws(()=>D.preview(m,a.kind,a.week),/reference_image_requires_corrected/);
      }
      for(const change of [{version:2},{use:'not-owner-selected'},{artifacts:[a,a]}]){
        fs.writeFileSync(file,JSON.stringify({...selection,...change}));
        assert.throws(()=>D.preview(m,a.kind,a.week),/reference_image_requires_corrected/);
      }
      const wrongYear=structuredClone(selection);
      wrongYear.artifacts.find(r=>r.kind===a.kind).week='2027-W41';
      fs.writeFileSync(file,JSON.stringify(wrongYear));
      assert.throws(()=>D.preview(m,a.kind,a.week),/reference_image_requires_corrected/);
      fs.writeFileSync(file,JSON.stringify(selection));
      m.review.artifacts.find(r=>r.kind===a.kind&&r.week===a.week).records.pop();
      assert.throws(()=>D.preview(m,a.kind,a.week),/review_mismatch/);
    } finally {
      assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep+'ntm-discord-w41-'));
      fs.rmSync(root,{recursive:true,force:true});
    }
  }
});

test('W41 dry runs have no network access even with live enable variable',async t=>{
  t.mock.method(globalThis,'fetch',()=>assert.fail('dry run must never access network'));
  const logs=[];t.mock.method(console,'log',v=>logs.push(JSON.parse(v)));
  for(const kind of ['earnings','macro'])await D.main([kind,'2026-W41','--dry-run'],{NTM_DISCORD_ENABLED:'true'});
  assert.deepEqual(logs.map(p=>p.text),['Rapporter — Vecka 41, 2026','Makro — Vecka 41, 2026']);
});

test('W41 mocked delivery attaches original bytes once and preserves previous ledger history',async()=>{
  const m=W.loadRepository(),publications={};
  for(const week of ['2026-W39','2026-W40'])for(const kind of ['macro','earnings'])
    publications[D.preview(m,kind,week).identity]={status:'sent',messageId:'123',channel:kind};
  const history=structuredClone(publications);let data={version:1,publications},revision=0;
  const ledger={async read(){return {data:structuredClone(data),sha:revision};},async write(s){assert.equal(s.sha,revision);data=structuredClone(s.data);s.sha=++revision;}};
  const env={NTM_DISCORD_ENABLED:'true',DISCORD_MAKRO_WEBHOOK_URL:'https://discord.com/api/webhooks/123/mock',DISCORD_RAPPORTER_WEBHOOK_URL:'https://discord.com/api/webhooks/456/mock'};
  for(const kind of ['macro','earnings']){
    const p=D.preview(m,kind,'2026-W41');let calls=0;
    const mockSend=async(url,options)=>{
      calls++;assert.equal(url,env[kind==='macro'?'DISCORD_MAKRO_WEBHOOK_URL':'DISCORD_RAPPORTER_WEBHOOK_URL']+'?wait=true');
      assert.deepEqual(JSON.parse(options.body.get('payload_json')),{content:p.text,allowed_mentions:{parse:[]},attachments:[{id:0,filename:'week-41.png'}]});
      assert.deepEqual([...options.body.keys()],['payload_json','files[0]']);
      assert.deepEqual(Buffer.from(await options.body.get('files[0]').arrayBuffer()),fs.readFileSync(p.image));
      return {ok:true,json:async()=>({id:'456'})};
    };
    await assert.rejects(D.deliver(p,m.root,{...env,NTM_DISCORD_ENABLED:'false'},ledger,mockSend),/live_disabled/);
    assert.equal(calls,0);
    assert.equal((await D.deliver(p,m.root,env,ledger,mockSend)).status,'sent');
    assert.equal((await D.deliver(p,m.root,env,ledger,mockSend)).status,'already_sent');assert.equal(calls,1);
  }
  for(const [id,value] of Object.entries(history))assert.deepEqual(data.publications[id],value);
  const workflow=fs.readFileSync('.github/workflows/discord-weekly.yml','utf8');
  for(const pattern of [/default: false/,/needs: preview/,/NTM_DISCORD_ENABLED == 'true'/,/environment: discord-distribution/])assert.match(workflow,pattern);
});
