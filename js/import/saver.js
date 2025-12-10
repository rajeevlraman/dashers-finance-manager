// saver.js - Updated version
import { addItem, getAllItems, STORE_NAMES } from '../db.js';
import { logImportDebug } from './debug.js';
import { buildCategoryIndex, autoAssignCategory } from './categoryRules.js';
import { bankCategoryToCategoryId } from '../bankCategoryMap.js'; // You'll need to create this

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
    // 🔹 1. FIRST TRY: Use bank category if available
    if (!tx.categoryId && tx.bankCategory) {
      const mappedId = mapBankCategoryToCategoryId(tx.bankCategory, categories);
      if (mappedId) {
        tx.categoryId = mappedId;
        logImportDebug('Mapped bank category to category', {
          bankCategory: tx.bankCategory,
          categoryId: mappedId
        });
      }
    }

    // 🔹 2. SECOND TRY: Auto-assign category based on description/merchant
    if (!tx.categoryId && categories.length && categoryIndex.length) {
      const autoCatId = autoAssignCategory(tx, categories, categoryIndex);
      if (autoCatId) {
        tx.categoryId = autoCatId;
        logImportDebug('Auto-assigned category', {
          description: tx.description,
          categoryId: autoCatId
        });
      }
    }

    // 🔹 3. THIRD TRY: Special merchant mappings (e.g., Malvic)
    if (!tx.categoryId && tx.merchant) {
      const merchantCatId = mapMerchantToCategoryId(tx.merchant, categories);
      if (merchantCatId) {
        tx.categoryId = merchantCatId;
        logImportDebug('Mapped merchant to category', {
          merchant: tx.merchant,
          categoryId: merchantCatId
        });
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

// Helper function to map bank categories to your category IDs
function mapBankCategoryToCategoryId(bankCategory, categories) {
  const bankCategoryMap = {
    'Groceries': 'exp_groceries',
    'Supermarket': 'exp_groceries',
    'Restaurants': 'exp_dining',
    'Fast Food': 'exp_dining',
    'Medical': 'exp_health',
    'Health': 'exp_health',
    'Fuel': 'exp_fuel',
    'Petrol': 'exp_fuel',
    'Transport': 'exp_transport',
    'Parking': 'exp_Parking_Fees',
    'Insurance': 'exp_insurance',
    'Electricity': 'exp_electricity',
    'Gas': 'exp_gas',
    'Water': 'exp_water_usage',
    'Internet': 'exp_internet',
    'Phone': 'exp_mobile',
    'Education': 'exp_education',
    'Fees': 'exp_fees',
    'Rent': 'exp_rent_payment',
    'Mortgage': 'exp_Home_mortgage'
  };

  const targetName = bankCategoryMap[bankCategory];
  if (!targetName) return null;

  // Try to find exact match first
  let category = categories.find(c => c.name.toLowerCase() === targetName.toLowerCase());
  
  // If not found, try partial match
  if (!category) {
    category = categories.find(c => 
      c.name.toLowerCase().includes(targetName.toLowerCase()) ||
      targetName.toLowerCase().includes(c.name.toLowerCase())
    );
  }
  
  // If still not found, try by ID pattern
  if (!category) {
    category = categories.find(c => c.id.includes(targetName));
  }

  return category?.id || null;
}

// Helper function for specific merchant mappings
function mapMerchantToCategoryId(merchant, categories) {
  const merchantLower = (merchant || '').toLowerCase();
  
  // Special cases
  if (merchantLower.includes('malvic')) {
    const indianGrocery = categories.find(c => c.id === 'exp_Indian_Groceries');
    return indianGrocery?.id || null;
  }
  
  if (merchantLower.includes('woolworths') || merchantLower.includes('coles') || merchantLower.includes('safeway')) {
    const grocery = categories.find(c => c.id === 'exp_groceries');
    return grocery?.id || null;
  }
  
  // Add more merchant mappings as needed
  
  return null;
}

// ... keep the existing isDuplicate, roundAmount, dayDiff functions