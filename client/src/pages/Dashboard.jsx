import { useState, useEffect } from 'react';
import api from '../services/api.js';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data: res } = await api.get('/dashboard');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) return <p className="text-gray-500">Failed to load dashboard</p>;

  const trendData = data.saleTrend.map((s) => {
    const purchase = data.purchaseTrend.find((p) => p._id === s._id);
    return {
      month: s._id,
      sales: s.total,
      purchases: purchase?.total || 0,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Purchases"
          value={`₹${(data.today.purchases.total || 0).toLocaleString()}`}
          sub={`${(data.today.purchases.weight || 0).toLocaleString()} kg`}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          title="Today's Sales"
          value={`₹${(data.today.sales.total || 0).toLocaleString()}`}
          sub={`${(data.today.sales.weight || 0).toLocaleString()} kg`}
          color="bg-green-50 text-green-700"
        />
        <StatCard
          title="Total Stock"
          value={`${data.totalStock.toLocaleString()} kg`}
          sub="Across all godowns"
          color="bg-amber-50 text-amber-700"
        />
        <StatCard
          title="Net Outstanding"
          value={`₹${(data.totalReceivable - data.totalPayable).toLocaleString()}`}
          sub={`Recv: ₹${data.totalReceivable.toLocaleString()} | Pay: ₹${data.totalPayable.toLocaleString()}`}
          color="bg-purple-50 text-purple-700"
        />
      </div>

      {/* Disputed Challans Alert */}
      {data.disputedChallans > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">
            ⚠️ {data.disputedChallans} disputed challan(s) — weight mismatch detected!
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Monthly Trend (6 months)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="purchases" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Stock */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Stock by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.categoryStock}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="totalWeight" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentList
          title="Recent Purchases"
          items={data.recentPurchases.map((p) => ({
            label: p.vendor?.name || 'Unknown',
            value: `₹${p.totalAmount.toLocaleString()}`,
            sub: `${p.totalWeight} kg`,
          }))}
        />
        <RecentList
          title="Recent Sales"
          items={data.recentSales.map((s) => ({
            label: s.buyer?.name || 'Unknown',
            value: `₹${s.totalAmount.toLocaleString()}`,
            sub: `${s.totalWeight} kg`,
          }))}
        />
        <RecentList
          title="Recent Payments"
          items={data.recentPayments.map((p) => ({
            label: p.partyId?.name || 'Unknown',
            value: `₹${p.amount.toLocaleString()}`,
            sub: `${p.type === 'in' ? 'Received' : 'Paid'} - ${p.mode}`,
          }))}
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, color }) {
  return (
    <div className={`rounded-lg p-4 ${color}`}>
      <p className="text-xs font-medium opacity-75">{title}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      <p className="text-xs mt-1 opacity-75">{sub}</p>
    </div>
  );
}

function RecentList({ title, items }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">No recent activity</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.sub}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
