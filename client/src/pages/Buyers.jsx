import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import toast from 'react-hot-toast';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function Buyers() {
  const { t } = useTranslation();
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', gstNo: '', openingBalance: 0 });

  useEffect(() => { fetchBuyers(); }, []);

  const fetchBuyers = async (search = '') => {
    try {
      const { data } = await api.get('/buyers', { params: { search } });
      setBuyers(data);
    } catch (err) {
      toast.error(t('buyers.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/buyers/${editing._id}`, form);
        toast.success(t('buyers.updated'));
      } else {
        await api.post('/buyers', form);
        toast.success(t('buyers.created'));
      }
      setModalOpen(false);
      setEditing(null);
      setForm({ name: '', phone: '', address: '', gstNo: '', openingBalance: 0 });
      fetchBuyers();
    } catch (err) {
      toast.error(err.response?.data?.message || t('buyers.saveError'));
    }
  };

  const handleEdit = (buyer) => {
    setEditing(buyer);
    setForm({ name: buyer.name, phone: buyer.phone || '', address: buyer.address || '', gstNo: buyer.gstNo || '', openingBalance: buyer.openingBalance });
    setModalOpen(true);
  };

  const handleDelete = async (buyer) => {
    if (!confirm(t('buyers.deactivateConfirm', { name: buyer.name }))) return;
    try {
      await api.delete(`/buyers/${buyer._id}`);
      toast.success(t('buyers.deactivated'));
      fetchBuyers();
    } catch (err) {
      toast.error(t('buyers.deactivateError'));
    }
  };

  const columns = [
    { key: 'name', label: t('common.name') },
    { key: 'phone', label: t('common.phone') },
    { key: 'address', label: t('common.address') },
    { key: 'gstNo', label: t('buyers.gstNo') },
    { key: 'currentBalance', label: t('common.balance'), render: (val) => `₹${(val || 0).toLocaleString()}` },
    { key: 'isActive', label: t('common.status'), render: (val) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${val ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {val ? t('common.active') : t('common.inactive')}
      </span>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('buyers.title')}</h1>
        <button
          onClick={() => { setEditing(null); setForm({ name: '', phone: '', address: '', gstNo: '', openingBalance: 0 }); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4" /> {t('buyers.add')}
        </button>
      </div>

      <DataTable
        columns={columns}
        data={buyers}
        searchPlaceholder={t('buyers.searchPlaceholder')}
        onSearch={fetchBuyers}
        actions={(row) => (
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => handleEdit(row)} className="text-indigo-600 hover:text-indigo-800">
              <PencilIcon className="h-4 w-4" />
            </button>
            <button onClick={() => handleDelete(row)} className="text-red-600 hover:text-red-800">
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('buyers.edit') : t('buyers.add')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name')} *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.phone')}</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.address')}</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('buyers.gstNo')}</label>
            <input type="text" value={form.gstNo} onChange={(e) => setForm({ ...form, gstNo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('buyers.openingBalance')}</label>
            <input type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
            <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              {editing ? t('common.update') : t('common.create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
