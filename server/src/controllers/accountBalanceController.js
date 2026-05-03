import AccountBalance from '../models/AccountBalance.js';
import { logAudit } from '../utils/audit.js';

export const getAccountBalances = async (req, res, next) => {
  try {
    // Return all 3 accounts (create defaults if missing)
    const accounts = await AccountBalance.find();
    const map = {};
    accounts.forEach(a => { map[a.accountType] = a; });

    const result = ['Cash', 'Bank', 'UPI'].map(type => ({
      accountType: type,
      openingBalance: map[type]?.openingBalance || 0,
      _id: map[type]?._id || null,
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const setAccountBalance = async (req, res, next) => {
  try {
    const { accountType, openingBalance } = req.body;

    if (!['Cash', 'Bank', 'UPI'].includes(accountType)) {
      return res.status(400).json({ message: 'Invalid account type' });
    }

    const account = await AccountBalance.findOneAndUpdate(
      { accountType },
      { openingBalance },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    logAudit({ req, action: 'update', module: 'Settings', entityId: account._id, description: `Updated ${accountType} opening balance to ₹${openingBalance}`, metadata: { accountType, openingBalance } });
    res.json(account);
  } catch (error) {
    next(error);
  }
};
