import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

const MODULE_LIST = ['Payment','Purchase','Sale','Challan','Expense','Vendor','Buyer','Category','Godown','Truck','User','Settings','Auth'];
const ACTION_LIST = ['create','update','deactivate','activate','login','logout','register','mark_delivered','reset_password'];

const ACTION_COLORS = {
  create:          'bg-green-100 text-green-800',
  update:          'bg-blue-100 text-blue-800',
  deactivate:      'bg-red-100 text-red-800',
  activate:        'bg-emerald-100 text-emerald-800',
  login:           'bg-indigo-100 text-indigo-800',
  logout:          'bg-gray-100 text-gray-700',
  register:        'bg-purple-100 text-purple-800',
  mark_delivered:  'bg-amber-100 text-amber-800',
  reset_password:  'bg-orange-100 text-orange-800',
};

const MODULE_COLORS = {
  Payment:   'bg-teal-50 text-teal-700',
  Purchase:  'bg-orange-50 text-orange-700',
  Sale:      'bg-green-50 text-green-700',
  Challan:   'bg-yellow-50 text-yellow-700',
  Expense:   'bg-red-50 text-red-700',
  Vendor:    'bg-purple-50 text-purple-700',
  Buyer:     'bg-blue-50 text-blue-700',
  Category:  'bg-indigo-50 text-indigo-700',
  Godown:    'bg-pink-50 text-pink-700',
  Truck:     'bg-slate-50 text-slate-700',
  User:      'bg-cyan-50 text-cyan-700',
  Settings:  'bg-gray-50 text-gray-700',
  Auth:      'bg-lime-50 text-lime-700',
};

export default function AuditLog() {
  const { t } = useTranslation();
  const [logs, setLogs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [users, setUsers]       = useState([]);
  const [page, setPage]         = useState(1);
  const LIMIT = 50;

  const [filters, setFilters] = useState({
    module: '', action: '', userId: '', startDate: '', endDate: '',
  });

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/audit-logs/users');
      setUsers(data);
    } catch { /* non-critical */ }
  }, []);

  const fetchLogs = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: LIMIT };
      if (filters.module)    params.module    = filters.module;
      if (filters.action)    params.action    = filters.action;
      if (filters.userId)    params.userId    = filters.userId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate)   params.endDate   = filters.endDate;
      const { data } = await api.get('/audit-logs', { params });
      setLogs(data.logs);
      setTotal(data.total);
      setPage(pg);
    } catch {
      toast.error(t('auditLog.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => { fetchUsers(); fetchLogs(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilter = () => fetchLogs(1);
  const handleClear  = () => {
    setFilters({ module: '', action: '', userId: '', startDate: '', endDate: '' });
    setTimeout(() => fetchLogs(1), 0);
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ClipboardDocumentCheckIcon className="h-7 w-7 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('auditLog.title')}</h1>
        <span className="ml-auto text-sm text-gray-400">{t('auditLog.totalEntries', { n: total })}</span>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{t('auditLog.module')}</label>
          <select value={filters.module} onChange={(e) => setFilters(f => ({ ...f, module: e.target.value }))}
            className="rounded-md border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 px-2 py-1.5 text-sm">
            <option value="">{t('auditLog.allModules')}</option>
            {MODULE_LIST.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{t('auditLog.action')}</label>
          <select value={filters.action} onChange={(e) => setFilters(f => ({ ...f, action: e.target.value }))}
            className="rounded-md border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 px-2 py-1.5 text-sm">
            <option value="">{t('auditLog.allActions')}</option>
            {ACTION_LIST.map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{t('auditLog.user')}</label>
          <select value={filters.userId} onChange={(e) => setFilters(f => ({ ...f, userId: e.target.value }))}
            className="rounded-md border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 px-2 py-1.5 text-sm">
            <option value="">{t('auditLog.allUsers')}</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{t('common.from')}</label>
          <input type="date" value={filters.startDate} onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
            className="rounded-md border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{t('common.to')}</label>
          <input type="date" value={filters.endDate} onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
            className="rounded-md border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex gap-2">
          <button onClick={handleFilter}
            className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
            {t('common.apply')}
          </button>
          <button onClick={handleClear}
            className="px-4 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-slate-600">
            {t('common.clear')}
          </button>
        </div>
      </div>

      {/* Log table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">{t('common.date')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">{t('auditLog.user')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">{t('auditLog.module')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">{t('auditLog.action')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">{t('auditLog.description')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">{t('auditLog.noResults')}</td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-slate-400">
                    <div>{new Date(log.createdAt).toLocaleDateString('en-IN')}</div>
                    <div className="text-xs">{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-slate-100">{log.userName}</div>
                    <div className="text-xs text-gray-400 capitalize">{log.userRole}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${MODULE_COLORS[log.module] || 'bg-gray-100 text-gray-700'}`}>
                      {log.module}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-slate-300 max-w-sm">
                    <div>{log.description}</div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="text-xs text-gray-400 mt-0.5">
                        <summary className="cursor-pointer hover:text-gray-600">{t('auditLog.details')}</summary>
                        <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-xs bg-gray-50 dark:bg-slate-900 rounded p-2">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {t('auditLog.pageInfo', { page, pages, total })}
          </p>
          <div className="flex gap-2">
            <button onClick={() => fetchLogs(page - 1)} disabled={page <= 1}
              className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700">
              {t('common.previous')}
            </button>
            <button onClick={() => fetchLogs(page + 1)} disabled={page >= pages}
              className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700">
              {t('common.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
