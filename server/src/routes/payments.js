import { Router } from 'express';
import { getPayments, createPayment } from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getPayments)
  .post(createPayment);

export default router;
