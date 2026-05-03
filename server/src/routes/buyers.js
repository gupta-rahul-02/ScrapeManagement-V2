import { Router } from 'express';
import {
  getBuyers,
  getBuyer,
  createBuyer,
  updateBuyer,
  deleteBuyer,
} from '../controllers/buyerController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getBuyers)
  .post(authorize('owner', 'manager'), createBuyer);

router.route('/:id')
  .get(getBuyer)
  .put(authorize('owner', 'manager'), updateBuyer)
  .delete(authorize('owner'), deleteBuyer);

export default router;
