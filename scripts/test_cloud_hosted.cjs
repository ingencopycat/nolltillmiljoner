/* Hosted integration test. Uses public config and interactive email OTP only.
 * Explicitly destroys the TWO DEDICATED TEST ACCOUNTS supplied by the operator.
 * Never run with personal accounts; never pass/store session or admin credentials.
 */
'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const readline=require('node:readline/promises');
const {validate}=require('./cloud_config.cjs');
async function main() {
  if(process.argv.slice(2).join(' ')!=='--dedicated-test-accounts')throw new Error('dedicated_accounts_required');
  const config={enabled:true,url:process.env.SUPABASE_URL,publishableKey:process.env.SUPABASE_PUBLISHABLE_KEY};
  const {origin}=validate(config);
  const prompt=readline.createInterface({input:process.stdin,output:process.stdout});
  const call=async(path,{token,method='POST',body}={})=>{
    const response=await fetch(origin+path,{method,headers:{apikey:config.publishableKey,
      'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
    // Failed bodies can contain private provider details. Never print them.
    return {status:response.status,data:response.ok?await response.text().then(s=>s?JSON.parse(s):null):null};
  };
  const rpc=(name,token,body={})=>call('/rest/v1/rpc/'+name,{token,body});
  const ok=result=>{assert.ok(result.status>=200 && result.status<300);return result.data;};
  const denied=result=>assert.ok([401,403].includes(result.status));
  try {
    console.log('This test writes synthetic rows and deletes BOTH dedicated accounts. It never loads browser data.');
    const emails=[];
    for(const label of ['A','B']) {
      const email=(await prompt.question('Dedicated test email '+label+': ')).trim();
      assert.match(email,/^[^\s@]+@[^\s@]+\.[^\s@]+$/);emails.push(email);
    }
    assert.notEqual(emails[0].toLowerCase(),emails[1].toLowerCase());
    const users=[];
    for(const [i,email] of emails.entries()) {
      ok(await call('/auth/v1/otp',{body:{email,create_user:true}}));
      const code=(await prompt.question('Email OTP for '+(i===0?'A':'B')+': ')).trim();
      const session=ok(await call('/auth/v1/verify',{body:{email,token:code,type:'email'}}));
      assert.ok(session.access_token && session.user?.id);
      users.push({id:session.user.id,token:session.access_token});
    }
    const [a,b]=users;assert.notEqual(a.id,b.id);
    // Stop before any record mutation/deletion if either account has prior cloud data.
    for(const user of users) {
      const snapshot=ok(await rpc('ntm_export_records',user.token));
      assert.equal(snapshot.userId,user.id);assert.deepEqual(snapshot.records,[]);
    }
    const record=id=>({kind:'journal',scope:'theses',id,createdAt:null,sourceVersion:2,payload:{test:'synthetic-only'}});
    const ra=record('ntm-hosted-'+crypto.randomUUID()),rb=record('ntm-hosted-'+crypto.randomUUID());
    for(const [user,r] of [[a,ra],[b,rb]]) {
      for(let retry=0;retry<2;retry++) {
        const receipt=ok(await rpc('ntm_put_records',user.token,{records:[r]}));
        assert.equal(receipt.userId,user.id);assert.deepEqual(receipt.accepted,[[r.kind,r.scope,r.id]]);
      }
      assert.deepEqual(ok(await rpc('ntm_export_records',user.token)).records,[r]);
      for(const method of ['PATCH','DELETE'])denied(await call('/rest/v1/ntm_private_records?owner_id=eq.'+user.id,
        {token:user.token,method,...(method==='PATCH'?{body:{record:r}}:{})}));
    }
    for(const [actor,victim,r] of [[b,a,ra],[a,b,rb]]) {
      const endpoint='/rest/v1/ntm_private_records?owner_id=eq.'+victim.id;
      assert.deepEqual(ok(await call(endpoint,{token:actor.token,method:'GET'})),[]);
      for(const method of ['PATCH','DELETE'])denied(await call(endpoint,
        {token:actor.token,method,...(method==='PATCH'?{body:{record:r}}:{})}));
      denied(await call('/rest/v1/ntm_private_records',{token:actor.token,body:{owner_id:victim.id,kind:r.kind,scope:r.scope,id:r.id,record:r}}));
    }
    denied(await call('/rest/v1/ntm_private_records?select=*',{method:'GET'}));
    for(const name of ['ntm_export_records','ntm_put_records','ntm_delete_account']) {
      denied(await rpc(name,undefined,name==='ntm_put_records'?{records:[]} : {}));
    }
    const conflict=await rpc('ntm_put_records',a.token,{records:[record('rollback-'+crypto.randomUUID()),{...ra,payload:{test:'conflict'}}]});
    assert.equal(conflict.status,409);
    assert.deepEqual(ok(await rpc('ntm_export_records',a.token)).records,[ra]);
    console.log('PASS hosted: own insert/read; immutable update/delete denial; A/B/anonymous isolation; retries; atomic conflict; raw export.');
    for(const [i,user] of users.entries()) {
      assert.equal(ok(await rpc('ntm_delete_account',user.token)).deletedUserId,user.id);
      const after=await rpc('ntm_export_records',user.token);
      if(after.status===200)assert.deepEqual(after.data.records,[]);else denied(after);
      const stale=await rpc('ntm_put_records',user.token,{records:[record('stale-'+crypto.randomUUID())]});
      assert.ok([400,401,403].includes(stale.status));
      if(i===0)assert.deepEqual(ok(await rpc('ntm_export_records',b.token)).records,[rb]);
    }
    console.log('PASS hosted: dedicated account deletion; cascade; stale-token write denial; other account preserved.');
    console.log('Browser queue/restore, local retention, email link behavior and catalog verification require separate checks.');
  } finally {prompt.close();}
}
main().catch(()=>{
  console.error('Hosted check failed or stopped. No private error body is printed. Dedicated test accounts may remain; inspect them in Dashboard.');
  process.exitCode=1;
});
