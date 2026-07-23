import { getAllItems, STORE_NAMES } from './db.js';
import { escapeHtml } from './sanitize.js';

// Chart instances stored globally
let catChart = null;
let trendChart = null;
let summaryChart = null;
let netWorthChart = null;
let autoRefreshInterval = null;

// Global functions for HTML interactions
window.toggleSection = function(header) {
  const content = header.nextElementSibling;
  const icon = header.querySelector('.toggle-icon');
  content.style.display = content.style.display === 'none' ? 'block' : 'none';
  icon.textContent = content.style.display === 'none' ? '▼' : '▲';
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
  const mainContent = document.getElementById('mainContent');
  mainContent.classList.add('page-transition');
  mainContent.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading dashboard...</p></div>';

  try {
    // === Fetch all core + property data ===
    const [transactionsRaw, bills, categories, properties, tenants, loans, maintenance, accounts, budgets, recurringTx] = await Promise.all([
      getAllItems(STORE_NAMES.transactions),
      getAllItems(STORE_NAMES.bills),
      getAllItems(STORE_NAMES.categories),
      getAllItems(STORE_NAMES.properties || 'properties').catch(() => []),
      getAllItems(STORE_NAMES.tenants || 'tenants').catch(() => []),
      getAllItems(STORE_NAMES.loans || 'loans').catch(() => []),
      getAllItems(STORE_NAMES.maintenance || 'maintenance').catch(() => []),
      getAllItems(STORE_NAMES.accounts).catch(() => []),
      getAllItems(STORE_NAMES.budgets).catch(() => []),
      getAllItems(STORE_NAMES.recurringTransactions).catch(() => [])
    ]);

    // Apply any saved dashboard filters (property/category/date range).
    // Previously "Apply Filters" saved these to localStorage and then did
    // a full location.reload() — a jarring full app restart — and even
    // after reloading, nothing ever actually read this saved value back
    // out, so the filters never did anything either. Now they're read
    // here and applied to the transaction list every time the dashboard
    // renders, no reload needed.
    const dashboardFilters = JSON.parse(localStorage.getItem('dashboardFilters') || 'null');
    const transactions = !dashboardFilters ? transactionsRaw : transactionsRaw.filter(t => {
      if (dashboardFilters.propertyFilter && dashboardFilters.propertyFilter !== 'all' && t.propertyId !== dashboardFilters.propertyFilter) return false;
      if (dashboardFilters.categoryFilter && dashboardFilters.categoryFilter !== 'all' && t.categoryId !== dashboardFilters.categoryFilter) return false;
      if (dashboardFilters.dateFrom && t.date < dashboardFilters.dateFrom) return false;
      if (dashboardFilters.dateTo && t.date > dashboardFilters.dateTo) return false;
      return true;
    });

    // === Current period calculations ===
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthIncome = transactions
      .filter(t => t.type === 'income' && t.date?.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
    const currentMonthExpenses = transactions
      .filter(t => t.type === 'expense' && t.date?.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
    // currentMonthExpenses is already negative (expense amounts are stored
    // negative), so balance is the sum, not income minus expenses.
    const currentMonthBalance = currentMonthIncome + currentMonthExpenses;

    // === Financial totals ===
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income + expenses;

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

    // === Bill alerts (overdue + due within 7 days) ===
    const { overdueBills, dueSoonBills } = getBillAlerts(bills, 7);

    // === Upcoming recurring transactions (next 30 days) ===
    const upcomingRecurring = getUpcomingRecurring(recurringTx, 30);

    // === Top spending categories this month ===
    const topCategories = getTopSpendingCategories(transactions, categories, currentMonth, 5);

    // === Loan payoff progress ===
    const loanProgress = getLoanProgressList(loans);

    // === Savings rate (this month) ===
    const savingsRate = currentMonthIncome > 0
      ? ((currentMonthBalance / currentMonthIncome) * 100)
      : 0;

    // === Month-over-month comparison ===
    const momChange = getMonthOverMonthChange(transactions, currentMonth);

    // === Next tax deadline ===
    const nextTaxDeadline = getNextTaxDeadline();

    // === Net worth trend (last 6 months; property/loan equity held at current value) ===
    const netWorthTrend = getNetWorthTrendSeries(transactions, netPropertyWorth, totalCashBalance, 6);

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
      <div class="page-container">
        <div class="page-header">
          <h2>📊 Dashboard</h2>
          <div class="page-actions">
            <span class="dashboard-date">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <button id="exportDashboard" class="btn btn-outline">📊 Export Data</button>
            <button id="liveRefresh" class="btn btn-outline" title="Live Refresh">🔄 Live Data</button>
          </div>
        </div>

                <!-- Welcome Banner -->
        <div class="welcome-banner">
          <div id="welcomeGreeting" class="welcome-greeting"></div>
          <div class="welcome-sub">
            <span id="welcomeDate"></span>
            <span id="welcomeWeather"></span>
          </div>
        </div>

        <!-- Alerts Banner -->
        ${(overdueBills.length > 0 || dueSoonBills.length > 0 || budgetPerformance.overBudgetCount > 0) ? `
          <div class="dashboard-alerts">
            ${overdueBills.length > 0 ? `
              <a href="#bills" class="dashboard-alert alert-red">
                <span class="alert-icon">⚠️</span>
                <span class="alert-text"><strong>${overdueBills.length}</strong> bill${overdueBills.length > 1 ? 's' : ''} overdue</span>
              </a>
            ` : ''}
            ${dueSoonBills.length > 0 ? `
              <a href="#bills" class="dashboard-alert alert-orange">
                <span class="alert-icon">📅</span>
                <span class="alert-text"><strong>${dueSoonBills.length}</strong> bill${dueSoonBills.length > 1 ? 's' : ''} due this week</span>
              </a>
            ` : ''}
            ${budgetPerformance.overBudgetCount > 0 ? `
              <a href="#budgets" class="dashboard-alert alert-yellow">
                <span class="alert-icon">🎯</span>
                <span class="alert-text"><strong>${budgetPerformance.overBudgetCount}</strong> budget${budgetPerformance.overBudgetCount > 1 ? 's' : ''} over limit</span>
              </a>
            ` : ''}
          </div>
        ` : ''}

        <!-- Filter Controls -->
        <div class="filter-bar">
          ${dashboardFilters ? '<span class="filter-active-badge">🔍 Filtered view</span>' : ''}
          <select id="propertyFilter">
            <option value="all">All Properties</option>
            ${properties.map(p => `<option value="${p.id}" ${dashboardFilters?.propertyFilter === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
          </select>
          
          <select id="categoryFilter">
            <option value="all">All Categories</option>
            ${categories.map(c => `<option value="${c.id}" ${dashboardFilters?.categoryFilter === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
          
          <input type="date" id="dateFrom" placeholder="From Date" value="${dashboardFilters?.dateFrom || ''}">
          <input type="date" id="dateTo" placeholder="To Date" value="${dashboardFilters?.dateTo || ''}">
          
          <button id="applyFilters" class="btn btn-primary">Apply Filters</button>
          <button id="resetFilters" class="btn btn-secondary">Reset</button>
        </div>

        <!-- Financial Health Summary -->
        <div class="expandable-section">
          <div class="section-header" onclick="toggleSection(this)">
            <h3>💰 Financial Health</h3>
            <span class="toggle-icon">▼</span>
          </div>
          <div class="section-content">
            <div class="compact-summary-cards">
              <div class="compact-card ${currentMonthBalance >= 0 ? 'green' : 'red'}">
                <div class="compact-icon">💵</div>
                <div class="compact-content">
                  <div class="compact-value">$${safe(currentMonthBalance)}</div>
                  <div class="compact-label">This Month</div>
                  <div class="compact-subtext">Income: $${safe(currentMonthIncome)}</div>
                  <div class="compact-subtext">Expenses: $${safe(currentMonthExpenses)}</div>
                  ${momChange.hasPrevData ? `
                    <div class="compact-subtext">
                      ${currentMonthBalance >= momChange.prevBalance ? '▲' : '▼'}
                      $${safe(Math.abs(currentMonthBalance - momChange.prevBalance))} vs last month
                    </div>
                  ` : ''}
                </div>
              </div>
              
              <div class="compact-card ${totalNetWorth >= 0 ? 'blue' : 'orange'}">
                <div class="compact-icon">🏦</div>
                <div class="compact-content">
                  <div class="compact-value">$${safe(totalNetWorth)}</div>
                  <div class="compact-label">Net Worth</div>
                  <div class="compact-subtext">Cash: $${safe(totalCashBalance)}</div>
                  <div class="compact-subtext">Properties: $${safe(netPropertyWorth)}</div>
                </div>
              </div>
              
              <div class="compact-card ${budgetPerformance.overBudgetCount === 0 ? 'teal' : 'yellow'}">
                <div class="compact-icon">🎯</div>
                <div class="compact-content">
                  <div class="compact-value">${budgetPerformance.onTrackCount}/${budgetPerformance.totalBudgets}</div>
                  <div class="compact-label">On Track</div>
                  <div class="compact-subtext">${budgetPerformance.overBudgetCount} over budget</div>
                  <div class="compact-subtext">${budgetPerformance.totalBudgets} total budgets</div>
                </div>
              </div>

              <div class="compact-card purple">
                <div class="compact-icon">📈</div>
                <div class="compact-content">
                  <div class="compact-value">$${safe(totalRent)}</div>
                  <div class="compact-label">Monthly Rent</div>
                  <div class="compact-subtext">From ${tenants.length} tenants</div>
                  <div class="compact-subtext">${properties.length} properties</div>
                </div>
              </div>

              <div class="compact-card ${savingsRate >= 0 ? 'gold' : 'red'}">
                <div class="compact-icon">🐷</div>
                <div class="compact-content">
                  <div class="compact-value">${savingsRate.toFixed(1)}%</div>
                  <div class="compact-label">Savings Rate</div>
                  <div class="compact-subtext">Of this month's income</div>
                </div>
              </div>

              <div class="compact-card ${nextTaxDeadline.daysUntil <= 30 ? 'orange' : 'blue'}">
                <div class="compact-icon">📋</div>
                <div class="compact-content">
                  <div class="compact-value">${nextTaxDeadline.daysUntil}d</div>
                  <div class="compact-label">${escapeHtml(nextTaxDeadline.name)}</div>
                  <div class="compact-subtext">Due ${nextTaxDeadline.date.toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Accounts -->
        <div class="expandable-section">
          <div class="section-header" onclick="toggleSection(this)">
            <h3>🏦 Accounts</h3>
            <span class="toggle-icon">▼</span>
          </div>
          <div class="section-content">
            <div class="recent-activity">
              ${accounts.map(acc => `
                <div class="activity-item">
                  <span class="activity-icon">${getAccountTypeIcon(acc.type)}</span>
                  <div class="activity-details">
                    <div class="activity-desc">${escapeHtml(acc.name)}</div>
                    <div class="activity-date">${escapeHtml(acc.type || 'account')}</div>
                  </div>
                  <span class="activity-amount ${acc.balance < 0 ? 'negative' : 'positive'}">
                    ${acc.balance < 0 ? '-' : ''}$${safe(Math.abs(acc.balance))}
                  </span>
                </div>
              `).join('')}
              ${accounts.length === 0 ? '<p class="no-data">No accounts added yet</p>' : ''}
            </div>
          </div>
        </div>

        <!-- Property Portfolio -->
        <div class="expandable-section">
          <div class="section-header" onclick="toggleSection(this)">
            <h3>🏠 Property Portfolio</h3>
            <span class="toggle-icon">▼</span>
          </div>
          <div class="section-content">
            <div class="compact-summary-cards">
              <div class="compact-card teal">
                <div class="compact-icon">🏘️</div>
                <div class="compact-content">
                  <div class="compact-value">${properties.length}</div>
                  <div class="compact-label">Properties</div>
                  <div class="compact-subtext">Value: $${safe(totalValue)}</div>
                </div>
              </div>
              
              <div class="compact-card gold">
                <div class="compact-icon">👥</div>
                <div class="compact-content">
                  <div class="compact-value">${tenants.length}</div>
                  <div class="compact-label">Tenants</div>
                  <div class="compact-subtext">Rent: $${safe(totalRent)}/mo</div>
                </div>
              </div>
              
              <div class="compact-card ${avgROI > 5 ? 'green' : 'orange'}">
                <div class="compact-icon">📊</div>
                <div class="compact-content">
                  <div class="compact-value">${avgROI}%</div>
                  <div class="compact-label">Avg ROI</div>
                  <div class="compact-subtext">Property Returns</div>
                </div>
              </div>
              
              <div class="compact-card ${netPropertyWorth >= 0 ? 'blue' : 'red'}">
                <div class="compact-icon">💎</div>
                <div class="compact-content">
                  <div class="compact-value">$${safe(netPropertyWorth)}</div>
                  <div class="compact-label">Equity</div>
                  <div class="compact-subtext">Loans: $${safe(totalLoan)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loan Payoff Progress -->
        ${loanProgress.length > 0 ? `
          <div class="expandable-section">
            <div class="section-header" onclick="toggleSection(this)">
              <h3>💳 Loan Payoff Progress</h3>
              <span class="toggle-icon">▼</span>
            </div>
            <div class="section-content">
              <div class="budgets-grid">
                ${loanProgress.map(loan => `
                  <div class="budget-progress">
                    <div class="progress-header">
                      <span>${loan.icon} ${escapeHtml(loan.name)}</span>
                      <span>$${safe(loan.current)} left of $${safe(loan.original)}</span>
                    </div>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${loan.percent}%"></div>
                    </div>
                    <div class="progress-status ${loan.isPaidOff ? 'on-track' : ''}">
                      ${loan.isPaidOff ? '✅ Paid Off' : `${loan.percent.toFixed(1)}% paid off${loan.estPayoffDate ? ` · est. payoff ${loan.estPayoffDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}`}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Budget Performance Section -->
        <div class="expandable-section">
          <div class="section-header" onclick="toggleSection(this)">
            <h3>🎯 Budget Performance</h3>
            <span class="toggle-icon">▼</span>
          </div>
          <div class="section-content">
            <div class="budgets-grid">
              ${budgets.map(budget => {
                const spent = Math.abs(transactions
                  .filter(t => t.categoryId === budget.categoryId && t.date?.startsWith(currentMonth))
                  .reduce((sum, t) => sum + t.amount, 0));
                const percentage = (spent / budget.amount) * 100;
                const budgetCategory = categories.find(c => c.id === budget.categoryId);
                const budgetLabel = budget.name || budgetCategory?.name || 'Unknown';
                
                return `
                  <div class="budget-progress">
                    <div class="progress-header">
                      <span>${escapeHtml(budgetLabel)}</span>
                      <span>$${safe(spent)} / $${safe(budget.amount)}</span>
                    </div>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                    <div class="progress-status ${spent > budget.amount ? 'over-budget' : 'on-track'}">
                      ${spent > budget.amount ? '❌ Over Budget' : '✅ On Track'}
                    </div>
                  </div>
                `;
              }).join('')}
              ${budgets.length === 0 ? '<p class="no-data">No budgets configured</p>' : ''}
            </div>
          </div>
        </div>

        <!-- Bills & Recurring -->
        <div class="expandable-section">
          <div class="section-header" onclick="toggleSection(this)">
            <h3>🧾 Bills & Recurring</h3>
            <span class="toggle-icon">▼</span>
          </div>
          <div class="section-content">
            <h4 style="margin: 0 0 8px;">Upcoming Bills</h4>
            <div class="recent-activity">
              ${[...overdueBills, ...dueSoonBills].slice(0, 5).map(bill => {
                const isOverdue = new Date(bill.dueDate) < new Date(new Date().toDateString());
                return `
                  <div class="activity-item">
                    <span class="activity-icon">${isOverdue ? '⚠️' : '📄'}</span>
                    <div class="activity-details">
                      <div class="activity-desc">${escapeHtml(bill.name)}</div>
                      <div class="activity-date">${isOverdue ? 'Overdue: ' : 'Due: '}${new Date(bill.dueDate).toLocaleDateString()}</div>
                    </div>
                    <span class="activity-amount negative">-$${safe(bill.amount)}</span>
                  </div>
                `;
              }).join('')}
              ${(overdueBills.length + dueSoonBills.length) === 0 ? '<p class="no-data">No bills due soon</p>' : ''}
            </div>
            <div style="text-align: right; margin: 4px 0 16px;"><a href="#bills">View all bills →</a></div>

            <h4 style="margin: 0 0 8px;">Upcoming Recurring Transactions</h4>
            <div class="recent-activity">
              ${upcomingRecurring.slice(0, 5).map(rec => `
                <div class="activity-item">
                  <span class="activity-icon">${rec.type === 'income' ? '💹' : '🔁'}</span>
                  <div class="activity-details">
                    <div class="activity-desc">${escapeHtml(rec.name)}</div>
                    <div class="activity-date">Next: ${rec.nextDate.toLocaleDateString()} · ${escapeHtml(rec.frequency || '')}</div>
                  </div>
                  <span class="activity-amount ${rec.type === 'income' ? 'positive' : 'negative'}">
                    ${rec.type === 'income' ? '+' : '-'}$${safe(rec.amount)}
                  </span>
                </div>
              `).join('')}
              ${upcomingRecurring.length === 0 ? '<p class="no-data">No recurring transactions due in the next 30 days</p>' : ''}
            </div>
            <div style="text-align: right; margin-top: 4px;"><a href="#recurring">View all recurring →</a></div>
          </div>
        </div>

        <!-- Top Spending Categories -->
        <div class="expandable-section">
          <div class="section-header" onclick="toggleSection(this)">
            <h3>🏆 Top Spending Categories This Month</h3>
            <span class="toggle-icon">▼</span>
          </div>
          <div class="section-content">
            <div class="recent-activity">
              ${topCategories.map(cat => `
                <div class="activity-item">
                  <span class="activity-icon">${cat.icon}</span>
                  <div class="activity-details">
                    <div class="activity-desc">${escapeHtml(cat.name)}</div>
                    <div class="activity-date">${cat.percent.toFixed(1)}% of this month's spending</div>
                  </div>
                  <span class="activity-amount negative">-$${safe(cat.amount)}</span>
                </div>
              `).join('')}
              ${topCategories.length === 0 ? '<p class="no-data">No expenses recorded this month</p>' : ''}
            </div>
          </div>
        </div>

        <!-- Quick Stats Grid -->
        <div class="section-card">
          <h3>⚡ Quick Stats</h3>
          <div class="stats-grid">
            <div class="stat-item positive">
              <span class="stat-icon">💰</span>
              <div class="stat-content">
                <span class="stat-value">$${safe(income)}</span>
                <span class="stat-label">Total Income</span>
              </div>
            </div>
            <div class="stat-item negative">
              <span class="stat-icon">💸</span>
              <div class="stat-content">
                <span class="stat-value">$${safe(expenses)}</span>
                <span class="stat-label">Total Expenses</span>
              </div>
            </div>
            <div class="stat-item positive">
              <span class="stat-icon">💳</span>
              <div class="stat-content">
                <span class="stat-value">$${safe(totalCashBalance)}</span>
                <span class="stat-label">Cash Balance</span>
              </div>
            </div>
            <div class="stat-item negative">
              <span class="stat-icon">🏦</span>
              <div class="stat-content">
                <span class="stat-value">$${safe(totalCreditBalance)}</span>
                <span class="stat-label">Credit Balance</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="charts-container">
          <div class="section-card">
            <div class="chart-header">
              <h4>📅 Monthly Overview</h4>
              <select id="monthSelect" class="form-select">
                ${uniqueMonths.map(m => `<option value="${m}" ${m === latestMonth ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
            <canvas id="summaryChart" height="200"></canvas>
          </div>

          <div class="section-card">
            <div class="chart-header">
              <h4>📊 Expense Categories</h4>
              <span id="selectedMonthDisplay" class="month-badge">${latestMonth}</span>
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

          <div class="section-card full-width">
            <div class="chart-header">
              <h4>💎 Net Worth Trend (Last 6 Months)</h4>
            </div>
            <canvas id="netWorthChart" height="220"></canvas>
            <p class="no-data" style="font-size: 0.8rem; margin-top: 4px;">Property and loan equity are held at today's values across this trend — only cash movement is historical.</p>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="section-card">
          <div class="transactions-header">
            <h3>📝 Recent Activity</h3>
            <span class="transactions-count">Last ${Math.min(getRecentActivity(transactions, bills, maintenance).length, 5)} activities</span>
          </div>
          <div class="recent-activity">
            ${getRecentActivity(transactions, bills, maintenance).slice(0, 5).map(item => `
              <div class="activity-item">
                <span class="activity-icon">${item.icon}</span>
                <div class="activity-details">
                  <div class="activity-desc">${escapeHtml(item.description)}</div>
                  <div class="activity-date">${item.date}</div>
                </div>
                <span class="activity-amount ${item.amount < 0 ? 'negative' : 'positive'}">
                  ${item.amount < 0 ? '-' : '+'}$${Math.abs(item.amount).toFixed(2)}
                </span>
              </div>
            `).join('')}
            ${getRecentActivity(transactions, bills, maintenance).length === 0 ? `
              <div class="empty-state">
                <p>No recent activity found</p>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

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
        monthly[key].net = monthly[key].income + monthly[key].expense;
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

    // Net Worth Trend Chart (Line)
    function renderNetWorthChart() {
      if (netWorthChart) {
        netWorthChart.destroy();
        netWorthChart = null;
      }

      const nwCtx = document.getElementById('netWorthChart');
      if (nwCtx && netWorthTrend.length > 0) {
        netWorthChart = new Chart(nwCtx, {
          type: 'line',
          data: {
            labels: netWorthTrend.map(p => formatMonthLabel(p.month)),
            datasets: [{
              label: 'Net Worth',
              data: netWorthTrend.map(p => p.netWorth),
              borderColor: '#9b59b6',
              backgroundColor: 'rgba(155, 89, 182, 0.1)',
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => `Net Worth: $${ctx.parsed.y.toFixed(2)}`
                }
              }
            },
            scales: {
              y: { ticks: { callback: (value) => '$' + value } }
            }
          }
        });
      } else if (nwCtx) {
        nwCtx.parentElement.innerHTML += '<p class="no-data">No net worth trend data available</p>';
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
    renderNetWorthChart();

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
    const spent = Math.abs(transactions
      .filter(t => t.categoryId === budget.categoryId && t.date?.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0));
    
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

function getAccountTypeIcon(type) {
  const icons = { bank: '🏛️', savings: '🐷', cash: '💵', offset: '⚖️', credit: '💳' };
  return icons[type] || '🏦';
}

function getBillAlerts(bills, daysAhead = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + daysAhead);

  const unpaid = (bills || []).filter(b => !b.paid);
  const overdueBills = unpaid
    .filter(b => new Date(b.dueDate) < today)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const dueSoonBills = unpaid
    .filter(b => {
      const d = new Date(b.dueDate);
      return d >= today && d <= horizon;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return { overdueBills, dueSoonBills };
}

function getNextOccurrence(dateStr, frequency) {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let guard = 0;
  while (d < today && guard < 1000) {
    switch (frequency) {
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'fortnightly': d.setDate(d.getDate() + 14); break;
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'quarterly': d.setMonth(d.getMonth() + 3); break;
      case 'annually': d.setFullYear(d.getFullYear() + 1); break;
      default: return d; // one-off / unrecognized frequency, don't loop forever
    }
    guard++;
  }
  return d;
}

function getUpcomingRecurring(recurringTx, daysAhead = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + daysAhead);

  return (recurringTx || [])
    .filter(r => r.startDate)
    .map(r => ({ ...r, nextDate: getNextOccurrence(r.startDate, r.frequency) }))
    .filter(r => r.nextDate >= today && r.nextDate <= horizon)
    .sort((a, b) => a.nextDate - b.nextDate);
}

function getTopSpendingCategories(transactions, categories, currentMonth, limit = 5) {
  const totals = {};
  transactions
    .filter(t => t.type === 'expense' && t.date?.startsWith(currentMonth))
    .forEach(t => {
      const key = t.categoryId || 'uncategorized';
      totals[key] = (totals[key] || 0) + Math.abs(t.amount);
    });

  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  return Object.entries(totals)
    .map(([categoryId, amount]) => ({
      name: categories.find(c => c.id === categoryId)?.name || 'Uncategorized',
      icon: categories.find(c => c.id === categoryId)?.icon || '🏷️',
      amount,
      percent: grandTotal > 0 ? (amount / grandTotal) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

function getLoanProgressList(loans) {
  return (loans || []).map(loan => {
    const original = parseFloat(loan.originalAmount) || 0;
    const current = parseFloat(loan.currentBalance) || 0;
    const percent = original > 0 ? Math.min(Math.max(((original - current) / original) * 100, 0), 100) : 0;

    let estPayoffDate = null;
    if (loan.startDate && loan.termMonths) {
      estPayoffDate = new Date(loan.startDate);
      estPayoffDate.setMonth(estPayoffDate.getMonth() + parseInt(loan.termMonths, 10));
    }

    return {
      name: loan.name || 'Loan',
      type: loan.type,
      icon: loan.icon || '🏦',
      original,
      current,
      percent,
      estPayoffDate,
      isPaidOff: current <= 0
    };
  }).sort((a, b) => b.current - a.current);
}

function getMonthOverMonthChange(transactions, currentMonth) {
  const [y, m] = currentMonth.split('-').map(Number);
  const prevDate = new Date(y, m - 2, 1); // m is 1-indexed; m-2 (0-indexed) is the prior month
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const prevIncome = transactions
    .filter(t => t.type === 'income' && t.date?.startsWith(prevMonth))
    .reduce((s, t) => s + t.amount, 0);
  const prevExpenses = transactions
    .filter(t => t.type === 'expense' && t.date?.startsWith(prevMonth))
    .reduce((s, t) => s + t.amount, 0);

  return {
    prevMonth,
    prevBalance: prevIncome + prevExpenses,
    hasPrevData: prevIncome !== 0 || prevExpenses !== 0
  };
}

function getNextTaxDeadline() {
  const now = new Date();
  const year = now.getFullYear();
  const deadlines = [
    { name: 'Quarterly BAS (Jan–Mar)', date: new Date(year, 3, 28) },
    { name: 'Income Tax Return', date: new Date(year, 9, 31) },
    { name: 'Land Tax Assessment', date: new Date(year, 5, 30) }
  ];

  // Roll any already-passed deadline forward a year so we always find "next".
  deadlines.forEach(d => {
    if (d.date < now) d.date = new Date(d.date.getFullYear() + 1, d.date.getMonth(), d.date.getDate());
  });
  deadlines.sort((a, b) => a.date - b.date);

  const next = deadlines[0];
  const daysUntil = Math.ceil((next.date - now) / (1000 * 60 * 60 * 24));
  return { name: next.name, date: next.date, daysUntil };
}

function getNetWorthTrendSeries(transactions, netPropertyWorth, currentCashBalance, months = 6) {
  // Builds a monthly net-worth approximation by walking the current cash
  // balance backward using each month's real net cash flow. Property value
  // and loan balances are held at their current levels across the series,
  // since this app doesn't keep historical property valuations - so this
  // trend mainly reflects real cash movement month to month, not
  // historical property appreciation.
  const today = new Date();
  const monthKeys = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const netByMonth = {};
  monthKeys.forEach(k => { netByMonth[k] = 0; });
  transactions.forEach(t => {
    if (!t.date) return;
    const key = t.date.slice(0, 7);
    if (key in netByMonth) netByMonth[key] += t.amount;
  });

  let runningCash = currentCashBalance;
  const cashAtMonthEnd = {};
  for (let i = monthKeys.length - 1; i >= 0; i--) {
    cashAtMonthEnd[monthKeys[i]] = runningCash;
    runningCash -= netByMonth[monthKeys[i]];
  }

  return monthKeys.map(k => ({
    month: k,
    netWorth: cashAtMonthEnd[k] + netPropertyWorth
  }));
}

function getRecentActivity(transactions, bills, maintenance) {
  const activities = [];
  
  // Recent transactions
  if (transactions && transactions.length > 0) {
    transactions.slice(-10).forEach(t => {
      activities.push({
        icon: t.type === 'income' ? '💹' : '💸',
        description: `${t.type === 'income' ? 'Income' : 'Expense'}: ${t.description || 'Transaction'}`,
        amount: t.amount,
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
  const n = isNaN(num) || num == null ? 0 : parseFloat(num);
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Cleanup function to stop auto-refresh when leaving dashboard
export function cleanupDashboard() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}