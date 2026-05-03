import AuditLog from '../models/AuditLog.js';

/**
 * GET /api/audit-logs
 * Query params: module, action, userId, startDate, endDate, page, limit
 * Owner-only.
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { module, action, userId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (module)    filter.module = module;
    if (action)    filter.action = action;
    if (userId)    filter.userId = userId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/audit-logs/users
 * Returns distinct list of users who appear in audit logs (for filter dropdown).
 */
export const getAuditUsers = async (req, res, next) => {
  try {
    const users = await AuditLog.aggregate([
      { $group: { _id: '$userId', name: { $first: '$userName' }, role: { $first: '$userRole' } } },
      { $sort: { name: 1 } },
    ]);
    res.json(users);
  } catch (error) {
    next(error);
  }
};
