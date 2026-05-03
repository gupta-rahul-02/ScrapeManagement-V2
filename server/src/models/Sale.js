import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScrapCategory',
      required: true,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Buyer',
      required: [true, 'Buyer is required'],
    },
    godown: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Godown',
      required: [true, 'Godown is required'],
    },
    items: {
      type: [saleItemSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'At least one item is required',
      },
    },
    totalWeight: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    weightSlipPhoto: {
      type: String,
    },
    notes: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Sale', saleSchema);
