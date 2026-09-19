// New-object navigation audit; never changes starting objects or answer claims.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const before=require('../../qa/knowledge-expansion/before.json'),old=new Set(before.entries.map(e=>e.id));
const groups=[
 ['fact-assumption falsification source-provenance update-thesis scenario-probability report-snapshot','thesis','workflow-manual-thesis'],
 ['scenario-design valuation-sensitivity','scenarios','tool-scenarios'],
 ['guidance-consensus earnings-surprise estimate-age estimate-dispersion guidance-revision fiscal-calendar ttm-construction','forward-metrics','workflow-manual-thesis'],
 ['nominal-real arithmetic-geometric cashflow-return','avkastning','tool-return'],
 ['drawdown loss-recovery volatility-risk concentration leverage-downside risk-horizon liquidity','risk','workflow-manual-thesis'],
 ['contribution-timing','compounding','tool-compound'],
 ['fee-double-count','fees','tool-fees'],
 ['savings-target','compounding','workflow-goal-followup'],
 ['asset-ownership price-value','aktier','tool-purchase'],
 ['fund active-passive','fonder','tool-fees'],
 ['etf fund-etf','etf','tool-fees'],
 ['index index-weighting fund-overlap','diversifiering','workflow-manual-thesis'],
 ['cpi-pce headline-core mom-yoy seasonal-adjustment macro-revisions jobs-unemployment real-nominal-gdp macro-no-forecast','inflation','macro-calendar'],
 ['revenue-growth','revenue','workflow-manual-thesis'],
 ['ebit-ebitda gross-margin debt-maturity','financial-statements','workflow-manual-thesis'],
 ['enterprise-value ev-market-cap ev-ebitda-limits','enterprise-value','workflow-manual-thesis'],
 ['peg-limitations','pe','tool-valuation'],
 ['discounting','scenarios','tool-valuation'],
 ['sequence-risk','avkastning','tool-return'],
 ['order-spread','fees','tool-purchase'],
 ['split-dilution','dilution','tool-purchase'],
 ['isk-inputs isk-year-scope','isk','tool-tax']
];
const changes=[];
for(const [ids,lesson,entity] of groups)for(const id of ids.split(' ')){
 assert(!old.has(id));const file=path.join(__dirname,'answers',id+'.json'),e=JSON.parse(fs.readFileSync(file));
 changes.push({id,previousLessons:e.relatedLessonIds,previousEntities:e.relatedEntityIds,lessons:[lesson],entities:[entity]});
 e.relatedLessonIds=[lesson];e.relatedEntityIds=[entity];fs.writeFileSync(file,JSON.stringify(e,null,2)+'\n');
}
assert.equal(changes.length,59);
fs.writeFileSync(path.join(__dirname,'../../qa/knowledge-expansion/navigation-audit.json'),JSON.stringify({date:'2026-09-19',scope:'Only new 59 navigation fields; content/history preserved',changes},null,2)+'\n');
