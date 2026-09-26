/* Bounded presentation over existing normalized facts and reviewed selectors.
   No persistence, financial calculations, evidence mutation or analytical state. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const link=(text,href)=>{const a=node('a',text);a.href=href;if(href.startsWith('https:')){a.target='_blank';a.rel='noopener noreferrer';}return a;};
 const number=(n,d=1)=>n.toLocaleString('sv-SE',{maximumFractionDigits:d});
 const money=n=>number(n/(Math.abs(n)>=1e9?1e9:1e6))+(Math.abs(n)>=1e9?' md USD':' mn USD');
 const labels={revenue:'Intäkter',operatingIncome:'Rörelseresultat',netIncome:'Nettoresultat',freeCashFlow:'Fritt kassaflöde',dilutedEps:'EPS (utspätt)'};
 let stock=null;
 function source(label,fact){const b=node('button','Källa','overview-source');b.type='button';b.setAttribute('aria-label','Visa källa för '+label);b.onclick=()=>window.openProvenanceDialog(label,fact);return b;}
 function metric(label,value,context,access,key){const a=node('article',undefined,'overview-metric');a.dataset.metric=key;a.append(node('h3',label),node('p',value,'overview-number'),node('p',context,'note'),access);return a;}
 function render(data){
  if(!$('workspaceOverview')||data.manual)return;
  stock=data;
  // Keep the complete existing summaries, methods and their anchor identities in depth.
  $('data-financials').append($('fundamentalProfile'));
  const help=$('keyMetricsGrid').parentElement.querySelector('[data-wave1-help]');if(help)$('financialMetrics').append(help);
  const grid=$('keyMetricsGrid');grid.replaceChildren();grid.classList.add('overview-metrics');
  const facts=data.ttm?.metrics||{},statements=window.NTMFundamentalProfile.build(data).statements;
  const bank=data.metadata?.profile==='financial_services';
  function fact(key){const m=facts[key];if(grid.querySelector(`[data-metric="${key}"]`)||!Number.isFinite(m?.value)||m.unsupported||m.qualityStatus!=='available'||m.restated||m.split||m.correction)return;
   const label=(key==='revenue'&&bank?'Nettointäkter':labels[key])+' TTM';
   grid.append(metric(label,key==='dilutedEps'?number(m.value,2)+' USD/aktie':money(m.value),`${data.ttm.asOfPeriod} · ${m.isDerived?'Beräknat':'Rapporterat'}${m.notes?' · '+m.notes:''}`,source(label,m),key));
  }
  function statement(dimension){const s=statements.find(s=>s.dimension===dimension);if(s?.status!=='available')return;
   const v=window.NTMFundamentalProfileUI.summary(s);
   grid.append(metric(dimension==='growth'?'Årlig intäktstillväxt':'Rörelsemarginal',v.value+' '+v.unit,v.label+' · Beräknat',link('Källa & beräkning','#fundamentalSources'),dimension));
  }
  fact('revenue');statement('growth');
  if(bank){fact('netIncome');fact('dilutedEps');}
  else {statement('profitability');fact('freeCashFlow');if(grid.children.length<5)fact('netIncome');}
  if(grid.children.length<4)fact('dilutedEps');
  $('ttmPeriodSubtitle').textContent='USD · period anges per mått';
  let context=$('overviewContext');
  if(!context){context=node('div',undefined,'overview-context');context.id='overviewContext';$('overviewRevenue').after(context);
   for(const [id,title] of [['overviewBusiness','Vad driver bolaget?'],['overviewOutlook','Utsikter & senaste rapport']]){const s=node('section');s.id=id;s.append(node('h2',title));context.append(s);}
   const events=node('section');events.id='overviewEvents';context.after(events);
  }
  // Company switches reset all previews before any asynchronous evidence arrives.
  evidence(data,null,null);
  trend(data);
 }
 function eligible(row,key,mode,data){
  const m=row.metrics?.[key];
  if(!m||!Number.isFinite(m.value)||m.unsupported||m.qualityStatus!=='available'||m.restated||m.split||m.correction)return false;
  if(key==='revenue'&&m.value<0)return false;
  if(data.metadata?.qualityStatus!=='validated'||data.company?.currency!=='USD')return false;
  if(data.metadata.profile==='financial_services'&&['freeCashFlow','operatingIncome'].includes(key))return false;
  if(['period','periodStart','periodEnd'].some(k=>m[k]!==row[k]))return false;
  if(m.unit!==(key==='dilutedEps'?'USD/shares':'USD')||m.currency!=='USD'||!m.definition?.startsWith(key+':')||m.methodVersion!==data.metadata.methodVersion)return false;
  if(key==='dilutedEps'&&(m.shareBasisStatus!=='verified'||m.shareBasis!=='weighted_average_diluted'))return false;
  if(mode==='annual')return !window.NTMFundamentalProfile.factReason(m,data.metadata.methodVersion);
  const days=(Date.parse(m.periodEnd)-Date.parse(m.periodStart))/86400000+1;
  return m.periodType==='quarter'&&/^\d{4}Q[1-4]$/.test(m.period)&&days>=77&&days<=105&&
   ['reported','derived'].includes(m.kind)&&m.isDerived===(m.kind==='derived')&&!!m.source&&
   (m.kind==='reported'?!!m.accession&&!!m.concept:!!m.derivationMethod&&m.sourceFilings?.length>0&&m.sourceFilings.every(s=>s.accession));
 }
 function rows(data,key,mode){
  const original=(data[mode==='annual'?'annual':'quarterly']||[]).slice(-6),input=[];
  const ordinal=period=>mode==='annual'?Number(period?.match(/^FY(\d{4})$/)?.[1]):/^\d{4}Q[1-4]$/.test(period)?Number(period.slice(0,4))*4+Number(period.at(-1))-1:NaN;
  for(const row of original){const previous=ordinal(input.at(-1)?.period),current=ordinal(row.period);
   if(Number.isFinite(previous)&&current>previous+1&&current-previous<=12)for(let i=previous+1;i<current;i++)input.push({period:mode==='annual'?'FY'+i:Math.floor(i/4)+'Q'+(i%4+1),metrics:{}});
   input.push(row);
  }
  const valid=input.filter(r=>eligible(r,key,mode,data));
  // Missing or incompatible observations remain explicit gaps, never zero values.
  const basis=valid.at(-1)?.metrics[key];
  const blocked=new Set();
  if(mode==='annual')for(let i=1;i<input.length;i++){const a=input[i-1],b=input[i];if(eligible(a,key,mode,data)&&eligible(b,key,mode,data)&&window.NTMFundamentalProfile.compare(a.metrics[key],b.metrics[key],data.metadata.methodVersion)){blocked.add(a);blocked.add(b);}}
  return input.slice(-6).map(r=>({period:r.period,fact:r.metrics?.[key],available:!blocked.has(r)&&eligible(r,key,mode,data)&&['definition','unit','currency','kind','source','derivationMethod'].every(k=>r.metrics[key][k]===basis?.[k])}));
 }
 function trend(data){
  const section=$('overviewRevenue');section.hidden=false;
  let controls=$('overviewTrendControls');
  if(!controls){controls=node('div',undefined,'overview-trend-controls');controls.id='overviewTrendControls';
   for(const [id,title] of [['overviewTrendMetric','Mått'],['overviewTrendPeriod','Period']]){const label=node('label',title);label.htmlFor=id;const select=node('select');select.id=id;label.append(select);controls.append(label);}
   section.querySelector('.section-title-row').after(controls);
  }
  const metricSelect=$('overviewTrendMetric'),periodSelect=$('overviewTrendPeriod');
  metricSelect.replaceChildren();periodSelect.replaceChildren();
  const names={...labels,revenue:data.metadata?.profile==='financial_services'?'Nettointäkter':'Intäkter'};
  for(const key of Object.keys(names))if(['annual','quarterly'].some(mode=>rows(data,key,mode).filter(r=>r.available).length>=2)){const option=node('option',names[key]);option.value=key;metricSelect.append(option);}
  metricSelect.disabled=!metricSelect.options.length;
  if(!metricSelect.options.length){const option=node('option',names.revenue+' · underlag saknas');option.value='revenue';metricSelect.append(option);}
  for(const [value,label] of [['annual','Helår'],['quarterly','Kvartal']]){const o=node('option',label);o.value=value;periodSelect.append(o);}
  const read=()=>{const p=new URLSearchParams(location.search);metricSelect.value=[...metricSelect.options].some(o=>o.value===p.get('trend'))?p.get('trend'):'revenue';if(!metricSelect.value)metricSelect.selectedIndex=0;periodSelect.value=p.get('period')==='quarterly'?'quarterly':'annual';draw();};
  const change=()=>{const u=new URL(location.href);u.searchParams.set('trend',metricSelect.value);u.searchParams.set('period',periodSelect.value);history.pushState(null,'',u);draw();};
  metricSelect.onchange=change;periodSelect.onchange=change;
  if(window.NTMResearchOverview.onPop)window.removeEventListener('popstate',window.NTMResearchOverview.onPop);
  window.NTMResearchOverview.onPop=read;window.addEventListener('popstate',read);
  function draw(){
   const key=metricSelect.value,mode=periodSelect.value,list=rows(data,key,mode);
   const plot=$('overviewRevenuePlot');plot.replaceChildren();plot.hidden=false;plot.setAttribute('role','group');plot.style.setProperty('--period-count',Math.max(1,list.length));
   const usable=list.filter(r=>r.available);const max=Math.max(...usable.map(r=>Math.abs(r.fact.value)),1),scale=key==='dilutedEps'?1:max>=1e9?1e9:1e6,unit=key==='dilutedEps'?'USD/aktie':scale===1e9?'md USD':'mn USD';
   $('revenueHeading').textContent=(names[key]||'Finansiell historik')+' över tid';
   section.querySelector('.section-title-row > .note').textContent=(mode==='annual'?'Helår':'Separata kvartal')+' · '+unit;
   plot.setAttribute('aria-label',`${names[key]} · ${unit}. Exakta värden och källor finns i tabellen.`);
   const table=node('table');table.append(node('caption',`${names[key]} · ${mode==='annual'?'helår':'kvartal'} · ursprungliga rapportvärden`));
   const head=node('thead'),h=node('tr');for(const text of ['Period','Värde','Källa']){const th=node('th',text);th.scope='col';h.append(th);}head.append(h);table.append(head);const body=node('tbody');table.append(body);
   for(const r of list){const col=node('div',undefined,'revenue-column'),slot=node('div',undefined,'revenue-bar-slot');slot.append(node('span',r.available?number(r.fact.value/scale,key==='dilutedEps'?2:1):'—','revenue-value'));
    if(r.available){const bar=source(`${names[key]} ${r.period}`,r.fact);bar.textContent='';bar.className='revenue-bar';bar.dataset.negative=String(r.fact.value<0);bar.style.setProperty('--bar-height',(Math.abs(r.fact.value)/max*180)+'px');bar.setAttribute('aria-label',`${r.period}: ${number(r.fact.value,2)} ${key==='dilutedEps'?'USD/aktie':'USD'}. Visa källa`);slot.append(bar);}
    col.append(slot,node('span',r.period));plot.append(col);
    const tr=node('tr'),th=node('th',r.period);th.scope='row';tr.append(th,node('td',Number.isFinite(r.fact?.value)?number(r.fact.value,8)+' '+r.fact.unit+(r.available?'':' · ej jämförbart'):'Saknas'));const td=node('td');if(r.fact)td.append(source(names[key]+' '+r.period,r.fact));else td.textContent='Underlag saknas';tr.append(td);body.append(tr);
   }
   $('overviewRevenueValues').replaceChildren(table);
   $('revenueSources').querySelector('p').textContent='Normaliserade SEC-uppgifter. Rapporterade och härledda värden behåller sin ursprungliga definition och period. Luckor och oförenliga observationer visas inte som noll.';
   let context=$('revenueContext');if(!context){context=node('p',undefined,'note');context.id='revenueContext';$('revenueSources').append(context);}context.textContent='Helår, separata kvartal och TTM är olika perioder. Diagrammet visar en periodtyp i taget.';
   let negative=$('overviewNegativeNote');if(!negative){negative=node('p',undefined,'note');negative.id='overviewNegativeNote';plot.after(negative);}negative.hidden=!usable.some(r=>r.fact.value<0);negative.textContent='Minus och streckad stapel markerar negativa värden. Stapelhöjden visar beloppets storlek.';
   let notice=$('revenueUnavailable');if(!notice){notice=node('p',undefined,'note');notice.id='revenueUnavailable';plot.after(notice);}
   notice.textContent=usable.length<2?'Jämförbar historik saknas för valt mått och period. Se rapporterade värden i tabellen.':list.some(r=>!r.available)?'Luckor eller annan definition i historiken. Endast jämförbara värden visas.':'';notice.hidden=!notice.textContent;plot.hidden=usable.length<2;
   const detail=$('revenueSources').querySelector('a');detail.textContent='Finansiellt · samtliga rapporter och källor →';
  }
  read();
 }
 function observation(o){const a=node('article',undefined,'overview-observation');a.append(node('h3',o.label),node('p',window.NTMCompanyObservations.valueLabel(o),'overview-number'),node('p',`${o.period.label} · ${o.basis} · ${o.publicationDate}`,'note'));if(o.note)a.append(node('p',o.note,'note'));a.append(link('Källa & definition',o.kind==='kpi'?'#kpiSources':'#observationSources'));return a;}
 function evidence(data,feed,status){
  if(!stock||data.symbol!==stock.symbol||!$('overviewBusiness'))return;
  const business=$('overviewBusiness'),outlook=$('overviewOutlook'),events=$('overviewEvents');
  business.replaceChildren(node('h2','Vad driver bolaget?'));outlook.replaceChildren(node('h2','Utsikter & senaste rapport'));events.replaceChildren();events.hidden=true;
  if(!feed){const text=status?'Granskat underlag är inte tillgängligt just nu.':window.NTMIssuerRegistry.has(data.symbol,'evidence')?'Hämtar granskat underlag…':'Granskat verksamhets- och guidningsunderlag saknas.';business.append(node('p',text,'note'),link('Verksamhet →','#data-business'));outlook.append(node('p',text,'note'));
   const filing=data.filings?.find(f=>['10-Q','10-K'].includes(f.form));
   if(filing&&/^https:\/\/www.sec.gov\/Archives\//.test(filing.primaryDocUrl||''))outlook.append(node('h3','Senaste rapport'),node('p',`${filing.form} · periodslut ${filing.reportPeriod} · inlämnad ${filing.filingDate}`),link('Öppna officiell rapport ↗',filing.primaryDocUrl));
   outlook.append(link('Rapporter & källor →','#data-outlook'));return;}
  if(status?.status!=='verified')for(const section of [business,outlook])section.append(node('p','Uppdateringen är otillgänglig; tidigare verifierat underlag visas.','overview-warning'));
  const reviewed=feed.reviewedEvidence,A=window.NTMCompanyObservations,S=window.NTMCompanySegments;
  if(reviewed){
   try{
    A.validate(reviewed,feed.ticker,feed.cik);
    if(reviewed.pendingReview.length)for(const section of [business,outlook])section.append(node('p','Nyare rapportering väntar på granskning. Tidigare granskade uppgifter visas.','overview-warning'));
    const segmentRows=S.rows(reviewed),group=segmentRows.find(o=>o.group.type==='market_platform'&&!o.group.parent)?.group||segmentRows[0]?.group;
    const mix=group?S.view(reviewed,group.id):null;
    if(mix?.available){business.append(node('p',`${mix.group.label} · ${mix.period.label} · USD`,'note'));const values=[...mix.values].sort((a,b)=>b.value.point-a.value.point);const list=node('div',undefined,'overview-mix');
     for(const o of values.slice(0,3)){const row=node('div');row.append(node('span',o.label),node('strong',money(o.value.point)),node('span',number(o.share)+' %'));const bar=node('span',undefined,'overview-mix-bar');bar.style.setProperty('--share',o.share+'%');row.append(bar);list.append(row);}business.append(list);
     if(values.length>3)business.append(node('p','De tre största delarna visas. Fullständig uppdelning i Verksamhet.','note'));
     if(mix.reconciliation.length)business.append(node('p',`Segmentintäkter före Corporate/Other (${money(mix.bridge)}). Koncernens nettointäkter: ${money(mix.total.value.point)}.`,'note'));
     if(mix.group.type==='revenue_category')business.append(node('p','Intäktstyper inom ett redovisat segment.','note'));
     if(mix.values.some(o=>o.yoy.recast))business.append(node('p','Omräknade jämförelsetal finns i underlaget.','note'));
     business.append(link('Källor & definitioner','#segmentSources'));
    }
    const history=A.asOf(reviewed,new Date().toISOString());
    const kpis=history.filter(o=>o.kind==='kpi'&&o.status==='latest_disclosed'&&o.value.kind==='point');
    const latestKpiDate=kpis.at(-1)?.publicationDate;
    const kpi=kpis.filter(o=>o.publicationDate===latestKpiDate).sort((a,b)=>(a.metricId==='arr'?-1:0)-(b.metricId==='arr'?-1:0))[0];
    if(kpi){business.append(observation(kpi));if(/arr/i.test(kpi.metricId))business.append(node('p','ARR är ett operativt årstaktsmått, inte redovisad intäkt.','note'));}
    if(!mix?.available&&!kpi)business.append(node('p','Jämförbar granskad verksamhetsbild saknas.','note'));
    const guidance=history.filter(o=>o.kind==='guidance'),date=guidance.at(-1)?.publicationDate;
    const current=guidance.filter(o=>o.publicationDate===date&&o.status!=='superseded');
    const rank=o=>o.value.kind==='qualitative'?10:/revenue/.test(o.metricId)?0:/gross_margin|adjusted_ebitda/.test(o.metricId)?1:2;
    const ranked=current.filter(o=>o.value.kind!=='qualitative').sort((a,b)=>rank(a)-rank(b));
    for(const o of ranked.slice(0,2))outlook.append(observation(o));
    for(const o of current.filter(o=>o.value.kind==='qualitative').slice(0,1))outlook.append(node('p',`${o.period.label} · ${o.note||o.value.text}`,'note'));
    if(!current.length)outlook.append(node('p','Granskad guidning saknas.','note'));
    else outlook.append(node('p','Bolagets publicerade utsikter; inte ett rapporterat utfall.','note'));
   }catch{business.append(node('p','Verksamhetsunderlaget behöver granskas.','overview-warning'));outlook.append(node('p','Guidningsunderlaget behöver granskas.','overview-warning'));}
  }else{business.append(node('p','Granskad verksamhetsbild saknas.','note'));outlook.append(node('p','Granskad guidning saknas.','note'));}
  business.append(link('Verksamhet · hela bilden →','#data-business'));
  const report=feed.events.find(e=>e.accessionNumber===feed.latestReportAccession);
  if(report){const r=node('div',undefined,'overview-report');r.append(node('h3','Senaste rapport'),node('p',`${window.NTMCompanyEvidence.reportLabel(report,data)} · ${report.form} · inlämnad ${report.filingDate}`),link('Öppna officiell rapport ↗',report.primaryDocUrl));outlook.append(r);}
  outlook.append(link('Rapport & utsikter · fördjupa →','#data-outlook'));
  const cutoff=new Date(Date.now()-365*86400000).toISOString().slice(0,10);
  const material=window.NTMCompanyMaterialEvents,latest=material.latest(feed.materialEvents).filter(g=>g.event.publicationDate>=cutoff).slice(0,2);
  if(latest.length){events.hidden=false;events.append(node('h2','Senast granskade händelser'));
   if(status?.status!=='verified')events.append(node('p','Uppdateringen är otillgänglig; tidigare verifierat underlag visas.','overview-warning'));
   if(feed.materialEvents?.pendingReview?.length)events.append(node('p','Nyare händelser väntar på granskning.','overview-warning'));
   for(const {event:o} of latest){const row=node('article');row.append(node('p',`Publicerat ${o.publicationDate} · ${material.categories[o.category]}`,'note'),node('p',material.describe(o)));events.append(row);}events.append(link('Alla händelser & källor →','#companyMaterialEvents'));
  }
 }
 function since(model,error){
  const host=$('researchSincePreview');if(!host)return;host.replaceChildren();host.hidden=model.state==='no_revision'&&!error;if(host.hidden)return;
  host.dataset.state=error?'error':model.state==='unavailable'||model.unavailable?'unavailable':model.groups?.length?'changed':'quiet';
  const date=model.baseline?.slice(0,10)||'';
  if(error)host.append(node('p','Sparad analys kunde inte läsas säkert. Öppna versionshistoriken.'));
  else if(model.state==='unavailable')host.append(node('p','Jämförelseunderlaget är inte tillgängligt just nu.'));
  else{
   if(model.unavailable)host.append(node('p','Uppdateringen är otillgänglig; senast verifierat underlag visas.'));
   if(!model.groups?.length)host.append(node('p',model.unavailable?`Jämförelsen avser senast verifierat underlag sedan ${date}.`:`Inga nya granskade förändringar sedan ${date}.`));
   else {host.append(node('strong','Sedan din analys · '+date));const list=node('ul');for(const g of model.groups.slice(0,2)){const r=g.rows[0];list.append(node('li',`${g.title}: ${r.label}${r.period?' · '+r.period:''}${r.date?' · '+r.date:''}`));}host.append(list);}
  }
  host.append(link(error?'Öppna versionshistoriken':model.groups?.length?'Granska mot min tes →':'Öppna granskning →',error?'#thesisHistorySection':'#researchSince'));
 }
 window.NTMResearchOverview={render,evidence,since,rows};
})();
