// merchantCategories.js
// Maps merchant keywords → { categoryId, confidence }

// merchantCategories.js (Suggested Fixes)

export const merchantCategories = {

  // Groceries - MUST USE CLEANED (ALL LOWERCASE) KEYS
  // ALSO, ASSUMING YOU USE SUBCATEGORY IDs (e.g., exp_groceries_woolies)
  
  // 🛑 FIX: Lowercase keys & ensure they match the parser's output
  "woolworths": { categoryId: "exp_groceries_woolies", confidence: 0.95 },
 // "coles": { categoryId: "exp_groceries_coles", confidence: 0.95 },
  
  // 🛑 FIX: This key must match the full cleaned output (as confirmed above)
  "malvic grocery halal butcher": { categoryId: "ms_food", confidence: 0.95 },
  
  // 🛑 FIX: Lowercase keys & check against the full clean description
  "eve iga": { categoryId: "exp_groceries_iga", confidence: 0.9 },
  "marketplace fresh": { categoryId: "exp_groceries_market", confidence: 0.9 },
  "fish pier": { categoryId: "exp_groceries_seafood", confidence: 0.85 },
  "antony ivan francis angelo": { categoryId: "exp_groceries_unknown", confidence: 0.7 },

"grindstone barbers": {
  categoryId: "exp_personal_care",
  confidence: 0.95
},


  // Restaurants & Takeaway
  // 🛑 FIX: Lowercase keys
  "casey kebab": { categoryId: "exp_takeaway_kebab", confidence: 0.9 },
  "mcdonald": { categoryId: "exp_takeaway_mcd", confidence: 0.95 },
  "kfc": { categoryId: "exp_takeaway_kfc", confidence: 0.95 },
  "next mark": { categoryId: "exp_takeaway_mark", confidence: 0.7 },
  "domino": { categoryId: "exp_takeaway_pizza", confidence: 0.9 },
  "walker's doughnuts": { categoryId: "exp_cafe_donuts", confidence: 0.85 }, // Note: may need 'walkers doughnuts' without '

  // Utilities
  // 🛑 FIX: Lowercase keys
  "globird": { categoryId: "exp_utilities_electric", confidence: 0.95 },
  "origin energy": { categoryId: "exp_utilities_gas", confidence: 0.95 },
  "south east water": { categoryId: "exp_utilities_water", confidence: 0.95 },

  // Fuel
  // 🛑 FIX: Lowercase keys
  "united petroleum": { categoryId: "exp_fuel_united", confidence: 0.9 },
  "7-eleven": { categoryId: "exp_fuel_711", confidence: 0.85 }, // Note: may need '7 eleven' if the parser removes hyphens
  "shell reddy express": { categoryId: "exp_fuel_shell", confidence: 0.9 },

  // Medical
  // 🛑 FIX: Lowercase keys
  "chemist warehouse": { categoryId: "exp_medical_pharmacy", confidence: 0.95 },
  "myhealth": { categoryId: "exp_medical_gp", confidence: 0.9 },

  // Shopping / General
  // 🛑 FIX: Lowercase keys
  "paypal": { categoryId: "exp_online_paypal", confidence: 0.8 },
  "square": { categoryId: "exp_misc_square", confidence: 0.6 },
  "temu": { categoryId: "exp_online_temu", confidence: 0.95 },
  "amazon": { categoryId: "exp_online_amazon", confidence: 0.95 },
  "uniqlo": { categoryId: "exp_clothing_uniqlo", confidence: 0.9 },

  // Insurance
  "aami": { categoryId: "exp_insurance_car", confidence: 0.95 },

  // Gaming
  "eb games": { categoryId: "exp_entertainment_games", confidence: 0.9 },

  // Gambling
  "the lott": { categoryId: "exp_gambling_lotto", confidence: 0.9 },

  // Subscriptions
  "apple": { categoryId: "exp_subscriptions_apple", confidence: 0.95 },

  // Transfers / Investment
  "ray white": { categoryId: "inc_investment_rental", confidence: 0.95 },
  "krithik": { categoryId: "exp_transfers_person", confidence: 0.8 },
  "dias maths": { categoryId: "exp_education_maths", confidence: 0.9 },

  // Uncategorized fallback
  "default": { categoryId: "uncategorised", confidence: 0.1 }
};
