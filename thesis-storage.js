/**
 * NTM Research Thesis Storage V1
 * Manages local storage of user research theses and valuation snapshots.
 * 
 * Schema: investment-research-theses-v1
 * {
 *   "version": 1,
 *   "theses": {
 *     "SOFI": { thesis object },
 *     "NVDA": { thesis object }
 *   }
 * }
 */

const THESIS_STORAGE_KEY = 'investment-research-theses-v1';

window.NTMThesisStorage = {
  key: THESIS_STORAGE_KEY,
  read: readThesesStore,
  get: getThesis,
  save: saveThesis,
  remove: deleteThesis,
  all: getAllTheses,
};

/**
 * Read and validate the entire theses store
 */
function readThesesStore() {
  try {
    if (!window.localStorage) {
      return { theses: {}, error: 'Lokal lagring är inte tillgänglig.' };
    }
    const raw = window.localStorage.getItem(THESIS_STORAGE_KEY);
    if (!raw) {
      return { theses: {}, error: null };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || typeof parsed.theses !== 'object') {
      return { theses: {}, error: 'Sparade analyser kunde inte läsas. Formatet är oväntad.' };
    }
    return { theses: parsed.theses || {}, error: null };
  } catch (error) {
    console.error('Thesis storage read error:', error);
    return { theses: {}, error: 'Sparade analyser kunde inte läsas: ' + (error.message || 'Okänt fel') };
  }
}

/**
 * Get a single thesis by ticker
 */
function getThesis(ticker) {
  const { theses, error } = readThesesStore();
  if (error) return { thesis: null, error };
  const thesis = theses[ticker.toUpperCase()] || null;
  return { thesis, error: null };
}

/**
 * Get all theses
 */
function getAllTheses() {
  const { theses, error } = readThesesStore();
  return { theses: theses || {}, error };
}

/**
 * Save or update a thesis.
 * 
 * @param {string} ticker - Stock ticker (e.g., 'SOFI')
 * @param {object} thesis - Thesis object with fields:
 *   - text: user's main thesis text
 *   - risks: key risks text
 *   - triggerChange: what would change their mind
 *   - notes: optional general notes
 *   - valuationSnapshot: optional valuation state snapshot (or null)
 * @returns { success: boolean, error: string|null }
 */
function saveThesis(ticker, thesis) {
  ticker = ticker.toUpperCase();
  
  // Validate thesis object has required fields
  if (!thesis || typeof thesis !== 'object') {
    return { success: false, error: 'Analys måste vara ett objekt.' };
  }
  
  if (typeof thesis.text !== 'string' || thesis.text.trim().length === 0) {
    return { success: false, error: 'Min tes är obligatorisk och kan inte vara tom.' };
  }

  try {
    if (!window.localStorage) {
      return { success: false, error: 'Lokal lagring är inte tillgänglig.' };
    }

    const { theses } = readThesesStore();
    const now = new Date().toISOString();
    
    // Preserve createdAt on update, update updatedAt
    let createdAt = now;
    if (theses[ticker]) {
      createdAt = theses[ticker].createdAt || now;
    }

    theses[ticker] = {
      ticker,
      companyName: thesis.companyName || '',
      text: thesis.text.trim(),
      risks: (thesis.risks || '').trim(),
      triggerChange: (thesis.triggerChange || '').trim(),
      notes: (thesis.notes || '').trim(),
      valuationSnapshot: thesis.valuationSnapshot || null,
      createdAt,
      updatedAt: now,
    };

    const store = {
      version: 1,
      theses,
    };

    window.localStorage.setItem(THESIS_STORAGE_KEY, JSON.stringify(store));
    return { success: true, error: null };
  } catch (error) {
    console.error('Thesis storage save error:', error);
    if (error.name === 'QuotaExceededError') {
      return { success: false, error: 'Lokal lagring är full. Radera några analyser och försök igen.' };
    }
    return { success: false, error: 'Kunde inte spara analysen: ' + (error.message || 'Okänt fel') };
  }
}

/**
 * Delete a thesis by ticker
 */
function deleteThesis(ticker) {
  ticker = ticker.toUpperCase();

  try {
    if (!window.localStorage) {
      return { success: false, error: 'Lokal lagring är inte tillgänglig.' };
    }

    const { theses } = readThesesStore();
    if (!theses[ticker]) {
      return { success: false, error: 'Analysen hittades inte.' };
    }

    delete theses[ticker];
    const store = {
      version: 1,
      theses,
    };

    window.localStorage.setItem(THESIS_STORAGE_KEY, JSON.stringify(store));
    return { success: true, error: null };
  } catch (error) {
    console.error('Thesis storage delete error:', error);
    return { success: false, error: 'Kunde inte radera analysen: ' + (error.message || 'Okänt fel') };
  }
}
