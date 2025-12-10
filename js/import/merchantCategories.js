// merchantCategories.js
// Maps merchant keywords → { categoryId, confidence }

export const merchantCategories = {

  // Groceries
  "woolworths": { categoryId: "exp_groceries", confidence: 0.95 },
  "coles": { categoryId: "exp_groceries", confidence: 0.95 },
  "malvic": { categoryId: "exp_groceries", confidence: 0.95 },
  "eve iga": { categoryId: "exp_groceries", confidence: 0.9 },
  "marketplace fresh": { categoryId: "exp_groceries", confidence: 0.9 },
  "fish pier": { categoryId: "exp_groceries", confidence: 0.85 },
  "antony ivan francis angelo": { categoryId: "exp_groceries", confidence: 0.7 },

  // Restaurants & Takeaway
  "casey kebab": { categoryId: "exp_takeaway", confidence: 0.9 },
  "mcdonald": { categoryId: "exp_takeaway", confidence: 0.95 },
  "kfc": { categoryId: "exp_takeaway", confidence: 0.95 },
  "next mark": { categoryId: "exp_takeaway", confidence: 0.7 },
  "domino": { categoryId: "exp_takeaway", confidence: 0.9 },
  "walker's doughnuts": { categoryId: "exp_cafe", confidence: 0.85 },

  // Utilities
  "globird": { categoryId: "exp_utilities", confidence: 0.95 },
  "origin energy": { categoryId: "exp_utilities", confidence: 0.95 },
  "south east water": { categoryId: "exp_utilities", confidence: 0.95 },

  // Fuel
  "united petroleum": { categoryId: "exp_fuel", confidence: 0.9 },
  "7-eleven": { categoryId: "exp_fuel", confidence: 0.85 },
  "shell reddy express": { categoryId: "exp_fuel", confidence: 0.9 },

  // Medical
  "chemist warehouse": { categoryId: "exp_medical", confidence: 0.95 },
  "myhealth": { categoryId: "exp_medical", confidence: 0.9 },

  // Shopping / General
  "paypal": { categoryId: "exp_online_shopping", confidence: 0.8 },
  "square": { categoryId: "exp_misc", confidence: 0.6 },
  "temu": { categoryId: "exp_online_shopping", confidence: 0.95 },
  "amazon": { categoryId: "exp_online_shopping", confidence: 0.95 },
  "uniqlo": { categoryId: "exp_clothing", confidence: 0.9 },

  // Insurance
  "aami": { categoryId: "exp_insurance", confidence: 0.95 },

  // Gaming
  "eb games": { categoryId: "exp_entertainment", confidence: 0.9 },

  // Gambling
  "the lott": { categoryId: "exp_gambling", confidence: 0.9 },

  // Subscriptions
  "apple": { categoryId: "exp_subscriptions", confidence: 0.95 },

  // Transfers / Investment
  "ray white": { categoryId: "inc_investment", confidence: 0.95 },
  "krithik": { categoryId: "exp_transfers", confidence: 0.8 },
  "dias maths": { categoryId: "exp_education", confidence: 0.9 },

  // Uncategorized fallback
  "default": { categoryId: "uncategorised", confidence: 0.1 }
};
