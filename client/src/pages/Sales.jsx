import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';
import Modal from '../components/Modal.jsx';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function Sales() {
  const { t } = useTranslation();
  const [sales, setSales] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ buyer: '', startDate: '', endDate: '' });

  const [form, setForm] = useState({
    buyer: '', godown: '', truck: '', items: [{ category: '', weight: '', rate: '', amount: 0 }],
    notes: '', date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchSales();
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    const [b, g, c, tk] = await Promise.all([
      api.get('/buyers', { params: { active: 'true' } }),
      api.get('/godowns', { params: { active: 'true' } }),
      api.get('/categories', { params: { active: 'true' } }),
      api.get('/trucks', { params: { active: 'true' } }),
    ]);
    setBuyers(b.data);
    setGodowns(g.data);
    setCategories(c.data);
    setTrucks(tk.data);
  };

  const fetchSales = async () => {
    try {
      const params = {};
      if (filters.buyer) params.buyer = filters.buyer;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const { data } = await api.get('/sales', { params });
      setSales(data.sales);
    } catch (err) {
      toast.error(t('sales.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { category: '', weight: '', rate: '', amount: 0 }] });
  };

  const removeItem = (index) => {
    const items = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items });
  };

  const updateItem = (index, field, value) => {
    const items = [...form.items];
    items[index][field] = value;
    if (field === 'weight' || field === 'rate') {
      items[index].amount = (Number(items[index].weight) || 0) * (Number(items[index].rate) || 0);
    }
    setForm({ ...form, items });
  };

  const totalWeight = form.items.reduce((sum, i) => sum + (Number(i.weight) || 0), 0);
  const totalAmount = form.items.reduce((sum, i) => sum + (i.amount || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        buyer: form.buyer,
        godown: form.godown,
        truck: form.truck || undefined,
        items: form.items.map((i) => ({ category: i.category, weight: Number(i.weight), rate: Number(i.rate), amount: i.amount })),
        totalWeight,
        totalAmount,
        notes: form.notes,
        date: form.date,
      };
      await api.post('/sales', payload);
      toast.success(t('sales.recorded'));
      setModalOpen(false);
      setForm({ buyer: '', godown: '', truck: '', items: [{ category: '', weight: '', rate: '', amount: 0 }], notes: '', date: new Date().toISOString().split('T')[0] });
      fetchSales();
    } catch (err) {
      toast.error(err.response?.data?.message || t('sales.createError'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('sales.title')}</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4" /> {t('sales.new')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-lg shadow">
        <select value={filters.buyer} onChange={(e) => setFilters({ ...filters, buyer: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">{t('sales.allBuyers')}</option>
          {buyers.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm" />
        <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm" />
        <button onClick={fetchSales} className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">{t('common.filter')}</button>
      </div>

      {/* Sale List */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sales.buyer')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sales.godown')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sales.items')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sales.weight')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.amount')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sales.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">{t('sales.noResults')}</td></tr>
            ) : (
              sales.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{new Date(s.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm font-medium">{s.buyer?.name}</td>
                  <td className="px-4 py-3 text-sm">{s.godown?.name}</td>
                  <td className="px-4 py-3 text-sm">{s.items?.map((i) => i.category?.name).join(', ')}</td>
                  <td className="px-4 py-3 text-sm">{s.totalWeight} kg</td>
                  <td className="px-4 py-3 text-sm font-medium">₹{s.totalAmount.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Sale Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t('sales.new')} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('sales.buyer')} *</label>
              <select required value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">{t('sales.selectBuyer')}</option>
                {buyers.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('sales.godown')} *</label>
              <select required value={form.godown} onChange={(e) => setForm({ ...form, godown: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">{t('sales.selectGodown')}</option>
                {godowns.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('sales.truck')} *</label>
              <select required value={form.truck} onChange={(e) => setForm({ ...form, truck: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">{t('sales.selectTruck')}</option>
                {trucks.map((tk) => <option key={tk._id} value={tk._id}>{tk.truckNumber}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date')}</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">{t('sales.items')}</label>
              <button type="button" onClick={addItem} className="text-sm text-indigo-600 hover:text-indigo-800">{t('sales.addItem')}</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <select required value={item.category} onChange={(e) => updateItem(idx, 'category', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded text-sm">
                      <option value="">{t('common.category')}</option>
                      {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" placeholder={t('sales.weight')} required value={item.weight} onChange={(e) => updateItem(idx, 'weight', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" placeholder={t('sales.rate')} required value={item.rate} onChange={(e) => updateItem(idx, 'rate', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                  <div className="col-span-3">
                    <input type="text" readOnly value={`₹${item.amount.toLocaleString()}`}
                      className="w-full px-2 py-1.5 border rounded text-sm bg-gray-50" />
                  </div>
                  <div className="col-span-1">
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-500 text-sm">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between bg-gray-50 p-3 rounded-lg">
            <span className="text-sm font-medium">{t('common.total')}: {totalWeight} kg</span>
            <span className="text-sm font-bold">₹{totalAmount.toLocaleString()}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.notes')}</label>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
            <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t('sales.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
