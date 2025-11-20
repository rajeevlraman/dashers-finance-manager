// ============================================================================
// 💾 db_dexie.js — Dexie.js Database Manager for Budget Tracker
// ----------------------------------------------------------------------------
// Drop-in replacement for original IndexedDB code
// Maintains all store names, same CRUD API, and supports upgrades.
// ============================================================================

//import Dexie from 'dexie';
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.mjs';


export const STORE_NAMES = {
  accounts: 'accounts',
  categories: 'categories',
  transactions: 'transactions',
  budgets: 'budgets',
  bills: 'bills',
  recurringTransactions: 'recurringTransactions',
  meta: 'meta',
  loans: 'loans',
  loanTransactions: 'loanTransactions',
  properties: 'properties',
  tenants: 'tenants',
  expenses: 'expenses',
  maintenance: 'maintenance',
  costbase: 'costbase'
};

// Create Dexie instance
export const db = new Dexie('budgetTrackerDB_v2');
db.version(1).stores({
  accounts: 'id,name,type',
  categories: 'id,name,type',
  transactions: 'id,date,type,categoryId,propertyId',
  budgets: 'id,name',
  bills: 'id,propertyId,dueDate,status',
  recurringTransactions: 'id,name',
  meta: 'id,key',
  loans: 'id,propertyId,type',
  loanTransactions: 'id,loanId,date',
  properties: 'id,name,address',
  tenants: 'id,propertyId,name,startDate',
  expenses: 'id,propertyId,category,date,status',
  maintenance: 'id,propertyId,date,status',
  costbase: 'id,propertyId,date,type'
});

console.log('✅ Dexie DB initialized');

// Utility
export function generateId() {
  return crypto.randomUUID();
}

// CRUD
export async function addItem(storeName, item) {
  item.id = item.id || generateId();
  const now = new Date().toISOString();
  item.createdAt = item.createdAt || now;
  item.updatedAt = now;
  await db[storeName].put(item);
  return item;
}

export async function updateItem(storeName, item) {
  item.updatedAt = new Date().toISOString();
  await db[storeName].put(item);
  return item;
}

export async function deleteItem(storeName, id) {
  await db[storeName].delete(id);
  console.log(`🗑️ Deleted from ${storeName}: ${id}`);
}

export async function getAllItems(storeName) {
  return await db[storeName].toArray();
}

export async function clearAllData() {
  for (const name of Object.values(STORE_NAMES)) await db[name].clear();
  console.log('🧹 All stores cleared');
}

export async function exportAllData() {
  const result = {};
  for (const name of Object.values(STORE_NAMES)) {
    result[name] = await db[name].toArray();
  }
  return result;
}

export async function importAllData(data) {
  for (const [name, items] of Object.entries(data)) {
    if (db[name]) await db[name].bulkPut(items);
  }
  console.log('📥 Data import complete');
}
