// ============================================================================
// 🏠 properties.js — Property Manager for Budget Tracker
// ----------------------------------------------------------------------------
// Handles CRUD for properties and integrates with IndexedDB.
// Uses STORE_NAMES.properties, tenants, maintenance.
// ============================================================================

import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES, generateId } from './db.js';
import { html } from './utils/html.js';
import { initTenantsUI } from './tenants.js';
import { initMaintenanceUI } from './maintenance.js'; // ✅ FIX: this was missing!

// ============================================================================
// 🎯 Initialization
// ============================================================================
export async function initPropertiesUI() {
  console.log("🏠 Property Manager initialized");

  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="properties-header">
      <h2>🏠 Properties</h2>
      <div class="properties-actions">
        <button id="btnNewProperty" class="btn-primary">➕ Add Property</button>
      </div>
    </div>
    <div id="propertiesList">Loading...</div>
  `;

  document.getElementById('btnNewProperty').addEventListener('click', () => openPropertyForm());
  await refreshPropertiesList();
}

// ============================================================================
// 🔁 Refresh List
// ============================================================================
async function refreshPropertiesList() {
  const properties = await getAllItems(STORE_NAMES.properties);
  const list = document.getElementById('propertiesList');

  if (!properties.length) {
    list.innerHTML = `
      <div class="empty-state">
        <p>No properties yet.</p>
        <button class="btn-primary" id="btnAddFirstProperty">➕ Add Property</button>
      </div>
    `;
    document.getElementById('btnAddFirstProperty').addEventListener('click', () => openPropertyForm());
    return;
  }

  // ✅ FIX: Wait for async cards to resolve before rendering
  const cards = await Promise.all(properties.map(p => renderPropertyCard(p)));
  list.innerHTML = `<div class="properties-grid">${cards.join('')}</div>`;

  // ✅ FIX: Correctly attach event handlers
  list.querySelectorAll('.property-action-btn').forEach(btn => {
    const { id, action } = btn.dataset;
    if (action === 'edit') btn.onclick = () => openPropertyForm(id);
    if (action === 'delete') btn.onclick = () => confirmDeleteProperty(id);
    if (action === 'view-tenants') btn.onclick = () => initTenantsUI(id);
    if (action === 'view-maintenance') btn.onclick = () => initMaintenanceUI(id);
  });
}

// ============================================================================
// 🧾 Render Property Card
// ============================================================================
async function renderPropertyCard(p) {
  // Load related data
  const [tenants, maintenanceLogs] = await Promise.all([
    getAllItems(STORE_NAMES.tenants),
    getAllItems(STORE_NAMES.maintenance)
  ]);

  // Get tenant linked to this property
  const tenant = tenants.find(t => t.propertyId === p.id);

  // Get maintenance cost for current year
  const currentYear = new Date().getFullYear();
  const propertyLogs = maintenanceLogs.filter(
    log => log.propertyId === p.id && new Date(log.date).getFullYear() === currentYear
  );
  const totalMaintenanceYTD = propertyLogs.reduce((sum, log) => sum + (parseFloat(log.cost) || 0), 0);

  // ROI and Value Δ calculations
  const roi = p.purchasePrice && p.rent
    ? ((p.rent * 12) / p.purchasePrice * 100).toFixed(1)
    : 'N/A';
  const valueChange = p.currentValue && p.purchasePrice
    ? ((p.currentValue - p.purchasePrice) / p.purchasePrice * 100).toFixed(1)
    : '0';

  return html`
    <div class="property-card">
      <div class="property-info">
        <h3>${p.name || 'Unnamed Property'}</h3>
        <p>${p.address || 'No address provided'}</p>

        <div class="property-values">
          <span>💰 Purchase: ${formatCurrency(p.purchasePrice, 'AUD')}</span>
          <span>🏡 Value: ${formatCurrency(p.currentValue, 'AUD')}</span>
          <span>💸 Rent: ${formatCurrency(p.rent, 'AUD')}/mo</span>
        </div>

        <div class="property-metrics">
          <span>ROI: ${roi}%</span>
          <span>Value Δ: ${valueChange}%</span>
        </div>

        <div class="property-maintenance">
          <strong>🧾 Maintenance YTD:</strong> ${formatCurrency(totalMaintenanceYTD, 'AUD')}
        </div>

        <div class="property-tenant-info">
          ${tenant ? `
            <hr>
            <div class="tenant-info">
              <strong>👤 Tenant:</strong> ${tenant.name}<br>
              ${tenant.rent ? `<strong>💸 Rent:</strong> ${formatCurrency(tenant.rent, tenant.currency || 'AUD')}/mo<br>` : ''}
              ${tenant.startDate ? `<strong>📅 Since:</strong> ${new Date(tenant.startDate).toLocaleDateString('en-AU')}<br>` : ''}
            </div>
          ` : `
            <hr>
            <div class="tenant-info vacant">
              🏠 <em>Vacant — No tenant assigned</em>
            </div>
          `}
        </div>
      </div>

      <div class="property-actions">
        <button class="property-action-btn" data-id="${p.id}" data-action="view-tenants">👤 Tenants</button>
        <button class="property-action-btn" data-id="${p.id}" data-action="view-maintenance">🧰</button>
        <button class="property-action-btn" data-id="${p.id}" data-action="edit">✏️</button>
        <button class="property-action-btn" data-id="${p.id}" data-action="delete">🗑️</button>
      </div>
    </div>
  `;
}

// ============================================================================
// ➕ Add / Edit Property Form
// ============================================================================
async function openPropertyForm(id = null) {
  const main = document.getElementById('mainContent');
  const existing = id
    ? (await getAllItems(STORE_NAMES.properties)).find(p => p.id === id)
    : null;

  const property = existing || {
    name: '',
    address: '',
    purchasePrice: '',
    currentValue: '',
    rent: '',
  };

  main.innerHTML = `
    <div class="property-form-container">
      <h2>${id ? '✏️ Edit Property' : '➕ Add New Property'}</h2>
      <form id="propertyForm" class="styled-form">
        <div class="form-group">
          <label>Property Name</label>
          <input type="text" name="name" value="${property.name}" required>
        </div>

        <div class="form-group">
          <label>Address</label>
          <input type="text" name="address" value="${property.address}" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Purchase Price</label>
            <input type="number" name="purchasePrice" value="${property.purchasePrice}" step="0.01" min="0" required>
          </div>
          <div class="form-group">
            <label>Current Value</label>
            <input type="number" name="currentValue" value="${property.currentValue}" step="0.01" min="0" required>
          </div>
        </div>

        <div class="form-group">
          <label>Monthly Rent</label>
          <input type="number" name="rent" value="${property.rent}" step="0.01" min="0">
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">${id ? '💾 Update' : '➕ Add Property'}</button>
          <button type="button" id="btnCancel" class="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('btnCancel').addEventListener('click', initPropertiesUI);

  document.getElementById('propertyForm').addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = {
      id: property.id || generateId(),
      name: formData.get('name').trim(),
      address: formData.get('address').trim(),
      purchasePrice: parseFloat(formData.get('purchasePrice')),
      currentValue: parseFloat(formData.get('currentValue')),
      rent: parseFloat(formData.get('rent')),
      createdAt: property.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (id) {
        await updateItem(STORE_NAMES.properties, data);
        console.log(`✅ Updated property: ${data.name}`);
      } else {
        await addItem(STORE_NAMES.properties, data);
        console.log(`✅ Added new property: ${data.name}`);
      }
      await initPropertiesUI();
    } catch (err) {
      console.error('❌ Error saving property:', err);
      alert('Error saving property. Check console for details.');
    }
  });
}

// ============================================================================
// ❌ Delete Property (with confirmation)
// ============================================================================
async function confirmDeleteProperty(id) {
  if (!confirm('Are you sure you want to delete this property? This will remove all related tenants and maintenance records.')) return;

  try {
    await deleteItem(STORE_NAMES.properties, id);
    console.log(`🗑️ Property ${id} deleted.`);
    await refreshPropertiesList();
  } catch (err) {
    console.error('❌ Error deleting property:', err);
    alert('Error deleting property.');
  }
}

// ============================================================================
// 💰 Utility
// ============================================================================
function formatCurrency(amount, currency = 'AUD') {
  if (isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
}
