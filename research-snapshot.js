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
    if (['example', 'manual', 'historical'].includes(snapshot.valuationInputs?.priceSource)) {
      inputs.priceSource = snapshot.valuationInputs.priceSource;
    }
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
      ...(isObject(snapshot.provenance) ? { provenance: JSON.parse(JSON.stringify(snapshot.provenance)) } : {}),
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
      ...(data?.$schema === 'ntm-stock-v1' ? { provenance: {
        version: 1, dataSchema: data.$schema, methodVersion: data.metadata?.methodVersion,
        generatedAt: data.metadata?.generatedAt, fetchedAt: data.metadata?.fetchedAt,
        fundamental: { version: 1, statementMethod: 'ntm-fundamental/1', profile: data.metadata?.profile,
          annual: JSON.parse(JSON.stringify((data.annual || []).slice(-3))) },
        metrics: Object.fromEntries(Object.entries({ revenue: 'revenue', netIncome: 'netIncome', eps: 'dilutedEps',
          dilutedShares: 'dilutedShares', fcf: 'freeCashFlow', fcfPerShare: 'fcfPerShare' })
          .map(([key, source]) => [key, JSON.parse(JSON.stringify(metrics[source] || {}))])),
      } } : {}),
      ttmMetrics: normalizeMetrics(values),
    };
  }

  function comparable(before, after, key) {
    const fail = (reason) => ({ comparable: false, reason: `Kan inte jämföras — ${reason}` });
    if (!before || !after) return fail('snapshot saknas eller stöds inte');
    if (before.ticker && after.ticker && before.ticker !== after.ticker) return fail('bolag skiljer sig');
    if (!Number.isFinite(before.ttmMetrics?.[key]) || !Number.isFinite(after.ttmMetrics?.[key])) return fail('värde saknas');
    if (!before.currency || !after.currency) return fail('valuta saknas');
    if (before.currency !== after.currency) return fail('valuta skiljer sig');
    const a = before.provenance, b = after.provenance;
    if (!a || !b || a.version !== 1 || b.version !== 1) return fail('historisk källmetadata saknas eller stöds inte');
    if (a.dataSchema !== 'ntm-stock-v1' || a.dataSchema !== b.dataSchema || !a.methodVersion || a.methodVersion !== b.methodVersion)
      return fail('dataversion eller beräkningsmetod skiljer sig');
    if (key === 'netMargin' || key === 'fcfMargin') {
      for (const dependency of [key === 'netMargin' ? 'netIncome' : 'fcf', 'revenue']) {
        const result = comparable(before, after, dependency);
        if (!result.comparable) return result;
      }
      return { comparable: true, reason: null };
    }
    const x = a.metrics?.[key], y = b.metrics?.[key];
    if (!x || !y || !x.definition || !y.definition) return fail('definition saknas');
    if (x.definition !== y.definition) return fail('definitionen skiljer sig');
    if (!x.unit || x.unit !== y.unit || x.currency !== y.currency) return fail('enhet eller valuta skiljer sig');
    if (!['reported', 'derived'].includes(x.kind) || x.kind !== y.kind || !x.source || x.source !== y.source
        || x.derivationMethod !== y.derivationMethod || x.methodVersion !== a.methodVersion || y.methodVersion !== b.methodVersion)
      return fail('källa eller härledning skiljer sig');
    if (x.qualityStatus !== 'available' || y.qualityStatus !== 'available' || x.restated || y.restated || x.split || y.split)
      return fail('kvalitet, omräkning eller aktiesplit kräver granskning');
    if (Array.isArray(x.inputs) && Array.isArray(y.inputs)) {
      const priorInputs = new Map(x.inputs.map((i) => [`${i.quarter}:${i.metric}`, i]));
      if (y.inputs.some((i) => { const prior = priorInputs.get(`${i.quarter}:${i.metric}`);
        return prior && (prior.value !== i.value || prior.concept !== i.concept); }))
        return fail('underliggande period har ändrats; möjlig omräkning kräver granskning');
    }
    for (const m of [x, y]) {
      if (!Array.isArray(m.quartersIncluded) || m.quartersIncluded.length !== 4 || new Set(m.quartersIncluded).size !== 4
          || !m.quartersIncluded.every((q, i, list) => /^\d{4}Q[1-4]$/.test(q) && (i === 0
            || Number(q.slice(0, 4)) * 4 + Number(q.at(-1)) === Number(list[i - 1].slice(0, 4)) * 4 + Number(list[i - 1].at(-1)) + 1)))
        return fail('kvartalsföljden saknas eller är ofullständig');
    }
    const days = (m) => (Date.parse(m.periodEnd) - Date.parse(m.periodStart)) / 86400000 + 1;
    for (const [snapshot, metric] of [[before, x], [after, y]]) {
      if ((snapshot.asOfPeriod && snapshot.asOfPeriod !== metric.quartersIncluded.at(-1))
          || ['periodStart', 'periodEnd'].some((field) => snapshot[field] && Date.parse(snapshot[field]) !== Date.parse(metric[field])))
        return fail('periodmetadata stämmer inte överens');
    }
    if (x.periodType !== 'TTM' || y.periodType !== 'TTM' || !Number.isFinite(days(x)) || !Number.isFinite(days(y))
        || days(x) < 350 || days(x) > 378 || days(y) < 350 || days(y) > 378 || Date.parse(y.periodEnd) < Date.parse(x.periodEnd))
      return fail('perioderna är inte säkert jämförbara');
    if (['eps', 'dilutedShares', 'fcfPerShare'].includes(key) && (!x.shareBasis || x.shareBasis !== y.shareBasis))
      return fail('aktiebasen saknas eller har förändrats');
    return { comparable: true, reason: null };
  }

  // R12 compares identities, not collection timestamps, URLs, labels or array order.
  const stable = value => JSON.stringify(canonical(value));
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return isObject(value) ? Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,canonical(value[k])])) : value;
  }
  function correctionFacts(snapshot) {
    const facts=new Map();
    const entries=Object.entries(snapshot?.provenance?.metrics||{});
    if(snapshot?.provenance?.fundamental?.version===1)for(const row of snapshot.provenance.fundamental.annual||[])
      for(const [metric,m] of Object.entries(row.metrics||{}))entries.push(['annual:'+metric,m]);
    for(const [metric,m] of entries) {
      if(!isObject(m)||!m.definition||!m.unit||!m.periodType)continue;
      const rows=Array.isArray(m.inputs)&&m.inputs.length?m.inputs:[m];
      for(const input of rows) {
        const period=input.quarter||input.period||m.period;
        if(!period||!Number.isFinite(input.value))continue;
        const identity=stable({metric,period,periodType:input.quarter?'quarterly':m.periodType,unit:m.unit,currency:m.currency||null});
        const basis={value:input.value,source:input.source||m.source||null,definition:m.definition,concept:input.concept||m.concept||null,
          accession:input.accession||null,derivedFrom:input.derivedFrom||null,sourceFilings:(input.sourceFilings||[]).map(s=>({accession:s.accession||null})),
          methodVersion:m.methodVersion||snapshot.provenance.methodVersion||null,derivationMethod:m.derivationMethod||null,
          sourceVersion:input.sourceVersion||m.sourceVersion||null,correction:input.correction||m.correction||null,restated:!!(input.restated||m.restated)};
        // Conflicting duplicate identities cannot establish a correction.
        if(facts.has(identity)&&stable(facts.get(identity)?.basis)!==stable(basis))facts.set(identity,null);
        else if(!facts.has(identity))facts.set(identity,{metric,period,identity,basis});
      }
    }
    return facts;
  }
  function corrections(before,after) {
    if(!before?.provenance||!after?.provenance)return [];
    const old=correctionFacts(before),rows=[];
    for(const [identity,current] of correctionFacts(after)) {
      const prior=old.get(identity);
      if(!prior||!current||stable(prior.basis)===stable(current.basis))continue;
      const evidence={ruleVersion:'R12/1',identity,metric:current.metric,period:current.period,old:prior.basis,current:current.basis};
      rows.push({...evidence,fingerprint:stable(evidence)});
    }
    return rows.sort((a,b)=>a.identity.localeCompare(b.identity));
  }
  window.NTMResearchSnapshot = { version: VERSION, normalize, fromStockData, comparable, corrections };
})();
