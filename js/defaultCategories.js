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
{ id: 'exp_malvic_Pty', name: 'Meat & Afghani', type: 'expense', icon: '🥩', parentId: 'exp_groceries' },
{ id: 'exp_MalVic', name: 'Meat & Afghani', type: 'expense', icon: '🥩', parentId: 'exp_groceries' },
{ id: 'exp_Safeway', name: 'Safeway', type: 'expense', icon: '🧽', parentId: 'exp_groceries' },
{ id: 'exp_Woolworths', name: 'Woolworths', type: 'expense', icon: '🧽', parentId: 'exp_groceries' },
{ id: 'exp_Coles', name: 'Coles', type: 'expense', icon: '🧽', parentId: 'exp_groceries' },
{ id: 'exp_IGA', name: 'IGA', type: 'expense', icon: '🧽', parentId: 'exp_groceries' },
{ id: 'exp_Woolworths', name: 'Woolworths', type: 'expense', icon: '🛒', parentId: 'exp_groceries' },
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
{ id: 'exp_Parking_Fees', name: 'parking Fees', type: 'expense', icon: '🅿️', parentId: 'exp_transport' },

{ id: 'exp_health', name: 'Health & Medical', type: 'expense', icon: '🩺', parentId: null },

{ id: 'exp_gp', name: 'GP Visits', type: 'expense', icon: '👨‍⚕️', parentId: 'exp_health' },
{ id: 'exp_dental', name: 'Dental', type: 'expense', icon: '🦷', parentId: 'exp_health' },
{ id: 'exp_pharmacy', name: 'Pharmacy / Medicine', type: 'expense', icon: '💊', parentId: 'exp_health' },
{ id: 'exp_Ambulance_Cover', name: 'Anbulance cover', type: 'expense', icon: '🚑', parentId: 'exp_health' },

// Education Main
{ id: 'exp_education', name: 'Education', type: 'expense', icon: '📚', parentId: null },

// Education Subcategories
{ id: 'exp_school_fees', name: 'School Fees', type: 'expense', icon: '🏫', parentId: 'exp_education' },
{ id: 'exp_uni_fees', name: 'University / TAFE', type: 'expense', icon: '🎓', parentId: 'exp_education' },
{ id: 'exp_books', name: 'Books & Stationery', type: 'expense', icon: '📘', parentId: 'exp_education' },
{ id: 'exp_courses', name: 'Courses & Certifications', type: 'expense', icon: '📝', parentId: 'exp_education' },

// Dining Main
{ id: 'exp_dining', name: 'Restaurants & Fastfood', type: 'expense', icon: '🍽️', parentId: null },

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
{ id: 'exp_gifts', name: 'Gifts', type: 'expense', icon: '🎁 ', parentId: 'exp_personal' },
{ id: 'exp_fitness', name: 'Fitness / Gym', type: 'expense', icon: '🏋️', parentId: 'exp_personal' },
{ id: 'exp_grindsten', name: 'Hairdresser', type: 'expense', icon: '🎁', parentId: 'exp_personal '},
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
{ id: 'exp_property', name: 'Property Expenses', type: 'expense', icon: '🏠', parentId: null },

// Property-specific categories (add to housing or create new main category)
{ id: 'exp_property_maintenance', name: 'Property Maintenance', type: 'expense', icon: '🛠️', parentId: 'exp_property' },
{ id: 'exp_property_management', name: 'Property Management Fees', type: 'expense', icon: '🏢', parentId: 'exp_property' },
{ id: 'exp_land_tax', name: 'Land Tax', type: 'expense', icon: '🏛️', parentId: 'exp_property' },
{ id: 'exp_water_rates', name: 'Water Rates', type: 'expense', icon: '🚰', parentId: 'exp_property' },
{ id: 'exp_body_corporate', name: 'Body Corporate', type: 'expense', icon: '🏘️', parentId: 'exp_property' },
{ id: 'exp_council_rates', name: 'Council Rates', type: 'expense', icon: '📄', parentId: 'exp_property' },
{ id: 'exp_Inv_council_rates', name: 'Inv Council Rates', type: 'expense', icon: '📄', parentId: 'exp_property' },
{ id: 'exp_Inv_water_rates', name: 'Inv Water Rates', type: 'expense', icon: '💧', parentId: 'exp_property' },
{ id: 'exp_Land_Tax', name: 'Land Tax', type: 'expense', icon: '🏢', parentId: 'exp_property' },
{ id: 'exp_repairs', name: 'Repairs & Maintenance', type: 'expense', icon: '🛠️', parentId: 'exp_property' },

// =====================================================================
// MoneySmart Category Set (Namespace: ms_)
// These do not conflict with your categories — safe to import & use.
// =====================================================================

// -----------------------------
// Uncategorised
// -----------------------------
{ id: 'ms_uncategorised', name: 'Uncategorised', type: 'expense', icon: '❓', parentId: null },

// -----------------------------
// Business
// -----------------------------
{ id: 'ms_business', name: 'Business', type: 'expense', icon: '💼', parentId: null },
{ id: 'ms_business_clothing', name: 'Clothing', type: 'expense', icon: '👕', parentId: 'ms_business' },
{ id: 'ms_business_equipment', name: 'Equipment', type: 'expense', icon: '🧰', parentId: 'ms_business' },
{ id: 'ms_business_meals', name: 'Meals', type: 'expense', icon: '🍽️', parentId: 'ms_business' },
{ id: 'ms_business_other', name: 'Other Business Expenses', type: 'expense', icon: '📦', parentId: 'ms_business' },
{ id: 'ms_business_salary', name: 'Salary', type: 'expense', icon: '💵', parentId: 'ms_business' },
{ id: 'ms_business_services', name: 'Services', type: 'expense', icon: '🧾', parentId: 'ms_business' },
{ id: 'ms_business_super', name: 'Super Contributions', type: 'expense', icon: '🏦', parentId: 'ms_business' },
{ id: 'ms_business_supplies', name: 'Supplies', type: 'expense', icon: '📦', parentId: 'ms_business' },

// -----------------------------
// Children
// -----------------------------
{ id: 'ms_children', name: 'Children', type: 'expense', icon: '🧸', parentId: null },
{ id: 'ms_children_activities', name: 'Activities', type: 'expense', icon: '🤸', parentId: 'ms_children' },
{ id: 'ms_children_allowances', name: 'Allowances', type: 'expense', icon: '💰', parentId: 'ms_children' },
{ id: 'ms_children_baby_supplies', name: 'Baby Supplies', type: 'expense', icon: '🍼', parentId: 'ms_children' },
{ id: 'ms_children_childcare', name: 'Childcare', type: 'expense', icon: '🏫', parentId: 'ms_children' },
{ id: 'ms_children_clothing', name: 'Childrens Clothing', type: 'expense', icon: '🩳', parentId: 'ms_children' },
{ id: 'ms_children_entertainment', name: 'Entertainment', type: 'expense', icon: '🎉', parentId: 'ms_children' },
{ id: 'ms_children_other', name: 'Other Children Expenses', type: 'expense', icon: '📦', parentId: 'ms_children' },
{ id: 'ms_children_toys', name: 'Toys', type: 'expense', icon: '🧩', parentId: 'ms_children' },

// -----------------------------
// Education
// -----------------------------
{ id: 'ms_education', name: 'Education', type: 'expense', icon: '📚', parentId: null },
{ id: 'ms_education_books', name: 'Books & Supplies', type: 'expense', icon: '📘', parentId: 'ms_education' },
{ id: 'ms_education_other', name: 'Other Education Expenses', type: 'expense', icon: '📦', parentId: 'ms_education' },
{ id: 'ms_education_room_board', name: 'Room & Board', type: 'expense', icon: '🛏️', parentId: 'ms_education' },
{ id: 'ms_education_stationery', name: 'Stationery', type: 'expense', icon: '✏️', parentId: 'ms_education' },
{ id: 'ms_education_loans', name: 'Student Loans', type: 'expense', icon: '💳', parentId: 'ms_education' },
{ id: 'ms_education_tuition', name: 'Tuition & Fees', type: 'expense', icon: '🏫', parentId: 'ms_education' },

// -----------------------------
// Fees
// -----------------------------
{ id: 'ms_fees', name: 'Fees', type: 'expense', icon: '💳', parentId: null },
{ id: 'ms_fees_atm', name: 'ATM Fees', type: 'expense', icon: '🏧', parentId: 'ms_fees' },
{ id: 'ms_fees_account', name: 'Account Fees', type: 'expense', icon: '🏦', parentId: 'ms_fees' },
{ id: 'ms_fees_actuary', name: 'Actuary Fees', type: 'expense', icon: '📊', parentId: 'ms_fees' },
{ id: 'ms_fees_adviser', name: 'Adviser Fees', type: 'expense', icon: '🧑‍💼', parentId: 'ms_fees' },
{ id: 'ms_fees_annual_cardholder', name: 'Annual Cardholder Fees', type: 'expense', icon: '💳', parentId: 'ms_fees' },
{ id: 'ms_fees_currency_conversion', name: 'Currency Conversion Fees', type: 'expense', icon: '💱', parentId: 'ms_fees' },
{ id: 'ms_fees_dishonour', name: 'Dishonour Fees', type: 'expense', icon: '⚠️', parentId: 'ms_fees' },
{ id: 'ms_fees_adjustments', name: 'Fee Adjustments', type: 'expense', icon: '⚙️', parentId: 'ms_fees' },
{ id: 'ms_fees_info_request', name: 'Information Request Fees', type: 'expense', icon: '📄', parentId: 'ms_fees' },
{ id: 'ms_fees_international', name: 'International Fees', type: 'expense', icon: '🌍', parentId: 'ms_fees' },
{ id: 'ms_fees_investment', name: 'Investment Fees', type: 'expense', icon: '📈', parentId: 'ms_fees' },
{ id: 'ms_fees_late', name: 'Late Payment Fees', type: 'expense', icon: '⏰', parentId: 'ms_fees' },
{ id: 'ms_fees_otc', name: 'OTC Transaction Fees', type: 'expense', icon: '💰', parentId: 'ms_fees' },
{ id: 'ms_fees_other', name: 'Other Fees', type: 'expense', icon: '⚙️', parentId: 'ms_fees' },
{ id: 'ms_fees_overlimit', name: 'Overlimit Fees', type: 'expense', icon: '🚫', parentId: 'ms_fees' },
{ id: 'ms_fees_paper_statement', name: 'Paper Statement Fees', type: 'expense', icon: '📄', parentId: 'ms_fees' },
{ id: 'ms_fees_solicitor', name: 'Solicitors Fees', type: 'expense', icon: '⚖️', parentId: 'ms_fees' },

// -----------------------------
// Financial
// -----------------------------
{ id: 'ms_financial', name: 'Financial', type: 'expense', icon: '💰', parentId: null },
{ id: 'ms_financial_accounting', name: 'Accounting', type: 'expense', icon: '📊', parentId: 'ms_financial' },
{ id: 'ms_financial_bpay_rev', name: 'BPAY Payment Reversals', type: 'expense', icon: '↩️', parentId: 'ms_financial' },
{ id: 'ms_financial_bpay', name: 'BPAY Payments', type: 'expense', icon: '💱', parentId: 'ms_financial' },
{ id: 'ms_financial_balance_transfers', name: 'Balance Transfers', type: 'expense', icon: '🔄', parentId: 'ms_financial' },
{ id: 'ms_financial_bill_payments', name: 'Bill Payments', type: 'expense', icon: '🧾', parentId: 'ms_financial' },
{ id: 'ms_financial_card_payments', name: 'Card Payments', type: 'expense', icon: '💳', parentId: 'ms_financial' },
{ id: 'ms_financial_cash_deposits', name: 'Cash Deposits', type: 'expense', icon: '💵', parentId: 'ms_financial' },
{ id: 'ms_financial_cash_payments', name: 'Cash Payments', type: 'expense', icon: '💴', parentId: 'ms_financial' },
{ id: 'ms_financial_cash_withdrawals', name: 'Cash Withdrawals', type: 'expense', icon: '🏧', parentId: 'ms_financial' },
{ id: 'ms_financial_cashback', name: 'Cashback', type: 'expense', icon: '🎁', parentId: 'ms_financial' },
{ id: 'ms_financial_chargeback', name: 'Chargeback Adjustments', type: 'expense', icon: '🔁', parentId: 'ms_financial' },
{ id: 'ms_financial_cheque', name: 'Cheque Payments', type: 'expense', icon: '✉️', parentId: 'ms_financial' },
{ id: 'ms_financial_crypto', name: 'Digital Currency', type: 'expense', icon: '🪙', parentId: 'ms_financial' },
{ id: 'ms_financial_direct_debits', name: 'Direct Debits', type: 'expense', icon: '🏛️', parentId: 'ms_financial' },
{ id: 'ms_financial_dispute_raised', name: 'Dispute Raised', type: 'expense', icon: '⚠️', parentId: 'ms_financial' },
{ id: 'ms_financial_dispute_resolved', name: 'Dispute Resolved', type: 'expense', icon: '✔️', parentId: 'ms_financial' },
{ id: 'ms_financial_interest', name: 'Interest', type: 'expense', icon: '💲', parentId: 'ms_financial' },
{ id: 'ms_financial_transfers', name: 'Transfers', type: 'expense', icon: '🔄', parentId: 'ms_financial' },
{ id: 'ms_financial_other', name: 'Other Financials', type: 'expense', icon: '📦', parentId: 'ms_financial' },

// -----------------------------
// Food & Drink
// -----------------------------
{ id: 'ms_food', name: 'Food & Drink', type: 'expense', icon: '🍽️', parentId: null },
{ id: 'ms_food_alcohol_bars', name: 'Alcohol & Bars', type: 'expense', icon: '🍺', parentId: 'ms_food' },
{ id: 'ms_food_coffee_tea', name: 'Coffee & Tea', type: 'expense', icon: '☕', parentId: 'ms_food' },
{ id: 'ms_food_dessert', name: 'Dessert', type: 'expense', icon: '🍰', parentId: 'ms_food' },
{ id: 'ms_food_fast_food', name: 'Fast Food', type: 'expense', icon: '🍔', parentId: 'ms_food' },
{ id: 'ms_food_groceries', name: 'Groceries', type: 'expense', icon: '🛒', parentId: 'ms_food' },
{ id: 'ms_food_other', name: 'Other Food Expenses', type: 'expense', icon: '📦', parentId: 'ms_food' },
{ id: 'ms_food_restaurants', name: 'Restaurants', type: 'expense', icon: '🍽️', parentId: 'ms_food' },
{ id: 'ms_food_snacks', name: 'Snacks', type: 'expense', icon: '🍿', parentId: 'ms_food' },
{ id: 'ms_food_tobacco', name: 'Tobacco', type: 'expense', icon: '🚬', parentId: 'ms_food' },

// -----------------------------
// General
// -----------------------------
{ id: 'ms_general', name: 'General', type: 'expense', icon: '📦', parentId: null },
{ id: 'ms_general_cash', name: 'Cash', type: 'expense', icon: '💵', parentId: 'ms_general' },
{ id: 'ms_general_other_shopping', name: 'Other Shopping', type: 'expense', icon: '🛍️', parentId: 'ms_general' },
{ id: 'ms_general_unknown', name: 'Unknown', type: 'expense', icon: '❓', parentId: 'ms_general' },

// -----------------------------
// Gifts & Donations
// -----------------------------
{ id: 'ms_gifts', name: 'Gifts & Donations', type: 'expense', icon: '🎁', parentId: null },
{ id: 'ms_gifts_charities', name: 'Charities', type: 'expense', icon: '🙏', parentId: 'ms_gifts' },
{ id: 'ms_gifts_gifts', name: 'Gifts', type: 'expense', icon: '🎁', parentId: 'ms_gifts' },

// -----------------------------
// Health & Medical
// -----------------------------
{ id: 'ms_health', name: 'Health & Medical', type: 'expense', icon: '🩺', parentId: null },
{ id: 'ms_health_care_facilities', name: 'Care Facilities', type: 'expense', icon: '🏥', parentId: 'ms_health' },
{ id: 'ms_health_dentist', name: 'Dentist', type: 'expense', icon: '🦷', parentId: 'ms_health' },
{ id: 'ms_health_doctor', name: 'Doctor', type: 'expense', icon: '👨‍⚕️', parentId: 'ms_health' },
{ id: 'ms_health_equipment', name: 'Equipment', type: 'expense', icon: '🩻', parentId: 'ms_health' },
{ id: 'ms_health_eyes', name: 'Eyes', type: 'expense', icon: '👁️', parentId: 'ms_health' },
{ id: 'ms_health_hearing', name: 'Hearing', type: 'expense', icon: '👂', parentId: 'ms_health' },
{ id: 'ms_health_other', name: 'Other Health Expenses', type: 'expense', icon: '📦', parentId: 'ms_health' },
{ id: 'ms_health_pharmacies', name: 'Pharmacies', type: 'expense', icon: '💊', parentId: 'ms_health' },

// -----------------------------
// Home
// -----------------------------
{ id: 'ms_home', name: 'Home', type: 'expense', icon: '🏡', parentId: null },
{ id: 'ms_home_furnishings', name: 'Furnishings', type: 'expense', icon: '🛋️', parentId: 'ms_home' },
{ id: 'ms_home_home_loan', name: 'Home Loan', type: 'expense', icon: '🏦', parentId: 'ms_home' },
{ id: 'ms_home_maintenance', name: 'Home Maintenance', type: 'expense', icon: '🛠️', parentId: 'ms_home' },
{ id: 'ms_home_lawn_garden', name: 'Lawn & Garden', type: 'expense', icon: '🌱', parentId: 'ms_home' },
{ id: 'ms_home_moving', name: 'Moving', type: 'expense', icon: '📦', parentId: 'ms_home' },
{ id: 'ms_home_other', name: 'Other Home Expenses', type: 'expense', icon: '📦', parentId: 'ms_home' },
{ id: 'ms_home_rates', name: 'Rates', type: 'expense', icon: '📄', parentId: 'ms_home' },
{ id: 'ms_home_rent', name: 'Rent', type: 'expense', icon: '💰', parentId: 'ms_home' },
{ id: 'ms_home_repairs', name: 'Repairs & Improvements', type: 'expense', icon: '🛠️', parentId: 'ms_home' },
{ id: 'ms_home_services', name: 'Services', type: 'expense', icon: '🧰', parentId: 'ms_home' },
{ id: 'ms_home_storage', name: 'Storage', type: 'expense', icon: '📦', parentId: 'ms_home' },
{ id: 'ms_home_supplies', name: 'Supplies', type: 'expense', icon: '📦', parentId: 'ms_home' },

// -----------------------------
// Income (NOTE: These are bank transaction types, treated as expense imports)
// -----------------------------
{ id: 'ms_income', name: 'Income (Bank Imported)', type: 'income', icon: '💰', parentId: null },
{ id: 'ms_income_bonus', name: 'Bonus', type: 'income', icon: '🎉', parentId: 'ms_income' },
{ id: 'ms_income_business', name: 'Business Income', type: 'income', icon: '🏢', parentId: 'ms_income' },
{ id: 'ms_income_commissions', name: 'Commissions', type: 'income', icon: '💼', parentId: 'ms_income' },
{ id: 'ms_income_dividends', name: 'Dividends & Distributions', type: 'income', icon: '📈', parentId: 'ms_income' },
{ id: 'ms_income_interest', name: 'Interest', type: 'income', icon: '💲', parentId: 'ms_income' },
{ id: 'ms_income_other', name: 'Other Income', type: 'income', icon: '💰', parentId: 'ms_income' },
{ id: 'ms_income_reimbursements', name: 'Reimbursements', type: 'income', icon: '🔄', parentId: 'ms_income' },
{ id: 'ms_income_rental', name: 'Rental Income', type: 'income', icon: '🏘️', parentId: 'ms_income' },
{ id: 'ms_income_salary', name: 'Salary', type: 'income', icon: '🧾', parentId: 'ms_income' },
{ id: 'ms_income_spending_money', name: 'Spending Money', type: 'income', icon: '💵', parentId: 'ms_income' },

// -----------------------------
// Insurance
// -----------------------------
{ id: 'ms_insurance', name: 'Insurance', type: 'expense', icon: '🛡️', parentId: null },
{ id: 'ms_insurance_business', name: 'Business Insurance', type: 'expense', icon: '🏢', parentId: 'ms_insurance' },
{ id: 'ms_insurance_car', name: 'Car Insurance', type: 'expense', icon: '🚗', parentId: 'ms_insurance' },
{ id: 'ms_insurance_financial', name: 'Financial Insurance', type: 'expense', icon: '💼', parentId: 'ms_insurance' },
{ id: 'ms_insurance_health', name: 'Health Insurance', type: 'expense', icon: '⚕️', parentId: 'ms_insurance' },
{ id: 'ms_insurance_home', name: 'Home Insurance', type: 'expense', icon: '🏠', parentId: 'ms_insurance' },
{ id: 'ms_insurance_life', name: 'Life Insurance', type: 'expense',icon: '❤️', parentId: 'ms_insurance' },
{ id: 'ms_insurance_motorbike', name: 'Motorbike Insurance', type: 'expense', icon: '🏍️', parentId: 'ms_insurance' },
{ id: 'ms_insurance_other', name: 'Other Insurance Expenses', type: 'expense', icon: '📦', parentId: 'ms_insurance' },
{ id: 'ms_insurance_pet', name: 'Pet Insurance', type: 'expense', icon: '🐶', parentId: 'ms_insurance' },
{ id: 'ms_insurance_renters', name: 'Renter\'s Insurance', type: 'expense', icon: '🏘️', parentId: 'ms_insurance' },

// -----------------------------
// Investment
// -----------------------------
{ id: 'ms_investment', name: 'Investment', type: 'expense', icon: '📈', parentId: null },
{ id: 'ms_investment_bonds', name: 'Bond & Fixed Interest', type: 'expense', icon: '💵', parentId: 'ms_investment' },
{ id: 'ms_investment_education', name: 'Education Investments', type: 'expense', icon: '🎓', parentId: 'ms_investment' },
{ id: 'ms_investment_loan', name: 'Investment Loan', type: 'expense', icon: '💳', parentId: 'ms_investment' },
{ id: 'ms_investment_property', name: 'Investment Property', type: 'expense', icon: '🏘️', parentId: 'ms_investment' },
{ id: 'ms_investment_property_improve', name: 'Investment Property Improvement', type: 'expense', icon: '🛠️', parentId: 'ms_investment' },
{ id: 'ms_investment_property_maint', name: 'Investment Property Maintenance', type: 'expense', icon: '🔧', parentId: 'ms_investment' },
{ id: 'ms_investment_property_rates', name: 'Investment Property Rates', type: 'expense', icon: '📄', parentId: 'ms_investment' },
{ id: 'ms_investment_property_utils', name: 'Investment Property Utilities', type: 'expense', icon: '💡', parentId: 'ms_investment' },
{ id: 'ms_investment_managed', name: 'Managed Investments', type: 'expense', icon: '📊', parentId: 'ms_investment' },
{ id: 'ms_investment_other', name: 'Other Investment Expenses', type: 'expense', icon: '📦', parentId: 'ms_investment' },
{ id: 'ms_investment_retirement', name: 'Retirement', type: 'expense', icon: '🏖️', parentId: 'ms_investment' },
{ id: 'ms_investment_stocks', name: 'Stocks & Mutual Funds', type: 'expense', icon: '📈', parentId: 'ms_investment' },

// -----------------------------
// Legal
// -----------------------------
{ id: 'ms_legal', name: 'Legal', type: 'expense', icon: '⚖️', parentId: null },
{ id: 'ms_legal_fees', name: 'Legal Fees', type: 'expense', icon: '💼', parentId: 'ms_legal' },
{ id: 'ms_legal_services', name: 'Legal Services', type: 'expense', icon: '📄', parentId: 'ms_legal' },
{ id: 'ms_legal_other', name: 'Other Legal Expenses', type: 'expense', icon: '📦', parentId: 'ms_legal' },

// -----------------------------
// Leisure
// -----------------------------
{ id: 'ms_leisure', name: 'Leisure', type: 'expense', icon: '🎉', parentId: null },
{ id: 'ms_leisure_art', name: 'Art', type: 'expense', icon: '🎨', parentId: 'ms_leisure' },
{ id: 'ms_leisure_books_news', name: 'Books & News', type: 'expense', icon: '📚', parentId: 'ms_leisure' },
{ id: 'ms_leisure_dance', name: 'Dance', type: 'expense', icon: '💃', parentId: 'ms_leisure' },
{ id: 'ms_leisure_attractions', name: 'Family & Attractions', type: 'expense', icon: '🎡', parentId: 'ms_leisure' },
{ id: 'ms_leisure_fun', name: 'Fun', type: 'expense', icon: '🎉', parentId: 'ms_leisure' },
{ id: 'ms_leisure_games', name: 'Games', type: 'expense', icon: '🎮', parentId: 'ms_leisure' },
{ id: 'ms_leisure_movies', name: 'Movies', type: 'expense', icon: '🎬', parentId: 'ms_leisure' },
{ id: 'ms_leisure_music', name: 'Music', type: 'expense', icon: '🎵', parentId: 'ms_leisure' },
{ id: 'ms_leisure_other', name: 'Other Leisure Expenses', type: 'expense', icon: '📦', parentId: 'ms_leisure' },

// -----------------------------
// Other
// -----------------------------
{ id: 'ms_other', name: 'Other', type: 'expense', icon: '📦', parentId: null },
{ id: 'ms_other_building_materials', name: 'Building Materials', type: 'expense', icon: '🧱', parentId: 'ms_other' },
{ id: 'ms_other_chemicals', name: 'Chemicals', type: 'expense', icon: '⚗️', parentId: 'ms_other' },
{ id: 'ms_other_construction', name: 'Construction', type: 'expense', icon: '🚧', parentId: 'ms_other' },
{ id: 'ms_other_glass_paint', name: 'Glass & Paint', type: 'expense', icon: '🎨', parentId: 'ms_other' },
{ id: 'ms_other_goods', name: 'Goods', type: 'expense', icon: '📦', parentId: 'ms_other' },
{ id: 'ms_other_durables', name: 'Durables', type: 'expense', icon: '🏋️', parentId: 'ms_other' },
{ id: 'ms_other_nondurables', name: 'Nondurables', type: 'expense', icon: '📦', parentId: 'ms_other' },
{ id: 'ms_other_supplies', name: 'Supplies', type: 'expense', icon: '📦', parentId: 'ms_other' },

// -----------------------------
// Personal
// -----------------------------
{ id: 'ms_personal', name: 'Personal', type: 'expense', icon: '🧍', parentId: null },
{ id: 'ms_personal_accessories', name: 'Accessories', type: 'expense', icon: '👜', parentId: 'ms_personal' },
{ id: 'ms_personal_beauty', name: 'Beauty', type: 'expense', icon: '💄', parentId: 'ms_personal' },
{ id: 'ms_personal_body', name: 'Body Enhancements', type: 'expense', icon: '💅', parentId: 'ms_personal' },
{ id: 'ms_personal_cleaning', name: 'Cleaning Services', type: 'expense', icon: '🧹', parentId: 'ms_personal' },
{ id: 'ms_personal_clothing', name: 'Clothing', type: 'expense', icon: '👗', parentId: 'ms_personal' },
{ id: 'ms_personal_counselling', name: 'Counselling', type: 'expense', icon: '🛋️', parentId: 'ms_personal' },
{ id: 'ms_personal_hair', name: 'Hair', type: 'expense', icon: '💇', parentId: 'ms_personal' },
{ id: 'ms_personal_hobbies', name: 'Hobbies', type: 'expense', icon: '🎨', parentId: 'ms_personal' },
{ id: 'ms_personal_jewellery', name: 'Jewellery', type: 'expense', icon: '💍', parentId: 'ms_personal' },
{ id: 'ms_personal_laundry', name: 'Laundry', type: 'expense', icon: '🧼', parentId: 'ms_personal' },
{ id: 'ms_personal_online', name: 'Online Shopping', type: 'expense', icon: '🛒', parentId: 'ms_personal' },
{ id: 'ms_personal_other', name: 'Other Personal Expenses', type: 'expense', icon: '📦', parentId: 'ms_personal' },
{ id: 'ms_personal_politics', name: 'Politics', type: 'expense', icon: '🏛️', parentId: 'ms_personal' },
{ id: 'ms_personal_religion', name: 'Religion', type: 'expense', icon: '⛪', parentId: 'ms_personal' },
{ id: 'ms_personal_shoes', name: 'Shoes', type: 'expense', icon: '👟', parentId: 'ms_personal' },
{ id: 'ms_personal_spa', name: 'Spa & Massage', type: 'expense', icon: '💆', parentId: 'ms_personal' },

// -----------------------------
// Pets
// -----------------------------
{ id: 'ms_pets', name: 'Pets', type: 'expense', icon: '🐶', parentId: null },
{ id: 'ms_pets_clothing', name: 'Clothing', type: 'expense', icon: '🧥', parentId: 'ms_pets' },
{ id: 'ms_pets_daycare', name: 'Daycare', type: 'expense', icon: '🏠', parentId: 'ms_pets' },
{ id: 'ms_pets_other', name: 'Other Pet Expenses', type: 'expense', icon: '📦', parentId: 'ms_pets' },
{ id: 'ms_pets_food', name: 'Pet Food', type: 'expense', icon: '🥫', parentId: 'ms_pets' },
{ id: 'ms_pets_grooming', name: 'Pet Grooming', type: 'expense', icon: '✂️', parentId: 'ms_pets' },
{ id: 'ms_pets_toys', name: 'Toys', type: 'expense', icon: '🧩', parentId: 'ms_pets' },
{ id: 'ms_pets_vet', name: 'Veterinary', type: 'expense', icon: '⚕️', parentId: 'ms_pets' },

// -----------------------------
// Services
// -----------------------------
{ id: 'ms_services', name: 'Services', type: 'expense', icon: '🧾', parentId: null },
{ id: 'ms_services_agriculture', name: 'Agriculture', type: 'expense', icon: '🌾', parentId: 'ms_services' },
{ id: 'ms_services_architecture', name: 'Architecture', type: 'expense', icon: '📐', parentId: 'ms_services' },
{ id: 'ms_services_financial', name: 'Financial', type: 'expense', icon: '💼', parentId: 'ms_services' },
{ id: 'ms_services_government', name: 'Government', type: 'expense', icon: '🏛️', parentId: 'ms_services' },
{ id: 'ms_services_marketing', name: 'Marketing', type: 'expense', icon: '📣', parentId: 'ms_services' },
{ id: 'ms_services_other', name: 'Other Service Expenses', type: 'expense', icon: '📦', parentId: 'ms_services' },

// -----------------------------
// Sports & Fitness
// -----------------------------
{ id: 'ms_sports', name: 'Sports & Fitness', type: 'expense', icon: '🏋️', parentId: null },
{ id: 'ms_sports_camping', name: 'Camping', type: 'expense', icon: '🏕️', parentId: 'ms_sports' },
{ id: 'ms_sports_golf', name: 'Golf', type: 'expense', icon: '⛳', parentId: 'ms_sports' },
{ id: 'ms_sports_memberships', name: 'Memberships', type: 'expense', icon: '🎟️', parentId: 'ms_sports' },
{ id: 'ms_sports_other', name: 'Other Sporting Expenses', type: 'expense', icon: '🏅', parentId: 'ms_sports' },
{ id: 'ms_sports_events', name: 'Sporting Events', type: 'expense', icon: '🎫', parentId: 'ms_sports' },
{ id: 'ms_sports_goods', name: 'Sporting Goods', type: 'expense', icon: '🎽', parentId: 'ms_sports' },

// -----------------------------
// Superannuation
// -----------------------------
{ id: 'ms_super', name: 'Superannuation', type: 'expense', icon: '🏦', parentId: null },
{ id: 'ms_super_employer', name: 'Employer Contributions', type: 'expense', icon: '💼', parentId: 'ms_super' },
{ id: 'ms_super_government', name: 'Government Co-contributions', type: 'expense', icon: '🏛️', parentId: 'ms_super' },
{ id: 'ms_super_other', name: 'Other Superannuation Contributions', type: 'expense', icon: '📦', parentId: 'ms_super' },
{ id: 'ms_super_pension', name: 'Pension Payments', type: 'expense', icon: '🧓', parentId: 'ms_super' },
{ id: 'ms_super_personal', name: 'Personal Contributions', type: 'expense', icon: '💰', parentId: 'ms_super' },
{ id: 'ms_super_rollovers', name: 'Rollovers', type: 'expense', icon: '🔄', parentId: 'ms_super' },
{ id: 'ms_super_spouse', name: 'Spouse Contributions', type: 'expense', icon: '❤️', parentId: 'ms_super' },
{ id: 'ms_super_super', name: 'Super Contributions', type: 'expense', icon: '🏦', parentId: 'ms_super' },

// -----------------------------
// Tax
// -----------------------------
{ id: 'ms_tax', name: 'Tax', type: 'expense', icon: '🧾', parentId: null },
{ id: 'ms_tax_business', name: 'Business Taxes', type: 'expense', icon: '🏢', parentId: 'ms_tax' },
{ id: 'ms_tax_other', name: 'Other Tax Expenses', type: 'expense', icon: '📦', parentId: 'ms_tax' },
{ id: 'ms_tax_personal', name: 'Personal Taxes', type: 'expense', icon: '💵', parentId: 'ms_tax' },
{ id: 'ms_tax_property', name: 'Property Taxes', type: 'expense', icon: '🏠', parentId: 'ms_tax' },

// -----------------------------
// Technology
// -----------------------------
{ id: 'ms_tech', name: 'Technology', type: 'expense', icon: '💻', parentId: null },
{ id: 'ms_tech_domains', name: 'Domains & Hosting', type: 'expense', icon: '🌐', parentId: 'ms_tech' },
{ id: 'ms_tech_hardware', name: 'Hardware', type: 'expense', icon: '🖥️', parentId: 'ms_tech' },
{ id: 'ms_tech_online_services', name: 'Online Services', type: 'expense', icon: '🛜', parentId: 'ms_tech' },
{ id: 'ms_tech_other', name: 'Other Technology Expenses', type: 'expense', icon: '📦', parentId: 'ms_tech' },
{ id: 'ms_tech_software', name: 'Software', type: 'expense', icon: '💾', parentId: 'ms_tech' },

// -----------------------------
// Transportation
// -----------------------------
{ id: 'ms_transport', name: 'Transportation', type: 'expense', icon: '🚗', parentId: null },
{ id: 'ms_transport_auto_payments', name: 'Auto Payments', type: 'expense', icon: '🚘', parentId: 'ms_transport' },
{ id: 'ms_transport_auto_supplies', name: 'Auto Supplies', type: 'expense', icon: '🛠️', parentId: 'ms_transport' },
{ id: 'ms_transport_bicycle', name: 'Bicycle', type: 'expense', icon: '🚲', parentId: 'ms_transport' },
{ id: 'ms_transport_boats', name: 'Boats & Marine', type: 'expense', icon: '🛥️', parentId: 'ms_transport' },
{ id: 'ms_transport_car_costs', name: 'Car Costs', type: 'expense', icon: '🚗', parentId: 'ms_transport' },
{ id: 'ms_transport_fines', name: 'Fines', type: 'expense', icon: '🧾', parentId: 'ms_transport' },
{ id: 'ms_transport_fuel', name: 'Fuel', type: 'expense', icon: '⛽', parentId: 'ms_transport' },
{ id: 'ms_transport_motorbike', name: 'Motorbike Costs', type: 'expense', icon: '🏍️', parentId: 'ms_transport' },
{ id: 'ms_transport_other', name: 'Other Transportation Expenses', type: 'expense', icon: '📦', parentId: 'ms_transport' },
{ id: 'ms_transport_parking', name: 'Parking & Tolls', type: 'expense', icon: '🅿️', parentId: 'ms_transport' },
{ id: 'ms_transport_public_transit', name: 'Public Transit', type: 'expense', icon: '🚆', parentId: 'ms_transport' },
{ id: 'ms_transport_shipping', name: 'Shipping', type: 'expense', icon: '📦', parentId: 'ms_transport' },
{ id: 'ms_transport_taxis', name: 'Taxis', type: 'expense', icon: '🚕', parentId: 'ms_transport' },

// -----------------------------
// Travel
// -----------------------------
{ id: 'ms_travel', name: 'Travel', type: 'expense', icon: '✈️', parentId: null },
{ id: 'ms_travel_accommodation', name: 'Accommodation', type: 'expense', icon: '🏨', parentId: 'ms_travel' },
{ id: 'ms_travel_car_rental', name: 'Car Rentals', type: 'expense', icon: '🚘', parentId: 'ms_travel' },
{ id: 'ms_travel_fees', name: 'Fees', type: 'expense', icon: '💳', parentId: 'ms_travel' },
{ id: 'ms_travel_flights', name: 'Flights', type: 'expense', icon: '🛫', parentId: 'ms_travel' },
{ id: 'ms_travel_other', name: 'Other Travel Expenses', type: 'expense', icon: '📦', parentId: 'ms_travel' },
{ id: 'ms_travel_public_transit', name: 'Public Transit', type: 'expense', icon: '🚆', parentId: 'ms_travel' },
{ id: 'ms_travel_taxis', name: 'Taxis', type: 'expense', icon: '🚕', parentId: 'ms_travel' },
{ id: 'ms_travel_tours', name: 'Tours & Cruises', type: 'expense', icon: '🛳️', parentId: 'ms_travel' },
{ id: 'ms_travel_entertainment', name: 'Travel Entertainment', type: 'expense', icon: '🎭', parentId: 'ms_travel' },

// -----------------------------
// Utilities
// -----------------------------
{ id: 'ms_utilities', name: 'Utilities', type: 'expense', icon: '💡', parentId: null },
{ id: 'ms_utilities_computer_network', name: 'Computer Network', type: 'expense', icon: '🛜', parentId: 'ms_utilities' },
{ id: 'ms_utilities_electricity_gas_water', name: 'Electricity, Gas & Water', type: 'expense', icon: '⚡', parentId: 'ms_utilities' },
{ id: 'ms_utilities_internet', name: 'Internet', type: 'expense', icon: '🌐', parentId: 'ms_utilities' },
{ id: 'ms_utilities_other', name: 'Other Utility Expenses', type: 'expense', icon: '📦', parentId: 'ms_utilities' },
{ id: 'ms_utilities_paytv', name: 'Pay TV', type: 'expense', icon: '📺', parentId: 'ms_utilities' },
{ id: 'ms_utilities_phone', name: 'Phone', type: 'expense', icon: '📱', parentId: 'ms_utilities' },


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