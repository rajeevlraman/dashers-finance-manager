// ============================================================================
// 🏦 import/bankFormats.js — Bank-Specific Header Detection
// ============================================================================

import { logImportDebug } from './debug.js';

// Helper to normalize headers
function normalizeCols(headerLine) {
  return headerLine
    .trim()
    .toLowerCase()
    .split(',')
    .map(c => c.trim().replace(/"/g, ''));
}

// -----------------------------
// Macquarie Credit Card Format
// -----------------------------
//
// Header example:
// Transaction Date,Details,Account,Category,Subcategory,Tags,Notes,Debit,Credit,Balance,Original Description
//
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
      amountIndex: -1 // we derive from debit/credit
    };
  }
};

// -----------------------------
// Generic AU Bank Formats
// (ANZ / NAB / ME typical shapes)
// -----------------------------
//
// These are "best effort" matches that still fall back
// to generic detection if they don't match.
//

const anzFormat = {
  id: 'anz_generic',
  label: 'ANZ Generic',
  match(headerCols) {
    // Typical: "Date,Description,Debit,Credit,Balance"
    const hasDate = headerCols[0]?.includes('date');
    const hasDesc = headerCols[1]?.includes('description');
    const hasDebit = headerCols.some(c => c.includes('debit'));
    const hasCredit = headerCols.some(c => c.includes('credit'));
    const match = hasDate && hasDesc && (hasDebit || hasCredit);
    if (match) logImportDebug('ANZ-like format detected');
    return match;
  },
  map(headerCols) {
    const mapIndex = (needle) =>
      headerCols.findIndex(c => c.includes(needle));
    return {
      bankId: 'anz_generic',
      dateIndex: mapIndex('date'),
      descriptionIndex: mapIndex('description'),
      debitIndex: mapIndex('debit'),
      creditIndex: mapIndex('credit'),
      amountIndex: mapIndex('amount')
    };
  }
};

const nabFormat = {
  id: 'nab_generic',
  label: 'NAB Generic',
  match(headerCols) {
    // Often "Date,Amount,Transaction Description" or similar
    const hasDate = headerCols[0]?.includes('date');
    const hasAmt = headerCols.some(c => c.includes('amount'));
    const hasDesc = headerCols.some(c => c.includes('description') || c.includes('details'));
    const match = hasDate && hasAmt && hasDesc;
    if (match) logImportDebug('NAB-like format detected');
    return match;
  },
  map(headerCols) {
    const mapIndex = (needle) =>
      headerCols.findIndex(c => c.includes(needle));
    return {
      bankId: 'nab_generic',
      dateIndex: mapIndex('date'),
      descriptionIndex: mapIndex('description') >= 0
        ? mapIndex('description')
        : mapIndex('details'),
      debitIndex: headerCols.some(c => c.includes('debit')) ? mapIndex('debit') : -1,
      creditIndex: headerCols.some(c => c.includes('credit')) ? mapIndex('credit') : -1,
      amountIndex: mapIndex('amount')
    };
  }
};

const meFormat = {
  id: 'me_generic',
  label: 'ME Bank Generic',
  match(headerCols) {
    // Often "Date,Description,Amount" simple CSV
    const hasDate = headerCols[0]?.includes('date');
    const hasDesc = headerCols[1]?.includes('description') || headerCols[1]?.includes('details');
    const hasAmt = headerCols.slice(1).some(c => c.includes('amount'));
    const match = hasDate && hasDesc && hasAmt;
    if (match) logImportDebug('ME-like format detected');
    return match;
  },
  map(headerCols) {
    const mapIndex = (needle) =>
      headerCols.findIndex(c => c.includes(needle));
    return {
      bankId: 'me_generic',
      dateIndex: mapIndex('date'),
      descriptionIndex: mapIndex('description') >= 0
        ? mapIndex('description')
        : mapIndex('details'),
      debitIndex: -1,
      creditIndex: -1,
      amountIndex: mapIndex('amount')
    };
  }
};

export const BANK_FORMATS = [
  macquarieFormat,
  anzFormat,
  nabFormat,
  meFormat
];

// Utility exposed for parser
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
  return null; // let parser fall back
}
