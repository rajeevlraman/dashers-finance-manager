// parser.js - Complete parser with all required functions
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
// ANZ Bank Parser
// ============================================================================
function parseANZ(lines) {
  console.log("[PARSER] Parsing ANZ format");
  
  // Skip header line if present
  const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;
  
  return lines.slice(startIndex).map((line, index) => {
    try {
      // ANZ format: Date,Description,Debit,Credit,Balance
      const parts = line.split(',').map(part => part.trim());
      
      if (parts.length < 3) return null;
      
      const date = parseDate(parts[0], 'DD/MM/YYYY');
      const description = parts[1] || '';
      
      // Determine amount from Debit/Credit columns
      let amount = 0;
      if (parts[2] && parseFloat(parts[2]) > 0) {
        amount = -parseFloat(parts[2]); // Debit is negative
      } else if (parts[3] && parseFloat(parts[3]) > 0) {
        amount = parseFloat(parts[3]); // Credit is positive
      }
      
      if (!date || !description || amount === 0) return null;
      
      return {
        date,
        description,
        amount,
        type: amount > 0 ? 'income' : 'expense',
        source: 'ANZ Import',
        originalLine: index + startIndex + 1
      };
    } catch (error) {
      console.warn(`[PARSER] Error parsing ANZ line ${index}:`, error);
      return null;
    }
  }).filter(tx => tx !== null);
}

function parseANZText(lines) {
  console.log("[PARSER] Parsing ANZ text format");
  
  return lines.map((line, index) => {
    try {
      // Try to extract date (DD/MM/YYYY)
      const dateMatch = line.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
      const date = dateMatch ? parseDate(dateMatch[1], 'DD/MM/YYYY') : new Date().toISOString().split('T')[0];
      
      // Extract amount (look for $ amounts)
      const amountMatch = line.match(/\$([\d,]+\.?\d*)/g);
      let amount = 0;
      if (amountMatch) {
        const lastAmount = amountMatch[amountMatch.length - 1];
        amount = parseFloat(lastAmount.replace(/[$,]/g, ''));
        
        // Check if it's a debit (negative) - look for keywords
        if (line.toLowerCase().includes('debit') || line.toLowerCase().includes('dr') || line.toLowerCase().includes('payment')) {
          amount = -Math.abs(amount);
        }
      }
      
      // Extract description (remove date and amount parts)
      let description = line.trim();
      if (dateMatch) description = description.replace(dateMatch[0], '').trim();
      if (amountMatch) {
        amountMatch.forEach(match => {
          description = description.replace(match, '').trim();
        });
      }
      
      description = description || `Transaction ${index + 1}`;
      
      return {
        date,
        description: description.substring(0, 200), // Limit length
        amount,
        type: amount > 0 ? 'income' : 'expense',
        source: 'ANZ Text Import',
        originalLine: index + 1
      };
    } catch (error) {
      console.warn(`[PARSER] Error parsing ANZ text line ${index}:`, error);
      return null;
    }
  }).filter(tx => tx !== null && tx.description && tx.amount !== 0);
}

// ============================================================================
// Commonwealth Bank Parser
// ============================================================================
function parseCommBank(lines) {
  console.log("[PARSER] Parsing CommBank format");
  
  const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;
  
  return lines.slice(startIndex).map((line, index) => {
    try {
      // CommBank format: Date,Description,Amount,Balance
      const parts = line.split(',').map(part => part.trim());
      
      if (parts.length < 3) return null;
      
      const date = parseDate(parts[0], 'DD/MM/YYYY');
      const description = parts[1] || '';
      const amount = parseFloat(parts[2]) || 0;
      
      if (!date || !description || amount === 0) return null;
      
      return {
        date,
        description,
        amount,
        type: amount > 0 ? 'income' : 'expense',
        source: 'CommBank Import',
        originalLine: index + startIndex + 1
      };
    } catch (error) {
      console.warn(`[PARSER] Error parsing CommBank line ${index}:`, error);
      return null;
    }
  }).filter(tx => tx !== null);
}

function parseCommBankText(lines) {
  console.log("[PARSER] Parsing CommBank text format");
  
  return lines.map((line, index) => {
    try {
      const dateMatch = line.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
      const date = dateMatch ? parseDate(dateMatch[1], 'DD/MM/YYYY') : new Date().toISOString().split('T')[0];
      
      const amountMatch = line.match(/(?:DR\s*)?\$?([\d,]+\.?\d*)\s*(?:CR)?/i);
      let amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
      
      // Check if it's a debit
      if (line.includes('DR') || line.toLowerCase().includes('debit')) {
        amount = -Math.abs(amount);
      }
      
      let description = line.trim();
      if (dateMatch) description = description.replace(dateMatch[0], '').trim();
      if (amountMatch) description = description.replace(amountMatch[0], '').trim();
      
      description = description || `CommBank Transaction ${index + 1}`;
      
      return {
        date,
        description: description.substring(0, 200),
        amount,
        type: amount > 0 ? 'income' : 'expense',
        source: 'CommBank Text Import',
        originalLine: index + 1
      };
    } catch (error) {
      console.warn(`[PARSER] Error parsing CommBank text line ${index}:`, error);
      return null;
    }
  }).filter(tx => tx !== null && tx.description && tx.amount !== 0);
}

// ============================================================================
// NAB Bank Parser
// ============================================================================
function parseNAB(lines) {
  console.log("[PARSER] Parsing NAB format");
  
  const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;
  
  return lines.slice(startIndex).map((line, index) => {
    try {
      // NAB format: Date,Description,Debit,Credit
      const parts = line.split(',').map(part => part.trim());
      
      if (parts.length < 3) return null;
      
      const date = parseDate(parts[0], 'DD/MM/YYYY');
      const description = parts[1] || '';
      
      let amount = 0;
      if (parts[2] && parseFloat(parts[2]) > 0) {
        amount = -parseFloat(parts[2]); // Debit is negative
      } else if (parts[3] && parseFloat(parts[3]) > 0) {
        amount = parseFloat(parts[3]); // Credit is positive
      }
      
      if (!date || !description || amount === 0) return null;
      
      return {
        date,
        description,
        amount,
        type: amount > 0 ? 'income' : 'expense',
        source: 'NAB Import',
        originalLine: index + startIndex + 1
      };
    } catch (error) {
      console.warn(`[PARSER] Error parsing NAB line ${index}:`, error);
      return null;
    }
  }).filter(tx => tx !== null);
}

function parseNABText(lines) {
  console.log("[PARSER] Parsing NAB text format");
  
  return lines.map((line, index) => {
    try {
      const dateMatch = line.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
      const date = dateMatch ? parseDate(dateMatch[1], 'DD/MM/YYYY') : new Date().toISOString().split('T')[0];
      
      const amountMatch = line.match(/\$?([\d,]+\.?\d{2})\b/);
      let amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
      
      // Check for debit indicators
      if (line.toLowerCase().includes('debit') || line.toLowerCase().includes('payment') || line.toLowerCase().includes('withdrawal')) {
        amount = -Math.abs(amount);
      }
      
      let description = line.trim();
      if (dateMatch) description = description.replace(dateMatch[0], '').trim();
      if (amountMatch) description = description.replace(amountMatch[0], '').trim();
      
      description = description || `NAB Transaction ${index + 1}`;
      
      return {
        date,
        description: description.substring(0, 200),
        amount,
        type: amount > 0 ? 'income' : 'expense',
        source: 'NAB Text Import',
        originalLine: index + 1
      };
    } catch (error) {
      console.warn(`[PARSER] Error parsing NAB text line ${index}:`, error);
      return null;
    }
  }).filter(tx => tx !== null && tx.description && tx.amount !== 0);
}

// ============================================================================
// Westpac Bank Parser
// ============================================================================
function parseWestpac(lines) {
  console.log("[PARSER] Parsing Westpac format");
  
  const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;
  
  return lines.slice(startIndex).map((line, index) => {
    try {
      // Westpac format: Date,Description,Amount
      const parts = line.split(',').map(part => part.trim());
      
      if (parts.length < 3) return null;
      
      const date = parseDate(parts[0], 'DD/MM/YYYY');
      const description = parts[1] || '';
      const amount = parseFloat(parts[2]) || 0;
      
      if (!date || !description || amount === 0) return null;
      
      return {
        date,
        description,
        amount,
        type: amount > 0 ? 'income' : 'expense',
        source: 'Westpac Import',
        originalLine: index + startIndex + 1
      };
    } catch (error) {
      console.warn(`[PARSER] Error parsing Westpac line ${index}:`, error);
      return null;
    }
  }).filter(tx => tx !== null);
}

function parseWestpacText(lines) {
  console.log("[PARSER] Parsing Westpac text format");
  
  return lines.map((line, index) => {
    try {
      const dateMatch = line.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
      const date = dateMatch ? parseDate(dateMatch[1], 'DD/MM/YYYY') : new Date().toISOString().split('T')[0];
      
      const amountMatch = line.match(/\$([\d,]+\.?\d{2})\b/);
      let amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
      
      // Westpac debit indicators
      const isDebit = line.toLowerCase().includes('debit') || 
                     line.toLowerCase().includes('payment') || 
                     line.toLowerCase().includes('purchase') ||
                     (line.includes('-') && !line.includes('-$'));
      
      if (isDebit) {
        amount = -Math.abs(amount);
      }
      
      let description = line.trim();
      if (dateMatch) description = description.replace(dateMatch[0], '').trim();
      if (amountMatch) description = description.replace(amountMatch[0], '').trim();
      
      description = description || `Westpac Transaction ${index + 1}`;
      
      return {
        date,
        description: description.substring(0, 200),
        amount,
        type: amount > 0 ? 'income' : 'expense',
        source: 'Westpac Text Import',
        originalLine: index + 1
      };
    } catch (error) {
      console.warn(`[PARSER] Error parsing Westpac text line ${index}:`, error);
      return null;
    }
  }).filter(tx => tx !== null && tx.description && tx.amount !== 0);
}

// ============================================================================
// Generic Parsers
// ============================================================================
function parseGenericCSV(lines) {
  console.log("[PARSER] Parsing generic CSV format");
  
  const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;
  
  return lines.slice(startIndex).map((line, index) => {
    try {
      // Try different delimiters
      let parts;
      if (line.includes(',')) {
        parts = line.split(',').map(part => part.trim());
      } else if (line.includes('\t')) {
        parts = line.split('\t').map(part => part.trim());
      } else {
        parts = line.split(/\s{2,}/).map(part => part.trim()); // Multiple spaces
      }
      
      if (parts.length < 2) return null;
      
      // Try to find date, description, and amount
      let date, description, amount;
      
      // Look for date in first column
      const possibleDate = parseDate(parts[0]);
      if (possibleDate) {
        date = possibleDate;
        description = parts[1] || '';
        
        // Look for amount in remaining columns
        for (let i = 2; i < parts.length; i++) {
          const num = parseFloat(parts[i].replace(/[$,]/g, ''));
          if (!isNaN(num)) {
            amount = num;
            break;
          }
        }
      } else {
        // No date found, use current date
        date = new Date().toISOString().split('T')[0];
        description = parts[0] || '';
        
        // Look for amount in remaining columns
        for (let i = 1; i < parts.length; i++) {
          const num = parseFloat(parts[i].replace(/[$,]/g, ''));
          if (!isNaN(num)) {
            amount = num;
            break;
          }
        }
      }
      
      if (!amount || amount === 0) {
        // Try to find amount with $ sign
        const amountMatch = line.match(/\$([\d,]+\.?\d*)/);
        if (amountMatch) {
          amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        }
      }
      
      if (!date || !description || !amount || amount === 0) return null;
      
      return {
        date,
        description,
        amount,
        type: amount > 0 ? 'income' : 'expense',
        source: 'Generic CSV Import',
        originalLine: index + startIndex + 1
      };
    } catch (error) {
      console.warn(`[PARSER] Error parsing generic CSV line ${index}:`, error);
      return null;
    }
  }).filter(tx => tx !== null);
}

function parseGenericText(lines) {
  console.log("[PARSER] Parsing generic text format");
  
  return lines.map((line, index) => {
    try {
      // Try to extract date
      let date = new Date().toISOString().split('T')[0];
      const dateMatch = line.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/);
      if (dateMatch) {
        date = parseDate(dateMatch[1]) || date;
      }
      
      // Try to extract amount
      let amount = 0;
      const amountMatch = line.match(/\$?([\d,]+\.?\d{2})\b/);
      if (amountMatch) {
        amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        
        // Check for negative indicators
        if (line.includes('-') && !line.includes('-$')) {
          amount = -Math.abs(amount);
        }
      }
      
      // Extract description (remove date and amount)
      let description = line.trim();
      if (dateMatch) description = description.replace(dateMatch[0], '').trim();
      if (amountMatch) description = description.replace(amountMatch[0], '').trim();
      
      // Clean up description
      description = description
        .replace(/\s+/g, ' ')
        .replace(/[\[\](){}]/g, '')
        .trim();
      
      description = description || `Transaction ${index + 1}`;
      
      return {
        date,
        description: description.substring(0, 200),
        amount,
        type: amount > 0 ? 'income' : 'expense',
        source: 'Generic Text Import',
        originalLine: index + 1
      };
    } catch (error) {
      console.warn(`[PARSER] Error parsing generic text line ${index}:`, error);
      return null;
    }
  }).filter(tx => tx !== null && tx.description && tx.amount !== 0);
}

// ============================================================================
// Helper Functions
// ============================================================================
function parseDate(dateString, format = 'auto') {
  if (!dateString) return null;
  
  try {
    // Clean the date string
    let cleanDate = dateString.trim().replace(/["']/g, '');
    
    // Try different date formats
    const formats = [
      // DD/MM/YYYY or DD-MM-YYYY
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,
      // YYYY-MM-DD (ISO)
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      // MM/DD/YYYY (US format)
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    ];
    
    for (const pattern of formats) {
      const match = cleanDate.match(pattern);
      if (match) {
        let day, month, year;
        
        if (pattern.toString().includes('YYYY-MM-DD')) {
          // ISO format
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          day = parseInt(match[3]);
        } else {
          // Assume DD/MM or MM/DD based on format hint
          if (format === 'DD/MM/YYYY' || format === 'DD-MM-YYYY') {
            day = parseInt(match[1]);
            month = parseInt(match[2]) - 1;
          } else {
            // Try to auto-detect
            const first = parseInt(match[1]);
            const second = parseInt(match[2]);
            
            if (first > 12) {
              // First is day (DD/MM)
              day = first;
              month = second - 1;
            } else if (second > 12) {
              // Second is day (MM/DD)
              day = second;
              month = first - 1;
            } else {
              // Ambiguous, assume DD/MM
              day = first;
              month = second - 1;
            }
          }
          
          year = parseInt(match[3]);
          if (year < 100) {
            year += 2000; // Convert YY to YYYY
          }
        }
        
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    
    // Try native Date parsing as fallback
    const date = new Date(cleanDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  } catch (error) {
    console.warn("[PARSER] Error parsing date:", dateString, error);
    return null;
  }
}

// ============================================================================
// Utility Functions for Testing
// ============================================================================
export function getSupportedFormats() {
  return ['auto', 'macquarie', 'anz_generic', 'nab_generic', 'me_generic', 
          'anz', 'commbank', 'nab', 'westpac', 'generic_csv'];
}

export function getFormatInfo(format) {
  const formats = {
    'anz': { name: 'ANZ Bank', description: 'ANZ bank statement format' },
    'commbank': { name: 'Commonwealth Bank', description: 'CommBank CSV export' },
    'nab': { name: 'NAB', description: 'NAB transaction export' },
    'westpac': { name: 'Westpac', description: 'Westpac CSV format' },
    'generic_csv': { name: 'Generic CSV', description: 'Standard CSV with Date,Description,Amount' }
  };
  
  return formats[format] || null;
}