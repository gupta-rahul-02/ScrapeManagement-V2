import { Router } from 'express';
import { getSales, getSale, createSale, updateSale } from '../controllers/saleController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getSales)
  .post(upload.single('weightSlipPhoto'), createSale);

router.route('/:id')
  .get(getSale)
  .put(updateSale);

export default router;
