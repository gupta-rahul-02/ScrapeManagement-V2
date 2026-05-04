import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/auth.js';
import { getTemplate, importData } from '../controllers/importController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    if (['csv', 'xlsx', 'xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv and .xlsx files are accepted'));
    }
  },
});

router.use(protect);
router.use(authorize('owner'));

router.get('/template/:entity', getTemplate);
router.post('/:entity', upload.single('file'), importData);

export default router;
