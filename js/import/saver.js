// ============================================================================
// 💾 import/saver.js — Save Imported Transactions with Categorisation + Dedupe
// ============================================================================

import { addItem, getAllItems, STORE_NAMES } from '../db.js';
import { logImportDebug } from './debug.js';

// 🔑 IMPORT THE RULES THAT ACTUALLY WORK
import { findMerchantRule } from './merchantRules.js';
import { buildCategoryIndex, autoAssignCategory } from './categoryRules.js';

export async function saveImportedTransactions(transactions, options = {}) {
  const { dedupe = true } = options;

  if (!transactions || !transactions.length) {
    return { saved: 0, skipped: 0 };
  }

  logImportDebug('saveImportedTransactions:start', {
    count: transactions.length
  });

  // Load existing data
  const [existingTx, categories] = await Promise.all([
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.categories)
  ]);

  const accountId = transactions[0].accountId;
  const existingForAccount = existingTx.filter(tx => tx.accountId === accountId);

  // Build keyword index ONCE
  const categoryIndex = buildCategoryIndex(categories);

  let saved = 0;
  let skipped = 0;

  for (const tx of transactions) {

    // ============================================================
    // 1️⃣ MERCHANT RULES (highest confidence)
    // ============================================================
    if (!tx.categoryId && tx.merchant) {
      const merchantRule = findMerchantRule(tx.merchant);

      if (merchantRule) {
        tx.categoryId = merchantRule.categoryId;
        tx._categorySource = 'merchant';
        tx._categoryConfidence = merchantRule.confidence;
      }
    }

    // ============================================================
    // 2️⃣ KEYWORD RULES (fallback)
    // ============================================================
    if (!tx.categoryId && categories.length && categoryIndex.length) {
      const keywordCatId = autoAssignCategory(tx, categories, categoryIndex);

      if (keywordCatId) {
        tx.categoryId = keywordCatId;
        tx._categorySource = 'keyword';
        tx._categoryConfidence = 0.6;
      }
    }

    // ============================================================
    // 3️⃣ DEDUPLICATION
    // ============================================================
    if (dedupe && isDuplicate(tx, existingForAccount)) {
      skipped++;
      continue;
    }

    // ============================================================
    // 4️⃣ SAVE
    // ============================================================
    try {
      await addItem(STORE_NAMES.transactions, tx);
      existingForAccount.push(tx);
      saved++;
    } catch (err) {
      console.error('[IMPORT] Failed to save transaction', tx, err);
      skipped++;
    }
  }

  logImportDebug('saveImportedTransactions:end', { saved, skipped });
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
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}
