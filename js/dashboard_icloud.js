import { getAllItems, STORE_NAMES } from './db.js';
//import Chart from 'chart.js/auto';

// Chart instances stored globally
let catChart = null;
let trendChart = null;
let summaryChart = null;
let autoRefreshInterval = null;

// Global data storage
let allTransactions = [];
let allProperties = [];
let allCategories = [];
let allTenants = [];
let allLoans = [];
let allAccounts = [];
let allBudgets = [];

// Global functions for HTML interactions
window.toggleSection = function(header) {
  const content = header.nextElementSibling;
  const icon = header.querySelector('.toggle-icon');
  content.style.display = content.style.display === 'none' ? 'block' : 'none';
  icon.textContent = content.style.display === 'none' ? '▼' : '▲';
};

window.quickAction = function(action) {
  console.log(`Quick action: ${action}`);
  
  const actions = {
    expense: () => {
      console.log('Opening expense form');
      alert('Expense form would open here');
    },
    income: () => {
      console.log('Opening income form');
      alert('Income form would open here');
    },
    property: () => {
      console.log('Opening property form');
      alert('Property form would open here');
    },
    bill: () => {
      console.log('Opening bill form');
      alert('Bill form would open here');
    }
  };
  
  if (actions[action]) {
    actions[action]();
    closeFAB();
  }
};

window.showDrillDownModal = function(label, data) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content icloud">
      <div class="modal-header">
        <h3>Details: ${label}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary icloud" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

// FAB Management
function closeFAB() {
  const fabMain = document.getElementById('fabMain');
  const fabActions = document.getElementById('fabActions');
  const backdrop = document.querySelector('.fab-backdrop');
  
  if (fabMain) fabMain.classList.remove('active');
  if (fabMain) fabMain.textContent = '+';
  if (fabActions) fabActions.classList.remove('show');
  if (backdrop) backdrop.classList.remove('active');
}

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
  mainContent.innerHTML = '<div class="loading-state icloud"><div class="spinner"></div><p>Loading dashboard...</p></div>';

  try {
    // Load saved filters
    const savedFilters = localStorage.getItem('dashboardFilters');
    let initialFilters = {
      propertyFilter: 'all',
      categoryFilter: 'all',
      dateFrom: '',
      dateTo: ''
    };
    
    if (savedFilters) {
      try {
        initialFilters = { ...initialFilters, ...JSON.parse(savedFilters) };
      } catch (e) {
        console.warn('Failed to parse saved filters:', e);
      }
    }

    // === Fetch all data ===
    console.log("Fetching dashboard data...");
    [allTransactions, , allCategories, allProperties, allTenants, allLoans, , allAccounts, allBudgets] = await Promise.all([
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

    console.log(`Loaded: ${allTransactions.length} transactions, ${allProperties.length} properties`);

    // === Main HTML Layout with iCloud Style ===
    mainContent.innerHTML = `
      <div class="dashboard icloud-dashboard">
        <!-- iCloud-style header -->
        <header class="icloud-header">
        // In the header section of your HTML template, add this:
<div class="header-left">
  <h1 class="dashboard-title">Finance Dashboard</h1>
  <p class="dashboard-subtitle">Overview & Analytics</p>
  <!-- ADD THESE LINES: -->
  <div class="welcome-info">
    <div id="welcomeGreeting" class="welcome-greeting"></div>
    <div class="welcome-details">
      <span id="welcomeDate"></span>
      <span id="welcomeWeather"></span>
    </div>
  </div>
</div>
          <div class="header-content">
            <div class="header-left">
              <h1 class="dashboard-title">Finance Dashboard</h1>
              <p class="dashboard-subtitle">Overview & Analytics</p>
            </div>
            <div class="header-right">
              <div class="header-stats">
                <div class="header-stat">
                  <span class="stat-label">Properties</span>
                  <span class="stat-value" id="headerPropCount">${allProperties.length}</span>
                </div>
                <div class="header-stat">
                  <span class="stat-label">Active</span>
                  <span class="stat-value" id="headerActiveCount">${allTenants.length}</span>
                </div>
              </div>
              <div class="header-actions">
                <button id="exportDashboard" class="header-action icloud" title="Export Data">📊 Export</button>
                <button id="liveRefresh" class="header-action icloud" title="Live Refresh">🔄 Live</button>
              </div>
            </div>
          </div>
        </header>

        <!-- Filter Controls -->
        <div class="filter-bar icloud">
          <select id="propertyFilter" class="filter-select">
            <option value="all">All Properties</option>
            ${allProperties.map(p => `<option value="${p.id}" ${initialFilters.propertyFilter === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
          
          <select id="categoryFilter" class="filter-select">
            <option value="all">All Categories</option>
            ${allCategories.map(c => `<option value="${c.id}" ${initialFilters.categoryFilter === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
          
          <input type="date" id="dateFrom" class="filter-date" value="${initialFilters.dateFrom || ''}" placeholder="From Date">
          <input type="date" id="dateTo" class="filter-date" value="${initialFilters.dateTo || ''}" placeholder="To Date">
          
          <button id="applyFilters" class="filter-btn icloud">Apply</button>
          <button id="resetFilters" class="filter-btn secondary">Reset</button>
          <div id="filterBadge" class="filter-badge" style="display: none;"></div>
        </div>

        <!-- iCloud Card Grid with alternating pattern -->
        <div class="icloud-grid">
          <!-- Row 1: Square, Rectangle, Square -->
          <div class="card icloud icloud-blue card-square" id="totalBalanceCard">
            <div class="card-header">
              <div class="card-icon">💳</div>
              <div>
                <h3 class="card-title">Total Balance</h3>
                <p class="card-subtitle">Available Funds</p>
              </div>
            </div>
            <div class="card-content">
              <div class="card-stat" id="totalBalanceValue">$0.00</div>
              <div class="card-progress">
                <div class="progress-fill" id="balanceProgress" style="width: 0%"></div>
              </div>
              <div class="card-meta" id="balanceTrend">Loading...</div>
            </div>
            <div class="card-footer">
              <span class="card-badge" id="balanceStatus">Current</span>
              <a href="#" class="card-action" onclick="showDrillDownModal('Balance Details', {})">View →</a>
            </div>
          </div>

          <div class="card icloud icloud-green card-rectangle" id="incomeCard">
            <div class="card-header">
              <div class="card-icon">💰</div>
              <div>
                <h3 class="card-title">Monthly Income</h3>
                <p class="card-subtitle">All Sources</p>
              </div>
            </div>
            <div class="card-content">
              <div class="card-stat" id="monthlyIncomeValue">$0.00</div>
              <div class="income-breakdown" id="incomeBreakdown">
                <div class="breakdown-item">
                  <span class="breakdown-label">Rental</span>
                  <span class="breakdown-value">$0.00</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-label">Other</span>
                  <span class="breakdown-value">$0.00</span>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <span class="card-badge" id="incomeStatus">On Track</span>
              <a href="#" class="card-action" onclick="window.quickAction('income')">Add →</a>
            </div>
          </div>

          <div class="card icloud icloud-purple card-square" id="savingsCard">
            <div class="card-header">
              <div class="card-icon">📈</div>
              <div>
                <h3 class="card-title">Savings Rate</h3>
                <p class="card-subtitle">Monthly Goal</p>
              </div>
            </div>
            <div class="card-content">
              <div class="card-stat" id="savingsRateValue">0%</div>
              <div class="card-progress">
                <div class="progress-fill" id="savingsProgress" style="width: 0%"></div>
              </div>
              <div class="card-meta" id="savingsAmount">$0 saved</div>
            </div>
            <div class="card-footer">
              <span class="card-badge" id="savingsStatus">Goal</span>
              <a href="#" class="card-action" onclick="showDrillDownModal('Savings Details', {})">Set Goal →</a>
            </div>
          </div>

          <!-- Row 2: Rectangle, Square, Rectangle -->
          <div class="card icloud icloud-orange card-rectangle" id="expensesCard">
            <div class="card-header">
              <div class="card-icon">💸</div>
              <div>
                <h3 class="card-title">Recent Expenses</h3>
                <p class="card-subtitle">Last 30 Days</p>
              </div>
            </div>
            <div class="card-content">
              <div class="expenses-list" id="expensesList">
                <div class="expense-item">
                  <span class="expense-category">Loading...</span>
                  <span class="expense-amount">$0.00</span>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <span class="card-badge" id="expensesCount">0 Categories</span>
              <a href="#" class="card-action" onclick="showDrillDownModal('Expense Details', {})">See All →</a>
            </div>
          </div>

          <div class="card icloud icloud-blue card-square" id="upcomingCard">
            <div class="card-header">
              <div class="card-icon">⏰</div>
              <div>
                <h3 class="card-title">Upcoming Bills</h3>
                <p class="card-subtitle">Next 7 Days</p>
              </div>
            </div>
            <div class="card-content">
              <div class="card-stat" id="upcomingCount">0</div>
              <div class="bills-list" id="billsList">
                <div class="bill-item">
                  <span class="bill-name">None</span>
                  <span class="bill-amount">$0.00</span>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <span class="card-badge warning" id="upcomingStatus">Clear</span>
              <a href="#" class="card-action" onclick="window.quickAction('bill')">Pay Now →</a>
            </div>
          </div>

          <div class="card icloud icloud-green card-rectangle" id="budgetCard">
            <div class="card-header">
              <div class="card-icon">🎯</div>
              <div>
                <h3 class="card-title">Budget Status</h3>
                <p class="card-subtitle">Monthly Progress</p>
              </div>
            </div>
            <div class="card-content">
              <div class="budget-progress-item" id="budgetProgress">
                <div class="progress-info">
                  <span class="progress-label">Overall</span>
                  <span class="progress-value">0/0</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: 0%"></div>
                </div>
              </div>
              <div class="budget-summary" id="budgetSummary">
                <div class="summary-item">
                  <span class="summary-label">On Track</span>
                  <span class="summary-value">0</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Over</span>
                  <span class="summary-value">0</span>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <span class="card-badge" id="budgetStatus">Loading</span>
              <a href="#" class="card-action" onclick="showDrillDownModal('Budget Details', {})">Adjust →</a>
            </div>
          </div>

          <!-- Row 3: Square, Rectangle, Square -->
          <div class="card icloud icloud-purple card-square" id="propertyCard">
            <div class="card-header">
              <div class="card-icon">🏠</div>
              <div>
                <h3 class="card-title">Properties</h3>
                <p class="card-subtitle">Portfolio</p>
              </div>
            </div>
            <div class="card-content">
              <div class="card-stat" id="propertyCountValue">${allProperties.length}</div>
              <div class="property-summary" id="propertySummary">
                <div class="summary-item">
                  <span class="summary-label">Value</span>
                  <span class="summary-value">$0.00</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Tenants</span>
                  <span class="summary-value">${allTenants.length}</span>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <span class="card-badge" id="propertyStatus">Active</span>
              <a href="#" class="card-action" onclick="window.quickAction('property')">Manage →</a>
            </div>
          </div>

          <div class="card icloud icloud-orange card-rectangle" id="quickActionsCard">
            <div class="card-header">
              <div class="card-icon">⚡</div>
              <div>
                <h3 class="card-title">Quick Actions</h3>
                <p class="card-subtitle">Common Tasks</p>
              </div>
            </div>
            <div class="card-content">
              <div class="actions-grid" id="quickActionsGrid">
                <button class="action-btn" onclick="window.quickAction('expense')">
                  <span class="action-icon">💸</span>
                  <span class="action-text">Add Expense</span>
                </button>
                <button class="action-btn" onclick="window.quickAction('income')">
                  <span class="action-icon">💰</span>
                  <span class="action-text">Add Income</span>
                </button>
                <button class="action-btn" onclick="window.quickAction('property')">
                  <span class="action-icon">🏠</span>
                  <span class="action-text">Add Property</span>
                </button>
                <button class="action-btn" onclick="window.quickAction('bill')">
                  <span class="action-icon">🧾</span>
                  <span class="action-text">Pay Bill</span>
                </button>
              </div>
            </div>
            <div class="card-footer">
              <span class="card-badge">4 Actions</span>
              <a href="#" class="card-action" onclick="showDrillDownModal('All Actions', {})">More →</a>
            </div>
          </div>

          <div class="card icloud icloud-blue card-square" id="chartsCard">
            <div class="card-header">
              <div class="card-icon">📊</div>
              <div>
                <h3 class="card-title">Charts</h3>
                <p class="card-subtitle">Visual Analytics</p>
              </div>
            </div>
            <div class="card-content">
              <div class="chart-selector">
                <select id="chartType" class="chart-select">
                  <option value="summary">Monthly Overview</option>
                  <option value="category">Expense Categories</option>
                  <option value="trend">Income vs Expenses</option>
                </select>
              </div>
              <div class="chart-container">
                <canvas id="dashboardChart" height="150"></canvas>
              </div>
            </div>
            <div class="card-footer">
              <span class="card-badge">Interactive</span>
              <a href="#" class="card-action" onclick="toggleFullChart()">Expand →</a>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="section-card icloud full-width">
          <div class="card-header">
            <h3>📝 Recent Activity</h3>
            <span class="card-subtitle" id="activityCount">Last 0 activities</span>
          </div>
          <div class="card-content">
            <div class="recent-activity" id="recentActivity">
              <div class="activity-empty">
                <p>No recent activity found</p>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <a href="#" class="card-action" onclick="showDrillDownModal('All Activity', {})">View All →</a>
          </div>
        </div>
      </div>

      <!-- Floating Action Button -->
      <div class="fab-container icloud">
        <div class="fab-actions" id="fabActions">
          <button data-action="expense" onclick="window.quickAction('expense')">
            <span class="fab-icon">💸</span>
            <span class="fab-text">Add Expense</span>
          </button>
          <button data-action="income" onclick="window.quickAction('income')">
            <span class="fab-icon">💰</span>
            <span class="fab-text">Add Income</span>
          </button>
          <button data-action="property" onclick="window.quickAction('property')">
            <span class="fab-icon">🏠</span>
            <span class="fab-text">Add Property</span>
          </button>
          <button data-action="bill" onclick="window.quickAction('bill')">
            <span class="fab-icon">🧾</span>
            <span class="fab-text">Pay Bill</span>
          </button>
        </div>
        <button class="fab-main" id="fabMain">+</button>
      </div>
    `;

    // Populate Welcome Banner
  //  document.getElementById("welcomeGreeting").textContent = getGreeting();
   // document.getElementById("welcomeDate").textContent = getTodayDate();
    
    // Weather (async)
    getWeather().then(weather => {
      const weatherEl = document.getElementById("welcomeWeather");
      if (weatherEl) weatherEl.textContent = `• ${weather}`;
    });

    setTimeout(() => mainContent.classList.remove('page-transition'), 400);

    // Apply initial filters
    await refreshDashboardWithFilters(initialFilters);

    // Setup event listeners
    setupEventListeners();

    // Initialize main chart
    initializeDashboardChart();

    console.log("✅ iCloud Dashboard rendered successfully");

  } catch (err) {
    console.error("❌ Dashboard failed:", err);
    mainContent.innerHTML = `
      <div class="error-state icloud">
        <h3>⚠️ Dashboard Error</h3>
        <p>${err.message}</p>
        <button onclick="initDashboardUI()" class="btn btn-primary icloud">Retry</button>
      </div>
    `;
  }
}

// ====================================================
// FILTER FUNCTIONS (Adapted for iCloud)
// ====================================================

async function applyFilters() {
  const propertyFilter = document.getElementById('propertyFilter').value;
  const categoryFilter = document.getElementById('categoryFilter').value;
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo = document.getElementById('dateTo').value;
  
  const filters = {
    propertyFilter,
    categoryFilter,
    dateFrom,
    dateTo,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem('dashboardFilters', JSON.stringify(filters));
  
  // Apply filters without reloading
  await refreshDashboardWithFilters(filters);
}

async function resetFilters() {
  document.getElementById('propertyFilter').value = 'all';
  document.getElementById('categoryFilter').value = 'all';
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  
  localStorage.removeItem('dashboardFilters');
  
  await refreshDashboardWithFilters({
    propertyFilter: 'all',
    categoryFilter: 'all',
    dateFrom: '',
    dateTo: ''
  });
}

async function refreshDashboardWithFilters(filters) {
  try {
    console.log('Applying filters:', filters);
    
    // Filter transactions
    let filteredTransactions = allTransactions.filter(t => {
      // Property filter
      if (filters.propertyFilter && filters.propertyFilter !== 'all') {
        if (t.propertyId && t.propertyId !== filters.propertyFilter) {
          return false;
        }
      }
      
      // Category filter
      if (filters.categoryFilter && filters.categoryFilter !== 'all') {
        if (t.categoryId !== filters.categoryFilter) {
          return false;
        }
      }
      
      // Date range filter
      if (filters.dateFrom) {
        const transactionDate = new Date(t.date);
        const fromDate = new Date(filters.dateFrom);
        if (transactionDate < fromDate) {
          return false;
        }
      }
      
      if (filters.dateTo) {
        const transactionDate = new Date(t.date);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (transactionDate > toDate) {
          return false;
        }
      }
      
      return true;
    });
    
    // Filter properties
    let filteredProperties = allProperties;
    if (filters.propertyFilter && filters.propertyFilter !== 'all') {
      filteredProperties = allProperties.filter(p => p.id === filters.propertyFilter);
    }
    
    // Filter tenants based on filtered properties
    const filteredPropertyIds = filteredProperties.map(p => p.id);
    const filteredTenants = allTenants.filter(t => 
      filteredPropertyIds.includes(t.propertyId)
    );
    
    // Calculate current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Calculate financial metrics
    const currentMonthIncome = filteredTransactions
      .filter(t => t.type === 'income' && t.date?.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const currentMonthExpenses = filteredTransactions
      .filter(t => t.type === 'expense' && t.date?.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const currentMonthBalance = currentMonthIncome - currentMonthExpenses;
    
    // Calculate totals
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = totalIncome - totalExpenses;
    
    // Account balances (unfiltered)
    const totalCashBalance = allAccounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
    const totalCreditBalance = allAccounts
      .filter(acc => acc.type === 'credit')
      .reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
    
    // Property calculations
    const totalValue = filteredProperties.reduce((sum, p) => sum + (parseFloat(p.currentValue) || 0), 0);
    const totalLoan = allLoans
      .filter(l => filteredPropertyIds.includes(l.propertyId))
      .reduce((sum, l) => sum + (parseFloat(l.currentBalance) || 0), 0);
    
    const totalRent = filteredTenants.reduce((sum, t) => sum + (parseFloat(t.rent) || 0), 0);
    const avgROI = calcAvgROI(filteredProperties, filteredTenants);
    const netPropertyWorth = totalValue - totalLoan;
    const totalNetWorth = totalCashBalance + netPropertyWorth - Math.abs(totalCreditBalance);
    
    // Budget performance
    const budgetPerformance = calculateBudgetPerformance(allBudgets, filteredTransactions, currentMonth);
    
    // Get unique months for dropdown
    const uniqueMonths = Array.from(
      new Set(
        filteredTransactions.map(t => {
          const d = new Date(t.date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        })
      )
    ).sort();
    
    const latestMonth = uniqueMonths.at(-1) || currentMonth;
    
    // Update UI
    updateDashboardUI({
      filteredTransactions,
      filteredProperties,
      filteredTenants,
      allCategories,
      allAccounts,
      allBudgets,
      allLoans,
      currentMonthIncome,
      currentMonthExpenses,
      currentMonthBalance,
      totalIncome,
      totalExpenses,
      balance,
      totalCashBalance,
      totalCreditBalance,
      totalValue,
      totalLoan,
      totalRent,
      avgROI,
      netPropertyWorth,
      totalNetWorth,
      budgetPerformance,
      currentMonth,
      uniqueMonths,
      latestMonth,
      filters
    });
    
    // Update filter badge
    updateFilterBadge(filters);
    
    // Update chart based on selection
    updateDashboardChart();
    
  } catch (error) {
    console.error('Error applying filters:', error);
    alert('Error applying filters: ' + error.message);
  }
}

function updateDashboardUI(data) {
  // Update all card values
  updateCardValues(data);
  
  // Update charts
  updateCharts(data);
  
  // Update recent activity
  updateRecentActivityList(data.filteredTransactions);
}

function updateCardValues(data) {
  // Total Balance Card
  document.getElementById('totalBalanceValue').textContent = `$${safe(data.totalNetWorth)}`;
  document.getElementById('balanceTrend').textContent = `+$${safe(data.currentMonthBalance)} this month`;
  
  // Income Card
  document.getElementById('monthlyIncomeValue').textContent = `$${safe(data.currentMonthIncome)}`;
  const rentalIncome = data.filteredTransactions
    .filter(t => t.type === 'income' && t.categoryId === 'rent')
    .reduce((sum, t) => sum + t.amount, 0);
  const otherIncome = data.currentMonthIncome - rentalIncome;
  
  document.getElementById('incomeBreakdown').innerHTML = `
    <div class="breakdown-item">
      <span class="breakdown-label">Rental</span>
      <span class="breakdown-value">$${safe(rentalIncome)}</span>
    </div>
    <div class="breakdown-item">
      <span class="breakdown-label">Other</span>
      <span class="breakdown-value">$${safe(otherIncome)}</span>
    </div>
  `;
  
  // Savings Card
  const savingsRate = data.currentMonthIncome > 0 ? 
    ((data.currentMonthIncome - data.currentMonthExpenses) / data.currentMonthIncome * 100).toFixed(1) : 0;
  document.getElementById('savingsRateValue').textContent = `${savingsRate}%`;
  const savingsAmount = data.currentMonthIncome - data.currentMonthExpenses;
  document.getElementById('savingsAmount').textContent = `$${safe(savingsAmount)} saved`;
  
  // Expenses Card
  const recentExpenses = data.filteredTransactions
    .filter(t => t.type === 'expense')
    .slice(-4);
  
  document.getElementById('expensesList').innerHTML = recentExpenses.map(exp => {
    const category = data.allCategories.find(c => c.id === exp.categoryId)?.name || 'Other';
    return `
      <div class="expense-item">
        <span class="expense-category">${category}</span>
        <span class="expense-amount">$${safe(exp.amount)}</span>
      </div>
    `;
  }).join('');
  
  document.getElementById('expensesCount').textContent = `${new Set(recentExpenses.map(e => e.categoryId)).size} Categories`;
  
  // Property Card
  document.getElementById('propertyCountValue').textContent = data.filteredProperties.length;
  document.getElementById('propertySummary').innerHTML = `
    <div class="summary-item">
      <span class="summary-label">Value</span>
      <span class="summary-value">$${safe(data.totalValue)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Tenants</span>
      <span class="summary-value">${data.filteredTenants.length}</span>
    </div>
  `;
  
  // Budget Card
  document.getElementById('budgetProgress').innerHTML = `
    <div class="progress-info">
      <span class="progress-label">Overall</span>
      <span class="progress-value">${data.budgetPerformance.onTrackCount}/${data.budgetPerformance.totalBudgets}</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${data.budgetPerformance.totalBudgets > 0 ? 
        (data.budgetPerformance.onTrackCount / data.budgetPerformance.totalBudgets * 100) : 0}%"></div>
    </div>
  `;
  
  document.getElementById('budgetSummary').innerHTML = `
    <div class="summary-item">
      <span class="summary-label">On Track</span>
      <span class="summary-value">${data.budgetPerformance.onTrackCount}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Over</span>
      <span class="summary-value">${data.budgetPerformance.overBudgetCount}</span>
    </div>
  `;
  
  // Update card statuses based on data
  updateCardStatuses(data);
}

function updateCardStatuses(data) {
  // Balance card status
  const balanceStatus = document.getElementById('balanceStatus');
  balanceStatus.className = 'card-badge ' + (data.totalNetWorth >= 0 ? 'success' : 'warning');
  balanceStatus.textContent = data.totalNetWorth >= 0 ? 'Positive' : 'Negative';
  
  // Income card status
  const incomeStatus = document.getElementById('incomeStatus');
  incomeStatus.className = 'card-badge ' + (data.currentMonthIncome >= data.totalRent ? 'success' : 'info');
  incomeStatus.textContent = data.currentMonthIncome >= data.totalRent ? 'On Track' : 'Below Target';
  
  // Savings card status
  const savingsStatus = document.getElementById('savingsStatus');
  const savingsRate = data.currentMonthIncome > 0 ? 
    ((data.currentMonthIncome - data.currentMonthExpenses) / data.currentMonthIncome * 100) : 0;
  savingsStatus.className = 'card-badge ' + (savingsRate >= 20 ? 'success' : savingsRate >= 10 ? 'warning' : 'danger');
  savingsStatus.textContent = savingsRate >= 20 ? 'Excellent' : savingsRate >= 10 ? 'Good' : 'Needs Work';
  
  // Budget card status
  const budgetStatus = document.getElementById('budgetStatus');
  budgetStatus.className = 'card-badge ' + (data.budgetPerformance.overBudgetCount === 0 ? 'success' : 'warning');
  budgetStatus.textContent = data.budgetPerformance.overBudgetCount === 0 ? 'On Track' : 'Needs Attention';
  
  // Property card status
  const propertyStatus = document.getElementById('propertyStatus');
  propertyStatus.className = 'card-badge ' + (data.filteredTenants.length > 0 ? 'success' : 'info');
  propertyStatus.textContent = data.filteredTenants.length > 0 ? 'Occupied' : 'Vacant';
}

// ====================================================
// CHART FUNCTIONS (Adapted for single chart)
// ====================================================

function initializeDashboardChart() {
  const chartCtx = document.getElementById('dashboardChart');
  if (!chartCtx) return;
  
  if (summaryChart) {
    summaryChart.destroy();
  }
  
  summaryChart = new Chart(chartCtx, {
    type: 'bar',
    data: {
      labels: ['Loading...'],
      datasets: [{
        label: 'Amount ($)',
        data: [0],
        backgroundColor: ['#0073e3'],
        borderColor: ['#0056b3'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
      }
    }
  });
}

function updateDashboardChart() {
  if (!summaryChart) return;
  
  const chartType = document.getElementById('chartType')?.value || 'summary';
  
  switch(chartType) {
    case 'summary':
      updateSummaryChartData();
      break;
    case 'category':
      updateCategoryChartData();
      break;
    case 'trend':
      updateTrendChartData();
      break;
  }
}

function updateSummaryChartData() {
  // This would use the data from current filters
  // For now, use dummy data or fetch from current state
  summaryChart.data.labels = ['Income', 'Expenses', 'Balance', 'Rent'];
  summaryChart.data.datasets[0].data = [1000, 600, 400, 800];
  summaryChart.data.datasets[0].backgroundColor = ['#34c759', '#ff3b30', '#0073e3', '#ff9500'];
  summaryChart.data.datasets[0].borderColor = ['#27ae60', '#c0392b', '#0056b3', '#e67e22'];
  summaryChart.update();
}

function updateCategoryChartData() {
  // Implement based on your data
  const categoryData = {}; // Get from filtered data
  // Update chart
}

function updateTrendChartData() {
  // Implement based on your data
  const trendData = {}; // Get from filtered data
  // Update chart
}

function toggleFullChart() {
  const chartCard = document.getElementById('chartsCard');
  if (chartCard) {
    chartCard.classList.toggle('full-width');
  }
}

// ====================================================
// EVENT LISTENERS SETUP (Adapted)
// ====================================================

function setupEventListeners() {
  // Filter Controls
  const applyFiltersBtn = document.getElementById('applyFilters');
  const resetFiltersBtn = document.getElementById('resetFilters');
  
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', applyFilters);
  }
  
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', resetFilters);
  }
  
  // Chart type selector
  const chartTypeSelect = document.getElementById('chartType');
  if (chartTypeSelect) {
    chartTypeSelect.addEventListener('change', updateDashboardChart);
  }
  
  // Export Dashboard Data
  const exportBtn = document.getElementById('exportDashboard');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      const dashboardData = {
        summary: {
          currentMonth: new Date().toISOString().slice(0, 7),
          filters: JSON.parse(localStorage.getItem('dashboardFilters') || '{}')
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
        autoRefreshInterval = setInterval(async () => {
          console.log('Auto-refreshing dashboard...');
          await refreshDashboardWithFilters(
            JSON.parse(localStorage.getItem('dashboardFilters') || '{}')
          );
        }, 30000);
        this.innerHTML = '⏸️ Pause';
      } else {
        clearInterval(autoRefreshInterval);
        this.innerHTML = '🔄 Live';
      }
    });
  }
  
  // FAB Event Listeners (simplified)
  const fabMain = document.getElementById('fabMain');
  const fabActions = document.getElementById('fabActions');
  
  if (fabMain && fabActions) {
    fabMain.addEventListener('click', function(e) {
      e.stopPropagation();
      fabActions.classList.toggle('show');
      fabMain.classList.toggle('active');
      fabMain.textContent = fabActions.classList.contains('show') ? '×' : '+';
    });
  }
}

// ====================================================
// HELPER FUNCTIONS (Keep from original)
// ====================================================

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

  return activities.sort((a, b) => b.timestamp - a.timestamp);
}

function updateRecentActivityList(transactions) {
  const recentActivity = document.getElementById('recentActivity');
  const activityCount = document.getElementById('activityCount');
  
  if (!recentActivity || !activityCount) return;
  
  const activities = getRecentActivity(transactions, [], []);
  
  if (activities.length === 0) {
    recentActivity.innerHTML = '<div class="activity-empty"><p>No recent activity found</p></div>';
    activityCount.textContent = 'Last 0 activities';
    return;
  }
  
  const recentItems = activities.slice(0, 5);
  activityCount.textContent = `Last ${recentItems.length} activities`;
  
  recentActivity.innerHTML = recentItems.map(item => `
    <div class="activity-item icloud">
      <span class="activity-icon">${item.icon}</span>
      <div class="activity-details">
        <div class="activity-desc">${item.description}</div>
        <div class="activity-date">${item.date}</div>
      </div>
      <span class="activity-amount ${item.amount < 0 ? 'negative' : 'positive'}">
        ${item.amount < 0 ? '-' : '+'}$${Math.abs(item.amount).toFixed(2)}
      </span>
    </div>
  `).join('');
}

function updateFilterBadge(filters) {
  const activeFilters = [];
  
  if (filters.propertyFilter && filters.propertyFilter !== 'all') {
    activeFilters.push('Property');
  }
  
  if (filters.categoryFilter && filters.categoryFilter !== 'all') {
    activeFilters.push('Category');
  }
  
  if (filters.dateFrom || filters.dateTo) {
    activeFilters.push('Date Range');
  }
  
  const filterBadge = document.getElementById('filterBadge');
  if (!filterBadge) return;
  
  if (activeFilters.length > 0) {
    filterBadge.innerHTML = `
      <span class="filter-indicator">🔍 Filters Active: ${activeFilters.join(', ')}</span>
      <button onclick="window.dashboardResetFilters()" class="btn btn-sm btn-outline" style="margin-left: 8px;">
        Clear All
      </button>
    `;
    filterBadge.style.display = 'flex';
    
    window.dashboardResetFilters = resetFilters;
  } else {
    filterBadge.style.display = 'none';
  }
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

// Cleanup function
export function cleanupDashboard() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
  
  // Destroy charts
  if (summaryChart) {
    summaryChart.destroy();
    summaryChart = null;
  }
}

// Initialize when module loads (optional)
// document.addEventListener('DOMContentLoaded', initDashboardUI);