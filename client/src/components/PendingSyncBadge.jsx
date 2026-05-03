import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowPathIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { subscribe, getAll, remove, clearAll, flush } from '../services/offlineQueue.js';

export default function PendingSyncBadge() {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    return subscribe((n) => setCount(n));
  }, []);

  const openDrawer = async () => {
    const all = await getAll();
    setItems(all);
    setDrawerOpen(true);
  };

  const handleRetryAll = async () => {
    setDrawerOpen(false);
    await flush();
  };

  const handleRemove = async (id) => {
    await remove(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearAll = async () => {
    await clearAll();
    setItems([]);
    setDrawerOpen(false);
  };

  if (count === 0 && !drawerOpen) return null;

  return (
    <>
      {count > 0 && (
        <button
          onClick={openDrawer}
          className="relative inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold hover:bg-amber-200 transition-colors"
          title={t('pwa.pendingSync')}
        >
          <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
          {count}
        </button>
      )}

      {/* Drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-80 max-w-full bg-white dark:bg-slate-800 shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t('pwa.pendingSync')}</h3>
              <button onClick={() => setDrawerOpen(false)}>
                <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y dark:divide-slate-700">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">{t('pwa.noItems')}</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-slate-100 truncate">{item.label}</span>
                      <button onClick={() => handleRemove(item.id)} className="text-red-500 hover:text-red-700 ml-2" title={t('pwa.discard')}>
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.createdAt).toLocaleString()}
                      {item.lastError && <span className="text-red-500 ml-2">({item.lastError})</span>}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="border-t dark:border-slate-700 px-4 py-3 flex gap-2">
              <button
                onClick={handleRetryAll}
                className="flex-1 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700"
              >
                {t('pwa.retry')}
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs rounded-md hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
              >
                {t('pwa.clearQueue')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
