import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { generateBackup, generateExcelBackup } from '../utils/backup.js';
import {
  uploadToDrive,
  cleanupOldBackups,
  isDriveConfigured,
  ensureBackupDir,
  cleanupLocalFiles,
} from '../utils/googleDrive.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Run a full backup: generate JSON + Excel, upload to Drive, cleanup.
 * Returns a result object for logging.
 */
export async function runBackup() {
  const start = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = ensureBackupDir();
  const jsonPath = path.join(dir, `backup-${timestamp}.json`);
  const xlsxPath = path.join(dir, `backup-${timestamp}.xlsx`);
  let driveFiles = [];

  try {
    // 1. Generate backup data
    const backupData = await generateBackup();

    // 2. Write JSON
    fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 0));
    const jsonSize = fs.statSync(jsonPath).size;

    // 3. Write Excel
    const excelBuffer = await generateExcelBackup(backupData);
    fs.writeFileSync(xlsxPath, Buffer.from(excelBuffer));
    const xlsxSize = fs.statSync(xlsxPath).size;

    // 4. Upload to Google Drive (if configured)
    if (isDriveConfigured()) {
      const jsonFile = await uploadToDrive(jsonPath, `backup-${timestamp}.json`, 'application/json');
      const xlsxFile = await uploadToDrive(xlsxPath, `backup-${timestamp}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      driveFiles = [jsonFile, xlsxFile];

      // 5. Cleanup old backups (keep last 30 pairs = 60 files)
      await cleanupOldBackups(60);
    }

    const duration = Date.now() - start;
    const result = {
      success: true,
      timestamp,
      duration,
      jsonSize,
      xlsxSize,
      totalDocuments: backupData.metadata.totalDocuments,
      driveUploaded: driveFiles.length > 0,
      driveFiles,
    };

    // Log to audit
    await AuditLog.create({
      action: 'backup',
      module: 'Backup',
      description: `Auto backup completed — ${backupData.metadata.totalDocuments} documents, ${(jsonSize / 1024).toFixed(1)} KB JSON, ${(xlsxSize / 1024).toFixed(1)} KB Excel, ${duration}ms`,
      userId: null,
      userName: 'System',
      userRole: 'system',
      metadata: result,
    });

    console.log(`[Backup] Completed in ${duration}ms — ${backupData.metadata.totalDocuments} docs`);
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    console.error('[Backup] Failed:', err.message);

    await AuditLog.create({
      action: 'backup',
      module: 'Backup',
      description: `Backup failed: ${err.message}`,
      userId: null,
      userName: 'System',
      userRole: 'system',
      metadata: { success: false, error: err.message, duration },
    }).catch(() => {});

    return { success: false, error: err.message, duration };
  } finally {
    cleanupLocalFiles(jsonPath, xlsxPath);
  }
}

/**
 * Start the backup cron job.
 * Schedule from BACKUP_CRON env var, default "0 2 * * *" (daily at 2 AM).
 */
export function startBackupCron() {
  const schedule = process.env.BACKUP_CRON || '0 2 * * *';

  if (!cron.validate(schedule)) {
    console.error(`[Backup] Invalid cron schedule: ${schedule}`);
    return;
  }

  cron.schedule(schedule, () => {
    console.log('[Backup] Cron triggered, starting backup...');
    runBackup().catch((err) => console.error('[Backup] Cron error:', err));
  });

  console.log(`[Backup] Cron scheduled: ${schedule}`);
}
