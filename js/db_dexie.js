// ============================================================================
// 💾 db_dexie.js — Dexie.js Database Manager for Budget Tracker
// ----------------------------------------------------------------------------
// Uses global Dexie from script tag - no imports needed
// ============================================================================

// 🚨 CRITICAL FIX: Remove the import statement and use global Dexie
// Dexie is already loaded via script tag in index.html

// Check if Dexie is available
if (typeof Dexie === 'undefined') {
    console.error('❌ Dexie is not loaded. Make sure dexie.min.js is included via script tag before this file.');
    throw new Error('Dexie.js not loaded');
}

console.log('✅ Dexie version:', Dexie.version);

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

// Database schema
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

console.log('✅ Dexie DB initialized with stores:', Object.keys(db._dbSchema));

// Utility function to generate IDs
export function generateId() {
  return crypto.randomUUID();
}

// CRUD Operations
export async function addItem(storeName, item) {
  if (!db[storeName]) {
    throw new Error(`Store ${storeName} does not exist`);
  }
  
  item.id = item.id || generateId();
  const now = new Date().toISOString();
  item.createdAt = item.createdAt || now;
  item.updatedAt = now;
  
  await db[storeName].put(item);
  return item;
}

export async function getItem(storeName, id) {
  return await db[storeName].get(id);
}

export async function updateItem(storeName, item) {
  if (!item.id) {
    throw new Error('Item must have an id to update');
  }
  
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

export async function getItemsByIndex(storeName, index, value) {
  return await db[storeName].where(index).equals(value).toArray();
}

// Bulk operations
export async function bulkAddItems(storeName, items) {
  items.forEach(item => {
    item.id = item.id || generateId();
    const now = new Date().toISOString();
    item.createdAt = item.createdAt || now;
    item.updatedAt = now;
  });
  
  await db[storeName].bulkPut(items);
  return items;
}

// Data management
export async function clearAllData() {
  const storeNames = Object.values(STORE_NAMES);
  for (const name of storeNames) {
    if (db[name]) {
      await db[name].clear();
    }
  }
  console.log('🧹 All stores cleared');
}

export async function exportAllData() {
  const result = {};
  for (const name of Object.values(STORE_NAMES)) {
    if (db[name]) {
      result[name] = await db[name].toArray();
    }
  }
  return result;
}

export async function importAllData(data) {
  for (const [name, items] of Object.entries(data)) {
    if (db[name] && Array.isArray(items)) {
      await db[name].bulkPut(items);
      console.log(`📥 Imported ${items.length} items to ${name}`);
    }
  }
  console.log('✅ Data import complete');
}

// Database utilities
export async function getDatabaseSize() {
  const stores = Object.values(STORE_NAMES);
  let totalCount = 0;
  
  for (const storeName of stores) {
    if (db[storeName]) {
      const count = await db[storeName].count();
      totalCount += count;
    }
  }
  
  return totalCount;
}

export async function isDatabaseEmpty() {
  const size = await getDatabaseSize();
  return size === 0;
}

// Test database connection
export async function testDatabase() {
  try {
    await db.open();
    console.log('✅ Database opened successfully');
    return true;
  } catch (error) {
    console.error('❌ Database opening failed:', error);
    return false;
  }
}