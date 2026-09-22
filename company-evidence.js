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
  return data;
 }
 function since(data,savedAt){
  if(!Number.isFinite(Date.parse(savedAt)))return [];
  // Date-only SEC metadata cannot resolve order within the saved revision's day.
  const day=new Date(savedAt).toISOString().slice(0,10);
  return data.events.filter(e=>e.filingDate>day);
 }
 const link=(label,url)=>{const p=node('p'),a=node('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';p.append(a);return p;};
 let generation=0,current=null,baseline=null;
 function show(data,status,host){
  host.replaceChildren(node('h3','Senaste rapportering'));
  host.append(node('p',`SEC · senast verifierat ${data.verifiedAt?.slice(0,10)||'okänt'}. ${status?.status==='unavailable'?'Uppdateringen är otillgänglig; tidigare verifierat underlag visas.':'Avgränsat urval av rapporter och bolagshändelser.'}`));
  const latest=data.events.find(e=>e.accessionNumber===data.latestReportAccession);
  if(latest){host.append(node('p',`${labels[latest.classification]} · periodslut ${latest.reportDate} · ${latest.form} · inlämnad ${latest.filingDate}`),link('Öppna senaste rapporten hos SEC',latest.primaryDocUrl));}
  const results=data.events.find(e=>e.classification==='results_disclosure'&&!e.amendment);
  if(results){host.append(node('p',`Senaste resultatrapportering · händelsedatum ${results.reportDate||'saknas'} · inlämnad ${results.filingDate}`));documents(results,host);}
  host.append(node('p','Rapportens periodslut och 8-K:s händelsedatum är olika uppgifter. Dokument kopplas endast till den SEC-inlämning som belägger sambandet.'));
  const comparison=node('p');comparison.id='companyEvidenceSince';host.append(comparison);renderBaseline();
  const details=node('details');details.append(node('summary','Senaste rapporter och bolagshändelser'));
  for(const e of data.events.slice(0,8)){
   const article=node('article');article.append(node('h4',`${labels[e.classification]}${e.amendment?' · ändring':''}`),node('p',`${e.form} · inlämnad ${e.filingDate} · ${e.form.startsWith('8-K')?'händelsedatum':'periodslut'} ${e.reportDate||'saknas'}`),link('Officiellt dokument hos SEC',e.primaryDocUrl));
   if(e.amendment)article.append(node('p','Ändring av tidigare rapportering. Ersätter inte automatiskt hela originalrapporten.'));
   if(e.classification==='results_disclosure')documents(e,article);
   details.append(article);
  }
  host.append(details);
 }
 function documents(e,host){
  for(const d of e.documents)host.append(node('p',`Resultatmeddelande · officiell SEC-bilaga ${d.exhibit}`),link('Öppna resultatmeddelandet hos SEC',d.url));
  if(!e.documents.length)host.append(node('p','Resultatbilagans samband kunde inte verifieras. Läs den officiella 8-K-rapporten.'));
  host.append(link('Visa tillhörande 8-K hos SEC',e.primaryDocUrl));
 }
 function renderBaseline(){
  const p=document.getElementById('companyEvidenceSince');if(!p||!current)return;
  p.textContent=baseline?`${since(current,baseline).length} rapporter eller bolagshändelser i urvalet har lämnats in efter den sparade versionens datum (${baseline.slice(0,10)}). Samma dags ordning kan inte fastställas. Nytt underlag är ingen investeringsslutsats.`:'Spara en Research-version för att jämföra rapporteringsdatum. Nytt underlag är ingen investeringsslutsats.';
 }
 async function render(stock){
  const ticket=++generation;current=null;
  const legacy=document.getElementById('filingsList');if(legacy)legacy.hidden=false;
  document.getElementById('companyEvidence')?.remove();
  if(stock.manual||!pilot[stock.symbol])return;
  const host=node('section');host.id='companyEvidence';host.setAttribute('aria-label','Officiell bolagsrapportering');
  document.getElementById('filingsList')?.before(host);
  host.append(node('p','Hämtar officiell bolagsrapportering…'));
  try{
   const [response,health]=await Promise.all([fetch(`data/stocks/evidence/${stock.symbol}.json`),fetch(`data/stocks/evidence/${stock.symbol}.status.json`)]);
   if(!response.ok||!health.ok)throw Error('Unavailable');
   const data=validate(await response.json(),stock.symbol),status=await health.json();
   if(ticket!==generation)return;
   if(data.status!=='verified')throw Error('Unverified');
   current=data;show(data,['verified','unavailable'].includes(status?.status)?status:{status:'unavailable'},host);
   if(legacy)legacy.hidden=true;
  }catch{if(ticket===generation)host.replaceChildren(node('p','Officiell bolagsrapportering är inte tillgänglig just nu. Befintliga rapportlänkar visas nedan.'));}
 }
 window.NTMCompanyEvidence={validate,since,render,setBaseline(date){baseline=date||null;renderBaseline();}};
})();
