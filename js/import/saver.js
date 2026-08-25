// ============================================================================
// 💾 import/saver.js — Save Imported Transactions with De-duplication
// ============================================================================

import { addItem, getAllItems, STORE_NAMES } from '../db.js';
import { logImportDebug } from './debug.js';
import { buildCategoryIndex, autoAssignCategory } from './categoryRules.js';
import { suggestCategoryForTransaction } from './categoryMapper.js';

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
    // 🔹 Auto-assign category IF missing.
    //
    // Bug fix: this used to ONLY call autoAssignCategory() (categoryRules.js),
    // which matches your CATEGORY NAMES against the transaction text — that
    // only works if a category name like "groceries" literally appears in
    // the bank description, which real merchant names (Woolworths, KFC,
    // Bunnings...) essentially never do. The proper vendor-name-based
    // matcher (categoryMapper.js, mapping actual merchant keywords to
    // categories) existed but was never wired into the import flow at all.
    //
    // Now: try the vendor/merchant matcher FIRST (merchant rules → bank's
    // own category column if present → known merchant keywords), and only
    // fall back to the category-name matcher if that comes up empty —
    // best of both rather than replacing one with the other.
    if (!tx.categoryId) {
      // Bug fix: this always passed an empty options object, so
      // BANK_CATEGORY_MAP_BY_BANK (bank-specific overrides, as opposed to
      // the generic cross-bank map) was silently dead code - bankId was
      // always undefined. Deriving it from tx.source ("NAB Import" -> "nab")
      // lets bank-specific mappings actually take effect.
      const bankId = (tx.source || '').split(' ')[0].toLowerCase();
      const { categoryId: vendorCategoryId, source } = suggestCategoryForTransaction(
        tx,
        tx.bankCategory || null,
        { bankId }
      );

      if (vendorCategoryId && source !== 'fallback') {
        tx.categoryId = vendorCategoryId;
        tx.categorySource = source;
      } else if (categories.length && categoryIndex.length) {
        const autoCatId = autoAssignCategory(tx, categories, categoryIndex);
        if (autoCatId) {
          tx.categoryId = autoCatId;
          tx.categorySource = 'category_name_match';
        }
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
//
// Exported so other write paths — specifically backup restore in
// settings.js — can reuse the exact same check. See the bug fix note
// there: restore used to have NO content-based dedup at all, only an
// id match, so restoring a backup after a fresh CSV import (which
// generates brand-new ids for what might be the exact same real-world
// transactions) silently duplicated every one of them.
// ---------------------------------------------------------------------------
export function isDuplicateTransaction(tx, existingList) {
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

// Kept as a local alias so the existing internal call site above doesn't
// need to change.
function isDuplicate(tx, existingList) {
  return isDuplicateTransaction(tx, existingList);
}

function roundAmount(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function dayDiff(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}
