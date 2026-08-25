import { parseCSVFile } from './js/import/parser.js';

// Same real data, but WITHOUT quotes around the amount (a very plausible
// real-world variant — many exporters only quote fields containing commas)
const csvUnquoted = `8/07/2026,1771.42,PAY/SALARY FROM DEPARTMENT OF ED 10690383
7/07/2026,-705,ANZ INTERNET BANKING BPAY SROVIC LAND TAX {822746}`;

const file1 = { text: async () => csvUnquoted };
const txs1 = await parseCSVFile(file1, "auto");
console.log("UNQUOTED amount, auto-detect:", txs1.length, "transactions parsed");
console.log(txs1);

const csvQuoted = `8/07/2026,"1771.42",PAY/SALARY FROM DEPARTMENT OF ED 10690383
7/07/2026,"-705.00",ANZ INTERNET BANKING BPAY SROVIC LAND TAX {822746}`;
const file2 = { text: async () => csvQuoted };
const txs2 = await parseCSVFile(file2, "auto");
console.log("QUOTED amount, auto-detect:", txs2.length, "transactions parsed");
