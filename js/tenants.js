// ============================================================================
// 👤 tenants.js — Enhanced Tenant Manager
// ============================================================================

import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES, generateId } from './db.js';

export class TenantsManager {
    constructor() {
        this.tenants = [];
        this.properties = [];
        this.currentPropertyId = null;
    }

    async init(propertyId = null) {
        this.currentPropertyId = propertyId;
        await this.loadData();
        this.renderUI();
        this.attachEventListeners();
    }

    async loadData() {
        [this.tenants, this.properties] = await Promise.all([
            getAllItems(STORE_NAMES.tenants),
            getAllItems(STORE_NAMES.properties)
        ]);
    }

    renderUI() {
        const mainContent = document.getElementById('mainContent');
        const currentProperty = this.properties.find(p => p.id === this.currentPropertyId);
        
        mainContent.innerHTML = `
            <div class="tenants-container">
                <div class="tenants-header">
                    <div class="header-main">
                        <h2>👤 Tenant Management</h2>
                        <button id="btnNewTenant" class="btn btn-primary">➕ Add Tenant</button>
                    </div>
                    ${currentProperty ? `
                        <div class="linked-property-info">
                            <span class="property-badge">🏠</span>
                            <div class="property-details">
                                <strong>${currentProperty.name}</strong>
                                <span class="property-address">${currentProperty.address || 'No address'}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>

                ${this.renderTenantStats()}

                ${this.renderQuickActions()}

                <div class="tenants-content">
                    ${this.renderTenantsList()}
                </div>

                ${this.renderTenantModal()}
            </div>
        `;
    }

    renderTenantStats() {
        const filteredTenants = this.getFilteredTenants();
        const activeTenants = filteredTenants.filter(t => t.status === 'active');
        const totalRent = activeTenants.reduce((sum, t) => sum + (parseFloat(t.rentAmount) || 0), 0);
        const vacantProperties = this.currentPropertyId ? 
            [] : this.properties.filter(p => !this.tenants.some(t => t.propertyId === p.id && t.status === 'active'));

        return `
            <div class="tenant-stats">
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-content">
                        <div class="stat-value">${filteredTenants.length}</div>
                        <div class="stat-label">Total Tenants</div>
                        <div class="stat-subtext">${activeTenants.length} active</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.formatCurrency(totalRent)}</div>
                        <div class="stat-label">Monthly Rent</div>
                        <div class="stat-subtext">From ${activeTenants.length} tenants</div>
                    </div>
                </div>
                ${!this.currentPropertyId ? `
                    <div class="stat-card">
                        <div class="stat-icon">🏠</div>
                        <div class="stat-content">
                            <div class="stat-value">${vacantProperties.length}</div>
                            <div class="stat-label">Vacant Properties</div>
                            <div class="stat-subtext">Available for rent</div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderQuickActions() {
        return `
            <div class="horizontal-quick-actions">
                <div class="quick-action-item primary" id="quickAddTenant">
                    <span class="quick-action-icon">➕</span>
                    <span class="quick-action-text">Add Tenant</span>
                </div>
                ${!this.currentPropertyId ? `
                    <div class="quick-action-item secondary" id="quickViewActive">
                        <span class="quick-action-icon">🟢</span>
                        <span class="quick-action-text">Active Tenants</span>
                    </div>
                    <div class="quick-action-item warning" id="quickViewVacant">
                        <span class="quick-action-icon">🏠</span>
                        <span class="quick-action-text">Vacant Properties</span>
                    </div>
                ` : ''}
                <div class="quick-action-item success" id="quickExport">
                    <span class="quick-action-icon">📤</span>
                    <span class="quick-action-text">Export</span>
                </div>
            </div>
        `;
    }

    renderTenantsList() {
        const filteredTenants = this.getFilteredTenants();

        if (filteredTenants.length === 0) {
            return this.renderEmptyState();
        }

        const tenantsHtml = filteredTenants.map(tenant => this.renderTenantCard(tenant)).join('');
        return `<div class="tenants-grid">${tenantsHtml}</div>`;
    }

    renderTenantCard(tenant) {
        const property = this.properties.find(p => p.id === tenant.propertyId);
        const daysUntilLeaseEnd = tenant.leaseEnd ? 
            Math.ceil((new Date(tenant.leaseEnd) - new Date()) / (1000 * 60 * 60 * 24)) : null;
        
        const statusInfo = this.getTenantStatusInfo(tenant.status, daysUntilLeaseEnd);

        return `
            <div class="tenant-card ${statusInfo.class}">
                <div class="tenant-header">
                    <div class="tenant-status ${statusInfo.class}">
                        <span class="status-icon">${statusInfo.icon}</span>
                        <span class="status-text">${statusInfo.text}</span>
                    </div>
                    <h3 class="tenant-name">${tenant.name}</h3>
                </div>

                <div class="tenant-details">
                    <div class="detail-item">
                        <span class="detail-label">📞 Phone:</span>
                        <span class="detail-value">${tenant.phone || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">✉️ Email:</span>
                        <span class="detail-value">${tenant.email || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">💰 Rent:</span>
                        <span class="detail-value rent-amount">${this.formatCurrency(tenant.rentAmount)}/mo</span>
                    </div>
                    ${property ? `
                        <div class="detail-item">
                            <span class="detail-label">🏠 Property:</span>
                            <span class="detail-value property-name">${property.name}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="lease-info">
                    <div class="lease-dates">
                        <span class="lease-start">📅 ${this.formatDate(tenant.leaseStart)}</span>
                        <span class="lease-arrow">→</span>
                        <span class="lease-end">${this.formatDate(tenant.leaseEnd)}</span>
                    </div>
                    ${daysUntilLeaseEnd !== null && daysUntilLeaseEnd <= 30 ? `
                        <div class="lease-warning">
                            ⏰ ${daysUntilLeaseEnd} days remaining
                        </div>
                    ` : ''}
                </div>

                <div class="tenant-actions">
                    <button class="btn-action edit" data-action="edit" data-id="${tenant.id}">
                        ✏️ Edit
                    </button>
                    <button class="btn-action delete" data-action="delete" data-id="${tenant.id}">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    renderTenantModal() {
        const propertyOptions = this.properties.map(p => 
            `<option value="${p.id}">${p.name}${this.currentPropertyId && p.id === this.currentPropertyId ? ' (Current)' : ''}</option>`
        ).join('');

        return `
            <div id="tenantModal" class="modal-overlay" style="display: none;">
                <div class="modal">
                    <div class="modal-header">
                        <h3 id="modalTitle">Add New Tenant</h3>
                        <button class="btn-close" id="closeModal">✕</button>
                    </div>
                    <form id="tenantForm" class="modal-form">
                        <input type="hidden" id="editTenantId" value="">
                        
                        <div class="form-group">
                            <label>Tenant Name</label>
                            <input type="text" id="tenantName" class="form-input" placeholder="Full name" required>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Phone</label>
                                <input type="text" id="tenantPhone" class="form-input" placeholder="Phone number">
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="tenantEmail" class="form-input" placeholder="Email address">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Property</label>
                            <select id="tenantProperty" class="form-select" ${this.currentPropertyId ? 'disabled' : ''} required>
                                <option value="">Select Property</option>
                                ${propertyOptions}
                            </select>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Lease Start</label>
                                <input type="date" id="leaseStart" class="form-input" required>
                            </div>
                            <div class="form-group">
                                <label>Lease End</label>
                                <input type="date" id="leaseEnd" class="form-input">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Monthly Rent</label>
                                <input type="number" id="rentAmount" class="form-input" step="0.01" min="0" required>
                            </div>
                            <div class="form-group">
                                <label>Status</label>
                                <select id="tenantStatus" class="form-select">
                                    <option value="active">🟢 Active</option>
                                    <option value="vacated">⚪ Vacated</option>
                                    <option value="pending">🟡 Pending</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">💾 Save Tenant</button>
                            <button type="button" class="btn btn-secondary" id="cancelTenant">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="section-card">
                <div class="empty-state">
                    <div class="empty-icon">👤</div>
                    <h3>No Tenants Found</h3>
                    <p>${this.currentPropertyId ? 
                        'This property has no tenants yet.' : 
                        'No tenants have been added to your portfolio.'
                    }</p>
                    <button class="btn btn-primary" id="emptyAddTenant">Add Your First Tenant</button>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Quick actions
        document.getElementById('quickAddTenant')?.addEventListener('click', () => this.openTenantForm());
        document.getElementById('quickViewActive')?.addEventListener('click', () => this.filterActiveTenants());
        document.getElementById('quickViewVacant')?.addEventListener('click', () => this.showVacantProperties());
        document.getElementById('quickExport')?.addEventListener('click', () => this.exportTenants());
        document.getElementById('emptyAddTenant')?.addEventListener('click', () => this.openTenantForm());
        document.getElementById('btnNewTenant')?.addEventListener('click', () => this.openTenantForm());

        // Tenant actions
        document.addEventListener('click', (e) => {
            const button = e.target.closest('[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const tenantId = button.dataset.id;
            const tenant = this.tenants.find(t => t.id === tenantId);

            if (!tenant) return;

            switch (action) {
                case 'edit':
                    this.openTenantForm(tenant);
                    break;
                case 'delete':
                    this.deleteTenant(tenant);
                    break;
            }
        });

        // Modal events
        this.setupModalEvents();
    }

    setupModalEvents() {
        const modal = document.getElementById('tenantModal');
        const form = document.getElementById('tenantForm');
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelTenant');

        [closeBtn, cancelBtn].forEach(btn => {
            btn?.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveTenant();
            modal.style.display = 'none';
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Core functionality
    async openTenantForm(tenant = null) {
        const modal = document.getElementById('tenantModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('tenantForm');

        if (tenant) {
            title.textContent = 'Edit Tenant';
            document.getElementById('editTenantId').value = tenant.id;
            document.getElementById('tenantName').value = tenant.name;
            document.getElementById('tenantPhone').value = tenant.phone || '';
            document.getElementById('tenantEmail').value = tenant.email || '';
            document.getElementById('tenantProperty').value = tenant.propertyId;
            document.getElementById('leaseStart').value = tenant.leaseStart;
            document.getElementById('leaseEnd').value = tenant.leaseEnd || '';
            document.getElementById('rentAmount').value = tenant.rentAmount;
            document.getElementById('tenantStatus').value = tenant.status || 'active';
        } else {
            title.textContent = 'Add New Tenant';
            form.reset();
            document.getElementById('editTenantId').value = '';
            document.getElementById('leaseStart').value = new Date().toISOString().slice(0, 10);
            
            if (this.currentPropertyId) {
                document.getElementById('tenantProperty').value = this.currentPropertyId;
            }
        }

        modal.style.display = 'flex';
    }

    async saveTenant() {
        const form = document.getElementById('tenantForm');
        const tenantId = document.getElementById('editTenantId').value;

        const tenantData = {
            id: tenantId || generateId(),
            name: document.getElementById('tenantName').value,
            phone: document.getElementById('tenantPhone').value,
            email: document.getElementById('tenantEmail').value,
            propertyId: document.getElementById('tenantProperty').value,
            leaseStart: document.getElementById('leaseStart').value,
            leaseEnd: document.getElementById('leaseEnd').value,
            rentAmount: parseFloat(document.getElementById('rentAmount').value) || 0,
            status: document.getElementById('tenantStatus').value,
            createdAt: tenantId ? this.tenants.find(t => t.id === tenantId)?.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            if (tenantId) {
                await updateItem(STORE_NAMES.tenants, tenantData);
            } else {
                await addItem(STORE_NAMES.tenants, tenantData);
            }
            await this.init(this.currentPropertyId);
        } catch (error) {
            console.error('Error saving tenant:', error);
            alert('Error saving tenant. Please try again.');
        }
    }

    async deleteTenant(tenant) {
        if (!confirm(`Delete tenant "${tenant.name}"?`)) return;

        try {
            await deleteItem(STORE_NAMES.tenants, tenant.id);
            await this.init(this.currentPropertyId);
        } catch (error) {
            console.error('Error deleting tenant:', error);
            alert('Error deleting tenant.');
        }
    }

    // Helper methods
    getFilteredTenants() {
        if (this.currentPropertyId) {
            return this.tenants.filter(t => t.propertyId === this.currentPropertyId);
        }
        return this.tenants;
    }

    getTenantStatusInfo(status, daysUntilLeaseEnd) {
        if (status === 'vacated') {
            return { icon: '⚪', text: 'Vacated', class: 'vacated' };
        }
        if (status === 'pending') {
            return { icon: '🟡', text: 'Pending', class: 'pending' };
        }
        if (daysUntilLeaseEnd !== null && daysUntilLeaseEnd <= 30) {
            return { icon: '🟠', text: 'Lease Ending', class: 'ending' };
        }
        return { icon: '🟢', text: 'Active', class: 'active' };
    }

    filterActiveTenants() {
        const activeTenants = this.tenants.filter(t => t.status === 'active');
        this.renderFilteredTenants(activeTenants, 'Active Tenants');
    }

    showVacantProperties() {
        const vacantProperties = this.properties.filter(p => 
            !this.tenants.some(t => t.propertyId === p.id && t.status === 'active')
        );
        // You could render these in a modal or separate view
        alert(`Found ${vacantProperties.length} vacant properties`);
    }

    renderFilteredTenants(filteredTenants, title) {
        const tenantsContent = document.querySelector('.tenants-content');
        const tenantsHtml = filteredTenants.map(tenant => this.renderTenantCard(tenant)).join('');
        
        tenantsContent.innerHTML = `
            <div class="filtered-header">
                <h3>${title} (${filteredTenants.length})</h3>
                <button class="btn btn-secondary" id="clearFilter">Show All</button>
            </div>
            <div class="tenants-grid">${tenantsHtml}</div>
        `;

        document.getElementById('clearFilter')?.addEventListener('click', () => {
            this.renderUI();
        });
    }

    exportTenants() {
        const csv = this.convertToCSV(this.getFilteredTenants());
        this.downloadCSV(csv, 'tenants-export.csv');
    }

    convertToCSV(tenants) {
        const headers = ['Name', 'Phone', 'Email', 'Property', 'Rent', 'Lease Start', 'Lease End', 'Status'];
        const rows = tenants.map(t => [
            t.name,
            t.phone || '',
            t.email || '',
            this.properties.find(p => p.id === t.propertyId)?.name || 'Unknown',
            t.rentAmount,
            t.leaseStart,
            t.leaseEnd || '',
            t.status
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    formatCurrency(amount) {
        if (isNaN(amount)) return '$0.00';
        return new Intl.NumberFormat('en-AU', { 
            style: 'currency', 
            currency: 'AUD' 
        }).format(amount);
    }

    formatDate(date) {
        if (!date) return 'Not set';
        return new Date(date).toLocaleDateString('en-AU', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
    }
}

// Backwards compatibility
export async function initTenantsUI(propertyId = null) {
    const manager = new TenantsManager();
    await manager.init(propertyId);
}