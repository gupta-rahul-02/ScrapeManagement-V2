import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

import app from './src/app.js';
import connectDB from './src/config/db.js';
import { startBackupCron } from './src/jobs/backupCron.js';

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    startBackupCron();
  });
});
