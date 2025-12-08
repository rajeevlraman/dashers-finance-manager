// parser.js - Updated to work with your bankFormats.js structure
import { detectBankFormat } from './bankFormats.js';

// ============================================================================
// CSV File Parser
// ============================================================================
export async function parseCSVFile(file, format) {
  console.log("[PARSER] parseCSVFile called for format:", format);
  
  // Read the file
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error("File is empty or contains no valid data");
  }
  
  let transactions;
  
  if (format === 'auto') {
    // Auto-detect format from headers using your detectBankFormat function
    console.log("[PARSER] Auto-detecting bank format from headers");
    const bankFormat = detectBankFormat(lines[0]);
    
    if (bankFormat) {
      console.log("[PARSER] Auto-detected format:", bankFormat.bankId);
      transactions = parseWithBankFormat(lines, bankFormat);
    } else {
      console.log("[PARSER] No specific format detected, using generic parser");
      transactions = parseGenericCSV(lines);
    }
  } else {
    // Use the specified format
    switch(format) {
      case 'macquarie':
        transactions = parseMacquarie(lines);
        break;
      case 'anz_generic':
        transactions = parseANZGeneric(lines);
        break;
      case 'nab_generic':
        transactions = parseNABGeneric(lines);
        break;
      case 'me_generic':
        transactions = parseMEGeneric(lines);
        break;
      case 'anz':
        transactions = parseANZ(lines);
        break;
      case 'commbank':
        transactions = parseCommBank(lines);
        break;
      case 'nab':
        transactions = parseNAB(lines);
        break;
      case 'westpac':
        transactions = parseWestpac(lines);
        break;
      case 'generic_csv':
        transactions = parseGenericCSV(lines);
        break;
      default:
        console.warn(`[PARSER] Unknown format "${format}", using generic parser`);
        transactions = parseGenericCSV(lines);
    }
  }
  
  console.log(`[PARSER] Successfully parsed ${transactions.length} transactions`);
  return transactions;
}

// ============================================================================
// Statement Text Parser
// ============================================================================
export async function parseStatementText(text, format) {
  console.log("[PARSER] parseStatementText called for format:", format);
  
  // Parse text based on format
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error("No text content to parse");
  }
  
  let transactions;
  
  switch(format) {
    case 'anz':
      transactions = parseANZText(lines);
      break;
    case 'commbank':
      transactions = parseCommBankText(lines);
      break;
    case 'nab':
      transactions = parseNABText(lines);
      break;
    case 'westpac':
      transactions = parseWestpacText(lines);
      break;
    case 'generic_csv':
    default:
      transactions = parseGenericText(lines);
  }
  
  console.log(`[PARSER] Successfully parsed ${transactions.length} transactions from text`);
  return transactions;
}

// ============================================================================
// Parser using your bank format detection
// ============================================================================
function parseWithBankFormat(lines, bankFormat) {
  console.log("[PARSER] Parsing with bank format:", bankFormat);
  
  const startIndex = 1; // Skip header
  const transactions = [];
  
  for (let i = startIndex; i < lines.length; i++) {
    try {
      const line = lines[i];
      const parts = line.split(',').map(part => part.trim().replace(/"/g, ''));
      
      // Extract data based on bank format mapping
      const date = bankFormat.dateIndex >= 0 ? parts[bankFormat.dateIndex] : '';
      const description = bankFormat.descriptionIndex >= 0 ? parts[bankFormat.descriptionIndex] : '';
      
      let amount = 0;
      
      // Determine amount from debit/credit columns or amount column
      if (bankFormat.debitIndex >= 0 && bankFormat.creditIndex >= 0) {
        const debit = parseFloat(parts[bankFormat.debitIndex]) || 0;
        const credit = parseFloat(parts[bankFormat.creditIndex]) || 0;
        amount = credit > 0 ? credit : -debit;
      } else if (bankFormat.amountIndex >= 0) {
        amount = parseFloat(parts[bankFormat.amountIndex]) || 0;
      }
      
      if (!date || !description || amount === 0) {
        continue;
      }
      
      const cleanedDate = parseDate(date);
      if (!cleanedDate) continue;
      
      transactions.push({
        date: cleanedDate,
        description: description.substring(0, 200),
        amount,
        type: amount > 0 ? 'income' : 'expense',
        source: `${bankFormat.bankId} Import`,
        originalLine: i + 1
      });
      
    } catch (error) {
      console.warn(`[PARSER] Error parsing line ${i}:`, error);
      continue;
    }
  }
  
  return transactions;
}

// ============================================================================
// Your specific bank format parsers
// ============================================================================
function parseMacquarie(lines) {
  console.log("[PARSER] Parsing Macquarie format");
  return parseWithBankFormat(lines, {
    bankId: 'macquarie',
    dateIndex: 0, // "Transaction Date"
    descriptionIndex: 1, // "Details"
    debitIndex: 7, // "Debit"
    creditIndex: 8, // "Credit"
    amountIndex: -1
  });
}

function parseANZGeneric(lines) {
  console.log("[PARSER] Parsing ANZ Generic format");
  return parseWithBankFormat(lines, {
    bankId: 'anz_generic',
    dateIndex: 0, // "Date"
    descriptionIndex: 1, // "Description"
    debitIndex: 2, // "Debit"
    creditIndex: 3, // "Credit"
    amountIndex: -1
  });
}

function parseNABGeneric(lines) {
  console.log("[PARSER] Parsing NAB Generic format");
  // Try to detect actual column indices
  const header = lines[0].toLowerCase();
  const parts = header.split(',').map(p => p.trim());
  
  const dateIndex = parts.findIndex(p => p.includes('date'));
  const descIndex = parts.findIndex(p => p.includes('description') || p.includes('details'));
  const amountIndex = parts.findIndex(p => p.includes('amount'));
  const debitIndex = parts.findIndex(p => p.includes('debit'));
  const creditIndex = parts.findIndex(p => p.includes('credit'));
  
  return parseWithBankFormat(lines, {
    bankId: 'nab_generic',
    dateIndex,
    descriptionIndex: descIndex,
    debitIndex,
    creditIndex,
    amountIndex
  });
}

function parseMEGeneric(lines) {
  console.log("[PARSER] Parsing ME Bank Generic format");
  return parseWithBankFormat(lines, {
    bankId: 'me_generic',
    dateIndex: 0, // "Date"
    descriptionIndex: 1, // "Description" or "Details"
    debitIndex: -1,
    creditIndex: -1,
    amountIndex: 2 // "Amount"
  });
}

// ============================================================================
// Other bank parsers (ANZ, CommBank, NAB, Westpac, Generic)
// ============================================================================
// Keep all the other parser functions from the previous version:
// parseANZ, parseANZText, parseCommBank, parseCommBankText, 
// parseNAB, parseNABText, parseWestpac, parseWestpacText,
// parseGenericCSV, parseGenericText, parseDate
// (These should remain exactly as in the previous version)

// ============================================================================
// Helper Functions (keep from previous version)
// ============================================================================
function parseDate(dateString, format = 'auto') {
  // Keep the same parseDate function from before
  // ... (same code as before)
}

// Export utility functions
export function getSupportedFormats() {
  return ['auto', 'macquarie', 'anz_generic', 'nab_generic', 'me_generic', 
          'anz', 'commbank', 'nab', 'westpac', 'generic_csv'];
}