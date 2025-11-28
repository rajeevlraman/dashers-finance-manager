import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES } from './db.js';

// Default demo accounts
const DEFAULT_ACCOUNTS = [
  { id: 'bank1', name: 'Main Checking', type: 'bank', balance: 0, currency: 'AUD' },
  { id: 'bank2', name: 'Savings Account', type: 'bank', balance: 0, currency: 'AUD' },
  { id: 'credit1', name: 'Visa Credit Card', type: 'credit', balance: 0, currency: 'AUD', creditLimit: 5000 },
  { id: 'credit2', name: 'MasterCard', type: 'credit', balance: 0, currency: 'AUD', creditLimit: 3000 },
  { id: 'offset', name: 'Mortgage Offset', type: 'offset', balance: 0, currency: 'AUD', linkedLoanId: '' }
];

function generateId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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

export function initAccountsUI() {
  const main = document.getElementById('mainContent');
  main.classList.add('page-transition');

  main.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>🏦 Accounts</h2>
        <div class="page-actions">
          <button id="btnNewAcc" class="btn btn-primary">➕ New Account</button>
          <button id="btnAddDefaults" class="btn btn-secondary">📦 Add Defaults</button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="card green" id="totalBalanceCard">
          <h3>Total Balance</h3>
          <p class="summary-amount">$0.00</p>
        </div>
        <div class="card blue" id="cashAccountsCard">
          <h3>Cash Accounts</h3>
          <p class="summary-count">0</p>
        </div>
        <div class="card red" id="creditCardsCard">
          <h3>Credit Cards</h3>
          <p class="summary-count">0</p>
        </div>
        <div class="card teal" id="totalCreditCard">
          <h3>Available Credit</h3>
          <p class="summary-amount">$0.00</p>
        </div>
      </div>

      <div class="section-card">
        <div class="accounts-controls">
          <div class="search-box">
            <input type="text" id="accountSearch" placeholder="🔍 Search accounts..." class="form-input">
          </div>
          <div class="filter-controls">
            <select id="accountTypeFilter" class="form-select">
              <option value="all">All Account Types</option>
              <option value="bank">🏦 Bank Accounts</option>
              <option value="credit">💳 Credit Cards</option>
              <option value="savings">💰 Savings</option>
              <option value="investment">📈 Investments</option>
              <option value="offset">⚖️ Offset Accounts</option>
              <option value="cash">💵 Cash</option>
              <option value="other">📁 Other</option>
            </select>
          </div>
        </div>
        <div id="accList" class="accounts-grid">Loading…</div>
      </div>
    </div>
  `;

  setTimeout(() => main.classList.remove('page-transition'), 400);

  document.getElementById('btnNewAcc').addEventListener('click', () => openAccountEditor());
  document.getElementById('btnAddDefaults').addEventListener('click', addDefaultAccounts);

  // Add search and filter functionality
  document.getElementById('accountSearch').addEventListener('input', refreshAccountList);
  document.getElementById('accountTypeFilter').addEventListener('change', refreshAccountList);

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

    if (!accounts.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>No accounts yet.</p>
          <button class="btn btn-primary" id="btnAddDefaultsEmpty">📦 Add Default Accounts</button>
        </div>
      `;
      document.getElementById('btnAddDefaultsEmpty').addEventListener('click', addDefaultAccounts);
      updateSummaryCards(accounts, transactions);
      return;
    }

    // Filter accounts based on search and type
    const filteredAccounts = accounts.filter(account => {
      const matchesSearch = account.name.toLowerCase().includes(searchTerm);
      const matchesType = typeFilter === 'all' || account.type === typeFilter;
      return matchesSearch && matchesType;
    });

    // Update summary cards
    updateSummaryCards(accounts, transactions);

    if (filteredAccounts.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>No accounts match your search criteria.</p>
          <button class="btn btn-secondary" onclick="document.getElementById('accountSearch').value=''; document.getElementById('accountTypeFilter').value='all'; refreshAccountList();">Clear Filters</button>
        </div>
      `;
      return;
    }

    // Create a mapping of loan IDs to loan names
    const loanMap = {};
    loans.forEach(loan => {
      loanMap[loan.id] = loan.name;
    });

    listEl.innerHTML = filteredAccounts.map(account => {
      const isNegative = account.balance < 0;
      const isCredit = account.type === 'credit';
      const balanceClass = isNegative ? 'negative' : 'positive';
      const icon = getAccountIcon(account.type);
      
      // Calculate account activity
      const accountTransactions = transactions.filter(t => t.accountId === account.id);
      const lastTransaction = accountTransactions.length > 0 
        ? new Date(Math.max(...accountTransactions.map(t => new Date(t.date))))
        : null;
      
      const daysSinceActivity = lastTransaction 
        ? Math.floor((new Date() - lastTransaction) / (1000 * 60 * 60 * 24))
        : null;

      // FIX: Look up the loan name instead of showing the ID
      let linkedLoanInfo = '';
      if (account.type === 'offset' && account.linkedLoanId) {
        const loanName = loanMap[account.linkedLoanId] || 'Unknown Loan';
        linkedLoanInfo = `<div class="linked-loan">Linked to: ${loanName}</div>`;
      }

      // Credit utilization for credit cards
      let creditUtilization = '';
      if (isCredit && account.creditLimit && account.creditLimit > 0) {
        const utilization = (Math.abs(account.balance) / account.creditLimit) * 100;
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
        <div class="account-card ${account.type}">
          <div class="account-header" data-id="${account.id}">
            <div class="account-icon">${icon}</div>
            <div class="account-info">
              <h4 class="account-name">${account.name}</h4>
              <p class="account-type">${getAccountTypeLabel(account.type)}</p>
              ${lastTransaction ? `
                <small class="last-activity">Last activity: ${daysSinceActivity === 0 ? 'Today' : `${daysSinceActivity} days ago`}</small>
              ` : '<small class="last-activity">No transactions yet</small>'}
              ${linkedLoanInfo}
            </div>
            <div class="account-balance ${balanceClass}">
              ${formatCurrency(account.balance, account.currency)}
              ${isCredit && account.creditLimit ? `
                <div class="credit-limit">Limit: ${formatCurrency(account.creditLimit, account.currency)}</div>
              ` : ''}
              ${creditUtilization}
            </div>
          </div>
          <div id="details-${account.id}" class="account-details" style="display: none;">
            <div class="account-actions">
              <button class="btn btn-secondary" data-id="${account.id}" data-action="edit">✏️ Edit</button>
              <button class="btn btn-danger" data-id="${account.id}" data-action="delete">🗑️ Delete</button>
              <button class="btn btn-primary" data-id="${account.id}" data-action="quick-add">💸 Quick Add Transaction</button>
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
                  <span class="stat-value positive">${formatCurrency(account.creditLimit + account.balance, account.currency)}</span>
                </div>
              ` : ''}
            </div>

            <div class="recent-transactions" id="recent-${account.id}">
              <p class="rt-title">Recent Transactions</p>
              <div class="rt-loading">Loading…</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Event listeners
    listEl.querySelectorAll('.account-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const id = e.target.closest('.account-header').dataset.id;
        toggleAccountDetails(id);
      });
    });

    listEl.querySelectorAll('.btn').forEach(btn => {
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

function updateSummaryCards(accounts, transactions) {
  // Calculate totals
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const cashAccounts = accounts.filter(acc => ['bank', 'savings', 'cash'].includes(acc.type)).length;
  const creditCards = accounts.filter(acc => acc.type === 'credit').length;
  
  const totalCreditLimit = accounts
    .filter(acc => acc.type === 'credit' && acc.creditLimit)
    .reduce((sum, acc) => sum + acc.creditLimit, 0);
  
  const usedCredit = accounts
    .filter(acc => acc.type === 'credit')
    .reduce((sum, acc) => sum + Math.abs(Math.min(acc.balance, 0)), 0);
  
  const availableCredit = totalCreditLimit - usedCredit;

  // Update summary cards
  document.getElementById('totalBalanceCard').querySelector('.summary-amount').textContent = 
    formatCurrency(totalBalance, 'AUD');
  document.getElementById('cashAccountsCard').querySelector('.summary-count').textContent = cashAccounts;
  document.getElementById('creditCardsCard').querySelector('.summary-count').textContent = creditCards;
  document.getElementById('totalCreditCard').querySelector('.summary-amount').textContent = 
    formatCurrency(availableCredit, 'AUD');
}

function quickAddTransaction(accountId) {
  // Simple prompt for quick transaction addition
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
    categoryId: '', // You might want to add category selection
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

function formatDate(date) {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

// ... rest of your existing functions (getAccountIcon, getAccountTypeLabel, formatCurrency, openAccountEditor, showAccountForm) remain the same