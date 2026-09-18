/**
 * NTM Research V1 - Client-side Stock Fundamentals Explorer
 * Consumes standardized NTM stock JSON files (data/stocks/<TICKER>.json)
 * Built with vanilla JavaScript and Chart.js.
 */

let annualChartInstance = null;
let quarterlyChartInstance = null;
let currentStockData = null;

// Only visible Base inputs; no journal, account, snapshot or calculated output.
window.NTMWave1Research = function () {
    const data = currentStockData, C = window.NTMWave1Context;
    if (!data || data.manual || !C.tickers.includes(data.symbol)) throw Error('Överföring kräver ett bolag med Research-data. Använd annars den fristående kalkylatorn.');
    const read = id => { const raw = document.getElementById(id)?.value.trim(); return raw ? Number(raw) : NaN; };
    const metric = data.valuationBase?.ttmDilutedEps, manual = valuationState.isManualEps;
    if (!manual && (metric?.qualityStatus !== 'available' || !Number.isFinite(metric.value) || metric.value <= 0)) throw Error('Användbar EPS saknas. Ange ett eget positivt EPS-antagande för att fortsätta.');
    if (!manual && (metric.currency !== 'USD' || metric.unit !== 'USD/shares' || metric.periodType !== 'TTM')) throw Error('EPS-enhet eller period stämmer inte med denna överföring.');
    if (manual && document.getElementById('val-eps-help')?.textContent.includes('Förifyllt')) throw Error('Ersätt förifylld exempel-EPS med ditt eget antagande först.');
    return C.create({ticker:data.symbol,name:data.company.name,currency:data.company.currency},
        {price:read('val-price'),eps:read('val-eps'),growth:read('sc-base-growth'),years:read('val-years'),multiple:read('sc-base-pe')},
        {priceSource:valuationState.priceSource || 'manual',priceDate:null,epsSource:manual?'manual':'sec-derived',epsUnit:'USD/share',growthUnit:'percent/year',
         period:manual?'Eget EPS-antagande':metric.period,periodEnd:manual?null:metric.periodEnd,filed:manual?null:metric.filed,
         sourceMethod:manual?'manual':metric.methodVersion,shareBasis:manual?'manual':metric.shareBasisStatus === 'verified'?'verified':'unverified',sourceUrl:data.metadata.secCompanyFactsUrl});
};

const SUPPORTED_TICKERS = ['SOFI', 'NVDA', 'CRWD', 'MU', 'MRVL', 'VRT', 'COHR', 'RKLB', 'TTMI', 'SNDK', 'FLY', 'CRWV'];

document.addEventListener('DOMContentLoaded', () => {
    initResearchApp();
});

function initResearchApp() {
    const params = new URLSearchParams(window.location.search);
    const tickerParam = params.get('ticker');

    initManualThesisEntry();
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
                if (currentStockData && !currentStockData.manual) {
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

// Manual identity is a journal context, never a substitute StockData object.
function initManualThesisEntry() {
    const form=document.getElementById('manualThesisForm');
    if(!form)return;
    form.onsubmit=e=>{
        e.preventDefault();
        const ticker=document.getElementById('manualTicker').value.trim().toUpperCase();
        const label=document.getElementById('manualLabel').value.trim();
        if(!ticker && !label) {document.getElementById('manualEntryStatus').textContent='Ange ticker eller bolagsnamn.';return;}
        if(ticker && (!/^[A-Z0-9.-]{1,24}$/.test(ticker) || ticker.startsWith('MANUAL-'))) {
            document.getElementById('manualEntryStatus').textContent='Ange en ticker med bokstäver, siffror, punkt eller bindestreck. MANUAL- är reserverat för egna beteckningar.';return;
        }
        if(currentThesisState.isDirty && !confirm('Lämna osparade ändringar och öppna ett annat bolag?'))return;
        const key=ticker || `MANUAL-${window.crypto.randomUUID().toUpperCase()}`;
        // Only the stable key enters the URL; private company labels never enter URLs/events.
        window.history.replaceState(null,'',`research.html?ticker=${encodeURIComponent(key)}`);
        if(SUPPORTED_TICKERS.includes(key)) {window.location.reload();return;}
        showManualThesis(key,label,ticker ? 'ticker' : 'label');
    };
}

function showManualThesis(ticker, label = '', identityType = 'ticker') {
    if(!/^[A-Z0-9.-]{1,80}$/.test(ticker)) {showError('Ogiltig bolagsnyckel','Ange en ticker eller öppna formuläret för en manuell tes.');return;}
    const saved=window.NTMThesisStorage.get(ticker).thesis;
    const data={symbol:ticker,manual:true,company:{name:saved?.companyName || label || ticker},
        companyIdentity:saved?.companyIdentity || {type:ticker.startsWith('MANUAL-') ? 'label' : identityType,key:ticker}};
    currentStockData=data;
    document.title=`${data.company.name} · Manuell tes — NTM`;
    for(const id of ['researchLoading','researchError','researchIndex']) document.getElementById(id).style.display='none';
    const detail=document.getElementById('researchDetail');detail.style.display='block';detail.classList.add('is-manual');
    document.getElementById('manualThesisEntry').open=false;
    document.getElementById('companyPicker').open=false;
    updateStockPills(ticker);
    const visible=['manualJournalHeader','thesisReviewDepth','thesisSection','researchExportSection','thesisHistorySectionDepth'];
    for(const child of detail.children) child.hidden=!visible.includes(child.id);
    document.getElementById('manualThesisHeading').hidden=false;
    document.getElementById('manualThesisHeading').textContent=data.company.name;
    document.getElementById('manualThesisNotice').hidden=false;
    document.getElementById('manualCompanyField').hidden=false;
    document.getElementById('manualCompanyName').value=data.company.name;
    document.getElementById('manualCompanyName').oninput=()=>{currentThesisState.isDirty=true;hideThesisSavedIndicator();};
    document.getElementById('latestSnapshotDetails').hidden=true;
    document.querySelectorAll('[data-relation-ticker]').forEach(node=>node.hidden=true);
    initThesisSection(data);
    document.getElementById('thesisSection').scrollIntoView?.({block:'start'});
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

async function showIndexView() {
    currentStockData = null;
    document.getElementById('researchLoading').style.display = 'none';
    document.getElementById('researchError').style.display = 'none';
    document.getElementById('researchIndex').style.display = 'block';
    document.getElementById('researchDetail').style.display = 'none';
    document.title = 'NTM Research – Bolagsöversikt & Fundamentals';

    if (window.NTMRecentTools && typeof window.NTMRecentTools.record === 'function') {
        window.NTMRecentTools.record();
    }
    await Promise.all(SUPPORTED_TICKERS.map(async (ticker) => {
        const status = document.getElementById(`index-${ticker}-period`);
        try {
            const response = await fetch(`data/stocks/${ticker}.json`);
            if (!response.ok) throw new Error('load');
            const data = await response.json();
            if (data.symbol !== ticker) throw new Error('ticker');
            const snapshot = window.NTMResearchSnapshot.fromStockData(data);
            const metrics = snapshot.ttmMetrics;
            document.getElementById(`index-${ticker}-revenue`).textContent = formatCurrency(metrics.revenue, 2);
            document.getElementById(`index-${ticker}-secondary`).textContent = formatCurrency(ticker === 'SOFI' || data.metadata?.profile === 'financing_sensitive' ? metrics.netIncome : metrics.fcf, 2);
            document.getElementById(`index-${ticker}-margin`).textContent = formatResearchPercent(metrics.netMargin);
            status.textContent = `TTM t.o.m. ${snapshot.asOfPeriod || 'okänd period'} · rapportperiod, inte dagens marknadsdata`;
        } catch (error) {
            for (const field of ['revenue', 'secondary', 'margin']) document.getElementById(`index-${ticker}-${field}`).textContent = '–';
            status.textContent = 'Nyckeltalen kunde inte laddas. Öppna analysen för att försöka igen.';
        }
    }));
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
        showManualThesis(ticker);
        return;
    }

    showLoading();

    try {
        const response = await fetch(`data/stocks/${ticker}.json`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} när data/stocks/${ticker}.json hämtades`);
        }
        const data = await response.json();
        if (data.symbol !== ticker || !Array.isArray(data.annual) || !Array.isArray(data.quarterly)) throw new Error('Bolagsfilen har fel ticker eller format');
        currentStockData = data;
        renderStockDetail(data);
        window.NTMEvents?.emit('research_opened');
        const destination = window.location.hash?.slice(1);
        if (['thesisSection', 'thesis-trigger', 'thesis-assumption-1', 'thesisReview'].includes(destination)) {
            document.getElementById(destination)?.scrollIntoView?.({ block: 'start' });
        }

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

    if (profile === 'limited_history') profileBadge.textContent = 'Begränsad historik';
    if (profile === 'financing_sensitive') profileBadge.textContent = 'Särskild finansiering';
    const notice = document.getElementById('companyCoverageNotice');
    notice.hidden = !metadata.coverageNotice;
    notice.textContent = metadata.coverageNotice || '';
    const limitations = document.getElementById('companyMetricLimitations');
    document.getElementById('companyLimitationsDetails').hidden = !metadata.coverageNotice;
    limitations.hidden = !metadata.coverageNotice;
    limitations.replaceChildren();
    if (metadata.coverageNotice) {
        const latest = data.quarterly?.at(-1)?.metrics || {};
        for (const [key, metric] of Object.entries({...latest, ...data.ttm?.metrics})) {
            if (metric.value !== null) continue;
            const item = document.createElement('li');
            item.textContent = `${researchMetricLabel(key)}: saknas. ${metric.unsupportedReason || metric.notes || 'Tillräckligt jämförbart SEC-underlag saknas.'}`;
            limitations.appendChild(item);
        }
    }

    document.getElementById('companyCikPill').textContent = `CIK ${company.cik || ''}`;
    
    // Format Fiscal year end text
    const fye = company.fiscalYearEnd || 'datum saknas';
    const fyeText = metadata.fiscalCalendarLabel || formatFye(fye);
    document.getElementById('companyMetaLine').textContent = `${company.ticker} • ${company.sicDescription || 'Verksamhet'} • Räkenskapsår slutar ${fyeText}`;

    // Last updated
    const fetched = metadata.fetchedAt;
    const lastUpd = fetched && Number.isFinite(Date.parse(fetched)) ? new Date(fetched).toLocaleDateString('sv-SE') : 'datum saknas';
    const filingDate = data.filings?.find((f) => ['10-K', '10-Q'].includes(f.form))?.filingDate || 'saknas';
    document.getElementById('companyLastUpdated').textContent = `Rapportperiod ${data.ttm?.asOfPeriod || 'saknas'} · inlämnad ${filingDate} · hämtad ${lastUpd} · ${metadata.qualityStatus === 'validated' ? 'validerad data' : 'äldre datakontrakt'}${metadata.updateStatus === 'offline_fixture' ? ' (lokalt källunderlag)' : ''}`;

    // 2. Render Key Metrics (TTM & Latest Balance Sheet)
    renderKeyMetrics(data);

    // 3. Render Growth & Margins
    renderGrowthAndMargins(data);
    window.NTMVisualV3?.revenue(data);

    // 4. Initialize & Render Valuation Section
    initValuationSection(data);

    // 5. Render Annual & Quarterly Charts
    try { renderCharts(data); }
    catch (error) { document.getElementById('researchChartStatus').textContent = 'Diagrammen kunde inte visas. Nyckeltal och tabeller finns kvar nedan.'; }

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

// Presentation only: keep the data's original keys, values and provenance intact.
function researchMetricLabel(key) {
    const labels = {
        revenue: 'Intäkter', operatingIncome: 'Rörelseresultat', netIncome: 'Nettoresultat',
        operatingCashFlow: 'Operativt kassaflöde', capex: 'Investeringar (CapEx)',
        freeCashFlow: 'Fritt kassaflöde', dilutedEps: 'EPS (utspätt)',
        dilutedShares: 'Aktieantal (utspätt)', fcfPerShare: 'Fritt kassaflöde per aktie',
        netIncomeToCommon: 'Resultat till stamaktier', debt: 'Skuld enligt tillgängligt underlag',
        cashAndCashEquivalents: 'Kassa och likvida medel', stockholdersEquity: 'Eget kapital',
        deferredRevenue: 'Förutbetalda intäkter', stockBasedCompensation: 'Aktiebaserad ersättning',
        totalAssets: 'Totala tillgångar', totalLiabilities: 'Totala skulder och förpliktelser',
    };
    return labels[key] || 'Nyckeltal';
}

function researchMetricBasis(metric) {
    return metric.isDerived ? 'Beräknat från rapporterade värden' : 'Rapporterat värde';
}

function researchDerivationLabel(metric) {
    const methods = {
        sum_of_trailing_4_quarters: 'Summa av de fyra senaste kvartalen',
        operatingCashFlow_minus_capex: 'Operativt kassaflöde minus investeringar (CapEx)',
        sum_of_quarterly_ocf_minus_capex: 'Summa av kvartalens operativa kassaflöde minus investeringar (CapEx)',
        standalone_period_difference: 'Separat kvartal beräknat som skillnad mellan rapportperioder',
        duration_weighted_annual_minus_ytd9m: 'Tidsvägd beräkning från helår och årets första nio månader',
        duration_weighted_trailing_4_quarters: 'Tidsvägt genomsnitt av de fyra senaste kvartalen',
        ttm_common_income_over_weighted_diluted_shares: 'Resultat till stamaktier för TTM delat med vägt utspätt aktieantal',
        ttm_fcf_over_weighted_diluted_shares: 'Fritt kassaflöde för TTM delat med vägt utspätt aktieantal',
        incomplete_quarters: 'Otillgängligt: ofullständigt kvartalsunderlag',
        missing_numerator: 'Otillgängligt: underlag för täljaren saknas',
        unsupported_inconsistent_share_basis: 'Otillgängligt: aktiebaserna är inte jämförbara',
    };
    return metric.derivationNotes || methods[metric.derivationMethod] || 'Beräkning från underliggande källor';
}

function formatCurrency(val, decimals = 1, showPlus = false) {
    if (!Number.isFinite(val)) return '–';
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

function formatResearchPercent(val, decimals = 1, showPlus = false) {
    if (!Number.isFinite(val)) return '–';
    const num = Number(val);
    const sign = showPlus && num > 0 ? '+' : '';
    return `${sign}${num.toFixed(decimals)}%`;
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
    const latestQMetrics = latestQ?.metrics || {};

    const profile = data.metadata?.profile;

    // Define card list to render based on supported metrics
    const cards = [];

    // 1. Revenue TTM
    if (ttmMetrics.revenue && ttmMetrics.revenue.value !== null) {
        cards.push({
            title: profile === 'financial_services' ? 'Nettointäkter TTM' : 'Intäkter TTM',
            value: formatCurrency(ttmMetrics.revenue.value, 2),
            sub: researchMetricBasis(ttmMetrics.revenue),
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
            sub: researchMetricBasis(ttmMetrics.operatingIncome),
            metricKey: 'operatingIncome',
            provenance: ttmMetrics.operatingIncome,
        });
    }

    // 3. Net Income TTM
    if (ttmMetrics.netIncome && ttmMetrics.netIncome.value !== null) {
        cards.push({
            title: 'Nettoresultat TTM',
            value: formatCurrency(ttmMetrics.netIncome.value, 2),
            sub: researchMetricBasis(ttmMetrics.netIncome),
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
            title: 'Operativt kassaflöde TTM',
            value: formatCurrency(ttmMetrics.operatingCashFlow.value, 2),
            sub: researchMetricBasis(ttmMetrics.operatingCashFlow),
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
            title: latestQMetrics.debt.concept === 'LongTermDebtNoncurrent' ? 'Långfristig skuld (ej kortfristig del)' : 'Rapporterad skuldkomponent',
            value: formatCurrency(latestQMetrics.debt.value, 2),
            sub: `Skuld enligt tillgängligt SEC-underlag · per ${latestQ.period}. Täcker inte nödvändigtvis all skuld.`,
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
            sub: 'Avtalsskulder',
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

    if (Number.isFinite(ttmMetrics.dilutedEps?.value)) {
        cards.push({title: 'Vinst per aktie TTM', value: formatCurrency(ttmMetrics.dilutedEps.value, 2),
            sub: researchMetricBasis(ttmMetrics.dilutedEps), metricKey: 'dilutedEps', provenance: ttmMetrics.dilutedEps});
    }
    // Lead with profile-appropriate existing evidence; retain every other metric in depth.
    const leading = profile === 'financial_services'
        ? ['revenue', 'netIncome', 'dilutedEps']
        : ['revenue', 'freeCashFlow', 'dilutedEps'];
    cards.sort((a, b) => {
        const rank = key => leading.includes(key) ? leading.indexOf(key) : leading.length;
        return rank(a.metricKey) - rank(b.metricKey);
    });
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
        const raw = card.provenance.value;
        const scale = Math.abs(raw) >= 1e9 ? 1e9 : Math.abs(raw) >= 1e6 ? 1e6 : 1;
        valEl.textContent = Number.isFinite(raw) ? (raw / scale).toLocaleString('sv-SE', {maximumFractionDigits: 2}) : card.value;
        const unitEl = document.createElement('span');
        unitEl.className = 'metric-unit';
        unitEl.textContent = (scale === 1e9 ? 'md ' : scale === 1e6 ? 'mn ' : '') + (data.company?.currency || 'USD') + (card.metricKey === 'dilutedEps' ? '/aktie' : '');
        valEl.appendChild(unitEl);

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
                value: formatResearchPercent(yoy, 1, true),
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
            const cagr = window.NTMValuation.toPercent(window.NTMValuation.cagr(revEarliest, revLatest, yearsCount));
            items.push({
                label: `${yearsCount} års intäkts-CAGR`,
                value: formatResearchPercent(cagr, 1, true),
                sub: `${earliest.period} → ${latest.period}`,
                positive: cagr >= 0,
            });
        }
    }

    // 3. Net Margin TTM
    if (ttm.revenue?.value > 0 && Number.isFinite(ttm.netIncome?.value)) {
        const netMargin = (ttm.netIncome.value / ttm.revenue.value) * 100;
        items.push({
            label: 'Nettomarginal TTM',
            value: formatResearchPercent(netMargin, 1),
            sub: 'Nettoresultat / Intäkter',
            positive: netMargin >= 0,
        });
    }

    // 4. Operating Margin TTM (if supported)
    if (ttm.revenue?.value && ttm.operatingIncome?.value !== null && ttm.operatingIncome?.value !== undefined && ttm.revenue?.value > 0) {
        const opMargin = (ttm.operatingIncome.value / ttm.revenue.value) * 100;
        items.push({
            label: 'Rörelsemarginal TTM',
            value: formatResearchPercent(opMargin, 1),
            sub: 'Rörelseresultat / Intäkter',
            positive: opMargin >= 0,
        });
    }

    // 5. Free Cash Flow Margin TTM (if supported)
    if (ttm.revenue?.value && ttm.freeCashFlow?.value !== null && ttm.freeCashFlow?.value !== undefined && ttm.revenue?.value > 0) {
        const fcfMargin = (ttm.freeCashFlow.value / ttm.revenue.value) * 100;
        items.push({
            label: 'FCF-marginal TTM',
            value: formatResearchPercent(fcfMargin, 1),
            sub: 'Fritt kassaflöde / Intäkter',
            positive: fcfMargin >= 0,
        });
    }

    // 6. SBC as % of Revenue TTM (if supported)
    if (ttm.revenue?.value && ttm.stockBasedCompensation?.value !== null && ttm.stockBasedCompensation?.value !== undefined && ttm.revenue?.value > 0) {
        const sbcPct = (ttm.stockBasedCompensation.value / ttm.revenue.value) * 100;
        items.push({
            label: 'SBC % av intäkter TTM',
            value: formatResearchPercent(sbcPct, 1),
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
    return getChartColors();
}

function renderCharts(data) {
    if (typeof Chart !== 'function') {
        document.getElementById('researchChartStatus').textContent = 'Diagramverktyget kunde inte laddas. Alla nyckeltal och tabeller kan fortfarande användas.';
        return;
    }
    document.getElementById('researchChartStatus').textContent = '';
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
        const revData = annuals.map((a) => Number.isFinite(a.metrics?.revenue?.value) ? a.metrics.revenue.value / 1e9 : null);
        const netIncData = annuals.map((a) => Number.isFinite(a.metrics?.netIncome?.value) ? a.metrics.netIncome.value / 1e9 : null);
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
                backgroundColor: colors.tertiary,
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
        const revData = quarters.map((q) => Number.isFinite(q.metrics?.revenue?.value) ? q.metrics.revenue.value / 1e9 : null);
        const netIncData = quarters.map((q) => Number.isFinite(q.metrics?.netIncome?.value) ? q.metrics.netIncome.value / 1e9 : null);
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
                backgroundColor: colors.tertiary,
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
        const tdRev = createMetricCell(m.revenue, 'revenue');
        // Op Income
        const tdOpInc = createMetricCell(m.operatingIncome, 'operatingIncome');
        // Net Income
        const tdNetInc = createMetricCell(m.netIncome, 'netIncome');
        // EPS
        const tdEps = document.createElement('td');
        tdEps.textContent = m.dilutedEps?.value !== null && m.dilutedEps?.value !== undefined ? `$${Number(m.dilutedEps.value).toFixed(2)}` : '–';
        // OCF
        const tdOcf = createMetricCell(m.operatingCashFlow, 'operatingCashFlow');
        // CapEx
        const tdCapEx = createMetricCell(m.capex, 'capex');
        // FCF
        const tdFcf = profile !== 'financial_services' ? createMetricCell(m.freeCashFlow, 'freeCashFlow') : document.createElement('td');
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
        const tdRev = createMetricCell(m.revenue, 'revenue');
        // Net Income
        const tdNetInc = createMetricCell(m.netIncome, 'netIncome');
        // EPS
        const tdEps = document.createElement('td');
        tdEps.textContent = m.dilutedEps?.value !== null && m.dilutedEps?.value !== undefined ? `$${Number(m.dilutedEps.value).toFixed(2)}` : '–';
        // OCF
        const tdOcf = createMetricCell(m.operatingCashFlow, 'operatingCashFlow');
        // CapEx
        const tdCapEx = createMetricCell(m.capex, 'capex');
        // FCF
        const tdFcf = profile !== 'financial_services' ? createMetricCell(m.freeCashFlow, 'freeCashFlow') : document.createElement('td');
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

function createMetricCell(metric, key) {
    const td = document.createElement('td');
    if (!metric || metric.value === null || metric.value === undefined) {
        td.textContent = '–';
        return td;
    }

    const valFormatted = formatCurrency(metric.value, 2);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'metric-source-button';
    button.textContent = valFormatted;
    button.setAttribute('aria-label', `${researchMetricLabel(key)}: ${valFormatted}. Visa källa`);
    button.onclick = () => openProvenanceDialog(researchMetricLabel(key), metric);
    td.appendChild(button);

    if (metric.isDerived) {
        td.title = `${researchDerivationLabel(metric)} (Klicka för källa)`;
        td.classList.add('cell-derived');
    }

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

        const formBadgeClass = f.form?.includes('10-K') ? 'badge-primary' : 'badge-accent';

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

    let technicalHtml = '';
    let rowsHtml = `
        <p class="provenance-explanation">${escapeHtml(researchMetricBasis(provenance))}. ${!Number.isFinite(provenance.value) ? 'Jämförbart underlag saknas. Se begränsningarna nedan.' : provenance.isDerived ? 'NTM sammanställer rapporterade värden enligt beräkningen nedan.' : 'Värdet kommer från bolagets rapportering.'}</p>
        <div class="prov-row"><span class="prov-label">Metrik:</span><span class="prov-val"><strong>${escapeHtml(title)}</strong></span></div>
        <div class="prov-row"><span class="prov-label">${provenance.isDerived ? 'Härlett värde' : 'Rapporterat värde'}:</span><span class="prov-val">${Number.isFinite(provenance.value) ? provenance.value.toLocaleString('sv-SE') + ' ' + escapeHtml(provenance.unit || 'enhet saknas') : 'Ej tillgängligt'}</span></div>
        <div class="prov-row"><span class="prov-label">Källa:</span><span class="prov-val">Officiell SEC EDGAR XBRL</span></div>
    `;

    if (provenance.concept) {
        technicalHtml += `<div class="prov-row"><span class="prov-label">XBRL Concept:</span><span class="prov-val"><code>${escapeHtml(provenance.taxonomy || 'us-gaap')}:${escapeHtml(provenance.concept)}</code></span></div>`;
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
        technicalHtml += `<div class="prov-row"><span class="prov-label">Accession Number:</span><span class="prov-val"><code>${escapeHtml(provenance.accession)}</code></span></div>`;
    }

    if (provenance.isDerived) {
        rowsHtml += `<div class="prov-row"><span class="prov-label">Härledning:</span><span class="prov-val">${escapeHtml(researchDerivationLabel(provenance))}</span></div>`;
        if (provenance.derivedFrom && provenance.derivedFrom.length > 0) {
            technicalHtml += `<div class="prov-row"><span class="prov-label">Underliggande källor:</span><span class="prov-val"><code>${escapeHtml(provenance.derivedFrom.join(', '))}</code></span></div>`;
        }
        if (provenance.quartersIncluded) {
            rowsHtml += `<div class="prov-row"><span class="prov-label">Kvartal i TTM:</span><span class="prov-val">${escapeHtml(provenance.quartersIncluded.join(' + '))}</span></div>`;
        }
    }

    if (provenance.unsupportedReason) {
        rowsHtml += `<div class="prov-row"><span class="prov-label">Motivering:</span><span class="prov-val">${escapeHtml(provenance.unsupportedReason)}</span></div>`;
    }

    if (provenance.notes) rowsHtml += `<div class="prov-row"><span class="prov-label">Begränsningar:</span><span class="prov-val">${escapeHtml(provenance.notes)}</span></div>`;
    if (provenance.methodVersion) technicalHtml += `<div class="prov-row"><span class="prov-label">Metodversion:</span><span class="prov-val">${escapeHtml(provenance.methodVersion)}</span></div>`;
    if (provenance.inputs) rowsHtml += `<details><summary>Underliggande kvartal och källor</summary>${provenance.inputs.map((i) => `<p>${escapeHtml(i.quarter)} · ${escapeHtml(researchMetricLabel(i.metric))} · ${escapeHtml(i.concept || 'begrepp saknas')} · ${escapeHtml(i.accession || 'käll-ID saknas')} · ${escapeHtml(i.filed || 'datum saknas')}</p>`).join('')}</details>`;
    content.innerHTML = rowsHtml + (technicalHtml ? `<details class="provenance-technical"><summary>Tekniska källdetaljer</summary>${technicalHtml}</details>` : '');

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
    lastCalculatedInputs: null,
};

function initValuationSection(data) {
    valuationState.calculated = false;
    valuationState.stale = true;
    document.getElementById('assumptionRestoreNotice').hidden = true;
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
    valuationState.priceSource = "example";
    renderValuationPriceStatus();

    // 2. Initial EPS determination
    const ttmEpsVal = vb.ttmDilutedEps?.value;
    const overrideBanner = document.getElementById('val-override-banner');
    const epsInput = document.getElementById('val-eps');
    const epsBadge = document.getElementById('val-eps-badge');
    const epsHelp = document.getElementById('val-eps-help');

    if (Number.isFinite(ttmEpsVal) && Number(ttmEpsVal.toFixed(2)) > 0) {
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
            document.getElementById('val-override-title').textContent = 'Positiv, användbar TTM EPS saknas för kalkylen';
            document.getElementById('val-override-desc').textContent = (
                vb.ttmDilutedEps?.notes || vb.ttmDilutedShares?.notes ||
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
        if (epsHelp) epsHelp.textContent = 'Manuell EPS. Förifyllt 1,00 är ett räkneexempel, inte rapporterad vinst; ersätt med ditt eget antagande.';
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
            if (inputEl.id === 'val-price') { valuationState.priceSource = 'manual'; renderValuationPriceStatus(); }
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
            if (valuationState.calculated && !valuationState.stale) window.NTMEvents?.emit('valuation_calculated', { result: 'success' });
        };
    }

    // 4. Initial Calculation
    valuationState.lastCalculatedInputs = readEditableAssumptions();
    calculateValuation(data);
}

function markValuationStale() {
    valuationState.stale = true;
    const banner = document.getElementById('valuationStatusBanner');
    if (banner) {
        banner.className = 'calc-status-banner calc-status-stale';
        banner.setAttribute('data-ntm-status', 'stale');
        banner.textContent = 'Ändrade antaganden — klicka "Beräkna värdering & scenarier" för att uppdatera kalkylen.';
        banner.style.display = 'block';
    }
}

function showValuationError(msg) {
    const banner = document.getElementById('valuationStatusBanner');
    if (banner) {
        banner.className = 'calc-status-banner calc-status-error';
        banner.setAttribute('data-ntm-status', 'error');
        banner.textContent = msg;
        banner.style.display = 'block';
    }
}

function calculateValuation(data) {
    valuationState.stale = true;
    const banner = document.getElementById('valuationStatusBanner');
    const vb = data.valuationBase || {};
    const ttm = data.ttm?.metrics || {};
    const profile = data.metadata?.profile;

    const price = parseFloat(document.getElementById('val-price').value);
    const eps = parseFloat(document.getElementById('val-eps').value);
    const reqReturn = parseFloat(document.getElementById('val-return').value);
    const years = Number(document.getElementById('val-years').value);
    const exitPE = parseFloat(document.getElementById('val-exit-pe').value);

    const bearGrowth = parseFloat(document.getElementById('sc-bear-growth').value);
    const bearPE = parseFloat(document.getElementById('sc-bear-pe').value);
    const baseGrowth = parseFloat(document.getElementById('sc-base-growth').value);
    const basePE = parseFloat(document.getElementById('sc-base-pe').value);
    const bullGrowth = parseFloat(document.getElementById('sc-bull-growth').value);
    const bullPE = parseFloat(document.getElementById('sc-bull-pe').value);

    // Validation
    if (![price, eps, reqReturn, years, exitPE, bearGrowth, bearPE, baseGrowth, basePE, bullGrowth, bullPE].every(Number.isFinite)) {
        showValuationError('Alla antaganden måste vara ändliga tal.');
        return;
    }
    if (isNaN(price) || price <= 0) {
        showValuationError('Aktiekurs måste vara större än 0.');
        return;
    }
    if (isNaN(eps) || eps <= 0) {
        showValuationError('EPS måste vara större än 0 för P/E- och tillväxtberäkning. Ange ett positivt värde för framtida normaliserad intjäning per aktie.');
        return;
    }
    if (!Number.isInteger(years) || years < 1 || years > 50) {
        showValuationError('Tidshorisonten måste vara ett heltal mellan 1 och 50 år.');
        return;
    }
    if (reqReturn < -99.9 || reqReturn > 1000) {
        showValuationError('Önskad avkastning måste vara mellan -99,9 och 1000 %.');
        return;
    }
    if (exitPE < 0.1 || exitPE > 1000) {
        showValuationError('Exit P/E måste vara mellan 0,1 och 1000.');
        return;
    }
    if ([bearGrowth, baseGrowth, bullGrowth].some((value) => value < -99.9 || value > 1000)) {
        showValuationError('EPS-tillväxt i scenarierna måste vara mellan -99,9 och 1000 %.');
        return;
    }
    if ([bearPE, basePE, bullPE].some((value) => value < 0.1 || value > 1000)) {
        showValuationError('Framtida P/E i scenarierna måste vara mellan 0,1 och 1000.');
        return;
    }

    // Reject overflow before replacing any previous results (including the sensitivity grid).
    const reverseCheck = window.NTMValuation.reverse(price, eps, years, reqReturn, exitPE);
    const checks = [window.NTMValuation.multiple(price, eps), ...Object.values(reverseCheck)];
    for (const [growth, pe] of [[bearGrowth, bearPE], [baseGrowth, basePE], [bullGrowth, bullPE], [baseGrowth + 10, basePE + 10]]) {
        const model = window.NTMValuation.scenario(price, eps, growth, years, pe);
        checks.push(model.futureEPS, model.targetPrice, model.totalReturn === null ? null : model.totalReturn * 100, model.cagr);
    }
    if (!checks.every(Number.isFinite)) {
        showValuationError('Antagandena ger för stora tal för en tillförlitlig beräkning. Minska värdena.');
        return;
    }

    // A. Valuation Snapshot
    const pe = window.NTMValuation.multiple(price, eps);
    document.getElementById('val-pe-result').textContent = `${pe.toFixed(1)}x`;

    const fcfPsVal = vb.ttmFcfPerShare?.value;
    const pfcfBox = document.getElementById('val-pfcf-box');
    const fcfPsBox = document.getElementById('val-fcf-ps-box');

    if (profile !== 'financial_services' && Number.isFinite(fcfPsVal) && fcfPsVal > 0 && window.NTMValuation.multiple(price, fcfPsVal) !== null) {
        const pfcf = window.NTMValuation.multiple(price, fcfPsVal);
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
    const reverse = window.NTMValuation.reverse(price, eps, years, reqReturn, exitPE);
    const requiredFuturePrice = reverse.futurePriceRequired;
    const requiredFutureEPS = reverse.requiredFutureEPS;
    const requiredEPSCAGR = reverse.requiredEPSCAGR * 100;

    document.getElementById('rev-cagr-result').textContent = formatResearchPercent(requiredEPSCAGR, 1, true);
    document.getElementById('rev-future-eps-result').textContent = `$${requiredFutureEPS.toFixed(2)}`;
    document.getElementById('rev-future-price-result').textContent = `$${requiredFuturePrice.toFixed(2)}`;
    document.getElementById('rev-starting-eps-result').textContent = `$${eps.toFixed(2)} (${valuationState.isManualEps ? 'Manuell' : 'SEC TTM'})`;
    document.getElementById('rev-exit-pe-result').textContent = `${exitPE.toFixed(1)}x`;
    document.getElementById('rev-return-result').textContent = `${formatResearchPercent(reqReturn, 1, true)} / år`;
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
        const model = window.NTMValuation.scenario(price, eps, sc.growth * 100, years, sc.pe);
        const futEps = model.futureEPS, futPrice = model.targetPrice;
        const totRet = model.totalReturn * 100, cagr = model.cagr * 100;

        document.getElementById(`sc-${sc.name}-eps`).textContent = `$${futEps.toFixed(2)}`;
        document.getElementById(`sc-${sc.name}-price`).textContent = `$${futPrice.toFixed(2)}`;
        document.getElementById(`sc-${sc.name}-total-return`).textContent = formatResearchPercent(totRet, 1, true);
        document.getElementById(`sc-${sc.name}-cagr`).textContent = formatResearchPercent(cagr, 1, true);
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
    valuationState.lastCalculatedInputs = readEditableAssumptions();
    renderValuationPriceStatus(true);
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
        <span class="context-pill-val" style="color: var(--primary);">${formatResearchPercent(requiredEPSCAGR, 1, true)}</span>
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
                <span class="context-pill-val">${formatResearchPercent(yoy, 1, true)}</span>
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
            const cagr = window.NTMValuation.toPercent(window.NTMValuation.cagr(revEarliest, revLatest, yearsCount));
            const cagrPill = document.createElement('div');
            cagrPill.className = 'context-pill';
            cagrPill.innerHTML = `
                <span class="context-pill-label">Intäkts-CAGR (${yearsCount} år)</span>
                <span class="context-pill-val">${formatResearchPercent(cagr, 1, true)}</span>
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
    const rowGrowths = growthOffsets.map((offset) => Math.max(-99.9, baseGrowth + offset));

    // Generate 5 columns of Exit P/E centered on basePE
    const peOffsets = [-10, -5, 0, 5, 10];
    const colPEs = peOffsets.map((offset) => Math.max(0.1, basePE + offset));

    let html = '<thead><tr>';
    html += '<th class="sens-corner-header">EPS-tillväxt \\ Exit P/E</th>';
    colPEs.forEach((pe) => {
        html += `<th class="sens-header-col">${pe.toFixed(1)}x</th>`;
    });
    html += '</tr></thead><tbody>';

    rowGrowths.forEach((g, rIdx) => {
        const isBaseRow = growthOffsets[rIdx] === 0;
        html += `<tr><th class="sens-header-row ${isBaseRow ? 'sens-header-base' : ''}">${formatResearchPercent(g, 0, true)} / år</th>`;

        colPEs.forEach((pe, cIdx) => {
            const isBaseCol = peOffsets[cIdx] === 0;
            const isCenterBase = isBaseRow && isBaseCol;

            const model = window.NTMValuation.scenario(price, eps, g, years, pe);
            const futPrice = model.targetPrice;
            const cagr = model.cagr * 100;

            html += `
                <td class="sens-cell ${isCenterBase ? 'sens-cell-base' : ''}" title="${formatResearchPercent(g, 1, true)} tillväxt & ${pe}x P/E -> $${futPrice.toFixed(2)} (${formatResearchPercent(cagr, 1, true)} CAGR)">
                    <span class="sens-cell-price">$${futPrice.toFixed(1)}</span>
                    <small class="sens-cell-cagr ${cagr >= 0 ? 'val-positive' : 'val-negative'}">${formatResearchPercent(cagr, 1, true)}</small>
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
    selectedRevisionId: null,
};

function initThesisSection(data) {
    if (!data || !data.symbol) return;

    if (currentThesisState.ticker !== data.symbol) currentThesisState.selectedRevisionId = null;
    currentThesisState.ticker = data.symbol;
    currentThesisState.isDirty = false;

    // 1. Load existing thesis from localStorage
    const { thesis, error: readError, warning } = window.NTMThesisStorage.get(data.symbol);
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
            if (confirm('Radera alla thesis-versioner för detta bolag? Utfallskontroller med arkivkopior behålls. Full radering finns i Min NTM. Detta kan inte ångras.')) {
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
    displayThesisSnapshotPreview(thesis?.valuationSnapshot);
    renderRevisionHistory(data);
    if (readError || warning) showThesisError(readError || warning);
    window.NTMReview?.init(data);
}

function saveThesis(data) {
    const ticker = data.symbol || '';
    const companyName = data.manual ? document.getElementById('manualCompanyName').value.trim() || data.symbol : data.company?.name || '';

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
    if (!data.manual && valuationState.stale) {
        showThesisError(
            'Värderingen har ändrats sedan beräkningen. Klicka "Beräkna värdering & scenarier" innan du sparar thesisen.'
        );
        return;
    }

    // Create valuation snapshot (only if valuation has been calculated)
    let valuationSnapshot = null;
    if (!data.manual && valuationState.calculated && !valuationState.stale) {
        valuationSnapshot = captureValuationSnapshot(data);
    }

    // Build thesis object
    const lifecycle = window.NTMReview?.fields() || {};
    if(lifecycle.lifecycleError) {showThesisError(lifecycle.lifecycleError);return;}
    delete lifecycle.lifecycleError;
    const thesis = {
        ...lifecycle,
        text: thesisText,
        risks: thesisRisks,
        triggerChange: thesisTrigger,
        notes: thesisNotes,
        companyName,
        ...(data.manual ? {origin:'manual',companyIdentity:data.companyIdentity} : {}),
        valuationSnapshot,
    };

    // Save to localStorage
    const previousThesis = window.NTMThesisStorage.get(ticker).thesis;
    const result = window.NTMThesisStorage.save(ticker, thesis);

    if (!result.success) {
        showThesisError(result.error || 'Kunde inte spara analysen.');
        return;
    }

    if (result.created) {
        if (!previousThesis) window.NTMEvents?.emit('thesis_first_saved');
        if (thesis.assumptions?.length && JSON.stringify(thesis.assumptions) !== JSON.stringify(previousThesis?.assumptions)) window.NTMEvents?.emit('assumptions_added');
        if (thesis.reviewDate && thesis.reviewDate !== previousThesis?.reviewDate) window.NTMEvents?.emit('review_date_set');
        if (thesis.review?.decision === 'revise' && thesis.review.at !== previousThesis?.review?.at) window.NTMEvents?.emit('thesis_reviewed', { action: 'revise' });
    }
    // Update state
    if(data.manual) {data.company.name=companyName;document.getElementById('manualThesisHeading').textContent=companyName;document.title=`${companyName} – Manuell tes – NTM`;}
    currentThesisState.thesis = window.NTMThesisStorage.get(ticker).thesis;
    currentThesisState.isDirty = false;
    currentThesisState.selectedRevisionId = result.revisionId;

    // Show success
    showThesisSuccess(thesis.valuationSnapshot, result.created);
    showThesisSavedIndicator(result.updatedAt);
    displayThesisSnapshotPreview(currentThesisState.thesis?.valuationSnapshot);
    renderRevisionHistory(data);
    initChangeDetection(data);

    // Show delete button
    window.NTMReview?.init(data);
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

    // Snapshot structure
    const snapshot = {
        ...window.NTMResearchSnapshot.fromStockData(data),
        capturedAt: new Date().toISOString(),
        ticker: data.symbol,
        companyName: data.company?.name || '',

        // Valuation Assumptions
        valuationInputs: {
            stockPrice: price,
            priceSource: valuationState.priceSource || "manual",
            epsBasis: eps,
            epsSource: valuationState.isManualEps ? 'manual' : 'sec',
            requiredReturn: reqReturn,
            years,
            exitPE,
        },

        // Valuation Results (current calculated values)
        valuationResults: {
            peRatio: window.NTMValuation.multiple(price, eps),
            requiredEpsCAGR: calculateRequiredEpsCAGR(price, eps, reqReturn, years, exitPE),
            requiredFutureEPS: calculateRequiredFutureEPS(price, eps, reqReturn, years, exitPE),
            requiredFuturePrice: calculateRequiredFuturePrice(price, eps, reqReturn, years, exitPE),
        },

        // Preserve snapshot units while using the same scenario model as the displayed result.
        scenarios: Object.fromEntries([
            ['bear', bearGrowth, bearPE], ['base', baseGrowth, basePE], ['bull', bullGrowth, bullPE],
        ].map(([name, growth, exitPE]) => {
            const model = window.NTMValuation.scenario(price, eps, growth, years, exitPE);
            return [name, { growth, exitPE, futureEPS: model.futureEPS,
                futurePrice: model.targetPrice, cagr: window.NTMValuation.toPercent(model.cagr) }];
        })),
    };

    return window.NTMResearchSnapshot.normalize(snapshot);
}

function calculateRequiredEpsCAGR(price, eps, reqReturn, years, exitPE) {
    const value = window.NTMValuation.reverse(price, eps, years, reqReturn, exitPE).requiredEPSCAGR;
    return value === null ? null : value * 100;
}
function calculateRequiredFutureEPS(price, eps, reqReturn, years, exitPE) {
    return window.NTMValuation.reverse(price, eps, years, reqReturn, exitPE).requiredFutureEPS;
}
function calculateRequiredFuturePrice(price, eps, reqReturn, years, exitPE) {
    return window.NTMValuation.reverse(price, eps, years, reqReturn, exitPE).futurePriceRequired;
}

function showThesisSavedIndicator(savedTimestamp) {
    const indicator = document.getElementById('thesisSavedIndicator');
    const timeSpan = document.getElementById('thesisSavedTime');

    if (!indicator) return;

    // Format timestamp
    const date = new Date(savedTimestamp || NaN);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    let timeText = 'nyligen';
    if (!Number.isFinite(date.getTime())) {
        timeText = 'datum saknas';
    } else if (diffMins < 0) {
        timeText = date.toLocaleDateString('sv-SE');
    } else if (diffMins < 1) {
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
        banner.setAttribute('data-ntm-status', 'error');
        banner.textContent = msg;
        banner.style.display = 'block';
    }
}

function formatRevisionDate(value) {
    const date = value ? new Date(value) : null;
    return date && Number.isFinite(date.getTime())
        ? date.toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        : 'okänt datum';
}

function showThesisStatus(message) {
    const banner = document.getElementById('thesisStatusBanner');
    if (!banner) return;
    banner.className = 'calc-status-banner calc-status-success';
        banner.setAttribute('data-ntm-status', 'saved');
    banner.textContent = message;
    banner.style.display = 'block';
}

// Explicit allowlist: historical outputs and fundamentals never enter the editor.
const assumptionFields = {
    'val-price': ['stockPrice', 0.01, Infinity],
    'val-return': ['requiredReturn', -99.9, 1000],
    'val-years': ['years', 1, 50],
    'val-exit-pe': ['exitPE', 0.1, 1000],
};

function readEditableAssumptions() {
    const ids = [...Object.keys(assumptionFields), 'val-eps',
        ...['bear', 'base', 'bull'].flatMap((name) => [`sc-${name}-growth`, `sc-${name}-pe`])];
    return Object.fromEntries([...ids.map((id) => {
        const raw = String(document.getElementById(id).value).trim();
        return [id, raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : raw];
    }), ['epsMode', valuationState.isManualEps]]);
}

function planAssumptionRestore(snapshot, data) {
    const normalized = window.NTMResearchSnapshot.normalize(snapshot);
    const values = {};
    if (!normalized) return { values, partial: true };
    const accept = (id, value, min, max) => {
        if (Number.isFinite(value) && value >= min && value <= max &&
            (id !== 'val-years' || Number.isInteger(value))) values[id] = value;
    };
    for (const [id, [field, min, max]] of Object.entries(assumptionFields)) {
        accept(id, normalized.valuationInputs[field], min, max);
    }
    for (const name of ['bear', 'base', 'bull']) {
        const scenario = normalized.scenarios[name];
        accept(`sc-${name}-growth`, scenario?.growth, -99.9, 1000);
        accept(`sc-${name}-pe`, scenario?.exitPE, 0.1, 1000);
    }
    const source = normalized.valuationInputs.epsSource;
    const eps = source === 'manual' ? normalized.valuationInputs.epsBasis
        : source === 'sec' ? data?.valuationBase?.ttmDilutedEps?.value : null;
    if (Number.isFinite(eps) && eps > 0) {
        const input = source === 'sec' ? Number(eps.toFixed(2)) : eps;
        if (input > 0) {
            values['val-eps'] = input;
            values.epsMode = source === 'manual';
        }
    }
    return { values, partial: Object.keys(values).length < 12 };
}

function restoreRevisionAssumptions(revision, data) {
    const { values, partial } = planAssumptionRestore(revision.valuationSnapshot, data);
    if (!Object.keys(values).length) return;
    const current = readEditableAssumptions();
    const baseline = valuationState.lastCalculatedInputs || current;
    const overwritesEdits = Object.keys(values).some((id) =>
        current[id] !== values[id] && current[id] !== baseline[id]);
    if (overwritesEdits && !confirm('Ersätta dina ändrade, ännu inte beräknade antaganden med den sparade versionens antaganden?')) return;
    for (const [id, value] of Object.entries(values)) {
        if (id !== 'epsMode') document.getElementById(id).value = String(value);
    }
    if (Object.hasOwn(values, 'val-price')) { valuationState.priceSource = 'historical'; renderValuationPriceStatus(); }
    if (Object.hasOwn(values, 'epsMode')) {
        valuationState.isManualEps = values.epsMode;
        const badge = document.getElementById('val-eps-badge');
        badge.textContent = values.epsMode ? 'Manuell' : 'SEC TTM';
        badge.classList[values.epsMode ? 'add' : 'remove']('manual');
        document.getElementById('val-eps-help').textContent = values.epsMode
            ? 'Manuell EPS kopierad från sparad version. Kan ändras i aktuell kalkyl.'
            : 'EPS från aktuella SEC-data, inte från den historiska versionen.';
    }
    const notice = document.getElementById('assumptionRestoreNotice');
    notice.hidden = false;
    notice.textContent = `Antaganden kopierades från version ${formatRevisionDate(revision.savedAt)} (${revision.valuationSnapshot?.asOfPeriod || 'period saknas'}). Detta är din aktuella arbetskalkyl; du kan ändra fälten. Den sparade versionen är oförändrad. `
        + (Object.hasOwn(values, 'val-price') ? `Kopierad kurs $${values['val-price']} är historiskt sparad, inte en aktuell marknadskurs. ` : '')
        + (Object.hasOwn(values, 'epsMode') ? (values.epsMode ? 'Manuell EPS kopierades. ' : 'Aktuell SEC EPS hämtades till kalkylen. ') : 'EPS-fältet och dess källa behölls; historisk EPS kunde inte återanvändas säkert. ')
        + (partial ? 'Vissa antaganden saknas eller är inkompatibla; dessa fält behöll sina värden. ' : '')
        + 'Historiska värderingsantaganden används med aktuell, senast rapporterad Research-data; den historiska analysen återskapas inte. Beräkna värdering & scenarier innan du sparar en ny version.';
    markValuationStale();
    document.getElementById('valuationForm').scrollIntoView?.({ block: 'start' });
    document.getElementById('val-price').focus?.({ preventScroll: true });
}

function renderRevisionHistory(data) {
    window.NTMVisualV3?.workspace(data);
    if (window.NTMResearchPublication) Promise.resolve().then(() => window.NTMResearchPublication.refreshSource());
    const section = document.getElementById('thesisHistorySection');
    if (!section) return;
    const { thesis } = window.NTMThesisStorage.get(data?.symbol || currentThesisState.ticker);
    const select = document.getElementById('thesisRevisionSelect');
    select.innerHTML = '';
    section.hidden = !thesis;
    if (!thesis) {
        renderResearchExportControls(data?.symbol, null, null);
        window.NTMResearchOutcomeUI.init(data, null);
        window.NTMResearchAIUI?.init(data, null);
        currentThesisState.selectedRevisionId = null;
        document.getElementById('revisionSnapshotPreview').innerHTML = '';
        for (const id of ['revisionSelectionLabel', 'revisionText', 'revisionRisks', 'revisionTrigger', 'revisionNotes']) {
            document.getElementById(id).textContent = '';
        }
        return;
    }
    const selected = thesis.revisions.find((r) => r.id === currentThesisState.selectedRevisionId)
        || thesis.revisions[thesis.revisions.length - 1];
    currentThesisState.selectedRevisionId = selected.id;
    renderResearchExportControls(data?.symbol, thesis, selected);
    window.NTMResearchOutcomeUI.init(data, selected);
    window.NTMResearchAIUI?.init(data, selected);
    for (const revision of [...thesis.revisions].reverse()) {
        const base = revision.valuationSnapshot?.scenarios?.base;
        const price = Number.isFinite(base?.futurePrice) ? ` · Base $${base.futurePrice.toFixed(2)}` : '';
        const cagr = Number.isFinite(base?.cagr) ? ` · ${base.cagr.toFixed(1)}%/år` : '';
        const option = document.createElement('option');
        option.value = revision.id;
        option.textContent = `${revision.id === thesis.latestRevisionId ? 'Senaste · ' : ''}${formatRevisionDate(revision.savedAt)} · ${revision.valuationSnapshot?.asOfPeriod || 'Period saknas'}${price}${cagr} · ${window.NTMThesisStorage.decisionLabels[revision.review?.decision] || 'Sparad tes'}${revision.origin === 'manual' ? ' · Manuell tes' : ''}`;
        select.appendChild(option);
    }
    select.value = selected.id;
    select.onchange = () => selectThesisRevision(select.value, data);
    document.getElementById('revisionSelectionLabel').textContent =
        `${selected.id === thesis.latestRevisionId ? 'Senaste sparade version' : 'Historisk version'} · ${formatRevisionDate(selected.savedAt)} · ${selected.valuationSnapshot?.asOfPeriod || 'Period saknas'} · Visas endast för läsning.`;
    for (const [id, field] of [['revisionText', 'text'], ['revisionRisks', 'risks'], ['revisionTrigger', 'triggerChange'], ['revisionNotes', 'notes']]) {
        document.getElementById(id).textContent = selected[field] || 'Inte angivet';
    }
    displayThesisSnapshotPreview(selected.valuationSnapshot, 'revisionSnapshotPreview');
    const assumptions = document.getElementById('revisionAssumptions');
    if (assumptions) assumptions.textContent = window.NTMThesisStorage.assumptionText(selected);
    const questions=document.getElementById('revisionQuestions');
    if(questions) questions.textContent=window.NTMThesisStorage.questionText(selected);
    const review = document.getElementById('revisionReview');
    if (review) review.textContent = `Planerat datum: ${selected.reviewDate || 'inte angivet'}. Beslut: ${window.NTMThesisStorage.decisionLabels[selected.review?.decision] || 'inte granskat'}. ${selected.review?.context || ''} Process: ${selected.review?.processNote || 'inte angiven'}. Granskat: ${selected.review?.at || 'inte granskat'} · Källversion: ${selected.review?.sourceRevisionId || 'saknas'}`;
    const restorePlan = data.manual ? {values:{}} : planAssumptionRestore(selected.valuationSnapshot, data);
    const restoreButton = document.getElementById('revisionRestoreBtn');
    restoreButton.hidden = Boolean(data.manual);
    document.getElementById('revisionRestoreHelp').hidden = Boolean(data.manual);
    restoreButton.disabled = !Object.keys(restorePlan.values).length;
    restoreButton.onclick = () => restoreRevisionAssumptions(selected, data);
    document.getElementById('revisionRestoreHelp').textContent = restoreButton.disabled
        ? 'Den här versionen saknar kompatibla antaganden att använda.'
        : 'Kopiera historiska värderingsantaganden till din redigerbara kalkyl med aktuell, senast rapporterad Research-data. Det återskapar inte den historiska analysen. Din text och den frysta versionen ändras inte.';
    document.getElementById('revisionDeleteBtn').onclick = () => {
        if (confirm(`Radera versionen sparad ${formatRevisionDate(selected.savedAt)}? Övriga versioner och utfallskontroller med arkivkopior behålls. Detta kan inte ångras.`)) {
            deleteSelectedRevision(data);
        }
    };
}

function renderResearchExportControls(ticker, thesis, selected) {
    const label = document.getElementById('researchExportSource');
    const markdown = document.getElementById('researchExportMarkdown');
    const print = document.getElementById('researchExportPrint');
    markdown.disabled = print.disabled = !selected;
    label.textContent = selected
        ? `Exportkälla: ${selected.id === thesis.latestRevisionId ? 'senaste sparade version' : 'historisk version'} · ${formatRevisionDate(selected.savedAt)} · ${selected.valuationSnapshot?.asOfPeriod || 'period saknas'}. Endast sparade uppgifter exporteras.`
        : 'Spara en analysversion innan du exporterar. Ingen läsbar sparad version finns för detta bolag.';
    const getDocument = () => {
        // Read again at click time; never silently switch sources if a revision disappeared.
        const { thesis: saved } = window.NTMThesisStorage.get(ticker);
        const revision = saved?.revisions.find((item) => item.id === selected?.id);
        if (!revision) {
            label.textContent = 'Den valda versionen kan inte längre läsas. Välj en sparad version igen.';
            return null;
        }
        return window.NTMResearchExport.build(ticker, revision, saved.latestRevisionId);
    };
    markdown.onclick = () => {
        const document = getDocument();
        if (!document) return;
        try { window.NTMResearchExport.download(document); }
        catch (error) { label.textContent = 'Nedladdningen kunde inte startas. Försök igen eller använd utskriftsvyn.'; }
    };
    print.onclick = () => {
        const exported = getDocument();
        if (!exported) return;
        const view = document.getElementById('researchPrintView');
        const content = document.getElementById('researchPrintContent');
        window.NTMResearchExport.renderPrint(exported, content);
        const previousTitle = document.title;
        const scrollPosition = window.scrollY;
        document.title = window.NTMResearchExport.filename(exported).replace(/\.md$/, '');
        view.hidden = false;
        document.body.classList.add('research-export-preview');
        content.focus();
        window.scrollTo(0, 0);
        document.getElementById('researchPrintSubmit').onclick = () => window.print();
        document.getElementById('researchPrintBack').onclick = () => {
            view.hidden = true;
            document.body.classList.remove('research-export-preview');
            document.title = previousTitle;
            print.focus({ preventScroll: true });
            window.scrollTo(0, scrollPosition);
        };
    };
}

function selectThesisRevision(revisionId, data) {
    const { thesis } = window.NTMThesisStorage.get(data?.symbol);
    if (!thesis?.revisions.some((r) => r.id === revisionId)) return;
    currentThesisState.selectedRevisionId = revisionId;
    renderRevisionHistory(data);
    initChangeDetection(data);
}

function deleteSelectedRevision(data) {
    const ticker = currentThesisState.ticker;
    const { thesis } = window.NTMThesisStorage.get(ticker);
    const wasLatest = thesis?.latestRevisionId === currentThesisState.selectedRevisionId;
    const result = window.NTMThesisStorage.removeRevision(ticker, currentThesisState.selectedRevisionId);
    window.NTMEvents?.emit(result.success ? 'delete_completed' : 'delete_error');
    if (!result.success) { showThesisError(result.error); return; }
    currentThesisState.selectedRevisionId = null;
    if (wasLatest && !currentThesisState.isDirty) {
        initThesisSection(data);
    } else {
        currentThesisState.thesis = window.NTMThesisStorage.get(ticker).thesis;
        displayThesisSnapshotPreview(currentThesisState.thesis?.valuationSnapshot);
        document.getElementById('thesisDeleteBtn').style.display = currentThesisState.thesis ? 'inline-block' : 'none';
        if (!currentThesisState.thesis) hideThesisSavedIndicator();
        renderRevisionHistory(data);
    }
    initChangeDetection(data);
    showThesisStatus(currentThesisState.isDirty
        ? 'Versionen raderad. Dina osparade textändringar finns kvar i formuläret.'
        : currentThesisState.thesis ? 'Versionen raderad. Senaste kvarvarande version används för jämförelsen.'
        : 'Versionen raderad. Ingen sparad version återstår.');
}

function showThesisSuccess(snapshot, created = true) {
    const banner = document.getElementById('thesisStatusBanner');
    if (banner) {
        const msg = !created ? 'Inga ändringar att spara. Senaste versionen finns redan.' : snapshot
            ? 'Ny version sparad med värdering. Tidigare versioner finns kvar.'
            : 'Ny version sparad utan värdering. Tidigare versioner finns kvar.';
        banner.className = 'calc-status-banner calc-status-success';
        banner.setAttribute('data-ntm-status', 'saved');
        banner.textContent = msg;
        banner.style.display = 'block';
    }
    // Auto-hide after 3 seconds
    setTimeout(() => {
        if (banner) banner.style.display = 'none';
    }, 3000);
}

function displayThesisSnapshotPreview(snapshot, targetId = 'thesisSnapshotPreview') {
    const previewDiv = document.getElementById(targetId);
    if (!previewDiv) return;

    snapshot = window.NTMResearchSnapshot.normalize(snapshot);
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
                    <span class="snapshot-label">Historiskt sparat ${inputs.priceSource === 'example' ? 'exempelpris' : inputs.priceSource === 'manual' ? 'manuellt pris' : 'pris (ursprunglig källa ej dokumenterad)'} – inte livekurs. Verifierat kursdatum saknas.</span>
                    <span class="snapshot-value">$${inputs.stockPrice?.toFixed(2) || '–'}</span>
                </div>
                <div class="snapshot-cell">
                    <span class="snapshot-label">EPS-bas</span>
                    <span class="snapshot-value">$${inputs.epsBasis?.toFixed(2) || '–'} (${inputs.epsSource === 'manual' ? 'Manuell' : inputs.epsSource === 'sec' ? 'SEC' : 'Okänd källa'})</span>
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
                <div class="snapshot-cell">
                    <span class="snapshot-label">Krävd EPS-tillväxt</span>
                    <span class="snapshot-value">${results.requiredEpsCAGR?.toFixed(1) || '–'}% / år</span>
                </div>
                <div class="snapshot-cell">
                    <span class="snapshot-label">Krävd framtida EPS / kurs</span>
                    <span class="snapshot-value">$${results.requiredFutureEPS?.toFixed(2) || '–'} / $${results.requiredFuturePrice?.toFixed(2) || '–'}</span>
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
                        <small>EPS-tillväxt ${scenarios.bear?.growth?.toFixed(1) || '–'}% · Exit P/E ${scenarios.bear?.exitPE?.toFixed(1) || '–'}x · Framtida EPS $${scenarios.bear?.futureEPS?.toFixed(2) || '–'}</small>
                    </div>
                    <div class="scenario-cell scenario-base">
                        <span class="scenario-label">Base</span>
                        <span class="scenario-future-price">$${scenarios.base?.futurePrice?.toFixed(2) || '–'}</span>
                        <span class="scenario-cagr">${scenarios.base?.cagr?.toFixed(1) || '–'}%</span>
                        <small>EPS-tillväxt ${scenarios.base?.growth?.toFixed(1) || '–'}% · Exit P/E ${scenarios.base?.exitPE?.toFixed(1) || '–'}x · Framtida EPS $${scenarios.base?.futureEPS?.toFixed(2) || '–'}</small>
                    </div>
                    <div class="scenario-cell scenario-bull">
                        <span class="scenario-label">Bull</span>
                        <span class="scenario-future-price">$${scenarios.bull?.futurePrice?.toFixed(2) || '–'}</span>
                        <span class="scenario-cagr">${scenarios.bull?.cagr?.toFixed(1) || '–'}%</span>
                        <small>EPS-tillväxt ${scenarios.bull?.growth?.toFixed(1) || '–'}% · Exit P/E ${scenarios.bull?.exitPE?.toFixed(1) || '–'}x · Framtida EPS $${scenarios.bull?.futureEPS?.toFixed(2) || '–'}</small>
                    </div>
                </div>
            </div>
        `;
    }

    if (snapshot.capturedAt) {
        html += `<p class="snapshot-timestamp">Sparad ${new Date(snapshot.capturedAt).toLocaleDateString('sv-SE')} kl ${new Date(snapshot.capturedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</p>`;
    }

    previewDiv.innerHTML = html;
}

function deleteStoredThesis() {
    const ticker = currentThesisState.ticker;
    if (!ticker) return;

    const result = window.NTMThesisStorage.remove(ticker);
    window.NTMEvents?.emit(result.success ? 'delete_completed' : 'delete_error');
    if (!result.success) {
        showThesisError(result.error || 'Kunde inte radera analysen.');
        return;
    }

    // Clear form & state
    currentThesisState.thesis = null;
    currentThesisState.isDirty = false;
    currentThesisState.selectedRevisionId = null;
    document.getElementById('thesis-text').value = '';
    document.getElementById('thesis-risks').value = '';
    document.getElementById('thesis-trigger').value = '';
    document.getElementById('thesis-notes').value = '';

    // Hide elements
    document.getElementById('thesisDeleteBtn').style.display = 'none';
    hideThesisSavedIndicator();
    document.getElementById('thesisSnapshotPreview').innerHTML = '';
    renderRevisionHistory(currentStockData);
    initChangeDetection(currentStockData);

    // Show success
    window.NTMReview?.init(currentStockData);
    showThesisStatus('All thesis-historik har raderats. Utfallskontroller med arkivkopior behålls. Radera även dem via Min NTM.');
}

/**
 * Display change detection between saved thesis snapshot and current data
 */
function initChangeDetection(data) {
    if(data?.manual) {document.getElementById('changeDetectionSection').style.display='none';return;}
    const changeSection = document.getElementById('changeDetectionSection');
    const changeContent = document.getElementById('changeDetectionContent');
    
    if (!changeSection || !changeContent) return;

    // Clear any previous report, including after a save/delete or unavailable data.
    changeSection.style.display = 'none';
    changeContent.innerHTML = '';
    if (!data) return;

    // Get saved thesis
    const ticker = data.symbol;
    const { thesis: latest, error } = window.NTMThesisStorage.get(ticker);
    const thesis = latest?.revisions.find((r) => r.id === currentThesisState.selectedRevisionId)
        || latest?.revisions[latest.revisions.length - 1];
    const label = document.getElementById('changeBaselineLabel');
    if (label) label.textContent = thesis
        ? `${thesis.id === latest.latestRevisionId ? 'Senaste version' : 'Historisk version'} sparad ${formatRevisionDate(thesis.savedAt)} · Jämförs med aktuella bolagsdata ${data.ttm?.asOfPeriod || data.valuationBase?.asOfPeriod || '–'}. Aktiekursantaganden jämförs inte.`
        : '';

    // No thesis = no change detection
    if (error || !thesis || !thesis.valuationSnapshot) {
        if (!error && thesis) {
            changeSection.style.display = 'block';
            changeContent.textContent = 'Den valda versionen saknar en tillgänglig värderingssnapshot. Ingen jämförelse kan visas.';
            return;
        }
        changeSection.style.display = 'none';
        return;
    }

    // Run change detection
    if (!window.NTMChangeDetection) {
        changeSection.style.display = 'none';
        return;
    }

    const report = window.NTMChangeDetection.detect(thesis.valuationSnapshot, data);
    if (report.reason) {
        changeSection.style.display = 'block';
        changeContent.textContent = 'Snapshoten kan inte jämföras med detta bolags data.';
        return;
    }

    // If no changes and snapshot not old, hide section
    if (!report.hasChanges && !report.blocked?.length && thesis.id === latest.latestRevisionId && !window.NTMChangeDetection.isSnapshotStale(thesis.valuationSnapshot)) {
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
    if (report.blocked?.length) {
        html += '<div class="change-block"><p data-ntm-status="unsafe">Inte jämförbart · Vissa mått kan inte jämföras säkert.</p><details><summary>Visa orsaker</summary>'
            + report.blocked.map((item) => `<p>${escapeHtml(item.name)}: ${escapeHtml(item.reason)}</p>`).join('') + '</details></div>';
    }

    // Period change
    if (report.periodChange) {
        html += `
            <div class="change-block change-block-period">
                <p class="change-label">📅 Data uppdaterad</p>
                <p class="change-text">
                    Din analys är från <strong>${escapeHtml(report.periodChange.from)}</strong>
                    → Aktuell data är från <strong>${escapeHtml(report.periodChange.to)}</strong>
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
            const deltaFormatted = window.NTMChangeDetection.formatChange(change);

            html += `
                <div class="change-row">
                    <span><strong>${change.name}</strong></span>
                    <span class="change-val-snap">${snap}</span>
                    <span class="change-val-curr">${curr}</span>
                    <span class="change-val-delta">${escapeHtml(deltaFormatted)}</span>
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
                <p class="change-text">Inga förändringar över tröskelvärdena hittades bland jämförbara uppgifter. Saknade historiska värden kan inte bedömas.</p>
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


function renderValuationPriceStatus(calculated = false) {
    const label = valuationState.priceSource === 'historical' ? 'Historiskt sparat pris – inte aktuell börskurs'
        : valuationState.priceSource === 'manual' ? 'Pris angivet av dig – manuell kurs, inte livekurs'
        : 'Exempelpris – inte aktuell börskurs';
    const input = document.getElementById('valuationPriceInputStatus');
    if (input) input.textContent = `${label}. Verifierat kursdatum saknas.`;
    if (input) input.setAttribute('data-ntm-status', valuationState.priceSource === 'historical' ? 'warning' : 'manual');
    const output = document.getElementById('valuationPriceResultStatus');
    if (calculated && output) output.textContent = `${label}: $${document.getElementById('val-price').value}. Verifierat kursdatum saknas. Alla värderingsresultat och scenarier nedan är modellerade utifrån detta pris och dina antaganden. Fundamenta kommer från normaliserade SEC-data; ingen livekurs hämtas.`;
    if (calculated && output) output.setAttribute('data-ntm-status', 'derived');
}
