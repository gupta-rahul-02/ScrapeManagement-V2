import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN');

const downloadExcel = async (url, filename) => {
  try {
    const res = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Excel downloaded');
  } catch {
    toast.error('Failed to export');
  }
};

const TABS = [
  { key: 'master',      label: 'Master Ledger' },
  { key: 'vendor',      label: 'Vendor Ledger' },
  { key: 'buyer',       label: 'Buyer Ledger'  },
  { key: 'outstanding', label: 'Outstanding'   },
];

const ACCOUNT_COLORS = {
  Vendor:    'bg-purple-100 text-purple-800',
  Buyer:     'bg-blue-100 text-blue-800',
  Purchases: 'bg-orange-100 text-orange-800',
  Sales:     'bg-green-100 text-green-800',
  Cash:      'bg-yellow-100 text-yellow-800',
  Bank:      'bg-indigo-100 text-indigo-800',
  UPI:       'bg-pink-100 text-pink-800',
};

export default function Ledger() {
  const [tab, setTab] = useState('outstanding');

  // ── master state ─────────────────────────────────────────────────────────
  const [masterData,      setMasterData]      = useState(null);
  const [masterFilter,    setMasterFilter]    = useState({ accountType: '', startDate: '', endDate: '' });
  const [masterLoading,   setMasterLoading]   = useState(false);

  // ── vendor / buyer party ledger state ─────────────────────────────────────
  const [vendors,      setVendors]      = useState([]);
  const [buyers,       setBuyers]       = useState([]);
  const [partyLoading, setPartyLoading] = useState(false);

  const [selectedVendor, setSelectedVendor] = useState('');
  const [vendorData,     setVendorData]     = useState(null);
  const [vendorLoading,  setVendorLoading]  = useState(false);

  const [selectedBuyer,  setSelectedBuyer]  = useState('');
  const [buyerData,      setBuyerData]      = useState(null);
  const [buyerLoading,   setBuyerLoading]   = useState(false);

  // ── outstanding state ─────────────────────────────────────────────────────
  const [outstanding, setOutstanding] = useState(null);
  const [outLoading,  setOutLoading]  = useState(false);

  // ── data loaders ──────────────────────────────────────────────────────────
  const loadOutstanding = useCallback(async () => {
    setOutLoading(true);
    try {
      const { data } = await api.get('/ledger/outstanding');
      setOutstanding(data);
    } catch {
      toast.error('Failed to load outstanding');
    } finally {
      setOutLoading(false);
    }
  }, []);

  const loadPartyLists = useCallback(async () => {
    setPartyLoading(true);
    try {
      const [vRes, bRes] = await Promise.all([
        api.get('/vendors?limit=200'),
        api.get('/buyers?limit=200'),
      ]);
      setVendors(vRes.data.vendors || vRes.data || []);
      setBuyers(bRes.data.buyers   || bRes.data || []);
    } catch {
      toast.error('Failed to load parties');
    } finally {
      setPartyLoading(false);
    }
  }, []);

  const loadMasterLedger = useCallback(async () => {
    setMasterLoading(true);
    try {
      const params = {};
      if (masterFilter.accountType) params.accountType = masterFilter.accountType;
      if (masterFilter.startDate)   params.startDate   = masterFilter.startDate;
      if (masterFilter.endDate)     params.endDate     = masterFilter.endDate;
      const { data } = await api.get('/ledger/master', { params });
      setMasterData(data);
    } catch {
      toast.error('Failed to load master ledger');
    } finally {
      setMasterLoading(false);
    }
  }, [masterFilter]);

  const loadVendorLedger = useCallback(async (id) => {
    if (!id) return;
    setVendorLoading(true);
    try {
      const { data } = await api.get(`/ledger/vendor/${id}`);
      setVendorData(data);
    } catch {
      toast.error('Failed to load vendor ledger');
    } finally {
      setVendorLoading(false);
    }
  }, []);

  const loadBuyerLedger = useCallback(async (id) => {
    if (!id) return;
    setBuyerLoading(true);
    try {
      const { data } = await api.get(`/ledger/buyer/${id}`);
      setBuyerData(data);
    } catch {
      toast.error('Failed to load buyer ledger');
    } finally {
      setBuyerLoading(false);
    }
  }, []);

  // ── effects ───────────────────────────────────────────────────────────────
  useEffect(() => { loadOutstanding(); }, [loadOutstanding]);
  useEffect(() => {
    if (tab === 'vendor' || tab === 'buyer') loadPartyLists();
    if (tab === 'master') loadMasterLedger();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── tab switch helpers ────────────────────────────────────────────────────
  const goToVendorLedger = (vendor) => {
    setSelectedVendor(vendor._id);
    setTab('vendor');
    loadPartyLists();
    loadVendorLedger(vendor._id);
  };
  const goToBuyerLedger = (buyer) => {
    setSelectedBuyer(buyer._id);
    setTab('buyer');
    loadPartyLists();
    loadBuyerLedger(buyer._id);
  };

  // ── reusable ledger table ─────────────────────────────────────────────────
  const LedgerTable = ({ entries, showAccount = false }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            {showAccount && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>}
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
            {!showAccount && <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>}
            {showAccount && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Tx ID</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {entries.length === 0 ? (
            <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">No entries found</td></tr>
          ) : entries.map((e) => {
            const isOpening = e.entryType === 'opening_balance';
            return (
              <tr key={e._id} className={isOpening ? 'bg-amber-50 font-medium' : 'hover:bg-gray-50'}>
                <td className="px-3 py-2 whitespace-nowrap text-gray-500">{e.date ? fmtDate(e.date) : '—'}</td>
                {showAccount && (
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACCOUNT_COLORS[e.accountType] || 'bg-gray-100 text-gray-700'}`}>
                      {e.accountType}
                      {e.accountName ? ` – ${e.accountName}` : ''}
                    </span>
                  </td>
                )}
                <td className="px-3 py-2 capitalize text-gray-600">
                  {isOpening ? <span className="text-amber-700">Opening</span> : e.entryType.replace('_', ' ')}
                </td>
                <td className="px-3 py-2 text-gray-700">{e.description}</td>
                <td className="px-3 py-2 text-right text-red-600 font-medium">{e.debit  ? fmt(e.debit)  : '–'}</td>
                <td className="px-3 py-2 text-right text-green-600 font-medium">{e.credit ? fmt(e.credit) : '–'}</td>
                {!showAccount && <td className="px-3 py-2 text-right font-semibold">{fmt(e.runningBalance)}</td>}
                {showAccount && <td className="px-3 py-2 text-xs text-gray-400 font-mono truncate max-w-[6rem]" title={e.transactionId}>{e.transactionId?.slice(-8) || '—'}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Ledger</h1>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 -mb-px">
          {TABS.map(({ key, label }) => (
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

      {/* ── MASTER LEDGER ─────────────────────────────────────────── */}
      {tab === 'master' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account Type</label>
              <select
                value={masterFilter.accountType}
                onChange={(e) => setMasterFilter(f => ({ ...f, accountType: e.target.value }))}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">All Accounts</option>
                {['Vendor','Buyer','Purchases','Sales','Cash','Bank','UPI'].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input type="date" value={masterFilter.startDate}
                onChange={(e) => setMasterFilter(f => ({ ...f, startDate: e.target.value }))}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input type="date" value={masterFilter.endDate}
                onChange={(e) => setMasterFilter(f => ({ ...f, endDate: e.target.value }))}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
            </div>
            <button
              onClick={loadMasterLedger}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
            >
              Apply
            </button>
            {masterData && masterData.entries.length > 0 && (
              <button
                onClick={() => {
                  const params = new URLSearchParams();
                  if (masterFilter.accountType) params.set('accountType', masterFilter.accountType);
                  if (masterFilter.startDate) params.set('startDate', masterFilter.startDate);
                  if (masterFilter.endDate) params.set('endDate', masterFilter.endDate);
                  downloadExcel(`/ledger/export/master?${params.toString()}`, 'master-ledger.xlsx');
                }}
                className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                Export Excel
              </button>
            )}
          </div>

          {masterLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : masterData ? (
            <>
              {/* Balance check */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-xs text-red-600 font-medium">Total Debits</p>
                  <p className="text-xl font-bold text-red-900">{fmt(masterData.totalDebit)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xs text-green-600 font-medium">Total Credits</p>
                  <p className="text-xl font-bold text-green-900">{fmt(masterData.totalCredit)}</p>
                </div>
                <div className={`rounded-lg p-4 ${masterData.totalDebit === masterData.totalCredit ? 'bg-emerald-50' : 'bg-yellow-50'}`}>
                  <p className={`text-xs font-medium ${masterData.totalDebit === masterData.totalCredit ? 'text-emerald-600' : 'text-yellow-600'}`}>
                    Balance Check
                  </p>
                  <p className={`text-xl font-bold ${masterData.totalDebit === masterData.totalCredit ? 'text-emerald-900' : 'text-yellow-900'}`}>
                    {masterData.totalDebit === masterData.totalCredit ? '✓ Balanced' : '⚠ Unbalanced'}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className="px-4 py-3 border-b bg-gray-50 text-sm text-gray-500">
                  {masterData.total} entries
                </div>
                <LedgerTable entries={masterData.entries} showAccount={true} />
              </div>
            </>
          ) : (
            <p className="text-center py-12 text-gray-400">Click Apply to load the master ledger</p>
          )}
        </div>
      )}

      {/* ── VENDOR LEDGER ─────────────────────────────────────────── */}
      {tab === 'vendor' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4 flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Select Vendor</label>
              {partyLoading ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : (
                <select
                  value={selectedVendor}
                  onChange={(e) => { setSelectedVendor(e.target.value); loadVendorLedger(e.target.value); }}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="">— choose a vendor —</option>
                  {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {vendorLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : vendorData ? (
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">{vendorData.party?.name}</p>
                  <p className="text-xs text-gray-500">{vendorData.party?.phone} · {vendorData.party?.address}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => downloadExcel(`/ledger/export/vendor/${selectedVendor}`, `${vendorData.party?.name || 'vendor'}-ledger.xlsx`)}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                  >
                    Export Excel
                  </button>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Balance Payable</p>
                    <p className="text-lg font-bold text-red-600">{fmt(vendorData.party?.currentBalance)}</p>
                  </div>
                </div>
              </div>
              <LedgerTable entries={vendorData.entries} showAccount={false} />
              <div className="px-4 py-2 border-t text-xs text-gray-400 text-right">{vendorData.total} entries</div>
            </div>
          ) : (
            !selectedVendor && <p className="text-center py-12 text-gray-400">Select a vendor to view their ledger</p>
          )}
        </div>
      )}

      {/* ── BUYER LEDGER ──────────────────────────────────────────── */}
      {tab === 'buyer' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4 flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Select Buyer</label>
              {partyLoading ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : (
                <select
                  value={selectedBuyer}
                  onChange={(e) => { setSelectedBuyer(e.target.value); loadBuyerLedger(e.target.value); }}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="">— choose a buyer —</option>
                  {buyers.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {buyerLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : buyerData ? (
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">{buyerData.party?.name}</p>
                  <p className="text-xs text-gray-500">{buyerData.party?.phone} · GST: {buyerData.party?.gstNo || '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => downloadExcel(`/ledger/export/buyer/${selectedBuyer}`, `${buyerData.party?.name || 'buyer'}-ledger.xlsx`)}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                  >
                    Export Excel
                  </button>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Balance Receivable</p>
                    <p className="text-lg font-bold text-green-600">{fmt(buyerData.party?.currentBalance)}</p>
                  </div>
                </div>
              </div>
              <LedgerTable entries={buyerData.entries} showAccount={false} />
              <div className="px-4 py-2 border-t text-xs text-gray-400 text-right">{buyerData.total} entries</div>
            </div>
          ) : (
            !selectedBuyer && <p className="text-center py-12 text-gray-400">Select a buyer to view their ledger</p>
          )}
        </div>
      )}

      {/* ── OUTSTANDING ───────────────────────────────────────────── */}
      {tab === 'outstanding' && (
        outLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : outstanding ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-xs font-medium text-red-600">Total Payable (to Vendors)</p>
                <p className="text-xl font-bold text-red-900">{fmt(outstanding.totalPayable)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs font-medium text-green-600">Total Receivable (from Buyers)</p>
                <p className="text-xl font-bold text-green-900">{fmt(outstanding.totalReceivable)}</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-xs font-medium text-indigo-600">Net Position</p>
                <p className="text-xl font-bold text-indigo-900">{fmt(outstanding.netPosition)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vendors */}
              <div className="bg-white rounded-lg shadow">
                <h3 className="px-4 py-3 text-sm font-semibold text-gray-700 border-b bg-gray-50">
                  Vendor Payables (We Owe)
                </h3>
                <div className="divide-y max-h-96 overflow-y-auto">
                  {outstanding.vendors.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-gray-400">No outstanding payables</p>
                  ) : outstanding.vendors.map((v) => (
                    <div key={v._id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => goToVendorLedger(v)}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{v.name}</p>
                        <p className="text-xs text-gray-500">{v.phone}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-red-600">{fmt(v.currentBalance)}</span>
                        <p className="text-xs text-indigo-500 hover:underline">View ledger →</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buyers */}
              <div className="bg-white rounded-lg shadow">
                <h3 className="px-4 py-3 text-sm font-semibold text-gray-700 border-b bg-gray-50">
                  Buyer Receivables (They Owe Us)
                </h3>
                <div className="divide-y max-h-96 overflow-y-auto">
                  {outstanding.buyers.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-gray-400">No outstanding receivables</p>
                  ) : outstanding.buyers.map((b) => (
                    <div key={b._id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => goToBuyerLedger(b)}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{b.name}</p>
                        <p className="text-xs text-gray-500">{b.phone}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-green-600">{fmt(b.currentBalance)}</span>
                        <p className="text-xs text-indigo-500 hover:underline">View ledger →</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center py-12 text-gray-400">Loading…</p>
        )
      )}
    </div>
  );
}
