// bankFormats.js - Simplified version without debug dependency

// Helper to normalize headers
function normalizeCols(headerLine) {
  return headerLine
    .trim()
    .toLowerCase()
    .split(',')
    .map(c => c.trim().replace(/"/g, ''));
}

// Simple debug logging
function logImportDebug(message, ...args) {
  console.log(`[IMPORT-DEBUG] ${message}`, ...args);
}

// Your existing format definitions...
const macquarieFormat = {
  id: 'macquarie',
  label: 'Macquarie Credit Card',
  match(headerCols) {
    const hasTxDate = headerCols[0]?.includes('transaction date');
    const hasDetails = headerCols[1]?.includes('details');
    const hasDebit = headerCols.includes('debit');
    const hasCredit = headerCols.includes('credit');

    const match = hasTxDate && hasDetails && hasDebit && hasCredit;
    if (match) {
      logImportDebug('Macquarie format detected');
    }
    return match;
  },
  map(headerCols) {
    const mapIndex = (needle) =>
      headerCols.findIndex(c => c.includes(needle));

    const dateIndex = mapIndex('transaction date');
    const descIndex = mapIndex('details');
    const debitIndex = mapIndex('debit');
    const creditIndex = mapIndex('credit');

    logImportDebug('Macquarie column mapping', {
      dateIndex, descIndex, debitIndex, creditIndex
    });

    return {
      bankId: 'macquarie',
      dateIndex,
      descriptionIndex: descIndex,
      debitIndex,
      creditIndex,
      amountIndex: -1
    };
  }
};

// Keep all your other format definitions...
// (anzFormat, nabFormat, meFormat)

export const BANK_FORMATS = [
  macquarieFormat,
  // anzFormat, nabFormat, meFormat...
];

export function detectBankFormat(headerLineRaw) {
  const cols = normalizeCols(headerLineRaw);
  logImportDebug('Header columns normalized', cols);

  for (const fmt of BANK_FORMATS) {
    try {
      if (fmt.match(cols)) {
        const map = fmt.map(cols);
        logImportDebug('Bank format selected', fmt.id, map);
        return map;
      }
    } catch (err) {
      console.warn('[IMPORT-DEBUG] Error in bank format matcher', fmt.id, err);
    }
  }

  logImportDebug('No specific bank format matched; will fallback to generic');
  return null;
}

// Export a simple function to get bank options for the dropdown
export function getBankOptions() {
  const options = BANK_FORMATS.map(format => ({
    value: format.id,
    label: format.label,
    description: `Auto-detects ${format.label} format`
  }));
  
  // Add generic options
  options.push(
    { value: 'anz', label: 'ANZ Bank', description: 'ANZ bank statement format' },
    { value: 'commbank', label: 'Commonwealth Bank', description: 'CommBank CSV export' },
    { value: 'nab', label: 'NAB', description: 'NAB transaction export' },
    { value: 'westpac', label: 'Westpac', description: 'Westpac CSV format' },
    { value: 'generic_csv', label: 'Generic CSV', description: 'Standard CSV with Date,Description,Amount' }
  );
  
  return options;
}