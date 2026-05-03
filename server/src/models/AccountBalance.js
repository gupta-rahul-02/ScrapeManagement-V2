import mongoose from 'mongoose';

const accountBalanceSchema = new mongoose.Schema(
  {
    accountType: {
      type: String,
      enum: ['Cash', 'Bank', 'UPI'],
      required: true,
      unique: true,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model('AccountBalance', accountBalanceSchema);
