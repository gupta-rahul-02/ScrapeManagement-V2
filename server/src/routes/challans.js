import { Router } from 'express';
import {
  getChallans,
  getChallan,
  updateChallanDelivery,
} from '../controllers/challanController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.route('/').get(getChallans);
router.route('/:id').get(getChallan);
router.route('/:id/delivery').put(updateChallanDelivery);

export default router;
