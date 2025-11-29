// ============================================================================
// 💸 expenses.js — ENHANCED Unified Expense Manager
// Tracks all property-related and general expenses with better integration
// ============================================================================

import { getAllItems, addItem, updateItem, deleteItem, STORE_NAMES, generateId } from './db.js';
import { html } from './utils/html.js';

// ============================================================================
// 🎯 Configuration
// ============================================================================
const EXPENSE_CATEGORIES = [
    'Maintenance', 'Utilities', 'Insurance', 'Fees', 
    'Taxes', 'Mortgage', 'Repairs', 'Renovation',
    'Cleaning', 'Gardening', 'Security', 'Other'
];

const EXPENSE_STATUSES = [
    'Paid', 'Unpaid', 'Pending', 'Reimbursed', 'Partially Paid'
];

// ============================================================================
// 🏗️ Initialize Enhanced Expenses UI
// ============================================================================
export async function initExpensesUI(propertyId = null) {
    console.log('💸 Enhanced Expense Manager initialized');
    const main = document.getElementById('mainContent');

    const properties = await getAllItems(STORE_NAMES.properties);
    const currentProperty = propertyId ? properties.find(p => p.id === propertyId) : null;

    main.innerHTML = `
        <div class="expenses-container">
            <!-- Header -->
            <div class="expenses-header">
                <div class="header-title">
                    <h2>💸 Expense Manager</h2>
                    ${currentProperty ? `
                        <div class="property-context">
                            <span class="context-label">For:</span>
                            <span class="property-name">${currentProperty.name}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="header-actions">
                    <button id="btnNewExpense" class="btn btn-primary">
                        ➕ Add Expense
                    </button>
                    ${propertyId ? `
                        <button id="btnBackToProperties" class="btn btn-secondary">
                            ⬅️ Back to Property
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Statistics Dashboard -->
            <div id="expensesStats" class="expenses-stats"></div>

            <!-- Filters and Controls -->
            <div class="expenses-controls">
                <div class="control-group">
                    <input type="text" id="searchExpenses" class="form-input search-input" 
                           placeholder="🔍 Search expenses...">
                </div>
                <div class="control-group">
                    <select id="filterProperty" class="form-select">
                        <option value="all">All Properties</option>
                        ${properties.map(p => 
                            `<option value="${p.id}" ${propertyId === p.id ? 'selected' : ''}>
                                ${p.name}
                            </option>`
                        ).join('')}
                    </select>
                    <select id="filterCategory" class="form-select">
                        <option value="all">All Categories</option>
                        ${EXPENSE_CATEGORIES.map(cat => 
                            `<option value="${cat}">${cat}</option>`
                        ).join('')}
                    </select>
                    <select id="filterStatus" class="form-select">
                        <option value="all">All Status</option>
                        ${EXPENSE_STATUSES.map(status => 
                            `<option value="${status}">${status}</option>`
                        ).join('')}
                    </select>
                    <input type="month" id="filterMonth" class="form-input" 
                           value="${new Date().toISOString().slice(0, 7)}">
                    <select id="sortExpenses" class="form-select">
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="amount-desc">Highest Amount</option>
                        <option value="amount-asc">Lowest Amount</option>
                    </select>
                </div>
            </div>

            <!-- Chart Section -->
            <div class="chart-section">
                <div class="chart-container">
                    <canvas id="expenseChart"></canvas>
                </div>
            </div>

            <!-- Expenses List -->
            <div id="expensesList" class="expenses-list">
                <div class="loading-spinner">Loading expenses...</div>
            </div>
        </div>

        <!-- Expense Modal -->
        <div id="expenseModal" class="modal-overlay" style="display: none;">
            <div class="modal modal-large">
                <div class="modal-header">
                    <h3 id="modalTitle">Add Expense</h3>
                    <button class="btn-close" id="closeModal">✕</button>
                </div>
                <div class="modal-body">
                    <form id="expenseForm" class="modal-form"></form>
                </div>
            </div>
        </div>
    `;

    // Event Listeners
    if (propertyId) {
        document.getElementById('btnBackToProperties')?.addEventListener('click', () => window.loadView('properties'));
    }

    document.getElementById('btnNewExpense')?.addEventListener('click', () => openExpenseModal(propertyId));
    
    // Filter and Search Events
    document.getElementById('filterProperty')?.addEventListener('change', () => refreshExpensesList(propertyId));
    document.getElementById('filterCategory')?.addEventListener('change', () => refreshExpensesList(propertyId));
    document.getElementById('filterStatus')?.addEventListener('change', () => refreshExpensesList(propertyId));
    document.getElementById('filterMonth')?.addEventListener('change', () => refreshExpensesList(propertyId));
    document.getElementById('sortExpenses')?.addEventListener('change', () => refreshExpensesList(propertyId));
    document.getElementById('searchExpenses')?.addEventListener('input', debounce(() => refreshExpensesList(propertyId), 300));

    await refreshExpensesList(propertyId);
    setupModalEvents(propertyId);
}

// ============================================================================
// 📊 Statistics Dashboard
// ============================================================================
async function renderExpensesStats(propertyId = null) {
    const expenses = await getAllItems(STORE_NAMES.expenses).catch(() => []);
    const filtered = propertyId ? expenses.filter(e => e.propertyId === propertyId) : expenses;
    
    const totalAmount = filtered.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const paidAmount = filtered.filter(e => e.status === 'Paid').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const unpaidAmount = filtered.filter(e => e.status === 'Unpaid').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const pendingCount = filtered.filter(e => e.status === 'Pending').length;
    
    const thisYear = new Date().getFullYear();
    const ytdAmount = filtered
        .filter(e => new Date(e.date || new Date()).getFullYear() === thisYear)
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const statsContainer = document.getElementById('expensesStats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card total">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">${formatCurrency(totalAmount)}</div>
                        <div class="stat-label">Total Expenses</div>
                        <div class="stat-subtext">${formatCurrency(ytdAmount)} YTD</div>
                    </div>
                </div>
                <div class="stat-card paid">
                    <div class="stat-icon">✅</div>
                    <div class="stat-content">
                        <div class="stat-value">${formatCurrency(paidAmount)}</div>
                        <div class="stat-label">Paid</div>
                        <div class="stat-subtext">${formatCurrency(unpaidAmount)} unpaid</div>
                    </div>
                </div>
                <div class="stat-card pending">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-content">
                        <div class="stat-value">${pendingCount}</div>
                        <div class="stat-label">Pending</div>
                        <div class="stat-subtext">Awaiting payment</div>
                    </div>
                </div>
                <div class="stat-card average">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <div class="stat-value">${filtered.length}</div>
                        <div class="stat-label">Total Records</div>
                        <div class="stat-subtext">${filtered.length > 0 ? formatCurrency(totalAmount / filtered.length) : '$0'} avg</div>
                    </div>
                </div>
            </div>
        `;
    }
}

// ============================================================================
// 🔄 Refresh Expenses List with Filtering
// ============================================================================
async function refreshExpensesList(propertyId = null) {
    const expenses = await getAllItems(STORE_NAMES.expenses).catch(() => []);
    const properties = await getAllItems(STORE_NAMES.properties);
    
    let filtered = propertyId ? expenses.filter(e => e.propertyId === propertyId) : expenses;
    
    // Apply filters with safe property access
    const propertyFilter = document.getElementById('filterProperty')?.value || 'all';
    const categoryFilter = document.getElementById('filterCategory')?.value || 'all';
    const statusFilter = document.getElementById('filterStatus')?.value || 'all';
    const monthFilter = document.getElementById('filterMonth')?.value || '';
    const searchTerm = document.getElementById('searchExpenses')?.value.toLowerCase() || '';
    const sortBy = document.getElementById('sortExpenses')?.value || 'date-desc';

    if (propertyFilter !== 'all') {
        filtered = filtered.filter(e => e.propertyId === propertyFilter);
    }
    
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(e => e.category === categoryFilter);
    }
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(e => e.status === statusFilter);
    }
    
    if (monthFilter) {
        filtered = filtered.filter(e => e.date?.startsWith(monthFilter));
    }
    
    if (searchTerm) {
        filtered = filtered.filter(e => 
            (e.description || '').toLowerCase().includes(searchTerm) ||
            (e.category || '').toLowerCase().includes(searchTerm) ||
            (e.notes || '').toLowerCase().includes(searchTerm)
        );
    }

    // Apply sorting
    filtered = sortExpenseRecords(filtered, sortBy);

    const list = document.getElementById('expensesList');

    if (!filtered.length) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💰</div>
                <h3>No Expenses Found</h3>
                <p>No expenses found matching your criteria.</p>
                <button class="btn btn-primary" id="emptyAddExpense">Add First Expense</button>
            </div>
        `;
        document.getElementById('emptyAddExpense')?.addEventListener('click', () => openExpenseModal(propertyId));
        return;
    }

    list.innerHTML = `
        <div class="expenses-grid">
            ${filtered.map(expense => renderExpenseCard(expense, properties)).join('')}
        </div>
    `;

    // Attach event listeners to action buttons
    list.querySelectorAll('.expense-action-btn').forEach(btn => {
        const { id, action } = btn.dataset;
        if (action === 'edit') btn.onclick = () => openExpenseModal(null, id);
        if (action === 'delete') btn.onclick = () => confirmDeleteExpense(id, propertyId);
    });

    // Update statistics and chart
    await renderExpensesStats(propertyId);
    renderExpenseChart(filtered);
}

// ============================================================================
// 🧾 Enhanced Expense Card
// ============================================================================
function renderExpenseCard(expense, properties) {
    const property = properties.find(p => p.id === expense.propertyId);
    const statusConfig = getStatusConfig(expense.status);

    return html`
        <div class="expense-card status-${(expense.status || 'Paid').toLowerCase()}">
            <div class="expense-card-header">
                <div class="expense-title-section">
                    <h3 class="expense-title">${expense.description || 'Untitled Expense'}</h3>
                    <div class="expense-meta">
                        <span class="expense-date">${new Date(expense.date || new Date()).toLocaleDateString()}</span>
                        ${expense.recurring ? `
                            <span class="recurring-badge">🔄 Recurring</span>
                        ` : ''}
                    </div>
                </div>
                <div class="expense-amount">
                    <span class="amount-value">${formatCurrency(expense.amount || 0)}</span>
                    <span class="status-badge" style="color: ${statusConfig.color}">
                        ${statusConfig.icon} ${expense.status || 'Paid'}
                    </span>
                </div>
            </div>

            <div class="expense-card-body">
                <div class="expense-details-grid">
                    <div class="detail-item">
                        <span class="detail-label">📍 Property:</span>
                        <span class="detail-value">${property ? property.name : 'General Expense'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">📂 Category:</span>
                        <span class="detail-value category-${(expense.category || 'Other').toLowerCase()}">
                            ${expense.category || 'Other'}
                        </span>
                    </div>
                    ${expense.vendor ? `
                        <div class="detail-item">
                            <span class="detail-label">👤 Vendor:</span>
                            <span class="detail-value">${expense.vendor}</span>
                        </div>
                    ` : ''}
                    ${expense.receiptNumber ? `
                        <div class="detail-item">
                            <span class="detail-label">🧾 Receipt #:</span>
                            <span class="detail-value">${expense.receiptNumber}</span>
                        </div>
                    ` : ''}
                </div>

                ${expense.notes ? `
                    <div class="expense-notes">
                        <p>${expense.notes}</p>
                    </div>
                ` : ''}

                ${expense.receiptImage ? `
                    <div class="expense-receipt-preview">
                        <div class="receipt-count">📷 Receipt attached</div>
                    </div>
                ` : ''}
            </div>

            <div class="expense-card-actions">
                <button class="btn-action edit expense-action-btn" data-id="${expense.id}" data-action="edit" title="Edit">
                    ✏️ Edit
                </button>
                <button class="btn-action delete expense-action-btn" data-id="${expense.id}" data-action="delete" title="Delete">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `;
}

// ============================================================================
// 📊 Enhanced Expense Chart
// ============================================================================
function renderExpenseChart(expenses) {
    const ctx = document.getElementById('expenseChart')?.getContext('2d');
    if (!ctx) return;

    // Group by category
    const categories = {};
    expenses.forEach(e => {
        const category = e.category || 'Other';
        categories[category] = (categories[category] || 0) + (parseFloat(e.amount) || 0);
    });

    const labels = Object.keys(categories);
    const data = Object.values(categories);

    // Destroy existing chart
    if (window.expenseChartInstance) {
        window.expenseChartInstance.destroy();
    }

    // Create new chart
    window.expenseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: [
                    '#3498db', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6',
                    '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                title: {
                    display: true,
                    text: 'Expenses by Category',
                    font: { size: 16 }
                }
            },
            cutout: '60%'
        }
    });
}

// ============================================================================
// 🎪 Expense Modal Form
// ============================================================================
async function openExpenseModal(propertyId = null, expenseId = null) {
    const properties = await getAllItems(STORE_NAMES.properties);
    const expenses = await getAllItems(STORE_NAMES.expenses).catch(() => []);
    
    let expense = expenseId ? expenses.find(e => e.id === expenseId) : null;

    if (!expense) {
        expense = {
            id: null,
            propertyId: propertyId || '',
            category: 'Other',
            description: '',
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            status: 'Paid',
            recurring: false,
            vendor: '',
            receiptNumber: '',
            notes: '',
            receiptImage: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    const modal = document.getElementById('expenseModal');
    const form = document.getElementById('expenseForm');
    const title = document.getElementById('modalTitle');

    title.textContent = expenseId ? 'Edit Expense' : 'Add Expense';
    
    form.innerHTML = `
        <input type="hidden" id="editExpenseId" value="${expense.id || ''}">
        
        <div class="form-row">
            <div class="form-group">
                <label>🏠 Property</label>
                <select name="propertyId" class="form-select">
                    <option value="">-- General Expense --</option>
                    ${properties.map(p => 
                        `<option value="${p.id}" ${p.id === expense.propertyId ? 'selected' : ''}>
                            ${p.name}
                        </option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>📂 Category</label>
                <select name="category" class="form-select" required>
                    ${EXPENSE_CATEGORIES.map(cat => 
                        `<option value="${cat}" ${cat === expense.category ? 'selected' : ''}>
                            ${cat}
                        </option>`
                    ).join('')}
                </select>
            </div>
        </div>

        <div class="form-group">
            <label>📝 Description *</label>
            <input type="text" name="description" value="${expense.description || ''}" 
                   placeholder="What was this expense for?" required>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>💰 Amount (AUD) *</label>
                <input type="number" step="0.01" name="amount" value="${expense.amount || 0}" 
                       placeholder="0.00" required>
            </div>
            <div class="form-group">
                <label>📅 Date *</label>
                <input type="date" name="date" value="${expense.date || new Date().toISOString().split('T')[0]}" required>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>📊 Status</label>
                <select name="status" class="form-select">
                    ${EXPENSE_STATUSES.map(status => 
                        `<option value="${status}" ${status === expense.status ? 'selected' : ''}>
                            ${status}
                        </option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>👤 Vendor</label>
                <input type="text" name="vendor" value="${expense.vendor || ''}" 
                       placeholder="Who was paid?">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>🧾 Receipt Number</label>
                <input type="text" name="receiptNumber" value="${expense.receiptNumber || ''}" 
                       placeholder="Invoice or receipt number">
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" name="recurring" ${expense.recurring ? 'checked' : ''}>
                    🔄 Recurring Expense
                </label>
            </div>
        </div>

        <div class="form-group">
            <label>📋 Notes</label>
            <textarea name="notes" rows="3" placeholder="Additional notes about this expense">${expense.notes || ''}</textarea>
        </div>

        <div class="form-group">
            <label>🖼️ Receipt Photo</label>
            <input type="file" accept="image/*" id="receiptImage" class="form-input">
            <div id="receiptPreview" class="file-preview-container"></div>
            <small class="form-help">Upload a photo of the receipt (optional)</small>
        </div>

        <div class="form-actions">
            <button type="submit" class="btn btn-primary">
                💾 Save Expense
            </button>
            <button type="button" class="btn btn-secondary" id="cancelExpense">
                Cancel
            </button>
        </div>
    `;

    // Setup receipt preview if exists
    if (expense.receiptImage) {
        const preview = document.getElementById('receiptPreview');
        if (preview) {
            preview.innerHTML = `
                <div class="file-preview-item">
                    <img src="${expense.receiptImage}" alt="Receipt preview">
                    <button type="button" class="btn-remove-file">✕</button>
                </div>
            `;
        }
    }

    modal.style.display = 'flex';
}

// ============================================================================
// 🎯 Helper Functions
// ============================================================================
function getStatusConfig(status) {
    const safeStatus = status || 'Paid';
    const configs = {
        'Paid': { icon: '✅', color: '#27ae60' },
        'Unpaid': { icon: '❌', color: '#e74c3c' },
        'Pending': { icon: '⏳', color: '#f39c12' },
        'Reimbursed': { icon: '💸', color: '#9b59b6' },
        'Partially Paid': { icon: '💰', color: '#3498db' }
    };
    return configs[safeStatus] || configs.Paid;
}

function sortExpenseRecords(records, sortBy) {
    return [...records].sort((a, b) => {
        switch (sortBy) {
            case 'date-desc':
                return new Date(b.date || new Date()) - new Date(a.date || new Date());
            case 'date-asc':
                return new Date(a.date || new Date()) - new Date(b.date || new Date());
            case 'amount-desc':
                return (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0);
            case 'amount-asc':
                return (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0);
            default:
                return new Date(b.date || new Date()) - new Date(a.date || new Date());
        }
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================================================
// 💾 Save Expense Record
// ============================================================================
async function saveExpenseRecord(propertyId) {
    const form = document.getElementById('expenseForm');
    if (!form) return;

    const formData = new FormData(form);
    const expenseId = document.getElementById('editExpenseId')?.value;

    // Get receipt image from preview
    const receiptPreview = document.getElementById('receiptPreview');
    const receiptImage = receiptPreview?.querySelector('img')?.src || null;

    const expenseData = {
        id: expenseId || generateId(),
        propertyId: formData.get('propertyId') || null,
        category: formData.get('category'),
        description: formData.get('description').trim(),
        amount: parseFloat(formData.get('amount') || 0),
        date: formData.get('date'),
        status: formData.get('status'),
        recurring: formData.get('recurring') === 'on',
        vendor: formData.get('vendor').trim() || null,
        receiptNumber: formData.get('receiptNumber').trim() || null,
        notes: formData.get('notes').trim() || null,
        receiptImage: receiptImage,
        createdAt: expenseId ? 
            (await getAllItems(STORE_NAMES.expenses)).find(e => e.id === expenseId)?.createdAt : 
            new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        if (expenseId) {
            await updateItem(STORE_NAMES.expenses, expenseData);
        } else {
            await addItem(STORE_NAMES.expenses, expenseData);
        }

        // Close modal and refresh
        document.getElementById('expenseModal').style.display = 'none';
        await refreshExpensesList(propertyId);
        
    } catch (err) {
        console.error('❌ Error saving expense:', err);
        alert('Error saving expense. Please try again.');
    }
}

// ============================================================================
// ❌ Delete Expense
// ============================================================================
async function confirmDeleteExpense(id, propertyId = null) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }

    try {
        await deleteItem(STORE_NAMES.expenses, id);
        await refreshExpensesList(propertyId);
    } catch (err) {
        console.error('❌ Error deleting expense:', err);
        alert('Error deleting expense.');
    }
}

// ============================================================================
// 🎪 Modal Event Handling
// ============================================================================
function setupModalEvents(propertyId) {
    const modal = document.getElementById('expenseModal');
    const form = document.getElementById('expenseForm');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelExpense');

    [closeBtn, cancelBtn].forEach(btn => {
        btn?.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveExpenseRecord(propertyId);
    });

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Setup receipt image handling
    const receiptInput = document.getElementById('receiptImage');
    if (receiptInput) {
        receiptInput.addEventListener('change', handleReceiptUpload);
    }
}

// ============================================================================
// 🖼️ Receipt Upload Handling
// ============================================================================
function handleReceiptUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('receiptPreview');
        if (preview) {
            preview.innerHTML = `
                <div class="file-preview-item">
                    <img src="${e.target.result}" alt="Receipt preview">
                    <button type="button" class="btn-remove-file">✕</button>
                </div>
            `;
        }
    };
    reader.readAsDataURL(file);
}

// ============================================================================
// 💰 Utility: Format Currency
// ============================================================================
function formatCurrency(amount, currency = 'AUD') {
    return new Intl.NumberFormat('en-AU', { 
        style: 'currency', 
        currency 
    }).format(amount || 0);
}

// ============================================================================
// 📋 Export for Properties Integration
// ============================================================================
export async function getPropertyExpensesSummary(propertyId) {
    const expenses = await getAllItems(STORE_NAMES.expenses).catch(() => []);
    const propertyExpenses = expenses.filter(expense => expense.propertyId === propertyId);
    
    const totalAmount = propertyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const currentYear = new Date().getFullYear();
    const ytdAmount = propertyExpenses
        .filter(e => new Date(e.date || new Date()).getFullYear() === currentYear)
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    return {
        totalRecords: propertyExpenses.length,
        totalAmount,
        ytdAmount,
        recentExpenses: propertyExpenses.slice(0, 5) // Last 5 expenses
    };
}