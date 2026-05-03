import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import Expense from '../models/Expense.js';
import LedgerEntry from '../models/LedgerEntry.js';
import AccountBalance from '../models/AccountBalance.js';

export const getExpenses = async (req, res, next) => {
  try {
    const { category, mode, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (mode) filter.mode = mode;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .populate('category', 'name')
        .populate('createdBy', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Expense.countDocuments(filter),
    ]);

    res.json({
      expenses,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { category, amount, mode, reference, description, date, notes } = req.body;

    const expense = await Expense.create(
      [{ category, amount, mode, reference, description, date: date || Date.now(), notes, createdBy: req.user._id }],
      { session }
    );

    // Double-entry ledger
    const txId = randomUUID();
    const modeToAccount = { cash: 'Cash', bank_transfer: 'Bank', upi: 'UPI' };
    const cashAccount = modeToAccount[mode] || 'Cash';
    const desc = `Expense: ${description}${reference ? ' (' + reference + ')' : ''}`;

    // Get running balance for Expense account (by category)
    const lastExpenseEntry = await LedgerEntry.findOne(
      { accountType: 'Expense', accountId: category }
    ).sort({ date: -1, createdAt: -1 }).session(session);
    const expenseBalance = lastExpenseEntry?.runningBalance || 0;

    // Get running balance for Cash/Bank/UPI account
    const lastCashEntry = await LedgerEntry.findOne(
      { accountType: cashAccount, accountId: null }
    ).sort({ date: -1, createdAt: -1 }).session(session);
    let cashBalance = lastCashEntry?.runningBalance || 0;
    if (!lastCashEntry) {
      const acctBal = await AccountBalance.findOne({ accountType: cashAccount });
      cashBalance = acctBal?.openingBalance || 0;
    }

    await LedgerEntry.create(
      [
        {
          transactionId: txId,
          accountType: 'Expense',
          accountId: category,
          entryType: 'expense',
          refModel: 'Expense',
          refId: expense[0]._id,
          debit: amount,
          credit: 0,
          runningBalance: expenseBalance + amount,
          description: desc,
          date: date || Date.now(),
          createdBy: req.user._id,
        },
        {
          transactionId: txId,
          accountType: cashAccount,
          accountId: null,
          entryType: 'expense',
          refModel: 'Expense',
          refId: expense[0]._id,
          debit: 0,
          credit: amount,
          runningBalance: cashBalance - amount,
          description: desc,
          date: date || Date.now(),
          createdBy: req.user._id,
        },
      ],
      { session, ordered: true }
    );

    await session.commitTransaction();
    res.status(201).json(expense[0]);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
