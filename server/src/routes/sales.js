import { Router } from 'express';
import { getSales, getSale, createSale } from '../controllers/saleController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getSales)
  .post(upload.single('weightSlipPhoto'), createSale);

router.route('/:id')
  .get(getSale);

export default router;
