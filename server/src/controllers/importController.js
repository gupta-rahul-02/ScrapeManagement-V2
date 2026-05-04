import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import Vendor from '../models/Vendor.js';
import Buyer from '../models/Buyer.js';
import ScrapCategory from '../models/ScrapCategory.js';
import Godown from '../models/Godown.js';
import Truck from '../models/Truck.js';
import Purchase from '../models/Purchase.js';
import Sale from '../models/Sale.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import GodownStock from '../models/GodownStock.js';
import LedgerEntry from '../models/LedgerEntry.js';
import AccountBalance from '../models/AccountBalance.js';
import { logAudit } from '../utils/audit.js';

// CSV template content for each entity
const TEMPLATES = {
  vendors: `name,phone,address,openingBalance
Ramesh Kumar,9876543210,Delhi Market,5000
Suresh Trading,,Faridabad,0`,

  buyers: `name,phone,address,gstNo,openingBalance
ABC Metals Pvt Ltd,9876543211,Mumbai,27AAPFU0939F1ZV,10000
XYZ Industries,9876543212,Pune,,0`,

  categories: `name,unit,description
Iron Scrap,kg,Mixed iron and steel scrap
Copper Wire,kg,Copper wire and fittings
Aluminium,ton,Aluminium sheets and rods`,

  godowns: `name,location,capacity
Main Godown,Delhi,5000
North Godown,Faridabad,2000`,

  trucks: `truckNumber,driverName,driverPhone,capacity
DL01AB1234,Ramesh Singh,9876543210,5000
HR55CD5678,Suresh Kumar,9876543213,8000`,

  purchases: `date,vendorName,godownName,categoryName,weight,rate,notes
2024-01-15,Ramesh Kumar,Main Godown,Iron Scrap,500,25,Morning purchase
2024-01-16,Suresh Trading,Main Godown,Copper Wire,100,450,`,

  sales: `date,buyerName,godownName,categoryName,weight,rate,notes
2024-01-20,ABC Metals Pvt Ltd,Main Godown,Iron Scrap,400,30,
2024-01-21,XYZ Industries,Main Godown,Copper Wire,80,500,`,

  payments: `date,type,partyType,partyName,amount,mode,reference,notes
2024-01-16,out,Vendor,Ramesh Kumar,10000,cash,,Advance payment
2024-01-21,in,Buyer,ABC Metals Pvt Ltd,12000,bank_transfer,TXN123456,`,

  expenses: `date,expenseCategoryName,description,amount,mode,reference,notes
2024-01-15,Transport,Truck rental for north godown,2000,cash,,
2024-01-18,Labour,Loading charges,1500,upi,UPI123,`,
};

// Return CSV template as a downloadable file
export const getTemplate = (req, res) => {
  const { entity } = req.params;
  const csv = TEMPLATES[entity];
  if (!csv) return res.status(400).json({ message: `No template for entity: ${entity}` });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${entity}_import_template.csv"`);
  res.send(csv);
};

// Convert an ExcelJS cell value to a plain string
function cellValue(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().split('T')[0];
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((r) => r.text).join('');
    if (v.result !== undefined) return String(v.result);
    if (v.text !== undefined) return String(v.text);
    return String(v);
  }
  return String(v).trim();
}

// Case-insensitive cell access
function getCell(row, key) {
  const lkey = key.toLowerCase();
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === lkey) return row[k];
  }
  return '';
}

// Parse CSV or XLSX buffer into an array of row objects
async function parseFile(buffer, originalname) {
  const workbook = new ExcelJS.Workbook();
  const ext = (originalname.split('.').pop() || '').toLowerCase();
  let worksheet;

  if (ext === 'xlsx' || ext === 'xls') {
    await workbook.xlsx.load(buffer);
    worksheet = workbook.worksheets[0];
  } else {
    worksheet = await workbook.csv.read(Readable.from(buffer));
  }

  if (!worksheet) throw new Error('File appears to be empty');

  const rows = [];
  let headers = [];

  worksheet.eachRow((row, rowNumber) => {
    const values = row.values.slice(1); // row.values is 1-indexed; slice off null at [0]
    if (rowNumber === 1) {
      headers = values.map((v) => cellValue(v).toLowerCase().trim());
    } else {
      if (values.every((v) => !cellValue(v).trim())) return; // skip blank rows
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = cellValue(values[i]);
      });
      rows.push(obj);
    }
  });

  return rows;
}

// Main import handler — POST /api/import/:entity
export const importData = async (req, res, next) => {
  const { entity } = req.params;
  const validEntities = ['vendors', 'buyers', 'categories', 'godowns', 'trucks', 'purchases', 'sales', 'payments', 'expenses'];

  if (!validEntities.includes(entity)) {
    return res.status(400).json({ message: `Unknown entity: ${entity}` });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  let rows;
  try {
    rows = await parseFile(req.file.buffer, req.file.originalname);
  } catch (err) {
    return res.status(400).json({ message: `Failed to parse file: ${err.message}` });
  }

  if (rows.length === 0) {
    return res.status(400).json({ message: 'File contains no data rows' });
  }

  const result = { inserted: 0, skipped: 0, errors: [] };
  const userId = req.user._id;

  const handlers = {
    vendors: importVendors,
    buyers: importBuyers,
    categories: importCategories,
    godowns: importGodowns,
    trucks: importTrucks,
    purchases: importPurchases,
    sales: importSales,
    payments: importPayments,
    expenses: importExpenses,
  };

  try {
    await handlers[entity](rows, userId, result);
  } catch (err) {
    return next(err);
  }

  logAudit({
    req,
    action: 'create',
    module: 'Settings',
    description: `Imported ${result.inserted} ${entity} (${result.skipped} skipped, ${result.errors.length} errors)`,
    metadata: { entity, inserted: result.inserted, skipped: result.skipped, errorCount: result.errors.length },
  });

  res.json(result);
};

// ─────────────────────────────────────────────
// Master-data importers (upsert-skip on conflict)
// ─────────────────────────────────────────────

async function importVendors(rows, userId, result) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const name = getCell(row, 'name');
    if (!name) { result.errors.push({ row: rowNum, message: 'name is required' }); continue; }
    try {
      const existing = await Vendor.findOne({ name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } });
      if (existing) { result.skipped++; continue; }
      const openingBalance = parseFloat(getCell(row, 'openingbalance')) || 0;
      await Vendor.create({
        name,
        phone: getCell(row, 'phone') || undefined,
        address: getCell(row, 'address') || undefined,
        openingBalance,
        currentBalance: openingBalance,
      });
      result.inserted++;
    } catch (err) {
      result.errors.push({ row: rowNum, message: err.message });
    }
  }
}

async function importBuyers(rows, userId, result) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const name = getCell(row, 'name');
    if (!name) { result.errors.push({ row: rowNum, message: 'name is required' }); continue; }
    try {
      const existing = await Buyer.findOne({ name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } });
      if (existing) { result.skipped++; continue; }
      const openingBalance = parseFloat(getCell(row, 'openingbalance')) || 0;
      await Buyer.create({
        name,
        phone: getCell(row, 'phone') || undefined,
        address: getCell(row, 'address') || undefined,
        gstNo: getCell(row, 'gstno') || undefined,
        openingBalance,
        currentBalance: openingBalance,
      });
      result.inserted++;
    } catch (err) {
      result.errors.push({ row: rowNum, message: err.message });
    }
  }
}

async function importCategories(rows, userId, result) {
  const validUnits = ['kg', 'ton', 'quintal'];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const name = getCell(row, 'name');
    if (!name) { result.errors.push({ row: rowNum, message: 'name is required' }); continue; }
    try {
      const existing = await ScrapCategory.findOne({ name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } });
      if (existing) { result.skipped++; continue; }
      let unit = getCell(row, 'unit') || 'kg';
      if (!validUnits.includes(unit.toLowerCase())) unit = 'kg';
      await ScrapCategory.create({
        name,
        unit: unit.toLowerCase(),
        description: getCell(row, 'description') || undefined,
      });
      result.inserted++;
    } catch (err) {
      result.errors.push({ row: rowNum, message: err.message });
    }
  }
}

async function importGodowns(rows, userId, result) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const name = getCell(row, 'name');
    if (!name) { result.errors.push({ row: rowNum, message: 'name is required' }); continue; }
    try {
      const existing = await Godown.findOne({ name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } });
      if (existing) { result.skipped++; continue; }
      await Godown.create({
        name,
        location: getCell(row, 'location') || undefined,
        capacity: parseFloat(getCell(row, 'capacity')) || 0,
      });
      result.inserted++;
    } catch (err) {
      result.errors.push({ row: rowNum, message: err.message });
    }
  }
}

async function importTrucks(rows, userId, result) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const truckNumber = (getCell(row, 'trucknumber') || '').toUpperCase();
    if (!truckNumber) { result.errors.push({ row: rowNum, message: 'truckNumber is required' }); continue; }
    try {
      const existing = await Truck.findOne({ truckNumber });
      if (existing) { result.skipped++; continue; }
      await Truck.create({
        truckNumber,
        driverName: getCell(row, 'drivername') || undefined,
        driverPhone: getCell(row, 'driverphone') || undefined,
        capacity: parseFloat(getCell(row, 'capacity')) || 0,
      });
      result.inserted++;
    } catch (err) {
      result.errors.push({ row: rowNum, message: err.message });
    }
  }
}

// ─────────────────────────────────────────────
// Transaction importers (full ledger side-effects)
// Rows are processed sequentially to maintain correct running balances.
// ─────────────────────────────────────────────

async function importPurchases(rows, userId, result) {
  const [vendors, godowns, categories] = await Promise.all([
    Vendor.find({}, 'name _id openingBalance').lean(),
    Godown.find({}, 'name _id').lean(),
    ScrapCategory.find({}, 'name _id').lean(),
  ]);
  const vendorMap = new Map(vendors.map((v) => [v.name.toLowerCase(), v]));
  const godownMap = new Map(godowns.map((g) => [g.name.toLowerCase(), g]));
  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const vendorName = getCell(row, 'vendorname');
    const godownName = getCell(row, 'godownname');
    const categoryName = getCell(row, 'categoryname');
    const weight = parseFloat(getCell(row, 'weight'));
    const rate = parseFloat(getCell(row, 'rate'));

    if (!vendorName || !godownName || !categoryName || isNaN(weight) || isNaN(rate)) {
      result.errors.push({ row: rowNum, message: 'vendorName, godownName, categoryName, weight, rate are required' });
      continue;
    }

    const vendor = vendorMap.get(vendorName.toLowerCase());
    const godown = godownMap.get(godownName.toLowerCase());
    const category = categoryMap.get(categoryName.toLowerCase());

    if (!vendor) { result.errors.push({ row: rowNum, message: `Vendor not found: "${vendorName}"` }); continue; }
    if (!godown) { result.errors.push({ row: rowNum, message: `Godown not found: "${godownName}"` }); continue; }
    if (!category) { result.errors.push({ row: rowNum, message: `Category not found: "${categoryName}"` }); continue; }

    const totalAmount = Math.round(weight * rate * 100) / 100;
    const date = parseDate(getCell(row, 'date'));
    if (!date) { result.errors.push({ row: rowNum, message: `Invalid date: "${getCell(row, 'date')}"` }); continue; }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const purchase = await Purchase.create([{
        vendor: vendor._id,
        godown: godown._id,
        items: [{ category: category._id, weight, rate, amount: totalAmount }],
        totalWeight: weight,
        totalAmount,
        notes: getCell(row, 'notes') || undefined,
        date,
        createdBy: userId,
      }], { session });

      // Update godown stock
      await GodownStock.findOneAndUpdate(
        { godown: godown._id, category: category._id },
        { $inc: { currentWeight: weight }, $set: { lastUpdated: new Date() } },
        { upsert: true, session }
      );

      // Update vendor balance (money owed to vendor increases)
      await Vendor.findByIdAndUpdate(vendor._id, { $inc: { currentBalance: totalAmount } }, { session });

      // Ledger entries (double-entry)
      const txId = randomUUID();
      const lastVendorEntry = await LedgerEntry.findOne({ accountType: 'Vendor', accountId: vendor._id })
        .sort({ date: -1, createdAt: -1 }).session(session);
      const prevVendorBalance = lastVendorEntry
        ? lastVendorEntry.runningBalance
        : (vendor.openingBalance || 0);

      await LedgerEntry.create([
        {
          transactionId: txId, accountType: 'Purchases', accountId: null,
          entryType: 'purchase', refModel: 'Purchase', refId: purchase[0]._id,
          debit: totalAmount, credit: 0, runningBalance: 0,
          description: `Purchase (imported) - ${weight} kg`, date, createdBy: userId,
        },
        {
          transactionId: txId, accountType: 'Vendor', accountId: vendor._id,
          entryType: 'purchase', refModel: 'Purchase', refId: purchase[0]._id,
          debit: 0, credit: totalAmount, runningBalance: prevVendorBalance + totalAmount,
          description: `Purchase (imported) - ${weight} kg`, date, createdBy: userId,
        },
      ], { session, ordered: true });

      await session.commitTransaction();
      result.inserted++;
    } catch (err) {
      await session.abortTransaction();
      result.errors.push({ row: rowNum, message: err.message });
    } finally {
      session.endSession();
    }
  }
}

async function importSales(rows, userId, result) {
  const [buyers, godowns, categories] = await Promise.all([
    Buyer.find({}, 'name _id openingBalance').lean(),
    Godown.find({}, 'name _id').lean(),
    ScrapCategory.find({}, 'name _id').lean(),
  ]);
  const buyerMap = new Map(buyers.map((b) => [b.name.toLowerCase(), b]));
  const godownMap = new Map(godowns.map((g) => [g.name.toLowerCase(), g]));
  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const buyerName = getCell(row, 'buyername');
    const godownName = getCell(row, 'godownname');
    const categoryName = getCell(row, 'categoryname');
    const weight = parseFloat(getCell(row, 'weight'));
    const rate = parseFloat(getCell(row, 'rate'));

    if (!buyerName || !godownName || !categoryName || isNaN(weight) || isNaN(rate)) {
      result.errors.push({ row: rowNum, message: 'buyerName, godownName, categoryName, weight, rate are required' });
      continue;
    }

    const buyer = buyerMap.get(buyerName.toLowerCase());
    const godown = godownMap.get(godownName.toLowerCase());
    const category = categoryMap.get(categoryName.toLowerCase());

    if (!buyer) { result.errors.push({ row: rowNum, message: `Buyer not found: "${buyerName}"` }); continue; }
    if (!godown) { result.errors.push({ row: rowNum, message: `Godown not found: "${godownName}"` }); continue; }
    if (!category) { result.errors.push({ row: rowNum, message: `Category not found: "${categoryName}"` }); continue; }

    const totalAmount = Math.round(weight * rate * 100) / 100;
    const date = parseDate(getCell(row, 'date'));
    if (!date) { result.errors.push({ row: rowNum, message: `Invalid date: "${getCell(row, 'date')}"` }); continue; }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const sale = await Sale.create([{
        buyer: buyer._id,
        godown: godown._id,
        items: [{ category: category._id, weight, rate, amount: totalAmount }],
        totalWeight: weight,
        totalAmount,
        notes: getCell(row, 'notes') || undefined,
        date,
        createdBy: userId,
      }], { session });

      // Update godown stock (allow negative via overSold — matching existing sale logic)
      const stock = await GodownStock.findOne({ godown: godown._id, category: category._id }).session(session);
      const available = stock?.currentWeight || 0;
      const excess = Math.max(0, weight - available);
      const deduction = Math.min(weight, available);
      if (stock) {
        stock.currentWeight = available - deduction;
        stock.overSold = (stock.overSold || 0) + excess;
        stock.lastUpdated = new Date();
        await stock.save({ session });
      } else {
        await GodownStock.create(
          [{ godown: godown._id, category: category._id, currentWeight: 0, overSold: weight, lastUpdated: new Date() }],
          { session }
        );
      }

      // Update buyer balance (buyer owes more)
      await Buyer.findByIdAndUpdate(buyer._id, { $inc: { currentBalance: totalAmount } }, { session });

      // Ledger entries
      const txId = randomUUID();
      const lastBuyerEntry = await LedgerEntry.findOne({ accountType: 'Buyer', accountId: buyer._id })
        .sort({ date: -1, createdAt: -1 }).session(session);
      const prevBuyerBalance = lastBuyerEntry
        ? lastBuyerEntry.runningBalance
        : (buyer.openingBalance || 0);

      await LedgerEntry.create([
        {
          transactionId: txId, accountType: 'Buyer', accountId: buyer._id,
          entryType: 'sale', refModel: 'Sale', refId: sale[0]._id,
          debit: totalAmount, credit: 0, runningBalance: prevBuyerBalance + totalAmount,
          description: `Sale (imported) - ${weight} kg`, date, createdBy: userId,
        },
        {
          transactionId: txId, accountType: 'Sales', accountId: null,
          entryType: 'sale', refModel: 'Sale', refId: sale[0]._id,
          debit: 0, credit: totalAmount, runningBalance: 0,
          description: `Sale (imported) - ${weight} kg`, date, createdBy: userId,
        },
      ], { session, ordered: true });

      await session.commitTransaction();
      result.inserted++;
    } catch (err) {
      await session.abortTransaction();
      result.errors.push({ row: rowNum, message: err.message });
    } finally {
      session.endSession();
    }
  }
}

async function importPayments(rows, userId, result) {
  const [vendors, buyers] = await Promise.all([
    Vendor.find({}, 'name _id openingBalance').lean(),
    Buyer.find({}, 'name _id openingBalance').lean(),
  ]);
  const vendorMap = new Map(vendors.map((v) => [v.name.toLowerCase(), v]));
  const buyerMap = new Map(buyers.map((b) => [b.name.toLowerCase(), b]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const type = getCell(row, 'type').toLowerCase();
    const partyType = getCell(row, 'partytype');
    const partyName = getCell(row, 'partyname');
    const amount = parseFloat(getCell(row, 'amount'));
    const mode = getCell(row, 'mode').toLowerCase();

    if (!['in', 'out'].includes(type)) {
      result.errors.push({ row: rowNum, message: 'type must be "in" or "out"' }); continue;
    }
    if (!['Vendor', 'Buyer'].includes(partyType)) {
      result.errors.push({ row: rowNum, message: 'partyType must be "Vendor" or "Buyer"' }); continue;
    }
    if (!partyName) { result.errors.push({ row: rowNum, message: 'partyName is required' }); continue; }
    if (isNaN(amount) || amount <= 0) {
      result.errors.push({ row: rowNum, message: 'amount must be a positive number' }); continue;
    }
    if (!['cash', 'bank_transfer', 'upi'].includes(mode)) {
      result.errors.push({ row: rowNum, message: 'mode must be cash, bank_transfer, or upi' }); continue;
    }

    const partyMap = partyType === 'Vendor' ? vendorMap : buyerMap;
    const party = partyMap.get(partyName.toLowerCase());
    if (!party) { result.errors.push({ row: rowNum, message: `${partyType} not found: "${partyName}"` }); continue; }

    const date = parseDate(getCell(row, 'date'));
    if (!date) { result.errors.push({ row: rowNum, message: `Invalid date: "${getCell(row, 'date')}"` }); continue; }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const reference = getCell(row, 'reference') || undefined;
      const notes = getCell(row, 'notes') || undefined;

      const payment = await Payment.create([{
        type, partyType, partyId: party._id, amount, mode,
        reference, notes, date, createdBy: userId,
      }], { session });

      // Update party balance (payment reduces what is owed)
      const PartyModel = partyType === 'Vendor' ? Vendor : Buyer;
      await PartyModel.findByIdAndUpdate(party._id, { $inc: { currentBalance: -amount } }, { session });

      const modeToAccount = { cash: 'Cash', bank_transfer: 'Bank', upi: 'UPI' };
      const cashAccount = modeToAccount[mode] || 'Cash';
      const txId = randomUUID();
      const desc = `Payment ${type} - ${mode}${reference ? ' (' + reference + ')' : ''}`;

      const lastPartyEntry = await LedgerEntry.findOne({ accountType: partyType, accountId: party._id })
        .sort({ date: -1, createdAt: -1 }).session(session);
      const prevPartyBalance = lastPartyEntry
        ? lastPartyEntry.runningBalance
        : (party.openingBalance || 0);

      const lastCashEntry = await LedgerEntry.findOne({ accountType: cashAccount, accountId: null })
        .sort({ date: -1, createdAt: -1 }).session(session);
      let prevCashBalance = lastCashEntry?.runningBalance || 0;
      if (!lastCashEntry) {
        const acctBal = await AccountBalance.findOne({ accountType: cashAccount });
        prevCashBalance = acctBal?.openingBalance || 0;
      }

      const entries = partyType === 'Vendor'
        ? [
            { transactionId: txId, accountType: 'Vendor', accountId: party._id, entryType: 'payment_out', refModel: 'Payment', refId: payment[0]._id, debit: amount, credit: 0, runningBalance: prevPartyBalance - amount, description: desc, date, createdBy: userId },
            { transactionId: txId, accountType: cashAccount, accountId: null, entryType: 'payment_out', refModel: 'Payment', refId: payment[0]._id, debit: 0, credit: amount, runningBalance: prevCashBalance - amount, description: desc, date, createdBy: userId },
          ]
        : [
            { transactionId: txId, accountType: cashAccount, accountId: null, entryType: 'payment_in', refModel: 'Payment', refId: payment[0]._id, debit: amount, credit: 0, runningBalance: prevCashBalance + amount, description: desc, date, createdBy: userId },
            { transactionId: txId, accountType: 'Buyer', accountId: party._id, entryType: 'payment_in', refModel: 'Payment', refId: payment[0]._id, debit: 0, credit: amount, runningBalance: prevPartyBalance - amount, description: desc, date, createdBy: userId },
          ];

      await LedgerEntry.create(entries, { session, ordered: true });
      await session.commitTransaction();
      result.inserted++;
    } catch (err) {
      await session.abortTransaction();
      result.errors.push({ row: rowNum, message: err.message });
    } finally {
      session.endSession();
    }
  }
}

async function importExpenses(rows, userId, result) {
  const expenseCategories = await ExpenseCategory.find({}, 'name _id').lean();
  const categoryMap = new Map(expenseCategories.map((c) => [c.name.toLowerCase(), c]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const categoryName = getCell(row, 'expensecategoryname') || getCell(row, 'categoryname');
    const description = getCell(row, 'description');
    const amount = parseFloat(getCell(row, 'amount'));
    const mode = getCell(row, 'mode').toLowerCase();

    if (!categoryName) { result.errors.push({ row: rowNum, message: 'expenseCategoryName is required' }); continue; }
    if (!description) { result.errors.push({ row: rowNum, message: 'description is required' }); continue; }
    if (isNaN(amount) || amount <= 0) { result.errors.push({ row: rowNum, message: 'amount must be a positive number' }); continue; }
    if (!['cash', 'bank_transfer', 'upi'].includes(mode)) { result.errors.push({ row: rowNum, message: 'mode must be cash, bank_transfer, or upi' }); continue; }

    const category = categoryMap.get(categoryName.toLowerCase());
    if (!category) {
      result.errors.push({ row: rowNum, message: `Expense category not found: "${categoryName}". Create it first in the Expenses module.` });
      continue;
    }

    const date = parseDate(getCell(row, 'date'));
    if (!date) { result.errors.push({ row: rowNum, message: `Invalid date: "${getCell(row, 'date')}"` }); continue; }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const reference = getCell(row, 'reference') || undefined;
      const notes = getCell(row, 'notes') || undefined;

      const expense = await Expense.create([{
        category: category._id, description, amount, mode,
        reference, notes, date, createdBy: userId,
      }], { session });

      const txId = randomUUID();
      const modeToAccount = { cash: 'Cash', bank_transfer: 'Bank', upi: 'UPI' };
      const cashAccount = modeToAccount[mode] || 'Cash';
      const desc = `Expense: ${description}${reference ? ' (' + reference + ')' : ''}`;

      const lastExpenseEntry = await LedgerEntry.findOne({ accountType: 'Expense', accountId: category._id })
        .sort({ date: -1, createdAt: -1 }).session(session);
      const expenseBalance = lastExpenseEntry?.runningBalance || 0;

      const lastCashEntry = await LedgerEntry.findOne({ accountType: cashAccount, accountId: null })
        .sort({ date: -1, createdAt: -1 }).session(session);
      let cashBalance = lastCashEntry?.runningBalance || 0;
      if (!lastCashEntry) {
        const acctBal = await AccountBalance.findOne({ accountType: cashAccount });
        cashBalance = acctBal?.openingBalance || 0;
      }

      await LedgerEntry.create([
        { transactionId: txId, accountType: 'Expense', accountId: category._id, entryType: 'expense', refModel: 'Expense', refId: expense[0]._id, debit: amount, credit: 0, runningBalance: expenseBalance + amount, description: desc, date, createdBy: userId },
        { transactionId: txId, accountType: cashAccount, accountId: null, entryType: 'expense', refModel: 'Expense', refId: expense[0]._id, debit: 0, credit: amount, runningBalance: cashBalance - amount, description: desc, date, createdBy: userId },
      ], { session, ordered: true });

      await session.commitTransaction();
      result.inserted++;
    } catch (err) {
      await session.abortTransaction();
      result.errors.push({ row: rowNum, message: err.message });
    } finally {
      session.endSession();
    }
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function parseDate(val) {
  if (!val || !String(val).trim()) return new Date(); // default to now if blank
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
