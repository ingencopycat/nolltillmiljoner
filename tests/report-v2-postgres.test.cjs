const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process');
test('V2 migration, public boundaries and immutable version lifecycle',{skip:!process.env.PGLITE_MODULE},()=>{
 const result=cp.spawnSync(process.execPath,['scripts/test_report_v2.cjs'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+result.stderr);
});
