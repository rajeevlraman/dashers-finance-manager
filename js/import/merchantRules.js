// merchantRules.js
// ------------------------------------------------------------
// Brand / merchant-specific rules
// These MUST map to DEFAULT_CATEGORIES ids (exp_*)
// ------------------------------------------------------------

export const merchantRules = [

  // ========= GROCERIES =========
  {
    id: 'mal_vic_groceries',
    includesAny: ['MAL VIC PTY LTD', 'Malvic'],
    categoryId: 'exp_MalVic',
    confidence: 0.9
  },
  {
    id: 'marketplace_fresh',
    includesAny: ['MARKETPLACE FRESH'],
    categoryId: 'exp_grocery_fresh',
    confidence: 0.9
  },
  {
    id: 'woolworths',
    includesAny: ['WOOLWORTHS'],
    categoryId: 'exp_Woolworths',
    confidence: 0.9
  },
  {
    id: 'coles',
    includesAny: ['COLES'],
    categoryId: 'exp_Coles',
    confidence: 0.9
  },
  {
    id: 'iga',
    includesAny: ['IGA'],
    categoryId: 'exp_IGA',
    confidence: 0.9
  },
  {
    id: 'bakers_delight',
    includesAny: ['BAKERS DELIGHT'],
    categoryId: 'exp_grocery_supermarket',
    confidence: 0.8
  },

  // ========= FAST FOOD / RESTAURANTS =========
  {
    id: 'kfc',
    includesAny: ['KFC'],
    categoryId: 'exp_kfc',
    confidence: 0.95
  },
  {
    id: 'mcdonalds',
    includesAny: ['MCDONALD'],
    categoryId: 'exp_mcd',
    confidence: 0.95
  },
  {
    id: 'hungry_jacks',
    includesAny: ['HUNGRY JACK'],
    categoryId: 'exp_hj',
    confidence: 0.95
  },
  {
    id: 'dominos',
    includesAny: ['DOMINOS'],
    categoryId: 'exp_dominos',
    confidence: 0.9
  },
  {
    id: 'aangan',
    includesAny: ['AANGAN'],
    categoryId: 'exp_restaurants',
    confidence: 0.9
  },

  // ========= FUEL =========
  {
    id: 'fuel_7eleven',
    includesAny: ['7-ELEVEN', '7 ELEVEN'],
    categoryId: 'exp_fuel',
    confidence: 0.95
  },
  {
    id: 'fuel_apco',
    includesAny: ['APCO'],
    categoryId: 'exp_fuel',
    confidence: 0.9
  },
  {
    id: 'fuel_bp',
    includesAny: ['BP'],
    categoryId: 'exp_fuel',
    confidence: 0.9
  },

  // ========= PARKING / TOLLS =========
  {
    id: 'linkt',
    includesAny: ['LINKT'],
    categoryId: 'exp_citylink_toll',
    confidence: 0.95
  },
  {
    id: 'parking',
    includesAny: ['PARKING', 'WILSON'],
    categoryId: 'exp_Parking_Fees',
    confidence: 0.85
  },

  // ========= HEALTH =========
  {
    id: 'chemist_warehouse',
    includesAny: ['CHEMIST WAREHOUSE'],
    categoryId: 'exp_pharmacy',
    confidence: 0.95
  },
  {
    id: 'dentist',
    includesAny: ['DENTAL'],
    categoryId: 'exp_dental',
    confidence: 0.9
  },

  // ========= PERSONAL =========
  {
    id: 'grindstone',
    includesAny: ['GRINDSTONE'],
    categoryId: 'exp_grindstone',
    confidence: 0.9
  }

];

// ------------------------------------------------------------
// Matcher
// ------------------------------------------------------------
// In merchantRules.js, improve the matcher:
export function findMerchantRule(cleanedMerchant) {
  if (!cleanedMerchant) return null;

  const text = cleanedMerchant.toUpperCase();
  
  // Try exact matches first
  for (const rule of merchantRules) {
    if (rule.includesAny.some(k => text.includes(k))) {
      return rule;
    }
  }
  
  // Try partial matches for common words
  const commonWords = ['WOOLWORTH', 'COLES', 'KFC', 'MCDONALD', 'IGA'];
  for (const word of commonWords) {
    if (text.includes(word)) {
      const matchingRule = merchantRules.find(rule => 
        rule.includesAny.some(k => k.includes(word))
      );
      if (matchingRule) return matchingRule;
    }
  }

  return null;
}
