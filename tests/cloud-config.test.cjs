const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {configure}=require('../scripts/configure_cloud.cjs');
const {checkSite,scan}=require('../scripts/check_cloud_security.cjs');
const root=path.join(__dirname,'..');
const env={SUPABASE_URL:'https://ntm-config-test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'};
function stage(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ntm-public-config-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  for(const name of ['min-ntm.html','index.html','cloud-config.js'])fs.copyFileSync(path.join(root,name),path.join(dir,name));
  return dir;
}
test('generated public config is isolated, allowlisted and grants CSP only to account page',t=>{
  const dir=stage(t),source=fs.readFileSync(path.join(root,'cloud-config.js'),'utf8');
  configure(dir,{...env,UNRELATED_PRIVATE_VALUE:'never-copy-this'});
  const content=fs.readFileSync(path.join(dir,'cloud-config.js'),'utf8'),c={window:{}};
  vm.runInNewContext(content,c);
  assert.deepEqual(JSON.parse(JSON.stringify(c.window.NTMCloudConfig)),{enabled:true,url:env.SUPABASE_URL,publishableKey:env.SUPABASE_PUBLISHABLE_KEY});
  assert.ok(!content.includes('never-copy-this'));
  const account=fs.readFileSync(path.join(dir,'min-ntm.html'),'utf8');
  assert.match(account,/connect-src [^;]*https:\/\/ntm-config-test.supabase.co;/);
  assert.ok(!fs.readFileSync(path.join(dir,'index.html'),'utf8').includes(env.SUPABASE_URL));
  assert.equal(fs.readFileSync(path.join(root,'cloud-config.js'),'utf8'),source);
  configure(dir,env);assert.equal(fs.readFileSync(path.join(dir,'min-ntm.html'),'utf8'),account);
  checkSite(dir);
  fs.writeFileSync(path.join(dir,'min-ntm.html'),account.replace(env.SUPABASE_URL,'https://unexpected.supabase.co'));
  assert.throws(()=>checkSite(dir),/CSP mismatch/);
});
test('invalid or privileged config fails before changing artifacts',t=>{
  const dir=stage(t),before=fs.readFileSync(path.join(dir,'cloud-config.js'),'utf8');
  for(const settings of [{},{...env,SUPABASE_PUBLISHABLE_KEY:'sb_secret_rejected'},
    {...env,SUPABASE_PUBLISHABLE_KEY:'eyJlegacy-token'},
    {...env,SUPABASE_URL:'https://evil.example'},
    {...env,SUPABASE_URL:'https://user:password@ntm-config-test.supabase.co'},
    {...env,SUPABASE_URL:'https://ntm-config-test.supabase.co/path'}]) {
    assert.throws(()=>configure(dir,settings));
    assert.equal(fs.readFileSync(path.join(dir,'cloud-config.js'),'utf8'),before);
  }
  assert.throws(()=>configure(root,env),/separate staged/);
});
test('secret scan reports category and path without exposing the matched value',t=>{
  const dir=stage(t),file=path.join(dir,'credential.txt'),value='sb_'+'secret_'+ 'x'.repeat(30);
  fs.writeFileSync(file,value);
  assert.throws(()=>scan([file]),e=>e.message.includes('Supabase secret key') && !e.message.includes(value));
});
