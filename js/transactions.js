import { getAllItems, addItem, deleteItem, updateItem, STORE_NAMES, generateId } from './db.js';
import { PROPERTY_EXPENSE_CATEGORIES } from './propertyExpenseCategories.js';
import { DEFAULT_CATEGORIES } from './defaultCategories.js';

// Property expense categories list
const PROPERTY_EXPENSE_CATEGORIES_LIST = Object.keys(PROPERTY_EXPENSE_CATEGORIES);

export async function initTransactionsUI() {
  const mainContent = document.getElementById('mainContent');
  mainContent.classList.add('page-transition');

  const [categories, accounts, transactions, properties] = await Promise.all([
    getAllItems(STORE_NAMES.categories),
    getAllItems(STORE_NAMES.accounts),
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.properties || 'properties').catch(() => [])
  ]);

  const mainCats = categories.filter(c => !c.parentId);
  const subCats = categories.filter(c => c.parentId);
  const today = new Date().toISOString().split('T')[0];

  // Calculate summary stats
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netFlow = totalIncome - totalExpenses;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthTransactions = transactions.filter(t => t.date.startsWith(thisMonth));
  const thisMonthTotal = thisMonthTransactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>💸 Transactions</h2>
        <div class="page-actions">
          <button class="btn btn-primary" id="btnAddTx">➕ Add Transaction</button>
          <button class="btn btn-secondary" id="btnFilterTx">🔍 Filter</button>
          <button class="btn btn-secondary" id="btnExportTx">📤 Export</button>
          <button class="btn btn-success" id="btnSyncProperties" title="Sync all property expenses">
            🔄 Sync Property Expenses
          </button>
        </div>
      </div>

      <!-- Compact Summary Cards -->
      <div class="compact-summary-cards">
        <div class="compact-card ${netFlow >= 0 ? 'green' : 'red'}">
          <div class="compact-icon">💰</div>
          <div class="compact-content">
            <div class="compact-value">$${Math.abs(netFlow).toFixed(2)}</div>
            <div class="compact-label">${netFlow >= 0 ? 'Net Gain' : 'Net Loss'}</div>
          </div>
        </div>
        <div class="compact-card blue">
          <div class="compact-icon">📥</div>
          <div class="compact-content">
            <div class="compact-value">$${totalIncome.toFixed(2)}</div>
            <div class="compact-label">Total Income</div>
          </div>
        </div>
        <div class="compact-card teal">
          <div class="compact-icon">📤</div>
          <div class="compact-content">
            <div class="compact-value">$${totalExpenses.toFixed(2)}</div>
            <div class="compact-label">Total Expenses</div>
          </div>
        </div>
        <div class="compact-card ${thisMonthTotal >= 0 ? 'green' : 'orange'}">
          <div class="compact-icon">📅</div>
          <div class="compact-content">
            <div class="compact-value">$${Math.abs(thisMonthTotal).toFixed(2)}</div>
            <div class="compact-label">This Month</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions Bar -->
      <div class="quick-actions">
        <button class="quick-action-btn" data-amount="-50" data-category="Food">
          <span class="quick-icon">🍕</span>
          <span class="quick-label">Food $50</span>
        </button>
        <button class="quick-action-btn" data-amount="-100" data-category="Shopping">
          <span class="quick-icon">🛍️</span>
          <span class="quick-label">Shopping $100</span>
        </button>
        <button class="quick-action-btn" data-amount="2000" data-category="Salary">
          <span class="quick-icon">💵</span>
          <span class="quick-label">Salary $2000</span>
        </button>
        <button class="quick-action-btn" data-amount="-500" data-category="Property" onclick="showPropertyExpenseForm()">
          <span class="quick-icon">🏠</span>
          <span class="quick-label">Property $500</span>
        </button>
      </div>

      <!-- Forms Section -->
      <div class="forms-section">
        <div id="addTxForm" class="section-card form-section" style="display: none;">
          <div class="form-header">
            <h3>➕ Add New Transaction</h3>
            <button class="btn btn-text" id="closeAddForm">✕</button>
          </div>
          <form id="txForm" class="styled-form" data-id="">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Type</label>
                <select name="type" class="form-select" required onchange="togglePropertyExpenseFields()">
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
                  <option value="">-- Select Account --</option>
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

            <div class="form-group">
              <label class="form-label">Description (Optional)</label>
              <input type="text" name="description" class="form-input" placeholder="e.g., Groceries at Coles, Dinner out...">
              <small class="form-hint">Add specific details about this transaction</small>
            </div>

            <!-- Property Expense Section -->
            <div id="propertyExpenseSection" style="margin-top: 1.5rem; padding: 1.5rem; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; border: 2px solid #0ea5e9; display: none;">
              <h4 style="margin-top: 0; margin-bottom: 1rem; color: #0369a1; display: flex; align-items: center; gap: 0.5rem;">
                <span>🏠 Property Expense Details</span>
                <span style="font-size: 0.875rem; background: #0ea5e9; color: white; padding: 2px 8px; border-radius: 12px;">ATO Deductible</span>
              </h4>
              
              <div class="form-group">
                <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                  <input type="checkbox" id="isPropertyExpense" name="isPropertyExpense" style="transform: scale(1.2);">
                  <span style="font-weight: 600; color: #1e40af;">📍 Mark as Property Expense</span>
                  <span style="font-size: 0.875rem; color: #64748b;">(Will sync to Expenses & Tax pages)</span>
                </label>
              </div>
              
              <div id="propertyExpenseFields" style="display: none; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px dashed #cbd5e0;">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">
                      <span style="display: flex; align-items: center; gap: 0.25rem;">
                        🏘️ Property
                        <span class="form-required">*</span>
                      </span>
                    </label>
                    <select name="propertyId" class="form-select" required>
                      <option value="">-- Select Property --</option>
                      ${properties.map(p => `
                        <option value="${p.id}" data-type="${p.propertyType || 'primary'}">
                          ${p.name} (${getPropertyTypeLabel(p.propertyType)})
                        </option>
                      `).join('')}
                    </select>
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label">
                      <span style="display: flex; align-items: center; gap: 0.25rem;">
                        📊 ATO Expense Category
                        <span class="form-required">*</span>
                      </span>
                      <small class="form-hint">Select the ATO category for tax deduction</small>
                    </label>
                    <select name="expenseCategory" class="form-select" onchange="updatePropertyExpenseCategory(this)" required>
                      <option value="">-- Select ATO Category --</option>
                      ${PROPERTY_EXPENSE_CATEGORIES_LIST.map(cat => {
                        const config = PROPERTY_EXPENSE_CATEGORIES[cat];
                        return `
                          <option value="${cat}" 
                                  data-deductible="${config.deductible}"
                                  data-type="${config.type}"
                                  data-default-category="${config.defaultCategoryId || ''}"
                                  style="${config.deductible ? 'color: #059669;' : 'color: #dc2626;'}">
                            ${config.deductible ? '✓' : '✗'} ${cat} (${config.type})
                          </option>
                        `;
                      }).join('')}
                    </select>
                    <div id="categoryTaxInfo" style="margin-top: 0.5rem; font-size: 0.875rem; padding: 0.5rem; border-radius: 6px; display: none;"></div>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">📝 Expense Status</label>
                    <select name="expenseStatus" class="form-select">
                      <option value="Paid">✅ Paid</option>
                      <option value="Unpaid">⏳ Unpaid</option>
                      <option value="Reimbursed">💸 Reimbursed</option>
                      <option value="Claimed">📋 Tax Claimed</option>
                    </select>
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label">
                      <span style="display: flex; align-items: center; gap: 0.25rem;">
                        🧾 Receipt/Invoice
                        <span style="font-size: 0.75rem; color: #64748b;">(optional)</span>
                      </span>
                    </label>
                    <div style="display: flex; gap: 0.5rem;">
                      <input type="url" name="receiptUrl" class="form-input" placeholder="https://... or file path">
                      <button type="button" class="btn btn-secondary" style="white-space: nowrap;" onclick="openFilePicker()">
                        📁 Browse
                      </button>
                    </div>
                  </div>
                </div>
                
                <div class="form-group">
                  <label class="form-label">
                    <span style="display: flex; align-items: center; gap: 0.25rem;">
                      📝 Notes
                      <span style="font-size: 0.75rem; color: #64748b;">(for tax records)</span>
                    </span>
                  </label>
                  <textarea name="expenseNotes" class="form-input" rows="2" placeholder="Details for tax deduction claim..."></textarea>
                </div>
                
                <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; color: #065f46;">
                    <span>✅</span>
                    <div>
                      <strong>ATO Tax Deductible Expense</strong>
                      <div style="font-size: 0.875rem; color: #047857;">
                        This expense will automatically appear in:
                        <ul style="margin: 0.25rem 0 0 1rem; padding: 0;">
                          <li>Property Expenses page</li>
                          <li>Tax Compliance reports</li>
                          <li>Annual tax deduction summary</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button class="btn btn-primary" type="submit">💾 Save Transaction</button>
              <button class="btn btn-secondary" type="reset">🧹 Clear</button>
            </div>
          </form>
        </div>

        <div id="filterTxForm" class="section-card form-section" style="display: none;">
          <div class="form-header">
            <h3>🔍 Filter Transactions</h3>
            <button class="btn btn-text" id="closeFilterForm">✕</button>
          </div>
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
                <label class="form-label">Account</label>
                <select name="accountId" class="form-select">
                  <option value="">All Accounts</option>
                  ${accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Main Category</label>
                <select name="mainCategoryId" class="form-select">
                  <option value="">All Categories</option>
                  ${mainCats.map(c => `<option value="${c.id}">${c.icon || '📁'} ${c.name}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Subcategory</label>
                <select name="subCategoryId" class="form-select">
                  <option value="">All Subcategories</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Property Expense?</label>
                <select name="isPropertyExpense" class="form-select">
                  <option value="">All</option>
                  <option value="yes">Property Expenses Only</option>
                  <option value="no">Non-Property Expenses Only</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Property</label>
                <select name="propertyId" class="form-select">
                  <option value="">All Properties</option>
                  ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Date Range</label>
                <div class="date-range">
                  <input type="date" name="from" class="form-input" placeholder="From">
                  <span class="date-separator">to</span>
                  <input type="date" name="to" class="form-input" placeholder="To" value="${today}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Amount Range</label>
                <div class="amount-range">
                  <input type="number" name="minAmount" class="form-input" placeholder="Min" step="0.01">
                  <span class="range-separator">to</span>
                  <input type="number" name="maxAmount" class="form-input" placeholder="Max" step="0.01">
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button class="btn btn-primary" type="submit">🔍 Apply Filters</button>
              <button class="btn btn-secondary" type="button" id="clearFilters">🗑️ Clear All</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Transactions List -->
      <div class="section-card">
        <div class="transactions-header">
          <h3>Recent Transactions</h3>
          <div class="transactions-controls">
            <span class="transactions-count" id="txCount">${transactions.length} transactions</span>
            <select id="sortTransactions" class="form-select">
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>
        <div id="txList"></div>
      </div>
    </div>

    <style>
      .transaction-card.property-linked {
        border-left: 4px solid #3B82F6;
        background: linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%);
      }
      
      .property-badge {
        background: #3B82F6;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        margin-left: 8px;
        vertical-align: middle;
      }
      
      .expense-category-badge {
        background: #10B981;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        margin-right: 8px;
      }
      
      .property-indicator {
        font-size: 0.875rem;
        margin-left: 4px;
        opacity: 0.7;
      }
      
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 1rem;
        max-width: 350px;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        animation: slideIn 0.3s ease;
      }
      
      .notification.success {
        border-left: 4px solid #10B981;
      }
      
      .notification.error {
        border-left: 4px solid #EF4444;
      }
      
      .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .notification-close {
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0.5;
        margin-left: 1rem;
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      .fade-out {
        animation: fadeOut 0.3s ease forwards;
      }
      
      @keyframes fadeOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
      }
    </style>
  `;

  setTimeout(() => mainContent.classList.remove('page-transition'), 400);

  // Initialize
  let currentFilters = {};
  renderTransactions(transactions, categories, accounts, properties, currentFilters);

  // === DOM Elements ===
  const btnAddTx = document.getElementById('btnAddTx');
  const btnFilterTx = document.getElementById('btnFilterTx');
  const btnSyncProperties = document.getElementById('btnSyncProperties');
  const addTxForm = document.getElementById('addTxForm');
  const filterTxForm = document.getElementById('filterTxForm');
  const closeAddForm = document.getElementById('closeAddForm');
  const closeFilterForm = document.getElementById('closeFilterForm');
  const clearFilters = document.getElementById('clearFilters');
  const sortSelect = document.getElementById('sortTransactions');
  const formsSection = document.querySelector('.forms-section');
  const isPropertyExpenseCheckbox = document.getElementById('isPropertyExpense');

  // === Form Toggle Logic ===
  function showAddForm(positionAfterElement = null) {
    // If we have a specific position, move the form there
    if (positionAfterElement) {
      positionAfterElement.insertAdjacentElement('afterend', addTxForm);
    } else {
      // Otherwise put it back in the forms section (for new transactions)
      if (formsSection && !formsSection.contains(addTxForm)) {
        formsSection.appendChild(addTxForm);
      }
    }
    
    addTxForm.style.display = 'block';
    filterTxForm.style.display = 'none';
    btnAddTx.classList.add('active');
    btnFilterTx.classList.remove('active');
    
    // Scroll to form if it's not in view
    setTimeout(() => {
      addTxForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  function showFilterForm() {
    filterTxForm.style.display = 'block';
    addTxForm.style.display = 'none';
    btnFilterTx.classList.add('active');
    btnAddTx.classList.remove('active');
    
    // Scroll to filter form
    setTimeout(() => {
      filterTxForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  function hideAllForms() {
    addTxForm.style.display = 'none';
    filterTxForm.style.display = 'none';
    btnAddTx.classList.remove('active');
    btnFilterTx.classList.remove('active');
    
    // Reset form position back to forms section
    if (formsSection && !formsSection.contains(addTxForm)) {
      formsSection.appendChild(addTxForm);
    }
  }

  // Event Listeners
  btnAddTx.addEventListener('click', () => {
    if (addTxForm.style.display === 'none') {
      showAddForm(); // Show at default position for new transactions
    } else {
      hideAllForms();
    }
  });

  btnFilterTx.addEventListener('click', () => {
    if (filterTxForm.style.display === 'none') {
      showFilterForm();
    } else {
      hideAllForms();
    }
  });

  btnSyncProperties.addEventListener('click', async () => {
    const result = await syncAllPropertyExpenses();
    showNotification(result.message, 'success');
    initTransactionsUI();
  });

  closeAddForm.addEventListener('click', hideAllForms);
  closeFilterForm.addEventListener('click', hideAllForms);

  // Quick Actions
  document.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showAddForm();
      const txForm = document.getElementById('txForm');
      txForm.type.value = btn.dataset.amount > 0 ? 'income' : 'expense';
      txForm.amount.value = Math.abs(parseFloat(btn.dataset.amount));
    });
  });

  // Toggle Property Expense Fields
  if (isPropertyExpenseCheckbox) {
    isPropertyExpenseCheckbox.addEventListener('change', function() {
      const propertyFields = document.getElementById('propertyExpenseFields');
      const propertySection = document.getElementById('propertyExpenseSection');
      propertyFields.style.display = this.checked ? 'block' : 'none';
      
      if (this.checked) {
        propertySection.style.borderColor = '#10B981';
        propertySection.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
      } else {
        propertySection.style.borderColor = '#0ea5e9';
        propertySection.style.background = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)';
      }
    });
  }

  // Toggle Property Expense Section based on transaction type
  window.togglePropertyExpenseFields = function() {
    const typeSelect = document.querySelector('[name="type"]');
    const propertySection = document.getElementById('propertyExpenseSection');
    
    if (typeSelect.value === 'expense') {
      propertySection.style.display = 'block';
    } else {
      propertySection.style.display = 'none';
      if (isPropertyExpenseCheckbox) {
        isPropertyExpenseCheckbox.checked = false;
        document.getElementById('propertyExpenseFields').style.display = 'none';
      }
    }
  };
  
  // Initialize property expense section
  setTimeout(() => {
    window.togglePropertyExpenseFields();
  }, 100);

  // Category Linking
  setupCategoryLinking();

  // Form Submissions
  setupFormHandlers(properties);

  // Sorting
  sortSelect.addEventListener('change', () => {
    renderTransactions(transactions, categories, accounts, properties, currentFilters);
  });

  // Clear Filters
  clearFilters.addEventListener('click', () => {
    document.getElementById('filterForm').reset();
    currentFilters = {};
    renderTransactions(transactions, categories, accounts, properties, currentFilters);
  });

  // Initialize global functions
  initializeGlobalFunctions();

  function setupCategoryLinking() {
    const mainSelect = document.getElementById('mainCategory');
    const subSelect = document.getElementById('subCategory');
    const filterMain = document.querySelector('#filterForm [name="mainCategoryId"]');
    const filterSub = document.querySelector('#filterForm [name="subCategoryId"]');

    function updateSubcategories(mainSelect, subSelect) {
      const parentId = mainSelect.value;
      const filteredSubs = subCats.filter(s => s.parentId === parentId);
      subSelect.innerHTML = `<option value="">-- None --</option>` +
        filteredSubs.map(s => `<option value="${s.id}">${s.icon || '📄'} ${s.name}</option>`).join('');
    }

    mainSelect.addEventListener('change', () => updateSubcategories(mainSelect, subSelect));
    filterMain.addEventListener('change', () => updateSubcategories(filterMain, filterSub));
    
    // Initialize subcategories
    updateSubcategories(mainSelect, subSelect);
    updateSubcategories(filterMain, filterSub);
  }

  function setupFormHandlers(properties) {
    const txForm = document.getElementById('txForm');
    const filterForm = document.getElementById('filterForm');

    txForm.addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      const mainSelect = document.getElementById('mainCategory');
      const subSelect = document.getElementById('subCategory');
      const chosenCategoryId = subSelect.value || mainSelect.value;

      if (!chosenCategoryId) {
        alert('Please select a category.');
        return;
      }

      const txData = {
        id: form.dataset.id || generateId(),
        type: form.type.value,
        amount: parseFloat(form.amount.value) * (form.type.value === 'expense' ? -1 : 1),
        date: form.date.value,
        categoryId: chosenCategoryId,
        accountId: form.accountId.value,
        description: form.description.value.trim(),
        // Property expense fields
        propertyId: form.propertyId ? form.propertyId.value : null,
        isPropertyExpense: form.isPropertyExpense ? form.isPropertyExpense.checked : false,
        expenseCategory: form.expenseCategory ? form.expenseCategory.value : null,
        expenseStatus: form.expenseStatus ? form.expenseStatus.value : 'Paid',
        receiptUrl: form.receiptUrl ? form.receiptUrl.value : '',
        notes: form.expenseNotes ? form.expenseNotes.value : '',
        createdAt: form.dataset.id ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        if (form.dataset.id) {
          await updateItem(STORE_NAMES.transactions, txData);
        } else {
          await addItem(STORE_NAMES.transactions, txData);
        }

        // 🔄 AUTO-SYNC TO EXPENSES
        await syncTransactionToExpenses(txData);

        hideAllForms();
        form.reset();
        form.dataset.id = '';
        
        // Show success notification
        const syncMessage = txData.isPropertyExpense ? 
          'Transaction saved and synced to Property Expenses!' : 
          'Transaction saved successfully!';
        showNotification(syncMessage, 'success');
        
        // Refresh UI
        initTransactionsUI();
      } catch (error) {
        showNotification('Error saving transaction: ' + error.message, 'error');
      }
    });

    filterForm.addEventListener('submit', e => {
      e.preventDefault();
      const data = new FormData(e.target);
      currentFilters = Object.fromEntries(data.entries());
      renderTransactions(transactions, categories, accounts, properties, currentFilters);
      hideAllForms();
    });
  }

  function initializeGlobalFunctions() {
    window.getPropertyTypeLabel = function(type) {
      const labels = {
        'primary': 'Primary Residence',
        'investment': 'Investment',
        'vacation': 'Vacation',
        'commercial': 'Commercial'
      };
      return labels[type] || type;
    };

    window.updatePropertyExpenseCategory = function(select) {
      const selectedOption = select.options[select.selectedIndex];
      const defaultCategoryId = selectedOption.getAttribute('data-default-category');
      
      if (defaultCategoryId) {
        const mainSelect = document.getElementById('mainCategory');
        const subSelect = document.getElementById('subCategory');
        
        // Find if this is a main or subcategory
        const isMainCategory = DEFAULT_CATEGORIES.find(c => c.id === defaultCategoryId && !c.parentId);
        const isSubCategory = DEFAULT_CATEGORIES.find(c => c.id === defaultCategoryId && c.parentId);
        
        if (isMainCategory) {
          mainSelect.value = defaultCategoryId;
          mainSelect.dispatchEvent(new Event('change'));
          subSelect.value = '';
        } else if (isSubCategory) {
          const parentCategory = DEFAULT_CATEGORIES.find(c => c.id === isSubCategory.parentId);
          if (parentCategory) {
            mainSelect.value = parentCategory.id;
            mainSelect.dispatchEvent(new Event('change'));
            
            // Wait for subcategories to populate
            setTimeout(() => {
              subSelect.value = defaultCategoryId;
            }, 100);
          }
        }
      }
      
      // Update tax info display
      updateCategoryTaxInfo(select);
    };

    window.updateCategoryTaxInfo = function(select) {
      const infoDiv = document.getElementById('categoryTaxInfo');
      const selectedOption = select.options[select.selectedIndex];
      const deductible = selectedOption.getAttribute('data-deductible') === 'true';
      const type = selectedOption.getAttribute('data-type');
      
      if (select.value) {
        infoDiv.style.display = 'block';
        infoDiv.style.background = deductible ? '#d1fae5' : '#fef3c7';
        infoDiv.style.color = deductible ? '#065f46' : '#92400e';
        infoDiv.style.border = deductible ? '1px solid #10b981' : '1px solid #f59e0b';
        
        infoDiv.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <strong>${deductible ? '✓ TAX DEDUCTIBLE' : '⚠️ NOT TAX DEDUCTIBLE'}</strong>
            <span style="font-size: 0.75rem; background: ${deductible ? '#10b981' : '#f59e0b'}; color: white; padding: 2px 6px; border-radius: 10px;">
              ${type.toUpperCase()}
            </span>
          </div>
          ${deductible ? 
            '<div style="font-size: 0.875rem; margin-top: 0.25rem;">Claimable on your tax return</div>' :
            '<div style="font-size: 0.875rem; margin-top: 0.25rem;">Capital expense - not immediately deductible</div>'
          }
        `;
      } else {
        infoDiv.style.display = 'none';
      }
    };

    window.showPropertyExpenseForm = function() {
      showAddForm();
      const txForm = document.getElementById('txForm');
      txForm.type.value = 'expense';
      document.getElementById('isPropertyExpense').checked = true;
      document.getElementById('propertyExpenseFields').style.display = 'block';
      
      // Update the property expense section styling
      const propertySection = document.getElementById('propertyExpenseSection');
      propertySection.style.borderColor = '#10B981';
      propertySection.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
    };

    window.openFilePicker = function() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.pdf,.doc,.docx';
      input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
          const receiptUrl = URL.createObjectURL(file);
          document.querySelector('[name="receiptUrl"]').value = receiptUrl;
          showNotification('File attached successfully!', 'success');
        }
      };
      input.click();
    };

    // Initialize category tax info listener
    const expenseCategorySelect = document.querySelector('[name="expenseCategory"]');
    if (expenseCategorySelect) {
      expenseCategorySelect.addEventListener('change', function() {
        window.updateCategoryTaxInfo(this);
      });
    }
  }

  function renderTransactions(transactions, categories, accounts, properties, filters = {}) {
    const txList = document.getElementById('txList');
    const txCount = document.getElementById('txCount');
    let filtered = [...transactions];

    // Apply filters
    if (filters.type) filtered = filtered.filter(t => t.type === filters.type);
    if (filters.accountId) filtered = filtered.filter(t => t.accountId === filters.accountId);
    if (filters.mainCategoryId) {
      const allSubIds = categories.filter(c => c.parentId === filters.mainCategoryId).map(c => c.id);
      filtered = filtered.filter(t => t.categoryId === filters.mainCategoryId || allSubIds.includes(t.categoryId));
    }
    if (filters.subCategoryId) filtered = filtered.filter(t => t.categoryId === filters.subCategoryId);
    if (filters.from) filtered = filtered.filter(t => t.date >= filters.from);
    if (filters.to) filtered = filtered.filter(t => t.date <= filters.to);
    if (filters.minAmount) filtered = filtered.filter(t => Math.abs(t.amount) >= parseFloat(filters.minAmount));
    if (filters.maxAmount) filtered = filtered.filter(t => Math.abs(t.amount) <= parseFloat(filters.maxAmount));
    if (filters.propertyId) filtered = filtered.filter(t => t.propertyId === filters.propertyId);
    if (filters.isPropertyExpense === 'yes') filtered = filtered.filter(t => t.isPropertyExpense);
    if (filters.isPropertyExpense === 'no') filtered = filtered.filter(t => !t.isPropertyExpense);

    // Apply sorting
    const sortBy = document.getElementById('sortTransactions').value;
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc': return a.date.localeCompare(b.date);
        case 'date-desc': return b.date.localeCompare(a.date);
        case 'amount-asc': return Math.abs(a.amount) - Math.abs(b.amount);
        case 'amount-desc': return Math.abs(b.amount) - Math.abs(a.amount);
        default: return b.date.localeCompare(a.date);
      }
    });

    // Update count
    txCount.textContent = `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      txList.innerHTML = `
        <div class="empty-state">
          <p>No transactions found.</p>
          ${Object.keys(filters).length > 0 ? 
            '<button class="btn btn-secondary" onclick="document.getElementById(\'clearFilters\').click()">Clear Filters</button>' : 
            '<button class="btn btn-primary" onclick="document.getElementById(\'btnAddTx\').click()">Add Your First Transaction</button>'
          }
        </div>
      `;
      return;
    }

    // Group by date
    const grouped = groupTransactionsByDate(filtered);
    
    txList.innerHTML = Object.entries(grouped).map(([date, txs]) => `
      <div class="transaction-day-group">
        <div class="transaction-date-header">
          <span class="date-label">${formatDateDisplay(date)}</span>
          <span class="day-total ${txs.reduce((sum, t) => sum + t.amount, 0) >= 0 ? 'positive' : 'negative'}">
            $${Math.abs(txs.reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
          </span>
        </div>
        <div class="transactions-list">
          ${txs.map(tx => renderTransactionCard(tx, categories, accounts, properties)).join('')}
        </div>
      </div>
    `).join('');

    attachTransactionEventListeners(properties, categories, accounts, transactions);
  }

  function groupTransactionsByDate(transactions) {
    const groups = {};
    transactions.forEach(tx => {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });
    return groups;
  }

  function renderTransactionCard(tx, categories, accounts, properties) {
    const category = categories.find(c => c.id === tx.categoryId);
    const account = accounts.find(a => a.id === tx.accountId);
    const property = properties.find(p => p.id === tx.propertyId);
    const isIncome = tx.amount > 0;
    
    // Get main category (if this is a subcategory, find its parent)
    const mainCategory = category?.parentId ? 
      categories.find(c => c.id === category.parentId) : category;
    
    // Get subcategory name (if this is a subcategory)
    const subCategory = category?.parentId ? category : null;
    
    // Check if it's linked to maintenance
    const isMaintenanceLinked = tx.maintenanceId ? '🔗' : '';

    return `
      <div class="transaction-card ${isIncome ? 'income' : 'expense'} ${tx.isPropertyExpense ? 'property-linked' : ''}" data-id="${tx.id}">
        <div class="transaction-main">
          <div class="transaction-icon">
            ${tx.isPropertyExpense ? '🏠' : (mainCategory?.icon || (isIncome ? '💰' : '💸'))}
            ${isMaintenanceLinked}
          </div>
          <div class="transaction-details">
            <div class="transaction-title">
              ${mainCategory?.name || 'Unknown Category'}
              ${tx.isPropertyExpense ? '<span class="property-badge">🏠 Property</span>' : ''}
            </div>
            <div class="transaction-meta">
              ${subCategory ? `<span class="transaction-subcategory">${subCategory.name}</span>` : ''}
              ${tx.propertyId ? `<span class="property-name">${property?.name || 'Property'}</span>` : ''}
              <span class="transaction-account">${account?.name || 'Unknown Account'}</span>
              ${tx.expenseCategory ? `<span class="expense-category-badge">${tx.expenseCategory}</span>` : ''}
            </div>
            ${tx.description ? `<div class="transaction-description">${tx.description}</div>` : ''}
          </div>
          <div class="transaction-amount ${isIncome ? 'positive' : 'negative'}">
            ${isIncome ? '+' : '-'}$${Math.abs(tx.amount).toFixed(2)}
            ${tx.isPropertyExpense ? '<span class="property-indicator" title="Synced to Property Expenses">🏠</span>' : ''}
          </div>
        </div>
        <div class="transaction-actions">
          ${tx.isPropertyExpense ? `
            <button class="action-btn view-property" data-property-id="${tx.propertyId}" title="View Property">
              🏠
            </button>
          ` : ''}
          <button class="action-btn edit-btn" data-id="${tx.id}" title="Edit">✏️</button>
          <button class="action-btn delete-btn" data-id="${tx.id}" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }

  function attachTransactionEventListeners(properties, categories, accounts, transactions) {
    // Edit transaction
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const txId = btn.dataset.id;
        const txToEdit = transactions.find(tx => tx.id === txId);
        if (!txToEdit) return;

        const txForm = document.getElementById('txForm');
        const mainSelect = document.getElementById('mainCategory');
        const subSelect = document.getElementById('subCategory');

        // Find the category and its parent
        const category = categories.find(c => c.id === txToEdit.categoryId);
        const mainCategoryId = category?.parentId || txToEdit.categoryId;

        txForm.dataset.id = txToEdit.id;
        txForm.type.value = txToEdit.amount > 0 ? 'income' : 'expense';
        txForm.amount.value = Math.abs(txToEdit.amount);
        txForm.date.value = txToEdit.date;
        txForm.accountId.value = txToEdit.accountId;
        txForm.description.value = txToEdit.description || '';
        
        // Property expense fields
        if (txToEdit.isPropertyExpense) {
          document.getElementById('isPropertyExpense').checked = true;
          document.getElementById('propertyExpenseFields').style.display = 'block';
          if (txToEdit.propertyId) txForm.propertyId.value = txToEdit.propertyId;
          if (txToEdit.expenseCategory) txForm.expenseCategory.value = txToEdit.expenseCategory;
          if (txToEdit.expenseStatus) txForm.expenseStatus.value = txToEdit.expenseStatus;
          if (txToEdit.receiptUrl) txForm.receiptUrl.value = txToEdit.receiptUrl;
          if (txToEdit.notes) txForm.expenseNotes.value = txToEdit.notes;
          
          // Update the property expense section styling
          const propertySection = document.getElementById('propertyExpenseSection');
          propertySection.style.borderColor = '#10B981';
          propertySection.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
        }

        // Set main category and trigger subcategory update
        mainSelect.value = mainCategoryId;
        mainSelect.dispatchEvent(new Event('change'));
        
        // Set subcategory after a brief delay to ensure options are populated
        setTimeout(() => {
          if (category?.parentId) {
            subSelect.value = txToEdit.categoryId;
          }
        }, 100);

        // Get the transaction card and show form below it
        const transactionCard = btn.closest('.transaction-card');
        showAddForm(transactionCard);
      });
    });

    // Delete transaction
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this transaction? This will also remove any linked property expense records.')) {
          // First, check if it's a property expense and delete the linked expense
          const txId = btn.dataset.id;
          const txToDelete = transactions.find(tx => tx.id === txId);
          
          if (txToDelete?.isPropertyExpense) {
            try {
              await deleteLinkedExpense(txId);
            } catch (error) {
              console.error('Error deleting linked expense:', error);
            }
          }
          
          await deleteItem(STORE_NAMES.transactions, btn.dataset.id);
          showNotification('Transaction deleted successfully!', 'success');
          initTransactionsUI();
        }
      });
    });

    // View property button
    document.querySelectorAll('.view-property').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const propertyId = btn.dataset.propertyId;
        if (propertyId) {
          // This would navigate to the property page
          // For now, just show a message
          showNotification(`Viewing property: ${properties.find(p => p.id === propertyId)?.name || 'Property'}`, 'info');
        }
      });
    });
  }

  function formatDateDisplay(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}

// ============================================================================
// 🔄 Enhanced Sync Function with Category Mapping
// ============================================================================
async function syncTransactionToExpenses(transaction) {
  try {
    const expenses = await getAllItems(STORE_NAMES.expenses || 'expenses').catch(() => []);
    const categories = await getAllItems(STORE_NAMES.categories);
    
    // Find the corresponding category
    const category = categories.find(c => c.id === transaction.categoryId);
    const categoryName = category?.name || 'Other';
    
    // Check if expense already exists
    let existingExpense = expenses.find(e => e.transactionId === transaction.id);
    
    // If transaction is no longer a property expense but expense exists, delete it
    if (!transaction.isPropertyExpense && existingExpense) {
      await deleteItem(STORE_NAMES.expenses || 'expenses', existingExpense.id);
      console.log('🗑️ Deleted expense as transaction is no longer property-related');
      return null;
    }
    
    // Only create/update if it's a property expense
    if (transaction.isPropertyExpense && transaction.propertyId) {
      // Map to property expense category
      const propertyExpenseCategory = transaction.expenseCategory || 'Other';
      const categoryConfig = PROPERTY_EXPENSE_CATEGORIES[propertyExpenseCategory] || PROPERTY_EXPENSE_CATEGORIES.Other;
      
      const expenseData = {
        id: existingExpense ? existingExpense.id : generateId(),
        transactionId: transaction.id,
        propertyId: transaction.propertyId,
        category: propertyExpenseCategory,
        categoryConfig: categoryConfig,
        description: transaction.description || `${propertyExpenseCategory} - ${categoryName}`,
        amount: Math.abs(transaction.amount),
        date: transaction.date,
        status: transaction.expenseStatus || 'Paid',
        receiptUrl: transaction.receiptUrl || '',
        notes: transaction.notes || '',
        taxDeductible: categoryConfig.deductible,
        type: categoryConfig.type,
        recurring: false,
        frequency: 'monthly',
        nextDue: transaction.date,
        createdAt: existingExpense ? existingExpense.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (existingExpense) {
        await updateItem(STORE_NAMES.expenses || 'expenses', expenseData);
        console.log('✅ Updated existing expense:', expenseData.id);
      } else {
        await addItem(STORE_NAMES.expenses || 'expenses', expenseData);
        console.log('✅ Created new expense from transaction:', expenseData.id);
      }
      
      // Also sync to tax compliance data
      await syncToTaxCompliance(expenseData);
      
      return expenseData;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error syncing to expenses:', error);
    throw error;
  }
}

// ============================================================================
// 📊 Tax Compliance Integration Function
// ============================================================================
async function syncToTaxCompliance(expenseData) {
  try {
    const taxRecords = await getAllItems('tax_records').catch(() => []);
    const existingRecord = taxRecords.find(r => r.expenseId === expenseData.id);
    
    const taxRecord = {
      id: existingRecord?.id || generateId(),
      expenseId: expenseData.id,
      transactionId: expenseData.transactionId,
      propertyId: expenseData.propertyId,
      category: expenseData.category,
      amount: expenseData.amount,
      date: expenseData.date,
      taxDeductible: expenseData.taxDeductible,
      type: expenseData.type,
      financialYear: getFinancialYear(expenseData.date),
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (existingRecord) {
      await updateItem('tax_records', taxRecord);
    } else {
      await addItem('tax_records', taxRecord);
    }
    
    console.log('📊 Tax compliance record updated:', taxRecord.id);
    return taxRecord;
  } catch (error) {
    console.error('❌ Error syncing to tax compliance:', error);
    return null;
  }
}

function getFinancialYear(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  // Australian financial year: July 1 to June 30
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

// ============================================================================
// 🗑️ Delete Linked Expense Function
// ============================================================================
async function deleteLinkedExpense(transactionId) {
  try {
    const expenses = await getAllItems(STORE_NAMES.expenses || 'expenses').catch(() => []);
    const linkedExpense = expenses.find(e => e.transactionId === transactionId);
    
    if (linkedExpense) {
      await deleteItem(STORE_NAMES.expenses || 'expenses', linkedExpense.id);
      console.log('🗑️ Deleted linked expense:', linkedExpense.id);
      
      // Also delete tax record if exists
      const taxRecords = await getAllItems('tax_records').catch(() => []);
      const linkedTaxRecord = taxRecords.find(r => r.transactionId === transactionId);
      if (linkedTaxRecord) {
        await deleteItem('tax_records', linkedTaxRecord.id);
        console.log('🗑️ Deleted linked tax record:', linkedTaxRecord.id);
      }
    }
  } catch (error) {
    console.error('❌ Error deleting linked expense:', error);
    throw error;
  }
}

// ============================================================================
// 📢 Notification System
// ============================================================================
function showNotification(message, type = 'info') {
  // Remove any existing notifications
  document.querySelectorAll('.notification').forEach(n => n.remove());
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} 
      ${message}
    </div>
    <button class="notification-close">✕</button>
  `;
  
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

// ============================================================================
// 🔄 Sync All Property Transactions to Expenses
// ============================================================================
export async function syncAllPropertyExpenses() {
  try {
    const [transactions, expenses] = await Promise.all([
      getAllItems(STORE_NAMES.transactions),
      getAllItems(STORE_NAMES.expenses || 'expenses').catch(() => [])
    ]);
    
    // Find property transactions without matching expenses
    const propertyTransactions = transactions.filter(t => 
      t.type === 'expense' && t.propertyId && !t.isPropertyExpense
    );
    
    const unsyncedTransactions = propertyTransactions.filter(t => 
      !expenses.find(e => e.transactionId === t.id)
    );
    
    if (unsyncedTransactions.length === 0) {
      return { synced: 0, total: 0, message: 'All property expenses are already synced!' };
    }
    
    let syncedCount = 0;
    for (const transaction of unsyncedTransactions) {
      try {
        // Update transaction to mark as property expense
        const updatedTx = {
          ...transaction,
          isPropertyExpense: true,
          expenseCategory: transaction.expenseCategory || 'Other',
          expenseStatus: 'Paid'
        };
        
        await updateItem(STORE_NAMES.transactions, updatedTx);
        await syncTransactionToExpenses(updatedTx);
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync transaction ${transaction.id}:`, error);
      }
    }
    
    return { 
      synced: syncedCount, 
      total: unsyncedTransactions.length, 
      message: `Synced ${syncedCount} property expenses from transactions!` 
    };
  } catch (error) {
    console.error('❌ Error syncing all property expenses:', error);
    throw error;
  }
}

// Make sync function globally available
window.syncAllPropertyExpenses = syncAllPropertyExpenses;
window.showNotification = showNotification;