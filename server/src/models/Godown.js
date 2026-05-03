import mongoose from 'mongoose';

const godownSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Godown name is required'],
      trim: true,
    },
    location: {
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

export default mongoose.model('Godown', godownSchema);
