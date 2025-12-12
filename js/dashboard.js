import { getAllItems, STORE_NAMES } from './db.js';

// Chart instances stored globally
let catChart = null;
let trendChart = null;
let summaryChart = null;
let autoRefreshInterval = null;

// Global functions for HTML interactions
window.toggleSection = function(header) {
  const content = header.nextElementSibling;
  const icon = header.querySelector('.toggle-icon');
  content.style.display = content.style.display === 'none' ? 'block' : 'none';
  icon.textContent = content.style.display === 'none' ? '▼' : '▲';
};

window.quickAction = function(action) {
  const actions = {
    expense: () => window.showAddTransactionModal?.('expense'),
    income: () => window.showAddTransactionModal?.('income'),
    property: () => window.showAddPropertyModal?.(),
    bill: () => window.showAddBillModal?.()
  };
  
  if (actions[action]) {
    actions[action]();
    // Close FAB
    const fabActions = document.querySelector('.fab-actions');
    const fabMain = document.querySelector('.fab-main');
    if (fabActions) fabActions.classList.remove('show');
    if (fabMain) fabMain.textContent = '+';
  }
};

window.showDrillDownModal = function(label, data) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Details: ${label}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

export async function initDashboardUI() {
  console.log("✅ initDashboardUI() executing...");

// Greeting + Date Helpers
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning, Rajeev";
  if (hour < 17) return "Good Afternoon, Rajeev";
  return "Good Evening, Rajeev";
}

function getTodayDate() {
  return new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
  async function getWeather() {
    try {
      const response = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=-37.8136&longitude=144.9631&current_weather=true"
      );
      const data = await response.json();
      const w = data.current_weather;

      // Simple weather description for now
      let desc = "Weather";
      if (w.weathercode === 0) desc = "Clear";
      else if (w.weathercode < 3) desc = "Partly Cloudy";
      else desc = "Cloudy";

      return `${w.temperature}°C • ${desc}`;
    } catch (e) {
      return "Weather unavailable";
    }
}





  const mainContent = document.getElementById('mainContent');
  mainContent.classList.add('page-transition');
  mainContent.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading dashboard...</p></div>';

  try {
    // === Fetch all core + property data ===
    const [transactions, bills, categories, properties, tenants, loans, maintenance, accounts, budgets] = await Promise.all([
      getAllItems(STORE_NAMES.transactions),
      getAllItems(STORE_NAMES.bills),
      getAllItems(STORE_NAMES.categories),
      getAllItems(STORE_NAMES.properties || 'properties').catch(() => []),
      getAllItems(STORE_NAMES.tenants || 'tenants').catch(() => []),
      getAllItems(STORE_NAMES.loans || 'loans').catch(() => []),
      getAllItems(STORE_NAMES.maintenance || 'maintenance').catch(() => []),
      getAllItems(STORE_NAMES.accounts).catch(() => []),
      getAllItems(STORE_NAMES.budgets).catch(() => [])
    ]);

    // === Current period calculations ===
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthIncome = transactions
      .filter(t => t.type === 'income' && t.date?.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
    const currentMonthExpenses = transactions
      .filter(t => t.type === 'expense' && t.date?.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
    const currentMonthBalance = currentMonthIncome - currentMonthExpenses;

    // === Financial totals ===
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expenses;

    // === Account balances ===
    const totalCashBalance = accounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
    const totalCreditBalance = accounts
      .filter(acc => acc.type === 'credit')
      .reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);

    // === Property-specific calculations ===
    const totalValue = properties.reduce((sum, p) => sum + (parseFloat(p.currentValue) || 0), 0);
    const totalLoan = loans.reduce((sum, l) => sum + (parseFloat(l.currentBalance) || 0), 0);
    const totalRent = tenants.reduce((sum, t) => sum + (parseFloat(t.rent) || 0), 0);
    const maintCost = maintenance.reduce((sum, m) => sum + (parseFloat(m.cost) || 0), 0);
    const avgROI = calcAvgROI(properties, tenants);
    const netPropertyWorth = totalValue - totalLoan;
    const totalNetWorth = totalCashBalance + netPropertyWorth - Math.abs(totalCreditBalance);

    // === Budget performance ===
    const budgetPerformance = calculateBudgetPerformance(budgets, transactions, currentMonth);

    // === Get available months from transactions ===
    const uniqueMonths = Array.from(
      new Set(
        transactions.map(t => {
          const d = new Date(t.date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        })
      )
    ).sort();

    const latestMonth = uniqueMonths.at(-1) || currentMonth;

    // === Main HTML Layout ===
    mainContent.innerHTML = `
    <div class="dashboard-wrapper">

      <!-- Welcome / Greeting -->
      <section class="welcome-section card">
        <div class="welcome-left">
          <h2 id="welcomeGreeting"></h2>
          <p class="welcome-sub">
            <span id="welcomeDate"></span>
            <span id="welcomeWeather"></span>
          </p>
        </div>
        <div class="welcome-actions">
          <button id="exportDashboard" class="btn btn-outline">📊 Export</button>
          <button id="liveRefresh" class="btn btn-outline">🔄 Live</button>
        </div>
      </section>

      <!-- Filters -->
      <section class="dashboard-filters card">
        <h3 class="section-title">Filters</h3>
        <div class="filters-grid">
          <select id="propertyFilter">
            <option value="all">All Properties</option>
            ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>

          <select id="categoryFilter">
            <option value="all">All Categories</option>
            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>

          <input type="date" id="dateFrom">
          <input type="date" id="dateTo">

          <button id="applyFilters" class="btn btn-primary">Apply</button>
          <button id="resetFilters" class="btn btn-secondary">Reset</button>
        </div>
      </section>

      <!-- KPI GRID -->
      <section class="kpi-grid">
        <div class="kpi-card green">
          <div class="kpi-icon">💵</div>
          <div>
            <div class="kpi-value">$${safe(currentMonthBalance)}</div>
            <div class="kpi-label">This Month</div>
            <small>Income $${safe(currentMonthIncome)} | Expense $${safe(currentMonthExpenses)}</small>
          </div>
        </div>

        <div class="kpi-card blue">
          <div class="kpi-icon">🏦</div>
          <div>
            <div class="kpi-value">$${safe(totalNetWorth)}</div>
            <div class="kpi-label">Net Worth</div>
            <small>Cash $${safe(totalCashBalance)} | Property $${safe(netPropertyWorth)}</small>
          </div>
        </div>

        <div class="kpi-card teal">
          <div class="kpi-icon">🎯</div>
          <div>
            <div class="kpi-value">${budgetPerformance.onTrackCount}/${budgetPerformance.totalBudgets}</div>
            <div class="kpi-label">Budgets On Track</div>
            <small>${budgetPerformance.overBudgetCount} over budget</small>
          </div>
        </div>

        <div class="kpi-card purple">
          <div class="kpi-icon">📈</div>
          <div>
            <div class="kpi-value">$${safe(totalRent)}</div>
            <div class="kpi-label">Rent Income</div>
            <small>${tenants.length} tenants, ${properties.length} properties</small>
          </div>
        </div>
      </section>

      <!-- Charts Section -->
      <section class="dashboard-charts">
        <div class="chart-card card">
          <div class="chart-header">
            <h4>📅 Monthly Overview</h4>
            <select id="monthSelect">
              ${uniqueMonths.map(m => `<option value="${m}" ${m === latestMonth ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
          <canvas id="summaryChart"></canvas>
        </div>

        <div class="chart-card card">
          <div class="chart-header">
            <h4>📊 Expenses by Category</h4>
            <span class="month-badge" id="selectedMonthDisplay">${latestMonth}</span>
          </div>
          <canvas id="expenseByCatChart"></canvas>
        </div>

        <div class="chart-card card wide">
          <div class="chart-header">
            <h4>📈 Trend</h4>
            <button id="toggleTrend" class="btn btn-secondary">📉 Hide</button>
          </div>
          <canvas id="trendChart"></canvas>
        </div>
      </section>

      <!-- Recent Activity -->
      <section class="recent-section card">
        <h3 class="section-title">📝 Recent Activity</h3>
        ${getRecentActivity(transactions, bills, maintenance).slice(0, 5).map(item => `
          <div class="activity-row">
            <span class="activity-icon">${item.icon}</span>
            <div class="activity-info">
              <div>${item.description}</div>
              <small>${item.date}</small>
            </div>
            <span class="activity-amount ${item.amount < 0 ? 'negative' : 'positive'}">
              ${item.amount < 0 ? '-' : '+'}$${Math.abs(item.amount).toFixed(2)}
            </span>
          </div>
        `).join('')}
      </section>

      <!-- FAB -->
      <div class="fab-container">
        <div class="fab-actions">
          <button onclick="quickAction('expense')">💸 Expense</button>
          <button onclick="quickAction('income')">💰 Income</button>
          <button onclick="quickAction('property')">🏠 Property</button>
          <button onclick="quickAction('bill')">🧾 Bill</button>
        </div>
        <button class="fab-main">+</button>
      </div>

    </div>

    `;

    // Populate Welcome Banner
    document.getElementById("welcomeGreeting").textContent = getGreeting();
    document.getElementById("welcomeDate").textContent = getTodayDate();
    // Weather (async)
    getWeather().then(weather => {
      document.getElementById("welcomeWeather").textContent = `• ${weather}`;
    });


    setTimeout(() => mainContent.classList.remove('page-transition'), 400);

    if (typeof Chart === 'undefined') throw new Error('Chart.js not loaded');

    // === IMPROVED CHARTS WITH INTERACTIVITY ===
    
    // Destroy existing charts before creating new ones
    if (summaryChart) {
      summaryChart.destroy();
      summaryChart = null;
    }

    // Summary Chart (Bar)
    const summaryCtx = document.getElementById('summaryChart');
    if (summaryCtx) {
      summaryChart = new Chart(summaryCtx, {
        type: 'bar',
        data: {
          labels: ['Income', 'Expenses', 'Balance', 'Rent Income'],
          datasets: [{
            label: 'Amount ($)',
            data: [currentMonthIncome, currentMonthExpenses, currentMonthBalance, totalRent],
            backgroundColor: ['#2ecc71', '#e74c3c', '#3498db', '#f39c12'],
            borderColor: ['#27ae60', '#c0392b', '#2980b9', '#e67e22'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: {
            legend: { display: false },
            tooltip: { 
              callbacks: { 
                label: (ctx) => `$${ctx.raw.toFixed(2)}` 
              } 
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (value) => '$' + value }
            }
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const labels = ['Income', 'Expenses', 'Balance', 'Rent Income'];
              const values = [currentMonthIncome, currentMonthExpenses, currentMonthBalance, totalRent];
              window.showDrillDownModal(labels[index], values[index]);
            }
          }
        }
      });
    }

    // Category Chart (Doughnut)
    function renderCategoryChart(selectedMonth) {
      const filteredTx = transactions.filter(
        t => t.type === 'expense' && t.date?.startsWith(selectedMonth)
      );
      
      const expensesByCategory = {};
      filteredTx.forEach(t => {
        const cat = t.categoryId || 'Uncategorized';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.amount;
      });

      const catLabels = Object.keys(expensesByCategory).map(
        id => categories.find(c => c.id === id)?.name || 'Other'
      );
      const catData = Object.values(expensesByCategory);
      
      // Destroy existing chart
      if (catChart) {
        catChart.destroy();
        catChart = null;
      }

      document.getElementById('selectedMonthDisplay').textContent = selectedMonth;

      const catCtx = document.getElementById('expenseByCatChart');
      if (catCtx && catData.length > 0) {
        catChart = new Chart(catCtx, {
          type: 'doughnut',
          data: {
            labels: catLabels,
            datasets: [{
              data: catData,
              backgroundColor: generateColorPalette(catLabels.length),
              borderWidth: 2,
              borderColor: '#fff'
            }]
          },
          options: {
            responsive: true,
            interaction: {
              intersect: false,
              mode: 'index'
            },
            plugins: {
              legend: { position: 'right' },
              tooltip: { 
                callbacks: { 
                  label: (ctx) => `${ctx.label}: $${ctx.raw.toFixed(2)}`,
                  afterLabel: function(context) {
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                    return `(${percentage}% of total)`;
                  }
                } 
              }
            },
            onClick: (event, elements) => {
              if (elements.length > 0) {
                const index = elements[0].index;
                const label = catLabels[index];
                const value = catData[index];
                window.showDrillDownModal(label, value);
              }
            }
          }
        });
      } else if (catCtx) {
        // Show message if no data
        catCtx.parentElement.innerHTML += '<p class="no-data">No expense data for this month</p>';
      }
    }

    // Trend Chart (Line)
    function renderTrendChart() {
      const monthly = {};
      transactions.forEach(t => {
        if (!t.date) return;
        const key = t.date.slice(0, 7);
        if (!monthly[key]) monthly[key] = { income: 0, expense: 0, net: 0 };
        monthly[key][t.type] += t.amount;
        monthly[key].net = monthly[key].income - monthly[key].expense;
      });

      const months = Object.keys(monthly).sort();
      const incomeData = months.map(m => monthly[m].income);
      const expenseData = months.map(m => monthly[m].expense);
      const netData = months.map(m => monthly[m].net);

      // Destroy existing chart
      if (trendChart) {
        trendChart.destroy();
        trendChart = null;
      }

      const trendCtx = document.getElementById('trendChart');
      if (trendCtx && months.length > 0) {
        trendChart = new Chart(trendCtx, {
          type: 'line',
          data: {
            labels: months.map(m => formatMonthLabel(m)),
            datasets: [
              {
                label: 'Income',
                data: incomeData,
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                fill: true,
                tension: 0.4
              },
              {
                label: 'Expenses',
                data: expenseData,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                fill: true,
                tension: 0.4
              },
              {
                label: 'Net',
                data: netData,
                borderColor: '#3498db',
                borderDash: [5, 5],
                fill: false,
                tension: 0.4
              }
            ]
          },
          options: {
            responsive: true,
            interaction: {
              intersect: false,
              mode: 'index'
            },
            plugins: {
              legend: { position: 'bottom' },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { callback: (value) => '$' + value }
              }
            },
            onClick: (event, elements) => {
              if (elements.length > 0) {
                const index = elements[0].index;
                const label = months[index];
                const income = incomeData[index];
                const expense = expenseData[index];
                window.showDrillDownModal(`Month: ${formatMonthLabel(label)}`, { income, expense });
              }
            }
          }
        });
      } else if (trendCtx) {
        // Show message if no data
        trendCtx.parentElement.innerHTML += '<p class="no-data">No trend data available</p>';
      }
    }

    // === NEW EVENT LISTENERS FOR TWEAKS ===
    
    // Export Dashboard Data
    const exportBtn = document.getElementById('exportDashboard');
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        const dashboardData = {
          summary: {
            currentMonthIncome,
            currentMonthExpenses,
            currentMonthBalance,
            totalNetWorth,
            totalCashBalance,
            totalCreditBalance
          },
          charts: {
            categories: getChartData(catChart),
            trend: getChartData(trendChart),
            summary: getChartData(summaryChart)
          },
          portfolio: {
            properties: properties.length,
            tenants: tenants.length,
            totalValue,
            totalLoan,
            netPropertyWorth,
            avgROI
          },
          timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(dashboardData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Live Refresh Toggle
    const liveRefreshBtn = document.getElementById('liveRefresh');
    if (liveRefreshBtn) {
      liveRefreshBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        if (this.classList.contains('active')) {
          autoRefreshInterval = setInterval(initDashboardUI, 30000); // 30 seconds
          this.innerHTML = '⏸️ Pause Auto-Refresh';
        } else {
          clearInterval(autoRefreshInterval);
          this.innerHTML = '🔄 Live Data';
        }
      });
    }

    // Filter Controls
    const applyFiltersBtn = document.getElementById('applyFilters');
    const resetFiltersBtn = document.getElementById('resetFilters');
    
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', resetFilters);
    }

    // FAB Toggle
    const fabMain = document.querySelector('.fab-main');
    if (fabMain) {
      fabMain.addEventListener('click', function() {
        const fabActions = document.querySelector('.fab-actions');
        fabActions.classList.toggle('show');
        this.textContent = fabActions.classList.contains('show') ? '×' : '+';
      });
    }

    // Existing Event Listeners
    const monthSelect = document.getElementById('monthSelect');
    if (monthSelect) {
      monthSelect.addEventListener('change', (e) => {
        renderCategoryChart(e.target.value);
      });
    }

    const toggleBtn = document.getElementById('toggleTrend');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const trendChartEl = document.getElementById('trendChart');
        if (trendChartEl) {
          const isHidden = trendChartEl.style.display === 'none';
          trendChartEl.style.display = isHidden ? 'block' : 'none';
          toggleBtn.textContent = isHidden ? '📉 Hide Chart' : '📈 Show Chart';
        }
      });
    }

    // === Initial Render ===
    renderCategoryChart(latestMonth);
    renderTrendChart();

    console.log("✅ Dashboard rendered successfully");
  } catch (err) {
    console.error("❌ Dashboard failed:", err);
    mainContent.innerHTML = `
      <div class="error-state">
        <h3>⚠️ Dashboard Error</h3>
        <p>${err.message}</p>
        <button onclick="initDashboardUI()" class="btn btn-primary">Retry</button>
      </div>
    `;
  }
}

// Filter Functions
function applyFilters() {
  const propertyFilter = document.getElementById('propertyFilter').value;
  const categoryFilter = document.getElementById('categoryFilter').value;
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo = document.getElementById('dateTo').value;
  
  // Store filter state and reload dashboard
  localStorage.setItem('dashboardFilters', JSON.stringify({
    propertyFilter,
    categoryFilter,
    dateFrom,
    dateTo
  }));
    // Force reload with filters
  location.reload();
 
}

function resetFilters() {
  document.getElementById('propertyFilter').value = 'all';
  document.getElementById('categoryFilter').value = 'all';
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  
  localStorage.removeItem('dashboardFilters');
  initDashboardUI();
}

// Chart Data Export Helper
function getChartData(chart) {
  if (!chart) return null;
  return {
    labels: chart.data.labels,
    datasets: chart.data.datasets.map(dataset => ({
      label: dataset.label,
      data: dataset.data
    }))
  };
}

// === EXISTING HELPER FUNCTIONS ===

function calculateBudgetPerformance(budgets, transactions, currentMonth) {
  if (!budgets || !budgets.length) return { onTrackCount: 0, overBudgetCount: 0, totalBudgets: 0 };
  
  let onTrackCount = 0;
  let overBudgetCount = 0;

  budgets.forEach(budget => {
    const spent = transactions
      .filter(t => t.categoryId === budget.categoryId && t.date?.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
    
    if (spent <= budget.amount) {
      onTrackCount++;
    } else {
      overBudgetCount++;
    }
  });

  return {
    onTrackCount,
    overBudgetCount,
    totalBudgets: budgets.length
  };
}

function getRecentActivity(transactions, bills, maintenance) {
  const activities = [];
  
  // Recent transactions
  if (transactions && transactions.length > 0) {
    transactions.slice(-10).forEach(t => {
      activities.push({
        icon: t.type === 'income' ? '💹' : '💸',
        description: `${t.type === 'income' ? 'Income' : 'Expense'}: ${t.description || 'Transaction'}`,
        amount: t.type === 'income' ? t.amount : -t.amount,
        date: new Date(t.date).toLocaleDateString(),
        timestamp: new Date(t.date).getTime()
      });
    });
  }

  // Recent bills
  if (bills && bills.length > 0) {
    bills.slice(-5).forEach(bill => {
      activities.push({
        icon: '📄',
        description: `Bill: ${bill.name}`,
        amount: -bill.amount,
        date: new Date(bill.dueDate).toLocaleDateString(),
        timestamp: new Date(bill.dueDate).getTime()
      });
    });
  }

  // Recent maintenance
  if (maintenance && maintenance.length > 0) {
    maintenance.slice(-5).forEach(maint => {
      activities.push({
        icon: '🔧',
        description: `Maintenance: ${maint.description}`,
        amount: -maint.cost,
        date: new Date(maint.date).toLocaleDateString(),
        timestamp: new Date(maint.date).getTime()
      });
    });
  }

  // Sort by date and return
  return activities.sort((a, b) => b.timestamp - a.timestamp);
}

function formatMonthLabel(monthString) {
  const [year, month] = monthString.split('-');
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function generateColorPalette(count) {
  const baseColors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#7CFFB2', '#F465C5'
  ];
  return Array.from({ length: count }, (_, i) => baseColors[i % baseColors.length]);
}

function calcAvgROI(properties, tenants) {
  if (!properties || !properties.length) return 0;
  const rois = properties.map(p => {
    const t = tenants.find(t => t.propertyId === p.id);
    if (!p.purchasePrice || !t?.rent) return 0;
    return ((t.rent * 12) / p.purchasePrice * 100);
  });
  return (rois.reduce((a, b) => a + b, 0) / rois.length).toFixed(1);
}

function safe(num) {
  return isNaN(num) || num == null ? '0.00' : parseFloat(num).toFixed(2);
}

// Cleanup function to stop auto-refresh when leaving dashboard
export function cleanupDashboard() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

