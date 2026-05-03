import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import Payment from '../models/Payment.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Vendor from '../models/Vendor.js';
import Buyer from '../models/Buyer.js';
import AccountBalance from '../models/AccountBalance.js';
import { logAudit } from '../utils/audit.js';

export const getPayments = async (req, res, next) => {
  try {
    const { type, partyType, partyId, mode, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (partyType) filter.partyType = partyType;
    if (partyId) filter.partyId = partyId;
    if (mode) filter.mode = mode;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('partyId', 'name phone')
        .populate('createdBy', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Payment.countDocuments(filter),
    ]);

    res.json({
      payments,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

export const createPayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { type, partyType, partyId, amount, mode, reference, notes, date } = req.body;

    const payment = await Payment.create(
      [
        {
          type,
          partyType,
          partyId,
          amount,
          mode,
          reference,
          notes,
          date: date || Date.now(),
          createdBy: req.user._id,
        },
      ],
      { session }
    );

    // Update party balance
    if (partyType === 'Vendor') {
      // Payment out to vendor — reduce what we owe
      await Vendor.findByIdAndUpdate(
        partyId,
        { $inc: { currentBalance: -amount } },
        { session }
      );
    } else {
      // Payment in from buyer — reduce what they owe
      await Buyer.findByIdAndUpdate(
        partyId,
        { $inc: { currentBalance: -amount } },
        { session }
      );
    }

    // Double-entry ledger
    const modeToAccount = { cash: 'Cash', bank_transfer: 'Bank', upi: 'UPI' };
    const cashAccount = modeToAccount[mode] || 'Cash';
    const txId = randomUUID();
    const desc = `Payment ${type} - ${mode}${reference ? ' (' + reference + ')' : ''}`;

    const lastPartyEntry = await LedgerEntry.findOne({
      accountType: partyType,
      accountId: partyId,
    })
      .sort({ date: -1, createdAt: -1 })
      .session(session);

    // Seed from openingBalance if no prior ledger entries exist
    const PartyModel = partyType === 'Vendor' ? Vendor : Buyer;
    const partyDoc = await PartyModel.findById(partyId).select('openingBalance').lean().session(session);
    const prevPartyBalance = lastPartyEntry
      ? lastPartyEntry.runningBalance
      : (partyDoc?.openingBalance || 0);

    // Get Cash/Bank/UPI running balance
    const lastCashEntry = await LedgerEntry.findOne({ accountType: cashAccount, accountId: null })
      .sort({ date: -1, createdAt: -1 }).session(session);
    let prevCashBalance = lastCashEntry?.runningBalance || 0;
    if (!lastCashEntry) {
      const acctBal = await AccountBalance.findOne({ accountType: cashAccount });
      prevCashBalance = acctBal?.openingBalance || 0;
    }

    let entries;

    if (partyType === 'Vendor') {
      // Pay vendor: DR Vendor (reduces liability), CR Cash/Bank/UPI
      entries = [
        {
          transactionId: txId,
          accountType: 'Vendor',
          accountId: partyId,
          entryType: 'payment_out',
          refModel: 'Payment',
          refId: payment[0]._id,
          debit: amount,
          credit: 0,
          runningBalance: prevPartyBalance - amount,
          description: desc,
          date: date || new Date(),
          createdBy: req.user._id,
        },
        {
          transactionId: txId,
          accountType: cashAccount,
          accountId: null,
          entryType: 'payment_out',
          refModel: 'Payment',
          refId: payment[0]._id,
          debit: 0,
          credit: amount,
          runningBalance: prevCashBalance - amount,
          description: desc,
          date: date || new Date(),
          createdBy: req.user._id,
        },
      ];
    } else {
      // Receive from buyer: DR Cash/Bank/UPI, CR Buyer (reduces receivable)
      entries = [
        {
          transactionId: txId,
          accountType: cashAccount,
          accountId: null,
          entryType: 'payment_in',
          refModel: 'Payment',
          refId: payment[0]._id,
          debit: amount,
          credit: 0,
          runningBalance: prevCashBalance + amount,
          description: desc,
          date: date || new Date(),
          createdBy: req.user._id,
        },
        {
          transactionId: txId,
          accountType: 'Buyer',
          accountId: partyId,
          entryType: 'payment_in',
          refModel: 'Payment',
          refId: payment[0]._id,
          debit: 0,
          credit: amount,
          runningBalance: prevPartyBalance - amount,
          description: desc,
          date: date || new Date(),
          createdBy: req.user._id,
        },
      ];
    }

    await LedgerEntry.create(entries, { session, ordered: true });

    await session.commitTransaction();

    logAudit({
      req,
      action: 'create',
      module: 'Payment',
      entityId: payment[0]._id,
      description: `Recorded payment ${type === 'out' ? 'to' : 'from'} ${partyType} — ₹${amount} via ${mode}`,
      metadata: { type, partyType, amount, mode, reference },
    });

    res.status(201).json(payment[0]);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
