// bankCategoryMap.js
// ------------------------------------------------------------
// Map bank / CDR "category" labels to your internal categories.
// You can expand this over time as you see new labels.
// ------------------------------------------------------------

export const bankCategoryToCategoryId = {
  // Core from your Macquarie export:
  'Groceries': 'ms_food_groceries',
  'Restaurants': 'ms_food_restaurants',
  'Fast Food': 'ms_food_fast_food',
  'Other Food Expenses': 'ms_food_other',
  'Other Personal Expenses': 'ms_personal_other',
  'Other Home Expenses': 'ms_home_other',
  'Games': 'ms_leisure_games',
  'Pay TV': 'ms_utilities_paytv',
  'Fun': 'ms_leisure_fun',
  'Charities': 'ms_gifts_charities',
  'Religion': 'ms_personal_religion',
  'Doctor': 'ms_health_doctor',
  'Dentist': 'ms_health_dentist',
  'Pharmacies': 'ms_health_pharmacies',
  'Eyes': 'ms_health_eyes',
  'Other Health Expenses': 'ms_health_other',

  'Financial Insurance': 'ms_insurance_financial',
  'Insurance': 'ms_insurance_other',

  'Phone': 'ms_utilities_phone',
  'Internet': 'ms_utilities_internet',
  'Services': 'ms_services_other',
  'Hardware': 'ms_tech_hardware',
  'Software': 'ms_tech_software',
  'Technology': 'ms_tech_other',

  'Parking & Tolls': 'ms_transport_parking',
  'Public Transit': 'ms_transport_public_transit',
  'Fuel': 'ms_transport_fuel',
  'Flights': 'ms_travel_flights',
  'Travel Entertainment': 'ms_travel_entertainment',
  'Movies': 'ms_leisure_movies',
  'Tuition & Fees': 'ms_education_tuition',
  'Education': 'ms_education',

  'Clothing': 'ms_personal_clothing',
  'Shoes': 'ms_personal_shoes',
  'Beauty': 'ms_personal_beauty',
  'Furnishings': 'ms_home_furnishings',

  'BPAY Payments': 'ms_financial_bpay',
  'BPAY Payment Reversals': 'ms_financial_bpay_rev',
  'Bill Payments': 'ms_financial_bill_payments',
  'Transfers': 'ms_financial_transfers',
  'Interest': 'ms_financial_interest',
  'Late Payment Fees': 'ms_fees_late',
  'Annual Cardholder Fees': 'ms_fees_annual_cardholder',
  'ATM Fees': 'ms_fees_atm',
  'Other Fees': 'ms_fees_other',

  'Government': 'ms_services_government',
  'Rates': 'ms_home_rates',
  'Home Loan': 'ms_home_home_loan',

  // Generic fallbacks:
  'Other': 'ms_general_other_shopping',
  'Uncategorised': 'ms_uncategorised'
};
