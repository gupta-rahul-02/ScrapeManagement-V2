import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'manager' });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const currentLang = i18n.language?.startsWith('hi') ? 'hi' : 'en';
  const toggleLang = () => i18n.changeLanguage(currentLang === 'en' ? 'hi' : 'en');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
      toast.success(isLogin ? t('auth.welcomeBack') : t('auth.accountCreated'));
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-2">
          <button
            onClick={toggleLang}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            {currentLang === 'en' ? 'हिंदी' : 'English'}
          </button>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-indigo-600">{t('nav.appName')}</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">
              {isLogin ? t('auth.signInTitle') : t('auth.createAccountTitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('common.name')}</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('common.email')}</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('common.password')}</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('common.phone')}</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('auth.role')}</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  >
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? t('auth.pleaseWait') : isLogin ? t('auth.signIn') : t('auth.createAccount')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-slate-400 mt-4">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-600 font-medium hover:underline"
            >
              {isLogin ? t('auth.needAccount') : t('auth.haveAccount')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
