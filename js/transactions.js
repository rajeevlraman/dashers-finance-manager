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
          <button class="btn btn-warning" id="btnSyncPropertyExpenses">🏠 Sync Property Expenses</button>
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

      <!-- Sync Status -->
      <div id="syncStatus" style="display: none;" class="sync-status">
        <div class="sync-message"></div>
        <div class="sync-progress"></div>
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

  // Sync button
  const syncBtn = document.getElementById('btnSyncPropertyExpenses');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      await syncAllPropertyExpenses();
    });
  }

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

// Export button
// Replace your export button event listener with this:
const btnExportTx = document.getElementById('btnExportTx');
if (btnExportTx) {
  btnExportTx.addEventListener('click', () => {
    if (confirm('Export all transactions to CSV file?')) {
      handleExport();
    }
  });
}

// Then add this function:
async function handleExport() {
  try {
    // Show loading
    const btn = document.getElementById('btnExportTx');
    const originalText = btn.innerHTML;
    btn.innerHTML = '📤 Exporting...';
    btn.disabled = true;
    
    // Get transactions
    const transactions = currentTransactions;
    
    if (!transactions.length) {
      alert('No transactions to export!');
      return;
    }
    
    // Simple CSV export
    const csv = convertToCSV(transactions);
    
    // Create download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    // Show success message
    alert(`✅ Exported ${transactions.length} transactions successfully!`);
    
  } catch (error) {
    console.error('Export failed:', error);
    alert('❌ Export failed. Please try again.');
  } finally {
    // Reset button
    const btn = document.getElementById('btnExportTx');
    btn.innerHTML = '📤 Export';
    btn.disabled = false;
  }
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

  // Check if already synced to expenses
  const isSynced = tx.isPropertyExpense && tx.propertyId;

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
            ${isSynced ? `<span class="synced-tag">✅ Synced</span>` : ''}
          </div>
          ${tx.expenseCategory ? `<div class="expense-category">📁 ${tx.expenseCategory}</div>` : ''}
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
        
        <div class="property-expense-section">
          <div class="form-row">
            <label class="checkbox-label">
              <input type="checkbox" name="isPropertyExpense" ${tx.isPropertyExpense ? 'checked' : ''}> Property Expense
            </label>
          </div>
          <div id="propertyExpenseFields" style="${tx.isPropertyExpense ? 'display: block;' : 'display: none;'}">
            <div class="form-row">
              <select name="propertyId" class="form-control">
                <option value="">Select Property</option>
                ${properties.map(p => `
                  <option value="${p.id}" ${p.id === tx.propertyId ? 'selected' : ''}>
                    ${p.name}
                  </option>
                `).join('')}
              </select>
              <select name="expenseCategory" class="form-control">
                <option value="">Expense Category</option>
                <option value="Mortgage" ${tx.expenseCategory === 'Mortgage' ? 'selected' : ''}>Mortgage</option>
                <option value="Rates" ${tx.expenseCategory === 'Rates' ? 'selected' : ''}>Rates</option>
                <option value="Insurance" ${tx.expenseCategory === 'Insurance' ? 'selected' : ''}>Insurance</option>
                <option value="Repairs" ${tx.expenseCategory === 'Repairs' ? 'selected' : ''}>Repairs</option>
                <option value="Maintenance" ${tx.expenseCategory === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                <option value="Utilities" ${tx.expenseCategory === 'Utilities' ? 'selected' : ''}>Utilities</option>
                <option value="Other" ${tx.expenseCategory === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div class="form-row">
              <input type="text" name="receiptUrl" class="form-control" 
                     value="${tx.receiptUrl || ''}" placeholder="Receipt URL">
              <textarea name="notes" class="form-control" placeholder="Notes" rows="2">${tx.notes || ''}</textarea>
            </div>
          </div>
        </div>
        
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
        
        <div class="property-expense-section">
          <div class="form-row">
            <label class="checkbox-label">
              <input type="checkbox" name="isPropertyExpense"> Property Expense
            </label>
          </div>
          <div id="addPropertyExpenseFields" style="display: none;">
            <div class="form-row">
              <select name="propertyId" class="form-control">
                <option value="">Select Property</option>
                ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
              </select>
              <select name="expenseCategory" class="form-control">
                <option value="">Expense Category</option>
                <option value="Mortgage">Mortgage</option>
                <option value="Rates">Rates</option>
                <option value="Insurance">Insurance</option>
                <option value="Repairs">Repairs</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Utilities">Utilities</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-row">
              <input type="text" name="receiptUrl" class="form-control" placeholder="Receipt URL">
              <textarea name="notes" class="form-control" placeholder="Notes" rows="2"></textarea>
            </div>
          </div>
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
    setupAddFormListeners(categories, properties);
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

  // Property expense toggle
  document.querySelectorAll('input[name="isPropertyExpense"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const form = this.closest('form');
      const propertyFields = form.querySelector('#propertyExpenseFields');
      if (propertyFields) {
        propertyFields.style.display = this.checked ? 'block' : 'none';
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
      const isPropertyExpense = formData.get('isPropertyExpense') === 'on';
      
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
        isPropertyExpense: isPropertyExpense,
        propertyId: isPropertyExpense ? formData.get('propertyId') : null,
        expenseCategory: isPropertyExpense ? formData.get('expenseCategory') : null,
        receiptUrl: isPropertyExpense ? formData.get('receiptUrl') : null,
        notes: isPropertyExpense ? formData.get('notes') : null,
        updatedAt: new Date().toISOString()
      };

      try {
        await updateItem(STORE_NAMES.transactions, updatedTx);
        
        // Sync to expenses if it's a property expense
        if (isPropertyExpense && updatedTx.propertyId) {
          await syncToExpenses(updatedTx);
        }
        
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
function setupAddFormListeners(categories, properties) {
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

  // Property expense toggle in add form
  document.querySelectorAll('input[name="isPropertyExpense"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const form = this.closest('form');
      const propertyFields = form.querySelector('#addPropertyExpenseFields');
      if (propertyFields) {
        propertyFields.style.display = this.checked ? 'block' : 'none';
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
      const isPropertyExpense = formData.get('isPropertyExpense') === 'on';
      
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
        isPropertyExpense: isPropertyExpense,
        propertyId: isPropertyExpense ? formData.get('propertyId') : null,
        expenseCategory: isPropertyExpense ? formData.get('expenseCategory') : null,
        receiptUrl: isPropertyExpense ? formData.get('receiptUrl') : null,
        notes: isPropertyExpense ? formData.get('notes') : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await addItem(STORE_NAMES.transactions, newTx);
        
        // Sync to expenses if it's a property expense
        if (isPropertyExpense && newTx.propertyId) {
          await syncToExpenses(newTx);
        }
        
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
// SYNC FUNCTIONS
// ============================================================================

// 🏠 SYNC: Push Property-Related Transactions → Expenses Store
async function syncToExpenses(transaction) {
  try {
    const expenses = await getAllItems(STORE_NAMES.expenses).catch(() => []);

    const existingExpense = expenses.find(e => e.transactionId === transaction.id);

    const expenseData = {
      id: existingExpense ? existingExpense.id : generateId(),
      transactionId: transaction.id,
      propertyId: transaction.propertyId || "",
      category: transaction.expenseCategory || "Other",
      description: transaction.description || "Property Expense",
      amount: Math.abs(transaction.amount),
      date: transaction.date,
      status: "Paid",
      receiptUrl: transaction.receiptUrl || "",
      notes: transaction.notes || "",
      taxDeductible: true,
      recurring: false,
      frequency: "monthly",
      nextDue: transaction.date,
      createdAt: existingExpense ? existingExpense.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingExpense) {
      await updateItem(STORE_NAMES.expenses, expenseData);
    } else {
      await addItem(STORE_NAMES.expenses, expenseData);
    }

    console.log(`✅ Synced transaction ${transaction.id} to expenses`);
    return expenseData;
  } catch (err) {
    console.error("❌ syncToExpenses() failed:", err);
    throw err;
  }
}

// 🔄 SYNC ALL: Ensure all property expenses appear in Expenses page
export async function syncAllPropertyExpenses() {
  try {
    showSyncStatus("🔄 Syncing property expenses...", "loading");
    
    const [transactions, expenses] = await Promise.all([
      getAllItems(STORE_NAMES.transactions),
      getAllItems(STORE_NAMES.expenses).catch(() => [])
    ]);

    // Look for transactions marked as property expense
    const propertyTransactions = transactions.filter(
      t => t.type === "expense" && t.isPropertyExpense && t.propertyId
    );

    // Filter out ones already synced
    const unsynced = propertyTransactions.filter(
      t => !expenses.find(e => e.transactionId === t.id)
    );

    if (unsynced.length === 0) {
      showSyncStatus("✅ All property expenses are already synced!", "success");
      setTimeout(() => hideSyncStatus(), 3000);
      return {
        synced: 0,
        total: 0,
        message: "All property expenses are already synced!"
      };
    }

    showSyncStatus(`📊 Found ${unsynced.length} unsynced property expenses...`, "loading");

    let syncedCount = 0;
    let errors = [];

    for (const tx of unsynced) {
      try {
        await syncToExpenses(tx);
        syncedCount++;
        
        // Update progress
        const progress = Math.round((syncedCount / unsynced.length) * 100);
        showSyncStatus(`🔄 Syncing ${syncedCount}/${unsynced.length} (${progress}%)...`, "loading");
      } catch (syncErr) {
        console.error(`❌ Failed to sync transaction ${tx.id}`, syncErr);
        errors.push(tx.id);
      }
    }

    const result = {
      synced: syncedCount,
      total: unsynced.length,
      errors: errors.length,
      message: errors.length > 0 
        ? `Synced ${syncedCount} new property expenses. ${errors.length} failed.`
        : `✅ Successfully synced ${syncedCount} property expenses!`
    };

    showSyncStatus(result.message, errors.length > 0 ? "error" : "success");
    
    // Refresh UI after sync
    setTimeout(async () => {
      hideSyncStatus();
      await initTransactionsUI();
    }, 3000);

    return result;

  } catch (err) {
    console.error("❌ syncAllPropertyExpenses() error:", err);
    showSyncStatus("❌ Sync failed due to an unexpected error", "error");
    setTimeout(() => hideSyncStatus(), 3000);
    
    return {
      synced: 0,
      total: 0,
      errors: 1,
      message: "Sync failed due to an unexpected error."
    };
  }
}

// ============================================================================
// Sync Status UI Functions
// ============================================================================
function showSyncStatus(message, type = "loading") {
  const statusEl = document.getElementById('syncStatus');
  const messageEl = statusEl?.querySelector('.sync-message');
  
  if (statusEl && messageEl) {
    statusEl.style.display = 'block';
    messageEl.textContent = message;
    statusEl.className = `sync-status ${type}`;
  }
}

function hideSyncStatus() {
  const statusEl = document.getElementById('syncStatus');
  if (statusEl) {
    statusEl.style.display = 'none';
  }
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

// ============================================================================
//  EXPORT FUNCTIONALITY
// ============================================================================

async function setupExportFunctionality() {
  const exportBtn = document.getElementById('btnExportTx');
  
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        // Show loading state
        exportBtn.innerHTML = '📤 Exporting...';
        exportBtn.disabled = true;
        
        // Get current filtered transactions
        let transactions = [...currentTransactions];
        
        // Apply current filters
        if (Object.keys(currentFilter).length > 0) {
          transactions = applyFiltersToArray(transactions);
        }
        
        if (transactions.length === 0) {
          alert('No transactions to export!');
          return;
        }
        
        // Prepare data for export
        const exportData = await prepareExportData(transactions);
        
        // Create and download CSV
        downloadCSV(exportData, 'transactions_export');
        
        // Show success message
        showNotification(`✅ Exported ${transactions.length} transactions successfully!`, 'success');
        
      } catch (error) {
        console.error('[TX] Export failed:', error);
        showNotification('❌ Export failed. Please try again.', 'error');
      } finally {
        // Reset button
        exportBtn.innerHTML = '📤 Export';
        exportBtn.disabled = false;
      }
    });
  }
}

// Apply filters to array (same logic as applyFilters)
function applyFiltersToArray(transactions) {
  let filtered = [...transactions];
  
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
        return category.parentId === mainCategoryId;
      } else {
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
  
  return filtered;
}

// Prepare data for export
async function prepareExportData(transactions) {
  const accounts = await getAllItems(STORE_NAMES.accounts);
  const categories = await getAllItems(STORE_NAMES.categories);
  const properties = await getAllItems(STORE_NAMES.properties).catch(() => []);
  
  return transactions.map(tx => {
    const account = accounts.find(a => a.id === tx.accountId);
    const category = categories.find(c => c.id === tx.categoryId);
    const property = properties.find(p => p.id === tx.propertyId);
    
    // Get full category name
    let categoryName = 'Uncategorized';
    if (category) {
      if (category.parentId) {
        const parent = categories.find(c => c.id === category.parentId);
        categoryName = parent ? `${parent.name} > ${category.name}` : category.name;
      } else {
        categoryName = category.name;
      }
    }
    
    return {
      'Date': tx.date,
      'Type': tx.amount > 0 ? 'Income' : 'Expense',
      'Amount': Math.abs(tx.amount).toFixed(2),
      'Account': account?.name || 'Unknown',
      'Description': tx.description || '',
      'Category': categoryName,
      'Bank Category': tx.bankCategory || '',
      'Property': property?.name || '',
      'Property Expense': tx.isPropertyExpense ? 'Yes' : 'No',
      'Expense Category': tx.expenseCategory || '',
      'Status': tx.expenseStatus || 'Paid',
      'Receipt URL': tx.receiptUrl || '',
      'Notes': tx.notes || '',
      'Transaction ID': tx.id,
      'Created': tx.createdAt || '',
      'Updated': tx.updatedAt || ''
    };
  });
}

// Download as CSV
function downloadCSV(data, filename) {
  if (!data.length) return;
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const cell = row[header];
        // Escape commas and quotes
        return typeof cell === 'string' 
          ? `"${cell.replace(/"/g, '""')}"`
          : cell;
      }).join(',')
    )
  ].join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Show notification
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existing = document.querySelector('.tx-notification');
  if (existing) existing.remove();
  
  // Create notification
  const notification = document.createElement('div');
  notification.className = `tx-notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-message">${message}</span>
      <button class="notification-close">✕</button>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
  
  // Close button
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.remove();
  });
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

