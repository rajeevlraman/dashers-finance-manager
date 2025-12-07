import { getAllItems, addItem, deleteItem, updateItem, STORE_NAMES, generateId } from './db.js';
import { PROPERTY_EXPENSE_CATEGORIES } from './propertyExpenseCategories.js';
import { DEFAULT_CATEGORIES } from './defaultCategories.js';
import { initImportModal } from './import/modal.js';
import { saveImportedTransactions } from './import/saver.js';

// ============================================================================
//  Transactions UI Initialization
// ============================================================================
export async function initTransactionsUI() {
  const mainContent = document.getElementById('mainContent');
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
  const netFlow = totalIncome - totalExpenses;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthTotal = transactions
    .filter(t => t.date.startsWith(thisMonth))
    .reduce((s, t) => s + (t.amount || 0), 0);

  // ========================================================================
  // HTML Rendering (Import button removed)
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

      <!-- Quick Actions -->
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
      </div>

      <!-- Forms Section -->
      <div class="forms-section">

        <!-- Add Transaction Form -->
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
                <input type="number" name="amount" class="form-input" step="0.01" required>
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
              <input type="text" name="description" class="form-input" placeholder="e.g., Groceries at Coles">
            </div>

            <!-- Property Expense Section -->
            <div id="propertyExpenseSection" style="margin-top: 1rem; display:none;">
              <label>
                <input type="checkbox" id="isPropertyExpense"> 🏠 This is a property-related expense
              </label>

              <div id="propertyExpenseFields" style="display:none; margin-top:1rem;">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Property</label>
                    <select name="propertyId" class="form-select">
                      <option value="">-- Select Property --</option>
                      ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Expense Category</label>
                    <select name="expenseCategory" class="form-select">
                      ${Object.keys(PROPERTY_EXPENSE_CATEGORIES).map(
                        cat => `<option value="${cat}">${cat}</option>`
                      ).join('')}
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Status</label>
                    <select name="expenseStatus" class="form-select">
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Receipt URL</label>
                    <input type="url" name="receiptUrl" class="form-input">
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Notes</label>
                  <textarea name="expenseNotes" rows="2" class="form-input"></textarea>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button class="btn btn-primary" type="submit">💾 Save Transaction</button>
              <button class="btn btn-secondary" type="reset">🧹 Clear</button>
            </div>
          </form>
        </div>

        <!-- Filter form -->
        <div id="filterTxForm" class="section-card form-section" style="display:none;">
          <div class="form-header">
            <h3>🔍 Filter Transactions</h3>
            <button class="btn btn-text" id="closeFilterForm">✕</button>
          </div>
          
          <form id="filterForm" class="styled-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Type</label>
                <select name="type" class="form-select">
                  <option value="">All</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
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
                  ${mainCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Subcategory</label>
                <select name="subCategoryId" class="form-select">
                  <option value="">All</option>
                </select>
              </div>
            </div>

            <div class="form-actions">
              <button class="btn btn-primary" type="submit">Apply Filters</button>
              <button class="btn btn-secondary" type="button" id="clearFilters">Clear</button>
            </div>
          </form>
        </div>
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
            </select>
          </div>
        </div>
        <div id="txList"></div>
      </div>

    </div>
  `;

  // Initialize Import Modal AFTER HTML is rendered
initImportModal({
  accounts,
  categories,
  onImported: async (savedCount) => {
    console.log('[IMPORT] Refreshing transactions after import, saved:', savedCount);
    await initTransactionsUI(); // Reload page to show new transactions
  }
});


  // UI + Event setup
  setupCategoryLinking(categories, subCats);
  setupFormHandlers(categories, accounts, properties);
  renderTransactions(transactions, categories, accounts, properties);

  // Buttons
  document.getElementById("btnAddTx").addEventListener("click", toggleAddForm);
  document.getElementById("btnFilterTx").addEventListener("click", toggleFilterForm);
  document.getElementById("closeAddForm").addEventListener("click", hideForms);
  document.getElementById("closeFilterForm").addEventListener("click", hideForms);
  document.getElementById("clearFilters").addEventListener("click", clearFilterForm);
  document.getElementById("sortTransactions").addEventListener("change", () => {
    renderTransactions(transactions, categories, accounts, properties);
  });

  // Quick actions
  document.querySelectorAll(".quick-action-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      toggleAddForm();
      document.querySelector("#txForm [name='amount']").value = Math.abs(btn.dataset.amount);
      document.querySelector("#txForm [name='type']").value =
        btn.dataset.amount > 0 ? "income" : "expense";
    });
  });

  setTimeout(() => mainContent.classList.remove("page-transition"), 400);
}

// ============================================================================
// Category Linking
// ============================================================================
function setupCategoryLinking(categories, subCats) {
  const mainSelect = document.getElementById("mainCategory");
  const subSelect = document.getElementById("subCategory");
  const filterMain = document.querySelector("#filterForm [name='mainCategoryId']");
  const filterSub = document.querySelector("#filterForm [name='subCategoryId']");

  function updateSubs(source, target) {
    const parentId = source.value;
    const subs = subCats.filter(s => s.parentId === parentId);
    target.innerHTML = `<option value="">-- None --</option>` +
      subs.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  }

  mainSelect.addEventListener("change", () => updateSubs(mainSelect, subSelect));
  filterMain.addEventListener("change", () => updateSubs(filterMain, filterSub));

  updateSubs(mainSelect, subSelect);
  updateSubs(filterMain, filterSub);
}

// ============================================================================
// Form Handlers
// ============================================================================
function setupFormHandlers(categories, accounts, properties) {
  const txForm = document.getElementById("txForm");
  const filterForm = document.getElementById("filterForm");

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

    if (txForm.dataset.id) {
      await updateItem(STORE_NAMES.transactions, tx);
    } else {
      await addItem(STORE_NAMES.transactions, tx);
    }

    hideForms();
    initTransactionsUI();
  });

  filterForm.addEventListener("submit", e => {
    e.preventDefault();
    const filters = Object.fromEntries(new FormData(filterForm));
  });
}

// ============================================================================
// Transactions Renderer
// ============================================================================
function renderTransactions(transactions, categories, accounts, properties) {
  const list = document.getElementById("txList");
  const sort = document.getElementById("sortTransactions").value;

  let txs = [...transactions];

  if (sort === "date-desc") txs.sort((a, b) => b.date.localeCompare(a.date));
  if (sort === "date-asc") txs.sort((a, b) => a.date.localeCompare(b.date));
  if (sort === "amount-desc") txs.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  if (sort === "amount-asc") txs.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));

  if (txs.length === 0) {
    list.innerHTML = `<p>No transactions found.</p>`;
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

function renderTransactionCard(tx, categories, accounts, properties) {
  const category = categories.find(c => c.id === tx.categoryId);
  const account = accounts.find(a => a.id === tx.accountId);
  const property = properties.find(p => p.id === tx.propertyId);
  const isIncome = tx.amount > 0;

  return `
    <div class="transaction-card ${isIncome ? "income" : "expense"}" data-id="${tx.id}">
      <div class="transaction-main">
        <div class="transaction-icon">${category?.icon || (isIncome ? "💰" : "💸")}</div>
        <div class="transaction-details">
          <div class="transaction-title">${category?.name}</div>
          <div class="transaction-meta">
            <span>${account?.name}</span>
            ${tx.isPropertyExpense ? `<span class="property-tag">🏠 ${property?.name}</span>` : ""}
          </div>
          ${tx.description ? `<div class="transaction-description">${tx.description}</div>` : ""}
        </div>
        <div class="transaction-amount ${isIncome ? "positive" : "negative"}">
          ${isIncome ? "+" : "-"}$${Math.abs(tx.amount).toFixed(2)}
        </div>
      </div>
      <div class="transaction-actions">
        <button class="edit-btn" data-id="${tx.id}">✏️</button>
        <button class="delete-btn" data-id="${tx.id}">🗑️</button>
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
      loadTransactionIntoForm(tx, categories, properties);
    });
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Delete this transaction?")) {
        await deleteItem(STORE_NAMES.transactions, btn.dataset.id);
        initTransactionsUI();
      }
    });
  });
}

function loadTransactionIntoForm(tx, categories, properties) {
  const form = document.getElementById("txForm");
  form.dataset.id = tx.id;

  form.type.value = tx.amount > 0 ? "income" : "expense";
  form.amount.value = Math.abs(tx.amount);
  form.date.value = tx.date;
  form.accountId.value = tx.accountId;
  form.description.value = tx.description;

  document.getElementById("mainCategory").value = tx.categoryId;

  if (tx.isPropertyExpense) {
    document.getElementById("isPropertyExpense").checked = true;
    document.getElementById("propertyExpenseSection").style.display = "block";
    document.getElementById("propertyExpenseFields").style.display = "block";

    form.propertyId.value = tx.propertyId;
    form.expenseCategory.value = tx.expenseCategory;
    form.expenseStatus.value = tx.expenseStatus;
    form.receiptUrl.value = tx.receiptUrl;
    form.expenseNotes.value = tx.notes;
  }

  toggleAddForm();
}

// ============================================================================
// UI helpers
// ============================================================================
function toggleAddForm() {
  document.getElementById("addTxForm").style.display =
    document.getElementById("addTxForm").style.display === "none"
      ? "block"
      : "none";
  document.getElementById("filterTxForm").style.display = "none";
}

function toggleFilterForm() {
  document.getElementById("filterTxForm").style.display =
    document.getElementById("filterTxForm").style.display === "none"
      ? "block"
      : "none";
  document.getElementById("addTxForm").style.display = "none";
}

function hideForms() {
  document.getElementById("addTxForm").style.display = "none";
  document.getElementById("filterTxForm").style.display = "none";
}

function clearFilterForm() {
  document.getElementById("filterForm").reset();
  initTransactionsUI();
}

// ============================================================================
// 🏠 SYNC: Push Property-Related Transactions → Expenses Store
// ============================================================================

// Create or update an expense entry based on a transaction
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


function togglePropertyExpenseFields() {
  const type = document.querySelector("[name='type']").value;
  const section = document.getElementById("propertyExpenseSection");

  section.style.display = type === "expense" ? "block" : "none";

  if (type !== "expense") {
    document.getElementById("isPropertyExpense").checked = false;
    document.getElementById("propertyExpenseFields").style.display = "none";
  }
}

window.togglePropertyExpenseFields = togglePropertyExpenseFields;

function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" });
}
