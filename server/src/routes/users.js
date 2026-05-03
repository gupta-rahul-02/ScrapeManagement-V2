import { Router } from 'express';
import { getUsers, createUser, updateUser, resetPassword } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.use(authorize('owner'));

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .put(updateUser);

router.put('/:id/reset-password', resetPassword);

export default router;
