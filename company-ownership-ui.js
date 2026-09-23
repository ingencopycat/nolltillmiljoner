/* Reviewed beneficial ownership in the existing company profile; evidence on demand. */
(()=>{
 'use strict';const O=window.NTMCompanyOwnership;
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const n=(v,d=2)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:d}).format(Number(v));
 function render(feed,host,status){
  const d=feed.ownershipEvidence;if(!d)return;O.validate(d,feed.ticker,feed.cik);
  if(!d.filings.length&&!d.pendingReview.length)return;
  const section=el('section');section.id='companyOwnership';section.setAttribute('aria-label','Rapporterat större ägande');section.append(el('h2','Rapporterat större ägande'),el('p','Senast granskade äganderapporter. Uppgifterna gäller rapporternas angivna datum, inte dagens innehav.','ownership-context'));
  if(status?.status!=='verified')section.append(el('p','Uppdateringen är otillgänglig; tidigare verifierat underlag visas.','ownership-context'));
  if(d.pendingReview.length)section.append(el('p',d.pendingReview.length+' nya rapporter väntar på granskning. Visade uppgifter kan vara inaktuella.','ownership-notice'));
  const label=el('label','Visa','ownership-filter'),select=el('select');select.id='ownershipPeriod';label.htmlFor=select.id;
  for(const [value,text] of [['recent','Senast granskade rapporter'],['history','Äldre 13D-exempel']]){const option=el('option',text);option.value=value;select.append(option);}label.append(select);if(d.filings.some(f=>f.historyOnly))section.append(label);
  const list=el('div',undefined,'ownership-list');section.append(list);const more=el('button','Visa fler rapporterande ägare','insider-more');more.type='button';section.append(more);let limit=4;
  function draw(){const groups=O.latest(d,{history:select.value==='history'});list.replaceChildren();for(const g of groups.slice(0,limit))list.append(entry(g));more.hidden=limit>=groups.length;if(!groups.length)list.append(el('p','Inga granskade rapporter i detta urval. Det säger inget om vilka större ägare bolaget har.','ownership-context'));}
  more.addEventListener('click',()=>{limit+=4;draw();});select.addEventListener('change',()=>{limit=4;draw();});draw();
  const sources=el('details',undefined,'financial-sources');sources.id='ownershipSources';sources.append(el('summary','Källor & metod'),
   el('p','Schedule 13D och 13G beskriver rapporterat beneficial ownership: ägande eller befogenheter som enligt rapporteringsreglerna hänförs till personen. Det är inte en komplett ägarlista, en liveposition eller en transaktionsrapport.'),
   el('p','13D innehåller bland annat uppgifter om syfte och planer. 13G följer andra rapporteringsförutsättningar. Formulär och angiven regel visas i underlaget; ingen investeringsavsikt härleds från formulärtypen.'),
   el('p','Varje rad visar en granskad rapporteringshistorik. Relaterade personer kan redovisa samma aktier. Deras belopp summeras inte, och separata juridiska personer slås inte ihop efter namn.'),
   el('p','Förändringar avser rapporterade tal, inte härledda köp eller försäljningar. Procenttalens nämnare kan förändras. Ändrad omfattning bryter jämförelsen. Referensdagen är den angivna händelsedagen, inte nödvändigtvis en exakt innehavstidpunkt.'),
   el('p','Urvalet omfattar granskade rapporter från 2025 och separata äldre exempel. Avsaknad av underlag betyder inte att bolaget saknar stora ägare. Nya och oklara rapporter kräver granskning. SEC-källor och originaluppgifter finns under varje rapports underlag.'));section.append(sources);host.prepend(section);
 }
 function entry(g){
  const f=g.filing,p=O.person(f),article=el('article',undefined,'ownership-entry');article.append(el('h3',p.name));
  const stats=el('div',undefined,'ownership-values');stats.append(el('strong',n(p.percent)+' %'),el('span',n(p.shares,4)+' aktier'));article.append(stats,
   el('p','Rapporterat '+f.filingDate+' · referensdag '+f.eventDate,'ownership-context'),el('p',f.security+(f.persons.length>1?' · gemensam rapportering, '+f.persons.length+' personer':''),'ownership-context'));
  if(g.change.state==='comparable')article.append(el('p','Tidigare: '+n(O.person(g.change.previous).percent)+' % · '+(g.change.percentagePoints>0?'+':'')+n(g.change.percentagePoints)+' procentenheter. Rapporterat antal '+(g.change.shares>0?'ökade':g.change.shares<0?'minskade':'oförändrat')+'.','ownership-change'));
  else if(g.change.state==='not_comparable')article.append(el('p','Ej jämförbart · '+g.change.reason.replace(/\s*Ej jämförbart\.$/,''),'ownership-notice'));
  if(f.context)article.append(el('p',f.context,'ownership-context'));
  if(f.purposeContext)article.append(el('p',f.purposeContext,'ownership-context'));
  if(g.history.length>1)article.append(historyChart(g.history));
  const detail=el('details',undefined,'ownership-detail');detail.append(el('summary','Historik & underlag · '+g.history.length+(g.history.length===1?' rapport':' rapporter')));let loaded=false;
  detail.addEventListener('toggle',()=>{if(detail.open&&!loaded){loaded=true;for(const record of [...g.history].reverse())detail.append(evidence(record));}});article.append(detail);return article;
 }
 function historyChart(history){
  const wrap=el('div',undefined,'ownership-history'),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),max=Math.max(...history.map(f=>Number(O.person(f).percent)),1),points=history.map((f,i)=>({x:35+i*250/(history.length-1),y:50-Number(O.person(f).percent)/max*30,f}));
  svg.setAttribute('viewBox','0 0 320 65');svg.setAttribute('role','img');svg.setAttribute('aria-label','Rapporterade andelar: '+history.map(f=>f.eventDate+': '+n(O.person(f).percent)+' procent').join('; ')+'. Avbrott innebär ej jämförbart.');
  for(let i=0;i<points.length;i++){const p=points[i];if(i&&p.f.previousAccession===points[i-1].f.accessionNumber&&O.change(p.f,history).state==='comparable'){const line=document.createElementNS(ns,'line');line.setAttribute('x1',points[i-1].x);line.setAttribute('y1',points[i-1].y);line.setAttribute('x2',p.x);line.setAttribute('y2',p.y);line.setAttribute('class','ownership-history-line');svg.append(line);}const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',p.x);circle.setAttribute('cy',p.y);circle.setAttribute('r','3');svg.append(circle);const text=document.createElementNS(ns,'text');text.setAttribute('x',p.x);text.setAttribute('y',p.y-9);text.setAttribute('text-anchor','middle');text.textContent=n(O.person(p.f).percent)+' %';svg.append(text);}
  wrap.append(svg);const dates=el('div',undefined,'ownership-history-dates');for(const f of history)dates.append(el('span',f.eventDate));wrap.append(dates,el('small','Rapporterade andelar · avbrott = ej jämförbart'));return wrap;
 }
 function evidence(f){
  const block=el('div',undefined,'ownership-source');block.append(el('h4',f.family+(f.amendmentNumber?' · ändring '+f.amendmentNumber:'')+' · '+f.filingDate));
  const link=el('a','Officiell SEC-rapport ↗');link.href=f.renderedUrl;link.target='_blank';link.rel='noopener noreferrer';block.append(link,el('p','Referensdag '+f.eventDate+' · '+f.accessionNumber,'ownership-context'));
  if(f.rules.length)block.append(el('p',f.rules.join(' · '),'ownership-context'));
  block.append(el('p',f.comparison.reason,'ownership-context'));if(f.relationships)block.append(el('p',f.relationships));if(f.purposeContext)block.append(el('p',f.purposeContext));
  for(const p of f.persons){const row=el('div',undefined,'ownership-person');row.append(el('h5',p.name),el('p',n(p.percent)+' % · '+n(p.shares,4)+' aktier'),el('p','Rösträtt: ensam '+n(p.powers.soleVotingPower)+' · delad '+n(p.powers.sharedVotingPower)),el('p','Förfoganderätt: ensam '+n(p.powers.soleDispositivePower)+' · delad '+n(p.powers.sharedDispositivePower)));
   if(p.cik)row.append(el('p','SEC CIK '+p.cik,'ownership-context'));row.append(el('p','Källställe: '+p.locator,'ownership-context'));if(p.comments)row.append(el('p',p.comments,'ownership-footnote'));block.append(row);}
  for(const [key,value] of Object.entries(f.statements))if(value){const labels={relationships:'Rapporterade relationer',group:'Rapporterad grupp',onBehalfOf:'Ägande för annans räkning',certification:'Rapportörens intygande',purpose:'Rapportörens syfte / planer'};block.append(el('h5',labels[key]||key),el('p',value,'ownership-footnote'));}
  return block;
 }
 window.NTMCompanyOwnershipUI={render};
})();
