import { Router } from 'express';
import {
  getPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
} from '../controllers/purchaseController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getPurchases)
  .post(upload.single('weightSlipPhoto'), createPurchase);

router.route('/:id')
  .get(getPurchase)
  .put(updatePurchase);

export default router;
