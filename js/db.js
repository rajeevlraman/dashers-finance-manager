// ============================================================================
// ⚡ Dexie Adapter Database Layer (SAFE - NO MIGRATION NEEDED)
// ----------------------------------------------------------------------------
// This replaces ALL direct IndexedDB code with Dexie while still reading
// your existing "budgetTrackerDB" database and stores WITHOUT upgrading,
// moving or deleting anything.
// ============================================================================

import Dexie from "https://unpkg.com/dexie@3.2.4/dist/dexie.mjs";

// ----------------------
// Database configuration
// ----------------------
export const DB_NAME = "budgetTrackerDB";
export const DB_VERSION = 11; // <<< IMPORTANT: stays same!

// Stores that already exist in your IndexedDB
export const STORE_NAMES = {
  accounts: "accounts",
  categories: "categories",
  transactions: "transactions",
  budgets: "budgets",
  bills: "bills",
  recurringTransactions: "recurringTransactions",
  meta: "meta",
  loans: "loans",
  loanTransactions: "loanTransactions",
  properties: "properties",
  tenants: "tenants",
  expenses: "expenses",
  maintenance: "maintenance",
  costbase: "costbase"
};

// ============================================================================
// ⚠️ Dexie MUST NOT change the schema or bump versions
// So we declare EXACTLY what exists in your current IndexedDB.
// ============================================================================

export const db = new Dexie(DB_NAME);

// Register all object stores EXACTLY as they already exist.
// Important: no new fields, no key changes, NO upgrade() function.
db.version(DB_VERSION).stores({
  accounts: "id",
  categories: "id,parentId",
  transactions: "++id,date,categoryId,accountId",
  budgets: "id,categoryId",
  bills: "id",
  recurringTransactions: "id",
  meta: "key",
  loans: "id",
  loanTransactions: "++id,loanId",
  properties: "id",
  tenants: "id,propertyId",
  expenses: "++id",
  maintenance: "id",
  costbase: "id"
});

// -----------------------------
// UUID Generator (safe)
// -----------------------------
export function generateId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2);
}

// -----------------------------
// CLEAN Dexie CRUD WRAPPERS
// -----------------------------
export async function getAllItems(store) {
  return await db[store].toArray();
}

export async function getItem(store, id) {
  return await db[store].get(id);
}

export async function addItem(store, item) {
  return await db[store].put(item);
}

export async function updateItem(store, item) {
  return await db[store].put(item);
}

export async function deleteItem(store, id) {
  return await db[store].delete(id);
}

export async function clearStore(store) {
  return await db[store].clear();
}

// ============================================================================
// CLEAR ALL STORES — Needed by settings.js
// ============================================================================
export async function clearAllData() {
  const storeNames = Object.keys(STORE_NAMES);

  for (const store of storeNames) {
    try {
      await db[store].clear();
    } catch (err) {
      console.warn("Could not clear store:", store, err);
    }
  }

  console.log("✅ All data cleared");
}
