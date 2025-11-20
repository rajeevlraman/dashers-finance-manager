// ============================================================================
// 👤 tenants.js — Tenant Manager for Budget Tracker
// ----------------------------------------------------------------------------
// Linked to STORE_NAMES.tenants, associated with STORE_NAMES.properties.
// ============================================================================

import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES, generateId } from './db.js';
import { html } from './utils/html.js';

// ============================================================================
// 🎯 Initialization
// ============================================================================
export async function initTenantsUI(propertyId = null) {
  console.log("👤 Tenant Manager initialized");

  const main = document.getElementById('mainContent');

  // Header
  let headerHTML = `
    <div class="tenants-header">
      <h2>👤 Tenants</h2>
      <div class="tenants-actions">
        <button id="btnNewTenant" class="btn-primary">➕ Add Tenant</button>
      </div>
    </div>
  `;

  if (propertyId) {
    const properties = await getAllItems(STORE_NAMES.properties);
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      headerHTML += `<p class="linked-property">🏠 Linked to: <strong>${property.name}</strong></p>`;
    }
  }

  main.innerHTML = `${headerHTML}<div id="tenantsList">Loading...</div>`;

document.getElementById('btnNewTenant').addEventListener('click', () => openTenantLinkModal(propertyId));
  await refreshTenantsList(propertyId);
}

// ============================================================================
// 🔁 Refresh List
// ============================================================================
async function refreshTenantsList(propertyId = null) {
  const tenants = await getAllItems(STORE_NAMES.tenants);
  const list = document.getElementById('tenantsList');

  const filtered = propertyId ? tenants.filter(t => t.propertyId === propertyId) : tenants;

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-state">
        <p>No tenants found${propertyId ? ' for this property' : ''}.</p>
        <button class="btn-primary" id="btnAddFirstTenant">➕ Add Tenant</button>
      </div>
    `;
    document.getElementById('btnAddFirstTenant').addEventListener('click', () => openTenantForm(propertyId));
    return;
  }

  const cards = filtered.map(t => renderTenantCard(t)).join('');
  list.innerHTML = `<div class="tenants-grid">${cards}</div>`;

  list.querySelectorAll('.tenant-action-btn').forEach(btn => {
    const { id, action } = btn.dataset;
    if (action === 'edit') btn.onclick = () => openTenantForm(propertyId, id);
    if (action === 'delete') btn.onclick = () => confirmDeleteTenant(id, propertyId);
  });
}

// ============================================================================
// 🧾 Render Tenant Card
// ============================================================================
function renderTenantCard(t) {
  const statusEmoji = t.status === 'active' ? '🟢' : '⚪';
  return html`
    <div class="tenant-card ${t.status}">
      <div class="tenant-info">
        <h3>${statusEmoji} ${t.name}</h3>
        <p>📞 ${t.phone || '-'} | ✉️ ${t.email || '-'}</p>
        <p>💰 Rent: ${formatCurrency(t.rentAmount || 0, 'AUD')}/mo</p>
        <p>📅 ${formatDate(t.leaseStart)} → ${formatDate(t.leaseEnd)}</p>
        <p>Status: <strong>${t.status || 'unknown'}</strong></p>
      </div>
      <div class="tenant-actions">
        <button class="tenant-action-btn" data-id="${t.id}" data-action="edit">✏️</button>
        <button class="tenant-action-btn" data-id="${t.id}" data-action="delete">🗑️</button>
      </div>
    </div>`;
}

// ============================================================================
// ➕ Add / Edit Tenant Form
// ============================================================================
async function openTenantForm(propertyId = null, id = null) {
  const main = document.getElementById('mainContent');
  const existing = id
    ? (await getAllItems(STORE_NAMES.tenants)).find(t => t.id === id)
    : null;

  const tenant = existing || {
    name: '',
    phone: '',
    email: '',
    leaseStart: new Date().toISOString().split('T')[0],
    leaseEnd: '',
    rentAmount: '',
    status: 'active',
    propertyId: propertyId || ''
  };

  const properties = await getAllItems(STORE_NAMES.properties);

  main.innerHTML = `
    <div class="tenant-form-container">
      <h2>${id ? '✏️ Edit Tenant' : '➕ Add New Tenant'}</h2>
      <form id="tenantForm" class="styled-form">
        <div class="form-group">
          <label>Name</label>
          <input type="text" name="name" value="${tenant.name}" required>
        </div>

        <div class="form-group">
          <label>Property</label>
          <select name="propertyId" required>
            <option value="">-- Select Property --</option>
            ${properties.map(p => `<option value="${p.id}" ${p.id === tenant.propertyId ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Phone</label>
          <input type="text" name="phone" value="${tenant.phone}">
        </div>

        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" value="${tenant.email}">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Lease Start</label>
            <input type="date" name="leaseStart" value="${tenant.leaseStart}">
          </div>
          <div class="form-group">
            <label>Lease End</label>
            <input type="date" name="leaseEnd" value="${tenant.leaseEnd}">
          </div>
        </div>

        <div class="form-group">
          <label>Monthly Rent</label>
          <input type="number" step="0.01" name="rentAmount" value="${tenant.rentAmount}">
        </div>

        <div class="form-group">
          <label>Status</label>
          <select name="status">
            <option value="active" ${tenant.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="vacated" ${tenant.status === 'vacated' ? 'selected' : ''}>Vacated</option>
          </select>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">${id ? '💾 Update' : '➕ Add Tenant'}</button>
          <button type="button" id="btnCancel" class="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('btnCancel').addEventListener('click', () => {
    if (propertyId) initTenantsUI(propertyId);
    else initTenantsUI();
  });

  document.getElementById('tenantForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const data = {
      id: tenant.id || generateId(),
      propertyId: formData.get('propertyId'),
      name: formData.get('name').trim(),
      phone: formData.get('phone').trim(),
      email: formData.get('email').trim(),
      leaseStart: formData.get('leaseStart'),
      leaseEnd: formData.get('leaseEnd'),
      rentAmount: parseFloat(formData.get('rentAmount')) || 0,
      status: formData.get('status'),
      createdAt: tenant.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (id) {
        await updateItem(STORE_NAMES.tenants, data);
        console.log(`✅ Updated tenant: ${data.name}`);
      } else {
        await addItem(STORE_NAMES.tenants, data);
        console.log(`✅ Added new tenant: ${data.name}`);
      }

      await initTenantsUI(propertyId);
    } catch (err) {
      console.error('❌ Error saving tenant:', err);
      alert('Error saving tenant.');
    }
  });
}

// ============================================================================
// ❌ Delete Tenant
// ============================================================================
async function confirmDeleteTenant(id, propertyId = null) {
  if (!confirm('Are you sure you want to delete this tenant?')) return;

  try {
    await deleteItem(STORE_NAMES.tenants, id);
    console.log(`🗑️ Tenant ${id} deleted.`);
    await refreshTenantsList(propertyId);
  } catch (err) {
    console.error('❌ Error deleting tenant:', err);
    alert('Error deleting tenant.');
  }
}

// ============================================================================
// 🔗 Link or Create Tenant Modal
// ============================================================================
async function openTenantLinkModal(propertyId) {
  const tenants = await getAllItems(STORE_NAMES.tenants);
  const unlinked = tenants.filter(t => !t.propertyId); // show only tenants not linked to any property

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>👤 Link or Add Tenant</h3>
      <p>Select an existing tenant or create a new one for this property.</p>

      <form id="tenantLinkForm" class="styled-form">
        <div class="form-group">
          <label>Select Existing Tenant</label>
          <select id="existingTenantSelect" class="form-select">
            <option value="">-- None (Add New) --</option>
            ${unlinked.map(t => `<option value="${t.id}">${t.name} (${t.email || 'no email'})</option>`).join('')}
          </select>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">✅ Link Tenant</button>
          <button type="button" class="btn-secondary" id="btnAddNewTenant">➕ Add New Tenant</button>
          <button type="button" class="btn-secondary" id="btnCancelTenantLink">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Cancel button
  modal.querySelector('#btnCancelTenantLink').onclick = () => modal.remove();

  // Add new tenant button
  modal.querySelector('#btnAddNewTenant').onclick = () => {
    modal.remove();
    openTenantForm(propertyId); // existing add form
  };

  // Handle linking existing tenant
  modal.querySelector('#tenantLinkForm').onsubmit = async e => {
    e.preventDefault();
    const selectedId = document.getElementById('existingTenantSelect').value;
    if (!selectedId) {
      alert('Please select a tenant or choose "Add New"');
      return;
    }

    try {
      const tenants = await getAllItems(STORE_NAMES.tenants);
      const tenant = tenants.find(t => t.id === selectedId);
      if (!tenant) return alert('Tenant not found');

      tenant.propertyId = propertyId;
      tenant.updatedAt = new Date().toISOString();
      await updateItem(STORE_NAMES.tenants, tenant);

      modal.remove();
      alert(`✅ Linked ${tenant.name} to property.`);
      await initTenantsUI(propertyId);
    } catch (err) {
      console.error('❌ Error linking tenant:', err);
      alert('Error linking tenant.');
    }
  };
}


// ============================================================================
// 💡 Utilities
// ============================================================================
function formatCurrency(amount, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
}
function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}
