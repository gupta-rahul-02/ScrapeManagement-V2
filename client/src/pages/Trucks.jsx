import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import toast from 'react-hot-toast';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function Trucks() {
  const { t } = useTranslation();
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ truckNumber: '', driverName: '', driverPhone: '', capacity: 0 });

  useEffect(() => { fetchTrucks(); }, []);

  const fetchTrucks = async (search = '') => {
    try {
      const { data } = await api.get('/trucks', { params: { search } });
      setTrucks(data);
    } catch (err) {
      toast.error(t('trucks.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/trucks/${editing._id}`, form);
        toast.success(t('trucks.updated'));
      } else {
        await api.post('/trucks', form);
        toast.success(t('trucks.created'));
      }
      setModalOpen(false);
      setEditing(null);
      setForm({ truckNumber: '', driverName: '', driverPhone: '', capacity: 0 });
      fetchTrucks();
    } catch (err) {
      toast.error(err.response?.data?.message || t('trucks.saveError'));
    }
  };

  const handleEdit = (truck) => {
    setEditing(truck);
    setForm({ truckNumber: truck.truckNumber, driverName: truck.driverName || '', driverPhone: truck.driverPhone || '', capacity: truck.capacity || 0 });
    setModalOpen(true);
  };

  const handleDelete = async (truck) => {
    if (!confirm(t('trucks.deactivateConfirm', { truckNumber: truck.truckNumber }))) return;
    try {
      await api.delete(`/trucks/${truck._id}`);
      toast.success(t('trucks.deactivated'));
      fetchTrucks();
    } catch (err) {
      toast.error(t('trucks.deactivateError'));
    }
  };

  const columns = [
    { key: 'truckNumber', label: t('trucks.truckNo') },
    { key: 'driverName', label: t('trucks.driverName') },
    { key: 'driverPhone', label: t('trucks.driverPhone') },
    { key: 'capacity', label: t('trucks.capacity'), render: (val) => val ? val.toLocaleString() : '-' },
    { key: 'isActive', label: t('common.status'), render: (val) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${val ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {val ? t('common.active') : t('common.inactive')}
      </span>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('trucks.title')}</h1>
        <button
          onClick={() => { setEditing(null); setForm({ truckNumber: '', driverName: '', driverPhone: '', capacity: 0 }); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4" /> {t('trucks.add')}
        </button>
      </div>

      <DataTable
        columns={columns}
        data={trucks}
        searchPlaceholder={t('trucks.searchPlaceholder')}
        onSearch={fetchTrucks}
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('trucks.edit') : t('trucks.add')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('trucks.truckNumber')} *</label>
            <input type="text" required value={form.truckNumber} onChange={(e) => setForm({ ...form, truckNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('trucks.driverName')}</label>
            <input type="text" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('trucks.driverPhone')}</label>
            <input type="text" value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('trucks.capacity')}</label>
            <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
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
