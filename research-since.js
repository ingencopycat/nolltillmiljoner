/* Presentation adapter over reviewed comparison contracts. No network or storage writes. */
(function(root){
 'use strict';
 const titles={reporting:'Ny rapportering',financials:'Financials',guidance:'Guidance',business:'Verksamheten / KPI & segment',capital:'Kapitalstruktur & likviditet',owners:'Insiders & större ägare',events:'Bolagshändelser'};
 const latest=thesis=>thesis?.revisions?.find(r=>r.id===thesis.latestRevisionId)||null;
 function build({thesis,stock,feed,until=new Date().toISOString(),unavailable=false}){
  const revision=latest(thesis),result={baseline:revision?.savedAt||null,revisionId:revision?.id||null,state:'no_revision',groups:[],unavailable};
  if(!revision)return result;
  if(!Number.isFinite(Date.parse(revision.savedAt))){result.state='unavailable';return result;}
  result.state='ready';
  const day=new Date(revision.savedAt).toISOString().slice(0,10),end=until.slice(0,10),fresh=d=>d>day&&d<=end;
  const groups=new Map(),add=(group,row)=>{if(!groups.has(group))groups.set(group,{id:group,title:titles[group],rows:[]});groups.get(group).rows.push(row);};
  if(!feed||feed.status!=='verified'||feed.ticker!==stock?.symbol){result.state='unavailable';return result;}
  const E=root.NTMCompanyEvidence,O=root.NTMCompanyObservations,S=root.NTMCompanySegments;
  E.validate(feed,stock.symbol);
  const observations=feed.reviewedEvidence;
  if(observations)O.validate(observations,feed.ticker,feed.cik);
  const sources=new Set();
  if(observations){
   // Segment comparisons use their own stricter definition/period contract.
   const changes=O.changesSince(observations,revision.savedAt,until).filter(c=>c.observation.kind!=='business_mix');
   for(const c of S.changesSince(observations,revision.savedAt,until)){
    const o=c.observation;
    if(!S.history(observations,o.group.id,until).some(h=>h.available&&h.period.end===o.period.end&&h.categories.some(x=>x.id===o.id)))continue;
    const prior=S.history(observations,o.group.id,revision.savedAt).filter(h=>h.available&&h.period.end<o.period.end).at(-1)?.categories.find(p=>p.category.id===o.category.id);
    changes.push({...c,previous:c.previous||prior,comparison:S.compare(c.previous||prior,o)});
   }
   for(const c of changes){
    const o=c.observation,p=c.previous;
    if(o.review?.status!=='reviewed'||!fresh(o.publicationDate))continue;
    if(p&&c.comparison?.comparable&&JSON.stringify(p.value)===JSON.stringify(o.value)&&p.period.label===o.period.label)continue;
    if(o.kind==='capital'&&root.NTMCompanyCapital.history(observations,o.metricId,until).some(x=>x.conflict&&x.period.end===o.period.end))continue;
    sources.add(o.source.accessionNumber);
    const group=o.kind==='guidance'?'guidance':o.kind==='capital'?'capital':'business';
    add(group,{label:o.label,period:o.period.label,periodEnd:o.period.end,date:o.publicationDate,before:p?O.valueLabel(p):null,current:O.valueLabel(o),comparison:c.comparison||{comparable:false,reason:'Direkt jämförelse saknas'},previousPeriod:p?.period.label,source:o.source,definition:o.definition,basis:o.basis,previousSource:p?.source,recast:c.issuerRecast});
   }
  }
  // Preserve the snapshot comparator's quality/split/period gates. Publication dates
  // of every TTM dependency must be known; ingestion timestamps never qualify.
  if(revision.valuationSnapshot&&stock.metadata?.qualityStatus==='validated'){
   const report=root.NTMChangeDetection.detect(revision.valuationSnapshot,stock),snapshot=root.NTMResearchSnapshot.fromStockData(stock);
   const keys={'TTM Revenue':'revenue','TTM Net Income':'netIncome','TTM EPS':'eps','TTM Diluted Shares':'dilutedShares','TTM FCF':'fcf','TTM FCF per Share':'fcfPerShare','Net Margin':'netMargin','FCF Margin':'fcfMargin'};
   const names={revenue:'Intäkter',netIncome:'Nettoresultat',eps:'Vinst per aktie',dilutedShares:'Vägt antal utspädda aktier',fcf:'Fritt kassaflöde',fcfPerShare:'FCF per aktie',netMargin:'Nettomarginal',fcfMargin:'FCF-marginal'};
   for(const r of [...report.metrics,...report.margins,...report.blocked]){
    const key=keys[r.name],deps=key==='netMargin'?['netIncome','revenue']:key==='fcfMargin'?['fcf','revenue']:[key];
    if(r.reason&&revision.valuationSnapshot.ttmMetrics?.[key]===snapshot.ttmMetrics[key])continue;
    const facts=deps.map(k=>snapshot.provenance?.metrics[k]);
    const dates=facts.flatMap(f=>f?.inputs?.flatMap(i=>i.sourceFilings?.length?i.sourceFilings.map(s=>s.filed):[i.filed])||[f?.filed]);
    if(!dates.length||dates.some(d=>!d||d>end)||!dates.some(fresh))continue;
    add('financials',{label:names[key]+' · TTM',period:report.currentPeriod,previousPeriod:report.snapshotPeriod,before:r.snapshot,current:r.current,unit:r.unit==='pp'?'%':key==='dilutedShares'?'aktier':stock.company?.currency||'USD',comparison:r.reason?{comparable:false,reason:r.reason}:{comparable:true,changePercent:r.pct,change:r.absolute,marginChange:r.marginChange},target:'#researchFinancials'});
   }
  }
  const material=E.materialSince(feed,revision.savedAt,until);
  for(const g of material.events){const o=g.event;sources.add(o.accessionNumber);add('events',{label:root.NTMCompanyMaterialEvents.describe(o),date:o.publicationDate,current:g.change==='updated_event'?'Uppdaterad händelse':'Ny granskad händelse',target:'#companyMaterialEvents'});}
  const insiders=E.insidersSince(feed,revision.savedAt,until).filings.filter(f=>!f.reviewPending);
  const ownerChanges=E.ownershipSince(feed,revision.savedAt,until),ownership=ownerChanges.filings;
  for(const f of insiders)add('owners',{label:f.form,date:f.filingDate,current:'Ny granskad insiderinlämning',source:{url:f.renderedUrl||f.url},target:'#companyInsiders'});
  for(const f of ownership){const c=ownerChanges.changes.find(c=>c.accessionNumber===f.accessionNumber);add('owners',{label:f.form,date:f.filingDate,current:'Ny granskad ägarinlämning',comparison:c?.state==='not_comparable'?{comparable:false,reason:c.reason}:null,source:{url:f.renderedUrl||f.url},target:'#companyOwnership'});}
  // One reporting summary. Exact accession relationships only; dates alone do
  // not establish that two filings describe the same earnings event.
  const reports=E.since(feed,revision.savedAt).filter(e=>fresh(e.filingDate)&&e.classification!=='other_current_report');
  for(const e of reports)add('reporting',{label:e.classification==='results_disclosure'?'Resultatmeddelande':E.reportLabel(e,stock),date:e.filingDate,current:e.classification==='results_disclosure'?'Publicerat':e.form,source:{url:e.documents[0]?.url||e.primaryDocUrl},effects:sources.has(e.accessionNumber)});
  result.groups=Object.keys(titles).filter(k=>groups.has(k)).map(k=>groups.get(k));
  return result;
 }
 const api={build,latest};root.NTMResearchSince=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
