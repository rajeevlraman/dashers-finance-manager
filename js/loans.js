// ============================================================================
// 🏦 loans.js — Enhanced Loans Module with Interest-Only Support
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
  },
  { 
    id: 'loan5', 
    name: 'Investment Property Loan', 
    type: 'investment', 
    originalAmount: 500000, 
    currentBalance: 500000, 
    interestRate: 5.2, 
    currency: 'AUD', 
    startDate: new Date().toISOString().split('T')[0], 
    termMonths: 360,
    interestOnlyMonths: 24, // 2 years interest-only period
    paymentFrequency: 'monthly',
    icon: '🏢'
  }
];

// ============================================================================
// 🎨 Helper Functions
// ============================================================================
function getLoanIcon(type) { 
  const icons = {
    mortgage: '🏠', 
    vehicle: '🚗', 
    personal: '👤', 
    education: '🎓', 
    business: '💼',
    investment: '🏢'
  };
  return icons[type] || '🏦'; 
}

function getLoanTypeLabel(type) { 
  const labels = {
    mortgage: 'Mortgage', 
    vehicle: 'Vehicle', 
    personal: 'Personal', 
    education: 'Education', 
    business: 'Business',
    investment: 'Investment'
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
// 🧮 Helper function for P&I payment calculation
// ============================================================================
function calculatePAndIPayment(balance, monthlyRate, remainingMonths) {
  if (monthlyRate === 0) return balance / remainingMonths;
  if (remainingMonths === 0) return balance;
  return balance * monthlyRate * Math.pow(1 + monthlyRate, remainingMonths) / 
         (Math.pow(1 + monthlyRate, remainingMonths) - 1);
}

// ============================================================================
// 🧹 Utility Functions
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
// 💰 Process Loan Payment with Interest-Only Support
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

  // Calculate months passed since loan start
  const startDate = new Date(loan.startDate);
  const currentDate = new Date(paymentDate);
  const monthsPassed = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                      (currentDate.getMonth() - startDate.getMonth());
  
  const isInterestOnlyPeriod = loan.interestOnlyMonths && monthsPassed < loan.interestOnlyMonths;
  
  const monthlyRate = loan.interestRate / 100 / 12;
  const interest = loan.currentBalance * monthlyRate;
  
  let principal = 0;
  if (isInterestOnlyPeriod) {
    // Interest-only payment - principal remains the same
    principal = 0;
    if (amount < interest) {
      throw new Error(`Interest-only payment must be at least ${formatCurrency(interest, loan.currency)}`);
    }
    // Any amount over interest goes to principal (optional early repayment)
    principal = Math.min(amount - interest, loan.currentBalance);
  } else {
    // Standard P&I payment
    principal = Math.min(amount - interest, loan.currentBalance);
  }

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
    isInterestOnly: isInterestOnlyPeriod,
    date: paymentDate,
    fromAccountId,
    description: `Loan payment - ${loan.name}${isInterestOnlyPeriod ? ' (Interest Only)' : ''}`,
    createdAt: new Date().toISOString()
  };

  const paymentTransaction = {
    id: generateId(),
    type: 'expense',
    amount,
    date: paymentDate,
    categoryId: await getLoanExpenseCategoryId(),
    accountId: fromAccountId,
    description: `Loan payment - ${loan.name}${isInterestOnlyPeriod ? ' (Interest Only)' : ''}`,
    createdAt: new Date().toISOString()
  };

  await updateItem(STORE_NAMES.loans, loan);
  await updateItem(STORE_NAMES.accounts, fromAccount);
  await addItem(STORE_NAMES.loanTransactions, loanTransaction);
  await addItem(STORE_NAMES.transactions, paymentTransaction);

  return { 
    principal, 
    interest, 
    newBalance: loan.currentBalance,
    isInterestOnly: isInterestOnlyPeriod
  };
}

// ============================================================================
// 🧮 Offset Interest Calculation
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
// 📂 Get or Create Loan Expense Category
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
  const totalMonthlyPayments = loans.reduce((sum, loan) => {
    const payment = calculatePaymentAmount(loan);
    return sum + (payment || 0);
  }, 0);
  const paidOffLoans = loans.filter(loan => loan.currentBalance <= 0).length;
  const interestOnlyLoans = loans.filter(loan => {
    if (!loan.interestOnlyMonths) return false;
    const startDate = new Date(loan.startDate);
    const now = new Date();
    const monthsPassed = (now.getFullYear() - startDate.getFullYear()) * 12 + 
                        (now.getMonth() - startDate.getMonth());
    return monthsPassed < loan.interestOnlyMonths;
  }).length;

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
        <div class="compact-card orange">
          <div class="compact-icon">⏰</div>
          <div class="compact-content">
            <div class="compact-value">${interestOnlyLoans}</div>
            <div class="compact-label">Interest Only</div>
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
                  <option value="investment">🏢 Investment</option>
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

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Interest-Only Period (months)</label>
                <input type="number" name="interestOnlyMonths" class="form-input" placeholder="0" min="0" value="0">
                <small class="form-hint">Set to 0 for Principal & Interest from start</small>
              </div>
              <div class="form-group">
                <label class="form-label">Remaining Interest-Only</label>
                <input type="number" name="remainingInterestOnlyMonths" class="form-input" placeholder="Auto-calculated" readonly>
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
              <option value="interest-only">Interest Only First</option>
            </select>
          </div>
        </div>
        <div id="loansList"></div>
      </div>
    </div>
  `;

  setTimeout(() => mainContent.classList.remove('page-transition'), 400);

  // Initialize with proper event delegation
  await refreshLoansList();
  setupLoansEventListeners();
  attachLoanCardEventListeners(); // This sets up event delegation
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
      case 'interest-only':
        const aIsInterestOnly = isLoanInterestOnly(a);
        const bIsInterestOnly = isLoanInterestOnly(b);
        if (aIsInterestOnly && !bIsInterestOnly) return -1;
        if (!aIsInterestOnly && bIsInterestOnly) return 1;
        return b.currentBalance - a.currentBalance;
      default: return b.currentBalance - a.currentBalance;
    }
  });

  const loanCards = await Promise.all(sortedLoans.map(loan => renderLoanCard(loan, accounts)));
  loansList.innerHTML = loanCards.join('');

  loansCount.textContent = `${loans.length} loan${loans.length !== 1 ? 's' : ''}`;

  // Attach event listeners
  attachLoanCardEventListeners(loans);
}

// Helper function to check if loan is in interest-only period
function isLoanInterestOnly(loan) {
  if (!loan.interestOnlyMonths) return false;
  const startDate = new Date(loan.startDate);
  const now = new Date();
  const monthsPassed = (now.getFullYear() - startDate.getFullYear()) * 12 + 
                      (now.getMonth() - startDate.getMonth());
  return monthsPassed < loan.interestOnlyMonths;
}

// ============================================================================
// 🔄 Fixed Loan Card Rendering
// ============================================================================
async function renderLoanCard(loan, accounts) {
  const progress = ((loan.originalAmount - loan.currentBalance) / loan.originalAmount * 100).toFixed(1);
  const monthlyPayment = calculatePaymentAmount(loan);
  const isPaidOff = loan.currentBalance <= 0;
  const isInterestOnly = isLoanInterestOnly(loan);
  const remainingInterestOnlyMonths = isInterestOnly ? 
    Math.max(loan.interestOnlyMonths - calculateMonthsPassed(loan.startDate), 0) : 0;

  const progressClass = parseFloat(progress) < 30 ? 'low' : parseFloat(progress) > 70 ? 'high' : '';

  return `
    <div class="loan-card ${loan.type} ${isInterestOnly ? 'interest-only' : ''} ${isPaidOff ? 'paid-off' : ''}" data-id="${loan.id}">
      <div class="loan-header">
        <div class="loan-name-type">
          <div class="loan-icon">${loan.icon || getLoanIcon(loan.type)}</div>
          <div class="loan-titles">
            <h4>${loan.name}</h4>
            <div class="loan-type">${getLoanTypeLabel(loan.type)}</div>
          </div>
        </div>
        <div class="loan-balance">
          <div class="current-balance">${formatCurrency(loan.currentBalance, loan.currency)}</div>
          <div class="original-amount">Original: ${formatCurrency(loan.originalAmount, loan.currency)}</div>
        </div>
      </div>

      <div class="loan-details">
        <div class="detail-item">
          <span class="detail-label">Interest Rate</span>
          <span class="detail-value interest-rate">${loan.interestRate}%</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Monthly Payment</span>
          <span class="detail-value monthly-payment">${formatCurrency(monthlyPayment, loan.currency)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Term</span>
          <span class="detail-value">${loan.termMonths} months</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Started</span>
          <span class="detail-value">${new Date(loan.startDate).toLocaleDateString()}</span>
        </div>
      </div>

      <div class="loan-progress">
        <div class="progress-header">
          <span>Progress</span>
          <span>${progress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${progressClass}" style="width: ${progress}%"></div>
        </div>
      </div>

      <div class="loan-status">
        ${isInterestOnly ? 
          `<span class="status-badge status-interest-only">⏰ Interest Only (${remainingInterestOnlyMonths} months left)</span>` : ''}
        ${isPaidOff ? 
          `<span class="status-badge status-paid-off">✅ Paid Off</span>` : 
          `<span class="status-badge status-active">Active</span>`}
      </div>

      <div class="loan-actions">
        ${!isPaidOff ? 
          `<button class="btn-icon pay" title="Make Payment" data-action="pay" data-id="${loan.id}">
            💳
          </button>` : ''}
        <button class="btn-icon edit" title="View Schedule" data-action="schedule" data-id="${loan.id}">
          📅
        </button>
        <button class="btn-icon edit" title="Edit Loan" data-action="edit" data-id="${loan.id}">
          ✏️
        </button>
        <button class="btn-icon delete" title="Delete Loan" data-action="delete" data-id="${loan.id}">
          🗑️
        </button>
      </div>
    </div>
  `;
}


// Helper function to calculate months passed
function calculateMonthsPassed(startDateStr) {
  const startDate = new Date(startDateStr);
  const now = new Date();
  return (now.getFullYear() - startDate.getFullYear()) * 12 + 
         (now.getMonth() - startDate.getMonth());
}

// ============================================================================
// 🎯 Fixed Event Listeners Setup
// ============================================================================
function setupLoansEventListeners() {
  const btnNewLoan = document.getElementById('btnNewLoan');
  const btnAddDefaultLoans = document.getElementById('btnAddDefaultLoans');
  const loanFormSection = document.getElementById('loanFormSection');
  const closeLoanForm = document.getElementById('closeLoanForm');
  const loanForm = document.getElementById('loanForm');
  const sortSelect = document.getElementById('sortLoans');

  // Form toggle
  if (btnNewLoan) {
    btnNewLoan.addEventListener('click', () => {
      const isVisible = loanFormSection.style.display === 'block';
      loanFormSection.style.display = isVisible ? 'none' : 'block';
      loanForm.reset();
      loanForm.dataset.id = '';
      document.getElementById('loanFormTitle').textContent = '➕ Add New Loan';
      const today = new Date().toISOString().split('T')[0];
      if (loanForm.startDate) loanForm.startDate.value = today;
      
      if (!isVisible) {
        loanFormSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  if (closeLoanForm) {
    closeLoanForm.addEventListener('click', () => {
      loanFormSection.style.display = 'none';
    });
  }

  // Add default loans
  if (btnAddDefaultLoans) {
    btnAddDefaultLoans.addEventListener('click', addDefaultLoans);
  }

  // Form submission
  if (loanForm) {
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
        interestOnlyMonths: parseInt(formData.get('interestOnlyMonths')) || 0,
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
      await refreshLoansList();
    });
  }

  // Sorting
  if (sortSelect) {
    sortSelect.addEventListener('change', async () => {
      const loans = await getAllItems(STORE_NAMES.loans);
      const accounts = await getAllItems(STORE_NAMES.accounts);
      renderLoansList(loans, accounts);
    });
  }

  // Setup interest-only calculation
  setupInterestOnlyCalculation();
}

function setupInterestOnlyCalculation() {
  const interestOnlyInput = document.querySelector('input[name="interestOnlyMonths"]');
  const startDateInput = document.querySelector('input[name="startDate"]');
  const remainingInput = document.querySelector('input[name="remainingInterestOnlyMonths"]');

  if (interestOnlyInput && startDateInput && remainingInput) {
    const calculateRemaining = () => {
      const startDate = startDateInput.value;
      const interestOnlyMonths = parseInt(interestOnlyInput.value) || 0;
      
      if (startDate && interestOnlyMonths > 0) {
        const start = new Date(startDate);
        const now = new Date();
        const monthsPassed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        const remaining = Math.max(interestOnlyMonths - monthsPassed, 0);
        remainingInput.value = remaining;
      } else {
        remainingInput.value = interestOnlyMonths;
      }
    };

    interestOnlyInput.addEventListener('input', calculateRemaining);
    startDateInput.addEventListener('change', calculateRemaining);
    
    // Calculate initial value
    calculateRemaining();
  }
}

// ============================================================================
// 🎯 Fixed Event Listener Attachment
// ============================================================================
function attachLoanCardEventListeners() {
  // Use event delegation for dynamic elements
  document.getElementById('loansList')?.addEventListener('click', async (e) => {
    const button = e.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    const loanId = button.dataset.id;
    
    if (!action || !loanId) return;

    const loans = await getAllItems(STORE_NAMES.loans);
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    switch (action) {
      case 'pay':
        showPaymentModal(loanId);
        break;
      case 'schedule':
        viewAmortizationSchedule(loanId);
        break;
      case 'edit':
        openLoanEditor(loanId);
        break;
      case 'delete':
        if (confirm(`Are you sure you want to delete "${loan.name}"?`)) {
          await deleteItem(STORE_NAMES.loans, loanId);
          await refreshLoansList();
        }
        break;
    }
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
    loanForm.interestOnlyMonths.value = loan.interestOnlyMonths || 0;
    loanForm.dataset.id = loan.id;

    // Calculate remaining interest-only months
    const remainingInput = document.querySelector('input[name="remainingInterestOnlyMonths"]');
    if (remainingInput && loan.interestOnlyMonths) {
      const monthsPassed = calculateMonthsPassed(loan.startDate);
      const remaining = Math.max(loan.interestOnlyMonths - monthsPassed, 0);
      remainingInput.value = remaining;
    }

    loanFormSection.style.display = 'block';
    loanFormSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

// ============================================================================
// 💳 Enhanced Payment Modal with Interest-Only Support
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
  
  let principal = 0;
  const isInterestOnly = isLoanInterestOnly(loan);
  
  if (isInterestOnly) {
    principal = Math.min(amount - interest, loan.currentBalance);
  } else {
    principal = Math.min(amount - interest, loan.currentBalance);
  }

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
    const message = `✅ Payment success!\nPrincipal: ${formatCurrency(res.principal, 'AUD')}\nInterest: ${formatCurrency(res.interest, 'AUD')}\nNew Balance: ${formatCurrency(res.newBalance, 'AUD')}${res.isInterestOnly ? '\n(Interest Only Payment)' : ''}`;
    alert(message);
    modal.remove();
    initLoansUI();
  } catch (err) {
    alert('❌ ' + err.message);
  }
}

function showPaymentModal(loanId) {
  getAllItems(STORE_NAMES.loans).then(loans => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    // Calculate interest-only status
    const isInterestOnly = isLoanInterestOnly(loan);
    const monthlyRate = loan.interestRate / 100 / 12;
    const interestOnlyPayment = loan.currentBalance * monthlyRate;
    const minimumPayment = isInterestOnly ? interestOnlyPayment : calculatePaymentAmount(loan);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>💳 Make Payment - ${loan.name}</h3>
          ${isInterestOnly ? '<div class="interest-only-alert">⚠️ This loan is in interest-only period</div>' : ''}
          <button class="btn btn-text close-modal">✕</button>
        </div>
        <form id="paymentForm" class="styled-form">
          <div class="form-group">
            <label class="form-label">Amount</label>
            <input type="number" id="paymentAmount" class="form-input" step="0.01" placeholder="0.00" required min="${minimumPayment}">
            <small class="form-hint">Minimum payment: ${formatCurrency(minimumPayment, loan.currency)} ${isInterestOnly ? '(Interest Only)' : '(P&I)'}</small>
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
  });
}

// ============================================================================
// 📅 Enhanced Amortization Schedule with Interest-Only Support
// ============================================================================
function viewAmortizationSchedule(loanId) {
  getAllItems(STORE_NAMES.loans).then(loans => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const schedule = calculateEnhancedAmortizationSchedule(loan);
    const totalInterest = schedule.reduce((sum, p) => sum + p.interest, 0);
    const totalPayments = schedule.reduce((sum, p) => sum + p.payment, 0);
    const finalPayment = schedule[schedule.length - 1];
    const payoffDate = finalPayment ? new Date(finalPayment.date).toLocaleDateString() : 'N/A';
    const interestOnlyPayments = schedule.filter(p => p.isInterestOnly).length;

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
            <div class="summary-value">${interestOnlyPayments}</div>
            <div class="summary-label">Interest-Only Payments</div>
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
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${schedule.slice(0, 12).map(p => `
                <tr class="${p.isInterestOnly ? 'interest-only-row' : ''}">
                  <td>${p.period}</td>
                  <td>${new Date(p.date).toLocaleDateString()}</td>
                  <td>${formatCurrency(p.payment, loan.currency)}</td>
                  <td>${formatCurrency(p.principal, loan.currency)}</td>
                  <td>${formatCurrency(p.interest, loan.currency)}</td>
                  <td>${formatCurrency(p.balance, loan.currency)}</td>
                  <td>${p.isInterestOnly ? 'Interest Only' : 'P&I'}</td>
                </tr>
              `).join('')}
              ${schedule.length > 12 ? `
                <tr class="schedule-more">
                  <td colspan="7" class="text-center">
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

// Enhanced amortization schedule with interest-only support
function calculateEnhancedAmortizationSchedule(loan) {
  const schedule = [];
  const monthlyRate = loan.interestRate / 100 / 12;
  let balance = loan.currentBalance;
  const startDate = new Date(loan.startDate);
  
  // Calculate months passed
  const now = new Date();
  const monthsPassed = (now.getFullYear() - startDate.getFullYear()) * 12 + 
                      (now.getMonth() - startDate.getMonth());
  
  const remainingInterestOnlyMonths = Math.max((loan.interestOnlyMonths || 0) - monthsPassed, 0);
  
  for (let period = 1; period <= loan.termMonths - monthsPassed; period++) {
    const periodDate = new Date(startDate);
    periodDate.setMonth(periodDate.getMonth() + monthsPassed + period);
    
    const interest = balance * monthlyRate;
    
    let principal, payment;
    const isInterestOnlyPeriod = period <= remainingInterestOnlyMonths;
    
    if (isInterestOnlyPeriod) {
      // Interest-only payment
      payment = interest;
      principal = 0;
    } else {
      // Standard P&I payment after interest-only period
      const remainingMonths = loan.termMonths - monthsPassed - remainingInterestOnlyMonths - (period - remainingInterestOnlyMonths - 1);
      payment = calculatePAndIPayment(balance, monthlyRate, remainingMonths);
      principal = payment - interest;
    }
    
    // Ensure we don't overpay in the final period
    if (principal > balance) {
      principal = balance;
      payment = principal + interest;
    }
    
    balance -= principal;
    
    schedule.push({
      period: monthsPassed + period,
      date: periodDate.toISOString().split('T')[0],
      payment,
      principal,
      interest,
      balance: Math.max(balance, 0),
      isInterestOnly: isInterestOnlyPeriod
    });
    
    if (balance <= 0) break;
  }
  
  return schedule;
}