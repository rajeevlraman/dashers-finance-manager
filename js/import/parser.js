// ============================================================================
// 📄 import/parser.js — Advanced CSV & Text Parser
// ============================================================================

import { generateId } from '../db.js';
import { detectBankFormat } from './bankFormats.js';
import { logImportDebug } from './debug.js';

// ---------------------------------------------------------------------------
// 🔍 PUBLIC: Parse CSV File
// ---------------------------------------------------------------------------
export async function parseCSVFile(file, options = {}) {
  const text = await file.text();
  logImportDebug('parseCSVFile: raw text length', text.length);

  const rows = text
    .split(/\r?\n/)
    .map(r => r.trim())
    .filter(r => r.length);

  logImportDebug('parseCSVFile: number of rows (including header)', rows.length);

  if (rows.length < 2) {
    logImportDebug('parseCSVFile: not enough rows to parse');
    return [];
  }

  const previewOnly = !!options.previewOnly;
  const accountId = options.accountId;
  const headerLine = rows[0];

  // 1) Try bank-specific formats first
  let mapping = detectBankFormat(headerLine);

  // 2) Fallback to generic detection
  if (!mapping) {
    mapping = detectGenericColumns(headerLine);
    logImportDebug('Generic mapping used', mapping);
  }

  const parsed = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.trim()) continue;

    const cols = safeSplitCSV(row);
    logImportDebug('Row', i, 'cols:', cols);

    const tx = parseRowFromCols(cols, mapping, { accountId, previewOnly });

    if (!tx) {
      logImportDebug('Row', i, 'skipped (no valid transaction)');
      continue;
    }

    if (previewOnly) {
      parsed.push(`${tx.date} | ${tx.description} | ${tx.amount}`);
    } else {
      parsed.push(tx);
    }
  }

  logImportDebug('parseCSVFile: parsed transactions count', parsed.length);
  return parsed;
}

// ---------------------------------------------------------------------------
// 🔍 PUBLIC: Parse Manual Pasted Text
// ---------------------------------------------------------------------------
export async function parseStatementText(text, options = {}) {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length);

  logImportDebug('parseStatementText: lines', lines.length);

  const accountId = options.accountId;
  const parsed = [];

  // Heuristic: skip header if it contains "date"
  let startIndex = 0;
  if (lines[0]?.toLowerCase().includes('date')) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const cols = safeSplitCSV(line);
    if (cols.length < 2) continue;

    const date = parseDate(cols[0]);
    const description = cols[1] || 'Imported Transaction';
    const amount = parseAmount(cols[2]);

    logImportDebug('parseStatementText: line', i, { date, description, amount });

    if (!date || isNaN(amount)) continue;

    parsed.push({
      id: generateId(),
      type: amount > 0 ? 'income' : 'expense',
      amount,
      date,
      description,
      accountId,
      categoryId: autoCategorize(description, amount),
      isPropertyExpense: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  logImportDebug('parseStatementText: parsed count', parsed.length);
  return parsed;
}

// ============================================================================
// 🧠 GENERIC COLUMN DETECTION
// ============================================================================

function detectGenericColumns(headerLine) {
  const cols = safeSplitCSV(headerLine.toLowerCase());
  logImportDebug('detectGenericColumns: cols', cols);

  const idx = (needle) => cols.findIndex(c => c.includes(needle));

  // Try separate debit/credit layout
  const debitIndex = idx('debit');
  const creditIndex = idx('credit');

  const dateIndex = (function () {
    let d = idx('date');
    return d >= 0 ? d : 0;
  })();

  let descriptionIndex = idx('description');
  if (descriptionIndex < 0) descriptionIndex = idx('details');
  if (descriptionIndex < 0) descriptionIndex = 1;

  let amountIndex = idx('amount');
  if (amountIndex < 0 && debitIndex < 0 && creditIndex < 0) {
    // Fallback: try "value"
    amountIndex = idx('value');
  }

  return {
    bankId: 'generic',
    dateIndex,
    descriptionIndex,
    debitIndex,
    creditIndex,
    amountIndex
  };
}

// ============================================================================
// 🧩 PARSE ONE ROW GIVEN COLUMN MAPPING
// ============================================================================

function parseRowFromCols(cols, mapping, { accountId, previewOnly }) {
  const {
    dateIndex,
    descriptionIndex,
    debitIndex,
    creditIndex,
    amountIndex
  } = mapping;

  const rawDate = cols[dateIndex] ?? '';
  const date = parseDate(rawDate);
  const description = cols[descriptionIndex] || 'Imported Transaction';

  if (!date) {
    logImportDebug('parseRowFromCols: invalid date', rawDate);
    return null;
  }

  let amount = NaN;

  if (debitIndex >= 0 || creditIndex >= 0) {
    const rawDebit = cols[debitIndex] ?? '';
    const rawCredit = cols[creditIndex] ?? '';

    const debit = parseAmount(rawDebit);
    const credit = parseAmount(rawCredit);

    // Debits are money OUT, credits are IN
    const debitVal = isNaN(debit) ? 0 : Math.abs(debit);
    const creditVal = isNaN(credit) ? 0 : Math.abs(credit);

    amount = creditVal - debitVal; // positive = income, negative = expense
    logImportDebug('parseRowFromCols: debit/credit -> amount', {
      rawDebit, rawCredit, debitVal, creditVal, amount
    });
  } else if (amountIndex >= 0) {
    const rawAmount = cols[amountIndex] ?? '';
    amount = parseAmount(rawAmount);
    logImportDebug('parseRowFromCols: amount column', { rawAmount, amount });
  }

  if (isNaN(amount) || amount === 0) {
    logImportDebug('parseRowFromCols: skipping row due to bad amount', cols);
    return null;
  }

  if (previewOnly) {
    return { date, description, amount };
  }

  return {
    id: generateId(),
    type: amount > 0 ? 'income' : 'expense',
    amount,
    date,
    description,
    accountId,
    categoryId: autoCategorize(description, amount),
    isPropertyExpense: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// ============================================================================
// 🧠 SAFE CSV SPLITTER — handles commas inside quotes
// ============================================================================

export function safeSplitCSV(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.length > 0) {
    result.push(current.trim());
  }
  return result;
}

// ============================================================================
// 📅 DATE PARSER (AU-friendly)
// Supports:
//  - YYYY-MM-DD
//  - DD/MM/YYYY
//  - DD Mon YYYY (e.g., 02 Dec 2025)
// ============================================================================

function parseDate(str) {
  if (!str) return null;
  str = str.replace(/"/g, '').trim();
  logImportDebug('parseDate raw:', str);

  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD/MM/YYYY
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${pad(mo)}-${pad(d)}`;
  }

  // DD Mon YYYY (e.g. 02 Dec 2025)
  m = str.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (m) {
    const [, d, monStr, y] = m;
    const monthIndex = monthToNumber(monStr);
    if (monthIndex) {
      return `${y}-${pad(monthIndex)}-${pad(d)}`;
    }
  }

  logImportDebug('parseDate: unable to parse', str);
  return null;
}

function pad(n) {
  return n.toString().padStart(2, '0');
}

function monthToNumber(monStr) {
  const map = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12
  };
  return map[monStr.toLowerCase()] || null;
}

// ============================================================================
// 💲 AMOUNT PARSER
// ============================================================================

function parseAmount(str) {
  if (!str) return NaN;
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const val = parseFloat(cleaned);
  logImportDebug('parseAmount:', str, '=>', cleaned, '=>', val);
  return val;
}

// ============================================================================
// 🤖 AUTO-CATEGORIZER
// NOTE: This expects your DEFAULT_CATEGORIES to use ids like
//  'inc_salary', 'exp_grocery', etc. If not, these will show as
//  "Unknown Category" but still import correctly.
// ============================================================================

function autoCategorize(desc, amount) {
  const d = (desc || '').toLowerCase();

  if (amount > 0) {
    if (d.includes('salary') || d.includes('payroll') || d.includes('wages')) return 'inc_salary';
    if (d.includes('rent')) return 'inc_rent';
    return 'inc_other';
  }

  if (d.includes('coles') || d.includes('woolworth') || d.includes('aldi') || d.includes('grocery')) {
    return 'exp_grocery';
  }
  if (d.includes('shell') || d.includes('bp') || d.includes('caltex') || d.includes('fuel')) {
    return 'exp_fuel';
  }
  if (d.includes('amazon') || d.includes('jb hi-fi') || d.includes('kogan')) {
    return 'exp_shopping';
  }
  if (d.includes('linkt') || d.includes('toll')) {
    return 'exp_transport';
  }
  if (d.includes('netflix') || d.includes('stan') || d.includes('disney') || d.includes('stream')) {
    return 'exp_entertainment';
  }

  return 'exp_misc';
}
