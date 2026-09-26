/* Compact filing timeline; original ownership evidence stays behind disclosures. */
(()=>{
 'use strict';const I=window.NTMCompanyInsiders;
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const num=(n,d=4)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:d}).format(n);
 const name=o=>o.name===o.name.toUpperCase()?o.name.toLowerCase().replace(/\b\p{L}/gu,c=>c.toUpperCase()):o.name;
 const role=o=>/chief executive|\bCEO\b/i.test(o.officerTitle)?'VD':/chief financial|\bCFO\b/i.test(o.officerTitle)?'Finanschef':o.isOfficer?'Ledande befattningshavare':o.isDirector?'Styrelseledamot':o.isTenPercentOwner?'Rapporterad storägare':'Rapporterande ägare';
 function render(feed,host,status){
  const data=feed.insiderEvidence;if(!data)return;I.validate(data,feed.ticker,feed.cik);
  const section=make('section');section.id='companyInsiders';section.setAttribute('aria-label','Insidertransaktioner');section.append(make('h2','Insidertransaktioner'));
  section.append(make('p','Rapporterad aktivitet från '+data.coverage.startDate+'. Äldre exempel visas separat.','insider-context'));
  if(status?.status!=='verified')section.append(make('p','Uppdateringen är otillgänglig; tidigare verifierade uppgifter visas.','insider-context'));
  const filters=make('div',undefined,'insider-filters');
  function select(id,title,options){const label=make('label',title),s=make('select');s.id=id;label.htmlFor=id;for(const [value,text] of options){const o=make('option',text);o.value=value;s.append(o);}label.append(s);filters.append(label);return s;}
  const category=select('insiderCategory','Typ',[['all','Alla transaktionstyper'],...Object.entries(I.categories)]);
  const people=[...new Map(data.filings.flatMap(f=>f.owners).map(o=>[o.cik,o])).values()];
  const owner=select('insiderOwner','Person',[['all','Alla rapporterande ägare'],...people.map(o=>[o.cik,name(o)])]);
  const period=select('insiderPeriod','Urval',[['recent','Senaste rapporteringen'],['history','Äldre exempel']]);section.append(filters);
  const chartHost=make('div'),list=make('div',undefined,'insider-timeline'),count=make('p',undefined,'insider-context');count.setAttribute('role','status');count.setAttribute('aria-live','polite');section.append(count,chartHost,list);
  const more=make('button','Visa fler rapporter','insider-more');more.type='button';section.append(more);let limit=4;
  const method=make('details',undefined,'financial-sources');method.id='insiderSources';method.append(make('summary','Källor & metod'),make('p','Diagrammet räknar rapporter med respektive transaktionstyp, inte aktier eller signalstyrka. En rapport kan ha flera typer. Köp/försäljningar omfattar även privata affärer när marknadsplats inte uttryckligen framgår.'),make('p','Tilldelning, lösen/konvertering och skatteinnehållning är separata kategorier. Derivatrader adderas inte till motsvarande aktier. Ägarandel, avkastning och insidersentiment beräknas inte.'),make('p','Rader grupperas bara inom samma rapport, värdepapper, transaktionsdag, transaktionskod och ägarform. Rapporterade prisintervall är inte ett nytt viktat snitt. Belopp i detalj är antal × rapporterat pris; viktade priser ger ungefärliga belopp.'),make('p','Ändringar bevaras tillsammans med originalet. Granskade rättelser av enbart fotnoter räknas inte som nya affärer. Övriga ändringar och möjliga original undantas från aktivitetssummeringen tills sambandet granskats.'),make('p','SEC-källan, transaktionskoden, ägaruppgifterna och fotnoterna finns i varje rapports detalj. Innehav efter en transaktion är den rapporterade posten, inte alltid personens totala innehav. Äldre exempel är inte heltäckande historik.'));section.append(method);host.append(section);
  const opts=()=>({category:category.value,owner:owner.value,period:period.value});
  function draw(){
   list.replaceChildren();chartHost.replaceChildren();const all=I.select(data,opts()),stats=I.summary(all);count.textContent=`${stats.filings} ${stats.filings===1?'rapport':'rapporter'} · ${stats.reportingOwners} rapporterande ägare`+(stats.corrections?` · ${stats.corrections} ändringar`:'');
   if(stats.pending)chartHost.append(make('p','Ändringar behöver granskas. Berörda rapporter räknas inte som ny aktivitet.','insider-context'));
   const entries=Object.entries(stats.categories).filter(([,n])=>n>0);if(entries.length){chartHost.append(make('p','Rapporter per transaktionstyp · kategorier kan överlappa','insider-context'));const chart=make('div',undefined,'insider-breakdown');chart.setAttribute('role','img');chart.setAttribute('aria-label',entries.map(([k,n])=>I.categories[k]+': '+n+' rapporter').join('; '));for(const [k,n] of entries){const row=make('div',undefined,'insider-bar-row'),track=make('span',undefined,'insider-bar-track'),bar=make('i');bar.style.width=(n/Math.max(...entries.map(([,v])=>v))*100)+'%';track.append(bar);row.append(make('span',I.categories[k]),track,make('strong',String(n)));chart.append(row);}chartHost.append(chart);}
   for(const f of all.slice(0,limit))list.append(filing(f,category.value));
   if(!all.length)list.append(make('p','Inga rapporter i det här urvalet.','insider-context'));
   more.hidden=limit>=all.length;
  }
  for(const s of [category,owner,period])s.addEventListener('change',()=>{limit=4;draw();});more.addEventListener('click',()=>{limit+=4;draw();});draw();
 }
 function filing(f,category){
  const article=make('article',undefined,'insider-filing');article.append(make('h3',f.owners.map(name).join(' · ')),make('p',f.owners.map(role).join(' · ')+' · rapporterat '+f.filingDate,'insider-context'));
  if(f.form==='4/A')article.append(make('p','Ändring av tidigare rapport · räknas inte som ny affär','insider-correction'));
  else if(f.reviewPending)article.append(make('p','Ändring finns · aktivitetssummering inväntar granskning','insider-correction'));
  else if(f.amendments.length)article.append(make('p','Granskad rättelse av fotnot finns','insider-context'));
  const groups=I.groups(f,category);
  for(const g of groups.slice(0,2)){
   const r=g.first,row=make('div',undefined,'insider-action');row.append(make('strong',I.label(r)),make('span',(g.shares===null?'Antal ej angivet':num(g.shares)+' '+(r.table==='derivative'?'värdepapper':'aktier'))+' · '+r.fields.date.value));
   if(['purchase','sale'].includes(r.classification.category)&&r.table==='nonDerivative'&&g.prices.length===g.rows.length&&g.prices.every(p=>p>0)&&!r.equitySwap){const min=Math.min(...g.prices),max=Math.max(...g.prices);row.append(make('small',(g.weighted?'Rapporterat viktat pris: ':'Rapporterat pris: ')+num(min)+(min===max?'':'–'+num(max))+(r.classification.currency==='USD'?' USD/aktie':' · valuta kräver granskning')));}
   row.append(make('small',(r.fields.ownership.value==='I'?'Indirekt innehav':'Direkt innehav')+(g.rows.length>1?' · '+g.rows.length+' transaktionsrader':'')));article.append(row);
  }
  if(groups.length>2)article.append(make('p','Ytterligare '+(groups.length-2)+' grupper i rapportdetaljen.','insider-context'));
  if(!f.transactions.length)article.append(make('p','Ägaruppgift utan transaktionsrader.','insider-context'));
  const detail=make('details',undefined,'insider-detail');detail.append(make('summary','Transaktioner & underlag · '+f.transactions.length+(f.transactions.length===1?' rad':' rader')));let loaded=false;detail.addEventListener('toggle',()=>{if(detail.open&&!loaded){loaded=true;details(detail,f);}});article.append(detail);return article;
 }
 function details(host,f){
  const a=make('a','Officiell SEC-rapport ↗');a.href=f.renderedUrl;a.target='_blank';a.rel='noopener noreferrer';host.append(a,make('p',f.form+' · '+f.accessionNumber+' · publicerat '+f.filingDate,'insider-context'));
  if(f.originalFiledDate)host.append(make('p','Originalet inlämnat: '+f.originalFiledDate,'insider-context'));
  if(f.remarks)host.append(make('p',f.remarks,'insider-context'));
  if(f.planCheckbox)host.append(make('p','Rapporten markerar en 10b5-1-plan. Det innebär inte att varje transaktionsrad omfattas.','insider-context'));
  for(const o of f.owners)host.append(make('p',name(o)+' · '+(o.officerTitle||role(o)),'insider-context'));
  for(const r of f.transactions){const block=make('div',undefined,'insider-source-row'),v=r.fields;block.append(make('h4',I.label(r)+' · '+v.date.value),make('p',v.security.value+' · '+(r.table==='derivative'?'derivat':'icke-derivat')+' · SEC-kod '+r.code+' · '+(v.direction.value==='A'?'förvärv':'avyttring')),
    make('p','Antal: '+(v.shares.value===null?'ej angivet':v.shares.value)+' · pris: '+(v.price.value===null?'ej angivet':v.price.value+' '+r.classification.currency)),make('p','Efter transaktionen: '+(v.ownedAfter.value===null?'ej angivet':v.ownedAfter.value)+' · '+(v.ownership.value==='I'?'indirekt':'direkt')+(v.ownershipNature.value?' · '+v.ownershipNature.value:'')));
   if(r.table==='derivative')block.append(make('p','Underliggande: '+(v.underlyingSecurity.value||'ej angivet')+' · '+(v.underlyingShares.value||'antal ej angivet')+' · lösenpris '+(v.exercisePrice.value??'ej angivet')+' · slutdag '+(v.expirationDate.value||'se fotnot')));
   const amount=I.transactionValue(r);if(amount)block.append(make('p',(amount.approximate?'Ungefärligt':'Beräknat')+' belopp: '+num(amount.amount,2)+' USD. '+amount.method));
   if(r.equitySwap)block.append(make('p','Aktieswap eller liknande instrument markerat. Ingen enkel kontantlikvid beräknas.'));
   for(const id of r.footnoteIds)block.append(make('p',id+': '+f.footnotes[id],'insider-footnote'));host.append(block);
  }
  if(f.holdings.length){const holdings=make('details');holdings.append(make('summary','Övriga rapporterade innehav · '+f.holdings.length));for(const h of f.holdings){holdings.append(make('p',h.fields.security.value+' · '+(h.fields.ownedAfter.value??'ej angivet')+' · '+(h.fields.ownership.value==='I'?'indirekt':'direkt')+(h.fields.ownershipNature.value?' · '+h.fields.ownershipNature.value:'')));for(const id of h.footnoteIds)holdings.append(make('p',id+': '+f.footnotes[id],'insider-footnote'));}host.append(holdings);}
  const used=new Set([...f.transactions,...f.holdings].flatMap(r=>r.footnoteIds));for(const [id,text] of Object.entries(f.footnotes))if(!used.has(id))host.append(make('p',id+': '+text,'insider-footnote'));
 }
 window.NTMCompanyInsidersUI={render};
})();
