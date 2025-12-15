// ============================================================================
// 📄 importParser.js — Advanced CSV / Text Import System
// Supports AU banks, merchant cleaner, auto-category, duplicate detection
// ============================================================================

import { generateId } from './db.js';

// ============================================================================
// 🔍 PUBLIC: Parse CSV File
// ============================================================================
export async function parseCSVFile(file, options = {}) {
    const text = await file.text();
    return parseCSVText(text, options);
}

// ============================================================================
// 🔍 PUBLIC: Parse Manual Statement Text
// ============================================================================
export function parseStatementText(text, options = {}) {
    return parseCSVText(text, options);
}

// ============================================================================
// 🔥 MAIN CSV/TEXT PARSER
// ============================================================================
export function parseCSVText(text, options = {}) {
    const rows = text.split(/\r?\n/).map(r => r.trim()).filter(r => r.length);

    if (rows.length < 2) return [];

    const header = rows[0].toLowerCase();
    const accountId = options.accountId || null;
    const previewOnly = options.previewOnly || false;

    const isMacquarie =
        header.includes("transaction date") &&
        header.includes("details") &&
        header.includes("debit") &&
        header.includes("credit");

    const isCBA =
        header.includes("description") &&
        header.includes("debit amount");

    const isANZ =
        header.includes("transaction date") &&
        header.includes("amount (aud)");

    const parsed = [];

    for (let i = 1; i < rows.length; i++) {
        const cols = safeSplitCSV(rows[i]);
        if (!cols.length) continue;

        let entry = null;

        // ---------------------------------------------------------------------
        // BANK-SPECIFIC HANDLERS
        // ---------------------------------------------------------------------
        if (isMacquarie) entry = parseMacquarie(cols);
        else if (isCBA) entry = parseCBA(cols);
        else if (isANZ) entry = parseANZ(cols);
        else entry = parseGeneric(cols);

        if (!entry) continue;

        // Normalize & clean
        entry.date = parseDate(entry.date);
        if (!entry.date || isNaN(entry.amount)) continue;

        entry.description = cleanMerchant(entry.description);

        entry.type = entry.amount > 0 ? "income" : "expense";
        entry.categoryId = autoCategorize(entry.description, entry.amount);

        if (previewOnly) {
            parsed.push(entry);
            continue;
        }

        // ---------------------------------------------------------------------
        // DUPLICATE DETECTION
        // ---------------------------------------------------------------------
        if (isDuplicate(entry, parsed)) {
            entry._duplicate = true;
        }

        entry.id = generateId();
        entry.accountId = accountId;
        entry.createdAt = new Date().toISOString();
        entry.updatedAt = new Date().toISOString();

        parsed.push(entry);
    }

    return parsed;
}

// ============================================================================
// 🧠 BANK PARSERS
// ============================================================================

function parseMacquarie(cols) {
    const rawDate = cols[0].replace(/"/g, "");
    const desc = cols[1];
    const debit = parseAmount(cols[7]);
    const credit = parseAmount(cols[8]);

    let amount = 0;
    if (debit) amount = -Math.abs(debit);
    if (credit) amount = Math.abs(credit);

    return {
        date: rawDate,
        description: desc,
        amount
    };
}

function parseCBA(cols) {
    return {
        date: cols[0],
        description: cols[1],
        amount: parseAmount(cols[2]) || -parseAmount(cols[3]) || 0
    };
}

function parseANZ(cols) {
    return {
        date: cols[0],
        description: cols[1],
        amount: parseAmount(cols[2])
    };
}

function parseGeneric(cols) {
    return {
        date: parseDate(cols[0]),
        description: cols[1] || "Imported Transaction",
        amount: parseAmount(cols[2])
    };
}

// ============================================================================
// 🧠 SAFE CSV SPLIT (handles quotes)
// ============================================================================
function safeSplitCSV(line) {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let char of line) {
        if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

// ============================================================================
// 🧠 DATE PARSER
// ============================================================================
function parseDate(input) {
    if (!input) return null;
    const str = input.replace(/"/g, "").trim();

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // DD MMM YYYY (Macquarie)
    const mac = str.match(/^(\d{1,2})\s([A-Za-z]{3})\s(\d{4})$/);
    if (mac) {
        const map = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };
        const d = mac[1].padStart(2, "0");
        const m = map[mac[2]].toString().padStart(2, "0");
        return `${mac[3]}-${m}-${d}`;
    }

    // DD/MM/YYYY
    const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) {
        return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    }

    return null;
}

// ============================================================================
// 💲 AMOUNT PARSER
// ============================================================================
function parseAmount(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/[^0-9.-]/g, ""));
}

// ============================================================================
// 🧽 MERCHANT CLEANER
// ============================================================================
function cleanMerchant(str) {
    const s = str.toLowerCase();

    const patterns = [
        { key: "paypal", replace: /paypal\s*\*?([^0-9]+)/i },
        { key: "uber", replace: /uber\s*trip/i },
        { key: "amazon", replace: /amazon\s*(web services)?/i },
        //{ key: "coles", replace: /coles\s*[0-9]*/i },
        { key: "woolworth", replace: /woolworths?\s*[0-9]*/i },
        { key: "7-eleven", replace: /7-?eleven\s*[0-9]*/i },
        { key: "linkt", replace: /linkt/i }
    ];

    for (let p of patterns) {
        const match = str.match(p.replace);
        if (match) return match[1] || p.key.toUpperCase();
    }

    return str.replace(/\s{2,}/g, " ").trim();
}

// ============================================================================
// 🤖 CATEGORY ENGINE
// ============================================================================
function autoCategorize(desc, amount) {
    const d = desc.toLowerCase();

    if (amount > 0) {
        if (d.includes("salary") || d.includes("payroll") || d.includes("deposit")) return "inc_salary";
        return "inc_other";
    }

    if (d.includes("coles") || d.includes("woolworth") || d.includes("aldi")) return "exp_grocery";
    if (d.includes("shell") || d.includes("bp") || d.includes("fuel")) return "exp_fuel";
    if (d.includes("uber") || d.includes("13cabs")) return "exp_transport";
    if (d.includes("kmart") || d.includes("big w") || d.includes("amazon")) return "exp_shopping";
    if (d.includes("netflix") || d.includes("disney") || d.includes("youtube")) return "exp_entertainment";
    if (d.includes("linkt")) return "exp_tolls";
    if (d.includes("council")) return "exp_council";
    if (d.includes("telstra") || d.includes("optus")) return "exp_utilities";

    return "exp_misc";
}

// ============================================================================
// 🔁 DUPLICATE DETECTION
// ============================================================================
function isDuplicate(entry, list) {
    return list.some(e =>
        e.date === entry.date &&
        Math.abs(e.amount) === Math.abs(entry.amount) &&
        e.description.toLowerCase().slice(0, 12) === entry.description.toLowerCase().slice(0, 12)
    );
}
