import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

let driveClient = null;

/**
 * Initialize Google Drive client using a service account.
 * Expects GOOGLE_SERVICE_ACCOUNT_KEY env var (JSON string) and GOOGLE_DRIVE_FOLDER_ID.
 */
function getDriveClient() {
  if (driveClient) return driveClient;

  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var is not set');

  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

/**
 * Get the configured folder ID.
 */
function getFolderId() {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!id) throw new Error('GOOGLE_DRIVE_FOLDER_ID env var is not set');
  return id;
}

/**
 * Upload a file to Google Drive.
 * @param {string} filePath - Local path to the file
 * @param {string} fileName - Name for the file in Drive
 * @param {string} mimeType - MIME type
 * @returns {{ id, name, webViewLink }}
 */
export async function uploadToDrive(filePath, fileName, mimeType) {
  const drive = getDriveClient();
  const folderId = getFolderId();

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: fs.createReadStream(filePath),
    },
    fields: 'id, name, webViewLink, size',
  });

  return res.data;
}

/**
 * List backup files in the configured Drive folder, newest first.
 */
export async function listBackups() {
  const drive = getDriveClient();
  const folderId = getFolderId();

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    orderBy: 'createdTime desc',
    fields: 'files(id, name, size, createdTime, webViewLink)',
    pageSize: 60,
  });

  return res.data.files || [];
}

/**
 * Delete a file from Drive.
 */
export async function deleteFromDrive(fileId) {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

/**
 * Delete old backups, keeping only the most recent `keep` files.
 */
export async function cleanupOldBackups(keep = 30) {
  const files = await listBackups();
  const toDelete = files.slice(keep);
  for (const file of toDelete) {
    await deleteFromDrive(file.id);
  }
  return toDelete.length;
}

/**
 * Check if Google Drive is configured.
 */
export function isDriveConfigured() {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_DRIVE_FOLDER_ID);
}

/**
 * Ensure the local temp backup directory exists.
 */
export function ensureBackupDir() {
  const dir = path.join(process.cwd(), 'tmp', 'backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Clean up local temp files.
 */
export function cleanupLocalFiles(...filePaths) {
  for (const fp of filePaths) {
    try {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch { /* ignore */ }
  }
}
