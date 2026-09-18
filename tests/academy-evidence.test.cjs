const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const clone=x=>JSON.parse(JSON.stringify(x)),T=Date.parse('2026-09-18T10:00:00Z'),DAY=86400000;
function app(){let n=0;const raw=new Map(),c=vm.createContext({console,URL,URLSearchParams,setTimeout(){},crypto:{randomUUID:()=>`event-${++n}`},document:{readyState:'loading',getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){}},location:{pathname:'/',search:''},localStorage:{getItem:k=>raw.get(k)||null,setItem:(k,v)=>raw.set(k,v),removeItem:k=>raw.delete(k)}});c.window=c;
 for(const f of ['valuation-core.js','script.js','academy-catalog.js','academy-activities.js','academy-progress.js','academy-progression.js','academy-competencies.js','academy-evidence.js','research-snapshot.js','thesis-storage.js','research-outcomes.js','behavioral.js','local-data.js','wave1-context.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
 return {c,P:c.NTMAcademyProgress,E:c.NTMAcademyEvidence,C:c.NTMAcademyCompetencies,raw};}
function attempt(a,id,at=T,correct=true,exposure){const key=a.E.start(id,at);if(exposure)a.E.record(key,exposure,false,at+1);a.E.record(key,'submit',correct,at+2);return key;}
const state=(a,now=T+10,id='per-share')=>a.E.derive(a.P.read().data,now).find(s=>s.id===id);
test('encounter, legacy lessons/XP and old attempts never establish independent understanding',()=>{
 const a=app();assert.equal(state(a).state,'new');a.P.set('eps','complete');assert.equal(state(a).state,'introduced');const xp=a.c.NTMAcademyProgression.derive(a.P.read().data).xp;
 a.P.attempt('share-count','dilution-eps',true,null,T-1000);assert.equal(state(a).state,'practiced');assert.equal(state(a).first,undefined);
 attempt(a,'per-share-v1');assert.equal(state(a).state,'practiced');assert.ok(state(a).first);assert.equal(a.c.NTMAcademyProgression.derive(a.P.read().data).xp,xp+18);
});
test('first wrong/right, helped, revealed, and retry after feedback have conservative eligibility',()=>{
 for(const exposure of [undefined,'help','reveal']){const a=app();attempt(a,'per-share-v1',T,true,exposure);assert.equal(!!state(a).first,!exposure);}
 const a=app();attempt(a,'per-share-v1',T,false);attempt(a,'per-share-v1',T+10,true);assert.equal(state(a,T+20).first,undefined);
 attempt(a,'per-share-v2',T+30,true);assert.ok(state(a,T+40).first);assert.equal(state(a,T+40).history[1].novel,false);
});
test('independent new example plus separately labelled application plus seven-day distinct check',()=>{
 const a=app(),first=attempt(a,'per-share-v1');attempt(a,'per-share-v3',T+10,true,'help');assert.equal(state(a,T+20).state,'practiced');
 attempt(a,'per-share-v5',T+7*DAY+3);const s=state(a,T+7*DAY+10);assert.equal(s.state,'demonstrated');assert.equal(s.delayed[0].anchorId,first);assert.equal(s.applications[0].independent,false);
});
test('too-early check, changed anchor, help and repeated delayed variant cannot establish delayed understanding',()=>{
 for(const mode of ['early','help','repeated']){const a=app();attempt(a,'per-share-v1');attempt(a,'per-share-v3',T+10);
  if(mode==='repeated')attempt(a,'per-share-v5',T+20,false);
  attempt(a,'per-share-v5',mode==='early'?T+7*DAY:T+7*DAY+20,true,mode==='help'?'help':undefined);
  assert.notEqual(state(a,T+8*DAY).state,'demonstrated',mode);
 }
});
test('later delayed failure keeps the earlier immutable success and recommends honest repetition',()=>{
 const a=app();attempt(a,'per-share-v1');attempt(a,'per-share-v3',T+10);attempt(a,'per-share-v5',T+7*DAY+10);
 const before=clone(a.P.read().data);assert.equal(state(a,T+8*DAY).state,'demonstrated');attempt(a,'per-share-v6',T+8*DAY,false);
 const s=state(a,T+9*DAY);assert.equal(s.state,'practiced');assert.equal(s.laterFailure,true);assert.ok(s.passed);assert.deepEqual(clone(a.P.read().data.attempts.slice(0,before.attempts.length)),before.attempts);
});
test('clock regression/future records and abandoned starts cannot be independent',()=>{
 const a=app();a.E.start('per-share-v1',T+1000);attempt(a,'per-share-v2',T);assert.equal(state(a,T+2000).first,undefined);
 const b=app();b.E.start('per-share-v1',T);attempt(b,'per-share-v1',T+20);assert.equal(state(b,T+30).first,undefined);
 const c=app();attempt(c,'per-share-v1',T);assert.equal(state(c,T-1).first,undefined);
});
test('missing, changed task/content/rubric versions and forged independence fail closed without deleting history',()=>{
 for(const change of [e=>delete e.taskVersion,e=>e.taskVersion=99,e=>e.competencyVersion=99,e=>e.rubricVersion=99,e=>e.schemaVersion=99]){const a=app();attempt(a,'per-share-v1');const d=a.P.read().data;d.attempts.forEach(r=>change(r.evidence));a.raw.set(a.P.key,JSON.stringify(d));assert.equal(state(a).first,undefined);assert.equal(a.P.read().data.attempts.length,2);}
 const a=app();attempt(a,'per-share-v1',T,true,'help');const d=a.P.read().data;d.attempts.at(-1).evidence.independent=true;d.attempts.at(-1).evidence.helpExposed=false;a.raw.set(a.P.key,JSON.stringify(d));assert.equal(state(a).first,undefined);
});
test('parallel conflicting starts do not become novel evidence after merging',()=>{
 const a=app();attempt(a,'per-share-v1');const d=a.P.read().data,copy=clone(d.attempts);for(const e of copy){e.id+='-other';e.evidence.attemptId+='-other';}d.attempts.push(...copy);a.raw.set(a.P.key,JSON.stringify(d));assert.equal(state(a).first,undefined);assert.equal(state(a).history.length,2);
});
test('old backup roundtrip and new evidence merge preserve activity; same-ID conflict rejects all writes',()=>{
 const a=app();a.P.set('eps','complete');const old=a.c.NTMLocalData.exportJSON();attempt(a,'per-share-v1');const full=a.c.NTMLocalData.exportJSON();
 const b=app();b.c.NTMLocalData.importJSON(old);assert.equal(state(b).first,undefined);b.c.NTMLocalData.importJSON(full);assert.ok(state(b).first);const before=b.raw.get(b.P.key),bad=JSON.parse(full);bad.data.academy.attempts[0].correct=true;assert.throws(()=>b.c.NTMLocalData.importJSON(JSON.stringify(bad)));assert.equal(b.raw.get(b.P.key),before);
 const legacy=a.P.validate({version:1,events:[]});assert.equal(legacy.version,2);assert.equal(legacy.attempts.length,0);
});
test('answer/prose cannot be persisted in evidence or transferred, expiry/units/destination are checked',()=>{
 const a=app(),H=a.c.NTMWave1Context;
 for(const t of a.C.tasks.filter(t=>t.scenario)){for(const scenario of [t.scenario,t.savings].filter(Boolean)){const p=H.createPractice({competency:t.competency,task:t.id,version:t.version},scenario,T);assert.equal(H.validate(p,T),p);const keys=JSON.stringify(p);for(const forbidden of ['answer','correct','independent','choice','explanation','private','thesis'])assert.ok(!keys.includes(forbidden));
  assert.throws(()=>H.validate({...p,answer:42},T));assert.throws(()=>H.validate({...p,units:'wrong'},T));assert.throws(()=>H.validate(p,T+H.ttl));assert.throws(()=>H.validate(p,T-1));
 }}
 attempt(a,'per-share-v1');const bad=a.P.read().data;bad.attempts[0].evidence.answer='private';assert.throws(()=>a.P.validate(bad));
});
test('hundreds of synthetic learning objects retain three visible competency choices and one next task',()=>{
 const a=app(),original=a.C.tasks.length;try{for(let i=0;i<600;i++)a.C.tasks.push({...a.C.tasks[0],id:'synthetic-'+i,variant:'fixture-'+i});const states=a.E.derive(a.P.empty(),T);assert.equal(states.length,3);assert.equal(a.E.next(a.P.empty(),T).next.id,'per-share-v1');}finally{a.C.tasks.length=original;}
});
test('all 18 answers and affected production formula adapters match independent Decimal oracles',()=>{
 const a=app(),per=[2.723076923076923,2.706766917293233,2.6911764705882355,2.676258992805755,2.6619718309859155,2.6482758620689655],valuation=[9.687772611325848,11.069234103851665,12.342525636014857,16.152919297059942,16.776563169103547,17.56048503329417],nominal=[6.4,7.16,7.88,8.56,9.2,9.8],real=[3.3009708737864076,3.536231884057971,3.730769230769231,3.8851674641148324,4,4.075829383886256],capital=[10330.097087378641,10353.623188405798,10373.076923076924,10388.516746411484,10400,10407.582938388625];
 const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
 for(let n=0;n<6;n++){
  near(a.C.task('per-share-v'+(n+1)).answer,(n===2||n===3)?(per[n]/3-1)*100:per[n]);const v=a.C.task('valuation-return-v'+(n+1)),i=v.scenario.inputs;near(v.answer,valuation[n]);near(a.c.calculateStockScenario(i.price,i.eps,i.growth,i.years,i.multiple).cagr*100,valuation[n]);
  const f=a.C.task('real-fx-v'+(n+1)),s=f.scenario.inputs;near(f.answer,(n===2||n===3)?capital[n]:real[n]);const result=a.c.calculateCurrencyAdjustedReturn({investmentReturnPct:s.asset,currencyChangePct:s.fx,amount:s.amount});near(result.adjReturnPct,nominal[n]);near(a.c.calculateRealReturn(nominal[n],f.savings.inputs.inflation)*100,real[n]);near(a.c.projectGoalValue(10000,0,Math.pow(1+real[n]/100,1/12)-1,12),capital[n]);
  assert.equal(a.C.grade(f,(n===2||n===3)?capital[n]:real[n],f.choice),true);assert.equal(a.C.grade(f,(n===2||n===3)?capital[n]:real[n],1),false);
 }
});
