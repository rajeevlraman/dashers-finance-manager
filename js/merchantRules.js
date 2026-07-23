// merchantRules.js
// ------------------------------------------------------------
// Brand / merchant-specific rules (AFTER normalisation).
// These are precise "if merchant name contains X" → category rules.
// ------------------------------------------------------------

export const merchantRules = [
  // ========= GROCERIES =========
  {
    id: 'mal_vic_groceries',
    includesAny: ['MAL VIC PTY LTD', 'MAL VIC PTY'],
    categoryId: 'ms_food_groceries',
    confidence: 0.9
  },
  {
    id: 'marketplace_fresh',
    includesAny: ['MARKETPLACE FRESH'],
    categoryId: 'ms_food_groceries',
    confidence: 0.9
  },
  {
    id: 'coles',
    includesAny: ['COLES (CASEY CENTRAL)', 'COLES CASEY CENTRAL', 'COLES'],
    categoryId: 'ms_food_groceries',
    confidence: 0.9
  },
  {
    id: 'woolworths',
    includesAny: ['WOOLWORTHS (CASEY CENTRAL)', 'WOOLWORTHS (THE AVENUE)', 'WOOLWORTHS THE AVENUE', 'WOOLWORTHS'],
    categoryId: 'ms_food_groceries',
    confidence: 0.9
  },
  {
    id: 'iga',
    includesAny: ['IGA (CRANBOURNE NORTH)', 'IGA CRANBOURNE NORTH', 'IGA'],
    categoryId: 'ms_food_groceries',
    confidence: 0.9
  },
  {
    id: 'bakers_delight',
    includesAny: ['BAKERS DELIGHT'],
    categoryId: 'ms_food_groceries',
    confidence: 0.8
  },

  // ========= FAST FOOD / RESTAURANTS =========
  {
    id: 'kfc',
    includesAny: ['KFC', 'CRANBOURNE NORTHKFC', '1735CRANBOURNENORTHKFC'],
    categoryId: 'ms_food_fast_food',
    confidence: 0.95
  },
  {
    id: 'mcdonalds',
    includesAny: ['MCDONALD', 'MC DONALD'],
    categoryId: 'ms_food_fast_food',
    confidence: 0.95
  },
  {
    id: 'hungry_jacks',
    includesAny: ['HUNGRY JACK'],
    categoryId: 'ms_food_fast_food',
    confidence: 0.95
  },
  {
    id: 'doordash',
    includesAny: ['DOORDASH'],
    categoryId: 'ms_food_restaurants',
    confidence: 0.9
  },
  {
    id: 'ubereats',
    includesAny: ['UBER EATS'],
    categoryId: 'ms_food_restaurants',
    confidence: 0.9
  },
  {
    id: 'aangan',
    includesAny: ['AANGAN'],
    categoryId: 'ms_food_restaurants',
    confidence: 0.9
  },
  {
    id: 'cafe_flavorage',
    includesAny: ['CAFE FLAVORAGE'],
    categoryId: 'ms_food_restaurants',
    confidence: 0.8
  },
  {
    id: 'queens_kebab',
    includesAny: ['QUEENS KEBAB'],
    categoryId: 'ms_food_fast_food',
    confidence: 0.8
  },
  {
    id: 'dominos',
    includesAny: ['DOMINOS PIZZA'],
    categoryId: 'ms_food_fast_food',
    confidence: 0.9
  },

  // ========= FUEL =========
  {
    id: 'fuel_7eleven',
    includesAny: ['7-ELEVEN', '7 ELEVEN'],
    categoryId: 'ms_transport_fuel',
    confidence: 0.95
  },
  {
    id: 'fuel_apco',
    includesAny: ['APCO'],
    categoryId: 'ms_transport_fuel',
    confidence: 0.9
  },
  {
    id: 'fuel_united',
    includesAny: ['UNITED PETROLEUM'],
    categoryId: 'ms_transport_fuel',
    confidence: 0.9
  },
  {
    id: 'fuel_bp',
    includesAny: ['BP (BERWICK', 'BP CLYDE', 'BP CLAYTON'],
    categoryId: 'ms_transport_fuel',
    confidence: 0.9
  },
  {
    id: 'fuel_eg_group',
    includesAny: ['EG GROUP'],
    categoryId: 'ms_transport_fuel',
    confidence: 0.9
  },

  // ========= TOLLS / PARKING =========
  {
    id: 'linkt',
    includesAny: ['LINKT'],
    categoryId: 'ms_transport_parking',
    confidence: 0.95
  },
  {
    id: 'parking_point',
    includesAny: ['POINT PARKING', 'WILSON PARKING', 'PARKING (CASEY HOSPITAL', 'WESTFIELD', 'MONASHKINGSTON'],
    categoryId: 'ms_transport_parking',
    confidence: 0.85
  },

  // ========= UTILITIES / INTERNET / PHONE =========
  {
    id: 'optus',
    includesAny: ['OPTUS'],
    categoryId: 'ms_utilities_phone',
    confidence: 0.95
  },
  {
    id: 'origin',
    includesAny: ['ORIGIN BROADBAND'],
    categoryId: 'ms_utilities_phone',
    confidence: 0.9
  },
  {
    id: 'superloop',
    includesAny: ['SUPERLOOP'],
    categoryId: 'ms_utilities_internet',
    confidence: 0.9
  },

  // ========= TECH / DIGITAL / SUBSCRIPTIONS =========
  {
    id: 'amazon_web_services',
    includesAny: ['AMAZON WEB SERVICES'],
    categoryId: 'ms_tech_online_services',
    confidence: 0.95
  },
  {
    id: 'amazon_general',
    includesAny: ['AMAZON'],
    categoryId: 'ms_personal_online',
    confidence: 0.7
  },
  {
    id: 'microsoft_store',
    includesAny: ['MICROSOFT STORE', 'MSBILL.INFO', 'MICROSOFT'],
    categoryId: 'ms_tech_software',
    confidence: 0.8
  },
  {
    id: 'xbox_games',
    includesAny: ['MICROSOFT XBOX'],
    categoryId: 'ms_leisure_games',
    confidence: 0.9
  },
  {
    id: 'disney_plus',
    includesAny: ['DISNEY PLUS'],
    categoryId: 'ms_utilities_paytv',
    confidence: 0.95
  },
  {
    id: 'netflix_generic',
    includesAny: ['NETFLIX'],
    categoryId: 'ms_utilities_paytv',
    confidence: 0.95
  },
  {
    id: 'google_gsuite',
    includesAny: ['GOOGLE G SUITE'],
    categoryId: 'ms_tech_online_services',
    confidence: 0.9
  },
  {
    id: 'apple_hardware',
    includesAny: ['APPLE', 'APPLE ONLINE STORE'],
    categoryId: 'ms_tech_hardware',
    confidence: 0.9
  },
  {
    id: 'temu',
    includesAny: ['TEMU'],
    categoryId: 'ms_personal_online',
    confidence: 0.8
  },

  // ========= INSURANCE =========
  {
    id: 'hannover_life',
    includesAny: ['HANNOVER RE LIFE INSURANCE'],
    categoryId: 'ms_insurance_financial',
    confidence: 0.95
  },
  {
    id: 'woolworths_insurance',
    includesAny: ['WOOLWORTHS INSURANCE'],
    categoryId: 'ms_insurance_car',
    confidence: 0.9
  },

  // ========= HEALTH =========
  {
    id: 'chemist_warehouse',
    includesAny: ['CHEMIST WAREHOUSE'],
    categoryId: 'ms_health_pharmacies',
    confidence: 0.95
  },
  {
    id: 'doctors_general',
    includesAny: ['MYHEALTH', 'DERMATOLO', 'ORTHO SPORTS', 'COLLABORATIVE ORTHO', 'AVENUE FAMILY MEDI'],
    categoryId: 'ms_health_doctor',
    confidence: 0.8
  },
  {
    id: 'dentist',
    includesAny: ['DENTAL', 'DENTIST'],
    categoryId: 'ms_health_dentist',
    confidence: 0.9
  },
  {
    id: 'ambulance',
    includesAny: ['AMBULANCE VICTORIA'],
    categoryId: 'ms_health_other',
    confidence: 0.9
  },

  // ========= EDUCATION / TUITION =========
  {
    id: 'holmesglen',
    includesAny: ['HOLMESGLEN'],
    categoryId: 'ms_education_tuition',
    confidence: 0.9
  },
  {
    id: 'campion_education',
    includesAny: ['CAMPION EDUCATION'],
    categoryId: 'ms_education_books',
    confidence: 0.9
  },

  // ========= CHARITY / DONATIONS =========
  {
    id: 'gofundme',
    includesAny: ['GOFUNDME'],
    categoryId: 'ms_gifts_charities',
    confidence: 0.95
  },
  {
    id: 'shivavishnu_temple',
    includesAny: ['SHRI SHIVA VISHNU TEM'],
    categoryId: 'ms_personal_religion',
    confidence: 0.95
  }
];

/**
 * Try to find a rule that matches this cleaned merchant string.
 * @param {string} cleanedMerchant - uppercased, normalised merchant text
 * @returns {object|null}
 */
export function findMerchantRule(cleanedMerchant) {
  if (!cleanedMerchant) return null;
  const text = cleanedMerchant.toUpperCase();

  for (const rule of merchantRules) {
    const { includesAny = [] } = rule;
    if (includesAny.some(keyword => text.includes(keyword))) {
      return rule;
    }
  }

  return null;
}
