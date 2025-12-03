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
{ id: 'inc_Spouse_salary', name: 'Spouse_Salary / Wages', type: 'income', icon: '🧾', parentId: 'inc_main' },
{ id: 'inc_business', name: 'Business Income', type: 'income', icon: '🏢', parentId: 'inc_main' },
{ id: 'inc_invest', name: 'Investment Income', type: 'income', icon: '📈', parentId: 'inc_main' },
{ id: 'inc_rent', name: 'Rental Income', type: 'income', icon: '🏘️', parentId: 'inc_main' },
{ id: 'inc_gov', name: 'Government Payments', type: 'income', icon: '🏛️', parentId: 'inc_main' },
{ id: 'inc_tax_refund', name: 'Tax Refund', type: 'income', icon: '💵', parentId: 'inc_main' },

// Housing Main
{ id: 'exp_housing', name: 'Housing & Living', type: 'expense', icon: '🏡', parentId: null },

// Housing Subcategories
{ id: 'exp_Home_mortgage', name: 'Home_Mortgage', type: 'expense', icon: '💸', parentId: 'exp_housing' },
{ id: 'exp_Inv_mortgage', name: 'Inv_Mortgage', type: 'expense', icon: '💸', parentId: 'exp_housing' },
{ id: 'exp_Home_Equity_mortgage', name: 'Home_Equity_Mortgage', type: 'expense', icon: '💸', parentId: 'exp_housing' },
{ id: 'exp_rent_payment', name: 'Rent Payment', type: 'expense', icon: '💰', parentId: 'exp_housing' },

  
// Utilities Main
{ id: 'exp_utilities', name: 'Utilities', type: 'expense', icon: '💡', parentId: null },

// Utilities Subcategories
{ id: 'exp_electricity', name: 'Electricity', type: 'expense', icon: '⚡', parentId: 'exp_utilities' },
{ id: 'exp_gas', name: 'Gas', type: 'expense', icon: '🔥', parentId: 'exp_utilities' },
{ id: 'exp_water_usage', name: 'Water Usage', type: 'expense', icon: '🚿', parentId: 'exp_utilities' },
{ id: 'exp_internet', name: 'Internet / NBN', type: 'expense', icon: '🌐', parentId: 'exp_utilities' },
{ id: 'exp_mobile', name: 'Mobile Phone', type: 'expense', icon: '📱', parentId: 'exp_utilities' },

// Groceries Main
{ id: 'exp_groceries', name: 'Groceries & Household', type: 'expense', icon: '🛒', parentId: null },

// Groceries Subcategories
{ id: 'exp_grocery_supermarket', name: 'Supermarket', type: 'expense', icon: '🛍️', parentId: 'exp_groceries' },
{ id: 'exp_grocery_fresh', name: 'Fruits & Vegetables', type: 'expense', icon: '🥬', parentId: 'exp_groceries' },
{ id: 'exp_grocery_meat', name: 'Meat & Seafood', type: 'expense', icon: '🥩', parentId: 'exp_groceries' },
{ id: 'exp_Safeway', name: 'Safeway', type: 'expense', icon: '🧽', parentId: 'exp_groceries' },
{ id: 'exp_Coles', name: 'Coles', type: 'expense', icon: '🧽', parentId: 'exp_groceries' },
{ id: 'exp_Aldi', name: 'Aldi', type: 'expense', icon: '🧽', parentId: 'exp_groceries' },
{ id: 'exp_Indian_Groceries', name: 'Indian Groceroies', type: 'expense', icon: '🧽', parentId: 'exp_groceries' },

// Transport Main
{ id: 'exp_transport', name: 'Transport', type: 'expense', icon: '🚗', parentId: null },

// Transport Subcategories
{ id: 'exp_fuel', name: 'Fuel / Petrol', type: 'expense', icon: '⛽', parentId: 'exp_transport' },
{ id: 'exp_Car2_fuel', name: '2nd Car Fuel / Petrol', type: 'expense', icon: '⛽', parentId: 'exp_transport' },
{ id: 'exp_ev_charge', name: 'EV Charging', type: 'expense', icon: '🔌', parentId: 'exp_transport' },
{ id: 'exp_car_service', name: 'Car Service', type: 'expense', icon: '🛠️', parentId: 'exp_transport' },
{ id: 'exp_car2_service', name: '2nd Car Service', type: 'expense', icon: '🛠️', parentId: 'exp_transport' },
{ id: 'exp_rego', name: 'Registration', type: 'expense', icon: '📄', parentId: 'exp_transport' },
{ id: 'exp_car2_rego', name: '2nd car Registration', type: 'expense', icon: '📄', parentId: 'exp_transport' },
{ id: 'exp_public_transport', name: 'Public Transport', type: 'expense', icon: '🚆', parentId: 'exp_transport' },
{ id: 'exp_citylink_toll', name: 'citylink_toll', type: 'expense', icon: '⛽', parentId: 'exp_transport' },
{ id: 'exp_Parking_Fees', name: 'parking Fees', type: 'expense', icon: '🚆', parentId: 'exp_transport' },

{ id: 'exp_health', name: 'Health & Medical', type: 'expense', icon: '🩺', parentId: null },

{ id: 'exp_gp', name: 'GP Visits', type: 'expense', icon: '👨‍⚕️', parentId: 'exp_health' },
{ id: 'exp_dental', name: 'Dental', type: 'expense', icon: '🦷', parentId: 'exp_health' },
{ id: 'exp_pharmacy', name: 'Pharmacy / Medicine', type: 'expense', icon: '💊', parentId: 'exp_health' },
{ id: 'exp_Ambulance_Cover', name: 'Anbulance cover', type: 'expense', icon: '🛡️', parentId: 'exp_health' },

// Education Main
{ id: 'exp_education', name: 'Education', type: 'expense', icon: '📚', parentId: null },

// Education Subcategories
{ id: 'exp_school_fees', name: 'School Fees', type: 'expense', icon: '🏫', parentId: 'exp_education' },
{ id: 'exp_uni_fees', name: 'University / TAFE', type: 'expense', icon: '🎓', parentId: 'exp_education' },
{ id: 'exp_books', name: 'Books & Stationery', type: 'expense', icon: '📘', parentId: 'exp_education' },
{ id: 'exp_courses', name: 'Courses & Certifications', type: 'expense', icon: '📝', parentId: 'exp_education' },

// Dining Main
{ id: 'exp_dining', name: 'Dining', type: 'expense', icon: '🍽️', parentId: null },

// Dining Subcategories
{ id: 'exp_restaurants', name: 'Indian Restaurants', type: 'expense', icon: '🍚', parentId: 'exp_dining' },
// Fast Food under Dining
{ id: 'exp_kfc',   name: 'KFC',          type: 'expense', icon: '🍗', parentId: 'exp_dining' },
{ id: 'exp_mcd',   name: 'McDonald\'s',  type: 'expense', icon: '🍔', parentId: 'exp_dining' },
{ id: 'exp_hj',    name: 'Hungry Jack\'s', type: 'expense', icon: '🍔', parentId: 'exp_dining' },
{ id: 'exp_nandos',name: 'Nando\'s',    type: 'expense', icon: '🍗', parentId: 'exp_dining' },
{ id: 'exp_dominos', name: 'Domino\'s', type: 'expense', icon: '🍕', parentId: 'exp_dining' },
{ id: 'exp_pizzahut', name: 'Pizza Hut', type: 'expense', icon: '🍕', parentId: 'exp_dining' },


// Travel Main
{ id: 'exp_travel', name: 'Travel', type: 'expense', icon: '✈️', parentId: null },

// Travel Subcategories
{ id: 'exp_flights', name: 'Flights', type: 'expense', icon: '🛫', parentId: 'exp_travel' },
{ id: 'exp_hotel', name: 'Accommodation', type: 'expense', icon: '🏨', parentId: 'exp_travel' },
{ id: 'exp_car_rental', name: 'Car Rental', type: 'expense', icon: '🚘', parentId: 'exp_travel' },
{ id: 'exp_travel_food', name: 'Travel Food', type: 'expense', icon: '🍱', parentId: 'exp_travel' },
{ id: 'exp_tours', name: 'Tours & Activities', type: 'expense', icon: '🗺️', parentId: 'exp_travel' },

// Personal Main
{ id: 'exp_personal', name: 'Personal & Lifestyle', type: 'expense', icon: '🧍', parentId: null },

// Personal Subcategories
{ id: 'exp_clothing', name: 'Clothing', type: 'expense', icon: '👕', parentId: 'exp_personal' },
{ id: 'exp_grooming', name: 'Grooming / Salon', type: 'expense', icon: '💇', parentId: 'exp_personal' },
{ id: 'exp_gifts', name: 'Gifts', type: 'expense', icon: '🎁', parentId: 'exp_personal' },
{ id: 'exp_fitness', name: 'Fitness / Gym', type: 'expense', icon: '🏋️', parentId: 'exp_personal' },

// Subscriptions Main
{ id: 'exp_subs', name: 'Subscriptions', type: 'expense', icon: '📺', parentId: null },

// Subscriptions Subcategories
{ id: 'exp_netflix', name: 'Streaming (Netflix, etc.)', type: 'expense', icon: '🎥', parentId: 'exp_subs' },
{ id: 'exp_disney', name: 'Streaming (disney, etc.)', type: 'expense', icon: '🎥', parentId: 'exp_subs' },
{ id: 'exp_prime', name: 'Streaming (prime, etc.)', type: 'expense', icon: '🎥', parentId: 'exp_subs' },
{ id: 'exp_music', name: 'Music (Spotify, etc.)', type: 'expense', icon: '🎵', parentId: 'exp_subs' },
{ id: 'exp_cloud', name: 'Cloud Storage', type: 'expense', icon: '☁️', parentId: 'exp_subs' },
{ id: 'exp_software', name: 'Apps & Software', type: 'expense', icon: '📱', parentId: 'exp_subs' },

// Insurance Main
{ id: 'exp_insurance', name: 'Insurance', type: 'expense', icon: '🛡️', parentId: null },

// Insurance Subcategories
{ id: 'exp_home_ins', name: 'Home Insurance', type: 'expense', icon: '🏠', parentId: 'exp_insurance' },
{ id: 'exp_home_contents_ins', name: 'Home & Contents Insurance', type: 'expense', icon: '🏠', parentId: 'exp_insurance' },
{ id: 'exp_Landlord_ins', name: 'Landlord Insurance', type: 'expense', icon: '🏠', parentId: 'exp_insurance' },
{ id: 'exp_car_ins', name: 'Car Insurance', type: 'expense', icon: '🚗💼', parentId: 'exp_insurance' },
{ id: 'exp_car2_ins', name: '2nd Car Insurance', type: 'expense', icon: '🚗💼', parentId: 'exp_insurance' },
{ id: 'exp_health_ins', name: 'Health Insurance', type: 'expense', icon: '⚕️', parentId: 'exp_insurance' },
{ id: 'exp_life_ins', name: 'Life Insurance', type: 'expense', icon: '❤️', parentId: 'exp_insurance' },

// Kids Main
{ id: 'exp_kids', name: 'Kids & Family', type: 'expense', icon: '🧸', parentId: null },

// Kids Subcategories
{ id: 'exp_childcare', name: 'Childcare', type: 'expense', icon: '🍼', parentId: 'exp_kids' },
{ id: 'exp_school_items', name: 'School Items', type: 'expense', icon: '🎒', parentId: 'exp_kids' },
{ id: 'exp_kids_activities', name: 'Kids Activities', type: 'expense', icon: '🤸', parentId: 'exp_kids' },

// Pets Main
{ id: 'exp_pets', name: 'Pets', type: 'expense', icon: '🐶', parentId: null },

// Pets Subcategories
{ id: 'exp_pet_food', name: 'Pet Food', type: 'expense', icon: '🥫', parentId: 'exp_pets' },
{ id: 'exp_vet', name: 'Vet Bills', type: 'expense', icon: '⚕️', parentId: 'exp_pets' },
{ id: 'exp_pet_supplies', name: 'Pet Supplies', type: 'expense', icon: '🦴', parentId: 'exp_pets' },

// Tech Main
{ id: 'exp_tech', name: 'Tech & Home Office', type: 'expense', icon: '💻', parentId: null },

// Tech Subcategories
{ id: 'exp_devices', name: 'Devices (Laptop/Phone)', type: 'expense', icon: '📱', parentId: 'exp_tech' },
{ id: 'exp_pc_parts', name: 'PC Parts / Accessories', type: 'expense', icon: '🖱️', parentId: 'exp_tech' },
{ id: 'exp_home_office', name: 'Home Office Gear', type: 'expense', icon: '🪑', parentId: 'exp_tech' },

// Fees Main
{ id: 'exp_fees', name: 'Fees & Charges', type: 'expense', icon: '💳', parentId: null },

// Fees Subcategories
{ id: 'exp_bank_fees', name: 'Bank Fees', type: 'expense', icon: '🏦', parentId: 'exp_fees' },
{ id: 'exp_late_fees', name: 'Late Fees', type: 'expense', icon: '⏰', parentId: 'exp_fees' },
{ id: 'exp_service_fees', name: 'Service Charges', type: 'expense', icon: '🧾', parentId: 'exp_fees' },

// Misc Main
{ id: 'exp_misc', name: 'Miscellaneous', type: 'expense', icon: '🧩', parentId: null },

// Misc Subcategories
{ id: 'exp_misc_items', name: 'Misc Items', type: 'expense', icon: '📦', parentId: 'exp_misc' },
{ id: 'exp_emergency', name: 'Emergency Spend', type: 'expense', icon: '🚨', parentId: 'exp_misc' },

// Savings Main
{ id: 'sav_main', name: 'Savings & Investments', type: 'savings', icon: '📈', parentId: null },

// Savings Subcategories
{ id: 'sav_emergency', name: 'Emergency Fund', type: 'savings', icon: '🚑', parentId: 'sav_main' },
{ id: 'sav_high_interest', name: 'High Interest Savings', type: 'savings', icon: '🏦', parentId: 'sav_main' },
{ id: 'sav_invest', name: 'Investments (Shares/ETF)', type: 'savings', icon: '📊', parentId: 'sav_main' },

// Debt Main
{ id: 'debt_main', name: 'Debt Repayments', type: 'debt', icon: '💸', parentId: null },

// Debt Subcategories
{ id: 'debt_home_loan', name: 'Home Loan', type: 'debt', icon: '🏠', parentId: 'debt_main' },
{ id: 'debt_car_loan', name: 'Car Loan', type: 'debt', icon: '🚗', parentId: 'debt_main' },
{ id: 'debt_personal', name: 'Personal Loan', type: 'debt', icon: '💵', parentId: 'debt_main' },
{ id: 'debt_credit_card', name: 'Credit Card', type: 'debt', icon: '💳', parentId: 'debt_main' },

// Add to defaultCategories.js in the appropriate sections

// Create a new main category for Property Expenses if desired
{ id: 'exp_property', name: 'Property Expenses', type: 'expense', icon: '🏠', parentId: null }

// Property-specific categories (add to housing or create new main category)
{ id: 'exp_property_maintenance', name: 'Property Maintenance', type: 'expense', icon: '🛠️', parentId: 'exp_property' },
{ id: 'exp_property_management', name: 'Property Management Fees', type: 'expense', icon: '🏢', parentId: 'exp_property' },
{ id: 'exp_land_tax', name: 'Land Tax', type: 'expense', icon: '🏛️', parentId: 'exp_property' },
{ id: 'exp_water_rates', name: 'Water Rates', type: 'expense', icon: '🚰', parentId: 'exp_property' },
{ id: 'exp_body_corporate', name: 'Body Corporate', type: 'expense', icon: '🏘️', parentId: 'exp_property' },
{ id: 'exp_council_rates', name: 'Council Rates', type: 'expense', icon: '📄', parentId: 'exp_property' },
{ id: 'exp_Inv_council_rates', name: 'Inv Council Rates', type: 'expense', icon: '📄', parentId: 'exp_property' },
{ id: 'exp_Inv_water_rates', name: 'Inv Water Rates', type: 'expense', icon: '🚰', parentId: 'exp_property' },
{ id: 'exp_Land_Tax', name: 'Land Tax', type: 'expense', icon: '🏢', parentId: 'exp_property' },
{ id: 'exp_repairs', name: 'Repairs & Maintenance', type: 'expense', icon: '🛠️', parentId: 'exp_property' }


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