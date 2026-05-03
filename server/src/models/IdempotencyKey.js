import mongoose from 'mongoose';

const idempotencyKeySchema = new mongoose.Schema({
  key: { type: String, required: true },
  userId: { type: String, default: 'anonymous' },
  method: { type: String, required: true },
  path: { type: String, required: true },
  statusCode: { type: Number },
  responseBody: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, expires: 86400 }, // TTL 24 hours
});

idempotencyKeySchema.index({ key: 1, userId: 1 }, { unique: true });

export default mongoose.model('IdempotencyKey', idempotencyKeySchema);
