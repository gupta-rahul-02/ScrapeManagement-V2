import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';
import Modal from '../components/Modal.jsx';
import toast from 'react-hot-toast';

export default function Challans() {
  const { t } = useTranslation();
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '' });
  const [deliveryModal, setDeliveryModal] = useState(null);
  const [receiverWeight, setReceiverWeight] = useState('');

  useEffect(() => { fetchChallans(); }, []);

  const fetchChallans = async () => {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      const { data } = await api.get('/challans', { params });
      setChallans(data.challans);
    } catch (err) {
      toast.error(t('challans.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelivery = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/challans/${deliveryModal._id}/delivery`, {
        receiverWeight: Number(receiverWeight),
      });
      toast.success(t('challans.deliveryMarked'));
      setDeliveryModal(null);
      setReceiverWeight('');
      fetchChallans();
    } catch (err) {
      toast.error(err.response?.data?.message || t('challans.updateError'));
    }
  };

  const statusColors = {
    dispatched: 'bg-yellow-100 text-yellow-700',
    delivered: 'bg-green-100 text-green-700',
    disputed: 'bg-red-100 text-red-700',
  };

  const statusLabel = (s) => {
    if (s === 'dispatched') return t('challans.dispatched');
    if (s === 'delivered') return t('challans.delivered');
    if (s === 'disputed') return t('challans.disputed');
    return s;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{t('challans.title')}</h1>

      {/* Filters */}
      <div className="flex gap-3 bg-white p-4 rounded-lg shadow">
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">{t('challans.allStatus')}</option>
          <option value="dispatched">{t('challans.dispatched')}</option>
          <option value="delivered">{t('challans.delivered')}</option>
          <option value="disputed">{t('challans.disputed')}</option>
        </select>
        <button onClick={fetchChallans} className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">{t('common.filter')}</button>
      </div>

      {/* Challan List */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('challans.challanNo')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('challans.buyer')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('challans.truck')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('challans.senderWt')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('challans.receiverWt')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('challans.diff')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t('challans.action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {challans.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">{t('challans.noResults')}</td></tr>
            ) : (
              challans.map((ch) => (
                <tr key={ch._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{ch.challanNo}</td>
                  <td className="px-4 py-3 text-sm">{ch.buyer?.name}</td>
                  <td className="px-4 py-3 text-sm">{ch.truck?.truckNumber}</td>
                  <td className="px-4 py-3 text-sm">{ch.senderWeight} kg</td>
                  <td className="px-4 py-3 text-sm">{ch.receiverWeight ? `${ch.receiverWeight} kg` : '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    {ch.weightDiff !== null ? (
                      <span className={ch.weightDiff > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                        {ch.weightDiff > 0 ? `-${ch.weightDiff}` : ch.weightDiff} kg
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[ch.status]}`}>
                      {statusLabel(ch.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{new Date(ch.dispatchDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    {ch.status === 'dispatched' && (
                      <button
                        onClick={() => setDeliveryModal(ch)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                      >
                        {t('challans.markDelivered')}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delivery Modal */}
      <Modal isOpen={!!deliveryModal} onClose={() => setDeliveryModal(null)} title={t('challans.markDelivery')}>
        {deliveryModal && (
          <form onSubmit={handleDelivery} className="space-y-4">
            <p className="text-sm text-gray-600">
              {t('challans.challan')} <strong>{deliveryModal.challanNo}</strong> | {t('challans.senderWeight')} <strong>{deliveryModal.senderWeight} kg</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('challans.receiverWeight')} *</label>
              <input type="number" required step="0.01" value={receiverWeight}
                onChange={(e) => setReceiverWeight(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeliveryModal(null)} className="px-4 py-2 text-sm border rounded-lg">{t('common.cancel')}</button>
              <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t('challans.confirmDelivery')}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
