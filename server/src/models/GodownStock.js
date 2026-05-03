import mongoose from 'mongoose';

const godownStockSchema = new mongoose.Schema(
  {
    godown: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Godown',
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScrapCategory',
      required: true,
    },
    currentWeight: {
      type: Number,
      default: 0,
      min: 0,
    },
    overSold: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

godownStockSchema.index({ godown: 1, category: 1 }, { unique: true });

export default mongoose.model('GodownStock', godownStockSchema);
