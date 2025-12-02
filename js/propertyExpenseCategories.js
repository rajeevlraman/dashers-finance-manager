// propertyExpenseCategories.js
export const PROPERTY_EXPENSE_CATEGORIES = {
  // Map to your existing categories
  'Maintenance': { 
    type: 'immediate', 
    deductible: true, 
    color: '#3B82F6',
    defaultCategoryId: 'exp_repairs'  // Links to your "Repairs & Maintenance"
  },
  'Repairs': { 
    type: 'immediate', 
    deductible: true, 
    color: '#EF4444',
    defaultCategoryId: 'exp_repairs'
  },
  'Utilities': { 
    type: 'ongoing', 
    deductible: true, 
    color: '#10B981',
    defaultCategoryId: 'exp_utilities'
  },
  'Insurance': { 
    type: 'ongoing', 
    deductible: true, 
    color: '#F59E0B',
    defaultCategoryId: 'exp_insurance'
  },
  'Council Rates': { 
    type: 'ongoing', 
    deductible: true, 
    color: '#8B5CF6',
    defaultCategoryId: 'exp_council_rates'
  },
  'Property Management': { 
    type: 'ongoing', 
    deductible: true, 
    color: '#EC4899',
    defaultCategoryId: 'exp_housing'  // No direct match, use housing
  },
  'Loan Interest': { 
    type: 'ongoing', 
    deductible: true, 
    color: '#06B6D4',
    defaultCategoryId: 'exp_housing'  // Could map to mortgage or create new
  },
  'Body Corporate': { 
    type: 'ongoing', 
    deductible: true, 
    color: '#84CC16',
    defaultCategoryId: 'exp_housing'
  },
  'Capital Improvements': { 
    type: 'capital', 
    deductible: false, 
    color: '#F97316',
    defaultCategoryId: 'exp_housing'
  },
  'Travel': { 
    type: 'immediate', 
    deductible: true, 
    color: '#6366F1',
    defaultCategoryId: 'exp_travel'
  },
  'Legal Fees': { 
    type: 'immediate', 
    deductible: true, 
    color: '#8B5CF6',
    defaultCategoryId: 'exp_fees'
  },
  'Other': { 
    type: 'other', 
    deductible: true, 
    color: '#6B7280',
    defaultCategoryId: 'exp_misc'
  }
};