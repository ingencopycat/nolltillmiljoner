/* Wave 3 composition only. Mounted canonical forms own all calculations and saves. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),make=(tag,text,id)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(id)n.id=id;return n;};
 const text=(n,value)=>{if(n&&n.textContent!==value)n.textContent=value;};
 const move=(parent,n)=>{if(n&&n.parentElement!==parent)parent.append(n);};
 const link=(label,href)=>{const a=make('a',label);a.href=href;return a;};
 const disclosure=(label,id)=>{const d=make('details',null,id);d.className='work-disclosure';d.append(make('summary',label));return d;};
 let mobile,mode='editor',tableVersion='',observer,testedOrigin='';const observed=new WeakSet();
 function notebookMode(value){mode=value;for(const key of ['editor','context']){const n=$('notebook-'+key);if(!n)continue;n.hidden=mobile.matches&&key!==mode;n.inert=n.hidden;$('notebook-'+key+'-button').setAttribute('aria-pressed',String(key===mode));}}
 function reveal(target){const pane=target?.closest('[data-notebook-pane]');if(pane&&mobile.matches)notebookMode(pane.dataset.notebookPane);}
 function setup(){
  mobile=window.matchMedia('(max-width: 700px)');
  const thesis=$('thesisSection'),form=$('thesisForm');if(!form||$('notebook-editor'))return;
  thesis.classList.add('analytical-notebook');
  const main=make('div',null,'notebook-editor');main.dataset.notebookPane='editor';
  const context=make('aside',null,'notebook-context');context.dataset.notebookPane='context';context.setAttribute('aria-label','Sparat arbete och granskning');
  const actions=make('div',null,'notebook-actions');
  for(const n of [...form.children])move(main,n);
  form.append(actions,main,context);
  move(actions,main.querySelector('.thesis-form-actions'));move(actions,$('thesisStatusBanner'));
  const state=make('p',null,'notebook-status');state.setAttribute('role','status');actions.prepend(state);
  const tabs=make('div',null,'notebook-tabs');tabs.setAttribute('aria-label','Visa i tesen');
  for(const [key,title] of [['editor','Min tes'],['context','Underlag']]){const b=make('button',title,'notebook-'+key+'-button');b.type='button';b.setAttribute('aria-controls','notebook-'+key);b.onclick=()=>notebookMode(key);tabs.append(b);}actions.append(tabs);
  move(context,$('thesis-review-date').closest('.field-group'));
  text(context.querySelector('label'),'Nästa granskning (valfritt)');
  const saved=make('p',null,'notebook-saved');context.append(saved,link('Versioner & sparade underlag','#thesisHistorySection'));
  const since=make('div',null,'notebook-since'),reviewLink=link('Granska mot min sparade tes →','#researchSince');reviewLink.id='notebookReviewLink';context.append(since,reviewLink);
  const recovery=link('Öppna återställning eller läsfel →','#researchContinuity');recovery.id='notebookRecovery';actions.prepend(recovery);
  context.append(link('Exportera vald sparad version →','#researchExportSection'));
  const privacy=disclosure('Lagring, synk & publicering','notebookPrivacy');move(privacy,$('thesisMetadata'));context.append(privacy);
  const continuity=disclosure('Lokalt utkast & återställning','notebookContinuity');context.append(continuity);
  move(privacy,$('thesisSavedIndicator'));
  const advanced=$('thesisAdvanced');advanced.open=true;
  text(advanced.querySelector(':scope > summary'),'Fördjupa resonemanget');
  for(const [id,title] of [['thesis-assumption-1','Antaganden'],['thesis-risks','Risker'],['thesis-notes','Anteckningar']]){const f=$(id).closest('fieldset');const d=disclosure(title,'notebook-'+id);f.before(d);d.append(f);}
  text($('thesis-text').closest('fieldset').querySelector('legend'),'Min tes');
  text($('thesis-trigger').closest('fieldset').querySelector('legend'),'Vad skulle visa att jag har fel?');
  $('thesis-text').rows=7;$('thesis-trigger').rows=3;
  const valuation=$('valuationSection');valuation.classList.add('analytical-valuation');
  text($('valuation-heading'),'Vad kräver priset?');
  const layout=make('div',null,'valuation-work');valuation.append(layout);
  const assumptions=disclosure('Ändra antaganden','valuationAssumptions');assumptions.open=!mobile.matches;
  layout.append($('valuationResults'),assumptions);assumptions.append($('valuationForm'));
  assumptions.prepend(valuation.querySelector('.valuation-intro-text'),valuation.querySelector('a[data-concept-help="eps"]'));
  assumptions.prepend(assumptions.querySelector('summary'));
  const inputs=valuation.querySelector('.scenario-assumption-grid');$('valuationForm').insertBefore(inputs,$('valuationForm').querySelector('[type=submit]'));
  const result=$('valuationResults'),reverse=result.querySelector('.reverse-valuation-card');result.prepend(reverse);
  const basis=make('p',null,'valuation-tested-basis');reverse.prepend(basis);
  const stateLabel=make('p',null,'valuationResultState');stateLabel.setAttribute('role','status');$('valuationStatusBanner').before(stateLabel);
  text(reverse.querySelector('h3'),'EPS-tillväxt som priset kräver');
  const history=disclosure('Historisk kontext, prisursprung & värderingsmått','valuationHistory');history.append($('valuationPriceResultStatus'),result.querySelector('.valuation-snapshot-grid'),$('reverseContextBox'));result.append(history);
  const scenario=result.querySelector('#scenariosAccordion');scenario.open=true;
  text(scenario.querySelector('summary span'),'Bear · Base · Bull');
  const cards=make('div',null,'valuation-scenario-outcomes');scenario.querySelector('.valuation-accordion-content').prepend(cards);
  for(const name of ['bear','base','bull']){const card=make('article');card.dataset.scenario=name;card.append(make('h3',name[0].toUpperCase()+name.slice(1)),make('p',null,'work-'+name+'-label'),make('p',null,'work-'+name+'-price'),make('p',null,'work-'+name+'-returns'),make('p',null,'work-'+name+'-inputs'));cards.append(card);}
  const tableDetails=disclosure('Fullständig scenariojämförelse','scenarioTableDepth');const wrap=$('scenariosTable').parentElement;wrap.before(tableDetails);tableDetails.append(wrap);
  const sensitivity=$('sensitivityDepth');result.append(sensitivity);sensitivity.open=!mobile.matches;
  const slice=make('div',null,'sensitivity-slice');sensitivity.querySelector('summary').after(slice);
  for(const [id,label] of [['sensitivityRow','EPS-tillväxt'],['sensitivityColumn','Exit-P/E']]){const l=make('label',label);l.htmlFor=id;const select=make('select',null,id);l.append(select);slice.append(l);select.onchange=drawSlice;}
  slice.append(make('p',null,'sensitivity-selected'),make('div',null,'sensitivity-row-values'));
  const full=disclosure('Hela matrisen · 25 kombinationer','sensitivityFull');const matrix=sensitivity.querySelector('.sensitivity-table-wrap');matrix.before(full);full.append(matrix);full.open=!mobile.matches;
  const recalc=make('button','Beräkna värdering & scenarier','valuationRecalculate');recalc.type='submit';recalc.setAttribute('form','valuationForm');$('valuationStatusBanner').after(recalc);
  observer=new MutationObserver(refresh);
  for(const id of ['thesisStatusBanner','thesisSavedIndicator','valuationStatusBanner','sensitivityTable','researchSincePreview','revisionSelectionLabel'])if($(id))observer.observe($(id),{childList:true,subtree:true,attributes:true,characterData:true});
  observer.observe(thesis,{childList:true});
  document.addEventListener('input',()=>queueMicrotask(refresh));document.addEventListener('change',()=>queueMicrotask(refresh));document.addEventListener('submit',()=>queueMicrotask(refresh));
  mobile.addEventListener('change',()=>{notebookMode(mode);assumptions.open=!mobile.matches;full.open=!mobile.matches;sensitivity.open=!mobile.matches;refresh();});
  window.addEventListener('hashchange',()=>reveal($(location.hash.slice(1))));
  notebookMode('editor');refresh();
 }
 function drawSlice(){
  const rows=[...$('sensitivityTable').querySelectorAll('tbody tr')],headers=[...$('sensitivityTable').querySelectorAll('thead th')].slice(1),r=Number($('sensitivityRow').value),c=Number($('sensitivityColumn').value),row=rows[r];if(!row)return;
  const cells=[...row.querySelectorAll('td')];
  text($('sensitivity-selected'),`${row.querySelector('th').textContent} · ${headers[c].textContent}: ${cells[c].querySelector('.sens-cell-price').textContent} · CAGR ${cells[c].querySelector('.sens-cell-cagr').textContent}`);
  const slice=$('sensitivity-row-values');slice.replaceChildren();for(let i=Math.max(0,c-1);i<=Math.min(cells.length-1,c+1);i++){const p=make('p',`${headers[i].textContent}: ${cells[i].querySelector('.sens-cell-price').textContent} · ${cells[i].querySelector('.sens-cell-cagr').textContent} / år`);slice.append(p);}
  $('sensitivityTable').querySelectorAll('td').forEach(td=>td.classList.toggle('work-selected',td===cells[c]));
 }
 function refresh(){
  if(!$('notebook-editor'))return;
  for(const id of ['researchContinuity','workspaceState']){const n=$(id);if(n&&!observed.has(n)){observed.add(n);observer.observe(n,{childList:true,subtree:true,characterData:true});}}
  const dirty=typeof currentThesisState!=='undefined'&&currentThesisState.isDirty,t=typeof currentThesisState!=='undefined'?currentThesisState.thesis:null;
  text($('notebook-status'),dirty?'Osparade ändringar · lokalt utkast, ingen ny version':t?'Sparad analys · redigera för att skapa en ny version':'Ingen sparad analys ännu');
  text($('notebook-saved'),t?`Senast sparad: ${formatRevisionDate(t.savedAt||t.updatedAt)} · ${t.revisionCount||1} versioner`:'Spara din tes för att börja versionshistoriken.');
  move($('notebookContinuity'),$('workspaceState'));move($('notebook-actions'),$('shellValuationRequired'));
  move($('notebookContinuity'),$('researchContinuity'));
  const c=window.NTMContinuityUI?.state();$('notebookRecovery').hidden=c?.state!=='blocked';if(c?.state==='blocked'){$('notebookContinuity').open=true;text($('notebook-status'),'Återställning eller läsfel behöver hanteras innan du sparar.');}
  $('notebookReviewLink').href=typeof currentStockData!=='undefined'&&currentStockData?.manual?'#thesisReview':'#researchSince';
  // Recovery controls must never disappear behind a quiet saved-state summary.
  if($('draftRestore')||$('draftDeleteCorrupt'))$('notebookContinuity').open=true;
  const since=$('researchSincePreview');text($('notebook-since'),since&&!since.hidden?[...since.children].filter(n=>n.tagName!=='A').map(n=>n.textContent).join(' '):'Efter en sparad version kan du granska nya uppgifter mot din tes.');
  const valid=typeof valuationState!=='undefined'&&valuationState.calculated&&!valuationState.stale;
  if(valid)testedOrigin=valuationState.priceSource==='example'?'Exempelpris, inte aktuell börskurs':valuationState.priceSource==='historical'?'Historiskt sparat pris, inte aktuell börskurs':'Manuellt pris, inte livekurs';
  $('valuationSection').dataset.resultState=valid?'current':valuationState?.calculated?'stale':'setup';
  text($('valuationResultState'),valid?'Beräknat med dina antaganden · inga prognoser':valuationState?.calculated?'Inaktuell beräkning · ändrade antaganden kräver ny beräkning':'Ingen giltig beräkning ännu');
  $('valuationResultState').hidden=$('valuationStatusBanner').style.display!=='none';
  if(!valuationState?.calculated)$('valuationAssumptions').open=true;
  $('valuationRecalculate').hidden=valid;
  const values=valuationState?.lastCalculatedInputs||{};
  text($('valuation-tested-basis'),valuationState?.calculated?`${testedOrigin}. Senast beräknat: ${values['val-price']} USD · EPS ${values['val-eps']} · ${values['val-years']} år · exit-P/E ${values['val-exit-pe']} · avkastningskrav ${values['val-return']} %. ${$('val-eps-basis-sub').textContent}.`:'Ange en giltig positiv EPS och dina antaganden för att beräkna.');
  for(const name of ['bear','base','bull']){text($('work-'+name+'-label'),`Aktiekurs efter ${values['val-years']??'–'} år`);text($('work-'+name+'-price'),$('sc-'+name+'-price').textContent);text($('work-'+name+'-returns'),`Årlig avkastning ${$('sc-'+name+'-cagr').textContent} · totalt ${$('sc-'+name+'-total-return').textContent}`);text($('work-'+name+'-inputs'),`EPS-tillväxt ${values['sc-'+name+'-growth']??'–'} % · exit-P/E ${values['sc-'+name+'-pe']??'–'}`);}
  const version=$('sensitivityTable').textContent;if(version!==tableVersion){tableVersion=version;const rows=[...$('sensitivityTable').querySelectorAll('tbody th')],cols=[...$('sensitivityTable').querySelectorAll('thead th')].slice(1);for(const [id,items] of [['sensitivityRow',rows],['sensitivityColumn',cols]]){const select=$(id);select.replaceChildren();items.forEach((item,i)=>{const option=make('option',item.textContent);option.value=i;select.append(option);});select.value='2';}drawSlice();}
  const banner=$('thesisStatusBanner');if(document.activeElement===$('thesisForm').querySelector('[type=submit]')&&banner.style.display!=='none'){const r=banner.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)banner.scrollIntoView({block:'nearest'});}
 }
 window.NTMAnalyticalWorkspaces={refresh,reveal};
 document.addEventListener('DOMContentLoaded',setup);
})();
