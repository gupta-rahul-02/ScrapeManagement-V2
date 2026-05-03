import ExcelJS from 'exceljs';
import LedgerEntry from '../models/LedgerEntry.js';
import Vendor from '../models/Vendor.js';
import Buyer from '../models/Buyer.js';

// ── Master Ledger ─────────────────────────────────────────────────────────────
export const getMasterLedger = async (req, res, next) => {
  try {
    const { accountType, startDate, endDate, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (accountType) filter.accountType = accountType;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate)   filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total] = await Promise.all([
      LedgerEntry.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LedgerEntry.countDocuments(filter),
    ]);

    // Attach party names for Vendor / Buyer entries
    const vendorIds  = [...new Set(entries.filter(e => e.accountType === 'Vendor').map(e => String(e.accountId)))];
    const buyerIds   = [...new Set(entries.filter(e => e.accountType === 'Buyer').map(e => String(e.accountId)))];

    const [vendors, buyers] = await Promise.all([
      vendorIds.length ? Vendor.find({ _id: { $in: vendorIds } }).select('name').lean() : [],
      buyerIds.length  ? Buyer.find({ _id: { $in: buyerIds } }).select('name').lean()   : [],
    ]);

    const nameMap = {};
    [...vendors, ...buyers].forEach(p => { nameMap[String(p._id)] = p.name; });
    entries.forEach(e => { e.accountName = nameMap[String(e.accountId)] || null; });

    // Totals for balance check (DR == CR means balanced)
    const totals = await LedgerEntry.aggregate([
      { $match: filter },
      { $group: { _id: null, totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } },
    ]);
    const totalDebit  = totals[0]?.totalDebit  ?? 0;
    const totalCredit = totals[0]?.totalCredit ?? 0;

    res.json({ entries, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), totalDebit, totalCredit });
  } catch (error) {
    next(error);
  }
};

// ── Vendor Ledger ─────────────────────────────────────────────────────────────
export const getVendorLedger = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    const filter = { accountType: 'Vendor', accountId: vendorId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate)   filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total, vendor] = await Promise.all([
      LedgerEntry.find(filter).sort({ date: 1, createdAt: 1 }).skip(skip).limit(parseInt(limit)),
      LedgerEntry.countDocuments(filter),
      Vendor.findById(vendorId).select('name phone address currentBalance openingBalance'),
    ]);

    // Prepend synthetic opening balance row (only on first page, no date filter)
    const openingBalance = vendor?.openingBalance || 0;
    const openingRow = {
      _id: 'opening',
      transactionId: null,
      accountType: 'Vendor',
      entryType: 'opening_balance',
      debit: 0,
      credit: 0,
      runningBalance: openingBalance,
      description: 'Opening Balance',
      date: null,
    };
    const allEntries = (parseInt(page) === 1 && !startDate) ? [openingRow, ...entries] : entries;

    res.json({ party: vendor, entries: allEntries, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
};

// ── Buyer Ledger ──────────────────────────────────────────────────────────────
export const getBuyerLedger = async (req, res, next) => {
  try {
    const { buyerId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    const filter = { accountType: 'Buyer', accountId: buyerId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate)   filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total, buyer] = await Promise.all([
      LedgerEntry.find(filter).sort({ date: 1, createdAt: 1 }).skip(skip).limit(parseInt(limit)),
      LedgerEntry.countDocuments(filter),
      Buyer.findById(buyerId).select('name phone address currentBalance openingBalance gstNo'),
    ]);
    // Prepend synthetic opening balance row (only on first page, no date filter)
    const openingBalance = buyer?.openingBalance || 0;
    const openingRow = {
      _id: 'opening',
      transactionId: null,
      accountType: 'Buyer',
      entryType: 'opening_balance',
      debit: 0,
      credit: 0,
      runningBalance: openingBalance,
      description: 'Opening Balance',
      date: null,
    };
    const allEntries = (parseInt(page) === 1 && !startDate) ? [openingRow, ...entries] : entries;
    res.json({ party: buyer, entries, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
};

// ── Outstanding ───────────────────────────────────────────────────────────────
export const getOutstanding = async (req, res, next) => {
  try {
    const [vendors, buyers] = await Promise.all([
      Vendor.find({ currentBalance: { $ne: 0 }, isActive: true })
        .select('name phone currentBalance')
        .sort({ currentBalance: -1 }),
      Buyer.find({ currentBalance: { $ne: 0 }, isActive: true })
        .select('name phone currentBalance')
        .sort({ currentBalance: -1 }),
    ]);

    const totalPayable    = vendors.reduce((s, v) => s + v.currentBalance, 0);
    const totalReceivable = buyers.reduce((s, b)  => s + b.currentBalance, 0);

    res.json({ vendors, buyers, totalPayable, totalReceivable, netPosition: totalReceivable - totalPayable });
  } catch (error) {
    next(error);
  }
};

// ── Export Master Ledger to Excel ─────────────────────────────────────────────
export const exportMasterLedger = async (req, res, next) => {
  try {
    const { accountType, startDate, endDate } = req.query;

    const filter = {};
    if (accountType) filter.accountType = accountType;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate)   filter.date.$lte = new Date(endDate);
    }

    const entries = await LedgerEntry.find(filter).sort({ date: -1, createdAt: -1 }).lean();

    // Attach party names
    const vendorIds = [...new Set(entries.filter(e => e.accountType === 'Vendor').map(e => String(e.accountId)))];
    const buyerIds  = [...new Set(entries.filter(e => e.accountType === 'Buyer').map(e => String(e.accountId)))];
    const [vendors, buyers] = await Promise.all([
      vendorIds.length ? Vendor.find({ _id: { $in: vendorIds } }).select('name').lean() : [],
      buyerIds.length  ? Buyer.find({ _id: { $in: buyerIds } }).select('name').lean()   : [],
    ]);
    const nameMap = {};
    [...vendors, ...buyers].forEach(p => { nameMap[String(p._id)] = p.name; });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Master Ledger');

    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Account Type', key: 'accountType', width: 14 },
      { header: 'Account Name', key: 'accountName', width: 20 },
      { header: 'Entry Type', key: 'entryType', width: 16 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Debit (₹)', key: 'debit', width: 14 },
      { header: 'Credit (₹)', key: 'credit', width: 14 },
      { header: 'Transaction ID', key: 'transactionId', width: 20 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };

    entries.forEach(e => {
      sheet.addRow({
        date: e.date ? new Date(e.date).toLocaleDateString('en-IN') : '—',
        accountType: e.accountType,
        accountName: nameMap[String(e.accountId)] || '—',
        entryType: e.entryType?.replace('_', ' ') || '',
        description: e.description,
        debit: e.debit || 0,
        credit: e.credit || 0,
        transactionId: e.transactionId || '',
      });
    });

    // Totals row
    const totDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
    const totCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
    const totalRow = sheet.addRow({ date: '', accountType: '', accountName: '', entryType: '', description: 'TOTAL', debit: totDebit, credit: totCredit, transactionId: '' });
    totalRow.font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=master-ledger.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

// ── Export Vendor Ledger to Excel ─────────────────────────────────────────────
export const exportVendorLedger = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { startDate, endDate } = req.query;

    const filter = { accountType: 'Vendor', accountId: vendorId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate)   filter.date.$lte = new Date(endDate);
    }

    const [entries, vendor] = await Promise.all([
      LedgerEntry.find(filter).sort({ date: 1, createdAt: 1 }).lean(),
      Vendor.findById(vendorId).select('name phone address currentBalance openingBalance'),
    ]);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`${vendor?.name || 'Vendor'} Ledger`);

    // Header info
    sheet.addRow([`Vendor: ${vendor?.name || '—'}`]);
    sheet.addRow([`Phone: ${vendor?.phone || '—'}`, '', `Address: ${vendor?.address || '—'}`]);
    sheet.addRow([`Current Balance: ₹${vendor?.currentBalance?.toLocaleString('en-IN') || '0'}`]);
    sheet.addRow([]);

    sheet.addRow(['Date', 'Entry Type', 'Description', 'Debit (₹)', 'Credit (₹)', 'Running Balance (₹)']);
    const headerRow = sheet.getRow(5);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };

    // Opening balance
    const ob = vendor?.openingBalance || 0;
    if (!startDate) {
      sheet.addRow(['—', 'Opening Balance', 'Opening Balance', 0, 0, ob]);
    }

    entries.forEach(e => {
      sheet.addRow([
        e.date ? new Date(e.date).toLocaleDateString('en-IN') : '—',
        e.entryType?.replace('_', ' ') || '',
        e.description,
        e.debit || 0,
        e.credit || 0,
        e.runningBalance || 0,
      ]);
    });

    // Auto-width
    sheet.columns.forEach(col => { col.width = col.width || 16; });

    const filename = `${(vendor?.name || 'vendor').replace(/[^a-zA-Z0-9]/g, '_')}-ledger.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

// ── Export Buyer Ledger to Excel ──────────────────────────────────────────────
export const exportBuyerLedger = async (req, res, next) => {
  try {
    const { buyerId } = req.params;
    const { startDate, endDate } = req.query;

    const filter = { accountType: 'Buyer', accountId: buyerId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate)   filter.date.$lte = new Date(endDate);
    }

    const [entries, buyer] = await Promise.all([
      LedgerEntry.find(filter).sort({ date: 1, createdAt: 1 }).lean(),
      Buyer.findById(buyerId).select('name phone address currentBalance openingBalance gstNo'),
    ]);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`${buyer?.name || 'Buyer'} Ledger`);

    // Header info
    sheet.addRow([`Buyer: ${buyer?.name || '—'}`]);
    sheet.addRow([`Phone: ${buyer?.phone || '—'}`, '', `GST: ${buyer?.gstNo || '—'}`]);
    sheet.addRow([`Current Balance: ₹${buyer?.currentBalance?.toLocaleString('en-IN') || '0'}`]);
    sheet.addRow([]);

    sheet.addRow(['Date', 'Entry Type', 'Description', 'Debit (₹)', 'Credit (₹)', 'Running Balance (₹)']);
    const headerRow = sheet.getRow(5);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };

    // Opening balance
    const ob = buyer?.openingBalance || 0;
    if (!startDate) {
      sheet.addRow(['—', 'Opening Balance', 'Opening Balance', 0, 0, ob]);
    }

    entries.forEach(e => {
      sheet.addRow([
        e.date ? new Date(e.date).toLocaleDateString('en-IN') : '—',
        e.entryType?.replace('_', ' ') || '',
        e.description,
        e.debit || 0,
        e.credit || 0,
        e.runningBalance || 0,
      ]);
    });

    sheet.columns.forEach(col => { col.width = col.width || 16; });

    const filename = `${(buyer?.name || 'buyer').replace(/[^a-zA-Z0-9]/g, '_')}-ledger.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
