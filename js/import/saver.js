// ============================================================================
// 💾 import/saver.js — Save Imported Transactions with De-duplication
// ============================================================================

import { addItem, getAllItems, STORE_NAMES } from '../db.js';
import { logImportDebug } from './debug.js';
import { buildCategoryIndex, autoAssignCategory } from './categoryRules.js';

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

  // Load existing tx + categories in parallel
  const [existing, categories] = await Promise.all([
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.categories).catch(() => [])
  ]);

  const existingForAccount = existing.filter(tx => tx.accountId === accountId);
  const categoryIndex = buildCategoryIndex(categories);

  logImportDebug('Existing transactions for account', existingForAccount.length);

  let saved = 0;
  let skipped = 0;

  for (const tx of transactions) {
    // 🔹 Auto-assign category IF missing
    if (!tx.categoryId && categories.length && categoryIndex.length) {
      const autoCatId = autoAssignCategory(tx, categories, categoryIndex);
      if (autoCatId) {
        tx.categoryId = autoCatId;
      }
    }

    // 🔹 De-duplication
    if (dedupe && isDuplicate(tx, existingForAccount)) {
      skipped++;
      continue;
    }

    try {
      await addItem(STORE_NAMES.transactions, tx);
      existingForAccount.push(tx); // add to in-memory for further dedupe
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
// Simple duplicate detection: same date, amount, description, account
// within +/- 2 days considerate buffer
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
      logImportDebug('Duplicate detected, skipping:', { tx, existing: e });
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
