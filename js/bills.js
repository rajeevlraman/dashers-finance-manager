// bills.js - Enhanced but compatible version
import { addItem, deleteItem, getAllItems, updateItem, STORE_NAMES } from './db.js';
import { addItem as addTransaction } from './db.js';

export async function initBillsUI() {
    const mainContent = document.getElementById('mainContent');
    const bills = await getAllItems(STORE_NAMES.bills);
    const accounts = await getAllItems(STORE_NAMES.accounts);
    const today = new Date().toISOString().slice(0, 10);

    // Calculate stats
    const overdue = bills.filter(b => !b.paid && b.dueDate < today).length;
    const dueSoon = bills.filter(b => !b.paid && b.dueDate === today).length;
    const totalDue = bills.filter(b => !b.paid).reduce((sum, b) => sum + b.amount, 0);

    mainContent.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2>📋 Bills</h2>
                <button id="btnNewBill" class="button primary">➕ Add Bill</button>
            </div>

            <!-- Statistics Cards -->
            <div class="bills-stats">
                <div class="stat-card overdue">
                    <div class="stat-value">${overdue}</div>
                    <div class="stat-label">Overdue</div>
                </div>
                <div class="stat-card due-soon">
                    <div class="stat-value">${dueSoon}</div>
                    <div class="stat-label">Due Today</div>
                </div>
                <div class="stat-card total">
                    <div class="stat-value">${formatCurrency(totalDue)}</div>
                    <div class="stat-label">Total Due</div>
                </div>
            </div>

            <!-- Bills Table -->
            <div class="section-card">
                ${bills.length === 0 ? 
                    '<p class="empty-state">No bills set up yet. Add your first bill to get started!</p>' :
                    `<table class="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Amount</th>
                                <th>Due Date</th>
                                <th>Account</th>
                                <th>Recurring</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bills.map(bill => renderBillRow(bill, today, accounts)).join('')}
                        </tbody>
                    </table>`
                }
            </div>
        </div>
    `;

    // Your existing event handlers...
    document.getElementById('btnNewBill').addEventListener('click', () => openBillEditor());

    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', handleBillAction);
    });
}

function renderBillRow(bill, today, accounts) {
    const account = accounts.find(a => a.id === bill.accountId);
    const status = getBillStatus(bill, today);
    
    return `
        <tr class="bill-row ${status.class}">
            <td>${bill.name}</td>
            <td>${formatCurrency(bill.amount)}</td>
            <td>${formatDate(bill.dueDate)}</td>
            <td>${account ? account.name : 'Not set'}</td>
            <td>${bill.recurring || '-'}</td>
            <td><span class="status-badge ${status.class}">${status.text}</span></td>
            <td class="actions">
                ${!bill.paid ? `
                    <button class="btn-sm btn-success" data-action="pay" data-id="${bill.id}">
                        Pay
                    </button>
                ` : ''}
                <button class="btn-sm" data-action="edit" data-id="${bill.id}">
                    Edit
                </button>
                <button class="btn-sm btn-danger" data-action="delete" data-id="${bill.id}">
                    Delete
                </button>
            </td>
        </tr>
    `;
}

function getBillStatus(bill, today) {
    if (bill.paid) return { text: 'Paid', class: 'paid' };
    
    const daysUntilDue = Math.floor((new Date(bill.dueDate) - new Date(today)) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return { text: 'Overdue', class: 'overdue' };
    if (daysUntilDue === 0) return { text: 'Due Today', class: 'due-today' };
    if (daysUntilDue <= 3) return { text: 'Due Soon', class: 'due-soon' };
    
    return { text: 'Upcoming', class: 'upcoming' };
}

// Keep your existing markBillAsPaid, openBillEditor, and other functions...
// They should work as-is with the new UI

// Helper functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}