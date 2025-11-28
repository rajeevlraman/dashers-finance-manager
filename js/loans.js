// ============================================================================
// 🏦 loans.js — Enhanced Loans Module for Budget Tracker
// ============================================================================

import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES, generateId } from './db.js';
import { calculateAmortizationSchedule, calculatePaymentAmount, calculateTotalInterest } from './loanCalculations.js';

// ============================================================================
// 🔹 Default Demo Loans
// ============================================================================
const DEFAULT_LOANS = [
  { 
    id: 'loan1', 
    name: 'Home Mortgage', 
    type: 'mortgage', 
    originalAmount: 300000, 
    currentBalance: 300000, 
    interestRate: 4.5, 
    currency: 'AUD', 
    startDate: new Date().toISOString().split('T')[0], 
    termMonths: 360, 
    paymentFrequency: 'monthly',
    icon: '🏠'
  },
  { 
    id: 'loan2', 
    name: 'Car Loan', 
    type: 'vehicle', 
    originalAmount: 25000, 
    currentBalance: 25000, 
    interestRate: 6.2, 
    currency: 'AUD', 
    startDate: new Date().toISOString().split('T')[0], 
    termMonths: 60, 
    paymentFrequency: 'monthly',
    icon: '🚗'
  },
  { 
    id: 'loan3', 
    name: 'Personal Loan', 
    type: 'personal', 
    originalAmount: 10000, 
    currentBalance: 10000, 
    interestRate: 8.0, 
    currency: 'AUD', 
    startDate: new Date().toISOString().split('T')[0], 
    termMonths: 36, 
    paymentFrequency: 'monthly',
    icon: '👤'
  },
  { 
    id: 'loan4', 
    name: 'Student Loan', 
    type: 'education', 
    originalAmount: 15000, 
    currentBalance: 15000, 
    interestRate: 3.5, 
    currency: 'AUD', 
    startDate: new Date().toISOString().split('T')[0], 
    termMonths: 120, 
    paymentFrequency: 'monthly',
    icon: '🎓'
  }
];

// ============================================================================
// 🎨 Helper Functions (MOVE THESE TO TOP)
// ============================================================================
function getLoanIcon(type) { 
  const icons = {
    mortgage: '🏠', 
    vehicle: '🚗', 
    personal: '👤', 
    education: '🎓', 
    business: '💼'
  };
  return icons[type] || '🏦'; 
}

function getLoanTypeLabel(type) { 
  const labels = {
    mortgage: 'Mortgage', 
    vehicle: 'Vehicle', 
    personal: 'Personal', 
    education: 'Education', 
    business: 'Business'
  };
  return labels[type] || 'Loan'; 
}

function formatCurrency(amount, currency) { 
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: currency || 'AUD' 
  }).format(amount); 
}

// ============================================================================
// 🧹 Utility Functions (MOVE THESE TO TOP)
// ============================================================================
async function addDefaultLoans() {
  const existing = await getAllItems(STORE_NAMES.loans);
  const ids = existing.map(l => l.id);
  for (const loan of DEFAULT_LOANS) {
    if (!ids.includes(loan.id)) {
      await addItem(STORE_NAMES.loans, { 
        ...loan, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      });
    }
  }
  await refreshLoansList();
}

async function refreshLoansList() {
  const [loans, accounts] = await Promise.all([
    getAllItems(STORE_NAMES.loans),
    getAllItems(STORE_NAMES.accounts)
  ]);
  renderLoansList(loans, accounts);
}

// ============================================================================
// 💰 Process Loan Payment (MOVE THESE TO TOP)
// ============================================================================
export async function processLoanPayment(loanId, paymentData) {
  const { amount, fromAccountId, paymentDate = new Date().toISOString().split('T')[0] } = paymentData;

  const [loan, accounts] = await Promise.all([
    getAllItems(STORE_NAMES.loans).then(loans => loans.find(l => l.id === loanId)),
    getAllItems(STORE_NAMES.accounts)
  ]);

  if (!loan) throw new Error('Loan not found');
  const fromAccount = accounts.find(a => a.id === fromAccountId);
  if (!fromAccount) throw new Error('Source account not found');

  const monthlyRate = loan.interestRate / 100 / 12;
  const interest = loan.currentBalance * monthlyRate;
  const principal = Math.min(amount - interest, loan.currentBalance);

  loan.currentBalance -= principal;
  loan.updatedAt = new Date().toISOString();
  fromAccount.balance -= amount;
  fromAccount.updatedAt = new Date().toISOString();

  const loanTransaction = {
    id: generateId(),
    loanId,
    type: 'payment',
    amount,
    principal,
    interest,
    date: paymentDate,
    fromAccountId,
    description: `Loan payment - ${loan.name}`,
    createdAt: new Date().toISOString()
  };

  const paymentTransaction = {
    id: generateId(),
    type: 'expense',
    amount,
    date: paymentDate,
    categoryId: await getLoanExpenseCategoryId(),
    accountId: fromAccountId,
    description: `Loan payment - ${loan.name}`,
    createdAt: new Date().toISOString()
  };

  await updateItem(STORE_NAMES.loans, loan);
  await updateItem(STORE_NAMES.accounts, fromAccount);
  await addItem(STORE_NAMES.loanTransactions, loanTransaction);
  await addItem(STORE_NAMES.transactions, paymentTransaction);

  return { principal, interest, newBalance: loan.currentBalance };
}

// ============================================================================
// 🧮 Offset Interest Calculation (MOVE THESE TO TOP)
// ============================================================================
export async function calculateOffsetInterest(loanId) {
  const [loan, accounts] = await Promise.all([
    getAllItems(STORE_NAMES.loans).then(loans => loans.find(l => l.id === loanId)),
    getAllItems(STORE_NAMES.accounts)
  ]);
  if (!loan?.linkedOffsetId) return 0;

  const offsetAccount = accounts.find(a => a.id === loan.linkedOffsetId);
  if (!offsetAccount) return 0;

  const monthlyRate = loan.interestRate / 100 / 12;
  const effectiveBalance = Math.max(loan.currentBalance - offsetAccount.balance, 0);
  return (loan.currentBalance - effectiveBalance) * monthlyRate;
}

// ============================================================================
// 📂 Get or Create Loan Expense Category (MOVE THESE TO TOP)
// ============================================================================
async function getLoanExpenseCategoryId() {
  const categories = await getAllItems(STORE_NAMES.categories);
  let cat = categories.find(c => c.name.toLowerCase().includes('loan') && c.type === 'expense');
  if (!cat) {
    cat = { 
      id: generateId(), 
      name: 'Loan Interest', 
      type: 'expense', 
      icon: '🏦', 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString() 
    };
    await addItem(STORE_NAMES.categories, cat);
  }
  return cat.id;
}

// ============================================================================
// 🧱 UI Initialization
// ============================================================================
export async function initLoansUI() {
  const mainContent = document.getElementById('mainContent');
  mainContent.classList.add('page-transition');

  const [loans, accounts] = await Promise.all([
    getAllItems(STORE_NAMES.loans),
    getAllItems(STORE_NAMES.accounts)
  ]);

  // Calculate summary stats
  const totalBalance = loans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  const totalMonthlyPayments = loans.reduce((sum, loan) => sum + calculatePaymentAmount(loan), 0);
  const paidOffLoans = loans.filter(loan => loan.currentBalance <= 0).length;

  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>🏦 Loans</h2>
        <div class="page-actions">
          <button class="btn btn-primary" id="btnNewLoan">➕ New Loan</button>
          <button class="btn btn-secondary" id="btnAddDefaultLoans">📦 Add Demo Loans</button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="compact-summary-cards">
        <div class="compact-card ${totalBalance > 0 ? 'red' : 'green'}">
          <div class="compact-icon">💰</div>
          <div class="compact-content">
            <div class="compact-value">${formatCurrency(totalBalance, 'AUD')}</div>
            <div class="compact-label">Total Balance</div>
          </div>
        </div>
        <div class="compact-card blue">
          <div class="compact-icon">📅</div>
          <div class="compact-content">
            <div class="compact-value">${formatCurrency(totalMonthlyPayments, 'AUD')}</div>
            <div class="compact-label">Monthly Payments</div>
          </div>
        </div>
        <div class="compact-card teal">
          <div class="compact-icon">✅</div>
          <div class="compact-content">
            <div class="compact-value">${paidOffLoans}</div>
            <div class="compact-label">Paid Off</div>
          </div>
        </div>
        <div class="compact-card purple">
          <div class="compact-icon">📊</div>
          <div class="compact-content">
            <div class="compact-value">${loans.length}</div>
            <div class="compact-label">Total Loans</div>
          </div>
        </div>
      </div>

      <!-- Forms Section -->
      <div class="forms-section">
        <div id="loanFormSection" class="section-card form-section" style="display: none;">
          <div class="form-header">
            <h3 id="loanFormTitle">➕ Add New Loan</h3>
            <button class="btn btn-text" id="closeLoanForm">✕</button>
          </div>
          <form id="loanForm" class="styled-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Loan Name</label>
                <input type="text" name="name" class="form-input" placeholder="e.g., Home Mortgage, Car Loan..." required>
              </div>
              <div class="form-group">
                <label class="form-label">Loan Type</label>
                <select name="type" class="form-select" required>
                  <option value="mortgage">🏠 Mortgage</option>
                  <option value="vehicle">🚗 Vehicle</option>
                  <option value="personal">👤 Personal</option>
                  <option value="education">🎓 Education</option>
                  <option value="business">💼 Business</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Original Amount</label>
                <input type="number" name="originalAmount" class="form-input" step="0.01" placeholder="0.00" required>
              </div>
              <div class="form-group">
                <label class="form-label">Current Balance</label>
                <input type="number" name="currentBalance" class="form-input" step="0.01" placeholder="0.00" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Interest Rate (%)</label>
                <input type="number" name="interestRate" class="form-input" step="0.01" placeholder="0.00" required>
              </div>
              <div class="form-group">
                <label class="form-label">Term (months)</label>
                <input type="number" name="termMonths" class="form-input" placeholder="60" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Start Date</label>
                <input type="date" name="startDate" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">Payment Frequency</label>
                <select name="paymentFrequency" class="form-select" required>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly" selected>Monthly</option>
                </select>
              </div>
            </div>

            <div class="form-actions">
              <button class="btn btn-primary" type="submit">💾 Save Loan</button>
              <button class="btn btn-secondary" type="reset">🧹 Clear</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Loans List -->
      <div class="section-card">
        <div class="transactions-header">
          <h3>Your Loans</h3>
          <div class="transactions-controls">
            <span class="transactions-count" id="loansCount">${loans.length} loans</span>
            <select id="sortLoans" class="form-select">
              <option value="balance-desc">Highest Balance</option>
              <option value="balance-asc">Lowest Balance</option>
              <option value="interest-desc">Highest Interest</option>
              <option value="name-asc">Name A-Z</option>
              <option value="type-asc">Loan Type</option>
            </select>
          </div>
        </div>
        <div id="loansList"></div>
      </div>
    </div>
  `;

  setTimeout(() => mainContent.classList.remove('page-transition'), 400);

  // Initialize
  renderLoansList(loans, accounts);
  setupLoansEventListeners(loans, accounts);
}

// ============================================================================
// 🔁 Refresh Loan Cards
// ============================================================================
async function renderLoansList(loans, accounts) {
  const loansList = document.getElementById('loansList');
  const loansCount = document.getElementById('loansCount');

  if (!loans.length) {
    loansList.innerHTML = `
      <div class="empty-state">
        <p>No loans set up yet.</p>
        <button class="btn btn-primary" onclick="document.getElementById('btnAddDefaultLoans').click()">
          Add Demo Loans
        </button>
        <button class="btn btn-secondary" onclick="document.getElementById('btnNewLoan').click()">
          Create Your First Loan
        </button>
      </div>
    `;
    return;
  }

  // Apply sorting
  const sortBy = document.getElementById('sortLoans').value;
  const sortedLoans = [...loans].sort((a, b) => {
    switch (sortBy) {
      case 'balance-desc': return b.currentBalance - a.currentBalance;
      case 'balance-asc': return a.currentBalance - b.currentBalance;
      case 'interest-desc': return b.interestRate - a.interestRate;
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'type-asc': return a.type.localeCompare(b.type);
      default: return b.currentBalance - a.currentBalance;
    }
  });

  const loanCards = await Promise.all(sortedLoans.map(loan => renderLoanCard(loan, accounts)));
  loansList.innerHTML = loanCards.join('');

  loansCount.textContent = `${loans.length} loan${loans.length !== 1 ? 's' : ''}`;

  // Attach event listeners
  attachLoanCardEventListeners(loans);
}

// ============================================================================
// 💳 Enhanced Loan Card
// ============================================================================
async function renderLoanCard(loan, accounts) {
  const progress = ((loan.originalAmount - loan.currentBalance) / loan.originalAmount * 100).toFixed(1);
  const monthlyPayment = calculatePaymentAmount(loan);
  const offsetSavings = await calculateOffsetInterest(loan.id);
  const isPaidOff = loan.currentBalance <= 0;

  return `
    <div class="transaction-card ${isPaidOff ? 'paid' : 'active'}" data-id="${loan.id}">
      <div class="transaction-main">
        <div class="transaction-icon">${loan.icon || getLoanIcon(loan.type)}</div>
        <div class="transaction-details">
          <div class="transaction-title">${loan.name}</div>
          <div class="transaction-meta">
            <span class="transaction-type ${loan.type}">${getLoanTypeLabel(loan.type)}</span>
            <span class="transaction-interest">${loan.interestRate}% APR</span>
            <span class="transaction-term">${loan.termMonths} months</span>
          </div>
          <div class="loan-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <span class="progress-text">${progress}% paid</span>
          </div>
          ${offsetSavings > 0 ? `
            <div class="offset-savings">
              💰 Offset saving ${formatCurrency(offsetSavings, loan.currency)}/month
            </div>
          ` : ''}
        </div>
        <div class="transaction-amount ${isPaidOff ? 'positive' : 'negative'}">
          ${isPaidOff ? '✅' : ''}${formatCurrency(loan.currentBalance, loan.currency)}
        </div>
      </div>
      <div class="transaction-actions">
        ${!isPaidOff ? `
          <button class="action-btn payment-btn" data-id="${loan.id}" title="Make Payment">💳</button>
        ` : ''}
        <button class="action-btn schedule-btn" data-id="${loan.id}" title="View Schedule">📅</button>
        <button class="action-btn edit-btn" data-id="${loan.id}" title="Edit">✏️</button>
        <button class="action-btn delete-btn" data-id="${loan.id}" title="Delete">🗑️</button>
      </div>
      ${!isPaidOff ? `
        <div class="loan-payment-info">
          <small>Next payment: ${formatCurrency(monthlyPayment, loan.currency)} ${loan.paymentFrequency}</small>
        </div>
      ` : ''}
    </div>
  `;
}

// ============================================================================
// 🎯 Event Listeners Setup
// ============================================================================
function setupLoansEventListeners(loans, accounts) {
  const btnNewLoan = document.getElementById('btnNewLoan');
  const btnAddDefaultLoans = document.getElementById('btnAddDefaultLoans');
  const loanFormSection = document.getElementById('loanFormSection');
  const closeLoanForm = document.getElementById('closeLoanForm');
  const loanForm = document.getElementById('loanForm');
  const sortSelect = document.getElementById('sortLoans');

  // Form toggle
  btnNewLoan.addEventListener('click', () => {
    const isVisible = loanFormSection.style.display === 'block';
    loanFormSection.style.display = isVisible ? 'none' : 'block';
    loanForm.reset();
    loanForm.dataset.id = '';
    document.getElementById('loanFormTitle').textContent = '➕ Add New Loan';
    loanForm.startDate.value = new Date().toISOString().split('T')[0];
    
    if (!isVisible) {
      loanFormSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  closeLoanForm.addEventListener('click', () => {
    loanFormSection.style.display = 'none';
  });

  // Add default loans
  btnAddDefaultLoans.addEventListener('click', addDefaultLoans);

  // Form submission
  loanForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const loanData = {
      name: formData.get('name'),
      type: formData.get('type'),
      originalAmount: parseFloat(formData.get('originalAmount')),
      currentBalance: parseFloat(formData.get('currentBalance')),
      interestRate: parseFloat(formData.get('interestRate')),
      termMonths: parseInt(formData.get('termMonths')),
      startDate: formData.get('startDate'),
      paymentFrequency: formData.get('paymentFrequency'),
      currency: 'AUD',
      icon: getLoanIcon(formData.get('type')),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (form.dataset.id) {
      // Editing existing loan
      loanData.id = form.dataset.id;
      await updateItem(STORE_NAMES.loans, loanData);
    } else {
      // Adding new loan
      loanData.id = generateId();
      await addItem(STORE_NAMES.loans, loanData);
    }

    loanFormSection.style.display = 'none';
    initLoansUI();
  });

  // Sorting
  sortSelect.addEventListener('change', () => {
    renderLoansList(loans, accounts);
  });
}

function attachLoanCardEventListeners(loans) {
  // Payment button
  document.querySelectorAll('.payment-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const loanId = e.target.closest('.payment-btn').dataset.id;
      showPaymentModal(loanId);
    });
  });

  // Schedule button
  document.querySelectorAll('.schedule-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const loanId = e.target.closest('.schedule-btn').dataset.id;
      viewAmortizationSchedule(loanId);
    });
  });

  // Edit button
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const loanId = e.target.closest('.edit-btn').dataset.id;
      openLoanEditor(loanId);
    });
  });

  // Delete button
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const loanId = e.target.closest('.delete-btn').dataset.id;
      const loan = loans.find(l => l.id === loanId);
      if (loan && confirm(`Are you sure you want to delete "${loan.name}"?`)) {
        await deleteItem(STORE_NAMES.loans, loanId);
        initLoansUI();
      }
    });
  });
}

// ============================================================================
// ✏️ Enhanced Loan Editor
// ============================================================================
function openLoanEditor(loanId) {
  getAllItems(STORE_NAMES.loans).then(loans => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const loanFormSection = document.getElementById('loanFormSection');
    const loanForm = document.getElementById('loanForm');
    const loanFormTitle = document.getElementById('loanFormTitle');

    loanFormTitle.textContent = '✏️ Edit Loan';
    loanForm.name.value = loan.name;
    loanForm.type.value = loan.type;
    loanForm.originalAmount.value = loan.originalAmount;
    loanForm.currentBalance.value = loan.currentBalance;
    loanForm.interestRate.value = loan.interestRate;
    loanForm.termMonths.value = loan.termMonths;
    loanForm.startDate.value = loan.startDate;
    loanForm.paymentFrequency.value = loan.paymentFrequency;
    loanForm.dataset.id = loan.id;

    loanFormSection.style.display = 'block';
    loanFormSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

// ============================================================================
// 💳 Enhanced Payment Modal
// ============================================================================
async function populatePaymentAccounts(loanId) {
  const accounts = await getAllItems(STORE_NAMES.accounts);
  const select = document.getElementById('paymentAccount');
  select.innerHTML += accounts
    .filter(a => a.balance > 0)
    .map(a => `<option value="${a.id}">${a.name} (${formatCurrency(a.balance, a.currency)})</option>`)
    .join('');
}

async function calculatePaymentBreakdown(loanId, amount) {
  const loan = await getAllItems(STORE_NAMES.loans).then(ls => ls.find(l => l.id === loanId));
  if (!loan || amount <= 0) return;
  const monthlyRate = loan.interestRate / 100 / 12;
  const interest = loan.currentBalance * monthlyRate;
  const principal = Math.min(amount - interest, loan.currentBalance);
  document.getElementById('paymentBreakdown').style.display = 'block';
  document.getElementById('breakdownPrincipal').textContent = formatCurrency(principal, loan.currency);
  document.getElementById('breakdownInterest').textContent = formatCurrency(interest, loan.currency);
  document.getElementById('breakdownTotal').textContent = formatCurrency(amount, loan.currency);
}

async function processLoanPaymentForm(loanId, modal) {
  const amount = parseFloat(document.getElementById('paymentAmount').value);
  const fromAccountId = document.getElementById('paymentAccount').value;
  const paymentDate = document.getElementById('paymentDate').value;
  if (!amount || !fromAccountId) return alert('Fill all fields');
  try {
    const res = await processLoanPayment(loanId, { amount, fromAccountId, paymentDate });
    alert(`✅ Payment success!\nPrincipal: ${formatCurrency(res.principal, 'AUD')}\nInterest: ${formatCurrency(res.interest, 'AUD')}\nNew Balance: ${formatCurrency(res.newBalance, 'AUD')}`);
    modal.remove();
    initLoansUI();
  } catch (err) {
    alert('❌ ' + err.message);
  }
}

function showPaymentModal(loanId) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>💳 Make Payment</h3>
        <button class="btn btn-text close-modal">✕</button>
      </div>
      <form id="paymentForm" class="styled-form">
        <div class="form-group">
          <label class="form-label">Amount</label>
          <input type="number" id="paymentAmount" class="form-input" step="0.01" placeholder="0.00" required>
        </div>
        
        <div class="form-group">
          <label class="form-label">From Account</label>
          <select id="paymentAccount" class="form-select" required>
            <option value="">-- Select Account --</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Date</label>
          <input type="date" id="paymentDate" class="form-input" value="${new Date().toISOString().split('T')[0]}">
        </div>

        <div id="paymentBreakdown" class="payment-breakdown" style="display: none;">
          <h4>Payment Breakdown</h4>
          <div class="breakdown-item">
            <span>Principal:</span>
            <strong id="breakdownPrincipal">$0.00</strong>
          </div>
          <div class="breakdown-item">
            <span>Interest:</span>
            <strong id="breakdownInterest">$0.00</strong>
          </div>
          <div class="breakdown-item total">
            <span>Total Payment:</span>
            <strong id="breakdownTotal">$0.00</strong>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">💳 Process Payment</button>
          <button type="button" class="btn btn-secondary" id="cancelPayment">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);

  populatePaymentAccounts(loanId);

  // Event listeners
  document.getElementById('cancelPayment').onclick = () => modal.remove();
  document.querySelector('.close-modal').onclick = () => modal.remove();
  
  document.getElementById('paymentAmount').oninput = (e) =>
    calculatePaymentBreakdown(loanId, parseFloat(e.target.value) || 0);
  
  document.getElementById('paymentForm').onsubmit = async (e) => {
    e.preventDefault();
    await processLoanPaymentForm(loanId, modal);
  };

  // Close modal on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// ============================================================================
// 📅 Enhanced Amortization Schedule Modal
// ============================================================================
function viewAmortizationSchedule(loanId) {
  getAllItems(STORE_NAMES.loans).then(loans => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const schedule = calculateAmortizationSchedule(loan);
    const totalInterest = calculateTotalInterest(loan);
    const totalPayments = schedule.reduce((sum, p) => sum + p.payment, 0);
    const finalPayment = schedule[schedule.length - 1];
    const payoffDate = finalPayment ? new Date(finalPayment.date).toLocaleDateString() : 'N/A';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal-content large">
        <div class="modal-header">
          <h3>📅 Amortization Schedule — ${loan.name}</h3>
          <button class="btn btn-text close-modal">✕</button>
        </div>

        <div class="schedule-summary-cards">
          <div class="summary-card">
            <div class="summary-value">${formatCurrency(loan.originalAmount, loan.currency)}</div>
            <div class="summary-label">Loan Amount</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${formatCurrency(totalInterest, loan.currency)}</div>
            <div class="summary-label">Total Interest</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${formatCurrency(totalPayments, loan.currency)}</div>
            <div class="summary-label">Total Payments</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${payoffDate}</div>
            <div class="summary-label">Payoff Date</div>
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Payment</th>
                <th>Principal</th>
                <th>Interest</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${schedule.slice(0, 12).map(p => `
                <tr>
                  <td>${p.period}</td>
                  <td>${new Date(p.date).toLocaleDateString()}</td>
                  <td>${formatCurrency(p.payment, loan.currency)}</td>
                  <td>${formatCurrency(p.principal, loan.currency)}</td>
                  <td>${formatCurrency(p.interest, loan.currency)}</td>
                  <td>${formatCurrency(p.balance, loan.currency)}</td>
                </tr>
              `).join('')}
              ${schedule.length > 12 ? `
                <tr class="schedule-more">
                  <td colspan="6" class="text-center">
                    ... and ${schedule.length - 12} more payments
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <div class="form-actions">
          <button class="btn btn-secondary" id="closeSchedule">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('closeSchedule').onclick = () => modal.remove();
    document.querySelector('.close-modal').onclick = () => modal.remove();
    
    // Close modal on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  });
}