import { useState, useEffect } from 'react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

const fmtW = (w) => `${Number(w ?? 0).toLocaleString('en-IN')} kg`;
const pct  = (part, total) => total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';

const COLORS = [
  'bg-indigo-500','bg-emerald-500','bg-amber-500','bg-rose-500',
  'bg-sky-500','bg-violet-500','bg-orange-500','bg-teal-500',
];

export default function Inventory() {
  const [inventory, setInventory] = useState([]);   // grouped by godown
  const [summary,   setSummary]   = useState([]);   // grouped by category
  const [godowns,   setGodowns]   = useState([]);
  const [alerts,    setAlerts]    = useState(null);  // stock alerts (negative/zero)
  const [loading,   setLoading]   = useState(true);
  const [view,      setView]      = useState('godown');   // 'godown' | 'category' | 'alerts'
  const [filterGodown, setFilterGodown] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [inv, sum, gd, al] = await Promise.all([
        api.get('/inventory'),
        api.get('/inventory/summary'),
        api.get('/godowns'),
        api.get('/inventory/alerts'),
      ]);
      setInventory(inv.data);
      setSummary(sum.data);
      setGodowns(gd.data?.godowns || gd.data || []);
      setAlerts(al.data);
    } catch {
      toast.error('Failed to load inventory');
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

  const totalStock = summary.reduce((s, r) => s + r.totalWeight, 0);

  // filtered godown list
  const displayInventory = filterGodown
    ? inventory.filter(g => g.godown._id === filterGodown)
    : inventory;

  // Build category → [{ godownName, weight }] map for the "By Category" view
  const catMap = {};
  inventory.forEach(g => {
    g.items.forEach(item => {
      const key = item.category._id;
      if (!catMap[key]) catMap[key] = { name: item.category.name, unit: item.category.unit, godowns: [], total: 0 };
      catMap[key].godowns.push({ godownName: g.godown.name, godownId: g.godown._id, weight: item.currentWeight });
      catMap[key].total += item.currentWeight;
    });
  });
  const catList = Object.values(catMap).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-indigo-50 rounded-lg p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-indigo-600">Total Stock</p>
          <p className="text-xl font-bold text-indigo-900 mt-1">{fmtW(totalStock)}</p>
          <p className="text-xs text-indigo-400">{inventory.length} godown(s)</p>
        </div>
        {summary.slice(0, 4).map((s, i) => (
          <div key={s.category} className="bg-white rounded-lg shadow p-4">
            <div className={`w-2 h-2 rounded-full ${COLORS[i % COLORS.length]} mb-2`}></div>
            <p className="text-xs font-medium text-gray-500 truncate">{s.category}</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{Number(s.totalWeight).toLocaleString()} {s.unit}</p>
            <p className="text-xs text-gray-400">{pct(s.totalWeight, totalStock)}% of total</p>
          </div>
        ))}
      </div>

      {/* Godown Distribution Bar */}
      {inventory.length > 1 && (
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Godown Distribution</p>
          <div className="flex h-6 rounded-full overflow-hidden w-full">
            {inventory.map((g, i) => {
              const w = pct(g.totalWeight, totalStock);
              return (
                <div
                  key={g.godown._id}
                  className={`${COLORS[i % COLORS.length]} transition-all`}
                  style={{ width: `${w}%` }}
                  title={`${g.godown.name}: ${fmtW(g.totalWeight)} (${w}%)`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {inventory.map((g, i) => (
              <div key={g.godown._id} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className={`inline-block w-2.5 h-2.5 rounded-sm ${COLORS[i % COLORS.length]}`}></span>
                {g.godown.name} — {fmtW(g.totalWeight)} ({pct(g.totalWeight, totalStock)}%)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View toggle + Godown filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          <button
            onClick={() => setView('godown')}
            className={`px-4 py-1.5 font-medium ${view === 'godown' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            By Godown
          </button>
          <button
            onClick={() => setView('category')}
            className={`px-4 py-1.5 font-medium ${view === 'category' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            By Category
          </button>
          <button
            onClick={() => setView('alerts')}
            className={`px-4 py-1.5 font-medium relative ${view === 'alerts' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Stock Alerts
            {alerts && alerts.overSold?.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {alerts.overSold.length}
              </span>
            )}
          </button>
        </div>

        {view === 'godown' && (
          <select
            value={filterGodown}
            onChange={e => setFilterGodown(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All Godowns</option>
            {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
          </select>
        )}
      </div>

      {/* ── BY GODOWN VIEW ── */}
      {view === 'godown' && (
        <div className="space-y-4">
          {displayInventory.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No stock data. Make purchases to see inventory.
            </div>
          ) : displayInventory.map((g, gi) => (
            <div key={g.godown._id} className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-sm ${COLORS[gi % COLORS.length]}`}></span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{g.godown.name}</h3>
                    {g.godown.location && <p className="text-xs text-gray-500">{g.godown.location}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-indigo-600">{fmtW(g.totalWeight)}</span>
                  <p className="text-xs text-gray-400">{pct(g.totalWeight, totalStock)}% of total</p>
                </div>
              </div>

              {/* Mini progress bar per category inside godown */}
              <div className="px-4 pt-3 pb-1">
                <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 w-full">
                  {g.items.map((item, ii) => (
                    <div
                      key={item.category._id}
                      className={`${COLORS[(gi * 4 + ii) % COLORS.length]}`}
                      style={{ width: `${pct(item.currentWeight, g.totalWeight)}%` }}
                      title={`${item.category.name}: ${fmtW(item.currentWeight)}`}
                    />
                  ))}
                </div>
              </div>

              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {g.items.map((item, ii) => (
                  <div key={item.category._id} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-2 h-2 rounded-full ${COLORS[(gi * 4 + ii) % COLORS.length]}`}></span>
                      <p className="text-xs font-medium text-gray-500 truncate">{item.category.name}</p>
                    </div>
                    <p className="text-lg font-bold text-gray-800">{Number(item.currentWeight).toLocaleString()} <span className="text-xs font-normal text-gray-400">{item.category.unit}</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">{pct(item.currentWeight, g.totalWeight)}% of godown</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── BY CATEGORY VIEW ── */}
      {view === 'category' && (
        <div className="space-y-3">
          {catList.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No stock data.</div>
          ) : catList.map((cat, ci) => (
            <div key={cat.name} className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-sm ${COLORS[ci % COLORS.length]}`}></span>
                  <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                </div>
                <span className="text-sm font-bold text-indigo-600">{Number(cat.total).toLocaleString()} {cat.unit} total</span>
              </div>

              {/* Distribution bar across godowns */}
              <div className="px-4 pt-3 pb-1">
                <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 w-full">
                  {cat.godowns.map((gd, gi) => (
                    <div
                      key={gd.godownId}
                      className={`${COLORS[gi % COLORS.length]}`}
                      style={{ width: `${pct(gd.weight, cat.total)}%` }}
                      title={`${gd.godownName}: ${fmtW(gd.weight)}`}
                    />
                  ))}
                </div>
              </div>

              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {cat.godowns.map((gd, gi) => (
                  <div key={gd.godownId} className="border rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-2 h-2 rounded-full ${COLORS[gi % COLORS.length]}`}></span>
                      <p className="text-xs font-medium text-gray-500 truncate">{gd.godownName}</p>
                    </div>
                    <p className="text-lg font-bold text-gray-800">{Number(gd.weight).toLocaleString()} <span className="text-xs font-normal text-gray-400">{cat.unit}</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">{pct(gd.weight, cat.total)}% of category</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── STOCK ALERTS VIEW ── */}
      {view === 'alerts' && alerts && (
        <div className="space-y-4">
          {(!alerts.overSold || alerts.overSold.length === 0) && (!alerts.zero || alerts.zero.length === 0) ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-green-600 font-medium text-lg">All Clear</p>
              <p className="text-gray-500 text-sm mt-1">No over-sold or empty stock items found.</p>
            </div>
          ) : (
            <>
              {/* Summary banner */}
              {alerts.overSold?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-semibold">
                    {alerts.overSold.length} item(s) sold beyond available stock (sorting surplus)
                  </p>
                  <p className="text-red-600 text-sm mt-1">
                    Total over-sold weight: {Number(alerts.totalOverSoldWeight).toLocaleString()} kg
                  </p>
                  <p className="text-red-500 text-xs mt-2">
                    Over-sold means more was sold in this category than was purchased &mdash; sorting converted material from another category into this one.
                  </p>
                </div>
              )}

              {/* Over-sold stock table */}
              {alerts.overSold?.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 py-3 border-b bg-red-50">
                    <h3 className="font-semibold text-red-800">Over-Sold Stock (Sorting Surplus)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Godown</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Over-Sold</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {alerts.overSold.map((a) => (
                          <tr key={a._id} className="bg-red-50/50">
                            <td className="px-4 py-3 font-medium text-gray-900">{a.godown?.name}</td>
                            <td className="px-4 py-3 text-gray-700">{a.category?.name}</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-700">
                              {Number(a.currentWeight).toLocaleString()} {a.category?.unit}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-red-600">
                              +{Number(a.overSold).toLocaleString()} {a.category?.unit}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Sorting Surplus</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Zero stock table */}
              {alerts.zero?.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 py-3 border-b bg-amber-50">
                    <h3 className="font-semibold text-amber-800">Zero Stock (Empty)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Godown</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {alerts.zero.map((a) => (
                          <tr key={a._id} className="bg-amber-50/50">
                            <td className="px-4 py-3 font-medium text-gray-900">{a.godown?.name}</td>
                            <td className="px-4 py-3 text-gray-700">{a.category?.name}</td>
                            <td className="px-4 py-3 text-right font-bold text-amber-600">0 {a.category?.unit}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Empty</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
