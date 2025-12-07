// ============================================================================
// 🧾 importSaver.js — Saves imported CSV / text transactions into IndexedDB
// ============================================================================

import { addItem, getAllItems, STORE_NAMES } from './db.js';
import { generateId } from './db.js';

// ============================================================================
// 🚀 Save Imported Transactions
// ============================================================================
// Prevents duplicates by checking:
//  - same date
//  - same amount
//  - same description
//  - same accountId
// ============================================================================
export async function saveImportedTransactions(importedList) {
    if (!Array.isArray(importedList) || importedList.length === 0) {
        console.warn("⚠️ No transactions provided to save.");
        return 0;
    }

    console.log("📥 Saving imported transactions:", importedList);

    // Load all existing transactions
    const existing = await getAllItems(STORE_NAMES.transactions);

    let savedCount = 0;

    for (const tx of importedList) {
        const isDuplicate = existing.some(e =>
            e.date === tx.date &&
            e.amount === tx.amount &&
            e.description.trim().toLowerCase() === tx.description.trim().toLowerCase() &&
            e.accountId === tx.accountId
        );

        if (isDuplicate) {
            console.log("⏩ Skipped duplicate:", tx);
            continue;
        }

        const finalRecord = {
            id: generateId(),
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            type: tx.type || (tx.amount < 0 ? "expense" : "income"),
            categoryId: tx.categoryId || "",
            accountId: tx.accountId,
            notes: tx.notes || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await addItem(STORE_NAMES.transactions, finalRecord);
        savedCount++;
    }

    console.log(`✅ Saved ${savedCount} transactions`);
    return savedCount;
}
