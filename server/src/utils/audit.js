import AuditLog from '../models/AuditLog.js';

/**
 * Fire-and-forget audit log helper.
 * Always call AFTER a successful operation. Never throws.
 *
 * @param {{ req?: object, user?: object, action: string, module: string, entityId?: string|object, description: string, metadata?: object }} opts
 */
export function logAudit({ req, user: directUser, action, module, entityId, description, metadata }) {
  const user = directUser || req?.user;
  if (!user) return;

  AuditLog.create({
    action,
    module,
    entityId: entityId || null,
    description,
    userId: user._id,
    userName: user.name,
    userRole: user.role,
    ipAddress: req?.ip || req?.socket?.remoteAddress || null,
    metadata: metadata || {},
  }).catch((err) => {
    // Non-critical — log but never block the response
    console.error('[AuditLog] write failed:', err.message);
  });
}
