// merchantLogos.js
// Maps merchant keywords → logo image filename in /assets/logos/

export const MERCHANT_LOGOS = [
  // Supermarkets
  { keywords: ["woolworths", "woolies"], logo: "woolworths.png" },
  { keywords: ["coles"], logo: "coles.png" },
  { keywords: ["aldi"], logo: "aldi.png" },
  { keywords: ["safeway"], logo: "safeway.png" },
  { keywords: ["indian groceries", "indian grocer"], logo: "indiangroceries.png" },

  // Payments / Online
  { keywords: ["paypal"], logo: "paypal.png" },
  { keywords: ["amazon"], logo: "amazon.png" },
  { keywords: ["aws", "amazon web services"], logo: "aws.png" },

  // Chemists / Pharmacy
  { keywords: ["chemist warehouse"], logo: "chemistwarehouse.png" },

  // Energy / Utilities
  { keywords: ["globird"], logo: "globird.png" },

  // Fast Food
  { keywords: ["mcd", "mcdonald", "maccas"], logo: "mcdonalds.png" },
  { keywords: ["kfc"], logo: "kfc.png" },

  // Other merchants you uploaded
  { keywords: ["malvic"], logo: "malvic.png" },
  { keywords: ["casey kebab", "kebab"], logo: "caseykebab.png" },
  { keywords: ["eb games", "ebgames"], logo: "ebgames.png" },

  // Insurance
  { keywords: ["aami"], logo: "aami.png" },
];

// Return the correct logo path (or null)
export function getMerchantLogo(description = "") {
  const text = description.toLowerCase();
  for (const entry of MERCHANT_LOGOS) {
    if (entry.keywords.some(k => text.includes(k))) {
      return `/assets/logos/${entry.logo}`;
    }
  }
  return null;
}
