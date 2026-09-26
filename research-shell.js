/* View state only. Existing mounted forms and their owners retain analytical state. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const views = {overview:'Översikt',data:'Bolagsdata',thesis:'Din tes',valuation:'Värdering'};
 const topics = {financials:'Finansiellt',business:'Verksamhet',outlook:'Rapport & utsikter',capital:'Ägande & kapital'};
 const sections = {editor:'Din tes',review:'Granska',versions:'Versioner',outcomes:'Utfall',export:'Exportera'};
 let ready = false, active = null;
 const make = (tag, text, id) => { const n=document.createElement(tag);if(text)n.textContent=text;if(id)n.id=id;return n; };
 function panel(parent,id,label,kind,key) {
  const n=make('section',null,id);n.dataset[kind]=key;n.setAttribute('aria-label',label);n.tabIndex=-1;parent.append(n);return n;
 }
 function move(parent,...ids) { for(const id of ids){const n=$(id);if(n)parent.append(n);} }
 function url(state,hash='') {
  const u=new URL(location.href);u.searchParams.set('view',state.view);
  u.searchParams.delete('topic');u.searchParams.delete('section');
  if(state.view==='data')u.searchParams.set('topic',state.topic);
  if(state.view==='thesis'&&state.section!=='editor')u.searchParams.set('section',state.section);
  u.hash=hash;return u;
 }
 function navigation(parent,id,label,choices,dimension) {
  const nav=make('nav',null,id);nav.className='research-shell-nav';nav.setAttribute('aria-label',label);
  const links=make('div');links.className='research-shell-links';
  const field=make('label',label);field.className='research-shell-selector';field.htmlFor=id+'Select';
  const select=make('select',null,id+'Select');
  for(const [key,title] of Object.entries(choices)) {
   const a=make('a',title);a.dataset[dimension]=key;links.append(a);
   const option=make('option',title);option.value=key;select.append(option);
   a.addEventListener('click',e=>{if(e.button||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();go({...active,[dimension]:key});});
  }
  select.addEventListener('change',()=>go({...active,[dimension]:select.value}));
  field.append(select);nav.append(links,field);parent.append(nav);
 }
 function setup() {
  if(ready)return;ready=true;
  const root=$('researchDetail');root.classList.add('has-company-shell');
  root.querySelector('nav[aria-label="I denna analys"]')?.remove();
  const shell=make('div',null,'researchCompanyShell');root.append(shell);
  navigation(shell,'researchWorkspaceNav','Arbetsyta',views,'view');
  const overview=panel(shell,'workspaceOverview',views.overview,'workspace','overview');
  overview.append($('key-metrics-heading').closest('section'));
  const metricsToggle=root.querySelector('[data-metrics-toggle]');
  if(metricsToggle){const link=make('a','Alla nyckeltal i Bolagsdata');link.href='#financialMetrics';metricsToggle.remove();overview.append(link);}
  move(overview,'fundamentalProfile','overviewRevenue');
  const preview=make('aside',null,'researchSincePreview');preview.className='workspace-state';$('overviewRevenue').before(preview);
  const data=panel(shell,'workspaceData',views.data,'workspace','data');
  navigation(data,'researchTopicNav','Område i Bolagsdata',topics,'topic');
  for(const [key,label] of Object.entries(topics))panel(data,'data-'+key,label,'topicPanel',key);
  const metrics=make('section',null,'financialMetrics');metrics.append(make('h2','Samtliga nyckeltal'));
  const grid=make('div',null,'financialMetricsGrid');grid.className='metrics-dashboard-grid';metrics.append(grid);$('data-financials').append(metrics);
  move($('data-financials'),'growthDepth','researchFinancials');
  $('growthDepth').open=true;$('researchFinancials').open=true;
  const filings=$('filingsList').closest('section');$('data-outlook').append(filings);
  // Dedicated slots fix composition independently of fetch completion and renderer order.
  for(const [id,topic] of Object.entries({evidenceReporting:'outlook',evidenceGuidance:'outlook',evidenceEvents:'outlook',evidenceSegments:'business',evidenceKpis:'business',evidenceCapital:'capital',evidenceInsiders:'capital',evidenceOwnership:'capital'})) {
   const slot=make('div',null,id);slot.dataset.evidenceSlot='';$('data-'+topic).append(slot);
  }
  const thesis=panel(shell,'workspaceThesis',views.thesis,'workspace','thesis');
  navigation(thesis,'researchThesisNav','Arbete med tesen',sections,'section');
  for(const [key,label] of Object.entries(sections))panel(thesis,'thesis-'+key,label,'thesisPanel',key);
  move($('thesis-editor'),'thesisSection');
  const needed=make('p',null,'shellValuationRequired');needed.hidden=true;
  const calculate=make('a','Värdering behöver beräknas — öppna Värdering');calculate.href='#valuationSection';needed.append(calculate);$('thesisForm').before(needed);
  move($('thesis-review'),'researchSince','thesisReviewDepth','changeDetectionSection');
  move($('thesis-versions'),'thesisHistorySectionDepth');
  move($('thesis-outcomes'),'outcomeSectionDepth');
  $('thesis-versions').prepend(make('p','Ingen sparad version att visa ännu. Spara din tes för att börja historiken.','shellNoVersions'));
  $('thesis-outcomes').prepend(make('p','Spara en analys för att följa upp process och utfall.','shellNoOutcomes'));
  move($('thesis-export'),'researchExportSection');
  for(const id of ['thesisReviewDepth','thesisHistorySectionDepth','outcomeSectionDepth'])$(id).open=true;
  const valuation=panel(shell,'workspaceValuation',views.valuation,'workspace','valuation');
  const back=make('a','Tillbaka till din tes');back.href='#thesisSection';valuation.append(back);move(valuation,'valuationSection');
  const tools=make('details',null,'researchTools');tools.className='depth-panel';tools.append(make('summary','Research-verktyg'),make('p','AI är inte aktiverad. Inga uppgifter skickas.','shellAiStatus'));move(tools,'researchAI');shell.append(tools);
  const related=make('details');related.className='depth-panel';related.append(make('summary','Lär dig mer och fortsätt'));document.querySelectorAll('[data-relation-ticker]').forEach(n=>related.append(n));overview.append(related);
  document.addEventListener('click',e=>{
   const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
   const u=new URL(a.href,location.href);
   if(u.origin!==location.origin||u.pathname!==location.pathname||u.searchParams.get('ticker')!==new URL(location.href).searchParams.get('ticker')||!u.hash)return;
   const destination=anchorState(u.hash);if(!destination)return;
   e.preventDefault();go(destination,u.hash);
  });
  window.addEventListener('popstate',()=>{
   const ticker=new URLSearchParams(location.search).get('ticker')?.toUpperCase();
   // Inline manual entry can replace a company URL. Restore that company through
   // its existing loading/continuity path, never reinterpret the mounted draft.
   if(ticker!==window.NTMResearchShell.ticker()){location.reload();return;}
   apply(read(),true);
  });
  window.addEventListener('hashchange',()=>apply(read(),true));
  document.addEventListener('input',()=>{if($('shellValuationRequired'))$('shellValuationRequired').hidden=!window.NTMResearchShell.valuationStale();});
  document.addEventListener('submit',()=>requestAnimationFrame(()=>{if(ready)$('shellValuationRequired').hidden=!window.NTMResearchShell.valuationStale();}));
  shell.addEventListener('toggle',resize,true);
 }
 function anchorState(hash) {
  const id=hash.replace(/^#/,'');const target=$(id);
  const workspace=target?.closest('[data-workspace]');
  if(workspace)return {view:workspace.dataset.workspace,topic:target.closest('[data-topic-panel]')?.dataset.topicPanel||'financials',section:target.closest('[data-thesis-panel]')?.dataset.thesisPanel||'editor'};
  // Evidence can arrive after the initial URL is read.
  const aliases={companyEvidence:'outlook',reportingSources:'outlook',companyObservations:'outlook',observationSources:'outlook',companyMaterialEvents:'outlook',materialSources:'outlook',companySegments:'business',companyKpis:'business',kpiSources:'business',segmentSources:'business',companyCapital:'capital',capitalSources:'capital',companyInsiders:'capital',insiderSources:'capital',companyOwnership:'capital',ownershipSources:'capital'};
  if(aliases[id])return {view:'data',topic:aliases[id],section:'editor'};
  if(id==='researchSince')return {view:'thesis',topic:'financials',section:'review'};
  return null;
 }
 function read() {
  const p=new URLSearchParams(location.search);
  return anchorState(location.hash)||{view:p.get('view')||(p.get('review')==='exact'?'thesis':'overview'),topic:p.get('topic'),section:p.get('section')||(p.get('review')==='exact'?'review':'editor')};
 }
 function normalize(s) {return {view:Object.hasOwn(views,s.view)?s.view:'overview',topic:Object.hasOwn(topics,s.topic)?s.topic:'financials',section:Object.hasOwn(sections,s.section)?s.section:'editor'};}
 function resize() {requestAnimationFrame(()=>{for(const chart of Object.values(window.Chart?.instances||{}))if(chart.canvas?.getClientRects().length)chart.resize();});}
 function apply(state,focus=false) {
  if(!ready)return;active=normalize(state);
  for(const [selector,dimension] of [['[data-workspace]','view'],['[data-topic-panel]','topic'],['[data-thesis-panel]','section']]) {
   document.querySelectorAll(selector).forEach(n=>{const key=n.dataset.workspace||n.dataset.topicPanel||n.dataset.thesisPanel;n.hidden=key!==active[dimension];n.inert=n.hidden;});
  }
  for(const [id,dimension] of [['researchWorkspaceNav','view'],['researchTopicNav','topic'],['researchThesisNav','section']]) {
   $(id+'Select').value=active[dimension];
   $(id).querySelectorAll('a').forEach(a=>{a.href=url({...active,[dimension]:a.dataset[dimension]});if(a.dataset[dimension]===active[dimension])a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  }
  $('shellValuationRequired').hidden=!window.NTMResearchShell.valuationStale();
  const target=$(location.hash.slice(1));
  if(target)for(let n=target;n;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true;
  resize();
  if(focus){const destination=target||$(active.view==='data'?'data-'+active.topic:active.view==='thesis'?'thesis-'+active.section:'workspace'+active.view[0].toUpperCase()+active.view.slice(1));destination?.setAttribute('tabindex','-1');destination?.focus({preventScroll:true});destination?.scrollIntoView({block:'start'});}
 }
 function go(state,hash='') {const next=normalize(state);history.pushState(null,'',url(next,hash));apply(next,true);}
 function since(model,error) {
  const host=$('researchSincePreview');if(!host)return;host.replaceChildren();
  host.hidden=model.state==='no_revision'&&!error;if(host.hidden)return;
  host.append(make('strong','Sedan din analys'));
  const text=error?'Sparad analys kunde inte läsas säkert. Öppna versionshistoriken.':model.state==='unavailable'?'Jämförelseunderlaget är inte tillgängligt just nu.':model.unavailable?'Uppdateringen är otillgänglig; senast verifierat underlag visas.':model.groups?.length?model.groups.slice(0,2).map(g=>g.title).join(' · '):'Inga nya granskade förändringar sedan din senaste revision.';
  host.append(make('p',text));if(model.baseline)host.append(make('small','Senaste sparade revision: '+model.baseline.slice(0,10)));
  const a=make('a',error?'Öppna versionshistoriken':'Granska mot min tes');a.href=error?'#thesisHistorySection':'#researchSince';host.append(a);
 }
 window.NTMResearchShell={
  init(){setup();apply(read());},
  refresh(){if(ready)apply(read());},since,valuationStale:()=>false,ticker:()=>null,
  manual(){
   if(!ready)return;
   const root=$('researchDetail');
   move(root,'thesisReviewDepth','thesisSection','researchExportSection','thesisHistorySectionDepth','outcomeSectionDepth','changeDetectionSection','researchAI');
   root.classList.remove('has-company-shell');$('researchCompanyShell').hidden=true;
   $('shellValuationRequired')?.remove();
   ready=false;
  }
 };
})();
