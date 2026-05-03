import { Router } from 'express';
import { getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory } from '../controllers/expenseCategoryController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.use(authorize('owner', 'manager'));

router.route('/')
  .get(getExpenseCategories)
  .post(createExpenseCategory);

router.route('/:id')
  .put(updateExpenseCategory)
  .delete(deleteExpenseCategory);

export default router;
