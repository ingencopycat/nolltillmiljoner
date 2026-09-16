const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process');
test('publication migration preserves deployed clients and authorization', {skip:!process.env.PGLITE_MODULE},()=>{
 const result=cp.spawnSync(process.execPath,['scripts/test_publication_migration.cjs'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+result.stderr);
});
