import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES } from './db.js';

const DEFAULT_ACCOUNTS = [
  { id: 'bank1', name: 'Main Checking', type: 'bank', balance: 0, currency: 'AUD' },
  { id: 'bank2', name: 'Savings Account', type: 'bank', balance: 0, currency: 'AUD' },
  { id: 'credit1', name: 'Visa Credit Card', type: 'credit', balance: 0, currency: 'AUD', creditLimit: 5000 },
  { id: 'credit2', name: 'MasterCard', type: 'credit', balance: 0, currency: 'AUD', creditLimit: 3000 },
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

// Add default accounts
async function addDefaultAccounts() {
  console.log('📦 Adding default accounts...');
  const existing = await getAllItems(STORE_NAMES.accounts);
  const existingIds = existing.map(a => a.id);

  let added = 0;
  for (const acc of DEFAULT_ACCOUNTS) {
    if (!existingIds.includes(acc.id)) {
      await addItem(STORE_NAMES.accounts, {
        ...acc,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      added++;
    }
  }

  console.log(`✅ Added ${added} default accounts`);
  initAccountsUI();
}

export function initAccountsUI() {
  const main = document.getElementById('mainContent');
  main.classList.add('page-transition');

  main.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>🏦 Accounts</h2>
        <div class="page-actions">
          <button id="btnNewAcc" class="btn btn-primary">➕ New Account</button>
          <button id="btnAddDefaults" class="btn btn-secondary">📦 Add Defaults</button>
        </div>
      </div>

      <div class="section-card">
        <div id="accList" class="accounts-grid">Loading…</div>
      </div>
    </div>
  `;

  setTimeout(() => main.classList.remove('page-transition'), 400);

  document.getElementById('btnNewAcc').addEventListener('click', () => openAccountEditor());
  document.getElementById('btnAddDefaults').addEventListener('click', addDefaultAccounts);

  refreshAccountList();
}

function refreshAccountList() {
  getAllItems(STORE_NAMES.accounts).then(accounts => {
    const listEl = document.getElementById('accList');

    if (!accounts.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>No accounts yet.</p>
          <button class="btn btn-primary" id="btnAddDefaultsEmpty">📦 Add Default Accounts</button>
        </div>
      `;
      document.getElementById('btnAddDefaultsEmpty').addEventListener('click', addDefaultAccounts);
      return;
    }

    listEl.innerHTML = accounts.map(account => {
      const isNegative = account.balance < 0;
      const isCredit = account.type === 'credit';
      const balanceClass = isNegative ? 'negative' : 'positive';
      const icon = getAccountIcon(account.type);

      return `
        <div class="account-card">
          <div class="account-header">
            <div class="account-icon">${icon}</div>
            <div class="account-info">
              <h4 class="account-name">${account.name}</h4>
              <p class="account-type">${getAccountTypeLabel(account.type)}</p>
            </div>
            <div class="account-balance ${balanceClass}">
              ${formatCurrency(account.balance, account.currency)}
              ${isCredit && account.creditLimit ? `
                <div class="credit-limit">Limit: ${formatCurrency(account.creditLimit, account.currency)}</div>
              ` : ''}
            </div>
          </div>
          <div class="account-actions">
            <button class="btn btn-secondary" data-id="${account.id}" data-action="edit">✏️ Edit</button>
            <button class="btn btn-danger" data-id="${account.id}" data-action="delete">🗑️ Delete</button>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('button').forEach(btn => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      btn.addEventListener('click', () => {
        if (action === 'edit') openAccountEditor(id);
        else if (action === 'delete') {
          if (confirm('Delete this account?')) {
            deleteItem(STORE_NAMES.accounts, id).then(refreshAccountList);
          }
        }
      });
    });
  });
}

// Helpers
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
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
  const main = document.getElementById('mainContent');
  main.classList.add('page-transition');

  main.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>${acc.id ? '✏️ Edit' : '➕ New'} Account</h2>
      </div>

      <div class="section-card">
        <form id="accForm" class="styled-form">
          <div class="form-group">
            <label>Name</label>
            <input type="text" name="name" value="${acc.name}" class="form-input" required>
          </div>

          <div class="form-group">
            <label>Type</label>
            <select name="type" class="form-select" required>
              <option value="bank" ${acc.type === 'bank' ? 'selected' : ''}>🏦 Bank</option>
              <option value="credit" ${acc.type === 'credit' ? 'selected' : ''}>💳 Credit</option>
              <option value="cash" ${acc.type === 'cash' ? 'selected' : ''}>💵 Cash</option>
              <option value="investment" ${acc.type === 'investment' ? 'selected' : ''}>📈 Investment</option>
              <option value="savings" ${acc.type === 'savings' ? 'selected' : ''}>💰 Savings</option>
              <option value="offset" ${acc.type === 'offset' ? 'selected' : ''}>⚖️ Offset</option>
              <option value="other" ${acc.type === 'other' ? 'selected' : ''}>📁 Other</option>
            </select>
          </div>

          <div class="form-group">
            <label>Starting Balance</label>
            <input type="number" step="0.01" name="balance" value="${acc.balance}" class="form-input" required>
            <small class="form-hint">Use negative for owed balances.</small>
          </div>

          <div class="form-group">
            <label>Currency</label>
            <select name="currency" class="form-select" required>
              ${['AUD','USD','EUR','GBP','CAD'].map(cur => `
                <option value="${cur}" ${acc.currency === cur ? 'selected' : ''}>${cur}</option>
              `).join('')}
            </select>
          </div>

          <div id="creditFields" class="form-group" style="display:${acc.type === 'credit' ? 'block' : 'none'};">
            <label>Credit Limit</label>
            <input type="number" step="0.01" name="creditLimit" value="${acc.creditLimit || 0}" class="form-input">
          </div>

          <div class="form-actions">
            <button class="btn btn-primary" type="submit">${acc.id ? '💾 Update' : '➕ Add'} Account</button>
            <button class="btn btn-secondary" type="button" id="btnCancel">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;

  setTimeout(() => main.classList.remove('page-transition'), 400);

  document.querySelector('select[name="type"]').addEventListener('change', function() {
    document.getElementById('creditFields').style.display = this.value === 'credit' ? 'block' : 'none';
  });

  document.getElementById('btnCancel').addEventListener('click', initAccountsUI);

  document.getElementById('accForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);

    const newAcc = {
      id: acc.id || generateId(),
      name: data.get('name').trim(),
      type: data.get('type'),
      balance: parseFloat(data.get('balance')),
      currency: data.get('currency'),
      createdAt: acc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (newAcc.type === 'credit') {
      newAcc.creditLimit = parseFloat(data.get('creditLimit')) || 0;
    }

    if (acc.id) await updateItem(STORE_NAMES.accounts, newAcc);
    else await addItem(STORE_NAMES.accounts, newAcc);

    initAccountsUI();
  });
}
