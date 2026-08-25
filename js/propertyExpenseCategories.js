// propertyExpenseCategories.js
export const PROPERTY_EXPENSE_CATEGORIES = {
  // Map to your existing categories
  'Maintenance': { 
    type: 'immediate', 
    deductible: true, 
    color: '#3B82F6',
    defaultCategoryId: 'sub_misc_items'  // Links to your "Repairs & Maintenance"
  },
  'Repairs': { 
    type: 'immediate', 
    deductible: true, 
    color: '#EF4444',
    defaultCategoryId: 'sub_misc_items'
  },
  'Utilities': { 
    type: 'ongoing', 
    deductible: true, 
    color: '#10B981',
    defaultCategoryId: 'cat_utilities'
  },
  'Insurance': { 
    type: 'ongoing', 
    deductible: true, 
    color: '#F59E0B',
    defaultCategoryId: 'cat_insurance'
  },
  'Council Rates': { 
    type: 'ongoing', 
    deductible: true, 
    color: '#8B5CF6',
    defaultCategoryId: 'sub_council_rates'
  },
  'Property Management': { 
    type: 'ongoing', 
    deductible: true, 
    color: '#EC4899',
    defaultCategoryId: 'cat_housing'  // No direct match, use housing
  },
  'Loan Interest': { 
    type: 'ongoing', 
    deductible: true, 
    color: '#06B6D4',
    defaultCategoryId: 'cat_housing'  // Could map to mortgage or create new
  },
  'Body Corporate': { 
    type: 'ongoing', 
    deductible: true, 
    color: '#84CC16',
    defaultCategoryId: 'cat_housing'
  },
  'Capital Improvements': { 
    type: 'capital', 
    deductible: false, 
    color: '#F97316',
    defaultCategoryId: 'cat_housing'
  },
  'Travel': { 
    // Not deductible for individuals on a residential rental property since
    // 1 July 2017 (narrow exceptions only for a formal property business or
    // commercial property).
    type: 'immediate', 
    deductible: false, 
    color: '#6366F1',
    defaultCategoryId: 'cat_travel'
  },
  'Legal Fees': { 
    type: 'immediate', 
    deductible: true, 
    color: '#8B5CF6',
    defaultCategoryId: 'cat_fees'
  },
  'Other': { 
    type: 'other', 
    deductible: true, 
    color: '#6B7280',
    defaultCategoryId: 'cat_misc'
  }
};