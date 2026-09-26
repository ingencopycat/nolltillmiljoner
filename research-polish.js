/* Shared evidence presentation. Original nodes, event handlers and source identity survive. */
(() => {
 'use strict';
 document.addEventListener('DOMContentLoaded', () => {
  const dialog = document.getElementById('provenanceDialog');
  const content = document.getElementById('provenanceDialogContent');
  const heading = document.getElementById('provenance-heading');
  if (!dialog || !content) return;
  const home = document.createComment('Shared evidence dialog');
  dialog.before(home);
  const selector = 'details.financial-sources:not(#fundamentalSources), details.insider-detail, details.ownership-detail';
  let selected = null;
  function decorate(root) {
   if (!(root instanceof Element)) return;
   const values = [...root.querySelectorAll('.observation-metric .observation-value, .segment-row:not(.segment-column-head) > strong')];
   for (const value of values) {
    if (value.querySelector('[data-evidence-open]')) continue;
    const section = value.closest('section');
    const sourceId = section?.id === 'companyKpis' ? 'kpiSources'
     : section?.id === 'companyObservations' ? 'observationSources'
     : section?.id === 'companySegments' ? 'segmentSources' : null;
    if (!sourceId) continue;
    const label = value.closest('article')?.querySelector('h3')?.textContent
     || value.parentElement.querySelector('.segment-name')?.textContent;
    const button = document.createElement('button'); button.type = 'button';
    button.dataset.evidenceOpen = sourceId; button.dataset.evidenceLabel = label || '';
    button.className = 'evidence-value'; button.setAttribute('aria-haspopup','dialog');
    button.setAttribute('aria-label', value.textContent + ' · Källor & metod: ' + label);
    button.textContent = value.textContent; value.replaceChildren(button);
   }
   const guidance = root.id === 'companyObservations' ? root : root.querySelector('#companyObservations');
   if (guidance && !guidance.querySelector('.context-help')) {
    const help = document.createElement('a');
    help.className = 'context-help'; help.href = 'fragor-svar-guidance.html';
    help.textContent = 'Förklara guidning'; guidance.querySelector('h2')?.after(help);
   }
   const items = [...root.querySelectorAll(selector)];
   if (root.matches(selector)) items.push(root);
   for (const item of items) {
    const summary = item.querySelector(':scope > summary');
    summary?.setAttribute('aria-haspopup', 'dialog');
    if (item.matches('.financial-sources')) {
     const title = item.closest('section')?.querySelector('h2')?.textContent;
     if (title) summary?.setAttribute('aria-label', 'Källor & metod: ' + title);
    }
   }
  }
  function restore() {
   if (!selected) return;
   const {details, marker, summary, focusRow} = selected;
   selected = null;
   details.classList.remove('contextual-evidence');
   details.open = false;
   focusRow?.removeAttribute('tabindex');
   if (marker.isConnected) marker.replaceWith(details);
   else details.remove();
   home.after(dialog);
   content.replaceChildren();
   heading.textContent = 'Källa och beräkning';
   if (summary.isConnected && !summary.closest('[hidden], [inert]')) summary.focus({preventScroll:true});
  }
  document.addEventListener('click', event => {
   const value = event.target.closest('[data-evidence-open]');
   const summary = value ? document.getElementById(value.dataset.evidenceOpen)?.querySelector(':scope > summary') : event.target.closest('summary');
   const details = summary?.parentElement;
   if (!details?.matches(selector) || dialog.contains(details) || dialog.open) return;
   if (typeof dialog.showModal !== 'function') return; // Native disclosure remains the fallback.
   event.preventDefault();
   const context = value?.dataset.evidenceLabel || details.closest('article')?.querySelector('h3,h4')?.textContent
    || details.closest('section')?.querySelector('h2')?.textContent || summary.textContent;
   const marker = document.createComment('Evidence return position');
   details.before(marker);
   selected = {details, marker, summary: value || summary};
   // Keep it within its original section so contextual links and scoped selectors retain identity.
   marker.after(dialog);
   content.replaceChildren(details);
   const tables = details.querySelectorAll('.observation-table-scroll,.segment-table-scroll,.capital-table-scroll');
   for (const table of tables) {
    table.tabIndex = 0; table.setAttribute('role','region');
    table.setAttribute('aria-label','Källtabell, rulla i sidled för alla kolumner');
   }
   if (tables.length) {
    const hint = document.createElement('p'); hint.className = 'evidence-scroll-hint';
    hint.textContent = 'Tabellen kan rullas i sidled för fler kolumner.'; content.prepend(hint);
   }
   details.classList.add('contextual-evidence');
   details.open = true; // Existing lazy report renderers run through their native toggle event.
   heading.textContent = 'Källor & metod · ' + context;
   dialog.showModal();
   document.getElementById('closeProvenanceDialog').focus();
   if (value) {
    const label = value.dataset.evidenceLabel.replace(' · non-GAAP','');
    const row = [...details.querySelectorAll('tbody tr')].find(node => node.textContent.includes(label));
    if (row) { row.tabIndex = -1; selected.focusRow = row; row.focus(); }
   }
  });
  dialog.addEventListener('close', () => { if (!dialog.open) restore(); });
  dialog.addEventListener('cancel', event => {
   if (!selected) return;
   event.preventDefault(); dialog.close(); restore();
  });
  document.getElementById('closeProvenanceDialog').addEventListener('click', () => {
   if (!dialog.open) restore();
  });
  dialog.addEventListener('keydown', event => {
   if (event.key !== 'Tab') return;
   const controls = [...dialog.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex="0"]')]
    .filter(node => !node.disabled && !node.closest('[hidden],[inert]') && node.getClientRects().length);
   const first = controls[0], last = controls.at(-1);
   if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
   else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  window.addEventListener('popstate', () => { if (selected) { dialog.close(); restore(); } });
  decorate(document.body);
  const sensitivity = document.getElementById('sensitivityDepth');
  if (sensitivity) {
   const help = document.createElement('a'); help.className = 'context-help';
   help.href = 'fragor-svar-valuation-sensitivity.html'; help.textContent = 'Förklara känslighetsanalys';
   sensitivity.append(help);
  }
  // Observe only newly mounted evidence, not values, attributes or chart updates.
  new MutationObserver(records => {
   if (selected && !selected.marker.isConnected) { dialog.close(); restore(); }
   for (const record of records) for (const node of record.addedNodes) decorate(node);
  }).observe(document.getElementById('researchDetail'), {childList:true, subtree:true});
 });
})();
