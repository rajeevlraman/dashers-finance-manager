import { addItem, deleteItem, getAllItems, updateItem, STORE_NAMES } from './db.js';

export async function initRecurringUI() {
  const mainContent = document.getElementById('mainContent');
  const categories = await getAllItems(STORE_NAMES.categories);
  const accounts = await getAllItems(STORE_NAMES.accounts);
  const recurring = await getAllItems(STORE_NAMES.recurringTransactions);

  mainContent.innerHTML = `
    <h2>Recurring Transactions</h2>
    <button id="btnNewRec" class="button">➕ Add Recurring Transaction</button>
    <div id="recList">
      ${recurring.length === 0
        ? '<p>No recurring transactions defined.</p>'
        : '<table class="table"><thead><tr><th>Name</th><th>Type</th><th>Amount</th><th>Account</th><th>Start Date</th><th>Frequency</th><th>Category</th><th>Actions</th></tr></thead><tbody>' +
          recurring.map(r => {
            const account = accounts.find(a => a.id === r.accountId);
            return `
            <tr>
              <td>${r.name}</td>
              <td>${r.type}</td>
              <td>${r.amount.toFixed(2)}</td>
              <td>${account ? account.name : 'Not set'}</td>
              <td>${r.startDate}</td>
              <td>${r.frequency}</td>
              <td>${categories.find(c=>c.id===r.categoryId)?.name || '—'}</td>
              <td>
                <button class="button" data-id="${r.id}" data-action="edit">Edit</button>
                <button class="button red" data-id="${r.id}" data-action="delete">Delete</button>
              </td>
            </tr>
          `}).join('') + '</tbody></table>'}
    </div>
  `;

  document.getElementById('btnNewRec').addEventListener('click', () => openRecEditor());

  document.querySelectorAll('#recList .button').forEach(btn => {
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    btn.addEventListener('click', async () => {
      if (action === 'edit') {
        openRecEditor(id);
      } else if (action === 'delete') {
        if (confirm('Delete this recurring transaction?')) {
          await deleteItem(STORE_NAMES.recurringTransactions, id);
          initRecurringUI();
        }
      }
    });
  });

  async function openRecEditor(id=null) {
    const rec = id
      ? (await getAllItems(STORE_NAMES.recurringTransactions)).find(r => r.id === id)
      : { 
          name:'', 
          type:'expense', 
          amount:0, 
          startDate:new Date().toISOString().slice(0,10), 
          frequency:'monthly', 
          categoryId:'',
          accountId: ''
        };

    const accounts = await getAllItems(STORE_NAMES.accounts);
    const categories = await getAllItems(STORE_NAMES.categories);

    mainContent.innerHTML = `
      <h2>${id ? 'Edit' : 'New'} Recurring Transaction</h2>
      <form id="recForm">
        <label>Name: <input name="name" value="${rec.name}" required></label><br>
        <label>Type:
          <select name="type">
            <option value="expense"${rec.type==='expense'?' selected':''}>Expense</option>
            <option value="income"${rec.type==='income'?' selected':''}>Income</option>
          </select>
        </label><br>
        <label>Amount: <input name="amount" type="number" step="0.01" value="${rec.amount}" required></label><br>
        <label>Account:
          <select name="accountId">
            <option value="">-- Select Account --</option>
            ${accounts.map(acc => `
              <option value="${acc.id}" ${acc.id === rec.accountId ? 'selected' : ''}>
                ${getAccountIcon(acc.type)} ${acc.name}
              </option>
            `).join('')}
          </select>
        </label><br>
        <label>Start Date: <input name="startDate" type="date" value="${rec.startDate}" required></label><br>
        <label>Frequency:
          <select name="frequency">
            <option value="monthly"${rec.frequency==='monthly'?' selected':''}>Monthly</option>
            <option value="weekly"${rec.frequency==='weekly'?' selected':''}>Weekly</option>
            <option value="annually"${rec.frequency==='annually'?' selected':''}>Annually</option>
          </select>
        </label><br>
        <label>Category:
          <select name="categoryId" required>
            <option value="">-- Select Category --</option>
            ${categories.map(c => `<option value="${c.id}"${c.id===rec.categoryId?' selected':''}>${c.name}</option>`).join('')}
          </select>
        </label><br>
        <button class="button" type="submit">💾 Save</button>
        <button class="button red" type="button" id="cancelBtn">Cancel</button>
      </form>
    `;

    document.getElementById('cancelBtn').addEventListener('click', initRecurringUI);
    document.getElementById('recForm').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      const newRec = {
        id: rec.id,
        name: form.name.value,
        type: form.type.value,
        amount: parseFloat(form.amount.value),
        startDate: form.startDate.value,
        frequency: form.frequency.value,
        categoryId: form.categoryId.value,
        accountId: form.accountId.value
      };
      const fn = rec.id ? updateItem : addItem;
      await fn(STORE_NAMES.recurringTransactions, newRec);
      initRecurringUI();
    });
  }
}

// Helper function
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