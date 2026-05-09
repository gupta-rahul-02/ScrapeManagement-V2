import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import { scanWeightSlip } from '../controllers/ocrController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are accepted'));
    }
  },
});

router.use(protect);

router.post('/weight-slip', upload.single('image'), scanWeightSlip);

export default router;
