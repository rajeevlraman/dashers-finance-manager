// js/import/categoryRules.js

// ✅ This is the fallback ID for uncategorised
export const UNCATEGORISED_ID = 'uncategorised';

// ✅ Keyword → categoryId rules
// Extend this list over time with your real patterns.
export const CATEGORY_KEYWORD_RULES = [
  // Groceries / supermarkets
  {
    categoryId: 'exp_Coles',         // Your Coles category
    keywords: ['coles']
  },
  {
    categoryId: 'exp_Safeway',       // Woolworths / Safeway
    keywords: ['safeway', 'woolworths', 'woolies']
  },
  {
    categoryId: 'exp_Aldi',
    keywords: ['aldi']
  },
  {
    categoryId: 'exp_Indian_Groceries',
    keywords: ['india', 'indian grocer', 'spice world', 'bharat', 'kirana']
  },

  // Fuel / petrol
  {
    categoryId: 'exp_fuel',
    keywords: ['ampol', 'caltex', 'bp ', 'bp-', 'servo', 'petrol ', 'fuel ', 'shell', 'united ']
  },
  {
    categoryId: 'exp_Car2_fuel',
    keywords: ['car2 fuel', 'second car fuel'] // tweak for your statements if needed
  },

  // Fast food / dining (examples – adjust names to your bank’s descriptions)
  {
    categoryId: 'exp_kfc',
    keywords: ['kfc']
  },
  {
    categoryId: 'exp_mcd',
    keywords: ['mcdonald', 'maccas', 'mc donalds']
  },
  {
    categoryId: 'exp_hj',
    keywords: ['hungry jacks', 'hungry jack\'s', 'hj']
  },
  {
    categoryId: 'exp_dominos',
    keywords: ['domino\'s', 'dominos']
  },
  {
    categoryId: 'exp_pizzahut',
    keywords: ['pizza hut']
  },

  // Utilities
  {
    categoryId: 'exp_electricity',
    keywords: ['agl', 'origin energy', 'powershop', 'electricity', 'energy australia']
  },
  {
    categoryId: 'exp_gas',
    keywords: ['gas bill', 'natural gas']
  },
  {
    categoryId: 'exp_water_usage',
    keywords: ['yvw', 'yarra valley water', 'water corp', 'water bill']
  },
  {
    categoryId: 'exp_internet',
    keywords: ['telstra', 'optus', 'tpg', 'superloop', 'nbn', 'internet']
  },
  {
    categoryId: 'exp_mobile',
    keywords: ['amaysim', 'boost mobile', 'vodafone', 'mobile recharge']
  },

  // Generic catch-alls
  {
    categoryId: 'exp_misc_items',
    keywords: ['misc', 'various', 'general']
  }
];

// 🔍 Try to map a parsed transaction → categoryId
export function autoDetectCategory(parsedTx, categories) {
  // 0. If parser already set categoryId and it exists in DB, trust it
  if (parsedTx.categoryId) {
    const existing = categories.find(c => c.id === parsedTx.categoryId);
    if (existing) return existing.id;
  }

  // 1. Try to match by category name (e.g. MoneySmart or your own text)
  const possibleNames = [
    parsedTx.categoryName,
    parsedTx.rawCategory,
    parsedTx.bankCategory,
    parsedTx.sourceCategory
  ].filter(Boolean);

  for (const name of possibleNames) {
    const needle = name.trim().toLowerCase();
    if (!needle) continue;

    const match = categories.find(
      c => c.name && c.name.trim().toLowerCase() === needle
    );
    if (match) {
      return match.id;
    }
  }

  // 2. Keyword rules based on description / memo / merchant
  const haystack = [
    parsedTx.description || '',
    parsedTx.memo || '',
    parsedTx.merchant || ''
  ].join(' ').toLowerCase();

  if (haystack) {
    for (const rule of CATEGORY_KEYWORD_RULES) {
      const existsInDb = categories.some(c => c.id === rule.categoryId);
      if (!existsInDb) continue; // skip rule if that category doesn't exist

      const hit = rule.keywords.some(kw =>
        haystack.includes(kw.toLowerCase())
      );

      if (hit) {
        return rule.categoryId;
      }
    }
  }

  // 3. Fallback: your "uncategorised" category
  const unc = categories.find(
    c =>
      c.id === UNCATEGORISED_ID ||
      (c.name && c.name.trim().toLowerCase() === 'uncategorised')
  );

  return unc ? unc.id : null;
}

// 🧩 Optional helper: map an entire array of parsed rows
export function applyAutoCategories(parsedRows, categories) {
  return parsedRows.map(row => ({
    ...row,
    categoryId: autoDetectCategory(row, categories)
  }));
}
