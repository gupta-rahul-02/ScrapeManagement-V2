import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/auth.js';
import {
  getBackupStatus,
  triggerBackup,
  restoreBackup,
  downloadBackup,
} from '../controllers/backupController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are accepted'));
    }
  },
});

// All routes require owner role
router.use(protect, authorize('owner'));

router.get('/status', getBackupStatus);
router.post('/trigger', triggerBackup);
router.post('/restore', upload.single('backup'), restoreBackup);
router.get('/download', downloadBackup);

export default router;
