import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';
import Modal from '../components/Modal.jsx';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function Payments() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ type: '', partyType: '' });

  const [form, setForm] = useState({
    type: 'out', partyType: 'Vendor', partyId: '', amount: '', mode: 'cash',
    reference: '', notes: '', date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchPayments();
    fetchParties();
  }, []);

  const fetchParties = async () => {
    const [v, b] = await Promise.all([
      api.get('/vendors', { params: { active: 'true' } }),
      api.get('/buyers', { params: { active: 'true' } }),
    ]);
    setVendors(v.data);
    setBuyers(b.data);
  };

  const fetchPayments = async () => {
    try {
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.partyType) params.partyType = filters.partyType;
      const { data } = await api.get('/payments', { params });
      setPayments(data.payments);
    } catch (err) {
      toast.error(t('payments.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.post('/payments', {
        ...form,
        amount: Number(form.amount),
      });
      toast.success(t('payments.recorded'));
      setModalOpen(false);
      setForm({ type: 'out', partyType: 'Vendor', partyId: '', amount: '', mode: 'cash', reference: '', notes: '', date: new Date().toISOString().split('T')[0] });
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || t('payments.recordError'));
    } finally {
      setSubmitting(false);
    }
  };

  const parties = form.partyType === 'Vendor' ? vendors : buyers;

  const modeLabel = (m) => {
    if (m === 'cash') return t('payments.cash');
    if (m === 'bank_transfer') return t('payments.bankTransfer');
    if (m === 'upi') return t('payments.upi');
    return m;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('payments.title')}</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4" /> {t('payments.record')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 bg-white p-4 rounded-lg shadow">
        <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">{t('payments.allTypes')}</option>
          <option value="in">{t('payments.receivedIn')}</option>
          <option value="out">{t('payments.paidOut')}</option>
        </select>
        <select value={filters.partyType} onChange={(e) => setFilters({ ...filters, partyType: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">{t('payments.allParties')}</option>
          <option value="Vendor">{t('payments.vendors')}</option>
          <option value="Buyer">{t('payments.buyers')}</option>
        </select>
        <button onClick={fetchPayments} className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">{t('common.filter')}</button>
      </div>

      {/* Payment List */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.type')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('payments.party')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.amount')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.mode')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.reference')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payments.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">{t('payments.noResults')}</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.type === 'in' ? t('payments.received') : t('payments.paid')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{p.partyId?.name} <span className="text-gray-400 text-xs">({p.partyType})</span></td>
                  <td className="px-4 py-3 text-sm font-bold">₹{p.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{modeLabel(p.mode)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.reference || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Payment Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t('payments.record')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('payments.partyType')}</label>
              <select value={form.partyType} onChange={(e) => setForm({ ...form, partyType: e.target.value, partyId: '', type: e.target.value === 'Vendor' ? 'out' : 'in' })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="Vendor">{t('payments.vendorPay')}</option>
                <option value="Buyer">{t('payments.buyerReceive')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('payments.party')} *</label>
              <select required value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">{t('common.select')}</option>
                {parties.map((p) => <option key={p._id} value={p._id}>{p.name} — {t('payments.balance')} ₹{(p.currentBalance ?? 0).toLocaleString()}</option>)}
              </select>
              {form.partyType === 'Buyer' && (
                <p className="mt-1 text-xs text-amber-600">{t('payments.balanceNote')}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('payments.amountRupees')} *</label>
              <input type="number" required min="0.01" step="0.01" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.mode')} *</label>
              <select required value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="cash">{t('payments.cash')}</option>
                <option value="bank_transfer">{t('payments.bankTransfer')}</option>
                <option value="upi">{t('payments.upi')}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('payments.txnId')}</label>
              <input type="text" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date')}</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.notes')}</label>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" disabled={submitting} onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? t('common.saving') : t('payments.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
