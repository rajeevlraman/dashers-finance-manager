import { getAllItems, STORE_NAMES } from './db.js';

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
      // Add your expense modal code here
      console.log('Opening expense form');
      alert('Expense form would open here');
    },
    income: () => {
      // Add your income modal code here
      console.log('Opening income form');
      alert('Income form would open here');
    },
    property: () => {
      // Add your property modal code here
      console.log('Opening property form');
      alert('Property form would open here');
    },
    bill: () => {
      // Add your bill modal code here
      console.log('Opening bill form');
      alert('Bill form would open here');
    }
  };
  
  if (actions[action]) {
    actions[action]();
    // Close FAB
    closeFAB();
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
  mainContent.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading dashboard...</p></div>';

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

    // === Main HTML Layout ===
    mainContent.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h2>📊 Dashboard</h2>
          <div class="page-actions">
            <div class="welcome-banner">
              <div id="welcomeGreeting" class="welcome-greeting"></div>
              <div class="welcome-sub">
                <span id="welcomeDate"></span>
                <span id="welcomeWeather"></span>
              </div>
            </div>
            <div id="filterBadge" class="filter-badge" style="display: none;"></div>
            <button id="exportDashboard" class="btn btn-outline">📊 Export Data</button>
            <button id="liveRefresh" class="btn btn-outline" title="Live Refresh">🔄 Live Data</button>
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="filter-bar">
          <select id="propertyFilter">
            <option value="all">All Properties</option>
            ${allProperties.map(p => `<option value="${p.id}" ${initialFilters.propertyFilter === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
          
          <select id="categoryFilter">
            <option value="all">All Categories</option>
            ${allCategories.map(c => `<option value="${c.id}" ${initialFilters.categoryFilter === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
          
          <input type="date" id="dateFrom" value="${initialFilters.dateFrom || ''}" placeholder="From Date">
          <input type="date" id="dateTo" value="${initialFilters.dateTo || ''}" placeholder="To Date">
          
          <button id="applyFilters" class="btn btn-primary">Apply Filters</button>
          <button id="resetFilters" class="btn btn-secondary">Reset</button>
        </div>

        <!-- Quick Stats Grid -->
        <div class="section-card">
          <h3>⚡ Quick Stats</h3>
          <div class="stats-grid">
            <div class="stat-item positive" id="incomeStat">
              <span class="stat-icon">💰</span>
              <div class="stat-content">
                <span class="stat-value" id="totalIncome">$0.00</span>
                <span class="stat-label">Total Income</span>
              </div>
            </div>
            <div class="stat-item negative" id="expenseStat">
              <span class="stat-icon">💸</span>
              <div class="stat-content">
                <span class="stat-value" id="totalExpenses">$0.00</span>
                <span class="stat-label">Total Expenses</span>
              </div>
            </div>
            <div class="stat-item positive" id="cashStat">
              <span class="stat-icon">💳</span>
              <div class="stat-content">
                <span class="stat-value" id="cashBalanceStat">$0.00</span>
                <span class="stat-label">Cash Balance</span>
              </div>
            </div>
            <div class="stat-item negative" id="creditStat">
              <span class="stat-icon">🏦</span>
              <div class="stat-content">
                <span class="stat-value" id="creditBalanceStat">$0.00</span>
                <span class="stat-label">Credit Balance</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Health Summary -->
        <div class="expandable-section">
          <div class="section-header" onclick="toggleSection(this)">
            <h3>💰 Financial Health</h3>
            <span class="toggle-icon">▼</span>
          </div>
          <div class="section-content" style="display: block;">
            <div class="compact-summary-cards">
              <div class="compact-card green" id="monthCard">
                <div class="compact-icon">💵</div>
                <div class="compact-content">
                  <div class="compact-value" id="monthBalance">$0.00</div>
                  <div class="compact-label">This Month</div>
                  <div class="compact-subtext" id="monthIncome">Income: $0.00</div>
                  <div class="compact-subtext" id="monthExpenses">Expenses: $0.00</div>
                </div>
              </div>
              
              <div class="compact-card blue" id="netWorthCard">
                <div class="compact-icon">🏦</div>
                <div class="compact-content">
                  <div class="compact-value" id="netWorth">$0.00</div>
                  <div class="compact-label">Net Worth</div>
                  <div class="compact-subtext" id="cashBalance">Cash: $0.00</div>
                  <div class="compact-subtext" id="propertyWorth">Properties: $0.00</div>
                </div>
              </div>
              
              <div class="compact-card teal" id="budgetCard">
                <div class="compact-icon">🎯</div>
                <div class="compact-content">
                  <div class="compact-value" id="budgetValue">0/0</div>
                  <div class="compact-label">On Track</div>
                  <div class="compact-subtext" id="overBudget">0 over budget</div>
                  <div class="compact-subtext" id="totalBudgets">0 total budgets</div>
                </div>
              </div>

              <div class="compact-card purple" id="rentCard">
                <div class="compact-icon">📈</div>
                <div class="compact-content">
                  <div class="compact-value" id="totalRentValue">$0.00</div>
                  <div class="compact-label">Monthly Rent</div>
                  <div class="compact-subtext" id="tenantCount">From 0 tenants</div>
                  <div class="compact-subtext" id="propertyCount">0 properties</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Property Portfolio -->
        <div class="expandable-section">
          <div class="section-header" onclick="toggleSection(this)">
            <h3>🏠 Property Portfolio</h3>
            <span class="toggle-icon">▼</span>
          </div>
          <div class="section-content" style="display: block;">
            <div class="compact-summary-cards">
              <div class="compact-card teal" id="propertyCard">
                <div class="compact-icon">🏘️</div>
                <div class="compact-content">
                  <div class="compact-value" id="propertyCountValue">0</div>
                  <div class="compact-label">Properties</div>
                  <div class="compact-subtext" id="propertyValue">Value: $0.00</div>
                </div>
              </div>
              
              <div class="compact-card gold" id="tenantCard">
                <div class="compact-icon">👥</div>
                <div class="compact-content">
                  <div class="compact-value" id="tenantCountValue">0</div>
                  <div class="compact-label">Tenants</div>
                  <div class="compact-subtext" id="rentValue">Rent: $0.00/mo</div>
                </div>
              </div>
              
              <div class="compact-card green" id="roiCard">
                <div class="compact-icon">📊</div>
                <div class="compact-content">
                  <div class="compact-value" id="roiValue">0%</div>
                  <div class="compact-label">Avg ROI</div>
                  <div class="compact-subtext">Property Returns</div>
                </div>
              </div>
              
              <div class="compact-card blue" id="equityCard">
                <div class="compact-icon">💎</div>
                <div class="compact-content">
                  <div class="compact-value" id="equityValue">$0.00</div>
                  <div class="compact-label">Equity</div>
                  <div class="compact-subtext" id="loanValue">Loans: $0.00</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Budget Performance Section -->
        <div class="expandable-section">
          <div class="section-header" onclick="toggleSection(this)">
            <h3>🎯 Budget Performance</h3>
            <span class="toggle-icon">▼</span>
          </div>
          <div class="section-content" style="display: block;">
            <div class="budgets-grid" id="budgetsGrid">
              <p class="no-data">No budgets configured</p>
            </div>
          </div>
        </div>



        <!-- Charts Section -->
        <div class="charts-container">
          <div class="section-card">
            <div class="chart-header">
              <h4>📅 Monthly Overview</h4>
              <select id="monthSelect" class="form-select">
                <!-- Months will be populated dynamically -->
              </select>
            </div>
            <canvas id="summaryChart" height="200"></canvas>
          </div>

          <div class="section-card">
            <div class="chart-header">
              <h4>📊 Expense Categories</h4>
              <span id="selectedMonthDisplay" class="month-badge">Loading...</span>
            </div>
            <canvas id="expenseByCatChart" height="220"></canvas>
          </div>

          <div class="section-card full-width">
            <div class="chart-header">
              <h4>📈 Income vs Expenses Trend</h4>
              <button id="toggleTrend" class="btn btn-secondary">📉 Hide Chart</button>
            </div>
            <canvas id="trendChart" height="250"></canvas>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="section-card">
          <div class="transactions-header">
            <h3>📝 Recent Activity</h3>
            <span class="transactions-count" id="activityCount">Last 0 activities</span>
          </div>
          <div class="recent-activity" id="recentActivity">
            <div class="empty-state">
              <p>No recent activity found</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Floating Action Button -->
      <div class="fab-container">
        <div class="fab-actions" id="fabActions">
          <button data-action="expense">
            <span class="fab-icon">💸</span>
            <span class="fab-text">Add Expense</span>
          </button>
          <button data-action="income">
            <span class="fab-icon">💰</span>
            <span class="fab-text">Add Income</span>
          </button>
          <button data-action="property">
            <span class="fab-icon">🏠</span>
            <span class="fab-text">Add Property</span>
          </button>
          <button data-action="bill">
            <span class="fab-icon">🧾</span>
            <span class="fab-text">Pay Bill</span>
          </button>
        </div>
        <button class="fab-main" id="fabMain">+</button>
      </div>
    `;

    // Populate Welcome Banner
    document.getElementById("welcomeGreeting").textContent = getGreeting();
    document.getElementById("welcomeDate").textContent = getTodayDate();
    
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

// ====================================================
// FILTER FUNCTIONS
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
    
  } catch (error) {
    console.error('Error applying filters:', error);
    alert('Error applying filters: ' + error.message);
  }
}

function updateDashboardUI(data) {
  // Update financial health cards
  updateFinancialCards(data);
  
  // Update property portfolio
  updatePropertyCards(data);
  
  // Update quick stats
  updateQuickStats(data);
  
  // Update budget section
  updateBudgetGrid(data);
  
  // Update charts
  updateCharts(data);
  
  // Update recent activity
  updateRecentActivityList(data.filteredTransactions);
  
  // Update month selector
  updateMonthSelector(data.uniqueMonths, data.latestMonth);
}

function updateFinancialCards(data) {
  // This Month card
  const monthCard = document.getElementById('monthCard');
  if (monthCard) {
    monthCard.className = `compact-card ${data.currentMonthBalance >= 0 ? 'green' : 'red'}`;
    document.getElementById('monthBalance').textContent = `$${safe(data.currentMonthBalance)}`;
    document.getElementById('monthIncome').textContent = `Income: $${safe(data.currentMonthIncome)}`;
    document.getElementById('monthExpenses').textContent = `Expenses: $${safe(data.currentMonthExpenses)}`;
  }
  
  // Net Worth card
  const netWorthCard = document.getElementById('netWorthCard');
  if (netWorthCard) {
    netWorthCard.className = `compact-card ${data.totalNetWorth >= 0 ? 'blue' : 'orange'}`;
    document.getElementById('netWorth').textContent = `$${safe(data.totalNetWorth)}`;
    document.getElementById('cashBalance').textContent = `Cash: $${safe(data.totalCashBalance)}`;
    document.getElementById('propertyWorth').textContent = `Properties: $${safe(data.netPropertyWorth)}`;
  }
  
  // Budget card
  const budgetCard = document.getElementById('budgetCard');
  if (budgetCard) {
    budgetCard.className = `compact-card ${data.budgetPerformance.overBudgetCount === 0 ? 'teal' : 'yellow'}`;
    document.getElementById('budgetValue').textContent = `${data.budgetPerformance.onTrackCount}/${data.budgetPerformance.totalBudgets}`;
    document.getElementById('overBudget').textContent = `${data.budgetPerformance.overBudgetCount} over budget`;
    document.getElementById('totalBudgets').textContent = `${data.budgetPerformance.totalBudgets} total budgets`;
  }
  
  // Rent card
  document.getElementById('totalRentValue').textContent = `$${safe(data.totalRent)}`;
  document.getElementById('tenantCount').textContent = `From ${data.filteredTenants.length} tenants`;
  document.getElementById('propertyCount').textContent = `${data.filteredProperties.length} properties`;
}

function updatePropertyCards(data) {
  // Properties card
  document.getElementById('propertyCountValue').textContent = data.filteredProperties.length;
  document.getElementById('propertyValue').textContent = `Value: $${safe(data.totalValue)}`;
  
  // Tenants card
  document.getElementById('tenantCountValue').textContent = data.filteredTenants.length;
  document.getElementById('rentValue').textContent = `Rent: $${safe(data.totalRent)}/mo`;
  
  // ROI card
  const roiCard = document.getElementById('roiCard');
  roiCard.className = `compact-card ${data.avgROI > 5 ? 'green' : 'orange'}`;
  document.getElementById('roiValue').textContent = `${data.avgROI}%`;
  
  // Equity card
  const equityCard = document.getElementById('equityCard');
  equityCard.className = `compact-card ${data.netPropertyWorth >= 0 ? 'blue' : 'red'}`;
  document.getElementById('equityValue').textContent = `$${safe(data.netPropertyWorth)}`;
  document.getElementById('loanValue').textContent = `Loans: $${safe(data.totalLoan)}`;
}

function updateQuickStats(data) {
  // Income stat
  const incomeStat = document.getElementById('incomeStat');
  incomeStat.className = `stat-item ${data.totalIncome >= data.totalExpenses ? 'positive' : 'negative'}`;
  document.getElementById('totalIncome').textContent = `$${safe(data.totalIncome)}`;
  
  // Expense stat
  document.getElementById('totalExpenses').textContent = `$${safe(data.totalExpenses)}`;
  
  // Cash balance
  document.getElementById('cashBalanceStat').textContent = `$${safe(data.totalCashBalance)}`;
  
  // Credit balance
  document.getElementById('creditBalanceStat').textContent = `$${safe(data.totalCreditBalance)}`;
}

function updateBudgetGrid(data) {
  const budgetsGrid = document.getElementById('budgetsGrid');
  if (!budgetsGrid) return;
  
  if (!data.allBudgets || data.allBudgets.length === 0) {
    budgetsGrid.innerHTML = '<p class="no-data">No budgets configured</p>';
    return;
  }
  
  budgetsGrid.innerHTML = data.allBudgets.map(budget => {
    const spent = data.filteredTransactions
      .filter(t => t.categoryId === budget.categoryId && t.date?.startsWith(data.currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const percentage = (spent / budget.amount) * 100;
    const category = data.allCategories.find(c => c.id === budget.categoryId);
    const isOverBudget = spent > budget.amount;
    
    return `
      <div class="budget-progress ${isOverBudget ? 'over-budget' : 'on-track'}">
        <div class="progress-header">
          <span>${category?.name || 'Uncategorized'}</span>
          <span>$${safe(spent)} / $${safe(budget.amount)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
        </div>
        <div class="progress-status">
          ${isOverBudget ? '❌ Over Budget' : '✅ On Track'}
        </div>
      </div>
    `;
  }).join('');
}

function updateCharts(data) {
  // Update summary chart
  updateSummaryChart(data);
  
  // Update category chart
  updateCategoryChart(data);
  
  // Update trend chart
  updateTrendChart(data);
}

function updateSummaryChart(data) {
  if (!summaryChart) {
    const summaryCtx = document.getElementById('summaryChart');
    if (!summaryCtx) return;
    
    summaryChart = new Chart(summaryCtx, {
      type: 'bar',
      data: {
        labels: ['Income', 'Expenses', 'Balance', 'Rent Income'],
        datasets: [{
          label: 'Amount ($)',
          data: [data.currentMonthIncome, data.currentMonthExpenses, data.currentMonthBalance, data.totalRent],
          backgroundColor: ['#2ecc71', '#e74c3c', '#3498db', '#f39c12'],
          borderColor: ['#27ae60', '#c0392b', '#2980b9', '#e67e22'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
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
  } else {
    summaryChart.data.datasets[0].data = [
      data.currentMonthIncome,
      data.currentMonthExpenses,
      data.currentMonthBalance,
      data.totalRent
    ];
    summaryChart.update();
  }
}

function updateCategoryChart(data) {
  const selectedMonth = document.getElementById('monthSelect')?.value || data.currentMonth;
  
  const filteredTx = data.filteredTransactions.filter(
    t => t.type === 'expense' && t.date?.startsWith(selectedMonth)
  );
  
  const expensesByCategory = {};
  filteredTx.forEach(t => {
    const cat = t.categoryId || 'Uncategorized';
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.amount;
  });

  const catLabels = Object.keys(expensesByCategory).map(
    id => data.allCategories.find(c => c.id === id)?.name || 'Other'
  );
  const catData = Object.values(expensesByCategory);
  
  // Update month display
  const monthDisplay = document.getElementById('selectedMonthDisplay');
  if (monthDisplay) monthDisplay.textContent = selectedMonth;
  
  if (catChart) {
    catChart.destroy();
  }
  
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
          tooltip: { 
            callbacks: { 
              label: (ctx) => `${ctx.label}: $${ctx.raw.toFixed(2)}`
            } 
          }
        }
      }
    });
  } else if (catCtx) {
    catCtx.parentElement.innerHTML += '<p class="no-data">No expense data for this month</p>';
  }
}

function updateTrendChart(data) {
  const monthly = {};
  data.filteredTransactions.forEach(t => {
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
  
  if (trendChart) {
    trendChart.destroy();
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
        }
      }
    });
  } else if (trendCtx) {
    trendCtx.parentElement.innerHTML += '<p class="no-data">No trend data available</p>';
  }
}

function updateRecentActivityList(transactions) {
  const recentActivity = document.getElementById('recentActivity');
  const activityCount = document.getElementById('activityCount');
  
  if (!recentActivity || !activityCount) return;
  
  const activities = getRecentActivity(transactions, [], []);
  
  if (activities.length === 0) {
    recentActivity.innerHTML = '<div class="empty-state"><p>No recent activity found</p></div>';
    activityCount.textContent = 'Last 0 activities';
    return;
  }
  
  const recentItems = activities.slice(0, 5);
  activityCount.textContent = `Last ${recentItems.length} activities`;
  
  recentActivity.innerHTML = recentItems.map(item => `
    <div class="activity-item">
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

function updateMonthSelector(uniqueMonths, latestMonth) {
  const monthSelect = document.getElementById('monthSelect');
  if (!monthSelect) return;
  
  monthSelect.innerHTML = uniqueMonths.map(m => 
    `<option value="${m}" ${m === latestMonth ? 'selected' : ''}>${formatMonthLabel(m)}</option>`
  ).join('');
  
  // Add change event listener
  monthSelect.onchange = () => {
    const selectedMonth = monthSelect.value;
    // Re-filter and update charts for selected month
    refreshDashboardWithFilters({
      ...JSON.parse(localStorage.getItem('dashboardFilters') || '{}'),
      selectedMonth
    });
  };
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
    
    // Make reset function globally available
    window.dashboardResetFilters = resetFilters;
  } else {
    filterBadge.style.display = 'none';
  }
}

// ====================================================
// EVENT LISTENERS SETUP
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
        this.innerHTML = '⏸️ Pause Auto-Refresh';
      } else {
        clearInterval(autoRefreshInterval);
        this.innerHTML = '🔄 Live Data';
      }
    });
  }
  
  // Chart Toggle
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
  
  // FAB Event Listeners
  const fabMain = document.getElementById('fabMain');
  const fabActions = document.getElementById('fabActions');
  
  if (fabMain && fabActions) {
    fabMain.addEventListener('click', function(e) {
      e.stopPropagation();
      
      const isActive = fabActions.classList.contains('show');
      
      if (!isActive) {
        // Open FAB
        fabActions.classList.add('show');
        fabMain.classList.add('active');
        fabMain.textContent = '×';
        
        // Add backdrop
        let backdrop = document.querySelector('.fab-backdrop');
        if (!backdrop) {
          backdrop = document.createElement('div');
          backdrop.className = 'fab-backdrop';
          document.body.appendChild(backdrop);
        }
        backdrop.classList.add('active');
        
        // Click outside to close
        backdrop.addEventListener('click', closeFAB);
      } else {
        closeFAB();
      }
    });
    
    // Handle action button clicks
    fabActions.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', function(e) {
        e.stopPropagation();
        const action = this.dataset.action;
        if (action) {
          window.quickAction(action);
        }
      });
    });
    
    // Close FAB when pressing ESC
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && fabActions.classList.contains('show')) {
        closeFAB();
      }
    });
  }
}

// ====================================================
// HELPER FUNCTIONS
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
  
  // Destroy charts
  if (catChart) {
    catChart.destroy();
    catChart = null;
  }
  if (trendChart) {
    trendChart.destroy();
    trendChart = null;
  }
  if (summaryChart) {
    summaryChart.destroy();
    summaryChart = null;
  }
}