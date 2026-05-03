import mongoose from 'mongoose';

const truckSchema = new mongoose.Schema(
  {
    truckNumber: {
      type: String,
      required: [true, 'Truck number is required'],
      trim: true,
      unique: true,
      uppercase: true,
    },
    driverName: {
      type: String,
      trim: true,
    },
    driverPhone: {
      type: String,
      trim: true,
    },
    capacity: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Truck', truckSchema);
