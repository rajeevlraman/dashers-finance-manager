// ============================================================================
// parser.js - Unified Bank Parser with Merchant Extraction + Bank Category
// ============================================================================

import { detectBankFormat } from './bankFormats.js';

/* -------------------------------------------------------------
   NORMALISATION HELPERS
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
    return parts.slice(0, 3).join(" "); // take first 1–3 words
}

function extractCategoryText(description) {
    return normaliseDescription(description);
}

/* -------------------------------------------------------------
   Build Final Transaction Object
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

        bankCategory,    // ⭐ new field
        source,
        originalLine
    };
}

/* -------------------------------------------------------------
   MAIN CSV PARSER
------------------------------------------------------------- */

export async function parseCSVFile(file, format) {
    console.log("[PARSER] parseCSVFile called for format:", format);

    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());

    if (lines.length === 0) {
        throw new Error("CSV file is empty");
    }

    let transactions = [];

    if (format === "auto") {
        console.log("[PARSER] Auto-detecting format...");
        const bankFormat = detectBankFormat(lines[0]);

        if (bankFormat) {
            transactions = parseWithBankFormat(lines, bankFormat);
        } else {
            console.log("[PARSER] No match → generic CSV parser");
            transactions = parseGenericCSV(lines);
        }
    } else {
        switch (format) {
            case "macquarie":   transactions = parseMacquarie(lines); break;
            case "anz_generic": transactions = parseANZGeneric(lines); break;
            case "nab_generic": transactions = parseNABGeneric(lines); break;
            case "me_generic":  transactions = parseMEGeneric(lines); break;
            case "anz":         transactions = parseANZ(lines); break;
            case "commbank":    transactions = parseCommBank(lines); break;
            case "nab":         transactions = parseNAB(lines); break;
            case "westpac":     transactions = parseWestpac(lines); break;
            case "generic_csv": transactions = parseGenericCSV(lines); break;

            default:
                console.warn("[PARSER] Unknown format → generic CSV");
                transactions = parseGenericCSV(lines);
        }
    }

    console.log(`[PARSER] Parsed ${transactions.length} transactions`);
    return transactions;
}

import { suggestCategoryForTransaction } from '.import/categoryMapper.js';

// Example: NAB CSV with a “Category” column from the bank
function processImportedTransactions(parsedTxs, bankId, bankCategoryColumnName) {
  return parsedTxs.map(tx => {
    // bankCategory might be missing for some banks
    const bankCategory = tx.bankCategory || null; // or pull from raw CSV if you keep it

    const { categoryId, source } = suggestCategoryForTransaction(tx, bankCategory, {
      bankId // e.g. 'nab'
    });

    return {
      ...tx,
      categoryId,
      categorySource: source
    };
  });
}


/* -------------------------------------------------------------
   TEXT STATEMENT PARSER
------------------------------------------------------------- */

export async function parseStatementText(text, format) {
    const lines = text.split("\n").filter(l => l.trim());
    if (!lines.length) throw new Error("No text to parse");

    let tx;

    switch (format) {
        case "anz":      tx = parseANZText(lines); break;
        case "commbank": tx = parseCommBankText(lines); break;
        case "nab":      tx = parseNABText(lines); break;
        case "westpac":  tx = parseWestpacText(lines); break;
        default:         tx = parseGenericText(lines);
    }

    return tx;
}

/* -------------------------------------------------------------
   GENERIC BANK FORMAT PARSER (auto-match header)
------------------------------------------------------------- */

function parseWithBankFormat(lines, fmt) {
    const txs = [];

    for (let i = 1; i < lines.length; i++) {
        try {
            const parts = lines[i].split(",").map(p => p.trim().replace(/"/g, ""));

            const rawDate = parts[fmt.dateIndex] || "";
            const description = parts[fmt.descriptionIndex] || "";
            const parsedDate = parseDate(rawDate);

            if (!description || !parsedDate) continue;

            let amount = 0;

            if (fmt.debitIndex >= 0 && fmt.creditIndex >= 0) {
                const debit = parseFloat(parts[fmt.debitIndex]) || 0;
                const credit = parseFloat(parts[fmt.creditIndex]) || 0;
                amount = credit > 0 ? credit : -Math.abs(debit);
            } else if (fmt.amountIndex >= 0) {
                amount = parseFloat(parts[fmt.amountIndex]) || 0;
            }

            if (amount === 0) continue;

            txs.push(
                buildTxObject({
                    date: parsedDate,
                    description,
                    amount,
                    type: amount > 0 ? "income" : "expense",
                    bankCategory: null,
                    source: `${fmt.bankId} Import`,
                    originalLine: i + 1
                })
            );

        } catch (e) {
            console.warn("[PARSER] Auto-format parse error line", i, e);
        }
    }

    return txs;
}

/* -------------------------------------------------------------
   BANK-SPECIFIC PARSERS
------------------------------------------------------------- */

// ---------------------------
// MACQUARIE BANK
// ---------------------------
function parseMacquarie(lines) {
    const header = lines[0].toLowerCase();
    const startIndex = header.includes("date") ? 1 : 0;
    const txs = [];

    for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(",").map(p => p.replace(/"/g, "").trim());
        if (parts.length < 10) continue;

        const date = parseDate(parts[0]);
        const description = parts[1];
        const bankCategory = parts[3] || null;

        const debit = parseFloat(parts[7]) || 0;
        const credit = parseFloat(parts[8]) || 0;
        const amount = credit > 0 ? credit : -Math.abs(debit);

        if (!date || !description || amount === 0) continue;

        txs.push(
            buildTxObject({
                date,
                description,
                amount,
                type: amount > 0 ? "income" : "expense",
                bankCategory,
                source: "Macquarie Import",
                originalLine: i + 1
            })
        );
    }

    return txs;
}

// ---------------------------
// ANZ GENERIC FORMAT
// ---------------------------
function parseANZGeneric(lines) {
    return parseWithBankFormat(lines, {
        bankId: "anz_generic",
        dateIndex: 0,
        descriptionIndex: 1,
        debitIndex: 2,
        creditIndex: 3
    });
}

// ---------------------------
// ME BANK GENERIC
// ---------------------------
function parseMEGeneric(lines) {
    return parseWithBankFormat(lines, {
        bankId: "me_generic",
        dateIndex: 0,
        descriptionIndex: 1,
        amountIndex: 2,
        debitIndex: -1,
        creditIndex: -1
    });
}

// ---------------------------
// NAB (matches your CSV export)
// ---------------------------
function parseNAB(lines) {
    console.log("[PARSER] Parsing NAB CSV format");

    const header = lines[0].toLowerCase();
    const startIndex = header.includes("date") ? 1 : 0;

    const txs = [];

    for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(",").map(x => x.trim());

        if (parts.length < 2) continue;

        const rawDate = parts[0];
        const rawAmount = parts[1];
        const txnDetails = parts[5] || "";
        const merchantName = parts[8] || "";
        const bankCategory = parts[7] || null;

        const date = parseDate(rawDate);
        const amount = parseFloat(rawAmount);

        if (!date || isNaN(amount) || amount === 0) continue;

        const description =
            merchantName.trim() ||
            txnDetails.trim() ||
            `NAB Transaction ${i}`;

        txs.push(
            buildTxObject({
                date,
                description,
                amount,
                type: amount > 0 ? "income" : "expense",
                bankCategory,
                source: "NAB Import",
                originalLine: i + 1
            })
        );
    }

    return txs;
}

// ---------------------------
// ANZ
// ---------------------------
function parseANZ(lines) {
    const startIndex = lines[0].toLowerCase().includes("date") ? 1 : 0;
    const txs = [];

    for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(",").map(x => x.trim());
        if (parts.length < 3) continue;

        const date = parseDate(parts[0]);
        const description = parts[1];

        let amount = 0;
        if (parts[2] && parseFloat(parts[2]) > 0) amount = -parseFloat(parts[2]);
        else if (parts[3] && parseFloat(parts[3]) > 0) amount = parseFloat(parts[3]);

        if (!date || !description || amount === 0) continue;

        txs.push(
            buildTxObject({
                date,
                description,
                amount,
                type: amount > 0 ? "income" : "expense",
                bankCategory: null,
                source: "ANZ Import",
                originalLine: i + 1
            })
        );
    }

    return txs;
}

// ---------------------------
// COMM BANK
// ---------------------------
function parseCommBank(lines) {
    const startIndex = lines[0].toLowerCase().includes("date") ? 1 : 0;
    const txs = [];

    for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(",").map(x => x.trim());
        if (parts.length < 3) continue;

        const date = parseDate(parts[0]);
        const description = parts[1];
        const amount = parseFloat(parts[2]);

        if (!date || !description || isNaN(amount) || amount === 0) continue;

        txs.push(
            buildTxObject({
                date,
                description,
                amount,
                type: amount > 0 ? "income" : "expense",
                bankCategory: null,
                source: "CommBank Import",
                originalLine: i + 1
            })
        );
    }

    return txs;
}

// ---------------------------
// WESTPAC
// ---------------------------
function parseWestpac(lines) {
    const startIndex = lines[0].toLowerCase().includes("date") ? 1 : 0;
    const txs = [];

    for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(",").map(x => x.trim());
        if (parts.length < 3) continue;

        const date = parseDate(parts[0]);
        const description = parts[1];
        const amount = parseFloat(parts[2]);

        if (!date || !description || isNaN(amount) || amount === 0) continue;

        txs.push(
            buildTxObject({
                date,
                description,
                amount,
                type: amount > 0 ? "income" : "expense",
                bankCategory: null,
                source: "Westpac Import",
                originalLine: i + 1
            })
        );
    }

    return txs;
}

/* -------------------------------------------------------------
   GENERIC CSV PARSER
------------------------------------------------------------- */

function parseGenericCSV(lines) {
    console.log("[PARSER] Parsing generic CSV");

    const header = lines[0].toLowerCase();
    const startIndex = header.includes("date") ? 1 : 0;

    const txs = [];

    for (let i = startIndex; i < lines.length; i++) {
        try {
            let parts = lines[i].split(",").map(x => x.trim().replace(/^"|"$/g, ""));

            if (parts.length < 2) continue;

            let date = parseDate(parts[0]);
            let description = parts[1];

            let amount = null;

            for (let j = 2; j < parts.length; j++) {
                const num = parseFloat(parts[j].replace(/[$,]/g, ""));
                if (!isNaN(num)) {
                    amount = num;
                    break;
                }
            }

            if (!date || !description || !amount || amount === 0) continue;

            txs.push(
                buildTxObject({
                    date,
                    description,
                    amount,
                    type: amount > 0 ? "income" : "expense",
                    bankCategory: null,
                    source: "Generic CSV Import",
                    originalLine: i + 1
                })
            );
        } catch {}
    }

    return txs;
}

/* -------------------------------------------------------------
   GENERIC TEXT PARSER
------------------------------------------------------------- */

function parseGenericText(lines) {
    const txs = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        let date = new Date().toISOString().split("T")[0];
        let description = line.trim();

        const dateMatch = line.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/);
        if (dateMatch) date = parseDate(dateMatch[1]) || date;

        const amountMatch = line.match(/\$?([\d,]+\.?\d{2})\b/);
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 0;

        if (!amount) continue;

        txs.push(
            buildTxObject({
                date,
                description,
                amount,
                type: amount > 0 ? "income" : "expense",
                bankCategory: null,
                source: "Generic Text Import",
                originalLine: i + 1
            })
        );
    }

    return txs;
}

/* -------------------------------------------------------------
   DATE PARSING
------------------------------------------------------------- */

function parseDate(raw) {
    if (!raw) return null;

    let clean = raw.trim().replace(/["']/g, "");

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

    // DD/MM/YYYY
    let m = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
        let [, d, mm, y] = m;
        if (y.length === 2) y = "20" + y;
        return new Date(y, mm - 1, d).toISOString().split("T")[0];
    }

    // fallback to Date()
    let dt = new Date(clean);
    if (!isNaN(dt.getTime())) return dt.toISOString().split("T")[0];

    return null;
}

/* -------------------------------------------------------------
   EXPORTS
------------------------------------------------------------- */

export function getSupportedFormats() {
    return [
        "auto",
        "macquarie",
        "anz_generic",
        "nab_generic",
        "me_generic",
        "anz",
        "commbank",
        "nab",
        "westpac",
        "generic_csv"
    ];
}

