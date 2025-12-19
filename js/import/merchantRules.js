// merchantRules.js
// ------------------------------------------------------------
// Brand / merchant-specific rules
// These MUST map to LEAF (sub-category) IDs
// ------------------------------------------------------------

export const merchantRules = [
  // ========= GROCERIES =========
  {
    id: 'mal_vic_groceries',
    includesAny: ['MAL VIC PTY LTD', 'MAL VIC PTY'],
    categoryId: 'exp_groceries_specialty',
    confidence: 0.9
  },
  {
    id: 'marketplace_fresh',
    includesAny: ['MARKETPLACE FRESH'],
    categoryId: 'exp_groceries_specialty',
    confidence: 0.9
  },
  {
    id: 'woolworths',
    includesAny: ['WOOLWORTHS'],
    categoryId: 'exp_groceries_woolworths',
    confidence: 0.95
  },
  {
    id: 'coles',
    includesAny: ['COLES'],
    categoryId: 'exp_groceries_coles',
    confidence: 0.95
  },
  {
    id: 'iga',
    includesAny: ['IGA'],
    categoryId: 'exp_groceries_iga',
    confidence: 0.95
  },
  {
    id: 'bakers_delight',
    includesAny: ['BAKERS DELIGHT'],
    categoryId: 'exp_groceries_bakery',
    confidence: 0.85
  },

  // ========= FAST FOOD =========
  {
    id: 'kfc',
    includesAny: ['KFC'],
    categoryId: 'exp_food_fast_food',
    confidence: 0.95
  },
  {
    id: 'mcdonalds',
    includesAny: ['MCDONALD', 'MC DONALD'],
    categoryId: 'exp_food_fast_food',
    confidence: 0.95
  },
  {
    id: 'hungry_jacks',
    includesAny: ['HUNGRY JACK'],
    categoryId: 'exp_food_fast_food',
    confidence: 0.95
  },
  {
    id: 'dominos',
    includesAny: ['DOMINOS'],
    categoryId: 'exp_food_fast_food',
    confidence: 0.9
  },

  // ========= RESTAURANTS =========
  {
    id: 'aangan',
    includesAny: ['AANGAN'],
    categoryId: 'exp_food_restaurants',
    confidence: 0.95
  },
  {
    id: 'ubereats',
    includesAny: ['UBER EATS'],
    categoryId: 'exp_food_restaurants',
    confidence: 0.9
  },
  {
    id: 'doordash',
    includesAny: ['DOORDASH'],
    categoryId: 'exp_food_restaurants',
    confidence: 0.9
  },
  {
    id: 'cafe_flavorage',
    includesAny: ['FLAVORAGE'],
    categoryId: 'exp_food_cafes',
    confidence: 0.85
  },

  // ========= FUEL =========
  {
    id: 'fuel_7eleven',
    includesAny: ['7-ELEVEN', '7 ELEVEN'],
    categoryId: 'exp_transport_fuel',
    confidence: 0.95
  },
  {
    id: 'fuel_bp',
    includesAny: ['BP'],
    categoryId: 'exp_transport_fuel',
    confidence: 0.9
  },
  {
    id: 'fuel_united',
    includesAny: ['UNITED PETROLEUM'],
    categoryId: 'exp_transport_fuel',
    confidence: 0.9
  },
  {
    id: 'fuel_apco',
    includesAny: ['APCO'],
    categoryId: 'exp_transport_fuel',
    confidence: 0.9
  },

  // ========= PARKING / TOLLS =========
  {
    id: 'linkt',
    includesAny: ['LINKT'],
    categoryId: 'exp_transport_tolls',
    confidence: 0.95
  },
  {
    id: 'parking',
    includesAny: ['WILSON PARKING', 'POINT PARKING'],
    categoryId: 'exp_transport_parking',
    confidence: 0.85
  },

  // ========= UTILITIES =========
  {
    id: 'optus',
    includesAny: ['OPTUS'],
    categoryId: 'exp_utilities_mobile',
    confidence: 0.95
  },
  {
    id: 'superloop',
    includesAny: ['SUPERLOOP'],
    categoryId: 'exp_utilities_internet',
    confidence: 0.9
  },
  {
    id: 'origin',
    includesAny: ['ORIGIN'],
    categoryId: 'exp_utilities_energy',
    confidence: 0.9
  },

  // ========= HEALTH =========
  {
    id: 'chemist_warehouse',
    includesAny: ['CHEMIST WAREHOUSE'],
    categoryId: 'exp_health_pharmacy',
    confidence: 0.95
  },
  {
    id: 'dentist',
    includesAny: ['DENTAL', 'DENTIST'],
    categoryId: 'exp_health_dental',
    confidence: 0.9
  },

  // ========= ENTERTAINMENT =========
  {
    id: 'netflix',
    includesAny: ['NETFLIX'],
    categoryId: 'exp_entertainment_streaming',
    confidence: 0.95
  },
  {
    id: 'disney_plus',
    includesAny: ['DISNEY PLUS'],
    categoryId: 'exp_entertainment_streaming',
    confidence: 0.95
  }
];

// ---------------------------------------------------------------------------
// Rule matcher
// ---------------------------------------------------------------------------
export function findMerchantRule(merchant) {
  if (!merchant) return null;

  const text = merchant.toUpperCase();

  for (const rule of merchantRules) {
    if (rule.includesAny.some(k => text.includes(k))) {
      return rule;
    }
  }

  return null;
}
