'use strict';
const artParams=new URLSearchParams(location.search);
const artVariant=['1','2','3'].includes(artParams.get('variant'))?artParams.get('variant'):'1';
document.documentElement.dataset.art=artVariant;
const artNames={'1':'Midnight / Electric','2':'Graphite / Ice','3':'Deep Navy / Blue-Violet'};
function artLinks(root=document){root.querySelectorAll('a[href^="#"]').forEach(a=>{const u=new URL(location.href);u.hash=a.getAttribute('href');a.href=u.href;});root.querySelectorAll('a[href*="prototype.html"]').forEach(a=>{const u=new URL(a.href);u.pathname=u.pathname.replace(/(?:a2\/)?prototype\.html$/,'a2/prototype.html');u.searchParams.set('variant',artVariant);u.searchParams.set('direction','a');a.href=u.href;});}
const artObserver=new MutationObserver(()=>{
 if(!document.documentElement.dataset.ready)return;
 artObserver.disconnect();
 document.title=`NTM — A2.${artVariant} ${artNames[artVariant]}`;
 const brand=document.querySelector('.brand');
 brand.insertAdjacentHTML('afterend','<span class="wordmark">Noll till miljoner<span>Oberoende perspektiv. Egna beslut.</span></span>');
 document.querySelector('.brand-description').remove();
 document.querySelector('.global-research').textContent='Research';
 const themeButton=document.querySelector('.theme-button');
 themeButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18V3Z" fill="currentColor"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
 const nav=document.querySelector('.navline');nav.insertAdjacentHTML('beforeend','<span class="nav-caption">Insikt börjar med underlaget.</span>');
 document.querySelectorAll('.primary').forEach(b=>{
  if(b.textContent.includes('→')||b.textContent.includes('↗')){b.innerHTML=b.textContent.replace(/\s*[→↗]/,'')+'<span class="button-arrow" aria-hidden="true">↗</span>';}
 });
 document.querySelectorAll('.source-icon').forEach(b=>{b.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 14 14 6M6 6h8v8" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';});
 document.querySelectorAll('.publication-label').forEach(e=>e.insertAdjacentHTML('afterbegin','<span class="report-mark" aria-hidden="true">NTM / R</span>'));
 document.querySelectorAll('.public-deck').forEach(e=>{e.innerHTML='Efterfrågan, investeringar<br class="desktop-only"> <em>och nästa fas av tillväxt.</em>';});
 document.querySelectorAll('.publication-header').forEach(e=>e.insertAdjacentHTML('beforeend','<span class="report-folio" aria-hidden="true">RESEARCH NOTE<br>NVDA / 2026</span>'));
 document.querySelectorAll('.bar').forEach((e,i)=>{if(artVariant==='1'&&i<2){e.style.fill='var(--bar)';e.style.stroke='var(--bar-stroke)';e.style.strokeWidth='1.5';}});
 document.querySelectorAll('.history').forEach(e=>{const f=e.querySelector('.chart-footer>span');if(f)f.textContent='Rapporterat · Helår · md USD';});
 document.querySelectorAll('.chart').forEach(svg=>svg.setAttribute('role','group'));
 document.querySelectorAll('.history').forEach(history=>{
  const tip=document.createElement('div');tip.className='chart-tooltip';tip.hidden=true;tip.setAttribute('aria-hidden','true');history.append(tip);
  const showTip=e=>{const mark=e.target.closest('g[data-action]');if(!mark)return;tip.textContent=mark.querySelector('title').textContent;tip.hidden=false;};
  history.addEventListener('pointerover',showTip);history.addEventListener('focusin',showTip);
  history.addEventListener('pointerleave',()=>tip.hidden=true);history.addEventListener('focusout',()=>tip.hidden=true);
 });
 document.querySelectorAll('[data-action="close-thesis"]').forEach(e=>e.classList.add('destructive-text'));
 document.querySelectorAll('footer>span:first-child').forEach(e=>e.textContent=`NTM / A2.${artVariant} — ${artNames[artVariant]}`);
 document.querySelector('footer').insertAdjacentHTML('beforeend','<button class="specimen-link" data-art-action="controls">Knappar & kontroller ↗</button>');
 artLinks();
 document.documentElement.dataset.artReady='true';
 if(artParams.get('controls')==='1')openArtControls();
});
artObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-ready']});
const artDialogObserver=new MutationObserver(()=>{artLinks(document.querySelector('#dialog'));document.querySelectorAll('[data-action="close-confirm"]').forEach(e=>e.classList.add('destructive'));});
artDialogObserver.observe(document.querySelector('#dialog'),{childList:true,subtree:true});
const artAnchorObserver=new MutationObserver(()=>{if(document.documentElement.dataset.artReady)artLinks();});
artAnchorObserver.observe(document.querySelector('#app'),{childList:true,subtree:true});
function openArtControls(){
 const dialog=document.querySelector('#dialog');
 dialog.classList.add('control-dialog');
 document.querySelector('#dialog-body').innerHTML=`<span class="eyebrow">A2.${artVariant} / INTERAKTIONSSTUDIE</span><h2 id="dialog-title">Samma språk.<br>Hela vägen till beslut.</h2><p class="small">Prova hover, tangentbordsfokus och aktivt läge. Knapparna nedan visar bara lokala exempel.</p><div class="control-buttons"><button class="primary" data-art-action="demo">Primär åtgärd <span class="button-arrow">↗</span></button><button class="secondary" data-art-action="demo">Sekundär</button><button class="tertiary" data-art-action="demo">Tertiär länk ↗</button><button class="destructive" data-art-action="demo">Avsluta tes</button><button class="primary" disabled>Inaktiverad</button></div><label for="control-search">Sök bolag</label><div class="input-with-icon"><span aria-hidden="true">⌕</span><input id="control-search" type="search" placeholder="NVIDIA / NVDA"></div><label for="control-note">Eget antagande</label><textarea id="control-note" rows="2" placeholder="Vad behöver vara sant?"></textarea><div class="semantic-states"><span class="positive">+ Positiv förändring</span><span class="negative">− Negativ förändring</span><span class="warning">! Granskning krävs</span></div><details><summary>Underlag & källor <span>+</span></summary><p class="small">Disclosures använder samma regler, typografi och fokus som resten av rapporten.</p></details><p id="control-status" role="status" class="small"></p>`;
 if(!dialog.open)dialog.showModal();
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-art-action]');if(!b)return;if(b.dataset.artAction==='controls')openArtControls();else document.querySelector('#control-status').textContent='Exempel aktiverat. Ingen tes eller publicering ändras.';});
document.querySelector('#dialog').addEventListener('close',()=>document.querySelector('#dialog').classList.remove('control-dialog'));
