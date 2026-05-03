import { useState, useEffect } from 'react';
import api from '../services/api.js';
import Modal from '../components/Modal.jsx';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ vendor: '', startDate: '', endDate: '' });

  const [form, setForm] = useState({
    vendor: '', godown: '', items: [{ category: '', weight: '', rate: '', amount: 0 }],
    notes: '', date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchPurchases();
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    const [v, g, c] = await Promise.all([
      api.get('/vendors', { params: { active: 'true' } }),
      api.get('/godowns', { params: { active: 'true' } }),
      api.get('/categories', { params: { active: 'true' } }),
    ]);
    setVendors(v.data);
    setGodowns(g.data);
    setCategories(c.data);
  };

  const fetchPurchases = async () => {
    try {
      const params = {};
      if (filters.vendor) params.vendor = filters.vendor;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const { data } = await api.get('/purchases', { params });
      setPurchases(data.purchases);
    } catch (err) {
      toast.error('Failed to load purchases');
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
        vendor: form.vendor,
        godown: form.godown,
        items: form.items.map((i) => ({ category: i.category, weight: Number(i.weight), rate: Number(i.rate), amount: i.amount })),
        totalWeight,
        totalAmount,
        notes: form.notes,
        date: form.date,
      };
      await api.post('/purchases', payload);
      toast.success('Purchase recorded');
      setModalOpen(false);
      setForm({ vendor: '', godown: '', items: [{ category: '', weight: '', rate: '', amount: 0 }], notes: '', date: new Date().toISOString().split('T')[0] });
      fetchPurchases();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating purchase');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4" /> New Purchase
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-lg shadow">
        <select value={filters.vendor} onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All Vendors</option>
          {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
        </select>
        <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm" />
        <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm" />
        <button onClick={fetchPurchases} className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">Filter</button>
      </div>

      {/* Purchase List */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Godown</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {purchases.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No purchases found</td></tr>
            ) : (
              purchases.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm font-medium">{p.vendor?.name}</td>
                  <td className="px-4 py-3 text-sm">{p.godown?.name}</td>
                  <td className="px-4 py-3 text-sm">{p.items?.map((i) => i.category?.name).join(', ')}</td>
                  <td className="px-4 py-3 text-sm">{p.totalWeight} kg</td>
                  <td className="px-4 py-3 text-sm font-medium">₹{p.totalAmount.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Purchase Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Purchase" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
              <select required value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                <option value="">Select vendor</option>
                {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Godown *</label>
              <select required value={form.godown} onChange={(e) => setForm({ ...form, godown: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                <option value="">Select godown</option>
                {godowns.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Items</label>
              <button type="button" onClick={addItem} className="text-sm text-indigo-600 hover:text-indigo-800">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <select required value={item.category} onChange={(e) => updateItem(idx, 'category', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded text-sm">
                      <option value="">Category</option>
                      {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" placeholder="Weight" required value={item.weight} onChange={(e) => updateItem(idx, 'weight', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" placeholder="Rate" required value={item.rate} onChange={(e) => updateItem(idx, 'rate', e.target.value)}
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

          {/* Totals */}
          <div className="flex justify-between bg-gray-50 p-3 rounded-lg">
            <span className="text-sm font-medium">Total: {totalWeight} kg</span>
            <span className="text-sm font-bold">₹{totalAmount.toLocaleString()}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Purchase</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
