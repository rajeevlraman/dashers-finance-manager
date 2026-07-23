import { getAllItems, addItem, deleteItem, updateItem, STORE_NAMES, generateId } from './db.js';
import { escapeHtml } from './sanitize.js';
// Remove this import if it's causing issues
// import { PROPERTY_EXPENSE_CATEGORIES } from './propertyExpenseCategories.js';
import { DEFAULT_CATEGORIES } from './defaultCategories.js';
import { initImportModal } from './import/modal.js';
import { saveImportedTransactions } from './import/saver.js';
import { parseCSVFile, parseStatementText } from './import/parser.js';
import { getMerchantLogo } from './import/merchantLogos.js';
import { learnFromManualCategory } from './import/categoryMapper.js';

// ============================================================================
//  Transactions UI Initialization (FIXED VERSION)
// ============================================================================

// Define property expense categories locally if import fails
const PROPERTY_EXPENSE_CATEGORIES = [
  "Mortgage", "Rates", "Insurance", "Repairs", "Maintenance",
  "Utilities", "Strata Fees", "Property Management", "Advertising",
  "Legal Fees", "Council Rates", "Water Rates", "Gardening",
  "Cleaning", "Security", "Other"
];

export async function initTransactionsUI() {

  const mainContent = document.getElementById('mainContent');
  if (!mainContent) {
    console.error("[TX] mainContent element not found!");
    return;
  }
  
  mainContent.classList.add('page-transition');

  const [categories, accounts, transactions, properties] = await Promise.all([
    getAllItems(STORE_NAMES.categories),
    getAllItems(STORE_NAMES.accounts),
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.properties).catch(() => [])
  ]);

  const mainCats = categories.filter(c => !c.parentId);
  const subCats = categories.filter(c => c.parentId);
  const today = new Date().toISOString().split("T")[0];

  // Summary calculations
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  // totalExpenses is already negative (expense amounts are stored negative),
  // so net flow is the sum, not income minus expenses.
  const netFlow = totalIncome + totalExpenses;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthTotal = transactions
    .filter(t => t.date.startsWith(thisMonth))
    .reduce((s, t) => s + (t.amount || 0), 0);

  // ========================================================================
  // HTML Rendering (COMPLETE with all required elements)
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

      <!-- Transaction Form -->
      <div id="addTxForm" style="display: none;" class="section-card">
        <div class="form-header">
          <h3>Add Transaction</h3>
          <button id="closeAddForm" class="btn-close">✕</button>
        </div>
        <form id="txForm" class="styled-form">
          <div class="form-row">
            <div class="form-group">
              <label>Type</label>
              <select name="type" id="txType" class="form-select" onchange="togglePropertyExpenseFields()">
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div class="form-group">
              <label>Amount</label>
              <input type="number" name="amount" class="form-input" placeholder="0.00" step="0.01" required>
            </div>
            <div class="form-group">
              <label>Date</label>
              <input type="date" name="date" class="form-input" value="${today}" required>
            </div>
            <div class="form-group">
              <label>Account</label>
              <select name="accountId" class="form-select" required>
                <option value="">Select Account</option>
                ${accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Description</label>
              <input type="text" name="description" class="form-input" placeholder="e.g. Woolworths">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category</label>
              <select id="mainCategory" name="mainCategory" class="form-select" required>
                <option value="">Select Category</option>
                ${mainCats.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Subcategory</label>
              <select id="subCategory" name="subCategory" class="form-select">
                <option value="">-- None --</option>
              </select>
            </div>
          </div>
          
          <!-- Property Expense Section -->
          <div id="propertyExpenseSection" style="display: none;">
            <div class="form-row">
              <label class="checkbox-label">
                <input type="checkbox" id="isPropertyExpense" onchange="togglePropertyExpenseCheckbox()">
                Property Expense
              </label>
            </div>
            <div id="propertyExpenseFields" style="display: none;">
              <div class="form-row">
                <div class="form-group">
                  <label>Property</label>
                  <select name="propertyId" class="form-select">
                    <option value="">Select Property</option>
                    ${properties.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Expense Category</label>
                  <select name="expenseCategory" class="form-select">
                    <option value="">Expense Category</option>
                    ${PROPERTY_EXPENSE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Status</label>
                  <select name="expenseStatus" class="form-select">
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Due">Due</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Receipt URL</label>
                  <input type="text" name="receiptUrl" class="form-input" placeholder="Receipt URL">
                </div>
                <div class="form-group">
                  <label>Notes</label>
                  <textarea name="expenseNotes" class="form-input" placeholder="Notes" rows="2"></textarea>
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save Transaction</button>
          </div>
        </form>
      </div>

      <!-- Filter Form -->
      <div id="filterTxForm" style="display: none;" class="section-card">
        <div class="form-header">
          <h3>Filter Transactions</h3>
          <button id="closeFilterForm" class="btn-close">✕</button>
        </div>
        <form id="filterForm" class="styled-form">
          <div class="form-row">
            <div class="form-group">
              <label>Type</label>
              <select name="type" class="form-select">
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div class="form-group">
              <label>Account</label>
              <select name="accountId" class="form-select">
                <option value="">All Accounts</option>
                ${accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category</label>
              <select name="mainCategory" class="form-select">
                <option value="">All Categories</option>
                ${mainCats.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Subcategory</label>
              <select name="subCategory" class="form-select">
                <option value="">All Subcategories</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Start Date</label>
              <input type="date" name="startDate" class="form-input">
            </div>
            <div class="form-group">
              <label>End Date</label>
              <input type="date" name="endDate" class="form-input">
            </div>
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
            <input type="search" id="txSearchInput" class="form-input tx-search-input"
              placeholder="🔍 Search description, category, account…" autocomplete="off">
            <span id="txCount">${transactions.length} transactions</span>
            <select id="sortTransactions" class="form-select">
              <option value="date-desc">Newest</option>
              <option value="date-asc">Oldest</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>
        <div id="txFilteredSummary" class="tx-filtered-summary"></div>
        <div id="txList"></div>
      </div>

    </div>
  `;

  // ========================================================================
  // ✔ FIX: Initialize Import Modal
  // ========================================================================
  setTimeout(() => {
    
    // Check if button exists before initializing
    const importBtn = document.getElementById("btnImportTx");
    if (importBtn) {
      initImportModal({
        accounts,
        categories,
        onImported: async (savedCount) => {
          await initTransactionsUI(); // reload transactions UI
        }
      });
    } else {
      console.warn("[IMPORT] btnImportTx not found in DOM");
    }
  }, 100);

  // ========================================================================
  // UI + Event setup (WITH SAFETY CHECKS)
  // ========================================================================
  setupCategoryLinking(categories, subCats);
  setupFormHandlers(categories, accounts, properties, transactions);
  applyFiltersAndRender(transactions, categories, accounts, properties);

  // SAFE event listener attachment
  safeAddEventListener("btnAddTx", "click", toggleAddForm);
  safeAddEventListener("btnFilterTx", "click", toggleFilterForm);
  safeAddEventListener("closeAddForm", "click", hideForms);
  safeAddEventListener("closeFilterForm", "click", hideForms);
  safeAddEventListener("clearFilters", "click", clearFilterForm);
  
  const sortSelect = document.getElementById("sortTransactions");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      applyFiltersAndRender(transactions, categories, accounts, properties);
    });
  }

  // Live search — filters as you type, combined with whatever the
  // filter panel currently has set.
  const searchInput = document.getElementById("txSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      applyFiltersAndRender(transactions, categories, accounts, properties);
    });
  }

  // Quick action buttons
  document.querySelectorAll(".quick-action-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      toggleAddForm();
      const amountInput = document.querySelector("#txForm [name='amount']");
      const typeSelect = document.querySelector("#txForm [name='type']");
      if (amountInput && typeSelect) {
        amountInput.value = Math.abs(btn.dataset.amount);
        typeSelect.value = btn.dataset.amount > 0 ? "income" : "expense";
        togglePropertyExpenseFields();
      }
    });
  });

  // Initialize property expense toggle
  togglePropertyExpenseFields();

  setTimeout(() => mainContent.classList.remove("page-transition"), 300);

  // ========================================================================
// ✔ FIX: Initialize Import Modal
// ========================================================================
// In transactions.js, replace the setTimeout section with this:

// ========================================================================
// Initialize Import Modal
// ========================================================================
setTimeout(() => {
  
  const importBtn = document.getElementById("btnImportTx");
  if (importBtn) {
    
    // Remove any existing event listeners by cloning
    const newBtn = importBtn.cloneNode(true);
    importBtn.parentNode.replaceChild(newBtn, importBtn);
    
    try {
      // Initialize the modal
      initImportModal({
        accounts,
        categories,
        onImported: async (savedCount) => {
          await initTransactionsUI(); // Refresh the view
        }
      });
    } catch (error) {
      console.error("[TX] Failed to initialize import modal:", error);
      
      // Fallback simple handler
      newBtn.addEventListener("click", () => {
        alert("Import feature is currently unavailable. Please check console for errors.");
      });
    }
  } else {
    console.error("[TX] Import button not found!");
  }
}, 200);
}

// ============================================================================
// Helper: Safe Event Listener
// ============================================================================
function safeAddEventListener(id, event, handler) {
  const element = document.getElementById(id);
  if (element) {
    element.addEventListener(event, handler);
  } else {
    console.warn(`[TX] Element #${id} not found for event ${event}`);
  }
}

// ============================================================================
// Category Linking (FIXED)
// ============================================================================
function setupCategoryLinking(categories, subCats) {
  const mainSelect = document.getElementById("mainCategory");
  const subSelect = document.getElementById("subCategory");
  const filterMain = document.querySelector("#filterForm [name='mainCategory']");
  const filterSub = document.querySelector("#filterForm [name='subCategory']");

  // 🔥 FIXED: Added comprehensive safety checks
  const missingElements = [];
  if (!mainSelect) missingElements.push("mainCategory");
  if (!subSelect) missingElements.push("subCategory");
  if (!filterMain) missingElements.push("filterForm [name='mainCategory']");
  if (!filterSub) missingElements.push("filterForm [name='subCategory']");

  if (missingElements.length > 0) {
    console.warn("[TX] Category linking skipped — missing elements:", missingElements);
    return;
  }

  function updateSubs(source, target) {
    const parentId = source.value;
    const subs = subCats.filter(s => s.parentId === parentId);
    target.innerHTML =
      `<option value="">-- None --</option>` +
      subs.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
  }

  mainSelect.addEventListener("change", () => updateSubs(mainSelect, subSelect));
  filterMain.addEventListener("change", () => updateSubs(filterMain, filterSub));

  // Initial update
  updateSubs(mainSelect, subSelect);
  updateSubs(filterMain, filterSub);

}

//fix for editing-
function rebuildSubcategoriesForEdit(mainCategoryId, subCats) {
  const subSelect = document.getElementById("subCategory");
  if (!subSelect) return;

  const subs = subCats.filter(s => s.parentId === mainCategoryId);

  subSelect.innerHTML =
    `<option value="">-- None --</option>` +
    subs.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
}

// ============================================================================
// Form Handlers (FIXED with safety checks)
// ============================================================================
function setupFormHandlers(categories, accounts, properties, transactions) {
  const txForm = document.getElementById("txForm");
  const filterForm = document.getElementById("filterForm");

  if (!txForm) {
    console.warn("[TX] Transaction form not found");
    return;
  }

  txForm.addEventListener("submit", async e => {
    e.preventDefault();

    const mainCat = document.getElementById("mainCategory");
    const subCat = document.getElementById("subCategory");
    const chosenCategory = subCat.value || mainCat.value;

    const tx = {
      id: txForm.dataset.id || generateId(),
      type: txForm.type.value,
      amount: (txForm.type.value === "expense" ? -1 : 1) * parseFloat(txForm.amount.value),
      date: txForm.date.value,
      accountId: txForm.accountId.value,
      description: txForm.description.value || "",
      categoryId: chosenCategory,
      createdAt: txForm.dataset.id ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Property Expense
    const isProp = document.getElementById("isPropertyExpense").checked;
    tx.isPropertyExpense = isProp;
    if (isProp) {
      tx.propertyId = txForm.propertyId.value;
      tx.expenseCategory = txForm.expenseCategory.value;
      tx.expenseStatus = txForm.expenseStatus.value;
      tx.receiptUrl = txForm.receiptUrl.value;
      tx.notes = txForm.expenseNotes.value;
    }

    try {
      // Bug fix: manual category choices never fed back into the
      // auto-learning system (learnFromManualCategory existed but was
      // never called anywhere) — the more you corrected categories by
      // hand, the smarter future imports were supposed to get, but that
      // loop was disconnected. tx.merchant is populated by the parser at
      // import time; for manually-entered transactions it'll be undefined
      // and learnFromManualCategory() falls back to the description.
      if (chosenCategory) {
        learnFromManualCategory(tx, chosenCategory);
      }

      if (txForm.dataset.id) {
        await updateItem(STORE_NAMES.transactions, tx);
      } else {
        await addItem(STORE_NAMES.transactions, tx);
      }

      // Sync property expenses if needed
      if (isProp) {
        await syncToExpenses(tx);
      }

      hideForms();
      initTransactionsUI();
    } catch (error) {
      console.error("[TX] Failed to save transaction:", error);
      alert("Failed to save transaction. Please try again.");
    }
  });

  if (filterForm) {
    filterForm.addEventListener("submit", e => {
      e.preventDefault();
      applyFiltersAndRender(transactions, categories, accounts, properties);
      hideForms();
    });
  }
}

// ============================================================================
// Filtering (search box + filter panel)
// ------------------------------------------------------------------------
// Previously the filter form's submit handler only called preventDefault()
// and logged to the console — "Apply filters logic here" was left as a
// comment and nothing ever actually filtered the list. These two functions
// are the real implementation, shared by the filter panel, the sort
// dropdown, and the new search box so all three combine correctly.
// ============================================================================
function getFilteredTransactions(transactions, categories, accounts) {
  const filterForm = document.getElementById("filterForm");
  const searchInput = document.getElementById("txSearchInput");
  const searchTerm = (searchInput?.value || "").trim().toLowerCase();

  let type = "", accountId = "", mainCategory = "", subCategory = "", startDate = "", endDate = "";
  if (filterForm) {
    type = filterForm.type.value;
    accountId = filterForm.accountId.value;
    mainCategory = filterForm.mainCategory.value;
    subCategory = filterForm.subCategory.value;
    startDate = filterForm.startDate.value;
    endDate = filterForm.endDate.value;
  }

  return transactions.filter(tx => {
    if (type && tx.type !== type) return false;
    if (accountId && tx.accountId !== accountId) return false;
    if (startDate && tx.date < startDate) return false;
    if (endDate && tx.date > endDate) return false;

    if (subCategory) {
      if (tx.categoryId !== subCategory) return false;
    } else if (mainCategory) {
      const cat = categories.find(c => c.id === tx.categoryId);
      const belongsToMain = tx.categoryId === mainCategory || (cat && cat.parentId === mainCategory);
      if (!belongsToMain) return false;
    }

    if (searchTerm) {
      const cat = categories.find(c => c.id === tx.categoryId);
      const account = accounts.find(a => a.id === tx.accountId);
      const haystack = [
        tx.description,
        cat?.name,
        tx.bankCategory,
        tx.merchant,
        tx.notes,
        account?.name,
        String(Math.abs(tx.amount || 0))
      ].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(searchTerm)) return false;
    }

    return true;
  });
}

function applyFiltersAndRender(transactions, categories, accounts, properties) {
  const filtered = getFilteredTransactions(transactions, categories, accounts);
  const isFiltered = filtered.length !== transactions.length;

  const txCountEl = document.getElementById("txCount");
  if (txCountEl) {
    txCountEl.textContent = isFiltered
      ? `${filtered.length} of ${transactions.length} transactions`
      : `${transactions.length} transactions`;
  }

  // Totals for whatever is currently on screen — the full list when no
  // search/filter is active, or just the matching subset when one is. This
  // intentionally does NOT touch the summary cards at the top of the page
  // (Total Income / Total Expenses / Net Flow / This Month) — those are
  // meant to stay fixed, overall reference numbers regardless of what
  // you're searching for in the list below.
  const summaryEl = document.getElementById("txFilteredSummary");
  if (summaryEl) {
    const income = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const net = income + expenses;

    summaryEl.innerHTML = `
      <span class="tx-filtered-label">${isFiltered ? "Showing" : "Total"}:</span>
      <span class="positive">Income $${income.toFixed(2)}</span>
      <span class="negative">Expenses $${Math.abs(expenses).toFixed(2)}</span>
      <span class="${net >= 0 ? "positive" : "negative"}">Net $${Math.abs(net).toFixed(2)}</span>
    `;
  }

  renderTransactions(filtered, categories, accounts, properties);
}

// ============================================================================
// Transactions Renderer
// ============================================================================
function renderTransactions(transactions, categories, accounts, properties) {
  const list = document.getElementById("txList");
  if (!list) {
    console.warn("[TX] txList element not found");
    return;
  }

  const sortSelect = document.getElementById("sortTransactions");
  const sort = sortSelect ? sortSelect.value : "date-desc";

  let txs = [...transactions];

  if (sort === "date-desc") txs.sort((a, b) => b.date.localeCompare(a.date));
  if (sort === "date-asc") txs.sort((a, b) => a.date.localeCompare(b.date));
  if (sort === "amount-desc") txs.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  if (sort === "amount-asc") txs.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));

  if (txs.length === 0) {
    list.innerHTML = `<div class="empty-state">No transactions found. Add your first transaction!</div>`;
    return;
  }

  const groups = {};
  txs.forEach(t => (groups[t.date] = groups[t.date] || []).push(t));

  list.innerHTML = Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map(date => {
      const dayTxs = groups[date];
      const total = dayTxs.reduce((sum, t) => sum + t.amount, 0);

      return `
        <div class="transaction-day-group">
          <div class="transaction-date-header">
            <span>${formatDate(date)}</span>
            <span class="${total >= 0 ? "positive" : "negative"}">$${Math.abs(total).toFixed(2)}</span>
          </div>
          ${dayTxs.map(t => renderTransactionCard(t, categories, accounts, properties)).join("")}
        </div>
      `;
    })
    .join("");

  attachTxEvents(txs, categories, accounts, properties);
}

// ============================================================================
// Smart Category Name Resolver
// ============================================================================
function getCategoryDisplayName(tx, categories) {

  // 1️⃣ Internal category match via categoryId
  if (tx.categoryId) {
    const cat = categories.find(c => c.id === tx.categoryId);
    if (cat) return cat.name;
  }

  // 2️⃣ NAB/Bank-provided category
  if (tx.bankCategory && tx.bankCategory.trim() !== "") {
    return tx.bankCategory;
  }

  // 3️⃣ Cleaned keyword text extracted from description
  if (tx.categoryText && tx.categoryText.trim() !== "") {
    return tx.categoryText;
  }

  // 4️⃣ Merchant name
  if (tx.merchant && tx.merchant.trim() !== "") {
    return tx.merchant;
  }

  // 5️⃣ Fallback
  return "Uncategorized";
}

function renderTransactionCard(tx, categories, accounts, properties) {
  const category = categories.find(c => c.id === tx.categoryId);
  const account = accounts.find(a => a.id === tx.accountId);
  const property = properties.find(p => p.id === tx.propertyId);
  const isIncome = tx.amount > 0;

  // Show bank category if no category assigned
  const displayCategory = getFullCategoryName(tx.categoryId, categories);
  const displayName = displayCategory === "Uncategorized" && tx.bankCategory 
    ? `[Bank: ${escapeHtml(tx.bankCategory)}] ${escapeHtml(tx.description)}`
    : displayCategory;

  // Retailer/bank logo matched from the transaction description (see
  // js/import/merchantLogos.js). Falls back to the category emoji if no
  // merchant is recognized, or if the image itself fails to load — a
  // mismatched/missing logo should never show a broken-image icon.
  const fallbackIcon = category?.icon || (isIncome ? "💰" : "💸");
  const logoPath = getMerchantLogo(tx.description || '');
  const iconHtml = logoPath
    ? `<img src="${logoPath}" alt="${escapeHtml(displayCategory)} logo" class="merchant-logo"
         onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
       <span style="display:none;">${fallbackIcon}</span>`
    : fallbackIcon;

  return `
    <div class="transaction-card ${isIncome ? "income" : "expense"}" data-id="${tx.id}">
      <div class="transaction-main">
        <div class="transaction-icon">${iconHtml}</div>
        <div class="transaction-details">
          <!-- Show bank category hint if not categorized -->
          <div class="transaction-title">${displayName}</div>
          ${!tx.categoryId && tx.bankCategory ? 
            `<div class="transaction-hint" style="font-size: 0.8em; color: #666;">
              Bank categorized as: ${escapeHtml(tx.bankCategory)}
            </div>` 
            : ''}
          <div class="transaction-meta">
            <span>${escapeHtml(account?.name) || "Unknown Account"}</span>
            ${tx.isPropertyExpense && property ? `<span class="property-tag">🏠 ${escapeHtml(property.name)}</span>` : ""}
          </div>
          ${tx.description ? `<div class="transaction-description">${escapeHtml(tx.description)}</div>` : ""}
        </div>
        <div class="transaction-amount ${isIncome ? "positive" : "negative"}">
          ${isIncome ? "+" : "-"}$${Math.abs(tx.amount).toFixed(2)}
        </div>
      </div>
      <div class="transaction-actions">
        <button class="edit-btn" data-id="${tx.id}" title="Edit">✏️</button>
        <button class="delete-btn" data-id="${tx.id}" title="Delete">🗑️</button>
      </div>
    </div>
  `;
}

// ============================================================================
// Event Handlers
// ============================================================================
function attachTxEvents(transactions, categories, accounts, properties) {
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tx = transactions.find(t => t.id === btn.dataset.id);
      if (tx) {
        loadTransactionIntoForm(tx, categories, properties);
      }
    });
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Delete this transaction?")) {
        try {
          await deleteItem(STORE_NAMES.transactions, btn.dataset.id);
          initTransactionsUI();
        } catch (error) {
          console.error("[TX] Failed to delete transaction:", error);
          alert("Failed to delete transaction. Please try again.");
        }
      }
    });
  });
}

function loadTransactionIntoForm(tx, categories, properties) {
  const form = document.getElementById("txForm");
  if (!form) return;

  form.dataset.id = tx.id;

  form.type.value = tx.amount > 0 ? "income" : "expense";
  form.amount.value = Math.abs(tx.amount);
  form.date.value = tx.date;
  form.accountId.value = tx.accountId || "";
  form.description.value = tx.description || "";

  // Set category
  const mainCat = document.getElementById("mainCategory");
  const subCat = document.getElementById("subCategory");
  if (tx.categoryId) {
    const category = categories.find(c => c.id === tx.categoryId);
    if (category) {
      if (category.parentId) {
        // Set main category
        mainCat.value = category.parentId;

        // Rebuild subcategory list BEFORE selecting
        rebuildSubcategoriesForEdit(category.parentId, categories);

        // Select subcategory
        subCat.value = tx.categoryId;
      } else {
        // No subcategory
        mainCat.value = tx.categoryId;

        rebuildSubcategoriesForEdit(tx.categoryId, categories);
      }
    }

  }

  // Property expense fields
  const isPropertyExpense = document.getElementById("isPropertyExpense");
  const propertyExpenseSection = document.getElementById("propertyExpenseSection");
  const propertyExpenseFields = document.getElementById("propertyExpenseFields");
  
  if (tx.isPropertyExpense) {
    isPropertyExpense.checked = true;
    propertyExpenseSection.style.display = "block";
    propertyExpenseFields.style.display = "block";
    
    form.propertyId.value = tx.propertyId || "";
    form.expenseCategory.value = tx.expenseCategory || "";
    form.expenseStatus.value = tx.expenseStatus || "Paid";
    form.receiptUrl.value = tx.receiptUrl || "";
    form.expenseNotes.value = tx.notes || "";
  } else {
    isPropertyExpense.checked = false;
    propertyExpenseSection.style.display = "none";
    propertyExpenseFields.style.display = "none";
  }

  toggleAddForm();
}

// ============================================================================
// UI helpers
// ============================================================================
function toggleAddForm() {
  const addForm = document.getElementById("addTxForm");
  const filterForm = document.getElementById("filterTxForm");
  
  if (addForm && filterForm) {
    addForm.style.display = addForm.style.display === "none" ? "block" : "none";
    filterForm.style.display = "none";
  }
}

function toggleFilterForm() {
  const addForm = document.getElementById("addTxForm");
  const filterForm = document.getElementById("filterTxForm");
  
  if (addForm && filterForm) {
    filterForm.style.display = filterForm.style.display === "none" ? "block" : "none";
    addForm.style.display = "none";
  }
}

function hideForms() {
  const addForm = document.getElementById("addTxForm");
  const filterForm = document.getElementById("filterTxForm");
  
  if (addForm) addForm.style.display = "none";
  if (filterForm) filterForm.style.display = "none";
}

function clearFilterForm() {
  const filterForm = document.getElementById("filterForm");
  if (filterForm) {
    filterForm.reset();
    initTransactionsUI();
  }
}

// ============================================================================
// Property Expense Toggle Functions
// ============================================================================
function togglePropertyExpenseFields() {
  const typeSelect = document.querySelector("[name='type']");
  const section = document.getElementById("propertyExpenseSection");
  
  if (typeSelect && section) {
    section.style.display = typeSelect.value === "expense" ? "block" : "none";
    
    if (typeSelect.value !== "expense") {
      const isPropertyCheckbox = document.getElementById("isPropertyExpense");
      const propertyFields = document.getElementById("propertyExpenseFields");
      
      if (isPropertyCheckbox) isPropertyCheckbox.checked = false;
      if (propertyFields) propertyFields.style.display = "none";
    }
  }
}

function togglePropertyExpenseCheckbox() {
  const checkbox = document.getElementById("isPropertyExpense");
  const propertyFields = document.getElementById("propertyExpenseFields");
  
  if (checkbox && propertyFields) {
    propertyFields.style.display = checkbox.checked ? "block" : "none";
  }
}

// Make functions available globally for inline onclick handlers
window.togglePropertyExpenseFields = togglePropertyExpenseFields;
window.togglePropertyExpenseCheckbox = togglePropertyExpenseCheckbox;

// ============================================================================
// Helper Functions
// ============================================================================
function formatDate(date) {
  try {
    const d = new Date(date);
    return d.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" });
  } catch (e) {
    return date;
  }
}

// ============================================================================
// 🏠 SYNC: Push Property-Related Transactions → Expenses Store
// ============================================================================
export async function syncToExpenses(transaction) {
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
      status: transaction.expenseStatus || "Paid",
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

    return expenseData;
  } catch (err) {
    console.error("❌ syncToExpenses() failed:", err);
    throw err;
  }
}

// ============================================================================
// 🔄 SYNC ALL: Ensure all property expenses appear in Expenses page
// ============================================================================
export async function syncAllPropertyExpenses() {
  try {
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
      return {
        synced: 0,
        total: 0,
        message: "All property expenses are already synced!"
      };
    }

    let syncedCount = 0;

    for (const tx of unsynced) {
      try {
        await syncToExpenses(tx);
        syncedCount++;
      } catch (syncErr) {
        console.error(`❌ Failed to sync transaction ${tx.id}`, syncErr);
      }
    }

    return {
      synced: syncedCount,
      total: unsynced.length,
      message: `Synced ${syncedCount} new property expenses.`
    };

  } catch (err) {
    console.error("❌ syncAllPropertyExpenses() error:", err);
    return {
      synced: 0,
      total: 0,
      message: "Sync failed due to an unexpected error."
    };
  }

}

function getFullCategoryName(categoryId, categories) {
  if (!categoryId) return "Uncategorized";

  const category = categories.find(c => c.id === categoryId);
  if (!category) return "Uncategorized";

  // If subcategory → show Parent › Child
  if (category.parentId) {
    const parent = categories.find(c => c.id === category.parentId);
    if (parent) return `${escapeHtml(parent.name)} › ${escapeHtml(category.name)}`;
  }

  // Main category only
  return escapeHtml(category.name);
}
