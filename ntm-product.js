/* BEGIN GENERATED ISSUER REGISTRY: scripts/issuer_registry.py */
(function(root) {
  'use strict';
  const issuers = Object.freeze([{"ticker":"NVDA","name":"NVIDIA CORP","cik":"0001045810","profile":"standard_company","displayName":"NVIDIA","relationName":"Nvidia","catalogOrder":1,"financial":true,"evidence":"verified","daily":true},{"ticker":"SOFI","name":"SoFi Technologies, Inc.","cik":"0001818874","profile":"financial_services","displayName":"SoFi Technologies","relationName":"SoFi","catalogOrder":0,"financial":true,"evidence":"verified","daily":true},{"ticker":"CRWD","name":"CrowdStrike Holdings, Inc.","cik":"0001535527","profile":"software_saas","displayName":"CrowdStrike Holdings","relationName":"CrowdStrike","catalogOrder":2,"financial":true,"evidence":"verified","daily":true},{"ticker":"MU","name":"MICRON TECHNOLOGY INC","cik":"0000723125","profile":"standard_company","displayName":"Micron Technology","relationName":"Micron","catalogOrder":3,"financial":true,"evidence":"unavailable","daily":false},{"ticker":"MRVL","name":"Marvell Technology, Inc.","cik":"0001835632","profile":"standard_company","displayName":"Marvell Technology","relationName":"Marvell","catalogOrder":4,"financial":true,"evidence":"unavailable","daily":false},{"ticker":"VRT","name":"Vertiv Holdings Co","cik":"0001674101","profile":"standard_company","displayName":"Vertiv Holdings","relationName":"Vertiv","catalogOrder":5,"financial":true,"evidence":"unavailable","daily":false},{"ticker":"COHR","name":"COHERENT CORP.","cik":"0000820318","profile":"standard_company","displayName":"Coherent","relationName":"Coherent","catalogOrder":6,"financial":true,"evidence":"unavailable","daily":false},{"ticker":"RKLB","name":"Rocket Lab Corp","cik":"0001819994","profile":"standard_company","displayName":"Rocket Lab","relationName":"Rocket Lab","catalogOrder":7,"financial":true,"evidence":"unavailable","daily":false},{"ticker":"TTMI","name":"TTM TECHNOLOGIES INC","cik":"0001116942","profile":"standard_company","displayName":"TTM Technologies","relationName":"TTM Technologies","catalogOrder":8,"financial":true,"evidence":"unavailable","daily":false},{"ticker":"SNDK","name":"Sandisk Corp","cik":"0002023554","profile":"limited_history","displayName":"Sandisk","relationName":"Sandisk","catalogOrder":9,"financial":true,"evidence":"unavailable","daily":false},{"ticker":"FLY","name":"Firefly Aerospace Inc.","cik":"0001860160","profile":"limited_history","displayName":"Firefly Aerospace","relationName":"Firefly Aerospace","catalogOrder":10,"financial":true,"evidence":"unavailable","daily":false},{"ticker":"CRWV","name":"CoreWeave, Inc.","cik":"0001769628","profile":"financing_sensitive","displayName":"CoreWeave","relationName":"CoreWeave","catalogOrder":11,"financial":true,"evidence":"unavailable","daily":false}].map(row => Object.freeze(row)));
  const byTicker = new Map(issuers.map(row => [row.ticker, row]));
  const get = ticker => byTicker.get(ticker) || null;
  const tickers = capability => issuers.filter(row => capability === 'evidence' ? row.evidence === 'verified' : ['financial','daily'].includes(capability) && row[capability] === true).map(row => row.ticker);
  root.NTMIssuerRegistry = Object.freeze({issuers, get, tickers,
    has: (ticker, capability) => tickers(capability).includes(ticker),
    catalog: () => issuers.filter(row => row.financial).slice().sort((a,b) => a.catalogOrder-b.catalogOrder).map(row => ({ticker:row.ticker, name:row.displayName}))});
})(typeof window !== 'undefined' ? window : globalThis);
/* END GENERATED ISSUER REGISTRY */
/* Provider-neutral, bounded, memory-only events. Never pass user input to emit(). */
(function (root) {
  'use strict';
  const names = new Set(['public_profile_created','profile_followed','public_analysis_published','public_analysis_unpublished','profile_report_submitted','user_search_used','landing_view', 'tool_opened', 'cta_clicked', 'calculator_completed',
    'academy_lesson_opened','academy_lesson_completed','academy_path_started','academy_path_completed','knowledge_search','knowledge_answer_opened','knowledge_related_cta_clicked','academy_search','academy_xp_earned','academy_level_reached','academy_scenario_complete','academy_challenge_complete','academy_case_complete','academy_path_complete','academy_tool_cta_clicked',
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
  if (typeof module !== 'undefined') module.exports = { registry: root.NTMIssuerRegistry, events: root.NTMEvents, status: root.NTMStatus };
  if (!root.document?.addEventListener) return;
  // Submit handlers can run while later scripts still delay DOMContentLoaded.
  // Capture the canonical, allowlisted context before exposing those interactions.
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
  root.document.addEventListener('DOMContentLoaded', () => {
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
        if (url.origin === root.location.origin && url.pathname.endsWith('/research.html') && root.NTMIssuerRegistry.tickers('financial').includes(url.searchParams.get('ticker'))) {
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
        if (!root.NTMIssuerRegistry.tickers('financial').includes(url.searchParams.get('ticker'))) return;
        url.searchParams.set('from', 'instagram'); url.searchParams.set('via', cta);
        url.hash = cta === 'counterevidence' ? 'thesis-trigger' : 'thesis-assumption-1';
        link.href = url.pathname + url.search + url.hash;
      });
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
