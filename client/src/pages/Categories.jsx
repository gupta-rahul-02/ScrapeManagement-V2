import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import toast from 'react-hot-toast';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function Categories() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', unit: 'kg', description: '' });

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async (search = '') => {
    try {
      const { data } = await api.get('/categories', { params: { search } });
      setCategories(data);
    } catch (err) {
      toast.error(t('categories.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing._id}`, form);
        toast.success(t('categories.updated'));
      } else {
        await api.post('/categories', form);
        toast.success(t('categories.created'));
      }
      setModalOpen(false);
      setEditing(null);
      setForm({ name: '', unit: 'kg', description: '' });
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || t('categories.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, unit: cat.unit, description: cat.description || '' });
    setModalOpen(true);
  };

  const handleDelete = async (cat) => {
    if (!confirm(t('categories.deactivateConfirm', { name: cat.name }))) return;
    try {
      await api.delete(`/categories/${cat._id}`);
      toast.success(t('categories.deactivated'));
      fetchCategories();
    } catch (err) {
      toast.error(t('categories.deactivateError'));
    }
  };

  const columns = [
    { key: 'name', label: t('common.name') },
    { key: 'unit', label: t('categories.unit') },
    { key: 'description', label: t('common.description') },
    { key: 'isActive', label: t('common.status'), render: (val) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${val ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {val ? t('common.active') : t('common.inactive')}
      </span>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('categories.title')}</h1>
        <button
          onClick={() => { setEditing(null); setForm({ name: '', unit: 'kg', description: '' }); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4" /> {t('categories.add')}
        </button>
      </div>

      <DataTable
        columns={columns}
        data={categories}
        searchPlaceholder={t('categories.searchPlaceholder')}
        onSearch={fetchCategories}
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('categories.edit') : t('categories.add')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name')} *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('categories.unit')}</label>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="kg">{t('categories.kg')}</option>
              <option value="ton">{t('categories.ton')}</option>
              <option value="quintal">{t('categories.quintal')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.description')}</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? t('common.saving') : editing ? t('common.update') : t('common.create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
