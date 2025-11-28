import { addItem, deleteItem, getAllItems, updateItem, STORE_NAMES, generateId } from './db.js';
import { addItem as addTransaction } from './db.js';

// === HELPER FUNCTIONS (move these to the top) ===
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

function formatCurrency(amount, currency) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  });
  return formatter.format(amount);
}

function getDateInDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDateDisplay(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

function getNextDueDate(currentDateStr, freq) {
  const d = new Date(currentDateStr);
  switch (freq) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'fortnightly':
      d.setDate(d.getDate() + 14);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'annually':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
}

async function getBillCategoryId(billName) {
  const categories = await getAllItems(STORE_NAMES.categories);
  const name = billName.toLowerCase();
  
  if (name.includes('electric') || name.includes('power') || name.includes('utility')) 
    return categories.find(c => c.name.toLowerCase().includes('utility'))?.id;
  if (name.includes('water') || name.includes('gas')) 
    return categories.find(c => c.name.toLowerCase().includes('utility'))?.id;
  if (name.includes('internet') || name.includes('phone') || name.includes('mobile'))
    return categories.find(c => c.name.toLowerCase().includes('utility'))?.id;
  if (name.includes('rent') || name.includes('mortgage'))
    return categories.find(c => c.name.toLowerCase().includes('rent'))?.id;
  
  return categories.find(c => c.name.toLowerCase().includes('other'))?.id;
}
// === END HELPER FUNCTIONS ===

export async function initBillsUI() {
  const mainContent = document.getElementById('mainContent');
  mainContent.classList.add('page-transition');

  const [bills, accounts, categories] = await Promise.all([
    getAllItems(STORE_NAMES.bills),
    getAllItems(STORE_NAMES.accounts),
    getAllItems(STORE_NAMES.categories)
  ]);

  const today = new Date().toISOString().slice(0, 10);
  
  // Calculate summary stats
  const upcomingBills = bills.filter(b => !b.paid && b.dueDate >= today).length;
  const overdueBills = bills.filter(b => !b.paid && b.dueDate < today).length;
  const totalDue = bills.filter(b => !b.paid).reduce((sum, b) => sum + b.amount, 0);

  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>🧾 Bills</h2>
        <div class="page-actions">
          <button class="btn btn-primary" id="btnNewBill">➕ Add Bill</button>
          <button class="btn btn-secondary" id="btnPayAll">💳 Pay All Due</button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="compact-summary-cards">
        <div class="compact-card ${overdueBills > 0 ? 'red' : 'blue'}">
          <div class="compact-icon">⏰</div>
          <div class="compact-content">
            <div class="compact-value">${overdueBills}</div>
            <div class="compact-label">Overdue</div>
          </div>
        </div>
        <div class="compact-card teal">
          <div class="compact-icon">📅</div>
          <div class="compact-content">
            <div class="compact-value">${upcomingBills}</div>
            <div class="compact-label">Upcoming</div>
          </div>
        </div>
        <div class="compact-card purple">
          <div class="compact-icon">💰</div>
          <div class="compact-content">
            <div class="compact-value">$${totalDue.toFixed(2)}</div>
            <div class="compact-label">Total Due</div>
          </div>
        </div>
      </div>

      <!-- Forms Section -->
      <div class="forms-section">
        <div id="billFormSection" class="section-card form-section" style="display: none;">
          <div class="form-header">
            <h3 id="billFormTitle">➕ Add New Bill</h3>
            <button class="btn btn-text" id="closeBillForm">✕</button>
          </div>
          <form id="billForm" class="styled-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Bill Name</label>
                <input type="text" name="name" class="form-input" placeholder="e.g., Electricity, Rent..." required>
              </div>
              <div class="form-group">
                <label class="form-label">Amount</label>
                <input type="number" name="amount" class="form-input" step="0.01" placeholder="0.00" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Due Date</label>
                <input type="date" name="dueDate" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">Pay From Account</label>
                <select name="accountId" class="form-select">
                  <option value="">-- Select Account --</option>
                  ${accounts.map(acc => `
                    <option value="${acc.id}">${getAccountIcon(acc.type)} ${acc.name}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Recurring</label>
                <select name="recurring" class="form-select">
                  <option value="">None</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Category</label>
                <select name="categoryId" class="form-select">
                  <option value="">-- Auto-detect --</option>
                  ${categories.map(cat => `
                    <option value="${cat.id}">${cat.icon || '📁'} ${cat.name}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="form-actions">
              <button class="btn btn-primary" type="submit">💾 Save Bill</button>
              <button class="btn btn-secondary" type="reset">🧹 Clear</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Bills List -->
      <div class="section-card">
        <div class="transactions-header">
          <h3>Your Bills</h3>
          <div class="transactions-controls">
            <span class="transactions-count" id="billsCount">${bills.length} bills</span>
            <select id="sortBills" class="form-select">
              <option value="dueDate-asc">Due Date (Soonest)</option>
              <option value="dueDate-desc">Due Date (Latest)</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
              <option value="name-asc">Name A-Z</option>
            </select>
          </div>
        </div>
        <div id="billsList"></div>
      </div>
    </div>
  `;

  setTimeout(() => mainContent.classList.remove('page-transition'), 400);

  // Initialize
  renderBillsList(bills, accounts, categories);

  // Event Listeners
  setupBillsEventListeners(bills, accounts, categories);
}

function renderBillsList(bills, accounts, categories) {
  const billsList = document.getElementById('billsList');
  const billsCount = document.getElementById('billsCount');
  const today = new Date().toISOString().slice(0, 10);

  if (bills.length === 0) {
    billsList.innerHTML = `
      <div class="empty-state">
        <p>No bills set up yet.</p>
        <button class="btn btn-primary" onclick="document.getElementById('btnNewBill').click()">
          Add Your First Bill
        </button>
      </div>
    `;
    return;
  }

  // Apply sorting
  const sortBy = document.getElementById('sortBills').value;
  const sortedBills = [...bills].sort((a, b) => {
    switch (sortBy) {
      case 'dueDate-asc': return a.dueDate.localeCompare(b.dueDate);
      case 'dueDate-desc': return b.dueDate.localeCompare(a.dueDate);
      case 'amount-desc': return b.amount - a.amount;
      case 'amount-asc': return a.amount - b.amount;
      case 'name-asc': return a.name.localeCompare(b.name);
      default: return a.dueDate.localeCompare(b.dueDate);
    }
  });

  billsList.innerHTML = sortedBills.map(bill => {
    const account = accounts.find(a => a.id === bill.accountId);
    const category = categories.find(c => c.id === bill.categoryId);
    const overdue = (bill.dueDate < today) && !bill.paid;
    const dueSoon = (bill.dueDate >= today && bill.dueDate <= getDateInDays(7)) && !bill.paid;
    
    const status = bill.paid
      ? '<span class="status-badge paid">✅ Paid</span>'
      : (overdue 
          ? '<span class="status-badge overdue">❌ Overdue</span>'
          : (dueSoon 
              ? '<span class="status-badge due-soon">⏰ Due Soon</span>'
              : '<span class="status-badge upcoming">📅 Upcoming</span>'));

    return `
      <div class="transaction-card ${bill.paid ? 'paid' : (overdue ? 'overdue' : 'upcoming')}" data-id="${bill.id}">
        <div class="transaction-main">
          <div class="transaction-icon">${category?.icon || '🧾'}</div>
          <div class="transaction-details">
            <div class="transaction-title">${bill.name}</div>
            <div class="transaction-meta">
              <span class="transaction-date">Due: ${formatDateDisplay(bill.dueDate)}</span>
              ${bill.recurring ? `<span class="transaction-recurring">🔄 ${bill.recurring}</span>` : ''}
              ${account ? `<span class="transaction-account">${getAccountIcon(account.type)} ${account.name}</span>` : ''}
            </div>
            ${status}
          </div>
          <div class="transaction-amount ${bill.paid ? 'positive' : 'negative'}">
            $${bill.amount.toFixed(2)}
          </div>
        </div>
        <div class="transaction-actions">
          ${!bill.paid ? `<button class="action-btn pay-btn" data-id="${bill.id}" title="Mark Paid">💳</button>` : ''}
          <button class="action-btn edit-btn" data-id="${bill.id}" title="Edit">✏️</button>
          <button class="action-btn delete-btn" data-id="${bill.id}" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  billsCount.textContent = `${bills.length} bill${bills.length !== 1 ? 's' : ''}`;
}

function setupBillsEventListeners(bills, accounts, categories) {
  const btnNewBill = document.getElementById('btnNewBill');
  const billFormSection = document.getElementById('billFormSection');
  const closeBillForm = document.getElementById('closeBillForm');
  const billForm = document.getElementById('billForm');
  const sortSelect = document.getElementById('sortBills');

  // Form toggle
  btnNewBill.addEventListener('click', () => {
    const isVisible = billFormSection.style.display === 'block';
    billFormSection.style.display = isVisible ? 'none' : 'block';
    billForm.reset();
    billForm.dataset.id = '';
    document.getElementById('billFormTitle').textContent = '➕ Add New Bill';
    billForm.dueDate.value = new Date().toISOString().slice(0, 10);
    
    if (!isVisible) {
      billFormSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  closeBillForm.addEventListener('click', () => {
    billFormSection.style.display = 'none';
  });

  // Form submission
  billForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const billData = {
      name: formData.get('name'),
      amount: parseFloat(formData.get('amount')),
      dueDate: formData.get('dueDate'),
      accountId: formData.get('accountId'),
      recurring: formData.get('recurring'),
      categoryId: formData.get('categoryId'),
      paid: false
    };

    if (form.dataset.id) {
      // Editing existing bill
      billData.id = form.dataset.id;
      await updateItem(STORE_NAMES.bills, billData);
    } else {
      // Adding new bill
      billData.id = generateId();
      await addItem(STORE_NAMES.bills, billData);
    }

    billFormSection.style.display = 'none';
    initBillsUI();
  });

  // Sorting
  sortSelect.addEventListener('change', () => {
    renderBillsList(bills, accounts, categories);
  });

  // Bill actions
  document.addEventListener('click', async (e) => {
    if (e.target.closest('.pay-btn')) {
      const billId = e.target.closest('.pay-btn').dataset.id;
      const bill = bills.find(b => b.id === billId);
      if (bill) await markBillAsPaid(bill);
    } else if (e.target.closest('.edit-btn')) {
      const billId = e.target.closest('.edit-btn').dataset.id;
      const bill = bills.find(b => b.id === billId);
      if (bill) openBillEditor(bill);
    } else if (e.target.closest('.delete-btn')) {
      const billId = e.target.closest('.delete-btn').dataset.id;
      if (confirm('Are you sure you want to delete this bill?')) {
        await deleteItem(STORE_NAMES.bills, billId);
        initBillsUI();
      }
    }
  });
}

async function markBillAsPaid(bill) {
  // Mark bill as paid
  bill.paid = true;
  await updateItem(STORE_NAMES.bills, bill);

  // Create transaction if account is set
  if (bill.accountId) {
    const transaction = {
      type: 'expense',
      amount: -bill.amount,
      date: new Date().toISOString().slice(0, 10),
      categoryId: bill.categoryId || await getBillCategoryId(bill.name),
      accountId: bill.accountId,
      description: `Bill: ${bill.name}`,
      billId: bill.id
    };
    await addTransaction(STORE_NAMES.transactions, transaction);
  }

  // Handle recurring bills
  if (bill.recurring) {
    const nextDate = getNextDueDate(bill.dueDate, bill.recurring);
    const newBill = {
      name: bill.name,
      amount: bill.amount,
      dueDate: nextDate,
      paid: false,
      recurring: bill.recurring,
      accountId: bill.accountId,
      categoryId: bill.categoryId
    };
    await addItem(STORE_NAMES.bills, newBill);
  }

  initBillsUI();
}

function openBillEditor(bill) {
  const billFormSection = document.getElementById('billFormSection');
  const billForm = document.getElementById('billForm');
  const billFormTitle = document.getElementById('billFormTitle');

  billFormTitle.textContent = '✏️ Edit Bill';
  billForm.name.value = bill.name;
  billForm.amount.value = bill.amount;
  billForm.dueDate.value = bill.dueDate;
  billForm.accountId.value = bill.accountId || '';
  billForm.recurring.value = bill.recurring || '';
  billForm.categoryId.value = bill.categoryId || '';
  billForm.dataset.id = bill.id;

  billFormSection.style.display = 'block';
  billFormSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}