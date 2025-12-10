// merchantCategories.js
// Maps merchant keywords to YOUR category IDs.

// IMPORTANT: Replace these with the actual IDs from your DB if necessary.
export const CATEGORY_MAP = [
  // 👇 Groceries
  { keywords: ["woolworths", "woolies"], categoryId: "exp_groceries" },
  { keywords: ["mal vic", "malvic"], categoryId: "exp_groceries" },

  // 👇 Fast Food / Restaurants
  { keywords: ["mcdonald", "maccas"], categoryId: "exp_fastfood" },
  { keywords: ["kfc"], categoryId: "exp_fastfood" },
  { keywords: ["kebab"], categoryId: "exp_restaurants" },

  // 👇 Utilities
  { keywords: ["globird", "glo bird"], categoryId: "exp_utilities" },

  // 👇 Insurance
  { keywords: ["aami"], categoryId: "exp_insurance" },

  // 👇 Pharmacy / Health
  { keywords: ["chemist warehouse", "chemistwarehouse"], categoryId: "exp_medical" },

  // 👇 Online / Shopping
  { keywords: ["paypal"], categoryId: "exp_online_shopping" },
  { keywords: ["amazon"], categoryId: "exp_online_shopping" },

  // 👇 Entertainment / Gaming
  { keywords: ["eb games", "ebgames"], categoryId: "exp_entertainment" },

  // 👇 Cloud / SaaS
  { keywords: ["aws", "amazon web services"], categoryId: "exp_cloud_services" }
];

// Returns matching categoryId or null
export function getMerchantCategory(description = "") {
  const text = description.toLowerCase();

  for (const entry of CATEGORY_MAP) {
    if (entry.keywords.some(k => text.includes(k))) {
      return entry.categoryId;
    }
  }
  return null; // fallback → manual selection or fallback rule
}
