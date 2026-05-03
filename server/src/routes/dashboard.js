import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/', authorize('owner', 'manager'), getDashboard);

export default router;
