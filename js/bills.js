import { addItem, deleteItem, getAllItems, updateItem, STORE_NAMES, generateId } from './db.js';
import { addItem as addTransaction } from './db.js';

export class BillsManager {
    constructor() {
        this.bills = [];
        this.accounts = [];
        this.categories = [];
        this.currentSort = 'dueDate-asc';
    }

    async init() {
        await this.loadData();
        this.renderUI();
        this.attachEventListeners();
    }

    async loadData() {
        [this.bills, this.accounts, this.categories] = await Promise.all([
            getAllItems(STORE_NAMES.bills),
            getAllItems(STORE_NAMES.accounts),
            getAllItems(STORE_NAMES.categories)
        ]);
    }

    renderUI() {
        const mainContent = document.getElementById('mainContent');
        const today = new Date().toISOString().slice(0, 10);
        
        mainContent.innerHTML = `
            <div class="bills-container">
                <div class="bills-header">
                    <h2>📋 Bills Manager</h2>
                    <button id="addBillBtn" class="btn btn-primary">+ Add Bill</button>
                </div>

                ${this.renderStatsCards(today)}

                ${this.renderQuickActions(today)}

                <div class="bills-content">
                    ${this.bills.length === 0 ? this.renderEmptyState() : this.renderBillsTable(today)}
                </div>

                ${this.renderBillModal()}
            </div>
        `;
    }

    renderStatsCards(today) {
        const stats = this.calculateStats(today);
        
        return `
            <div class="stats-cards">
                <div class="stat-card ${stats.overdue.count > 0 ? 'overdue' : 'normal'}">
                    <div class="stat-icon">🚨</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.overdue.count}</div>
                        <div class="stat-label">Overdue</div>
                        ${stats.overdue.count > 0 ? `
                            <div class="stat-amount">${this.formatCurrency(stats.overdue.amount)}</div>
                        ` : ''}
                    </div>
                </div>
                <div class="stat-card ${stats.dueSoon.count > 0 ? 'warning' : 'normal'}">
                    <div class="stat-icon">⏰</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.dueSoon.count}</div>
                        <div class="stat-label">Due This Week</div>
                        <div class="stat-amount">${this.formatCurrency(stats.dueSoon.amount)}</div>
                    </div>
                </div>
                <div class="stat-card info">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.formatCurrency(stats.totalDue)}</div>
                        <div class="stat-label">Total Due</div>
                        <div class="stat-subtext">${stats.upcoming.count} upcoming</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderQuickActions(today) {
        const stats = this.calculateStats(today);
        const canPayAll = stats.unpaid.count > 0 && this.bills.filter(b => !b.paid && b.accountId).length === stats.unpaid.count;

        return `
            <div class="quick-actions">
                <div class="section-card">
                    <h3>⚡ Quick Actions</h3>
                    <div class="quick-actions-grid">
                        <button class="quick-action-btn" id="quickAddBill">
                            <span class="action-icon">➕</span>
                            <span class="action-text">Add Bill</span>
                        </button>
                        
                        ${canPayAll ? `
                            <button class="quick-action-btn" id="quickPayAll">
                                <span class="action-icon">💳</span>
                                <span class="action-text">Pay All Due</span>
                                <span class="action-badge">${stats.unpaid.count}</span>
                            </button>
                        ` : ''}
                        
                        ${stats.overdue.count > 0 ? `
                            <button class="quick-action-btn" id="quickViewOverdue">
                                <span class="action-icon">🚨</span>
                                <span class="action-text">View Overdue</span>
                                <span class="action-badge">${stats.overdue.count}</span>
                            </button>
                        ` : ''}
                        
                        <button class="quick-action-btn" id="quickExport">
                            <span class="action-icon">📤</span>
                            <span class="action-text">Export</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderBillsTable(today) {
        const sortedBills = this.getSortedBills();
        
        return `
            <div class="section-card">
                <div class="table-header">
                    <h3>Your Bills</h3>
                    <div class="table-controls">
                        <span class="table-count">${this.bills.length} bill${this.bills.length !== 1 ? 's' : ''}</span>
                        <select id="sortBills" class="form-select">
                            <option value="dueDate-asc" ${this.currentSort === 'dueDate-asc' ? 'selected' : ''}>Due Date (Soonest)</option>
                            <option value="dueDate-desc" ${this.currentSort === 'dueDate-desc' ? 'selected' : ''}>Due Date (Latest)</option>
                            <option value="amount-desc" ${this.currentSort === 'amount-desc' ? 'selected' : ''}>Highest Amount</option>
                            <option value="amount-asc" ${this.currentSort === 'amount-asc' ? 'selected' : ''}>Lowest Amount</option>
                            <option value="name-asc" ${this.currentSort === 'name-asc' ? 'selected' : ''}>Name A-Z</option>
                        </select>
                    </div>
                </div>
                
                <div class="bills-list">
                    ${sortedBills.map(bill => this.renderBillRow(bill, today)).join('')}
                </div>
            </div>
        `;
    }

    renderBillRow(bill, today) {
        const account = this.accounts.find(a => a.id === bill.accountId);
        const category = this.categories.find(c => c.id === bill.categoryId);
        const status = this.getBillStatus(bill, today);
        
        return `
            <div class="bill-row ${status.class}" data-bill-id="${bill.id}">
                <div class="bill-main">
                    <div class="bill-icon">${category?.icon || '🧾'}</div>
                    <div class="bill-details">
                        <div class="bill-name">${bill.name}</div>
                        <div class="bill-meta">
                            <span class="due-date">Due: ${this.formatDateDisplay(bill.dueDate)}</span>
                            ${bill.recurring ? `<span class="recurring-tag">🔄 ${bill.recurring}</span>` : ''}
                            ${account ? `<span class="account-tag">${this.getAccountIcon(account.type)} ${account.name}</span>` : ''}
                        </div>
                    </div>
                    <div class="bill-amount ${bill.paid ? 'paid' : 'unpaid'}">
                        ${this.formatCurrency(bill.amount)}
                    </div>
                </div>
                <div class="bill-status">
                    <span class="status-badge ${status.class}">
                        ${status.icon} ${status.text}
                    </span>
                </div>
                <div class="bill-actions">
                    ${!bill.paid ? `
                        <button class="btn-action pay" data-action="pay" data-id="${bill.id}" title="Mark as paid">
                            💳 Pay
                        </button>
                    ` : ''}
                    <button class="btn-action edit" data-action="edit" data-id="${bill.id}" title="Edit bill">
                        ✏️ Edit
                    </button>
                    <button class="btn-action delete" data-action="delete" data-id="${bill.id}" title="Delete bill">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    renderBillModal() {
        return `
            <div id="billModal" class="modal-overlay" style="display: none;">
                <div class="modal">
                    <div class="modal-header">
                        <h3 id="modalTitle">Add New Bill</h3>
                        <button class="btn-close" id="closeModal">✕</button>
                    </div>
                    <form id="billForm" class="modal-form">
                        <input type="hidden" id="editBillId" value="">
                        
                        <div class="form-group">
                            <label>Bill Name</label>
                            <input type="text" id="billName" class="form-input" placeholder="e.g., Electricity Bill" required>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Amount</label>
                                <input type="number" id="billAmount" class="form-input" step="0.01" placeholder="0.00" required>
                            </div>
                            <div class="form-group">
                                <label>Due Date</label>
                                <input type="date" id="billDueDate" class="form-input" required>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Payment Account</label>
                                <select id="billAccount" class="form-select">
                                    <option value="">Select Account</option>
                                    ${this.accounts.map(acc => `
                                        <option value="${acc.id}">${this.getAccountIcon(acc.type)} ${acc.name}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Category</label>
                                <select id="billCategory" class="form-select">
                                    <option value="">Auto-detect</option>
                                    ${this.categories.map(cat => `
                                        <option value="${cat.id}">${cat.icon || '📁'} ${cat.name}</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Recurring</label>
                            <select id="billRecurring" class="form-select">
                                <option value="">One-time</option>
                                <option value="weekly">Weekly</option>
                                <option value="fortnightly">Fortnightly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="annually">Annually</option>
                            </select>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">💾 Save Bill</button>
                            <button type="button" class="btn btn-secondary" id="cancelBill">Cancel</button>
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
                    <div class="empty-icon">🧾</div>
                    <h3>No Bills Yet</h3>
                    <p>Start by adding your first bill to track your expenses.</p>
                    <button class="btn btn-primary" id="emptyAddBill">Add Your First Bill</button>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Add bill buttons
        document.getElementById('addBillBtn')?.addEventListener('click', () => this.openBillForm());
        document.getElementById('quickAddBill')?.addEventListener('click', () => this.openBillForm());
        document.getElementById('emptyAddBill')?.addEventListener('click', () => this.openBillForm());

        // Quick actions
        document.getElementById('quickPayAll')?.addEventListener('click', () => this.payAllBills());
        document.getElementById('quickViewOverdue')?.addEventListener('click', () => this.filterOverdue());
        document.getElementById('quickExport')?.addEventListener('click', () => this.exportBills());

        // Sorting
        document.getElementById('sortBills')?.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderUI();
        });

        // Bill actions
        document.addEventListener('click', (e) => {
            const button = e.target.closest('[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const billId = button.dataset.id;
            const bill = this.bills.find(b => b.id === billId);

            if (!bill) return;

            switch (action) {
                case 'pay':
                    this.payBill(bill);
                    break;
                case 'edit':
                    this.openBillForm(bill);
                    break;
                case 'delete':
                    this.deleteBill(bill);
                    break;
            }
        });

        // Modal events
        this.setupModalEvents();
    }

    setupModalEvents() {
        const modal = document.getElementById('billModal');
        const form = document.getElementById('billForm');
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBill');

        // Open/close modal
        [closeBtn, cancelBtn].forEach(btn => {
            btn?.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });

        // Form submission
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveBill();
            modal.style.display = 'none';
        });

        // Close modal on backdrop click
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Core functionality methods
    async payBill(bill) {
        if (!confirm(`Mark "${bill.name}" as paid?`)) return;

        // Mark bill as paid
        bill.paid = true;
        bill.paidDate = new Date().toISOString().slice(0, 10);
        await updateItem(STORE_NAMES.bills, bill);

        // Create transaction record
        if (bill.accountId) {
            const transaction = {
                type: 'expense',
                amount: -bill.amount,
                date: new Date().toISOString().slice(0, 10),
                categoryId: bill.categoryId || await this.getBillCategoryId(bill.name),
                accountId: bill.accountId,
                description: `Bill: ${bill.name}`,
                billId: bill.id
            };
            await addTransaction(STORE_NAMES.transactions, transaction);
        }

        // Handle recurring bills
        if (bill.recurring) {
            const nextDate = this.getNextDueDate(bill.dueDate, bill.recurring);
            const newBill = {
                name: bill.name,
                amount: bill.amount,
                dueDate: nextDate,
                paid: false,
                recurring: bill.recurring,
                accountId: bill.accountId,
                categoryId: bill.categoryId
            };
            await addItem(STORE_NAMES.bills, newBill);
        }

        await this.init(); // Refresh UI
    }

    async payAllBills() {
        const unpaidBills = this.bills.filter(b => !b.paid && b.accountId);
        
        if (unpaidBills.length === 0) {
            alert('No payable bills found!');
            return;
        }

        if (!confirm(`Pay all ${unpaidBills.length} due bills?`)) return;

        for (const bill of unpaidBills) {
            await this.payBill(bill);
        }
    }

    async deleteBill(bill) {
        if (!confirm(`Delete "${bill.name}"?`)) return;
        
        await deleteItem(STORE_NAMES.bills, bill.id);
        await this.init(); // Refresh UI
    }

    openBillForm(bill = null) {
        const modal = document.getElementById('billModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('billForm');

        if (bill) {
            // Edit mode
            title.textContent = 'Edit Bill';
            document.getElementById('editBillId').value = bill.id;
            document.getElementById('billName').value = bill.name;
            document.getElementById('billAmount').value = bill.amount;
            document.getElementById('billDueDate').value = bill.dueDate;
            document.getElementById('billAccount').value = bill.accountId || '';
            document.getElementById('billCategory').value = bill.categoryId || '';
            document.getElementById('billRecurring').value = bill.recurring || '';
        } else {
            // Add mode
            title.textContent = 'Add New Bill';
            form.reset();
            document.getElementById('editBillId').value = '';
            document.getElementById('billDueDate').value = new Date().toISOString().slice(0, 10);
        }

        modal.style.display = 'flex';
    }

    async saveBill() {
        const form = document.getElementById('billForm');
        const billId = document.getElementById('editBillId').value;

        const billData = {
            name: document.getElementById('billName').value,
            amount: parseFloat(document.getElementById('billAmount').value),
            dueDate: document.getElementById('billDueDate').value,
            accountId: document.getElementById('billAccount').value,
            categoryId: document.getElementById('billCategory').value,
            recurring: document.getElementById('billRecurring').value,
            paid: false
        };

        if (billId) {
            // Update existing bill
            billData.id = billId;
            await updateItem(STORE_NAMES.bills, billData);
        } else {
            // Add new bill
            billData.id = generateId();
            await addItem(STORE_NAMES.bills, billData);
        }

        await this.init(); // Refresh UI
    }

    filterOverdue() {
        const today = new Date().toISOString().slice(0, 10);
        const overdueBills = this.bills.filter(b => !b.paid && b.dueDate < today);
        
        if (overdueBills.length === 0) {
            alert('No overdue bills found!');
            return;
        }

        // Temporarily show only overdue bills
        this.renderFilteredBills(overdueBills, 'Overdue Bills');
    }

    renderFilteredBills(filteredBills, title) {
        const today = new Date().toISOString().slice(0, 10);
        const billsContent = document.querySelector('.bills-content');
        
        billsContent.innerHTML = `
            <div class="section-card">
                <div class="table-header">
                    <h3>${title} (${filteredBills.length})</h3>
                    <button class="btn btn-secondary" id="clearFilter">Show All Bills</button>
                </div>
                <div class="bills-list">
                    ${filteredBills.map(bill => this.renderBillRow(bill, today)).join('')}
                </div>
            </div>
        `;

        document.getElementById('clearFilter')?.addEventListener('click', () => {
            this.renderUI();
        });
    }

    exportBills() {
        const csv = this.convertToCSV(this.bills);
        this.downloadCSV(csv, 'bills-export.csv');
    }

    // Helper methods
    calculateStats(today) {
        const overdue = this.bills.filter(b => !b.paid && b.dueDate < today);
        const dueSoon = this.bills.filter(b => !b.paid && {
            const daysUntilDue = Math.floor((new Date(b.dueDate) - new Date(today)) / (1000 * 60 * 60 * 24));
            return daysUntilDue <= 7 && daysUntilDue >= 0;
        });
        const upcoming = this.bills.filter(b => !b.paid && b.dueDate >= today);
        const unpaid = this.bills.filter(b => !b.paid);

        return {
            overdue: {
                count: overdue.length,
                amount: overdue.reduce((sum, b) => sum + b.amount, 0)
            },
            dueSoon: {
                count: dueSoon.length,
                amount: dueSoon.reduce((sum, b) => sum + b.amount, 0)
            },
            upcoming: {
                count: upcoming.length,
                amount: upcoming.reduce((sum, b) => sum + b.amount, 0)
            },
            unpaid: {
                count: unpaid.length
            },
            totalDue: unpaid.reduce((sum, b) => sum + b.amount, 0)
        };
    }

    getSortedBills() {
        return [...this.bills].sort((a, b) => {
            switch (this.currentSort) {
                case 'dueDate-asc': return a.dueDate.localeCompare(b.dueDate);
                case 'dueDate-desc': return b.dueDate.localeCompare(a.dueDate);
                case 'amount-desc': return b.amount - a.amount;
                case 'amount-asc': return a.amount - b.amount;
                case 'name-asc': return a.name.localeCompare(b.name);
                default: return a.dueDate.localeCompare(b.dueDate);
            }
        });
    }

    getBillStatus(bill, today) {
        if (bill.paid) {
            return { text: 'Paid', class: 'paid', icon: '✅' };
        }

        const daysUntilDue = Math.floor((new Date(bill.dueDate) - new Date(today)) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue < 0) {
            return { 
                text: `${Math.abs(daysUntilDue)}d overdue`, 
                class: 'overdue', 
                icon: '🚨' 
            };
        }
        
        if (daysUntilDue === 0) {
            return { text: 'Due today', class: 'due-today', icon: '⚠️' };
        }
        
        if (daysUntilDue <= 3) {
            return { text: `Due in ${daysUntilDue}d`, class: 'due-soon', icon: '⏰' };
        }
        
        return { text: 'Upcoming', class: 'upcoming', icon: '📅' };
    }

    // Your existing helper methods (keep these)
    getAccountIcon(type) {
        const icons = {
            bank: '🏦', credit: '💳', cash: '💵', savings: '💰',
            investment: '📈', offset: '⚖️', loan: '🏠'
        };
        return icons[type] || '📁';
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDateDisplay(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }

    getNextDueDate(currentDateStr, freq) {
        const d = new Date(currentDateStr);
        switch (freq) {
            case 'weekly': d.setDate(d.getDate() + 7); break;
            case 'fortnightly': d.setDate(d.getDate() + 14); break;
            case 'monthly': d.setMonth(d.getMonth() + 1); break;
            case 'quarterly': d.setMonth(d.getMonth() + 3); break;
            case 'annually': d.setFullYear(d.getFullYear() + 1); break;
        }
        return d.toISOString().slice(0, 10);
    }

    async getBillCategoryId(billName) {
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

    convertToCSV(bills) {
        const headers = ['Name', 'Amount', 'Due Date', 'Status', 'Recurring', 'Account'];
        const rows = bills.map(bill => [
            bill.name,
            bill.amount,
            bill.dueDate,
            bill.paid ? 'Paid' : 'Unpaid',
            bill.recurring || 'One-time',
            this.accounts.find(a => a.id === bill.accountId)?.name || 'Not set'
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
}

// Backwards compatibility - keep your existing initBillsUI function
export async function initBillsUI() {
    const manager = new BillsManager();
    await manager.init();
}