// ============================================================================
// 💰 defaultBudgets.js - Demo/Default Budgets Based on Available Categories
// ============================================================================
// This file provides realistic starter budgets for new users based on their
// income and expense categories. Amounts are Australian dollars (AUD).

import { generateId } from './db.js';

/**
 * Standard Australian Household Budget Templates
 * Designed for typical family scenarios
 * All amounts are MONTHLY unless specified otherwise
 */

// Template 1: MODEST BUDGET (Single/Student)
// Monthly Income: ~$2,500
export const MODEST_BUDGET_TEMPLATE = [
  // INCOME
  { categoryId: 'inc_salary', amount: 2500, frequency: 'monthly', icon: '💵' },

  // EXPENSES
  { categoryId: 'exp_rent_payment', amount: 800, frequency: 'monthly', icon: '🏠' },
  { categoryId: 'exp_utilities', amount: 120, frequency: 'monthly', icon: '💡' },
  { categoryId: 'exp_internet', amount: 60, frequency: 'monthly', icon: '🌐' },
  { categoryId: 'exp_mobile', amount: 40, frequency: 'monthly', icon: '📱' },
  { categoryId: 'exp_groceries', amount: 250, frequency: 'monthly', icon: '🛒' },
  { categoryId: 'exp_transport', amount: 150, frequency: 'monthly', icon: '🚗' },
  { categoryId: 'exp_fuel', amount: 100, frequency: 'monthly', icon: '⛽' },
  { categoryId: 'exp_dining', amount: 120, frequency: 'monthly', icon: '🍽️' },
  { categoryId: 'exp_health', amount: 60, frequency: 'monthly', icon: '🩺' },
  { categoryId: 'exp_personal', amount: 100, frequency: 'monthly', icon: '👕' },
  { categoryId: 'exp_subs', amount: 40, frequency: 'monthly', icon: '📺' },
  { categoryId: 'exp_misc', amount: 80, frequency: 'monthly', icon: '🧩' },
  { categoryId: 'sav_emergency', amount: 200, frequency: 'monthly', icon: '🚑' },
];

// Template 2: FAMILY BUDGET (2 Adults + Kids)
// Monthly Income: ~$6,500
export const FAMILY_BUDGET_TEMPLATE = [
  // INCOME
  { categoryId: 'inc_salary', amount: 4000, frequency: 'monthly', icon: '💵' },
  { categoryId: 'inc_Spouse_salary', amount: 2500, frequency: 'monthly', icon: '💵' },

  // HOUSING
  { categoryId: 'exp_Home_mortgage', amount: 1800, frequency: 'monthly', icon: '🏦' },
  { categoryId: 'exp_utilities', amount: 200, frequency: 'monthly', icon: '💡' },
  { categoryId: 'exp_electricity', amount: 120, frequency: 'monthly', icon: '⚡' },
  { categoryId: 'exp_gas', amount: 50, frequency: 'monthly', icon: '🔥' },
  { categoryId: 'exp_water_usage', amount: 30, frequency: 'monthly', icon: '🚿' },
  { categoryId: 'exp_internet', amount: 80, frequency: 'monthly', icon: '🌐' },
  { categoryId: 'exp_mobile', amount: 80, frequency: 'monthly', icon: '📱' },

  // GROCERIES & FOOD
  { categoryId: 'exp_groceries', amount: 600, frequency: 'monthly', icon: '🛒' },
  { categoryId: 'exp_dining', amount: 250, frequency: 'monthly', icon: '🍽️' },

  // TRANSPORT
  { categoryId: 'exp_fuel', amount: 250, frequency: 'monthly', icon: '⛽' },
  { categoryId: 'exp_car_service', amount: 50, frequency: 'monthly', icon: '🛠️' },
  { categoryId: 'exp_rego', amount: 25, frequency: 'monthly', icon: '📄' },
  { categoryId: 'exp_car_ins', amount: 120, frequency: 'monthly', icon: '🚗' },

  // INSURANCE
  { categoryId: 'exp_home_ins', amount: 60, frequency: 'monthly', icon: '🏠' },
  { categoryId: 'exp_health_ins', amount: 100, frequency: 'monthly', icon: '⚕️' },
  { categoryId: 'exp_life_ins', amount: 40, frequency: 'monthly', icon: '❤️' },

  // KIDS & FAMILY
  { categoryId: 'exp_kids', amount: 200, frequency: 'monthly', icon: '🧸' },
  { categoryId: 'exp_childcare', amount: 300, frequency: 'monthly', icon: '🍼' },
  { categoryId: 'exp_school_fees', amount: 150, frequency: 'monthly', icon: '🏫' },

  // HEALTH & PERSONAL
  { categoryId: 'exp_health', amount: 100, frequency: 'monthly', icon: '🩺' },
  { categoryId: 'exp_personal', amount: 150, frequency: 'monthly', icon: '👕' },
  { categoryId: 'exp_fitness', amount: 60, frequency: 'monthly', icon: '🏋️' },

  // ENTERTAINMENT & SUBSCRIPTIONS
  { categoryId: 'exp_subs', amount: 80, frequency: 'monthly', icon: '📺' },
  { categoryId: 'exp_travel', amount: 200, frequency: 'monthly', icon: '✈️' },

  // PETS (if applicable)
  { categoryId: 'exp_pets', amount: 60, frequency: 'monthly', icon: '🐶' },

  // MISCELLANEOUS
  { categoryId: 'exp_misc', amount: 150, frequency: 'monthly', icon: '🧩' },

  // SAVINGS & DEBT
  { categoryId: 'sav_emergency', amount: 400, frequency: 'monthly', icon: '🚑' },
  { categoryId: 'debt_credit_card', amount: 150, frequency: 'monthly', icon: '💳' },
];

// Template 3: INVESTMENT PROPERTY BUDGET
// For landlords with rental income
export const INVESTMENT_PROPERTY_BUDGET = [
  // INCOME
  { categoryId: 'inc_salary', amount: 3500, frequency: 'monthly', icon: '💵' },
  { categoryId: 'inc_rent', amount: 1800, frequency: 'monthly', icon: '🏘️' },

  // PERSONAL EXPENSES (Regular)
  { categoryId: 'exp_Home_mortgage', amount: 1200, frequency: 'monthly', icon: '🏦' },
  { categoryId: 'exp_utilities', amount: 150, frequency: 'monthly', icon: '💡' },
  { categoryId: 'exp_groceries', amount: 400, frequency: 'monthly', icon: '🛒' },
  { categoryId: 'exp_transport', amount: 200, frequency: 'monthly', icon: '🚗' },
  { categoryId: 'exp_fuel', amount: 150, frequency: 'monthly', icon: '⛽' },
  { categoryId: 'exp_health', amount: 80, frequency: 'monthly', icon: '🩺' },
  { categoryId: 'exp_insurance', amount: 100, frequency: 'monthly', icon: '🛡️' },

  // PROPERTY EXPENSES (Tax Deductible)
  { categoryId: 'exp_Inv_mortgage', amount: 800, frequency: 'monthly', icon: '🏦' },
  { categoryId: 'exp_property_management', amount: 150, frequency: 'monthly', icon: '🏢' },
  { categoryId: 'exp_property_maintenance', amount: 200, frequency: 'monthly', icon: '🛠️' },
  { categoryId: 'exp_repairs', amount: 100, frequency: 'monthly', icon: '🔧' },
  { categoryId: 'exp_council_rates', amount: 80, frequency: 'monthly', icon: '📄' },
  { categoryId: 'exp_Inv_council_rates', amount: 60, frequency: 'monthly', icon: '📄' },
  { categoryId: 'exp_water_rates', amount: 40, frequency: 'monthly', icon: '💧' },
  { categoryId: 'exp_Inv_water_rates', amount: 30, frequency: 'monthly', icon: '💧' },
  { categoryId: 'exp_body_corporate', amount: 120, frequency: 'monthly', icon: '🏘️' },

  // INSURANCE
  { categoryId: 'exp_Landlord_ins', amount: 100, frequency: 'monthly', icon: '🏠' },

  // SAVINGS
  { categoryId: 'sav_emergency', amount: 300, frequency: 'monthly', icon: '🚑' },
];

// Template 4: HIGH INCOME BUDGET
// Monthly Income: ~$10,000+
export const HIGH_INCOME_BUDGET_TEMPLATE = [
  // INCOME
  { categoryId: 'inc_salary', amount: 6000, frequency: 'monthly', icon: '💵' },
  { categoryId: 'inc_business', amount: 2000, frequency: 'monthly', icon: '💼' },
  { categoryId: 'inc_invest', amount: 1500, frequency: 'monthly', icon: '📈' },

  // HOUSING
  { categoryId: 'exp_Home_mortgage', amount: 2500, frequency: 'monthly', icon: '🏦' },
  { categoryId: 'exp_utilities', amount: 250, frequency: 'monthly', icon: '💡' },
  { categoryId: 'exp_internet', amount: 150, frequency: 'monthly', icon: '🌐' },

  // FOOD & DINING
  { categoryId: 'exp_groceries', amount: 800, frequency: 'monthly', icon: '🛒' },
  { categoryId: 'exp_dining', amount: 500, frequency: 'monthly', icon: '🍽️' },

  // TRANSPORT
  { categoryId: 'exp_fuel', amount: 300, frequency: 'monthly', icon: '⛽' },
  { categoryId: 'exp_car_service', amount: 150, frequency: 'monthly', icon: '🛠️' },
  { categoryId: 'exp_car_ins', amount: 200, frequency: 'monthly', icon: '🚗' },

  // INSURANCE & PROTECTION
  { categoryId: 'exp_home_ins', amount: 150, frequency: 'monthly', icon: '🏠' },
  { categoryId: 'exp_health_ins', amount: 300, frequency: 'monthly', icon: '⚕️' },
  { categoryId: 'exp_life_ins', amount: 150, frequency: 'monthly', icon: '❤️' },

  // LIFESTYLE
  { categoryId: 'exp_personal', amount: 400, frequency: 'monthly', icon: '👕' },
  { categoryId: 'exp_fitness', amount: 150, frequency: 'monthly', icon: '🏋️' },
  { categoryId: 'exp_travel', amount: 1000, frequency: 'monthly', icon: '✈️' },
  { categoryId: 'exp_subs', amount: 200, frequency: 'monthly', icon: '📺' },
  { categoryId: 'exp_gifts', amount: 300, frequency: 'monthly', icon: '🎁' },

  // PROFESSIONAL
  { categoryId: 'ms_fees', amount: 300, frequency: 'monthly', icon: '💳' },
  { categoryId: 'ms_business', amount: 500, frequency: 'monthly', icon: '💼' },

  // WEALTH BUILDING
  { categoryId: 'sav_emergency', amount: 1000, frequency: 'monthly', icon: '🚑' },
  { categoryId: 'sav_high_interest', amount: 1500, frequency: 'monthly', icon: '🏦' },
  { categoryId: 'sav_invest', amount: 2000, frequency: 'monthly', icon: '📊' },
];

/**
 * Get all available budget templates
 */
export function getAllBudgetTemplates() {
  return {
    modest: {
      name: '🧑 Modest Budget (Single/Student)',
      description: 'For individuals with ~$2,500 monthly income',
      template: MODEST_BUDGET_TEMPLATE,
    },
    family: {
      name: '👨‍👩‍👧‍👦 Family Budget (2 Adults + Kids)',
      description: 'For families with ~$6,500 monthly income',
      template: FAMILY_BUDGET_TEMPLATE,
    },
    investment: {
      name: '🏘️ Investment Property Budget',
      description: 'For landlords with rental income',
      template: INVESTMENT_PROPERTY_BUDGET,
    },
    highIncome: {
      name: '💎 High Income Budget',
      description: 'For high earners with ~$10,000+ monthly income',
      template: HIGH_INCOME_BUDGET_TEMPLATE,
    },
  };
}

/**
 * Create default budgets for new users
 * Can select a template or create all
 */
export async function createDefaultBudgets(dbFunctions, templateName = 'family') {
  const { addItem, STORE_NAMES } = dbFunctions;
  const templates = getAllBudgetTemplates();
  const template = templates[templateName];

  if (!template) {
    console.error(`❌ Template "${templateName}" not found. Available:`, Object.keys(templates));
    return 0;
  }

  console.log(`📝 Creating "${template.name}" budgets...`);

  let createdCount = 0;
  for (const budgetData of template.template) {
    try {
      const budget = {
        id: generateId(),
        categoryId: budgetData.categoryId,
        amount: budgetData.amount,
        frequency: budgetData.frequency,
        icon: budgetData.icon,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await addItem(STORE_NAMES.budgets, budget);
      createdCount++;
    } catch (err) {
      console.error(`❌ Failed to create budget for ${budgetData.categoryId}:`, err);
    }
  }

  console.log(`✅ Created ${createdCount} budgets from template`);
  return createdCount;
}

/**
 * Calculate total budget from template
 */
export function getTemplateTotals(templateName = 'family') {
  const templates = getAllBudgetTemplates();
  const template = templates[templateName];

  if (!template) return { income: 0, expenses: 0, surplus: 0 };

  const budgets = template.template;
  let income = 0;
  let expenses = 0;

  budgets.forEach((b) => {
    if (b.categoryId.startsWith('inc_') || b.categoryId.startsWith('ms_income')) {
      income += b.amount;
    } else if (b.categoryId.startsWith('sav_')) {
      expenses += b.amount; // Savings are treated as expense in budget
    } else {
      expenses += b.amount;
    }
  });

  return {
    income,
    expenses,
    surplus: income - expenses,
  };
}

/**
 * Get budget summary for display
 */
export function getBudgetSummary(templateName = 'family') {
  const templates = getAllBudgetTemplates();
  const template = templates[templateName];
  const totals = getTemplateTotals(templateName);

  if (!template) return null;

  return {
    name: template.name,
    description: template.description,
    itemCount: template.template.length,
    monthlyIncome: totals.income,
    monthlyExpenses: totals.expenses,
    monthlySurplus: totals.surplus,
    breakeven: totals.surplus > 0,
  };
}

/**
 * Example usage:
 * 
 * import { createDefaultBudgets, getBudgetSummary } from './defaultBudgets.js';
 * 
 * // Get template info before creating
 * const summary = getBudgetSummary('family');
 * console.log(`Will create ${summary.itemCount} budgets`);
 * console.log(`Monthly surplus: $${summary.monthlySurplus}`);
 * 
 * // Create budgets for new user
 * await createDefaultBudgets(dbFunctions, 'family');
 * 
 * // User can later edit individual budgets in the UI
 */
