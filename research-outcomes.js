/** Outcome calculations and separate, versioned checkpoint storage. No live price fetching. */
(() => {
    const KEY = 'ntm-research-outcomes-v1';
    const YEAR = 365.25 * 24 * 60 * 60 * 1000;
    const finite = (value) => Number.isFinite(value) ? value : null;
    const positive = (value) => Number.isFinite(value) && value > 0;
    const date = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
    const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
    const clone = (value) => JSON.parse(JSON.stringify(value));
    const freeze = (value) => {
        if (object(value) || Array.isArray(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
        return value;
    };
    const yearsBetween = (start, end) => date(start) && date(end) && Date.parse(end) >= Date.parse(start)
        ? (Date.parse(end) - Date.parse(start)) / YEAR : null;
    const metricNames = {
        revenue: 'Revenue', netIncome: 'Net Income', eps: 'EPS', dilutedShares: 'Diluted shares',
        fcf: 'FCF', fcfPerShare: 'FCF per aktie', netMargin: 'Nettomarginal', fcfMargin: 'FCF-marginal',
    };

    function position(price, targets) {
        const [bear, base, bull] = targets;
        if (!positive(price) || !targets.every(positive) || !(bear < base && base < bull)) return null;
        if (price === bear) return 'Vid gammalt Bear-mål';
        if (price === base) return 'Vid gammalt Base-mål';
        if (price === bull) return 'Vid gammalt Bull-mål';
        if (price < bear) return 'Under gammalt Bear-mål';
        if (price < base) return 'Mellan gamla Bear- och Base-mål';
        if (price < bull) return 'Mellan gamla Base- och Bull-mål';
        return 'Över gammalt Bull-mål';
    }

    function compare(revision, observation) {
        const before = window.NTMResearchSnapshot.normalize(revision?.valuationSnapshot);
        const current = window.NTMResearchSnapshot.normalize(observation.currentSnapshot);
        const inputs = before?.valuationInputs || {};
        const elapsed = yearsBetween(revision?.savedAt, observation.observedAt);
        const horizon = positive(inputs.years) ? inputs.years : null;
        const reportingYears = yearsBetween(before?.periodEnd, current?.periodEnd);
        const currencyMatches = Boolean(before?.currency && current?.currency && before.currency === current.currency);
        const tickerMatches = !before?.ticker || !current?.ticker || before.ticker === current.ticker;
        const metrics = Object.entries(metricNames).map(([key, name]) => {
            const historical = finite(before?.ttmMetrics[key]);
            const actual = finite(current?.ttmMetrics[key]);
            const margin = key === 'netMargin' || key === 'fcfMargin';
            const comparable = tickerMatches && (margin || key === 'dilutedShares' || currencyMatches)
                && historical !== null && actual !== null;
            const absolute = comparable ? finite(actual - historical) : null;
            return { key, name, historical, actual, margin, absolute,
                pct: !margin && absolute !== null && historical !== 0 ? finite(absolute / Math.abs(historical) * 100) : null,
                cagr: !margin && comparable && positive(historical) && positive(actual) && reportingYears >= 365 / 365.25
                    ? finite((Math.pow(actual / historical, 1 / reportingYears) - 1) * 100) : null,
            };
        });
        const pathYears = elapsed !== null && horizon !== null ? Math.min(elapsed, horizon) : null;
        const manual = inputs.epsSource === 'manual';
        const knownSource = manual || inputs.epsSource === 'sec';
        const price = positive(observation.manualPrice?.value) ? observation.manualPrice.value : null;
        const priceCompatible = price !== null && before?.currency && observation.manualPrice?.currency === before.currency;
        const scenarios = ['bear', 'base', 'bull'].map((name) => {
            const saved = before?.scenarios[name] || {};
            const expected = knownSource && positive(inputs.epsBasis) && Number.isFinite(saved.growth) && saved.growth > -100 && pathYears !== null
                ? finite(inputs.epsBasis * Math.pow(1 + saved.growth / 100, pathYears)) : null;
            const actual = finite(current?.ttmMetrics.eps);
            const target = finite(saved.futurePrice);
            return { name, growth: finite(saved.growth), expected, actual, target,
                epsGapPct: !manual && tickerMatches && currencyMatches && positive(expected) && actual !== null
                    ? finite((actual - expected) / expected * 100) : null,
                targetGapPct: priceCompatible && positive(target) ? finite((price / target - 1) * 100) : null,
            };
        });
        return {
            elapsed, horizon, remaining: elapsed !== null && horizon !== null ? Math.max(0, horizon - elapsed) : null,
            horizonPct: elapsed !== null && horizon !== null ? finite(elapsed / horizon * 100) : null,
            eligibleForFinal: elapsed !== null && horizon !== null && elapsed >= horizon,
            reportingYears, pathYears, manualEps: manual, currencyMatches, metrics, scenarios,
            priceReturnPct: priceCompatible && positive(inputs.stockPrice) ? finite((price / inputs.stockPrice - 1) * 100) : null,
            position: priceCompatible ? position(price, scenarios.map((scenario) => scenario.target)) : null,
        };
    }

    function observe(ticker, revision, data, price = null, observedAt = new Date().toISOString()) {
        const currentSnapshot = window.NTMResearchSnapshot.normalize({
            ...window.NTMResearchSnapshot.fromStockData(data), ticker,
        });
        return { schemaVersion: 1, ticker, sourceRevisionId: revision.id, sourceRevision: clone(revision), observedAt,
            currentSnapshot, manualPrice: price === null ? null : { value: price, source: 'manual', currency: currentSnapshot.currency } };
    }

    function validRecord(record, requireId = true) {
        return object(record) && record.schemaVersion === 1 && (!requireId || typeof record.id === 'string' && record.id.length > 0)
            && typeof record.ticker === 'string' && /^[A-Z0-9.-]+$/.test(record.ticker)
            && typeof record.sourceRevisionId === 'string' && record.sourceRevisionId.length > 0
            && object(record.sourceRevision) && record.sourceRevision.id === record.sourceRevisionId
            && typeof record.sourceRevision.text === 'string' && date(record.observedAt)
            && object(record.currentSnapshot) && record.currentSnapshot.schemaVersion === 2
            && object(record.currentSnapshot.ttmMetrics)
            && record.currentSnapshot.ticker === record.ticker
            && (!record.sourceRevision.valuationSnapshot || record.sourceRevision.valuationSnapshot.schemaVersion === 2)
            && (!record.sourceRevision.valuationSnapshot?.ticker || record.sourceRevision.valuationSnapshot.ticker === record.ticker)
            && (record.manualPrice === null || object(record.manualPrice) && record.manualPrice.source === 'manual'
                && positive(record.manualPrice.value) && record.manualPrice.currency === record.currentSnapshot.currency);
    }

    function read() {
        try {
            const raw = window.localStorage.getItem(KEY);
            const store = raw === null ? { schemaVersion: 1, checkpoints: [] } : JSON.parse(raw);
            if (!object(store) || store.schemaVersion !== 1 || !Array.isArray(store.checkpoints)) throw new Error('format');
            const ids = new Set();
            for (const record of store.checkpoints) {
                if (!validRecord(record) || ids.has(record.id)) throw new Error('record');
                ids.add(record.id);
            }
            return { checkpoints: freeze(store.checkpoints), error: null };
        } catch (error) {
            return { checkpoints: [], error: 'Utfallslagret kunde inte läsas eller har ett format som inte stöds. Befintlig lagring bevaras; sparning är blockerad.' };
        }
    }

    function fingerprint(record) {
        // Same observation on the same UTC day is a no-op; future days may record unchanged data.
        const { id, observedAt, ...state } = record;
        return JSON.stringify({ ...state, day: new Date(observedAt).toISOString().slice(0, 10) });
    }

    function save(observation) {
        const store = read();
        if (store.error) return { success: false, error: store.error };
        if (!validRecord(observation, false)) return { success: false, error: 'Observationen är ofullständig eller inkompatibel och kunde inte sparas.' };
        const duplicate = store.checkpoints.find((record) => fingerprint(record) === fingerprint(observation));
        if (duplicate) return { success: true, created: false, checkpoint: duplicate };
        const checkpoint = clone(observation);
        checkpoint.id = window.crypto?.randomUUID?.() || `outcome-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        if (store.checkpoints.some((record) => record.id === checkpoint.id)) return { success: false, error: 'Kunde inte skapa ett unikt observations-ID. Försök igen.' };
        try {
            window.localStorage.setItem(KEY, JSON.stringify({ schemaVersion: 1, checkpoints: [...store.checkpoints, checkpoint] }));
            return { success: true, created: true, checkpoint: freeze(checkpoint) };
        } catch (error) { return { success: false, error: 'Utfallet kunde inte sparas lokalt. Kontrollera lagringsutrymme och webbläsarinställningar.' }; }
    }

    window.NTMResearchOutcomes = { key: KEY, version: 1, compare, observe, position, read, save };
})();
