// ============================================================================
// 💾 import/saver.js — Save Imported Transactions with De-duplication
// ============================================================================

import { addItem, getAllItems, STORE_NAMES } from '../db.js';
import { logImportDebug } from './debug.js';
import {
  buildCategoryIndex,
  autoAssignCategory
} from './categoryRules.js';

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

  const [existing, categories] = await Promise.all([
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.categories).catch(() => [])
  ]);

  const existingForAccount = existing.filter(tx => tx.accountId === accountId);

  // ✅ Correct keyword / merchant index
  const keywordIndex = buildCategoryIndex(categories);

  let saved = 0;
  let skipped = 0;

  for (const tx of transactions) {
    // Auto-category assignment
    if (!tx.categoryId && keywordIndex.length) {
      const autoCatId = autoAssignCategory(tx, categories, keywordIndex);
      if (autoCatId) {
        tx.categoryId = autoCatId;
        logImportDebug('Auto category assigned', {
          desc: tx.description,
          categoryId: autoCatId
        });
      }
    }

    // De-duplication
    if (dedupe && isDuplicate(tx, existingForAccount)) {
      skipped++;
      continue;
    }

    try {
      await addItem(STORE_NAMES.transactions, tx);
      existingForAccount.push(tx);
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
    return sameAmt && sameDesc && sameAccount && closeDate;
  });
}

function roundAmount(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function dayDiff(d1, d2) {
  return Math.round(
    (new Date(d1) - new Date(d2)) / (1000 * 60 * 60 * 24)
  );
}
