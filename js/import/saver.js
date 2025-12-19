// ============================================================================
// 💾 import/saver.js — Save Imported Transactions with De-duplication
// ============================================================================

import { addItem, getAllItems, STORE_NAMES } from '../db.js';
import { logImportDebug } from './debug.js';
import { buildCategoryIndex, autoAssignCategory} from './categoryRules.js';

export async function saveImportedTransactions(transactions, options = {}) {
  const { dedupe = true } = options;

  const [existing, categories] = await Promise.all([
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.categories)
  ]);

  const resolver = buildCategoryResolver(categories);
  const existingForAccount = existing.filter(
    tx => tx.accountId === transactions[0].accountId
  );

  let saved = 0;
  let skipped = 0;

  for (const tx of transactions) {
    // 🔥 THIS IS THE FIX
    if (!tx.categoryId) {
      tx.categoryId = resolveCategoryId(tx, categories, resolver);
    }

    if (dedupe && isDuplicate(tx, existingForAccount)) {
      skipped++;
      continue;
    }

    await addItem(STORE_NAMES.transactions, tx);
    existingForAccount.push(tx);
    saved++;
  }

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
