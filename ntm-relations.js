/* Canonical public relation catalog + shared static/runtime renderer. No private state. */
(function (root) {
  'use strict';
  const concepts = ['cagr', 'pe', 'eps', 'fcf', 'dilution', 'valuation', 'compounding',
    'fees', 'currency', 'inflation', 'interest-rates', 'ai', 'semiconductors', 'crypto', 'risk', 'thesis'];
  const types = ['content', 'video', 'tool', 'calculator', 'research', 'learn', 'macro', 'workflow', 'community'];
  const relationTypes = ['learn', 'try', 'research', 'related', 'source', 'continue', 'discuss'];
  const supportedTickers = ['NVDA', 'SOFI', 'CRWD'];
  const postMetadata = {
    'jordi-visser-linjart-exponentiellt-ai-trading': { concepts: ['ai', 'valuation', 'risk'], themes: ['ai-infrastructure'] },
    'jordi-visser-anthony-pompliano-ai-krypto-makro': { concepts: ['ai', 'crypto', 'interest-rates'], themes: ['macro'] },
    'jordi-visser-ai-agents-crypto': { tickers: ['NVDA'], companies: ['NVIDIA'], concepts: ['ai', 'crypto', 'interest-rates'], themes: ['ai-infrastructure', 'macro'] },
    'micron-ai-memory': { tickers: ['MU'], companies: ['Micron'], concepts: ['semiconductors', 'ai', 'valuation', 'eps'], themes: ['ai-infrastructure'] },
    'ai-portfolj': { tickers: ['NVDA'], companies: ['NVIDIA'], concepts: ['ai', 'semiconductors', 'risk', 'thesis'], themes: ['ai-infrastructure'] }
  };
  function entity(id, type, title, url, extra = {}) {
    return { id, type, title, url, status: 'published', tags: [], tickers: [], companies: [], concepts: [], themes: [], ...extra };
  }
  function edge(id, from, to, type, priority, reason, cta, extra = {}) {
    return { id, from, to, type, priority, reason, cta, ...extra };
  }
  const relations = [
    edge('purchase-thesis', 'tool-purchase', 'workflow-manual-thesis', 'continue', 10, 'Har din tes förändrats? Skriv eller öppna dina antaganden före ett tilläggsköp.', 'Öppna Research och din tes'),
    edge('compound-followup', 'tool-compound', 'workflow-goal-followup', 'continue', 25, 'Spara en originalplan och jämför senare med egna observationer.', 'Följ upp ett sparmål'),
    edge('exponential-reverse', 'post-jordi-visser-linjart-exponentiellt-ai-trading', 'tool-reverse', 'try', 10,
      'Videons AI-tillväxt säger inte vad en aktie är värd. Testa vilken EPS-tillväxt dina egna pris- och avkastningsantaganden kräver.', 'Pröva omvänd värdering', { legacyCta: 'ai_reverse' }),
    edge('micron-scenarios', 'post-micron-ai-memory', 'tool-scenarios', 'try', 10,
      'Pröva lägre och högre vinsttillväxt och multiplar med egna, kontrollerade värden. Micron ingår inte i NTM Research; videons siffror fylls inte i.', 'Jämför tre värderingsscenarier', { legacyCta: 'memory_scenarios' }),
    edge('portfolio-thesis', 'post-ai-portfolj', 'workflow-nvda-thesis', 'continue', 10,
      'Portföljens AI-tema nämner Nvidia. Skriv vad som måste bli sant och vad som skulle få dig att ändra dig. En arbetsövning, ingen köprekommendation.', 'Skriv en egen Nvidia-tes i Research', { legacyCta: 'ai_thesis' }),
    edge('portfolio-fx', 'post-ai-portfolj', 'tool-fx', 'try', 20,
      'När en investering räknas i USD påverkar även valutan utfallet i SEK. Pröva aktie- och valutaförändringen separat.', 'Räkna på valutans effekt'),
    edge('jordi-anthony-macro', 'post-jordi-visser-anthony-pompliano-ai-krypto-makro', 'macro-calendar', 'related', 20,
      'Följ publiceringar om inflation och arbetsmarknad när du granskar videons makroresonemang. Kalendern verifierar inte videons slutsatser.', 'Öppna makrokalendern'),
    edge('jordi-anthony-reverse', 'post-jordi-visser-anthony-pompliano-ai-krypto-makro', 'tool-reverse', 'try', 10,
      'Skilj ett AI-tema från aktiens pris. Pröva vilken vinsttillväxt dina egna värderingsantaganden kräver.', 'Testa tillväxtkravet'),
    edge('agents-nvda', 'post-jordi-visser-ai-agents-crypto', 'research-nvda', 'research', 10,
      'Videon lyfter Nvidia som en signal för AI-infrastruktur. Granska rapporterade bolagsdata och pröva egna scenarier.', 'Analysera Nvidia i Research'),
    edge('agents-macro', 'post-jordi-visser-ai-agents-crypto', 'macro-calendar', 'related', 20,
      'Sätt resonemanget om räntor och inflation i ett publiceringssammanhang. Se vilka makrouppgifter som kommer härnäst.', 'Följ makropubliceringarna'),
    edge('valuation-nvda', 'tool-valuation', 'research-nvda', 'research', 10,
      'Prova samma värderingsfrågor med Nvidias rapporterade SEC-data. Aktiekursen är ett manuellt exempel, inte en livekurs.', 'Öppna Nvidia Research'),
    edge('valuation-video', 'tool-valuation', 'post-jordi-visser-linjart-exponentiellt-ai-trading', 'related', 30,
      'Fördjupa resonemanget om linjär och exponentiell tillväxt. Videons perspektiv ersätter inte egna värderingsantaganden.', 'Se Jordi Vissers tillväxtresonemang'),
    edge('valuation-pe-learn', 'tool-valuation', 'learn-pe', 'learn', 20, 'Förstå hur pris och vinst kopplas ihop.', 'Lär dig P/E'),
    edge('reverse-nvda', 'tool-reverse', 'research-nvda', 'research', 10, 'Jämför tillväxtkravet med rapporterade bolagsdata och egna scenarier.', 'Öppna Nvidia Research'),
    edge('scenarios-nvda', 'tool-scenarios', 'research-nvda', 'research', 10, 'Pröva scenarier mot rapporterade bolagsdata för ett bolag som stöds.', 'Öppna Nvidia Research'),
    edge('fees-compound', 'tool-fees', 'tool-compound', 'try', 10,
      'Ta nästa steg från avgiftsskillnaden: pröva sparbelopp, avgift och inflation tillsammans över tid.', 'Räkna på hela sparandet'),
    edge('compound-fees', 'tool-compound', 'tool-fees', 'try', 10,
      'Isolera avgiftens effekt genom att jämföra två avgiftsnivåer med samma sparande och avkastning.', 'Jämför två avgifter'),
    edge('compound-learn', 'tool-compound', 'learn-compounding', 'learn', 20, 'Förstå hur avkastning kan ge ny avkastning.', 'Lär dig ränta på ränta'),
    edge('fx-return', 'tool-fx', 'tool-return', 'try', 10,
      'Har du start- och slutvärde i samma valuta? Räkna även ut periodens årliga avkastning, CAGR.', 'Beräkna årlig avkastning'),
    edge('fx-learn', 'tool-fx', 'learn-currency', 'learn', 20, 'Förstå hur valutakursen påverkar avkastningen i SEK.', 'Lär dig valutarisk'),
    edge('return-fx', 'tool-return', 'tool-fx', 'try', 10,
      'En avkastning i USD är inte samma sak som utfallet i SEK. Lägg till valutans förändring i en separat beräkning.', 'Räkna om med valutans effekt'),
    edge('return-learn', 'tool-return', 'learn-cagr', 'learn', 20, 'Förstå hur en flerårig avkastning uttrycks som årstakt.', 'Lär dig CAGR'),
    edge('nvda-thesis', 'research-nvda', 'workflow-nvda-thesis', 'continue', 10,
      'Skriv vad som måste bli sant och ange när du vill granska tesen. Sparandet sker först när du väljer Spara ny version.', 'Formulera eller granska din Nvidia-tes'),
    edge('nvda-valuation', 'research-nvda', 'tool-valuation', 'try', 20,
      'Pröva en fristående värdering med egna ingångsvärden. Din Research-analys förs inte över automatiskt.', 'Öppna värderingskalkylatorn'),
    edge('nvda-content', 'research-nvda', 'post-jordi-visser-ai-agents-crypto', 'related', 30,
      'Jordi Visser diskuterar Nvidia och AI-infrastruktur. Läs resonemanget som ett perspektiv att pröva mot din tes.', 'Läs om AI-infrastruktur och Nvidia'),
    ...['sofi', 'crwd'].flatMap(ticker => [
      edge(ticker + '-thesis', 'research-' + ticker, 'workflow-' + ticker + '-thesis', 'continue', 10,
        'Formulera dina antaganden och välj en tid för egen granskning. Ingen tes sparas automatiskt.', 'Formulera eller granska din tes'),
      edge(ticker + '-valuation', 'research-' + ticker, 'tool-valuation', 'try', 20,
        'Pröva egna vinst- och multipelantaganden fristående. Saknad eller negativ EPS behöver bedömas; inga Research-värden förs över.', 'Pröva en fristående värdering'),
      edge(ticker + '-fx', 'research-' + ticker, 'tool-fx', 'try', 25,
        'För ett utfall i SEK behöver du även ta hänsyn till USD/SEK. Beräkna valutans effekt separat.', 'Räkna på USD/SEK-effekten')
    ])
  ];
  const placements = {
    'aktievarderingskalkylator.html': ['tool-valuation'], 'avgifter.html': ['tool-fees'],
    'ranta-pa-ranta.html': ['tool-compound'], 'valutajusterad-avkastning.html': ['tool-fx'],
    'avkastningskalkylator.html': ['tool-return'],
    'aktiekopskalkylator.html': ['tool-purchase'],
    'research.html': ['research-nvda', 'research-sofi', 'research-crwd']
  };
  function catalog(posts) {
    const entities = [
      entity('tool-purchase', 'calculator', 'Aktieköp och GAV', 'aktiekopskalkylator.html', { concepts: ['fees', 'thesis'] }),
      entity('workflow-manual-thesis', 'workflow', 'Din investeringstes', 'research.html#manualThesisEntry', { concepts: ['thesis'] }),
      entity('workflow-goal-followup', 'workflow', 'Sparmål och uppföljning', 'sparmalskalkylator.html#goal-followup', { concepts: ['compounding'] }),
      entity('tool-valuation', 'calculator', 'Aktievärdering', 'aktievarderingskalkylator.html', { concepts: ['valuation', 'pe', 'eps', 'cagr'] }),
      entity('tool-reverse', 'calculator', 'Omvänd värdering', 'aktievarderingskalkylator.html#reverse', { concepts: ['valuation', 'eps', 'cagr'] }),
      entity('tool-scenarios', 'calculator', 'Värderingsscenarier', 'aktievarderingskalkylator.html#scenarios', { concepts: ['valuation', 'risk'] }),
      entity('tool-fees', 'calculator', 'Jämför avgifter', 'avgifter.html', { concepts: ['fees', 'compounding'] }),
      entity('tool-compound', 'calculator', 'Ränta på ränta', 'ranta-pa-ranta.html', { concepts: ['compounding', 'fees', 'inflation'] }),
      entity('tool-fx', 'calculator', 'Valutajusterad avkastning', 'valutajusterad-avkastning.html', { concepts: ['currency', 'risk'] }),
      entity('tool-return', 'calculator', 'Avkastning och CAGR', 'avkastningskalkylator.html', { concepts: ['cagr', 'inflation'] }),
      entity('macro-calendar', 'macro', 'Makrokalender', 'makro.html', { concepts: ['inflation', 'interest-rates'], themes: ['macro'] }),
      entity('community', 'community', 'NTM Community', 'community.html'),
      ...supportedTickers.flatMap(ticker => {
        const name = { NVDA: 'Nvidia', SOFI: 'SoFi', CRWD: 'CrowdStrike' }[ticker];
        return [entity('research-' + ticker.toLowerCase(), 'research', name + ' Research', 'research.html?ticker=' + ticker,
          { tickers: [ticker], companies: [name], concepts: ['valuation', 'thesis'] }),
        entity('workflow-' + ticker.toLowerCase() + '-thesis', 'workflow', 'Din tes om ' + name, 'research.html?ticker=' + ticker + '#thesisSection',
          { tickers: [ticker], concepts: ['thesis'] })];
      }),
      ...[['pe', 'P/E'], ['eps', 'EPS'], ['cagr', 'CAGR'], ['currency', 'Valutarisk'], ['compounding', 'Ränta på ränta']]
        .map(([id, title]) => entity('learn-' + id, 'learn', title, null, { status: 'planned', concepts: [id], difficulty: 'beginner' })),
      ...posts.map(post => entity('post-' + post.slug, post.media.type === 'youtube' ? 'video' : 'content', post.title,
        'post-' + post.slug + '.html', { tags: post.tags, ...postMetadata[post.slug],
          distribution: { category: post.media.type === 'youtube' ? 'video' : 'article', shareTitle: post.title, summary: post.excerpt } }))
    ];
    return { version: 1, entities, relations: relations.map(r => ({ ...r })) };
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function query(data, id, { limit = 3, type, concept, ticker } = {}) {
    const byId = new Map(data.entities.map(e => [e.id, e]));
    return data.relations.filter(r => r.from === id && (!type || r.type === type))
      .map(r => ({ ...r, destination: byId.get(r.to) }))
      .filter(r => r.destination?.status === 'published' && r.destination.url
        && (!concept || r.destination.concepts.includes(concept)) && (!ticker || r.destination.tickers.includes(ticker)))
      .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id, 'en'))
      .slice(0, Math.max(0, Math.min(5, Number.isInteger(limit) ? limit : 3)));
  }
  function href(relation, source) {
    const url = new URL(relation.destination.url, 'https://nolltillmiljoner.se/');
    if (source.type === 'research' && relation.destination.url.split('#')[0] === source.url && url.hash) return url.hash;
    if (['content', 'video'].includes(source.type)) url.searchParams.set('from', 'content');
    if (relation.legacyCta) url.searchParams.set('via', relation.legacyCta);
    return url.pathname.slice(1) + url.search + url.hash;
  }
  function render(data, id) {
    const source = data.entities.find(e => e.id === id), rows = query(data, id);
    if (!source || !rows.length) return '';
    const heading = source.type === 'research' ? 'Fortsätt med ' + source.title : 'Nästa steg i NTM';
    return `<aside class="ntm-relations" data-relation-source="${esc(id)}"${source.type === 'research' ? ` data-relation-ticker="${esc(source.tickers[0])}"` : ''} aria-labelledby="relations-${esc(id)}"><h2 id="relations-${esc(id)}">${esc(heading)}</h2><ul>${rows.map(r =>
      `<li><h3>${esc(r.destination.title)}</h3><p>${esc(r.reason)}</p><a href="${esc(href(r, source))}" data-relation-id="${esc(r.id)}" data-relation-type="${esc(r.type)}" data-destination-type="${esc(r.destination.type)}"${r.legacyCta ? ` data-ntm-cta="${esc(r.legacyCta)}"` : ''}>${esc(r.cta)}</a></li>`).join('')}</ul></aside>`;
  }
  function validate(data, destinationExists = () => true) {
    const errors = [], ids = new Set(), edgeIds = new Set();
    const text = value => typeof value === 'string' && value.trim().length > 0;
    const identifier = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
    const entityKeys = ['id', 'type', 'title', 'url', 'status', 'tags', 'tickers', 'companies', 'concepts', 'themes', 'difficulty', 'distribution'];
    const relationKeys = ['id', 'from', 'to', 'type', 'priority', 'reason', 'cta', 'legacyCta'];
    if (data?.version !== 1 || !Array.isArray(data.entities) || !Array.isArray(data.relations)) return ['Invalid catalog envelope'];
    for (const e of data.entities) {
      if (!e || !identifier(e.id) || ids.has(e.id)) errors.push('Invalid/duplicate entity ID: ' + e?.id);
      if (!e) continue;
      ids.add(e.id);
      if (Object.keys(e).some(k => !entityKeys.includes(k))) errors.push('Unknown entity field: ' + e.id);
      if (!types.includes(e.type) || !text(e.title) || !['published', 'planned'].includes(e.status)) errors.push('Invalid entity: ' + e.id);
      for (const key of ['tags', 'companies', 'concepts', 'themes', 'tickers']) {
        if (!Array.isArray(e[key]) || !e[key].every(text) || new Set(e[key]).size !== e[key].length) errors.push('Invalid ' + key + ': ' + e.id);
      }
      if (!Array.isArray(e.concepts) || e.concepts.some(c => !concepts.includes(c))) errors.push('Unknown concept: ' + e.id);
      if (!Array.isArray(e.themes) || e.themes.some(t => !['ai-infrastructure', 'macro'].includes(t))) errors.push('Unknown theme: ' + e.id);
      if (!Array.isArray(e.tickers) || e.tickers.some(t => !/^[A-Z][A-Z0-9.-]{0,9}$/.test(t))) errors.push('Invalid ticker: ' + e.id);
      if (e.difficulty && !['beginner', 'intermediate', 'advanced'].includes(e.difficulty)) errors.push('Invalid difficulty: ' + e.id);
      if (e.distribution && (!['video', 'article'].includes(e.distribution.category) || !text(e.distribution.shareTitle) || !text(e.distribution.summary))) errors.push('Invalid distribution: ' + e.id);
      if (e.status === 'planned') { if (e.url !== null) errors.push('Planned destination must be null: ' + e.id); continue; }
      if (typeof e.url !== 'string' || !/^[a-z0-9-]+\.html(?:\?ticker=[A-Z]+)?(?:#[a-zA-Z0-9-]+)?$/.test(e.url)) { errors.push('Unsafe URL: ' + e.id); continue; }
      const url = new URL(e.url, 'https://nolltillmiljoner.se/');
      if (url.pathname === '/research.html') {
        const ticker = url.searchParams.get('ticker');
        if (!(e.id === 'workflow-manual-thesis' && e.type === 'workflow' && e.url === 'research.html#manualThesisEntry' && e.tickers.length === 0) && (!supportedTickers.includes(ticker) || e.tickers?.length !== 1 || e.tickers[0] !== ticker)) errors.push('Unsupported/mismatched Research: ' + e.id);
      } else if (e.type === 'research') errors.push('Invalid Research route: ' + e.id);
      if (!destinationExists(e.url)) errors.push('Missing destination: ' + e.url);
    }
    for (const r of data.relations) {
      if (!r || !identifier(r.id) || edgeIds.has(r.id)) errors.push('Invalid/duplicate relation ID: ' + r?.id);
      if (!r) continue;
      edgeIds.add(r.id);
      if (Object.keys(r).some(k => !relationKeys.includes(k))) errors.push('Unknown relation field: ' + r.id);
      if (!ids.has(r.from) || !ids.has(r.to) || r.from === r.to) errors.push('Invalid relation reference: ' + r.id);
      if (!relationTypes.includes(r.type) || !Number.isInteger(r.priority) || r.priority < 0 || !text(r.reason) || !text(r.cta)) errors.push('Invalid relation: ' + r.id);
      if (r.legacyCta && !['ai_reverse', 'memory_scenarios', 'ai_thesis'].includes(r.legacyCta)) errors.push('Invalid legacy CTA: ' + r.id);
    }
    return errors;
  }
  root.NTMRelations = Object.freeze({ catalog, query, render, validate, concepts, types, relationTypes, placements, supportedTickers });
  if (typeof module !== 'undefined') module.exports = root.NTMRelations;
})(typeof window !== 'undefined' ? window : globalThis);
