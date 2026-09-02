const form = document.getElementById('calculator-form');
const dividendForm = document.getElementById('dividend-form');
const feeForm = document.getElementById('avgifts-form');
const leverageForm = document.getElementById('leverage-form');
const recoveryForm = document.getElementById('recovery-form');
const dailyLeverageForm = document.getElementById('daily-leverage-form');
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
let currentLeverageMode = 'belaning';

function formatCurrency(value) {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0
  }).format(value);
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

  // Refresh scenario when switching modes
  renderScenarioComparison();
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
          backgroundColor: 'rgba(61, 217, 198, 0.12)',
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
          tension: 0.35
        },
        {
          label: 'Investering B',
          data: seriesB,
          borderColor: colors.accent,
          backgroundColor: 'rgba(94, 163, 255, 0.08)',
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
  const startCapital = Number(document.getElementById('avgifter-startkapital').value) || 0;
  const monthlySavings = Number(document.getElementById('avgifter-manadssparande').value) || 0;
  const annualReturn = Number(document.getElementById('avgifter-avkastning').value) || 0;
  const years = Number(document.getElementById('avgifter-ar').value) || 0;
  const feeA = Number(document.getElementById('avgifter-a').value) || 0;
  const feeB = Number(document.getElementById('avgifter-b').value) || 0;

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
}

function initFeeComparisonPage() {
  if (!feeForm) {
    return;
  }

  feeForm.addEventListener('submit', function (event) {
    event.preventDefault();
    calculateFeeComparison();
  });

  calculateFeeComparison();
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
}

function calculateInvestment() {
  const { startCapital, monthlySavings, annualReturn, annualFee, annualInflation, years } = getInputs();
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
if (feeForm) {
  initFeeComparisonPage();
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
    return;
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
          backgroundColor: 'rgba(61, 217, 198, 0.12)',
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
          tension: 0.35
        },
        {
          label: 'Eget kapital med hävstång',
          data: result.leverageSeries,
          borderColor: colors.accent,
          backgroundColor: 'rgba(94, 163, 255, 0.08)',
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
          tension: 0.35
        },
        {
          label: 'Skuld',
          data: result.debtSeries,
          borderColor: '#ffd166',
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

  leverageForm.addEventListener('submit', function (event) {
    event.preventDefault();
    calculateLeverage();
  });

  updateLeverageInputsFromMode();
  calculateLeverage();
  
  // Initialize daily leverage form if it exists
  if (dailyLeverageForm) {
    dailyLeverageForm.addEventListener('submit', function (event) {
      event.preventDefault();
      calculateDailyLeverage();
    });

    const addDayBtn = document.getElementById('daily-add-day-btn');
    if (addDayBtn) {
      addDayBtn.addEventListener('click', addDailyMoveInput);
    }

    initializeDailyLeverage();
  }
}

// ========== DAGLIG HÄVSTÅNG FUNCTIONS ==========

function initializeDailyLeverage() {
  const container = document.getElementById('daily-moves-container');
  if (!container) return;

  // Clear any existing inputs
  container.innerHTML = '';

  // Add default 2 days
  addDailyMoveInput();
  addDailyMoveInput();

  // Calculate with defaults
  calculateDailyLeverage();
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
    removeBtn.style.cssText = 'width: auto; padding: 10px 12px; margin-bottom: 0; background: rgba(255, 50, 50, 0.1); color: #ff3232; border-color: rgba(255, 50, 50, 0.3);';
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
      btn.style.cssText = 'width: auto; padding: 10px 12px; margin-bottom: 0; background: rgba(255, 50, 50, 0.1); color: #ff3232; border-color: rgba(255, 50, 50, 0.3);';
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
          backgroundColor: 'rgba(94, 163, 255, 0.12)',
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
          backgroundColor: 'rgba(61, 217, 198, 0.12)',
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
      <td style="padding: 12px 8px; text-align: right; color: ${detail.move >= 0 ? 'var(--success)' : '#ff6b6b'};">${formatPercent(detail.move)}</td>
      <td style="padding: 12px 8px; text-align: right; color: ${detail.leveragedMove >= 0 ? 'var(--success)' : '#ff6b6b'};">${formatPercent(detail.leveragedMove)}</td>
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

function initRecoveryPage() {
  if (!recoveryForm) {
    return;
  }

  recoveryForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const dropField = document.getElementById('recovery-nedgang');
    const amountField = document.getElementById('recovery-belopp');
    const errorBox = document.getElementById('recovery-error');
    const summary = document.getElementById('recovery-summary');

    const dropPercent = Number(dropField.value);
    const amountValue = amountField.value === '' ? null : Number(amountField.value);

    const errorText = document.getElementById('recovery-error');
    errorText.textContent = 'Ogiltigt värde.';

    if (dropField.value === '' || Number.isNaN(dropPercent) || dropPercent < 0 || dropPercent >= 100) {
      errorText.textContent = 'Nedgång måste vara ett värde mellan 0 % och mindre än 100 %.';
      errorBox.classList.remove('hidden');
      return;
    }

    if (amountValue !== null && amountValue < 0) {
      errorText.textContent = 'Investerat belopp får inte vara negativt.';
      errorBox.classList.remove('hidden');
      return;
    }

    errorBox.classList.add('hidden');

    try {
      const calculation = calculateRecoveryRequiredGain(dropPercent, amountValue);
      const requiredGainEl = document.getElementById('recovery-required-gain');

      requiredGainEl.textContent = formatPercent(calculation.requiredGain);

      summary.textContent = `Efter en nedgång på ${dropPercent.toFixed(1).replace(/\.0$/, '')} % krävs en uppgång på ${new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(calculation.requiredGain)} % för att komma tillbaka till startvärdet.`;

      const amountBoxes = [
        document.getElementById('recovery-start-value-box'),
        document.getElementById('recovery-after-drop-box'),
        document.getElementById('recovery-loss-box'),
        document.getElementById('recovery-recovered-box')
      ];

      if (amountValue !== null) {
        amountBoxes.forEach((box) => box.classList.remove('hidden'));
        document.getElementById('recovery-start-value').textContent = formatCurrency(amountValue);
        document.getElementById('recovery-after-drop').textContent = formatCurrency(calculation.currentValue);
        document.getElementById('recovery-loss').textContent = formatCurrency(calculation.lossAmount);
        document.getElementById('recovery-recovered').textContent = formatCurrency(calculation.recoveredValue);
      } else {
        amountBoxes.forEach((box) => box.classList.add('hidden'));
      }

      const visualStart = document.getElementById('recovery-visual-start');
      const visualDrop = document.getElementById('recovery-visual-drop');
      const visualAfter = document.getElementById('recovery-visual-after');
      const visualGain = document.getElementById('recovery-visual-gain');
      const visualRecovered = document.getElementById('recovery-visual-recovered');

      const startValue = amountValue !== null ? amountValue : 100;
      const afterDropValue = amountValue !== null ? calculation.currentValue : 100 * (1 - dropPercent / 100);
      const recoveredValue = amountValue !== null ? calculation.recoveredValue : afterDropValue * (1 + calculation.requiredGain / 100);

      visualStart.textContent = amountValue !== null ? formatCurrency(startValue) : '100';
      visualDrop.textContent = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(dropPercent);
      visualAfter.textContent = amountValue !== null ? formatCurrency(afterDropValue) : new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(afterDropValue);
      visualGain.textContent = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(calculation.requiredGain);
      visualRecovered.textContent = amountValue !== null ? formatCurrency(recoveredValue) : new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(recoveredValue);
    } catch (error) {
      errorBox.classList.remove('hidden');
      errorBox.textContent = error.message;
    }
  });
}

if (recoveryForm) {
  initRecoveryPage();
}

if (leverageForm) {
  initLeveragePage();
}
