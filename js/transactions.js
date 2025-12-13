import { getAllItems, addItem, deleteItem, updateItem, STORE_NAMES, generateId } from './db.js';
import { initImportModal } from './import/modal.js';

// ============================================================================
//  GLOBAL STATE
// ============================================================================
let currentTransactions = [];
let currentCategories = [];
let currentAccounts = [];
let currentProperties = [];
let currentFilter = {};

// ============================================================================
//  Transactions UI Initialization
// ============================================================================
export async function initTransactionsUI() {
  console.log("[TX] initTransactionsUI() starting…");

  const mainContent = document.getElementById('mainContent');
  if (!mainContent) {
    console.error("[TX] mainContent element not found!");
    return;
  }
  
  mainContent.classList.add('page-transition');

  // Load all data
  const [categories, accounts, transactions, properties] = await Promise.all([
    getAllItems(STORE_NAMES.categories),
    getAllItems(STORE_NAMES.accounts),
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.properties).catch(() => [])
  ]);

  // Store in global state
  currentTransactions = transactions;
  currentCategories = categories;
  currentAccounts = accounts;
  currentProperties = properties;

  const mainCats = categories.filter(c => !c.parentId);
  const today = new Date().toISOString().split("T")[0];

  // Summary calculations
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Math.abs(t.amount), 0);
  const netFlow = totalIncome - totalExpenses;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthTotal = transactions
    .filter(t => t.date.startsWith(thisMonth))
    .reduce((s, t) => s + (t.amount || 0), 0);

  // ========================================================================
  // HTML Rendering
  // ========================================================================
  mainContent.innerHTML = `
    <div class="page-container">

      <div class="page-header">
        <h2>💸 Transactions</h2>
        <div class="page-actions">
          <button class="btn btn-primary" id="btnAddTx">➕ Add Transaction</button>
          <button class="btn btn-secondary" id="btnFilterTx">🔍 Filter</button>
          <button class="btn btn-secondary" id="btnExportTx">📤 Export</button>
          <button class="btn btn-success" id="btnImportTx">📁 Import</button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="summary-label">Total Income</div>
          <div class="summary-value positive">$${totalIncome.toFixed(2)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Total Expenses</div>
          <div class="summary-value negative">$${totalExpenses.toFixed(2)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Net Flow</div>
          <div class="summary-value ${netFlow >= 0 ? 'positive' : 'negative'}">$${Math.abs(netFlow).toFixed(2)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">This Month</div>
          <div class="summary-value ${thisMonthTotal >= 0 ? 'positive' : 'negative'}">$${Math.abs(thisMonthTotal).toFixed(2)}</div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <button class="quick-action-btn" data-amount="50">➕ $50</button>
        <button class="quick-action-btn" data-amount="100">➕ $100</button>
        <button class="quick-action-btn" data-amount="200">➕ $200</button>
        <button class="quick-action-btn" data-amount="-50">➖ $50</button>
        <button class="quick-action-btn" data-amount="-100">➖ $100</button>
        <button class="quick-action-btn" data-amount="-200">➖ $200</button>
      </div>

      <!-- Filter Form -->
      <div id="filterTxForm" style="display: none;" class="section-card">
        <div class="form-header">
          <h3>🔍 Filter Transactions</h3>
          <button id="closeFilterForm" class="btn-close">✕</button>
        </div>
        <form id="filterForm">
          <div class="form-row">
            <select name="type" class="form-control">
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select name="accountId" class="form-control">
              <option value="">All Accounts</option>
              ${accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <select name="mainCategory" id="filterMainCategory" class="form-control">
              <option value="">All Categories</option>
              ${mainCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
            <select name="subCategory" id="filterSubCategory" class="form-control">
              <option value="">All Subcategories</option>
            </select>
          </div>
          <div class="form-row">
            <input type="date" name="startDate" class="form-control" placeholder="Start Date">
            <input type="date" name="endDate" class="form-control" placeholder="End Date">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Apply Filters</button>
            <button type="button" id="clearFilters" class="btn btn-secondary">Clear Filters</button>
          </div>
        </form>
      </div>

      <!-- Transactions List -->
      <div class="section-card">
        <div class="transactions-header">
          <h3>Recent Transactions</h3>
          <div class="transactions-controls">
            <span id="txCount">${transactions.length} transactions</span>
            <select id="sortTransactions" class="form-select">
              <option value="date-desc">Newest</option>
              <option value="date-asc">Oldest</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
              <option value="category-asc">Category A-Z</option>
              <option value="category-desc">Category Z-A</option>
            </select>
          </div>
        </div>
        <div id="txList"></div>
      </div>

    </div>
  `;

  // ========================================================================
  // Setup Event Listeners
  // ========================================================================
  setupEventListeners(categories, accounts, properties);
  renderTransactionList(transactions, categories, accounts, properties);

  // Initialize import modal
  setTimeout(() => {
    const importBtn = document.getElementById("btnImportTx");
    if (importBtn) {
      initImportModal({
        accounts,
        categories,
        onImported: async (savedCount) => {
          console.log("[TX] Import complete, refreshing...");
          await initTransactionsUI();
        }
      });
    }
  }, 200);

  setTimeout(() => mainContent.classList.remove("page-transition"), 300);
}

// ============================================================================
// Setup Event Listeners
// ============================================================================
function setupEventListeners(categories, accounts, properties) {
  // Add transaction button
  const btnAddTx = document.getElementById('btnAddTx');
  if (btnAddTx) {
    btnAddTx.addEventListener('click', () => {
      showInlineTransactionForm(null, categories, accounts, properties);
    });
  }

  // Filter button
  const btnFilterTx = document.getElementById('btnFilterTx');
  if (btnFilterTx) {
    btnFilterTx.addEventListener('click', () => {
      const filterForm = document.getElementById('filterTxForm');
      if (filterForm) {
        filterForm.style.display = filterForm.style.display === 'none' ? 'block' : 'none';
      }
    });
  }

  // Close filter form
  const closeFilterForm = document.getElementById('closeFilterForm');
  if (closeFilterForm) {
    closeFilterForm.addEventListener('click', () => {
      const filterForm = document.getElementById('filterTxForm');
      if (filterForm) filterForm.style.display = 'none';
    });
  }

  // Filter form submission
  const filterForm = document.getElementById('filterForm');
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(filterForm);
      currentFilter = {
        type: formData.get('type') || null,
        accountId: formData.get('accountId') || null,
        mainCategory: formData.get('mainCategory') || null,
        subCategory: formData.get('subCategory') || null,
        startDate: formData.get('startDate') || null,
        endDate: formData.get('endDate') || null
      };
      applyFilters();
    });
  }

  // Clear filters
  const clearFilters = document.getElementById('clearFilters');
  if (clearFilters) {
    clearFilters.addEventListener('click', () => {
      currentFilter = {};
      if (filterForm) filterForm.reset();
      renderTransactionList(currentTransactions, currentCategories, currentAccounts, currentProperties);
    });
  }

  // Sort transactions
  const sortSelect = document.getElementById('sortTransactions');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      renderTransactionList(currentTransactions, currentCategories, currentAccounts, currentProperties);
    });
  }

  // Quick action buttons
  document.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseFloat(btn.dataset.amount);
      const isIncome = amount > 0;
      
      showInlineTransactionForm({
        amount: Math.abs(amount),
        type: isIncome ? 'income' : 'expense',
        date: new Date().toISOString().split('T')[0]
      }, categories, accounts, properties);
    });
  });

  // Category linking for filters
  setupCategoryLinking(categories);
}

// ============================================================================
// Category Linking
// ============================================================================
function setupCategoryLinking(categories) {
  const mainSelect = document.getElementById('filterMainCategory');
  const subSelect = document.getElementById('filterSubCategory');

  if (mainSelect && subSelect) {
    const subCats = categories.filter(c => c.parentId);
    
    mainSelect.addEventListener('change', () => {
      const parentId = mainSelect.value;
      const subs = subCats.filter(s => s.parentId === parentId);
      
      subSelect.innerHTML = `
        <option value="">All Subcategories</option>
        ${subs.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
      `;
    });
  }
}

// ============================================================================
// Apply Filters
// ============================================================================
function applyFilters() {
  let filtered = [...currentTransactions];

  if (currentFilter.type) {
    filtered = filtered.filter(t => {
      const type = t.amount > 0 ? 'income' : 'expense';
      return type === currentFilter.type;
    });
  }

  if (currentFilter.accountId) {
    filtered = filtered.filter(t => t.accountId === currentFilter.accountId);
  }

  if (currentFilter.mainCategory) {
    const mainCategoryId = currentFilter.mainCategory;
    filtered = filtered.filter(t => {
      const category = currentCategories.find(c => c.id === t.categoryId);
      if (!category) return false;
      
      if (category.parentId) {
        // It's a subcategory, check parent
        return category.parentId === mainCategoryId;
      } else {
        // It's a main category
        return category.id === mainCategoryId;
      }
    });
  }

  if (currentFilter.subCategory) {
    filtered = filtered.filter(t => t.categoryId === currentFilter.subCategory);
  }

  if (currentFilter.startDate) {
    filtered = filtered.filter(t => t.date >= currentFilter.startDate);
  }

  if (currentFilter.endDate) {
    filtered = filtered.filter(t => t.date <= currentFilter.endDate);
  }

  renderTransactionList(filtered, currentCategories, currentAccounts, currentProperties);
}

// ============================================================================
// Render Transaction List
// ============================================================================
function renderTransactionList(transactions, categories, accounts, properties) {
  const list = document.getElementById('txList');
  const count = document.getElementById('txCount');
  
  if (!list) return;

  // Get sort option
  const sortSelect = document.getElementById('sortTransactions');
  const sortBy = sortSelect ? sortSelect.value : 'date-desc';

  // Sort transactions
  let sorted = [...transactions];
  switch (sortBy) {
    case 'date-desc':
      sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'date-asc':
      sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'amount-desc':
      sorted.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      break;
    case 'amount-asc':
      sorted.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
      break;
    case 'category-asc':
      sorted.sort((a, b) => {
        const catA = getCategoryDisplayName(a, categories);
        const catB = getCategoryDisplayName(b, categories);
        return catA.localeCompare(catB);
      });
      break;
    case 'category-desc':
      sorted.sort((a, b) => {
        const catA = getCategoryDisplayName(a, categories);
        const catB = getCategoryDisplayName(b, categories);
        return catB.localeCompare(catA);
      });
      break;
  }

  if (sorted.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p>No transactions found. ${Object.keys(currentFilter).length > 0 ? 'Try clearing filters.' : 'Add your first transaction!'}</p>
      </div>
    `;
    if (count) count.textContent = '0 transactions';
    return;
  }

  // Group by date
  const groups = {};
  sorted.forEach(t => {
    const date = t.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(t);
  });

  // Render groups
  let html = '';
  const dates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

  dates.forEach(date => {
    const dayTxs = groups[date];
    const total = dayTxs.reduce((sum, t) => sum + t.amount, 0);

    html += `
      <div class="transaction-day-group">
        <div class="transaction-date-header">
          <span>${formatDate(date)}</span>
          <span class="${total >= 0 ? "positive" : "negative"}">$${Math.abs(total).toFixed(2)}</span>
        </div>
        ${dayTxs.map(t => renderTransactionCard(t, categories, accounts, properties)).join('')}
      </div>
    `;
  });

  list.innerHTML = html;
  
  if (count) {
    count.textContent = `${sorted.length} transaction${sorted.length !== 1 ? 's' : ''}`;
  }

  // Attach event listeners to the new cards
  attachTransactionCardEvents();
}

// ============================================================================
// Render Single Transaction Card
// ============================================================================
function renderTransactionCard(tx, categories, accounts, properties) {
  const category = categories.find(c => c.id === tx.categoryId);
  const account = accounts.find(a => a.id === tx.accountId);
  const property = properties.find(p => p.id === tx.propertyId);
  const isIncome = tx.amount > 0;

  // Check if this transaction is being edited
  const isEditing = document.querySelector(`[data-transaction-id="${tx.id}"]`) !== null;

  if (isEditing) {
    // Return edit form instead of card
    return renderEditForm(tx, categories, accounts, properties);
  }

  const displayCategory = getCategoryDisplayName(tx, categories);
  const categoryIcon = category?.icon || (isIncome ? '💰' : '💸');

  return `
    <div class="transaction-card ${isIncome ? "income" : "expense"}" data-id="${tx.id}">
      <div class="transaction-main">
        <div class="transaction-icon">${categoryIcon}</div>
        <div class="transaction-details">
          <div class="transaction-title">${displayCategory}</div>
          ${tx.description ? `<div class="transaction-description">${tx.description}</div>` : ''}
          <div class="transaction-meta">
            <span>${account?.name || 'Unknown Account'}</span>
            ${property ? `<span class="property-tag">🏠 ${property.name}</span>` : ''}
            ${tx.bankCategory ? `<span class="bank-tag">🏦 ${tx.bankCategory}</span>` : ''}
          </div>
        </div>
        <div class="transaction-amount ${isIncome ? "positive" : "negative"}">
          ${isIncome ? "+" : "-"}$${Math.abs(tx.amount).toFixed(2)}
        </div>
      </div>
      <div class="transaction-actions">
        <button class="action-btn edit-btn" data-id="${tx.id}" title="Edit">✏️</button>
        <button class="action-btn delete-btn" data-id="${tx.id}" title="Delete">🗑️</button>
      </div>
    </div>
  `;
}

// ============================================================================
// Render Edit Form (INLINE)
// ============================================================================
function renderEditForm(tx, categories, accounts, properties) {
  const isIncome = tx.amount > 0;
  const mainCats = categories.filter(c => !c.parentId);
  const subCats = categories.filter(c => c.parentId);
  
  // Get current category info
  const currentCategory = categories.find(c => c.id === tx.categoryId);
  const currentMainCategory = currentCategory?.parentId ? 
    categories.find(c => c.id === currentCategory.parentId)?.id : 
    currentCategory?.id;
  
  // Get subcategories for current main category
  const relevantSubCats = currentMainCategory ? 
    subCats.filter(s => s.parentId === currentMainCategory) : [];

  return `
    <div class="transaction-card editing" data-transaction-id="${tx.id}">
      <div class="edit-form-header">
        <h4>✏️ Edit Transaction</h4>
        <button class="btn-close cancel-edit" data-id="${tx.id}">✕</button>
      </div>
      <form class="edit-transaction-form" data-id="${tx.id}">
        <div class="form-row">
          <select name="type" class="form-control" required>
            <option value="income" ${isIncome ? 'selected' : ''}>Income</option>
            <option value="expense" ${!isIncome ? 'selected' : ''}>Expense</option>
          </select>
          <input type="number" name="amount" class="form-control" 
                 value="${Math.abs(tx.amount)}" step="0.01" min="0.01" required>
          <input type="date" name="date" class="form-control" value="${tx.date}" required>
        </div>
        
        <div class="form-row">
          <select name="accountId" class="form-control" required>
            <option value="">Select Account</option>
            ${accounts.map(a => `
              <option value="${a.id}" ${a.id === tx.accountId ? 'selected' : ''}>
                ${a.name}
              </option>
            `).join('')}
          </select>
          <input type="text" name="description" class="form-control" 
                 value="${tx.description || ''}" placeholder="Description">
        </div>
        
        <div class="form-row">
          <select name="mainCategory" class="form-control main-category-select" required>
            <option value="">Select Category</option>
            ${mainCats.map(c => `
              <option value="${c.id}" ${c.id === currentMainCategory ? 'selected' : ''}>
                ${c.name}
              </option>
            `).join('')}
          </select>
          <select name="subCategory" class="form-control sub-category-select">
            <option value="">-- None --</option>
            ${relevantSubCats.map(s => `
              <option value="${s.id}" ${s.id === tx.categoryId ? 'selected' : ''}>
                ${s.name}
              </option>
            `).join('')}
          </select>
        </div>
        
        ${tx.isPropertyExpense || tx.propertyId ? `
          <div class="property-expense-section">
            <div class="form-row">
              <label class="checkbox-label">
                <input type="checkbox" name="isPropertyExpense" checked> Property Expense
              </label>
            </div>
            <div class="form-row">
              <select name="propertyId" class="form-control">
                <option value="">Select Property</option>
                ${properties.map(p => `
                  <option value="${p.id}" ${p.id === tx.propertyId ? 'selected' : ''}>
                    ${p.name}
                  </option>
                `).join('')}
              </select>
              <input type="text" name="expenseCategory" class="form-control" 
                     value="${tx.expenseCategory || ''}" placeholder="Expense Category">
            </div>
          </div>
        ` : ''}
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary save-edit">💾 Save</button>
          <button type="button" class="btn btn-secondary cancel-edit" data-id="${tx.id}">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

// ============================================================================
// Show Inline Transaction Form (for adding new)
// ============================================================================
function showInlineTransactionForm(prefill, categories, accounts, properties) {
  const mainCats = categories.filter(c => !c.parentId);
  
  // Remove any existing edit forms
  document.querySelectorAll('.transaction-card.editing').forEach(el => el.remove());
  
  // Remove any existing add form
  const existingAddForm = document.querySelector('.add-transaction-form');
  if (existingAddForm) {
    existingAddForm.parentElement.remove();
  }
  
  const formHtml = `
    <div class="transaction-card add-new">
      <div class="edit-form-header">
        <h4>➕ Add New Transaction</h4>
        <button class="btn-close cancel-add">✕</button>
      </div>
      <form class="add-transaction-form">
        <div class="form-row">
          <select name="type" class="form-control" required>
            <option value="income" ${prefill?.type === 'income' ? 'selected' : ''}>Income</option>
            <option value="expense" ${prefill?.type === 'expense' ? 'selected' : ''}>Expense</option>
          </select>
          <input type="number" name="amount" class="form-control" 
                 value="${prefill?.amount || ''}" step="0.01" min="0.01" placeholder="Amount" required>
          <input type="date" name="date" class="form-control" 
                 value="${prefill?.date || new Date().toISOString().split('T')[0]}" required>
        </div>
        
        <div class="form-row">
          <select name="accountId" class="form-control" required>
            <option value="">Select Account</option>
            ${accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
          </select>
          <input type="text" name="description" class="form-control" placeholder="Description">
        </div>
        
        <div class="form-row">
          <select name="mainCategory" class="form-control main-category-select" required>
            <option value="">Select Category</option>
            ${mainCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
          <select name="subCategory" class="form-control sub-category-select">
            <option value="">-- None --</option>
          </select>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">💾 Save Transaction</button>
          <button type="button" class="btn btn-secondary cancel-add">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  const txList = document.getElementById('txList');
  if (txList) {
    txList.insertAdjacentHTML('afterbegin', formHtml);
    
    // Scroll to form
    const formElement = document.querySelector('.add-transaction-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Setup event listeners for the new form
    setupAddFormListeners(categories);
  }
}

// ============================================================================
// Attach Event Listeners to Transaction Cards
// ============================================================================
function attachTransactionCardEvents() {
  // Edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const txId = btn.dataset.id;
      const tx = currentTransactions.find(t => t.id === txId);
      
      if (tx) {
        // Replace the card with edit form
        const card = btn.closest('.transaction-card');
        if (card) {
          const editForm = renderEditForm(tx, currentCategories, currentAccounts, currentProperties);
          card.outerHTML = editForm;
          
          // Setup event listeners for the edit form
          setupEditFormListeners();
        }
      }
    });
  });

  // Delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const txId = btn.dataset.id;
      
      if (confirm('Are you sure you want to delete this transaction?')) {
        try {
          await deleteItem(STORE_NAMES.transactions, txId);
          // Refresh the list
          await initTransactionsUI();
        } catch (error) {
          console.error('[TX] Failed to delete transaction:', error);
          alert('Failed to delete transaction. Please try again.');
        }
      }
    });
  });
}

// ============================================================================
// Setup Edit Form Listeners
// ============================================================================
function setupEditFormListeners() {
  // Cancel edit buttons
  document.querySelectorAll('.cancel-edit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const txId = btn.dataset.id;
      
      // Remove the edit form and re-render the card
      const editForm = document.querySelector(`[data-transaction-id="${txId}"]`);
      if (editForm) {
        editForm.remove();
        
        // Re-render the transaction list
        renderTransactionList(currentTransactions, currentCategories, currentAccounts, currentProperties);
      }
    });
  });

  // Category linking in edit forms
  document.querySelectorAll('.main-category-select').forEach(select => {
    select.addEventListener('change', function() {
      const parentId = this.value;
      const form = this.closest('form');
      const subSelect = form.querySelector('.sub-category-select');
      
      if (subSelect) {
        const subCats = currentCategories.filter(c => c.parentId === parentId);
        subSelect.innerHTML = `
          <option value="">-- None --</option>
          ${subCats.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        `;
      }
    });
  });

  // Edit form submission
  document.querySelectorAll('.edit-transaction-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const txId = form.dataset.id;
      const originalTx = currentTransactions.find(t => t.id === txId);
      
      if (!originalTx) return;
      
      const subCategory = formData.get('subCategory');
      const mainCategory = formData.get('mainCategory');
      const categoryId = subCategory || mainCategory;
      
      const updatedTx = {
        ...originalTx,
        type: formData.get('type'),
        amount: formData.get('type') === 'expense' ? 
          -Math.abs(parseFloat(formData.get('amount'))) : 
          Math.abs(parseFloat(formData.get('amount'))),
        date: formData.get('date'),
        accountId: formData.get('accountId'),
        description: formData.get('description') || '',
        categoryId: categoryId,
        isPropertyExpense: formData.get('isPropertyExpense') === 'on',
        propertyId: formData.get('propertyId') || null,
        expenseCategory: formData.get('expenseCategory') || null,
        updatedAt: new Date().toISOString()
      };

      try {
        await updateItem(STORE_NAMES.transactions, updatedTx);
        
        // Refresh the UI
        await initTransactionsUI();
      } catch (error) {
        console.error('[TX] Failed to update transaction:', error);
        alert('Failed to update transaction. Please try again.');
      }
    });
  });
}

// ============================================================================
// Setup Add Form Listeners
// ============================================================================
function setupAddFormListeners(categories) {
  // Cancel add button
  document.querySelectorAll('.cancel-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const addForm = document.querySelector('.add-transaction-form');
      if (addForm) {
        addForm.closest('.transaction-card').remove();
      }
    });
  });

  // Category linking in add form
  document.querySelectorAll('.main-category-select').forEach(select => {
    select.addEventListener('change', function() {
      const parentId = this.value;
      const form = this.closest('form');
      const subSelect = form.querySelector('.sub-category-select');
      
      if (subSelect) {
        const subCats = categories.filter(c => c.parentId === parentId);
        subSelect.innerHTML = `
          <option value="">-- None --</option>
          ${subCats.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        `;
      }
    });
  });

  // Add form submission
  document.querySelectorAll('.add-transaction-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const subCategory = formData.get('subCategory');
      const mainCategory = formData.get('mainCategory');
      const categoryId = subCategory || mainCategory;
      
      const newTx = {
        id: generateId(),
        type: formData.get('type'),
        amount: formData.get('type') === 'expense' ? 
          -Math.abs(parseFloat(formData.get('amount'))) : 
          Math.abs(parseFloat(formData.get('amount'))),
        date: formData.get('date'),
        accountId: formData.get('accountId'),
        description: formData.get('description') || '',
        categoryId: categoryId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await addItem(STORE_NAMES.transactions, newTx);
        
        // Refresh the UI
        await initTransactionsUI();
      } catch (error) {
        console.error('[TX] Failed to add transaction:', error);
        alert('Failed to add transaction. Please try again.');
      }
    });
  });
}

// ============================================================================
// Helper Functions
// ============================================================================
function getCategoryDisplayName(tx, categories) {
  if (tx.categoryId) {
    const cat = categories.find(c => c.id === tx.categoryId);
    if (cat) {
      if (cat.parentId) {
        const parent = categories.find(c => c.id === cat.parentId);
        return parent ? `${parent.name} › ${cat.name}` : cat.name;
      }
      return cat.name;
    }
  }

  if (tx.bankCategory) return tx.bankCategory;
  if (tx.description) return tx.description.substring(0, 30) + (tx.description.length > 30 ? '...' : '');
  
  return 'Uncategorized';
}

function formatDate(date) {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('en-AU', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return date;
  }
}

// ============================================================================
// Additional CSS for Inline Editing
// ============================================================================
const inlineEditCSS = `
  .transaction-card.editing {
    border: 2px solid #3b82f6;
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  }
  
  .transaction-card.add-new {
    border: 2px dashed #10b981;
    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  }
  
  .edit-form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid #e5e7eb;
  }
  
  .edit-form-header h4 {
    margin: 0;
    color: #1f2937;
    font-size: 1.2rem;
  }
  
  .property-expense-section {
    margin-top: 20px;
    padding: 15px;
    background: #f8fafc;
    border-radius: 10px;
    border-left: 4px solid #8b5cf6;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-weight: 500;
    color: #4b5563;
  }
  
  .checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
  
  .bank-tag {
    background: #dbeafe;
    color: #1e40af;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  
  .action-btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .action-btn.edit-btn {
    background: #3b82f6;
    color: white;
  }
  
  .action-btn.edit-btn:hover {
    background: #2563eb;
    transform: translateY(-2px);
  }
  
  .action-btn.delete-btn {
    background: #f3f4f6;
    color: #6b7280;
  }
  
  .action-btn.delete-btn:hover {
    background: #ef4444;
    color: white;
    transform: translateY(-2px);
  }
`;

// Inject the CSS
if (!document.querySelector('#inline-edit-css')) {
  const style = document.createElement('style');
  style.id = 'inline-edit-css';
  style.textContent = inlineEditCSS;
  document.head.appendChild(style);
}