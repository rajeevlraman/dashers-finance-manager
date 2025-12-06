// ============================================================================
// 📄 importParser.js — CSV + Manual Parser (Bank-Agnostic)
// ============================================================================

import { generateId } from './db.js';

// ---------------------------------------------------------------------------
// 🔍 PUBLIC: Parse CSV File
// ---------------------------------------------------------------------------
export async function parseCSVFile(file, options = {}) {
    const text = await file.text();
    const rows = text.split(/\r?\n/).map(r => r.trim()).filter(r => r.length);

    if (rows.length < 2) return [];

    const previewOnly = options.previewOnly;
    const accountId = options.accountId;

    // Get first row to detect format
    const header = rows[0].toLowerCase();

    // Auto-detect formats
    const indexMap = detectColumnIndexes(header);

    const parsed = [];

    for (let i = 1; i < rows.length; i++) {
        const cols = safeSplitCSV(rows[i]);
        if (cols.length < 3) continue;

        let date = parseDate(cols[indexMap.date]);
        let description = cols[indexMap.description] || 'Imported Transaction';
        let amount = parseAmount(cols[indexMap.amount]);

        if (!date || isNaN(amount)) continue;

        if (previewOnly) {
            parsed.push(`${date} | ${description} | ${amount}`);
            continue;
        }

        parsed.push({
            id: generateId(),
            type: amount > 0 ? "income" : "expense",
            amount: amount,
            date: date,
            description: description,
            accountId: accountId,
            categoryId: autoCategorize(description, amount),
            isPropertyExpense: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    return parsed;
}

// ---------------------------------------------------------------------------
// 🔍 PUBLIC: Parse Manual Pasted Text
// ---------------------------------------------------------------------------
export async function parseStatementText(text, options = {}) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length);

    const accountId = options.accountId;
    const parsed = [];

    let startIndex = lines[0].toLowerCase().includes("date") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
        const cols = safeSplitCSV(lines[i]);
        if (cols.length < 2) continue;

        let date = parseDate(cols[0]);
        let description = cols[1] || "Imported Transaction";
        let amount = parseAmount(cols[2]);

        if (!date || isNaN(amount)) continue;

        parsed.push({
            id: generateId(),
            type: amount > 0 ? "income" : "expense",
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

    return parsed;
}

// ============================================================================
// 🧠 COLUMN DETECTION
// ============================================================================
function detectColumnIndexes(header) {
    let cols = header.split(',');

    let dateIndex = cols.findIndex(c => c.includes("date"));
    let descIndex = cols.findIndex(c => c.includes("desc") || c.includes("narration"));
    let amtIndex = cols.findIndex(c => c.includes("amount") || c.includes("debit") || c.includes("credit"));

    if (dateIndex < 0) dateIndex = 0;
    if (descIndex < 0) descIndex = 1;
    if (amtIndex < 0) amtIndex = 2;

    return {
        date: dateIndex,
        description: descIndex,
        amount: amtIndex
    };
}

// ============================================================================
// 🧠 SAFE CSV SPLITTER
// Handles commas inside quotes
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
// 📅 DATE PARSER (AU Banks Supported)
// ============================================================================
function parseDate(str) {
    str = str.replace(/"/g, '').trim();

    // Try YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // Try DD/MM/YYYY
    const matchDMY = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (matchDMY) {
        const [_, d, m, y] = matchDMY;
        return `${y}-${pad(m)}-${pad(d)}`;
    }

    return null;
}

function pad(n) { return n.toString().padStart(2, '0'); }

// ============================================================================
// 💲 AMOUNT PARSER
// ============================================================================
function parseAmount(str) {
    if (!str) return NaN;
    return parseFloat(str.replace(/[^0-9.-]/g, ""));
}

// ============================================================================
// 🤖 AUTO-CATEGORIZER
// ============================================================================
function autoCategorize(desc, amount) {
    const d = desc.toLowerCase();

    if (amount > 0) {
        if (d.includes("salary") || d.includes("payroll")) return "inc_salary";
        return "inc_other";
    }

    if (d.includes("coles") || d.includes("woolworth") || d.includes("aldi")) return "exp_grocery";
    if (d.includes("shell") || d.includes("bp") || d.includes("fuel")) return "exp_fuel";
    if (d.includes("uber") || d.includes("lyft")) return "exp_transport";
    if (d.includes("restaurant") || d.includes("cafe") || d.includes("mcdonald")) return "exp_food";

    return "exp_misc";
}
