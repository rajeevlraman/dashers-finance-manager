import { getAllItems, addItem, deleteItem, updateItem, STORE_NAMES, generateId } from './db.js';
import { PROPERTY_EXPENSE_CATEGORIES } from './propertyExpenseCategories.js';
import { DEFAULT_CATEGORIES } from './defaultCategories.js';
import { initImportModal } from './import/modal.js';
import { saveImportedTransactions } from './import/saver.js';
import { parseCSVFile, parseStatementText } from './import/parser.js';



// ============================================================================
//  Transactions UI Initialization
// ============================================================================
// ============================================================================
//  Transactions UI Initialization  (FULL PATCHED VERSION)
// ============================================================================

export async function initTransactionsUI() {
  console.log("[TX] initTransactionsUI() starting…");

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
  // HTML Rendering (Import button included)
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

      <!-- Summary Cards + Quick Actions (your existing HTML unchanged) -->
      ... YOUR ENTIRE EXISTING PAGE HTML HERE ...
      <!-- DO NOT REMOVE ANYTHING BELOW UNTIL AFTER txList DIV -->
      
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

  console.log("[TX] HTML rendered, scheduling import modal init…");

  // ========================================================================
  // ✔ FIX: Delay import modal init until DOM is fully settled
  // ========================================================================
  setTimeout(() => {
    console.log("[IMPORT] initImportModal() invoked AFTER render");

    initImportModal({
      accounts,
      categories,
      onImported: async (savedCount) => {
        console.log("[IMPORT] Refreshing transactions after import, saved:", savedCount);
        await initTransactionsUI(); // reload transactions UI
      }
    });

  }, 50);  // ← critical timing fix


  // ========================================================================
  // UI + Event setup
  // ========================================================================
  setupCategoryLinking(categories, subCats);
  setupFormHandlers(categories, accounts, properties);
  renderTransactions(transactions, categories, accounts, properties);

  document.getElementById("btnAddTx").addEventListener("click", toggleAddForm);
  document.getElementById("btnFilterTx").addEventListener("click", toggleFilterForm);
  document.getElementById("closeAddForm").addEventListener("click", hideForms);
  document.getElementById("closeFilterForm").addEventListener("click", hideForms);
  document.getElementById("clearFilters").addEventListener("click", clearFilterForm);

  document.getElementById("sortTransactions").addEventListener("change", () => {
    renderTransactions(transactions, categories, accounts, properties);
  });

  // Quick action buttons
  document.querySelectorAll(".quick-action-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      toggleAddForm();
      document.querySelector("#txForm [name='amount']").value = Math.abs(btn.dataset.amount);
      document.querySelector("#txForm [name='type']").value =
        btn.dataset.amount > 0 ? "income" : "expense";
    });
  });

  setTimeout(() => mainContent.classList.remove("page-transition"), 300);
}

// ============================================================================
// Category Linking
// ============================================================================
function setupCategoryLinking(categories, subCats) {
  const mainSelect = document.getElementById("mainCategory");
  const subSelect = document.getElementById("subCategory");
  const filterMain = document.querySelector("#filterForm [name='mainCategoryId']");
  const filterSub = document.querySelector("#filterForm [name='subCategoryId']");

  // 🔥 Safety check — prevents the crash that destroyed your Import button
  if (!mainSelect || !subSelect || !filterMain || !filterSub) {
    console.warn("[TX] Category linking skipped — missing elements:", {
      mainSelect, subSelect, filterMain, filterSub
    });
    return;
  }

  function updateSubs(source, target) {
    const parentId = source.value;
    const subs = subCats.filter(s => s.parentId === parentId);
    target.innerHTML =
      `<option value="">-- None --</option>` +
      subs.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  }

  mainSelect.addEventListener("change", () => updateSubs(mainSelect, subSelect));
  filterMain.addEventListener("change", () => updateSubs(filterMain, filterSub));

  updateSubs(mainSelect, subSelect);
  updateSubs(filterMain, filterSub);

  console.log("[TX] Category linking initialized successfully");
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
