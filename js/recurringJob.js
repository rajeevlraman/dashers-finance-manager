// recurringjob.js - ENHANCED VERSION

import { getAllItems, addItem, updateItem, STORE_NAMES, generateId } from './db.js';

export class RecurringJobManager {
    constructor() {
        this.processedCount = 0;
        this.errors = [];
    }

    async processAll() {
        
        try {
            const results = {
                recurringTransactions: await this.processRecurringTransactions(),
                dueBills: await this.processDueBills()
            };

            
            if (this.errors.length > 0) {
                console.warn(`⚠️ ${this.errors.length} errors encountered:`, this.errors);
            }
            
            return {
                success: true,
                processed: this.processedCount,
                errors: this.errors,
                details: results
            };
        } catch (error) {
            console.error('❌ Processing failed:', error);
            return {
                success: false,
                processed: this.processedCount,
                errors: [...this.errors, error.message]
            };
        }
    }

    async processRecurringTransactions() {
        const [recList, accounts, existingTransactions] = await Promise.all([
            getAllItems(STORE_NAMES.recurringTransactions),
            getAllItems(STORE_NAMES.accounts),
            getAllItems(STORE_NAMES.transactions)
        ]);

        const todayStr = new Date().toISOString().slice(0, 10);
        const processed = [];

        for (const rec of recList) {
            try {
                if (await this.shouldProcessRecurring(rec, todayStr, existingTransactions)) {
                    const transaction = await this.createRecurringTransaction(rec, accounts, todayStr);
                    await addItem(STORE_NAMES.transactions, transaction);
                    
                    // Update last processed date in the recurring record itself
                    rec.lastProcessed = todayStr;
                    await updateItem(STORE_NAMES.recurringTransactions, rec);
                    
                    processed.push(transaction);
                    this.processedCount++;
                    
                }
            } catch (error) {
                this.errors.push(`Recurring ${rec.name}: ${error.message}`);
                console.error(`❌ Failed to process ${rec.name}:`, error);
            }
        }

        return {
            processed: processed.length,
            transactions: processed
        };
    }

    async shouldProcessRecurring(rec, todayStr, existingTransactions) {
        // Check if already processed today
        if (rec.lastProcessed === todayStr) {
            return false;
        }

        // Check for duplicate transactions this month
        const monthKey = `${todayStr.slice(0, 7)}-${rec.id}`;
        const existingThisMonth = existingTransactions.some(tx => 
            tx.description?.includes(rec.name) && 
            tx.date.startsWith(todayStr.slice(0, 7))
        );
        
        if (existingThisMonth) return false;

        // Calculate if due based on frequency
        const lastDate = rec.lastProcessed || rec.startDate;
        return this.isDue(rec.startDate, rec.frequency, lastDate, todayStr);
    }

    async createRecurringTransaction(rec, accounts, todayStr) {
        const accountId = await this.getSmartAccountId(rec, accounts);
        
        return {
            id: generateId(),
            type: rec.type,
            amount: rec.type === 'income' ? rec.amount : -rec.amount,
            date: todayStr,
            categoryId: rec.categoryId,
            accountId: accountId,
            description: `Auto: ${rec.name}`,
            recurringId: rec.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    async processDueBills() {
        const [bills, accounts, categories] = await Promise.all([
            getAllItems(STORE_NAMES.bills),
            getAllItems(STORE_NAMES.accounts),
            getAllItems(STORE_NAMES.categories)
        ]);

        const today = new Date().toISOString().slice(0, 10);
        const processed = [];

        for (const bill of bills.filter(b => !b.paid && b.dueDate <= today)) {
            try {
                const result = await this.processBillPayment(bill, accounts, categories, today);
                if (result) {
                    processed.push(result);
                    this.processedCount++;
                }
            } catch (error) {
                this.errors.push(`Bill ${bill.name}: ${error.message}`);
                console.error(`❌ Failed to process bill ${bill.name}:`, error);
            }
        }

        return {
            processed: processed.length,
            bills: processed
        };
    }

    async processBillPayment(bill, accounts, categories, today) {
        // Check if bill has payment account
        if (!bill.accountId) {
            return null;
        }

        const account = accounts.find(a => a.id === bill.accountId);
        if (!account) {
            throw new Error(`Account not found for bill: ${bill.name}`);
        }

        // Check if account has sufficient funds
        if (!this.canAccountPayBill(account, bill)) {
            return null;
        }

        // Create transaction
        const transaction = {
            id: generateId(),
            type: 'expense',
            amount: -bill.amount,
            date: today,
            categoryId: bill.categoryId || await this.getBillCategoryId(bill.name, categories),
            accountId: bill.accountId,
            description: `Bill: ${bill.name}`,
            billId: bill.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Update bill and account
        bill.paid = true;
        bill.paidDate = today;
        bill.updatedAt = new Date().toISOString();
        
        account.balance -= bill.amount;
        account.updatedAt = new Date().toISOString();

        // Execute all updates in sequence
        await addItem(STORE_NAMES.transactions, transaction);
        await updateItem(STORE_NAMES.bills, bill);
        await updateItem(STORE_NAMES.accounts, account);

        // Handle recurring bills - CREATE NEXT INSTANCE
        if (bill.recurring) {
            await this.createNextBillInstance(bill, today);
        }

        
        return {
            bill: bill.name,
            amount: bill.amount,
            account: account.name,
            recurring: !!bill.recurring
        };
    }

    async createNextBillInstance(bill, today) {
        const nextDueDate = this.getNextDueDate(bill.dueDate, bill.recurring);
        
        const newBill = {
            id: generateId(),
            name: bill.name,
            amount: bill.amount,
            dueDate: nextDueDate,
            paid: false,
            recurring: bill.recurring,
            accountId: bill.accountId,
            categoryId: bill.categoryId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await addItem(STORE_NAMES.bills, newBill);
    }

    canAccountPayBill(account, bill) {
        // Different rules for different account types
        switch (account.type) {
            case 'credit':
                // Credit cards can always "pay" (they go more negative)
                return true;
            case 'loan':
                // Loans might have restrictions
                return account.balance >= bill.amount;
            case 'bank':
            case 'savings':
            case 'cash':
            default:
                // Regular accounts need sufficient balance
                return account.balance >= bill.amount;
        }
    }

    async getSmartAccountId(recTransaction, accounts) {
        if (recTransaction.accountId) {
            return recTransaction.accountId;
        }

        // Priority-based account selection
        const accountPriority = recTransaction.type === 'income' 
            ? ['savings', 'bank', 'investment']
            : ['credit', 'bank', 'cash'];

        for (const type of accountPriority) {
            const suitableAccount = accounts.find(acc => 
                acc.type === type && 
                (recTransaction.type === 'income' || this.canAccountPayBill(acc, { amount: recTransaction.amount }))
            );
            if (suitableAccount) return suitableAccount.id;
        }

        throw new Error('No suitable account found for transaction');
    }

    async getBillCategoryId(billName, categories) {
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

    isDue(start, freq, last, today) {
        const dLast = new Date(last || start);
        const dToday = new Date(today);

        switch (freq) {
            case 'weekly':
                dLast.setDate(dLast.getDate() + 7);
                break;
            case 'fortnightly':
                dLast.setDate(dLast.getDate() + 14);
                break;
            case 'monthly':
                dLast.setMonth(dLast.getMonth() + 1);
                break;
            case 'quarterly':
                dLast.setMonth(dLast.getMonth() + 3);
                break;
            case 'annually':
                dLast.setFullYear(dLast.getFullYear() + 1);
                break;
            default:
                dLast.setMonth(dLast.getMonth() + 1);
        }

        return dToday >= dLast;
    }

    getNextDueDate(currentDateStr, freq) {
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

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(Math.abs(amount));
    }
}

// Backwards compatibility - keep your existing functions
export async function processRecurringTransactions() {
    const manager = new RecurringJobManager();
    const result = await manager.processRecurringTransactions();
    return result.processed;
}

export async function processDueBills() {
    const manager = new RecurringJobManager();
    const result = await manager.processDueBills();
    return result.processed;
}

// New unified processing function
export async function processAllRecurring() {
    const manager = new RecurringJobManager();
    return await manager.processAll();
}