/* Compact local-only continuation into the existing explicit thesis review. */
(()=>{
 'use strict';
 let stock=null,feed=null,health=null;
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const number=v=>typeof v==='number'?new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2,notation:Math.abs(v)>=1e6?'compact':'standard'}).format(v):v;
 const delta=c=>!c?.comparable?'':Number.isFinite(c.changePercent)?`${c.changePercent>0?'+':''}${number(c.changePercent)} %`:Number.isFinite(c.marginChange)?`${number(c.marginChange)} procentenheter`:({raised:'Höjd',lowered:'Sänkt',mixed:'Ändrat intervall',unchanged:'Oförändrad'}[c.direction]||'');
 function link(label,href){const a=node('a',label);if(href?.startsWith('#'))a.href=href;else if(/^https:\/\/www.sec.gov\//.test(href||'')){a.href=href;a.target='_blank';a.rel='noopener noreferrer';}return a;}
 function row(r){
  const article=node('article',undefined,'since-change');article.append(node('h4',r.label));
  if(r.current!==undefined){const values=node('p',undefined,'since-values');if(r.before!==null&&r.before!==undefined&&r.comparison?.comparable)values.append(node('span',number(r.before)),node('span','→'));values.append(node('strong',number(r.current)+(r.unit?' '+r.unit:'')));article.append(values);}
  article.append(node('small',[r.previousPeriod&&r.comparison?.comparable?r.previousPeriod+' → '+r.period:r.period,r.date].filter(Boolean).join(' · ')));
  const c=r.comparison;
  if(c?.comparable){if(delta(c))article.append(node('p',delta(c)));}
  else if(c)article.append(node('p',/definition|indelning|basis|aktiebas/i.test(c.reason)?'Definitionen har ändrats — direkt jämförelse är inte möjlig.':c.reason));
  if(r.recast)article.append(node('small','Bolaget har räknat om historiken.'));
  const evidence=node('details');evidence.append(node('summary','Källor & metod'));
  if(r.definition)evidence.append(node('p',r.definition));if(r.basis)evidence.append(node('p',r.basis));
  if(r.before!==null&&r.before!==undefined&&!c?.comparable)evidence.append(node('p','Tidigare uppgift (ej direkt jämförbar): '+number(r.before)));
  if(r.source?.url)evidence.append(link('Öppna officiell källa',r.source.url));
  if(r.previousSource?.url)evidence.append(link('Tidigare källa',r.previousSource.url));
  if(r.source?.quote)evidence.append(node('p',r.source.quote));
  if(r.target)evidence.append(link('Historik och fullständigt underlag',r.target));
  article.append(evidence);return article;
 }
 function render(){
  if(!stock)return;
  const reviewLink=document.querySelector('#reviewEvidenceLinks a');if(reviewLink)reviewLink.href='#researchSince';
  let host=document.getElementById('researchSince');if(!host){host=node('section',undefined,'research-since');host.id='researchSince';host.setAttribute('aria-labelledby','researchSinceHeading');document.getElementById('overviewRevenue')?.before(host);}
  host.dataset.reviewedCompany=String(['NVDA','SOFI','CRWD'].includes(stock.symbol));
  const opened=new Set([...host.querySelectorAll('details[open][data-group]')].map(n=>n.dataset.group));host.replaceChildren(node('h2','Sedan din analys'));host.firstChild.id='researchSinceHeading';
  const saved=window.NTMThesisStorage.get(stock.symbol);let model;
  try{model=window.NTMResearchSince.build({stock,feed,thesis:saved.thesis,unavailable:health?.status!=='verified'});}catch{model={state:'unavailable'};}
  if(saved.error||saved.warning){host.append(node('p','Sparad analys kunde inte läsas säkert. Öppna versionshistoriken.'));return;}
  if(model.state==='no_revision'){host.append(node('p','Spara en analys för att se granskade förändringar sedan din senaste revision.'));return;}
  if(model.state==='unavailable'){host.append(node('p','Jämförelseunderlaget är inte tillgängligt just nu.'));return;}
  host.append(node('p',new Date(model.baseline).toLocaleDateString('sv-SE',{day:'numeric',month:'short',year:'numeric'})+' → idag · senaste sparade revision','since-baseline'));
  if(model.unavailable)host.append(node('p','Uppdateringen är otillgänglig; senast verifierat underlag visas.'));
  if(!model.groups.length)host.append(node('p','Inga nya granskade förändringar sedan din senaste revision.'));
  const grid=node('div',undefined,'since-groups'),more=node('details',undefined,'since-more');more.append(node('summary',`Fler områden (${Math.max(0,model.groups.length-3)})`));const moreGrid=node('div',undefined,'since-groups');more.append(moreGrid);
  for(const g of model.groups){const d=node('details',undefined,'since-group');d.dataset.group=g.id;d.open=opened.has(g.id);const summary=node('summary');summary.append(node('strong',g.title));
   const ordered=[...g.rows].sort((a,b)=>(b.periodEnd||b.date||'').localeCompare(a.periodEnd||a.date||''));
   const priority=g.id==='capital'?/aktier|aktieantal|utestående|vägt antal/i:/Data Center|Intäkter|Omsättning|ARR|Medlemmar/i;
   const first=ordered.find(r=>priority.test(r.label))||ordered[0];let preview;
   if(g.id==='reporting')preview=`${g.rows.length} nya rapportdokument · ${first.label}`;
   else if(g.id==='owners')preview=[...new Set(g.rows.map(r=>r.label))].map(form=>`${g.rows.filter(r=>r.label===form).length} Form ${form}`).join(' · ');
   else if(g.id==='events')preview=`${g.rows.length} granskade händelser`;
   else preview=first.label+': '+(first.before!=null&&first.comparison?.comparable?number(first.before)+' → ':'')+(number(first.current)??'Ej direkt jämförbart')+(g.rows.length>1?` · +${g.rows.length-1} uppgifter`:'');
   summary.append(node('span',preview));if(first.period)summary.append(node('small',[first.period,delta(first.comparison)].filter(Boolean).join(' · ')));d.append(summary);for(const r of ordered)d.append(row(r));
   const target={guidance:'#companyObservations',business:'#companySegments',capital:'#companyCapital'}[g.id];if(target)d.append(link('Utforska historik, diagram och definitioner',target));(model.groups.indexOf(g)<3?grid:moreGrid).append(d);
  }
  host.append(grid);if(model.groups.length>3)host.append(more);
  const review=link('Granska mot min tes','#thesisReview');review.className='secondary-btn';review.onclick=()=>{const depth=document.getElementById('thesisReviewDepth');depth.open=true;document.getElementById('reviewHeading')?.setAttribute('tabindex','-1');document.getElementById('reviewHeading')?.focus();};host.append(review);
  const method=node('details',undefined,'since-method');method.append(node('summary','Källor & metod'),node('p','Publicerings- och inlämningsdatum jämförs med senaste sparade revisionen, aldrig importdatum. Samma dags ordning kan inte fastställas. Endast granskade uppgifter i det tillgängliga urvalet ingår. Rapportdokument samlas här; deras effekter finns i respektive område. Tidigare värde avser föregående jämförbara uppgift, TTM avser ditt sparade underlag. Historikval ändrar inte denna baslinje. Ingen investeringsbedömning görs.'));host.append(method);
 }
 window.NTMResearchSinceUI={setStock(value){if(stock?.symbol!==value.symbol)feed=null;stock=value;health={status:'unavailable'};render();},setEvidence(value,status){if(value.ticker!==stock?.symbol)return;feed=value;health=status;render();},render};
 window.addEventListener('storage',e=>{if(e.key===window.NTMThesisStorage.key)render();});
})();
