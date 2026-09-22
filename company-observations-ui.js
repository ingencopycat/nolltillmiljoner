/* Data first; all historical passages stay under a single native disclosure. */
(()=>{
 'use strict';
 const A=window.NTMCompanyObservations;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const direction={raised:'Höjd',lowered:'Sänkt',unchanged:'Oförändrad',mixed:'Ändrat intervall'};
 function chart(history,label){
  if(history.length<3||history.slice(1).some((o,i)=>!A.compare(history[i],o).comparable))return null;
  const plot=el('div',undefined,'observation-chart');plot.setAttribute('role','img');plot.setAttribute('aria-label',label+': '+history.map(o=>o.period.label+' '+A.valueLabel(o)).join('; '));
  const max=Math.max(...history.map(o=>o.value.point));
  for(const o of history){const column=el('div');const bar=el('span',undefined,'observation-bar');bar.style.height=(o.value.point/max*64)+'px';column.append(el('small',A.valueLabel(o)),bar,el('small',o.period.label));plot.append(column);}
  return plot;
 }
 function render(feed,host,status){
  const data=feed.reviewedEvidence;if(!data)return;
  const section=el('section');section.id='companyObservations';section.setAttribute('aria-label','Bolagets guidning och operativa nyckeltal');
  try{A.validate(data,feed.ticker,feed.cik);}catch{section.append(el('p','Granskade bolagsuppgifter är inte tillgängliga.'));host.prepend(section);return;}
  if(status?.status!=='verified')section.append(el('p','Uppdateringen är otillgänglig; tidigare verifierade uppgifter visas.'));
  const history=A.asOf(data,new Date().toISOString());
  for(const kind of ['guidance','kpi']){
   const all=history.filter(o=>o.kind===kind);section.append(el('h2',kind==='guidance'?'Bolagets guidning':'Operativa nyckeltal'));
   if(!all.length){section.append(el('p',data.coverage.note,'observation-context'));continue;}
   const latestDate=all.at(-1).publicationDate;
   section.append(el('p',`Publicerat ${latestDate}${kind==='guidance'?' · bolagets egna utsikter':''}`,'observation-context'));
   const grid=el('div',undefined,'observation-grid');
   const rank=o=>({revenue:0,adjusted_net_revenue:0,arr:1,gross_margin:1,adjusted_ebitda:1,tax_rate:2,adjusted_eps:2,diluted_eps:2}[o.metricId]??3);
   const latest=all.filter(o=>o.publicationDate===latestDate).sort((a,b)=>rank(a)-rank(b)||a.period.type.localeCompare(b.period.type));
   for(const o of latest.filter(o=>o.value.kind!=='qualitative')){
    const cell=el('article',undefined,'observation-metric');
    cell.append(el('h3',o.label+(o.basis==='non-GAAP'?' · non-GAAP':'')),el('div',A.valueLabel(o),'observation-value'),el('p',o.period.label,'observation-period'));
    const prior=all.filter(p=>p.metricId===o.metricId&&p.period.type===o.period.type&&p.publicationDate<o.publicationDate&&(kind==='kpi'||p.period.label===o.period.label));
    const previous=prior.at(-1);const change=A.compare(previous,o);
    if(previous){
     if(kind==='guidance')cell.append(el('p',`Tidigare ${A.valueLabel(previous)} · ${previous.publicationDate}`,'observation-previous'));
     const text=change.comparable?(kind==='guidance'?direction[change.direction]+(change.width!=='unchanged'?' · '+(change.width==='widened'?'bredare intervall':'snävare intervall'):''):`${change.approximate?'≈ ':''}${change.changePercent>=0?'+':''}${new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1}).format(change.changePercent)} % mot föregående kvartal`):change.reason;
     cell.append(el('p',text,'observation-change'));
    }
    if(kind==='kpi'){const plot=chart([...prior,o],o.label);if(plot)cell.append(plot);}
    if(o.note)cell.append(el('p',o.metricId==='diluted_eps'?'Split 4:1 i juli 2026; tidigare guidning har annan aktiebasis.':o.note,'observation-context'));
    grid.append(cell);
   }
   section.append(grid);
   for(const o of latest.filter(o=>o.value.kind==='qualitative'))section.append(el('p',`${o.period.label} · ${o.note||o.value.text}`,'observation-context'));
  }
  if(data.pendingReview.length)section.append(el('p','Nyare resultatmeddelande väntar på granskning. Tidigare verifierade uppgifter visas.'));
  const details=el('details',undefined,'financial-sources');details.id='observationSources';details.append(el('summary','Källor & metod'));
  details.append(el('p','Urval: fyra resultatmeddelanden per bolag. Värden läses deterministiskt från granskade, låsta textpassager. Nya dokument kräver ny granskning. Guidning är bolagets utsikter, inte ett utfall. Samma etikett innebär inte jämförbarhet mellan bolag.'));
  details.append(el('p','Historiken behåller uppgifternas ursprungliga publiceringsdatum, målperiod, definition och aktiebasis. Jämförelser görs bara inom samma bolag och jämförbar basis. Olika målkvartal jämförs inte som guidningsrevideringar.'));
  const learn=el('a','Förstå guidningsrevideringar · Fråga NTM');learn.href='fragor-svar-guidance-revision.html';details.append(learn);
  if(feed.ticker==='NVDA')details.append(el('p','NVIDIA anger målkvartal, men inte exakta slutdatum i guidningspassagen. Inga slutdatum har beräknats. Ingen vald operativ KPI; intäktssegment hålls i separat datakategori.'));
  for(const reason of data.coverage.excluded||[])details.append(el('p',reason));
  const table=el('table');table.className='observation-history';const head=el('thead'),tr=el('tr');for(const label of ['Publicerat / period','Uppgift','Värde / status','Källa']){const th=el('th',label);th.scope='col';tr.append(th);}head.append(tr);table.append(head);const body=el('tbody');
  for(const o of [...history].reverse()){
   const row=el('tr');row.append(el('td',o.publicationDate+' · '+o.period.label),el('td',o.label+' · '+o.basis),el('td',A.valueLabel(o)+(o.status==='superseded'?' · ersatt':'')));
   const source=el('td'),a=el('a','SEC ↗');a.href=o.source.url;a.target='_blank';a.rel='noopener noreferrer';source.append(a);const passage=el('details');passage.append(el('summary','Text & definition'),el('p',o.source.quote),el('p',o.definition),el('p',`Basis: ${o.definitionVersion}`));for(const context of o.source.contexts)if(context!==o.definition)passage.append(el('p',context));source.append(passage);row.append(source);body.append(row);
  }
  table.append(body);const scroll=el('div',undefined,'observation-table-scroll');scroll.append(table);details.append(scroll);section.append(details);host.prepend(section);
 }
 window.NTMCompanyObservationsUI={render};
})();
