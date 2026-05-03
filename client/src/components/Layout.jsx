import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  HomeIcon,
  CubeIcon,
  TruckIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  TagIcon,
  BuildingOfficeIcon,
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ScaleIcon,
  DocumentTextIcon,
  SunIcon,
  MoonIcon,
  ReceiptRefundIcon,
  Cog6ToothIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, roles: ['owner', 'manager'] },
  { name: 'Purchases', href: '/purchases', icon: CubeIcon, roles: ['owner', 'manager'] },
  { name: 'Inventory', href: '/inventory', icon: BuildingStorefrontIcon, roles: ['owner', 'manager'] },
  { name: 'Sales', href: '/sales', icon: BanknotesIcon, roles: ['owner', 'manager'] },
  { name: 'Challans', href: '/challans', icon: DocumentTextIcon, roles: ['owner', 'manager'] },
  { name: 'Payments', href: '/payments', icon: BanknotesIcon, roles: ['owner', 'manager'] },
  { name: 'Expenses', href: '/expenses', icon: ReceiptRefundIcon, roles: ['owner', 'manager'] },
  { name: 'Ledger', href: '/ledger', icon: ClipboardDocumentListIcon, roles: ['owner', 'manager'] },
  { name: 'Vendors', href: '/vendors', icon: UserGroupIcon, roles: ['owner', 'manager'] },
  { name: 'Buyers', href: '/buyers', icon: ScaleIcon, roles: ['owner', 'manager'] },
  { name: 'Categories', href: '/categories', icon: TagIcon, roles: ['owner', 'manager'] },
  { name: 'Godowns', href: '/godowns', icon: BuildingOfficeIcon, roles: ['owner', 'manager'] },
  { name: 'Trucks', href: '/trucks', icon: TruckIcon, roles: ['owner', 'manager'] },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, roles: ['owner'] },
  { name: 'Users', href: '/users', icon: UsersIcon, roles: ['owner'] },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const location = useLocation();

  const filteredNav = navigation.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600/75 dark:bg-black/75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-slate-800 shadow-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b dark:border-slate-700">
              <h1 className="text-lg font-bold text-indigo-600">Scrap Mgmt</h1>
              <button onClick={() => setSidebarOpen(false)}>
                <XMarkIcon className="h-6 w-6 dark:text-slate-300" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {filteredNav.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.href
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between px-6 py-5 border-b dark:border-slate-700">
            <h1 className="text-xl font-bold text-indigo-600">Scrap Mgmt</h1>
            <button
              onClick={toggle}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {filteredNav.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.href
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="border-t dark:border-slate-700 px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                title="Logout"
              >
                <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar for mobile */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-3 lg:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)}>
              <Bars3Icon className="h-6 w-6 text-gray-600 dark:text-slate-300" />
            </button>
            <h1 className="text-lg font-bold text-indigo-600">Scrap Mgmt</h1>
          </div>
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
        </div>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
