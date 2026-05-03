import { Router } from 'express';
import {
  getGodowns,
  getGodown,
  createGodown,
  updateGodown,
  deleteGodown,
} from '../controllers/godownController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getGodowns)
  .post(authorize('owner', 'manager'), createGodown);

router.route('/:id')
  .get(getGodown)
  .put(authorize('owner', 'manager'), updateGodown)
  .delete(authorize('owner'), deleteGodown);

export default router;
