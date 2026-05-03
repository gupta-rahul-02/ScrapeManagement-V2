import mongoose from 'mongoose';

const challanSchema = new mongoose.Schema(
  {
    challanNo: {
      type: String,
      required: true,
      unique: true,
    },
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
    },
    truck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Truck',
      required: true,
    },
    godown: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Godown',
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Buyer',
      required: true,
    },
    items: [
      {
        category: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ScrapCategory',
        },
        dispatchWeight: {
          type: Number,
          min: 0,
        },
      },
    ],
    senderWeight: {
      type: Number,
      required: true,
      min: 0,
    },
    receiverWeight: {
      type: Number,
      default: null,
    },
    weightDiff: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['dispatched', 'delivered', 'disputed'],
      default: 'dispatched',
    },
    dispatchDate: {
      type: Date,
      default: Date.now,
    },
    deliveryDate: {
      type: Date,
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

export default mongoose.model('Challan', challanSchema);
