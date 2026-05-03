import { useState, useEffect } from 'react';
import api from '../services/api.js';
import Modal from '../components/Modal.jsx';
import toast from 'react-hot-toast';

export default function Challans() {
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
      toast.error('Failed to load challans');
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
      toast.success('Delivery marked');
      setDeliveryModal(null);
      setReceiverWeight('');
      fetchChallans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating challan');
    }
  };

  const statusColors = {
    dispatched: 'bg-yellow-100 text-yellow-700',
    delivered: 'bg-green-100 text-green-700',
    disputed: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Challans</h1>

      {/* Filters */}
      <div className="flex gap-3 bg-white p-4 rounded-lg shadow">
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All Status</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
          <option value="disputed">Disputed</option>
        </select>
        <button onClick={fetchChallans} className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">Filter</button>
      </div>

      {/* Challan List */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Challan No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Truck</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sender Wt</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receiver Wt</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diff</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {challans.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">No challans found</td></tr>
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
                      {ch.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{new Date(ch.dispatchDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    {ch.status === 'dispatched' && (
                      <button
                        onClick={() => setDeliveryModal(ch)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                      >
                        Mark Delivered
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
      <Modal isOpen={!!deliveryModal} onClose={() => setDeliveryModal(null)} title="Mark Delivery">
        {deliveryModal && (
          <form onSubmit={handleDelivery} className="space-y-4">
            <p className="text-sm text-gray-600">
              Challan: <strong>{deliveryModal.challanNo}</strong> | Sender Weight: <strong>{deliveryModal.senderWeight} kg</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Weight (kg) *</label>
              <input type="number" required step="0.01" value={receiverWeight}
                onChange={(e) => setReceiverWeight(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeliveryModal(null)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Confirm Delivery</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
