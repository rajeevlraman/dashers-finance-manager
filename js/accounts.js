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

// Helper functions moved to top
function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'AUD'
  }).format(amount);
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
// this is the summary cards function option 1
/*
function updateSummaryCards(accounts, transactions) {
  // Calculate totals - FIXED LOGIC
  const totalBalance = accounts.reduce((sum, acc) => {
    // For credit cards, balance is negative (what you owe), so we add it as negative
    // For other accounts, balance is positive (what you have)
    return sum + acc.balance;
  }, 0);

  // Cash accounts: bank, savings, cash, offset (positive balances)
  const cashAccounts = accounts.filter(acc => 
    ['bank', 'savings', 'cash', 'offset'].includes(acc.type)
  ).length;

  // Credit cards count
  const creditCards = accounts.filter(acc => acc.type === 'credit').length;
  
  // Available credit calculation - FIXED
  const totalCreditLimit = accounts
    .filter(acc => acc.type === 'credit' && acc.creditLimit)
    .reduce((sum, acc) => sum + (acc.creditLimit || 0), 0);
  
  // For credit cards, balance is negative (what you owe), so used credit is the absolute value
  const usedCredit = accounts
    .filter(acc => acc.type === 'credit')
    .reduce((sum, acc) => sum + Math.abs(Math.min(acc.balance, 0)), 0);
  
  const availableCredit = Math.max(totalCreditLimit - usedCredit, 0);

  console.log('Account Summary Debug:', {
    totalBalance,
    cashAccounts,
    creditCards,
    totalCreditLimit,
    usedCredit,
    availableCredit,
    accountDetails: accounts.map(acc => ({
      name: acc.name,
      type: acc.type,
      balance: acc.balance,
      creditLimit: acc.creditLimit
    }))
  });

  // Update summary cards
  document.getElementById('totalBalanceCard').querySelector('.summary-amount').textContent = 
    formatCurrency(totalBalance, 'AUD');
  document.getElementById('cashAccountsCard').querySelector('.summary-count').textContent = cashAccounts;
  document.getElementById('creditCardsCard').querySelector('.summary-count').textContent = creditCards;
  document.getElementById('totalCreditCard').querySelector('.summary-amount').textContent = 
    formatCurrency(availableCredit, 'AUD');
}
*/

// alternat to the above function
/*
function updateSummaryCards(accounts, transactions) {
  // Separate assets (positive) from liabilities (negative/credit cards)
  const assets = accounts.filter(acc => acc.type !== 'credit');
  const liabilities = accounts.filter(acc => acc.type === 'credit');
  
  const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
  const netWorth = totalAssets - totalLiabilities;

  // Cash accounts count
  const cashAccounts = accounts.filter(acc => 
    ['bank', 'savings', 'cash', 'offset'].includes(acc.type)
  ).length;

  // Credit cards count
  const creditCards = liabilities.length;
  
  // Available credit
  const totalCreditLimit = liabilities.reduce((sum, acc) => sum + (acc.creditLimit || 0), 0);
  const usedCredit = liabilities.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
  const availableCredit = Math.max(totalCreditLimit - usedCredit, 0);

  console.log('Account Summary Debug:', {
    netWorth,
    totalAssets,
    totalLiabilities,
    cashAccounts,
    creditCards,
    availableCredit
  });

  // Update summary cards - you might want to change the labels
  document.getElementById('totalBalanceCard').querySelector('.summary-amount').textContent = 
    formatCurrency(netWorth, 'AUD');
  document.getElementById('cashAccountsCard').querySelector('.summary-count').textContent = cashAccounts;
  document.getElementById('creditCardsCard').querySelector('.summary-count').textContent = creditCards;
  document.getElementById('totalCreditCard').querySelector('.summary-amount').textContent = 
    formatCurrency(availableCredit, 'AUD');
}

*/
  function updateSummaryCards(accounts, transactions) {
    // Separate assets (positive) from liabilities (negative/credit cards)
    const assets = accounts.filter(acc => acc.type !== 'credit');
    const liabilities = accounts.filter(acc => acc.type === 'credit');
    
    const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
    const netWorth = totalAssets - totalLiabilities;

    // Cash accounts count
    const cashAccounts = accounts.filter(acc => 
      ['bank', 'savings', 'cash', 'offset'].includes(acc.type)
    ).length;

    // Credit cards count
    const creditCards = liabilities.length;
    
    // Available credit
    const totalCreditLimit = liabilities.reduce((sum, acc) => sum + (acc.creditLimit || 0), 0);
    const usedCredit = liabilities.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
    const availableCredit = Math.max(totalCreditLimit - usedCredit, 0);

    console.log('Account Summary Debug:', {
      netWorth,
      totalAssets: formatCurrency(totalAssets, 'AUD'),
      totalLiabilities: formatCurrency(totalLiabilities, 'AUD'),
      cashAccounts,
      creditCards,
      availableCredit: formatCurrency(availableCredit, 'AUD')
    });

    // Update summary cards with better labels
    document.getElementById('totalBalanceCard').innerHTML = `
      <h3>Net Worth</h3>
      <p class="summary-amount ${netWorth >= 0 ? 'positive' : 'negative'}">${formatCurrency(netWorth, 'AUD')}</p>
      <small>Assets: ${formatCurrency(totalAssets, 'AUD')}</small>
    `;
    
    document.getElementById('cashAccountsCard').innerHTML = `
      <h3>Cash Accounts</h3>
      <p class="summary-count">${cashAccounts}</p>
      <small>Total: ${formatCurrency(totalAssets, 'AUD')}</small>
    `;
    
    document.getElementById('creditCardsCard').innerHTML = `
      <h3>Credit Cards</h3>
      <p class="summary-count">${creditCards}</p>
      <small>Owed: ${formatCurrency(totalLiabilities, 'AUD')}</small>
    `;
    
    document.getElementById('totalCreditCard').innerHTML = `
      <h3>Available Credit</h3>
      <p class="summary-amount">${formatCurrency(availableCredit, 'AUD')}</p>
      <small>Limit: ${formatCurrency(totalCreditLimit, 'AUD')}</small>
    `;
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

function calculateAccountBalance(account, transactions) {
  const tx = transactions.filter(t => t.accountId === account.id);
  if (!tx.length) return account.balance || 0;

  return tx.reduce((sum, t) => sum + t.amount, 0);
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
     // const isNegative = derivedBalance < 0;
      const derivedBalance = calculateAccountBalance(account, transactions);
      const isNegative = derivedBalance < 0;

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
  <div class="account-card ${account.type}">
    
    <!-- HEADER (collapsed view) -->
    <div class="account-header" data-id="${account.id}">
      
      <div class="account-left">
        <div class="account-icon">${icon}</div>

        <div class="account-info">
          <h4 class="account-name">${account.name}</h4>
          <p class="account-type">${getAccountTypeLabel(account.type)}</p>

          ${
            lastTransaction
              ? `<small class="last-activity">
                   Last activity: ${daysSinceActivity === 0 ? 'Today' : `${daysSinceActivity} days ago`}
                 </small>`
              : `<small class="last-activity">No transactions yet</small>`
          }

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

        ${
          isCredit && account.creditLimit
            ? `<div class="stat">
                 <span class="stat-label">Available Credit</span>
                 <span class="stat-value positive">
                   ${formatCurrency(account.creditLimit + derivedBalance, account.currency)}
                 </span>
               </div>`
            : ''
        }
      </div>

      ${
        isCredit && account.creditLimit
          ? `<div class="credit-limit">
               Limit: ${formatCurrency(account.creditLimit, account.currency)}
             </div>
             ${creditUtilization}`
          : ''
      }

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

  // Fetch all loans
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
              <button class="btn btn-primary" type="submit">${acc.id ? '💾 Update' : '➕ Add'} Account</button>
              <button class="btn btn-secondary" type="button" id="btnCancel">Cancel</button>
            </div>
          </form>
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

      if (acc.id) await updateItem(STORE_NAMES.accounts, newAcc);
      else await addItem(STORE_NAMES.accounts, newAcc);

      initAccountsUI();
    });
  });
}