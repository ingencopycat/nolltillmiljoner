/* Presentation only: storage, lifecycle decisions and financial calculation stay in their owners. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const node = (tag, text, cls) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  };
  function workspace(data) {
    if (!$('thesisForm')) return;
    const { thesis } = window.NTMThesisStorage.get(data?.symbol);
    $('thesis-heading').textContent = thesis ? 'Din tes' : 'Formulera din tes';
    $('thesisForm').querySelector('[type=submit]').textContent = thesis ? 'Spara ny version' : 'Spara tes';
    const C=window.NTMContinuity;
    const lifecycle=window.NTMContinuityUI?.state() || C?.select({thesis,reasons:C.reasons(thesis,data?.manual?null:window.NTMChangeDetection.detect(thesis?.valuationSnapshot,data))});
    const primary = $('companyResearchAction');
    if(primary && lifecycle){primary.textContent=lifecycle.label;primary.href=lifecycle.href;}
    let summary = $('workspaceState');
    if (!summary) {
      summary = node('div', undefined, 'workspace-state'); summary.id = 'workspaceState';
      $('thesisForm').before(summary);
    }
    summary.replaceChildren(); summary.hidden = !thesis;
    if (!thesis) return;
    summary.append(node('span', `${thesis.revisionCount || 1} sparade versioner · ${lifecycle?.label || ''}`));
    for (const [text, href] of [['Granska tesen', '#thesisReview'], ['Versioner', '#thesisHistorySection']]) {
      const a = node('a', text); a.href = href; summary.append(a);
    }
  }
  function revenue(data) {
    const section = $('overviewRevenue');
    if (!section) return;
    section.hidden = true;
    // Only use the validated, existing annual series. No synthesis or interpolation.
    if (data.metadata?.qualityStatus !== 'validated' || data.company?.currency !== 'USD') return;
    const original = (data.annual || []).slice(-6);
    if (original.filter(a => Number.isFinite(a.metrics?.revenue?.value)).length < 2) return;
    if (original.some(a => a.metrics?.revenue?.value < 0)) return;
    const rows = [];
    for (const annual of original) {
      const previousYear = Number(rows.at(-1)?.period?.match(/^FY(\d{4})$/)?.[1]);
      const year = Number(annual.period?.match(/^FY(\d{4})$/)?.[1]);
      if (previousYear && year > previousYear && year - previousYear <= 10) {
        for (let missing = previousYear + 1; missing < year; missing++) rows.push({period: `FY${missing}`, metrics: {}});
      }
      rows.push(annual);
    }
    const max = Math.max(...rows.map(a => a.metrics?.revenue?.value || 0));
    if (!max) return;
    const plot = $('overviewRevenuePlot'); plot.replaceChildren();
    plot.setAttribute('role', 'group');
    plot.style.setProperty('--period-count', rows.length);
    plot.setAttribute('aria-label', `Årsintäkter i USD, ${rows[0].period} till ${rows.at(-1).period}. Exakta värden och källor finns i tabellen nedan.`);
    const table = node('table');
    const caption = node('caption', 'Bolagsrapporterade årsintäkter · USD'); table.append(caption);
    const head = node('thead'), header = node('tr');
    for (const label of ['Räkenskapsår', 'Intäkter (USD)', 'Källa']) { const th = node('th', label); th.scope = 'col'; header.append(th); }
    head.append(header); table.append(head); const body = node('tbody'); table.append(body);
    for (const annual of rows) {
      const metric = annual.metrics?.revenue, value = metric?.value;
      const available = Number.isFinite(value);
      const column = node('div', undefined, 'revenue-column');
      const slot = node('div', undefined, 'revenue-bar-slot');
      slot.append(node('span', available ? (value / 1e9).toLocaleString('sv-SE', {maximumFractionDigits: 1}) : '–', 'revenue-value'));
      if (available) {
        const bar = node('button', undefined, 'revenue-bar'); bar.type = 'button';
        bar.style.setProperty('--bar-height', (value/max*180)+'px');
        bar.setAttribute('aria-label', `${annual.period}: ${value.toLocaleString('sv-SE')} USD. Visa källa`);
        bar.title = bar.getAttribute('aria-label');
        bar.onclick = () => window.openProvenanceDialog(`Intäkter ${annual.period}`, metric);
        slot.append(bar);
      }
      column.append(slot, node('span', annual.period)); plot.append(column);
      const tr = node('tr'), period = node('th', annual.period); period.scope = 'row';
      tr.append(period, node('td', available ? value.toLocaleString('sv-SE') : 'Saknas'));
      const source = node('td');
      if (available) { const button = node('button', 'Visa källa', 'ghost-btn'); button.type = 'button'; button.setAttribute('aria-label', `Visa källa för intäkter ${annual.period}`); button.onclick = () => window.openProvenanceDialog(`Intäkter ${annual.period}`, metric); source.append(button); }
      else source.textContent = 'Underlag saknas';
      tr.append(source); body.append(tr);
    }
    $('overviewRevenueValues').replaceChildren(table);
    $('revenueHeading').textContent = data.metadata?.profile === 'financial_services' ? 'Nettointäkter över tid' : 'Intäkter över tid';
    let context = $('revenueContext');
    if (!context) {
      context = node('aside', undefined, 'revenue-context'); context.id = 'revenueContext';
      context.append(node('h3', 'Att läsa siffrorna'), node('p', 'Historiken visar rapporterade helår. Nyckeltalen ovan sammanfattar de senaste fyra kvartalen. Helår och TTM är olika perioder och visas separat.'));
      const link = node('a', 'Fördjupa i rapporterna'); link.href = '#researchFinancials'; context.append(link);
      section.append(context);
    }
    section.querySelector('.section-title-row > .note').textContent = 'Räkenskapsår · miljarder USD';
    section.hidden = false;
  }
  document.addEventListener('DOMContentLoaded', () => {
    window.NTMVisualV3 = { workspace, revenue };
    const search = $('companySearch');
    if (search) search.addEventListener('input', () => {
      const query = search.value.trim().toLocaleLowerCase('sv-SE'); let count = 0;
      document.querySelectorAll('#stockSwitcherPills a').forEach(a => {
        a.hidden = !!query && !a.textContent.toLocaleLowerCase('sv-SE').includes(query);
        if (!a.hidden) count++;
      });
      $('companySearchStatus').textContent = query ? count ? `${count} träffar i NTM:s urval.` : 'Inget bolag i urvalet. Du kan skapa en manuell tes nedan.' : '';
    });
    $('companyPicker')?.addEventListener('keydown', e => {
      if (e.key === 'Escape') { $('companyPicker').open = false; $('companyPicker').querySelector('summary').focus(); }
    });
    const header = $('companyHeaderCard');
    if (header) {
      const source = node('details', undefined, 'company-source-details');
      source.append(node('summary', 'SEC-data · källa och aktualitet'), $('companyLastUpdated'), $('companyCikPill'));
      header.querySelector('.source-stamp-wrap').append(source);
      const action = node('a', 'Formulera din tes', 'primary-btn company-action'); action.id = 'companyResearchAction'; action.href = '#thesisSection';
      header.querySelector('.source-stamp-wrap').prepend(action);
    }
    // Native anchor links also open nested depth, including links from other pages.
    const reveal = () => {
      const target = document.getElementById(location.hash.slice(1));
      if (!target) return;
      for (let el = target; el; el = el.parentElement) if (el.tagName === 'DETAILS') el.open = true;
    };
    window.addEventListener('hashchange', reveal); reveal();
  });
})();
