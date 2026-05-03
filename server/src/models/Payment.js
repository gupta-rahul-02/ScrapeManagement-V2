import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['in', 'out'],
      required: [true, 'Payment type is required'],
    },
    partyType: {
      type: String,
      enum: ['Vendor', 'Buyer'],
      required: true,
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'partyType',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be positive'],
    },
    mode: {
      type: String,
      enum: ['cash', 'bank_transfer', 'upi'],
      required: [true, 'Payment mode is required'],
    },
    reference: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
