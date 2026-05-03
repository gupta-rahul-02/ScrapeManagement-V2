import { Router } from 'express';
import { getMasterLedger, getVendorLedger, getBuyerLedger, getOutstanding, exportMasterLedger, exportVendorLedger, exportBuyerLedger } from '../controllers/ledgerController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/master',            authorize('owner', 'manager'), getMasterLedger);
router.get('/outstanding',       authorize('owner', 'manager'), getOutstanding);
router.get('/vendor/:vendorId',  authorize('owner', 'manager'), getVendorLedger);
router.get('/buyer/:buyerId',    authorize('owner', 'manager'), getBuyerLedger);

// Excel exports
router.get('/export/master',            authorize('owner', 'manager'), exportMasterLedger);
router.get('/export/vendor/:vendorId',  authorize('owner', 'manager'), exportVendorLedger);
router.get('/export/buyer/:buyerId',    authorize('owner', 'manager'), exportBuyerLedger);

export default router;
