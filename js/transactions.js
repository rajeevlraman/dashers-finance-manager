import { getAllItems, addItem, deleteItem, updateItem, STORE_NAMES } from './db.js';

export async function initTransactionsUI() {
  const mainContent = document.getElementById('mainContent');
  mainContent.classList.add('page-transition');

  const [categories, accounts, transactions] = await Promise.all([
    getAllItems(STORE_NAMES.categories),
    getAllItems(STORE_NAMES.accounts),
    getAllItems(STORE_NAMES.transactions)
  ]);

  const mainCats = categories.filter(c => !c.parentId);
  const subCats = categories.filter(c => c.parentId);
  const today = new Date().toISOString().split('T')[0];

  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>💸 Transactions</h2>
        <div class="page-actions">
          <button class="btn btn-primary" id="btnAddTx">Add</button>
          <button class="btn btn-secondary" id="btnFilterTx">Filter</button>
          <button class="btn btn-secondary" id="btnExportTx">Export</button>
        </div>
      </div>

      <div id="addTxForm" class="section-card form-section" style="display: none;">
        <h3>➕ Add New Transaction</h3>
        <form id="txForm" class="styled-form" data-id="">
          <div class="form-row">
            <div class="form-group">
              <label>Type</label>
              <select name="type" class="form-select" required>
                <option value="expense">📤 Expense</option>
                <option value="income">📥 Income</option>
              </select>
            </div>

            <div class="form-group">
              <label>Amount</label>
              <input type="number" name="amount" class="form-input" step="0.01" placeholder="0.00" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Date</label>
              <input type="date" name="date" class="form-input" value="${today}" required>
            </div>

            <div class="form-group">
              <label>Account</label>
              <select name="accountId" class="form-select" required>
                ${accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Main Category</label>
              <select id="mainCategory" class="form-select" required>
                <option value="">-- Select Category --</option>
                ${mainCats.map(c => `<option value="${c.id}">${c.icon || '📁'} ${c.name}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label>Subcategory</label>
              <select id="subCategory" class="form-select">
                <option value="">-- None --</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Notes</label>
              <textarea name="notes" class="form-input" placeholder="Add notes here..."></textarea>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn-primary" type="submit">💾 Add Transaction</button>
            <button class="btn btn-secondary" type="reset">🧹 Clear</button>
          </div>
        </form>
      </div>

      <div id="filterTxForm" class="section-card form-section" style="display: none;">
        <h3>🔍 Filter Transactions</h3>
        <form id="filterForm" class="styled-form">
          <div class="form-row">
            <div class="form-group">
              <label>Type</label>
              <select name="type" class="form-select">
                <option value="">All Types</option>
                <option value="income">📥 Income</option>
                <option value="expense">📤 Expense</option>
              </select>
            </div>

            <div class="form-group">
              <label>Main Category</label>
              <select name="mainCategoryId" class="form-select">
                <option value="">All Categories</option>
                ${mainCats.map(c => `<option value="${c.id}">${c.icon || '📁'} ${c.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Subcategory</label>
              <select name="subCategoryId" class="form-select">
                <option value="">All Subcategories</option>
              </select>
            </div>

            <div class="form-group">
              <label>Date Range</label>
              <div class="date-range">
                <input type="date" name="from" class="form-input" placeholder="From">
                <span class="date-separator">to</span>
                <input type="date" name="to" class="form-input" placeholder="To" value="${today}">
              </div>
            </div>
          </div>

          <button class="btn btn-secondary" type="submit">🔍 Apply Filters</button>
        </form>
      </div>

      <div id="txList" class="section-card"></div>
    </div>
  `;

  setTimeout(() => mainContent.classList.remove('page-transition'), 400);

  // === Toggle Forms (Add and Filter) ===
  const btnAddTx = document.getElementById('btnAddTx');
  const btnFilterTx = document.getElementById('btnFilterTx');
  const addTxForm = document.getElementById('addTxForm');
  const filterTxForm = document.getElementById('filterTxForm');

  // Toggle Add Transaction Form
  btnAddTx.addEventListener('click', () => {
    if (addTxForm.style.display === 'none') {
      addTxForm.style.display = 'block';
      filterTxForm.style.display = 'none';  // Hide Filter form when Add form is shown
    } else {
      addTxForm.style.display = 'none';  // Hide Add form when it's clicked again
    }
  });

  // Toggle Filter Transactions Form
  btnFilterTx.addEventListener('click', () => {
    if (filterTxForm.style.display === 'none') {
      filterTxForm.style.display = 'block';
      addTxForm.style.display = 'none';  // Hide Add form when Filter form is shown
    } else {
      filterTxForm.style.display = 'none';  // Hide Filter form when it's clicked again
    }
  });

  // === Dynamic category linking for Add Transaction ===
  const txForm = document.getElementById('txForm');
  const mainSelect = document.getElementById('mainCategory');
  const subSelect = document.getElementById('subCategory');

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
      accountId: f.accountId.value,
      notes: f.notes.value.trim() || "",  // Save notes
    };

    const txId = f.dataset.id;  // Get the ID from the form if it's being edited

    if (txId) {
      // Edit existing transaction
      await updateItem(STORE_NAMES.transactions, txId, tx);
    } else {
      // Add new transaction
      await addItem(STORE_NAMES.transactions, tx);
    }

    initTransactionsUI();  // Re-render transactions after adding/editing
  });

  // === Filter linking for Filter Form ===
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

  renderTransactions(transactions, categories, accounts);  // Initially render all transactions
}

function renderTransactions(transactions, categories, accounts, filters = {}) {
  const txList = document.getElementById('txList');
  let filtered = [...transactions];

  // Apply filters to the transactions
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

  // Helper function to get main and subcategory names
  const getMainSub = id => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return { main: 'Unknown', sub: '' };
    if (!cat.parentId) return { main: cat.name, sub: '' };
    const parent = categories.find(c => c.id === cat.parentId);
    return { main: parent?.name || 'Unknown', sub: cat.name };
  };

  if (filtered.length === 0) {
    txList.innerHTML = '<p style="text-align:center;color:#666;">No transactions found.</p>';
    return;
  }

  // Generate HTML for transactions in cards
  txList.innerHTML = `
    <div class="transactions-container">
      ${filtered.map(tx => {
        const cat = getMainSub(tx.categoryId);
        const acc = accounts.find(a => a.id === tx.accountId)?.name || 'Unknown';
        const typeTag = tx.type === 'income'
          ? `<span class="tag income">Income</span>`
          : `<span class="tag expense">Expense</span>`;

        // Only show notes if they are available
        const notesDisplay = tx.notes ? `<p class="transaction-notes">Notes: ${tx.notes}</p>` : '';

        return `
          <div class="transaction-card">
            <div class="transaction-header">
              <span class="transaction-date">${tx.date}</span>
              <span class="transaction-category">${typeTag}</span>
            </div>
            <div class="transaction-body">
              <p class="transaction-description">${cat.main} - ${cat.sub || '-'}</p>
              <span class="transaction-amount">$${tx.amount.toFixed(2)}</span>
              <span class="transaction-account">Account: ${acc}</span>
              ${notesDisplay} <!-- Display notes if they exist -->
            </div>
            <div class="transaction-actions">
              <button class="btn btn-danger" data-id="${tx.id}">🗑️</button>
              <button class="btn btn-primary edit-btn" data-id="${tx.id}">✏️</button>  <!-- Edit Button -->
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Add event listener for the delete button
  txList.querySelectorAll('.btn-danger').forEach(btn => {
    btn.addEventListener('click', async () => {
      await deleteItem(STORE_NAMES.transactions, btn.dataset.id);
      initTransactionsUI();  // Re-render transactions after deletion
    });
  });

  // Add event listener for the edit button
  txList.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const txId = btn.dataset.id;
      const txToEdit = filtered.find(tx => tx.id === txId);

      // Pre-fill the form with the transaction data
      const txForm = document.getElementById('txForm');
      const mainSelect = document.getElementById('mainCategory');
      const subSelect = document.getElementById('subCategory');

      txForm.dataset.id = txToEdit.id;  // Set the transaction ID for editing
      txForm.type.value = txToEdit.type;
      txForm.amount.value = txToEdit.amount;
      txForm.date.value = txToEdit.date;
      txForm.accountId.value = txToEdit.accountId;
      mainSelect.value = txToEdit.categoryId;  // Main category selection
      subSelect.value = txToEdit.subCategoryId || '';  // Subcategory selection
      txForm.notes.value = txToEdit.notes || '';  // Notes field

      // Show the form for editing
      addTxForm.style.display = 'block';
      filterTxForm.style.display = 'none';  // Hide filter form
    });
  });
}
