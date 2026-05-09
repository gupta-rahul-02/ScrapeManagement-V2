import { generateBackup, generateExcelBackup, validateBackupJSON, restoreFromBackup } from '../utils/backup.js';
import { listBackups, isDriveConfigured } from '../utils/googleDrive.js';
import { runBackup } from '../jobs/backupCron.js';
import AuditLog from '../models/AuditLog.js';

/**
 * GET /api/backup/status
 * Returns last backup info and Drive config status.
 */
export const getBackupStatus = async (req, res, next) => {
  try {
    // Last backup from audit log
    const lastBackup = await AuditLog.findOne({
      action: 'backup',
      module: 'Backup',
      'metadata.success': true,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Drive file list (if configured)
    let driveFiles = [];
    if (isDriveConfigured()) {
      try {
        driveFiles = await listBackups();
      } catch { /* Drive error — just return empty */ }
    }

    res.json({
      lastBackup: lastBackup
        ? {
            date: lastBackup.createdAt,
            totalDocuments: lastBackup.metadata?.totalDocuments,
            jsonSize: lastBackup.metadata?.jsonSize,
            xlsxSize: lastBackup.metadata?.xlsxSize,
            duration: lastBackup.metadata?.duration,
            driveUploaded: lastBackup.metadata?.driveUploaded,
          }
        : null,
      driveConfigured: isDriveConfigured(),
      driveFiles: driveFiles.slice(0, 30),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/backup/trigger
 * Manually trigger a backup (owner only).
 */
export const triggerBackup = async (req, res, next) => {
  try {
    const result = await runBackup();

    if (result.success) {
      // Update the audit log entry with user info
      await AuditLog.findOneAndUpdate(
        { action: 'backup', module: 'Backup', 'metadata.timestamp': result.timestamp },
        {
          userId: req.user._id,
          userName: req.user.name,
          userRole: req.user.role,
          description: `Manual backup by ${req.user.name} — ${result.totalDocuments} documents`,
        }
      );
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/backup/restore
 * Restore database from uploaded JSON backup.
 */
export const restoreBackup = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No backup file uploaded' });
    }

    // Parse JSON
    let backup;
    try {
      backup = JSON.parse(req.file.buffer.toString('utf-8'));
    } catch {
      return res.status(400).json({ message: 'Invalid JSON file' });
    }

    // Validate structure
    const error = validateBackupJSON(backup);
    if (error) {
      return res.status(400).json({ message: error });
    }

    // Perform restore
    const results = await restoreFromBackup(backup);

    // Calculate totals
    const totalRestored = Object.values(results)
      .filter((r) => r.status === 'restored')
      .reduce((sum, r) => sum + r.count, 0);

    // Log to audit
    await AuditLog.create({
      action: 'restore',
      module: 'Backup',
      description: `Database restored by ${req.user.name} — ${totalRestored} documents from backup dated ${backup.metadata.createdAt}`,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      metadata: { results, backupDate: backup.metadata.createdAt, totalRestored },
    });

    res.json({
      success: true,
      totalRestored,
      results,
      backupDate: backup.metadata.createdAt,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/backup/download
 * Generate and download a fresh JSON backup.
 */
export const downloadBackup = async (req, res, next) => {
  try {
    const backupData = await generateBackup();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (req.query.format === 'excel') {
      const buffer = await generateExcelBackup(backupData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="backup-${timestamp}.xlsx"`);
      return res.send(Buffer.from(buffer));
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${timestamp}.json"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    next(err);
  }
};
