// defaultCategories.js
export const DEFAULT_CATEGORIES = [
  /*// Income Categories
  { id: 'inc_Rsalary', name: 'RSalary', type: 'income', icon: '💵', parentId: null },
  { id: 'inc_Bsalary', name: 'BSalary', type: 'income', icon: '💵', parentId: null },
  { id: 'inc_freelance', name: 'Freelance', type: 'income', icon: '💻', parentId: null },
  { id: 'inc_investments', name: 'Investments', type: 'income', icon: '📈', parentId: null },
  { id: 'inc_other', name: 'Other Income', type: 'income', icon: '💰', parentId: null },

  // Expense Categories (Main)
  { id: 'exp_housing', name: 'Housing', type: 'expense', icon: '🏠', parentId: null },
  { id: 'exp_transport', name: 'Transportation', type: 'expense', icon: '🚗', parentId: null },
  { id: 'exp_food', name: 'Food & Dining', type: 'expense', icon: '🍽️', parentId: null },
  { id: 'exp_utilities', name: 'Utilities', type: 'expense', icon: '💡', parentId: null },
  { id: 'exp_health', name: 'Health & Medical', type: 'expense', icon: '⚕️', parentId: null },
  { id: 'exp_entertainment', name: 'Entertainment', type: 'expense', icon: '🎬', parentId: null },
  { id: 'exp_shopping', name: 'Shopping', type: 'expense', icon: '🛍️', parentId: null },
  { id: 'exp_other', name: 'Other Expenses', type: 'expense', icon: '💼', parentId: null },

  // Housing Subcategories
  { id: 'exp_housing_rent', name: 'Rent', type: 'expense', icon: '🏠', parentId: 'exp_housing' },
  { id: 'exp_housing_mortgage', name: 'Mortgage', type: 'expense', icon: '🏦', parentId: 'exp_housing' },

  // Transportation Subcategories
  { id: 'exp_transport_fuel', name: 'Fuel', type: 'expense', icon: '⛽', parentId: 'exp_transport' },
  { id: 'exp_transport_car1insurance', name: 'Toyota comp', type: 'expense', icon: '🚗', parentId: 'exp_transport' },
  { id: 'exp_transport_car2insurance', name: 'Mitsubishi comp', type: 'expense', icon: '🚗', parentId: 'exp_transport' },

  // Food Subcategories
  { id: 'exp_food_groceries', name: 'Groceries', type: 'expense', icon: '🛒', parentId: 'exp_food' },
  { id: 'exp_food_restaurants', name: 'Restaurants', type: 'expense', icon: '🍕', parentId: 'exp_food' },
   */

  
  { id: 'inc_main',        name: 'Income',                 type: 'income',  icon: '💰', parentId: null },

  { id: 'exp_housing',     name: 'Housing & Living',       type: 'expense', icon: '🏡', parentId: null },
  { id: 'exp_utilities',   name: 'Utilities',              type: 'expense', icon: '💡', parentId: null },
  { id: 'exp_groceries',   name: 'Groceries & Household',  type: 'expense', icon: '🛒', parentId: null },
  { id: 'exp_transport',   name: 'Transport',              type: 'expense', icon: '🚗', parentId: null },
  { id: 'exp_health',      name: 'Health & Medical',       type: 'expense', icon: '🩺', parentId: null },
  { id: 'exp_education',   name: 'Education',              type: 'expense', icon: '📚', parentId: null },
  { id: 'exp_dining',      name: 'Dining & Entertainment', type: 'expense', icon: '🍽️', parentId: null },
  { id: 'exp_travel',      name: 'Travel',                 type: 'expense', icon: '✈️', parentId: null },
  { id: 'exp_personal',    name: 'Personal & Lifestyle',   type: 'expense', icon: '🧍', parentId: null },
  { id: 'exp_subs',        name: 'Subscriptions',          type: 'expense', icon: '📺', parentId: null },
  { id: 'exp_insurance',   name: 'Insurance',              type: 'expense', icon: '🛡️', parentId: null },
  { id: 'exp_kids',        name: 'Kids & Family',          type: 'expense', icon: '🧸', parentId: null },
  { id: 'exp_pets',        name: 'Pets',                   type: 'expense', icon: '🐶', parentId: null },
  { id: 'exp_tech',        name: 'Tech & Home Office',     type: 'expense', icon: '💻', parentId: null },
  { id: 'exp_fees',        name: 'Fees & Charges',         type: 'expense', icon: '💳', parentId: null },
  { id: 'exp_misc',        name: 'Miscellaneous',          type: 'expense', icon: '🧩', parentId: null },

  { id: 'sav_main',        name: 'Savings & Investments',  type: 'savings', icon: '📈', parentId: null },
  { id: 'debt_main',       name: 'Debt Repayments',        type: 'debt',    icon: '💸', parentId: null }


];

export function shouldAddDefaultCategories(existingCategories) {
  return existingCategories.length === 0;
}

export async function addDefaultCategories(dbFunctions) {
  const { getAllItems, addItem, STORE_NAMES } = dbFunctions;
  
  const existingCategories = await getAllItems(STORE_NAMES.categories);
  const existingIds = existingCategories.map(c => c.id);
  
  let addedCount = 0;
  for (const category of DEFAULT_CATEGORIES) {
    if (!existingIds.includes(category.id)) {
      await addItem(STORE_NAMES.categories, {
        ...category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      addedCount++;
    }
  }
  
  return addedCount;
}