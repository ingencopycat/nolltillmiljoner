const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../social-core.js');
test('publication copies only selected text; nested private data never crosses boundary',()=>{
 const rev={companyName:'Example',text:'An explicitly selected thesis with sufficient reasoning.',savedAt:'2026-09-16T00:00:00Z',notes:'SECRET',review:{note:'SECRET'},reportQuestions:[{answer:'SECRET'}],assumptions:['Growth'],assumptionDetails:[{note:'SECRET'}],valuationSnapshot:{private:'SECRET'}};
 const draft=C.draft('EX',rev);assert.ok(!JSON.stringify(draft).includes('SECRET'));
 const s=C.snapshot({...draft,email:'SECRET',owner_id:'SECRET',notes:'SECRET'});assert.ok(!JSON.stringify(s).includes('SECRET'));assert.ok(Object.isFrozen(s));
 rev.text='Changed privately';assert.notEqual(s.thesis,rev.text);
});
test('strict text and minimum publication bounds',()=>{
 assert.throws(()=>C.snapshot({company:'x',ticker:'x',thesis:'short',analysisDate:'2026-09-16'}));
 assert.throws(()=>C.snapshot({company:'x',ticker:'x',thesis:{notes:'private'},analysisDate:'2026-09-16'}));
 assert.equal(C.normalizeUsername(' IngenCopycat '),'ingencopycat');assert.equal(C.normalizeUsername(null),'');
});
test('routes encode input and coarse metrics reject identities',()=>{
 assert.equal(C.profileUrl('a/b'),'profil.html?u=a%2Fb');const {events}=require('../ntm-product.js');
 assert.equal(events.emit('public_analysis_published'),true);assert.equal(events.emit('public_analysis_published',{username:'private'}),false);
});
