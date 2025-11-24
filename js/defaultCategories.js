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
// Income Main
{ id: 'inc_main', name: 'Income', type: 'income', icon: '💰', parentId: null },

// Income Subcategories
{ id: 'inc_salary', name: 'Salary / Wages', type: 'income', icon: '🧾', parentId: 'inc_main' },
{ id: 'inc_business', name: 'Business Income', type: 'income', icon: '🏢', parentId: 'inc_main' },
{ id: 'inc_invest', name: 'Investment Income', type: 'income', icon: '📈', parentId: 'inc_main' },
{ id: 'inc_rent', name: 'Rental Income', type: 'income', icon: '🏘️', parentId: 'inc_main' },
{ id: 'inc_gov', name: 'Government Payments', type: 'income', icon: '🏛️', parentId: 'inc_main' },
{ id: 'inc_tax_refund', name: 'Tax Refund', type: 'income', icon: '💵', parentId: 'inc_main' }

// Housing Main
{ id: 'exp_housing', name: 'Housing & Living', type: 'expense', icon: '🏡', parentId: null },

// Housing Subcategories
{ id: 'exp_mortgage', name: 'Mortgage', type: 'expense', icon: '💸', parentId: 'exp_housing' },
{ id: 'exp_rent_payment', name: 'Rent Payment', type: 'expense', icon: '💰', parentId: 'exp_housing' },
{ id: 'exp_council_rates', name: 'Council Rates', type: 'expense', icon: '📄', parentId: 'exp_housing' },
{ id: 'exp_water_rates', name: 'Water Rates', type: 'expense', icon: '🚰', parentId: 'exp_housing' },
{ id: 'exp_body_corp', name: 'Body Corporate', type: 'expense', icon: '🏢', parentId: 'exp_housing' },
{ id: 'exp_repairs', name: 'Repairs & Maintenance', type: 'expense', icon: '🛠️', parentId: 'exp_housing' }
  
// Utilities Main
{ id: 'exp_utilities', name: 'Utilities', type: 'expense', icon: '💡', parentId: null },

// Utilities Subcategories
{ id: 'exp_electricity', name: 'Electricity', type: 'expense', icon: '⚡', parentId: 'exp_utilities' },
{ id: 'exp_gas', name: 'Gas', type: 'expense', icon: '🔥', parentId: 'exp_utilities' },
{ id: 'exp_water_usage', name: 'Water Usage', type: 'expense', icon: '🚿', parentId: 'exp_utilities' },
{ id: 'exp_internet', name: 'Internet / NBN', type: 'expense', icon: '🌐', parentId: 'exp_utilities' },
{ id: 'exp_mobile', name: 'Mobile Phone', type: 'expense', icon: '📱', parentId: 'exp_utilities' }

// Groceries Main
{ id: 'exp_groceries', name: 'Groceries & Household', type: 'expense', icon: '🛒', parentId: null },

// Groceries Subcategories
{ id: 'exp_grocery_supermarket', name: 'Supermarket', type: 'expense', icon: '🛍️', parentId: 'exp_groceries' },
{ id: 'exp_grocery_fresh', name: 'Fruits & Vegetables', type: 'expense', icon: '🥬', parentId: 'exp_groceries' },
{ id: 'exp_grocery_meat', name: 'Meat & Seafood', type: 'expense', icon: '🥩', parentId: 'exp_groceries' },
{ id: 'exp_household_supplies', name: 'Household Supplies', type: 'expense', icon: '🧽', parentId: 'exp_groceries' }

// Transport Main
{ id: 'exp_transport', name: 'Transport', type: 'expense', icon: '🚗', parentId: null },

// Transport Subcategories
{ id: 'exp_fuel', name: 'Fuel / Petrol', type: 'expense', icon: '⛽', parentId: 'exp_transport' },
{ id: 'exp_ev_charge', name: 'EV Charging', type: 'expense', icon: '🔌', parentId: 'exp_transport' },
{ id: 'exp_car_service', name: 'Car Service', type: 'expense', icon: '🛠️', parentId: 'exp_transport' },
{ id: 'exp_car_insurance', name: 'Car Insurance', type: 'expense', icon: '🚗💼', parentId: 'exp_transport' },
{ id: 'exp_rego', name: 'Registration', type: 'expense', icon: '📄', parentId: 'exp_transport' },
{ id: 'exp_public_transport', name: 'Public Transport', type: 'expense', icon: '🚆', parentId: 'exp_transport' }

{ id: 'exp_health', name: 'Health & Medical', type: 'expense', icon: '🩺', parentId: null },

{ id: 'exp_gp', name: 'GP Visits', type: 'expense', icon: '👨‍⚕️', parentId: 'exp_health' },
{ id: 'exp_dental', name: 'Dental', type: 'expense', icon: '🦷', parentId: 'exp_health' },
{ id: 'exp_pharmacy', name: 'Pharmacy / Medicine', type: 'expense', icon: '💊', parentId: 'exp_health' },
{ id: 'exp_health_insurance', name: 'Health Insurance', type: 'expense', icon: '🛡️', parentId: 'exp_health' }



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