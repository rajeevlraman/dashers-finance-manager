import { getAllItems, STORE_NAMES } from './db.js';

console.log('📊 Enhanced Reports Manager initialized');

let activeCharts = [];
let allTransactions = [];
let allCategories = [];

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
          <button class="btn btn-secondary" id="exportAllReports">
            📤 Export All Reports
          </button>
        </div>
      </div>

      <!-- Quick Stats -->
      <div id="quickStats" class="quick-stats">
        <div class="loading-spinner">Loading financial statistics...</div>
      </div>

      <!-- Reports Grid -->
      <div class="reports-grid" id="reportsGrid">
        <div class="loading-spinner">Generating reports...</div>
      </div>
    </div>
  `;

  // Initialize date inputs first
  initializeDateInputs();
  await initializeReports();
  setupReportsEventListeners();
}

// ============================================================================
// 🏗️ INITIALIZATION
// ============================================================================

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

async function initializeReports() {
  try {
    [allTransactions, allCategories] = await Promise.all([
      getAllItems(STORE_NAMES.transactions),
      getAllItems(STORE_NAMES.categories)
    ]);

    console.log(`📊 Loaded ${allTransactions.length} transactions and ${allCategories.length} categories`);

    await renderQuickStats();
    await renderReportsGrid();
    
  } catch (error) {
    console.error('❌ Failed to initialize reports:', error);
    showError('Failed to load reports data');
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

  const exportBtn = document.getElementById('exportAllReports');
  if (exportBtn) exportBtn.addEventListener('click', exportAllReports);
}

// ============================================================================
// 🔄 REFRESH FUNCTIONS
// ============================================================================

async function refreshAllCharts() {
  try {
    console.log('🔄 Refreshing all charts...');
    await renderQuickStats();
    await renderReportsGrid();
  } catch (error) {
    console.error('Error refreshing charts:', error);
    showToast('❌ Failed to refresh reports', 'error');
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

      <div class="stat-card savings-rate">
        <div class="stat-icon">🎯</div>
        <div class="stat-content">
          <div class="stat-value ${stats.savingsRate >= 20 ? 'positive' : stats.savingsRate >= 10 ? 'warning' : 'negative'}">
            ${stats.savingsRate.toFixed(1)}%
          </div>
          <div class="stat-label">Savings Rate</div>
          <div class="stat-subtext">${getSavingsRateRating(stats.savingsRate)}</div>
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
    </div>
  `;
}

function calculateFinancialStats(transactions) {
  const income = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');
  
  const totalIncome = income.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const netCashFlow = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

  return {
    totalIncome,
    totalExpenses,
    netCashFlow,
    savingsRate,
    transactionCount: transactions.length,
    incomeCount: income.length,
    expenseCount: expenses.length
  };
}

function getSavingsRateRating(rate) {
  if (rate >= 20) return 'Excellent';
  if (rate >= 15) return 'Good';
  if (rate >= 10) return 'Average';
  if (rate >= 5) return 'Low';
  return 'Very Low';
}

// ============================================================================
// 📈 REPORTS GRID - SIMPLIFIED VERSION
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
        <button class="btn btn-sm btn-secondary" onclick="downloadChart('monthlyChart', 'Monthly_Income_Expenses')">
          📥 Download
        </button>
      </div>
      <div class="chart-container">
        <canvas id="monthlyChart" height="300"></canvas>
      </div>
    </div>

    <div class="report-card">
      <div class="report-header">
        <h3>💰 Expense Categories</h3>
        <button class="btn btn-sm btn-secondary" onclick="downloadChart('expenseChart', 'Expense_Categories')">
          📥 Download
        </button>
      </div>
      <div class="chart-container">
        <canvas id="expenseChart" height="250"></canvas>
      </div>
    </div>

    <div class="report-card">
      <div class="report-header">
        <h3>💸 Income Sources</h3>
        <button class="btn btn-sm btn-secondary" onclick="downloadChart('incomeChart', 'Income_Sources')">
          📥 Download
        </button>
      </div>
      <div class="chart-container">
        <canvas id="incomeChart" height="250"></canvas>
      </div>
    </div>

    <div class="report-card full-width">
      <div class="report-header">
        <h3>📊 Cash Flow Over Time</h3>
        <button class="btn btn-sm btn-secondary" onclick="downloadChart('cashflowChart', 'Cash_Flow_Timeline')">
          📥 Download
        </button>
      </div>
      <div class="chart-container">
        <canvas id="cashflowChart" height="300"></canvas>
      </div>
    </div>
  `;

  // Render charts after a brief delay to ensure DOM is ready
  setTimeout(() => {
    renderAllCharts(filteredTransactions);
  }, 100);
}

// ============================================================================
// 🎨 CHART RENDERING - FIXED VERSION
// ============================================================================

function renderAllCharts(transactions) {
  // Clear existing charts
  activeCharts.forEach(chart => {
    try { 
      chart.destroy(); 
    } catch (e) {
      console.log('Error destroying chart:', e);
    }
  });
  activeCharts = [];

  console.log('🎨 Rendering charts with', transactions.length, 'transactions');

  // 1. Monthly Income vs Expenses Chart
  renderMonthlyChart(transactions);
  
  // 2. Expense Categories Chart
  renderExpenseCategoriesChart(transactions);
  
  // 3. Income Sources Chart
  renderIncomeSourcesChart(transactions);
  
  // 4. Cash Flow Chart
  renderCashFlowChart(transactions);
}

function renderMonthlyChart(transactions) {
  const monthlyData = getMonthlyData(transactions);
  
  const ctx = document.getElementById('monthlyChart');
  if (!ctx) return;

  // Ensure we have valid data
  if (monthlyData.labels.length === 0 || monthlyData.income.length === 0) {
    console.warn('No valid data for monthly chart');
    return;
  }

  try {
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
          title: {
            display: true,
            text: 'Monthly Income vs Expenses'
          },
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return formatCurrency(value);
              }
            }
          }
        }
      }
    });
    activeCharts.push(chart);
  } catch (error) {
    console.error('Error rendering monthly chart:', error);
  }
}

function renderExpenseCategoriesChart(transactions) {
  const expenseData = getExpenseCategoriesData(transactions);
  
  const ctx = document.getElementById('expenseChart');
  if (!ctx) return;

  if (expenseData.labels.length === 0) {
    console.warn('No expense data for categories chart');
    return;
  }

  try {
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: expenseData.labels,
        datasets: [{
          data: expenseData.values,
          backgroundColor: expenseData.labels.map(() => generateColor()),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Expense Categories'
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    });
    activeCharts.push(chart);
  } catch (error) {
    console.error('Error rendering expense categories chart:', error);
  }
}

function renderIncomeSourcesChart(transactions) {
  const incomeData = getIncomeSourcesData(transactions);
  
  const ctx = document.getElementById('incomeChart');
  if (!ctx) return;

  if (incomeData.labels.length === 0) {
    console.warn('No income data for sources chart');
    return;
  }

  try {
    const chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: incomeData.labels,
        datasets: [{
          data: incomeData.values,
          backgroundColor: incomeData.labels.map(() => generateColor()),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Income Sources'
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    });
    activeCharts.push(chart);
  } catch (error) {
    console.error('Error rendering income sources chart:', error);
  }
}

function renderCashFlowChart(transactions) {
  const cashflowData = getCashFlowData(transactions);
  
  const ctx = document.getElementById('cashflowChart');
  if (!ctx) return;

  if (cashflowData.labels.length === 0) {
    console.warn('No data for cash flow chart');
    return;
  }

  try {
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: cashflowData.labels,
        datasets: [{
          label: 'Net Cash Flow',
          data: cashflowData.values,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Cash Flow Over Time'
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function(value) {
                return formatCurrency(value);
              }
            }
          }
        }
      }
    });
    activeCharts.push(chart);
  } catch (error) {
    console.error('Error rendering cash flow chart:', error);
  }
}

// ============================================================================
// 📊 DATA PROCESSING FUNCTIONS
// ============================================================================

function getMonthlyData(transactions) {
  const monthly = {};
  
  transactions.forEach(tx => {
    if (!tx.date) return;
    
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthly[monthKey]) {
      monthly[monthKey] = { income: 0, expenses: 0 };
    }
    
    const amount = parseFloat(tx.amount) || 0;
    if (tx.type === 'income') {
      monthly[monthKey].income += amount;
    } else if (tx.type === 'expense') {
      monthly[monthKey].expenses += amount;
    }
  });

  const sortedMonths = Object.keys(monthly).sort();
  
  return {
    labels: sortedMonths.map(month => {
      const [year, monthNum] = month.split('-');
      return `${monthNum}/${year.slice(2)}`;
    }),
    income: sortedMonths.map(month => monthly[month].income),
    expenses: sortedMonths.map(month => monthly[month].expenses)
  };
}

function getExpenseCategoriesData(transactions) {
  const expenses = transactions.filter(t => t.type === 'expense');
  const categories = {};
  
  expenses.forEach(expense => {
    const categoryName = getCategoryName(expense.categoryId);
    const amount = parseFloat(expense.amount) || 0;
    categories[categoryName] = (categories[categoryName] || 0) + amount;
  });
  
  // Sort by amount descending and take top 8
  const sortedEntries = Object.entries(categories)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8);
  
  return {
    labels: sortedEntries.map(([name]) => name),
    values: sortedEntries.map(([,amount]) => amount)
  };
}

function getIncomeSourcesData(transactions) {
  const income = transactions.filter(t => t.type === 'income');
  const sources = {};
  
  income.forEach(incomeTx => {
    // Use category as source, or description if no category
    const source = getCategoryName(incomeTx.categoryId) || incomeTx.description || 'Other Income';
    const amount = parseFloat(incomeTx.amount) || 0;
    sources[source] = (sources[source] || 0) + amount;
  });
  
  // Sort by amount descending and take top 6
  const sortedEntries = Object.entries(sources)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 6);
  
  return {
    labels: sortedEntries.map(([name]) => name),
    values: sortedEntries.map(([,amount]) => amount)
  };
}

function getCashFlowData(transactions) {
  const daily = {};
  
  // Sort transactions by date
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );
  
  // Calculate daily net cash flow
  sortedTransactions.forEach(tx => {
    if (!tx.date) return;
    
    const dateStr = tx.date; // Use YYYY-MM-DD format directly
    const amount = parseFloat(tx.amount) || 0;
    const netAmount = tx.type === 'income' ? amount : -amount;
    
    daily[dateStr] = (daily[dateStr] || 0) + netAmount;
  });
  
  // Calculate cumulative cash flow
  const sortedDates = Object.keys(daily).sort();
  let cumulative = 0;
  const cumulativeData = [];
  
  for (let date of sortedDates) {
    cumulative += daily[date];
    cumulativeData.push(cumulative);
  }
  
  return {
    labels: sortedDates.map(date => {
      const d = new Date(date);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    }),
    values: cumulativeData
  };
}

// ============================================================================
// 🛠️ UTILITY FUNCTIONS
// ============================================================================

function getFilteredTransactions() {
  const dateRange = document.getElementById('dateRange')?.value || 'all';
  const startDate = document.getElementById('startDate')?.value;
  const endDate = document.getElementById('endDate')?.value;
  
  let filtered = [...allTransactions];
  
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
  
  console.log(`📅 Filtered to ${filtered.length} transactions for date range: ${dateRange}`);
  return filtered;
}

function getCategoryName(categoryId) {
  if (!categoryId) return 'Uncategorized';
  const category = allCategories.find(c => c.id === categoryId);
  return category ? category.name : 'Uncategorized';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', { 
    style: 'currency', 
    currency: 'AUD' 
  }).format(amount || 0);
}

function generateColor() {
  const hues = [0, 30, 60, 120, 180, 210, 240, 270, 300, 330]; // Predefined hues for better distinction
  const hue = hues[Math.floor(Math.random() * hues.length)];
  return `hsl(${hue}, 70%, 60%)`;
}

function showToast(message, type = 'info') {
  // Simple toast implementation
  console.log(`[${type.toUpperCase()}] ${message}`);
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
// 📤 EXPORT FUNCTIONALITY
// ============================================================================

async function exportAllReports() {
  try {
    showToast('📤 Preparing comprehensive report export...', 'info');
    
    const reportHTML = generateComprehensiveReport();
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('✅ Comprehensive report exported successfully!', 'success');
    
  } catch (error) {
    console.error('Export failed:', error);
    showToast('❌ Report export failed!', 'error');
  }
}

function generateComprehensiveReport() {
  const filteredTransactions = getFilteredTransactions();
  const stats = calculateFinancialStats(filteredTransactions);
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Financial Report - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 2rem; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 1rem; margin-bottom: 2rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
        .stat-card { background: #f8f9fa; padding: 1rem; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 1.5rem; font-weight: bold; }
        .positive { color: #27ae60; }
        .negative { color: #e74c3c; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Financial Report</h1>
        <p>Generated: ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value ${stats.netCashFlow >= 0 ? 'positive' : 'negative'}">${formatCurrency(stats.netCashFlow)}</div>
            <div>Net Cash Flow</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${formatCurrency(stats.totalIncome)}</div>
            <div>Total Income</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${formatCurrency(stats.totalExpenses)}</div>
            <div>Total Expenses</div>
        </div>
    </div>
    
    <h3>Key Metrics</h3>
    <ul>
        <li>Savings Rate: ${stats.savingsRate.toFixed(1)}%</li>
        <li>Total Transactions: ${stats.transactionCount}</li>
        <li>Income Transactions: ${stats.incomeCount}</li>
        <li>Expense Transactions: ${stats.expenseCount}</li>
    </ul>
    
    <p><em>Note: Interactive charts are available in the web application.</em></p>
</body>
</html>`;
}

// ============================================================================
// 🌐 GLOBAL FUNCTIONS FOR HTML ONCLICK
// ============================================================================

window.downloadChart = function(canvasId, filename) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error('Canvas not found:', canvasId);
    return;
  }
  
  try {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
    link.click();
    showToast('✅ Chart downloaded successfully!', 'success');
  } catch (error) {
    console.error('Error downloading chart:', error);
    showToast('❌ Failed to download chart', 'error');
  }
};

window.initReportsUI = initReportsUI;