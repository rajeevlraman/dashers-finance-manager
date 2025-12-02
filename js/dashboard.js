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
  const mainContent = document.getElementById('mainContent');
  mainContent.classList.add('page-transition');
  mainContent.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading dashboard...</p></div>';

  try {
    // === Fetch all core + property data ===
    const [allTransactions, bills, categories, properties, tenants, loans, maintenance, accounts, budgets] = await Promise.all([
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

    // Get saved filters from localStorage
    let savedFilters = {};
    try {
      savedFilters = JSON.parse(localStorage.getItem('dashboardFilters')) || {};
    } catch (e) {
      console.log('No saved filters found');
    }

    // Apply filters to transactions
    let transactions = applyDateFilters(allTransactions, savedFilters);
    
    // Also apply property filter if set
    if (savedFilters.propertyFilter && savedFilters.propertyFilter !== 'all') {
      transactions = transactions.filter(t => 
        !t.propertyId || t.propertyId === savedFilters.propertyFilter
      );
    }

    // Apply category filter if set
    if (savedFilters.categoryFilter && savedFilters.categoryFilter !== 'all') {
      transactions = transactions.filter(t => t.categoryId === savedFilters.categoryFilter);
    }

    // === Current period calculations WITH FILTERING ===
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthIncome = transactions
      .filter(t => t.type === 'income' && t.date?.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
    const currentMonthExpenses = transactions
      .filter(t => t.type === 'expense' && t.date?.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
    const currentMonthBalance = currentMonthIncome - currentMonthExpenses;

    // === Financial totals WITH FILTERING ===
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

    // === Budget performance WITH FILTERING ===
    const budgetPerformance = calculateBudgetPerformance(budgets, transactions, currentMonth);

    // === Get available months from FILTERED transactions ===
    const uniqueMonths = Array.from(
      new Set(
        transactions.map(t => {
          if (!t.date) return null;
          const d = new Date(t.date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }).filter(Boolean)
      )
    ).sort();

    const latestMonth = uniqueMonths.at(-1) || currentMonth;

    // === Main HTML Layout ===
    mainContent.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h2>📊 Dashboard</h2>
          <div class="page-actions">
            <span class="dashboard-date">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <button id="exportDashboard" class="btn btn-outline">📊 Export Data</button>
            <button id="liveRefresh" class="btn btn-outline" title="Live Refresh">🔄 Live Data</button>
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="filter-bar">
          <select id="propertyFilter">
            <option value="all">All Properties</option>
            ${properties.map(p => `<option value="${p.id}" ${savedFilters.propertyFilter === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
          
          <select id="categoryFilter">
            <option value="all">All Categories</option>
            ${categories.map(c => `<option value="${c.id}" ${savedFilters.categoryFilter === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
          
          <input type="date" id="dateFrom" placeholder="From Date" value="${savedFilters.dateFrom || ''}">
          <input type="date" id="dateTo" placeholder="To Date" value="${savedFilters.dateTo || ''}">
          
          <button id="applyFilters" class="btn btn-primary">Apply Filters</button>
          <button id="resetFilters" class="btn btn-secondary">Reset</button>
          
          ${savedFilters.dateFrom || savedFilters.dateTo ? `
            <div class="filter-badge">
              📅 Filtered: ${savedFilters.dateFrom || 'Any'} to ${savedFilters.dateTo || 'Any'}
            </div>
          ` : ''}
        </div>

        <!-- ... rest of your HTML stays the same ... -->
      </div>
    `;

    // ... rest of your JavaScript code stays the same ...

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

// ============================================================================
// 🔧 FIXED DATE FILTERING FUNCTIONS
// ============================================================================

function applyDateFilters(transactions, filters) {
  if (!transactions || !transactions.length) return transactions;
  
  let filtered = [...transactions];
  
  // Apply date range filter
  if (filters.dateFrom || filters.dateTo) {
    filtered = filtered.filter(t => {
      if (!t.date) return false; // Skip transactions without dates
      
      const txDate = new Date(t.date);
      if (isNaN(txDate.getTime())) return false; // Invalid date
      
      let include = true;
      
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        include = include && txDate >= fromDate;
      }
      
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        include = include && txDate <= toDate;
      }
      
      return include;
    });
  }
  
  return filtered;
}

function applyFilters() {
  const propertyFilter = document.getElementById('propertyFilter').value;
  const categoryFilter = document.getElementById('categoryFilter').value;
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo = document.getElementById('dateTo').value;
  
  // Validate date range
  if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
    alert('"From" date cannot be after "To" date');
    return;
  }
  
  // Store filter state and reload dashboard
  localStorage.setItem('dashboardFilters', JSON.stringify({
    propertyFilter,
    categoryFilter,
    dateFrom,
    dateTo
  }));
  
  // Show loading indicator
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Applying filters...</p></div>';
  
  // Reload with new filters
  setTimeout(() => initDashboardUI(), 300);
}

function resetFilters() {
  document.getElementById('propertyFilter').value = 'all';
  document.getElementById('categoryFilter').value = 'all';
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  
  localStorage.removeItem('dashboardFilters');
  
  // Show loading indicator
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Resetting filters...</p></div>';
  
  // Reload without filters
  setTimeout(() => initDashboardUI(), 300);
}

// ============================================================================
// 📊 UPDATED CHART FUNCTIONS TO USE FILTERED DATA
// ============================================================================

// Update your renderCategoryChart function to use filtered data
function renderCategoryChart(selectedMonth, transactions, categories) {
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

// Update your renderTrendChart function to use filtered data
function renderTrendChart(filteredTransactions) {
  const monthly = {};
  filteredTransactions.forEach(t => {
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
  
  initDashboardUI();
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