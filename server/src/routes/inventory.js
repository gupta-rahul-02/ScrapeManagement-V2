import { Router } from 'express';
import { getInventory, getStockSummary, getStockAlerts } from '../controllers/inventoryController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', getInventory);
router.get('/summary', getStockSummary);
router.get('/alerts', getStockAlerts);

export default router;
