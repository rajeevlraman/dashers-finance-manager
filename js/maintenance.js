// ============================================================================
// 🧰 maintenance.js — Property Maintenance Manager (Synced with Transactions)
// Tracks repair logs, upkeep, and inspection costs for each property
// ============================================================================

import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES, generateId } from './db.js';
import { html } from './utils/html.js';
import { initPropertiesUI } from './properties.js';

// ============================================================================
// 🏗️ Initialize Maintenance UI
// ============================================================================
export async function initMaintenanceUI(propertyId = null) {
  console.log('🧰 Maintenance Manager initialized');
  const main = document.getElementById('mainContent');

  main.innerHTML = `
    <div class="maintenance-header">
      <h2>🧰 Maintenance Logs</h2>
      <div class="maintenance-actions">
        <button id="btnNewMaintenance" class="btn-primary">➕ Add Maintenance</button>
        ${propertyId ? `<button id="btnBackToProperties" class="btn-secondary">⬅️ Back to Property</button>` : ''}
      </div>
    </div>
    <div id="maintenanceList">Loading...</div>
  `;

  if (propertyId) {
    document.getElementById('btnBackToProperties').addEventListener('click', () => initPropertiesUI());
  }

  document.getElementById('btnNewMaintenance').addEventListener('click', () => openMaintenanceForm(propertyId));
  await refreshMaintenanceList(propertyId);
}

// ============================================================================
// 🔁 Refresh List
// ============================================================================
async function refreshMaintenanceList(propertyId = null) {
  const logs = await getAllItems(STORE_NAMES.maintenance);
  const properties = await getAllItems(STORE_NAMES.properties);

  const filtered = propertyId ? logs.filter(l => l.propertyId === propertyId) : logs;
  const list = document.getElementById('maintenanceList');

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-state">
        <p>No maintenance records found.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = `
    <div class="maintenance-grid">
      ${filtered.map(log => renderMaintenanceCard(log, properties)).join('')}
    </div>
  `;

  list.querySelectorAll('.maintenance-action-btn').forEach(btn => {
    const { id, action } = btn.dataset;
    if (action === 'edit') btn.onclick = () => openMaintenanceForm(null, id);
    if (action === 'delete') btn.onclick = () => confirmDeleteMaintenance(id);
  });
}

// ============================================================================
// 🧾 Render Maintenance Card
// ============================================================================
function renderMaintenanceCard(log, properties) {
  const property = properties.find(p => p.id === log.propertyId);
  const statusColor = log.status === 'Completed' ? 'green' : 'orange';

  return html`
    <div class="maintenance-card">
      <h3>${log.title}</h3>
      <p>${log.description || ''}</p>
      <div><strong>Property:</strong> ${property ? property.name : 'Unknown'}</div>
      <div><strong>Category:</strong> ${log.category || 'General'}</div>
      <div><strong>Date:</strong> ${new Date(log.date).toLocaleDateString()}</div>
      <div><strong>Cost:</strong> ${formatCurrency(log.cost, 'AUD')}</div>
      <div><strong>Status:</strong> <span style="color:${statusColor};">${log.status}</span></div>
      <div class="maintenance-actions">
        <button class="maintenance-action-btn" data-id="${log.id}" data-action="edit">✏️</button>
        <button class="maintenance-action-btn" data-id="${log.id}" data-action="delete">🗑️</button>
      </div>
    </div>
  `;
}

// ============================================================================
// ➕ Add / Edit Form (syncs to transactions)
// ============================================================================
async function openMaintenanceForm(propertyId = null, id = null) {
  const main = document.getElementById('mainContent');
  const properties = await getAllItems(STORE_NAMES.properties);
  let log = id ? (await getAllItems(STORE_NAMES.maintenance)).find(l => l.id === id) : null;

  if (!log) {
    log = {
      id: null,
      propertyId: propertyId || '',
      title: '',
      description: '',
      category: 'General',
      cost: 0,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending'
    };
  }

  main.innerHTML = `
    <div class="maintenance-form-container">
      <h2>${log.id ? 'Edit Maintenance' : 'Add Maintenance'}</h2>
      <form id="maintenanceForm" class="styled-form">
        <div class="form-group">
          <label>Property</label>
          <select name="propertyId" class="form-select" required>
            <option value="">-- Select Property --</option>
            ${properties.map(p => `<option value="${p.id}" ${p.id === log.propertyId ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Title</label>
          <input type="text" name="title" value="${log.title}" required>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description">${log.description}</textarea>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select name="category" class="form-select">
            <option value="General" ${log.category === 'General' ? 'selected' : ''}>General</option>
            <option value="Plumbing" ${log.category === 'Plumbing' ? 'selected' : ''}>Plumbing</option>
            <option value="Electrical" ${log.category === 'Electrical' ? 'selected' : ''}>Electrical</option>
            <option value="Painting" ${log.category === 'Painting' ? 'selected' : ''}>Painting</option>
            <option value="Garden" ${log.category === 'Garden' ? 'selected' : ''}>Garden</option>
          </select>
        </div>
        <div class="form-group">
          <label>Cost (AUD)</label>
          <input type="number" step="0.01" name="cost" value="${log.cost}">
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" name="date" value="${log.date}">
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="status" class="form-select">
            <option value="Pending" ${log.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Completed" ${log.status === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">💾 Save</button>
          <button type="button" id="btnCancel" class="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('btnCancel').addEventListener('click', () => initMaintenanceUI(propertyId));

  document.getElementById('maintenanceForm').addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const newLog = {
      id: log.id || generateId(),
      propertyId: formData.get('propertyId'),
      title: formData.get('title').trim(),
      description: formData.get('description').trim(),
      category: formData.get('category'),
      cost: parseFloat(formData.get('cost') || 0),
      date: formData.get('date'),
      status: formData.get('status'),
      createdAt: log.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (log.id) await updateItem(STORE_NAMES.maintenance, newLog);
      else await addItem(STORE_NAMES.maintenance, newLog);

      // ✅ Sync maintenance with transactions
      await syncMaintenanceToTransaction(newLog);

      initMaintenanceUI(propertyId);
    } catch (err) {
      console.error('❌ Error saving maintenance:', err);
      alert('Error saving maintenance record');
    }
  });
}

// ============================================================================
// 🔄 Sync Maintenance Record to Transactions
// ============================================================================
async function syncMaintenanceToTransaction(log) {
  const txs = await getAllItems(STORE_NAMES.transactions);
  const existing = txs.find(t => t.maintenanceId === log.id);

  const transaction = {
    id: existing?.id || generateId(),
    maintenanceId: log.id,
    type: 'expense',
    categoryId: log.category,
    description: log.title || 'Maintenance Expense',
    amount: parseFloat(log.cost) || 0,
    date: log.date,
    propertyId: log.propertyId,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existing) await updateItem(STORE_NAMES.transactions, transaction);
  else await addItem(STORE_NAMES.transactions, transaction);
}

// ============================================================================
// ❌ Delete Maintenance (also remove linked transaction)
// ============================================================================
async function confirmDeleteMaintenance(id) {
  if (!confirm('Delete this maintenance record?')) return;
  await deleteItem(STORE_NAMES.maintenance, id);

  const txs = await getAllItems(STORE_NAMES.transactions);
  const linked = txs.find(t => t.maintenanceId === id);
  if (linked) await deleteItem(STORE_NAMES.transactions, linked.id);

  await refreshMaintenanceList();
}

// ============================================================================
// 💰 Utility: Format Currency
// ============================================================================
function formatCurrency(amount, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount || 0);
}
