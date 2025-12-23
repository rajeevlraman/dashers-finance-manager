import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES } from './db.js';

// Default demo accounts
const DEFAULT_ACCOUNTS = [
  { id: 'bank1', name: 'Main Checking', type: 'bank', balance: 12450.75, currency: 'AUD' },
  { id: 'bank2', name: 'Savings Account', type: 'savings', balance: 25430.25, currency: 'AUD' },
  { id: 'credit1', name: 'Visa Credit Card', type: 'credit', balance: -1245.50, currency: 'AUD', creditLimit: 5000 },
  { id: 'credit2', name: 'MasterCard', type: 'credit', balance: -987.25, currency: 'AUD', creditLimit: 3000 },
  { id: 'offset', name: 'Mortgage Offset', type: 'offset', balance: 30500.00, currency: 'AUD', linkedLoanId: '' }
];

let currentSelectedAccountId = null;

function generateId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const PRIMARY_ACCOUNT_KEY = 'primaryAccountId';

async function getPrimaryAccountId() {
  const meta = await getAllItems(STORE_NAMES.meta);
  const item = meta.find(m => m.key === PRIMARY_ACCOUNT_KEY);
  return item?.value || null;
}

async function setPrimaryAccountId(accountId) {
  const meta = await getAllItems(STORE_NAMES.meta);
  const existing = meta.find(m => m.key === PRIMARY_ACCOUNT_KEY);

  const payload = {
    id: existing?.id || generateId(),
    key: PRIMARY_ACCOUNT_KEY,
    value: accountId
  };

  if (existing) {
    await updateItem(STORE_NAMES.meta, payload);
  } else {
    await addItem(STORE_NAMES.meta, payload);
  }
}

// Helper functions
function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'AUD'
  }).format(amount);
}

function computeAccountSummary(accounts, transactions) {
  const assets = accounts.filter(a => a.type !== 'credit');
  const liabilities = accounts.filter(a => a.type === 'credit');

  const totalAssets = assets.reduce((s, a) => s + (a.balance || 0), 0);
  const totalLiabilities = liabilities.reduce(
    (s, a) => s + Math.abs(a.balance || 0), 0
  );

  const netWorth = totalAssets - totalLiabilities;

  const cashAccounts = accounts.filter(acc =>
    ['bank', 'savings', 'cash', 'offset'].includes(acc.type)
  ).length;

  const totalCreditLimit = liabilities.reduce(
    (s, a) => s + (a.creditLimit || 0), 0
  );

  const usedCredit = liabilities.reduce(
    (s, a) => s + Math.abs(a.balance || 0), 0
  );

  const availableCredit = Math.max(totalCreditLimit - usedCredit, 0);
  
  // Calculate credit utilization percentage
  const creditUtilization = totalCreditLimit > 0 ? (usedCredit / totalCreditLimit) * 100 : 0;

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    cashAccounts,
    creditCards: liabilities.length,
    totalCreditLimit,
    availableCredit,
    creditUtilization
  };
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

function getAccountIcon(type) {
  const icons = {
    bank: '🏦',
    credit: '💳',
    cash: '💵',
    savings: '💰',
    investment: '📈',
    offset: '⚖️',
    other: '📁'
  };
  return icons[type] || '📁';
}

function getAccountTypeLabel(type) {
  const labels = {
    bank: 'Bank Account',
    credit: 'Credit Card',
    cash: 'Cash',
    savings: 'Savings',
    investment: 'Investment',
    offset: 'Offset Account',
    other: 'Other'
  };
  return labels[type] || 'Account';
}

// Add default accounts
async function addDefaultAccounts() {
  console.log('📦 Adding default accounts...');
  const existing = await getAllItems(STORE_NAMES.accounts);
  const existingIds = existing.map(a => a.id);

  let added = 0;
  for (const acc of DEFAULT_ACCOUNTS) {
    if (!existingIds.includes(acc.id)) {
      await addItem(STORE_NAMES.accounts, {
        ...acc,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      added++;
    }
  }

  console.log(`✅ Added ${added} default accounts`);
  initAccountsUI();
}

// Calculate account balance from transactions
function calculateAccountBalance(account, transactions) {
  const tx = transactions.filter(t => t.accountId === account.id);
  if (!tx.length) return account.balance || 0;
  return tx.reduce((sum, t) => sum + t.amount, 0);
}

// Calculate monthly spending for an account
function calculateMonthlySpending(accountId, transactions) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return transactions
    .filter(t => t.accountId === accountId && 
           new Date(t.date) >= startOfMonth && 
           t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

// Update selected account card (left panel)
async function updateSelectedAccountCard(accountId = null) {
  const [accounts, transactions, loans] = await Promise.all([
    getAllItems(STORE_NAMES.accounts),
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.loans)
  ]);
  
  // Determine which account to show
  let selectedAccount = null;
  
  if (accountId) {
    selectedAccount = accounts.find(a => a.id === accountId);
    currentSelectedAccountId = accountId;
  } else if (currentSelectedAccountId) {
    selectedAccount = accounts.find(a => a.id === currentSelectedAccountId);
  } else if (accounts.length > 0) {
    selectedAccount = accounts[0];
    currentSelectedAccountId = accounts[0].id;
  }
  
  if (!selectedAccount) {
    // Show empty state
    document.getElementById('selectedAccountCard').innerHTML = `
      <div class="empty-selected">
        <p>No account selected</p>
        <small>Click on an account to view details</small>
      </div>
    `;
    return;
  }
  
  const derivedBalance = calculateAccountBalance(selectedAccount, transactions);
  const monthlySpending = calculateMonthlySpending(selectedAccount.id, transactions);
  const monthlyBudget = selectedAccount.type === 'credit' ? 
    (selectedAccount.creditLimit || 3000) : 3000;
  
  const spendingPercentage = Math.min((monthlySpending / monthlyBudget) * 100, 100);
  
  // Find linked loan name
  let linkedLoanName = '';
  if (selectedAccount.type === 'offset' && selectedAccount.linkedLoanId) {
    const linkedLoan = loans.find(l => l.id === selectedAccount.linkedLoanId);
    linkedLoanName = linkedLoan ? linkedLoan.name : 'Unknown Loan';
  }
  
  // Generate card details based on account type
  let cardDetails = '';
  if (selectedAccount.type === 'credit') {
    const availableCredit = (selectedAccount.creditLimit || 0) + derivedBalance;
    cardDetails = `
      <div class="detail-item">
        <span>Available Credit</span>
        <strong>${formatCurrency(availableCredit, selectedAccount.currency)}</strong>
      </div>
      <div class="detail-item">
        <span>Total Limit</span>
        <strong>${formatCurrency(selectedAccount.creditLimit || 0, selectedAccount.currency)}</strong>
      </div>
      <div class="detail-item">
        <span>Due Date</span>
        <strong>${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong>
      </div>
      <div class="detail-item">
        <span>Status</span>
        <strong class="status-active">Active</strong>
      </div>
    `;
  } else {
    cardDetails = `
      <div class="detail-item">
        <span>Daily Limit</span>
        <strong>${formatCurrency(2500, selectedAccount.currency)}</strong>
      </div>
      <div class="detail-item">
        <span>Last Transaction</span>
        <strong>Today</strong>
      </div>
      <div class="detail-item">
        <span>Account Type</span>
        <strong>${getAccountTypeLabel(selectedAccount.type)}</strong>
      </div>
      <div class="detail-item">
        <span>Status</span>
        <strong class="status-active">Active</strong>
      </div>
    `;
  }
  
  // Update the card
  document.getElementById('selectedAccountCard').innerHTML = `
    <div class="selected-account-header">
      <h3>Selected Account</h3>
      <div class="account-balance-large">${formatCurrency(derivedBalance, selectedAccount.currency)}</div>
    </div>
    
    <div class="spending-progress">
      <div class="progress-header">
        <span>Monthly Spending</span>
        <span>${formatCurrency(monthlySpending, selectedAccount.currency)} / ${formatCurrency(monthlyBudget, selectedAccount.currency)}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${spendingPercentage}%"></div>
      </div>
      <small>${spendingPercentage.toFixed(1)}% of monthly budget</small>
    </div>
    
    <div class="bank-card-style ${selectedAccount.type}">
      <div class="bank-card-header">
        <div class="bank-logo">${getAccountIcon(selectedAccount.type)}</div>
        <div class="bank-info">
          <h4>${selectedAccount.name}</h4>
          <p>${selectedAccount.type === 'credit' ? '**** 4832 • Exp 12/28' : '•••• •••• •••• 4832'}</p>
        </div>
      </div>
      <div class="bank-card-details">
        ${cardDetails}
      </div>
      ${linkedLoanName ? `<div class="linked-loan-notice">Linked to: ${linkedLoanName}</div>` : ''}
    </div>
    
    <div class="selected-account-actions">
      <button class="btn btn-primary" onclick="quickAddTransaction('${selectedAccount.id}')">
        💸 Add Transaction
      </button>
      <button class="btn btn-secondary" onclick="openAccountEditor('${selectedAccount.id}')">
        ✏️ Edit Account
      </button>
    </div>
  `;
}

// Update recent transactions in right panel
async function updateRecentTransactions() {
  const [transactions, accounts] = await Promise.all([
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.accounts)
  ]);
  
  const recent = transactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);
  
  const container = document.getElementById('recentTransactions');
  if (!container) return;
  
  if (recent.length === 0) {
    container.innerHTML = `
      <div class="empty-transactions">
        <p>No recent transactions</p>
        <small>Add your first transaction</small>
      </div>
    `;
    return;
  }
  
  // Create account name mapping
  const accountMap = {};
  accounts.forEach(acc => {
    accountMap[acc.id] = acc.name;
  });
  
  container.innerHTML = recent.map(t => {
    const accountName = accountMap[t.accountId] || 'Unknown Account';
    return `
      <div class="transaction-item">
        <div class="transaction-icon ${t.amount < 0 ? 'expense' : 'income'}">
          ${t.amount < 0 ? '↓' : '↑'}
        </div>
        <div class="transaction-info">
          <strong>${t.description || 'No description'}</strong>
          <small>${accountName} • ${formatDate(new Date(t.date))}</small>
        </div>
        <div class="transaction-amount ${t.amount < 0 ? 'negative' : 'positive'}">
          ${formatCurrency(t.amount, 'AUD')}
        </div>
      </div>
    `;
  }).join('');
}

// Update insights panel
function updateInsightsPanel(summary, accounts, transactions) {
  const container = document.getElementById('accountsInsights');
  if (!container) return;
  
  // Calculate additional metrics
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const monthlyIncome = transactions
    .filter(t => t.amount > 0 && new Date(t.date) >= startOfMonth)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlyExpenses = Math.abs(transactions
    .filter(t => t.amount < 0 && new Date(t.date) >= startOfMonth)
    .reduce((sum, t) => sum + t.amount, 0));
  
  const cashFlow = monthlyIncome - monthlyExpenses;
  
  // Count upcoming bills (transactions in next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const upcomingBills = transactions
    .filter(t => {
      const tDate = new Date(t.date);
      return t.amount < 0 && tDate > now && tDate <= nextWeek;
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  container.innerHTML = `
    <h3>Financial Insights</h3>
    
    <div class="insight-item">
      <span>Monthly Cash Flow</span>
      <strong class="${cashFlow >= 0 ? 'positive' : 'negative'}">
        ${formatCurrency(cashFlow, 'AUD')}
      </strong>
    </div>
    
    <div class="insight-item">
      <span>Average Daily Spend</span>
      <strong>${formatCurrency(monthlyExpenses / 30, 'AUD')}</strong>
    </div>
    
    <div class="insight-item">
      <span>Credit Utilization</span>
      <div class="insight-with-progress">
        <strong>${summary.creditUtilization.toFixed(1)}%</strong>
        <div class="mini-progress">
          <div class="mini-progress-fill" style="width: ${Math.min(summary.creditUtilization, 100)}%"></div>
        </div>
      </div>
    </div>
    
    <div class="insight-item">
      <span>Upcoming Bills (7 days)</span>
      <strong class="negative">${formatCurrency(upcomingBills, 'AUD')}</strong>
    </div>
    
    <div class="insight-item">
      <span>Accounts Overview</span>
      <strong>${accounts.length} accounts</strong>
    </div>
    
    <div class="insight-item">
      <span>Monthly Income</span>
      <strong class="positive">${formatCurrency(monthlyIncome, 'AUD')}</strong>
    </div>
  `;
}

// Update summary cards
function updateSummaryCards(accounts, transactions) {
  const summary = computeAccountSummary(accounts, transactions);
  
  // Update the summary cards
  const cards = document.querySelectorAll('.summary-card.wide-card');
  if (cards.length >= 4) {
    cards[0].querySelector('.summary-amount').textContent = formatCurrency(summary.netWorth, 'AUD');
    cards[0].querySelector('small').textContent = summary.netWorth >= 0 ? '↑ Positive growth' : '↓ Needs attention';
    
    cards[1].querySelector('.summary-amount').textContent = formatCurrency(summary.totalAssets, 'AUD');
    cards[1].querySelector('small').textContent = `Across ${accounts.length} accounts`;
    
    cards[2].querySelector('.summary-amount').textContent = formatCurrency(summary.totalLiabilities, 'AUD');
    cards[2].querySelector('small').textContent = 'Credit & Loans';
    
    cards[3].querySelector('.summary-amount').textContent = formatCurrency(summary.availableCredit, 'AUD');
    cards[3].querySelector('small').textContent = `${summary.creditUtilization.toFixed(1)}% of limit used`;
  }
  
  return summary;
}

function quickAddTransaction(accountId) {
  const amount = prompt('Enter transaction amount (negative for expenses):');
  if (amount === null) return;
  
  const description = prompt('Enter description:');
  if (description === null) return;

  const transaction = {
    id: generateId(),
    accountId: accountId,
    amount: parseFloat(amount),
    description: description,
    date: new Date().toISOString().split('T')[0],
    type: parseFloat(amount) < 0 ? 'expense' : 'income',
    categoryId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  addItem(STORE_NAMES.transactions, transaction).then(() => {
    alert('Transaction added successfully!');
    refreshAccountList();
  });
}

function toggleAccountDetails(accountId) {
  const details = document.getElementById(`details-${accountId}`);
  const container = document.getElementById(`recent-${accountId}`);

  const isOpening = details.style.display === "none";

  details.style.display = isOpening ? "block" : "none";

  if (!isOpening) return;

  // Load last 5 transactions for this account
  getAllItems(STORE_NAMES.transactions).then(allTx => {
    const tx = allTx
      .filter(t => t.accountId === accountId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    if (tx.length === 0) {
      container.innerHTML = `<p class="rt-none">No transactions yet.</p>`;
      return;
    }

    container.innerHTML = tx
      .map(t => `
        <div class="rt-item">
          <span class="rt-date">${formatDate(new Date(t.date))}</span>
          <span class="rt-desc">${t.description || 'No description'}</span>
          <span class="rt-amt ${t.amount < 0 ? 'neg' : 'pos'}">
            ${formatCurrency(t.amount, 'AUD')}
          </span>
        </div>
      `)
      .join('');
  });
}

export function initAccountsUI() {
  const main = document.getElementById('mainContent');
  main.classList.add('page-transition');

  main.innerHTML = `
    <div class="page-container">
      <!-- DASHBOARD HEADER -->
      <div class="dashboard-header">
        <div class="header-top">
          <h2>🏦 Accounts Dashboard</h2>
          <div class="header-actions">
            <div class="header-filters">
              <input type="text" id="accountSearch" class="search-input" placeholder="🔍 Search accounts...">
              <select id="accountTypeFilter" class="filter-select">
                <option value="all">All Types</option>
                <option value="bank">🏦 Bank</option>
                <option value="credit">💳 Credit</option>
                <option value="savings">💰 Savings</option>
                <option value="investment">📈 Investment</option>
                <option value="offset">⚖️ Offset</option>
                <option value="cash">💵 Cash</option>
                <option value="other">📁 Other</option>
              </select>
            </div>
            <button id="btnNewAcc" class="btn btn-primary">➕ New Account</button>
            <button id="btnAddDefaults" class="btn btn-secondary">📦 Defaults</button>
          </div>
        </div>
        
      <div class="summary-cards">

        <div class="card green">
          <h3>Net Worth</h3>
          <p class="summary-amount positive">A$834,066.73</p>
          <small>Positive growth</small>
        </div>

        <div class="card blue">
          <h3>Total Assets</h3>
          <p class="summary-amount">A$835,710.24</p>
          <small>Across 6 accounts</small>
        </div>

        <div class="card red">
          <h3>Liabilities</h3>
          <p class="summary-amount negative">A$1,643.51</p>
          <small>Credit & Loans</small>
        </div>

        <div class="card teal">
          <h3>Available Credit</h3>
          <p class="summary-amount">A$456.49</p>
          <small>78.3% of limit used</small>
        </div>

      </div>

      
      <!-- 3-COLUMN MAIN DASHBOARD -->
      <div class="dashboard-grid">
        <!-- LEFT: SELECTED ACCOUNT -->
        <div class="dashboard-left">
          <div class="selected-account-container" id="selectedAccountCard">
            <div class="empty-selected">
              <p>Select an account</p>
              <small>Click on any account to view details</small>
            </div>
          </div>
        </div>
        
        <!-- MIDDLE: ACCOUNTS ACCORDION -->
        <div class="dashboard-middle">
          <div class="section-title">
            <h3>All Accounts</h3>
            <span class="count-badge" id="accountCount">0 accounts</span>
          </div>
          
          <div id="accList" class="accounts-accordion">
            Loading accounts...
          </div>
        </div>
        
        <!-- RIGHT: INSIGHTS & TRANSACTIONS -->
        <div class="dashboard-right">
          <div class="insights-card" id="accountsInsights">
            <h3>Financial Insights</h3>
            <p class="text-muted">Loading insights...</p>
          </div>
          
          <!-- In your dashboard-right section, replace the transactions section with: -->
<div class="dashboard-right">
    <!-- Insights panel (keeps existing flat style) -->
    <div class="insights-card" id="accountsInsights">
        <h3>Financial Insights</h3>
        <!-- Insights items rendered by JavaScript -->
    </div>
    
    <!-- Recent Transactions as a flat list card -->
    <div class="transactions-history">
        <div class="section-title">
            <h3>Recent Transactions</h3>
            <button class="btn-text" id="btnViewAll">View All</button>
        </div>
        
        <div class="transaction-list" id="recentTransactions">
            <!-- Example transaction items (these would be generated by JS) -->
            <div class="transaction-item">
                <div class="transaction-icon expense">↓</div>
                <div class="transaction-info">
                    <strong>Amazon Purchase</strong>
                    <small>Main Checking • Today</small>
                </div>
                <div class="transaction-amount negative">-A$89.99</div>
            </div>
            
            <div class="transaction-item">
                <div class="transaction-icon income">↑</div>
                <div class="transaction-info">
                    <strong>Salary Deposit</strong>
                    <small>Savings Account • Jan 15</small>
                </div>
                <div class="transaction-amount positive">+A$3,500.00</div>
            </div>
            
            <div class="transaction-item">
                <div class="transaction-icon expense">↓</div>
                <div class="transaction-info">
                    <strong>Groceries Supermarket</strong>
                    <small>Credit Card • Jan 14</small>
                </div>
                <div class="transaction-amount negative">-A$145.67</div>
            </div>
        </div>
    </div>
</div>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => main.classList.remove('page-transition'), 400);

  // Event listeners
  document.getElementById('btnNewAcc').addEventListener('click', () => openAccountEditor());
  document.getElementById('btnAddDefaults').addEventListener('click', addDefaultAccounts);
  document.getElementById('btnViewAll').addEventListener('click', () => {
    // Navigate to transactions page
    window.location.hash = '#transactions';
  });

  document.getElementById('accountSearch').addEventListener('input', refreshAccountList);
  document.getElementById('accountTypeFilter').addEventListener('change', refreshAccountList);

  // Initial load
  refreshAccountList();
}

function refreshAccountList() {
  Promise.all([
    getAllItems(STORE_NAMES.accounts),
    getAllItems(STORE_NAMES.loans),
    getAllItems(STORE_NAMES.transactions)
  ]).then(([accounts, loans, transactions]) => {
    
    const listEl = document.getElementById('accList');
    const searchTerm = document.getElementById('accountSearch').value.toLowerCase();
    const typeFilter = document.getElementById('accountTypeFilter').value;
    const summary = computeAccountSummary(accounts, transactions);
    
    // Update account count
    document.getElementById('accountCount').textContent = `${accounts.length} account${accounts.length !== 1 ? 's' : ''}`;
    
    if (!accounts.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>No accounts yet.</p>
          <button class="btn btn-primary" id="btnAddDefaultsEmpty">📦 Add Default Accounts</button>
        </div>
      `;
      document.getElementById('btnAddDefaultsEmpty').addEventListener('click', addDefaultAccounts);
      updateSummaryCards(accounts, transactions);
      updateSelectedAccountCard();
      updateRecentTransactions();
      updateInsightsPanel(summary, accounts, transactions);
      return;
    }
    
    // Filter accounts
    const filteredAccounts = accounts.filter(account => {
      const matchesSearch = account.name.toLowerCase().includes(searchTerm);
      const matchesType = typeFilter === 'all' || account.type === typeFilter;
      return matchesSearch && matchesType;
    });
    
    // Update all dashboard sections
    updateSummaryCards(accounts, transactions);
    updateInsightsPanel(summary, accounts, transactions);
    updateRecentTransactions();
    
    // Auto-select first account if none selected
    if (!currentSelectedAccountId && filteredAccounts.length > 0) {
      updateSelectedAccountCard(filteredAccounts[0].id);
    } else {
      updateSelectedAccountCard();
    }
    
    if (filteredAccounts.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>No accounts match your search criteria.</p>
          <button class="btn btn-secondary" onclick="document.getElementById('accountSearch').value=''; document.getElementById('accountTypeFilter').value='all'; refreshAccountList();">
            Clear Filters
          </button>
        </div>
      `;
      return;
    }
    
    // Create loan map
    const loanMap = {};
    loans.forEach(loan => {
      loanMap[loan.id] = loan.name;
    });
    
    listEl.innerHTML = filteredAccounts.map(account => {
      const derivedBalance = calculateAccountBalance(account, transactions);
      const isNegative = derivedBalance < 0;
      const isCredit = account.type === 'credit';
      const balanceClass = isNegative ? 'negative' : 'positive';
      const icon = getAccountIcon(account.type);
      
      // Account activity
      const accountTransactions = transactions.filter(t => t.accountId === account.id);
      const lastTransaction = accountTransactions.length > 0 
        ? new Date(Math.max(...accountTransactions.map(t => new Date(t.date))))
        : null;
      
      const daysSinceActivity = lastTransaction 
        ? Math.floor((new Date() - lastTransaction) / (1000 * 60 * 60 * 24))
        : null;
      
      // Linked loan info
      let linkedLoanInfo = '';
      if (account.type === 'offset' && account.linkedLoanId) {
        const loanName = loanMap[account.linkedLoanId] || 'Unknown Loan';
        linkedLoanInfo = `<div class="linked-loan">Linked to: ${loanName}</div>`;
      }
      
      // Credit utilization
      let creditUtilization = '';
      if (isCredit && account.creditLimit && account.creditLimit > 0) {
        const utilization = (Math.abs(derivedBalance) / account.creditLimit) * 100;
        creditUtilization = `
          <div class="credit-utilization">
            <div class="utilization-bar">
              <div class="utilization-fill" style="width: ${Math.min(utilization, 100)}%"></div>
            </div>
            <small>${utilization.toFixed(1)}% used</small>
          </div>
        `;
      }
      
      return `
        <div class="account-card ${account.type} ${account.id === currentSelectedAccountId ? 'selected' : ''}" 
             data-id="${account.id}" onclick="updateSelectedAccountCard('${account.id}')">
          
          <!-- HEADER -->
          <div class="account-header" data-id="${account.id}">
            <div class="account-left">
              <div class="account-icon">${icon}</div>
              <div class="account-info">
                <h4 class="account-name">${account.name}</h4>
                <p class="account-type">${getAccountTypeLabel(account.type)}</p>
                ${lastTransaction ? `
                  <small class="last-activity">
                    Last: ${daysSinceActivity === 0 ? 'Today' : `${daysSinceActivity} days ago`}
                  </small>
                ` : `<small class="last-activity">No transactions</small>`}
                ${linkedLoanInfo}
              </div>
            </div>
            
            <div class="account-right">
              <div class="account-balance ${balanceClass}">
                ${formatCurrency(derivedBalance, account.currency)}
              </div>
              <div class="account-chevron">▾</div>
            </div>
          </div>
          
          <!-- EXPANDED DETAILS -->
          <div id="details-${account.id}" class="account-details" style="display: none;">
            <div class="account-actions">
              <button class="btn btn-secondary" data-id="${account.id}" data-action="edit">✏️ Edit</button>
              <button class="btn btn-danger" data-id="${account.id}" data-action="delete">🗑️ Delete</button>
              <button class="btn btn-primary" data-id="${account.id}" data-action="quick-add">💸 Quick Add</button>
            </div>
            
            <div class="account-stats">
              <div class="stat">
                <span class="stat-label">Transactions</span>
                <span class="stat-value">${accountTransactions.length}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Last Activity</span>
                <span class="stat-value">${lastTransaction ? formatDate(lastTransaction) : 'Never'}</span>
              </div>
              ${isCredit && account.creditLimit ? `
                <div class="stat">
                  <span class="stat-label">Available Credit</span>
                  <span class="stat-value positive">
                    ${formatCurrency(account.creditLimit + derivedBalance, account.currency)}
                  </span>
                </div>
              ` : ''}
            </div>
            
            ${isCredit && account.creditLimit ? `
              <div class="credit-limit">
                Limit: ${formatCurrency(account.creditLimit, account.currency)}
              </div>
              ${creditUtilization}
            ` : ''}
            
            <div class="recent-transactions" id="recent-${account.id}">
              <p class="rt-title">Recent Transactions</p>
              <div class="rt-loading">Loading...</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Event listeners for accordion
    listEl.querySelectorAll('.account-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('button')) return; // Don't toggle if clicking a button
        
        const id = e.currentTarget.dataset.id;
        toggleAccountDetails(id);
      });
    });
    
    listEl.querySelectorAll('.btn[data-action]').forEach(btn => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (action === 'edit') openAccountEditor(id);
        else if (action === 'delete') {
          if (confirm('Delete this account? This will also remove all associated transactions.')) {
            deleteItem(STORE_NAMES.accounts, id).then(refreshAccountList);
          }
        } else if (action === 'quick-add') {
          quickAddTransaction(id);
        }
      });
    });
  });
}

function openAccountEditor(id) {
  if (id) {
    getAllItems(STORE_NAMES.accounts).then(list => {
      const acc = list.find(x => x.id === id);
      showAccountForm(acc);
    });
  } else {
    showAccountForm({ name: '', type: 'bank', balance: 0, currency: 'AUD' });
  }
}

function showAccountForm(acc) {
  const main = document.getElementById('mainContent');
  main.classList.add('page-transition');

  getAllItems(STORE_NAMES.loans).then(loans => {
    const loanOptions = loans.map(loan => ` 
      <option value="${loan.id}" ${acc.linkedLoanId === loan.id ? 'selected' : ''}>
        ${loan.name}
      </option>
    `).join('');

    main.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h2>${acc.id ? '✏️ Edit' : '➕ New'} Account</h2>
        </div>

        <div class="section-card">
          <form id="accForm" class="styled-form">
            <div class="form-group">
              <label>Name</label>
              <input type="text" name="name" value="${acc.name}" class="form-input" required>
            </div>

            <div class="form-group">
              <label>Type</label>
              <select name="type" class="form-select" required>
                <option value="bank" ${acc.type === 'bank' ? 'selected' : ''}>🏦 Bank</option>
                <option value="credit" ${acc.type === 'credit' ? 'selected' : ''}>💳 Credit</option>
                <option value="cash" ${acc.type === 'cash' ? 'selected' : ''}>💵 Cash</option>
                <option value="investment" ${acc.type === 'investment' ? 'selected' : ''}>📈 Investment</option>
                <option value="savings" ${acc.type === 'savings' ? 'selected' : ''}>💰 Savings</option>
                <option value="offset" ${acc.type === 'offset' ? 'selected' : ''}>⚖️ Offset</option>
                <option value="other" ${acc.type === 'other' ? 'selected' : ''}>📁 Other</option>
              </select>
            </div>

            <div class="form-group">
              <label>Starting Balance</label>
              <input type="number" step="0.01" name="balance" value="${acc.balance}" class="form-input" required>
              <small class="form-hint">Use negative for owed balances.</small>
            </div>

            <div class="form-group">
              <label>Currency</label>
              <select name="currency" class="form-select" required>
                ${['AUD','USD','EUR','GBP','CAD'].map(cur => `
                  <option value="${cur}" ${acc.currency === cur ? 'selected' : ''}>${cur}</option>
                `).join('')}
              </select>
            </div>

            <div id="creditFields" class="form-group" style="display:${acc.type === 'credit' ? 'block' : 'none'};">
              <label>Credit Limit</label>
              <input type="number" step="0.01" name="creditLimit" value="${acc.creditLimit || 0}" class="form-input">
            </div>

            <div id="linkedLoan" class="form-group" style="display:${acc.type === 'offset' ? 'block' : 'none'};">
              <label>Linked Loan</label>
              <select name="linkedLoanId" class="form-select">
                <option value="">-- Select Loan --</option>
                ${loanOptions}
              </select>
              <small class="form-hint">Select the loan this account is linked to.</small>
            </div>

            <div class="form-actions">
              <button class="btn btn-primary" type="submit">${acc.id ? '💾 Update' : '➕ Add'} Account           </form>
        </div>
      </div>
    `;

    setTimeout(() => main.classList.remove('page-transition'), 400);

    document.querySelector('select[name="type"]').addEventListener('change', function() {
      document.getElementById('creditFields').style.display = this.value === 'credit' ? 'block' : 'none';
      document.getElementById('linkedLoan').style.display = this.value === 'offset' ? 'block' : 'none';
    });

    document.getElementById('btnCancel').addEventListener('click', initAccountsUI);

    document.getElementById('accForm').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      const data = new FormData(form);

      const newAcc = {
        id: acc.id || generateId(),
        name: data.get('name').trim(),
        type: data.get('type'),
        balance: parseFloat(data.get('balance')),
        currency: data.get('currency'),
        createdAt: acc.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (newAcc.type === 'credit') {
        newAcc.creditLimit = parseFloat(data.get('creditLimit')) || 0;
      }

      if (newAcc.type === 'offset') {
        newAcc.linkedLoanId = data.get('linkedLoanId') || '';
      }

      if (acc.id) {
        await updateItem(STORE_NAMES.accounts, newAcc);
      } else {
        await addItem(STORE_NAMES.accounts, newAcc);
      }

      initAccountsUI();
    });
  });
}

// ===== ENHANCED FEATURES =====

// 1. MONTHLY SPENDING CHART
async function renderMonthlySpendingChart(accountId) {
    const transactions = await getAllItems(STORE_NAMES.transactions);
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    
    // Filter transactions for the last 6 months
    const monthlyData = {};
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthlyData[monthKey] = 0;
    }
    
    transactions
        .filter(t => t.accountId === accountId && t.amount < 0)
        .forEach(t => {
            const date = new Date(t.date);
            if (date >= sixMonthsAgo) {
                const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                monthlyData[monthKey] = monthlyData[monthKey] + Math.abs(t.amount);
            }
        });
    
    // Create chart HTML
    const maxSpending = Math.max(...Object.values(monthlyData));
    const chartHTML = Object.entries(monthlyData).map(([month, amount]) => {
        const percentage = maxSpending > 0 ? (amount / maxSpending) * 100 : 0;
        return `
            <div class="chart-item">
                <div class="chart-label">${month}</div>
                <div class="chart-bar">
                    <div class="chart-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="chart-value">${formatCurrency(amount, 'AUD')}</div>
            </div>
        `;
    }).join('');
    
    return chartHTML;
}

// 2. QUICK STATS FOR SELECTED ACCOUNT
async function getAccountQuickStats(accountId) {
    const transactions = await getAllItems(STORE_NAMES.transactions);
    const accountTransactions = transactions.filter(t => t.accountId === accountId);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    
    const monthlyExpenses = accountTransactions
        .filter(t => t.amount < 0 && new Date(t.date) >= startOfMonth)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const weeklyExpenses = accountTransactions
        .filter(t => t.amount < 0 && new Date(t.date) >= startOfWeek)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const avgTransaction = accountTransactions.length > 0
        ? Math.abs(accountTransactions.reduce((sum, t) => sum + t.amount, 0)) / accountTransactions.length
        : 0;
    
    const largestExpense = accountTransactions.length > 0
        ? Math.min(...accountTransactions.filter(t => t.amount < 0).map(t => t.amount))
        : 0;
    
    return {
        monthlyExpenses,
        weeklyExpenses,
        avgTransaction,
        largestExpense: Math.abs(largestExpense),
        transactionCount: accountTransactions.length
    };
}

// 3. ENHANCED UPDATE SELECTED ACCOUNT CARD
async function updateSelectedAccountCardEnhanced(accountId = null) {
    const [accounts, transactions, loans] = await Promise.all([
        getAllItems(STORE_NAMES.accounts),
        getAllItems(STORE_NAMES.transactions),
        getAllItems(STORE_NAMES.loans)
    ]);
    
    let selectedAccount = null;
    
    if (accountId) {
        selectedAccount = accounts.find(a => a.id === accountId);
        currentSelectedAccountId = accountId;
    } else if (currentSelectedAccountId) {
        selectedAccount = accounts.find(a => a.id === currentSelectedAccountId);
    } else if (accounts.length > 0) {
        selectedAccount = accounts[0];
        currentSelectedAccountId = accounts[0].id;
    }
    
    if (!selectedAccount) {
        document.getElementById('selectedAccountCard').innerHTML = `
            <div class="empty-selected">
                <p>No account selected</p>
                <small>Click on any account to view details</small>
            </div>
        `;
        return;
    }
    
    const derivedBalance = calculateAccountBalance(selectedAccount, transactions);
    const monthlySpending = calculateMonthlySpending(selectedAccount.id, transactions);
    const monthlyBudget = selectedAccount.type === 'credit' ? 
        (selectedAccount.creditLimit || 3000) : 3000;
    
    const spendingPercentage = Math.min((monthlySpending / monthlyBudget) * 100, 100);
    
    // Get quick stats
    const stats = await getAccountQuickStats(selectedAccount.id);
    
    // Get spending chart
    const spendingChart = await renderMonthlySpendingChart(selectedAccount.id);
    
    // Find linked loan
    let linkedLoanName = '';
    if (selectedAccount.type === 'offset' && selectedAccount.linkedLoanId) {
        const linkedLoan = loans.find(l => l.id === selectedAccount.linkedLoanId);
        linkedLoanName = linkedLoan ? linkedLoan.name : 'Unknown Loan';
    }
    
    // Generate card details based on account type
    let cardDetails = '';
    if (selectedAccount.type === 'credit') {
        const availableCredit = (selectedAccount.creditLimit || 0) + derivedBalance;
        cardDetails = `
            <div class="detail-item">
                <span>Available Credit</span>
                <strong>${formatCurrency(availableCredit, selectedAccount.currency)}</strong>
            </div>
            <div class="detail-item">
                <span>Total Limit</span>
                <strong>${formatCurrency(selectedAccount.creditLimit || 0, selectedAccount.currency)}</strong>
            </div>
            <div class="detail-item">
                <span>Due Date</span>
                <strong>${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong>
            </div>
            <div class="detail-item">
                <span>Status</span>
                <strong class="status-active">Active</strong>
            </div>
        `;
    } else {
        cardDetails = `
            <div class="detail-item">
                <span>Daily Limit</span>
                <strong>${formatCurrency(2500, selectedAccount.currency)}</strong>
            </div>
            <div class="detail-item">
                <span>Last Transaction</span>
                <strong>${stats.transactionCount > 0 ? 'Today' : 'None'}</strong>
            </div>
            <div class="detail-item">
                <span>Account Type</span>
                <strong>${getAccountTypeLabel(selectedAccount.type)}</strong>
            </div>
            <div class="detail-item">
                <span>Status</span>
                <strong class="status-active">Active</strong>
            </div>
        `;
    }
    
    // Update the card with enhanced features
    document.getElementById('selectedAccountCard').innerHTML = `
        <div class="selected-account-header">
            <h3>Selected Account</h3>
            <div class="account-balance-large ${derivedBalance < 0 ? 'negative' : 'positive'}">
                ${formatCurrency(derivedBalance, selectedAccount.currency)}
            </div>
        </div>
        
        <!-- Quick Stats Row -->
        <div class="quick-stats">
            <div class="stat-badge">
                <span>Monthly</span>
                <strong>${formatCurrency(stats.monthlyExpenses, selectedAccount.currency)}</strong>
            </div>
            <div class="stat-badge">
                <span>Weekly</span>
                <strong>${formatCurrency(stats.weeklyExpenses, selectedAccount.currency)}</strong>
            </div>
            <div class="stat-badge">
                <span>Avg Tx</span>
                <strong>${formatCurrency(stats.avgTransaction, selectedAccount.currency)}</strong>
            </div>
            <div class="stat-badge">
                <span>Count</span>
                <strong>${stats.transactionCount}</strong>
            </div>
        </div>
        
        <div class="spending-progress">
            <div class="progress-header">
                <span>Monthly Spending</span>
                <span>${formatCurrency(monthlySpending, selectedAccount.currency)} / ${formatCurrency(monthlyBudget, selectedAccount.currency)}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${spendingPercentage}%"></div>
            </div>
            <small>${spendingPercentage.toFixed(1)}% of monthly budget</small>
        </div>
        
        <!-- Monthly Spending Chart -->
        <div class="spending-chart">
            <h4>6-Month Spending Trend</h4>
            <div class="chart-container">
                ${spendingChart}
            </div>
        </div>
        
        <div class="bank-card-style ${selectedAccount.type}">
            <div class="bank-card-header">
                <div class="bank-logo">${getAccountIcon(selectedAccount.type)}</div>
                <div class="bank-info">
                    <h4>${selectedAccount.name}</h4>
                    <p>${selectedAccount.type === 'credit' ? '**** 4832 • Exp 12/28' : '•••• •••• •••• 4832'}</p>
                </div>
            </div>
            <div class="bank-card-details">
                ${cardDetails}
            </div>
            ${linkedLoanName ? `<div class="linked-loan-notice">Linked to: ${linkedLoanName}</div>` : ''}
        </div>
        
        <div class="selected-account-actions">
            <button class="btn btn-primary" onclick="quickAddTransaction('${selectedAccount.id}')">
                💸 Add Transaction
            </button>
            <button class="btn btn-secondary" onclick="openAccountEditor('${selectedAccount.id}')">
                ✏️ Edit Account
            </button>
            <button class="btn btn-secondary" onclick="exportAccountData('${selectedAccount.id}')">
                📁 Export Data
            </button>
        </div>
    `;
}

// 4. EXPORT ACCOUNT DATA
async function exportAccountData(accountId) {
    const [accounts, transactions] = await Promise.all([
        getAllItems(STORE_NAMES.accounts),
        getAllItems(STORE_NAMES.transactions)
    ]);
    
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    const accountTransactions = transactions
        .filter(t => t.accountId === accountId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Account Export: " + account.name + "\n";
    csvContent += "Export Date: " + new Date().toLocaleDateString() + "\n\n";
    csvContent += "Date,Description,Amount,Type,Balance After\n";
    
    let runningBalance = account.balance;
    accountTransactions.forEach(t => {
        runningBalance += t.amount;
        csvContent += `${t.date},"${t.description || ''}",${t.amount},${t.amount < 0 ? 'Expense' : 'Income'},${runningBalance}\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${account.name.replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 5. BULK ACTIONS
function initBulkActions() {
    const bulkActionsHTML = `
        <div class="bulk-actions" id="bulkActions">
            <div class="bulk-header">
                <h4>Bulk Actions</h4>
                <button class="btn-text" onclick="toggleBulkSelection()">Select Multiple</button>
            </div>
            <div class="bulk-buttons">
                <button class="btn btn-secondary" onclick="bulkExport()" disabled>
                    📁 Export Selected
                </button>
                <button class="btn btn-secondary" onclick="bulkHide()" disabled>
                    👁️ Hide Selected
                </button>
                <button class="btn btn-danger" onclick="bulkDelete()" disabled>
                    🗑️ Delete Selected
                </button>
            </div>
        </div>
    `;
    
    // Insert after the account list
    const accountList = document.getElementById('accList');
    if (accountList) {
        accountList.insertAdjacentHTML('afterend', bulkActionsHTML);
    }
}

let bulkSelectionMode = false;
let selectedAccounts = new Set();

function toggleBulkSelection() {
    bulkSelectionMode = !bulkSelectionMode;
    selectedAccounts.clear();
    
    const accounts = document.querySelectorAll('.account-card');
    accounts.forEach(acc => {
        if (bulkSelectionMode) {
            acc.classList.add('bulk-selectable');
            acc.addEventListener('click', handleBulkSelection);
        } else {
            acc.classList.remove('bulk-selectable', 'bulk-selected');
            acc.removeEventListener('click', handleBulkSelection);
        }
    });
    
    updateBulkButtons();
}

function handleBulkSelection(e) {
    if (!bulkSelectionMode) return;
    
    const accountCard = e.currentTarget;
    const accountId = accountCard.dataset.id;
    
    if (selectedAccounts.has(accountId)) {
        selectedAccounts.delete(accountId);
        accountCard.classList.remove('bulk-selected');
    } else {
        selectedAccounts.add(accountId);
        accountCard.classList.add('bulk-selected');
    }
    
    updateBulkButtons();
    e.stopPropagation();
}

function updateBulkButtons() {
    const buttons = document.querySelectorAll('.bulk-buttons button');
    const isEnabled = selectedAccounts.size > 0;
    
    buttons.forEach(btn => {
        btn.disabled = !isEnabled;
    });
    
    const selectBtn = document.querySelector('.bulk-header .btn-text');
    if (selectBtn) {
        selectBtn.textContent = bulkSelectionMode 
            ? `Cancel (${selectedAccounts.size} selected)`
            : 'Select Multiple';
    }
}

async function bulkExport() {
    if (selectedAccounts.size === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Bulk Account Export\n";
    csvContent += "Export Date: " + new Date().toLocaleDateString() + "\n\n";
    
    const [accounts, transactions] = await Promise.all([
        getAllItems(STORE_NAMES.accounts),
        getAllItems(STORE_NAMES.transactions)
    ]);
    
    for (const accountId of selectedAccounts) {
        const account = accounts.find(a => a.id === accountId);
        if (!account) continue;
        
        csvContent += `\n=== ${account.name} ===\n`;
        csvContent += "Type,Current Balance,Currency\n";
        csvContent += `${account.type},${account.balance},${account.currency}\n\n`;
        
        const accountTx = transactions
            .filter(t => t.accountId === accountId)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 50); // Limit to last 50 transactions
        
        if (accountTx.length > 0) {
            csvContent += "Recent Transactions:\n";
            csvContent += "Date,Description,Amount,Type\n";
            accountTx.forEach(t => {
                csvContent += `${t.date},"${t.description || ''}",${t.amount},${t.amount < 0 ? 'Expense' : 'Income'}\n`;
            });
        }
        csvContent += "\n";
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bulk_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Reset selection
    toggleBulkSelection();
}

async function bulkDelete() {
    if (selectedAccounts.size === 0) return;
    
    const confirmation = confirm(`Are you sure you want to delete ${selectedAccounts.size} account(s)? This will also delete all associated transactions.`);
    if (!confirmation) return;
    
    for (const accountId of selectedAccounts) {
        await deleteItem(STORE_NAMES.accounts, accountId);
    }
    
    toggleBulkSelection();
    refreshAccountList();
}

// 6. ENHANCED TRANSACTION HISTORY
async function updateEnhancedTransactionHistory() {
    const [transactions, accounts] = await Promise.all([
        getAllItems(STORE_NAMES.transactions),
        getAllItems(STORE_NAMES.accounts)
    ]);
    
    const recent = transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
    
    const container = document.getElementById('recentTransactions');
    if (!container) return;
    
    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-transactions">
                <p>No recent transactions</p>
                <small>Add your first transaction to see history</small>
            </div>
        `;
        return;
    }
    
    // Group by date
    const groupedByDate = {};
    recent.forEach(t => {
        const date = new Date(t.date).toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric' 
        });
        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(t);
    });
    
    const accountMap = {};
    accounts.forEach(acc => {
        accountMap[acc.id] = acc.name;
    });
    
    container.innerHTML = Object.entries(groupedByDate).map(([date, txList]) => `
        <div class="transaction-day">
            <div class="day-header">${date}</div>
            ${txList.map(t => {
                const accountName = accountMap[t.accountId] || 'Unknown Account';
                const categoryIcon = t.amount < 0 ? '📤' : '📥';
                return `
                    <div class="transaction-item" data-id="${t.id}">
                        <div class="transaction-icon ${t.amount < 0 ? 'expense' : 'income'}">
                            ${categoryIcon}
                        </div>
                        <div class="transaction-info">
                            <strong>${t.description || 'No description'}</strong>
                            <small>${accountName}</small>
                        </div>
                        <div class="transaction-amount ${t.amount < 0 ? 'negative' : 'positive'}">
                            ${formatCurrency(t.amount, 'AUD')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `).join('');
    
    // Add click handler to view transaction details
    container.querySelectorAll('.transaction-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const txId = e.currentTarget.dataset.id;
            viewTransactionDetails(txId);
        });
    });
}

// 7. TRANSACTION DETAILS VIEW
async function viewTransactionDetails(transactionId) {
    const transactions = await getAllItems(STORE_NAMES.transactions);
    const accounts = await getAllItems(STORE_NAMES.accounts);
    
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    const account = accounts.find(a => a.id === transaction.accountId);
    
    // Create modal
    const modalHTML = `
        <div class="modal-overlay" id="transactionModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Transaction Details</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="transaction-detail-row">
                        <span>Amount</span>
                        <strong class="${transaction.amount < 0 ? 'negative' : 'positive'}">
                            ${formatCurrency(transaction.amount, 'AUD')}
                        </strong>
                    </div>
                    <div class="transaction-detail-row">
                        <span>Description</span>
                        <strong>${transaction.description || 'No description'}</strong>
                    </div>
                    <div class="transaction-detail-row">
                        <span>Date</span>
                        <strong>${formatDate(new Date(transaction.date))}</strong>
                    </div>
                    <div class="transaction-detail-row">
                        <span>Account</span>
                        <strong>${account ? account.name : 'Unknown Account'}</strong>
                    </div>
                    <div class="transaction-detail-row">
                        <span>Type</span>
                        <strong>${transaction.amount < 0 ? 'Expense' : 'Income'}</strong>
                    </div>
                    <div class="transaction-detail-row">
                        <span>Created</span>
                        <strong>${formatDate(new Date(transaction.createdAt))}</strong>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="editTransaction('${transaction.id}')">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-danger" onclick="deleteTransaction('${transaction.id}')">
                        🗑️ Delete
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal()">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeModal() {
    const modal = document.getElementById('transactionModal');
    if (modal) modal.remove();
}

async function editTransaction(transactionId) {
    // Implementation for editing transaction
    alert('Edit transaction feature would open here');
    closeModal();
}

async function deleteTransaction(transactionId) {
    const confirmation = confirm('Are you sure you want to delete this transaction?');
    if (!confirmation) return;
    
    await deleteItem(STORE_NAMES.transactions, transactionId);
    closeModal();
    refreshAccountList();
    updateRecentTransactions();
}

// 8. ENHANCED INIT FUNCTION
export function initEnhancedAccountsUI() {
    initAccountsUI(); // Call the original init
    
    // Add bulk actions after a short delay
    setTimeout(() => {
        initBulkActions();
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + F to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                document.getElementById('accountSearch').focus();
            }
            
            // Ctrl/Cmd + N for new account
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                openAccountEditor();
            }
            
            // Escape to cancel bulk selection
            if (e.key === 'Escape' && bulkSelectionMode) {
                toggleBulkSelection();
            }
        });
        
        // Add loading indicator for long operations
        const originalRefresh = refreshAccountList;
        refreshAccountList = async function() {
            const listEl = document.getElementById('accList');
            if (listEl) {
                listEl.innerHTML = `
                    <div class="loading-indicator">
                        <div class="spinner"></div>
                        <p>Loading accounts...</p>
                    </div>
                `;
            }
            
            await originalRefresh();
        };
        
    }, 100);
}

// 9. UPDATE THE REFRESH FUNCTION TO USE ENHANCED VERSION
// Replace the updateSelectedAccountCard call in refreshAccountList with:
// updateSelectedAccountCardEnhanced();

// Export functions for use in other modules
export {
  addDefaultAccounts,
  getPrimaryAccountId,
  setPrimaryAccountId,
  calculateAccountBalance,
  formatCurrency,
  formatDate
};