import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import {
  CloudArrowUpIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function Backup() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const fileInputRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/backup/status');
      setStatus(data);
    } catch {
      toast.error(t('backup.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleTrigger = async () => {
    if (triggering) return;
    setTriggering(true);
    try {
      const { data } = await api.post('/backup/trigger');
      if (data.success) {
        toast.success(t('backup.triggerSuccess'));
        fetchStatus();
      } else {
        toast.error(data.error || t('backup.triggerFailed'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('backup.triggerFailed'));
    } finally {
      setTriggering(false);
    }
  };

  const handleDownload = async (format) => {
    try {
      const response = await api.get(`/backup/download${format === 'excel' ? '?format=excel' : ''}`, {
        responseType: 'blob',
      });
      const ext = format === 'excel' ? 'xlsx' : 'json';
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t('backup.downloadFailed'));
    }
  };

  const handleRestoreSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error(t('backup.jsonOnly'));
      return;
    }
    setRestoreFile(file);
    setConfirmRestore(true);
  };

  const handleRestore = async () => {
    if (restoring || !restoreFile) return;
    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('backup', restoreFile);
      const { data } = await api.post('/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) {
        toast.success(t('backup.restoreSuccess', { count: data.totalRestored }));
        fetchStatus();
      } else {
        toast.error(t('backup.restoreFailed'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('backup.restoreFailed'));
    } finally {
      setRestoring(false);
      setConfirmRestore(false);
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fmtSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('backup.title')}</h1>

      {/* Last Backup Status */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <CloudArrowUpIcon className="h-5 w-5 text-indigo-600" />
          {t('backup.lastBackup')}
        </h2>

        {status?.lastBackup ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('backup.date')}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{fmtDate(status.lastBackup.date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('backup.documents')}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{status.lastBackup.totalDocuments?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('backup.size')}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {fmtSize(status.lastBackup.jsonSize)} JSON / {fmtSize(status.lastBackup.xlsxSize)} Excel
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('backup.driveStatus')}</p>
              <p className="text-sm font-medium flex items-center gap-1">
                {status.lastBackup.driveUploaded ? (
                  <><CheckCircleIcon className="h-4 w-4 text-green-500" /> <span className="text-green-700 dark:text-green-400">{t('backup.uploaded')}</span></>
                ) : (
                  <><XCircleIcon className="h-4 w-4 text-yellow-500" /> <span className="text-yellow-700 dark:text-yellow-400">{t('backup.localOnly')}</span></>
                )}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('backup.noBackups')}</p>
        )}

        {!status?.driveConfigured && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4" />
              {t('backup.driveNotConfigured')}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Trigger Backup */}
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-800 rounded-lg shadow hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowPathIcon className={`h-8 w-8 text-indigo-600 ${triggering ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {triggering ? t('backup.backing') : t('backup.triggerNow')}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('backup.triggerDesc')}</span>
        </button>

        {/* Download JSON */}
        <button
          onClick={() => handleDownload('json')}
          className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-800 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <ArrowDownTrayIcon className="h-8 w-8 text-green-600" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">{t('backup.downloadJson')}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('backup.downloadJsonDesc')}</span>
        </button>

        {/* Download Excel */}
        <button
          onClick={() => handleDownload('excel')}
          className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-800 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <ArrowDownTrayIcon className="h-8 w-8 text-emerald-600" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">{t('backup.downloadExcel')}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('backup.downloadExcelDesc')}</span>
        </button>

        {/* Restore */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={restoring}
          className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-800 rounded-lg shadow hover:shadow-md transition-shadow border-2 border-dashed border-gray-200 dark:border-slate-600 disabled:opacity-50"
        >
          <CloudArrowUpIcon className="h-8 w-8 text-amber-600" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">{t('backup.restore')}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('backup.restoreDesc')}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleRestoreSelect}
        />
      </div>

      {/* Drive Files */}
      {status?.driveFiles?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('backup.driveFiles')}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('backup.fileName')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('backup.size')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('backup.date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {status.driveFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <DocumentIcon className="h-4 w-4 text-gray-400" />
                      {file.webViewLink ? (
                        <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                          {file.name}
                        </a>
                      ) : (
                        <span className="text-gray-900 dark:text-white">{file.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmtSize(Number(file.size))}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmtDate(file.createdTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('backup.confirmRestoreTitle')}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{t('backup.confirmRestoreMsg')}</p>
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-6">{t('backup.confirmRestoreWarn')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmRestore(false); setRestoreFile(null); }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {restoring ? t('backup.restoring') : t('backup.confirmRestore')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
