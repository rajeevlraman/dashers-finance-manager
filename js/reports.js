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
          <div class="form-group">
            <label>Report Type</label>
            <select id="reportType" class="form-select">
              <option value="overview">Overview Dashboard</option>
              <option value="expenses">Expense Analysis</option>
              <option value="income">Income Analysis</option>
              <option value="cashflow">Cash Flow</option>
              <option value="comparison">Period Comparison</option>
            </select>
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

      <!-- Detailed Analysis Section -->
      <div class="analysis-section" id="analysisSection" style="display: none;">
        <div class="section-header">
          <h3>📈 Detailed Analysis</h3>
          <button class="btn btn-secondary" id="backToOverview">⬅️ Back to Overview</button>
        </div>
        <div id="analysisContent"></div>
      </div>
    </div>
  `;

  await initializeReports();
  setupReportsEventListeners();
}

// ============================================================================
// 🏗️ INITIALIZATION
// ============================================================================

async function initializeReports() {
  try {
    [allTransactions, allCategories] = await Promise.all([
      getAllItems(STORE_NAMES.transactions),
      getAllItems(STORE_NAMES.categories)
    ]);

    await renderQuickStats();
    await renderReportsGrid();
    
  } catch (error) {
    console.error('❌ Failed to initialize reports:', error);
    showError('Failed to load reports data');
  }
}

function setupReportsEventListeners() {
  // Date range controls
  document.getElementById('dateRange').addEventListener('change', function(e) {
    const customRange = document.getElementById('customDateRange');
    customRange.style.display = e.target.value === 'custom' ? 'block' : 'none';
    refreshAllCharts();
  });

  document.getElementById('startDate').addEventListener('change', refreshAllCharts);
  document.getElementById('endDate').addEventListener('change', refreshAllCharts);
  document.getElementById('reportType').addEventListener('change', refreshAllCharts);

  // Action buttons
  document.getElementById('refreshReports').addEventListener('click', refreshAllCharts);
  document.getElementById('exportAllReports').addEventListener('click', exportAllReports);
  document.getElementById('backToOverview').addEventListener('click', showOverview);
}

// ============================================================================
// 📊 QUICK STATS DASHBOARD
// ============================================================================

async function renderQuickStats() {
  const filteredTransactions = getFilteredTransactions();
  const stats = calculateFinancialStats(filteredTransactions);

  const statsContainer = document.getElementById('quickStats');
  statsContainer.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card total-income">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">${formatCurrency(stats.totalIncome)}</div>
          <div class="stat-label">Total Income</div>
          <div class="stat-trend ${stats.incomeGrowth >= 0 ? 'positive' : 'negative'}">
            ${stats.incomeGrowth >= 0 ? '↗️' : '↘️'} ${Math.abs(stats.incomeGrowth)}%
          </div>
        </div>
      </div>

      <div class="stat-card total-expenses">
        <div class="stat-icon">💸</div>
        <div class="stat-content">
          <div class="stat-value">${formatCurrency(stats.totalExpenses)}</div>
          <div class="stat-label">Total Expenses</div>
          <div class="stat-trend ${stats.expenseGrowth >= 0 ? 'negative' : 'positive'}">
            ${stats.expenseGrowth >= 0 ? '↗️' : '↘️'} ${Math.abs(stats.expenseGrowth)}%
          </div>
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

      <div class="stat-card avg-monthly">
        <div class="stat-icon">📅</div>
        <div class="stat-content">
          <div class="stat-value">${formatCurrency(stats.avgMonthlyIncome)}</div>
          <div class="stat-label">Avg Monthly Income</div>
          <div class="stat-subtext">${formatCurrency(stats.avgMonthlyExpenses)} expenses</div>
        </div>
      </div>

      <div class="stat-card largest-expense">
        <div class="stat-icon">⚠️</div>
        <div class="stat-content">
          <div class="stat-value">${formatCurrency(stats.largestExpense.amount)}</div>
          <div class="stat-label">Largest Expense</div>
          <div class="stat-subtext">${stats.largestExpense.category || 'Unknown'}</div>
        </div>
      </div>
    </div>
  `;
}

function calculateFinancialStats(transactions) {
  const income = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');
  
  const totalIncome = income.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
  const netCashFlow = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

  // Find largest expense
  const largestExpense = expenses.reduce((max, t) => 
    t.amount > max.amount ? { amount: t.amount, category: getCategoryName(t.categoryId) } : max, 
    { amount: 0, category: '' }
  );

  // Calculate growth (simplified - compared to previous period)
  const previousPeriodStats = calculatePreviousPeriodStats();
  const incomeGrowth = previousPeriodStats.totalIncome > 0 ? 
    ((totalIncome - previousPeriodStats.totalIncome) / previousPeriodStats.totalIncome) * 100 : 0;
  const expenseGrowth = previousPeriodStats.totalExpenses > 0 ? 
    ((totalExpenses - previousPeriodStats.totalExpenses) / previousPeriodStats.totalExpenses) * 100 : 0;

  return {
    totalIncome,
    totalExpenses,
    netCashFlow,
    savingsRate,
    incomeGrowth,
    expenseGrowth,
    avgMonthlyIncome: totalIncome / Math.max(1, getMonthCount(transactions)),
    avgMonthlyExpenses: totalExpenses / Math.max(1, getMonthCount(transactions)),
    largestExpense
  };
}

// ============================================================================
// 📈 REPORTS GRID
// ============================================================================

async function renderReportsGrid() {
  const reportType = document.getElementById('reportType').value;
  const filteredTransactions = getFilteredTransactions();

  const reportsGrid = document.getElementById('reportsGrid');
  
  switch (reportType) {
    case 'overview':
      reportsGrid.innerHTML = await renderOverviewReports(filteredTransactions);
      break;
    case 'expenses':
      reportsGrid.innerHTML = await renderExpenseReports(filteredTransactions);
      break;
    case 'income':
      reportsGrid.innerHTML = await renderIncomeReports(filteredTransactions);
      break;
    case 'cashflow':
      reportsGrid.innerHTML = await renderCashFlowReports(filteredTransactions);
      break;
    case 'comparison':
      reportsGrid.innerHTML = await renderComparisonReports(filteredTransactions);
      break;
  }

  // Re-render charts after HTML is updated
  setTimeout(() => {
    renderChartsForCurrentView(filteredTransactions);
  }, 100);
}

async function renderOverviewReports(transactions) {
  return `
    <div class="report-card full-width">
      <div class="report-header">
        <h3>📈 Monthly Performance Trend</h3>
        <button class="btn btn-sm btn-secondary" onclick="downloadChart('monthlyTrendChart', 'Monthly_Performance_Trend')">
          📥 Download
        </button>
      </div>
      <canvas id="monthlyTrendChart" height="300"></canvas>
    </div>

    <div class="report-card">
      <div class="report-header">
        <h3>💰 Income Sources</h3>
        <button class="btn btn-sm btn-secondary" onclick="downloadChart('incomeSourcesChart', 'Income_Sources')">
          📥 Download
        </button>
      </div>
      <canvas id="incomeSourcesChart" height="250"></canvas>
    </div>

    <div class="report-card">
      <div class="report-header">
        <h3>💸 Expense Breakdown</h3>
        <button class="btn btn-sm btn-secondary" onclick="showDetailedAnalysis('expenses')">
          🔍 Analyze
        </button>
      </div>
      <canvas id="expenseBreakdownChart" height="250"></canvas>
    </div>

    <div class="report-card">
      <div class="report-header">
        <h3>🎯 Savings Progress</h3>
        <button class="btn btn-sm btn-secondary" onclick="downloadChart('savingsChart', 'Savings_Progress')">
          📥 Download
        </button>
      </div>
      <canvas id="savingsChart" height="250"></canvas>
    </div>

    <div class="report-card full-width">
      <div class="report-header">
        <h3>📊 Cash Flow Timeline</h3>
        <button class="btn btn-sm btn-secondary" onclick="downloadChart('cashFlowTimelineChart', 'Cash_Flow_Timeline')">
          📥 Download
        </button>
      </div>
      <canvas id="cashFlowTimelineChart" height="300"></canvas>
    </div>
  `;
}

// ============================================================================
// 🎨 CHART RENDERING
// ============================================================================

function renderChartsForCurrentView(transactions) {
  // Clear existing charts
  activeCharts.forEach(chart => {
    try { chart.destroy(); } catch (e) {}
  });
  activeCharts = [];

  const reportType = document.getElementById('reportType').value;

  switch (reportType) {
    case 'overview':
      renderOverviewCharts(transactions);
      break;
    case 'expenses':
      renderExpenseCharts(transactions);
      break;
    case 'income':
      renderIncomeCharts(transactions);
      break;
    case 'cashflow':
      renderCashFlowCharts(transactions);
      break;
    case 'comparison':
      renderComparisonCharts(transactions);
      break;
  }
}

function renderOverviewCharts(transactions) {
  // Monthly Trend Chart
  const monthlyData = getMonthlyTrendData(transactions);
  const trendChart = new Chart(document.getElementById('monthlyTrendChart'), {
    type: 'line',
    data: {
      labels: monthlyData.labels,
      datasets: [
        {
          label: 'Income',
          data: monthlyData.income,
          borderColor: '#27ae60',
          backgroundColor: 'rgba(39, 174, 96, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Expenses',
          data: monthlyData.expenses,
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Net Cash Flow',
          data: monthlyData.net,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          fill: true,
          tension: 0.4,
          borderDash: [5, 5]
        }
      ]
    },
    options: getChartOptions('Monthly Financial Performance')
  });
  activeCharts.push(trendChart);

  // Expense Breakdown Chart
  const expenseData = getExpenseByCategory(transactions);
  const expenseChart = new Chart(document.getElementById('expenseBreakdownChart'), {
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
      ...getChartOptions('Expense Distribution'),
      onClick: (e, elements) => {
        if (elements.length) {
          const category = expenseData.labels[elements[0].index];
          showDetailedAnalysis('expenses', category);
        }
      }
    }
  });
  activeCharts.push(expenseChart);

  // Add more charts for income sources, savings progress, etc.
}

// ============================================================================
// 🔍 DETAILED ANALYSIS
// ============================================================================

async function showDetailedAnalysis(type, category = null) {
  const analysisSection = document.getElementById('analysisSection');
  const analysisContent = document.getElementById('analysisContent');
  const reportsGrid = document.getElementById('reportsGrid');

  reportsGrid.style.display = 'none';
  analysisSection.style.display = 'block';

  switch (type) {
    case 'expenses':
      analysisContent.innerHTML = await renderExpenseAnalysis(category);
      break;
    case 'income':
      analysisContent.innerHTML = await renderIncomeAnalysis();
      break;
  }

  // Render analysis charts
  setTimeout(() => {
    renderAnalysisCharts(type, category);
  }, 100);
}

async function renderExpenseAnalysis(category) {
  const filteredTransactions = getFilteredTransactions();
  const expenses = filteredTransactions.filter(t => t.type === 'expense');
  
  let analysisData;
  if (category) {
    // Drill down into specific category
    analysisData = getCategoryDrilldown(expenses, category);
  } else {
    // Overall expense analysis
    analysisData = getExpenseAnalysis(expenses);
  }

  return `
    <div class="analysis-header">
      <h4>${category ? `📊 ${category} Analysis` : '💸 Detailed Expense Analysis'}</h4>
      <div class="analysis-stats">
        <div class="stat">Total: ${formatCurrency(analysisData.total)}</div>
        <div class="stat">Transactions: ${analysisData.count}</div>
        <div class="stat">Average: ${formatCurrency(analysisData.average)}</div>
      </div>
    </div>

    <div class="analysis-charts">
      <div class="chart-container">
        <canvas id="analysisTrendChart" height="200"></canvas>
      </div>
      <div class="chart-container">
        <canvas id="analysisBreakdownChart" height="200"></canvas>
      </div>
    </div>

    <div class="analysis-table">
      <h5>📋 Transaction Details</h5>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${analysisData.recentTransactions.map(t => `
              <tr>
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>${t.description || 'No description'}</td>
                <td>${getCategoryName(t.categoryId)}</td>
                <td class="amount ${t.type}">${formatCurrency(t.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============================================================================
// 📤 EXPORT FUNCTIONALITY
// ============================================================================

async function exportAllReports() {
  try {
    showToast('📤 Preparing comprehensive report export...', 'info');
    
    // Create a comprehensive PDF-like HTML report
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
  const dateRange = getCurrentDateRange();
  
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
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #3498db; color: white; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Financial Report</h1>
        <p>Date Range: ${dateRange}</p>
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
        <li>Average Monthly Income: ${formatCurrency(stats.avgMonthlyIncome)}</li>
        <li>Average Monthly Expenses: ${formatCurrency(stats.avgMonthlyExpenses)}</li>
        <li>Largest Expense: ${formatCurrency(stats.largestExpense.amount)} (${stats.largestExpense.category})</li>
    </ul>
    
    <p><em>Note: Charts and detailed graphs are available in the web application.</em></p>
</body>
</html>`;
}

// ============================================================================
// 🛠️ UTILITY FUNCTIONS
// ============================================================================

function getFilteredTransactions() {
  const dateRange = document.getElementById('dateRange').value;
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  
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
  
  return filtered;
}

function getCategoryName(categoryId) {
  const category = allCategories.find(c => c.id === categoryId);
  return category ? category.name : 'Uncategorized';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', { 
    style: 'currency', 
    currency: 'AUD' 
  }).format(amount || 0);
}

function showToast(message, type = 'info') {
  // Toast implementation (reuse from settings)
  console.log(`[${type.toUpperCase()}] ${message}`);
}

function showError(message) {
  const reportsGrid = document.getElementById('reportsGrid');
  reportsGrid.innerHTML = `
    <div class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>Report Error</h3>
      <p>${message}</p>
      <button class="btn btn-primary" onclick="initReportsUI()">🔄 Retry</button>
    </div>
  `;
}

// Make functions available globally for HTML onclick handlers
window.downloadChart = function(canvasId, filename) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
  link.click();
};

window.showDetailedAnalysis = showDetailedAnalysis;

// Initialize date inputs
document.addEventListener('DOMContentLoaded', function() {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  
  document.getElementById('startDate').value = oneYearAgo.toISOString().split('T')[0];
  document.getElementById('endDate').value = now.toISOString().split('T')[0];
});