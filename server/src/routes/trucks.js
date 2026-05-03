import { Router } from 'express';
import {
  getTrucks,
  getTruck,
  createTruck,
  updateTruck,
  deleteTruck,
} from '../controllers/truckController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getTrucks)
  .post(authorize('owner', 'manager'), createTruck);

router.route('/:id')
  .get(getTruck)
  .put(authorize('owner', 'manager'), updateTruck)
  .delete(authorize('owner'), deleteTruck);

export default router;
