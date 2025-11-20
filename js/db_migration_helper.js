// ============================================================================
// 🧩 db_migration_helper.js — One-time migration from IndexedDB → Dexie.js
// ----------------------------------------------------------------------------
// This safely reads your existing IndexedDB (budgetTrackerDB v11)
// and copies all stores into a new Dexie-managed database (budgetTrackerDB_v2).
// ============================================================================

//import Dexie from 'dexie';
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.mjs';

import { STORE_NAMES } from './db.js'; // same mapping as your old db.js

// 1️⃣ Create new Dexie-based database
export const dexieDB = new Dexie('budgetTrackerDB_v2');
dexieDB.version(1).stores({
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

export async function migrateIndexedDBToDexie() {
  console.log('🚀 Starting migration from IndexedDB → Dexie...');

  const oldDBName = 'budgetTrackerDB';
  const newDBName = 'budgetTrackerDB_v2';
  let oldDB;

  try {
    // 🔹 Open old IndexedDB manually
    oldDB = await new Promise((resolve, reject) => {
      const req = indexedDB.open(oldDBName);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });

    console.log(`📂 Opened old DB: ${oldDBName}`);

    // 🔹 Extract all stores
    const data = {};
    for (const storeName of Object.values(STORE_NAMES)) {
      if (!oldDB.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Store missing in old DB: ${storeName}`);
        continue;
      }

      data[storeName] = await new Promise((resolve, reject) => {
        const tx = oldDB.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = e => reject(e.target.error);
      });

      console.log(`📦 Retrieved ${data[storeName].length} records from ${storeName}`);
    }

    // 🔹 Save all data into new Dexie DB
    for (const [storeName, items] of Object.entries(data)) {
      if (!dexieDB[storeName]) {
        console.warn(`⚠️ No store in Dexie schema for: ${storeName}`);
        continue;
      }

      await dexieDB[storeName].bulkPut(items);
      console.log(`✅ Migrated ${items.length} → ${storeName}`);
    }

    console.log(`🎉 Migration complete → ${newDBName}`);

    // Optional: keep old DB as backup
    console.log('📁 Old DB retained as backup. You can delete it manually later.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    if (oldDB) oldDB.close();
  }
}
