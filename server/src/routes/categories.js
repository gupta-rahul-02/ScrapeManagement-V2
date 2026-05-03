import { Router } from 'express';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getCategories)
  .post(authorize('owner', 'manager'), createCategory);

router.route('/:id')
  .get(getCategory)
  .put(authorize('owner', 'manager'), updateCategory)
  .delete(authorize('owner'), deleteCategory);

export default router;
