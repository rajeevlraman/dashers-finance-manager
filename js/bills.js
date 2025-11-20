import { addItem, deleteItem, getAllItems, updateItem, STORE_NAMES } from './db.js';
import { addItem as addTransaction } from './db.js'; // For creating transactions

export async function initBillsUI() {
  const mainContent = document.getElementById('mainContent');
  const bills = await getAllItems(STORE_NAMES.bills);
  const accounts = await getAllItems(STORE_NAMES.accounts); // Get accounts for selection
  const today = new Date().toISOString().slice(0, 10);

  mainContent.innerHTML = `
    <h2>Bills</h2>
    <button id="btnNewBill" class="button">➕ Add Bill</button>
    <div id="billsList">
      ${bills.length === 0
        ? '<p>No bills set.</p>'
        : `<table class="table">
            <thead>
              <tr>
                <th>Name</th><th>Amount</th><th>Due Date</th><th>Account</th><th>Recurring</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${bills.map(b => {
                const account = accounts.find(a => a.id === b.accountId);
                const overdue = (b.dueDate < today) && !b.paid;
                const status = b.paid
                  ? '✅ Paid'
                  : (overdue ? '❌ Overdue' : '⏳ Upcoming');
                return `
                  <tr>
                    <td>${b.name}</td>
                    <td>${b.amount.toFixed(2)}</td>
                    <td>${b.dueDate}</td>
                    <td>${account ? account.name : 'Not set'}</td>
                    <td>${b.recurring || '-'}</td>
                    <td>${status}</td>
                    <td>
                      <button class="button" data-id="${b.id}" data-action="edit">Edit</button>
                      <button class="button red" data-id="${b.id}" data-action="delete">Delete</button>
                      ${!b.paid ? `<button class="button green" data-id="${b.id}" data-action="markPaid">Mark Paid</button>` : ''}
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>`}
    </div>
  `;

  document.getElementById('btnNewBill').addEventListener('click', () => openBillEditor());

  document.querySelectorAll('#billsList .button').forEach(btn => {
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    btn.addEventListener('click', async () => {
      const all = await getAllItems(STORE_NAMES.bills);
      const bill = all.find(b => b.id === id);
      if (!bill) return;

      if (action === 'edit') {
        openBillEditor(id);
      } else if (action === 'delete') {
        if (confirm('Delete this bill?')) {
          await deleteItem(STORE_NAMES.bills, id);
          initBillsUI();
        }
      } else if (action === 'markPaid') {
        await markBillAsPaid(bill);
      }
    });
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
      amount: bill.amount,
      date: new Date().toISOString().slice(0, 10),
      categoryId: await getBillCategoryId(bill.name),
      accountId: bill.accountId,
      description: `Bill: ${bill.name}`,
      billId: bill.id // Link transaction to bill
    };
    await addTransaction(STORE_NAMES.transactions, transaction);
    console.log(`✅ Created transaction for bill: ${bill.name}`);
  }

  // Handle recurring bills
  if (bill.recurring) {
    let nextDate = getNextDueDate(bill.dueDate, bill.recurring);
    for (let i = 0; i < 2; i++) {
      const newBill = {
        name: bill.name,
        amount: bill.amount,
        dueDate: nextDate,
        paid: false,
        recurring: bill.recurring,
        accountId: bill.accountId // Preserve account selection
      };
      await addItem(STORE_NAMES.bills, newBill);
      nextDate = getNextDueDate(nextDate, bill.recurring);
    }
  }

  initBillsUI();
}

async function getBillCategoryId(billName) {
  // Smart category matching for bills
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

async function openBillEditor(id = null) {
  const mainContent = document.getElementById('mainContent');
  const all = await getAllItems(STORE_NAMES.bills);
  const accounts = await getAllItems(STORE_NAMES.accounts);
  const bill = id
    ? all.find(b => b.id === id)
    : {
        name: '',
        amount: 0,
        dueDate: new Date().toISOString().slice(0, 10),
        paid: false,
        recurring: '',
        accountId: ''
      };

  mainContent.innerHTML = `
    <h2>${id ? 'Edit' : 'New'} Bill</h2>
    <form id="billForm">
      <label>Name: <input name="name" value="${bill.name}" required></label><br>
      <label>Amount: <input name="amount" type="number" step="0.01" value="${bill.amount}" required></label><br>
      <label>Due Date: <input name="dueDate" type="date" value="${bill.dueDate}" required></label><br>
      <label>Pay From Account:
        <select name="accountId">
          <option value="">-- Select Account --</option>
          ${accounts.map(acc => `
            <option value="${acc.id}" ${acc.id === bill.accountId ? 'selected' : ''}>
              ${getAccountIcon(acc.type)} ${acc.name} (${formatCurrency(acc.balance, acc.currency)})
            </option>
          `).join('')}
        </select>
      </label><br>
      <label>Recurring:
        <select name="recurring">
          <option value="">None</option>
          <option value="weekly" ${bill.recurring === 'weekly' ? 'selected' : ''}>Weekly</option>
          <option value="fortnightly" ${bill.recurring === 'fortnightly' ? 'selected' : ''}>Fortnightly</option>
          <option value="monthly" ${bill.recurring === 'monthly' ? 'selected' : ''}>Monthly</option>
          <option value="quarterly" ${bill.recurring === 'quarterly' ? 'selected' : ''}>Quarterly</option>
          <option value="annually" ${bill.recurring === 'annually' ? 'selected' : ''}>Annually</option>
        </select>
      </label><br>
      <button class="button" type="submit">💾 Save</button>
      <button class="button red" type="button" id="cancelBtn">Cancel</button>
    </form>
  `;

  document.getElementById('cancelBtn').addEventListener('click', initBillsUI);
  document.getElementById('billForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const updated = {
      name: form.name.value,
      amount: parseFloat(form.amount.value),
      dueDate: form.dueDate.value,
      paid: bill.paid || false,
      recurring: form.recurring.value,
      accountId: form.accountId.value
    };

    if (id) {
      updated.id = bill.id;
      await updateItem(STORE_NAMES.bills, updated);
    } else {
      await addItem(STORE_NAMES.bills, updated);
    }

    initBillsUI();
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

// Helper functions
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