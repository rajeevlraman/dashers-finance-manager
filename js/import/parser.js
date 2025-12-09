// parser.js - Complete parser with category helper fields added
import { detectBankFormat } from './bankFormats.js';

/* -------------------------------------------------------------
   🔥 NEW: Category helper functions added
------------------------------------------------------------- */

function normaliseDescription(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMerchant(description) {
  const clean = normaliseDescription(description);
  const parts = clean.split(" ");
  return parts.slice(0, 3).join(" "); // first 1–3 words
}

function extractCategoryText(description) {
  return normaliseDescription(description);
}

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
    bankCategory,      // ⭐ NEW FIELD
    source,
    originalLine
  };
}


/* -------------------------------------------------------------
   CSV File Parser
------------------------------------------------------------- */
export async function parseCSVFile(file, format) {
  console.log("[PARSER] parseCSVFile called for format:", format);

  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error("File is empty or contains no valid data");
  }

  let transactions = [];

  if (format === 'auto') {
    console.log("[PARSER] Auto-detecting bank format...");
    const bankFormat = detectBankFormat(lines[0]);

    if (bankFormat) {
      transactions = parseWithBankFormat(lines, bankFormat);
    } else {
      console.log("[PARSER] No specific format detected, using generic parser");
      transactions = parseGenericCSV(lines);
    }
  } else {
    switch (format) {
      case 'macquarie': transactions = parseMacquarie(lines); break;
      case 'anz_generic': transactions = parseANZGeneric(lines); break;
      case 'nab_generic': transactions = parseNABGeneric(lines); break;
      case 'me_generic': transactions = parseMEGeneric(lines); break;
      case 'anz': transactions = parseANZ(lines); break;
      case 'commbank': transactions = parseCommBank(lines); break;
      case 'nab': transactions = parseNAB(lines); break;
      case 'westpac': transactions = parseWestpac(lines); break;
      case 'generic_csv': transactions = parseGenericCSV(lines); break;
      default:
        console.warn(`[PARSER] Unknown format "${format}", using generic parser`);
        transactions = parseGenericCSV(lines);
    }
  }

  console.log(`[PARSER] Successfully parsed ${transactions.length} transactions`);
  return transactions;
}

/* -------------------------------------------------------------
   Statement Text Parser
------------------------------------------------------------- */
export async function parseStatementText(text, format) {
  console.log("[PARSER] parseStatementText called for format:", format);

  const lines = text.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error("No text content to parse");
  }

  let transactions;

  switch (format) {
    case 'anz': transactions = parseANZText(lines); break;
    case 'commbank': transactions = parseCommBankText(lines); break;
    case 'nab': transactions = parseNABText(lines); break;
    case 'westpac': transactions = parseWestpacText(lines); break;
    default: transactions = parseGenericText(lines);
  }

  console.log(`[PARSER] Successfully parsed ${transactions.length} text transactions`);
  return transactions;
}

/* -------------------------------------------------------------
   Bank Format Parser (Auto)
------------------------------------------------------------- */
function parseWithBankFormat(lines, bankFormat) {
  console.log("[PARSER] Parsing with bank format:", bankFormat.bankId);

  const startIndex = 1;
  const transactions = [];

  for (let i = startIndex; i < lines.length; i++) {
    try {
      const line = lines[i];
      const parts = line.split(',').map(p => p.trim().replace(/"/g, ''));

      const date = bankFormat.dateIndex >= 0 ? parts[bankFormat.dateIndex] : '';
      const description = bankFormat.descriptionIndex >= 0 ? parts[bankFormat.descriptionIndex] : '';

      let amount = 0;

      if (bankFormat.debitIndex >= 0 && bankFormat.creditIndex >= 0) {
        const debit = parseFloat(parts[bankFormat.debitIndex]) || 0;
        const credit = parseFloat(parts[bankFormat.creditIndex]) || 0;
        amount = credit > 0 ? credit : -debit;
      } else if (bankFormat.amountIndex >= 0) {
        amount = parseFloat(parts[bankFormat.amountIndex]) || 0;
      }

      const parsedDate = parseDate(date);
      if (!parsedDate || !description || amount === 0) continue;

      transactions.push(
        buildTxObject({
          date: parsedDate,
          description,
          amount,
          type: amount > 0 ? 'income' : 'expense',
          source: `${bankFormat.bankId} Import`,
          originalLine: i + 1
        })
      );

    } catch (err) {
      console.warn(`[PARSER] Error parsing line ${i}:`, err);
    }
  }

  return transactions;
}

/* -------------------------------------------------------------
   Bank Specific Parsers
------------------------------------------------------------- */

function parseMacquarie(lines) {
  const startIndex = 1; // header exists
  const txs = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.replace(/"/g, '').trim());
    if (parts.length < 10) continue;

    const date = parseDate(parts[0]);
    const description = parts[1];
    const bankCategory = parts[3] || null;   // ← Bank "Category" column
    const debit = parseFloat(parts[7]) || 0;
    const credit = parseFloat(parts[8]) || 0;
    const amount = credit > 0 ? credit : -Math.abs(debit);

    if (!date || !description || amount === 0) continue;

    txs.push(
      buildTxObject({
        date,
        description,
        amount,
        type: amount > 0 ? 'income' : 'expense',
        bankCategory,
        source: 'Macquarie Import',
        originalLine: i + 1
      })
    );
  }

  return txs;
}


function parseANZGeneric(lines) {
  return parseWithBankFormat(lines, {
    bankId: 'anz_generic',
    dateIndex: 0,
    descriptionIndex: 1,
    debitIndex: 2,
    creditIndex: 3
  });
}

// ============================================================================
// NAB Bank Parser (matches your sample layout)
// ============================================================================
function parseNAB(lines) {
  console.log("[PARSER] Parsing NAB format");

  const header = lines[0].toLowerCase();
  const startIndex = header.includes("date") ? 1 : 0;

  const txs = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim());

    if (parts.length < 2) continue;

    const rawDate = parts[0];
    const rawAmount = parts[1];

    const txnDetails = parts[5] || "";
    const merchantName = parts[8] || "";
    const bankCategory = parts[7] || null;   // ⭐ NAB BANK CATEGORY

    const date = parseDate(rawDate);
    const amountNum = parseFloat(rawAmount);

    if (!date || isNaN(amountNum) || amountNum === 0) continue;

    const description = (merchantName || txnDetails).trim() || "NAB Transaction";

    txs.push(
      buildTxObject({
        date,
        description,
        amount: amountNum,
        type: amountNum > 0 ? "income" : "expense",
        bankCategory,
        source: "NAB Import",
        originalLine: i + 1
      })
    );
  }

  return txs;
}



function parseMEGeneric(lines) {
  return parseWithBankFormat(lines, {
    bankId: 'me_generic',
    dateIndex: 0,
    descriptionIndex: 1,
    debitIndex: -1,
    creditIndex: -1,
    amountIndex: 2
  });
}

function parseANZ(lines) {
  const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;

  return lines.slice(startIndex).map((line, index) => {
    try {
      const parts = line.split(',').map(p => p.trim());

      if (parts.length < 3) return null;

      const date = parseDate(parts[0]);
      const description = parts[1];

      let amount = 0;
      if (parts[2] && parseFloat(parts[2]) > 0) amount = -parseFloat(parts[2]);
      else if (parts[3] && parseFloat(parts[3]) > 0) amount = parseFloat(parts[3]);

      if (!date || !description || amount === 0) return null;

      return buildTxObject({
        date,
        description,
        amount,
        type: amount > 0 ? "income" : "expense",
        bankCategory: null,
        source: "Generic CSV Import",
        originalLine: index + startIndex + 1
      });


    } catch (err) {
      return null;
    }
  }).filter(Boolean);
}

function parseCommBank(lines) {
  const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;

  return lines.slice(startIndex).map((line, index) => {
    try {
      const parts = line.split(',').map(p => p.trim());

      if (parts.length < 3) return null;

      const date = parseDate(parts[0]);
      const description = parts[1];
      const amount = parseFloat(parts[2]);

      if (!date || !description || !amount) return null;

      return buildTxObject({
        date,
        description,
        amount,
        type: amount > 0 ? 'income' : 'expense',
        bankCategory: null,    // ⭐ Always null for these
        source: 'CommBank Import',
        originalLine: index + startIndex + 1
      });

    } catch (err) {
      return null;
    }
  }).filter(Boolean);
}



function parseWestpac(lines) {
  const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;

  return lines.slice(startIndex).map((line, index) => {
    try {
      const parts = line.split(',').map(p => p.trim());

      if (parts.length < 3) return null;

      const date = parseDate(parts[0]);
      const description = parts[1];
      const amount = parseFloat(parts[2]);

      if (!date || !description || !amount) return null;

      return buildTxObject({
        date,
        description,
        amount,
        type: amount > 0 ? 'income' : 'expense',
        bankCategory: null,    // ⭐ Always null for these 
        source: 'Westpac Import',
        originalLine: index + startIndex + 1
      });

    } catch (err) {
      return null;
    }
  }).filter(Boolean);
}

/* -------------------------------------------------------------
   Generic CSV Parser (FIXED FOR NAB ISSUE)
------------------------------------------------------------- */
function parseGenericCSV(lines) {
  console.log("[PARSER] Parsing generic CSV");

  const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;

  return lines.slice(startIndex).map((line, index) => {
    try {
      let parts = line.split(',').map(x => x.trim().replace(/^"|"$/g, ''));

      if (parts.length < 2) return null;

      let date = parseDate(parts[0]);
      let description = parts[1];
      let amount = null;

      for (let i = 2; i < parts.length; i++) {
        const num = parseFloat(parts[i].replace(/[$,]/g, ''));
        if (!isNaN(num)) {
          amount = num;
          break;
        }
      }

      if (!amount || amount === 0) return null;

      return buildTxObject({
        date,
        description,
        amount,
        type: amount > 0 ? "income" : "expense",
        source: "Generic CSV Import",
        originalLine: index + startIndex + 1
      });

    } catch (err) {
      return null;
    }
  }).filter(Boolean);
}

/* -------------------------------------------------------------
   Generic Text
------------------------------------------------------------- */
function parseGenericText(lines) {
  return lines.map((line, index) => {
    try {
      let date = new Date().toISOString().split('T')[0];
      let description = line.trim();

      const dateMatch = line.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/);
      if (dateMatch) date = parseDate(dateMatch[1]) || date;

      const amountMatch = line.match(/\$?([\d,]+\.?\d{2})\b/);
      let amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

      if (!amount) return null;

      return buildTxObject({
        date,
        description,
        amount,
        type: amount > 0 ? 'income' : 'expense',
        source: 'Generic Text Import',
        originalLine: index + 1
      });

    } catch (err) {
      return null;
    }
  }).filter(Boolean);
}

/* -------------------------------------------------------------
   Date Parsing
------------------------------------------------------------- */
function parseDate(dateString) {
  if (!dateString) return null;

  let clean = dateString.trim().replace(/["']/g, '');

  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // DD/MM/YYYY or DD-MM-YYYY
  let m = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [ , d, mth, y] = m;
    if (y.length === 2) y = "20" + y;
    return new Date(y, mth - 1, d).toISOString().split("T")[0];
  }

  // fallback
  let d2 = new Date(clean);
  if (!isNaN(d2.getTime())) return d2.toISOString().split("T")[0];

  return null;
}

/* -------------------------------------------------------------
   Exports for testing
------------------------------------------------------------- */
export function getSupportedFormats() {
  return ['auto', 'macquarie', 'anz_generic', 'nab_generic', 'me_generic', 
          'anz', 'commbank', 'nab', 'westpac', 'generic_csv'];
}
