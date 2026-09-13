/** Thesis storage V2: append-only revisions, with explicit single/all deletion. */
(() => {
  const KEY = 'investment-research-theses-v1';
  const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const text = (v) => typeof v === 'string' ? v : '';
  const tickerKey = (v) => text(v).trim().toUpperCase();
  const validText = (v) => object(v) && typeof v.text === 'string' && Boolean(v.text.trim());
  const validRevision = (v) => validText(v) && typeof v.id === 'string' && Boolean(v.id);
  const failure = (error) => ({ success: false, error });

  function freeze(value) {
    if (object(value) || Array.isArray(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }

  function legacyRevision(ticker, record) {
    // Preserve original fields/snapshot verbatim. Never stamp migration time as history time.
    return { ...record, id: `legacy-${ticker}`, savedAt: record.updatedAt || record.createdAt || null };
  }

  function normalizeRevision(record) {
    return freeze({
      id: record.id, createdAt: text(record.createdAt) || null,
      savedAt: text(record.savedAt) || text(record.updatedAt) || text(record.createdAt) || null,
      companyName: text(record.companyName), text: record.text,
      risks: text(record.risks), triggerChange: text(record.triggerChange), notes: text(record.notes),
      valuationSnapshot: window.NTMResearchSnapshot.normalize(record.valuationSnapshot),
    });
  }

  function readThesesStore() {
    try {
      if (!window.localStorage) throw new Error('Lokal lagring är inte tillgänglig.');
      const raw = window.localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : { version: 2, theses: {} };
      if (!object(parsed) || ![1, 2].includes(parsed.version) || !object(parsed.theses)) {
        throw new Error('Sparade analyser har ett format som inte stöds. Befintlig data bevaras.');
      }
      const records = Object.create(null);
      const theses = Object.create(null);
      const issues = Object.create(null);
      for (const [storedTicker, record] of Object.entries(parsed.theses)) {
        const ticker = tickerKey(storedTicker);
        if (Object.hasOwn(records, ticker)) {
          issues[ticker] = 'Flera lagrade poster har samma ticker. Historiken bevaras; sparning är blockerad.';
          continue;
        }
        records[ticker] = record;
        const rawRevisions = parsed.version === 1 && validText(record)
          ? [legacyRevision(ticker, record)] : object(record) && Array.isArray(record.revisions) ? record.revisions : null;
        if (!rawRevisions) {
          issues[ticker] = 'Historiken kunde inte läsas för detta bolag. Befintlig data bevaras.';
          continue;
        }
        const ids = new Set();
        const revisions = [];
        for (const revision of rawRevisions) {
          if (!validRevision(revision) || ids.has(revision.id)) {
            issues[ticker] = 'En sparad version kunde inte läsas. Historiken bevaras; sparning är blockerad.';
            continue;
          }
          ids.add(revision.id);
          revisions.push(normalizeRevision(revision));
        }
        if (!revisions.length) continue;
        // Append order is authoritative even if the device clock changes.
        const latest = revisions[revisions.length - 1];
        theses[ticker] = {
          ...latest, ticker, createdAt: revisions[0].createdAt, updatedAt: latest.savedAt,
          latestRevisionId: latest.id, revisionCount: revisions.length, revisions: Object.freeze(revisions),
        };
      }
      return { theses, issues, parsed, error: null };
    } catch (error) {
      return { theses: {}, issues: {}, error: 'Sparade analyser kunde inte läsas: ' + error.message };
    }
  }

  function getThesis(ticker) {
    ticker = tickerKey(ticker);
    if (!ticker) return { thesis: null, error: 'Ticker saknas.' };
    const store = readThesesStore();
    return { thesis: store.theses[ticker] || null, error: store.error, warning: store.issues[ticker] || null };
  }

  function getAllTheses() {
    const { theses, error } = readThesesStore();
    return { theses, error };
  }

  function writableStore(store) {
    // Migration is persisted only as part of an explicit successful write.
    const theses = Object.create(null);
    for (const [ticker, record] of Object.entries(store.parsed.theses)) {
      theses[ticker] = store.parsed.version === 1 && validText(record)
        ? { revisions: [legacyRevision(tickerKey(ticker), record)] } : record;
    }
    return { version: 2, theses };
  }

  function recordKey(store, ticker) {
    return Object.keys(store.theses).find((key) => tickerKey(key) === ticker) || ticker;
  }

  function fingerprint(revision) {
    const snapshot = window.NTMResearchSnapshot.normalize(revision.valuationSnapshot);
    if (snapshot) {
      delete snapshot.capturedAt;
      delete snapshot.schemaVersion;
      delete snapshot.companyName;
      delete snapshot.ticker;
    }
    const meaningfulText = (v) => text(v).trim().replace(/\s+/g, ' ');
    return JSON.stringify({
      text: meaningfulText(revision.text), risks: meaningfulText(revision.risks),
      triggerChange: meaningfulText(revision.triggerChange), notes: meaningfulText(revision.notes), snapshot,
    });
  }

  function write(store) {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  }

  function writeFailure(error) {
    return failure(error.name === 'QuotaExceededError'
      ? 'Lokal lagring är full. Ingen version har raderats. Radera en version och försök igen.'
      : 'Kunde inte ändra historiken: ' + error.message);
  }

  function saveThesis(ticker, thesis) {
    ticker = tickerKey(ticker);
    if (!ticker) return failure('Ticker saknas.');
    if (!validText(thesis)) return failure('Min tes är obligatorisk och kan inte vara tom.');
    const snapshot = window.NTMResearchSnapshot.normalize(thesis.valuationSnapshot);
    if (thesis.valuationSnapshot != null && !snapshot) return failure('Värderingssnapshot har ett format som inte stöds.');
    const store = readThesesStore();
    if (store.error || store.issues[ticker]) return failure(store.error || store.issues[ticker]);
    const latest = store.theses[ticker];
    if (latest && fingerprint(latest) === fingerprint(thesis)) {
      return { success: true, error: null, created: false, revisionId: latest.id,
        createdAt: latest.createdAt, updatedAt: latest.updatedAt };
    }
    try {
      const next = writableStore(store);
      const storedKey = recordKey(next, ticker);
      const revisions = next.theses[storedKey]?.revisions || [];
      const now = new Date().toISOString();
      let id;
      do {
        id = window.crypto?.randomUUID?.() || `revision-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      } while (revisions.some((revision) => revision.id === id));
      const revision = {
        id, createdAt: now, savedAt: now, companyName: text(thesis.companyName),
        text: thesis.text.trim(), risks: text(thesis.risks).trim(),
        triggerChange: text(thesis.triggerChange).trim(), notes: text(thesis.notes).trim(),
        valuationSnapshot: snapshot,
      };
      next.theses[storedKey] = { ...next.theses[storedKey], revisions: [...revisions, revision] };
      write(next);
      return { success: true, error: null, created: true, revisionId: id,
        createdAt: latest?.createdAt || now, updatedAt: now };
    } catch (error) { return writeFailure(error); }
  }

  function deleteRevision(ticker, revisionId) {
    ticker = tickerKey(ticker);
    const store = readThesesStore();
    if (store.error || store.issues[ticker]) return failure(store.error || store.issues[ticker]);
    if (!store.theses[ticker]?.revisions.some((r) => r.id === revisionId)) return failure('Versionen hittades inte.');
    try {
      const next = writableStore(store);
      const storedKey = recordKey(next, ticker);
      const remaining = next.theses[storedKey].revisions.filter((r) => r.id !== revisionId);
      if (remaining.length) next.theses[storedKey] = { ...next.theses[storedKey], revisions: remaining };
      else delete next.theses[storedKey];
      write(next);
      return { success: true, error: null };
    } catch (error) { return writeFailure(error); }
  }

  function deleteThesis(ticker) {
    ticker = tickerKey(ticker);
    const store = readThesesStore();
    if (store.error) return failure(store.error);
    if (!ticker || !Object.keys(store.parsed.theses).some((key) => tickerKey(key) === ticker)) return failure('Analysen hittades inte.');
    try {
      const next = writableStore(store);
      for (const key of Object.keys(next.theses)) if (tickerKey(key) === ticker) delete next.theses[key];
      write(next);
      return { success: true, error: null };
    } catch (error) { return writeFailure(error); }
  }

  window.NTMThesisStorage = {
    key: KEY, version: 2, read: readThesesStore, get: getThesis, all: getAllTheses,
    save: saveThesis, remove: deleteThesis, removeRevision: deleteRevision,
  };
})();
