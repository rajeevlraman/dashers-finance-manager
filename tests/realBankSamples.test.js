import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseANZ, parseNAB, parseMacquarie, parseDate } from '../js/import/parser.js';
import { looksLikeHeaderlessANZFormat, detectBankFormat } from '../js/import/bankFormats.js';

// Real sample data provided (values are the user's actual export content).
const ANZ_SAMPLE = [
  '08/07/2026,"1771.42",PAY/SALARY FROM DEPARTMENT OF ED 10690383',
  '07/07/2026,"-705.00",ANZ INTERNET BANKING BPAY SROVIC LAND TAX               {822746}',
  '07/07/2026,"2025.61",PAY/SALARY FROM GCP              24356/07/2026',
  '06/07/2026,"-1000.00",ANZ INTERNET BANKING PAYMENT 619833 TO rajeev raman',
  '30/06/2026,"-600.00",ANZ INTERNET BANKING BPAY SROVIC LAND TAX               {241637}',
  '30/06/2026,"1859.80",PAY/SALARY FROM GCP              243529/06/2026',
  '29/06/2026,"-438.35",ANZ INTERNET BANKING BPAY VICROADS                      {378246}',
  '24/06/2026,"1569.95",PAY/SALARY FROM DEPARTMENT OF ED 10690383',
  '23/06/2026,"-600.00",ANZ INTERNET BANKING BPAY SROVIC LAND TAX               {729697}'
];

const NAB_SAMPLE = [
  'Date,Amount,Account Number,,Transaction Type,Transaction Details,Balance,Category,Merchant Name,Processed On',
  '29 Jun 26,-50.00,562557409,,TRANSFER DEBIT,KRITHIK RAJEEV C6618106338 DADS DEPOSIT,1774.16,Transfers out,,29 Jun 26',
  '25 Jun 26,-169.22,562557409,,TRANSFER DEBIT,INTERNET BPAY GLOBIRD ENERGY 305224677,1824.16,Utilities,Globird Energy,25 Jun 26',
  '25 Jun 26,-363.65,562557409,,TRANSFER DEBIT,INTERNET BPAY SOUTH EAST WATER 100321306900007,1993.38,Utilities,South East Water,25 Jun 26',
  '23 Jun 26,174.26,562557409,,INTER-BANK CREDIT,260623.01.00045565 DGS REGO REBATE Rajeev Raman,2533.08,Transfers in,,23 Jun 26'
];

const MACQUARIE_SAMPLE = [
  'Transaction Date,Details,Account,Category,Subcategory,Tags,Notes,Debit,Credit,Balance,Original Description',
  '"12 Jul 2026","Amazon","Macquarie Platinum Card","Personal","Other Personal Expenses","","","60","","","AMAZON MARKETPLACE AU +61866216107"',
  '"09 Jul 2026","Microsoft#g170348761 Msbill.info","Macquarie Platinum Card","Technology","Hardware","","","7.65","","","MICROSOFT#G170348761 MSBILL.INFO"',
  '"04 Jul 2026","KFC","Macquarie Platinum Card","Food & Drink","Fast Food","","","49.95","","","KFC Berwick South Berwick South"',
  '"03 Jul 2026","Hannover Re Life Insurance","Macquarie Platinum Card","Insurance","Financial Insurance","","","56.53","","","HANNOVER LIFE SYDNEY"',
  '"02 Jul 2026","Kmart (Casey Central Shopping Centre)","Macquarie Platinum Card","Personal","Other Personal Expenses","","","22","","","KMART 1361 NARRE WRE S"',
  '"01 Jul 2026","Amazon Web Services","Macquarie Platinum Card","Business","Services","","","1.52","","","AMAZON WEB SERVICES SYDNEY"',
  '"30 Jun 2026","7-Eleven","Macquarie Platinum Card","Transportation","Fuel","","","60.39","","","7 ELEVEN 1306 NARRE WARREN"'
];

describe('parseDate — real formats used by NAB and Macquarie', () => {
  test('parses NAB-style "DD Mon YY" (2-digit year)', () => {
    assert.equal(parseDate('29 Jun 26'), '2026-06-29');
  });

  test('parses Macquarie-style "DD Mon YYYY" (4-digit year)', () => {
    assert.equal(parseDate('12 Jul 2026'), '2026-07-12');
  });

  test('regression: also parses the hyphen-separated form ("29-Jun-26"), the literal format in the original real sample files', () => {
    assert.equal(parseDate('29-Jun-26'), '2026-06-29');
    assert.equal(parseDate('12-Jul-26'), '2026-07-12');
  });
});

describe('ANZ real sample data', () => {
  test('parses every row (all 9 transactions)', () => {
    const txs = parseANZ(ANZ_SAMPLE);
    assert.equal(txs.length, 9);
  });

  test('a salary credit is parsed as positive income with the correct amount', () => {
    const txs = parseANZ(ANZ_SAMPLE);
    const salary = txs.find(t => t.date === '2026-07-08');
    assert.equal(salary.amount, 1771.42);
    assert.equal(salary.type, 'income');
  });

  test('a BPAY debit is parsed as a negative expense with the correct amount', () => {
    const txs = parseANZ(ANZ_SAMPLE);
    const bpay = txs.find(t => t.date === '2026-07-07' && t.amount < 0);
    assert.equal(bpay.amount, -705);
    assert.equal(bpay.type, 'expense');
  });

  test('heavy internal whitespace padding in the description is collapsed for display', () => {
    const txs = parseANZ(ANZ_SAMPLE);
    const bpay = txs.find(t => t.date === '2026-07-07' && t.amount < 0);
    assert.ok(!bpay.description.includes('  '), `expected no double-spaces, got: "${bpay.description}"`);
    assert.ok(bpay.description.includes('SROVIC LAND TAX'));
  });

  test('the merchant/description still allows matching a recognizable keyword for category/logo lookups', () => {
    const txs = parseANZ(ANZ_SAMPLE);
    const payment = txs.find(t => t.description.includes('rajeev raman'));
    assert.ok(payment, 'expected to find the payment-to-rajeev-raman transaction');
  });
});

describe('ANZ auto-detection (headerless format)', () => {
  test('looksLikeHeaderlessANZFormat recognizes the real first line', () => {
    assert.equal(looksLikeHeaderlessANZFormat(ANZ_SAMPLE[0]), true);
  });

  test('does not falsely match a NAB or Macquarie header line', () => {
    assert.equal(looksLikeHeaderlessANZFormat(NAB_SAMPLE[0]), false);
    assert.equal(looksLikeHeaderlessANZFormat(MACQUARIE_SAMPLE[0]), false);
  });

  test('does not falsely match a completely unrelated line', () => {
    assert.equal(looksLikeHeaderlessANZFormat('Date,Description,Amount'), false);
    assert.equal(looksLikeHeaderlessANZFormat(''), false);
  });

  test('regression: also matches when the amount is NOT quoted (some exporters only quote fields containing commas)', () => {
    assert.equal(looksLikeHeaderlessANZFormat('08/07/2026,1771.42,PAY/SALARY FROM DEPARTMENT OF ED 10690383'), true);
    assert.equal(looksLikeHeaderlessANZFormat('07/07/2026,-705.00,ANZ INTERNET BANKING BPAY SROVIC LAND TAX'), true);
  });
});

describe('NAB real sample data', () => {
  test('parses every row (all 4 transactions)', () => {
    const txs = parseNAB(NAB_SAMPLE);
    assert.equal(txs.length, 4);
  });

  test('prefers the Merchant Name column when present', () => {
    const txs = parseNAB(NAB_SAMPLE);
    const globird = txs.find(t => t.amount === -169.22);
    assert.equal(globird.description, 'Globird Energy');
    assert.equal(globird.bankCategory, 'Utilities');
  });

  test('falls back to Transaction Details when Merchant Name is blank', () => {
    const txs = parseNAB(NAB_SAMPLE);
    const transfer = txs.find(t => t.amount === -50);
    assert.ok(transfer.description.includes('KRITHIK RAJEEV'));
    assert.equal(transfer.bankCategory, 'Transfers out');
  });

  test('a credit transaction is parsed as positive income', () => {
    const txs = parseNAB(NAB_SAMPLE);
    const rebate = txs.find(t => t.amount === 174.26);
    assert.equal(rebate.type, 'income');
    assert.equal(rebate.bankCategory, 'Transfers in');
  });

  test('date "29 Jun 26" parses to the correct ISO date', () => {
    const txs = parseNAB(NAB_SAMPLE);
    assert.equal(txs[0].date, '2026-06-29');
  });
});

describe('NAB auto-detection (header-based)', () => {
  test('detectBankFormat recognizes the real NAB header', () => {
    const result = detectBankFormat(NAB_SAMPLE[0]);
    assert.ok(result, 'expected NAB header to be detected');
    assert.equal(result.bankId, 'nab');
  });
});

describe('Macquarie real sample data', () => {
  test('parses every row (all 7 transactions)', () => {
    const txs = parseMacquarie(MACQUARIE_SAMPLE);
    assert.equal(txs.length, 7);
  });

  test('uses the clean "Details" column as the description, not the raw Original Description', () => {
    const txs = parseMacquarie(MACQUARIE_SAMPLE);
    const kmart = txs.find(t => t.amount === -22);
    assert.equal(kmart.description, 'Kmart (Casey Central Shopping Centre)');
  });

  test('debit amounts are negative expenses', () => {
    const txs = parseMacquarie(MACQUARIE_SAMPLE);
    const kfc = txs.find(t => t.description === 'KFC');
    assert.equal(kfc.amount, -49.95);
    assert.equal(kfc.type, 'expense');
  });

  test('captures the bank category', () => {
    const txs = parseMacquarie(MACQUARIE_SAMPLE);
    const kfc = txs.find(t => t.description === 'KFC');
    assert.equal(kfc.bankCategory, 'Food & Drink');
  });

  test('date "12 Jul 2026" parses to the correct ISO date', () => {
    const txs = parseMacquarie(MACQUARIE_SAMPLE);
    assert.equal(txs[0].date, '2026-07-12');
  });

  test('the clean Details column means merchant/logo matching works well (e.g. "7-Eleven", "KFC")', () => {
    const txs = parseMacquarie(MACQUARIE_SAMPLE);
    const sevenEleven = txs.find(t => t.description === '7-Eleven');
    assert.ok(sevenEleven);
    assert.ok(sevenEleven.merchant.includes('eleven') || sevenEleven.cleanDescription.includes('eleven'));
  });
});

describe('Macquarie auto-detection (header-based, already worked, verify still does)', () => {
  test('detectBankFormat recognizes the real Macquarie header', () => {
    const result = detectBankFormat(MACQUARIE_SAMPLE[0]);
    assert.ok(result, 'expected Macquarie header to be detected');
    assert.equal(result.bankId, 'macquarie');
  });
});
