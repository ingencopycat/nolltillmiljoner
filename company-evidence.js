/* SEC document access and neutral evidence context; never writes Research snapshots. */
(() => {
 'use strict';
 const pilot={NVDA:'0001045810',SOFI:'0001818874',CRWD:'0001535527'};
 const labels={annual_report:'Årsrapport',quarterly_report:'Kvartalsrapport',results_disclosure:'Resultatrapportering',other_current_report:'Annan bolagsrapportering'};
 const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 function validate(data,ticker){
  if(data?.schema!=='ntm-company-evidence/1'||data.ticker!==ticker||data.cik!==pilot[ticker]||!Array.isArray(data.events)||data.events.length>24)throw Error('Invalid evidence');
  const seen=new Set();
  for(const e of data.events){
   if(e.ticker!==ticker||e.cik!==data.cik||!/^\d{10}-\d{2}-\d{6}$/.test(e.accessionNumber)||seen.has(e.accessionNumber)||!iso(e.filingDate)||e.reportDate&&!iso(e.reportDate)||!Object.hasOwn(labels,e.classification)||!['10-K','10-Q','10-K/A','10-Q/A','8-K','8-K/A'].includes(e.form))throw Error('Invalid event');
   seen.add(e.accessionNumber);
   const classification=e.form.startsWith('8-K')?(e.items?.includes('2.02')?'results_disclosure':'other_current_report'):e.form.startsWith('10-K')?'annual_report':'quarterly_report';
   if(e.classification!==classification||e.amendment!==e.form.endsWith('/A')||e.documents?.length>1)throw Error('Invalid semantics');
   const base=`https://www.sec.gov/Archives/edgar/data/${Number(data.cik)}/${e.accessionNumber.replaceAll('-','')}/`;
   const safe=url=>typeof url==='string'&&url.startsWith(base)&&/^[A-Za-z0-9_-]+\.html?$/.test(url.slice(base.length));
   if(!safe(e.primaryDocUrl)||!Array.isArray(e.documents))throw Error('Invalid source');
   for(const d of e.documents)if(!safe(d.url)||d.accessionNumber!==e.accessionNumber||d.relationshipSource!==e.primaryDocUrl||d.documentType!=='earnings_release'||d.relationship!=='item_2_02_and_exhibit_table'||!e.items?.includes('2.02')||e.classification!=='results_disclosure')throw Error('Invalid exhibit');
  }
  const ordered=[...data.events].sort((a,b)=>b.filingDate.localeCompare(a.filingDate)||b.accessionNumber.localeCompare(a.accessionNumber));
  if(ordered.some((e,i)=>e!==data.events[i]))throw Error('Invalid order');
  const latest=data.events.filter(e=>['annual_report','quarterly_report'].includes(e.classification)&&!e.amendment&&e.reportDate).sort((a,b)=>b.reportDate.localeCompare(a.reportDate)||b.filingDate.localeCompare(a.filingDate))[0];
  if(data.latestReportAccession!==(latest?.accessionNumber||null))throw Error('Invalid latest report');
  if(data.insiderEvidence&&window.NTMCompanyInsiders)window.NTMCompanyInsiders.validate(data.insiderEvidence,ticker,data.cik);
  if(data.ownershipEvidence&&window.NTMCompanyOwnership)window.NTMCompanyOwnership.validate(data.ownershipEvidence,ticker,data.cik);
  if(data.materialEvents&&window.NTMCompanyMaterialEvents)window.NTMCompanyMaterialEvents.validate(data.materialEvents,ticker,data.cik);
  return data;
 }
 function since(data,savedAt){
  if(!Number.isFinite(Date.parse(savedAt)))return [];
  // Date-only SEC metadata cannot resolve order within the saved revision's day.
  const day=new Date(savedAt).toISOString().slice(0,10);
  return data.events.filter(e=>e.filingDate>day);
 }
 const link=(label,url)=>{const a=node('a',label+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
 let generation=0,current=null,baseline=null;
 function reportLabel(latest,stock){
  const periods=latest?.form==='10-K'?stock?.annual:stock?.quarterly;
  const period=periods?.find(p=>p.periodEnd===latest?.reportDate&&Object.values(p.metrics||{}).some(m=>m.accession===latest.accessionNumber));
  const quarter=period?.period?.match(/^(\d{4})Q([1-4])$/);
  return quarter?`Q${quarter[2]} FY${quarter[1]}`:period?.period||`Periodslut ${latest.reportDate}`;
 }
 function show(data,status,host,stock){
  host.replaceChildren(node('h2','Senaste rapportering'));
  if(status?.status==='unavailable')host.append(node('p','Uppdateringen är otillgänglig; tidigare verifierat underlag visas.'));
  const latest=data.events.find(e=>e.accessionNumber===data.latestReportAccession);
  const results=data.events.find(e=>e.classification==='results_disclosure'&&!e.amendment);
  const grid=node('div');grid.className='reporting-grid';
  if(latest){const report=node('div');report.append(node('h3',reportLabel(latest,stock)),node('p',`${latest.form} · ${latest.filingDate}`),link(`Öppna ${latest.form}`,latest.primaryDocUrl));grid.append(report);}
  if(results){const docs=node('div');docs.append(node('h3','Officiella dokument'),node('p',`Resultatrapportering · ${results.filingDate}`));
   for(const d of results.documents)docs.append(link('Läs resultatmeddelande',d.url));
   if(!results.documents.length)docs.append(node('p','Resultatbilaga ej verifierad.'));
   docs.append(link('Se SEC-filing (8-K)',results.primaryDocUrl));grid.append(docs);}
  host.append(grid);
  const comparison=node('div');comparison.id='companyEvidenceSince';host.append(comparison);renderBaseline();
  const details=node('details');details.className='financial-sources';details.id='reportingSources';details.append(node('summary','Källor & metod'));
  details.append(node('p',`SEC · senast verifierat ${data.verifiedAt?.slice(0,10)||'okänt'}. Urval: högst 24 rapporteringshändelser; inte ett fullständigt arkiv.`),node('p','Rapportens periodslut och 8-K:s händelsedatum är olika uppgifter. Resultatmeddelandet hör till angiven 8-K; ett samband med en 10-Q eller 10-K antas inte enbart från datumen.'),node('p','Jämförelsen avser inlämningar efter den sparade versionens datum inom urvalet. Samma dags ordning kan inte fastställas. Nytt underlag är ingen investeringsslutsats.'));
  const list=node('div');list.className='reporting-events';list.append(node('h3','Senaste rapporter och bolagshändelser'));
  for(const e of data.events.slice(0,8)){
   const article=node('article');article.append(node('h4',`${labels[e.classification]}${e.amendment?' · ändring':''}`),node('p',`${e.form} · ${e.filingDate} · ${e.form.startsWith('8-K')?'händelsedatum':'periodslut'} ${e.reportDate||'saknas'}`),link(`Öppna ${e.form}`,e.primaryDocUrl));
   if(e.amendment)article.append(node('p','Ändring av tidigare rapportering. Ersätter inte automatiskt hela originalrapporten.'));
   for(const d of e.documents)article.append(link('Läs resultatmeddelande',d.url),node('p',`SEC-bilaga ${d.exhibit} · ${d.legalStatus==='furnished'?'tillhandahållen (furnished)':'juridisk status ospecificerad'}`));
   if(e.classification==='results_disclosure'&&!e.documents.length)article.append(node('p','Resultatbilagans samband kunde inte verifieras.'));
   list.append(article);
  }
  details.append(list);
  const raw=node('details');raw.className='evidence-technical';raw.append(node('summary','Fullständigt källunderlag'),node('pre',JSON.stringify(data,null,2)));details.append(raw);host.append(details);
 }
 function renderBaseline(){
  const p=document.getElementById('companyEvidenceSince');if(!p||!current)return;
  p.hidden=true;p.replaceChildren();
  window.NTMResearchSinceUI?.render();
 }
 async function render(stock){
  const ticket=++generation;current=null;
  window.NTMResearchSinceUI?.setStock(stock);
  const legacy=document.getElementById('filingsList');if(legacy)legacy.hidden=false;
  const legacySection=legacy?.closest('section');if(legacySection)legacySection.hidden=false;
  document.getElementById('companyEvidence')?.remove();
  if(stock.manual||!pilot[stock.symbol])return;
  const host=node('section');host.id='companyEvidence';host.setAttribute('aria-label','Officiell bolagsrapportering');
  document.getElementById('overviewRevenue')?.after(host);
  host.append(node('p','Hämtar officiell bolagsrapportering…'));
  try{
   const [response,health]=await Promise.all([fetch(`data/stocks/evidence/${stock.symbol}.json`),fetch(`data/stocks/evidence/${stock.symbol}.status.json`).catch(()=>null)]);
   if(!response.ok)throw Error('Unavailable');
   const data=validate(await response.json(),stock.symbol),status=health?.ok?await health.json().catch(()=>({status:'unavailable'})):{status:'unavailable'};
   if(ticket!==generation)return;
   if(data.status!=='verified')throw Error('Unverified');
   current=data;window.NTMResearchSinceUI?.setEvidence(data,status);show(data,['verified','unavailable'].includes(status?.status)?status:{status:'unavailable'},host,stock);
   window.NTMCompanyObservationsUI?.render(data,host,status);
   window.NTMCompanySegmentsUI?.render(data,host,status);
   window.NTMCompanyCapitalUI?.render(data,host,status);
   window.NTMCompanyInsidersUI?.render(data,host,status);
   window.NTMCompanyOwnershipUI?.render(data,host,status);
   window.NTMCompanyMaterialEventsUI?.render(data,host,status);
   if(legacy)legacy.hidden=true;
   if(legacySection)legacySection.hidden=true;
  }catch{if(ticket===generation)host.replaceChildren(node('p','Officiell bolagsrapportering är inte tillgänglig just nu. Befintliga rapportlänkar visas nedan.'));}
 }
 window.NTMCompanyEvidence={validate,since,render,reportLabel,materialSince(data,date,until){return window.NTMCompanyMaterialEvents?.changesSince(data?.materialEvents,date,until)||{events:[],count:0,newEvents:0,updates:0};},ownershipSince(data,date,until){return window.NTMCompanyOwnership?.changesSince(data?.ownershipEvidence,date,until)||{filings:[],count:0,amendments:0,changes:[]};},insidersSince(data,date,until){return window.NTMCompanyInsiders?.changesSince(data.insiderEvidence,date,until)||{filings:[],count:0,categories:{},corrections:0};},setBaseline(date){baseline=date||null;renderBaseline();}};
})();
