import mongoose from 'mongoose';

/**
 * Double-Entry Ledger
 * Every transaction creates TWO entries sharing the same transactionId.
 *
 * Purchase  => DR Purchases,       CR Vendor
 * Sale      => DR Buyer,           CR Sales
 * Pay out   => DR Vendor,          CR Cash/Bank/UPI
 * Receive   => DR Cash/Bank/UPI,   CR Buyer
 */
const ledgerEntrySchema = new mongoose.Schema(
  {
    transactionId:  { type: String, required: true, index: true },
    accountType: {
      type: String,
      enum: ['Vendor', 'Buyer', 'Purchases', 'Sales', 'Cash', 'Bank', 'UPI', 'Expense'],
      required: true,
    },
    // Only set for Vendor / Buyer entries
    accountId:      { type: mongoose.Schema.Types.ObjectId, default: null },
    entryType: {
      type: String,
      enum: ['purchase', 'sale', 'payment_in', 'payment_out', 'expense'],
      required: true,
    },
    refModel:       { type: String, enum: ['Purchase', 'Sale', 'Payment', 'Expense'] },
    refId:          { type: mongoose.Schema.Types.ObjectId },
    debit:          { type: Number, default: 0 },
    credit:         { type: Number, default: 0 },
    // Running balance — only meaningful for Vendor / Buyer entries
    runningBalance: { type: Number, default: 0 },
    description:    { type: String, trim: true },
    date:           { type: Date, default: Date.now },
    createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ledgerEntrySchema.index({ accountType: 1, accountId: 1, date: 1 });
ledgerEntrySchema.index({ date: -1 });

export default mongoose.model('LedgerEntry', ledgerEntrySchema);
