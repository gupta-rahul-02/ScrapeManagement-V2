import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';
import Modal from '../components/Modal.jsx';
import toast from 'react-hot-toast';
import { PlusIcon, CameraIcon, SparklesIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function Purchases() {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ vendor: '', startDate: '', endDate: '' });
  const [scanning, setScanning] = useState(false);
  const [scanThumb, setScanThumb] = useState(null);
  const scanInputRef = useRef(null);

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
      toast.error(t('purchases.loadFailed'));
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

  // ─── AI Scan Weight Slip ───────────────────────────────────────────
  const handleScan = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('ocr.invalidFile'));
      return;
    }
    setScanning(true);
    setScanThumb(URL.createObjectURL(file));
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/ocr/weight-slip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const unmatched = [];
      const next = { ...form };

      // Fuzzy name matcher: exact → includes → singular/plural
      const fuzzyFind = (list, name) => {
        if (!name) return null;
        const q = name.toLowerCase().trim();
        return (
          list.find((x) => x.name.toLowerCase().trim() === q) ||
          list.find((x) => {
            const n = x.name.toLowerCase().trim();
            return n.includes(q) || q.includes(n);
          }) ||
          list.find((x) => {
            const n = x.name.toLowerCase().trim().replace(/s$/, '');
            const qn = q.replace(/s$/, '');
            return n === qn;
          }) ||
          null
        );
      };

      // Vendor: fuzzy name match
      if (data.vendorName) {
        const v = fuzzyFind(vendors, data.vendorName);
        if (v) next.vendor = v._id;
        else unmatched.push(`${t('purchases.vendor')}: "${data.vendorName}"`);
      }

      // Date
      if (data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        next.date = data.date;
      }

      // Items: fuzzy match category by name
      if (Array.isArray(data.items) && data.items.length > 0) {
        const mappedItems = data.items.map((item) => {
          const cat = fuzzyFind(categories, item.categoryName);
          if (!cat && item.categoryName) {
            unmatched.push(`${t('common.category')}: "${item.categoryName}"`);
          }
          const weight = Number(item.weight) || 0;
          const rate = Number(item.rate) || 0;
          return {
            category: cat?._id || '',
            weight: weight ? String(weight) : '',
            rate: rate ? String(rate) : '',
            amount: weight * rate,
          };
        });
        next.items = mappedItems;
      }

      // Notes
      if (data.notes) next.notes = data.notes;

      setForm(next);
      toast.success(t('ocr.success'));
      if (unmatched.length > 0) {
        toast(`${t('ocr.unmatched')}\n\n${unmatched.join('\n')}`, {
          icon: '⚠️',
          duration: 6000,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('ocr.failed'));
      setScanThumb(null);
    } finally {
      setScanning(false);
      if (scanInputRef.current) scanInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
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
      if (editing) {
        await api.put(`/purchases/${editing._id}`, payload);
        toast.success(t('purchases.updated'));
      } else {
        await api.post('/purchases', payload);
        toast.success(t('purchases.recorded'));
      }
      setModalOpen(false);
      setEditing(null);
      setScanThumb(null);
      setForm({ vendor: '', godown: '', items: [{ category: '', weight: '', rate: '', amount: 0 }], notes: '', date: new Date().toISOString().split('T')[0] });
      fetchPurchases();
    } catch (err) {
      toast.error(err.response?.data?.message || t('purchases.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (purchase) => {
    setEditing(purchase);
    setForm({
      vendor: purchase.vendor?._id || '',
      godown: purchase.godown?._id || '',
      items: purchase.items.map((i) => ({
        category: i.category?._id || i.category,
        weight: String(i.weight),
        rate: String(i.rate),
        amount: i.amount,
      })),
      notes: purchase.notes || '',
      date: new Date(purchase.date).toISOString().split('T')[0],
    });
    setScanThumb(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('purchases.title')}</h1>
        <button
          onClick={() => { setEditing(null); setForm({ vendor: '', godown: '', items: [{ category: '', weight: '', rate: '', amount: 0 }], notes: '', date: new Date().toISOString().split('T')[0] }); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4" /> {t('purchases.new')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-lg shadow">
        <select value={filters.vendor} onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">{t('purchases.allVendors')}</option>
          {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
        </select>
        <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm" />
        <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm" />
        <button onClick={fetchPurchases} className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">{t('common.filter')}</button>
      </div>

      {/* Purchase List */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('purchases.vendor')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('purchases.godown')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('purchases.items')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('purchases.weight')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.amount')}</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {purchases.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">{t('purchases.noResults')}</td></tr>
            ) : (
              purchases.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm font-medium">{p.vendor?.name}</td>
                  <td className="px-4 py-3 text-sm">{p.godown?.name}</td>
                  <td className="px-4 py-3 text-sm">{p.items?.map((i) => i.category?.name).join(', ')}</td>
                  <td className="px-4 py-3 text-sm">{p.totalWeight} kg</td>
                  <td className="px-4 py-3 text-sm font-medium">₹{p.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <button onClick={() => handleEdit(p)} className="text-indigo-600 hover:text-indigo-800">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Purchase Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); setScanThumb(null); }} title={editing ? t('purchases.edit') : t('purchases.new')} size="lg">
        {/* AI Scan banner */}
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <SparklesIcon className="h-6 w-6 text-indigo-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-indigo-900">{t('ocr.banner')}</p>
              <p className="text-xs text-indigo-700">{t('ocr.bannerHint')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {scanThumb && (
              <img src={scanThumb} alt="slip" className="h-10 w-10 rounded object-cover border border-indigo-300" />
            )}
            <button
              type="button"
              onClick={() => scanInputRef.current?.click()}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <CameraIcon className="h-4 w-4" />
              {scanning ? t('ocr.scanning') : t('ocr.scanButton')}
            </button>
            <input
              ref={scanInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleScan(e.target.files?.[0])}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('purchases.vendor')} *</label>
              <select required value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                <option value="">{t('purchases.selectVendor')}</option>
                {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('purchases.godown')} *</label>
              <select required value={form.godown} onChange={(e) => setForm({ ...form, godown: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                <option value="">{t('purchases.selectGodown')}</option>
                {godowns.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date')}</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">{t('purchases.items')}</label>
              <button type="button" onClick={addItem} className="text-sm text-indigo-600 hover:text-indigo-800">{t('purchases.addItem')}</button>
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
                    <input type="number" placeholder={t('purchases.weight')} required value={item.weight} onChange={(e) => updateItem(idx, 'weight', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" placeholder={t('purchases.rate')} required value={item.rate} onChange={(e) => updateItem(idx, 'rate', e.target.value)}
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
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? t('common.saving') : editing ? t('common.update') : t('purchases.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
