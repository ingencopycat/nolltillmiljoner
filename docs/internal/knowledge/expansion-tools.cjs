// Internal authoring helpers; no public runtime dependency and no automatic approval.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const date='2026-09-19',out=path.resolve(__dirname,'../../qa/knowledge-expansion');
const source=(title,url,supports,checked,limitations,authority='primary')=>({title,url,supports,checked,limitations,authority,type:'methodology',evidenceStatus:'checked',reviewedAt:date});
const relation=(id,type='related-metric')=>({id,type});
// The site relation graph has an older Academy vocabulary, separate from conceptRefs.
const legacyConcepts={analysts:'forward-metrics',statements:'financial-statements',margins:'marginal',return:'avkastning',outlook:'forward-metrics',earnings:'report',ttm:'forward-metrics',shares:'dilution','market-cap':'valuation',fx:'currency',macro:'inflation',drawdown:'risk',volatility:'risk',leverage:'risk',diversification:'diversifiering','time-horizon':'risk',liquidity:'risk',fund:'diversifiering',etf:'diversifiering',index:'diversifiering',ebitda:'financial-statements','enterprise-value':'valuation',discounting:'valuation',spread:'fees',peg:'valuation'};
function draft(row){
 const {comparison,notes,...e}=row;e.concepts=[...new Set(e.concepts.map(c=>legacyConcepts[c]||c))];
 return {...e,slug:e.id,relatedEntityIds:e.relatedEntityIds||['research-nvda'],difficulty:e.difficulty||'beginner',status:'draft',reviewedAt:null,featured:false,contentVersion:1,reviewDue:e.reviewDue||(e.intent==='definition'?'2027-09-19':'2027-03-18'),reviewPolicy:e.reviewPolicy||{risk:e.intent==='definition'?'stable':'methodology',overdue:'label'},jurisdiction:e.jurisdiction||'global',period:e.period||'timeless',sections:{inline:{field:'shortAnswer',contexts:e.sections?.inline?.contexts||['knowledge','research','calculator','public-report','academy-reminder']},...(comparison?{comparison}:{}),...(e.intent==='interpretation'?{interpretation:{field:'fullAnswer',unsuitableField:'caveats'}}:{})},internalEditorialNotes:notes||'Bounded owner-delegated scope; synthetic examples, no investment verdict.',editorial:{owner:'NTM owner',approval:'pending',changeNote:'Owner delegated scope approval; requires evidence, arithmetic and structural gates before acceptance.'}};
}
function writeDrafts(batch,rows,decisions){
 const current=require('./catalog.cjs');
 for(const r of rows){assert(!current.entries.some(e=>e.id===r.id||e.question===r.question),'Existing object collision: '+r.id);assert(decisions[r.id],'Missing duplicate/evidence decision: '+r.id);}
 const next={...current,entries:[...current.entries,...rows.map(draft)]};
 assert.deepEqual(require('../../../scripts/knowledge_quality.cjs').validate(next,require('../../../data/rule-registry.json')),[]);
 for(const r of rows)fs.writeFileSync(path.join(__dirname,'answers',r.id+'.json'),JSON.stringify(draft(r),null,2)+'\n',{flag:'wx'});
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,batch+'-decisions.json'),JSON.stringify({date,batch,decisions,ids:rows.map(e=>e.id)},null,2)+'\n');
 console.log(batch+': '+rows.length+' validated drafts written.');
}
function accept(batch,fixtures,math){
 assert(math?.passed&&math.method,'Independent arithmetic/scope evidence required');
 const raw=require('./catalog.cjs'),Core=require('../../../knowledge-core.js'),decisions=require(path.join(out,batch+'-decisions.json'));
 const candidate=structuredClone(raw);
 for(const e of candidate.entries.filter(e=>decisions.ids.includes(e.id))){assert.equal(e.status,'draft');Object.assign(e,{status:'reviewed',reviewedAt:date,editorial:{owner:'NTM owner',approval:'accepted',reviewer:'Owner-delegated scope; Codex authoritative-source and arithmetic verification',reviewedAt:date,changeNote:'Accepted within explicitly delegated Knowledge 100 scope after evidence, duplicate, arithmetic and schema checks; independent human validation not claimed.'},history:[{from:0,to:1,date,reviewer:'Codex under owner-delegated scope',reason:'Initial bounded answer; evidence and synthetic examples verified.'}]});}
 assert.deepEqual(require('../../../scripts/knowledge_quality.cjs').validate(candidate,require('../../../data/rule-registry.json')),[]);
 const K=Core.create(candidate),results=fixtures.map(([query,kind,answerId])=>{const actual=K.respond(query);assert.equal(actual.kind,kind,query);assert.equal(actual.answerId,answerId,query);return{query,kind,answerId,passed:true};});
 for(const e of candidate.entries.filter(e=>decisions.ids.includes(e.id)))fs.writeFileSync(path.join(__dirname,'answers',e.id+'.json'),JSON.stringify(e,null,2)+'\n');
 fs.writeFileSync(path.join(out,batch+'-gate.json'),JSON.stringify({date,ids:decisions.ids,schema:true,math,retrieval:results,duplicates:require('../../../scripts/knowledge_editorial.cjs').report(candidate).possibleDuplicates},null,2)+'\n');
 console.log(batch+': accepted '+decisions.ids.length+' after focused checks.');
}
module.exports={date,source,relation,draft,writeDrafts,accept,legacyConcepts};
