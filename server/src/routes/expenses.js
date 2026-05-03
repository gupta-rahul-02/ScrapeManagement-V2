import { Router } from 'express';
import { getExpenses, createExpense } from '../controllers/expenseController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.use(authorize('owner', 'manager'));

router.route('/')
  .get(getExpenses)
  .post(createExpense);

export default router;
