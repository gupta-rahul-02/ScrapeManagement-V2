import ExcelJS from 'exceljs';
import Vendor from '../models/Vendor.js';
import Buyer from '../models/Buyer.js';
import ScrapCategory from '../models/ScrapCategory.js';
import Godown from '../models/Godown.js';
import Truck from '../models/Truck.js';
import Purchase from '../models/Purchase.js';
import Sale from '../models/Sale.js';
import Challan from '../models/Challan.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import LedgerEntry from '../models/LedgerEntry.js';
import GodownStock from '../models/GodownStock.js';
import AccountBalance from '../models/AccountBalance.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

const COLLECTIONS = [
  { name: 'vendors', model: Vendor },
  { name: 'buyers', model: Buyer },
  { name: 'categories', model: ScrapCategory },
  { name: 'godowns', model: Godown },
  { name: 'trucks', model: Truck },
  { name: 'purchases', model: Purchase },
  { name: 'sales', model: Sale },
  { name: 'challans', model: Challan },
  { name: 'payments', model: Payment },
  { name: 'expenses', model: Expense },
  { name: 'expenseCategories', model: ExpenseCategory },
  { name: 'ledgerEntries', model: LedgerEntry },
  { name: 'godownStocks', model: GodownStock },
  { name: 'accountBalances', model: AccountBalance },
  { name: 'users', model: User },
  { name: 'auditLogs', model: AuditLog },
];

/**
 * Generate a full JSON backup of all collections.
 * User passwords are kept as hashes (no plaintext).
 */
export async function generateBackup() {
  const data = {};
  const counts = {};

  for (const { name, model } of COLLECTIONS) {
    const docs = await model.find().lean();
    data[name] = docs;
    counts[name] = docs.length;
  }

  return {
    metadata: {
      createdAt: new Date().toISOString(),
      version: '2.0',
      collections: Object.keys(data),
      counts,
      totalDocuments: Object.values(counts).reduce((s, n) => s + n, 0),
    },
    data,
  };
}

/**
 * Generate an Excel workbook from backup data.
 * One sheet per collection, columns derived from first document's keys.
 */
export async function generateExcelBackup(backupData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Scrap Management Backup';
  workbook.created = new Date();

  for (const [collectionName, docs] of Object.entries(backupData.data)) {
    const sheet = workbook.addWorksheet(collectionName);

    if (docs.length === 0) {
      sheet.addRow(['No data']);
      continue;
    }

    // Collect all unique keys across all docs
    const keySet = new Set();
    docs.forEach((doc) => Object.keys(doc).forEach((k) => keySet.add(k)));
    const keys = Array.from(keySet);

    // Header row
    sheet.addRow(keys);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Data rows
    for (const doc of docs) {
      const row = keys.map((k) => {
        const val = doc[k];
        if (val === null || val === undefined) return '';
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
      });
      sheet.addRow(row);
    }

    // Auto-width columns (cap at 40)
    sheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell((cell) => {
        const len = String(cell.value || '').length;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 2, 40);
    });
  }

  return workbook.xlsx.writeBuffer();
}

/**
 * Validate a backup JSON structure before restore.
 */
export function validateBackupJSON(backup) {
  if (!backup || typeof backup !== 'object') return 'Invalid JSON structure';
  if (!backup.metadata || !backup.data) return 'Missing metadata or data';
  if (!Array.isArray(backup.metadata.collections)) return 'Missing collections list';

  const validNames = COLLECTIONS.map((c) => c.name);
  const unknown = backup.metadata.collections.filter((c) => !validNames.includes(c));
  if (unknown.length > 0) return `Unknown collections: ${unknown.join(', ')}`;

  return null; // valid
}

/**
 * Restore database from a backup JSON object.
 * Drops and re-inserts each collection.
 */
export async function restoreFromBackup(backup) {
  const results = {};

  for (const { name, model } of COLLECTIONS) {
    const docs = backup.data[name];
    if (!docs || !Array.isArray(docs)) {
      results[name] = { status: 'skipped', reason: 'not in backup' };
      continue;
    }

    // Drop existing data
    await model.deleteMany({});

    if (docs.length > 0) {
      // Insert in batches of 500
      const batchSize = 500;
      let inserted = 0;
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize);
        await model.insertMany(batch, { ordered: false });
        inserted += batch.length;
      }
      results[name] = { status: 'restored', count: inserted };
    } else {
      results[name] = { status: 'restored', count: 0 };
    }
  }

  return results;
}

export { COLLECTIONS };
