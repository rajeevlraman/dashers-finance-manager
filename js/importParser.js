// ============================================================================
// 📄 importParser.js — Advanced CSV / Text Import System with DEBUG Logging
// ============================================================================

import { generateId } from './db.js';

// Force debug mode ON
const DEBUG = true;

function log(...args) {
    if (DEBUG) console.log("[IMPORT-DEBUG]", ...args);
}

// ============================================================================
// 🔍 PUBLIC: Parse CSV File
// ============================================================================
export async function parseCSVFile(file, options = {}) {
    log("📥 CSV file selected:", file.name, file.size + " bytes");
    const text = await file.text();
    return parseCSVText(text, options);
}

// ============================================================================
// 🔍 PUBLIC: Parse Manual Text
// ============================================================================
export function parseStatementText(text, options = {}) {
    log("📥 Parsing pasted statement text");
    return parseCSVText(text, options);
}

// ============================================================================
// 🔥 MAIN CSV/TEXT PARSER
// ============================================================================
export function parseCSVText(text, options = {}) {
    log("=============== IMPORT START ===============");
    log("Raw input text first 300 chars:", text.substring(0, 300));

    const rows = text.split(/\r?\n/).map(r => r.trim()).filter(r => r.length);

    if (rows.length < 2) {
        log("❌ ERROR: Not enough rows for parsing");
        return [];
    }

    const header = rows[0].toLowerCase();
    log("📌 Header row detected:", header);

    const previewOnly = options.previewOnly || false;
    const accountId = options.accountId || null;

    // -------------------------------------------------------------------------
    // Detect Bank Format
    // -------------------------------------------------------------------------
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

    if (isMacquarie) log("🏦 Detected: MACQUARIE format");
    else if (isCBA) log("🏦 Detected: CBA format");
    else if (isANZ) log("🏦 Detected: ANZ format");
    else log("🏦 UNKNOWN BANK FORMAT → Using GENERIC parser");

    const parsed = [];

    // -------------------------------------------------------------------------
    // Row-by-row parsing
    // -------------------------------------------------------------------------
    for (let i = 1; i < rows.length; i++) {
        const rawRow = rows[i];
        log(`\n➡️ Processing row ${i}:`, rawRow);

        const cols = safeSplitCSV(rawRow);
        log("🔎 Split columns:", cols);

        if (!cols.length) {
            log("⚠️ Skipped: empty row");
            continue;
        }

        let entry = null;

        if (isMacquarie) entry = parseMacquarie(cols);
        else if (isCBA) entry = parseCBA(cols);
        else if (isANZ) entry = parseANZ(cols);
        else entry = parseGeneric(cols);

        log("📌 Extracted entry:", entry);

        if (!entry || !entry.date || isNaN(entry.amount)) {
            log("❌ Row rejected — invalid date or amount");
            continue;
        }

        // Normalize fields
        entry.date = parseDate(entry.date);
        entry.descriptionOriginal = entry.description;
        entry.description = cleanMerchant(entry.description);
        log("🧽 Merchant cleaned:", entry.descriptionOriginal, "→", entry.description);

        entry.type = entry.amount > 0 ? "income" : "expense";

        entry.categoryId = autoCategorize(entry.description, entry.amount);
        log("📂 Auto-category:", entry.categoryId);

        if (previewOnly) {
            log("👀 PREVIEW MODE: Entry stored only for preview");
            parsed.push(entry);
            continue;
        }

        // Duplicate detection
        if (isDuplicate(entry, parsed)) {
            log("⚠️ DUPLICATE detected → Marked as duplicate");
            entry._duplicate = true;
        }

        // Final packaging
        entry.id = generateId();
        entry.accountId = accountId;
        entry.createdAt = new Date().toISOString();
        entry.updatedAt = new Date().toISOString();

        log("✅ FINAL ENTRY:", entry);

        parsed.push(entry);
    }

    log("=============== IMPORT COMPLETE ===============");
    log("Total parsed entries:", parsed.length);

    return parsed;
}

// ============================================================================
// 🧠 BANK-SPECIFIC PARSERS (with debug logs)
// ============================================================================

function parseMacquarie(cols) {
    log("🔵 Macquarie parser engaged");
    const debit = parseAmount(cols[7]);
    const credit = parseAmount(cols[8]);

    return {
        date: cols[0].replace(/"/g, ""),
        description: cols[1],
        amount: credit ? Math.abs(credit) : debit ? -Math.abs(debit) : 0
    };
}

function parseCBA(cols) {
    log("🟡 CBA parser engaged");
    return {
        date: cols[0],
        description: cols[1],
        amount: parseAmount(cols[2]) || -parseAmount(cols[3])
    };
}

function parseANZ(cols) {
    log("🔴 ANZ parser engaged");
    return {
        date: cols[0],
        description: cols[1],
        amount: parseAmount(cols[2])
    };
}

function parseGeneric(cols) {
    log("⚪ GENERIC parser engaged");
    return {
        date: cols[0],
        description: cols[1],
        amount: parseAmount(cols[2])
    };
}

// ============================================================================
// 🧠 SAFE CSV SPLITTER
// ============================================================================
function safeSplitCSV(line) {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let char of line) {
        if (char === '"') insideQuotes = !insideQuotes;
        else if (char === ',' && !insideQuotes) {
            result.push(current.trim());
            current = "";
        } else current += char;
    }
    result.push(current.trim());

    return result;
}

// ============================================================================
// 📅 DATE PARSER
// ============================================================================
function parseDate(str) {
    if (!str) return null;

    log("⏳ Parsing date:", str);

    const s = str.replace(/"/g, "").trim();

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        log("📅 Date format: ISO");
        return s;
    }

    // DD/MM/YYYY
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) {
        log("📅 Date format: DD/MM/YYYY");
        return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    }

    log("❌ DATE PARSE FAILED");
    return null;
}

// ============================================================================
// 💲 AMOUNT PARSER
// ============================================================================
function parseAmount(str) {
    if (!str) return 0;
    let cleaned = parseFloat(str.replace(/[^0-9.-]/g, ""));
    log("💲 Parsed amount:", str, "→", cleaned);
    return cleaned;
}

// ============================================================================
// 🧽 MERCHANT CLEANING
// ============================================================================
function cleanMerchant(str) {
    if (!str) return "";

    log("🧽 Cleaning merchant:", str);

    const lower = str.toLowerCase();

    const patterns = [
        { key: "PAYPAL", regex: /paypal\s*\*?([^0-9]+)/i },
        { key: "UBER", regex: /uber\s*trip/i },
        { key: "AMAZON", regex: /amazon\s*(web services)?/i },
        { key: "COLES", regex: /coles\s*[0-9]*/i },
        { key: "WOOLWORTHS", regex: /woolworths?\s*[0-9]*/i },
        { key: "7-ELEVEN", regex: /7-?eleven\s*[0-9]*/i },
        { key: "LINKT", regex: /linkt/i }
    ];

    for (let p of patterns) {
        const match = str.match(p.regex);
        if (match) {
            log(`✨ Cleaned merchant matched: ${p.key}`);
            return p.key;
        }
    }

    log("⚠️ No cleaning rule matched → keeping raw description");
    return str.trim();
}

// ============================================================================
// 📂 AUTO-CATEGORIZER
// ============================================================================
function autoCategorize(desc, amount) {
    log("📂 Auto-categorising:", desc, "Amount:", amount);

    const d = desc.toLowerCase();

    if (amount > 0) {
        if (d.includes("salary") || d.includes("payroll") || d.includes("deposit"))
            return "inc_salary";
        return "inc_other";
    }

    if (d.includes("coles") || d.includes("woolworth") || d.includes("aldi"))
        return "exp_grocery";

    if (d.includes("shell") || d.includes("bp") || d.includes("fuel"))
        return "exp_fuel";

    if (d.includes("uber") || d.includes("13cabs"))
        return "exp_transport";

    if (d.includes("amazon") || d.includes("kmart") || d.includes("big w"))
        return "exp_shopping";

    if (d.includes("linkt"))
        return "exp_tolls";

    log("📁 No rule matched → assigned exp_misc");
    return "exp_misc";
}

// ============================================================================
// 🔁 DUPLICATE DETECTION
// ============================================================================
function isDuplicate(entry, list) {
    const duplicate = list.some(e =>
        e.date === entry.date &&
        Math.abs(e.amount) === Math.abs(entry.amount) &&
        e.description.substring(0, 12).toLowerCase() ===
        entry.description.substring(0, 12).toLowerCase()
    );

    if (duplicate) log("⚠️ DUPLICATE detected:", entry);

    return duplicate;
}
