import { Router } from 'express';
import { getAuditLogs, getAuditUsers } from '../controllers/auditController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.use(authorize('owner'));   // only owners can view audit trail

router.get('/', getAuditLogs);
router.get('/users', getAuditUsers);

export default router;
