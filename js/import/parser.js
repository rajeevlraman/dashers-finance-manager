// ============================================================================
// parser.js — PURE TRANSACTION EXTRACTOR (NO CATEGORY LOGIC)
// ----------------------------------------------------------------------------
// Responsibilities:
// ✔ Parse CSV / text
// ✔ Normalise fields
// ✔ Extract merchant + descriptions
// ✖ DO NOT assign categoryId
// ✖ DO NOT call category mapper
// ============================================================================

import { detectBankFormat } from './bankFormats.js';

/* -------------------------------------------------------------
   NORMALISATION HELPERS
------------------------------------------------------------- */

function normaliseDescription(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMerchant(description) {
  const clean = normaliseDescription(description);

  const stripped = clean
    .replace(/\bpty\s+ltd\b|\bltd\b|\bpty\b/gi, '')
    .replace(/\bvic\b|\bmelbourne\b|\bcranbourne\b/gi, '')
    .trim();

  return stripped.split(' ').slice(0, 3).join(' ');
}

function extractCategoryText(description) {
  return normaliseDescription(description);
}

/* -------------------------------------------------------------
   BUILD TRANSACTION OBJECT (FACTS ONLY)
------------------------------------------------------------- */

function buildTxObject({
  date,
  description,
  amount,
  type,
  source,
  originalLine,
  bankCategory = null
}) {
  const clean = normaliseDescription(description);

  return {
    date,
    description,
    rawDescription: description,
    cleanDescription: clean,
    merchant: extractMerchant(description),
    categoryText: extractCategoryText(description),
    amount,
    type,
    bankCategory,
    source: source || 'Unknown Import',
    originalLine
  };
}

/* -------------------------------------------------------------
   MAIN CSV PARSER
------------------------------------------------------------- */

export async function parseCSVFile(file, format) {
  const text = await file.text();
  const lines = text.split('\n').filter(l => l.trim());

  if (!lines.length) {
    throw new Error('CSV file is empty');
  }

  let transactions = [];

  if (format === 'auto') {
    const bankFormat = detectBankFormat(lines[0]);
    transactions = bankFormat
      ? parseWithBankFormat(lines, bankFormat)
      : parseGenericCSV(lines);
  } else {
    switch (format) {
      case 'macquarie':   transactions = parseMacquarie(lines); break;
      case 'anz_generic': transactions = parseANZGeneric(lines); break;
      case 'nab_generic': transactions = parseNABGeneric(lines); break;
      case 'me_generic':  transactions = parseMEGeneric(lines); break;
      case 'anz':         transactions = parseANZ(lines); break;
      case 'commbank':    transactions = parseCommBank(lines); break;
      case 'nab':         transactions = parseNAB(lines); break;
      case 'westpac':     transactions = parseWestpac(lines); break;
      default:            transactions = parseGenericCSV(lines);
    }
  }

  return transactions;
}

/* -------------------------------------------------------------
   GENERIC BANK FORMAT PARSER
------------------------------------------------------------- */

function parseWithBankFormat(lines, fmt) {
  const txs = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const parts = lines[i].split(',').map(p => p.trim().replace(/"/g, ''));

      const rawDate = parts[fmt.dateIndex];
      const description = parts[fmt.descriptionIndex];
      const date = parseDate(rawDate);

      if (!date || !description) continue;

      let amount = 0;
      if (fmt.debitIndex >= 0 && fmt.creditIndex >= 0) {
        const debit = parseFloat(parts[fmt.debitIndex]) || 0;
        const credit = parseFloat(parts[fmt.creditIndex]) || 0;
        amount = credit > 0 ? credit : -Math.abs(debit);
      } else if (fmt.amountIndex >= 0) {
        amount = parseFloat(parts[fmt.amountIndex]) || 0;
      }

      if (!amount) continue;

      txs.push(buildTxObject({
        date,
        description,
        amount,
        type: amount > 0 ? 'income' : 'expense',
        source: `${fmt.bankId} Import`,
        originalLine: i + 1
      }));
    } catch {}
  }

  return txs;
}

/* -------------------------------------------------------------
   BANK-SPECIFIC PARSERS
------------------------------------------------------------- */

function parseMacquarie(lines) {
  const txs = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.replace(/"/g, '').trim());
    if (parts.length < 10) continue;

    const date = parseDate(parts[0]);
    const description = parts[1];
    const bankCategory = parts[3];

    const debit = parseFloat(parts[7]) || 0;
    const credit = parseFloat(parts[8]) || 0;
    const amount = credit > 0 ? credit : -Math.abs(debit);

    if (!date || !description || !amount) continue;

    txs.push(buildTxObject({
      date,
      description,
      amount,
      type: amount > 0 ? 'income' : 'expense',
      bankCategory,
      source: 'Macquarie Import',
      originalLine: i + 1
    }));
  }
  return txs;
}

function parseNAB(lines) {
  const txs = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim());
    if (parts.length < 9) continue;

    const date = parseDate(parts[0]);
    const amount = parseFloat(parts[1]);
    const description = parts[8] || parts[5];
    const bankCategory = parts[7];

    if (!date || !description || !amount) continue;

    txs.push(buildTxObject({
      date,
      description,
      amount,
      type: amount > 0 ? 'income' : 'expense',
      bankCategory,
      source: 'NAB Import',
      originalLine: i + 1
    }));
  }
  return txs;
}

function parseANZ(lines) {
  return parseGenericCSV(lines, 'ANZ Import');
}

function parseCommBank(lines) {
  return parseGenericCSV(lines, 'CommBank Import');
}

function parseWestpac(lines) {
  return parseGenericCSV(lines, 'Westpac Import');
}

function parseANZGeneric(lines) {
  return parseWithBankFormat(lines, {
    bankId: 'anz',
    dateIndex: 0,
    descriptionIndex: 1,
    debitIndex: 2,
    creditIndex: 3
  });
}

function parseMEGeneric(lines) {
  return parseWithBankFormat(lines, {
    bankId: 'me',
    dateIndex: 0,
    descriptionIndex: 1,
    amountIndex: 2
  });
}

/* -------------------------------------------------------------
   GENERIC CSV PARSER
------------------------------------------------------------- */

function parseGenericCSV(lines, source = 'Generic CSV Import') {
  const txs = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const parts = lines[i].split(',').map(p => p.trim().replace(/"/g, ''));
      const date = parseDate(parts[0]);
      const description = parts[1];
      const amount = parseFloat(parts.find(p => !isNaN(parseFloat(p))));

      if (!date || !description || !amount) continue;

      txs.push(buildTxObject({
        date,
        description,
        amount,
        type: amount > 0 ? 'income' : 'expense',
        source,
        originalLine: i + 1
      }));
    } catch {}
  }
  return txs;
}

/* -------------------------------------------------------------
   DATE PARSER
------------------------------------------------------------- */

function parseDate(raw) {
  if (!raw) return null;
  const clean = raw.trim().replace(/["']/g, '');

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  const m = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [, d, mm, y] = m;
    if (y.length === 2) y = '20' + y;
    return new Date(y, mm - 1, d).toISOString().split('T')[0];
  }

  const dt = new Date(clean);
  return isNaN(dt.getTime()) ? null : dt.toISOString().split('T')[0];
}

/* -------------------------------------------------------------
   EXPORTS
------------------------------------------------------------- */

export function getSupportedFormats() {
  return [
    'auto',
    'macquarie',
    'anz_generic',
    'nab_generic',
    'me_generic',
    'anz',
    'commbank',
    'nab',
    'westpac',
    'generic_csv'
  ];
}
/* -------------------------------------------------------------
   TEXT STATEMENT PARSER (PURE / GENERIC)
------------------------------------------------------------- */

export async function parseStatementText(text, format) {
  const lines = text.split('\n').filter(l => l.trim());
  if (!lines.length) {
    throw new Error('No text to parse');
  }

  return parseGenericText(lines, `${format || 'Generic'} Text Import`);
}
/* -------------------------------------------------------------
   TEXT STATEMENT PARSER (PURE / GENERIC)
------------------------------------------------------------- */

export async function parseStatementText(text, format) {
  const lines = text.split('\n').filter(l => l.trim());
  if (!lines.length) {
    throw new Error('No text to parse');
  }

  return parseGenericText(lines, `${format || 'Generic'} Text Import`);
}
