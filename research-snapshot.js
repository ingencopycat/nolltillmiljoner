/** Shared contract for historical Research snapshots. No storage writes or live backfills. */
(() => {
  const VERSION = 2;
  const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const number = (value) => {
    if (isObject(value)) value = value.unsupported ? null : value.value;
    return Number.isFinite(value) ? value : null;
  };
  const string = (value) => typeof value === 'string' ? value : null;
  const date = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
  const metricKeys = ['revenue', 'netIncome', 'eps', 'dilutedShares', 'fcf', 'fcfPerShare'];
  const legacyKeys = ['ttmRevenue', 'ttmNetIncome', 'ttmEps', 'ttmDilutedShares', 'ttmFcf', 'ttmFcfPerShare'];
  const margin = (numerator, revenue) => numerator !== null && revenue !== null && revenue > 0
    ? number(numerator / revenue * 100) : null;

  function normalizeMetrics(raw) {
    const source = isObject(raw) ? raw : {};
    const result = {};
    metricKeys.forEach((key, index) => {
      result[key] = number(Object.hasOwn(source, key) ? source[key] : source[legacyKeys[index]]);
    });
    // Legacy margins can only be derived from the historical numbers above.
    result.netMargin = Object.hasOwn(source, 'netMargin')
      ? number(source.netMargin) : margin(result.netIncome, result.revenue);
    result.fcfMargin = Object.hasOwn(source, 'fcfMargin')
      ? number(source.fcfMargin) : margin(result.fcf, result.revenue);
    return result;
  }

  function numericFields(raw, keys) {
    const source = isObject(raw) ? raw : {};
    return Object.fromEntries(keys.map((key) => [key, number(source[key])]));
  }

  function normalize(snapshot) {
    if (!isObject(snapshot) || (snapshot.schemaVersion !== undefined &&
        snapshot.schemaVersion !== 1 && snapshot.schemaVersion !== VERSION)) return null;
    const inputs = numericFields(snapshot.valuationInputs,
      ['stockPrice', 'epsBasis', 'requiredReturn', 'years', 'exitPE']);
    inputs.epsSource = ['manual', 'sec'].includes(snapshot.valuationInputs?.epsSource)
      ? snapshot.valuationInputs.epsSource : null;
    const scenarios = {};
    for (const name of ['bear', 'base', 'bull']) {
      if (isObject(snapshot.scenarios?.[name])) {
        scenarios[name] = numericFields(snapshot.scenarios[name],
          ['growth', 'exitPE', 'futureEPS', 'futurePrice', 'cagr']);
      }
    }
    return {
      schemaVersion: VERSION,
      capturedAt: date(snapshot.capturedAt),
      asOfPeriod: string(snapshot.asOfPeriod),
      quarters: Array.isArray(snapshot.quarters) ? snapshot.quarters.filter((q) => typeof q === 'string') : [],
      periodStart: date(snapshot.periodStart),
      periodEnd: date(snapshot.periodEnd),
      currency: string(snapshot.currency),
      ticker: string(snapshot.ticker),
      companyName: string(snapshot.companyName),
      ttmMetrics: normalizeMetrics(snapshot.ttmMetrics),
      valuationInputs: inputs,
      valuationResults: numericFields(snapshot.valuationResults,
        ['peRatio', 'requiredEpsCAGR', 'requiredFutureEPS', 'requiredFuturePrice']),
      scenarios,
    };
  }

  function fromStockData(data) {
    const ttm = data?.ttm || {};
    const metrics = ttm.metrics || {};
    const vb = data?.valuationBase || {};
    const read = (key, fallback) => number(Object.hasOwn(metrics, key) ? metrics[key] : vb[fallback]);
    const values = {
      revenue: read('revenue', 'ttmRevenue'),
      netIncome: read('netIncome', 'ttmNetIncome'),
      eps: read('dilutedEps', 'ttmDilutedEps'),
      dilutedShares: read('dilutedShares', 'ttmDilutedShares'),
      fcf: read('freeCashFlow', 'ttmFreeCashFlow'),
      fcfPerShare: read('fcfPerShare', 'ttmFcfPerShare'),
    };
    if (data?.metadata?.profile === 'financial_services') {
      values.fcf = null;
      values.fcfPerShare = null;
    }
    const quarters = Array.isArray(ttm.quarters) ? ttm.quarters : [];
    const history = Array.isArray(data?.quarterly) ? data.quarterly : [];
    return {
      schemaVersion: VERSION,
      asOfPeriod: ttm.asOfPeriod ?? vb.asOfPeriod ?? null,
      quarters,
      periodStart: history.find((q) => q.period === quarters[0])?.periodStart ?? null,
      periodEnd: history.find((q) => q.period === quarters[quarters.length - 1])?.periodEnd ?? null,
      currency: vb.currency ?? data?.company?.currency ?? null,
      ttmMetrics: normalizeMetrics(values),
    };
  }

  window.NTMResearchSnapshot = { version: VERSION, normalize, fromStockData };
})();
