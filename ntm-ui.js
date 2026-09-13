/* Presentation-only enhancements. No calculation, storage or analytics ownership. */
(() => {
  if (!document.addEventListener) return;
  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.main-nav');
    const menu = document.getElementById('mobileNavToggle');
    const learn = document.querySelector('.nav-learn');
    function closeMenus(returnFocus = false) {
      const focusedInside = nav?.contains(document.activeElement);
      if (learn) learn.open = false;
      if (nav) nav.classList.remove('open');
      menu?.setAttribute('aria-expanded', 'false');
      if (returnFocus && focusedInside) menu?.focus();
    }
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (learn?.open && !nav?.classList.contains('open')) {
        learn.open = false; learn.querySelector('summary')?.focus();
      } else closeMenus(true);
    });
    document.addEventListener('click', event => {
      if (nav && !nav.contains(event.target) && !menu?.contains(event.target)
          && !document.getElementById('themeToggle')?.contains(event.target)) closeMenus();
    });
    document.querySelectorAll('[data-metrics-toggle]').forEach(button => {
      const grid = document.getElementById(button.getAttribute('aria-controls'));
      button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', String(expanded));
        grid.dataset.metrics = expanded ? 'all' : 'compact';
        button.textContent = expanded ? 'Visa färre nyckeltal' : 'Visa alla nyckeltal';
      });
    });
    function reveal(target) {
      if (!target) return;
      let parent = target.parentElement;
      while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
      if (target.tagName === 'DETAILS') target.open = true;
    }
    document.querySelectorAll('.section-local-nav a').forEach(link => {
      const target = document.getElementById(link.hash.slice(1));
      link.addEventListener('click', () => reveal(target));
      if (target && ['thesisHistorySection', 'outcomeSection'].includes(target.id)) {
        const sync = () => { link.hidden = target.hidden; };
        sync(); new MutationObserver(sync).observe(target, { attributes: true, attributeFilter: ['hidden'] });
      }
    });
    // Focus via validation or a deep link must not be trapped behind a closed disclosure.
    document.addEventListener('focusin', event => { if (!event.target.closest('summary')) reveal(event.target); });
    document.addEventListener('invalid', event => reveal(event.target), true);
    document.querySelectorAll('details.depth-panel').forEach(panel => {
      panel.addEventListener('toggle', () => {
        if (panel.open && typeof Chart !== 'undefined') requestAnimationFrame(() => {
          Object.values(Chart.instances).forEach(chart => { if (panel.contains(chart.canvas)) chart.resize(); });
        });
      });
    });
    document.querySelectorAll('.table-wrap, .table-wrapper, .stock-scenario-table-wrap, .sensitivity-table-wrap').forEach(wrap => {
      wrap.classList.add('financial-scroll'); wrap.setAttribute('tabindex', '0'); wrap.setAttribute('role', 'region');
      if (!wrap.hasAttribute('aria-label') && !wrap.hasAttribute('aria-labelledby')) wrap.setAttribute('aria-label', 'Finansiell tabell. Rulla i sidled för fler kolumner.');
    });
    if (location.hash) reveal(document.getElementById(location.hash.slice(1)));
    // Existing shared links can restore scenarios directly. Keep their controls discoverable.
    if (new URLSearchParams(location.search).has('scenario')) document.querySelectorAll('[data-scenario-depth]').forEach(panel => { panel.open = true; });
  });
})();
