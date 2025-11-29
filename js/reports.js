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

  const reportTypeSelect = document.getElementById('reportType');
  if (reportTypeSelect) {
    reportTypeSelect.addEventListener('change', refreshAllCharts);
  }

  // Action buttons
  const refreshBtn = document.getElementById('refreshReports');
  if (refreshBtn) refreshBtn.addEventListener('click', refreshAllCharts);

  const exportBtn = document.getElementById('exportAllReports');
  if (exportBtn) exportBtn.addEventListener('click', exportAllReports);

  const backBtn = document.getElementById('backToOverview');
  if (backBtn) backBtn.addEventListener('click', showOverview);
}

// ============================================================================
// 🔄 REFRESH FUNCTIONS (MISSING FUNCTIONS ADDED)
// ============================================================================

async function refreshAllCharts() {
  try {
    await renderQuickStats();
    await renderReportsGrid();
  } catch (error) {
    console.error('Error refreshing charts:', error);
    showToast('❌ Failed to refresh reports', 'error');
  }
}

function showOverview() {
  const analysisSection = document.getElementById('analysisSection');
  const reportsGrid = document.getElementById('reportsGrid');
  
  if (analysisSection) analysisSection.style.display = 'none';
  if (reportsGrid) reportsGrid.style.display = 'grid';
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
    (t.amount || 0) > max.amount ? { amount: t.amount || 0, category: getCategoryName(t.categoryId) } : max, 
    { amount: 0, category: '' }
  );

  // Calculate growth (simplified - compared to previous period)
  const previousPeriodStats = calculatePreviousPeriodStats(transactions);
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
// 📈 MISSING UTILITY FUNCTIONS
// ============================================================================

function calculatePreviousPeriodStats(currentTransactions) {
  // Simple implementation: compare with first half of data
  const sortedTransactions = [...currentTransactions].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );
  
  const midPoint = Math.floor(sortedTransactions.length / 2);
  const firstHalf = sortedTransactions.slice(0, midPoint);
  const secondHalf = sortedTransactions.slice(midPoint);
  
  const firstHalfIncome = firstHalf.filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const firstHalfExpenses = firstHalf.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  return {
    totalIncome: firstHalfIncome,
    totalExpenses: firstHalfExpenses
  };
}

function getMonthCount(transactions) {
  if (!transactions.length) return 1;
  
  const dates = transactions.map(t => new Date(t.date));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  
  const monthDiff = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + 
                   (maxDate.getMonth() - minDate.getMonth());
  
  return Math.max(1, monthDiff + 1); // +1 to include both start and end months
}

function getSavingsRateRating(rate) {
  if (rate >= 20) return 'Excellent';
  if (rate >= 15) return 'Good';
  if (rate >= 10) return 'Average';
  if (rate >= 5) return 'Low';
  return 'Very Low';
}

// ============================================================================
// 📈 REPORTS GRID
// ============================================================================

async function renderReportsGrid() {
  const reportType = document.getElementById('reportType').value;
  const filteredTransactions = getFilteredTransactions();

  const reportsGrid = document.getElementById('reportsGrid');
  if (!reportsGrid) return;
  
  let html = '';
  switch (reportType) {
    case 'overview':
      html = await renderOverviewReports(filteredTransactions);
      break;
    case 'expenses':
      html = await renderExpenseReports(filteredTransactions);
      break;
    case 'income':
      html = await renderIncomeReports(filteredTransactions);
      break;
    case 'cashflow':
      html = await renderCashFlowReports(filteredTransactions);
      break;
    case 'comparison':
      html = await renderComparisonReports(filteredTransactions);
      break;
    default:
      html = await renderOverviewReports(filteredTransactions);
  }

  reportsGrid.innerHTML = html;

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
  const trendCanvas = document.getElementById('monthlyTrendChart');
  if (trendCanvas) {
    const trendChart = new Chart(trendCanvas, {
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
  }

  // Expense Breakdown Chart
  const expenseData = getExpenseByCategory(transactions);
  const expenseCanvas = document.getElementById('expenseBreakdownChart');
  if (expenseCanvas) {
    const expenseChart = new Chart(expenseCanvas, {
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
  }

  // Add more charts as needed...
}

// ============================================================================
// 📊 MISSING DATA PROCESSING FUNCTIONS
// ============================================================================

function getMonthlyTrendData(transactions) {
  const monthly = {};
  
  transactions.forEach(tx => {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthly[monthKey]) {
      monthly[monthKey] = { income: 0, expense: 0, net: 0 };
    }
    
    if (tx.type === 'income') {
      monthly[monthKey].income += tx.amount || 0;
    } else {
      monthly[monthKey].expense += tx.amount || 0;
    }
    
    monthly[monthKey].net = monthly[monthKey].income - monthly[monthKey].expense;
  });

  const sortedMonths = Object.keys(monthly).sort();
  
  return {
    labels: sortedMonths,
    income: sortedMonths.map(m => monthly[m].income),
    expenses: sortedMonths.map(m => monthly[m].expense),
    net: sortedMonths.map(m => monthly[m].net)
  };
}

function getExpenseByCategory(transactions) {
  const expenses = transactions.filter(t => t.type === 'expense');
  const categories = {};
  
  expenses.forEach(expense => {
    const categoryName = getCategoryName(expense.categoryId);
    categories[categoryName] = (categories[categoryName] || 0) + (expense.amount || 0);
  });
  
  // Sort by amount descending
  const sortedEntries = Object.entries(categories)
    .sort(([,a], [,b]) => b - a);
  
  return {
    labels: sortedEntries.map(([name]) => name),
    values: sortedEntries.map(([,amount]) => amount)
  };
}

function getChartOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: title
      }
    }
  };
}

function generateColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`;
}

// ============================================================================
// 🔍 DETAILED ANALYSIS
// ============================================================================

async function showDetailedAnalysis(type, category = null) {
  const analysisSection = document.getElementById('analysisSection');
  const analysisContent = document.getElementById('analysisContent');
  const reportsGrid = document.getElementById('reportsGrid');

  if (reportsGrid) reportsGrid.style.display = 'none';
  if (analysisSection) analysisSection.style.display = 'block';

  let content = '';
  switch (type) {
    case 'expenses':
      content = await renderExpenseAnalysis(category);
      break;
    case 'income':
      content = await renderIncomeAnalysis();
      break;
    default:
      content = '<p>Analysis not available for this type.</p>';
  }

  if (analysisContent) {
    analysisContent.innerHTML = content;
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
    analysisData = getCategoryDrilldown(expenses, category);
  } else {
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
            ${analysisData.recentTransactions.slice(0, 10).map(t => `
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

function showToast(message, type = 'info') {
  // Simple toast implementation
  console.log(`[${type.toUpperCase()}] ${message}`);
  alert(message); // Fallback for now
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

function getCurrentDateRange() {
  const dateRange = document.getElementById('dateRange')?.value || 'all';
  const startDate = document.getElementById('startDate')?.value;
  const endDate = document.getElementById('endDate')?.value;
  
  if (dateRange === 'custom' && startDate && endDate) {
    return `${startDate} to ${endDate}`;
  }
  
  return dateRange.charAt(0).toUpperCase() + dateRange.slice(1);
}

// ============================================================================
// 🎯 MISSING ANALYSIS FUNCTIONS
// ============================================================================

function getCategoryDrilldown(expenses, category) {
  const categoryExpenses = expenses.filter(e => getCategoryName(e.categoryId) === category);
  const total = categoryExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  return {
    total,
    count: categoryExpenses.length,
    average: total / Math.max(1, categoryExpenses.length),
    recentTransactions: categoryExpenses.sort((a, b) => new Date(b.date) - new Date(a.date))
  };
}

function getExpenseAnalysis(expenses) {
  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  return {
    total,
    count: expenses.length,
    average: total / Math.max(1, expenses.length),
    recentTransactions: expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)
  };
}

function renderAnalysisCharts(type, category) {
  // Placeholder for analysis charts
  console.log(`Rendering analysis charts for ${type}, category: ${category}`);
}

// ============================================================================
// 📋 PLACEHOLDER FUNCTIONS FOR OTHER REPORT TYPES
// ============================================================================

async function renderExpenseReports(transactions) {
  return `<div class="report-card full-width"><h3>Expense Reports - Coming Soon</h3></div>`;
}

async function renderIncomeReports(transactions) {
  return `<div class="report-card full-width"><h3>Income Reports - Coming Soon</h3></div>`;
}

async function renderCashFlowReports(transactions) {
  return `<div class="report-card full-width"><h3>Cash Flow Reports - Coming Soon</h3></div>`;
}

async function renderComparisonReports(transactions) {
  return `<div class="report-card full-width"><h3>Comparison Reports - Coming Soon</h3></div>`;
}

async function renderIncomeAnalysis() {
  return `<div><h4>Income Analysis - Coming Soon</h4></div>`;
}

// ============================================================================
// 🌐 GLOBAL FUNCTIONS FOR HTML ONCLICK
// ============================================================================

window.downloadChart = function(canvasId, filename) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
  link.click();
};

window.showDetailedAnalysis = showDetailedAnalysis;
window.initReportsUI = initReportsUI;