import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  MinusCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

const ENTITIES = [
  {
    key: 'vendors',
    columns: 'name*, phone, address, openingBalance',
    note: 'Skipped if a vendor with the same name already exists.',
  },
  {
    key: 'buyers',
    columns: 'name*, phone, address, gstNo, openingBalance',
    note: 'Skipped if a buyer with the same name already exists.',
  },
  {
    key: 'categories',
    columns: 'name*, unit (kg/ton/quintal), description',
    note: 'Skipped if category name already exists.',
  },
  {
    key: 'godowns',
    columns: 'name*, location, capacity',
    note: 'Skipped if godown name already exists.',
  },
  {
    key: 'trucks',
    columns: 'truckNumber*, driverName, driverPhone, capacity',
    note: 'Skipped if truck number already exists.',
  },
  {
    key: 'purchases',
    columns: 'date, vendorName*, godownName*, categoryName*, weight*, rate*, notes',
    note: 'Creates purchase + updates godown stock + vendor ledger. Vendor/Godown/Category must exist first.',
  },
  {
    key: 'sales',
    columns: 'date, buyerName*, godownName*, categoryName*, weight*, rate*, notes',
    note: 'Creates sale + updates godown stock + buyer ledger. Buyer/Godown/Category must exist first.',
  },
  {
    key: 'payments',
    columns: 'date, type* (in/out), partyType* (Vendor/Buyer), partyName*, amount*, mode* (cash/bank_transfer/upi), reference, notes',
    note: 'Creates payment + updates party balance + ledger.',
  },
  {
    key: 'expenses',
    columns: 'date, expenseCategoryName*, description*, amount*, mode* (cash/bank_transfer/upi), reference, notes',
    note: 'Expense categories must be created first in the Expenses module.',
  },
];

export default function Import() {
  const { t } = useTranslation();
  const [entity, setEntity] = useState('vendors');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const entityInfo = ENTITIES.find((e) => e.key === entity);
  const entityLabel = t(`import.entities.${entity}`);

  const handleFileChange = (f) => {
    if (!f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      toast.error(t('import.invalidFileType'));
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileChange(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!file) { toast.error(t('import.selectFile')); return; }
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(`/import/${entity}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      if (data.inserted > 0) {
        toast.success(t('import.success', { count: data.inserted }));
      } else if (data.errors.length > 0) {
        toast.error(t('import.hasErrors'));
      } else {
        toast(t('import.allSkipped'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    window.open(`/api/import/template/${entity}`, '_blank');
  };

  const selectEntity = (key) => {
    setEntity(key);
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('import.title')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('import.subtitle')}</p>
      </div>

      {/* Step 1 — choose entity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('import.step1')}
        </h2>

        <div className="flex flex-wrap gap-2">
          {ENTITIES.map((e) => (
            <button
              key={e.key}
              onClick={() => selectEntity(e.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                entity === e.key
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-400'
              }`}
            >
              {t(`import.entities.${e.key}`)}
            </button>
          ))}
        </div>

        {/* Column guide */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{t('import.columns')}:</span>{' '}
            <code className="text-indigo-600 dark:text-indigo-400">{entityInfo?.columns}</code>
            <span className="ml-2 text-gray-400">(*&nbsp;=&nbsp;{t('import.required')})</span>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400">{entityInfo?.note}</p>
        </div>

        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          {t('import.downloadTemplate', { entity: entityLabel })}
        </button>
      </div>

      {/* Step 2 — upload */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('import.step2')}
        </h2>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors select-none ${
            dragOver
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
              : file
              ? 'border-green-400 bg-green-50 dark:bg-green-950'
              : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
          }`}
        >
          {file ? (
            <>
              <DocumentTextIcon className="h-10 w-10 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">{t('import.clickToChange')}</p>
            </>
          ) : (
            <>
              <ArrowUpTrayIcon className="h-10 w-10 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-300">{t('import.dropzone')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('import.accepts')}</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files[0])}
          />
        </div>

        {file && (
          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            {loading ? t('common.loading') : t('import.importButton', { entity: entityLabel })}
          </button>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t('import.results')}
          </h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950 rounded-xl p-4">
              <CheckCircleIcon className="h-7 w-7 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{result.inserted}</p>
                <p className="text-xs text-green-600 dark:text-green-500">{t('import.inserted')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950 rounded-xl p-4">
              <MinusCircleIcon className="h-7 w-7 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{result.skipped}</p>
                <p className="text-xs text-amber-600 dark:text-amber-500">{t('import.skipped')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950 rounded-xl p-4">
              <XCircleIcon className="h-7 w-7 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{result.errors.length}</p>
                <p className="text-xs text-red-600 dark:text-red-500">{t('import.errors')}</p>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('import.errorDetails')}</p>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">
                        {t('import.rowNum')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('common.description')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {result.errors.map((e, idx) => (
                      <tr key={idx} className="bg-red-50 dark:bg-red-950">
                        <td className="px-4 py-2 font-mono text-red-600 dark:text-red-400">{e.row}</td>
                        <td className="px-4 py-2 text-red-700 dark:text-red-300">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
