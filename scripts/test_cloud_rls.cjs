/* Real PostgreSQL RLS execution via optional local PGlite. No hosted credentials. */
const assert=require('node:assert/strict'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
async function main() {
  if(!process.env.PGLITE_MODULE)throw new Error('Set PGLITE_MODULE to an installed @electric-sql/pglite/dist/index.js');
  const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href),db=new PGlite();
  try {
    // Only the Supabase Auth schema/claims are fixtures; roles, grants, RLS, FK and RPC SQL execute in Postgres.
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
      grant usage on schema auth,public to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;`);
    for(const file of fs.readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort()) {
      await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
    }
    const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
    await db.query('insert into auth.users values ($1),($2)',[A,B]);
    const login=async(uid,role='authenticated')=>{
      await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid || '']);
      await db.exec('set role '+role);
    };
    const record=(id,value)=>({kind:'journal',scope:'theses',id,createdAt:null,sourceVersion:2,payload:{test:value}});
    const put=records=>db.query('select public.ntm_put_records($1::jsonb) as result',[JSON.stringify(records)]);
    const list=async()=> (await db.query('select public.ntm_export_records() as result')).rows[0].result;
    await login(A);await put([record('A','private-A')]);await put([record('A','private-A')]);
    assert.equal((await list()).records.length,1);
    // Direct REST inserts must not bypass parent ownership via SQL NULL semantics.
    for(const kind of ['revision','scenario','observation']) {
      for(const missing of ['parent_kind','parent_scope','parent_id']) {
        const parent={parent_kind:kind==='revision'?'journal':kind==='scenario'?'calculator':'scenario',
          parent_scope:kind==='revision'?'theses':kind==='scenario'?'scenarios':'calc',parent_id:'absent'};
        parent[missing]=null;
        const r={kind,scope:kind==='observation'?'["calc","absent"]':'absent',id:'orphan',createdAt:null,
          sourceVersion:kind==='revision'?2:1,payload:{}};
        await assert.rejects(()=>db.query(`insert into public.ntm_private_records
          (owner_id,kind,scope,id,record,parent_kind,parent_scope,parent_id) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [A,kind,r.scope,r.id,JSON.stringify(r),parent.parent_kind,parent.parent_scope,parent.parent_id]),
          e=>e.code==='23514');
      }
    }
    await assert.rejects(()=>put([record('new','rollback-me'),record('A','changed')]),e=>e.code==='PT409');
    assert.equal((await list()).records.length,1,'whole batch rolled back');
    await login(B);await put([record('B','private-B')]);
    assert.deepEqual((await list()).records.map(r=>r.id),['B']);
    assert.equal((await db.query('select * from public.ntm_private_records where owner_id=$1',[A])).rows.length,0);
    await assert.rejects(()=>db.query('update public.ntm_private_records set record=$1 where owner_id=$2',[JSON.stringify(record('A','bad')),A]),e=>e.code==='42501');
    await assert.rejects(()=>db.query('delete from public.ntm_private_records where owner_id=$1',[A]),e=>e.code==='42501');
    await assert.rejects(()=>db.query('insert into public.ntm_private_records(owner_id,kind,scope,id,record) values ($1,$2,$3,$4,$5)',[A,'journal','theses','foreign',JSON.stringify(record('foreign','bad'))]),e=>e.code==='42501');
    await assert.rejects(()=>put([{kind:'revision',scope:'A',id:'orphan',createdAt:null,sourceVersion:2,payload:{id:'orphan'}}]),e=>e.code==='PT400');
    await login(null,'anon');
    for(const sql of ['select * from public.ntm_private_records','select public.ntm_export_records()',
      "select public.ntm_put_records('[]'::jsonb)",'select public.ntm_delete_account()']) {
      await assert.rejects(()=>db.query(sql),e=>e.code==='42501');
    }
    await login(null);await assert.rejects(()=>list(),e=>e.code==='PT401');
    await login(A);const deleted=(await db.query('select public.ntm_delete_account() as result')).rows[0].result;
    assert.equal(deleted.deletedUserId,A);assert.equal((await list()).records.length,0);
    await assert.rejects(()=>put([record('revive','no')]),e=>e.code==='PT400');
    await login(B);assert.equal((await list()).records[0].payload.test,'private-B');
    console.log('PASS actual PostgreSQL: A/B/anonymous isolation, insert ownership, UPDATE/DELETE denial, idempotency, transactional conflict, parent FK, account cascade and stale-token writes');
  } finally {await db.close();}
}
main().catch(error=>{console.error('RLS test failed:',error.code || error.message);process.exitCode=1;});
