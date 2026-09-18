/** Compare a historical Research baseline with current normalized stock data. */
(() => {
  const metricNames = {
    revenue: 'TTM Revenue', netIncome: 'TTM Net Income', eps: 'TTM EPS',
    dilutedShares: 'TTM Diluted Shares', fcf: 'TTM FCF', fcfPerShare: 'TTM FCF per Share',
  };

  function detectChanges(rawSnapshot, currentData) {
    const snapshot = window.NTMResearchSnapshot.normalize(rawSnapshot);
    const current = window.NTMResearchSnapshot.fromStockData(currentData);
    const report = {
      hasChanges: false, reason: null, metrics: [], margins: [], filings: [], periodChange: null, blocked: [], corrections: [],
    };
    if (!snapshot || !currentData || (snapshot.ticker && currentData.symbol &&
        snapshot.ticker.toUpperCase() !== currentData.symbol.toUpperCase())) {
      report.reason = 'insufficient_data';
      return report;
    }
    report.snapshotDate = snapshot.capturedAt;
    report.snapshotPeriod = snapshot.asOfPeriod;
    report.currentPeriod = current.asOfPeriod;
    report.corrections = window.NTMResearchSnapshot.corrections(snapshot,current);
    if (snapshot.asOfPeriod && current.asOfPeriod && snapshot.asOfPeriod !== current.asOfPeriod) {
      report.periodChange = { from: snapshot.asOfPeriod, to: current.asOfPeriod };
    }
    for (const [key, name] of Object.entries(metricNames)) {
      const before = snapshot.ttmMetrics[key];
      const after = current.ttmMetrics[key];
      if (!Number.isFinite(before) || !Number.isFinite(after)) continue;
      const gate = window.NTMResearchSnapshot.comparable(snapshot, current, key);
      if (!gate.comparable) { report.blocked.push({ name, reason: gate.reason }); continue; }
      const absolute = after - before;
      if (!Number.isFinite(absolute)) continue;
      // A zero baseline has no percentage denominator; report its absolute change explicitly.
      const pct = before === 0 ? null : absolute / Math.abs(before) * 100;
      if (before !== 0 && !Number.isFinite(pct)) continue;
      if ((before === 0 && absolute !== 0) || (pct !== null && Math.abs(pct) > 1)) {
        report.metrics.push({ name, snapshot: before, current: after, absolute, pct });
      }
    }
    for (const [key, name] of [['netMargin', 'Net Margin'], ['fcfMargin', 'FCF Margin']]) {
      const before = snapshot.ttmMetrics[key];
      const after = current.ttmMetrics[key];
      if (!Number.isFinite(before) || !Number.isFinite(after)) continue;
      const gate = window.NTMResearchSnapshot.comparable(snapshot, current, key);
      if (!gate.comparable) { report.blocked.push({ name, reason: gate.reason }); continue; }
      const marginChange = after - before;
      if (Number.isFinite(marginChange) && Math.abs(marginChange) > 0.5) {
        report.margins.push({ name, snapshot: before, current: after, unit: 'pp', marginChange });
      }
    }
    report.filings = getFilingsSinceSnapshot(snapshot, currentData);
    report.hasChanges = Boolean(report.periodChange || report.metrics.length || report.margins.length || report.filings.length);
    return report;
  }

  function getFilingsSinceSnapshot(snapshot, currentData) {
    if (!snapshot?.capturedAt || !Number.isFinite(Date.parse(snapshot.capturedAt)) ||
        !Array.isArray(currentData?.filings)) return [];
    const snapshotDate = Date.parse(snapshot.capturedAt);
    const accessions = new Set();
    return currentData.filings.filter((filing) => filing &&
      ['10-K', '10-Q', '10-K/A', '10-Q/A'].includes(filing.form) && Date.parse(filing.filingDate) > snapshotDate)
      .filter(filing => { if (!filing.accessionNumber) return true; if (accessions.has(filing.accessionNumber)) return false; accessions.add(filing.accessionNumber); return true; })
      .map(({ form, filingDate, reportPeriod, accessionNumber, primaryDocUrl, secFilingUrl }) =>
        ({ form, filingDate, reportPeriod, accessionNumber, primaryDocUrl, secFilingUrl }))
      .sort((a, b) => Date.parse(b.filingDate) - Date.parse(a.filingDate)).slice(0, 3);
  }

  function isSnapshotStale(snapshot) {
    // An unknown creation date is not evidence that an analysis is over a year old.
    if (!snapshot?.capturedAt || !Number.isFinite(Date.parse(snapshot.capturedAt))) return false;
    return (Date.now() - Date.parse(snapshot.capturedAt)) / (1000 * 60 * 60 * 24 * 30) > 12;
  }

  function formatChange(change) {
    if (!change || !Number.isFinite(change.absolute)) return '';
    const abs = Math.abs(change.absolute).toLocaleString('sv-SE', { maximumFractionDigits: 2 });
    const percentage = Number.isFinite(change.pct) ? `${Math.abs(change.pct).toFixed(1)}%`
      : 'procent saknas: basvärde 0';
    return `${change.absolute > 0 ? '↑' : '↓'} ${abs} (${percentage})`;
  }

  window.NTMChangeDetection = {
    detect: detectChanges, formatChange, getFilingsSinceSnapshot, isSnapshotStale,
  };
})();
