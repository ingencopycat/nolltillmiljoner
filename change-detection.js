/**
 * NTM Change Detection V1
 * Compares saved thesis valuationSnapshot against current Research data.
 * Generates structured change report for display.
 */

window.NTMChangeDetection = {
  detect: detectChanges,
  formatChange: formatChange,
  getFilingsSinceSnapshot: getFilingsSinceSnapshot,
  isSnapshotStale: isSnapshotStale,
};

/**
 * Detect changes between saved snapshot and current data
 * @param {object} snapshot - valuationSnapshot from thesis
 * @param {object} currentData - current stock JSON data
 * @returns {object} changeReport with metrics, margins, filings, period
 */
function detectChanges(snapshot, currentData) {
  if (!snapshot || !currentData) {
    return {
      hasChanges: false,
      reason: 'insufficient_data',
      metrics: [],
      margins: [],
      filings: [],
      periodChange: null,
    };
  }

  const report = {
    hasChanges: false,
    reason: null,
    snapshotDate: snapshot.capturedAt,
    snapshotPeriod: snapshot.asOfPeriod,
    currentPeriod: currentData.valuationBase?.asOfPeriod,
    metrics: [],
    margins: [],
    filings: [],
    periodChange: null,
  };

  // 1. Check period change
  if (
    snapshot.asOfPeriod &&
    currentData.valuationBase?.asOfPeriod &&
    snapshot.asOfPeriod !== currentData.valuationBase.asOfPeriod
  ) {
    report.periodChange = {
      from: snapshot.asOfPeriod,
      to: currentData.valuationBase.asOfPeriod,
    };
    report.hasChanges = true;
  }

  // 2. Detect metric changes
  const metricChanges = compareMetrics(snapshot, currentData);
  report.metrics = metricChanges;
  if (metricChanges.length > 0) {
    report.hasChanges = true;
  }

  // 3. Detect margin changes
  const marginChanges = compareMargins(snapshot, currentData);
  report.margins = marginChanges;
  if (marginChanges.length > 0) {
    report.hasChanges = true;
  }

  // 4. Detect new filings
  const newFilings = getFilingsSinceSnapshot(snapshot, currentData);
  report.filings = newFilings;
  if (newFilings.length > 0) {
    report.hasChanges = true;
  }

  return report;
}

/**
 * Compare key metrics between snapshot and current data
 */
function compareMetrics(snapshot, currentData) {
  const vb = currentData.valuationBase || {};
  const changes = [];

  // Map of metric name to { snapshot key, current key }
  const metricsToCompare = [
    { name: 'TTM Revenue', snapshotKey: 'ttmRevenue', currentKey: 'ttmRevenue' },
    { name: 'TTM Net Income', snapshotKey: 'ttmNetIncome', currentKey: 'ttmNetIncome' },
    { name: 'TTM EPS', snapshotKey: 'ttmEps', currentKey: 'ttmDilutedEps' },
    { name: 'TTM Diluted Shares', snapshotKey: 'ttmDilutedShares', currentKey: 'ttmDilutedShares' },
    { name: 'TTM FCF', snapshotKey: 'ttmFcf', currentKey: 'ttmFreeCashFlow' },
    { name: 'TTM FCF per Share', snapshotKey: 'ttmFcfPerShare', currentKey: 'ttmFcfPerShare' },
  ];

  metricsToCompare.forEach(({ name, snapshotKey, currentKey }) => {
    const snapshotVal = getNestedValue(snapshot.ttmMetrics, snapshotKey);
    const currentVal = getNestedValue(vb, currentKey);

    // Only compare if both values exist and are meaningful
    if (
      snapshotVal !== null &&
      snapshotVal !== undefined &&
      currentVal !== null &&
      currentVal !== undefined
    ) {
      const currentValActual = typeof currentVal === 'object' ? currentVal.value : currentVal;

      if (currentValActual === null || currentValActual === undefined) {
        return; // Current value is not available
      }

      const change = calculateChange(snapshotVal, currentValActual);
      if (Math.abs(change.pct) > 1) {
        // Only report if change > 1%
        changes.push({
          name,
          snapshot: snapshotVal,
          current: currentValActual,
          absolute: change.absolute,
          pct: change.pct,
        });
      }
    }
  });

  return changes;
}

/**
 * Compare derived margins
 */
function compareMargins(snapshot, currentData) {
  const changes = [];

  // Net Margin: Net Income / Revenue
  if (
    snapshot.ttmMetrics?.ttmNetIncome &&
    snapshot.ttmMetrics?.ttmRevenue &&
    currentData.valuationBase?.ttmNetIncome &&
    currentData.valuationBase?.ttmRevenue
  ) {
    const snapshotNI = snapshot.ttmMetrics.ttmNetIncome;
    const snapshotRev = snapshot.ttmMetrics.ttmRevenue;
    const currentNI = getMetricValue(currentData.valuationBase.ttmNetIncome);
    const currentRev = getMetricValue(currentData.valuationBase.ttmRevenue);

    if (snapshotNI && snapshotRev && currentNI && currentRev) {
      const snapshotMargin = (snapshotNI / snapshotRev) * 100;
      const currentMargin = (currentNI / currentRev) * 100;
      const marginChange = currentMargin - snapshotMargin;

      if (Math.abs(marginChange) > 0.5) {
        // Report if change > 0.5 pp
        changes.push({
          name: 'Net Margin',
          snapshot: snapshotMargin,
          current: currentMargin,
          unit: 'pp',
          marginChange,
        });
      }
    }
  }

  // FCF Margin: FCF / Revenue (only if FCF is supported)
  if (
    snapshot.ttmMetrics?.ttmFcf &&
    snapshot.ttmMetrics?.ttmRevenue &&
    currentData.valuationBase?.ttmFreeCashFlow &&
    currentData.valuationBase?.ttmRevenue
  ) {
    const snapshotFCF = snapshot.ttmMetrics.ttmFcf;
    const snapshotRev = snapshot.ttmMetrics.ttmRevenue;
    const currentFCF = getMetricValue(currentData.valuationBase.ttmFreeCashFlow);
    const currentRev = getMetricValue(currentData.valuationBase.ttmRevenue);

    if (snapshotFCF && snapshotRev && currentFCF && currentRev) {
      const snapshotMargin = (snapshotFCF / snapshotRev) * 100;
      const currentMargin = (currentFCF / currentRev) * 100;
      const marginChange = currentMargin - snapshotMargin;

      if (Math.abs(marginChange) > 0.5) {
        changes.push({
          name: 'FCF Margin',
          snapshot: snapshotMargin,
          current: currentMargin,
          unit: 'pp',
          marginChange,
        });
      }
    }
  }

  return changes;
}

/**
 * Get new filings since snapshot was created
 */
function getFilingsSinceSnapshot(snapshot, currentData) {
  if (!snapshot.capturedAt || !currentData.filings || currentData.filings.length === 0) {
    return [];
  }

  const snapshotDate = new Date(snapshot.capturedAt);
  const relevantForms = ['10-K', '10-Q'];
  const newFilings = [];

  currentData.filings.forEach((filing) => {
    if (!filing.filingDate || !filing.form) return;

    const filingDate = new Date(filing.filingDate);
    if (filingDate > snapshotDate && relevantForms.includes(filing.form)) {
      newFilings.push({
        form: filing.form,
        filingDate: filing.filingDate,
        reportPeriod: filing.reportPeriod,
        accessionNumber: filing.accessionNumber,
        primaryDocUrl: filing.primaryDocUrl,
        secFilingUrl: filing.secFilingUrl,
      });
    }
  });

  // Return most recent 3
  return newFilings.sort((a, b) => new Date(b.filingDate) - new Date(a.filingDate)).slice(0, 3);
}

/**
 * Check if snapshot is too old for meaningful comparison
 * Returns true if snapshot is older than 12 months
 */
function isSnapshotStale(snapshot) {
  if (!snapshot || !snapshot.capturedAt) return true;

  const snapshotDate = new Date(snapshot.capturedAt);
  const now = new Date();
  const monthsDiff = (now - snapshotDate) / (1000 * 60 * 60 * 24 * 30);

  return monthsDiff > 12;
}

/**
 * Format change for display
 * @param {object} change - Change object with snapshot, current, absolute, pct
 * @returns {string} Formatted change string
 */
function formatChange(change) {
  if (!change) return '';

  const abs = Math.abs(change.absolute).toLocaleString('sv-SE', {
    maximumFractionDigits: 2,
  });
  const pct = Math.abs(change.pct).toFixed(1);
  const direction = change.absolute > 0 ? '↑' : '↓';

  return `${direction} ${abs} (${pct}%)`;
}

/**
 * Helper: Get nested value from object
 */
function getNestedValue(obj, path) {
  if (!obj) return null;
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    value = value[key];
    if (value === null || value === undefined) return null;
  }
  return value;
}

/**
 * Helper: Extract numeric value from metric object or raw number
 */
function getMetricValue(metric) {
  if (!metric) return null;
  if (typeof metric === 'number') return metric;
  if (typeof metric === 'object' && metric.value) return metric.value;
  return null;
}

/**
 * Helper: Calculate absolute and percentage change
 */
function calculateChange(snapshotVal, currentVal) {
  const absolute = currentVal - snapshotVal;
  const pct = snapshotVal !== 0 ? (absolute / Math.abs(snapshotVal)) * 100 : 0;
  return { absolute, pct };
}
