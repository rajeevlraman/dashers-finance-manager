import { getAllItems, STORE_NAMES } from './db.js';

// Chart instances stored globally
let catChart = null;
let trendChart = null;
let summaryChart = null;

export async function initDashboardUI() {
  console.log("✅ initDashboardUI() executing...");
  const mainContent = document.getElementById('mainContent');
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
      <div class="dashboard-header">
        <h2>📊 Dashboard</h2>
        <div class="dashboard-date">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      <div class="dashboard-container">
        <!-- Financial Health Summary -->
        <div class="dashboard-section">
          <h3>💰 Financial Health</h3>
          <div class="summary-cards">
            <div class="card ${currentMonthBalance >= 0 ? 'green' : 'red'}">
              <div class="card-icon">💵</div>
              <div class="card-content">
                <h4>This Month</h4>
                <p class="card-value">$${safe(currentMonthBalance)}</p>
                <small>Income: $${safe(currentMonthIncome)} • Expenses: $${safe(currentMonthExpenses)}</small>
              </div>
            </div>
            
            <div class="card ${totalNetWorth >= 0 ? 'blue' : 'orange'}">
              <div class="card-icon">🏦</div>
              <div class="card-content">
                <h4>Net Worth</h4>
                <p class="card-value">$${safe(totalNetWorth)}</p>
                <small>Cash: $${safe(totalCashBalance)} • Properties: $${safe(netPropertyWorth)}</small>
              </div>
            </div>
            
            <div class="card ${budgetPerformance.overBudgetCount === 0 ? 'teal' : 'yellow'}">
              <div class="card-icon">🎯</div>
              <div class="card-content">
                <h4>Budget Status</h4>
                <p class="card-value">${budgetPerformance.onTrackCount}/${budgetPerformance.totalBudgets}</p>
                <small>${budgetPerformance.overBudgetCount} over budget</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Property Portfolio -->
        <div class="dashboard-section">
          <h3>🏠 Property Portfolio</h3>
          <div class="summary-cards">
            <div class="card teal">
              <div class="card-icon">🏘️</div>
              <div class="card-content">
                <h4>Properties</h4>
                <p class="card-value">${properties.length}</p>
                <small>Value: $${safe(totalValue)}</small>
              </div>
            </div>
            
            <div class="card gold">
              <div class="card-icon">👥</div>
              <div class="card-content">
                <h4>Tenants</h4>
                <p class="card-value">${tenants.length}</p>
                <small>Rent: $${safe(totalRent)}/mo</small>
              </div>
            </div>
            
            <div class="card purple">
              <div class="card-icon">📈</div>
              <div class="card-content">
                <h4>ROI</h4>
                <p class="card-value">${avgROI}%</p>
                <small>Average Return</small>
              </div>
            </div>
            
            <div class="card ${netPropertyWorth >= 0 ? 'green' : 'red'}">
              <div class="card-icon">💎</div>
              <div class="card-content">
                <h4>Equity</h4>
                <p class="card-value">$${safe(netPropertyWorth)}</p>
                <small>Loans: $${safe(totalLoan)}</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Stats Grid -->
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Total Income</span>
            <span class="stat-value">$${safe(income)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Expenses</span>
            <span class="stat-value">$${safe(expenses)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Cash Balance</span>
            <span class="stat-value">$${safe(totalCashBalance)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Credit Balance</span>
            <span class="stat-value">$${safe(totalCreditBalance)}</span>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="charts-container">
          <div class="chart-card">
            <div class="chart-header">
              <h4>Monthly Overview</h4>
              <select id="monthSelect" class="chart-select">
                ${uniqueMonths.map(m => `<option value="${m}" ${m === latestMonth ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
            <canvas id="summaryChart" height="200"></canvas>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <h4>Expense Categories</h4>
              <span id="selectedMonthDisplay">${latestMonth}</span>
            </div>
            <canvas id="expenseByCatChart" height="220"></canvas>
          </div>

          <div class="chart-card full-width">
            <div class="chart-header">
              <h4>Income vs Expenses Trend</h4>
              <button id="toggleTrend" class="btn-secondary">📉 Hide Chart</button>
            </div>
            <canvas id="trendChart" height="250"></canvas>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="dashboard-section">
          <h3>📝 Recent Activity</h3>
          <div class="recent-activity">
            ${getRecentActivity(transactions, bills, maintenance).slice(0, 5).map(item => `
              <div class="activity-item">
                <span class="activity-icon">${item.icon}</span>
                <span class="activity-desc">${item.description}</span>
                <span class="activity-amount ${item.amount < 0 ? 'negative' : 'positive'}">${item.amount < 0 ? '-' : '+'}$${Math.abs(item.amount).toFixed(2)}</span>
                <span class="activity-date">${item.date}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    if (typeof Chart === 'undefined') throw new Error('Chart.js not loaded');

    // === IMPROVED CHARTS ===
    
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
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => `$${ctx.raw.toFixed(2)}` } }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (value) => '$' + value }
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
            plugins: {
              legend: { position: 'right' },
              tooltip: { callbacks: { label: (ctx) => `${ctx.label}: $${ctx.raw.toFixed(2)}` } }
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
            plugins: {
              legend: { position: 'bottom' }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { callback: (value) => '$' + value }
              }
            }
          }
        });
      } else if (trendCtx) {
        // Show message if no data
        trendCtx.parentElement.innerHTML += '<p class="no-data">No trend data available</p>';
      }
    }

    // === Event Listeners ===
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
        <button onclick="initDashboardUI()" class="btn-primary">Retry</button>
      </div>
    `;
  }
}

// === NEW HELPER FUNCTIONS ===
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

// === EXISTING HELPER FUNCTIONS ===
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