// categoryBridge.js
// ============================================================================
// MoneySmart → Personal Category Bridge
// ---------------------------------------------------------------------------
// Converts classification-only ms_* categories into real exp_* categories
// ============================================================================

export const MS_TO_EXP_CATEGORY_MAP = {
  // -----------------------------
  // Food
  // -----------------------------
  ms_food_groceries: 'exp_groceries',
  ms_food_restaurants: 'exp_restaurants',
  ms_food_fast_food: 'exp_restaurants',
  ms_food_coffee_tea: 'exp_restaurants',
  ms_food_snacks: 'exp_groceries',

  // -----------------------------
  // Transport
  // -----------------------------
  ms_transport_fuel: 'exp_fuel',
  ms_transport_parking: 'exp_Parking_Fees',
  ms_transport_public_transit: 'exp_public_transport',
  ms_transport_taxis: 'exp_public_transport',

  // -----------------------------
  // Utilities
  // -----------------------------
  ms_utilities_phone: 'exp_mobile',
  ms_utilities_internet: 'exp_internet',
  ms_utilities_paytv: 'exp_netflix',
  ms_utilities_electricity_gas_water: 'exp_electricity',

  // -----------------------------
  // Health
  // -----------------------------
  ms_health_pharmacies: 'exp_pharmacy',
  ms_health_doctor: 'exp_gp',
  ms_health_dentist: 'exp_dental',
  ms_health_other: 'exp_health',

  // -----------------------------
  // Personal
  // -----------------------------
  ms_personal_online: 'exp_shopping',
  ms_personal_hair: 'exp_grindsten',
  ms_personal_religion: 'exp_personal',

  // -----------------------------
  // Insurance
  // -----------------------------
  ms_insurance_car: 'exp_car_ins',
  ms_insurance_health: 'exp_health_ins',
  ms_insurance_financial: 'exp_life_ins',

  // -----------------------------
  // Tech
  // -----------------------------
  ms_tech_hardware: 'exp_devices',
  ms_tech_software: 'exp_software',
  ms_tech_online_services: 'exp_cloud',

  // -----------------------------
  // Education
  // -----------------------------
  ms_education_books: 'exp_books',
  ms_education_tuition: 'exp_uni_fees',

  // -----------------------------
  // Gifts & Charity
  // -----------------------------
  ms_gifts_charities: 'exp_gifts',

  // -----------------------------
  // Fallback
  // -----------------------------
  ms_uncategorised: 'exp_misc'
};
