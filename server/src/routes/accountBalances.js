import { Router } from 'express';
import { getAccountBalances, setAccountBalance } from '../controllers/accountBalanceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.use(authorize('owner'));

router.get('/', getAccountBalances);
router.put('/', setAccountBalance);

export default router;
