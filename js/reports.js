import { getAllItems, STORE_NAMES } from './db.js';
import { escapeHtml } from './sanitize.js';

let activeCharts = [];
let allTransactions = [];
let allCategories = [];
let allAccounts = [];

export async function initReportsUI() {
  const mainContent = document.getElementById('mainContent');

  mainContent.innerHTML = `
    <div class="reports-container">
      <!-- Header -->
      <div class="reports-header">
        <h2>📊 Financial Reports & Analytics</h2>
        <p class="reports-subtitle">Comprehensive insights into your financial performance</p>
      </div>

      <!-- Controls -->
      <div class="reports-controls">
        <div class="control-group">
          <div class="form-group">
            <label>Date Range</label>
            <select id="dateRange" class="form-select">
              <option value="all">All Time</option>
              <option value="year">This Year</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          <div class="form-group" id="customDateRange" style="display: none;">
            <label>Custom Range</label>
            <div class="date-inputs">
              <input type="date" id="startDate" class="form-input">
              <span>to</span>
              <input type="date" id="endDate" class="form-input">
            </div>
          </div>
        </div>
        <div class="control-actions">
          <button class="btn btn-primary" id="refreshReports">
            🔄 Refresh Reports
          </button>
        </div>
      </div>

      <!-- Quick Stats -->
      <div id="quickStats" class="quick-stats">
        <div class="loading-spinner">Loading financial statistics...</div>
      </div>

      <!-- Reports Grid -->
      <div class="reports-grid" id="reportsGrid">
        <div class="loading-spinner">Loading charts...</div>
      </div>
    </div>
  `;

  await initializeReports();
}

// ============================================================================
// 🏗️ INITIALIZATION
// ============================================================================

async function initializeReports() {
  try {
    [allTransactions, allCategories, allAccounts] = await Promise.all([
      getAllItems(STORE_NAMES.transactions),
      getAllItems(STORE_NAMES.categories),
      getAllItems(STORE_NAMES.accounts).catch(() => [])
    ]);

    
    // Initialize date inputs after data is loaded
    initializeDateInputs();
    setupReportsEventListeners();
    
    await renderQuickStats();
    await renderReportsGrid();
    
  } catch (error) {
    console.error('❌ Failed to initialize reports:', error);
    showError('Failed to load reports data: ' + error.message);
  }
}

function initializeDateInputs() {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  
  if (startDateInput) {
    startDateInput.value = oneYearAgo.toISOString().split('T')[0];
  }
  if (endDateInput) {
    endDateInput.value = now.toISOString().split('T')[0];
  }
}

function setupReportsEventListeners() {
  // Date range controls
  const dateRangeSelect = document.getElementById('dateRange');
  if (dateRangeSelect) {
    dateRangeSelect.addEventListener('change', function(e) {
      const customRange = document.getElementById('customDateRange');
      if (customRange) {
        customRange.style.display = e.target.value === 'custom' ? 'block' : 'none';
      }
      refreshAllCharts();
    });
  }

  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  if (startDateInput) startDateInput.addEventListener('change', refreshAllCharts);
  if (endDateInput) endDateInput.addEventListener('change', refreshAllCharts);

  // Action buttons
  const refreshBtn = document.getElementById('refreshReports');
  if (refreshBtn) refreshBtn.addEventListener('click', refreshAllCharts);
}

// ============================================================================
// 🔄 REFRESH FUNCTIONS
// ============================================================================

async function refreshAllCharts() {
  try {
    await renderQuickStats();
    await renderReportsGrid();
  } catch (error) {
    console.error('Error refreshing charts:', error);
    showError('Failed to refresh reports: ' + error.message);
  }
}

// ============================================================================
// 📊 QUICK STATS DASHBOARD
// ============================================================================

async function renderQuickStats() {
  const filteredTransactions = getFilteredTransactions();
  const stats = calculateFinancialStats(filteredTransactions);

  const statsContainer = document.getElementById('quickStats');
  if (!statsContainer) return;

  statsContainer.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card total-income">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">${formatCurrency(stats.totalIncome)}</div>
          <div class="stat-label">Total Income</div>
        </div>
      </div>

      <div class="stat-card total-expenses">
        <div class="stat-icon">💸</div>
        <div class="stat-content">
          <div class="stat-value">${formatCurrency(stats.totalExpenses)}</div>
          <div class="stat-label">Total Expenses</div>
        </div>
      </div>

      <div class="stat-card net-cashflow">
        <div class="stat-icon">📈</div>
        <div class="stat-content">
          <div class="stat-value ${stats.netCashFlow >= 0 ? 'positive' : 'negative'}">
            ${formatCurrency(stats.netCashFlow)}
          </div>
          <div class="stat-label">Net Cash Flow</div>
          <div class="stat-subtext">${stats.netCashFlow >= 0 ? 'Surplus' : 'Deficit'}</div>
        </div>
      </div>

      <div class="stat-card transaction-count">
        <div class="stat-icon">📝</div>
        <div class="stat-content">
          <div class="stat-value">${stats.transactionCount}</div>
          <div class="stat-label">Transactions</div>
          <div class="stat-subtext">${stats.incomeCount} income, ${stats.expenseCount} expense</div>
        </div>
      </div>

      <div class="stat-card savings-rate">
        <div class="stat-icon">🐷</div>
        <div class="stat-content">
          <div class="stat-value ${stats.savingsRate >= 0 ? 'positive' : 'negative'}">${stats.savingsRate.toFixed(1)}%</div>
          <div class="stat-label">Savings Rate</div>
        </div>
      </div>

      <div class="stat-card avg-monthly">
        <div class="stat-icon">📅</div>
        <div class="stat-content">
          <div class="stat-value">${formatCurrency(stats.avgMonthlyExpense)}</div>
          <div class="stat-label">Avg Monthly Spend</div>
        </div>
      </div>

      <div class="stat-card largest-expense">
        <div class="stat-icon">🔍</div>
        <div class="stat-content">
          <div class="stat-value">${formatCurrency(stats.largestExpense.amount)}</div>
          <div class="stat-label">Largest Expense</div>
          <div class="stat-subtext">${escapeHtml(stats.largestExpense.description || 'N/A')}</div>
        </div>
      </div>
    </div>
  `;
}

function calculateFinancialStats(transactions) {
  
  const income = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');
  
  const totalIncome = income.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  // totalExpenses is already a negative sum (expense amounts are stored as
  // negative numbers), so cash flow is income + expenses, not income - expenses.
  // Subtracting here was flipping the sign of every expense, turning real
  // deficits into inflated fake surpluses.
  const netCashFlow = totalIncome + totalExpenses;

  const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

  const monthsSpanned = new Set(
    transactions.filter(t => t.date).map(t => t.date.slice(0, 7))
  ).size || 1;
  const avgMonthlyExpense = Math.abs(totalExpenses) / monthsSpanned;

  const largestExpense = expenses.reduce((max, t) => {
    const amt = Math.abs(parseFloat(t.amount) || 0);
    return amt > max.amount ? { amount: amt, description: t.description || 'Expense' } : max;
  }, { amount: 0, description: '' });

  return {
    totalIncome,
    totalExpenses,
    netCashFlow,
    savingsRate,
    avgMonthlyExpense,
    largestExpense,
    transactionCount: transactions.length,
    incomeCount: income.length,
    expenseCount: expenses.length
  };
}

// ============================================================================
// 📈 REPORTS GRID
// ============================================================================

async function renderReportsGrid() {
  const filteredTransactions = getFilteredTransactions();

  const reportsGrid = document.getElementById('reportsGrid');
  if (!reportsGrid) return;

  // Show message if no transactions
  if (filteredTransactions.length === 0) {
    reportsGrid.innerHTML = `
      <div class="report-card full-width">
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <h3>No Data Available</h3>
          <p>No transactions found for the selected date range.</p>
          <p>Add some transactions to see reports and analytics.</p>
        </div>
      </div>
    `;
    return;
  }

  reportsGrid.innerHTML = `
    <div class="report-card full-width">
      <div class="report-header">
        <h3>📈 Monthly Income vs Expenses</h3>
      </div>
      <div class="chart-container" style="height: 300px;">
        <canvas id="monthlyChart"></canvas>
      </div>
    </div>

    <div class="report-card">
      <div class="report-header">
        <h3>💰 Expense Categories</h3>
      </div>
      <div class="chart-container" style="height: 250px;">
        <canvas id="expenseChart"></canvas>
      </div>
    </div>

    <div class="report-card">
      <div class="report-header">
        <h3>🏆 Top Spending Categories</h3>
      </div>
      <div id="topCategoriesList" class="recent-activity"></div>
    </div>

    <div class="report-card">
      <div class="report-header">
        <h3>🏦 Spend by Account</h3>
      </div>
      <div class="chart-container" style="height: 250px;">
        <canvas id="accountChart"></canvas>
      </div>
    </div>

    <div class="report-card">
      <div class="report-header">
        <h3>💸 Income Sources</h3>
      </div>
      <div class="chart-container" style="height: 250px;">
        <canvas id="incomeChart"></canvas>
      </div>
    </div>

    <div class="report-card full-width">
      <div class="report-header">
        <h3>🗓️ Category Breakdown by Month</h3>
      </div>
      <div id="categoryMonthTable"></div>
    </div>
  `;

  // Render charts with a small delay to ensure DOM is ready
  setTimeout(() => {
    renderAllCharts(filteredTransactions);
  }, 500);
}

// ============================================================================
// 🎨 CHART RENDERING - SIMPLIFIED AND DEBUGGED
// ============================================================================

function renderAllCharts(transactions) {
  
  // Clear existing charts
  activeCharts.forEach(chart => {
    try { 
      chart.destroy(); 
    } catch (e) {
    }
  });
  activeCharts = [];

  // Render each chart individually with error handling
  try {
    renderMonthlyChart(transactions);
  } catch (error) {
    console.error('❌ Error rendering monthly chart:', error);
  }

  try {
    renderExpenseCategoriesChart(transactions);
  } catch (error) {
    console.error('❌ Error rendering expense chart:', error);
  }

  try {
    renderIncomeSourcesChart(transactions);
  } catch (error) {
    console.error('❌ Error rendering income chart:', error);
  }

  try {
    renderTopCategoriesList(transactions);
  } catch (error) {
    console.error('❌ Error rendering top categories list:', error);
  }

  try {
    renderAccountChart(transactions);
  } catch (error) {
    console.error('❌ Error rendering account chart:', error);
  }

  try {
    renderCategoryMonthTable(transactions);
  } catch (error) {
    console.error('❌ Error rendering category/month table:', error);
  }

}

function renderMonthlyChart(transactions) {
  const monthlyData = getMonthlyData(transactions);
  const ctx = document.getElementById('monthlyChart');
  
  if (!ctx) {
    console.error('❌ Monthly chart canvas not found');
    return;
  }

  // Validate data
  if (!monthlyData.labels || monthlyData.labels.length === 0) {
    console.warn('⚠️ No monthly data available');
    ctx.parentElement.innerHTML = '<p class="no-data">No monthly data available</p>';
    return;
  }

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthlyData.labels,
      datasets: [
        {
          label: 'Income',
          data: monthlyData.income,
          backgroundColor: '#27ae60',
          borderColor: '#27ae60',
          borderWidth: 1
        },
        {
          label: 'Expenses',
          data: monthlyData.expenses,
          backgroundColor: '#e74c3c',
          borderColor: '#e74c3c',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Monthly Income vs Expenses'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          },
          title: {
            display: true,
            text: 'Amount (AUD)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Month'
          }
        }
      }
    }
  });
  
  activeCharts.push(chart);
}

function renderExpenseCategoriesChart(transactions) {
  const expenseData = getExpenseCategoriesData(transactions);
  const ctx = document.getElementById('expenseChart');
  
  if (!ctx) {
    console.error('❌ Expense chart canvas not found');
    return;
  }

  if (!expenseData.labels || expenseData.labels.length === 0) {
    console.warn('⚠️ No expense data available');
    ctx.parentElement.innerHTML = '<p class="no-data">No expense data available</p>';
    return;
  }

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: expenseData.labels,
      datasets: [{
        data: expenseData.values,
        backgroundColor: [
          '#e74c3c', '#3498db', '#9b59b6', '#1abc9c', 
          '#f39c12', '#34495e', '#e67e22', '#16a085'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        },
        title: {
          display: true,
          text: 'Expense Categories'
        }
      }
    }
  });
  
  activeCharts.push(chart);
}

function renderIncomeSourcesChart(transactions) {
  const incomeData = getIncomeSourcesData(transactions);
  const ctx = document.getElementById('incomeChart');
  
  if (!ctx) {
    console.error('❌ Income chart canvas not found');
    return;
  }

  if (!incomeData.labels || incomeData.labels.length === 0) {
    console.warn('⚠️ No income data available');
    ctx.parentElement.innerHTML = '<p class="no-data">No income data available</p>';
    return;
  }

  const chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: incomeData.labels,
      datasets: [{
        data: incomeData.values,
        backgroundColor: [
          '#27ae60', '#3498db', '#9b59b6', '#1abc9c', 
          '#f39c12', '#34495e', '#e67e22', '#16a085'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        },
        title: {
          display: true,
          text: 'Income Sources'
        }
      }
    }
  });
  
  activeCharts.push(chart);
}

// ============================================================================
// 🏆 TOP SPENDING CATEGORIES LIST
// ============================================================================

function renderTopCategoriesList(transactions) {
  const container = document.getElementById('topCategoriesList');
  if (!container) return;

  const expenseData = getExpenseCategoriesData(transactions);
  const total = expenseData.values.reduce((sum, v) => sum + v, 0);

  if (expenseData.labels.length === 0) {
    container.innerHTML = '<p class="no-data">No expense data available</p>';
    return;
  }

  container.innerHTML = expenseData.labels.map((label, i) => {
    const amount = expenseData.values[i];
    const percent = total > 0 ? (amount / total) * 100 : 0;
    return `
      <div class="activity-item">
        <span class="activity-icon">🏷️</span>
        <div class="activity-details">
          <div class="activity-desc">${escapeHtml(label)}</div>
          <div class="activity-date">${percent.toFixed(1)}% of total spending</div>
        </div>
        <span class="activity-amount negative">-${formatCurrency(amount)}</span>
      </div>
    `;
  }).join('');
}

// ============================================================================
// 🏦 SPEND BY ACCOUNT CHART
// ============================================================================

function getSpendByAccountData(transactions) {
  const expenses = transactions.filter(t => t.type === 'expense');
  const totals = {};

  expenses.forEach(t => {
    const account = allAccounts.find(a => a.id === t.accountId);
    const name = account?.name || 'Unassigned';
    totals[name] = (totals[name] || 0) + Math.abs(parseFloat(t.amount) || 0);
  });

  const sortedEntries = Object.entries(totals).sort(([, a], [, b]) => b - a);

  return {
    labels: sortedEntries.map(([name]) => name),
    values: sortedEntries.map(([, amount]) => amount)
  };
}

function renderAccountChart(transactions) {
  const accountData = getSpendByAccountData(transactions);
  const ctx = document.getElementById('accountChart');

  if (!ctx) {
    console.error('❌ Account chart canvas not found');
    return;
  }

  if (!accountData.labels || accountData.labels.length === 0) {
    ctx.parentElement.innerHTML = '<p class="no-data">No account data available</p>';
    return;
  }

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: accountData.labels,
      datasets: [{
        data: accountData.values,
        backgroundColor: [
          '#3498db', '#e67e22', '#1abc9c', '#9b59b6',
          '#e74c3c', '#34495e', '#f39c12', '#16a085'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: 'Spend by Account' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}`
          }
        }
      }
    }
  });

  activeCharts.push(chart);
}

// ============================================================================
// 🗓️ CATEGORY BREAKDOWN BY MONTH TABLE
// ============================================================================

function renderCategoryMonthTable(transactions) {
  const container = document.getElementById('categoryMonthTable');
  if (!container) return;

  const expenses = transactions.filter(t => t.type === 'expense' && t.date);
  if (expenses.length === 0) {
    container.innerHTML = '<p class="no-data">No expense data available</p>';
    return;
  }

  // Last 6 months present in the filtered data, oldest to newest
  const monthSet = new Set(expenses.map(t => t.date.slice(0, 7)));
  const months = Array.from(monthSet).sort().slice(-6);

  // Top 8 categories by total spend across those months
  const categoryTotals = {};
  expenses.forEach(t => {
    if (!months.includes(t.date.slice(0, 7))) return;
    const name = getCategoryName(t.categoryId) || 'Uncategorized';
    categoryTotals[name] = (categoryTotals[name] || 0) + Math.abs(parseFloat(t.amount) || 0);
  });
  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name]) => name);

  // Matrix: category -> month -> amount
  const matrix = {};
  topCategories.forEach(cat => { matrix[cat] = {}; months.forEach(m => matrix[cat][m] = 0); });
  expenses.forEach(t => {
    const month = t.date.slice(0, 7);
    const name = getCategoryName(t.categoryId) || 'Uncategorized';
    if (matrix[name] && months.includes(month)) {
      matrix[name][month] += Math.abs(parseFloat(t.amount) || 0);
    }
  });

  const monthLabels = months.map(m => {
    const [year, num] = m.split('-');
    return `${getMonthName(parseInt(num))} ${year}`;
  });

  const columnTotals = months.map(m => topCategories.reduce((sum, cat) => sum + matrix[cat][m], 0));

  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Category</th>
            ${monthLabels.map(m => `<th>${m}</th>`).join('')}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${topCategories.map(cat => {
            const rowTotal = months.reduce((sum, m) => sum + matrix[cat][m], 0);
            return `
              <tr>
                <td>${escapeHtml(cat)}</td>
                ${months.map(m => `<td>${matrix[cat][m] > 0 ? formatCurrency(matrix[cat][m]) : '–'}</td>`).join('')}
                <td><strong>${formatCurrency(rowTotal)}</strong></td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td><strong>Total</strong></td>
            ${columnTotals.map(t => `<td><strong>${formatCurrency(t)}</strong></td>`).join('')}
            <td><strong>${formatCurrency(columnTotals.reduce((a, b) => a + b, 0))}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

// ============================================================================
// 📊 DATA PROCESSING FUNCTIONS
// ============================================================================

function getMonthlyData(transactions) {
  
  const monthly = {};
  
  transactions.forEach(tx => {
    if (!tx.date) {
      console.warn('Transaction missing date:', tx);
      return;
    }
    
    try {
      const date = new Date(tx.date);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date in transaction:', tx.date);
        return;
      }
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = parseFloat(tx.amount) || 0;
      
      if (!monthly[monthKey]) {
        monthly[monthKey] = { income: 0, expenses: 0 };
      }
      
      if (tx.type === 'income') {
        monthly[monthKey].income += amount;
      } else if (tx.type === 'expense') {
        monthly[monthKey].expenses += Math.abs(amount);
      }
    } catch (error) {
      console.error('Error processing transaction:', tx, error);
    }
  });

  const sortedMonths = Object.keys(monthly).sort();
  
  const result = {
    labels: sortedMonths.map(month => {
      const [year, monthNum] = month.split('-');
      return `${getMonthName(parseInt(monthNum))} ${year}`;
    }),
    income: sortedMonths.map(month => monthly[month].income),
    expenses: sortedMonths.map(month => monthly[month].expenses)
  };
  
  return result;
}

function getExpenseCategoriesData(transactions) {
  const expenses = transactions.filter(t => t.type === 'expense');
  
  const categories = {};
  
  expenses.forEach(expense => {
    const categoryName = getCategoryName(expense.categoryId) || 'Uncategorized';
    const amount = Math.abs(parseFloat(expense.amount) || 0);
    categories[categoryName] = (categories[categoryName] || 0) + amount;
  });
  
  // Sort by amount descending and take top 6
  const sortedEntries = Object.entries(categories)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 6);
  
  const result = {
    labels: sortedEntries.map(([name]) => name),
    values: sortedEntries.map(([,amount]) => amount)
  };
  
  return result;
}

function getIncomeSourcesData(transactions) {
  const income = transactions.filter(t => t.type === 'income');
  
  const sources = {};
  
  income.forEach(incomeTx => {
    const source = getCategoryName(incomeTx.categoryId) || incomeTx.description || 'Other Income';
    const amount = parseFloat(incomeTx.amount) || 0;
    sources[source] = (sources[source] || 0) + amount;
  });
  
  // Sort by amount descending and take top 6
  const sortedEntries = Object.entries(sources)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 6);
  
  const result = {
    labels: sortedEntries.map(([name]) => name),
    values: sortedEntries.map(([,amount]) => amount)
  };
  
  return result;
}

// ============================================================================
// 🛠️ UTILITY FUNCTIONS
// ============================================================================

function getFilteredTransactions() {
  const dateRange = document.getElementById('dateRange')?.value || 'all';
  const startDate = document.getElementById('startDate')?.value;
  const endDate = document.getElementById('endDate')?.value;
  
  let filtered = allTransactions.filter(tx => {
    // Basic validation
    if (!tx.date || !tx.type) return false;
    if (isNaN(parseFloat(tx.amount))) return false;
    return true;
  });
  
  
  if (dateRange === 'custom' && startDate && endDate) {
    filtered = filtered.filter(t => t.date >= startDate && t.date <= endDate);
  } else if (dateRange === 'month') {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    filtered = filtered.filter(t => t.date >= monthStart);
  } else if (dateRange === 'year') {
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    filtered = filtered.filter(t => t.date >= yearStart);
  } else if (dateRange === 'quarter') {
    const now = new Date();
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().split('T')[0];
    filtered = filtered.filter(t => t.date >= quarterStart);
  }
  
  return filtered;
}

function getCategoryName(categoryId) {
  if (!categoryId) return 'Uncategorized';
  const category = allCategories.find(c => c.id === categoryId);
  return category ? category.name : 'Uncategorized';
}

function getMonthName(monthNumber) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return months[monthNumber - 1] || 'Unknown';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', { 
    style: 'currency', 
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function showError(message) {
  const reportsGrid = document.getElementById('reportsGrid');
  if (reportsGrid) {
    reportsGrid.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Report Error</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="initReportsUI()">🔄 Retry</button>
      </div>
    `;
  }
}

// ============================================================================
// 🌐 GLOBAL FUNCTIONS
// ============================================================================

window.initReportsUI = initReportsUI;