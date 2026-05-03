import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'create', 'update', 'deactivate', 'activate',
        'login', 'logout', 'register',
        'mark_delivered', 'reset_password',
      ],
    },
    module: {
      type: String,
      required: true,
      enum: [
        'Payment', 'Purchase', 'Sale', 'Challan', 'Expense',
        'Vendor', 'Buyer', 'Category', 'Godown', 'Truck',
        'User', 'Settings', 'Auth',
      ],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    description: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: String,
    ipAddress: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
