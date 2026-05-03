import { useState, useEffect } from 'react';
import api from '../services/api.js';
import Modal from '../components/Modal.jsx';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const fmt = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN');
const MODE_LABELS = { cash: 'Cash', bank_transfer: 'Bank Transfer', upi: 'UPI' };

export default function Expenses() {
  const [tab, setTab] = useState('expenses');

  // ── Expenses state ──────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({ category: '', mode: '', startDate: '', endDate: '' });

  const [form, setForm] = useState({
    category: '', amount: '', mode: 'cash', reference: '', description: '',
    date: new Date().toISOString().split('T')[0], notes: '',
  });

  // ── Categories state ────────────────────────────────────────────────────
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '' });
  const [editingCat, setEditingCat] = useState(null);

  // ── Fetch ───────────────────────────────────────────────────────────────
  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/expense-categories');
      setCategories(data);
    } catch {
      toast.error('Failed to load expense categories');
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.mode) params.mode = filters.mode;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const { data } = await api.get('/expenses', { params });
      setExpenses(data.expenses);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchExpenses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Expense handlers ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses', { ...form, amount: Number(form.amount) });
      toast.success('Expense recorded');
      setModalOpen(false);
      setForm({ category: '', amount: '', mode: 'cash', reference: '', description: '', date: new Date().toISOString().split('T')[0], notes: '' });
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error recording expense');
    }
  };

  // ── Category handlers ───────────────────────────────────────────────────
  const openCatModal = (cat = null) => {
    if (cat) {
      setEditingCat(cat);
      setCatForm({ name: cat.name });
    } else {
      setEditingCat(null);
      setCatForm({ name: '' });
    }
    setCatModalOpen(true);
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCat) {
        await api.put(`/expense-categories/${editingCat._id}`, catForm);
        toast.success('Category updated');
      } else {
        await api.post('/expense-categories', catForm);
        toast.success('Category created');
      }
      setCatModalOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving category');
    }
  };

  const handleCatDelete = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      const { data } = await api.delete(`/expense-categories/${id}`);
      toast.success(data.message);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting category');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        {tab === 'expenses' && (
          <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
            <PlusIcon className="w-4 h-4" /> Add Expense
          </button>
        )}
        {tab === 'categories' && (
          <button onClick={() => openCatModal()} className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
            <PlusIcon className="w-4 h-4" /> Add Category
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 -mb-px">
          {[{ key: 'expenses', label: 'Expenses' }, { key: 'categories', label: 'Categories' }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── EXPENSES TAB ─────────────────────────────────────────── */}
      {tab === 'expenses' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">All</option>
                {categories.filter(c => c.isActive).map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mode</label>
              <select
                value={filters.mode}
                onChange={(e) => setFilters(f => ({ ...f, mode: e.target.value }))}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">All</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input type="date" value={filters.startDate}
                onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input type="date" value={filters.endDate}
                onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
            </div>
            <button
              onClick={fetchExpenses}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
            >
              Apply
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {expenses.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No expenses found</td></tr>
                  ) : expenses.map((exp) => (
                    <tr key={exp._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{fmtDate(exp.date)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          {exp.category?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{exp.description}</td>
                      <td className="px-4 py-3 text-gray-600">{MODE_LABELS[exp.mode] || exp.mode}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(exp.amount)}</td>
                      <td className="px-4 py-3 text-gray-500">{exp.createdBy?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {expenses.length > 0 && (
                <div className="px-4 py-3 border-t bg-gray-50 text-right">
                  <span className="text-sm font-semibold text-gray-700">
                    Total: <span className="text-red-600">{fmt(expenses.reduce((s, e) => s + e.amount, 0))}</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CATEGORIES TAB ───────────────────────────────────────── */}
      {tab === 'categories' && (
        <div className="bg-white rounded-lg shadow">
          <div className="divide-y divide-gray-200">
            {categories.length === 0 ? (
              <p className="px-4 py-8 text-center text-gray-400">No expense categories yet. Add one to get started.</p>
            ) : categories.map((cat) => (
              <div key={cat._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{cat.name}</span>
                  {!cat.isActive && (
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-500">Inactive</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openCatModal(cat)} className="p-1 text-gray-400 hover:text-indigo-600">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleCatDelete(cat._id)} className="p-1 text-gray-400 hover:text-red-600">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ADD EXPENSE MODAL ────────────────────────────────────── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              value={form.category}
              onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            >
              <option value="">— select category —</option>
              {categories.filter(c => c.isActive).map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Monthly rent payment"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode *</label>
              <select
                value={form.mode}
                onChange={(e) => setForm(f => ({ ...f, mode: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setForm(f => ({ ...f, reference: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Txn/Receipt No."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={2}
              placeholder="Optional notes"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">Record Expense</button>
          </div>
        </form>
      </Modal>

      {/* ── CATEGORY MODAL ───────────────────────────────────────── */}
      <Modal isOpen={catModalOpen} onClose={() => setCatModalOpen(false)} title={editingCat ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleCatSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
            <input
              type="text"
              value={catForm.name}
              onChange={(e) => setCatForm({ name: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Wages, Electricity, Rent"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCatModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
              {editingCat ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
