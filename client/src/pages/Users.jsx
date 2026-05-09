import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';
import Modal from '../components/Modal.jsx';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, KeyIcon } from '@heroicons/react/24/outline';

const ROLE_BADGES = {
  owner: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
};

export default function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwUserId, setPwUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', role: 'manager',
  });

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch {
      toast.error(t('users.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', password: '', phone: '', role: 'manager' });
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: '', phone: user.phone || '', role: user.role });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, {
          name: form.name,
          phone: form.phone,
          role: form.role,
        });
        toast.success(t('users.updated'));
      } else {
        if (!form.password || form.password.length < 6) {
          toast.error(t('users.passwordTooShort'));
          setSubmitting(false);
          return;
        }
        await api.post('/users', form);
        toast.success(t('users.created'));
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || t('users.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.put(`/users/${user._id}`, { isActive: !user.isActive });
      toast.success(user.isActive ? t('users.deactivated') : t('users.activated'));
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || t('users.updateError'));
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.put(`/users/${pwUserId}/reset-password`, { password: newPassword });
      toast.success(t('users.passwordReset'));
      setPwModalOpen(false);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || t('users.passwordResetError'));
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel = (role) => role === 'owner' ? t('users.owner') : role === 'manager' ? t('users.manager') : role;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
        <button onClick={openCreate} className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
          <PlusIcon className="w-4 h-4" /> {t('users.add')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.name')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.email')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.phone')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('auth.role')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.createdAt')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{t('users.noResults')}</td></tr>
              ) : users.map((user) => (
                <tr key={user._id} className={`hover:bg-gray-50 ${!user.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">{user.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGES[user.role] || 'bg-gray-100 text-gray-700'}`}>
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'}`}>
                      {user.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(user.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(user)} className="p-1 text-gray-400 hover:text-indigo-600" title={t('common.edit')}>
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setPwUserId(user._id); setPwModalOpen(true); setNewPassword(''); }}
                        className="p-1 text-gray-400 hover:text-amber-600"
                        title={t('users.resetPassword')}
                      >
                        <KeyIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(user)}
                        className={`px-2 py-0.5 rounded text-xs font-medium ${user.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                      >
                        {user.isActive ? t('users.deactivate') : t('users.activate')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE/EDIT USER MODAL */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? t('users.edit') : t('users.add')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name')} *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.email')} *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
              disabled={!!editingUser}
            />
          </div>
          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.password')} *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder={t('users.minChars')}
                required
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.phone')}</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.role')} *</label>
              <select
                value={form.role}
                onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="manager">{t('users.manager')}</option>
                <option value="owner">{t('users.owner')}</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? t('common.saving') : editingUser ? t('common.update') : t('users.createUser')}
            </button>
          </div>
        </form>
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal isOpen={pwModalOpen} onClose={() => setPwModalOpen(false)} title={t('users.resetPassword')}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.newPassword')} *</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder={t('users.minChars')}
              required
              minLength={6}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setPwModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? t('common.saving') : t('users.resetPassword')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
