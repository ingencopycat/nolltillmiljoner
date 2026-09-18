/* One renderer for the exact preview and the frozen anonymous report. */
(() => {
 'use strict';
 const R=window.NTMPublicReport,n=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const link=(text,url)=>{const a=n('a',text);a.href=url;return a;};
 const metric={revenue:'Intäkter',operatingIncome:'Rörelseresultat'};
 const num=v=>v.toLocaleString('sv-SE',{maximumFractionDigits:8});
 function table(facts){const t=n('table'),caption=n('caption','Frysta rapportuppgifter · helår');t.append(caption);const head=n('tr');for(const s of ['Mått / period','Värde / enhet','Källa']){const th=n('th',s);th.scope='col';head.append(th);}const thead=n('thead');thead.append(head);t.append(thead);const body=n('tbody');
  for(const f of facts){const row=n('tr'),th=n('th',metric[f.metric]+' · '+f.period);th.scope='row';th.append(n('p',f.periodStart+'–'+f.periodEnd,'social-note'));const source=n('td');source.append(link('SEC '+f.source.date,f.source.url),n('p',f.source.accession,'social-note'),n('p',f.source.definition+' · '+f.methodVersion,'social-note'));row.append(th,n('td',num(f.value)+' '+f.unit),source);body.append(row);}t.append(body);return t;}
 function render(parent,input,meta={}){
  const s=R.validate(input),article=n('article',undefined,'public-report-v2');article.dataset.reportVersion='2';
  const header=n('header',undefined,'report-header');header.append(n('p',s.ticker+' · Fryst investeringsrapport','section-kicker'),n('h1',s.company));
  if(meta.author)header.append(link((meta.author.displayName||'')+' · @'+meta.author.username,'profil.html?u='+encodeURIComponent(meta.author.username)));
  header.append(n('p',`Analys ${s.analysisDate} · sparat underlag ${s.basisDate} · ${meta.versionNumber?'offentlig version '+meta.versionNumber:'ny offentlig version vid bekräftelse'}${meta.publishedAt?' · publicerad '+new Date(meta.publishedAt).toLocaleString('sv-SE'):''}`,'report-dates'));
  header.append(n('p','Författaren äger resonemang och urval. NTM godkänner inte slutsatsen. Uppgifter är historiska; sidan hämtar inga nya bolagsvärden.','report-ownership'));article.append(header);
  const index=n('nav',undefined,'report-index');index.setAttribute('aria-label','I rapporten');article.append(index);
  const section=(key,title,claim)=>{const e=n('section',undefined,'report-section');e.id='public-'+key;if(claim){const labels=n('p',undefined,'claim-label');for(const text of claim.split(' · ')){const label=n('span',text);label.dataset.claim=text==='Bolagsrapporterad data'?'reported':text==='NTM-beräkning'?'calculated':text==='Författarens antagande'?'assumption':'judgment';labels.append(label);}e.append(labels);}e.append(n('h2',title));index.append(link(title,'#'+e.id));article.append(e);return e;};
  if(s.summary)section('summary','Sammanfattning','Författarens bedömning').append(n('p',s.summary,'social-text'));
  section('thesis','Investeringscaset','Författarens bedömning').append(n('p',s.thesis,'social-text'));
  if(s.correction)section('correction','Författarens offentliga rättelse','Författarens bedömning').append(n('p',s.correction,'social-text'),n('p','En uttrycklig ny publicerad version. Tidigare privat resonemang skrivs inte om.'));
  const facts=s.financial.flatMap(x=>x.observations);
  if(s.financial.length){const e=section('financial','Finansiellt sammanhang','Bolagsrapporterad data · NTM-beräkning');
   e.append(n('p','Källuppgifter ur det valda underlaget. Publiceringen är inte en ny kontroll av värdena mot SEC.'));
   for(const st of s.financial){e.append(n('h3',st.type==='revenue-change'?'Intäktsutveckling':'Rörelsemarginal'),n('p',R.describe(st)));const d=n('details');d.append(n('summary','Värden, källa och beräkning'),table(st.observations),n('p',`NTM-beräkning: ${st.calculation.formula}. ${st.calculation.values.map(num).join(' → ')} ${st.calculation.unit}. Metod ${st.methodVersion}.`));
    for(const f of st.observations)d.append(n('p',`${f.period}: ${f.periodStart}–${f.periodEnd}. ${f.source.definition}. Accession ${f.source.accession}. ${f.methodVersion}.`,'social-note'));e.append(d);}
  }
  if(s.chart){const e=section('chart','Intäkter över tid','Bolagsrapporterad data'),chart=n('div',undefined,'public-revenue-chart'),max=Math.max(...s.chart.rows.map(r=>r.observation?.value||0));chart.setAttribute('role','img');chart.setAttribute('aria-label','Fryst helårshistorik. Exakta värden och källor i tabellen nedan. Luckor är inte noll.');
   for(const row of s.chart.rows){const bar=n('div',undefined,'public-revenue-column'),value=row.observation?.value;bar.append(n('span',value===undefined?'Saknas':num(value/1e9)+' md USD'));const fill=n('div',undefined,'public-revenue-bar');fill.style.setProperty('--report-height',Number.isFinite(value)&&max>0?(value/max*140)+'px':'0px');bar.append(fill,n('span',row.period));chart.append(bar);}
   e.append(n('p','Helår · USD · fryst vid publiceringen. Luckor är saknade observationer.'),chart);const d=n('details');d.append(n('summary','Tabell och källor'),table(s.chart.rows.filter(r=>r.observation).map(r=>r.observation)));for(const r of s.chart.rows.filter(r=>!r.observation))d.append(n('p',r.period+': saknad observation.'));e.append(d);facts.push(...s.chart.rows.map(r=>r.observation).filter(Boolean));
  }
  for(const [key,title,claim] of [['assumptions','Valda antaganden','Författarens antagande'],['risks','Risker','Författarens bedömning'],['falsification','Vad kan göra detta fel?','Författarens bedömning']])if(s[key])section(key,title,claim).append(n('p',s[key],'social-text'));
  if(s.followUp||s.reviewDate){const e=section('followup','Uppföljning','Författarens bedömning');if(s.followUp)e.append(n('p',s.followUp,'social-text'));if(s.reviewDate)e.append(n('p','Avsett nästa granskningsdatum: '+s.reviewDate+'. Detta är författarens avsikt, ingen automatisk uppdatering.'));}
  if(facts.length||s.sources){const e=section('sources','Källor och metod');e.append(n('p','Källorna avser de angivna uppgifterna. De stödjer inte automatiskt författarens slutsats.'));
   if(facts.length){e.append(n('h3','Bolags-/SEC-källor'));const seen=new Set();for(const f of facts){const key=f.source.url;if(seen.has(key))continue;seen.add(key);e.append(n('p'));e.lastChild.append(link('SEC · '+f.source.accession+' · '+f.source.date,key));}e.append(n('h3','NTM:s beräkningar'),n('p','Rapporterade tal behåller definition, helårsperiod, valuta och källa. Intäktsförändring och rörelsemarginal beräknas enligt de synliga formlerna. Metod ntm-fundamental/1. Ingen värdering eller rekommendation.'),link('NTM:s metod och rättelser','om-metod.html#rattelser'));}
   if(s.sources)e.append(n('h3','Författarens externa källhänvisningar'),n('p',s.sources,'social-text'));
  }
  if(meta.id&&meta.versionId){article.append(n('p','Den här länken visar aktuell publicerad version. En versionsbunden länk blir otillgänglig när versionen ersätts eller avpubliceras.','social-note'),link('Länk till just denna version','analys.html?id='+encodeURIComponent(meta.id)+'&version='+encodeURIComponent(meta.versionId)));
   article.append(n('p'),link('Börja din egen privata Research','research.html?ticker='+encodeURIComponent(s.ticker)+'&publicReport='+encodeURIComponent(meta.id)+'&publicVersion='+encodeURIComponent(meta.versionId)+'#publicResearchOrigin'));
   article.append(n('p','Öppnar ditt eget arbete för bolaget. Författarens antaganden och bedömning kopieras inte.','social-note'));
  }
  parent.append(article);return article;
 }
 window.NTMPublicReportUI={render};
})();
