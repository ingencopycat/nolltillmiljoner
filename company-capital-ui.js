/* Data first, primary-source definitions and calculation inputs on demand. */
(()=>{
 'use strict';
 const C=window.NTMCompanyCapital;
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const number=(n,d=2)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:d}).format(n);
 function value(n,unit){const abs=Math.abs(n);return unit==='percent'?number(n)+' %':unit==='count'?number(n/1e6,3)+' mn':number(n/(abs>=1e9?1e9:1e6),abs>=1e9?3:1)+(abs>=1e9?' md USD':' mn USD');}
 const period=o=>o.period.type==='instant'?o.period.end:o.period.start+'–'+o.period.end;
 const change=v=>v.yoy.comparable&&v.yoy.changePercent!==null?(v.yoy.changePercent>=0?'+':'')+number(v.yoy.changePercent,1)+' % YoY':v.yoy.reason||'Ej jämförbart';
 function render(feed,host,status){
  const data=feed.reviewedEvidence,records=C.rows(data);if(!records.length)return;
  const section=make('section');section.id='companyCapital';section.setAttribute('aria-label','Aktiestruktur och finansiell position');
  const calculations=C.derived(data),bank=records.some(o=>o.capital.sectorBasis==='bank');
  section.append(make('h2','Aktiestruktur'));
  if(status?.status!=='verified')section.append(make('p','Uppdateringen är otillgänglig; tidigare verifierade uppgifter visas.','capital-context'));
  if(data.pendingReview.length)section.append(make('p','Nyare rapportering väntar på granskning.','capital-context'));
  const primary=make('div',undefined,'capital-metrics');
  for(const id of ['shares_outstanding','sbc_expense','repurchase_cash']){
   const v=C.view(data,id);if(!v.available)continue;const o=v.latest,item=make('div',undefined,'capital-metric');
   item.append(make('h3',o.label),make('div',value(o.value.point,o.unit),'capital-value'),make('p',period(o),'capital-context'));
   if(id==='shares_outstanding')item.append(make('p',change(v),'capital-change'));
   if(id==='sbc_expense'){const d=calculations.find(d=>d.metricId==='sbc_revenue');if(d)item.append(make('p',number(d.value,1)+' % av '+(bank?'nettointäkterna':'intäkterna'),'capital-change'));item.append(make('p','Kostnad, inte utspädning.','capital-context'));}
   if(id==='repurchase_cash')item.append(make('p','Betalt sedan räkenskapsårets början.','capital-context'));
   primary.append(item);
  }
  section.append(primary);
  const shares=C.view(data,'shares_outstanding');
  if(shares.available){chart(section,shares,'Aktier utestående · miljoner');if(shares.yoy.recast)section.append(make('p','Jämförelsen använder bolagets splitjusterade historik.','capital-context'));if(shares.historyBreak)section.append(make('p','Ej jämförbart över äldre luckor eller ändrad aktiebas.','capital-context'));}
  const mandate=C.latest(data,'repurchase_remaining');if(mandate)section.append(make('p','Återstående återköpsmandat: ≈ '+value(mandate.value.point,mandate.unit)+'. Mandat är inte genomförda återköp.','capital-context'));
  const extras=make('details',undefined,'capital-more');extras.append(make('summary','Vägt aktieantal & emissioner'));
  for(const id of ['weighted_basic','weighted_diluted',...new Set(records.filter(o=>o.metricId.startsWith('issuance_')).map(o=>o.metricId))]){const o=C.latest(data,id);if(o){const row=make('div',undefined,'capital-detail-row');row.append(make('span',o.label),make('strong',value(o.value.point,o.unit)),make('small',period(o)));extras.append(row);}}
  extras.append(make('p','Vägda EPS-aktier och bruttoemissioner har andra definitioner än aktier utestående vid periodslut.','capital-context'));section.append(extras);
  section.append(make('h2','Likviditet & skuld'));
  if(bank)section.append(make('p','Bankverksamhet: inlåning, upplåning och bankens kapitalrelation visas separat.','capital-context'));
  const liquid=make('div',undefined,'capital-metrics');
  for(const id of bank?['cash','borrowings','deposits','cet1_bank']:['cash',C.latest(data,'debt_total')?'debt_total':'debt_noncurrent']){const o=C.latest(data,id);if(!o)continue;const item=make('div',undefined,'capital-metric');item.append(make('h3',o.label),make('div',value(o.value.point,o.unit),'capital-value'),make('p',period(o),'capital-context'));liquid.append(item);}
  const net=calculations.find(d=>d.metricId==='cash_less_debt');if(net){const item=make('div',undefined,'capital-metric');item.append(make('h3',net.label),make('div',value(net.value,net.unit),'capital-value'),make('p','Värdepapper och leasing ingår inte.','capital-context'));liquid.append(item);}section.append(liquid);
  const options=['cash',bank?'borrowings':C.latest(data,'debt_total')?'debt_total':'debt_noncurrent',...(bank?['deposits']:[])].filter(id=>C.view(data,id).trend?.length);
  if(options.length){const label=make('label','Historik','capital-selector');label.htmlFor='capitalLiquidityHistory';const select=make('select');select.id='capitalLiquidityHistory';for(const id of options){const opt=make('option',C.latest(data,id).label);opt.value=id;select.append(opt);}label.append(select);const canvas=make('div');const draw=()=>{canvas.replaceChildren();const v=C.view(data,select.value);chart(canvas,v,v.latest.label+' · USD');};select.addEventListener('change',draw);section.append(label,canvas);draw();}
  const funding=C.latest(data,'funding_context');
  const composition=make('details',undefined,'capital-more');composition.append(make('summary','Värdepapper, finansiering & förfall'));
  for(const id of ['debt_current','debt_noncurrent','marketable_debt','marketable_equity','investment_securities','total_capital_bank','facility_capacity']){const o=C.latest(data,id);if(o){const row=make('div',undefined,'capital-detail-row');row.append(make('span',o.label),make('strong',value(o.value.point,o.unit)),make('small',o.definition));composition.append(row);}}
  if(funding)composition.append(make('p',funding.definition,'capital-context'));section.append(composition);
  const sources=make('details',undefined,'financial-sources');sources.id='capitalSources';sources.append(make('summary','Källor & metod'));
  sources.append(make('p','Senast publicerad granskad uppgift används per period. Ursprungliga uppgifter och bolagets omräkningar bevaras. Ingen automatisk omräkning av äldre aktier eller sammanfogning av ändrade definitioner.','capital-context'));
  if(shares.available&&shares.yoy.comparable){const prior=shares.history.find(o=>o.period.end!==shares.latest.period.end&&C.compare(o,shares.latest,'year').comparable);sources.append(make('p','Aktier YoY = (senaste / jämförelseår − 1) × 100: '+value(shares.latest.value.point,'count')+' / '+value(prior.value.point,'count')+'. Samma aktiebas.','capital-context'));}
  for(const d of calculations){const para=make('p',d.label+': '+d.method+' Underlag: '+d.inputs.map(id=>{const o=records.find(o=>o.id===id);return o.label+' '+number(o.value.point,0)+' '+(o.unit==='USD'?'USD':'')+' ('+period(o)+', publicerat '+o.publicationDate+')';}).join('; '),'capital-context');sources.append(para);}
  const links=make('div',undefined,'capital-source-links');for(const url of [...new Set(records.map(o=>o.source.url))]){const o=records.find(o=>o.source.url===url),a=make('a','SEC 10-Q · '+o.publicationDate+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}sources.append(links);
  if(funding){const proof=make('details');proof.append(make('summary','Finansiering · originaltext'),make('p',funding.source.quote));for(const context of funding.source.contexts)proof.append(make('p',context));sources.append(proof);}
  const label=make('label','Definition & historik','capital-selector');label.htmlFor='capitalMetric';const select=make('select');select.id='capitalMetric';
  for(const id of [...new Set(records.filter(o=>o.value.kind==='point').map(o=>o.metricId))]){const opt=make('option',records.find(o=>o.metricId===id).label);opt.value=id;select.append(opt);}select.value='shares_outstanding';label.append(select);sources.append(label);const detail=make('div');sources.append(detail);
  function history(){detail.replaceChildren();const items=records.filter(o=>o.metricId===select.value).sort((a,b)=>b.period.end.localeCompare(a.period.end)||b.publicationDate.localeCompare(a.publicationDate)),last=items[0];detail.append(make('p',last.issuerLabel+' — '+last.definition));const wrap=make('div',undefined,'capital-table-scroll'),table=make('table'),head=make('thead'),row=make('tr');for(const text of ['Period / publicerat','Värde','Definition & källpassage']){const th=make('th',text);th.scope='col';row.append(th);}head.append(row);table.append(head);const body=make('tbody');
   for(const o of items){const row=make('tr');row.append(make('td',period(o)+' · publicerat '+o.publicationDate),make('td',number(o.value.point,3)+' '+(o.unit==='count'?'aktier':o.unit==='percent'?'%':o.unit)));const td=make('td'),more=make('details');more.append(make('summary',o.capital.recast==='as_reported'?'Rapporterat värde':'Omräknat av bolaget'),make('p',o.definition),make('p',o.source.quote));for(const text of o.source.contexts)more.append(make('p',text));if(o.source.xbrl)more.append(make('p','XBRL: '+o.source.xbrl.concept+' · '+o.source.xbrl.unit+' · '+(o.capital.shareBasis.startsWith('split-')?'splitjusterad aktiebas':o.capital.shareBasis==='pre-2026-split'?'aktiebas före split 2026':'rapporterad basis')));td.append(more);row.append(td);body.append(row);}table.append(body);wrap.append(table);detail.append(wrap);}
  select.addEventListener('change',history);history();section.append(sources);host.append(section);
 }
 function chart(host,v,title){
  if(!v.trend?.length)return;const values=v.trend,max=Math.max(...values.map(o=>o.value.point));if(max<=0)return;
  title=title.replace(/ · USD$/,max>=1e9?' · miljarder USD':' · miljoner USD');
  host.append(make('p',title,'capital-chart-title'));const chart=make('div',undefined,'capital-chart');chart.setAttribute('role','img');chart.setAttribute('aria-label',title+': '+values.map(o=>o.period.end+' '+value(o.value.point,o.unit)).join('; '));
  for(const o of values){const col=make('div'),bar=make('span');bar.style.height=(o.value.point/max*88)+'px';const scale=o.unit==='count'?1e6:max>=1e9?1e9:1e6;col.append(make('small',number(o.value.point/scale,2)),bar,make('small',o.period.end.slice(0,7)));chart.append(col);}host.append(chart);if(values[0].unit==='USD')host.append(make('p',max>=1e9?'Belopp i miljarder USD. Staplar från noll.':'Belopp i miljoner USD. Staplar från noll.','capital-context'));
 }
 window.NTMCompanyCapitalUI={render};
})();
