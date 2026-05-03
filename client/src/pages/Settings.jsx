import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function Settings() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const fetchBalances = async () => {
    try {
      const { data } = await api.get('/account-balances');
      setAccounts(data);
    } catch {
      toast.error(t('settings.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBalances(); }, []);

  const handleSave = async (accountType, value) => {
    setSaving(accountType);
    try {
      await api.put('/account-balances', { accountType, openingBalance: Number(value) });
      toast.success(t('settings.updated', { accountType }));
      fetchBalances();
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.saveError'));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>

      {/* Account Opening Balances */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">{t('settings.openingBalances')}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('settings.openingBalancesDesc')}
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {accounts.map((account) => (
              <AccountRow
                key={account.accountType}
                account={account}
                saving={saving === account.accountType}
                onSave={handleSave}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AccountRow({ account, saving, onSave, t }) {
  const [value, setValue] = useState(String(account.openingBalance || 0));
  const [edited, setEdited] = useState(false);

  const icons = {
    Cash: '💵',
    Bank: '🏦',
    UPI: '📱',
  };

  const labels = {
    Cash: t('settings.cash'),
    Bank: t('settings.bank'),
    UPI: t('settings.upi'),
  };

  const handleChange = (e) => {
    setValue(e.target.value);
    setEdited(e.target.value !== String(account.openingBalance || 0));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(account.accountType, value);
    setEdited(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-4">
      <div className="flex items-center gap-3 w-32">
        <span className="text-2xl">{icons[account.accountType]}</span>
        <span className="font-medium text-gray-900">{labels[account.accountType] || account.accountType}</span>
      </div>
      <div className="flex-1 max-w-xs">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
      {edited && (
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
      )}
      {!edited && (
        <span className="text-sm text-gray-400">{t('settings.current', { n: Number(account.openingBalance || 0).toLocaleString('en-IN') })}</span>
      )}
    </form>
  );
}
