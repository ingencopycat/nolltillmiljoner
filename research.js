/**
 * NTM Research V1 - Client-side Stock Fundamentals Explorer
 * Consumes standardized NTM stock JSON files (data/stocks/<TICKER>.json)
 * Built with vanilla JavaScript and Chart.js.
 */

let annualChartInstance = null;
let quarterlyChartInstance = null;
let currentStockData = null;

const SUPPORTED_TICKERS = ['SOFI', 'NVDA', 'CRWD'];

document.addEventListener('DOMContentLoaded', () => {
    initResearchApp();
});

function initResearchApp() {
    const params = new URLSearchParams(window.location.search);
    const tickerParam = params.get('ticker');

    updateStockPills(tickerParam);

    if (!tickerParam || tickerParam.toUpperCase() === 'ALL') {
        showIndexView();
    } else {
        loadStockData(tickerParam.toUpperCase());
    }

    // Listen to theme toggles to update Chart.js colors
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            setTimeout(() => {
                if (currentStockData) {
                    renderCharts(currentStockData);
                }
            }, 50);
        });
    }

    const closeDialogBtn = document.getElementById('closeProvenanceDialog');
    if (closeDialogBtn) {
        closeDialogBtn.addEventListener('click', closeProvenanceDialog);
    }
}

function updateStockPills(activeTicker) {
    const pills = document.querySelectorAll('.research-pill');
    const upperActive = (activeTicker || 'ALL').toUpperCase();

    pills.forEach((pill) => {
        const pillTicker = pill.dataset.ticker;
        if (pillTicker === upperActive) {
            pill.classList.add('active');
            pill.setAttribute('aria-current', 'page');
        } else {
            pill.classList.remove('active');
            pill.removeAttribute('aria-current');
        }
    });
}

function showLoading() {
    document.getElementById('researchLoading').style.display = 'flex';
    document.getElementById('researchError').style.display = 'none';
    document.getElementById('researchIndex').style.display = 'none';
    document.getElementById('researchDetail').style.display = 'none';
}

function showIndexView() {
    currentStockData = null;
    document.getElementById('researchLoading').style.display = 'none';
    document.getElementById('researchError').style.display = 'none';
    document.getElementById('researchIndex').style.display = 'block';
    document.getElementById('researchDetail').style.display = 'none';
    document.title = 'NTM Research – Bolagsöversikt & Fundamentals';

    if (window.NTMRecentTools && typeof window.NTMRecentTools.record === 'function') {
        window.NTMRecentTools.record();
    }
}

function showError(title, message) {
    currentStockData = null;
    document.getElementById('researchLoading').style.display = 'none';
    document.getElementById('researchIndex').style.display = 'none';
    document.getElementById('researchDetail').style.display = 'none';

    const errorSec = document.getElementById('researchError');
    document.getElementById('researchErrorTitle').textContent = title || 'Bolaget hittades inte';
    document.getElementById('researchErrorMessage').textContent = message || 'Kunde inte läsa in data för det angivna bolaget.';
    errorSec.style.display = 'block';
    document.title = 'Kunde inte hitta bolaget – NTM Research';
}

async function loadStockData(ticker) {
    if (!SUPPORTED_TICKERS.includes(ticker)) {
        showError(
            `Ticker '${ticker}' stöds inte i V1`,
            `NTM Research V1 har stöd för verifierade bolagsmodeller för ${SUPPORTED_TICKERS.join(', ')}. Välj ett av dessa bolag nedan.`
        );
        return;
    }

    showLoading();

    try {
        const response = await fetch(`data/stocks/${ticker}.json`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} när data/stocks/${ticker}.json hämtades`);
        }
        const data = await response.json();
        currentStockData = data;
        renderStockDetail(data);

        // Record recent visit in NTM Recent Tools
        if (window.NTMRecentTools && typeof window.NTMRecentTools.record === 'function') {
            window.NTMRecentTools.record();
        }
    } catch (err) {
        console.error('Kunde inte läsa bolagsdata:', err);
        showError(
            `Kunde inte läsa data för ${ticker}`,
            `Ett fel uppstod vid inläsning av normaliserad data (${err.message}).`
        );
    }
}

function renderStockDetail(data) {
    document.getElementById('researchLoading').style.display = 'none';
    document.getElementById('researchError').style.display = 'none';
    document.getElementById('researchIndex').style.display = 'none';
    document.getElementById('researchDetail').style.display = 'block';

    const company = data.company || {};
    const metadata = data.metadata || {};

    // 1. Update Title & Header
    document.title = `${company.name} (${company.ticker}) – NTM Research`;
    document.getElementById('companyName').textContent = company.name || company.ticker;

    // Profile badge mapping
    const profileBadge = document.getElementById('companyProfileBadge');
    const profile = metadata.profile || 'standard_company';
    if (profile === 'financial_services') {
        profileBadge.className = 'badge badge-primary';
        profileBadge.textContent = 'Fintech & Banking';
    } else if (profile === 'software_saas') {
        profileBadge.className = 'badge badge-warning';
        profileBadge.textContent = 'Software & SaaS';
    } else {
        profileBadge.className = 'badge badge-accent';
        profileBadge.textContent = 'Teknologi & Hårdvara';
    }

    document.getElementById('companyCikPill').textContent = `CIK ${company.cik || ''}`;
    
    // Format Fiscal year end text
    const fye = company.fiscalYearEnd || '1231';
    const fyeText = formatFye(fye);
    document.getElementById('companyMetaLine').textContent = `${company.ticker} • ${company.sicDescription || 'Verksamhet'} • Räkenskapsår slutar ${fyeText}`;

    // Last updated
    const lastUpd = company.lastUpdated ? new Date(company.lastUpdated).toLocaleDateString('sv-SE') : 'Nyligen';
    document.getElementById('companyLastUpdated').textContent = `Bokslutsdata per ${lastUpd}`;

    // 2. Render Key Metrics (TTM & Latest Balance Sheet)
    renderKeyMetrics(data);

    // 3. Render Growth & Margins
    renderGrowthAndMargins(data);

    // 4. Initialize & Render Valuation Section
    initValuationSection(data);

    // 5. Render Annual & Quarterly Charts
    renderCharts(data);

    // 6. Render Tables
    renderAnnualTable(data);
    renderQuarterlyTable(data);

    // 7. Render Filings
    renderFilings(data);

    // 8. Initialize Min Thesis Section
    initThesisSection(data);

    // 9. Initialize Change Detection
    initChangeDetection(data);
}

function formatFye(fye) {
    if (fye === '0131') return '31 januari';
    if (fye === '1231') return '31 december';
    if (fye === '0630') return '30 juni';
    if (fye === '0930') return '30 september';
    return fye;
}

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatCurrency(val, decimals = 1, showPlus = false) {
    if (val === null || val === undefined || isNaN(val)) return '–';
    const num = Number(val);
    const sign = num < 0 ? '-' : showPlus && num > 0 ? '+' : '';
    const abs = Math.abs(num);

    if (abs >= 1e12) {
        return `${sign}$${(abs / 1e12).toFixed(decimals)}T`;
    }
    if (abs >= 1e9) {
        return `${sign}$${(abs / 1e9).toFixed(decimals)}B`;
    }
    if (abs >= 1e6) {
        return `${sign}$${(abs / 1e6).toFixed(decimals)}M`;
    }
    if (abs >= 1e3) {
        return `${sign}$${(abs / 1e3).toFixed(decimals)}k`;
    }
    return `${sign}$${abs.toFixed(decimals)}`;
}

function formatPercent(val, decimals = 1, showPlus = false) {
    if (val === null || val === undefined || isNaN(val)) return '–';
    const num = Number(val);
    const sign = showPlus && num > 0 ? '+' : '';
    return `${sign}${num.toFixed(decimals)}%`;
}

function formatNumber(val, decimals = 2) {
    if (val === null || val === undefined || isNaN(val)) return '–';
    return Number(val).toFixed(decimals);
}

// ============================================================================
// Key Metrics Rendering
// ============================================================================

function renderKeyMetrics(data) {
    const grid = document.getElementById('keyMetricsGrid');
    grid.innerHTML = '';

    const ttm = data.ttm || {};
    const ttmMetrics = ttm.metrics || {};
    const asOfPeriod = ttm.asOfPeriod || '';

    document.getElementById('ttmPeriodSubtitle').textContent = asOfPeriod ? `TTM t.o.m. ${asOfPeriod}` : 'Senaste 12 månaderna';

    // Get latest quarterly balance sheet for instant metrics
    const quarters = data.quarterly || [];
    const latestQ = quarters.length > 0 ? quarters[quarters.length - 1] : null;
    const latestQMetrics = latestQ ? latestQ.metrics : {};

    const profile = data.metadata?.profile;

    // Define card list to render based on supported metrics
    const cards = [];

    // 1. Revenue TTM
    if (ttmMetrics.revenue && ttmMetrics.revenue.value !== null) {
        cards.push({
            title: profile === 'financial_services' ? 'Nettointäkter TTM' : 'Intäkter TTM',
            value: formatCurrency(ttmMetrics.revenue.value, 2),
            sub: ttmMetrics.revenue.label,
            metricKey: 'revenue',
            provenance: ttmMetrics.revenue,
            highlight: true,
        });
    }

    // 2. Operating Income TTM (if supported)
    if (ttmMetrics.operatingIncome && ttmMetrics.operatingIncome.value !== null) {
        cards.push({
            title: 'Rörelseresultat TTM',
            value: formatCurrency(ttmMetrics.operatingIncome.value, 2),
            sub: ttmMetrics.operatingIncome.label,
            metricKey: 'operatingIncome',
            provenance: ttmMetrics.operatingIncome,
        });
    }

    // 3. Net Income TTM
    if (ttmMetrics.netIncome && ttmMetrics.netIncome.value !== null) {
        cards.push({
            title: 'Nettoresultat TTM',
            value: formatCurrency(ttmMetrics.netIncome.value, 2),
            sub: ttmMetrics.netIncome.label,
            metricKey: 'netIncome',
            provenance: ttmMetrics.netIncome,
        });
    }

    // 4. Free Cash Flow TTM (if supported)
    if (ttmMetrics.freeCashFlow && ttmMetrics.freeCashFlow.value !== null) {
        cards.push({
            title: 'Fritt kassaflöde TTM',
            value: formatCurrency(ttmMetrics.freeCashFlow.value, 2),
            sub: 'Operativt kassaflöde minus CapEx',
            metricKey: 'freeCashFlow',
            provenance: ttmMetrics.freeCashFlow,
            highlight: true,
        });
    }

    // 5. Operating Cash Flow TTM
    if (ttmMetrics.operatingCashFlow && ttmMetrics.operatingCashFlow.value !== null) {
        cards.push({
            title: 'Op. Kassaflöde TTM',
            value: formatCurrency(ttmMetrics.operatingCashFlow.value, 2),
            sub: ttmMetrics.operatingCashFlow.label,
            metricKey: 'operatingCashFlow',
            provenance: ttmMetrics.operatingCashFlow,
        });
    }

    // 6. Cash & Equivalents (Balance Sheet)
    if (latestQMetrics.cashAndCashEquivalents && latestQMetrics.cashAndCashEquivalents.value !== null) {
        cards.push({
            title: 'Kassa & likvida medel',
            value: formatCurrency(latestQMetrics.cashAndCashEquivalents.value, 2),
            sub: `Per ${latestQ.period}`,
            metricKey: 'cashAndCashEquivalents',
            provenance: latestQMetrics.cashAndCashEquivalents,
        });
    }

    // 7. Total Debt (if supported)
    if (latestQMetrics.debt && latestQMetrics.debt.value !== null) {
        cards.push({
            title: 'Total skuld',
            value: formatCurrency(latestQMetrics.debt.value, 2),
            sub: latestQMetrics.debt.label || `Per ${latestQ.period}`,
            metricKey: 'debt',
            provenance: latestQMetrics.debt,
        });
    }

    // 8. Stockholders' Equity (Balance Sheet)
    if (latestQMetrics.stockholdersEquity && latestQMetrics.stockholdersEquity.value !== null) {
        cards.push({
            title: 'Eget kapital',
            value: formatCurrency(latestQMetrics.stockholdersEquity.value, 2),
            sub: `Per ${latestQ.period}`,
            metricKey: 'stockholdersEquity',
            provenance: latestQMetrics.stockholdersEquity,
        });
    }

    // 9. Deferred Revenue / Contract Liabilities (if supported)
    if (latestQMetrics.deferredRevenue && latestQMetrics.deferredRevenue.value !== null) {
        cards.push({
            title: 'Förutbetalda intäkter',
            value: formatCurrency(latestQMetrics.deferredRevenue.value, 2),
            sub: 'Avtalsskulder / Deferred Rev',
            metricKey: 'deferredRevenue',
            provenance: latestQMetrics.deferredRevenue,
        });
    }

    // 10. Stock-Based Compensation TTM (if supported)
    if (ttmMetrics.stockBasedCompensation && ttmMetrics.stockBasedCompensation.value !== null) {
        cards.push({
            title: 'Aktiebaserad ersättn. TTM',
            value: formatCurrency(ttmMetrics.stockBasedCompensation.value, 2),
            sub: 'SBC i kassaflödet',
            metricKey: 'stockBasedCompensation',
            provenance: ttmMetrics.stockBasedCompensation,
        });
    }

    // Render cards into DOM
    cards.forEach((card) => {
        const box = document.createElement('article');
        box.className = `metric-box ${card.highlight ? 'highlight' : ''}`;
        
        const cardHeader = document.createElement('div');
        cardHeader.className = 'metric-box-header';

        const titleEl = document.createElement('span');
        titleEl.className = 'metric-box-title';
        titleEl.textContent = card.title;

        const infoBtn = document.createElement('button');
        infoBtn.type = 'button';
        infoBtn.className = 'metric-info-btn';
        infoBtn.setAttribute('aria-label', `Visa källa för ${card.title}`);
        infoBtn.title = 'Visa SEC-källhänvisning';
        infoBtn.innerHTML = 'ⓘ';
        infoBtn.addEventListener('click', () => openProvenanceDialog(card.title, card.provenance));

        cardHeader.appendChild(titleEl);
        cardHeader.appendChild(infoBtn);

        const valEl = document.createElement('span');
        valEl.className = 'metric-box-value';
        valEl.textContent = card.value;

        const subEl = document.createElement('span');
        subEl.className = 'metric-box-sub';
        subEl.textContent = card.sub;

        box.appendChild(cardHeader);
        box.appendChild(valEl);
        box.appendChild(subEl);
        grid.appendChild(box);
    });
}

// ============================================================================
// Growth & Margins Calculations
// ============================================================================

function renderGrowthAndMargins(data) {
    const grid = document.getElementById('growthMarginsGrid');
    grid.innerHTML = '';

    const annuals = data.annual || [];
    const ttm = data.ttm?.metrics || {};

    const items = [];

    // 1. Latest Annual Revenue Growth YoY
    if (annuals.length >= 2) {
        const latest = annuals[annuals.length - 1];
        const prev = annuals[annuals.length - 2];
        const revLatest = latest.metrics?.revenue?.value;
        const revPrev = prev.metrics?.revenue?.value;

        if (revLatest && revPrev && revPrev > 0) {
            const yoy = ((revLatest / revPrev) - 1) * 100;
            items.push({
                label: `Intäktstillväxt (${latest.period})`,
                value: formatPercent(yoy, 1, true),
                sub: `Från ${formatCurrency(revPrev)} till ${formatCurrency(revLatest)}`,
                positive: yoy >= 0,
            });
        }
    }

    // 2. Revenue CAGR (3Y / multi-year)
    if (annuals.length >= 3) {
        const earliest = annuals[0];
        const latest = annuals[annuals.length - 1];
        const revEarliest = earliest.metrics?.revenue?.value;
        const revLatest = latest.metrics?.revenue?.value;
        const yearsCount = latest.fiscalYear - earliest.fiscalYear;

        if (revEarliest && revLatest && revEarliest > 0 && yearsCount > 0) {
            const cagr = (Math.pow(revLatest / revEarliest, 1 / yearsCount) - 1) * 100;
            items.push({
                label: `${yearsCount} års intäkts-CAGR`,
                value: formatPercent(cagr, 1, true),
                sub: `${earliest.period} → ${latest.period}`,
                positive: cagr >= 0,
            });
        }
    }

    // 3. Net Margin TTM
    if (ttm.revenue?.value && ttm.netIncome?.value !== null && ttm.revenue?.value > 0) {
        const netMargin = (ttm.netIncome.value / ttm.revenue.value) * 100;
        items.push({
            label: 'Nettomarginal TTM',
            value: formatPercent(netMargin, 1),
            sub: 'Nettoresultat / Intäkter',
            positive: netMargin >= 0,
        });
    }

    // 4. Operating Margin TTM (if supported)
    if (ttm.revenue?.value && ttm.operatingIncome?.value !== null && ttm.operatingIncome?.value !== undefined && ttm.revenue?.value > 0) {
        const opMargin = (ttm.operatingIncome.value / ttm.revenue.value) * 100;
        items.push({
            label: 'Rörelsemarginal TTM',
            value: formatPercent(opMargin, 1),
            sub: 'Rörelseresultat / Intäkter',
            positive: opMargin >= 0,
        });
    }

    // 5. Free Cash Flow Margin TTM (if supported)
    if (ttm.revenue?.value && ttm.freeCashFlow?.value !== null && ttm.freeCashFlow?.value !== undefined && ttm.revenue?.value > 0) {
        const fcfMargin = (ttm.freeCashFlow.value / ttm.revenue.value) * 100;
        items.push({
            label: 'FCF-marginal TTM',
            value: formatPercent(fcfMargin, 1),
            sub: 'Fritt kassaflöde / Intäkter',
            positive: fcfMargin >= 0,
        });
    }

    // 6. SBC as % of Revenue TTM (if supported)
    if (ttm.revenue?.value && ttm.stockBasedCompensation?.value !== null && ttm.stockBasedCompensation?.value !== undefined && ttm.revenue?.value > 0) {
        const sbcPct = (ttm.stockBasedCompensation.value / ttm.revenue.value) * 100;
        items.push({
            label: 'SBC % av intäkter TTM',
            value: formatPercent(sbcPct, 1),
            sub: 'Aktiebaserad ersättn. / Intäkter',
        });
    }

    items.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'growth-metric-card';

        const labelEl = document.createElement('span');
        labelEl.className = 'growth-label';
        labelEl.textContent = item.label;

        const valEl = document.createElement('span');
        valEl.className = `growth-value ${item.positive === true ? 'val-positive' : item.positive === false ? 'val-negative' : ''}`;
        valEl.textContent = item.value;

        const subEl = document.createElement('span');
        subEl.className = 'growth-sub';
        subEl.textContent = item.sub;

        card.appendChild(labelEl);
        card.appendChild(valEl);
        card.appendChild(subEl);
        grid.appendChild(card);
    });
}

// ============================================================================
// Chart.js Rendering
// ============================================================================

function getThemeColors() {
    const isLight = document.body.classList.contains('light-theme');
    return {
        text: isLight ? '#0f1e2d' : '#edf6ff',
        muted: isLight ? '#53657b' : '#9bb0c4',
        grid: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(148, 163, 184, 0.14)',
        primary: isLight ? '#117d6e' : '#3dd9c6',
        accent: isLight ? '#2a65d8' : '#5ea3ff',
        success: isLight ? '#147d55' : '#7ef7c7',
        warning: isLight ? '#b8860b' : '#ffd166',
        danger: isLight ? '#c23b3b' : '#ff6b6b',
    };
}

function renderCharts(data) {
    const colors = getThemeColors();
    const annuals = data.annual || [];
    const quarters = data.quarterly || [];
    const profile = data.metadata?.profile;

    // 1. Annual Chart
    const annualCanvas = document.getElementById('annualChart');
    if (annualCanvas) {
        if (annualChartInstance) {
            annualChartInstance.destroy();
        }

        const labels = annuals.map((a) => a.period);
        const revData = annuals.map((a) => a.metrics?.revenue?.value !== null ? a.metrics.revenue.value / 1e9 : null);
        const netIncData = annuals.map((a) => a.metrics?.netIncome?.value !== null ? a.metrics.netIncome.value / 1e9 : null);
        const fcfData = annuals.map((a) => a.metrics?.freeCashFlow?.value !== null && a.metrics.freeCashFlow?.value !== undefined ? a.metrics.freeCashFlow.value / 1e9 : null);

        const datasets = [
            {
                label: 'Intäkter ($B)',
                data: revData,
                backgroundColor: colors.primary,
                borderRadius: 6,
                barPercentage: 0.7,
            },
            {
                label: 'Nettoresultat ($B)',
                data: netIncData,
                backgroundColor: colors.accent,
                borderRadius: 6,
                barPercentage: 0.7,
            },
        ];

        if (profile !== 'financial_services' && fcfData.some((v) => v !== null)) {
            datasets.push({
                label: 'Fritt kassaflöde ($B)',
                data: fcfData,
                backgroundColor: colors.success,
                borderRadius: 6,
                barPercentage: 0.7,
            });
        }

        annualChartInstance = new Chart(annualCanvas, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: colors.text, boxWidth: 14, font: { size: 12 } },
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: $${Number(ctx.parsed.y).toFixed(2)}B`,
                        },
                    },
                },
                scales: {
                    x: { ticks: { color: colors.muted }, grid: { color: colors.grid } },
                    y: {
                        ticks: {
                            color: colors.muted,
                            callback: (v) => `$${v}B`,
                        },
                        grid: { color: colors.grid },
                    },
                },
            },
        });
    }

    // 2. Quarterly Chart
    const quarterlyCanvas = document.getElementById('quarterlyChart');
    if (quarterlyCanvas) {
        if (quarterlyChartInstance) {
            quarterlyChartInstance.destroy();
        }

        const labels = quarters.map((q) => q.period);
        const revData = quarters.map((q) => q.metrics?.revenue?.value !== null ? q.metrics.revenue.value / 1e9 : null);
        const netIncData = quarters.map((q) => q.metrics?.netIncome?.value !== null ? q.metrics.netIncome.value / 1e9 : null);
        const fcfData = quarters.map((q) => q.metrics?.freeCashFlow?.value !== null && q.metrics.freeCashFlow?.value !== undefined ? q.metrics.freeCashFlow.value / 1e9 : null);

        const datasets = [
            {
                label: 'Intäkter ($B)',
                data: revData,
                backgroundColor: colors.primary,
                borderRadius: 4,
                barPercentage: 0.6,
            },
            {
                label: 'Nettoresultat ($B)',
                data: netIncData,
                backgroundColor: colors.accent,
                borderRadius: 4,
                barPercentage: 0.6,
            },
        ];

        if (profile !== 'financial_services' && fcfData.some((v) => v !== null)) {
            datasets.push({
                label: 'Fritt kassaflöde ($B)',
                data: fcfData,
                backgroundColor: colors.success,
                borderRadius: 4,
                barPercentage: 0.6,
            });
        }

        quarterlyChartInstance = new Chart(quarterlyCanvas, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: colors.text, boxWidth: 14, font: { size: 12 } },
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: $${Number(ctx.parsed.y).toFixed(3)}B`,
                        },
                    },
                },
                scales: {
                    x: { ticks: { color: colors.muted, maxRotation: 45 }, grid: { color: colors.grid } },
                    y: {
                        ticks: {
                            color: colors.muted,
                            callback: (v) => `$${v}B`,
                        },
                        grid: { color: colors.grid },
                    },
                },
            },
        });
    }
}

// ============================================================================
// Tables Rendering
// ============================================================================

function renderAnnualTable(data) {
    const tbody = document.getElementById('annualTableBody');
    tbody.innerHTML = '';

    const annuals = data.annual || [];
    const profile = data.metadata?.profile;

    annuals.forEach((item) => {
        const m = item.metrics || {};
        const tr = document.createElement('tr');

        // Period & form
        const tdPeriod = document.createElement('td');
        tdPeriod.innerHTML = `<strong>${escapeHtml(item.period)}</strong> <span class="badge badge-subtle">${escapeHtml(item.form)}</span>`;

        // Revenue
        const tdRev = createMetricCell(m.revenue);
        // Op Income
        const tdOpInc = createMetricCell(m.operatingIncome);
        // Net Income
        const tdNetInc = createMetricCell(m.netIncome);
        // EPS
        const tdEps = document.createElement('td');
        tdEps.textContent = m.dilutedEps?.value !== null && m.dilutedEps?.value !== undefined ? `$${Number(m.dilutedEps.value).toFixed(2)}` : '–';
        // OCF
        const tdOcf = createMetricCell(m.operatingCashFlow);
        // CapEx
        const tdCapEx = createMetricCell(m.capex);
        // FCF
        const tdFcf = profile !== 'financial_services' ? createMetricCell(m.freeCashFlow) : document.createElement('td');
        if (profile === 'financial_services') tdFcf.textContent = '–';

        tr.appendChild(tdPeriod);
        tr.appendChild(tdRev);
        tr.appendChild(tdOpInc);
        tr.appendChild(tdNetInc);
        tr.appendChild(tdEps);
        tr.appendChild(tdOcf);
        tr.appendChild(tdCapEx);
        tr.appendChild(tdFcf);

        tbody.appendChild(tr);
    });
}

function renderQuarterlyTable(data) {
    const tbody = document.getElementById('quarterlyTableBody');
    tbody.innerHTML = '';

    const quarters = data.quarterly || [];
    const profile = data.metadata?.profile;

    // Render chronologically (or reverse if user wants, let's render latest first for quick view or chronological)
    const reversed = [...quarters].reverse();

    reversed.forEach((item) => {
        const m = item.metrics || {};
        const tr = document.createElement('tr');

        // Period
        const tdPeriod = document.createElement('td');
        tdPeriod.innerHTML = `<strong>${escapeHtml(item.period)}</strong> <span class="badge badge-subtle">${escapeHtml(item.form)}</span>`;

        // Date span
        const tdSpan = document.createElement('td');
        tdSpan.className = 'cell-muted';
        tdSpan.textContent = item.periodStart ? `${item.periodStart} → ${item.periodEnd}` : `T.o.m. ${item.periodEnd}`;

        // Revenue
        const tdRev = createMetricCell(m.revenue);
        // Net Income
        const tdNetInc = createMetricCell(m.netIncome);
        // EPS
        const tdEps = document.createElement('td');
        tdEps.textContent = m.dilutedEps?.value !== null && m.dilutedEps?.value !== undefined ? `$${Number(m.dilutedEps.value).toFixed(2)}` : '–';
        // OCF
        const tdOcf = createMetricCell(m.operatingCashFlow);
        // CapEx
        const tdCapEx = createMetricCell(m.capex);
        // FCF
        const tdFcf = profile !== 'financial_services' ? createMetricCell(m.freeCashFlow) : document.createElement('td');
        if (profile === 'financial_services') tdFcf.textContent = '–';

        tr.appendChild(tdPeriod);
        tr.appendChild(tdSpan);
        tr.appendChild(tdRev);
        tr.appendChild(tdNetInc);
        tr.appendChild(tdEps);
        tr.appendChild(tdOcf);
        tr.appendChild(tdCapEx);
        tr.appendChild(tdFcf);

        tbody.appendChild(tr);
    });
}

function createMetricCell(metric) {
    const td = document.createElement('td');
    if (!metric || metric.value === null || metric.value === undefined) {
        td.textContent = '–';
        return td;
    }

    const valFormatted = formatCurrency(metric.value, 2);
    td.textContent = valFormatted;

    if (metric.isDerived) {
        td.title = `${metric.derivationNotes || 'Härlett värde'} (Klicka för källa)`;
        td.classList.add('cell-derived');
    }

    td.style.cursor = 'pointer';
    td.addEventListener('click', () => openProvenanceDialog(metric.label || 'Nyckeltal', metric));
    return td;
}

// ============================================================================
// Filings List Rendering
// ============================================================================

function renderFilings(data) {
    const list = document.getElementById('filingsList');
    list.innerHTML = '';

    const filings = data.filings || [];
    const displayFilings = filings.slice(0, 8);

    if (displayFilings.length === 0) {
        list.innerHTML = '<p class="cell-muted">Inga inlämningar funna.</p>';
        return;
    }

    displayFilings.forEach((f) => {
        const item = document.createElement('div');
        item.className = 'filing-item-card';

        const formBadgeClass = f.form.includes('10-K') ? 'badge-primary' : 'badge-accent';

        item.innerHTML = `
            <div class="filing-item-left">
                <span class="badge ${formBadgeClass}">${escapeHtml(f.form)}</span>
                <div class="filing-meta-block">
                    <span class="filing-period">Periodslut: <strong>${escapeHtml(f.reportPeriod)}</strong></span>
                    <span class="filing-date">Inlämnad: ${escapeHtml(f.filingDate)} • Acc: <code class="filing-acc">${escapeHtml(f.accessionNumber)}</code></span>
                </div>
            </div>
            <div class="filing-item-right">
                <a href="${escapeHtml(f.primaryDocUrl || f.secFilingUrl)}" target="_blank" rel="noopener noreferrer" class="secondary-btn filing-link-btn">
                    Öppna hos SEC ↗
                </a>
            </div>
        `;

        list.appendChild(item);
    });
}

// ============================================================================
// Provenance Dialog Modal
// ============================================================================

function openProvenanceDialog(title, provenance) {
    const dialog = document.getElementById('provenanceDialog');
    const content = document.getElementById('provenanceDialogContent');

    if (!dialog || !content || !provenance) return;

    let rowsHtml = `
        <div class="prov-row"><span class="prov-label">Metrik:</span><span class="prov-val"><strong>${escapeHtml(title)}</strong></span></div>
        <div class="prov-row"><span class="prov-label">Rapporterat värde:</span><span class="prov-val">${provenance.value !== null ? provenance.value.toLocaleString('sv-SE') + ' ' + (provenance.unit || 'USD') : 'null (unsupported)'}</span></div>
        <div class="prov-row"><span class="prov-label">Källa:</span><span class="prov-val">Officiell SEC EDGAR XBRL</span></div>
    `;

    if (provenance.concept) {
        rowsHtml += `<div class="prov-row"><span class="prov-label">XBRL Concept:</span><span class="prov-val"><code>${escapeHtml(provenance.taxonomy || 'us-gaap')}:${escapeHtml(provenance.concept)}</code></span></div>`;
    }

    if (provenance.period) {
        rowsHtml += `<div class="prov-row"><span class="prov-label">Period:</span><span class="prov-val">${escapeHtml(provenance.period)} ${provenance.periodStart ? `(${provenance.periodStart} → ${provenance.periodEnd})` : `(Per ${provenance.periodEnd})`}</span></div>`;
    }

    if (provenance.form) {
        rowsHtml += `<div class="prov-row"><span class="prov-label">SEC Form:</span><span class="prov-val"><span class="badge badge-subtle">${escapeHtml(provenance.form)}</span></span></div>`;
    }

    if (provenance.filed) {
        rowsHtml += `<div class="prov-row"><span class="prov-label">Inlämnad datum:</span><span class="prov-val">${escapeHtml(provenance.filed)}</span></div>`;
    }

    if (provenance.accession) {
        rowsHtml += `<div class="prov-row"><span class="prov-label">Accession Number:</span><span class="prov-val"><code>${escapeHtml(provenance.accession)}</code></span></div>`;
    }

    if (provenance.isDerived) {
        rowsHtml += `<div class="prov-row"><span class="prov-label">Härledning:</span><span class="prov-val">${escapeHtml(provenance.derivationNotes || provenance.derivationMethod || 'Säker matematisk härledning')}</span></div>`;
        if (provenance.derivedFrom && provenance.derivedFrom.length > 0) {
            rowsHtml += `<div class="prov-row"><span class="prov-label">Underliggande källor:</span><span class="prov-val"><code>${escapeHtml(provenance.derivedFrom.join(', '))}</code></span></div>`;
        }
        if (provenance.quartersIncluded) {
            rowsHtml += `<div class="prov-row"><span class="prov-label">Kvartal i TTM:</span><span class="prov-val">${escapeHtml(provenance.quartersIncluded.join(' + '))}</span></div>`;
        }
    }

    if (provenance.unsupportedReason) {
        rowsHtml += `<div class="prov-row"><span class="prov-label">Motivering:</span><span class="prov-val">${escapeHtml(provenance.unsupportedReason)}</span></div>`;
    }

    content.innerHTML = rowsHtml;

    if (typeof dialog.showModal === 'function') {
        dialog.showModal();
    } else {
        dialog.setAttribute('open', '');
    }
}

function closeProvenanceDialog() {
    const dialog = document.getElementById('provenanceDialog');
    if (!dialog) return;

    if (typeof dialog.close === 'function') {
        dialog.close();
    } else {
        dialog.removeAttribute('open');
    }
}

// ============================================================================
// Valuation & Forward-Looking Scenario Explorer
// ============================================================================

let valuationState = {
    isManualEps: false,
    calculated: false,
    stale: false,
};

function initValuationSection(data) {
    const valSection = document.getElementById('valuationSection');
    if (!valSection) return;

    const vb = data.valuationBase || {};
    const ticker = data.symbol;

    // 1. Initial stock prices per ticker
    const defaultPrices = {
        NVDA: 120.00,
        SOFI: 15.00,
        CRWD: 280.00,
    };
    const initPrice = defaultPrices[ticker] || 100.00;
    const priceInput = document.getElementById('val-price');
    if (priceInput) priceInput.value = initPrice.toFixed(2);

    // 2. Initial EPS determination
    const ttmEpsVal = vb.ttmDilutedEps?.value;
    const overrideBanner = document.getElementById('val-override-banner');
    const epsInput = document.getElementById('val-eps');
    const epsBadge = document.getElementById('val-eps-badge');
    const epsHelp = document.getElementById('val-eps-help');

    if (ttmEpsVal !== null && ttmEpsVal !== undefined && ttmEpsVal > 0) {
        valuationState.isManualEps = false;
        if (overrideBanner) overrideBanner.style.display = 'none';
        if (epsInput) epsInput.value = ttmEpsVal.toFixed(2);
        if (epsBadge) {
            epsBadge.textContent = 'SEC TTM';
            epsBadge.classList.remove('manual');
        }
        if (epsHelp) epsHelp.textContent = `Hämtas från normaliserad TTM common income / diluted shares ($${ttmEpsVal.toFixed(2)} SEC-derived).`;
    } else {
        // TTM EPS is null (e.g. CRWD mid-year stock split)
        valuationState.isManualEps = true;
        if (overrideBanner) {
            overrideBanner.style.display = 'block';
            document.getElementById('val-override-title').textContent = 'TTM EPS saknas i SEC-data';
            document.getElementById('val-override-desc').textContent = (
                vb.ttmDilutedShares?.notes ||
                'Bolagets TTM EPS kan inte härledas automatiskt från SEC-data (t.ex. på grund av aktiesplit mitt i perioden). ' +
                'Ange en antagen EPS manuellt nedan för att räkna på värdering och framtidsscenarier.'
            );
        }
        if (epsInput) {
            epsInput.value = (1.00).toFixed(2);
        }
        if (epsBadge) {
            epsBadge.textContent = 'Manuell';
            epsBadge.classList.add('manual');
        }
        if (epsHelp) epsHelp.textContent = 'Manuell EPS-inmatning för värderingskalkylen.';
    }

    // Default return and years
    document.getElementById('val-return').value = 10;
    document.getElementById('val-years').value = 5;
    document.getElementById('val-exit-pe').value = 25;

    // Scenario inputs defaults
    document.getElementById('sc-bear-growth').value = 5;
    document.getElementById('sc-bear-pe').value = 18;
    document.getElementById('sc-base-growth').value = 15;
    document.getElementById('sc-base-pe').value = 25;
    document.getElementById('sc-bull-growth').value = 25;
    document.getElementById('sc-bull-pe').value = 32;

    // Reset banner
    const banner = document.getElementById('valuationStatusBanner');
    if (banner) banner.style.display = 'none';

    // 3. Attach Stale Event Listeners
    const allValInputs = [
        document.getElementById('val-price'),
        document.getElementById('val-eps'),
        document.getElementById('val-return'),
        document.getElementById('val-years'),
        document.getElementById('val-exit-pe'),
        document.getElementById('sc-bear-growth'),
        document.getElementById('sc-bear-pe'),
        document.getElementById('sc-base-growth'),
        document.getElementById('sc-base-pe'),
        document.getElementById('sc-bull-growth'),
        document.getElementById('sc-bull-pe'),
    ];

    allValInputs.forEach((inputEl) => {
        if (!inputEl) return;
        inputEl.oninput = () => {
            markValuationStale();
            if (inputEl.id === 'val-eps') {
                valuationState.isManualEps = true;
                if (epsBadge) {
                    epsBadge.textContent = 'Manuell';
                    epsBadge.classList.add('manual');
                }
                if (epsHelp) epsHelp.textContent = 'Manuell EPS-inmatning för värderingskalkylen.';
            }
        };
    });

    const valForm = document.getElementById('valuationForm');
    if (valForm) {
        valForm.onsubmit = (e) => {
            e.preventDefault();
            calculateValuation(data);
        };
    }

    // 4. Initial Calculation
    calculateValuation(data);
}

function markValuationStale() {
    valuationState.stale = true;
    const banner = document.getElementById('valuationStatusBanner');
    if (banner) {
        banner.className = 'calc-status-banner calc-status-stale';
        banner.textContent = 'Ändrade antaganden — klicka "Beräkna värdering & scenarier" för att uppdatera kalkylen.';
        banner.style.display = 'block';
    }
}

function showValuationError(msg) {
    const banner = document.getElementById('valuationStatusBanner');
    if (banner) {
        banner.className = 'calc-status-banner calc-status-error';
        banner.textContent = msg;
        banner.style.display = 'block';
    }
}

function calculateValuation(data) {
    const banner = document.getElementById('valuationStatusBanner');
    const vb = data.valuationBase || {};
    const ttm = data.ttm?.metrics || {};
    const profile = data.metadata?.profile;

    const price = parseFloat(document.getElementById('val-price').value);
    const eps = parseFloat(document.getElementById('val-eps').value);
    const reqReturn = parseFloat(document.getElementById('val-return').value);
    const years = parseInt(document.getElementById('val-years').value, 10);
    const exitPE = parseFloat(document.getElementById('val-exit-pe').value);

    const bearGrowth = parseFloat(document.getElementById('sc-bear-growth').value);
    const bearPE = parseFloat(document.getElementById('sc-bear-pe').value);
    const baseGrowth = parseFloat(document.getElementById('sc-base-growth').value);
    const basePE = parseFloat(document.getElementById('sc-base-pe').value);
    const bullGrowth = parseFloat(document.getElementById('sc-bull-growth').value);
    const bullPE = parseFloat(document.getElementById('sc-bull-pe').value);

    // Validation
    if (isNaN(price) || price <= 0) {
        showValuationError('Aktiekurs måste vara större än 0.');
        return;
    }
    if (isNaN(eps) || eps <= 0) {
        showValuationError('EPS måste vara större än 0 för P/E- och tillväxtberäkning. Ange ett positivt värde för framtida normaliserad intjäning per aktie.');
        return;
    }
    if (isNaN(years) || years < 1) {
        showValuationError('Tidshorisonten måste vara minst 1 år.');
        return;
    }
    if (isNaN(reqReturn) || reqReturn <= -100) {
        showValuationError('Önskad avkastning måste vara större än -100 %.');
        return;
    }
    if (isNaN(exitPE) || exitPE <= 0) {
        showValuationError('Exit P/E måste vara större än 0.');
        return;
    }
    if (isNaN(bearGrowth) || bearGrowth <= -100 || isNaN(baseGrowth) || baseGrowth <= -100 || isNaN(bullGrowth) || bullGrowth <= -100) {
        showValuationError('EPS-tillväxt i scenarierna måste vara större än -100 %.');
        return;
    }
    if (isNaN(bearPE) || bearPE <= 0 || isNaN(basePE) || basePE <= 0 || isNaN(bullPE) || bullPE <= 0) {
        showValuationError('Framtida P/E i scenarierna måste vara större än 0.');
        return;
    }

    // A. Valuation Snapshot
    const pe = price / eps;
    document.getElementById('val-pe-result').textContent = `${pe.toFixed(1)}x`;

    const fcfPsVal = vb.ttmFcfPerShare?.value;
    const pfcfBox = document.getElementById('val-pfcf-box');
    const fcfPsBox = document.getElementById('val-fcf-ps-box');

    if (profile !== 'financial_services' && fcfPsVal !== null && fcfPsVal !== undefined && fcfPsVal > 0) {
        const pfcf = price / fcfPsVal;
        pfcfBox.style.display = 'flex';
        fcfPsBox.style.display = 'flex';
        document.getElementById('val-pfcf-result').textContent = `${pfcf.toFixed(1)}x`;
        document.getElementById('val-fcf-ps-result').textContent = `$${fcfPsVal.toFixed(2)}`;
    } else {
        pfcfBox.style.display = 'none';
        fcfPsBox.style.display = 'none';
    }

    document.getElementById('val-eps-basis-result').textContent = `$${eps.toFixed(2)}`;
    document.getElementById('val-eps-basis-sub').textContent = valuationState.isManualEps ? 'Manuell EPS' : `SEC TTM ($${eps.toFixed(2)})`;

    // B. What is priced in (Reverse Valuation)
    const r = reqReturn / 100;
    const requiredFuturePrice = price * Math.pow(1 + r, years);
    const requiredFutureEPS = requiredFuturePrice / exitPE;
    const requiredEPSCAGR = (Math.pow(requiredFutureEPS / eps, 1 / years) - 1) * 100;

    document.getElementById('rev-cagr-result').textContent = formatPercent(requiredEPSCAGR, 1, true);
    document.getElementById('rev-future-eps-result').textContent = `$${requiredFutureEPS.toFixed(2)}`;
    document.getElementById('rev-future-price-result').textContent = `$${requiredFuturePrice.toFixed(2)}`;
    document.getElementById('rev-starting-eps-result').textContent = `$${eps.toFixed(2)} (${valuationState.isManualEps ? 'Manuell' : 'SEC TTM'})`;
    document.getElementById('rev-exit-pe-result').textContent = `${exitPE.toFixed(1)}x`;
    document.getElementById('rev-return-result').textContent = `${formatPercent(reqReturn, 1, true)} / år`;
    document.getElementById('rev-years-label-1').textContent = String(years);
    document.getElementById('rev-years-label-2').textContent = String(years);

    // C. Historical Context in Reverse Valuation
    renderReverseValuationContext(data, requiredEPSCAGR);

    // D. Bear / Base / Bull Scenarios
    const scenarios = [
        { name: 'bear', growth: bearGrowth / 100, pe: bearPE },
        { name: 'base', growth: baseGrowth / 100, pe: basePE },
        { name: 'bull', growth: bullGrowth / 100, pe: bullPE },
    ];

    scenarios.forEach((sc) => {
        const futEps = eps * Math.pow(1 + sc.growth, years);
        const futPrice = futEps * sc.pe;
        const totRet = (futPrice / price - 1) * 100;
        const cagr = (Math.pow(futPrice / price, 1 / years) - 1) * 100;

        document.getElementById(`sc-${sc.name}-eps`).textContent = `$${futEps.toFixed(2)}`;
        document.getElementById(`sc-${sc.name}-price`).textContent = `$${futPrice.toFixed(2)}`;
        document.getElementById(`sc-${sc.name}-total-return`).textContent = formatPercent(totRet, 1, true);
        document.getElementById(`sc-${sc.name}-cagr`).textContent = formatPercent(cagr, 1, true);
    });

    document.getElementById('sc-years-label').textContent = String(years);
    document.getElementById('sc-start-eps-label').textContent = `$${eps.toFixed(2)}`;

    // E. 5x5 Sensitivity Matrix
    renderSensitivityMatrix({
        price,
        eps,
        years,
        baseGrowth,
        basePE,
    });

    // Clear stale state
    if (banner) banner.style.display = 'none';
    valuationState.stale = false;
    valuationState.calculated = true;
}

function renderReverseValuationContext(data, requiredEPSCAGR) {
    const pillsContainer = document.getElementById('contextPills');
    if (!pillsContainer) return;
    pillsContainer.innerHTML = '';

    const annuals = data.annual || [];

    // 1. Required EPS growth pill
    const reqPill = document.createElement('div');
    reqPill.className = 'context-pill';
    reqPill.innerHTML = `
        <span class="context-pill-label">Krävd EPS-tillväxt</span>
        <span class="context-pill-val" style="color: var(--primary);">${formatPercent(requiredEPSCAGR, 1, true)}</span>
    `;
    pillsContainer.appendChild(reqPill);

    // 2. Latest Annual Revenue YoY
    if (annuals.length >= 2) {
        const latest = annuals[annuals.length - 1];
        const prev = annuals[annuals.length - 2];
        const revLatest = latest.metrics?.revenue?.value;
        const revPrev = prev.metrics?.revenue?.value;

        if (revLatest && revPrev && revPrev > 0) {
            const yoy = ((revLatest / revPrev) - 1) * 100;
            const yoyPill = document.createElement('div');
            yoyPill.className = 'context-pill';
            yoyPill.innerHTML = `
                <span class="context-pill-label">Intäktstillväxt (${latest.period})</span>
                <span class="context-pill-val">${formatPercent(yoy, 1, true)}</span>
            `;
            pillsContainer.appendChild(yoyPill);
        }
    }

    // 3. Multi-year Revenue CAGR
    if (annuals.length >= 3) {
        const earliest = annuals[0];
        const latest = annuals[annuals.length - 1];
        const revEarliest = earliest.metrics?.revenue?.value;
        const revLatest = latest.metrics?.revenue?.value;
        const yearsCount = latest.fiscalYear - earliest.fiscalYear;

        if (revEarliest && revLatest && revEarliest > 0 && yearsCount > 0) {
            const cagr = (Math.pow(revLatest / revEarliest, 1 / yearsCount) - 1) * 100;
            const cagrPill = document.createElement('div');
            cagrPill.className = 'context-pill';
            cagrPill.innerHTML = `
                <span class="context-pill-label">Intäkts-CAGR (${yearsCount} år)</span>
                <span class="context-pill-val">${formatPercent(cagr, 1, true)}</span>
            `;
            pillsContainer.appendChild(cagrPill);
        }
    }
}

function renderSensitivityMatrix({ price, eps, years, baseGrowth, basePE }) {
    const table = document.getElementById('sensitivityTable');
    if (!table) return;

    document.getElementById('sens-years-label').textContent = String(years);

    // Generate 5 rows of EPS growth centered on baseGrowth
    const growthOffsets = [-10, -5, 0, 5, 10];
    const rowGrowths = growthOffsets.map((offset) => Math.max(-50, baseGrowth + offset));

    // Generate 5 columns of Exit P/E centered on basePE
    const peOffsets = [-10, -5, 0, 5, 10];
    const colPEs = peOffsets.map((offset) => Math.max(5, basePE + offset));

    let html = '<thead><tr>';
    html += '<th class="sens-corner-header">EPS-tillväxt \\ Exit P/E</th>';
    colPEs.forEach((pe) => {
        html += `<th class="sens-header-col">${pe.toFixed(0)}x</th>`;
    });
    html += '</tr></thead><tbody>';

    rowGrowths.forEach((g, rIdx) => {
        const isBaseRow = growthOffsets[rIdx] === 0;
        html += `<tr><th class="sens-header-row ${isBaseRow ? 'sens-header-base' : ''}">${formatPercent(g, 0, true)} / år</th>`;

        colPEs.forEach((pe, cIdx) => {
            const isBaseCol = peOffsets[cIdx] === 0;
            const isCenterBase = isBaseRow && isBaseCol;

            const futEps = eps * Math.pow(1 + g / 100, years);
            const futPrice = futEps * pe;
            const cagr = (Math.pow(futPrice / price, 1 / years) - 1) * 100;

            html += `
                <td class="sens-cell ${isCenterBase ? 'sens-cell-base' : ''}" title="${formatPercent(g, 1, true)} tillväxt & ${pe}x P/E -> $${futPrice.toFixed(2)} (${formatPercent(cagr, 1, true)} CAGR)">
                    <span class="sens-cell-price">$${futPrice.toFixed(1)}</span>
                    <small class="sens-cell-cagr ${cagr >= 0 ? 'val-positive' : 'val-negative'}">${formatPercent(cagr, 1, true)}</small>
                </td>
            `;
        });

        html += '</tr>';
    });

    html += '</tbody>';
    table.innerHTML = html;
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============================================================================
// Min Thesis V1 - User Research Journal & Valuation Snapshot
// ============================================================================

// Global thesis state for current stock
let currentThesisState = {
    ticker: null,
    thesis: null,
    isDirty: false,
};

function initThesisSection(data) {
    if (!data || !data.symbol) return;

    currentThesisState.ticker = data.symbol;

    // 1. Load existing thesis from localStorage
    const { thesis, error: readError } = window.NTMThesisStorage.get(data.symbol);
    currentThesisState.thesis = thesis;

    // 2. Populate form fields
    const thesisForm = document.getElementById('thesisForm');
    const thesisText = document.getElementById('thesis-text');
    const thesisRisks = document.getElementById('thesis-risks');
    const thesisTrigger = document.getElementById('thesis-trigger');
    const thesisNotes = document.getElementById('thesis-notes');

    if (thesis) {
        if (thesisText) thesisText.value = thesis.text || '';
        if (thesisRisks) thesisRisks.value = thesis.risks || '';
        if (thesisTrigger) thesisTrigger.value = thesis.triggerChange || '';
        if (thesisNotes) thesisNotes.value = thesis.notes || '';

        // Show "Sparad" indicator
        showThesisSavedIndicator(thesis.updatedAt);

        // Show delete button
        const deleteBtn = document.getElementById('thesisDeleteBtn');
        if (deleteBtn) deleteBtn.style.display = 'inline-block';

        // Show snapshot preview
        if (thesis.valuationSnapshot) {
            displayThesisSnapshotPreview(thesis.valuationSnapshot);
        }
    } else {
        // Clear form
        if (thesisText) thesisText.value = '';
        if (thesisRisks) thesisRisks.value = '';
        if (thesisTrigger) thesisTrigger.value = '';
        if (thesisNotes) thesisNotes.value = '';

        // Hide delete button & saved indicator
        const deleteBtn = document.getElementById('thesisDeleteBtn');
        if (deleteBtn) deleteBtn.style.display = 'none';

        hideThesisSavedIndicator();
    }

    // 3. Attach event listeners
    if (thesisForm) {
        thesisForm.onsubmit = (e) => {
            e.preventDefault();
            saveThesis(data);
        };
    }

    const deleteBtn = document.getElementById('thesisDeleteBtn');
    if (deleteBtn) {
        deleteBtn.onclick = () => {
            if (confirm('Är du säker på att du vill radera denna analys?')) {
                deleteStoredThesis();
            }
        };
    }

    // 4. Mark form as dirty on input
    [thesisText, thesisRisks, thesisTrigger, thesisNotes].forEach((el) => {
        if (el) {
            el.oninput = () => {
                currentThesisState.isDirty = true;
                hideThesisSavedIndicator();
            };
        }
    });

    // 5. Show thesis metadata
    const metadataDiv = document.getElementById('thesisMetadata');
    if (metadataDiv) metadataDiv.style.display = 'block';
}

function saveThesis(data) {
    const ticker = data.symbol || '';
    const companyName = data.company?.name || '';

    const thesisText = document.getElementById('thesis-text')?.value || '';
    const thesisRisks = document.getElementById('thesis-risks')?.value || '';
    const thesisTrigger = document.getElementById('thesis-trigger')?.value || '';
    const thesisNotes = document.getElementById('thesis-notes')?.value || '';

    // Validate
    if (!thesisText.trim()) {
        showThesisError('Min tes är obligatorisk. Skriv din investeringsteori innan du sparar.');
        return;
    }

    // Check if valuation is stale
    if (valuationState.stale) {
        showThesisError(
            'Värderingen har ändrats sedan beräkningen. Klicka "Beräkna värdering & scenarier" innan du sparar thesisen.'
        );
        return;
    }

    // Create valuation snapshot (only if valuation has been calculated)
    let valuationSnapshot = null;
    if (valuationState.calculated && !valuationState.stale) {
        valuationSnapshot = captureValuationSnapshot(data);
    }

    // Build thesis object
    const thesis = {
        text: thesisText,
        risks: thesisRisks,
        triggerChange: thesisTrigger,
        notes: thesisNotes,
        companyName,
        valuationSnapshot,
    };

    // Save to localStorage
    const result = window.NTMThesisStorage.save(ticker, thesis);

    if (!result.success) {
        showThesisError(result.error || 'Kunde inte spara analysen.');
        return;
    }

    // Update state
    currentThesisState.thesis = { ...thesis, ticker, createdAt: result.createdAt, updatedAt: result.updatedAt };
    currentThesisState.isDirty = false;

    // Show success
    showThesisSuccess(thesis.valuationSnapshot);
    showThesisSavedIndicator(new Date().toISOString());

    // Show delete button
    const deleteBtn = document.getElementById('thesisDeleteBtn');
    if (deleteBtn) deleteBtn.style.display = 'inline-block';

    // Record in recent tools
    if (window.NTMRecentTools && typeof window.NTMRecentTools.record === 'function') {
        window.NTMRecentTools.record();
    }
}

function captureValuationSnapshot(data) {
    // Extract current valuation inputs & results
    const price = parseFloat(document.getElementById('val-price')?.value || 0);
    const eps = parseFloat(document.getElementById('val-eps')?.value || 0);
    const reqReturn = parseFloat(document.getElementById('val-return')?.value || 0);
    const years = parseInt(document.getElementById('val-years')?.value || 5, 10);
    const exitPE = parseFloat(document.getElementById('val-exit-pe')?.value || 0);

    const bearGrowth = parseFloat(document.getElementById('sc-bear-growth')?.value || 0);
    const bearPE = parseFloat(document.getElementById('sc-bear-pe')?.value || 0);
    const baseGrowth = parseFloat(document.getElementById('sc-base-growth')?.value || 0);
    const basePE = parseFloat(document.getElementById('sc-base-pe')?.value || 0);
    const bullGrowth = parseFloat(document.getElementById('sc-bull-growth')?.value || 0);
    const bullPE = parseFloat(document.getElementById('sc-bull-pe')?.value || 0);

    const vb = data.valuationBase || {};
    const ttm = data.ttm || {};
    const asOfPeriod = ttm.asOfPeriod || '';

    // Snapshot structure
    const snapshot = {
        capturedAt: new Date().toISOString(),
        asOfPeriod,
        ticker: data.symbol,
        companyName: data.company?.name || '',

        // Research Data Snapshot
        ttmMetrics: {
            revenue: vb.ttmRevenue?.value || null,
            revenueLabel: vb.ttmRevenue?.label || '',
            eps: vb.ttmDilutedEps?.value || null,
            dilutedShares: vb.ttmDilutedShares?.value || null,
            fcf: vb.ttmFreeCashFlow?.value || null,
            fcfPerShare: vb.ttmFcfPerShare?.value || null,
        },

        // Valuation Assumptions
        valuationInputs: {
            stockPrice: price,
            epsBasis: eps,
            epsSource: valuationState.isManualEps ? 'manual' : 'sec',
            requiredReturn: reqReturn,
            years,
            exitPE,
        },

        // Valuation Results (current calculated values)
        valuationResults: {
            peRatio: price > 0 && eps > 0 ? price / eps : null,
            requiredEpsCAGR: calculateRequiredEpsCAGR(price, eps, reqReturn, years, exitPE),
            requiredFutureEPS: calculateRequiredFutureEPS(price, eps, reqReturn, years, exitPE),
            requiredFuturePrice: calculateRequiredFuturePrice(price, eps, reqReturn, years, exitPE),
        },

        // Scenarios Snapshot
        scenarios: {
            bear: {
                growth: bearGrowth,
                exitPE: bearPE,
                futureEPS: eps * Math.pow(1 + bearGrowth / 100, years),
                futurePrice: eps * Math.pow(1 + bearGrowth / 100, years) * bearPE,
                cagr: (Math.pow(eps * Math.pow(1 + bearGrowth / 100, years) * bearPE / price, 1 / years) - 1) * 100,
            },
            base: {
                growth: baseGrowth,
                exitPE: basePE,
                futureEPS: eps * Math.pow(1 + baseGrowth / 100, years),
                futurePrice: eps * Math.pow(1 + baseGrowth / 100, years) * basePE,
                cagr: (Math.pow(eps * Math.pow(1 + baseGrowth / 100, years) * basePE / price, 1 / years) - 1) * 100,
            },
            bull: {
                growth: bullGrowth,
                exitPE: bullPE,
                futureEPS: eps * Math.pow(1 + bullGrowth / 100, years),
                futurePrice: eps * Math.pow(1 + bullGrowth / 100, years) * bullPE,
                cagr: (Math.pow(eps * Math.pow(1 + bullGrowth / 100, years) * bullPE / price, 1 / years) - 1) * 100,
            },
        },
    };

    return snapshot;
}

function calculateRequiredEpsCAGR(price, eps, reqReturn, years, exitPE) {
    if (price <= 0 || eps <= 0) return null;
    const r = reqReturn / 100;
    const requiredFuturePrice = price * Math.pow(1 + r, years);
    const requiredFutureEPS = requiredFuturePrice / exitPE;
    const cagr = (Math.pow(requiredFutureEPS / eps, 1 / years) - 1) * 100;
    return isFinite(cagr) ? cagr : null;
}

function calculateRequiredFutureEPS(price, eps, reqReturn, years, exitPE) {
    if (price <= 0 || eps <= 0) return null;
    const r = reqReturn / 100;
    const requiredFuturePrice = price * Math.pow(1 + r, years);
    const requiredFutureEPS = requiredFuturePrice / exitPE;
    return isFinite(requiredFutureEPS) ? requiredFutureEPS : null;
}

function calculateRequiredFuturePrice(price, eps, reqReturn, years, exitPE) {
    if (price <= 0) return null;
    const r = reqReturn / 100;
    const requiredFuturePrice = price * Math.pow(1 + r, years);
    return isFinite(requiredFuturePrice) ? requiredFuturePrice : null;
}

function showThesisSavedIndicator(savedTimestamp) {
    const indicator = document.getElementById('thesisSavedIndicator');
    const timeSpan = document.getElementById('thesisSavedTime');

    if (!indicator) return;

    // Format timestamp
    const date = new Date(savedTimestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    let timeText = 'nyligen';
    if (diffMins < 1) {
        timeText = 'just nu';
    } else if (diffMins < 60) {
        timeText = `för ${diffMins} min sedan`;
    } else if (diffMins < 1440) {
        const hours = Math.floor(diffMins / 60);
        timeText = `för ${hours}h sedan`;
    } else {
        timeText = date.toLocaleDateString('sv-SE');
    }

    if (timeSpan) timeSpan.textContent = timeText;
    indicator.style.display = 'block';
}

function hideThesisSavedIndicator() {
    const indicator = document.getElementById('thesisSavedIndicator');
    if (indicator) indicator.style.display = 'none';
}

function showThesisError(msg) {
    const banner = document.getElementById('thesisStatusBanner');
    if (banner) {
        banner.className = 'calc-status-banner calc-status-error';
        banner.textContent = msg;
        banner.style.display = 'block';
    }
}

function showThesisSuccess(snapshot) {
    const banner = document.getElementById('thesisStatusBanner');
    if (banner) {
        const msg = snapshot
            ? 'Analysen sparad tillsammans med värderingssnapshot!'
            : 'Analysen sparad! (Ingen värdering att spara ännu)';
        banner.className = 'calc-status-banner calc-status-success';
        banner.textContent = msg;
        banner.style.display = 'block';
    }
    // Auto-hide after 3 seconds
    setTimeout(() => {
        if (banner) banner.style.display = 'none';
    }, 3000);
}

function displayThesisSnapshotPreview(snapshot) {
    const previewDiv = document.getElementById('thesisSnapshotPreview');
    if (!previewDiv) return;

    if (!snapshot) {
        previewDiv.innerHTML = '<p class="thesis-no-snapshot">Ingen värdering sparad med denna analys.</p>';
        return;
    }

    const inputs = snapshot.valuationInputs || {};
    const results = snapshot.valuationResults || {};
    const scenarios = snapshot.scenarios || {};

    let html = `
        <div class="snapshot-section">
            <h4>Värderingsantaganden</h4>
            <div class="snapshot-grid">
                <div class="snapshot-cell">
                    <span class="snapshot-label">Aktiekurs</span>
                    <span class="snapshot-value">$${inputs.stockPrice?.toFixed(2) || '–'}</span>
                </div>
                <div class="snapshot-cell">
                    <span class="snapshot-label">EPS-bas</span>
                    <span class="snapshot-value">$${inputs.epsBasis?.toFixed(2) || '–'} (${inputs.epsSource === 'manual' ? 'Manuell' : 'SEC'})</span>
                </div>
                <div class="snapshot-cell">
                    <span class="snapshot-label">Avkastningskrav</span>
                    <span class="snapshot-value">${inputs.requiredReturn?.toFixed(1) || '–'}% / år</span>
                </div>
                <div class="snapshot-cell">
                    <span class="snapshot-label">Tidshorisont</span>
                    <span class="snapshot-value">${inputs.years || '–'} år</span>
                </div>
                <div class="snapshot-cell">
                    <span class="snapshot-label">Exit P/E</span>
                    <span class="snapshot-value">${inputs.exitPE?.toFixed(1) || '–'}x</span>
                </div>
                <div class="snapshot-cell">
                    <span class="snapshot-label">P/E TTM</span>
                    <span class="snapshot-value">${results.peRatio?.toFixed(1) || '–'}x</span>
                </div>
            </div>
        </div>
    `;

    // Scenarios Summary
    if (scenarios.base) {
        html += `
            <div class="snapshot-section">
                <h4>Scenarioöversikt</h4>
                <div class="snapshot-scenarios-grid">
                    <div class="scenario-cell scenario-bear">
                        <span class="scenario-label">Bear</span>
                        <span class="scenario-future-price">$${scenarios.bear?.futurePrice?.toFixed(2) || '–'}</span>
                        <span class="scenario-cagr">${scenarios.bear?.cagr?.toFixed(1) || '–'}%</span>
                    </div>
                    <div class="scenario-cell scenario-base">
                        <span class="scenario-label">Base</span>
                        <span class="scenario-future-price">$${scenarios.base?.futurePrice?.toFixed(2) || '–'}</span>
                        <span class="scenario-cagr">${scenarios.base?.cagr?.toFixed(1) || '–'}%</span>
                    </div>
                    <div class="scenario-cell scenario-bull">
                        <span class="scenario-label">Bull</span>
                        <span class="scenario-future-price">$${scenarios.bull?.futurePrice?.toFixed(2) || '–'}</span>
                        <span class="scenario-cagr">${scenarios.bull?.cagr?.toFixed(1) || '–'}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    html += `<p class="snapshot-timestamp">Sparad ${new Date(snapshot.capturedAt).toLocaleDateString('sv-SE')} kl ${new Date(snapshot.capturedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</p>`;

    previewDiv.innerHTML = html;
}

function deleteStoredThesis() {
    const ticker = currentThesisState.ticker;
    if (!ticker) return;

    const result = window.NTMThesisStorage.remove(ticker);
    if (!result.success) {
        showThesisError(result.error || 'Kunde inte radera analysen.');
        return;
    }

    // Clear form & state
    currentThesisState.thesis = null;
    document.getElementById('thesis-text').value = '';
    document.getElementById('thesis-risks').value = '';
    document.getElementById('thesis-trigger').value = '';
    document.getElementById('thesis-notes').value = '';

    // Hide elements
    document.getElementById('thesisDeleteBtn').style.display = 'none';
    hideThesisSavedIndicator();
    document.getElementById('thesisSnapshotPreview').innerHTML = '';

    // Show success
    showThesisError('Analysen raderad.');
}

/**
 * Display change detection between saved thesis snapshot and current data
 */
function initChangeDetection(data) {
    const changeSection = document.getElementById('changeDetectionSection');
    const changeContent = document.getElementById('changeDetectionContent');
    
    if (!changeSection || !changeContent) return;

    // Get saved thesis
    const ticker = data.symbol;
    const { thesis, error } = window.NTMThesisStorage.get(ticker);

    // No thesis = no change detection
    if (error || !thesis || !thesis.valuationSnapshot) {
        changeSection.style.display = 'none';
        return;
    }

    // Run change detection
    if (!window.NTMChangeDetection) {
        changeSection.style.display = 'none';
        return;
    }

    const report = window.NTMChangeDetection.detect(thesis.valuationSnapshot, data);

    // If no changes and snapshot not old, hide section
    if (!report.hasChanges && !window.NTMChangeDetection.isSnapshotStale(thesis.valuationSnapshot)) {
        changeSection.style.display = 'none';
        return;
    }

    // Show section and populate content
    changeSection.style.display = 'block';
    renderChangeDetection(report, thesis, data);
}

/**
 * Render change detection content
 */
function renderChangeDetection(report, thesis, data) {
    const container = document.getElementById('changeDetectionContent');
    let html = '';

    // Period change
    if (report.periodChange) {
        html += `
            <div class="change-block change-block-period">
                <p class="change-label">📅 Data uppdaterad</p>
                <p class="change-text">
                    Din analys är från <strong>${report.periodChange.from}</strong> 
                    → Aktuell data är från <strong>${report.periodChange.to}</strong>
                </p>
            </div>
        `;
    }

    // Metric changes
    if (report.metrics && report.metrics.length > 0) {
        html += '<div class="change-block change-block-metrics">';
        html += '<p class="change-label">📊 Metrics förändrade</p>';
        html += '<div class="change-table">';
        html += '<div class="change-row change-row-header"><span>Metric</span><span>Sedan</span><span>Nu</span><span>Förändring</span></div>';

        report.metrics.forEach((change) => {
            const snap = formatNumber(change.snapshot);
            const curr = formatNumber(change.current);
            const dir = change.pct > 0 ? '↑' : '↓';
            const pctFormatted = Math.abs(change.pct).toFixed(1);
            const absFormatted = formatNumber(Math.abs(change.absolute));

            html += `
                <div class="change-row">
                    <span><strong>${change.name}</strong></span>
                    <span class="change-val-snap">${snap}</span>
                    <span class="change-val-curr">${curr}</span>
                    <span class="change-val-delta">${dir} ${absFormatted} (${pctFormatted}%)</span>
                </div>
            `;
        });

        html += '</div></div>';
    }

    // Margin changes
    if (report.margins && report.margins.length > 0) {
        html += '<div class="change-block change-block-margins">';
        html += '<p class="change-label">💰 Marginaler förändrade</p>';
        html += '<div class="change-margin-grid">';

        report.margins.forEach((change) => {
            const snap = change.snapshot.toFixed(1);
            const curr = change.current.toFixed(1);
            const delta = change.marginChange.toFixed(1);
            const dir = change.marginChange > 0 ? '↑' : '↓';

            html += `
                <div class="change-margin-card">
                    <p class="margin-name">${change.name}</p>
                    <p class="margin-value">${snap}% → ${curr}%</p>
                    <p class="margin-delta">${dir} ${Math.abs(delta)} pp</p>
                </div>
            `;
        });

        html += '</div></div>';
    }

    // New filings
    if (report.filings && report.filings.length > 0) {
        html += '<div class="change-block change-block-filings">';
        html += '<p class="change-label">📋 Nya rapporter sedan din thesis</p>';
        html += '<div class="filing-list">';

        report.filings.forEach((filing) => {
            const formattedDate = new Date(filing.filingDate).toLocaleDateString('sv-SE');
            const period = filing.reportPeriod ? new Date(filing.reportPeriod).toLocaleDateString('sv-SE', { year: 'numeric', month: '2-digit' }) : 'Period okänd';

            html += `
                <div class="filing-item">
                    <div class="filing-meta">
                        <span class="filing-form"><strong>${filing.form}</strong></span>
                        <span class="filing-period">${period}</span>
                        <span class="filing-date">${formattedDate}</span>
                    </div>
                    <a href="${filing.secFilingUrl}" target="_blank" class="filing-link" rel="noopener noreferrer">
                        Visa på SEC →
                    </a>
                </div>
            `;
        });

        html += '</div></div>';
    }

    // Snapshot age warning
    if (window.NTMChangeDetection.isSnapshotStale(thesis.valuationSnapshot)) {
        html = `
            <div class="change-block change-block-warning">
                <p class="change-label">⚠️ Gammal analys</p>
                <p class="change-text">Din analys är över ett år gammal. Överväg att uppdatera den med aktuell data.</p>
            </div>
        ` + html;
    }

    if (!html) {
        html = `
            <div class="change-block change-block-none">
                <p class="change-text">Ingen väsentlig data förändrad sedan din analys.</p>
            </div>
        `;
    }

    container.innerHTML = html;
}

/**
 * Helper: Format number for display
 */
function formatNumber(val) {
    if (!Number.isFinite(val)) return 'N/A';
    if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(1) + 'B';
    if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + 'M';
    if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(1) + 'K';
    return val.toFixed(2);
}

