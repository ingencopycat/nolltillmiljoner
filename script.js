const form = document.getElementById('calculator-form');
const dividendForm = document.getElementById('dividend-form');
const themeToggle = document.getElementById('themeToggle');
const modeTabs = document.querySelectorAll('.mode-tab');
const modePanels = {
  growth: document.getElementById('growth-mode-panel'),
  dividend: document.getElementById('dividend-mode-panel')
};
const mobileNavToggle = document.getElementById('mobileNavToggle');
const navMenu = document.querySelector('.main-nav');
let investmentChart = null;
let scenarioChart = null;
let dividendChart = null;

function formatCurrency(value) {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0
  }).format(value);
}

function setActiveMode(mode) {
  if (!modeTabs.length) {
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
    primary: '#3dd9c6',
    accent: '#5ea3ff',
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
          backgroundColor: 'rgba(61, 217, 198, 0.12)',
          borderWidth: 3,
          pointRadius: 0,
          fill: true,
          tension: 0.35
        },
        {
          label: 'Totalt insatt kapital',
          data: investedValues,
          borderColor: colors.accent,
          backgroundColor: 'rgba(94, 163, 255, 0.08)',
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
  const { startCapital, monthlySavings, years } = getInputs();
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

  const scenarioGrid = document.getElementById('scenarioGrid');
  if (!scenarioGrid) {
    return;
  }

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

function getDividendInputs() {
  return {
    startCapital: Number(document.getElementById('dividend-startkapital').value) || 0,
    monthlySavings: Number(document.getElementById('dividend-manadssparande').value) || 0,
    annualReturn: Number(document.getElementById('dividend-avkastning').value) || 0,
    annualFee: Number(document.getElementById('dividend-avgift').value) || 0,
    dividendYield: Number(document.getElementById('dividend-direktavkastning').value) || 0,
    dividendGrowth: Number(document.getElementById('dividend-tillvaxt').value) || 0,
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
          backgroundColor: 'rgba(61, 217, 198, 0.12)',
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
          backgroundColor: 'rgba(94, 163, 255, 0.08)',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.35,
          yAxisID: 'y1'
        },
        {
          label: 'Månadsutdelning',
          data: result.monthlyDividendValues,
          borderColor: '#ffd166',
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
  const result = calculateDividendProjection(inputs);
  const reinvestDividends = document.getElementById('dividend-aterinvestera').value === 'true';

  updateDividendResultLabel();

  document.getElementById('dividend-portfoljvarde').textContent = formatCurrency(result.portfolioValue);
  document.getElementById('dividend-arlig-utdelning').textContent = formatCurrency(result.annualDividend);
  document.getElementById('dividend-manadsutdelning').textContent = formatCurrency(result.monthlyDividend);
  document.getElementById('dividend-mottagna').textContent = formatCurrency(reinvestDividends ? result.totalReinvested : result.totalDividendsReceived);
  document.getElementById('dividend-insatt-kapital').textContent = formatCurrency(result.totalInvested);

  renderDividendChart();
}

function calculateInvestment() {
  const { startCapital, monthlySavings, annualReturn, annualFee, annualInflation, years } = getInputs();
  const result = calculateProjection(startCapital, monthlySavings, annualReturn, annualFee, years);

  const inflationRate = annualInflation / 100;
  const realValue = result.futureValue / Math.pow(1 + inflationRate, years);

  document.getElementById('slutvarde').textContent = formatCurrency(result.futureValue);
  document.getElementById('dagens-varde').textContent = formatCurrency(realValue);
  document.getElementById('insatt-kapital').textContent = formatCurrency(result.totalInvested);
  document.getElementById('avkastning-resultat').textContent = formatCurrency(result.earnings);

  renderChart();
  renderScenarioComparison();
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light-theme', isLight);
  document.body.classList.toggle('dark-theme', !isLight);

  if (themeToggle) {
    // Update tooltip and aria-label based on NEXT theme (what will happen on click)
    const nextTheme = isLight ? 'dark' : 'light';
    const tooltipText = nextTheme === 'light' ? 'Växla till ljust läge' : 'Växla till mörkt läge';
    themeToggle.setAttribute('title', tooltipText);
    themeToggle.setAttribute('aria-label', tooltipText);
  }
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
        <h3>Följ min resa från noll till miljoner.</h3>
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

if (mobileNavToggle && navMenu) {
  mobileNavToggle.addEventListener('click', function () {
    navMenu.classList.toggle('open');
    mobileNavToggle.setAttribute('aria-expanded', String(navMenu.classList.contains('open')));
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

    if (form) {
      renderChart();
      renderScenarioComparison();
    }

    if (dividendForm) {
      renderDividendChart();
    }
  });
}

if (form) {
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    calculateInvestment();
  });
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

initTheme();
injectInstagramPromo();
if (modeTabs.length) {
  setActiveMode('growth');
}
if (form) {
  calculateInvestment();
}
if (dividendForm) {
  calculateDividendInvestment();
}
