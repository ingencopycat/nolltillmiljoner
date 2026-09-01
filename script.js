const form = document.getElementById('calculator-form');
const dividendForm = document.getElementById('dividend-form');
const feeForm = document.getElementById('avgifts-form');
const leverageForm = document.getElementById('leverage-form');
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
    mode: document.querySelector('.leverage-mode-tab.active') ? document.querySelector('.leverage-mode-tab.active').dataset.leverageMode : 'bostad',
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
    assetValue -= interestPayment;
    remainingDebt = Math.max(0, remainingDebt - amortizationPayment);

    const projectedNoLeverage = equity * Math.pow(1 + expectedReturn / 100, month / 12);
    const projectedLeveragedEquity = Math.max(0, assetValue - remainingDebt);

    finalWithoutLeverage = projectedNoLeverage;
    finalWithLeverage = projectedLeveragedEquity;

    labels.push(String(Math.floor(month / 12)));
    noLeverageSeries.push(finalWithoutLeverage);
    leverageSeries.push(finalWithLeverage);
    debtSeries.push(remainingDebt);
  }

  const finalDebt = remainingDebt;
  const roe = equity > 0 ? ((finalWithLeverage - equity) / equity) * 100 : 0;
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

  const diff = result.finalWithLeverage - result.finalWithoutLeverage;
  differenceEl.textContent = formatCurrency(Math.abs(diff));
  differenceMetaEl.textContent = diff >= 0 ? 'Mer eget kapital med hävstång' : 'Sämre eget kapital med hävstång';

  if (typeof result.finalWithLeverage === 'number' && typeof result.finalWithoutLeverage === 'number') {
    differenceEl.textContent = formatCurrency(result.finalWithLeverage - result.finalWithoutLeverage);
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
      leverageModeTabs.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });
    });
  });

  leverageForm.addEventListener('submit', function (event) {
    event.preventDefault();
    calculateLeverage();
  });

  updateLeverageInputsFromMode();
  calculateLeverage();
}

if (leverageForm) {
  initLeveragePage();
}
