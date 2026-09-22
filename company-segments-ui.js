/* Segment/business mix presentation; exact history and evidence remain on demand. */
(()=>{
 'use strict';
 const S=window.NTMCompanySegments;
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const number=(n,d=1)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:d}).format(n);
 const money=n=>number(n/(Math.abs(n)>=1e9?1e9:1e6),Math.abs(n)>=1e9?3:1)+(Math.abs(n)>=1e9?' md USD':' mn USD');
 const types={reportable_segment:'Redovisade segment',market_platform:'Marknadsplattformar',revenue_category:'Intäktstyper',geography:'Geografisk intäkt'};
 const palette=['#7fa6c2','#436984','#b0c8d8','#627d94','#d0dde7'];
 function render(feed,host,status){
  const data=feed.reviewedEvidence;if(!data||!S.rows(data).length)return;
  const section=make('section');section.id='companySegments';section.setAttribute('aria-label','Bolagets affärsmix');
  section.append(make('h2','Vad driver intäkterna?'));
  const ids=[...new Set(S.rows(data).map(o=>o.group.id))];
  const initial=ids.find(id=>{const g=S.rows(data).filter(o=>o.group.id===id).at(-1).group;return g.type==='market_platform'&&!g.parent;})||ids[0];
  const content=make('div');content.id='companySegmentContent';
  let selected=initial;
  if(ids.length>1){const label=make('label','Visa uppdelning','segment-selector');label.htmlFor='segmentGroup';const select=make('select');select.id='segmentGroup';for(const id of ids){const opt=make('option',S.rows(data).filter(o=>o.group.id===id).at(-1).group.label);opt.value=id;select.append(opt);}select.value=initial;select.addEventListener('change',()=>{selected=select.value;draw();});label.append(select);section.append(label);}
  if(status?.status!=='verified')section.append(make('p','Uppdateringen är otillgänglig; tidigare verifierade uppgifter visas.','segment-context'));
  if(data.pendingReview.length)section.append(make('p','Nyare rapportering väntar på granskning; tidigare granskad affärsmix visas.','segment-context'));
  section.append(content);host.prepend(section);
  function draw(){
   content.replaceChildren();let view;try{view=S.view(data,selected);}catch{view={available:false,reason:'Underlaget behöver granskas'};}
   if(!view.available){content.append(make('p',view.reason||'Uppdelning saknas.'));return;}
   const values=[...view.values].sort((a,b)=>b.value.point-a.value.point),color=id=>palette[view.group.members.filter(id=>view.categories.some(o=>o.category.id===id)).indexOf(id)%palette.length];
   const top=make('div',undefined,'segment-top');const total=make('div');total.append(make('p',`${view.group.label} · ${view.period.label}`,'segment-context'),make('div',money(view.denominator),'segment-total'),make('p',view.reconciliation.length?'Segmentintäkter före Corporate/Other':view.group.parent?'Data Center-intäkter':'Redovisad omsättning','segment-context'));top.append(total);
   const mix=make('div',undefined,'segment-mix');mix.setAttribute('role','img');mix.setAttribute('aria-label',values.map(o=>`${o.label} ${number(o.share)} procent`).join('; '));
   for(const o of values){const block=make('span');block.style.width=o.share+'%';block.style.background=color(o.category.id);mix.append(block);}top.append(mix);content.append(top);
   const rows=make('div',undefined,'segment-rows');const header=make('div',undefined,'segment-row segment-column-head');for(const label of ['Verksamhet','Intäkter','Andel','YoY'])header.append(make('span',label));rows.append(header);
   for(const o of values){const row=make('div',undefined,'segment-row');const label=make('span',o.label,'segment-name');const swatch=make('i');swatch.style.background=color(o.category.id);swatch.setAttribute('aria-hidden','true');label.prepend(swatch);row.append(label,make('strong',money(o.value.point)),make('span',number(o.share)+' %'),make('span',o.yoy.comparable?(o.yoy.changePercent>=0?'+':'')+number(o.yoy.changePercent)+' %':'Ej jämförbart'));rows.append(row);}content.append(rows);
   if(view.reconciliation.length)content.append(make('p',`Corporate/Other ${money(view.bridge)} → koncernens nettointäkter ${money(view.total.value.point)}.`,'segment-context'));
   if(view.trend.length){
    const chart=make('div',undefined,'segment-trend');chart.setAttribute('role','img');chart.setAttribute('aria-label',view.trend.map(p=>p.period.label+': '+p.categories.map(o=>o.label+' '+money(o.value.point)).join(', ')).join('; '));
    const max=Math.max(...view.trend.map(p=>p.denominator)),scale=max>=1e9?1e9:1e6;content.append(make('p','Intäkter per kvartal · '+(scale===1e9?'md USD':'mn USD'),'segment-context segment-chart-label'));
    for(const p of view.trend){const col=make('div',undefined,'segment-column'),bar=make('div',undefined,'segment-stack');bar.style.height=(p.denominator/max*115)+'px';for(const o of values){const h=p.categories.find(v=>v.category.id===o.category.id);const block=make('span');block.style.height=h.value.point/p.denominator*100+'%';block.style.background=color(o.category.id);bar.append(block);}col.append(make('small',number(p.denominator/scale,scale===1e9?3:1)),bar,make('small',p.period.label));chart.append(col);}content.append(chart);
   }
   if(view.historyBreak)content.append(make('p','Äldre perioder har luckor eller annan indelning. Historiken visas utan att koppla ihop oförenliga serier.','segment-context'));
   if(view.values.some(o=>o.yoy.recast))content.append(make('p','YoY använder bolagets omräknade jämförelsetal.','segment-context'));
   if(view.group.type==='revenue_category')content.append(make('p','Ett redovisat segment; här visas intäktstyper.','segment-context'));
   const details=make('details',undefined,'financial-sources');details.id='segmentSources';details.append(make('summary','Källor & metod'));
   details.append(make('p',view.group.note),make('p','Andelar avser den angivna gruppen. Uppdelningar överlappar och ska inte adderas till varandra. Historik väljer senast publicerade uppgifter per period; ursprungliga värden bevaras nedan. En namnändring är inte i sig bevis för samma verksamhet.'));
   const records=S.rows(data).filter(o=>o.group.id===selected).sort((a,b)=>b.publicationDate.localeCompare(a.publicationDate)||b.period.end.localeCompare(a.period.end)||a.category.id.localeCompare(b.category.id));
   const wrap=make('div',undefined,'segment-table-scroll'),table=make('table'),head=make('thead'),h=make('tr');for(const text of ['Period / publicerat','Kategori / status','USD','Källa & definition']){const th=make('th',text);th.scope='col';h.append(th);}head.append(h);table.append(head);const body=make('tbody');
   for(const o of records){const row=make('tr');row.append(make('td',o.period.label+' · '+o.publicationDate),make('td',o.issuerLabel+(o.recast.status==='issuer_recast'?' · omräknat':'')),make('td',number(o.value.point,0)));const source=make('td'),a=make('a',o.source.documentType==='periodic_filing'?'SEC-rapport ↗':'SEC-bilaga ↗');a.href=o.source.url;a.target='_blank';a.rel='noopener noreferrer';source.append(a);const more=make('details');more.append(make('summary','Definition & originaltext'),make('p',o.definition),make('p',`${types[o.group.type]} · ${o.period.start}–${o.period.end}`),make('p',o.source.quote));for(const c of o.source.contexts)more.append(make('p',c));source.append(more);row.append(source);body.append(row);}table.append(body);wrap.append(table);details.append(wrap);content.append(details);
  }
  draw();
 }
 window.NTMCompanySegmentsUI={render};
})();
