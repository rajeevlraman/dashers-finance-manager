import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES } from './db.js';

const DEFAULT_ACCOUNTS = [
  // Bank Accounts
  { id: 'bank1', name: 'Main Checking', type: 'bank', balance: 0, currency: 'AUD' },
  { id: 'bank2', name: 'Savings Account', type: 'bank', balance: 0, currency: 'AUD' },
  
  // Credit Cards
  { id: 'credit1', name: 'Visa Credit Card', type: 'credit', balance: 0, currency: 'AUD', creditLimit: 5000 },
  { id: 'credit2', name: 'MasterCard', type: 'credit', balance: 0, currency: 'AUD', creditLimit: 3000 },
  
  // Offset Account
  { id: 'offset', name: 'Mortgage Offset', type: 'offset', balance: 0, currency: 'AUD' }
];

function generateId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Add default accounts function - FIXED
async function addDefaultAccounts() {
  console.log('📦 Adding default accounts...');
  
  const existingAccounts = await getAllItems(STORE_NAMES.accounts);
  const existingIds = existingAccounts.map(a => a.id);
  
  let addedCount = 0;
  for (const account of DEFAULT_ACCOUNTS) {
    // Only add if it doesn't already exist
    if (!existingIds.includes(account.id)) {
      await addItem(STORE_NAMES.accounts, {
        ...account,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      addedCount++;
      console.log('✅ Added account:', account.name);
    }
  }
  
  console.log(`📦 Added ${addedCount} default accounts`);
  initAccountsUI(); // Refresh the UI
}

export function initAccountsUI() {
  const mainContent = document.getElementById('mainContent');

  mainContent.innerHTML = `
    <div class="accounts-header">
      <h2>🏦 Accounts</h2>
      <div class="accounts-actions">
        <button id="btnNewAcc" class="btn-primary">➕ New Account</button>
        <button id="btnAddDefaults" class="btn-secondary">📦 Add Default Accounts</button>
      </div>
    </div>
    <div id="accList">Loading…</div>
  `;
  
  document.getElementById('btnNewAcc').addEventListener('click', () => openAccountEditor());
  document.getElementById('btnAddDefaults').addEventListener('click', addDefaultAccounts);
  
  refreshAccountList(mainContent);
}

function refreshAccountList(mainContent) {
  getAllItems(STORE_NAMES.accounts).then(accounts => {
    const listEl = document.getElementById('accList');
    if (!accounts.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>No accounts defined.</p>
          <button class="btn-primary" id="btnAddDefaultsEmpty">📦 Add Default Accounts</button>
        </div>
      `;
      
      // Add event listener properly - FIXED
      document.getElementById('btnAddDefaultsEmpty').addEventListener('click', addDefaultAccounts);
      return;
    }

    let html = `
      <div class="accounts-grid">
        ${accounts.map(account => {
          const isNegative = account.balance < 0;
          const isCredit = account.type === 'credit';
          const balanceClass = isNegative ? 'negative' : 'positive';
          const icon = getAccountIcon(account.type);
          
          return `
            <div class="account-card ${account.type}">
              <div class="account-header">
                <div class="account-icon">${icon}</div>
                <div class="account-info">
                  <h3 class="account-name">${account.name}</h3>
                  <span class="account-type">${getAccountTypeLabel(account.type)}</span>
                </div>
                <div class="account-balance ${balanceClass}">
                  ${formatCurrency(account.balance, account.currency)}
                  ${isCredit && account.creditLimit ? `
                    <div class="credit-limit">Limit: ${formatCurrency(account.creditLimit, account.currency)}</div>
                  ` : ''}
                </div>
              </div>
              <div class="account-actions">
                <button class="icon-btn edit-btn" data-id="${account.id}" data-action="edit" title="Edit">✏️</button>
                <button class="icon-btn delete-btn" data-id="${account.id}" data-action="delete" title="Delete">🗑️</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    listEl.innerHTML = html;

    // Event listeners
    listEl.querySelectorAll('.icon-btn').forEach(btn => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      btn.addEventListener('click', () => {
        if (action === 'edit') openAccountEditor(id);
        else if (action === 'delete') {
          if (confirm('Delete this account?')) {
            deleteItem(STORE_NAMES.accounts, id).then(() => refreshAccountList(mainContent));
          }
        }
      });
    });
  });
}

// Helper functions
function getAccountIcon(type) {
  const icons = {
    bank: '🏦',
    credit: '💳',
    cash: '💵',
    savings: '💰',
    investment: '📈',
    offset: '⚖️',
    other: '📁'
  };
  return icons[type] || '📁';
}

function getAccountTypeLabel(type) {
  const labels = {
    bank: 'Bank Account',
    credit: 'Credit Card',
    cash: 'Cash',
    savings: 'Savings',
    investment: 'Investment',
    offset: 'Offset Account',
    other: 'Other'
  };
  return labels[type] || 'Account';
}

function formatCurrency(amount, currency) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  });
  return formatter.format(amount);
}

function openAccountEditor(id) {
  if (id) {
    getAllItems(STORE_NAMES.accounts).then(list => {
      const acc = list.find(x => x.id === id);
      showAccountForm(acc);
    });
  } else {
    showAccountForm({ name: '', type: 'bank', balance: 0, currency: 'AUD' });
  }
}

function showAccountForm(acc) {
  const mainContent = document.getElementById('mainContent');

  mainContent.innerHTML = `
    <h2>${acc.id ? 'Edit' : 'New'} Account</h2>
    <form id="accForm" class="styled-form">
      <div class="form-group">
        <label class="form-label">Name</label>
        <input type="text" name="name" value="${acc.name}" class="form-input" required>
      </div>
      
      <div class="form-group">
        <label class="form-label">Type</label>
        <select name="type" class="form-select" required>
          <option value="bank" ${acc.type === 'bank' ? 'selected' : ''}>🏦 Bank Account</option>
          <option value="credit" ${acc.type === 'credit' ? 'selected' : ''}>💳 Credit Card</option>
          <option value="cash" ${acc.type === 'cash' ? 'selected' : ''}>💵 Cash</option>
          <option value="investment" ${acc.type === 'investment' ? 'selected' : ''}>📈 Investment</option>
          <option value="savings" ${acc.type === 'savings' ? 'selected' : ''}>💰 Savings</option>
          <option value="offset" ${acc.type === 'offset' ? 'selected' : ''}>⚖️ Offset Account</option>
          <option value="other" ${acc.type === 'other' ? 'selected' : ''}>📁 Other</option>
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">Starting Balance</label>
        <input type="number" step="0.01" name="balance" value="${acc.balance}" class="form-input" required>
        <small class="form-hint">Use negative for credit cards (amount owed)</small>
      </div>
      
      <div class="form-group">
        <label class="form-label">Currency</label>
        <select name="currency" class="form-select" required>
          <option value="USD" ${acc.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
          <option value="EUR" ${acc.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
          <option value="GBP" ${acc.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
          <option value="CAD" ${acc.currency === 'CAD' ? 'selected' : ''}>CAD ($)</option>
          <option value="AUD" ${acc.currency === 'AUD' ? 'selected' : ''}>AUD ($)</option>
        </select>
      </div>
      
      <div id="creditFields" class="form-group" style="display: ${acc.type === 'credit' ? 'block' : 'none'}">
        <label class="form-label">Credit Limit</label>
        <input type="number" step="0.01" name="creditLimit" value="${acc.creditLimit || 0}" class="form-input">
      </div>

      <div class="form-actions">
        <button class="btn-primary" type="submit">${acc.id ? '💾 Update' : '➕ Add'} Account</button>
        <button class="btn-secondary" type="button" id="btnCancel">Cancel</button>
      </div>
    </form>
  `;

  // Show/hide credit limit field
  document.querySelector('select[name="type"]').addEventListener('change', function() {
    document.getElementById('creditFields').style.display = this.value === 'credit' ? 'block' : 'none';
  });

  document.getElementById('btnCancel').addEventListener('click', () => initAccountsUI());

  document.getElementById('accForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const newAcc = {
      id: acc.id || generateId(),
      name: formData.get('name').trim(),
      type: formData.get('type'),
      balance: parseFloat(formData.get('balance')),
      currency: formData.get('currency'),
      createdAt: acc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add credit limit for credit cards
    if (newAcc.type === 'credit') {
      newAcc.creditLimit = parseFloat(formData.get('creditLimit')) || 0;
    }

    try {
      if (acc.id) {
        await updateItem(STORE_NAMES.accounts, newAcc);
      } else {
        await addItem(STORE_NAMES.accounts, newAcc);
      }
      initAccountsUI();
    } catch (err) {
      console.error("❌ Error saving account:", err);
      alert("Error saving account: " + err.message);
    }
  });
}