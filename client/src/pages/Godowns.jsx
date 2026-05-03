import { useState, useEffect } from 'react';
import api from '../services/api.js';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import toast from 'react-hot-toast';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function Godowns() {
  const [godowns, setGodowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', location: '', capacity: 0 });

  useEffect(() => { fetchGodowns(); }, []);

  const fetchGodowns = async (search = '') => {
    try {
      const { data } = await api.get('/godowns', { params: { search } });
      setGodowns(data);
    } catch (err) {
      toast.error('Failed to load godowns');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/godowns/${editing._id}`, form);
        toast.success('Godown updated');
      } else {
        await api.post('/godowns', form);
        toast.success('Godown created');
      }
      setModalOpen(false);
      setEditing(null);
      setForm({ name: '', location: '', capacity: 0 });
      fetchGodowns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving godown');
    }
  };

  const handleEdit = (godown) => {
    setEditing(godown);
    setForm({ name: godown.name, location: godown.location || '', capacity: godown.capacity || 0 });
    setModalOpen(true);
  };

  const handleDelete = async (godown) => {
    if (!confirm(`Deactivate godown "${godown.name}"?`)) return;
    try {
      await api.delete(`/godowns/${godown._id}`);
      toast.success('Godown deactivated');
      fetchGodowns();
    } catch (err) {
      toast.error('Error deactivating godown');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'location', label: 'Location' },
    { key: 'capacity', label: 'Capacity (kg)', render: (val) => val ? val.toLocaleString() : '-' },
    { key: 'isActive', label: 'Status', render: (val) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${val ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {val ? 'Active' : 'Inactive'}
      </span>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Godowns (Warehouses)</h1>
        <button
          onClick={() => { setEditing(null); setForm({ name: '', location: '', capacity: 0 }); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4" /> Add Godown
        </button>
      </div>

      <DataTable
        columns={columns}
        data={godowns}
        searchPlaceholder="Search godowns..."
        onSearch={fetchGodowns}
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Godown' : 'Add Godown'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (kg)</label>
            <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
