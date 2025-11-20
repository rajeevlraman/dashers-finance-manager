import { getAllItems, addItem, deleteItem, STORE_NAMES } from './db.js';

export async function initTransactionsUI() {
  const mainContent = document.getElementById('mainContent');
  const [categories, accounts, transactions] = await Promise.all([
    getAllItems(STORE_NAMES.categories),
    getAllItems(STORE_NAMES.accounts),
    getAllItems(STORE_NAMES.transactions)
  ]);

  const mainCats = categories.filter(c => !c.parentId);
  const subCats = categories.filter(c => c.parentId);

  // Get current date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  mainContent.innerHTML = `
    <div class="transactions-header">
      <h2>💸 Transactions</h2>
    </div>

    <div class="transactions-container">
      <!-- Add Transaction Card -->
      <div class="form-card">
        <h3 class="card-title">➕ Add New Transaction</h3>
        <form id="txForm" class="styled-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Type</label>
              <select name="type" class="form-select" required>
                <option value="expense">📤 Expense</option>
                <option value="income">📥 Income</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Amount</label>
              <input type="number" name="amount" class="form-input" step="0.01" placeholder="0.00" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input type="date" name="date" class="form-input" value="${today}" required>
            </div>

            <div class="form-group">
              <label class="form-label">Account</label>
              <select name="accountId" class="form-select" required>
                ${accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Main Category</label>
              <select id="mainCategory" class="form-select" required>
                <option value="">-- Select Category --</option>
                ${mainCats.map(c => `<option value="${c.id}">${c.icon || '📁'} ${c.name}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Subcategory</label>
              <select id="subCategory" class="form-select">
                <option value="">-- None --</option>
              </select>
            </div>
          </div>

          <button class="btn-primary" type="submit">
            💾 Add Transaction
          </button>
        </form>
      </div>

      <!-- Filter Card -->
      <div class="form-card">
        <h3 class="card-title">🔍 Filter Transactions</h3>
        <form id="filterForm" class="styled-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Type</label>
              <select name="type" class="form-select">
                <option value="">All Types</option>
                <option value="income">📥 Income</option>
                <option value="expense">📤 Expense</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Main Category</label>
              <select name="mainCategoryId" class="form-select">
                <option value="">All Categories</option>
                ${mainCats.map(c => `<option value="${c.id}">${c.icon || '📁'} ${c.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Subcategory</label>
              <select name="subCategoryId" class="form-select">
                <option value="">All Subcategories</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Date Range</label>
              <div class="date-range">
                <input type="date" name="from" class="form-input" placeholder="From">
                <span class="date-separator">to</span>
                <input type="date" name="to" class="form-input" placeholder="To" value="${today}">
              </div>
            </div>
          </div>

          <button class="btn-secondary" type="submit">
            🔍 Apply Filters
          </button>
        </form>
      </div>
    </div>

    <div id="txList" class="transactions-list"></div>
  `;

  // ... rest of your JavaScript logic remains exactly the same
  const txForm = document.getElementById('txForm');
  const mainSelect = document.getElementById('mainCategory');
  const subSelect = document.getElementById('subCategory');

  // === Update Subcategory Options Dynamically ===
  mainSelect.addEventListener('change', () => {
    const parentId = mainSelect.value;
    const filteredSubs = subCats.filter(s => s.parentId === parentId);
    subSelect.innerHTML = `<option value="">-- None --</option>` +
      filteredSubs.map(s => `<option value="${s.id}">${s.icon || '📄'} ${s.name}</option>`).join('');
  });

  // === Add Transaction ===
  txForm.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const subCategoryId = subSelect.value;
    const mainCategoryId = mainSelect.value;
    const chosenCategoryId = subCategoryId || mainCategoryId;

    if (!chosenCategoryId) {
      alert('Please select a category or subcategory.');
      return;
    }

    const tx = {
      type: f.type.value,
      amount: parseFloat(f.amount.value),
      date: f.date.value,
      categoryId: chosenCategoryId,
      accountId: f.accountId.value
    };

    await addItem(STORE_NAMES.transactions, tx);
    initTransactionsUI();
  });

  // === Filter form dynamic linking ===
  const filterMain = document.querySelector('#filterForm [name="mainCategoryId"]');
  const filterSub = document.querySelector('#filterForm [name="subCategoryId"]');

  filterMain.addEventListener('change', () => {
    const parentId = filterMain.value;
    const filteredSubs = subCats.filter(s => s.parentId === parentId);
    filterSub.innerHTML = `<option value="">All Subcategories</option>` +
      filteredSubs.map(s => `<option value="${s.id}">${s.icon || '📄'} ${s.name}</option>`).join('');
  });

  // === Filter submit ===
  document.getElementById('filterForm').addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(e.target);
    const filters = Object.fromEntries(data.entries());
    renderTransactions(transactions, categories, accounts, filters);
  });

  renderTransactions(transactions, categories, accounts);
}

function renderTransactions(transactions, categories, accounts, filters = {}) {
  const txList = document.getElementById('txList');
  let filtered = [...transactions];

  if (filters.type) filtered = filtered.filter(t => t.type === filters.type);
  if (filters.mainCategoryId) {
    const allSubIds = categories
      .filter(c => c.parentId === filters.mainCategoryId)
      .map(c => c.id);
    filtered = filtered.filter(t =>
      t.categoryId === filters.mainCategoryId || allSubIds.includes(t.categoryId)
    );
  }
  if (filters.subCategoryId) filtered = filtered.filter(t => t.categoryId === filters.subCategoryId);
  if (filters.from) filtered = filtered.filter(t => t.date >= filters.from);
  if (filters.to) filtered = filtered.filter(t => t.date <= filters.to);

  filtered.sort((a, b) => b.date.localeCompare(a.date));

  const getMainSub = id => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return { main: 'Unknown', sub: '' };
    if (!cat.parentId) return { main: cat.name, sub: '' };
    const parent = categories.find(c => c.id === cat.parentId);
    return { main: parent?.name || 'Unknown', sub: cat.name };
  };

  if (filtered.length === 0) {
    txList.innerHTML = '<p>No transactions found.</p>';
    return;
  }

  txList.innerHTML = `
    <table class="table">
      <thead>
        <tr><th>Date</th><th>Type</th><th>Amount</th><th>Main Category</th><th>Subcategory</th><th>Account</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${filtered.map(tx => {
          const cat = getMainSub(tx.categoryId);
          const acc = accounts.find(a => a.id === tx.accountId)?.name || 'Unknown';
          return `
            <tr>
              <td>${tx.date}</td>
              <td>${tx.type}</td>
              <td>$${tx.amount.toFixed(2)}</td>
              <td>${cat.main}</td>
              <td>${cat.sub || '-'}</td>
              <td>${acc}</td>
              <td><button class="button red" data-id="${tx.id}">🗑️ Delete</button></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  txList.querySelectorAll('.button.red').forEach(btn => {
    btn.addEventListener('click', async () => {
      await deleteItem(STORE_NAMES.transactions, btn.dataset.id);
      initTransactionsUI();
    });
  });
}
