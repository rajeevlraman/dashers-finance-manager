// recurringjob.js

import { getAllItems, addItem, updateItem, STORE_NAMES, generateId } from './db.js';

export async function processRecurringTransactions() {
  const [recList, accounts] = await Promise.all([
    getAllItems(STORE_NAMES.recurringTransactions),
    getAllItems(STORE_NAMES.accounts)
  ]);

  const todayStr = new Date().toISOString().slice(0, 10);

  for (const rec of recList) {
    const key = `rec_last_${rec.id}`;
    const lastDate = localStorage.getItem(key);

    if (!lastDate || isDue(rec.startDate, rec.frequency, lastDate, todayStr)) {
      const accountId = await getSmartAccountId(rec, accounts);

      const newTx = {
        id: generateId(),
        type: rec.type,
        amount: rec.amount,
        date: todayStr,
        categoryId: rec.categoryId,
        accountId: accountId,
        description: `Auto: ${rec.name}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addItem(STORE_NAMES.transactions, newTx);
      localStorage.setItem(key, todayStr);
      console.log(`✅ Generated transaction from recurring: ${rec.name} → account ${accountId}`);
    }
  }
}

async function getSmartAccountId(recTransaction, accounts) {
  if (recTransaction.accountId) {
    return recTransaction.accountId;
  }

  const defaultBank = accounts.find(acc => acc.type === 'bank' && acc.balance > 0);
  const defaultCredit = accounts.find(acc => acc.type === 'credit');

  if (recTransaction.type === 'income') {
    return defaultBank?.id || accounts[0]?.id;
  }
  if (recTransaction.amount < 50 && defaultCredit) {
    return defaultCredit.id;
  }
  if (recTransaction.amount >= 50 && defaultBank) {
    return defaultBank.id;
  }
  return accounts[0]?.id;
}

export async function processDueBills() {
  const [bills, accounts] = await Promise.all([
    getAllItems(STORE_NAMES.bills),
    getAllItems(STORE_NAMES.accounts)
  ]);

  const today = new Date().toISOString().slice(0, 10);

  for (const bill of bills.filter(b => !b.paid && b.accountId && b.dueDate <= today)) {
    const acc = accounts.find(a => a.id === bill.accountId);
    if (!acc || acc.balance < bill.amount) continue;

    const transaction = {
      id: generateId(),
      type: 'expense',
      amount: bill.amount,
      date: today,
      categoryId: await getBillCategoryId(bill.name),
      accountId: bill.accountId,
      description: `Bill: ${bill.name}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    bill.paid = true;
    bill.updatedAt = new Date().toISOString();
    acc.balance -= bill.amount;
    acc.updatedAt = new Date().toISOString();

    await addItem(STORE_NAMES.transactions, transaction);
    await updateItem(STORE_NAMES.bills, bill);
    await updateItem(STORE_NAMES.accounts, acc);

    console.log(`✅ Auto‑paid bill: ${bill.name}`);
  }
}

async function getBillCategoryId(billName) {
  const categories = await getAllItems(STORE_NAMES.categories);
  const name = billName.toLowerCase();
  if (name.includes('electric') || name.includes('gas') || name.includes('water')) {
    return categories.find(c => c.name === 'Utilities')?.id;
  }
  if (name.includes('internet') || name.includes('phone')) {
    return categories.find(c => c.name === 'Utilities')?.id;
  }
  if (name.includes('rent') || name.includes('mortgage')) {
    return categories.find(c => c.name === 'Rent')?.id;
  }
  return categories.find(c => c.name === 'Other Expenses')?.id;
}

function isDue(start, freq, last, today) {
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
