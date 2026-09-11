const form = document.getElementById('calculator-form');
const dividendForm = document.getElementById('dividend-form');
const feeForm = document.getElementById('avgifts-form');
const leverageForm = document.getElementById('leverage-form');
const recoveryForm = document.getElementById('recovery-form');
const dailyLeverageForm = document.getElementById('daily-leverage-form');
const fireCalculatorForm = document.getElementById('fire-form');
const fireGoalForm = document.getElementById('fire-goal-form');
const fireWithdrawalForm = document.getElementById('fire-withdrawal-form');
const iskCalculatorForm = document.getElementById('isk-form');
const iskModeTabs = document.querySelectorAll('.isk-mode-tab[data-isk-mode]');
const stockValuationForm = document.getElementById('stock-valuation-form');
const stockModeTabs = document.querySelectorAll('.stock-mode-tab[data-stock-mode]');
const returnCalculatorForm = document.getElementById('return-calculator-form');
const returnModeTabs = document.querySelectorAll('.return-mode-tab[data-return-mode]');
const purchaseCalculatorForm = document.getElementById('purchase-calculator-form');
const purchaseModeTabs = document.querySelectorAll('.purchase-mode-tab[data-purchase-mode]');
const goalCalculatorForm = document.getElementById('goal-calculator-form');
const goalModeTabs = document.querySelectorAll('.goal-mode-tab[data-goal-mode]');
const mortgageCalculatorForm = document.getElementById('mortgage-calculator-form');
const mortgageModeTabs = document.querySelectorAll('.mortgage-mode-tab[data-mortgage-mode]');
const themeToggle = document.getElementById('themeToggle');
const modeTabs = document.querySelectorAll('.mode-tab[data-mode]');
const leverageModeTabs = document.querySelectorAll('.mode-tab[data-leverage-mode]');
const modePanels = {
  growth: document.getElementById('growth-mode-panel'),
  dividend: document.getElementById('dividend-mode-panel')
};
const mobileNavToggle = document.getElementById('mobileNavToggle');
const navMenu = document.querySelector('.main-nav');
let investmentChart = null;
let scenarioChart = null;
let dividendChart = null;
let feeComparisonChart = null;
let leverageChart = null;
let dailyLeverageChart = null;
let stockValuationChart = null;
let returnChart = null;
let purchaseChart = null;
let goalChart = null;
let mortgageChart = null;
let fireGoalChart = null;
let fireWithdrawalChart = null;
let currentLeverageMode = 'belaning';

/* Calculation State Manager */
class CalcState {
  constructor({ id, container, form, onCalculate, onReset, errorElementId }) {
    this.id = id;
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.form = typeof form === 'string' ? document.querySelector(form) : form;
    this.onCalculate = onCalculate;
    this.onReset = onReset;
    this.errorElementId = errorElementId;
    this.state = 'neutral';
    this.statusBanner = null;

    this.init();
  }

  init() {
    if (!this.container) return;

    this.statusBanner = this.container.querySelector('.calc-status-banner');
    if (!this.statusBanner) {
      this.statusBanner = document.createElement('div');
      this.statusBanner.className = 'calc-status-banner calc-status-neutral';
      this.statusBanner.setAttribute('role', 'status');
      this.statusBanner.setAttribute('aria-live', 'polite');

      const formEl = this.form || this.container.querySelector('form');
      if (formEl) {
        formEl.after(this.statusBanner);
      } else {
        this.container.prepend(this.statusBanner);
      }
    }

    this.setNeutral();

    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.calculate();
      });

      this.form.addEventListener('input', () => this.handleInputChange());
      this.form.addEventListener('change', () => this.handleInputChange());
      this.form.addEventListener('reset', () => {
        setTimeout(() => this.setNeutral(), 0);
      });
    }
  }

  handleInputChange() {
    if (this.state === 'calculated') {
      this.setStale();
    }
  }

  setNeutral() {
    this.state = 'neutral';
    if (this.container) {
      this.container.setAttribute('data-calc-state', 'neutral');
    }
    if (this.statusBanner) {
      this.statusBanner.className = 'calc-status-banner calc-status-neutral';
      this.statusBanner.innerHTML = '<p>Ange dina värden och klicka på Beräkna.</p>';
      this.statusBanner.hidden = false;
    }
    if (this.errorElementId) {
      const errEl = document.getElementById(this.errorElementId);
      if (errEl) errEl.classList.add('hidden');
    }
    if (this.onReset) this.onReset();
  }

  setStale() {
    if (this.state === 'neutral') return;
    this.state = 'stale';
    if (this.container) {
      this.container.setAttribute('data-calc-state', 'stale');
    }
    if (this.statusBanner) {
      this.statusBanner.className = 'calc-status-banner calc-status-stale';
      this.statusBanner.innerHTML = '<p>⚡ Värdena har ändrats. Klicka på Beräkna för att uppdatera resultatet.</p>';
      this.statusBanner.hidden = false;
    }
  }

  setStaleFromLoad() {
    if (this.state === 'neutral') {
      this.state = 'calculated';
    }
    this.setStale();
  }

  calculate() {
    if (!this.onCalculate) return;

    if (this.errorElementId) {
      const errEl = document.getElementById(this.errorElementId);
      if (errEl) errEl.classList.add('hidden');
    }

    const result = this.onCalculate();
    const isSuccess = result === true || (result && typeof result === 'object' && result.success);

    if (isSuccess) {
      this.state = 'calculated';
      if (this.container) {
        this.container.setAttribute('data-calc-state', 'calculated');
      }
      if (this.statusBanner) {
        this.statusBanner.className = 'calc-status-banner hidden';
        this.statusBanner.innerHTML = '';
        this.statusBanner.hidden = true;
      }
    } else {
      const errorMessage = typeof result === 'string'
        ? result
        : (result && result.error) || 'Ange giltiga värden i alla fält och klicka på Beräkna.';

      if (this.statusBanner) {
        this.statusBanner.className = 'calc-status-banner calc-status-error';
        this.statusBanner.innerHTML = `<p>⚠️ ${errorMessage}</p>`;
        this.statusBanner.hidden = false;
      }
    }
  }
}

const SCENARIO_STORAGE_KEY = 'investment-scenarios-v1';

function readScenarioStore() {
  try {
    if (!window.localStorage) {
      return { data: { version: 1, calculators: {} }, error: 'Lokal lagring är inte tillgänglig.' };
    }
    const raw = window.localStorage.getItem(SCENARIO_STORAGE_KEY);
    if (!raw) {
      return { data: { version: 1, calculators: {} }, error: null };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || typeof parsed.calculators !== 'object') {
      return { data: { version: 1, calculators: {} }, error: 'Sparade scenarier kunde inte läsas.' };
    }
    return { data: parsed, error: null };
  } catch (error) {
    return { data: { version: 1, calculators: {} }, error: 'Sparade scenarier kunde inte läsas.' };
  }
}

function getSavedScenarios(calculatorId) {
  const result = readScenarioStore();
  const scenarios = result.data.calculators[calculatorId];
  return {
    scenarios: Array.isArray(scenarios) ? scenarios : [],
    error: result.error
  };
}

function writeScenarioStore(data) {
  try {
    if (!window.localStorage) return false;
    window.localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    return false;
  }
}

function createScenarioId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveScenario(calculatorId, scenario, maxScenarios = 10) {
  const result = readScenarioStore();
  const scenarios = Array.isArray(result.data.calculators[calculatorId])
    ? result.data.calculators[calculatorId]
    : [];
  if (scenarios.length >= maxScenarios) {
    return { ok: false, error: `Du kan spara högst ${maxScenarios} scenarier.` };
  }
  const storedScenario = {
    id: createScenarioId(),
    name: scenario.name,
    createdAt: new Date().toISOString(),
    mode: scenario.mode,
    inputs: scenario.inputs
  };
  result.data.calculators[calculatorId] = [storedScenario, ...scenarios];
  return writeScenarioStore(result.data)
    ? { ok: true, scenario: storedScenario }
    : { ok: false, error: 'Scenariot kunde inte sparas lokalt.' };
}

function deleteScenario(calculatorId, scenarioId) {
  const result = readScenarioStore();
  const scenarios = Array.isArray(result.data.calculators[calculatorId])
    ? result.data.calculators[calculatorId]
    : [];
  result.data.calculators[calculatorId] = scenarios.filter((scenario) => scenario.id !== scenarioId);
  return writeScenarioStore(result.data);
}

function snapshotForm(form) {
  const inputs = {};
  if (!form) return inputs;
  form.querySelectorAll('input[id], select[id], textarea[id]').forEach((control) => {
    inputs[control.id] = {
      type: control.type || control.tagName.toLowerCase(),
      value: control.value,
      checked: control.type === 'checkbox' || control.type === 'radio' ? control.checked : undefined
    };
  });
  return inputs;
}

function restoreFormSnapshot(form, inputs) {
  if (!form || !inputs || typeof inputs !== 'object') return;
  Object.entries(inputs).forEach(([id, saved]) => {
    const control = form.querySelector(`#${CSS.escape(id)}`);
    if (!control || !saved) return;
    if (saved.type === 'checkbox' || saved.type === 'radio') {
      control.checked = Boolean(saved.checked);
    } else {
      control.value = saved.value ?? '';
    }
  });
}

window.NTMScenarioStorage = {
  key: SCENARIO_STORAGE_KEY,
  get: getSavedScenarios,
  save: saveScenario,
  remove: deleteScenario,
  snapshotForm,
  restoreFormSnapshot
};

let growthCalcState = null;
let dividendCalcState = null;
let feeCalcState = null;
let recoveryCalcState = null;
let leverageCalcState = null;
let dailyLeverageCalcState = null;
let firePathCalcState = null;
let fireGoalCalcState = null;
let fireWithdrawalCalcState = null;
let iskCalcState = null;
let stockValuationCalcState = null;
let returnCalcState = null;
let purchaseCalcState = null;
let goalCalcState = null;
let mortgageCalcState = null;
let fxCalcState = null;

function formatCurrency(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '0 kr';
  }

  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0
  }).format(numericValue);
}

function setActiveMode(mode) {
  if (!modeTabs.length || !document.getElementById('growth-mode-panel') || !document.getElementById('dividend-mode-panel')) {
    return;
  }

  const selectedMode = mode === 'dividend' ? 'dividend' : 'growth';

  modeTabs.forEach((button) => {
    const isActive = button.dataset.mode === selectedMode;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  Object.entries(modePanels).forEach(([key, panel]) => {
    if (panel) {
      panel.classList.toggle('hidden', key !== selectedMode);
    }
  });

  if (growthCalcState) growthCalcState.setNeutral();
  if (dividendCalcState) dividendCalcState.setNeutral();
}

function getActiveMode() {
  const activeTab = document.querySelector('.mode-tab.active');
  return activeTab ? activeTab.dataset.mode : 'growth';
}

function getInputs() {
  return {
    startCapital: Number(document.getElementById('startkapital').value) || 0,
    monthlySavings: Number(document.getElementById('manadssparande').value) || 0,
    annualReturn: Number(document.getElementById('avkastning').value) || 0,
    annualFee: Number(document.getElementById('avgift').value) || 0,
    annualInflation: Number(document.getElementById('inflation').value) || 0,
    years: Number(document.getElementById('ar').value) || 0
  };
}

function calculateProjection(startCapital, monthlySavings, annualReturn, annualFee, years) {
  const annualReturnBeforeFee = annualReturn / 100;
  const annualFeeRate = annualFee / 100;
  const annualNetReturn = (1 + annualReturnBeforeFee) * (1 - annualFeeRate) - 1;
  const monthlyRate = Math.pow(1 + annualNetReturn, 1 / 12) - 1;
  const months = years * 12;

  let futureValue = startCapital;

  if (months > 0) {
    futureValue = startCapital * Math.pow(1 + monthlyRate, months);

    if (monthlyRate !== 0) {
      futureValue += monthlySavings * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    } else {
      futureValue += monthlySavings * months;
    }
  }

  const totalInvested = startCapital + monthlySavings * months;
  const earnings = futureValue - totalInvested;

  return { futureValue, totalInvested, earnings };
}

function buildGrowthSeries() {
  const { startCapital, monthlySavings, annualReturn, annualFee, years } = getInputs();
  const annualReturnBeforeFee = annualReturn / 100;
  const annualFeeRate = annualFee / 100;
  const annualNetReturn = (1 + annualReturnBeforeFee) * (1 - annualFeeRate) - 1;
  const monthlyRate = Math.pow(1 + annualNetReturn, 1 / 12) - 1;

  const labels = ['0'];
  const portfolioValues = [startCapital];
  const investedValues = [startCapital];

  for (let year = 1; year <= years; year += 1) {
    const months = year * 12;
    const futureValue = startCapital * Math.pow(1 + monthlyRate, months) + monthlySavings * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    const investedCapital = startCapital + monthlySavings * months;

    labels.push(String(year));
    portfolioValues.push(futureValue);
    investedValues.push(investedCapital);
  }

  return { labels, portfolioValues, investedValues };
}

function getChartColors() {
  const style = getComputedStyle(document.body);
  return {
    text: style.getPropertyValue('--text').trim() || '#edf6ff',
    muted: style.getPropertyValue('--muted').trim() || '#9bb0c4',
    primary: style.getPropertyValue('--primary').trim() || '#3dd9c6',
    primarySoft: style.getPropertyValue('--primary-soft').trim() || 'rgba(61, 217, 198, 0.12)',
    accent: style.getPropertyValue('--accent').trim() || '#5ea3ff',
    accentSoft: style.getPropertyValue('--accent-soft').trim() || 'rgba(94, 163, 255, 0.08)',
    warning: style.getPropertyValue('--warning').trim() || '#ffd166',
    danger: style.getPropertyValue('--danger').trim() || '#ff6b6b',
    grid: style.getPropertyValue('--border').trim() || 'rgba(148, 163, 184, 0.18)'
  };
}

function renderChart() {
  const { labels, portfolioValues, investedValues } = buildGrowthSeries();
  const chartCanvas = document.getElementById('investmentChart');
  const colors = getChartColors();

  if (!chartCanvas) {
    return;
  }

  if (investmentChart) {
    investmentChart.destroy();
  }

  investmentChart = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Portföljens totala värde',
          data: portfolioValues,
          borderColor: colors.primary,
          backgroundColor: colors.primarySoft,
          borderWidth: 3,
          pointRadius: 0,
          fill: true,
          tension: 0.35
        },
        {
          label: 'Totalt insatt kapital',
          data: investedValues,
          borderColor: colors.accent,
          backgroundColor: colors.accentSoft,
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.35
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: colors.text,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            padding: 16
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'År',
            color: colors.muted
          },
          ticks: {
            color: colors.muted,
            maxTicksLimit: 8
          },
          grid: {
            color: colors.grid
          },
          border: {
            display: false
          }
        },
        y: {
          ticks: {
            color: colors.muted,
            callback: function (value) {
              return `${Math.round(value / 1000)}k`;
            }
          },
          grid: {
            color: colors.grid
          },
          border: {
            display: false
          }
        }
      }
    }
  });
}

function renderScenarioComparison() {
  const scenarioGrid = document.getElementById('scenarioGrid');
  if (!scenarioGrid) {
    return;
  }

  const hasGrowthInputs = document.getElementById('startkapital') && document.getElementById('manadssparande') && document.getElementById('ar');
  const hasDividendInputs = document.getElementById('dividend-startkapital') && document.getElementById('dividend-manadssparande') && document.getElementById('dividend-ar');

  if (!hasGrowthInputs && !hasDividendInputs) {
    return;
  }

  const activeMode = getActiveMode();
  let startCapital, monthlySavings, years;

  if (activeMode === 'dividend') {
    startCapital = Number(document.getElementById('dividend-startkapital').value) || 0;
    monthlySavings = Number(document.getElementById('dividend-manadssparande').value) || 0;
    years = Number(document.getElementById('dividend-ar').value) || 0;
  } else {
    startCapital = Number(document.getElementById('startkapital').value) || 0;
    monthlySavings = Number(document.getElementById('manadssparande').value) || 0;
    years = Number(document.getElementById('ar').value) || 0;
  }

  const scenarioReturns = [7, 10, 20];
  const scenarioValues = scenarioReturns.map((scenarioReturn) => {
    const result = calculateProjection(startCapital, monthlySavings, scenarioReturn, 0, years);
    return {
      returnRate: scenarioReturn,
      value: result.futureValue,
      invested: result.totalInvested,
      earnings: result.earnings
    };
  });

  scenarioGrid.innerHTML = scenarioValues.map((scenario) => `
    <article class="scenario-card">
      <h3>${scenario.returnRate}%</h3>
      <p class="scenario-value">${formatCurrency(scenario.value)}</p>
      <div class="scenario-meta">Avkastning: ${formatCurrency(scenario.earnings)}</div>
    </article>
  `).join('');

  const scenarioChartCanvas = document.getElementById('scenarioChart');
  const colors = getChartColors();

  if (!scenarioChartCanvas) {
    return;
  }

  if (scenarioChart) {
    scenarioChart.destroy();
  }

  scenarioChart = new Chart(scenarioChartCanvas, {
    type: 'bar',
    data: {
      labels: scenarioValues.map((scenario) => `${scenario.returnRate}%`),
      datasets: [
        {
          label: 'Slutvärde',
          data: scenarioValues.map((scenario) => scenario.value),
          backgroundColor: ['rgba(61, 217, 198, 0.8)', 'rgba(94, 163, 255, 0.8)', 'rgba(255, 209, 102, 0.8)'],
          borderRadius: 10
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: colors.text
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `Slutvärde: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: colors.muted
          },
          grid: {
            display: false
          },
          border: {
            display: false
          }
        },
        y: {
          ticks: {
            color: colors.muted,
            callback: function (value) {
              return `${Math.round(value / 1000)}k`;
            }
          },
          grid: {
            color: colors.grid
          },
          border: {
            display: false
          }
        }
      }
    }
  });
}

function calculateFeeComparisonProjection(startCapital, monthlySavings, annualReturn, years, annualFee) {
  const annualRate = annualReturn / 100;
  const feeRate = annualFee / 100;
  const effectiveAnnualRate = (1 + annualRate) * (1 - feeRate) - 1;
  const monthlyRate = Math.pow(1 + effectiveAnnualRate, 1 / 12) - 1;
  const months = years * 12;

  let futureValue = startCapital;

  if (months > 0) {
    futureValue = startCapital * Math.pow(1 + monthlyRate, months);

    if (monthlyRate !== 0) {
      futureValue += monthlySavings * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    } else {
      futureValue += monthlySavings * months;
    }
  }

  const totalInvested = startCapital + monthlySavings * months;
  const totalFees = 0;

  return {
    futureValue,
    totalInvested,
    totalFees,
    monthlyRate,
    effectiveAnnualRate
  };
}

function renderFeeComparisonChart() {
  const chartCanvas = document.getElementById('avgifterChart');
  if (!chartCanvas) {
    return;
  }

  if (feeComparisonChart) {
    feeComparisonChart.destroy();
  }

  const startCapital = Number(document.getElementById('avgifter-startkapital').value) || 0;
  const monthlySavings = Number(document.getElementById('avgifter-manadssparande').value) || 0;
  const annualReturn = Number(document.getElementById('avgifter-avkastning').value) || 0;
  const years = Number(document.getElementById('avgifter-ar').value) || 0;
  const feeA = Number(document.getElementById('avgifter-a').value) || 0;
  const feeB = Number(document.getElementById('avgifter-b').value) || 0;

  const labels = ['0'];
  const seriesA = [startCapital];
  const seriesB = [startCapital];

  const months = Math.max(1, years * 12);
  const annualRate = annualReturn / 100;
  const effectiveA = (1 + annualRate) * (1 - feeA / 100) - 1;
  const effectiveB = (1 + annualRate) * (1 - feeB / 100) - 1;
  const monthlyA = Math.pow(1 + effectiveA, 1 / 12) - 1;
  const monthlyB = Math.pow(1 + effectiveB, 1 / 12) - 1;

  let portfolioA = startCapital;
  let portfolioB = startCapital;

  for (let month = 1; month <= months; month += 1) {
    portfolioA = portfolioA * (1 + monthlyA) + monthlySavings;
    portfolioB = portfolioB * (1 + monthlyB) + monthlySavings;

    if (month % 12 === 0 || month === months) {
      labels.push(String(Math.floor(month / 12)));
      seriesA.push(portfolioA);
      seriesB.push(portfolioB);
    }
  }

  const colors = getChartColors();

  feeComparisonChart = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Investering A',
          data: seriesA,
          borderColor: colors.primary,
          backgroundColor: colors.primarySoft,
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
          tension: 0.35
        },
        {
          label: 'Investering B',
          data: seriesB,
          borderColor: colors.accent,
          backgroundColor: colors.accentSoft,
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
          tension: 0.35
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: colors.text,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            padding: 16
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'År',
            color: colors.muted
          },
          ticks: {
            color: colors.muted,
            maxTicksLimit: 8
          },
          grid: {
            color: colors.grid
          },
          border: {
            display: false
          }
        },
        y: {
          ticks: {
            color: colors.muted,
            callback: function (value) {
              return `${Math.round(value / 1000)}k`;
            }
          },
          grid: {
            color: colors.grid
          },
          border: {
            display: false
          }
        }
      }
    }
  });
}

function calculateFeeComparison() {
  if (!feeForm) {
    return false;
  }

  const startCapital = Number(document.getElementById('avgifter-startkapital').value);
  const monthlySavings = Number(document.getElementById('avgifter-manadssparande').value);
  const annualReturn = Number(document.getElementById('avgifter-avkastning').value);
  const years = Number(document.getElementById('avgifter-ar').value);
  const feeA = Number(document.getElementById('avgifter-a').value);
  const feeB = Number(document.getElementById('avgifter-b').value);

  if (!Number.isFinite(years) || years < 1 || startCapital < 0 || monthlySavings < 0 || annualReturn < 0 || feeA < 0 || feeB < 0) {
    return 'Ange giltiga värden (antal år måste vara minst 1).';
  }

  const withoutFeeA = calculateProjection(startCapital, monthlySavings, annualReturn, 0, years);
  const withoutFeeB = calculateProjection(startCapital, monthlySavings, annualReturn, 0, years);
  const withFeeA = calculateProjection(startCapital, monthlySavings, annualReturn, feeA, years);
  const withFeeB = calculateProjection(startCapital, monthlySavings, annualReturn, feeB, years);

  const totalFeeA = withoutFeeA.futureValue - withFeeA.futureValue;
  const totalFeeB = withoutFeeB.futureValue - withFeeB.futureValue;

  const difference = Math.abs(withFeeA.futureValue - withFeeB.futureValue);
  const aLower = withFeeA.futureValue < withFeeB.futureValue;
  const bLower = withFeeB.futureValue < withFeeA.futureValue;

  const differenceElement = document.getElementById('avgifter-skillnad');
  if (differenceElement) {
    if (feeA === feeB) {
      differenceElement.textContent = 'Ingen skillnad i slutvärde från avgifter';
    } else if (aLower) {
      differenceElement.textContent = `Investering A ger lägre slutvärde med ${formatCurrency(difference)} jämfört med investering B över ${years} år.`;
    } else if (bLower) {
      differenceElement.textContent = `Investering B ger lägre slutvärde med ${formatCurrency(difference)} jämfört med investering A över ${years} år.`;
    } else {
      differenceElement.textContent = 'Ingen skillnad i slutvärde från avgifter';
    }
  }

  document.getElementById('avgifter-a-slutvarde').textContent = formatCurrency(withFeeA.futureValue);
  document.getElementById('avgifter-b-slutvarde').textContent = formatCurrency(withFeeB.futureValue);
  document.getElementById('avgifter-a-kostnad').textContent = formatCurrency(totalFeeA);
  document.getElementById('avgifter-b-kostnad').textContent = formatCurrency(totalFeeB);

  renderFeeComparisonChart();
  return true;
}

function initFeeComparisonPage() {
  if (!feeForm) {
    return;
  }

  feeCalcState = new CalcState({
    id: 'fee',
    container: feeForm.closest('.calculator-card') || feeForm.parentElement,
    form: feeForm,
    onCalculate: calculateFeeComparison
  });
}

function getDividendInputs() {
  return {
    startCapital: Number(document.getElementById('dividend-startkapital').value) || 0,
    monthlySavings: Number(document.getElementById('dividend-manadssparande').value) || 0,
    annualReturn: Number(document.getElementById('dividend-avkastning').value) || 0,
    annualFee: Number(document.getElementById('dividend-avgift').value) || 0,
    dividendYield: Number(document.getElementById('dividend-direktavkastning').value) || 0,
    dividendGrowth: Number(document.getElementById('dividend-tillvaxt').value) || 0,
    annualInflation: Number(document.getElementById('dividend-inflation').value) || 0,
    years: Number(document.getElementById('dividend-ar').value) || 0,
    reinvestDividends: document.getElementById('dividend-aterinvestera').value === 'true'
  };
}

function calculateDividendProjection({
  startCapital,
  monthlySavings,
  annualReturn,
  annualFee,
  dividendYield,
  dividendGrowth,
  years,
  reinvestDividends
}) {
  const months = years * 12;
  const annualNetReturn = (1 + annualReturn / 100) * (1 - annualFee / 100) - 1;
  const monthlyGrowthRate = Math.pow(1 + annualNetReturn, 1 / 12) - 1;

  let portfolioValue = startCapital;
  let totalInvested = startCapital;
  let totalDividendsReceived = 0;
  let totalReinvested = 0;

  const labels = ['0'];
  const portfolioValues = [startCapital];
  const annualDividendValues = [startCapital * (dividendYield / 100)];
  const monthlyDividendValues = [startCapital * (dividendYield / 100) / 12];

  for (let month = 1; month <= months; month += 1) {
    portfolioValue *= 1 + monthlyGrowthRate;
    portfolioValue += monthlySavings;
    totalInvested += monthlySavings;

    const yearIndex = Math.floor((month - 1) / 12);
    const currentAnnualYield = (dividendYield / 100) * Math.pow(1 + dividendGrowth / 100, yearIndex);
    const annualDividend = portfolioValue * currentAnnualYield;
    const monthlyDividend = annualDividend / 12;

    if (reinvestDividends) {
      portfolioValue += monthlyDividend;
      totalReinvested += monthlyDividend;
    } else {
      totalDividendsReceived += monthlyDividend;
    }

    if (month % 12 === 0 || month === months) {
      labels.push(String(Math.floor(month / 12)));
      portfolioValues.push(portfolioValue);
      annualDividendValues.push(annualDividend);
      monthlyDividendValues.push(monthlyDividend);
    }
  }

  const finalYearIndex = Math.max(0, Math.floor((months - 1) / 12));
  const finalAnnualYield = (dividendYield / 100) * Math.pow(1 + dividendGrowth / 100, finalYearIndex);
  const finalAnnualDividend = portfolioValue * finalAnnualYield;
  const finalMonthlyDividend = finalAnnualDividend / 12;

  return {
    portfolioValue,
    annualDividend: finalAnnualDividend,
    monthlyDividend: finalMonthlyDividend,
    totalDividendsReceived,
    totalReinvested,
    totalInvested,
    labels,
    portfolioValues,
    annualDividendValues,
    monthlyDividendValues
  };
}

function updateDividendResultLabel() {
  const label = document.getElementById('dividend-result-label');
  const reinvestDividends = document.getElementById('dividend-aterinvestera').value === 'true';

  label.textContent = reinvestDividends ? 'Utdelning återinvesterad' : 'Utdelning utbetald';
}


function renderDividendChart() {
  const dividendCanvas = document.getElementById('dividendChart');
  const colors = getChartColors();

  if (!dividendCanvas) {
    return;
  }

  if (dividendChart) {
    dividendChart.destroy();
  }

  const inputs = getDividendInputs();
  const result = calculateDividendProjection(inputs);

  dividendChart = new Chart(dividendCanvas, {
    type: 'line',
    data: {
      labels: result.labels,
      datasets: [
        {
          label: 'Portföljvärde',
          data: result.portfolioValues,
          borderColor: colors.primary,
          backgroundColor: colors.primarySoft,
          borderWidth: 3,
          pointRadius: 0,
          fill: true,
          tension: 0.35,
          yAxisID: 'y'
        },
        {
          label: 'Årlig utdelning',
          data: result.annualDividendValues,
          borderColor: colors.accent,
          backgroundColor: colors.accentSoft,
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.35,
          yAxisID: 'y1'
        },
        {
          label: 'Månadsutdelning',
          data: result.monthlyDividendValues,
          borderColor: colors.warning,
          backgroundColor: 'rgba(255, 209, 102, 0.08)',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.35,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: colors.text,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            padding: 16
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.dataset.label;
              return `${label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'År',
            color: colors.muted
          },
          ticks: {
            color: colors.muted,
            maxTicksLimit: 8
          },
          grid: {
            color: colors.grid
          },
          border: {
            display: false
          }
        },
        y: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Portföljvärde',
            color: colors.muted
          },
          ticks: {
            color: colors.muted,
            callback: function (value) {
              return `${Math.round(value / 1000)}k`;
            }
          },
          grid: {
            color: colors.grid
          },
          border: {
            display: false
          }
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: {
            display: true,
            text: 'Utdelning',
            color: colors.muted
          },
          ticks: {
            color: colors.muted,
            callback: function (value) {
              return `${Math.round(value / 1000)}k`;
            }
          },
          grid: {
            drawOnChartArea: false
          },
          border: {
            display: false
          }
        }
      }
    }
  });
}

function calculateDividendInvestment() {
  const inputs = getDividendInputs();
  if (!Number.isFinite(inputs.years) || inputs.years < 1 || inputs.startCapital < 0 || inputs.monthlySavings < 0 || inputs.annualFee < 0 || inputs.annualInflation < 0 || inputs.dividendYield < 0 || inputs.dividendGrowth < 0) {
    return 'Ange giltiga värden i alla fält (antal år måste vara minst 1).';
  }

  const result = calculateDividendProjection(inputs);
  const reinvestDividends = document.getElementById('dividend-aterinvestera').value === 'true';

  updateDividendResultLabel();

  // Calculate inflation-adjusted value
  const inflationRate = inputs.annualInflation / 100;
  const realValue = result.portfolioValue / Math.pow(1 + inflationRate, inputs.years);

  // Show/hide the "Värde i dagens penningvärde" based on inflation
  const dividendDagensVardeBox = document.getElementById('dividend-dagens-varde-box');
  if (dividendDagensVardeBox) {
    dividendDagensVardeBox.classList.toggle('hidden', inputs.annualInflation === 0);
  }
  document.getElementById('dividend-dagens-varde').textContent = formatCurrency(realValue);

  // Calculate total fees paid
  let totalFees = 0;
  if (inputs.annualFee > 0) {
    // Calculate value without fees for comparison
    const inputsWithoutFees = { ...inputs, annualFee: 0 };
    const resultWithoutFees = calculateDividendProjection(inputsWithoutFees);
    totalFees = resultWithoutFees.portfolioValue - result.portfolioValue;
  }

  // Show/hide the "Avgifter totalt" based on fee amount
  const dividendAvgifterBox = document.getElementById('dividend-avgifter-totalt-box');
  if (dividendAvgifterBox) {
    dividendAvgifterBox.classList.toggle('hidden', inputs.annualFee === 0);
  }
  document.getElementById('dividend-avgifter-totalt').textContent = formatCurrency(totalFees);

  document.getElementById('dividend-portfoljvarde').textContent = formatCurrency(result.portfolioValue);
  document.getElementById('dividend-arlig-utdelning').textContent = formatCurrency(result.annualDividend);
  document.getElementById('dividend-manadsutdelning').textContent = formatCurrency(result.monthlyDividend);
  document.getElementById('dividend-mottagna').textContent = formatCurrency(reinvestDividends ? result.totalReinvested : result.totalDividendsReceived);
  document.getElementById('dividend-insatt-kapital').textContent = formatCurrency(result.totalInvested);

  renderDividendChart();
  renderScenarioComparison();
  return true;
}

function calculateInvestment() {
  const { startCapital, monthlySavings, annualReturn, annualFee, annualInflation, years } = getInputs();
  if (!Number.isFinite(years) || years < 1 || startCapital < 0 || monthlySavings < 0 || annualFee < 0 || annualInflation < 0) {
    return 'Ange giltiga värden i alla fält (antal år måste vara minst 1).';
  }

  const result = calculateProjection(startCapital, monthlySavings, annualReturn, annualFee, years);

  // Calculate real value (inflation-adjusted)
  const inflationRate = annualInflation / 100;
  const realValue = result.futureValue / Math.pow(1 + inflationRate, years);

  // Show/hide the "Värde i dagens penningvärde" based on inflation
  const dagensVardeBox = document.getElementById('dagens-varde-box');
  if (dagensVardeBox) {
    dagensVardeBox.classList.toggle('hidden', annualInflation === 0);
  }
  document.getElementById('dagens-varde').textContent = formatCurrency(realValue);

  // Calculate total fees paid
  let totalFees = 0;
  if (annualFee > 0) {
    // Calculate value without fees for comparison
    const resultWithoutFees = calculateProjection(startCapital, monthlySavings, annualReturn, 0, years);
    totalFees = resultWithoutFees.futureValue - result.futureValue;
  }

  // Show/hide the "Avgifter totalt" based on fee amount
  const avgifterBox = document.getElementById('avgifter-totalt-box');
  if (avgifterBox) {
    avgifterBox.classList.toggle('hidden', annualFee === 0);
  }
  document.getElementById('avgifter-totalt').textContent = formatCurrency(totalFees);

  document.getElementById('slutvarde').textContent = formatCurrency(result.futureValue);
  document.getElementById('insatt-kapital').textContent = formatCurrency(result.totalInvested);
  document.getElementById('avkastning-resultat').textContent = formatCurrency(result.earnings);

  renderChart();
  renderScenarioComparison();
  return true;
}

function formatPercent(value, digits = 1) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return `0${digits > 0 ? ',' : ''}${digits > 0 ? '0'.repeat(digits) : ''} %`;
  }
  return `${numericValue.toFixed(digits).replace('.', ',')} %`;
}

function formatYearsAndMonths(months) {
  if (!Number.isFinite(months) || months < 0) {
    return '—';
  }

  const totalMonths = Math.round(months);
  const years = Math.floor(totalMonths / 12);
  const remainderMonths = totalMonths % 12;

  if (totalMonths === 0) {
    return '0 mån';
  }

  if (years === 0) {
    return `${remainderMonths} mån`;
  }

  if (remainderMonths === 0) {
    return `${years} år`;
  }

  return `${years} år ${remainderMonths} mån`;
}

function formatAgeYears(ageYears) {
  if (!Number.isFinite(ageYears) || ageYears < 0) {
    return '—';
  }

  const years = Math.floor(ageYears);
  const totalMonths = Math.round((ageYears - years) * 12);
  const months = totalMonths === 12 ? 0 : totalMonths;
  const normalizedYears = totalMonths === 12 ? years + 1 : years;

  if (months === 0) {
    return `${normalizedYears} år`;
  }

  return `${normalizedYears} år ${months} mån`;
}

function calculateRealReturn(nominalReturn, inflationRate) {
  const nominalRate = Number.isFinite(nominalReturn) ? nominalReturn / 100 : 0;
  const inflation = Number.isFinite(inflationRate) ? inflationRate / 100 : 0;

  if (Math.abs(1 + inflation) < 1e-12) {
    return 0;
  }

  return ((1 + nominalRate) / (1 + inflation)) - 1;
}

function getFireInputs() {
  return {
    monthlyExpenses: Math.max(0, Number(document.getElementById('fire-monthly-expenses').value) || 0),
    currentCapital: Math.max(0, Number(document.getElementById('fire-current-capital').value) || 0),
    monthlySavings: Math.max(0, Number(document.getElementById('fire-monthly-savings').value) || 0),
    nominalReturn: Number(document.getElementById('fire-return').value) || 0,
    inflation: Number(document.getElementById('fire-inflation').value) || 0,
    withdrawalRate: Number(document.getElementById('fire-withdrawal-rate').value) || 0,
    currentAge: Math.max(0, Number(document.getElementById('fire-age').value) || 0)
  };
}

function simulateFire(inputs) {
  const monthlyExpenses = Math.max(0, Number(inputs.monthlyExpenses) || 0);
  const currentCapital = Math.max(0, Number(inputs.currentCapital) || 0);
  const monthlySavings = Math.max(0, Number(inputs.monthlySavings) || 0);
  const nominalReturn = Number.isFinite(inputs.nominalReturn) ? inputs.nominalReturn : 0;
  const inflation = Number.isFinite(inputs.inflation) ? inputs.inflation : 0;
  const withdrawalRate = Number.isFinite(inputs.withdrawalRate) ? inputs.withdrawalRate : 0;
  const currentAge = Number.isFinite(inputs.currentAge) ? inputs.currentAge : 0;

  const realAnnualReturn = calculateRealReturn(nominalReturn, inflation);
  const fireTarget = withdrawalRate > 0 ? (monthlyExpenses * 12) / (withdrawalRate / 100) : Number.POSITIVE_INFINITY;
  const monthlyRate = Number.isFinite(realAnnualReturn) ? Math.pow(1 + realAnnualReturn, 1 / 12) - 1 : 0;
  const maxMonths = 1200;

  const series = [{ month: 0, value: currentCapital }];
  let portfolio = currentCapital;
  let reached = false;
  let reachedMonth = 0;
  let reachedAge = currentAge;
  let finalValue = currentCapital;
  let fireStartValue = currentCapital;
  let unreachable = false;

  if (Number.isFinite(fireTarget) && fireTarget > 0) {
    if (currentCapital >= fireTarget) {
      reached = true;
      reachedMonth = 0;
      reachedAge = currentAge;
      fireStartValue = currentCapital;
    }

    for (let month = 1; month <= maxMonths; month += 1) {
      portfolio = portfolio * (1 + monthlyRate) + monthlySavings;
      series.push({ month, value: portfolio });
      finalValue = portfolio;

      if (!reached && portfolio >= fireTarget) {
        reached = true;
        reachedMonth = month;
        reachedAge = currentAge + month / 12;
        fireStartValue = portfolio;
      }
    }

    if (!reached && monthlyRate <= 0 && portfolio < fireTarget) {
      unreachable = true;
    }

    if (!reached && series.length >= maxMonths + 1) {
      unreachable = true;
    }
  } else if (withdrawalRate <= 0) {
    unreachable = true;
  }

  const alreadyAtFire = Number.isFinite(fireTarget) && currentCapital >= fireTarget;
  const progressPercent = Number.isFinite(fireTarget) && fireTarget > 0 ? Math.min(100, Math.max(0, (currentCapital / fireTarget) * 100)) : 0;
  const capitalRemaining = Number.isFinite(fireTarget) && fireTarget > currentCapital ? Math.max(0, fireTarget - currentCapital) : 0;

  return {
    monthlyExpenses,
    currentCapital,
    monthlySavings,
    nominalReturn,
    inflation,
    withdrawalRate,
    currentAge,
    realAnnualReturn,
    fireTarget,
    reached,
    alreadyAtFire,
    reachedMonth,
    reachedAge,
    finalValue,
    fireStartValue,
    progressPercent,
    capitalRemaining,
    unreachable,
    series,
    monthlyRate
  };
}

function buildFireChartSeries(simulation) {
  const values = simulation.series;
  const dataPoints = [];
  const labels = [];
  const maxYears = simulation.reached
    ? Math.max(10, Math.ceil(simulation.reachedMonth / 12) + 5)
    : Math.max(10, Math.ceil((values.length - 1) / 12));

  for (let year = 0; year <= maxYears; year += 1) {
    const monthIndex = year * 12;
    const point = values[Math.min(monthIndex, values.length - 1)];
    labels.push(String(year));
    dataPoints.push(point ? point.value : values[values.length - 1].value);
  }

  const targetLine = labels.map(() => Number.isFinite(simulation.fireTarget) ? simulation.fireTarget : 0);

  return { labels, dataPoints, targetLine };
}

function buildPostFireProjection(simulation) {
  if (!simulation || !Number.isFinite(simulation.fireTarget) || !simulation.reached) {
    return null;
  }

  const monthlyExpenses = Math.max(0, Number(simulation.monthlyExpenses) || 0);
  const fireStartValue = Number.isFinite(simulation.fireStartValue) ? simulation.fireStartValue : simulation.currentCapital;
  const realAnnualReturn = Number.isFinite(simulation.realAnnualReturn) ? simulation.realAnnualReturn : 0;
  const monthlyRate = Number.isFinite(realAnnualReturn) ? Math.pow(1 + realAnnualReturn, 1 / 12) - 1 : 0;
  const months = 30 * 12;
  const series = [{ month: 0, value: fireStartValue, withdrawal: 0 }];
  let portfolio = fireStartValue;

  for (let month = 1; month <= months; month += 1) {
    // Order used: first monthly real growth, then monthly real withdrawal.
    portfolio = portfolio * (1 + monthlyRate);
    const withdrawal = Math.min(Math.max(0, portfolio), monthlyExpenses);
    portfolio = Math.max(0, portfolio - withdrawal);
    series.push({ month, value: portfolio, withdrawal });
  }

  return { series, fireStartValue, monthlyExpenses, monthlyRate };
}

function buildPostFireChartSeries(simulation) {
  const postFireProjection = buildPostFireProjection(simulation);
  if (!postFireProjection) {
    return { labels: ['0'], dataPoints: [0], targetLine: [0] };
  }

  const labels = [];
  const dataPoints = [];
  const targetLine = [];
  const values = postFireProjection.series;

  for (let year = 0; year <= 30; year += 1) {
    const monthIndex = year * 12;
    const point = values[Math.min(monthIndex, values.length - 1)];
    labels.push(String(year));
    dataPoints.push(point ? Math.max(0, Number(point.value) || 0) : 0);
    targetLine.push(Number.isFinite(simulation.fireTarget) ? simulation.fireTarget : 0);
  }

  return { labels, dataPoints, targetLine };
}

function getPostFireStatus(projection) {
  const finalPoint = projection.series[projection.series.length - 1];
  const finalValue = Math.max(0, Number(finalPoint?.value) || 0);
  const depletionMonth = projection.series.findIndex((point) => Number(point.value) <= 0 && point.month > 0);

  if (depletionMonth >= 0) {
    return {
      type: 'depleted',
      title: 'Kapitalet tar slut',
      text: `Med dessa antaganden tar kapitalet slut efter cirka ${formatYearsAndMonths(depletionMonth)}.`,
      finalValue,
      depletionMonth
    };
  }

  if (finalValue > projection.fireStartValue) {
    return {
      type: 'grows',
      title: 'Kapitalet växer',
      text: 'Med dessa antaganden är portföljvärdet högre efter 30 år trots uttagen.',
      finalValue,
      depletionMonth: -1
    };
  }

  return {
    type: 'declines',
    title: 'Kapitalet minskar',
    text: 'Portföljen finns kvar efter 30 år, men kapitalet är lägre än när FIRE började.',
    finalValue,
    depletionMonth: -1
  };
}

function formatDepletionTime(totalMonths) {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years === 0) {
    return `${months} ${months === 1 ? 'månad' : 'månader'}`;
  }

  if (months === 0) {
    return `${years} år`;
  }

  return `${years} år ${months} ${months === 1 ? 'månad' : 'månader'}`;
}

function updateFirePostFireCallout(simulation) {
  const callout = document.getElementById('fire-post-fire-callout');
  const message = document.getElementById('fire-post-fire-message');
  if (!callout || !message) {
    return;
  }

  const projection = buildPostFireProjection(simulation);
  if (!projection) {
    callout.hidden = true;
    return;
  }

  const status = getPostFireStatus(projection);
  callout.classList.remove('is-growing', 'is-declining', 'is-depleted');
  callout.classList.add(`is-${status.type === 'grows' ? 'growing' : status.type === 'declines' ? 'declining' : 'depleted'}`);

  if (status.type === 'grows') {
    message.textContent = 'Efter FIRE: Kapitalet fortsätter växa med dessa antaganden.';
  } else if (status.type === 'declines') {
    message.textContent = 'Observera: Du når ditt beräknade FIRE-mål, men kapitalet minskar efter FIRE.';
  } else {
    message.textContent = `Observera: Du når ditt beräknade FIRE-mål, men med dessa antaganden tar kapitalet slut efter cirka ${formatDepletionTime(status.depletionMonth)}.`;
  }

  callout.hidden = false;
}

function updateFireChartSummary(simulation) {
  const summaryEl = document.getElementById('fire-chart-summary');
  const noteEl = document.getElementById('fire-chart-note');
  if (!summaryEl || !noteEl) {
    return;
  }

  const currentView = document.querySelector('.chart-view-tab.is-active')?.dataset.fireChartView || 'path';
  if (currentView !== 'post-fire') {
    summaryEl.hidden = true;
    noteEl.hidden = true;
    return;
  }

  if (!simulation || !Number.isFinite(simulation.fireTarget) || !simulation.reached) {
    summaryEl.innerHTML = '<strong>Efter FIRE</strong><br>FIRE-målet är ännu inte nått med dessa antaganden.';
    summaryEl.hidden = false;
    noteEl.hidden = false;
    return;
  }

  const projection = buildPostFireProjection(simulation);
  if (!projection) {
    summaryEl.innerHTML = '<strong>Efter FIRE</strong><br>FIRE-målet är ännu inte nått med dessa antaganden.';
    summaryEl.hidden = false;
    noteEl.hidden = false;
    return;
  }

  const postFireStatus = getPostFireStatus(projection);
  const finalValue = postFireStatus.finalValue;
  const totalWithdrawn = projection.series.reduce((sum, point) => sum + (Number(point.withdrawal) || 0), 0);
  const differencePct = projection.fireStartValue > 0 ? ((finalValue - projection.fireStartValue) / projection.fireStartValue) * 100 : 0;
  const highWithdrawalDepletion = postFireStatus.type === 'depleted' && simulation.withdrawalRate >= 5;
  const horizonValue = postFireStatus.type === 'depleted'
    ? `Slut efter: ${formatYearsAndMonths(postFireStatus.depletionMonth)}`
    : `Efter 30 år: ${formatCurrency(finalValue)}`;

  summaryEl.innerHTML = `
    <div class="fire-post-fire-status"><strong>Status: ${postFireStatus.title}</strong><span>${postFireStatus.text}</span></div>
    <div>${horizonValue}</div>
    <div>Totalt uttaget: ${formatCurrency(totalWithdrawn)}</div>
    <div>Skillnad från FIRE-start: ${differencePct >= 0 ? '+' : ''}${differencePct.toFixed(1).replace('.', ',')} %</div>
    ${highWithdrawalDepletion ? '<p class="fire-chart-warning">Den valda uttagsnivån ger ett lägre FIRE-tal, men prognosen visar att kapitalet inte räcker hela 30-årsperioden.</p>' : ''}
  `;
  summaryEl.hidden = false;
  noteEl.hidden = false;
}

function renderFireChart(simulation) {
  const canvas = document.getElementById('fireChart');
  if (!canvas) {
    return;
  }

  if (window.fireChartInstance) {
    window.fireChartInstance.destroy();
  }

  const colors = getChartColors();
  const chartView = document.querySelector('.chart-view-tab.is-active')?.dataset.fireChartView || 'path';
  const isPostFire = chartView === 'post-fire';

  const { labels, dataPoints, targetLine } = isPostFire ? buildPostFireChartSeries(simulation) : buildFireChartSeries(simulation);
  const primaryLabel = isPostFire ? 'Portfölj efter uttag' : 'Portföljvärde';
  const xAxisTitle = isPostFire ? 'År efter FIRE' : 'År från nu';
  const yAxisTitle = 'Kapital i dagens kronor';

  window.fireChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: primaryLabel,
          data: dataPoints,
          borderColor: colors.primary,
          backgroundColor: colors.primarySoft,
          borderWidth: 3,
          pointRadius: 0,
          fill: true,
          tension: 0.35
        },
        {
          label: 'FIRE-target',
          data: targetLine,
          borderColor: colors.accent,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [7, 7],
          pointRadius: 0,
          fill: false,
          tension: 0
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: colors.text,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            padding: 16
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: xAxisTitle,
            color: colors.muted
          },
          ticks: {
            color: colors.muted,
            maxTicksLimit: 8
          },
          grid: {
            color: colors.grid
          },
          border: {
            display: false
          }
        },
        y: {
          title: {
            display: true,
            text: yAxisTitle,
            color: colors.muted
          },
          ticks: {
            color: colors.muted,
            callback: function (value) {
              return `${Math.round(value / 1000)}k`;
            }
          },
          grid: {
            color: colors.grid
          },
          border: {
            display: false
          }
        }
      }
    }
  });

  updateFireChartSummary(simulation);
}

function updateFireResults(simulation) {
  const fireTargetResult = document.getElementById('fire-target-result');
  const fireTimeResult = document.getElementById('fire-time-result');
  const fireAgeResult = document.getElementById('fire-age-result');
  const fireProgressCurrent = document.getElementById('fire-progress-current');
  const fireProgressTarget = document.getElementById('fire-progress-target');
  const fireProgressPercent = document.getElementById('fire-progress-percent');
  const fireProgressBar = document.getElementById('fire-progress-bar');
  const fireCapitalRemaining = document.getElementById('fire-kapital-kvar');
  const fireRealReturn = document.getElementById('fire-real-avkastning');
  const fireStatus = document.getElementById('fire-status');
  const fireSummary = document.getElementById('fire-summary');

  if (fireTargetResult) {
    fireTargetResult.textContent = Number.isFinite(simulation.fireTarget) ? formatCurrency(simulation.fireTarget) : 'Ej beräknat';
  }

  if (fireTimeResult) {
    if (simulation.reached && simulation.reachedMonth === 0) {
      fireTimeResult.textContent = 'Redan nått';
    } else if (simulation.unreachable || !Number.isFinite(simulation.fireTarget)) {
      fireTimeResult.textContent = 'Över 100 år';
    } else {
      fireTimeResult.textContent = formatYearsAndMonths(simulation.reachedMonth);
    }
  }

  if (fireAgeResult) {
    if (simulation.reached && simulation.reachedMonth === 0) {
      fireAgeResult.textContent = 'Nu';
    } else if (simulation.unreachable || !Number.isFinite(simulation.fireTarget)) {
      fireAgeResult.textContent = '—';
    } else if (simulation.currentAge > 0) {
      fireAgeResult.textContent = formatAgeYears(simulation.currentAge + simulation.reachedMonth / 12);
    } else {
      fireAgeResult.textContent = '—';
    }
  }

  if (fireProgressCurrent) {
    fireProgressCurrent.textContent = formatCurrency(simulation.currentCapital);
  }

  if (fireProgressTarget) {
    fireProgressTarget.textContent = Number.isFinite(simulation.fireTarget) ? formatCurrency(simulation.fireTarget) : '—';
  }

  if (fireProgressPercent) {
    const percent = simulation.progressPercent;
    fireProgressPercent.textContent = `${percent.toFixed(1).replace('.', ',')} %`;
  }

  if (fireProgressBar) {
    const percent = simulation.progressPercent;
    fireProgressBar.style.width = `${percent}%`;
  }

  if (fireCapitalRemaining) {
    if (simulation.alreadyAtFire) {
      fireCapitalRemaining.textContent = '0 kr';
    } else if (Number.isFinite(simulation.fireTarget)) {
      fireCapitalRemaining.textContent = formatCurrency(simulation.capitalRemaining);
    } else {
      fireCapitalRemaining.textContent = '—';
    }
  }

  if (fireRealReturn) {
    fireRealReturn.textContent = formatPercent(simulation.realAnnualReturn * 100, 1);
  }

  if (fireStatus) {
    if (simulation.alreadyAtFire) {
      fireStatus.textContent = 'Du har nått ditt beräknade FIRE-mål.';
    } else if (simulation.unreachable) {
      fireStatus.textContent = 'Det ser inte ut som att målet kan nås med dessa antaganden inom 100 år.';
    } else if (Number.isFinite(simulation.fireTarget)) {
      fireStatus.textContent = `${formatCurrency(simulation.capitalRemaining)} kvar till FIRE.`;
    } else {
      fireStatus.textContent = 'Uttagsnivån måste vara större än 0 för att ett FIRE-tal ska kunna beräknas.';
    }
  }

  if (fireSummary) {
    const spendingText = `${formatCurrency(simulation.monthlyExpenses)} i månadsutgifter`;
    const impactText = `${formatPercent(simulation.nominalReturn, 1)} nominell avkastning och ${formatPercent(simulation.inflation, 1)} inflation`;

    const fireTargetText = Number.isFinite(simulation.fireTarget) ? formatCurrency(simulation.fireTarget) : 'ett odefinierat FIRE-tal';

    if (simulation.alreadyAtFire) {
      fireSummary.textContent = `Med ${spendingText} behöver du cirka ${fireTargetText} för att nå ditt FIRE-mål vid en uttagsnivå på ${simulation.withdrawalRate.toFixed(1).replace('.', ',')} %. Du har idag ${formatCurrency(simulation.currentCapital)} investerat och sparar ${formatCurrency(simulation.monthlySavings)} per månad. Med ${impactText} motsvarar det cirka ${formatPercent(simulation.realAnnualReturn * 100, 1)} real avkastning. Med dessa antaganden har du redan nått ditt beräknade FIRE-mål.`;
    } else if (simulation.unreachable) {
      fireSummary.textContent = `Med ${spendingText} behöver du cirka ${fireTargetText} för att nå ditt FIRE-mål vid en uttagsnivå på ${simulation.withdrawalRate.toFixed(1).replace('.', ',')} %. Du har idag ${formatCurrency(simulation.currentCapital)} investerat och sparar ${formatCurrency(simulation.monthlySavings)} per månad. Med ${impactText} motsvarar det cirka ${formatPercent(simulation.realAnnualReturn * 100, 1)} real avkastning. Med dessa antaganden beräknas det inte vara möjligt att nå målet inom 100 år.`;
    } else {
      const timeText = simulation.reachedMonth > 0 ? `om cirka ${formatYearsAndMonths(simulation.reachedMonth)}` : 'om cirka 0 mån';
      const ageText = simulation.currentAge > 0 ? ` Det motsvarar ungefär ${formatAgeYears(simulation.currentAge + simulation.reachedMonth / 12)}.` : '';
      fireSummary.textContent = `Med ${spendingText} behöver du cirka ${fireTargetText} för att nå ditt FIRE-mål vid en uttagsnivå på ${simulation.withdrawalRate.toFixed(1).replace('.', ',')} %. Du har idag ${formatCurrency(simulation.currentCapital)} investerat och sparar ${formatCurrency(simulation.monthlySavings)} per månad. Med ${impactText} motsvarar det cirka ${formatPercent(simulation.realAnnualReturn * 100, 1)} real avkastning. Med dessa antaganden når du målet ${timeText}.${ageText}`;
    }
  }

  updateFirePostFireCallout(simulation);
}

function getFireGoalInputs() {
  return {
    monthlyExpenses: Math.max(0, Number(document.getElementById('fire-goal-monthly-expenses')?.value) || 0),
    currentCapital: Math.max(0, Number(document.getElementById('fire-goal-current-capital')?.value) || 0),
    currentAge: Math.max(0, Number(document.getElementById('fire-goal-current-age')?.value) || 0),
    desiredAge: Math.max(0, Number(document.getElementById('fire-goal-age')?.value) || 0),
    nominalReturn: Number(document.getElementById('fire-goal-return')?.value) || 0,
    inflation: Number(document.getElementById('fire-goal-inflation')?.value) || 0,
    withdrawalRate: Number(document.getElementById('fire-goal-withdrawal-rate')?.value) || 0
  };
}

function simulateFireGoal(inputs) {
  const yearsToGoal = inputs.desiredAge - inputs.currentAge;
  const monthsToGoal = yearsToGoal * 12;
  const realAnnualReturn = calculateRealReturn(inputs.nominalReturn, inputs.inflation);
  const monthlyRate = Math.pow(Math.max(0, 1 + realAnnualReturn), 1 / 12) - 1;
  const fireTarget = inputs.withdrawalRate > 0 ? (inputs.monthlyExpenses * 12) / (inputs.withdrawalRate / 100) : Number.POSITIVE_INFINITY;

  if (inputs.desiredAge <= inputs.currentAge) return { valid: false, message: 'Önskad FIRE-ålder måste vara högre än nuvarande ålder.' };
  if (inputs.withdrawalRate <= 0 || !Number.isFinite(fireTarget)) return { valid: false, message: 'Uttagsnivån måste vara större än 0 för att FIRE-målet ska kunna beräknas.' };

  const futureValueCurrentCapital = inputs.currentCapital * Math.pow(1 + monthlyRate, monthsToGoal);
  const growthFactor = monthlyRate === 0 ? monthsToGoal : (Math.pow(1 + monthlyRate, monthsToGoal) - 1) / monthlyRate;
  const requiredMonthlyContribution = Math.max(0, (fireTarget - futureValueCurrentCapital) / growthFactor);
  const series = [{ month: 0, value: inputs.currentCapital }];
  let portfolio = inputs.currentCapital;
  for (let month = 1; month <= monthsToGoal; month += 1) {
    portfolio = portfolio * (1 + monthlyRate) + requiredMonthlyContribution;
    series.push({ month, value: Math.max(0, portfolio) });
  }
  return { valid: true, ...inputs, yearsToGoal, monthsToGoal, realAnnualReturn, fireTarget, requiredMonthlyContribution, series };
}

function renderFireGoalChart(simulation) {
  const canvas = document.getElementById('fireGoalChart');
  if (!canvas || !simulation?.valid || typeof Chart === 'undefined') return;
  fireGoalChart?.destroy();
  const colors = getChartColors();
  const sampled = simulation.series.filter((point) => point.month % 12 === 0 || point.month === simulation.monthsToGoal);
  fireGoalChart = new Chart(canvas, {
    type: 'line',
    data: { labels: sampled.map((point) => String(Math.round(point.month / 12))), datasets: [
      { label: 'Portföljvärde', data: sampled.map((point) => point.value), borderColor: colors.primary, backgroundColor: colors.primarySoft, borderWidth: 3, pointRadius: 0, fill: true, tension: 0.35 },
      { label: 'FIRE-tal', data: sampled.map(() => simulation.fireTarget), borderColor: colors.accent, borderDash: [7, 7], borderWidth: 2, pointRadius: 0, fill: false }
    ] },
    options: { maintainAspectRatio: false, responsive: true, interaction: { mode: 'nearest', intersect: false }, plugins: { legend: { labels: { color: colors.text, usePointStyle: true, pointStyle: 'circle', boxWidth: 8 } }, tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}` } } }, scales: { x: { title: { display: true, text: 'År från nu', color: colors.muted }, ticks: { color: colors.muted, maxTicksLimit: 8 }, grid: { color: colors.grid } }, y: { title: { display: true, text: 'Kapital i dagens kronor', color: colors.muted }, ticks: { color: colors.muted, callback: (value) => `${Math.round(value / 1000)}k` }, grid: { color: colors.grid } } } }
  });
}

function calculateFireGoal() {
  const inputs = getFireGoalInputs();
  if (inputs.monthlyExpenses <= 0 || inputs.withdrawalRate <= 0 || !Number.isFinite(inputs.monthlyExpenses) || !Number.isFinite(inputs.withdrawalRate)) {
    return 'Månadsutgifter och uttagsnivå måste vara större än 0.';
  }
  const simulation = simulateFireGoal(inputs);
  window.latestFireGoalCalculation = simulation;
  const status = document.getElementById('fire-goal-status');
  if (!simulation.valid) {
    if (status) status.textContent = simulation.message;
    return simulation.message || 'Angivna värden är ogiltiga.';
  }
  document.getElementById('fire-goal-savings-result').textContent = `${formatCurrency(simulation.requiredMonthlyContribution)}/mån`;
  document.getElementById('fire-goal-target-result').textContent = formatCurrency(simulation.fireTarget);
  document.getElementById('fire-goal-time-result').textContent = formatYearsAndMonths(simulation.monthsToGoal);
  document.getElementById('fire-goal-age-result').textContent = `${simulation.desiredAge} år`;
  document.getElementById('fire-goal-capital-result').textContent = formatCurrency(simulation.currentCapital);
  document.getElementById('fire-goal-real-return-result').textContent = formatPercent(simulation.realAnnualReturn * 100, 1);
  if (status) status.textContent = simulation.requiredMonthlyContribution === 0
    ? `Med dina antaganden behöver du inte sätta in mer kapital för att nå ditt FIRE-mål vid ${simulation.desiredAge}.`
    : `För att nå ${formatCurrency(simulation.fireTarget)} vid ${simulation.desiredAge} års ålder krävs cirka ${formatCurrency(simulation.requiredMonthlyContribution)} per månad.`;
  renderFireGoalChart(simulation);
  return true;
}

function getFireWithdrawalInputs() {
  return {
    startCapital: Math.max(0, Number(document.getElementById('fire-withdrawal-capital')?.value) || 0),
    monthlyWithdrawal: Math.max(0, Number(document.getElementById('fire-withdrawal-amount')?.value) || 0),
    nominalReturn: Number(document.getElementById('fire-withdrawal-return')?.value) || 0,
    inflation: Math.max(0, Number(document.getElementById('fire-withdrawal-inflation')?.value) || 0),
    annualFee: Math.max(0, Number(document.getElementById('fire-withdrawal-fee')?.value) || 0),
    inflationLinked: document.getElementById('fire-withdrawal-inflation-linked')?.value === 'yes'
  };
}

function simulateFireWithdrawal(inputs) {
  const annualReturnAfterFee = (1 + inputs.nominalReturn / 100) * (1 - inputs.annualFee / 100) - 1;
  const monthlyReturn = Math.pow(Math.max(0, 1 + annualReturnAfterFee), 1 / 12) - 1;
  const monthlyInflation = Math.pow(1 + inputs.inflation / 100, 1 / 12) - 1;
  const maxMonths = 1200;
  const series = [{ month: 0, value: inputs.startCapital, withdrawal: 0 }];
  let portfolio = inputs.startCapital;
  let totalWithdrawn = 0;
  let depletionMonth = null;
  for (let month = 1; month <= maxMonths; month += 1) {
    portfolio *= 1 + monthlyReturn;
    const plannedWithdrawal = inputs.monthlyWithdrawal * (inputs.inflationLinked ? Math.pow(1 + monthlyInflation, month) : 1);
    const actualWithdrawal = Math.min(Math.max(0, portfolio), plannedWithdrawal);
    portfolio = Math.max(0, portfolio - actualWithdrawal);
    totalWithdrawn += actualWithdrawal;
    series.push({ month, value: portfolio, withdrawal: actualWithdrawal });
    if (portfolio <= 0) { depletionMonth = month; break; }
  }
  return { ...inputs, annualReturnAfterFee, monthlyReturn, monthlyInflation, series, totalWithdrawn, depletionMonth, survivedHorizon: depletionMonth === null };
}

function renderFireWithdrawalChart(simulation) {
  const canvas = document.getElementById('fireWithdrawalChart');
  if (!canvas || typeof Chart === 'undefined') return;
  fireWithdrawalChart?.destroy();
  const colors = getChartColors();
  const sampled = simulation.series.filter((point) => point.month % 12 === 0 || point.month === simulation.series[simulation.series.length - 1].month);
  fireWithdrawalChart = new Chart(canvas, {
    type: 'line',
    data: { labels: sampled.map((point) => String(Math.round(point.month / 12))), datasets: [{ label: 'Portföljvärde', data: sampled.map((point) => point.value), borderColor: colors.primary, backgroundColor: colors.primarySoft, borderWidth: 3, pointRadius: 0, fill: true, tension: 0.35 }] },
    options: { maintainAspectRatio: false, responsive: true, interaction: { mode: 'nearest', intersect: false }, plugins: { legend: { labels: { color: colors.text, usePointStyle: true, pointStyle: 'circle', boxWidth: 8 } }, tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}` } } }, scales: { x: { title: { display: true, text: 'År', color: colors.muted }, ticks: { color: colors.muted, maxTicksLimit: 8 }, grid: { color: colors.grid } }, y: { title: { display: true, text: 'Portföljvärde', color: colors.muted }, ticks: { color: colors.muted, callback: (value) => `${Math.round(value / 1000)}k` }, grid: { color: colors.grid } } } }
  });
}

function calculateFireWithdrawal() {
  const inputs = getFireWithdrawalInputs();
  if (inputs.startCapital <= 0 || inputs.monthlyWithdrawal <= 0 || !Number.isFinite(inputs.startCapital) || !Number.isFinite(inputs.monthlyWithdrawal)) {
    return 'Portföljvärde och månadsutgifter måste vara större än 0.';
  }
  const simulation = simulateFireWithdrawal(inputs);
  window.latestFireWithdrawalCalculation = simulation;
  const finalPoint = simulation.series[simulation.series.length - 1];
  document.getElementById('fire-withdrawal-duration-result').textContent = simulation.survivedHorizon ? '100+ år' : formatYearsAndMonths(simulation.depletionMonth);
  document.getElementById('fire-withdrawal-start-result').textContent = formatCurrency(simulation.startCapital);
  document.getElementById('fire-withdrawal-monthly-result').textContent = `${formatCurrency(simulation.monthlyWithdrawal)}/mån`;
  document.getElementById('fire-withdrawal-first-year-result').textContent = formatCurrency(simulation.series.slice(1, 13).reduce((sum, point) => sum + point.withdrawal, 0));
  document.getElementById('fire-withdrawal-total-result').textContent = formatCurrency(simulation.totalWithdrawn);
  document.getElementById('fire-withdrawal-net-return-result').textContent = formatPercent(simulation.annualReturnAfterFee * 100, 2);
  document.getElementById('fire-withdrawal-final-result').textContent = formatCurrency(finalPoint.value);
  const point10 = simulation.series.find((point) => point.month === 120);
  const point30 = simulation.series.find((point) => point.month === 360);
  document.getElementById('fire-withdrawal-10-result-box').hidden = !point10;
  document.getElementById('fire-withdrawal-30-result-box').hidden = !point30;
  document.getElementById('fire-withdrawal-10-result').textContent = point10 ? formatCurrency(point10.value) : '—';
  document.getElementById('fire-withdrawal-30-result').textContent = point30 ? formatCurrency(point30.value) : '—';
  document.getElementById('fire-withdrawal-status').textContent = simulation.survivedHorizon
    ? 'Med dessa antaganden täcks uttagen av kapitalets utveckling tillräckligt väl för att portföljen inte ska ta slut inom den 100-åriga beräkningsperioden.'
    : `Med dessa antaganden minskar kapitalet över tid och beräknas ta slut efter cirka ${formatYearsAndMonths(simulation.depletionMonth)}.`;
  renderFireWithdrawalChart(simulation);
  return true;
}

function calculateFireProjection() {
  const inputs = getFireInputs();
  if (inputs.monthlyExpenses <= 0 || inputs.withdrawalRate <= 0 || !Number.isFinite(inputs.monthlyExpenses) || !Number.isFinite(inputs.withdrawalRate)) {
    return 'Månadsutgifter och uttagsnivå måste vara större än 0.';
  }
  const simulation = simulateFire(inputs);
  window.latestFireSimulation = simulation;
  updateFireResults(simulation);
  renderFireChart(simulation);
  return true;
}

function setFireChartView(view) {
  const tabButtons = document.querySelectorAll('.chart-view-tab');
  if (!tabButtons.length) {
    return;
  }

  const selectedView = view === 'post-fire' ? 'post-fire' : 'path';
  tabButtons.forEach((button) => {
    const isSelected = button.dataset.fireChartView === selectedView;
    button.classList.toggle('is-active', isSelected);
    button.setAttribute('aria-selected', String(isSelected));
  });

  if (window.latestFireSimulation) {
    renderFireChart(window.latestFireSimulation);
  }
}

function showPostFireProjection() {
  setFireChartView('post-fire');

  const chartPanel = document.querySelector('.chart-panel');
  if (!chartPanel) {
    return;
  }

  const bounds = chartPanel.getBoundingClientRect();
  if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
    chartPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light-theme', isLight);
  document.body.classList.toggle('dark-theme', !isLight);

  // Update tooltip and aria-label based on NEXT theme (what will happen on click)
  const nextTheme = isLight ? 'dark' : 'light';
  const tooltipText = nextTheme === 'light' ? 'Växla till ljust läge' : 'Växla till mörkt läge';

  [themeToggle, document.getElementById('mobileThemeToggle')].forEach((toggleBtn) => {
    if (toggleBtn) {
      toggleBtn.setAttribute('title', tooltipText);
      toggleBtn.setAttribute('aria-label', tooltipText);
    }
  });
}

function initTheme() {
  if (!themeToggle) {
    return;
  }

  const savedTheme = localStorage.getItem('investment-theme');
  const preferredTheme = savedTheme || 'dark';
  applyTheme(preferredTheme);
}

function injectInstagramPromo() {
  if (document.getElementById('site-instagram-promo')) {
    return;
  }

  const promo = document.createElement('section');
  promo.id = 'site-instagram-promo';
  promo.className = 'instagram-footer';
  promo.innerHTML = `
    <div class="instagram-footer-inner">
      <div class="instagram-footer-copy">
        <h3>Följ min resa från <span class="brand-zero">NOLL</span> <span class="brand-neutral">TILL</span> <span class="brand-million">MILJONER</span>.</h3>
        <p>Jag delar investeringar, idéer, analyser och resan längs vägen.</p>
      </div>
      <div class="community-actions">
        <a href="https://www.instagram.com/ingencopycat/" class="secondary-btn" target="_blank" rel="noopener noreferrer">Följ på Instagram</a>
      </div>
    </div>
  `;

  const main = document.querySelector('main');
  if (main) {
    main.insertAdjacentElement('afterend', promo);
  } else {
    document.body.appendChild(promo);
  }
}

const NTM_TODAY_MESSAGE_POOLS = {
  morning: [
    'Här är läget inför dagen.',
    'Vad händer på marknaden idag?',
    'Dagens marknad på 30 sekunder.'
  ],
  day: [
    'Så här ser marknaden ut just nu.',
    'En snabb koll innan dagen är slut.',
    'Det viktigaste att hålla koll på idag.'
  ],
  evening: [
    'Så här ser marknaden ut just nu.',
    'En snabb koll innan dagen är slut.',
    'Läget just nu innan du går vidare.'
  ],
  night: [
    'Marknaden sover. Du tydligen inte.',
    'Midnight research? Vi dömer inte.',
    'Aldrig för sent att kika på sparandet.'
  ],
  weekend: [
    'Börsen är stängd. Det är okej att ta en paus ibland.',
    'Ingen öppningsklocka idag. Perfekt läge att zooma ut.',
    'Marknaden tar helg. Graferna finns kvar på måndag.'
  ]
};

function safeSessionStorageGet(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeSessionStorageSet(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage restrictions in private browsing or restricted contexts.
  }
}

function getTimeSegment(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 23) return 'evening';
  return 'night';
}

function pickSessionMessage(date = new Date()) {
  const segment = getTimeSegment(date);
  const weekend = [0, 6].includes(date.getDay());
  const pool = weekend ? NTM_TODAY_MESSAGE_POOLS.weekend : NTM_TODAY_MESSAGE_POOLS[segment] || NTM_TODAY_MESSAGE_POOLS.day;
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const key = `ntm-greeting-${dateKey}-${segment}`;
  const existing = safeSessionStorageGet(key);
  if (existing) {
    return existing;
  }

  const index = Math.abs(date.getHours() + date.getMinutes() + date.getDate()) % pool.length;
  const message = pool[index];
  safeSessionStorageSet(key, message);
  return message;
}

function updateGreeting() {
  const heading = document.getElementById('ntm-today-heading');
  const context = document.getElementById('ntmGreetingContext');
  if (!heading || !context) {
    return;
  }

  const now = getNtmNow();
  const hour = now.getHours();

  let greeting = 'God dag';
  if (hour >= 5 && hour < 11) greeting = 'God morgon';
  else if (hour >= 11 && hour < 17) greeting = 'God dag';
  else if (hour >= 17 && hour < 23) greeting = 'God kväll';
  else greeting = 'Nattuggla?';

  heading.textContent = greeting;
  context.textContent = pickSessionMessage(now);
}

function getZonedDateParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const values = {};
  formatter.formatToParts(date).forEach((part) => {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  });

  return values;
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  const utcValue = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  const zoneValue = new Date(date.toLocaleString('en-US', { timeZone })).getTime();
  return (zoneValue - utcValue) / 60000;
}

function buildExchangeDate(date, timeZone, timeString) {
  const parts = getZonedDateParts(date, timeZone);
  const [hours, minutes] = timeString.split(':').map(Number);
  const utcValue = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hours, minutes, 0);
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(utcValue), timeZone);
  return new Date(utcValue - offsetMinutes * 60000);
}

function getDateKeyInZone(date, timeZone) {
  const parts = getZonedDateParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getNtmPreviewDateKey() {
  const value = new URLSearchParams(window.location.search).get('ntmDate');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const calendarCheck = new Date(Date.UTC(year, month - 1, day));
  if (calendarCheck.getUTCFullYear() !== year || calendarCheck.getUTCMonth() !== month - 1 || calendarCheck.getUTCDate() !== day) {
    return null;
  }

  return value;
}

function getNtmNow() {
  const previewDateKey = getNtmPreviewDateKey();
  if (!previewDateKey) {
    return new Date();
  }

  const [year, month, day] = previewDateKey.split('-').map(Number);
  const localNoonAsUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const offsetMinutes = getTimeZoneOffsetMinutes(localNoonAsUtc, NTM_DISPLAY_TIMEZONE);
  return new Date(localNoonAsUtc.getTime() - offsetMinutes * 60000);
}

function formatClockDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return 'nu';
  }

  const totalMinutes = Math.ceil(milliseconds / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  if (days > 0) {
    const dayLabel = days === 1 ? '1 dag' : `${days} dagar`;
    return `${dayLabel} ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function getMarketCalendar(exchangeKey) {
  return window.NTM_MARKET_CALENDAR && window.NTM_MARKET_CALENDAR[exchangeKey] ? window.NTM_MARKET_CALENDAR[exchangeKey] : null;
}

function getDaySchedule(exchangeKey, dateKey, dayOfWeek, calendar) {
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { isTradingDay: false, isClosed: true, reason: 'weekend' };
  }

  const [yearStr] = dateKey.split('-');
  const year = Number(yearStr);
  const yearData = calendar.years && calendar.years[year];

  if (!yearData) {
    return {
      isTradingDay: null,
      isUnknownYear: true,
      openTimeStr: calendar.regularOpen,
      closeTimeStr: calendar.regularClose
    };
  }

  const isClosed = Array.isArray(yearData.closed) && yearData.closed.includes(dateKey);
  if (isClosed) {
    return { isTradingDay: false, isClosed: true, reason: 'holiday' };
  }

  const isHalfDay = Array.isArray(yearData.halfDays) && yearData.halfDays.includes(dateKey);
  const closeTimeStr = isHalfDay && calendar.halfDayClose ? calendar.halfDayClose : calendar.regularClose;

  return {
    isTradingDay: true,
    isClosed: false,
    isHalfDay,
    openTimeStr: calendar.regularOpen,
    closeTimeStr
  };
}

function getNextTradingDay(exchangeKey, startDate, calendar) {
  const timezone = calendar.timezone || 'UTC';
  const cursor = new Date(startDate);

  for (let day = 1; day <= 30; day += 1) {
    cursor.setDate(cursor.getDate() + 1);
    const dateKey = getDateKeyInZone(cursor, timezone);
    const parts = getZonedDateParts(cursor, timezone);
    const d = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
    const dayOfWeek = d.getUTCDay();

    const schedule = getDaySchedule(exchangeKey, dateKey, dayOfWeek, calendar);

    if (schedule.isUnknownYear) {
      return {
        date: cursor,
        dateKey,
        isUnknownYear: true,
        openTimeStr: schedule.openTimeStr,
        closeTimeStr: schedule.closeTimeStr
      };
    }

    if (schedule.isTradingDay) {
      return {
        date: cursor,
        dateKey,
        isHalfDay: schedule.isHalfDay,
        openTimeStr: schedule.openTimeStr,
        closeTimeStr: schedule.closeTimeStr
      };
    }
  }

  return null;
}

function getMarketStatus(exchangeKey, now = new Date()) {
  const calendar = getMarketCalendar(exchangeKey);
  if (!calendar || !calendar.timezone || !calendar.regularOpen || !calendar.regularClose) {
    return {
      isOpen: null,
      statusLabel: 'Data saknas',
      countdownText: 'Kalender saknas',
      detail: 'Marknadskalendern saknas eller är ofullständig.'
    };
  }

  const timezone = calendar.timezone;
  const dateKey = getDateKeyInZone(now, timezone);
  const parts = getZonedDateParts(now, timezone);
  const d = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  const dayOfWeek = d.getUTCDay();

  const todaySchedule = getDaySchedule(exchangeKey, dateKey, dayOfWeek, calendar);

  if (todaySchedule.isUnknownYear) {
    return {
      isOpen: null,
      statusLabel: 'Kalender saknas',
      countdownText: 'Kalenderdata saknas för året',
      detail: `Kalenderdata saknas för år ${parts.year}.`
    };
  }

  if (!todaySchedule.isTradingDay) {
    const nextTradingDay = getNextTradingDay(exchangeKey, now, calendar);
    if (!nextTradingDay || nextTradingDay.isUnknownYear) {
      return {
        isOpen: false,
        statusLabel: 'Stängd',
        countdownText: 'Kalenderdata saknas för nästa år',
        detail: 'Kalenderdata saknas för framtida år.'
      };
    }

    const nextOpenTime = buildExchangeDate(nextTradingDay.date, timezone, nextTradingDay.openTimeStr);
    const diffMs = nextOpenTime - now;

    return {
      isOpen: false,
      statusLabel: 'Stängd',
      countdownText: nextOpenTime ? `Öppnar om ${formatClockDuration(diffMs)}` : 'Kalender saknas',
      detail: nextOpenTime
        ? `Nästa öppning ${new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short', timeZone: timezone }).format(nextOpenTime)} kl. ${nextTradingDay.openTimeStr}`
        : 'Ingen öppen tid tillgänglig.'
    };
  }

  const openTime = buildExchangeDate(now, timezone, todaySchedule.openTimeStr);
  const closeTime = buildExchangeDate(now, timezone, todaySchedule.closeTimeStr);

  if (now >= openTime && now < closeTime) {
    const diffMs = closeTime - now;
    const dayTypeLabel = todaySchedule.isHalfDay ? ' (Halvdag)' : '';
    return {
      isOpen: true,
      statusLabel: '● Öppen',
      countdownText: `Stänger om ${formatClockDuration(diffMs)}`,
      detail: `Öppettider ${todaySchedule.openTimeStr}–${todaySchedule.closeTimeStr}${dayTypeLabel}`
    };
  }

  if (now < openTime) {
    const diffMs = openTime - now;
    const dayTypeLabel = todaySchedule.isHalfDay ? ' (Halvdag)' : '';
    return {
      isOpen: false,
      statusLabel: 'Stängd',
      countdownText: `Öppnar om ${formatClockDuration(diffMs)}`,
      detail: `Öppnar idag kl. ${todaySchedule.openTimeStr}${dayTypeLabel}`
    };
  }

  const nextTradingDay = getNextTradingDay(exchangeKey, now, calendar);
  if (!nextTradingDay || nextTradingDay.isUnknownYear) {
    return {
      isOpen: false,
      statusLabel: 'Stängd',
      countdownText: 'Kalenderdata saknas för nästa år',
      detail: 'Kalenderdata saknas för framtida år.'
    };
  }

  const nextOpenTime = buildExchangeDate(nextTradingDay.date, timezone, nextTradingDay.openTimeStr);
  const diffMs = nextOpenTime - now;

  return {
    isOpen: false,
    statusLabel: 'Stängd',
    countdownText: nextOpenTime ? `Öppnar om ${formatClockDuration(diffMs)}` : 'Kalender saknas',
    detail: nextOpenTime
      ? `Nästa öppning ${new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short', timeZone: timezone }).format(nextOpenTime)} kl. ${nextTradingDay.openTimeStr}`
      : 'Ingen öppen tid tillgänglig.'
  };
}

function renderMarketStatus() {
  const rates = [
    { key: 'stockholm', title: 'Stockholm' },
    { key: 'usa', title: 'USA' }
  ];

  rates.forEach(({ key, title }) => {
    const stateEl = document.querySelector(`[data-market-state="${key}"]`);
    const timerEl = document.querySelector(`[data-market-timer="${key}"]`);
    if (!stateEl || !timerEl) {
      return;
    }

    const status = getMarketStatus(key, getNtmNow());
    stateEl.textContent = status.statusLabel;
    timerEl.textContent = status.countdownText;
    timerEl.title = status.detail;
    stateEl.title = status.detail;
  });
}

const NTM_MARKET_INSTRUMENTS = [
  {
    id: 'oil',
    name: 'Olja',
    provider: 'tradingview',
    symbol: 'TVC:UKOIL',
    status: 'active'
  },
  {
    id: 'gold',
    name: 'Guld',
    provider: 'tradingview',
    symbol: 'TVC:GOLD',
    status: 'active'
  },
  {
    id: 'silver',
    name: 'Silver',
    provider: 'tradingview',
    symbol: 'TVC:SILVER',
    status: 'active'
  },
  {
    id: 'usdsek',
    name: 'USD/SEK',
    provider: 'tradingview',
    symbol: 'FX_IDC:USDSEK',
    status: 'active'
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    provider: 'tradingview',
    symbol: 'BITSTAMP:BTCUSD',
    status: 'active'
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    provider: 'tradingview',
    symbol: 'BITSTAMP:ETHUSD',
    status: 'active'
  }
];

function renderTradingViewWidget() {
  const container = document.getElementById('ntmTradingViewWidget');
  if (!container) {
    return;
  }

  const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';

  container.innerHTML = NTM_MARKET_INSTRUMENTS.map((item) => {
    return `
      <article class="ntm-market-card" aria-label="${item.name} prisuppdatering">
        <div class="ntm-market-card-header">
          <span>${item.name}</span>
        </div>
        <div class="ntm-market-card-body">
          <tv-single-ticker symbol="${item.symbol}" theme="${theme}" locale="sv" transparent></tv-single-ticker>
        </div>
      </article>
    `;
  }).join('');
}

function renderTradingViewWidgetWhenReady() {
  renderTradingViewWidget();

  if (window.customElements && typeof window.customElements.whenDefined === 'function') {
    window.customElements.whenDefined('tv-single-ticker').then(() => {
      renderTradingViewWidget();
    });
  }
}

function initExtraMarketToggle() {
  const toggleBtn = document.getElementById('ntmExtraMarketToggle');
  const listEl = document.getElementById('ntmExtraMarketList');
  if (!toggleBtn || !listEl) return;

  toggleBtn.addEventListener('click', () => {
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    const nextState = !isExpanded;
    toggleBtn.setAttribute('aria-expanded', String(nextState));
    listEl.classList.toggle('hidden', !nextState);
    listEl.setAttribute('aria-hidden', String(!nextState));

    const arrow = toggleBtn.querySelector('.ntm-toggle-arrow');
    if (arrow) {
      arrow.textContent = nextState ? '↑' : '↓';
    }
  });
}

function initMobileMarketToggle() {
  const toggleBtn = document.getElementById('ntmMarketToggle');
  const content = document.getElementById('ntmMarketContent');
  if (!toggleBtn || !content) return;

  const isMobile = () => window.matchMedia('(max-width: 720px)').matches;
  let wasMobile = isMobile();
  const setExpanded = (expanded) => {
    toggleBtn.setAttribute('aria-expanded', String(expanded));
    toggleBtn.setAttribute('aria-label', expanded ? 'Dölj marknadsdata' : 'Visa marknadsdata');
    content.setAttribute('aria-hidden', String(!expanded));
    content.classList.toggle('is-expanded', expanded);

    const icon = toggleBtn.querySelector('.ntm-mobile-market-icon');
    if (icon) {
      icon.textContent = expanded ? '−' : '+';
    }
  };

  setExpanded(!isMobile());

  toggleBtn.addEventListener('click', () => {
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    setExpanded(!isExpanded);
  });

  window.addEventListener('resize', () => {
    const currentlyMobile = isMobile();
    if (currentlyMobile !== wasMobile) {
      setExpanded(!currentlyMobile);
      wasMobile = currentlyMobile;
    }
  });
}

const NTM_DISPLAY_TIMEZONE = 'Europe/Stockholm';
const NTM_PRIORITY = { low: 1, medium: 2, high: 3 };

function getTodayDateKey(date = new Date()) {
  return getDateKeyInZone(date, NTM_DISPLAY_TIMEZONE);
}

function getSourceDateTime(dateKey, time, timeZone) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const utcValue = Date.UTC(year, month - 1, day, hours, minutes, 0);
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(utcValue), timeZone);
  return new Date(utcValue - offsetMinutes * 60000);
}

function formatEventTime(event, sourceTimezone) {
  if (!event.time) {
    return 'Tid ej angiven';
  }

  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: NTM_DISPLAY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(getSourceDateTime(event.date, event.time, sourceTimezone));
}

function normalizeMacroEvent(event, defaultTimezone = 'America/New_York') {
  if (!event || !event.date) return null;
  const timezone = event.timezone || defaultTimezone || 'America/New_York';
  const hasTime = typeof event.time === 'string' && event.time.trim().length > 0;

  if (hasTime) {
    const dateTime = getSourceDateTime(event.date, event.time, timezone);
    const swedishDate = getDateKeyInZone(dateTime, NTM_DISPLAY_TIMEZONE);
    const swedishTime = new Intl.DateTimeFormat('sv-SE', {
      timeZone: NTM_DISPLAY_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(dateTime);

    return {
      ...event,
      hasTime: true,
      timezone,
      dateTime,
      timestamp: dateTime.getTime(),
      swedishDate,
      swedishTime
    };
  }

  return {
    ...event,
    hasTime: false,
    timezone,
    dateTime: null,
    timestamp: new Date(`${event.date}T00:00:00Z`).getTime(),
    swedishDate: event.date,
    swedishTime: 'Tid ej angiven'
  };
}

function getAllNormalizedMacroEvents() {
  const weeklyEvents = window.NTM_WEEKLY_EVENTS || {};
  const macroWeeks = weeklyEvents.macroWeeks || {};
  const allEvents = [];

  Object.values(macroWeeks).forEach((week) => {
    if (Array.isArray(week.events)) {
      week.events.forEach((event) => {
        const normalized = normalizeMacroEvent(event, week.sourceTimezone);
        if (normalized) {
          allEvents.push(normalized);
        }
      });
    }
  });

  return allEvents;
}

function formatMacroValue(val) {
  if (val === null || val === undefined || val === '') {
    return '–';
  }
  return String(val);
}

function getIsoWeekDateRange(isoWeekKey) {
  const match = String(isoWeekKey).match(/^(\d{4})-W(\d{1,2})$/i);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);

  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const week1Mon = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000);
  const targetMon = new Date(week1Mon.getTime() + (week - 1) * 7 * 86400000);
  const targetSun = new Date(targetMon.getTime() + 6 * 86400000);

  const startDay = targetMon.getUTCDate();
  const endDay = targetSun.getUTCDate();
  const startMonth = new Intl.DateTimeFormat('sv-SE', { month: 'long', timeZone: 'UTC' }).format(targetMon);
  const endMonth = new Intl.DateTimeFormat('sv-SE', { month: 'long', timeZone: 'UTC' }).format(targetSun);

  if (startMonth === endMonth) {
    return `${startDay}–${endDay} ${startMonth} ${year}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${year}`;
}

window.NTM_MACRO = {
  normalizeMacroEvent,
  getAllNormalizedMacroEvents,
  formatMacroValue,
  getIsoWeekDateRange,
  getSourceDateTime,
  getDateKeyInZone,
  NTM_DISPLAY_TIMEZONE
};

function getWeeklyRecords() {
  const weeklyEvents = window.NTM_WEEKLY_EVENTS || {};
  const macroWeek = Object.values(weeklyEvents.macroWeeks || {})[0];
  const earningsWeek = Object.values(weeklyEvents.earningsWeeks || {})[0];

  return {
    macro: macroWeek ? macroWeek.events : weeklyEvents.macro || [],
    macroTimezone: macroWeek ? macroWeek.sourceTimezone : 'America/New_York',
    earnings: earningsWeek ? earningsWeek.reports : weeklyEvents.earnings || []
  };
}

function getPriorityValue(priority) {
  return NTM_PRIORITY[priority] || 0;
}

function renderWeeklyEvents(now = getNtmNow()) {
  const macroList = document.getElementById('ntmMacroList');
  const earningsList = document.getElementById('ntmEarningsList');
  if (!macroList || !earningsList) {
    return;
  }

  const weeklyRecords = getWeeklyRecords();
  const todayKey = getTodayDateKey(now);

  const allMacro = getAllNormalizedMacroEvents();
  const macroItems = allMacro
    .filter((event) => event.swedishDate === todayKey)
    .sort((a, b) => a.timestamp - b.timestamp);

  const earningsItems = weeklyRecords.earnings
    .filter((event) => event && event.date === todayKey)
    .sort((a, b) => getPriorityValue(b.priority) - getPriorityValue(a.priority));

  const highestMacroPriority = Math.max(...macroItems.map((event) => getPriorityValue(event.priority)), 0);
  const relevantMacroItems = macroItems.filter((event) => getPriorityValue(event.priority) === (highestMacroPriority >= getPriorityValue('medium') ? highestMacroPriority : 0));
  const macroGroups = relevantMacroItems.reduce((groups, event) => {
    const key = event.hasTime ? event.swedishTime : 'Tid ej angiven';
    groups[key] = groups[key] || [];
    groups[key].push(event);
    return groups;
  }, {});

  const macroPanel = macroList.closest('.ntm-event-panel');
  if (!relevantMacroItems.length) {
    macroList.innerHTML = '<p class="ntm-empty-state">Inga större makrohändelser idag.</p>';
    macroPanel?.classList.add('is-empty');
  } else {
    macroPanel?.classList.remove('is-empty');
    macroList.innerHTML = Object.entries(macroGroups).map(([timeLabel, events]) => `
      <div class="ntm-macro-group">
        <span class="ntm-event-time">${escapePostText(timeLabel)}</span>
        <div class="ntm-macro-events">
          ${events.map((event) => `
            <div class="ntm-macro-event-row">
              <div class="ntm-event-copy">
                <strong>${escapePostText(event.eventName || 'Makrohändelse')}</strong>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  const earningsPanel = earningsList.closest('.ntm-event-panel');
  if (!earningsItems.length) {
    earningsList.innerHTML = '<p class="ntm-empty-state">Inga större bolagsrapporter idag.</p>';
    earningsPanel?.classList.add('is-empty');
    return;
  }
  earningsPanel?.classList.remove('is-empty');

  const selectedEarnings = earningsItems.slice(0, 3);
  const remaining = Math.max(0, earningsItems.length - selectedEarnings.length);

  earningsList.innerHTML = selectedEarnings.map((event) => {
    const timingText = event.timing === 'before-open' ? 'Före öppning' : event.timing === 'after-close' ? 'Efter stängning' : 'Tidpunkt ej angiven';
    return `
      <div class="ntm-event-item">
        <span class="ntm-event-time">${escapePostText(event.ticker || 'BOL')}</span>
        <div class="ntm-event-copy">
          <strong>${escapePostText(event.companyName || 'Bolag')}</strong>
          <small>${timingText}</small>
        </div>
      </div>
    `;
  }).join('') + (remaining > 0 ? `<a class="text-link ntm-more-link" href="rapporter.html">Visa ${remaining} till →</a>` : '');
}

function initNtmToday() {
  updateGreeting();
  renderMarketStatus();
  renderTradingViewWidgetWhenReady();
  initMobileMarketToggle();
  initExtraMarketToggle();
  renderWeeklyEvents();
  setInterval(() => {
    updateGreeting();
    renderMarketStatus();
    renderWeeklyEvents();
  }, 60000);
}

function escapePostText(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

function formatPostDate(date) {
  return new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
}

function getPostUrl(slug) {
  return `post.html?post=${encodeURIComponent(slug)}`;
}

function renderPostTags(post) {
  return post.tags.map((tag) => `<a class="post-tag" href="inlagg.html?tag=${encodeURIComponent(tag)}">${escapePostText(tag)}</a>`).join('');
}

function renderPostMedia(post, preview = false) {
  if (post.media.type === 'youtube') {
    return `<div class="youtube-media" data-youtube-media>
      <button class="youtube-preview" type="button" data-youtube-preview data-video-id="${escapePostText(post.media.videoId)}" aria-label="Spela upp ${escapePostText(post.title)}">
        <img src="https://img.youtube.com/vi/${encodeURIComponent(post.media.videoId)}/maxresdefault.jpg" alt="Förhandsvisning av ${escapePostText(post.title)}" loading="${preview ? 'lazy' : 'eager'}" />
        <span class="youtube-play" aria-hidden="true">▶</span>
      </button>
    </div>`;
  }

  if (post.media.type === 'carousel' || post.media.type === 'image') {
    const images = post.media.type === 'carousel' ? post.media.images : [post.media.image];
    const firstImage = images[0];
    if (preview) {
      const previewPosition = post.previewPosition || 'top';
      return `<div class="post-preview-image" data-post-preview-media data-post-slug="${escapePostText(post.slug)}" tabindex="0" role="button" aria-label="Öppna bild för ${escapePostText(post.title)}"><img src="${escapePostText(firstImage.src)}" alt="${escapePostText(firstImage.alt)}" loading="lazy" style="object-position: ${escapePostText(previewPosition)};" /></div>`;
    }
    if (post.media.type === 'image') {
      return `<div class="post-single-image" data-post-detail-media data-post-slug="${escapePostText(post.slug)}"><img class="carousel-slide-clickable" src="${escapePostText(firstImage.src)}" alt="${escapePostText(firstImage.alt)}" data-post-image /></div>`;
    }
    return `<div class="post-carousel" data-carousel tabindex="0" aria-label="Bildkarusell för ${escapePostText(post.title)}">
      <div class="carousel-viewport"><div class="carousel-track">${images.map((image, index) => `<img class="carousel-slide" src="${escapePostText(image.src)}" alt="${escapePostText(image.alt)}" loading="${index === 0 ? 'eager' : 'lazy'}" data-carousel-slide />`).join('')}</div></div>
      <button class="carousel-button carousel-prev" type="button" data-carousel-prev aria-label="Föregående bild">←</button>
      <button class="carousel-button carousel-next" type="button" data-carousel-next aria-label="Nästa bild">→</button>
      <div class="carousel-footer"><span data-carousel-position>1 / ${images.length}</span><div class="carousel-dots" role="tablist" aria-label="Välj bild">${images.map((image, index) => `<button type="button" class="carousel-dot${index === 0 ? ' is-active' : ''}" data-carousel-dot="${index}" role="tab" aria-label="Visa bild ${index + 1}" aria-selected="${index === 0}"></button>`).join('')}</div></div>
    </div>`;
  }

  return '';
}

function createImageLightbox(images, startIndex = 0, onChange = null) {
  const existing = document.querySelector('.lightbox-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  const content = document.createElement('div');
  content.className = 'lightbox-content';
  const image = document.createElement('img');
  image.className = 'lightbox-image';
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'lightbox-close';
  closeButton.setAttribute('aria-label', 'Stäng bild');
  closeButton.textContent = '×';
  const previousButton = document.createElement('button');
  previousButton.type = 'button';
  previousButton.className = 'lightbox-nav lightbox-prev';
  previousButton.setAttribute('aria-label', 'Föregående bild');
  previousButton.textContent = '←';
  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'lightbox-nav lightbox-next';
  nextButton.setAttribute('aria-label', 'Nästa bild');
  nextButton.textContent = '→';
  const position = document.createElement('span');
  position.className = 'lightbox-position';

  let current = (startIndex + images.length) % images.length;
  const render = () => {
    const item = images[current];
    image.src = item.src;
    image.alt = item.alt || 'Bild';
    position.textContent = images.length > 1 ? `${current + 1} / ${images.length}` : '';
    previousButton.hidden = images.length < 2;
    nextButton.hidden = images.length < 2;
    if (onChange) onChange(current);
  };
  const move = (offset) => {
    current = (current + offset + images.length) % images.length;
    render();
  };
  const close = () => {
    overlay.remove();
    document.body.style.overflow = overlay.dataset.previousOverflow || '';
    document.removeEventListener('keydown', handleKeydown);
  };
  const handleKeydown = (event) => {
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') move(-1);
    if (event.key === 'ArrowRight') move(1);
  };

  content.append(closeButton, previousButton, image, nextButton, position);
  overlay.appendChild(content);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
  closeButton.addEventListener('click', close);
  previousButton.addEventListener('click', () => move(-1));
  nextButton.addEventListener('click', () => move(1));
  let touchStartX = 0;
  overlay.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches?.[0] || event.touches?.[0];
    if (touch) touchStartX = touch.screenX;
  }, { passive: true });
  overlay.addEventListener('touchend', (event) => {
    const touch = event.changedTouches?.[0] || event.touches?.[0];
    if (!touch) return;
    const distance = touch.screenX - touchStartX;
    if (Math.abs(distance) > 40) move(distance < 0 ? 1 : -1);
  }, { passive: true });
  overlay.dataset.previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);
  document.addEventListener('keydown', handleKeydown);
  render();
}

window.NTMLightbox = { open: createImageLightbox };

function renderPostPreview(post) {
  return `<article class="post-card resource-card" data-youtube-post>
    ${renderPostMedia(post, true)}
    <div class="post-card-body">
      <div class="post-meta"><span>${escapePostText(post.category)}</span><time datetime="${post.date}">${formatPostDate(post.date)}</time></div>
      <h3 class="resource-card-title"><a href="${getPostUrl(post.slug)}">${escapePostText(post.title)}</a></h3>
      <p class="post-excerpt">${escapePostText(post.excerpt)}</p>
      <div class="post-tags">${renderPostTags(post)}</div>
      <a class="resource-card-link" href="${getPostUrl(post.slug)}">Läs inlägget →</a>
    </div>
  </article>`;
}

function getPostImages(post) {
  if (post.media.type === 'carousel') return post.media.images;
  if (post.media.type === 'image') return [post.media.image];
  return [];
}

function initPostPreviewLightboxes() {
  document.querySelectorAll('[data-post-preview-media]').forEach((preview) => {
    const post = NTM_POSTS.find((item) => item.slug === preview.dataset.postSlug);
    if (!post) return;
    const open = () => window.NTMLightbox.open(getPostImages(post));
    preview.addEventListener('click', open);
    preview.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });
  document.querySelectorAll('[data-post-detail-media]').forEach((media) => {
    const post = NTM_POSTS.find((item) => item.slug === media.dataset.postSlug);
    if (!post) return;
    media.querySelector('img')?.addEventListener('click', () => window.NTMLightbox.open(getPostImages(post)));
  });
}

function renderPostView(post) {
  const summary = post.summary ? `<details class="ai-summary"><summary>AI-sammanfattning</summary><div class="ai-summary-body">
    <div class="summary-language-toggle" role="group" aria-label="Välj språk för sammanfattningen">
      <button type="button" class="summary-language-button is-active" data-summary-language="sv" aria-pressed="true">Svenska</button>
      <button type="button" class="summary-language-button" data-summary-language="en" aria-pressed="false">English</button>
    </div>
    ${Object.entries(post.summary).map(([language, paragraphs]) => `<div class="summary-content" data-summary-content="${language}"${language === 'en' ? ' hidden' : ''}>${paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')}<p class="summary-disclaimer">${escapePostText(post.disclaimer)}</p></div>`).join('')}
  </div></details>` : '';

  return `<article class="post-article ${post.media.type === 'youtube' ? 'youtube-post' : ''}" data-youtube-post>
    <header class="post-header"><div class="post-meta"><span>${escapePostText(post.category)}</span><time datetime="${post.date}">${formatPostDate(post.date)}</time></div><h1>${escapePostText(post.title)}</h1><div class="post-tags">${renderPostTags(post)}</div><p class="post-lead">${escapePostText(post.excerpt)}</p></header>
    <div class="post-media">${renderPostMedia(post)}</div>
    ${post.content ? `<div class="post-content">${post.content}</div>` : ''}
    <div class="post-actions">${post.media.externalUrl ? `<a class="secondary-btn" href="${escapePostText(post.media.externalUrl)}" target="_blank" rel="noopener noreferrer">Se på YouTube ↗</a>` : ''}${post.instagramUrl ? `<a class="secondary-btn" href="${escapePostText(post.instagramUrl)}" target="_blank" rel="noopener noreferrer">Ursprungligen publicerat på Instagram ↗</a>` : ''}<button type="button" class="secondary-btn" data-copy-link>Kopiera länk</button><span class="copy-feedback" data-copy-feedback role="status" aria-live="polite"></span></div>
    ${summary}
  </article>`;
}

function initCarousels() {
  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('[data-carousel-slide]');
    const position = carousel.querySelector('[data-carousel-position]');
    const dots = carousel.querySelectorAll('[data-carousel-dot]');
    let current = 0;
    let touchStartX = 0;

    const showSlide = (index) => {
      current = (index + slides.length) % slides.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      position.textContent = `${current + 1} / ${slides.length}`;
      dots.forEach((dot, dotIndex) => {
        const active = dotIndex === current;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', String(active));
      });
    };

    carousel.querySelector('[data-carousel-prev]').addEventListener('click', () => showSlide(current - 1));
    carousel.querySelector('[data-carousel-next]').addEventListener('click', () => showSlide(current + 1));
    dots.forEach((dot) => dot.addEventListener('click', () => showSlide(Number(dot.dataset.carouselDot))));
    carousel.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') showSlide(current - 1);
      if (event.key === 'ArrowRight') showSlide(current + 1);
    });
    slides.forEach((slide, slideIndex) => {
      slide.classList.add('carousel-slide-clickable');
      slide.addEventListener('click', () => {
        window.NTMLightbox.open([...slides].map((item) => ({ src: item.src, alt: item.alt })), slideIndex, showSlide);
      });
    });
    carousel.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
    carousel.addEventListener('touchend', (event) => {
      const distance = event.changedTouches[0].screenX - touchStartX;
      if (Math.abs(distance) > 40) showSlide(current + (distance < 0 ? 1 : -1));
    }, { passive: true });
  });
}

function initPostSystem() {
  if (typeof NTM_POSTS === 'undefined') return;
  const posts = [...NTM_POSTS].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestPosts = document.getElementById('latestPosts');
  if (latestPosts) latestPosts.innerHTML = posts.slice(0, 3).map(renderPostPreview).join('');

  const archive = document.getElementById('postArchive');
  if (archive) {
    const search = document.getElementById('postSearch');
    const category = document.getElementById('postCategory');
    const tag = new URLSearchParams(window.location.search).get('tag') || '';
    const categories = ['Alla', 'Analys', 'Portfölj', 'Utbildning', 'Makro', 'Video', 'Nyheter'];
    category.innerHTML = categories.map((item) => `<button type="button" class="filter-button${item === 'Alla' ? ' is-active' : ''}" data-category="${item}">${item}</button>`).join('');
    let page = 1;
    const renderArchive = () => {
      const query = search.value.trim().toLowerCase();
      const selectedCategory = category.querySelector('.is-active')?.dataset.category || 'Alla';
      const filtered = posts.filter((post) => {
        const matchesQuery = !query || [post.title, post.excerpt, post.category, ...post.tags].join(' ').toLowerCase().includes(query);
        const matchesCategory = selectedCategory === 'Alla' || post.category === selectedCategory;
        const matchesTag = !tag || post.tags.some((item) => item.toLowerCase() === tag.toLowerCase());
        return matchesQuery && matchesCategory && matchesTag;
      });
      const pageCount = Math.ceil(filtered.length / 9);
      page = Math.min(page, Math.max(1, pageCount));
      const visible = filtered.slice((page - 1) * 9, page * 9);
      document.getElementById('postResults').innerHTML = visible.length ? visible.map(renderPostPreview).join('') : '<p class="empty-state">Inga inlägg hittades.</p>';
      const pagination = document.getElementById('postPagination');
      pagination.innerHTML = pageCount > 1 ? Array.from({ length: pageCount }, (_, index) => `<button type="button" class="pagination-button${index + 1 === page ? ' is-active' : ''}" data-page="${index + 1}">${index + 1}</button>`).join('') : '';
      pagination.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => { page = Number(button.dataset.page); renderArchive(); }));
    };
    category.addEventListener('click', (event) => { const button = event.target.closest('[data-category]'); if (!button) return; category.querySelectorAll('[data-category]').forEach((item) => item.classList.remove('is-active')); button.classList.add('is-active'); page = 1; renderArchive(); });
    search.addEventListener('input', () => { page = 1; renderArchive(); });
    renderArchive();
  }

  const postView = document.getElementById('postView');
  if (postView) {
    const slug = new URLSearchParams(window.location.search).get('post');
    const post = posts.find((item) => item.slug === slug);
    postView.innerHTML = post ? renderPostView(post) : '<div class="not-found"><h1>Inlägget hittades inte</h1><p>Kontrollera länken eller gå tillbaka till arkivet.</p><a class="primary-btn" href="inlagg.html">Till alla inlägg</a></div>';
    const copyButton = postView.querySelector('[data-copy-link]');
    if (copyButton) copyButton.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(window.location.href);
        } else {
          const fallback = document.createElement('textarea');
          fallback.value = window.location.href;
          fallback.setAttribute('readonly', '');
          fallback.style.position = 'fixed';
          fallback.style.opacity = '0';
          document.body.appendChild(fallback);
          fallback.select();
          document.execCommand('copy');
          fallback.remove();
        }
        postView.querySelector('[data-copy-feedback]').textContent = 'Kopierad!';
      } catch (error) {
        postView.querySelector('[data-copy-feedback]').textContent = 'Kunde inte kopiera länken.';
      }
    });
  }
  initPostPreviewLightboxes();
  initCarousels();
}

function initYoutubePosts() {
  document.addEventListener('click', function (event) {
    const preview = event.target.closest('[data-youtube-preview]');
    if (preview) {
      const post = preview.closest('[data-youtube-post]');
      const media = preview.closest('[data-youtube-media]');
      const videoId = preview.dataset.videoId;

      if (!post || !media || !videoId || media.querySelector('iframe')) {
        return;
      }

      const player = document.createElement('iframe');
      player.className = 'youtube-player';
      player.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1`;
      player.title = preview.getAttribute('aria-label') || 'YouTube-video';
      player.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      player.allowFullscreen = true;
      media.replaceChildren(player);
      return;
    }

    const languageButton = event.target.closest('[data-summary-language]');
    if (!languageButton) {
      return;
    }

    const post = languageButton.closest('[data-youtube-post]');
    if (!post) {
      return;
    }

    const selectedLanguage = languageButton.dataset.summaryLanguage;
    post.querySelectorAll('[data-summary-language]').forEach((button) => {
      const isSelected = button === languageButton;
      button.classList.toggle('is-active', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });

    post.querySelectorAll('[data-summary-content]').forEach((content) => {
      content.hidden = content.dataset.summaryContent !== selectedLanguage;
    });
  });
}

if (mobileNavToggle && navMenu) {
  mobileNavToggle.addEventListener('click', function () {
    navMenu.classList.toggle('open');
    mobileNavToggle.setAttribute('aria-expanded', String(navMenu.classList.contains('open')));
  });
}

const mobileThemeToggle = document.getElementById('mobileThemeToggle');
if (mobileThemeToggle && themeToggle) {
  // Reuses the existing theme toggle handler/state instead of duplicating it.
  mobileThemeToggle.addEventListener('click', function () {
    themeToggle.click();
  });
}

modeTabs.forEach((button) => {
  button.addEventListener('click', () => setActiveMode(button.dataset.mode));
});

if (themeToggle) {
  themeToggle.addEventListener('click', function () {
    const isLight = document.body.classList.contains('light-theme');
    const nextTheme = isLight ? 'dark' : 'light';
    localStorage.setItem('investment-theme', nextTheme);
    applyTheme(nextTheme);
    renderTradingViewWidget();

    if (form && growthCalcState?.state === 'calculated') {
      renderChart();
      renderScenarioComparison();
    }

    if (dividendForm && dividendCalcState?.state === 'calculated') {
      renderDividendChart();
    }

    if (fireCalculatorForm && firePathCalcState?.state === 'calculated') {
      calculateFireProjection();
    }
    if (window.latestFireGoalCalculation?.valid && fireGoalCalcState?.state === 'calculated') {
      renderFireGoalChart(window.latestFireGoalCalculation);
    }
    if (window.latestFireWithdrawalCalculation && fireWithdrawalCalcState?.state === 'calculated') {
      renderFireWithdrawalChart(window.latestFireWithdrawalCalculation);
    }
  });
}

function syncFireGoalInputsFromPath() {
  const pairs = [
    ['fire-monthly-expenses', 'fire-goal-monthly-expenses'],
    ['fire-current-capital', 'fire-goal-current-capital'],
    ['fire-age', 'fire-goal-current-age'],
    ['fire-return', 'fire-goal-return'],
    ['fire-inflation', 'fire-goal-inflation'],
    ['fire-withdrawal-rate', 'fire-goal-withdrawal-rate']
  ];
  pairs.forEach(([sourceId, targetId]) => {
    const source = document.getElementById(sourceId);
    const target = document.getElementById(targetId);
    if (source && target) target.value = source.value;
  });
}

function setFireMainMode(mode) {
  const selectedMode = ['path', 'goal', 'withdrawal'].includes(mode) ? mode : 'path';
  if (selectedMode === 'goal') syncFireGoalInputsFromPath();
  document.querySelectorAll('.fire-mode-tab').forEach((tab) => {
    const active = tab.dataset.fireMode === selectedMode;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('.fire-mode-panel').forEach((panel) => {
    const active = panel.dataset.fireModePanel === selectedMode;
    panel.classList.toggle('hidden', !active);
    panel.hidden = !active;
  });

  if (firePathCalcState) firePathCalcState.setNeutral();
  if (fireGoalCalcState) fireGoalCalcState.setNeutral();
  if (fireWithdrawalCalcState) fireWithdrawalCalcState.setNeutral();
}

document.querySelectorAll('.fire-mode-tab').forEach((button) => {
  button.addEventListener('click', () => setFireMainMode(button.dataset.fireMode));
});

const ISK_TAX_RULES = {
  2026: {
    taxFreeAllowance: 300000,
    governmentBorrowingRate: 0.0255,
    rateAddition: 0.01,
    minimumSchablonRate: 0.0125,
    capitalTaxRate: 0.30
  }
};

function parseIskField(id, isOptional = false) {
  const el = document.getElementById(id);
  if (!el) return isOptional ? 0 : null;
  const raw = el.value.trim();
  if (raw === '') {
    return isOptional ? 0 : null;
  }
  const parsed = Number.parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return NaN;
  }
  return parsed;
}

function calculateIskTax() {
  const rules = ISK_TAX_RULES[2026];
  const activePanel = document.querySelector('.isk-mode-panel:not(.hidden)') || document.getElementById('isk-simple-panel');
  const allowanceAlreadyUsed = parseIskField('isk-allowance-used', true);

  if (Number.isNaN(allowanceAlreadyUsed)) {
    return 'Ange ett giltigt belopp för skattefri grundnivå.';
  }

  let capitalBasis;

  if (activePanel && activePanel.id === 'isk-detailed-panel') {
    const jan = parseIskField('isk-value-jan');
    const apr = parseIskField('isk-value-apr');
    const jul = parseIskField('isk-value-jul');
    const oct = parseIskField('isk-value-oct');
    const deposits = parseIskField('isk-deposits', true);
    const transfers = parseIskField('isk-transfers', true);

    if (jan === null || apr === null || jul === null || oct === null) {
      return 'Ange ett kapitalbelopp.';
    }
    if (Number.isNaN(jan) || Number.isNaN(apr) || Number.isNaN(jul) || Number.isNaN(oct) || Number.isNaN(deposits) || Number.isNaN(transfers)) {
      return 'Ange ett kapitalbelopp.';
    }

    capitalBasis = (jan + apr + jul + oct + deposits + transfers) / 4;
  } else {
    const simpleBasis = parseIskField('isk-capital-basis');
    if (simpleBasis === null || Number.isNaN(simpleBasis)) {
      return 'Ange ett kapitalbelopp.';
    }
    capitalBasis = simpleBasis;
  }

  if (capitalBasis < 0 || !Number.isFinite(capitalBasis)) {
    return 'Ange ett kapitalbelopp.';
  }

  const availableAllowance = Math.max(rules.taxFreeAllowance - allowanceAlreadyUsed, 0);
  const taxFreeUsed = Math.min(capitalBasis, availableAllowance);
  const taxableCapitalBasis = Math.max(capitalBasis - availableAllowance, 0);
  const schablonRate = Math.max(rules.governmentBorrowingRate + rules.rateAddition, rules.minimumSchablonRate);
  const schablonIncome = taxableCapitalBasis * schablonRate;
  const estimatedTax = Math.max(schablonIncome * rules.capitalTaxRate, 0);

  document.getElementById('isk-tax-result').textContent = formatCurrency(estimatedTax);
  document.getElementById('isk-capital-result').textContent = formatCurrency(capitalBasis);
  document.getElementById('isk-tax-free-result').textContent = formatCurrency(taxFreeUsed);
  document.getElementById('isk-taxable-result').textContent = formatCurrency(taxableCapitalBasis);
  document.getElementById('isk-income-result').textContent = formatCurrency(schablonIncome);
  document.getElementById('isk-rate-result').textContent = `${(schablonRate * rules.capitalTaxRate * 100).toLocaleString('sv-SE', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} %`;

  const summary = document.getElementById('isk-summary');
  if (summary) {
    summary.textContent = taxableCapitalBasis === 0
      ? 'Med dessa uppgifter ligger ditt kapitalunderlag inom den skattefria grundnivån.'
      : allowanceAlreadyUsed > 0
        ? `Beräkningen tar hänsyn till att ${formatCurrency(allowanceAlreadyUsed)} av grundnivån redan används på annat sparande.`
        : 'Beräkningen använder hela den tillgängliga skattefria grundnivån på ditt sammanlagda sparande.';
  }

  return true;
}

if (iskCalculatorForm) {
  iskCalcState = new CalcState({
    id: 'isk',
    container: iskCalculatorForm.closest('.calculator-card') || iskCalculatorForm.parentElement,
    form: iskCalculatorForm,
    onCalculate: calculateIskTax
  });
}

if (iskModeTabs.length) {
  iskModeTabs.forEach((button) => {
    button.addEventListener('click', function () {
      const selectedMode = button.dataset.iskMode === 'detailed' ? 'detailed' : 'simple';
      iskModeTabs.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });
      document.querySelectorAll('.isk-mode-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== `isk-${selectedMode}-panel`);
      });

      if (iskCalcState) iskCalcState.setNeutral();
    });
  });
}

function parseStockNumber(value) {
  const parsedValue = Number.parseFloat(String(value || '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatStockCurrency(value, currency) {
  if (!Number.isFinite(value)) {
    return '–';
  }

  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatStockNumber(value, fractionDigits = 2) {
  return Number.isFinite(value)
    ? value.toLocaleString('sv-SE', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })
    : '–';
}

function formatStockPercent(value) {
  return Number.isFinite(value)
    ? `${value >= 0 ? '+' : ''}${value.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
    : '–';
}

function calculateStockScenario(currentPrice, currentEPS, growthPercent, years, futurePE) {
  const growthRate = growthPercent / 100;
  const futureEPS = Number.isFinite(currentEPS) && Number.isFinite(growthRate) && growthRate >= -1
    ? currentEPS * Math.pow(1 + growthRate, years)
    : 0;
  const currentPE = currentEPS > 0 ? currentPrice / currentEPS : null;
  const targetPrice = futureEPS > 0 && futurePE > 0 ? futureEPS * futurePE : null;
  const totalReturn = targetPrice !== null && currentPrice > 0 ? (targetPrice / currentPrice) - 1 : null;
  const cagr = targetPrice !== null && currentPrice > 0 && years > 0
    ? Math.pow(targetPrice / currentPrice, 1 / years) - 1
    : null;
  const peg = currentPE !== null && growthPercent > 0 ? currentPE / growthPercent : null;

  return { currentPE, futureEPS, targetPrice, totalReturn, cagr, peg };
}

function renderStockChart(mode, chartData, currency) {
  const canvas = document.getElementById('stockValuationChart');
  if (!canvas || typeof Chart === 'undefined') {
    return;
  }

  if (stockValuationChart) {
    stockValuationChart.destroy();
  }

  const colors = getChartColors();
  const formatTick = (value) => formatStockCurrency(Number(value), currency);
  const datasets = mode === 'simple'
    ? [{
        label: 'Scenariopris',
      data: chartData.data,
        borderColor: colors.primary,
        backgroundColor: colors.primarySoft,
        borderWidth: 3,
        pointRadius: 3,
        fill: true,
        tension: 0.25,
        spanGaps: false
      }]
    : [
        { label: 'Bear', data: chartData.bear, borderColor: colors.danger, borderWidth: 2, pointRadius: 2, fill: false, tension: 0.25 },
        { label: 'Base', data: chartData.base, borderColor: colors.primary, borderWidth: 3, pointRadius: 2, fill: false, tension: 0.25 },
        { label: 'Bull', data: chartData.bull, borderColor: colors.accent, borderWidth: 2, pointRadius: 2, fill: false, tension: 0.25 }
      ];

  stockValuationChart = new Chart(canvas, {
    type: 'line',
    data: { labels: chartData.labels || [], datasets },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { labels: { color: colors.text } },
        tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${formatTick(context.parsed.y)}` } }
      },
      scales: {
        x: { ticks: { color: colors.muted }, grid: { color: colors.grid } },
        y: { beginAtZero: true, ticks: { color: colors.muted, callback: formatTick }, grid: { color: colors.grid } }
      }
    }
  });
}

function buildStockChartSeries(currentPrice, currentEPS, growthPercent, years, futurePE) {
  const labels = Array.from({ length: years + 1 }, (_, year) => String(year));
  const data = labels.map((_, year) => {
    if (year === 0) {
      return currentPrice;
    }
    const eps = currentEPS * Math.pow(1 + (growthPercent / 100), year);
    return eps > 0 && futurePE > 0 ? eps * futurePE : null;
  });
  return { labels, data };
}

function renderStockSimpleResults() {
  const currency = document.getElementById('stock-currency').value || 'SEK';
  const currentPriceInput = document.getElementById('stock-price').value;
  const currentEPSInput = document.getElementById('stock-eps').value;
  const currentPrice = parseStockNumber(currentPriceInput);
  const currentEPS = parseStockNumber(currentEPSInput);

  if (currentPrice <= 0 || currentEPS === 0 || !Number.isFinite(currentPrice) || !Number.isFinite(currentEPS)) {
    return 'Aktiekurs måste vara större än 0 och vinst per aktie (EPS) får inte vara 0.';
  }

  const growthPercent = parseStockNumber(document.getElementById('stock-growth').value);
  const years = Math.max(Math.floor(parseStockNumber(document.getElementById('stock-years').value)), 1);
  const futurePE = Math.max(parseStockNumber(document.getElementById('stock-future-pe').value), 0);
  const model = calculateStockScenario(currentPrice, currentEPS, growthPercent, years, futurePE);
  const forwardEPSValue = parseStockNumber(document.getElementById('stock-forward-eps').value);
  const forwardPE = forwardEPSValue > 0 ? currentPrice / forwardEPSValue : null;

  document.getElementById('stock-target-result').textContent = model.targetPrice === null ? 'Ej relevant' : formatStockCurrency(model.targetPrice, currency);
  document.getElementById('stock-cagr-result').textContent = formatStockPercent(model.cagr === null ? null : model.cagr * 100);
  document.getElementById('stock-future-eps-result').textContent = formatStockNumber(model.futureEPS);
  document.getElementById('stock-current-pe-result').textContent = model.currentPE === null ? 'Ej relevant' : formatStockNumber(model.currentPE, 1);
  document.getElementById('stock-forward-pe-result').textContent = forwardPE === null ? '–' : formatStockNumber(forwardPE, 1);
  document.getElementById('stock-peg-result').textContent = model.peg === null ? 'Ej relevant' : formatStockNumber(model.peg);
  document.getElementById('stock-return-result').textContent = formatStockPercent(model.totalReturn === null ? null : model.totalReturn * 100);
  document.getElementById('stock-earnings-yield-result').textContent = model.currentPE === null ? '–' : formatStockPercent((1 / model.currentPE) * 100);
  document.getElementById('stock-required-result').textContent = formatStockPercent(model.totalReturn === null ? null : model.totalReturn * 100);
  document.getElementById('stock-year-label').textContent = String(years);

  const message = document.getElementById('stock-simple-message');
  if (message) {
    message.textContent = currentEPS <= 0 || model.futureEPS <= 0
      ? 'P/E-baserad värdering fungerar normalt inte när vinsten per aktie är negativ.'
      : 'Beräkningen bygger på dina antaganden om vinsttillväxt och framtida P/E. Utdelningar ingår inte.';
  }

  const series = buildStockChartSeries(currentPrice, currentEPS, growthPercent, years, futurePE);
  renderStockChart('simple', series, currency);
  document.getElementById('stock-future-eps-year-label').textContent = String(years);
  return true;
}

function renderStockScenarioResults() {
  const currency = document.getElementById('scenario-currency').value || 'SEK';
  const currentPriceInput = document.getElementById('scenario-price').value;
  const currentEPSInput = document.getElementById('scenario-eps').value;
  const currentPrice = parseStockNumber(currentPriceInput);
  const currentEPS = parseStockNumber(currentEPSInput);

  if (currentPrice <= 0 || currentEPS === 0 || !Number.isFinite(currentPrice) || !Number.isFinite(currentEPS)) {
    return 'Aktiekurs måste vara större än 0 och vinst per aktie (EPS) får inte vara 0.';
  }

  const years = Math.max(Math.floor(parseStockNumber(document.getElementById('scenario-years').value)), 1);
  const scenarios = ['bear', 'base', 'bull'].map((key) => ({
    key,
    model: calculateStockScenario(
      currentPrice,
      currentEPS,
      parseStockNumber(document.getElementById(`${key}-growth`).value),
      years,
      Math.max(parseStockNumber(document.getElementById(`${key}-future-pe`).value), 0)
    )
  }));

  scenarios.forEach(({ key, model }) => {
    document.getElementById(`${key}-eps-result`).textContent = formatStockNumber(model.futureEPS);
    document.getElementById(`${key}-price-result`).textContent = model.targetPrice === null ? 'Ej relevant' : formatStockCurrency(model.targetPrice, currency);
    document.getElementById(`${key}-return-result`).textContent = formatStockPercent(model.totalReturn === null ? null : model.totalReturn * 100);
    document.getElementById(`${key}-cagr-result`).textContent = formatStockPercent(model.cagr === null ? null : model.cagr * 100);
  });

  document.getElementById('scenario-year-label').textContent = String(years);
  const labels = Array.from({ length: years + 1 }, (_, year) => String(year));
  const buildSeries = (key) => {
    const growth = parseStockNumber(document.getElementById(`${key}-growth`).value);
    const futurePE = Math.max(parseStockNumber(document.getElementById(`${key}-future-pe`).value), 0);
    return labels.map((_, year) => year === 0 ? currentPrice : (() => {
      const eps = currentEPS * Math.pow(1 + (growth / 100), year);
      return eps > 0 && futurePE > 0 ? eps * futurePE : null;
    })());
  };
  renderStockChart('scenario', { labels, bear: buildSeries('bear'), base: buildSeries('base'), bull: buildSeries('bull') }, currency);
  return true;
}

function calculateStockValuation() {
  const activeMode = document.querySelector('.stock-mode-tab.active')?.dataset.stockMode || 'simple';
  if (activeMode === 'scenarios') {
    return renderStockScenarioResults();
  } else {
    return renderStockSimpleResults();
  }
}

if (stockValuationForm) {
  stockValuationCalcState = new CalcState({
    id: 'stock',
    container: stockValuationForm.closest('.calculator-card') || stockValuationForm.parentElement,
    form: stockValuationForm,
    onCalculate: calculateStockValuation
  });
}

if (stockModeTabs.length) {
  stockModeTabs.forEach((button) => {
    button.addEventListener('click', function () {
      const selectedMode = button.dataset.stockMode === 'scenarios' ? 'scenarios' : 'simple';
      stockModeTabs.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });
      document.querySelectorAll('.stock-mode-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== `stock-${selectedMode}-panel`);
      });
      document.querySelectorAll('.stock-results-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== `stock-${selectedMode}-results`);
      });

      if (stockValuationCalcState) stockValuationCalcState.setNeutral();
    });
  });
}

function parseReturnNumber(value) {
  const parsedValue = Number.parseFloat(String(value || '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatReturnCurrency(value, currency) {
  if (!Number.isFinite(value)) {
    return '–';
  }

  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatReturnPercent(value, fractionDigits = 2) {
  if (!Number.isFinite(value)) {
    return '–';
  }

  return `${value >= 0 ? '+' : ''}${value.toLocaleString('sv-SE', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} %`;
}

function setReturnMessage(message, isError = false) {
  const messageElement = document.getElementById('return-message');
  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.classList.toggle('is-error', isError);
}

function renderReturnChart(labels, values, label, currency = null) {
  const canvas = document.getElementById('returnChart');
  if (!canvas || typeof Chart === 'undefined') {
    return;
  }

  if (returnChart) {
    returnChart.destroy();
  }

  const colors = getChartColors();
  returnChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderColor: colors.primary,
        backgroundColor: colors.primarySoft,
        borderWidth: 3,
        pointRadius: 3,
        fill: true,
        tension: 0.25,
        spanGaps: false
      }]
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { labels: { color: colors.text } },
        tooltip: {
          callbacks: {
            label: (context) => currency
              ? `${context.dataset.label}: ${formatReturnCurrency(context.parsed.y, currency)}`
              : `${context.dataset.label}: ${context.parsed.y.toLocaleString('sv-SE', { maximumFractionDigits: 2 })}`
          }
        }
      },
      scales: {
        x: { ticks: { color: colors.muted }, grid: { color: colors.grid } },
        y: {
          beginAtZero: true,
          ticks: {
            color: colors.muted,
            callback: (value) => currency ? formatReturnCurrency(Number(value), currency) : Number(value).toLocaleString('sv-SE')
          },
          grid: { color: colors.grid }
        }
      }
    }
  });
}

function calculateTotalReturnMode() {
  const currency = document.getElementById('total-currency').value || 'SEK';
  const startValue = parseReturnNumber(document.getElementById('total-start-value').value);
  const endValue = parseReturnNumber(document.getElementById('total-end-value').value);

  if (startValue === null || endValue === null || startValue < 0 || endValue < 0) {
    return 'Ange värden som är noll eller större.';
  }

  if (startValue <= 0) {
    return 'Startvärdet måste vara större än 0 för att procentuell avkastning ska kunna räknas ut.';
  }

  const totalReturn = (endValue / startValue) - 1;
  const difference = endValue - startValue;
  document.getElementById('total-return-result').textContent = formatReturnPercent(totalReturn * 100);
  document.getElementById('total-difference-result').textContent = formatReturnCurrency(difference, currency);
  document.getElementById('total-start-result').textContent = formatReturnCurrency(startValue, currency);
  document.getElementById('total-end-result').textContent = formatReturnCurrency(endValue, currency);
  setReturnMessage('Detta är en enkel förändring mellan startvärde och slutvärde. Den tar inte hänsyn till tidpunkter för insättningar eller uttag.');
  renderReturnChart(['Start', 'Slut'], [startValue, endValue], 'Värdeutveckling', currency);
  return true;
}

function getReturnPeriodLabel(years, months) {
  const yearLabel = years === 1 ? 'år' : 'år';
  const monthLabel = months === 1 ? 'mån' : 'mån';
  return `${years} ${yearLabel}${months > 0 ? ` ${months} ${monthLabel}` : ''}`;
}

function calculateCagrMode() {
  const currency = document.getElementById('cagr-currency').value || 'SEK';
  const startValue = parseReturnNumber(document.getElementById('cagr-start-value').value);
  const endValue = parseReturnNumber(document.getElementById('cagr-end-value').value);
  const years = parseReturnNumber(document.getElementById('cagr-years').value);
  const months = parseReturnNumber(document.getElementById('cagr-months').value);

  if (startValue === null || endValue === null || years === null || months === null || startValue <= 0 || endValue <= 0) {
    return 'Startvärde, slutvärde och period måste vara större än 0.';
  }

  if (!Number.isInteger(years) || !Number.isInteger(months) || years < 0 || months < 0 || months > 11 || (years === 0 && months === 0)) {
    return 'Ange hela år och mellan 0 och 11 månader. Perioden måste vara längre än 0.';
  }

  const totalYears = years + (months / 12);
  const cagr = Math.pow(endValue / startValue, 1 / totalYears) - 1;
  const totalReturn = (endValue / startValue) - 1;
  const difference = endValue - startValue;
  const periodLabel = getReturnPeriodLabel(years, months);

  document.getElementById('cagr-result').textContent = formatReturnPercent(cagr * 100);
  document.getElementById('cagr-total-result').textContent = formatReturnPercent(totalReturn * 100);
  document.getElementById('cagr-difference-result').textContent = formatReturnCurrency(difference, currency);
  document.getElementById('cagr-period-result').textContent = periodLabel;
  document.getElementById('cagr-summary').textContent = `Det motsvarar ungefär ${formatReturnPercent(cagr * 100)} genomsnittlig årlig tillväxt med ränta-på-ränta-effekt.`;
  setReturnMessage('CAGR visar den genomsnittliga årliga tillväxt som hade gett samma slutvärde om avkastningen varit jämn varje år.');

  const chartSteps = Math.max(Math.ceil(totalYears), 1);
  const labels = Array.from({ length: chartSteps + 1 }, (_, index) => index === chartSteps ? periodLabel : `${index} år`);
  const values = labels.map((_, index) => startValue * Math.pow(1 + cagr, Math.min(index, totalYears)));
  renderReturnChart(labels, values, 'Utveckling motsvarande beräknad CAGR', currency);
  return true;
}

function addAnnualReturnRow(value = '0') {
  const container = document.getElementById('annual-returns-container');
  if (!container || container.children.length >= 50) {
    return;
  }

  const yearNumber = container.children.length + 1;
  const row = document.createElement('div');
  row.className = 'annual-return-row';
  row.innerHTML = `<label for="annual-return-${yearNumber}">År ${yearNumber}</label><input id="annual-return-${yearNumber}" class="annual-return-input" type="number" step="0.01" value="${value}" inputmode="decimal" /><span>%</span>`;
  container.appendChild(row);
  const removeButton = document.getElementById('remove-annual-year');
  if (removeButton) {
    removeButton.disabled = container.children.length <= 1;
  }
}

function removeAnnualReturnRow() {
  const container = document.getElementById('annual-returns-container');
  if (!container || container.children.length <= 1) {
    return;
  }

  container.removeChild(container.lastElementChild);
  const removeButton = document.getElementById('remove-annual-year');
  if (removeButton) {
    removeButton.disabled = container.children.length <= 1;
  }
}

function calculateAnnualReturnMode() {
  const inputs = [...document.querySelectorAll('.annual-return-input')];
  const returns = inputs.map((input) => parseReturnNumber(input.value));

  if (returns.some((value) => value === null)) {
    return 'Fyll i en årsavkastning för varje år.';
  }

  if (returns.some((value) => value < -100)) {
    return 'En årsavkastning kan inte vara lägre än -100 %.';
  }

  const growthFactor = returns.reduce((factor, value) => factor * (1 + (value / 100)), 1);
  const totalReturn = growthFactor - 1;
  const annualizedReturn = growthFactor === 0 ? -1 : Math.pow(growthFactor, 1 / returns.length) - 1;
  const arithmeticAverage = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  let cumulativeValue = 100;
  const cumulativeValues = [cumulativeValue];
  returns.forEach((value) => {
    cumulativeValue *= 1 + (value / 100);
    cumulativeValues.push(cumulativeValue);
  });

  document.getElementById('annual-cagr-result').textContent = formatReturnPercent(annualizedReturn * 100);
  document.getElementById('annual-total-result').textContent = formatReturnPercent(totalReturn * 100);
  document.getElementById('annual-average-result').textContent = formatReturnPercent(arithmeticAverage);
  document.getElementById('annual-count-result').textContent = String(returns.length);
  setReturnMessage('Det aritmetiska snittet tar inte hänsyn till ränta-på-ränta-effekten. CAGR visar den årliga avkastning som hade gett samma slutresultat.');
  renderReturnChart(['Start', ...returns.map((_, index) => `År ${index + 1}`)], cumulativeValues, 'Utveckling från 100 startpunkter');
  return true;
}

function calculateReturnTool() {
  const activeMode = document.querySelector('.return-mode-tab.active')?.dataset.returnMode || 'cagr';
  if (activeMode === 'total') {
    return calculateTotalReturnMode();
  } else if (activeMode === 'annual') {
    return calculateAnnualReturnMode();
  } else {
    return calculateCagrMode();
  }
}

if (returnCalculatorForm) {
  returnCalcState = new CalcState({
    id: 'return',
    container: returnCalculatorForm.closest('.calculator-card') || returnCalculatorForm.parentElement,
    form: returnCalculatorForm,
    onCalculate: calculateReturnTool
  });

  document.getElementById('add-annual-year')?.addEventListener('click', () => {
    addAnnualReturnRow();
    returnCalculatorForm.dispatchEvent(new Event('input', { bubbles: true }));
  });
  document.getElementById('remove-annual-year')?.addEventListener('click', () => {
    removeAnnualReturnRow();
    returnCalculatorForm.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

if (returnModeTabs.length) {
  returnModeTabs.forEach((button) => {
    button.addEventListener('click', function () {
      const selectedMode = button.dataset.returnMode || 'cagr';
      returnModeTabs.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });
      document.querySelectorAll('.return-mode-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== `return-${selectedMode}-panel`);
      });
      document.querySelectorAll('.return-results-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== `return-${selectedMode}-results`);
      });

      if (returnCalcState) returnCalcState.setNeutral();
    });
  });
}

if (returnModeTabs.length) {
  returnModeTabs.forEach((button) => {
    button.addEventListener('click', function () {
      const selectedMode = button.dataset.returnMode || 'cagr';
      returnModeTabs.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });
      document.querySelectorAll('.return-mode-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== `return-${selectedMode}-panel`);
      });
      document.querySelectorAll('.return-results-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== `return-${selectedMode}-results`);
      });
    });
  });
}

function parsePurchaseNumber(value) {
  const parsedValue = Number.parseFloat(String(value || '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatPurchaseCurrency(value, currency) {
  return Number.isFinite(value) ? formatStockCurrency(value, currency) : '–';
}

function setPurchaseMessage(message, isError = false) {
  const messageElement = document.getElementById('purchase-message');
  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.classList.toggle('is-error', isError);
}

function renderPurchaseChart(labels, values, currency) {
  const canvas = document.getElementById('purchaseChart');
  if (!canvas || typeof Chart === 'undefined') {
    return;
  }

  if (purchaseChart) {
    purchaseChart.destroy();
  }

  const colors = getChartColors();
  purchaseChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Kumulativt GAV',
        data: values,
        borderColor: colors.primary,
        backgroundColor: colors.primarySoft,
        borderWidth: 3,
        pointRadius: 3,
        fill: true,
        tension: 0.25
      }]
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { labels: { color: colors.text } },
        tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${formatPurchaseCurrency(context.parsed.y, currency)}` } }
      },
      scales: {
        x: { ticks: { color: colors.muted }, grid: { color: colors.grid } },
        y: { beginAtZero: true, ticks: { color: colors.muted, callback: (value) => formatPurchaseCurrency(Number(value), currency) }, grid: { color: colors.grid } }
      }
    }
  });
}

function calculateGavMode() {
  const currency = document.getElementById('gav-currency').value || 'SEK';
  const existingShares = parsePurchaseNumber(document.getElementById('gav-existing-shares').value);
  const currentAverage = parsePurchaseNumber(document.getElementById('gav-current-average').value);
  const newShares = parsePurchaseNumber(document.getElementById('gav-new-shares').value);
  const newSharePrice = parsePurchaseNumber(document.getElementById('gav-new-price').value);
  const brokerage = parsePurchaseNumber(document.getElementById('gav-brokerage').value);

  if ([existingShares, currentAverage, newShares, newSharePrice, brokerage].some((value) => value === null || value < 0)) {
    return 'Ange noll eller större värden för aktier, priser och courtage.';
  }

  const totalShares = existingShares + newShares;
  if (totalShares <= 0) {
    return 'Totalt antal aktier måste vara större än 0.';
  }

  const existingCost = existingShares * currentAverage;
  const newPurchaseCost = newShares * newSharePrice;
  const totalCost = existingCost + newPurchaseCost + brokerage;
  const newAverage = totalCost / totalShares;
  const difference = newAverage - currentAverage;
  const percentageChange = currentAverage > 0 ? (newAverage / currentAverage) - 1 : null;

  document.getElementById('gav-average-result').textContent = formatPurchaseCurrency(newAverage, currency);
  document.getElementById('gav-shares-result').textContent = totalShares.toLocaleString('sv-SE', { maximumFractionDigits: 4 });
  document.getElementById('gav-invested-result').textContent = formatPurchaseCurrency(totalCost, currency);
  document.getElementById('gav-new-money-result').textContent = formatPurchaseCurrency(newPurchaseCost + brokerage, currency);
  document.getElementById('gav-change-result').textContent = formatReturnPercent(percentageChange === null ? null : percentageChange * 100);
  setPurchaseMessage(newAverage < currentAverage
    ? `Ditt GAV sjunker från ${formatPurchaseCurrency(currentAverage, currency)} till ${formatPurchaseCurrency(newAverage, currency)} efter köpet.`
    : newAverage > currentAverage
      ? `Ditt GAV stiger från ${formatPurchaseCurrency(currentAverage, currency)} till ${formatPurchaseCurrency(newAverage, currency)} efter köpet.`
      : 'Ditt GAV är oförändrat efter köpet.');
  renderPurchaseChart(['Före köp', 'Efter köp'], [currentAverage, newAverage], currency);
  return true;
}

function addDcaPurchaseRow(values = {}) {
  const container = document.getElementById('dca-purchases-container');
  if (!container || container.children.length >= 50) {
    return;
  }

  const purchaseNumber = container.children.length + 1;
  const row = document.createElement('div');
  row.className = 'dca-purchase-row';
  row.innerHTML = `<div class="dca-purchase-label">Köp ${purchaseNumber}</div><div class="field-group"><label for="dca-shares-${purchaseNumber}">Antal aktier</label><input id="dca-shares-${purchaseNumber}" class="dca-input dca-shares" type="number" step="0.0001" value="${values.shares ?? ''}" inputmode="decimal" /></div><div class="field-group"><label for="dca-price-${purchaseNumber}">Pris per aktie</label><input id="dca-price-${purchaseNumber}" class="dca-input dca-price" type="number" step="0.01" value="${values.price ?? ''}" inputmode="decimal" /></div><div class="field-group"><label for="dca-brokerage-${purchaseNumber}">Courtage</label><input id="dca-brokerage-${purchaseNumber}" class="dca-input dca-brokerage" type="number" step="0.01" value="${values.brokerage ?? ''}" inputmode="decimal" /></div>`;
  container.appendChild(row);
  const removeButton = document.getElementById('remove-dca-purchase');
  if (removeButton) {
    removeButton.disabled = container.children.length <= 1;
  }
}

function removeDcaPurchaseRow() {
  const container = document.getElementById('dca-purchases-container');
  if (!container || container.children.length <= 1) {
    return;
  }

  container.removeChild(container.lastElementChild);
  const removeButton = document.getElementById('remove-dca-purchase');
  if (removeButton) {
    removeButton.disabled = container.children.length <= 1;
  }
}

function calculateDcaMode() {
  const currency = document.getElementById('dca-currency').value || 'SEK';
  const rows = [...document.querySelectorAll('.dca-purchase-row')];
  const purchases = [];

  for (const row of rows) {
    const sharesInput = row.querySelector('.dca-shares');
    const priceInput = row.querySelector('.dca-price');
    const brokerageInput = row.querySelector('.dca-brokerage');
    const rawValues = [sharesInput.value, priceInput.value, brokerageInput.value];
    if (rawValues.every((value) => String(value).trim() === '')) {
      continue;
    }

    const shares = parsePurchaseNumber(sharesInput.value);
    const price = parsePurchaseNumber(priceInput.value);
    const brokerage = parsePurchaseNumber(brokerageInput.value);
    if ([shares, price, brokerage].some((value) => value === null || value < 0)) {
      return 'Varje ifyllt köp måste ha noll eller större värden för aktier, pris och courtage.';
    }
    purchases.push({ shares, price, brokerage });
  }

  const totalShares = purchases.reduce((sum, purchase) => sum + purchase.shares, 0);
  if (!purchases.length || totalShares <= 0) {
    return 'Ange minst ett köp med totalt antal aktier större än 0.';
  }

  const totalBrokerage = purchases.reduce((sum, purchase) => sum + purchase.brokerage, 0);
  const totalCost = purchases.reduce((sum, purchase) => sum + (purchase.shares * purchase.price) + purchase.brokerage, 0);
  const averagePrice = totalCost / totalShares;
  const prices = purchases.map((purchase) => purchase.price);
  let cumulativeShares = 0;
  let cumulativeCost = 0;
  const cumulativeAverages = purchases.map((purchase) => {
    cumulativeShares += purchase.shares;
    cumulativeCost += (purchase.shares * purchase.price) + purchase.brokerage;
    return cumulativeShares > 0 ? cumulativeCost / cumulativeShares : null;
  });

  document.getElementById('dca-average-result').textContent = formatPurchaseCurrency(averagePrice, currency);
  document.getElementById('dca-shares-result').textContent = totalShares.toLocaleString('sv-SE', { maximumFractionDigits: 4 });
  document.getElementById('dca-invested-result').textContent = formatPurchaseCurrency(totalCost, currency);
  document.getElementById('dca-brokerage-result').textContent = formatPurchaseCurrency(totalBrokerage, currency);
  document.getElementById('dca-count-result').textContent = String(purchases.length);
  document.getElementById('dca-low-result').textContent = formatPurchaseCurrency(Math.min(...prices), currency);
  document.getElementById('dca-high-result').textContent = formatPurchaseCurrency(Math.max(...prices), currency);
  setPurchaseMessage('GAV väger varje köp efter antal aktier och kostnad. Det är därför inte samma sak som att bara ta snittet av inköpspriserna.');
  renderPurchaseChart(purchases.map((_, index) => `Köp ${index + 1}`), cumulativeAverages, currency);
  return true;
}

function calculatePositionSizeMode() {
  const currency = document.getElementById('position-currency').value || 'SEK';
  const portfolioValue = parsePurchaseNumber(document.getElementById('position-portfolio').value);
  const riskPercent = parsePurchaseNumber(document.getElementById('position-risk-percent').value);
  const entryPrice = parsePurchaseNumber(document.getElementById('position-entry-price').value);
  const stopPrice = parsePurchaseNumber(document.getElementById('position-stop-price').value);
  const maxPositionPercent = parsePurchaseNumber(document.getElementById('position-max-percent').value);

  if ([portfolioValue, riskPercent, entryPrice, stopPrice].some((value) => value === null)) {
    return 'Fyll i alla obligatoriska positionsfält.';
  }
  if (portfolioValue <= 0 || riskPercent <= 0 || entryPrice <= 0 || stopPrice < 0 || stopPrice >= entryPrice) {
    return 'Portfölj, risk och ingångspris måste vara större än 0. Stop-loss måste ligga under ingångspriset.';
  }
  if (maxPositionPercent !== null && maxPositionPercent <= 0) {
    return 'Maximal positionsstorlek måste vara större än 0 om den används.';
  }

  const riskAmount = portfolioValue * (riskPercent / 100);
  const riskPerShare = entryPrice - stopPrice;
  const sharesByRisk = Math.floor(riskAmount / riskPerShare);
  const maxSharesByPosition = maxPositionPercent === null ? sharesByRisk : Math.floor((portfolioValue * (maxPositionPercent / 100)) / entryPrice);
  const shares = Math.max(Math.min(sharesByRisk, maxSharesByPosition), 0);
  const positionValue = shares * entryPrice;
  const actualRisk = shares * riskPerShare;
  const positionPercent = portfolioValue > 0 ? (positionValue / portfolioValue) * 100 : null;
  const actualRiskPercent = portfolioValue > 0 ? (actualRisk / portfolioValue) * 100 : null;

  document.getElementById('position-shares-result').textContent = shares.toLocaleString('sv-SE');
  document.getElementById('position-value-result').textContent = formatPurchaseCurrency(positionValue, currency);
  document.getElementById('position-risk-result').textContent = formatPurchaseCurrency(actualRisk, currency);
  document.getElementById('position-risk-percent-result').textContent = formatStockNumber(actualRiskPercent);
  document.getElementById('position-percent-result').textContent = formatStockNumber(positionPercent);
  document.getElementById('position-risk-share-result').textContent = formatPurchaseCurrency(riskPerShare, currency);
  setPurchaseMessage(`Med ${formatReturnPercent(riskPercent).replace('+', '')} risk och en stop-loss ${formatPurchaseCurrency(riskPerShare, currency)} under ingångspriset motsvarar det maximalt ${shares.toLocaleString('sv-SE')} aktier.`);
  return true;
}

function calculatePurchaseTool() {
  const activeMode = document.querySelector('.purchase-mode-tab.active')?.dataset.purchaseMode || 'gav';
  if (activeMode === 'dca') {
    return calculateDcaMode();
  } else if (activeMode === 'position') {
    return calculatePositionSizeMode();
  } else {
    return calculateGavMode();
  }
}

if (purchaseCalculatorForm) {
  purchaseCalcState = new CalcState({
    id: 'purchase',
    container: purchaseCalculatorForm.closest('.calculator-card') || purchaseCalculatorForm.parentElement,
    form: purchaseCalculatorForm,
    onCalculate: calculatePurchaseTool
  });

  document.getElementById('add-dca-purchase')?.addEventListener('click', () => {
    addDcaPurchaseRow();
    purchaseCalculatorForm.dispatchEvent(new Event('input', { bubbles: true }));
  });
  document.getElementById('remove-dca-purchase')?.addEventListener('click', () => {
    removeDcaPurchaseRow();
    purchaseCalculatorForm.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

if (purchaseModeTabs.length) {
  purchaseModeTabs.forEach((button) => {
    button.addEventListener('click', function () {
      const selectedMode = button.dataset.purchaseMode || 'gav';
      purchaseModeTabs.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });
      document.querySelectorAll('.purchase-mode-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== `purchase-${selectedMode}-panel`);
      });
      document.querySelectorAll('.purchase-results-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== `purchase-${selectedMode}-results`);
      });

      if (purchaseCalcState) purchaseCalcState.setNeutral();
    });
  });
}

if (purchaseModeTabs.length) {
  purchaseModeTabs.forEach((button) => {
    button.addEventListener('click', function () {
      const selectedMode = button.dataset.purchaseMode || 'gav';
      purchaseModeTabs.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });
      document.querySelectorAll('.purchase-mode-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== `purchase-${selectedMode}-panel`);
      });
      document.querySelectorAll('.purchase-results-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== `purchase-${selectedMode}-results`);
      });
    });
  });
}

function parseGoalNumber(value) {
  const parsedValue = Number.parseFloat(String(value || '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatGoalCurrency(value, currency) {
  return Number.isFinite(value) ? formatStockCurrency(value, currency) : '–';
}

function formatGoalPercent(value) {
  return Number.isFinite(value)
    ? `${value.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
    : '–';
}

function formatGoalDate(months) {
  if (!Number.isFinite(months) || months < 0) {
    return '–';
  }

  const date = new Date();
  date.setMonth(date.getMonth() + Math.round(months));
  return new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' }).format(date);
}

function formatGoalPeriod(months) {
  if (!Number.isFinite(months) || months < 0) {
    return '–';
  }

  const totalMonths = Math.round(months);
  const years = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;

  if (totalMonths === 0) {
    return '0 mån';
  }

  if (years === 0) {
    return `${remainingMonths} mån`;
  }

  return `${years} år${remainingMonths > 0 ? ` ${remainingMonths} mån` : ''}`;
}

function setGoalMessage(message, isError = false) {
  const messageElement = document.getElementById('goal-message');
  if (!messageElement) {
    return;
  }
  messageElement.textContent = message;
  messageElement.classList.toggle('is-error', isError);
}

function getGoalAssumptions(prefix) {
  const annualReturn = parseGoalNumber(document.getElementById(`${prefix}-return`).value);
  const annualFee = parseGoalNumber(document.getElementById(`${prefix}-fee`).value);
  const inflation = parseGoalNumber(document.getElementById(`${prefix}-inflation`).value);
  const moneyMode = document.getElementById(`${prefix}-money-mode`).value;

  if ([annualReturn, annualFee, inflation].some((value) => value === null || value < 0)) {
    return { error: 'Avkastning, avgift och inflation måste vara noll eller större.' };
  }

  const netAnnualReturn = (1 + (annualReturn / 100)) * (1 - (annualFee / 100)) - 1;
  const selectedAnnualReturn = moneyMode === 'real'
    ? ((1 + netAnnualReturn) / (1 + (inflation / 100))) - 1
    : netAnnualReturn;

  if (!Number.isFinite(selectedAnnualReturn) || selectedAnnualReturn <= -1) {
    return { error: 'Den valda avkastningen och inflationen ger en ogiltig real avkastning.' };
  }

  const monthlyRate = Math.pow(1 + selectedAnnualReturn, 1 / 12) - 1;
  if (!Number.isFinite(monthlyRate)) {
    return { error: 'Antagandena ger ett för stort eller ogiltigt beräkningsvärde.' };
  }

  return { annualReturn, annualFee, inflation, moneyMode, netAnnualReturn, selectedAnnualReturn, monthlyRate };
}

function projectGoalValue(startCapital, monthlySavings, monthlyRate, months) {
  const growthFactor = Math.pow(1 + monthlyRate, months);
  if (!Number.isFinite(growthFactor)) {
    return null;
  }

  const startValue = startCapital * growthFactor;
  const contributionValue = monthlyRate === 0
    ? monthlySavings * months
    : monthlySavings * ((growthFactor - 1) / monthlyRate);
  const value = startValue + contributionValue;
  return Number.isFinite(value) ? value : null;
}

function buildGoalPath(startCapital, monthlySavings, monthlyRate, months) {
  const labels = ['0'];
  const values = [startCapital];
  const checkpoints = [];
  for (let month = 12; month < months; month += 12) {
    checkpoints.push(month);
  }
  if (months > 0) {
    checkpoints.push(months);
  }

  checkpoints.forEach((month) => {
    labels.push(month % 12 === 0 ? String(month / 12) : formatGoalPeriod(month));
    values.push(projectGoalValue(startCapital, monthlySavings, monthlyRate, month));
  });
  return { labels, values };
}

function renderGoalChart(path, currency, target, moneyMode) {
  const canvas = document.getElementById('goalChart');
  if (!canvas || typeof Chart === 'undefined') {
    return;
  }

  if (goalChart) {
    goalChart.destroy();
  }

  const colors = getChartColors();
  const datasets = [{
    label: moneyMode === 'real' ? 'Utveckling i dagens penningvärde' : 'Portföljvärde',
    data: path.values,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    borderWidth: 3,
    pointRadius: 2,
    fill: true,
    tension: 0.25
  }];
  if (Number.isFinite(target)) {
    datasets.push({
      label: 'Målkapital',
      data: path.values.map(() => target),
      borderColor: colors.accent,
      borderWidth: 2,
      borderDash: [6, 5],
      pointRadius: 0,
      fill: false
    });
  }

  goalChart = new Chart(canvas, {
    type: 'line',
    data: { labels: path.labels, datasets },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { labels: { color: colors.text } },
        tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${formatGoalCurrency(context.parsed.y, currency)}` } }
      },
      scales: {
        x: { title: { display: true, text: 'År', color: colors.muted }, ticks: { color: colors.muted }, grid: { color: colors.grid } },
        y: { beginAtZero: true, ticks: { color: colors.muted, callback: (value) => formatGoalCurrency(Number(value), currency) }, grid: { color: colors.grid } }
      }
    }
  });
}

function updateGoalProgress(startCapital, targetCapital, visible) {
  const panel = document.getElementById('goal-progress-panel');
  if (!panel) {
    return;
  }

  panel.classList.toggle('hidden', !visible);
  if (!visible) {
    return;
  }

  const progress = targetCapital > 0 ? Math.min(100, Math.max(0, (startCapital / targetCapital) * 100)) : 0;
  document.getElementById('goal-progress-percent').textContent = formatGoalPercent(progress);
  document.getElementById('goal-progress-bar').style.width = `${progress}%`;
}

function updateGoalNote(moneyMode) {
  const note = document.getElementById('goal-note');
  if (note) {
    note.textContent = moneyMode === 'real'
      ? 'Resultatet visas i dagens penningvärde. Beräkningen bygger på en jämn genomsnittlig avkastning. Verklig avkastning varierar från år till år.'
      : 'Beräkningen bygger på en jämn genomsnittlig avkastning. Verklig avkastning varierar från år till år.';
  }
}

function calculateRequiredMonthlySavings() {
  const currency = document.getElementById('goal-monthly-currency').value || 'SEK';
  const target = parseGoalNumber(document.getElementById('goal-monthly-target').value);
  const start = parseGoalNumber(document.getElementById('goal-monthly-start').value);
  const years = parseGoalNumber(document.getElementById('goal-monthly-years').value);
  const assumptions = getGoalAssumptions('goal-monthly');

  if (target === null || start === null || years === null || target <= 0 || start < 0 || years <= 0 || !Number.isInteger(years)) {
    return 'Målkapital måste vara större än 0. Startkapital och antal år måste vara giltiga och noll eller större.';
  }
  if (assumptions.error) {
    return assumptions.error;
  }

  const months = years * 12;
  const futureStart = projectGoalValue(start, 0, assumptions.monthlyRate, months);
  if (futureStart === null) {
    return 'Antagandena ger ett för stort eller ogiltigt beräkningsvärde.';
  }
  const remainingFutureValue = target - futureStart;
  let monthlySavings = 0;
  if (remainingFutureValue > 0) {
    const growthFactor = Math.pow(1 + assumptions.monthlyRate, months);
    monthlySavings = assumptions.monthlyRate === 0
      ? remainingFutureValue / months
      : remainingFutureValue * assumptions.monthlyRate / (growthFactor - 1);
  }
  if (!Number.isFinite(monthlySavings) || monthlySavings < 0) {
    return 'Det gick inte att beräkna ett giltigt månadssparande med dessa antaganden.';
  }

  const ownSavings = start + (monthlySavings * months);
  const projectedValue = projectGoalValue(start, monthlySavings, assumptions.monthlyRate, months);
  const estimatedReturn = projectedValue === null ? null : projectedValue - ownSavings;
  const returnShare = target > 0 ? Math.max(0, (estimatedReturn / target) * 100) : null;
  document.getElementById('monthly-savings-result').textContent = formatGoalCurrency(monthlySavings, currency);
  document.getElementById('monthly-target-result').textContent = formatGoalCurrency(target, currency);
  document.getElementById('monthly-start-result').textContent = formatGoalCurrency(start, currency);
  document.getElementById('monthly-own-result').textContent = formatGoalCurrency(ownSavings, currency);
  document.getElementById('monthly-return-result').textContent = formatGoalCurrency(estimatedReturn, currency);
  document.getElementById('monthly-period-result').textContent = formatGoalPeriod(months);
  document.getElementById('monthly-return-share-result').textContent = formatGoalPercent(returnShare);
  document.getElementById('monthly-summary').textContent = monthlySavings === 0
    ? 'Med dessa antaganden kan ditt nuvarande kapital nå målet utan ytterligare månadssparande.'
    : `För att nå ${formatGoalCurrency(target, currency)} på ${formatGoalPeriod(months)} behöver du spara cirka ${formatGoalCurrency(monthlySavings, currency)} per månad med dessa antaganden.`;
  setGoalMessage('Beräkningen bygger på en jämn genomsnittlig avkastning. Verklig avkastning varierar från år till år.');
  updateGoalNote(assumptions.moneyMode);
  updateGoalProgress(start, target, true);
  renderGoalChart(buildGoalPath(start, monthlySavings, assumptions.monthlyRate, months), currency, target, assumptions.moneyMode);
  return true;
}

function calculateTimeToGoal() {
  const currency = document.getElementById('goal-time-currency').value || 'SEK';
  const target = parseGoalNumber(document.getElementById('goal-time-target').value);
  const start = parseGoalNumber(document.getElementById('goal-time-start').value);
  const monthlySavings = parseGoalNumber(document.getElementById('goal-time-savings').value);
  const assumptions = getGoalAssumptions('goal-time');

  if (target === null || start === null || monthlySavings === null || target <= 0 || start < 0 || monthlySavings < 0) {
    return 'Målkapital måste vara större än 0. Startkapital och månadssparande måste vara noll eller större.';
  }
  if (assumptions.error) {
    return assumptions.error;
  }

  let months = start >= target ? 0 : null;
  let value = start;
  if (months === null) {
    for (let month = 1; month <= 1200; month += 1) {
      value *= 1 + assumptions.monthlyRate;
      value += monthlySavings;
      if (value >= target) {
        months = month;
        break;
      }
    }
  }

  const reached = months !== null;
  const resultMonths = reached ? months : 1200;
  const projectedValue = reached ? (months === 0 ? start : value) : projectGoalValue(start, monthlySavings, assumptions.monthlyRate, 1200);
  const totalInvested = start + (monthlySavings * resultMonths);
  const estimatedReturn = reached ? projectedValue - totalInvested : null;
  document.getElementById('time-result').textContent = reached ? formatGoalPeriod(months) : 'Ej uppnått';
  document.getElementById('time-date-result').textContent = reached ? formatGoalDate(months) : '–';
  document.getElementById('time-target-result').textContent = formatGoalCurrency(target, currency);
  document.getElementById('time-invested-result').textContent = formatGoalCurrency(totalInvested, currency);
  document.getElementById('time-return-result').textContent = formatGoalCurrency(estimatedReturn, currency);
  document.getElementById('time-progress-result').textContent = formatGoalPercent(target > 0 ? Math.min(100, (start / target) * 100) : 0);
  setGoalMessage(reached ? 'Beräkningen bygger på en jämn genomsnittlig avkastning. Verklig avkastning varierar från år till år.' : 'Målet nås inte inom 100 år med dessa antaganden.', !reached);
  updateGoalNote(assumptions.moneyMode);
  updateGoalProgress(start, target, true);
  const path = buildGoalPath(start, monthlySavings, assumptions.monthlyRate, resultMonths);
  if (reached && months > 0 && path.values[path.values.length - 1] !== projectedValue) {
    path.values[path.values.length - 1] = projectedValue;
  }
  renderGoalChart(path, currency, target, assumptions.moneyMode);
  return true;
}

function calculateTargetCapital() {
  const currency = document.getElementById('goal-capital-currency').value || 'SEK';
  const start = parseGoalNumber(document.getElementById('goal-capital-start').value);
  const monthlySavings = parseGoalNumber(document.getElementById('goal-capital-savings').value);
  const years = parseGoalNumber(document.getElementById('goal-capital-years').value);
  const assumptions = getGoalAssumptions('goal-capital');

  if (start === null || monthlySavings === null || years === null || start < 0 || monthlySavings < 0 || years <= 0 || !Number.isInteger(years)) {
    return 'Startkapital, månadssparande och antal år måste vara giltiga och noll eller större. Antal år måste vara större än 0.';
  }
  if (assumptions.error) {
    return assumptions.error;
  }

  const months = years * 12;
  const futureValue = projectGoalValue(start, monthlySavings, assumptions.monthlyRate, months);
  if (futureValue === null) {
    return 'Antagandena ger ett för stort eller ogiltigt beräkningsvärde.';
  }
  const totalInvested = start + (monthlySavings * months);
  const estimatedReturn = futureValue - totalInvested;
  const returnShare = futureValue > 0 ? Math.max(0, (estimatedReturn / futureValue) * 100) : null;
  document.getElementById('capital-result').textContent = formatGoalCurrency(futureValue, currency);
  document.getElementById('capital-invested-result').textContent = formatGoalCurrency(totalInvested, currency);
  document.getElementById('capital-return-result').textContent = formatGoalCurrency(estimatedReturn, currency);
  document.getElementById('capital-return-share-result').textContent = formatGoalPercent(returnShare);
  document.getElementById('capital-period-result').textContent = formatGoalPeriod(months);
  setGoalMessage('Beräkningen bygger på en jämn genomsnittlig avkastning. Verklig avkastning varierar från år till år.');
  updateGoalNote(assumptions.moneyMode);
  updateGoalProgress(0, 0, false);
  renderGoalChart(buildGoalPath(start, monthlySavings, assumptions.monthlyRate, months), currency, null, assumptions.moneyMode);
  return true;
}

function calculateGoalTool() {
  const activeMode = document.querySelector('.goal-mode-tab.active')?.dataset.goalMode || 'monthly';
  if (activeMode === 'time') {
    return calculateTimeToGoal();
  } else if (activeMode === 'capital') {
    return calculateTargetCapital();
  } else {
    return calculateRequiredMonthlySavings();
  }
}

if (goalCalculatorForm) {
  goalCalcState = new CalcState({
    id: 'goal',
    container: goalCalculatorForm.closest('.calculator-card') || goalCalculatorForm.parentElement,
    form: goalCalculatorForm,
    onCalculate: calculateGoalTool
  });
}

if (goalModeTabs.length) {
  goalModeTabs.forEach((button) => {
    button.addEventListener('click', function () {
      const selectedMode = button.dataset.goalMode || 'monthly';
      goalModeTabs.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });
      document.querySelectorAll('.goal-mode-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== `goal-${selectedMode}-panel`);
      });
      document.querySelectorAll('.goal-results-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== `goal-${selectedMode}-results`);
      });

      if (goalCalcState) goalCalcState.setNeutral();
    });
  });
}

const MORTGAGE_RULES = {
  effectiveFrom: '2026-04-01',
  newPurchaseMaxLTV: 0.90,
  additionalLoanMaxLTV: 0.80,
  amortization: {
    above70: 0.02,
    above50: 0.01,
    atOrBelow50: 0
  }
};

function parseMortgageNumber(value) {
  const parsedValue = Number.parseFloat(String(value || '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatMortgageCurrency(value, currency) {
  return Number.isFinite(value) ? formatStockCurrency(value, currency) : '–';
}

function formatMortgagePercent(value) {
  return Number.isFinite(value) ? `${value.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %` : '–';
}

function getStatutoryAmortizationRate(ltv) {
  if (ltv > 0.70) {
    return MORTGAGE_RULES.amortization.above70;
  }
  if (ltv > 0.50) {
    return MORTGAGE_RULES.amortization.above50;
  }
  return MORTGAGE_RULES.amortization.atOrBelow50;
}

function setMortgageMessage(message, isError = false) {
  const messageElement = document.getElementById('mortgage-message');
  if (!messageElement) {
    return;
  }
  messageElement.textContent = message;
  messageElement.classList.toggle('is-error', isError);
}

function getMortgageAmortizationRate(mode, ltv, customRate) {
  return mode === 'custom' ? customRate / 100 : getStatutoryAmortizationRate(ltv);
}

function renderMortgageChart(labels, values, propertyValue, currency) {
  const canvas = document.getElementById('mortgageChart');
  if (!canvas || typeof Chart === 'undefined') {
    return;
  }
  if (mortgageChart) {
    mortgageChart.destroy();
  }

  const colors = getChartColors();
  const datasets = [{
    label: 'Kvarvarande bolån',
    data: values,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    borderWidth: 3,
    pointRadius: 2,
    fill: true,
    tension: 0.25
  }];
  if (propertyValue > 0) {
    datasets.push({ label: '70 % belåningsgrad', data: labels.map(() => propertyValue * 0.70), borderColor: colors.warning, borderWidth: 2, borderDash: [6, 5], pointRadius: 0, fill: false });
    datasets.push({ label: '50 % belåningsgrad', data: labels.map(() => propertyValue * 0.50), borderColor: colors.accent, borderWidth: 2, borderDash: [6, 5], pointRadius: 0, fill: false });
  }

  mortgageChart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { labels: { color: colors.text } },
        tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${formatMortgageCurrency(context.parsed.y, currency)}` } }
      },
      scales: {
        x: { title: { display: true, text: 'År', color: colors.muted }, ticks: { color: colors.muted }, grid: { color: colors.grid } },
        y: { beginAtZero: true, ticks: { color: colors.muted, callback: (value) => formatMortgageCurrency(Number(value), currency) }, grid: { color: colors.grid } }
      }
    }
  });
}

function calculateMortgageMode() {
  const currency = document.getElementById('mortgage-currency').value || 'SEK';
  const homePrice = parseMortgageNumber(document.getElementById('mortgage-home-price').value);
  const cashContribution = parseMortgageNumber(document.getElementById('mortgage-cash').value);
  const interestRate = parseMortgageNumber(document.getElementById('mortgage-interest').value);
  const amortizationMode = document.getElementById('mortgage-amortization-mode').value;
  const customAmortization = parseMortgageNumber(document.getElementById('mortgage-custom-amortization').value);

  if ([homePrice, cashContribution, interestRate].some((value) => value === null) || homePrice <= 0 || cashContribution < 0 || interestRate < 0 || (amortizationMode === 'custom' && (customAmortization === null || customAmortization < 0))) {
    return 'Ange ett bostadspris större än 0 och giltiga, noll eller större värden.';
  }

  const loanAmount = Math.max(homePrice - cashContribution, 0);
  const ltv = loanAmount / homePrice;
  const statutoryRate = getStatutoryAmortizationRate(ltv);
  const paymentRate = getMortgageAmortizationRate(amortizationMode, ltv, customAmortization || 0);
  const annualAmortization = loanAmount * paymentRate;
  const monthlyAmortization = annualAmortization / 12;
  const monthlyInterest = (loanAmount * (interestRate / 100)) / 12;
  const monthlyPayment = monthlyInterest + monthlyAmortization;
  const minimumCash = homePrice * (1 - MORTGAGE_RULES.newPurchaseMaxLTV);

  document.getElementById('mortgage-loan-result').textContent = formatMortgageCurrency(loanAmount, currency);
  document.getElementById('mortgage-payment-result').textContent = formatMortgageCurrency(monthlyPayment, currency);
  document.getElementById('mortgage-cash-result').textContent = formatMortgageCurrency(cashContribution, currency);
  document.getElementById('mortgage-ltv-result').textContent = formatMortgagePercent(ltv * 100);
  document.getElementById('mortgage-interest-result').textContent = formatMortgageCurrency(monthlyInterest, currency);
  document.getElementById('mortgage-amortization-result').textContent = formatMortgageCurrency(monthlyAmortization, currency);
  document.getElementById('mortgage-rate-result').textContent = formatMortgagePercent(statutoryRate * 100);
  document.getElementById('mortgage-minimum-cash-result').textContent = formatMortgageCurrency(minimumCash, currency);

  if (ltv > MORTGAGE_RULES.newPurchaseMaxLTV) {
    setMortgageMessage('Observera: Bolånet motsvarar mer än 90 % av bostadens värde och ligger över bolånetaket för ett nytt bostadsköp.', true);
  } else if (ltv > 0.70) {
    setMortgageMessage(`Belåningsgrad: ${formatMortgagePercent(ltv * 100)}. Det innebär minst 2 % amortering per år enligt nuvarande regler.`);
  } else if (ltv > 0.50) {
    setMortgageMessage(`Belåningsgrad: ${formatMortgagePercent(ltv * 100)}. Det innebär minst 1 % amortering per år enligt nuvarande regler.`);
  } else {
    setMortgageMessage(`Belåningsgrad: ${formatMortgagePercent(ltv * 100)} eller lägre. Det finns inget lagstadgat amorteringskrav baserat på belåningsgrad i detta scenario.`);
  }
  document.getElementById('mortgage-rule-warning').textContent = cashContribution < minimumCash
    ? 'Kontantinsatsen ligger under 10 % av bostadens pris enligt bolånetaket för nya bostadsköp från 1 april 2026.'
    : 'Den angivna kontantinsatsen når minst 10 % av bostadens pris.';
  renderMortgageChart(['0'], [loanAmount], homePrice, currency);
  return true;
}

function simulateMortgage(loanAmount, propertyValue, interestRate, amortizationMode, customAmortization, years) {
  let balance = loanAmount;
  let totalInterest = 0;
  let totalAmortization = 0;
  let paidOffMonth = balance === 0 ? 0 : null;
  let timeTo70 = loanAmount / propertyValue <= 0.70 ? 0 : null;
  let timeTo50 = loanAmount / propertyValue <= 0.50 ? 0 : null;
  const labels = ['0'];
  const values = [balance];
  const months = years * 12;

  for (let month = 1; month <= months && balance > 0; month += 1) {
    const monthlyInterest = balance * (interestRate / 100) / 12;
    const currentLtv = propertyValue > 0 ? balance / propertyValue : Infinity;
    const rate = getMortgageAmortizationRate(amortizationMode, currentLtv, customAmortization || 0);
    const monthlyAmortization = Math.min(balance, balance * rate / 12);
    totalInterest += monthlyInterest;
    totalAmortization += monthlyAmortization;
    balance = Math.max(0, balance - monthlyAmortization);
    if (balance === 0 && paidOffMonth === null) paidOffMonth = month;

    if (timeTo70 === null && balance / propertyValue <= 0.70) timeTo70 = month;
    if (timeTo50 === null && balance / propertyValue <= 0.50) timeTo50 = month;
    if (month % 12 === 0 || balance === 0) {
      labels.push(String(Math.ceil(month / 12)));
      values.push(balance);
    }
  }
  return { balance, totalInterest, totalAmortization, paidOffMonth, timeTo70, timeTo50, labels, values };
}

function formatThresholdTime(months, balance) {
  if (months === 0) return 'Redan uppnått';
  if (months === null) return balance <= 0 ? 'Lånet är återbetalt' : 'Inte inom perioden';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return `${years} år${remainingMonths > 0 ? ` ${remainingMonths} mån` : ''}`;
}

function calculateAmortizationMode() {
  const currency = document.getElementById('amortization-currency').value || 'SEK';
  const loanAmount = parseMortgageNumber(document.getElementById('amortization-loan').value);
  const propertyValue = parseMortgageNumber(document.getElementById('amortization-property').value);
  const interestRate = parseMortgageNumber(document.getElementById('amortization-interest').value);
  const years = parseMortgageNumber(document.getElementById('amortization-years').value);
  const mode = document.getElementById('amortization-mode').value;
  const customRate = parseMortgageNumber(document.getElementById('amortization-custom-rate').value);

  if ([loanAmount, propertyValue, interestRate, years].some((value) => value === null) || loanAmount < 0 || propertyValue <= 0 || interestRate < 0 || years < 1 || years > 50 || !Number.isInteger(years) || (mode === 'custom' && (customRate === null || customRate < 0))) {
    return 'Ange ett giltigt bolån, bostadsvärde, ränta och en projektion på 1–50 hela år.';
  }

  const result = simulateMortgage(loanAmount, propertyValue, interestRate, mode, customRate || 0, years);
  const initialLtv = loanAmount / propertyValue;
  document.getElementById('amortization-debt-result').textContent = formatMortgageCurrency(result.balance, currency);
  document.getElementById('amortization-total-result').textContent = formatMortgageCurrency(result.totalAmortization, currency);
  document.getElementById('amortization-interest-result').textContent = formatMortgageCurrency(result.totalInterest, currency);
  document.getElementById('amortization-ltv-result').textContent = formatMortgagePercent((result.balance / propertyValue) * 100);
  document.getElementById('amortization-70-result').textContent = formatThresholdTime(result.timeTo70, result.balance);
  document.getElementById('amortization-50-result').textContent = formatThresholdTime(result.timeTo50, result.balance);
  setMortgageMessage(result.balance === 0 ? `Lånet är återbetalt efter cirka ${formatThresholdTime(result.paidOffMonth, result.balance)}.` : 'Detta är en illustrativ projektion. Bankens amorteringsunderlag och villkor kan påverka exakt timing.');
  document.getElementById('amortization-start-ltv').textContent = formatMortgagePercent(initialLtv * 100);
  renderMortgageChart(result.labels, result.values, propertyValue, currency);
  return true;
}

function calculateInterestMode() {
  const currency = document.getElementById('interest-currency').value || 'SEK';
  const loanAmount = parseMortgageNumber(document.getElementById('interest-loan').value);
  const propertyValue = parseMortgageNumber(document.getElementById('interest-property').value);
  const currentRate = parseMortgageNumber(document.getElementById('interest-current-rate').value);
  const mode = document.getElementById('interest-amortization-mode').value;
  const customRate = parseMortgageNumber(document.getElementById('interest-custom-amortization').value);

  if ([loanAmount, propertyValue, currentRate].some((value) => value === null) || loanAmount < 0 || propertyValue <= 0 || currentRate < 0 || (mode === 'custom' && (customRate === null || customRate < 0))) {
    return 'Ange giltiga värden för bolån, bostadsvärde, ränta och amortering.';
  }

  const ltv = loanAmount / propertyValue;
  const amortizationRate = getMortgageAmortizationRate(mode, ltv, customRate || 0);
  const monthlyAmortization = loanAmount * amortizationRate / 12;
  const rates = [Math.max(0, currentRate - 1), currentRate, currentRate + 1, currentRate + 2];
  const rows = rates.map((rate) => ({ rate, monthlyInterest: loanAmount * (rate / 100) / 12, monthlyPayment: loanAmount * (rate / 100) / 12 + monthlyAmortization }));
  document.getElementById('interest-amortization-result').textContent = formatMortgageCurrency(monthlyAmortization, currency);
  document.getElementById('interest-point-result').textContent = formatMortgageCurrency(loanAmount * 0.01 / 12, currency);
  document.getElementById('interest-table-body').innerHTML = rows.map((row, index) => `<tr><th scope="row">${index === 0 ? '−1 procentenhet' : index === 1 ? 'Nuvarande' : `+${index} procentenhet${index > 1 ? 'er' : ''}`}</th><td>${formatMortgageCurrency(row.monthlyInterest, currency)}</td><td>${formatMortgageCurrency(monthlyAmortization, currency)}</td><td>${formatMortgageCurrency(row.monthlyPayment, currency)}</td><td>${index === 1 ? '–' : formatMortgageCurrency(row.monthlyPayment - rows[1].monthlyPayment, currency)}</td></tr>`).join('');
  setMortgageMessage('Räntejämförelsen visar hur samma lån och amortering påverkas av olika räntescenarier.');
  return true;
}

function calculateMortgageTool() {
  const activeMode = document.querySelector('.mortgage-mode-tab.active')?.dataset.mortgageMode || 'mortgage';
  if (activeMode === 'amortization') return calculateAmortizationMode();
  else if (activeMode === 'interest') return calculateInterestMode();
  else return calculateMortgageMode();
}

if (mortgageCalculatorForm) {
  mortgageCalcState = new CalcState({
    id: 'mortgage',
    container: mortgageCalculatorForm.closest('.calculator-card') || mortgageCalculatorForm.parentElement,
    form: mortgageCalculatorForm,
    onCalculate: calculateMortgageTool
  });

  ['mortgage-amortization-mode', 'amortization-mode', 'interest-amortization-mode'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', function () {
      const customId = id === 'mortgage-amortization-mode' ? 'mortgage-custom-amortization' : id === 'amortization-mode' ? 'amortization-custom-rate' : 'interest-custom-amortization';
      document.getElementById(customId)?.closest('.field-group')?.classList.toggle('hidden', this.value !== 'custom');
    });
  });
}

if (mortgageModeTabs.length) {
  mortgageModeTabs.forEach((button) => {
    button.addEventListener('click', function () {
      const selectedMode = button.dataset.mortgageMode || 'mortgage';
      mortgageModeTabs.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });
      document.querySelectorAll('.mortgage-mode-panel').forEach((panel) => panel.classList.toggle('hidden', panel.id !== `mortgage-${selectedMode}-panel`));
      document.querySelectorAll('.mortgage-results-panel').forEach((panel) => panel.classList.toggle('hidden', panel.id !== `mortgage-${selectedMode}-results`));

      if (mortgageCalcState) mortgageCalcState.setNeutral();
    });
  });
}

document.querySelectorAll('.chart-view-tab').forEach((button) => {
  button.addEventListener('click', function () {
    setFireChartView(button.dataset.fireChartView || 'path');
  });
});

const firePostFireCallout = document.getElementById('fire-post-fire-callout');
if (firePostFireCallout) {
  firePostFireCallout.addEventListener('click', showPostFireProjection);
}

if (dividendForm) {
  dividendForm.addEventListener('submit', function (event) {
    event.preventDefault();
    calculateDividendInvestment();
  });
}

const dividendToggle = document.getElementById('dividend-aterinvestera');
if (dividendToggle) {
  dividendToggle.addEventListener('change', function () {
    updateDividendResultLabel();
    calculateDividendInvestment();
  });
}

function initPage() {
  initTheme();
  initNtmToday();
  injectInstagramPromo();
  initYoutubePosts();
  initPostSystem();
  initToolsDirectory();
}

function initToolsDirectory() {
  const directory = document.querySelector('[data-tools-directory]');
  if (!directory) {
    return;
  }

  const searchInput = directory.querySelector('#tool-search');
  const filterButtons = [...directory.querySelectorAll('[data-tool-filter]')];
  const cards = [...directory.querySelectorAll('[data-tool-card]')];
  const categories = [...directory.querySelectorAll('[data-tool-category]')];
  const emptyState = directory.querySelector('#tools-empty-state');
  let activeCategory = 'all';
  let hadSearchTerm = false;
  let wasMobile = window.matchMedia('(max-width: 720px)').matches;

  function setCategoryExpanded(category, expanded) {
    const toggle = category.querySelector('.tools-category-toggle');
    category.classList.toggle('is-collapsed', !expanded);
    toggle?.setAttribute('aria-expanded', String(expanded));
  }

  function resetCategoryExpansion(visibleCategories) {
    const mobile = window.matchMedia('(max-width: 720px)').matches;
    let openedFirst = false;
    categories.forEach((category) => {
      const shouldOpen = !mobile || (visibleCategories.includes(category) && !openedFirst);
      setCategoryExpanded(category, shouldOpen);
      if (shouldOpen && mobile) {
        openedFirst = true;
      }
    });
  }

  categories.forEach((category) => {
    const toggle = category.querySelector('.tools-category-toggle');
    const count = category.querySelector('.tools-category-count');
    const categoryCards = category.querySelectorAll('[data-tool-card]');
    if (count) {
      count.textContent = String(categoryCards.length);
    }
    toggle?.addEventListener('click', () => {
      const searchTerm = normalizeToolSearch(searchInput?.value).trim();
      if (searchTerm || activeCategory !== 'all') {
        return;
      }
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      setCategoryExpanded(category, !isExpanded);
    });
  });

  function normalizeToolSearch(value) {
    return String(value || '')
      .toLocaleLowerCase('sv-SE')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function applyToolFilters() {
    const searchTerm = normalizeToolSearch(searchInput?.value).trim();
    let visibleCards = 0;

    cards.forEach((card) => {
      const matchesCategory = activeCategory === 'all' || card.dataset.category === activeCategory;
      const searchContent = normalizeToolSearch(`${card.textContent} ${card.dataset.search || ''}`);
      const matchesSearch = !searchTerm || searchContent.includes(searchTerm);
      const isVisible = matchesCategory && matchesSearch;
      card.hidden = !isVisible;
      if (isVisible) {
        visibleCards += 1;
      }
    });

    const visibleCategories = categories.filter((category) => {
      const hasVisibleCard = [...category.querySelectorAll('[data-tool-card]')].some((card) => !card.hidden);
      category.hidden = !hasVisibleCard;
      return hasVisibleCard;
    });

    if (searchTerm || activeCategory !== 'all') {
      visibleCategories.forEach((category) => setCategoryExpanded(category, true));
    } else if (!searchTerm && hadSearchTerm) {
      resetCategoryExpansion(visibleCategories);
    }

    hadSearchTerm = Boolean(searchTerm);
    emptyState.hidden = visibleCards > 0;
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', function () {
      const previousCategory = activeCategory;
      activeCategory = button.dataset.toolFilter || 'all';
      filterButtons.forEach((filter) => {
        const isActive = filter === button;
        filter.classList.toggle('is-active', isActive);
        filter.setAttribute('aria-pressed', String(isActive));
      });
      if (activeCategory === 'all' && previousCategory !== 'all' && !normalizeToolSearch(searchInput?.value).trim()) {
        resetCategoryExpansion(categories);
      }
      if (activeCategory !== 'all') {
        categories.forEach((category) => setCategoryExpanded(category, category.dataset.toolCategory === activeCategory));
      }
      applyToolFilters();
    });
  });

  searchInput?.addEventListener('input', applyToolFilters);
  window.matchMedia('(max-width: 720px)').addEventListener?.('change', () => {
    const mobile = window.matchMedia('(max-width: 720px)').matches;
    if (mobile !== wasMobile && !normalizeToolSearch(searchInput?.value).trim() && activeCategory === 'all') {
      resetCategoryExpansion(categories.filter((category) => !category.hidden));
    }
    wasMobile = mobile;
  });
  resetCategoryExpansion(categories);
  applyToolFilters();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage, { once: true });
} else {
  initPage();
}
if (modeTabs.length) {
  setActiveMode('growth');
}
if (form) {
  growthCalcState = new CalcState({
    id: 'growth',
    container: '#growth-mode-panel',
    form: '#calculator-form',
    onCalculate: calculateInvestment
  });
}
if (dividendForm) {
  dividendCalcState = new CalcState({
    id: 'dividend',
    container: '#dividend-mode-panel',
    form: '#dividend-form',
    onCalculate: calculateDividendInvestment
  });
}

function initSavedInvestmentScenarios() {
  const scenarioSelect = document.getElementById('saved-scenario-select');
  const saveButton = document.getElementById('save-scenario');
  const loadButton = document.getElementById('load-scenario');
  const deleteButton = document.getElementById('delete-scenario');
  const nameInput = document.getElementById('saved-scenario-name');
  const statusElement = document.getElementById('saved-scenario-status');
  const countElement = document.getElementById('saved-scenarios-count');
  if (!scenarioSelect || !saveButton || !loadButton || !deleteButton || !nameInput) return;

  const calculatorId = 'ranta-pa-ranta';
  const maxScenarios = 10;
  const getModeForm = (mode) => mode === 'dividend' ? dividendForm : form;
  const getModeState = (mode) => mode === 'dividend' ? dividendCalcState : growthCalcState;
  let scenarios = [];

  const setStatus = (message, isError = false) => {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.classList.toggle('is-error', isError);
  };

  const render = (selectedId = scenarioSelect.value) => {
    const result = window.NTMScenarioStorage.get(calculatorId);
    scenarios = result.scenarios;
    scenarioSelect.innerHTML = '<option value="">Välj ett scenario</option>';
    scenarios.forEach((scenario) => {
      const option = document.createElement('option');
      option.value = scenario.id;
      option.textContent = `${scenario.name} (${scenario.mode === 'dividend' ? 'Utdelning' : 'Tillväxt'})`;
      scenarioSelect.appendChild(option);
    });
    scenarioSelect.value = scenarios.some((scenario) => scenario.id === selectedId) ? selectedId : '';
    const hasSelection = Boolean(scenarioSelect.value);
    loadButton.disabled = !hasSelection;
    deleteButton.disabled = !hasSelection;
    if (countElement) countElement.textContent = `${scenarios.length}/${maxScenarios}`;
    if (result.error) setStatus(result.error, true);
  };

  scenarioSelect.addEventListener('change', () => {
    const hasSelection = Boolean(scenarioSelect.value);
    loadButton.disabled = !hasSelection;
    deleteButton.disabled = !hasSelection;
  });

  saveButton.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      setStatus('Ange ett namn på scenariot.', true);
      nameInput.focus();
      return;
    }
    const mode = getActiveMode();
    const result = window.NTMScenarioStorage.save(calculatorId, {
      name,
      mode,
      inputs: window.NTMScenarioStorage.snapshotForm(getModeForm(mode))
    }, maxScenarios);
    if (!result.ok) {
      setStatus(result.error, true);
      return;
    }
    nameInput.value = '';
    render(result.scenario.id);
    setStatus('Scenariot sparades lokalt.');
  });

  loadButton.addEventListener('click', () => {
    const scenario = scenarios.find((item) => item.id === scenarioSelect.value);
    if (!scenario) return;
    const hadExistingResult = [growthCalcState, dividendCalcState]
      .some((state) => state?.state === 'calculated' || state?.state === 'stale');
    setActiveMode(scenario.mode);
    window.NTMScenarioStorage.restoreFormSnapshot(getModeForm(scenario.mode), scenario.inputs);
    const modeState = getModeState(scenario.mode);
    if (hadExistingResult) {
      modeState?.setStaleFromLoad();
    } else {
      modeState?.setNeutral();
    }
    setStatus('Scenariot laddades. Klicka på Beräkna för att uppdatera resultatet.');
  });

  deleteButton.addEventListener('click', () => {
    const scenarioId = scenarioSelect.value;
    if (!scenarioId || !window.NTMScenarioStorage.remove(calculatorId, scenarioId)) {
      setStatus('Scenariot kunde inte raderas.', true);
      return;
    }
    render('');
    setStatus('Scenariot raderades.');
  });

  render();
}

initSavedInvestmentScenarios();
if (feeForm) {
  initFeeComparisonPage();
}
if (fireCalculatorForm) {
  firePathCalcState = new CalcState({
    id: 'firePath',
    container: document.querySelector('.fire-mode-panel[data-fire-mode-panel="path"]') || fireCalculatorForm.parentElement,
    form: fireCalculatorForm,
    onCalculate: calculateFireProjection
  });
}
if (fireGoalForm) {
  fireGoalCalcState = new CalcState({
    id: 'fireGoal',
    container: document.querySelector('.fire-mode-panel[data-fire-mode-panel="goal"]') || fireGoalForm.parentElement,
    form: fireGoalForm,
    onCalculate: calculateFireGoal
  });
}
if (fireWithdrawalForm) {
  fireWithdrawalCalcState = new CalcState({
    id: 'fireWithdrawal',
    container: document.querySelector('.fire-mode-panel[data-fire-mode-panel="withdrawal"]') || fireWithdrawalForm.parentElement,
    form: fireWithdrawalForm,
    onCalculate: calculateFireWithdrawal
  });
}

function getLeverageInputs() {
  const equity = Number(document.getElementById('leverage-eget-kapital').value) || 0;
  const loanMode = document.querySelector('input[name="leverage-lanemode"]:checked')?.value || 'amount';
  const loanRatioValue = Number(document.getElementById('leverage-belangningsgrad-input').value) || 0;
  const loanRatio = Math.min(Math.max(loanRatioValue / 100, 0), 0.99);
  const loanAmountInput = Number(document.getElementById('leverage-lanebelopp-input').value) || 0;
  const loanAmount = loanMode === 'ratio'
    ? (equity * loanRatio) / Math.max(0.0001, 1 - loanRatio)
    : loanAmountInput;

  return {
    equity,
    loanAmount: Math.max(0, loanAmount),
    loanRate: Number(document.getElementById('leverage-ranta').value) || 0,
    expectedReturn: Number(document.getElementById('leverage-avkastning').value) || 0,
    years: Number(document.getElementById('leverage-ar').value) || 0,
    amortization: Number(document.getElementById('leverage-amortering').value) || 0,
    inflation: Number(document.getElementById('leverage-inflation').value) || 0,
    mode: document.querySelector('.leverage-mode-tab.active') ? document.querySelector('.leverage-mode-tab.active').dataset.leverageMode : 'belaning',
    loanMode,
    loanRatio
  };
}

function getLeverageLoanRatio(equity, loanAmount) {
  const totalValue = equity + loanAmount;
  if (totalValue <= 0) {
    return 0;
  }
  return loanAmount / totalValue;
}

function calculateLeverageProjection({ equity, loanAmount, loanRate, expectedReturn, years, amortization, inflation }) {
  const totalAssetValue = equity + loanAmount;
  const loanRatio = getLeverageLoanRatio(equity, loanAmount);
  const monthlyAssetReturn = Math.pow(1 + expectedReturn / 100, 1 / 12) - 1;
  const monthlyDebtRate = loanRate / 100 / 12;
  const months = Math.max(1, years * 12);

  let remainingDebt = loanAmount;
  let totalInterest = 0;
  let totalPrincipalPaid = 0;
  let assetValue = totalAssetValue;
  const labels = ['0'];
  const noLeverageSeries = [equity];
  const leverageSeries = [equity];
  const debtSeries = [remainingDebt];

  let finalWithoutLeverage = equity;
  let finalWithLeverage = equity;

  for (let month = 1; month <= months; month += 1) {
    assetValue *= 1 + monthlyAssetReturn;

    const interestPayment = remainingDebt * monthlyDebtRate;
    const amortizationPayment = Math.min(amortization, remainingDebt);

    totalInterest += interestPayment;
    totalPrincipalPaid += amortizationPayment;
    remainingDebt = Math.max(0, remainingDebt - amortizationPayment);

    const projectedNoLeverage = equity * Math.pow(1 + expectedReturn / 100, month / 12);
    const projectedLeveragedEquity = Math.max(0, assetValue - remainingDebt - totalInterest);

    finalWithoutLeverage = projectedNoLeverage;
    finalWithLeverage = projectedLeveragedEquity;

    labels.push(String(Math.floor(month / 12)));
    noLeverageSeries.push(finalWithoutLeverage);
    leverageSeries.push(finalWithLeverage);
    debtSeries.push(remainingDebt);
  }

  const finalDebt = remainingDebt;
  const totalEquityContributed = equity + totalPrincipalPaid;
  const roe = totalEquityContributed > 0 ? ((finalWithLeverage - totalEquityContributed) / totalEquityContributed) * 100 : 0;
  const nominalFinalValue = finalWithLeverage;
  const realFinalValue = inflation > 0 ? nominalFinalValue / Math.pow(1 + inflation / 100, years) : nominalFinalValue;

  return {
    totalAssetValue,
    loanAmount,
    equity,
    loanRatio,
    annualLoanCost: loanAmount * (loanRate / 100),
    totalLoanCost: totalInterest,
    totalAmortization: totalPrincipalPaid,
    finalWithoutLeverage,
    finalWithLeverage,
    finalDebt,
    roe,
    nominalFinalValue,
    realFinalValue,
    totalEquityContributed,
    labels,
    noLeverageSeries,
    leverageSeries,
    debtSeries,
    leverageMultiple: equity > 0 ? totalAssetValue / equity : 0
  };
}

function updateLeverageInputsFromMode() {
  const ratioField = document.querySelector('.leverage-field-ratio');
  const amountField = document.querySelector('.leverage-field-amount');

  if (!ratioField || !amountField) {
    return;
  }

  const amountSelected = document.querySelector('input[name="leverage-lanemode"]:checked')?.value === 'amount';
  ratioField.classList.toggle('hidden', amountSelected);
  amountField.classList.toggle('hidden', !amountSelected);
}

function calculateLeverageComparisonAlternative({ equity, loanAmount, loanRate, expectedReturn, years, amortization }) {
  const monthlyRate = Math.pow(1 + expectedReturn / 100, 1 / 12) - 1;
  const months = Math.max(1, years * 12);
  const baseAssetValue = (equity + loanAmount) * Math.pow(1 + expectedReturn / 100, years);

  const amortizeScenario = calculateLeverageProjection({
    equity,
    loanAmount,
    loanRate,
    expectedReturn,
    years,
    amortization,
    inflation: 0
  });

  const noAmortScenario = calculateLeverageProjection({
    equity,
    loanAmount,
    loanRate,
    expectedReturn,
    years,
    amortization: 0,
    inflation: 0
  });

  let investmentValue = 0;
  let remainingDebtForInvestment = loanAmount;
  let actualAmortizationUsed = 0;

  for (let month = 1; month <= months; month += 1) {
    const payment = Math.min(amortization, remainingDebtForInvestment);
    if (payment <= 0) {
      break;
    }

    investmentValue = (investmentValue + payment) * (1 + monthlyRate);
    remainingDebtForInvestment = Math.max(0, remainingDebtForInvestment - payment);
    actualAmortizationUsed += payment;
  }

  const investAlternativeFinalNet = baseAssetValue + investmentValue - noAmortScenario.finalDebt - noAmortScenario.totalLoanCost;
  const amortizeAlternativeFinalNet = amortizeScenario.finalWithLeverage;
  const difference = investAlternativeFinalNet - amortizeAlternativeFinalNet;
  const interestSaved = noAmortScenario.totalLoanCost - amortizeScenario.totalLoanCost;

  return {
    amortizeAlternativeFinalNet,
    investAlternativeFinalNet,
    difference,
    interestSaved,
    investmentFutureValue: investmentValue,
    actualAmortizationUsed
  };
}

function calculateLeverage() {
  const inputs = getLeverageInputs();
  if (inputs.equity <= 0 || inputs.years < 1 || !Number.isFinite(inputs.equity) || !Number.isFinite(inputs.years)) {
    return 'Eget kapital och antal år måste vara större än 0.';
  }

  const loanAmount = inputs.loanAmount;
  const totalValue = inputs.equity + loanAmount;
  const computedRatio = totalValue > 0 ? loanAmount / totalValue : 0;
  const leverageMultiple = inputs.equity > 0 ? totalValue / inputs.equity : 0;
  const result = calculateLeverageProjection({
    equity: inputs.equity,
    loanAmount,
    loanRate: inputs.loanRate,
    expectedReturn: inputs.expectedReturn,
    years: inputs.years,
    amortization: inputs.amortization,
    inflation: inputs.inflation
  });

  const loanInput = document.getElementById('leverage-lanebelopp-input');
  const ratioInput = document.getElementById('leverage-belangningsgrad-input');

  loanInput.value = loanAmount.toFixed(0);
  ratioInput.value = (computedRatio * 100).toFixed(1);

  const totalValueEl = document.getElementById('leverage-totalt-tillgangsvarde');
  const loanValueEl = document.getElementById('leverage-lanebelopp-result');
  const equityValueEl = document.getElementById('leverage-eget-kapital-ut');
  const ratioEl = document.getElementById('leverage-belangningsgrad-result');
  const leverageEl = document.getElementById('leverage-havstang');
  const annualCostEl = document.getElementById('leverage-arlig-rantekostnad');
  const totalCostEl = document.getElementById('leverage-total-rantekostnad');
  const amortizationEl = document.getElementById('leverage-total-amortering');
  const debtEl = document.getElementById('leverage-kvarvarande-skuld');
  const roeEl = document.getElementById('leverage-roe');
  const noLeverageValueEl = document.getElementById('leverage-utan-slutvarde');
  const withLeverageValueEl = document.getElementById('leverage-med-slutvarde');
  const differenceEl = document.getElementById('leverage-skillnad');
  const differenceMetaEl = document.getElementById('leverage-skillnad-meta');
  const realBox = document.getElementById('leverage-real-box');
  const nominalBox = document.getElementById('leverage-nominellt-box');

  totalValueEl.textContent = formatCurrency(totalValue);
  loanValueEl.textContent = formatCurrency(loanAmount);
  equityValueEl.textContent = formatCurrency(inputs.equity);
  ratioEl.textContent = `${(computedRatio * 100).toFixed(1)} %`;
  leverageEl.textContent = `${leverageMultiple.toFixed(2)}x`;
  annualCostEl.textContent = formatCurrency(result.annualLoanCost);
  totalCostEl.textContent = formatCurrency(result.totalLoanCost);
  amortizationEl.textContent = formatCurrency(result.totalAmortization);
  debtEl.textContent = formatCurrency(result.finalDebt);
  roeEl.textContent = `${result.roe.toFixed(1)} %`;
  noLeverageValueEl.textContent = formatCurrency(result.finalWithoutLeverage);
  withLeverageValueEl.textContent = formatCurrency(result.finalWithLeverage);

  const adjustedLeveragedEquity = result.finalWithLeverage - result.totalAmortization;
  const diff = adjustedLeveragedEquity - result.finalWithoutLeverage;
  differenceEl.textContent = formatCurrency(diff);

  if (diff > 0) {
    differenceMetaEl.textContent = 'Mer eget kapital med hävstång';
  } else if (diff < 0) {
    differenceMetaEl.textContent = 'Mindre eget kapital med hävstång';
  } else {
    differenceMetaEl.textContent = 'Ingen skillnad';
  }

  if (result.totalAmortization > 0) {
    differenceMetaEl.textContent += ' • Justerat för inbetald amortering';
  }

  if (inputs.inflation > 0) {
    nominalBox.classList.remove('hidden');
    realBox.classList.remove('hidden');
    document.getElementById('leverage-nominellt').textContent = formatCurrency(result.nominalFinalValue);
    document.getElementById('leverage-real').textContent = formatCurrency(result.realFinalValue);
  } else {
    nominalBox.classList.add('hidden');
    realBox.classList.add('hidden');
  }

  const alternativeSection = document.getElementById('leverage-amortize-vs-invest-section');
  if (alternativeSection) {
    if (inputs.amortization > 0) {
      const comparison = calculateLeverageComparisonAlternative(inputs);
      const amountEl = document.getElementById('leverage-amortize-final');
      const investEl = document.getElementById('leverage-invest-final');
      const diffEl = document.getElementById('leverage-alternative-difference');
      const diffMetaEl = document.getElementById('leverage-alternative-difference-meta');
      const interestSavedEl = document.getElementById('leverage-interest-saved');
      const investmentFvEl = document.getElementById('leverage-investment-fv');

      amountEl.textContent = formatCurrency(comparison.amortizeAlternativeFinalNet);
      investEl.textContent = formatCurrency(comparison.investAlternativeFinalNet);
      diffEl.textContent = formatCurrency(comparison.difference);
      interestSavedEl.textContent = formatCurrency(comparison.interestSaved);
      investmentFvEl.textContent = formatCurrency(comparison.investmentFutureValue);

      if (comparison.difference > 0) {
        diffMetaEl.textContent = `${formatCurrency(comparison.difference)} mer genom att investera`;
      } else if (comparison.difference < 0) {
        diffMetaEl.textContent = `${formatCurrency(Math.abs(comparison.difference))} mer genom att amortera`;
      } else {
        diffMetaEl.textContent = '0 kr skillnad';
      }

      alternativeSection.classList.remove('hidden');
    } else {
      alternativeSection.classList.add('hidden');
    }
  }

  const chartCanvas = document.getElementById('leverageChart');
  if (!chartCanvas) {
    return true;
  }

  if (leverageChart) {
    leverageChart.destroy();
  }

  const colors = getChartColors();
  leverageChart = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels: result.labels,
      datasets: [
        {
          label: 'Eget kapital utan hävstång',
          data: result.noLeverageSeries,
          borderColor: colors.primary,
          backgroundColor: colors.primarySoft,
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
          tension: 0.35
        },
        {
          label: 'Eget kapital med hävstång',
          data: result.leverageSeries,
          borderColor: colors.accent,
          backgroundColor: colors.accentSoft,
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
          tension: 0.35
        },
        {
          label: 'Skuld',
          data: result.debtSeries,
          borderColor: colors.warning,
          backgroundColor: 'rgba(255, 209, 102, 0.08)',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.35
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: colors.text,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            padding: 16
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'År',
            color: colors.muted
          },
          ticks: {
            color: colors.muted,
            maxTicksLimit: 8
          },
          grid: {
            color: colors.grid
          },
          border: {
            display: false
          }
        },
        y: {
          ticks: {
            color: colors.muted,
            callback: function (value) {
              return `${Math.round(value / 1000)}k`;
            }
          },
          grid: {
            color: colors.grid
          },
          border: {
            display: false
          }
        }
      }
    }
  });
  return true;
}

function initLeveragePage() {
  if (!leverageForm) {
    return;
  }

  document.querySelectorAll('input[name="leverage-lanemode"]').forEach((radio) => {
    radio.addEventListener('change', function () {
      updateLeverageInputsFromMode();
    });
  });

  leverageModeTabs.forEach((button) => {
    button.addEventListener('click', function () {
      const mode = button.dataset.leverageMode;
      setLeverageMode(mode);
    });
  });

  leverageCalcState = new CalcState({
    id: 'leverage',
    container: leverageForm.closest('.calculator-card') || leverageForm.parentElement,
    form: leverageForm,
    onCalculate: calculateLeverage
  });

  updateLeverageInputsFromMode();

  if (dailyLeverageForm) {
    dailyLeverageCalcState = new CalcState({
      id: 'dailyLeverage',
      container: dailyLeverageForm.closest('.leverage-mode-content') || dailyLeverageForm.parentElement,
      form: dailyLeverageForm,
      onCalculate: calculateDailyLeverage
    });

    const addDayBtn = document.getElementById('daily-add-day-btn');
    if (addDayBtn) {
      addDayBtn.addEventListener('click', () => {
        addDailyMoveInput();
        dailyLeverageForm.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }

    initializeDailyLeverage();
  }
}

// ========== DAGLIG HÄVSTÅNG FUNCTIONS ==========

function initializeDailyLeverage() {
  const container = document.getElementById('daily-moves-container');
  if (!container) return;

  container.innerHTML = '';
  addDailyMoveInput();
  addDailyMoveInput();
}

function removeDailyMoveInput(dayNumber) {
  const container = document.getElementById('daily-moves-container');
  if (!container) return;

  const wrappers = container.querySelectorAll('.daily-move-input-wrapper');
  if (wrappers.length <= 1) return;

  const wrapper = Array.from(wrappers).find(w => parseInt(w.dataset.dayNumber) === dayNumber);
  if (wrapper) wrapper.remove();

  container.querySelectorAll('.daily-move-input-wrapper').forEach((w, idx) => {
    w.dataset.dayNumber = idx + 1;
    const label = w.querySelector('label');
    if (label) label.textContent = `Dag ${idx + 1}`;
    const input = w.querySelector('input');
    if (input) input.dataset.day = idx + 1;
  });

  dailyLeverageForm?.dispatchEvent(new Event('input', { bubbles: true }));
}

function getDailyLeverageInputs() {
  const startBelopp = Number(document.getElementById('daily-startbelopp')?.value) || 0;
  const havstang = Number(document.getElementById('daily-havstang')?.value) || 1;
  const dailyFee = Number(document.getElementById('daily-avgift')?.value) || 0;

  const container = document.getElementById('daily-moves-container');
  const moves = [];
  if (container) {
    container.querySelectorAll('.daily-move-input').forEach((input) => {
      moves.push(Number(input.value) || 0);
    });
  }

  return { startBelopp, havstang, dailyFee, moves };
}

function calculateDailyLeverage() {
  const { startBelopp, havstang, dailyFee, moves } = getDailyLeverageInputs();

  if (moves.length === 0 || startBelopp <= 0 || !Number.isFinite(startBelopp) || !Number.isFinite(havstang) || havstang <= 0 || !Number.isFinite(dailyFee) || dailyFee < 0) {
    return 'Startbelopp och hävstång måste vara större än 0, och daglig avgift noll eller större.';
  }

  let underlyingValue = startBelopp;
  const underlyingValues = [startBelopp];

  moves.forEach((move) => {
    underlyingValue *= (1 + move / 100);
    underlyingValues.push(underlyingValue);
  });

  const underlyingReturn = ((underlyingValue / startBelopp) - 1) * 100;

  let leveragedValue = startBelopp;
  const leveragedValues = [startBelopp];
  let totalFees = 0;
  const dayDetails = [];

  moves.forEach((move, idx) => {
    const leveragedMove = move * havstang;
    const valueAfterMove = leveragedValue * (1 + leveragedMove / 100);

    if (valueAfterMove < 0) {
      leveragedValue = 0;
      dayDetails.push({
        day: idx + 1,
        move,
        leveragedMove,
        underlyingValue: underlyingValues[idx + 1],
        leveragedValue: 0,
        dailyFeeAmount: 0
      });
      leveragedValues.push(0);
      return;
    }

    const dailyFeeAmount = leveragedValue > 0 ? valueAfterMove * (dailyFee / 100) : 0;
    leveragedValue = Math.max(0, valueAfterMove - dailyFeeAmount);
    totalFees += dailyFeeAmount;

    dayDetails.push({
      day: idx + 1,
      move,
      leveragedMove,
      underlyingValue: underlyingValues[idx + 1],
      leveragedValue,
      dailyFeeAmount
    });

    leveragedValues.push(leveragedValue);
  });

  const leveragedReturn = ((leveragedValue / startBelopp) - 1) * 100;

  document.getElementById('daily-underlying-value').textContent = formatCurrency(underlyingValue);
  document.getElementById('daily-underlying-return').textContent = formatPercent(underlyingReturn);
  document.getElementById('daily-leverage-label').textContent = `Daglig hävstång (${havstang}x)`;
  document.getElementById('daily-leveraged-value').textContent = formatCurrency(leveragedValue);
  document.getElementById('daily-leveraged-return').textContent = formatPercent(leveragedReturn);
  document.getElementById('daily-total-fees').textContent = formatCurrency(totalFees);

  renderDailyLeverageChart(underlyingValues, leveragedValues, havstang);
  renderDailyLeverageTable(dayDetails, startBelopp, underlyingValues);
  return true;
}

function addDailyMoveInput() {
  const container = document.getElementById('daily-moves-container');
  if (!container) return;

  const dayCount = container.querySelectorAll('.daily-move-input-wrapper').length + 1;
  
  const wrapper = document.createElement('div');
  wrapper.className = 'daily-move-input-wrapper';
  wrapper.style.cssText = 'display: flex; gap: 12px; align-items: flex-end;';
  wrapper.dataset.dayNumber = dayCount;

  const defaultValue = dayCount === 1 ? -10 : 10;
  const fieldGroup = document.createElement('div');
  fieldGroup.className = 'field-group';
  fieldGroup.style.cssText = 'flex: 1;';
  fieldGroup.innerHTML = `
    <label style="font-size: 0.9rem;">Dag ${dayCount}</label>
    <div class="daily-move-input-wrap">
      <input type="number" class="daily-move-input" data-day="${dayCount}" value="${defaultValue}" step="0.1" />
      <span class="daily-move-input-suffix" aria-hidden="true">%</span>
    </div>
  `;

  wrapper.appendChild(fieldGroup);
  
  // Add remove button (only if there's already at least one day)
  if (container.querySelectorAll('.daily-move-input-wrapper').length > 0) {
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'ghost-btn';
    removeBtn.style.cssText = 'width: auto; padding: 10px 12px; margin-bottom: 0; background: rgba(255, 50, 50, 0.1); color: var(--danger); border-color: rgba(255, 50, 50, 0.3);';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      removeDailyMoveInput(dayCount);
    });
    wrapper.appendChild(removeBtn);
  }

  container.appendChild(wrapper);

  // Update remove buttons visibility for all wrappers
  const allWrappers = container.querySelectorAll('.daily-move-input-wrapper');
  allWrappers.forEach((w, idx) => {
    const existingBtn = w.querySelector('button');
    if (allWrappers.length > 1 && !existingBtn) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ghost-btn';
      btn.style.cssText = 'width: auto; padding: 10px 12px; margin-bottom: 0; background: rgba(255, 50, 50, 0.1); color: var(--danger); border-color: rgba(255, 50, 50, 0.3);';
      btn.textContent = '✕';
      const dayNum = parseInt(w.dataset.dayNumber);
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        removeDailyMoveInput(dayNum);
      });
      w.appendChild(btn);
    } else if (allWrappers.length === 1 && existingBtn) {
      existingBtn.remove();
    }
  });
}

function removeDailyMoveInput(dayNumber) {
  const container = document.getElementById('daily-moves-container');
  if (!container) return;

  const wrappers = container.querySelectorAll('.daily-move-input-wrapper');
  if (wrappers.length <= 1) return; // Must keep at least one day

  const wrapper = Array.from(wrappers).find(w => parseInt(w.dataset.dayNumber) === dayNumber);
  if (wrapper) wrapper.remove();

  // Re-number remaining days
  container.querySelectorAll('.daily-move-input-wrapper').forEach((w, idx) => {
    w.dataset.dayNumber = idx + 1;
    const label = w.querySelector('label');
    if (label) label.textContent = `Dag ${idx + 1}`;
    const input = w.querySelector('input');
    if (input) input.dataset.day = idx + 1;
  });
}

function getDailyLeverageInputs() {
  const startBelopp = Number(document.getElementById('daily-startbelopp')?.value) || 0;
  const havstang = Number(document.getElementById('daily-havstang')?.value) || 1;
  const dailyFee = Number(document.getElementById('daily-avgift')?.value) || 0;

  const container = document.getElementById('daily-moves-container');
  const moves = [];
  if (container) {
    container.querySelectorAll('.daily-move-input').forEach((input) => {
      moves.push(Number(input.value) || 0);
    });
  }

  return { startBelopp, havstang, dailyFee, moves };
}

function calculateDailyLeverage() {
  const { startBelopp, havstang, dailyFee, moves } = getDailyLeverageInputs();

  if (moves.length === 0 || startBelopp <= 0) {
    return;
  }

  // Calculate underlying (1x)
  let underlyingValue = startBelopp;
  const underlyingValues = [startBelopp];
  
  moves.forEach((move) => {
    underlyingValue *= (1 + move / 100);
    underlyingValues.push(underlyingValue);
  });

  const underlyingReturn = ((underlyingValue / startBelopp) - 1) * 100;

  // Calculate leveraged (with daily reset)
  let leveragedValue = startBelopp;
  const leveragedValues = [startBelopp];
  let totalFees = 0;
  const dayDetails = [];

  moves.forEach((move, idx) => {
    const leveragedMove = move * havstang;
    const valueAfterMove = leveragedValue * (1 + leveragedMove / 100);
    
    // Ensure value doesn't go below 0
    if (valueAfterMove < 0) {
      leveragedValue = 0;
      dayDetails.push({
        day: idx + 1,
        move,
        leveragedMove,
        underlyingValue: underlyingValues[idx + 1],
        leveragedValue: 0,
        dailyFeeAmount: 0
      });
      leveragedValues.push(0);
      return;
    }

    // Calculate and deduct daily fee
    const dailyFeeAmount = leveragedValue > 0 ? valueAfterMove * (dailyFee / 100) : 0;
    leveragedValue = Math.max(0, valueAfterMove - dailyFeeAmount);
    totalFees += dailyFeeAmount;

    dayDetails.push({
      day: idx + 1,
      move,
      leveragedMove,
      underlyingValue: underlyingValues[idx + 1],
      leveragedValue,
      dailyFeeAmount
    });

    leveragedValues.push(leveragedValue);
  });

  const leveragedReturn = ((leveragedValue / startBelopp) - 1) * 100;

  // Update result boxes
  document.getElementById('daily-underlying-value').textContent = formatCurrency(underlyingValue);
  document.getElementById('daily-underlying-return').textContent = formatPercent(underlyingReturn);
  document.getElementById('daily-leverage-label').textContent = `Daglig hävstång (${havstang}x)`;
  document.getElementById('daily-leveraged-value').textContent = formatCurrency(leveragedValue);
  document.getElementById('daily-leveraged-return').textContent = formatPercent(leveragedReturn);
  document.getElementById('daily-total-fees').textContent = formatCurrency(totalFees);

  // Render chart
  renderDailyLeverageChart(underlyingValues, leveragedValues, havstang);

  // Render table
  renderDailyLeverageTable(dayDetails, startBelopp, underlyingValues);
}

function renderDailyLeverageChart(underlyingValues, leveragedValues, havstang) {
  const chartCanvas = document.getElementById('dailyLeverageChart');
  if (!chartCanvas) return;

  const labels = [];
  for (let i = 0; i < underlyingValues.length; i++) {
    if (i === 0) {
      labels.push('Start');
    } else {
      labels.push(`Dag ${i}`);
    }
  }

  const colors = getChartColors();

  if (dailyLeverageChart) {
    dailyLeverageChart.destroy();
  }

  dailyLeverageChart = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Underliggande (1x)',
          data: underlyingValues,
          borderColor: colors.accent,
          backgroundColor: colors.accentSoft,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: colors.accent,
          fill: true,
          tension: 0.35
        },
        {
          label: `Daglig hävstång (${havstang}x)`,
          data: leveragedValues,
          borderColor: colors.primary,
          backgroundColor: colors.primarySoft,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: colors.primary,
          fill: true,
          tension: 0.35
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: colors.text,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            padding: 16
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'Värde (kr)',
            color: colors.muted
          },
          ticks: {
            color: colors.muted,
            callback: function (value) {
              return formatCurrency(value);
            }
          },
          grid: {
            color: colors.grid
          }
        },
        x: {
          title: {
            display: true,
            text: 'Dag',
            color: colors.muted
          },
          ticks: {
            color: colors.muted
          },
          grid: {
            color: colors.grid
          }
        }
      }
    }
  });
}

function renderDailyLeverageTable(dayDetails, startBelopp, underlyingValues) {
  const tbody = document.getElementById('daily-leverage-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  // Start row
  const startRow = document.createElement('tr');
  startRow.style.cssText = 'border-bottom: 1px solid var(--border);';
  startRow.innerHTML = `
    <td style="padding: 12px 8px; text-align: left;">Start</td>
    <td style="padding: 12px 8px; text-align: right;">–</td>
    <td style="padding: 12px 8px; text-align: right;">–</td>
    <td style="padding: 12px 8px; text-align: right; color: var(--text);">${formatCurrency(startBelopp)}</td>
    <td style="padding: 12px 8px; text-align: right; color: var(--text);">${formatCurrency(startBelopp)}</td>
    <td style="padding: 12px 8px; text-align: right;">–</td>
  `;
  tbody.appendChild(startRow);

  // Day rows
  dayDetails.forEach((detail) => {
    const row = document.createElement('tr');
    row.style.cssText = 'border-bottom: 1px solid var(--border);';
    row.innerHTML = `
      <td style="padding: 12px 8px; text-align: left;">Dag ${detail.day}</td>
      <td style="padding: 12px 8px; text-align: right; color: ${detail.move >= 0 ? 'var(--success)' : 'var(--danger)'};">${formatPercent(detail.move)}</td>
      <td style="padding: 12px 8px; text-align: right; color: ${detail.leveragedMove >= 0 ? 'var(--success)' : 'var(--danger)'};">${formatPercent(detail.leveragedMove)}</td>
      <td style="padding: 12px 8px; text-align: right; color: var(--text);">${formatCurrency(detail.underlyingValue)}</td>
      <td style="padding: 12px 8px; text-align: right; color: var(--text);">${formatCurrency(detail.leveragedValue)}</td>
      <td style="padding: 12px 8px; text-align: right; color: var(--muted);">${formatCurrency(detail.dailyFeeAmount)}</td>
    `;
    tbody.appendChild(row);
  });
}

function setLeverageMode(mode) {
  currentLeverageMode = mode;

  // Update tab active states
  leverageModeTabs.forEach((tab) => {
    const isActive = tab.dataset.leverageMode === mode;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  // Hide/show mode-specific content
  const modeContents = document.querySelectorAll('.leverage-mode-content');
  modeContents.forEach((content) => {
    const contentMode = content.dataset.leverageMode;
    let shouldShow = false;

    if (contentMode === 'bostad-varde') {
      shouldShow = (mode === 'belaning' || mode === 'bostad' || mode === 'varde');
    } else if (contentMode === 'daglig') {
      shouldShow = (mode === 'daglig');
    }

    if (shouldShow) {
      content.classList.remove('hidden');
      content.style.display = '';
    } else {
      content.classList.add('hidden');
      content.style.display = 'none';
    }
  });

  // Show/hide specific comparison sections
  const amortizeSection = document.getElementById('leverage-amortize-vs-invest-section');
  if (amortizeSection) {
    if (mode === 'belaning' || mode === 'bostad') {
      amortizeSection.classList.remove('hidden');
      amortizeSection.style.display = '';
    } else {
      amortizeSection.classList.add('hidden');
      amortizeSection.style.display = 'none';
    }
  }

  if (leverageCalcState) leverageCalcState.setNeutral();
  if (dailyLeverageCalcState) dailyLeverageCalcState.setNeutral();
}

function calculateRecoveryRequiredGain(dropPercent, amount) {
  if (dropPercent < 0 || dropPercent >= 100) {
    throw new Error('Nedgång måste vara mellan 0 och 100 %.');
  }

  if (amount !== null && amount !== undefined && amount < 0) {
    throw new Error('Investerat belopp får inte vara negativt.');
  }

  const loss = dropPercent / 100;
  const requiredGain = (1 / (1 - loss) - 1) * 100;
  const currentValue = amount === null || amount === undefined || Number.isNaN(amount) ? null : amount * (1 - loss);
  const lossAmount = amount === null || amount === undefined || Number.isNaN(amount) ? null : amount - currentValue;
  const recoveredValue = amount === null || amount === undefined || Number.isNaN(amount) ? null : currentValue * (1 + requiredGain / 100);

  return {
    requiredGain,
    currentValue,
    lossAmount,
    recoveredValue
  };
}

function formatPercent(value) {
  const formatted = new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(value);

  return value > 0 ? `+${formatted} %` : `${formatted} %`;
}

function calculateRecoveryPage() {
  if (!recoveryForm) {
    return false;
  }

  const dropField = document.getElementById('recovery-nedgang');
  const amountField = document.getElementById('recovery-belopp');
  const summary = document.getElementById('recovery-summary');

  const dropPercent = Number(dropField.value);
  const amountValue = amountField.value === '' ? null : Number(amountField.value);

  if (dropField.value === '' || Number.isNaN(dropPercent) || dropPercent <= 0 || dropPercent >= 100) {
    return 'Nedgång måste vara ett värde mellan 0 % och mindre än 100 %.';
  }

  if (amountValue !== null && (!Number.isFinite(amountValue) || amountValue < 0)) {
    return 'Investerat belopp får inte vara negativt.';
  }

  try {
    const calculation = calculateRecoveryRequiredGain(dropPercent, amountValue);
    const requiredGainEl = document.getElementById('recovery-required-gain');

    if (requiredGainEl) {
      requiredGainEl.textContent = formatPercent(calculation.requiredGain);
    }

    if (summary) {
      summary.textContent = `Efter en nedgång på ${dropPercent.toFixed(1).replace(/\.0$/, '')} % krävs en uppgång på ${new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(calculation.requiredGain)} % för att komma tillbaka till startvärdet.`;
    }

    const amountBoxes = [
      document.getElementById('recovery-start-value-box'),
      document.getElementById('recovery-after-drop-box'),
      document.getElementById('recovery-loss-box'),
      document.getElementById('recovery-recovered-box')
    ];

    if (amountValue !== null) {
      amountBoxes.forEach((box) => box?.classList.remove('hidden'));
      const startValEl = document.getElementById('recovery-start-value');
      const afterDropEl = document.getElementById('recovery-after-drop');
      const lossEl = document.getElementById('recovery-loss');
      const recoveredEl = document.getElementById('recovery-recovered');
      if (startValEl) startValEl.textContent = formatCurrency(amountValue);
      if (afterDropEl) afterDropEl.textContent = formatCurrency(calculation.currentValue);
      if (lossEl) lossEl.textContent = formatCurrency(calculation.lossAmount);
      if (recoveredEl) recoveredEl.textContent = formatCurrency(calculation.recoveredValue);
    } else {
      amountBoxes.forEach((box) => box?.classList.add('hidden'));
    }

    const visualStart = document.getElementById('recovery-visual-start');
    const visualDrop = document.getElementById('recovery-visual-drop');
    const visualAfter = document.getElementById('recovery-visual-after');
    const visualGain = document.getElementById('recovery-visual-gain');
    const visualRecovered = document.getElementById('recovery-visual-recovered');

    if (visualStart) {
      const startValue = amountValue !== null ? amountValue : 100;
      const afterDropValue = amountValue !== null ? calculation.currentValue : 100 * (1 - dropPercent / 100);
      const recoveredValue = amountValue !== null ? calculation.recoveredValue : afterDropValue * (1 + calculation.requiredGain / 100);

      visualStart.textContent = amountValue !== null ? formatCurrency(startValue) : '100';
      visualDrop.textContent = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(dropPercent);
      visualAfter.textContent = amountValue !== null ? formatCurrency(afterDropValue) : new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(afterDropValue);
      visualGain.textContent = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(calculation.requiredGain);
      visualRecovered.textContent = amountValue !== null ? formatCurrency(recoveredValue) : new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(recoveredValue);
    }

    return true;
  } catch (error) {
    return error.message || 'Ett fel uppstod vid beräkningen.';
  }
}

function initRecoveryPage() {
  if (!recoveryForm) {
    return;
  }

  recoveryCalcState = new CalcState({
    id: 'recovery',
    container: recoveryForm.closest('.calculator-card') || recoveryForm.parentElement,
    form: recoveryForm,
    onCalculate: calculateRecoveryPage,
    errorElementId: 'recovery-error'
  });
}

if (recoveryForm) {
  initRecoveryPage();
}

if (leverageForm) {
  initLeveragePage();
}

/* ==========================================================================
   Valutajusterad avkastning (Currency-adjusted return calculator)
   ========================================================================== */

const fxCalculatorForm = document.getElementById('fx-calculator-form');
const fxModeTabs = document.querySelectorAll('.fx-mode-tab');

function parseFxNumber(value) {
  const parsedValue = Number.parseFloat(String(value ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatFxSignedPercent(value, digits = 2) {
  if (!Number.isFinite(value)) return '–';
  const formatted = new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: digits
  }).format(Math.abs(value));

  if (value > 0) {
    return `+${formatted} %`;
  }
  if (value < 0) {
    return `−${formatted} %`;
  }
  return `0,0 %`;
}

function formatFxPercentagePoints(value, digits = 2) {
  if (!Number.isFinite(value)) return '–';
  const formatted = new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: digits
  }).format(Math.abs(value));

  if (value > 0) {
    return `+${formatted} procentenheter`;
  }
  if (value < 0) {
    return `−${formatted} procentenheter`;
  }
  return `0,0 procentenheter`;
}

function getActiveFxMode() {
  const activeTab = document.querySelector('.fx-mode-tab.active');
  return activeTab ? activeTab.dataset.fxMode : 'rate';
}

function calculateCurrencyAdjustedReturn({ investmentReturnPct, purchaseFx, currentFx, currencyChangePct, amount }) {
  const rInv = investmentReturnPct / 100;

  let rFx = 0;
  if (purchaseFx !== undefined && currentFx !== undefined) {
    rFx = (currentFx / purchaseFx) - 1;
  } else if (currencyChangePct !== undefined) {
    rFx = currencyChangePct / 100;
  }

  const rAdj = (1 + rInv) * (1 + rFx) - 1;
  const adjReturnPct = rAdj * 100;
  const fxChangePct = rFx * 100;
  const diffPctPoints = adjReturnPct - investmentReturnPct;

  let amountDetails = null;
  if (amount !== null && amount !== undefined && amount > 0) {
    const actualFinalValue = amount * (1 + rAdj);
    const profitLoss = actualFinalValue - amount;
    const finalValueWithoutFx = amount * (1 + rInv);
    const currencyImpactAmount = actualFinalValue - finalValueWithoutFx;

    amountDetails = {
      initialAmount: amount,
      actualFinalValue,
      profitLoss,
      finalValueWithoutFx,
      currencyImpactAmount
    };
  }

  return {
    investmentReturnPct,
    fxChangePct,
    adjReturnPct,
    diffPctPoints,
    amountDetails
  };
}

function generateFxExplanation({ investmentReturnPct, fxChangePct, adjReturnPct, amountDetails }) {
  const formatTextPct = (num) => {
    return new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(Math.abs(num));
  };

  let invText = '';
  if (investmentReturnPct > 0.0001) {
    invText = `Investeringen steg ${formatTextPct(investmentReturnPct)} %`;
  } else if (investmentReturnPct < -0.0001) {
    invText = `Investeringen sjönk ${formatTextPct(investmentReturnPct)} %`;
  } else {
    invText = `Investeringen var oförändrad (0,0 %)`;
  }

  let fxText = '';
  if (fxChangePct > 0.0001) {
    if (investmentReturnPct >= 0) {
      fxText = `, samtidigt som den utländska valutan stärktes med ${formatTextPct(fxChangePct)} % mot SEK`;
    } else {
      fxText = `, men den utländska valutan stärktes med ${formatTextPct(fxChangePct)} % mot SEK vilket dämpade nedgången`;
    }
  } else if (fxChangePct < -0.0001) {
    if (investmentReturnPct > 0) {
      fxText = `, men den utländska valutan försvagades med ${formatTextPct(fxChangePct)} % mot SEK`;
    } else if (investmentReturnPct < 0) {
      fxText = `, samtidigt som den utländska valutan försvagades med ${formatTextPct(fxChangePct)} % mot SEK vilket förstärkte nedgången`;
    } else {
      fxText = `, men den utländska valutan försvagades med ${formatTextPct(fxChangePct)} % mot SEK`;
    }
  } else {
    fxText = ` och valutakursen var oförändrad mot SEK`;
  }

  let resultSentence = '';
  if (adjReturnPct > 0.0001) {
    resultSentence = ` Din valutajusterade avkastning blev därför +${formatTextPct(adjReturnPct)} %.`;
  } else if (adjReturnPct < -0.0001) {
    resultSentence = ` Din valutajusterade avkastning blev därför −${formatTextPct(adjReturnPct)} %.`;
  } else {
    resultSentence = ` Din valutajusterade avkastning blev därför 0,0 %.`;
  }

  let amountSentence = '';
  if (amountDetails) {
    const formattedStart = formatCurrency(amountDetails.initialAmount);
    const formattedEnd = formatCurrency(amountDetails.actualFinalValue);
    const impactVal = amountDetails.currencyImpactAmount;
    const impactSign = impactVal > 0 ? '+' : impactVal < 0 ? '−' : '';
    const impactFormatted = `${impactSign}${formatCurrency(Math.abs(impactVal))}`;
    amountSentence = ` Med ${formattedStart} investerat blev slutvärdet ${formattedEnd}, där valutarörelsen påverkade resultatet med ${impactFormatted} jämfört med om valutakursen varit oförändrad.`;
  }

  return `${invText}${fxText}.${resultSentence}${amountSentence}`;
}

function calculateFxTool() {
  if (!fxCalculatorForm) return false;

  const activeMode = getActiveFxMode();
  let investmentReturn = null;
  let purchaseRate = null;
  let currentRate = null;
  let currencyChange = null;
  let amount = null;

  if (activeMode === 'percent') {
    const invInput = document.getElementById('fx-percent-investment-return');
    const changeInput = document.getElementById('fx-percent-currency-change');
    const amountInput = document.getElementById('fx-percent-amount');

    investmentReturn = parseFxNumber(invInput?.value);
    currencyChange = parseFxNumber(changeInput?.value);
    const rawAmount = amountInput?.value?.trim();
    amount = rawAmount ? parseFxNumber(rawAmount) : null;

    if (investmentReturn === null) {
      return 'Ange investeringens avkastning i procent.';
    }
    if (investmentReturn < -100) {
      return 'Investeringens avkastning kan inte vara lägre än -100 %.';
    }
    if (currencyChange === null) {
      return 'Ange valutans förändring mot SEK i procent.';
    }
    if (currencyChange < -100) {
      return 'Valutans förändring mot SEK kan inte vara lägre än -100 %.';
    }
    if (rawAmount && (amount === null || amount <= 0)) {
      return 'Investerat belopp måste vara ett positivt tal större än 0 kr.';
    }
  } else {
    // Mode 1: Valutakurs (default)
    const invInput = document.getElementById('fx-rate-investment-return');
    const purchaseInput = document.getElementById('fx-rate-purchase');
    const currentInput = document.getElementById('fx-rate-current');
    const amountInput = document.getElementById('fx-rate-amount');

    investmentReturn = parseFxNumber(invInput?.value);
    purchaseRate = parseFxNumber(purchaseInput?.value);
    currentRate = parseFxNumber(currentInput?.value);
    const rawAmount = amountInput?.value?.trim();
    amount = rawAmount ? parseFxNumber(rawAmount) : null;

    if (investmentReturn === null) {
      return 'Ange investeringens avkastning i procent.';
    }
    if (investmentReturn < -100) {
      return 'Investeringens avkastning kan inte vara lägre än -100 %.';
    }
    if (purchaseRate === null || purchaseRate <= 0) {
      return 'Valutakurs vid köp måste vara ett positivt tal större än 0.';
    }
    if (currentRate === null || currentRate <= 0) {
      return 'Valutakurs idag måste vara ett positivt tal större än 0.';
    }
    if (rawAmount && (amount === null || amount <= 0)) {
      return 'Investerat belopp måste vara ett positivt tal större än 0 kr.';
    }
  }

  try {
    const result = calculateCurrencyAdjustedReturn({
      investmentReturnPct: investmentReturn,
      purchaseFx: purchaseRate ?? undefined,
      currentFx: currentRate ?? undefined,
      currencyChangePct: currencyChange ?? undefined,
      amount
    });

    const adjustedEl = document.getElementById('fx-adjusted-return-result');
    const investmentEl = document.getElementById('fx-investment-return-result');
    const fxChangeEl = document.getElementById('fx-currency-change-result');
    const diffEl = document.getElementById('fx-return-difference-result');
    const summaryEl = document.getElementById('fx-summary');

    if (adjustedEl) adjustedEl.textContent = formatFxSignedPercent(result.adjReturnPct);
    if (investmentEl) investmentEl.textContent = formatFxSignedPercent(result.investmentReturnPct);
    if (fxChangeEl) fxChangeEl.textContent = formatFxSignedPercent(result.fxChangePct);
    if (diffEl) diffEl.textContent = formatFxPercentagePoints(result.diffPctPoints);

    const amountBoxes = [
      document.getElementById('fx-final-value-box'),
      document.getElementById('fx-profit-loss-box'),
      document.getElementById('fx-no-currency-value-box'),
      document.getElementById('fx-currency-impact-box')
    ];

    if (result.amountDetails) {
      amountBoxes.forEach((box) => box?.classList.remove('hidden'));

      const finalValEl = document.getElementById('fx-final-value-result');
      const profitLossEl = document.getElementById('fx-profit-loss-result');
      const noFxValEl = document.getElementById('fx-no-currency-value-result');
      const fxImpactEl = document.getElementById('fx-currency-impact-result');

      if (finalValEl) finalValEl.textContent = formatCurrency(result.amountDetails.actualFinalValue);

      if (profitLossEl) {
        const pl = result.amountDetails.profitLoss;
        const plSign = pl > 0 ? '+' : pl < 0 ? '−' : '';
        profitLossEl.textContent = `${plSign}${formatCurrency(Math.abs(pl))}`;
      }

      if (noFxValEl) noFxValEl.textContent = formatCurrency(result.amountDetails.finalValueWithoutFx);

      if (fxImpactEl) {
        const impact = result.amountDetails.currencyImpactAmount;
        const impactSign = impact > 0 ? '+' : impact < 0 ? '−' : '';
        fxImpactEl.textContent = `${impactSign}${formatCurrency(Math.abs(impact))}`;
      }
    } else {
      amountBoxes.forEach((box) => box?.classList.add('hidden'));
    }

    if (summaryEl) {
      summaryEl.textContent = generateFxExplanation(result);
    }

    return true;
  } catch (error) {
    return error.message || 'Ett fel uppstod vid beräkningen.';
  }
}

function initFxCalculator() {
  if (!fxCalculatorForm) return;

  fxCalcState = new CalcState({
    id: 'fx',
    container: fxCalculatorForm.closest('.calculator-card') || fxCalculatorForm.parentElement,
    form: fxCalculatorForm,
    onCalculate: calculateFxTool
  });

  if (fxModeTabs.length) {
    fxModeTabs.forEach((button) => {
      button.addEventListener('click', function () {
        const selectedMode = button.dataset.fxMode || 'rate';
        fxModeTabs.forEach((tab) => {
          const isActive = tab === button;
          tab.classList.toggle('active', isActive);
          tab.setAttribute('aria-selected', String(isActive));
        });
        document.querySelectorAll('.fx-mode-panel').forEach((panel) => {
          panel.classList.toggle('hidden', panel.id !== `fx-${selectedMode}-panel`);
        });

        if (fxCalcState) fxCalcState.setNeutral();
      });
    });
  }
}

if (fxCalculatorForm) {
  initFxCalculator();
}
