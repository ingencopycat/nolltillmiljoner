/* Real local PostgreSQL migration/authorization tests. Never contacts hosted services. */
const assert=require('node:assert/strict'),fs=require('node:fs'),{pathToFileURL}=require('node:url'),{randomUUID}=require('node:crypto'),R=require('../public-report.js');
async function main(){
 const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href),db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';grant usage on schema auth,public to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 const migration='202609190001_public_research_v2.sql';for(const f of fs.readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')&&f<migration).sort())await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 const A=randomUUID(),B=randomUUID();await db.query('insert into auth.users values($1),($2)',[A,B]);
 const login=async(uid,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid||'']);await db.exec('set role '+role);};
 const rpc=async(fn,action,args={})=>(await db.query(`select public.${fn}($1,$2::jsonb) r`,[action,JSON.stringify(args)])).rows[0].r;
 const write=(a,b)=>rpc('ntm_social_write',a,b),read=(a,b)=>rpc('ntm_social_read',a,b),deny=fn=>assert.rejects(fn);
 const base={company:'Example',ticker:'EX',analysisDate:'2026-09-18',thesis:'A selected public thesis with enough detail to inspect the reasoning.'};
 await login(A);await write('create',{username:'report_author',displayName:'Author',confirmed:true});
 const legacy=await write('publish',{scope:'LEGACY',revision:'local1',snapshot:base,requestId:randomUUID(),confirmed:true});const before=await read('analysis',{id:legacy.id});
 await db.exec('reset role');await db.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));
 global.NTMFundamentalProfile=require('../fundamental-profile.js');
 const data=JSON.parse(fs.readFileSync('data/stocks/CRWD.json','utf8'));
 const candidates=R.candidates({valuationSnapshot:{ticker:data.symbol,provenance:{methodVersion:data.metadata.methodVersion,fundamental:{version:1,cik:data.company.cik,statementMethod:'ntm-fundamental/1',profile:data.metadata.profile,annual:data.annual.slice(-3)}}}},data.symbol,data.company.cik);
 assert(candidates.statements.length>0);assert(candidates.chart);
 const financial=R.project({...base,basisDate:'2026-09-17',financial:candidates.statements,chart:candidates.chart});
 const valid=async s=>(await db.query('select public.ntm_report_v2_valid($1::jsonb) v',[JSON.stringify(s)])).rows[0].v;
 assert.equal(await valid(financial),true,'JS/SQL financial contract agreement');
 for(const mutate of [s=>s.financial[0].calculation.values[0]+=1,s=>s.financial[0].calculation.values[0]=null,s=>s.financial[0].text='Forged endorsement',s=>s.financial[0].observations[0].source.private='PRIVATE',s=>s.financial[0].observations[0].rights.publicDisplay=false,s=>s.financial[0].observations[0].source.provider='EOD',s=>s.chart.rows[0].observation.currency='SEK',s=>s.chart.rows[0].observation.source.url='https://private.example/']){const bad=structuredClone(financial);mutate(bad);assert.equal(await valid(bad),false);}
 for(const key of Object.keys(financial.financial[0].observations[0])){const bad=structuredClone(financial);bad.financial[0].observations[0][key]=null;assert.equal(await valid(bad),['market','shareBasis'].includes(key),key+' null gate');}
 await login(A);assert.deepEqual(await read('analysis',{id:legacy.id}),before,'V1 exact compatibility');
 const author={username:'report_author',displayName:'Author'},snapshot=financial;
 const publish=(over={})=>write('publishV2',{scope:'EX',revision:'PRIVATE-REVISION',snapshot,author,confirmed:true,requestId:randomUUID(),...over});
 for(const extra of [{notes:'PRIVATE'},{summary:{email:'PRIVATE'}},{schemaVersion:null},{methodVersion:null},{financial:null},{chart:null}])await deny(()=>publish({snapshot:{...snapshot,...extra}}));
 await deny(()=>publish({snapshot:null}));await deny(()=>publish({confirmed:false}));await deny(()=>publish({author:{...author,displayName:'Forged'}}));await deny(()=>publish({email:'PRIVATE'}));
 const requestId=randomUUID(),first=await publish({requestId});assert.deepEqual(await publish({requestId}),first,'idempotence');
 const firstPublic=await read('analysis',{id:first.id});assert.equal(firstPublic.versionNumber,1);assert.equal(firstPublic.versionId,first.versionId);assert(!JSON.stringify(firstPublic).includes('PRIVATE'));assert.deepEqual(firstPublic.author,author);
 assert.equal((await db.query('select public.ntm_export_records() r')).rows[0].r.records.length,0,'no private uploads');
 await login(null,'anon');assert.deepEqual(await read('analysis',{id:first.id}),firstPublic);assert.equal(await read('analysis',{id:first.versionId}),null,'version ID cannot bypass report route');
 for(const t of ['ntm_report_heads','ntm_public_analyses','ntm_profile_reports','ntm_private_records'])await deny(()=>db.query('select * from public.'+t));
 await deny(()=>rpc('ntm_social_read_v1','recent'));await deny(()=>write('publishV2',{}));
 await login(B);await write('create',{username:'report_reader',displayName:'Reader',confirmed:true});
 await deny(()=>publish({author:{username:'report_reader',displayName:'Reader'},reportId:first.id,expectedVersion:first.versionId}));
 await deny(()=>write('unpublish',{id:first.id}));await deny(()=>rpc('ntm_social_write_v1','mine'));
 assert.deepEqual(await read('analysis',{id:first.id}),firstPublic);await write('reportAnalysis',{id:first.id,versionId:first.versionId,reason:'other',detail:'A version-specific concern'});await deny(()=>write('reportAnalysis',{id:first.id,versionId:first.versionId,reason:'other'}));
 await login(A);const second=await publish({reportId:first.id,expectedVersion:first.versionId,snapshot:R.project({...base,basisDate:'2026-09-17',risks:'An explicitly selected risk.'})});assert.equal(second.id,first.id);assert.equal(second.versionNumber,2);
 await deny(()=>publish({reportId:first.id,expectedVersion:first.versionId}));await deny(()=>publish({requestId}));
 assert.equal(await read('analysis',{id:first.id,version:first.versionId}),null);assert.equal((await read('analysis',{id:first.id,version:second.versionId})).versionNumber,2);
 await deny(()=>write('publish',{scope:'EX',revision:'bypass',snapshot:base,requestId:randomUUID(),confirmed:true}));
 await db.exec('reset role');await deny(()=>db.query('update public.ntm_public_analyses set snapshot=$1 where id=$2',[snapshot,second.versionId]));
 const report=(await db.query('select report_version,report_version_number,content_fingerprint from public.ntm_profile_reports')).rows[0];assert.equal(report.report_version,first.versionId);assert.equal(report.report_version_number,1);assert.equal(report.content_fingerprint.length,32);
 await login(A);await write('settings',{displayName:'Renamed',bio:'',active:true,showLevel:false,showXp:false,level:null,xp:null});assert.deepEqual((await read('analysis',{id:first.id})).author,author,'frozen attribution');
 await deny(()=>publish({reportId:first.id,expectedVersion:second.versionId}));
 await write('unpublish',{id:first.id});assert.equal(await read('analysis',{id:first.id}),null);assert(!(await read('recent')).some(x=>x.id===first.id));assert(!(await read('analyses',{username:author.username})).some(x=>x.id===first.id));
 const third=await publish({author:{...author,displayName:'Renamed'},reportId:first.id,expectedVersion:null});assert.equal(third.versionNumber,3);assert.equal(third.id,first.id);
 const upgrade=await publish({author:{...author,displayName:'Renamed'},scope:'LEGACY',reportId:legacy.id,expectedVersion:legacy.id});assert.equal(upgrade.id,legacy.id);assert.equal(upgrade.versionNumber,2);assert.equal((await read('analysis',{id:legacy.id})).content.schemaVersion,2);
 await db.exec('reset role');await db.query('update public.ntm_public_analyses set moderated=true where id=$1',[third.versionId]);await login(A);assert.equal(await read('analysis',{id:first.id}),null);await deny(()=>publish({author:{...author,displayName:'Renamed'},reportId:first.id,expectedVersion:third.versionId}));
 await db.query('select public.ntm_delete_account()');await deny(()=>write('mine'));await login(null,'anon');assert.equal(await read('analysis',{id:legacy.id}),null);assert.equal(await read('analysis',{id:first.id}),null);
 await db.exec('reset role');assert.equal((await db.query('select count(*) n from public.ntm_report_heads')).rows[0].n,0);const retained=(await db.query('select target,report_version,report_identity,content_fingerprint from public.ntm_profile_reports')).rows[0];assert.equal(retained.target,null);assert.equal(retained.report_version,null);assert.equal(retained.report_identity,first.id);
 await db.exec(fs.readFileSync('supabase/verify_public_research_v2.sql','utf8'));
 console.log('PASS V2 PostgreSQL: V1 upgrade, allowlists, role isolation, immutable versions/author, CAS, retries, moderation linkage, unpublish all endpoints, republish, account cascade and stale credentials');
 }finally{await db.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
