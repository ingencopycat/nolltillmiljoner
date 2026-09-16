/* Upgrade compatibility: seed the deployed schema, then apply only the new migration. */
const assert=require('node:assert/strict'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
async function main(){
 const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href),db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
   grant usage on schema auth,public to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  const migration='202609170001_local_research_publication.sql';
  for(const f of fs.readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')&&f<migration).sort())await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
  const uid='11111111-1111-4111-8111-111111111111';await db.query('insert into auth.users values($1)',[uid]);
  const login=async()=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated');};
  const rpc=async(fn,action,args={})=>(await db.query(`select public.${fn}($1,$2::jsonb) r`,[action,JSON.stringify(args)])).rows[0].r;
  const write=(action,args)=>rpc('ntm_social_write',action,args),read=(action,args)=>rpc('ntm_social_read',action,args);
  const records=[{kind:'journal',scope:'theses',id:'EX',createdAt:null,sourceVersion:2,payload:{}},
   {kind:'revision',scope:'EX',id:'r1',createdAt:null,sourceVersion:2,payload:{text:'PRIVATE'}}];
  await login();await write('create',{username:'upgrade_reader',displayName:'Upgrade reader',confirmed:true});
  await db.query('select public.ntm_put_records($1)',[JSON.stringify(records)]);
  const args={scope:'EX',revision:'r1',snapshot:{company:'Example',ticker:'EX',thesis:'An explicitly approved public thesis for migration compatibility.',analysisDate:'2026-09-17'},requestId:'22222222-2222-4222-8222-222222222222',confirmed:true};
  const published=await write('publish',args);
  await assert.rejects(()=>write('publish',{...args,revision:'local-only',requestId:'33333333-3333-4333-8333-333333333333'}));
  async function state(){return {mine:await write('mine'),own:await write('ownAnalyses'),export:await write('export'),
   analysis:await read('analysis',{id:published.id}),profile:await read('profile',{username:'upgrade_reader'}),
   private:(await db.query('select public.ntm_export_records() r')).rows[0].r};}
  const before=await state();await db.exec('reset role');
  async function catalog(){return {
   functions:(await db.query("select oid,proname,proowner,proacl,prosecdef,proconfig,proargtypes::text,prorettype from pg_proc where pronamespace='public'::regnamespace order by oid")).rows,
   policies:(await db.query("select * from pg_policies where schemaname='public' order by tablename,policyname")).rows,
   tables:(await db.query("select oid,relname,relacl,relrowsecurity,relforcerowsecurity from pg_class where relnamespace='public'::regnamespace order by oid")).rows};}
  const security=await catalog();
  await db.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));
  assert.deepEqual(await catalog(),security,'function identities/grants/owners/settings, table grants and RLS remain exact');
  await login();assert.deepEqual(await state(),before,'all existing private/public records and API projections remain exact');
  assert.deepEqual(await write('publish',args),published,'old frontend retry remains idempotent');
  const local=await write('publish',{...args,revision:'local-only',requestId:'33333333-3333-4333-8333-333333333333',supersedes:published.id});
  assert.deepEqual((await db.query('select public.ntm_export_records() r')).rows[0].r,before.private,'local publication never uploads');
  await write('unpublish',{id:local.id});assert.equal(await read('analysis',{id:local.id}),null);
  await db.query('select public.ntm_delete_account()');await assert.rejects(()=>write('mine'));
  console.log('PASS migration upgrade: old synced publication/retry, exact existing API data, unchanged function identity/ACL/owner/security settings and RLS, local-only replacement, no private writes, unpublish and deletion');
 }finally{await db.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
