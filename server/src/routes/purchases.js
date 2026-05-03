import { Router } from 'express';
import {
  getPurchases,
  getPurchase,
  createPurchase,
} from '../controllers/purchaseController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getPurchases)
  .post(upload.single('weightSlipPhoto'), createPurchase);

router.route('/:id')
  .get(getPurchase);

export default router;
