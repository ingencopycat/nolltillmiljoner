'use strict';
// Reproducible evidence inventory; never changes content or approval state.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/qa/knowledge-expansion');
const raw=require('../docs/internal/knowledge/catalog.cjs'),before=require('../docs/qa/knowledge-expansion/before.json');
const old=new Set(before.entries.map(e=>e.id)),added=raw.entries.filter(e=>!old.has(e.id));
for(const e of before.entries)assert.deepEqual(raw.entries.find(n=>n.id===e.id),e);
assert.equal(added.length,59);assert.equal(raw.entries.length,100);
const write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
const benchmark=require('./knowledge_benchmark.cjs').run(),editorial=require('./knowledge_editorial.cjs').report(raw);
write('benchmark.json',benchmark);write('editorial.json',editorial);
const distinctions={
 'eps-comparison|reported-adjusted':'Cross-site date/currency/period comparability versus a specific reported/non-GAAP reconciliation basis.',
 'etf|fund':'Fund pooling definition versus the ETF exchange-traded structure; neither substitutes for the trading comparison.',
 'index-weighting|index':'Index definition versus a worked market-cap weighting mechanism.',
 'guidance|estimates':'Issuer outlook versus analyst estimates: different producers and provenance.',
 'debt|debt-maturity':'Debt interpretation overview versus due-date/liquidity schedule inspection.',
 'forward|pe-versus-ps':'Trailing/forward denominator period versus earnings/sales numerator-denominator basis.',
 'fees|annual-fees':'Commission and small purchases versus compounding annual fee drag.',
 'active-passive|fund-etf':'Management mandate versus trading/dealing mechanics.',
 'arithmetic-geometric|nominal-real':'Average compounding convention versus inflation-adjusted purchasing power.',
 'pe-losses|peg-limitations':'Earnings denominator unsuitability versus growth-denominator/risk/horizon limits.',
 'compounding|loss-recovery':'Wealth accumulation versus the asymmetric recovery rate after a loss.',
 'falsification|report-snapshot':'Authoring a testable countercondition versus interpreting reader snapshot metadata.',
 'report-snapshot|valuation-sensitivity':'Reader provenance/version scope versus changing one valuation input.',
 'annual-fees|contribution-timing':'Fee drag versus beginning/end-of-period deposits.',
 'estimate-age|guidance-revision':'Whether an estimate is stale versus comparing two issuer outlook versions.'
};
write('duplicate-dispositions.json',editorial.possibleDuplicates.map(pair=>{
 const entries=pair.ids.map(id=>raw.entries.find(e=>e.id===id));
 const macro=entries.every(e=>e.category==='macro'),thesis=entries.every(e=>e.conceptRefs.includes('thesis'));
 return {...pair,disposition:'retain distinct bounded questions',questions:entries.map(e=>e.question),rationale:distinctions[pair.ids.join('|')]||(macro?'Distinct measure, survey, price basis or time-unit comparison; shared Macro vocabulary does not make these interchangeable.':thesis?'Distinct Research task: identify evidence, construct assumptions, record provenance, test or update a thesis. Preserve field-level scope rather than repeating the overview.':'The canonical questions address different quantities or tasks despite shared concepts. Retain their stated scope; do not duplicate the neighboring answer.'),independentHumanReview:'not claimed'};
}));
const groups=Object.fromEntries(fs.readdirSync(out).filter(n=>n.endsWith('-decisions.json')).flatMap(n=>{const d=JSON.parse(fs.readFileSync(path.join(out,n)));return d.ids.map(id=>[id,d.batch]);}));
const sources=new Map();
for(const e of added)for(const s of e.sources){if(!sources.has(s.url))sources.set(s.url,{url:s.url,title:s.title,objects:[]});sources.get(s.url).objects.push({id:e.id,supports:s.supports,checked:s.checked,limitations:s.limitations,evidenceStatus:s.evidenceStatus,checkedAt:s.reviewedAt});}
write('source-evidence.json',{scope:'New 59 only; passage-level checks recorded in each object, not whole-document certification or independent human review',sources:[...sources.values()],supplementalCorroboration:[{url:'https://bea.gov/help/glossary/chained-dollar-estimate',object:'real-nominal-gdp',checked:'Nonadditivity of chained-dollar components outside reference-year conditions; corroborates existing caveat.'},{url:'https://pages.stern.nyu.edu/~adamodar/pdfiles/country/relvalAIMR.pdf',object:'peg-limitations',checked:'PEG discussion pp. 50 and 56: growth, risk and cash-flow assumptions remain relevant.'}]});
const arithmetic=fs.readdirSync(out).filter(n=>n.endsWith('-arithmetic.json')).map(n=>({file:n,...JSON.parse(fs.readFileSync(path.join(out,n)))}));
const countBy=key=>Object.fromEntries([...new Set(raw.entries.map(e=>e[key]))].map(k=>[k,raw.entries.filter(e=>e[key]===k).length]));
const coverage=raw.entries.map(e=>({id:e.id,question:e.question,category:e.category,conceptRefs:e.conceptRefs,intent:e.intent,batch:groups[e.id]||'preserved',status:e.status,approval:e.editorial.approval,reviewDue:e.reviewDue||null,aliases:e.aliases,relatedAnswers:e.relatedAnswers,lessons:e.relatedLessonIds,entities:e.relatedEntityIds,sourceCount:e.sources.length}));
write('coverage.json',coverage);
const metrics={starting:before.entries.length,added:added.length,total:raw.entries.length,concepts:raw.knowledgeConcepts.length,status:countBy('status'),categories:countBy('category'),intents:countBy('intent'),newSourceUrls:sources.size,newAliasCount:added.reduce((n,e)=>n+e.aliases.length,0),arithmeticChecks:arithmetic.reduce((n,a)=>n+a.checks.length,0),arithmeticPassed:arithmetic.every(a=>a.passed),benchmarkCases:benchmark.total,benchmarkFailures:benchmark.failures.length,wrongConfident:benchmark.wrongConfidentMatch,unmapped:editorial.unmappedClaims.length,unscheduled:editorial.missingReviewSchedule.length,inherited:editorial.inheritedNotIndependent.length,duplicateCandidates:editorial.possibleDuplicates.length,orphanConcepts:editorial.orphanConcepts,unintegrated:editorial.unintegrated,compactIndexBytes:fs.statSync(path.join(root,'knowledge-catalog.js')).size,knowledgeHtmlBytes:fs.statSync(path.join(root,'fragor-svar.html')).size,answerBodyBytes:fs.readdirSync(path.join(root,'data/knowledge/answers')).reduce((n,f)=>n+fs.statSync(path.join(root,'data/knowledge/answers',f)).size,0)};
write('metrics.json',metrics);
const md=['# Knowledge 100 — canonical coverage','', 'Current catalog; approval provenance is preserved. Reviewed pages remain noindex.','', '| ID | Batch | Intent | Question | Concepts | Status / approval |','| --- | --- | --- | --- | --- | --- |',...coverage.map(e=>`| \`${e.id}\` | ${e.batch} | ${e.intent} | ${e.question} | ${e.conceptRefs.join(', ')} | ${e.status} / ${e.approval} |`)];
fs.writeFileSync(path.join(root,'docs/internal/knowledge-expansion-coverage.md'),md.join('\n')+'\n');
console.log(JSON.stringify(metrics,null,2));
