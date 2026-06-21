import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import api from '../lib/api'

const COLORS = ['#4F46E5', '#7C3AED', '#2563EB', '#0891B2', '#059669', '#D97706', '#DC2626']

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="font-medium" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.name === 'Spend'
            ? `₹${new Intl.NumberFormat('en-IN').format(Math.round(p.value))}`
            : p.value}
        </p>
      ))}
    </div>
  )
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1.5">{value ?? <span className="skeleton h-7 w-24 inline-block rounded" />}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  )
}

export default function Analytics() {
  const [summary, setSummary] = useState(null)
  const [vendors, setVendors] = useState([])
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  async function load() {
    setLoading(true)
    const params = {}
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    try {
      const [s, v, m] = await Promise.all([
        api.get('/analytics/summary', { params }),
        api.get('/analytics/by-vendor', { params: { ...params, limit: 7 } }),
        api.get('/analytics/monthly'),
      ])
      setSummary(s.data); setVendors(v.data); setMonthly(m.data)
    } catch { toast.error('Failed to load analytics') }
    setLoading(false)
  }

  useEffect(() => { load() }, [dateFrom, dateTo])

  const fmt = n => n != null ? `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}` : '—'

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Spend insights across all your invoices</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-xs text-gray-400 hover:text-red-500 px-1">✕ Clear</button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-24 skeleton shadow-sm" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="📄" label="Total Invoices" value={summary?.total_invoices} />
          <StatCard icon="💰" label="Total Spend" value={fmt(summary?.total_spend)} />
          <StatCard icon="📈" label="Avg Invoice" value={fmt(summary?.avg_invoice_value)} />
          <StatCard icon="📅" label="This Month" value={summary?.this_month_invoices}
            sub={`${fmt(summary?.this_month_spend)} spend`} />
        </div>
      )}

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Top Vendors by Spend</h2>
          {loading ? <div className="skeleton h-52 rounded-xl" /> :
            vendors.length === 0 ? <p className="text-center text-gray-400 text-sm py-16">No data yet</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={vendors} margin={{ top: 0, right: 0, bottom: 40, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="vendor" tick={{ fontSize: 10, fill: '#9CA3AF' }} angle={-20} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={v => v >= 1000 ? `₹${Math.round(v/1000)}K` : `₹${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total_spend" name="Spend" radius={[6, 6, 0, 0]}>
                    {vendors.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Line chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Monthly Trends</h2>
          {loading ? <div className="skeleton h-52 rounded-xl" /> :
            monthly.length === 0 ? <p className="text-center text-gray-400 text-sm py-16">No data yet</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    tickFormatter={v => v >= 1000 ? `₹${Math.round(v/1000)}K` : `₹${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line yAxisId="left" type="monotone" dataKey="invoice_count" stroke="#4F46E5" strokeWidth={2.5}
                    dot={{ r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: '#fff' }} name="Invoices" />
                  <Line yAxisId="right" type="monotone" dataKey="total_spend" stroke="#10B981" strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} name="Spend" />
                </LineChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>

      {/* Vendor breakdown table */}
      {vendors.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">Vendor Breakdown</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60">
              <tr>{['Vendor', 'Invoices', 'Total Spend'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vendors.map((v, i) => (
                <tr key={v.vendor} className="hover:bg-gray-50/40 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    {v.vendor}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{v.invoice_count}</td>
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{fmt(v.total_spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
