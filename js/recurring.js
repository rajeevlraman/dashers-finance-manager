import { addItem, deleteItem, getAllItems, updateItem, STORE_NAMES, generateId } from './db.js';

// Keep your existing getAccountIcon function
function getAccountIcon(type) {
  const icons = {
    bank: '🏦',
    credit: '💳',
    cash: '💵',
    savings: '💰',
    investment: '📈',
    offset: '⚖️',
    loan: '🏠'
  };
  return icons[type] || '📁';
}

export async function initRecurringUI() {
  const mainContent = document.getElementById('mainContent');
  mainContent.classList.add('page-transition');

  const [recurring, accounts, categories] = await Promise.all([
    getAllItems(STORE_NAMES.recurringTransactions),
    getAllItems(STORE_NAMES.accounts),
    getAllItems(STORE_NAMES.categories)
  ]);

  const mainCats = categories.filter(c => !c.parentId);
  const subCats = categories.filter(c => c.parentId);

  // Calculate summary stats
  const activeRecurring = recurring.length;
  const monthlyAmount = recurring.reduce((sum, r) => {
    const multiplier = r.frequency === 'weekly' ? 4.33 : r.frequency === 'annually' ? 1/12 : 1;
    return sum + (r.amount * multiplier);
  }, 0);

  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>🔄 Recurring Transactions</h2>
        <div class="page-actions">
          <button class="btn btn-primary" id="btnNewRec">➕ Add Recurring</button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="compact-summary-cards">
        <div class="compact-card blue">
          <div class="compact-icon">🔄</div>
          <div class="compact-content">
            <div class="compact-value">${activeRecurring}</div>
            <div class="compact-label">Active</div>
          </div>
        </div>
        <div class="compact-card teal">
          <div class="compact-icon">💰</div>
          <div class="compact-content">
            <div class="compact-value">$${monthlyAmount.toFixed(2)}</div>
            <div class="compact-label">Monthly Impact</div>
          </div>
        </div>
      </div>

      <!-- Forms Section -->
      <div class="forms-section">
        <div id="recFormSection" class="section-card form-section" style="display: none;">
          <div class="form-header">
            <h3 id="recFormTitle">➕ Add Recurring Transaction</h3>
            <button class="btn btn-text" id="closeRecForm">✕</button>
          </div>
          <form id="recForm" class="styled-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" name="name" class="form-input" placeholder="e.g., Salary, Netflix..." required>
              </div>
              <div class="form-group">
                <label class="form-label">Type</label>
                <select name="type" class="form-select" required>
                  <option value="expense">📤 Expense</option>
                  <option value="income">📥 Income</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Amount</label>
                <input type="number" name="amount" class="form-input" step="0.01" placeholder="0.00" required>
              </div>
              <div class="form-group">
                <label class="form-label">Account</label>
                <select name="accountId" class="form-select" required>
                  <option value="">-- Select Account --</option>
                  ${accounts.map(acc => `
                    <option value="${acc.id}">${getAccountIcon(acc.type)} ${acc.name}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Start Date</label>
                <input type="date" name="startDate" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">Frequency</label>
                <select name="frequency" class="form-select" required>
                  <option value="weekly">Weekly</option>
                  <option value="monthly" selected>Monthly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Main Category</label>
                <select id="recMainCategory" class="form-select" required>
                  <option value="">-- Select Category --</option>
                  ${mainCats.map(c => `<option value="${c.id}">${c.icon || '📁'} ${c.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Subcategory</label>
                <select id="recSubCategory" class="form-select">
                  <option value="">-- None --</option>
                </select>
              </div>
            </div>

            <div class="form-actions">
              <button class="btn btn-primary" type="submit">💾 Save Recurring</button>
              <button class="btn btn-secondary" type="reset">🧹 Clear</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Recurring Transactions List -->
      <div class="section-card">
        <div class="transactions-header">
          <h3>Active Recurring Transactions</h3>
          <div class="transactions-controls">
            <span class="transactions-count" id="recCount">${recurring.length} recurring</span>
          </div>
        </div>
        <div id="recList"></div>
      </div>
    </div>
  `;

  setTimeout(() => mainContent.classList.remove('page-transition'), 400);

  // Initialize
  renderRecurringList(recurring, accounts, categories);
  setupRecurringEventListeners(recurring, accounts, categories, mainCats, subCats);
}

function renderRecurringList(recurring, accounts, categories) {
  const recList = document.getElementById('recList');
  const recCount = document.getElementById('recCount');

  if (recurring.length === 0) {
    recList.innerHTML = `
      <div class="empty-state">
        <p>No recurring transactions set up yet.</p>
        <button class="btn btn-primary" onclick="document.getElementById('btnNewRec').click()">
          Add Your First Recurring Transaction
        </button>
      </div>
    `;
    return;
  }

  recList.innerHTML = recurring.map(rec => {
    const account = accounts.find(a => a.id === rec.accountId);
    const category = categories.find(c => c.id === rec.categoryId);
    const mainCategory = category?.parentId ? 
      categories.find(c => c.id === category.parentId) : category;
    const subCategory = category?.parentId ? category : null;

    const frequencyIcons = {
      weekly: '📅',
      monthly: '🗓️',
      annually: '🎯'
    };

    return `
      <div class="transaction-card" data-id="${rec.id}">
        <div class="transaction-main">
          <div class="transaction-icon">${mainCategory?.icon || (rec.type === 'income' ? '💰' : '💸')}</div>
          <div class="transaction-details">
            <div class="transaction-title">${rec.name}</div>
            <div class="transaction-meta">
              <span class="transaction-type ${rec.type}">${rec.type === 'income' ? '📥 Income' : '📤 Expense'}</span>
              <span class="transaction-frequency">${frequencyIcons[rec.frequency] || '🔄'} ${rec.frequency}</span>
              ${account ? `<span class="transaction-account">${getAccountIcon(account.type)} ${account.name}</span>` : ''}
            </div>
            ${subCategory ? `<div class="transaction-subcategory">${subCategory.name}</div>` : ''}
          </div>
          <div class="transaction-amount ${rec.type === 'income' ? 'positive' : 'negative'}">
            ${rec.type === 'income' ? '+' : '-'}$${rec.amount.toFixed(2)}
          </div>
        </div>
        <div class="transaction-actions">
          <button class="action-btn edit-btn" data-id="${rec.id}" title="Edit">✏️</button>
          <button class="action-btn delete-btn" data-id="${rec.id}" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  recCount.textContent = `${recurring.length} recurring transaction${recurring.length !== 1 ? 's' : ''}`;
}

function setupRecurringEventListeners(recurring, accounts, categories, mainCats, subCats) {
  const btnNewRec = document.getElementById('btnNewRec');
  const recFormSection = document.getElementById('recFormSection');
  const closeRecForm = document.getElementById('closeRecForm');
  const recForm = document.getElementById('recForm');
  const mainSelect = document.getElementById('recMainCategory');
  const subSelect = document.getElementById('recSubCategory');

  // Category linking
  mainSelect.addEventListener('change', () => {
    const parentId = mainSelect.value;
    const filteredSubs = subCats.filter(s => s.parentId === parentId);
    subSelect.innerHTML = `<option value="">-- None --</option>` +
      filteredSubs.map(s => `<option value="${s.id}">${s.icon || '📄'} ${s.name}</option>`).join('');
  });

  // Form toggle
  btnNewRec.addEventListener('click', () => {
    const isVisible = recFormSection.style.display === 'block';
    recFormSection.style.display = isVisible ? 'none' : 'block';
    recForm.reset();
    recForm.dataset.id = '';
    document.getElementById('recFormTitle').textContent = '➕ Add Recurring Transaction';
    recForm.startDate.value = new Date().toISOString().slice(0, 10);
    
    if (!isVisible) {
      recFormSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  closeRecForm.addEventListener('click', () => {
    recFormSection.style.display = 'none';
  });

  // Form submission
  recForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const chosenCategoryId = subSelect.value || mainSelect.value;

    if (!chosenCategoryId) {
      alert('Please select a category.');
      return;
    }

    const recData = {
      name: formData.get('name'),
      type: formData.get('type'),
      amount: parseFloat(formData.get('amount')),
      startDate: formData.get('startDate'),
      frequency: formData.get('frequency'),
      accountId: formData.get('accountId'),
      categoryId: chosenCategoryId
    };

    if (form.dataset.id) {
      // Editing existing
      recData.id = form.dataset.id;
      await updateItem(STORE_NAMES.recurringTransactions, recData);
    } else {
      // Adding new
      recData.id = generateId();
      await addItem(STORE_NAMES.recurringTransactions, recData);
    }

    recFormSection.style.display = 'none';
    initRecurringUI();
  });

  // Edit and delete actions
  document.addEventListener('click', async (e) => {
    if (e.target.closest('.edit-btn')) {
      const recId = e.target.closest('.edit-btn').dataset.id;
      const rec = recurring.find(r => r.id === recId);
      if (rec) openRecEditor(rec, categories);
    } else if (e.target.closest('.delete-btn')) {
      const recId = e.target.closest('.delete-btn').dataset.id;
      if (confirm('Are you sure you want to delete this recurring transaction?')) {
        await deleteItem(STORE_NAMES.recurringTransactions, recId);
        initRecurringUI();
      }
    }
  });
}

function openRecEditor(rec, categories) {
  const recFormSection = document.getElementById('recFormSection');
  const recForm = document.getElementById('recForm');
  const recFormTitle = document.getElementById('recFormTitle');
  const mainSelect = document.getElementById('recMainCategory');
  const subSelect = document.getElementById('recSubCategory');

  recFormTitle.textContent = '✏️ Edit Recurring Transaction';
  
  // Find category and parent
  const category = categories.find(c => c.id === rec.categoryId);
  const mainCategoryId = category?.parentId || rec.categoryId;

  recForm.name.value = rec.name;
  recForm.type.value = rec.type;
  recForm.amount.value = rec.amount;
  recForm.startDate.value = rec.startDate;
  recForm.frequency.value = rec.frequency;
  recForm.accountId.value = rec.accountId;
  recForm.dataset.id = rec.id;

  // Set main category and trigger subcategory update
  mainSelect.value = mainCategoryId;
  mainSelect.dispatchEvent(new Event('change'));
  
  // Set subcategory after options are populated
  setTimeout(() => {
    if (category?.parentId) {
      subSelect.value = rec.categoryId;
    }
  }, 100);

  recFormSection.style.display = 'block';
  recFormSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

