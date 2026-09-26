/* Presentation-only entry and bounded selector. No account, journal or data writes. */
(function (root) {
  'use strict';
  const companies = (typeof module !== 'undefined' ? require('./ntm-product.js').registry : root.NTMIssuerRegistry).catalog();
  const pageSize = 20;
  const normalize = value => String(value || '').trim().toLocaleLowerCase('sv-SE');
  const collator = new Intl.Collator('sv-SE');
  const compare = (a, b) => collator.compare(a.name, b.name) || collator.compare(a.ticker, b.ticker);
  const letter = company => company.name.trim()[0].toLocaleUpperCase('sv-SE');
  function search(universe, query) {
    const q = normalize(query);
    if (!q) return [];
    return universe.map(company => {
      const ticker = normalize(company.ticker), name = normalize(company.name);
      return {company, matches: ticker.includes(q) || name.includes(q),
        rank: ticker === q ? 0 : ticker.startsWith(q) ? 1 : name.startsWith(q) ? 2 : 3};
    }).filter(row => row.matches).sort((a, b) => a.rank - b.rank || compare(a.company, b.company)).map(row => row.company);
  }
  function groups(universe) { return [...new Set(universe.map(letter))].sort((a, b) => a.localeCompare(b, 'sv-SE')); }
  function recent(universe, theses, tools, now = Date.now()) {
    const available = new Map(universe.map(c => [c.ticker, c]));
    const rows = new Map();
    function add(ticker, date, saved) {
      const time = Date.parse(date);
      if (!/^[A-Z0-9.-]{1,80}$/.test(ticker || '') || ticker === 'ALL' || !Number.isFinite(time) || time > now) return;
      // An unknown visit alone is not proof of a usable manual journal.
      if (!available.has(ticker) && !saved) return;
      const previous = rows.get(ticker);
      if (!previous || time > previous.time) rows.set(ticker, {ticker, name: saved?.companyName || available.get(ticker)?.name || ticker,
        time, manual: !available.has(ticker), saved: !!saved});
    }
    for (const [ticker, thesis] of Object.entries(theses || {})) add(ticker, thesis.updatedAt, thesis);
    for (const tool of tools || []) {
      const match = /^research\.html\?ticker=([A-Z0-9.-]+)$/.exec(tool.url || '');
      if (match) add(match[1], tool.lastUsedAt, theses?.[match[1]]);
    }
    return [...rows.values()].sort((a, b) => b.time - a.time || compare(a, b)).slice(0, 3);
  }
  const api = {companies, pageSize, search, groups, recent};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root.document) return;
  const $ = id => root.document.getElementById(id);
  const node = (tag, text) => { const n = root.document.createElement(tag); if (text !== undefined) n.textContent = text; return n; };
  let initialized = false, selected = null, state = 'INITIALIZING', recentRows = [], universe = companies;
  let searchPage = 0, browsePage = 0, activeLetter = '';
  function href(row) {
    const url = new URL('research.html', root.location.href);
    url.searchParams.set('ticker', row.ticker);
    if (row.saved) url.hash = 'thesisSection';
    const params = new URLSearchParams(root.location.search);
    // Preserve the existing bounded public entry flow for dynamically created links.
    if (params.get('from') === 'instagram' && ['assumption', 'counterevidence'].includes(params.get('via'))) {
      url.searchParams.set('from', 'instagram'); url.searchParams.set('via', params.get('via'));
      url.hash = params.get('via') === 'counterevidence' ? 'thesis-trigger' : 'thesis-assumption-1';
    }
    return 'research.html' + url.search + url.hash;
  }
  function renderRows(list, rows) {
    list.replaceChildren();
    for (const row of rows) {
      const li = node('li'), link = node('a', `${row.ticker} — ${row.name}`);
      link.href = href(row); link.dataset.ticker = row.ticker;
      if (row.ticker === selected?.symbol) link.setAttribute('aria-current', 'page');
      li.append(link);
      if (row.manual) li.append(node('small', 'Manuell tes · ingen automatisk SEC-data'));
      else if (row.saved) li.append(node('small', 'Sparad tes'));
      if (row.time) li.append(node('small', (row.saved ? 'Senast använd ' : 'Besökt ') + new Date(row.time).toLocaleDateString('sv-SE')));
      list.append(li);
    }
  }
  function paginate(id, count, page, change) {
    const container = $(id); container.replaceChildren();
    if (count <= pageSize) return;
    for (const [label, next, disabled] of [['Föregående', page - 1, page === 0], ['Nästa', page + 1, (page + 1) * pageSize >= count]]) {
      const button = node('button', label); button.type = 'button'; button.disabled = disabled;
      button.onclick = () => { change(next); $(id === 'companySearchPages' ? 'stockSwitcherPills' : 'companyBrowseResults').querySelector('a')?.focus(); };
      container.append(button);
    }
  }
  function renderSearch() {
    const q = $('companySearch').value, rows = search(universe, q), start = searchPage * pageSize;
    renderRows($('stockSwitcherPills'), rows.slice(start, start + pageSize));
    $('companySearchStatus').textContent = !q.trim() ? '' : rows.length ? `${rows.length} träffar. Visar ${start + 1}–${Math.min(start + pageSize, rows.length)}.` : 'Inget bolag i urvalet. Prova en annan sökning eller skapa en manuell tes nedan.';
    paginate('companySearchPages', rows.length, searchPage, page => { searchPage = page; renderSearch(); });
    $('companyBrowse').hidden = !!q.trim();
    $('companyRecent').hidden = !!q.trim() || !recentRows.length;
  }
  function renderBrowse() {
    const compact = universe.length <= pageSize;
    const rows = (compact ? [...universe] : universe.filter(c => letter(c) === activeLetter)).sort(compare), start = browsePage * pageSize;
    $('companyLetters').hidden = compact;
    renderRows($('companyBrowseResults'), rows.slice(start, start + pageSize));
    $('companyBrowseStatus').textContent = `${compact ? 'Automatisk bolagsdata' : activeLetter}: ${rows.length} bolag. Visar ${start + 1}–${Math.min(start + pageSize, rows.length)}.`;
    $('companyLetters').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.textContent === activeLetter)));
    paginate('companyBrowsePages', rows.length, browsePage, page => { browsePage = page; renderBrowse(); });
  }
  function refreshRecent() {
    const saved = root.NTMThesisStorage?.all(), visits = root.NTMRecentTools?.read();
    $('companyRecentError').hidden = !saved?.error;
    recentRows = recent(universe, saved?.theses, visits?.tools);
    renderRows($('companyRecentList'), recentRows);
    renderSearch();
    if (state === 'NO_COMPANY' || state === 'RETURNING_RESEARCH') {
      state = recentRows.length ? 'RETURNING_RESEARCH' : 'NO_COMPANY';
      $('main-content').dataset.entryState = state;
    }
  }
  function show(next, company = null) {
    if (!initialized) return;
    state = next; selected = company;
    const noCompany = next === 'NO_COMPANY' || next === 'RETURNING_RESEARCH';
    if (noCompany && recentRows.length) state = 'RETURNING_RESEARCH';
    $('main-content').dataset.entryState = state;
    $('researchEntryIntro').hidden = !noCompany;
    const picker = $('companyPicker'); picker.hidden = false;
    picker.classList.toggle('company-picker-entry', noCompany);
    picker.querySelector('summary').textContent = company ? `Byt bolag · ${company.symbol}` : 'Sök/välj bolag';
    picker.open = noCompany || next === 'LOAD_FAILURE';
    $('researchLoading').querySelector('p').textContent = next === 'DIRECT_TICKER' ? 'Hämtar normaliserad bolagsdata…' : 'Förbereder Research…';
  }
  function init() {
    if (initialized) return;
    initialized = true;
    $('main-content').dataset.entryState = state;
    const readError = node('p', 'Sparat arbete kunde inte läsas på den här enheten. ');
    readError.id = 'companyRecentError'; readError.hidden = true; readError.setAttribute('role', 'status');
    const recover = node('a', 'Öppna Min NTM för återställning och backup'); recover.href = 'min-ntm.html'; readError.append(recover);
    $('companyBrowse').before(readError, $('companyRecent'));
    refreshRecent();
    const picker = $('companyPicker'), input = $('companySearch');
    input.addEventListener('input', () => { searchPage = 0; renderSearch(); });
    picker.addEventListener('toggle', () => {
      if (picker.open && root.document.activeElement === picker.querySelector('summary')) input.focus();
    });
    picker.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selected || state === 'DIRECT_TICKER') { picker.open = false; picker.querySelector('summary').focus(); }
        else { input.value = ''; searchPage = 0; renderSearch(); input.focus(); }
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
      const list = e.target.closest('.company-results');
      const links = [...(list || $('stockSwitcherPills')).querySelectorAll('a')];
      if (e.target !== input && !list) return;
      if (e.target === input && e.key !== 'ArrowDown') return;
      if (!links.length) return;
      e.preventDefault();
      const index = links.indexOf(e.target);
      if (e.key === 'ArrowUp' && index === 0 && list?.id === 'stockSwitcherPills') input.focus();
      else links[e.key === 'Home' ? 0 : e.key === 'End' ? links.length - 1 : Math.max(0, Math.min(links.length - 1, index + (e.key === 'ArrowUp' ? -1 : 1)))].focus();
    });
    $('companyBrowse').addEventListener('toggle', () => {
      if (!$('companyBrowse').open) return;
      if (!$('companyLetters').children.length) {
        const letters = groups(universe); activeLetter = letters[0];
        for (const group of letters) {
          const b = node('button', group); b.type = 'button'; b.setAttribute('aria-controls', 'companyBrowseResults');
          b.onclick = () => { activeLetter = group; browsePage = 0; renderBrowse(); }; $('companyLetters').append(b);
        }
      }
      renderBrowse();
    });
    root.addEventListener('storage', e => {
      if ([root.NTMThesisStorage?.key, root.NTMRecentTools?.key].includes(e.key) || e.key === null) refreshRecent();
    });
  }
  root.NTMResearchEntry = {...api, init, show};
})(typeof window !== 'undefined' ? window : globalThis);
