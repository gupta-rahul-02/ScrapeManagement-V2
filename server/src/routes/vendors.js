import { Router } from 'express';
import {
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
} from '../controllers/vendorController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getVendors)
  .post(authorize('owner', 'manager'), createVendor);

router.route('/:id')
  .get(getVendor)
  .put(authorize('owner', 'manager'), updateVendor)
  .delete(authorize('owner'), deleteVendor);

export default router;
