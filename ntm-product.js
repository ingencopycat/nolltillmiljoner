/* Provider-neutral, bounded, memory-only events. Never pass user input to emit(). */
(function (root) {
  'use strict';
  const names = new Set(['landing_view', 'tool_opened', 'cta_clicked', 'calculator_completed',
    'research_opened', 'valuation_calculated', 'thesis_first_saved', 'assumptions_added',
    'review_date_set', 'thesis_reviewed', 'outcome_checkpoint_saved', 'content_to_tool',
    'backup_exported', 'backup_imported', 'delete_completed', 'delete_error', 'relation_click', 'fire_stress_view_opened', 'savings_plan_observation_saved', 'stock_purchase_thesis_prompt_clicked', 'fx_explanation_opened']);
  const fields = {
    category: ['home', 'content', 'tools', 'research', 'local', 'trust', 'calendar', 'resources', 'other'],
    tool: ['compound', 'fees', 'leverage', 'valuation', 'return', 'purchase', 'goal', 'mortgage', 'fire', 'tax', 'recovery', 'fx', 'research', 'local'],
    source: ['direct_or_unknown', 'search', 'instagram', 'content', 'home'],
    cta: ['assumption', 'counterevidence', 'followup', 'ai_reverse', 'memory_scenarios', 'ai_thesis', 'home_calculator', 'home_research'],
    action: ['keep', 'revise', 'close', 'abstain'],
    result: ['success', 'error'],
    relation_type: ['learn', 'try', 'research', 'related', 'source', 'continue', 'discuss'],
    source_surface: ['content', 'tools', 'research'],
    destination_type: ['content', 'video', 'tool', 'calculator', 'research', 'learn', 'macro', 'workflow', 'community']
  };
  const routes = {
    'ranta-pa-ranta.html': 'compound', 'avgifter.html': 'fees', 'havstang.html': 'leverage',
    'aktievarderingskalkylator.html': 'valuation', 'avkastningskalkylator.html': 'return',
    'aktiekopskalkylator.html': 'purchase', 'sparmalskalkylator.html': 'goal',
    'bolanekalkylator.html': 'mortgage', 'fire-kalkylator.html': 'fire',
    'isk-skattkalkylator.html': 'tax', 'aterhamtning.html': 'recovery',
    'valutajusterad-avkastning.html': 'fx', 'research.html': 'research', 'min-ntm.html': 'local'
  };
  const queue = [], listeners = new Set();
  let context = {};
  function emit(name, metadata = {}) {
    if (!names.has(name) || !metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return false;
    // Fail closed on unknown keys AND values, even if mixed with valid metadata.
    const own = Object.getOwnPropertyDescriptors(metadata);
    if (Object.getOwnPropertySymbols(metadata).length || Object.entries(own).some(([key, desc]) =>
      !Object.hasOwn(fields, key) || !Object.hasOwn(desc, 'value') || !fields[key].includes(desc.value))) return false;
    const event = Object.freeze({ event: name, ...context, ...metadata });
    queue.push(event); if (queue.length > 100) queue.shift();
    listeners.forEach(fn => { try { fn(event); } catch (_) { /* Metrics cannot break a task. */ } });
    return true;
  }
  const labels = Object.freeze({ neutral: 'Redo att beräkna', calculated: 'Beräknat', stale: 'Behöver räknas om',
    saved: 'Sparat lokalt', warning: 'Observera', error: 'Kunde inte slutföras', manual: 'Manuell uppgift',
    derived: 'Härledd beräkning', unavailable: 'Uppgift saknas', unsafe: 'Inte jämförbart', local: 'Endast i denna webbläsare' });
  function status(node, state, message) {
    if (!node || !Object.hasOwn(labels, state)) return false;
    node.setAttribute('data-ntm-status', state);
    node.setAttribute('role', 'status'); node.setAttribute('aria-live', 'polite');
    node.textContent = labels[state] + (message ? ' · ' + message : '');
    return true;
  }
  root.NTMStatus = Object.freeze({ set: status, labels });
  root.NTMEvents = Object.freeze({ emit, snapshot: () => queue.slice(),
    subscribe(fn) { if (typeof fn !== 'function') return () => {}; listeners.add(fn); return () => listeners.delete(fn); } });
  if (typeof module !== 'undefined') module.exports = { events: root.NTMEvents, status: root.NTMStatus };
  if (!root.document?.addEventListener) return;
  root.document.addEventListener('DOMContentLoaded', () => {
    const file = root.location.pathname.split('/').pop() || 'index.html', tool = routes[file];
    const category = file === 'index.html' ? 'home' : file.startsWith('post-') || file === 'inlagg.html' ? 'content'
      : tool === 'research' ? 'research' : tool === 'local' ? 'local' : tool || file === 'verktyg.html' ? 'tools'
      : file === 'om-metod.html' ? 'trust' : ['makro.html', 'rapporter.html'].includes(file) ? 'calendar'
      : file === 'resurser.html' ? 'resources' : 'other';
    const params = new URLSearchParams(root.location.search);
    const source = ['instagram', 'content', 'home'].includes(params.get('from')) ? params.get('from') : 'direct_or_unknown';
    context = { category, source, ...(tool ? { tool } : {}) };
    const cta = params.get('via'); if (fields.cta.includes(cta)) context.cta = cta;
    if (source === 'direct_or_unknown') {
      try { if (['www.google.com', 'www.google.se', 'www.bing.com', 'duckduckgo.com'].includes(new URL(root.document.referrer).hostname)) context.source = 'search'; } catch (_) { /* Unknown is honest. */ }
    }
    emit('landing_view'); if (tool) emit('tool_opened');
    root.document.addEventListener('click', event => {
      const relation = event.target.closest?.('a[data-relation-id]');
      if (relation?.dataset.relationId === 'purchase-thesis') emit('stock_purchase_thesis_prompt_clicked');
      if (relation) emit('relation_click', { relation_type: relation.dataset.relationType,
        source_surface: category, destination_type: relation.dataset.destinationType });
      const link = event.target.closest?.('a[data-ntm-cta]');
      if (link) emit(category === 'content' ? 'content_to_tool' : 'cta_clicked', { cta: link.dataset.ntmCta });
      // Carry only the selected public flow through the company/review chooser, including async queue links.
      const next = event.target.closest?.('a[href]');
      if (next && ['research', 'local'].includes(category) && ['instagram', 'home', 'content'].includes(source) && fields.cta.includes(cta)) {
        const url = new URL(next.href, root.location.href);
        if (url.origin === root.location.origin && url.pathname.endsWith('/research.html') && ['NVDA', 'SOFI', 'CRWD'].includes(url.searchParams.get('ticker'))) {
          url.searchParams.set('from', source); url.searchParams.set('via', cta);
          next.href = url.pathname + url.search + url.hash;
        }
      }
    });
    if (source === 'instagram' && ['assumption', 'counterevidence', 'followup'].includes(cta)) {
      const intro = root.document.createElement('aside'); intro.className = 'card journey-intro';
      const copy = { assumption: 'Ett antagande: välj ett bolag, skriv vad som måste bli sant och ange när du vill granska det.',
        counterevidence: 'Ett motbevis: välj ett bolag och skriv vad som skulle få dig att ändra tesen. Pröva även ett svagare scenario.',
        followup: 'En uppföljning: öppna en sparad tes i Att granska. Jämför underlaget och välj Behåll, Revidera eller Stäng. Utan sparade teser kan du börja i Research.' };
      intro.textContent = copy[cta]; root.document.querySelector('main')?.prepend(intro);
      root.document.querySelectorAll('a[href^="research.html?ticker="]').forEach(link => {
        const url = new URL(link.href);
        if (!['NVDA', 'SOFI', 'CRWD'].includes(url.searchParams.get('ticker'))) return;
        url.searchParams.set('from', 'instagram'); url.searchParams.set('via', cta);
        url.hash = cta === 'counterevidence' ? 'thesis-trigger' : 'thesis-assumption-1';
        link.href = url.pathname + url.search + url.hash;
      });
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
