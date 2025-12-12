// calendar.js - ENHANCED VERSION
import { getAllItems, STORE_NAMES } from './db.js';

export class CalendarManager {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.bills = [];
        this.transactions = [];
    }

    async init() {
        await this.loadData();
        this.renderUI();
        this.attachEventListeners();
    }

    async loadData() {
        [this.bills, this.transactions] = await Promise.all([
            getAllItems(STORE_NAMES.bills),
            getAllItems(STORE_NAMES.transactions)
        ]);
    }

highlightImportantDays() {
    const today = new Date().toISOString().slice(0, 10);
    const cells = document.querySelectorAll('.calendar-day');
    
    cells.forEach(cell => {
        const dateStr = cell.getAttribute('data-date');
        if (!dateStr) return;
        
        const dayBills = this.bills.filter(b => b.dueDate === dateStr);
        const overdueBills = dayBills.filter(b => !b.paid && b.dueDate < today);
        
        if (overdueBills.length > 0) {
            cell.classList.add('urgent');
        }
    });
}

    // Add a method to quickly add a bill from the calendar
    addQuickBill(dateStr) {
        const sidebar = document.getElementById('dayDetails');
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h3>Add Bill for ${new Date(dateStr).toLocaleDateString()}</h3>
                <button class="btn-close" id="closeAddBill">✕</button>
            </div>
            <div class="sidebar-content">
                <form id="quickBillForm" class="quick-form">
                    <div class="form-group">
                        <label>Bill Name</label>
                        <input type="text" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Amount ($)</label>
                        <input type="number" class="form-control" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox"> Recurring Monthly
                        </label>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save Bill</button>
                    </div>
                </form>
            </div>
        `;
}

    renderUI() {
        const mainContent = document.getElementById('mainContent');
        
        mainContent.innerHTML = `
            <div class="calendar-container">
                <div class="calendar-header">
                    <h2>📅 Financial Calendar</h2>
                    <div class="calendar-controls">
                        <button class="btn btn-secondary" id="prevMonth">⬅️ Previous</button>
                        <div class="calendar-title" id="calendarTitle"></div>
                        <button class="btn btn-secondary" id="nextMonth">Next ➡️</button>
                        <button class="btn btn-primary" id="todayBtn">Today</button>
                    </div>
                </div>

                <div class="calendar-stats">
                    <div class="stat-card">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.getMonthlyBillTotal()}</div>
                            <div class="stat-label">This Month's Bills</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⏰</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.getUpcomingBillsCount()}</div>
                            <div class="stat-label">Upcoming Bills</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🚨</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.getOverdueBillsCount()}</div>
                            <div class="stat-label">Overdue</div>
                        </div>
                    </div>
                </div>

                <div class="calendar-legend">
                    <div class="legend-item">
                        <span class="legend-color today"></span>
                        <span>Today</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color due"></span>
                        <span>Bills Due</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color overdue"></span>
                        <span>Overdue</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color paid"></span>
                        <span>Paid</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color transaction"></span>
                        <span>Transactions</span>
                    </div>
                </div>

                <div class="calendar-wrapper">
                    <table class="calendar-table">
                        <thead id="calendarHead"></thead>
                        <tbody id="calendarBody"></tbody>
                    </table>
                </div>

                <div class="calendar-sidebar" id="dayDetails">
                    <div class="sidebar-content">
                        <h3>Select a date to view details</h3>
                        <p>Click on any date to see bills and transactions</p>
                    </div>
                </div>
            </div>
        `;

        this.renderCalendar();
    }

    renderCalendar() {
        const firstOfMonth = new Date(this.currentYear, this.currentMonth, 1);
        const lastOfMonth = new Date(this.currentYear, this.currentMonth + 1, 0);
        const daysInMonth = lastOfMonth.getDate();
        const startWeekday = firstOfMonth.getDay();

        // Update title
        document.getElementById('calendarTitle').textContent = 
            `${firstOfMonth.toLocaleString('default', { month: 'long' })} ${this.currentYear}`;

        // Render header
        const header = document.getElementById('calendarHead');
        header.innerHTML = `
            <tr>
                <th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th>
                <th>Thu</th><th>Fri</th><th>Sat</th>
            </tr>
        `;

        // Render calendar body
        const body = document.getElementById('calendarBody');
        let html = '<tr>';
        
        // Empty cells for days before first of month
        for (let i = 0; i < startWeekday; i++) {
            html += `<td class="empty"></td>`;
        }

        const today = new Date().toISOString().slice(0, 10);

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayBills = this.bills.filter(b => b.dueDate === dateStr);
            const dayTransactions = this.transactions.filter(t => t.date === dateStr);
            
            const classes = this.getDayClasses(dateStr, dayBills, dayTransactions, today);

            html += `
                <td class="${classes.join(' ')}" data-date="${dateStr}">
                    <div class="date-number">${day}</div>
                    ${this.renderDayIndicators(dayBills, dayTransactions)}
                </td>
            `;

            // Start new row after Saturday
            if ((startWeekday + day) % 7 === 0 && day < daysInMonth) {
                html += '</tr><tr>';
            }
        }

        // Fill remaining empty cells
        const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
        const remainingCells = totalCells - (startWeekday + daysInMonth);
        for (let i = 0; i < remainingCells; i++) {
            html += `<td class="empty"></td>`;
        }

        html += '</tr>';
        body.innerHTML = html;
    }

    getDayClasses(dateStr, dayBills, dayTransactions, today) {
        const classes = ['calendar-day'];
        
        // Today highlight
        if (dateStr === today) {
            classes.push('today');
        }
        
        // Bill status
        if (dayBills.length > 0) {
            const hasOverdue = dayBills.some(b => !b.paid && b.dueDate < today);
            const allPaid = dayBills.every(b => b.paid);
            
            if (hasOverdue) {
                classes.push('overdue');
            } else if (!allPaid) {
                classes.push('due');
            } else {
                classes.push('paid');
            }
        }
        
        // Transaction indicator
        if (dayTransactions.length > 0) {
            classes.push('has-transactions');
        }
        
        return classes;
    }

    renderDayIndicators(dayBills, dayTransactions) {
        let indicators = '';
        
        if (dayBills.length > 0) {
            const unpaidCount = dayBills.filter(b => !b.paid).length;
            const totalAmount = dayBills.reduce((sum, b) => sum + b.amount, 0);
            
            indicators += `
                <div class="day-bills">
                    <span class="bill-count">${dayBills.length} bill${dayBills.length !== 1 ? 's' : ''}</span>
                    <span class="bill-amount">${this.formatCurrency(totalAmount)}</span>
                    ${unpaidCount > 0 ? `<span class="unpaid-badge">${unpaidCount} due</span>` : ''}
                </div>
            `;
        }
        
        if (dayTransactions.length > 0) {
            const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const expenses = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
            indicators += `
                <div class="day-transactions">
                    ${income > 0 ? `<span class="income-indicator">+${this.formatCurrency(income)}</span>` : ''}
                    ${expenses > 0 ? `<span class="expense-indicator">-${this.formatCurrency(expenses)}</span>` : ''}
                </div>
            `;
        }
        
        return indicators;
    }

    attachEventListeners() {
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.navigateMonth(-1);
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.navigateMonth(1);
        });

        document.getElementById('todayBtn').addEventListener('click', () => {
            const today = new Date();
            this.currentYear = today.getFullYear();
            this.currentMonth = today.getMonth();
            this.renderCalendar();
        });

                // Add this to the attachEventListeners method
        document.addEventListener('dblclick', (e) => {
            const dayCell = e.target.closest('.calendar-day');
            if (dayCell) {
                const dateStr = dayCell.getAttribute('data-date');
                this.addQuickBill(dateStr);
            }
        });

        // Day click events
        document.addEventListener('click', (e) => {
            const dayCell = e.target.closest('.calendar-day');
            if (dayCell) {
                const dateStr = dayCell.getAttribute('data-date');
                this.showDayDetails(dateStr);
            }
        });
    }

    navigateMonth(direction) {
        this.currentMonth += direction;
        
        // Handle year boundaries
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        } else if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        
        this.renderCalendar();
    }

    showDayDetails(dateStr) {
        const sidebar = document.getElementById('dayDetails');
        const dayBills = this.bills.filter(b => b.dueDate === dateStr);
        const dayTransactions = this.transactions.filter(t => t.date === dateStr);
        
        let html = `
            <div class="sidebar-header">
                <h3>${new Date(dateStr).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</h3>
                <button class="btn-close" id="closeSidebar">✕</button>
            </div>
            <div class="sidebar-content">
        `;

        // Bills section
        if (dayBills.length > 0) {
            html += `
                <div class="detail-section">
                    <h4>📋 Bills Due (${dayBills.length})</h4>
                    <div class="bills-list">
                        ${dayBills.map(bill => `
                            <div class="bill-item ${bill.paid ? 'paid' : 'unpaid'}">
                                <div class="bill-info">
                                    <span class="bill-name">${bill.name}</span>
                                    <span class="bill-amount">${this.formatCurrency(bill.amount)}</span>
                                </div>
                                <div class="bill-status">
                                    ${bill.paid ? 
                                        '<span class="status-badge paid">✅ Paid</span>' : 
                                        '<span class="status-badge unpaid">⏰ Due</span>'
                                    }
                                </div>
                                ${bill.recurring ? `<div class="bill-recurring">🔄 ${bill.recurring}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Transactions section
        if (dayTransactions.length > 0) {
            const incomeTotal = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const expenseTotal = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
            html += `
                <div class="detail-section">
                    <h4>💳 Transactions (${dayTransactions.length})</h4>
                    <div class="transaction-summary">
                        <div class="summary-item income">
                            <span>Income:</span>
                            <span>+${this.formatCurrency(incomeTotal)}</span>
                        </div>
                        <div class="summary-item expense">
                            <span>Expenses:</span>
                            <span>-${this.formatCurrency(expenseTotal)}</span>
                        </div>
                        <div class="summary-item net">
                            <span>Net:</span>
                            <span>${this.formatCurrency(incomeTotal - expenseTotal)}</span>
                        </div>
                    </div>
                    <div class="transactions-list">
                        ${dayTransactions.map(transaction => `
                            <div class="transaction-item ${transaction.type}">
                                <div class="transaction-icon">
                                    ${transaction.type === 'income' ? '📥' : '📤'}
                                </div>
                                <div class="transaction-details">
                                    <div class="transaction-description">${transaction.description}</div>
                                    <div class="transaction-meta">
                                        ${transaction.categoryId ? `<span class="transaction-category">Category</span>` : ''}
                                        ${transaction.accountId ? `<span class="transaction-account">Account</span>` : ''}
                                    </div>
                                </div>
                                <div class="transaction-amount ${transaction.type}">
                                    ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(Math.abs(transaction.amount))}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Empty state
        if (dayBills.length === 0 && dayTransactions.length === 0) {
            html += `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <h4>No Activity</h4>
                    <p>No bills or transactions scheduled for this date.</p>
                </div>
            `;
        }

        html += `</div>`; // Close sidebar-content
        
        sidebar.innerHTML = html;

        // Add close button functionality
        document.getElementById('closeSidebar')?.addEventListener('click', () => {
            sidebar.innerHTML = `
                <div class="sidebar-content">
                    <h3>Select a date to view details</h3>
                    <p>Click on any date to see bills and transactions</p>
                </div>
            `;
        });
    }

    // Helper methods
    getMonthlyBillTotal() {
        const monthStart = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-01`;
        const monthEnd = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-31`;
        
        const monthlyBills = this.bills.filter(b => 
            b.dueDate >= monthStart && b.dueDate <= monthEnd && !b.paid
        );
        
        return this.formatCurrency(monthlyBills.reduce((sum, b) => sum + b.amount, 0));
    }

    getUpcomingBillsCount() {
        const today = new Date().toISOString().slice(0, 10);
        return this.bills.filter(b => !b.paid && b.dueDate >= today).length;
    }

    getOverdueBillsCount() {
        const today = new Date().toISOString().slice(0, 10);
        return this.bills.filter(b => !b.paid && b.dueDate < today).length;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
}

// Backwards compatibility
export async function initCalendarUI(year = null, month = null) {
    const manager = new CalendarManager();
    if (year !== null) manager.currentYear = year;
    if (month !== null) manager.currentMonth = month;
    await manager.init();
}