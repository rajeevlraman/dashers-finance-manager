// bankFormats.js
export const BANK_FORMATS = {
  anz: {
    name: "ANZ Bank",
    description: "ANZ bank statement format",
    dateFormat: "DD/MM/YYYY",
    columns: ["Date", "Description", "Debit", "Credit", "Balance"]
  },
  commbank: {
    name: "Commonwealth Bank",
    description: "CommBank CSV export",
    dateFormat: "DD/MM/YYYY",
    columns: ["Date", "Description", "Amount", "Balance"]
  },
  nab: {
    name: "NAB",
    description: "NAB transaction export",
    dateFormat: "DD/MM/YYYY",
    columns: ["Date", "Description", "Debit", "Credit"]
  },
  westpac: {
    name: "Westpac",
    description: "Westpac CSV format",
    dateFormat: "DD/MM/YYYY",
    columns: ["Date", "Description", "Amount"]
  },
  generic: {
    name: "Generic CSV",
    description: "Standard CSV with Date,Description,Amount",
    dateFormat: "YYYY-MM-DD",
    columns: ["Date", "Description", "Amount"]
  }
};

// Get bank options for dropdowns
export function getBankOptions() {
  return Object.entries(BANK_FORMATS).map(([value, config]) => ({
    value,
    name: config.name,
    description: config.description
  }));
}