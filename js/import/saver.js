// ============================================================================
// 💾 import/saver.js — Save Imported Transactions with De-duplication
// ============================================================================

import { addItem, getAllItems, STORE_NAMES } from '../db.js';
import { logImportDebug } from './debug.js';
import { buildCategoryIndex, autoAssignCategory } from './categoryRules.js';

// ----------------------------------------------------------------------------
// Save imported transactions
// ----------------------------------------------------------------------------
export async function saveImportedTransactions(transactions, options = {}) {
  const { dedupe = true } = options;

  logImportDebug('saveImportedTransactions: starting', {
    count: transactions.length,
    dedupe
  });

  if (!transactions.length) {
    return { saved: 0, skipped: 0 };
  }

  const accountId = transactions[0].accountId;

  // Load existing transactions + categories
  const [existing, categories] = await Promise.all([
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.categories).catch(() => [])
  ]);

  const existingForAccount = existing.filter(tx => tx.accountId === accountId);

  // Build keyword index ONCE
  const categoryIndex = buildCategoryIndex(categories);

  logImportDebug('Existing transactions for account', existingForAccount.length);
  logImportDebug('Category engine ready', {
    categories: categories.length,
    rules: categoryIndex.length
  });

  let saved = 0;
  let skipped = 0;

  for (const tx of transactions) {
    // -----------------------------------------------------------------------
    // 🧠 AUTO CATEGORY ASSIGNMENT (SAFE, ONE-TIME)
    // -----------------------------------------------------------------------
    if (!tx.categoryId && categories.length && categoryIndex.length) {
      const assignedCategoryId = autoAssignCategory(
        tx,
        categories,
        categoryIndex
      );

      if (assignedCategoryId) {
        tx.categoryId = assignedCategoryId;
        tx.categorySource = 'auto';
        tx.categoryConfidence = 0.6;

        logImportDebug('Category auto-assigned', {
          description: tx.description,
          categoryId: assignedCategoryId
        });
      }
    }

    // -----------------------------------------------------------------------
    // 🔁 DE-DUPLICATION
    // -----------------------------------------------------------------------
    if (dedupe && isDuplicate(tx, existingForAccount)) {
      skipped++;
      continue;
    }

    try {
      await addItem(STORE_NAMES.transactions, tx);
      existingForAccount.push(tx); // Keep memory list fresh
      saved++;
    } catch (e) {
      console.error('[IMPORT] Failed to save transaction', tx, e);
      skipped++;
    }
  }

  logImportDebug('saveImportedTransactions: finished', { saved, skipped });
  return { saved, skipped };
}

// ---------------------------------------------------------------------------
// Duplicate detection
// Same date, amount, description, account
// ±2 day tolerance
// ---------------------------------------------------------------------------
function isDuplicate(tx, existingList) {
  const txAmt = roundAmount(tx.amount);
  const txDate = tx.date;
  const txDesc = (tx.description || '').toLowerCase();

  return existingList.some(e => {
    const sameAmt = roundAmount(e.amount) === txAmt;
    const sameDesc = (e.description || '').toLowerCase() === txDesc;
    const sameAccount = e.accountId === tx.accountId;
    const closeDate = Math.abs(dayDiff(e.date, txDate)) <= 2;

    const dup = sameAmt && sameDesc && sameAccount && closeDate;
    if (dup) {
      logImportDebug('Duplicate detected, skipping', {
        description: tx.description,
        amount: tx.amount,
        date: tx.date
      });
    }
    return dup;
  });
}

function roundAmount(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function dayDiff(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}
