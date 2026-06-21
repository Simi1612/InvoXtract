import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../lib/api'

const STAT_CARDS = [
  { key: 'total_invoices', label: 'Total Invoices', icon: '📄', color: 'bg-blue-50 text-blue-600', trend: (s) => s.last_month_invoices },
  { key: 'total_spend', label: 'Total Spend', icon: '💰', color: 'bg-green-50 text-green-600', fmt: true, trend: (s) => s.last_month_spend },
  { key: 'avg_invoice_value', label: 'Average Invoice', icon: '📊', color: 'bg-purple-50 text-purple-600', fmt: true },
  { key: 'this_month_invoices', label: 'This Month', icon: '📅', color: 'bg-orange-50 text-orange-600', trend: (s) => s.last_month_invoices },
  { key: 'total_vendors', label: 'Total Vendors', icon: '🏢', color: 'bg-indigo-50 text-indigo-600' },
]

const DONUT_COLORS = { completed: '#10B981', processing: '#6366F1', failed: '#EF4444' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-0.5">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="font-medium" style={{ color: p.color }}>
          ₹{new Intl.NumberFormat('en-IN').format(Math.round(p.value))}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState([])
  const [vendors, setVendors] = useState([])
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/analytics/summary'),
      api.get('/invoices', { params: { page: 1, limit: 5 } }),
      api.get('/analytics/by-vendor', { params: { limit: 5 } }),
      api.get('/analytics/monthly'),
    ]).then(([s, r, v, m]) => {
      setSummary(s.data)
      setRecent(r.data.invoices)
      setVendors(v.data)
      setMonthly(m.data.slice(-6))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const fmt = n => n != null ? `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}` : '—'
  const name = user?.email?.split('@')[0] || 'there'

  const donutData = summary ? [
    { name: 'Processed', value: summary.status_breakdown?.completed || 0, color: DONUT_COLORS.completed },
    { name: 'Processing', value: summary.status_breakdown?.processing || 0, color: DONUT_COLORS.processing },
    { name: 'Failed', value: summary.status_breakdown?.failed || 0, color: DONUT_COLORS.failed },
  ] : []

  const totalDonut = donutData.reduce((a, b) => a + b.value, 0)

  function trendPct(current, prev) {
    if (!prev) return null
    const pct = Math.round(((current - prev) / prev) * 100)
    return pct
  }

  return (
    <div className="p-6 pb-24 md:pb-6 space-y-5 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good day, {name} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with your invoices today.</p>
        </div>
        <button onClick={() => navigate('/upload')}
          className="hidden md:flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm">
          <span>⬆</span> Upload Invoice
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STAT_CARDS.map(({ key, label, icon, color, fmt: doFmt, trend }) => {
          const val = summary?.[key]
          const trendVal = summary && trend ? trendPct(summary[key], trend(summary)) : null
          return (
            <div key={key} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${color}`}>{icon}</div>
                <span className="text-xs text-gray-500 font-medium leading-tight">{label}</span>
              </div>
              {loading ? <div className="skeleton h-7 w-20 rounded" /> : (
                <p className="text-xl font-bold text-gray-900">{doFmt ? fmt(val) : (val ?? '—')}</p>
              )}
              {trendVal != null && !loading && (
                <p className={`text-xs font-medium mt-1 ${trendVal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {trendVal >= 0 ? '+' : ''}{trendVal}% vs last month
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Monthly Spend line chart */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm">Monthly Spend Overview</h2>
          </div>
          {loading ? <div className="skeleton h-48 rounded-xl" /> :
            monthly.length === 0 ? <p className="text-center text-gray-400 text-sm py-16">No data yet</p> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthly}>
                  <defs>
                    <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={v => `₹${v >= 1000 ? `${Math.round(v/1000)}K` : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="total_spend" stroke="#6366F1" strokeWidth={2.5}
                    dot={{ r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }} fill="url(#spend)" name="Spend" />
                </LineChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Invoices by Status donut */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Invoices by Status</h2>
          {loading ? <div className="skeleton h-48 rounded-xl" /> : totalDonut === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">No data</p>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative">
                <PieChart width={160} height={160}>
                  <Pie data={donutData} cx={75} cy={75} innerRadius={50} outerRadius={70}
                    paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{totalDonut}</span>
                  <span className="text-xs text-gray-400">Total</span>
                </div>
              </div>
              <div className="space-y-1.5 w-full mt-2">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-gray-600">{d.name}</span>
                    </div>
                    <span className="font-semibold text-gray-700">{d.value} ({totalDonut > 0 ? Math.round(d.value/totalDonut*100) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Recent Invoices + Top Vendors */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Recent Invoices */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Invoices</h2>
            <Link to="/history" className="text-xs text-indigo-600 font-medium hover:underline">View all →</Link>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-10 rounded" />)}</div>
          ) : recent.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">No invoices yet</p>
              <Link to="/upload" className="text-xs text-indigo-600 font-medium hover:underline mt-1 block">Upload now →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/60">
                  <tr>{['VENDOR', 'INVOICE #', 'DATE', 'AMOUNT', 'STATUS', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recent.map(inv => (
                    <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="hover:bg-gray-50/60 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[120px] truncate">{inv.vendor_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{inv.invoice_number || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{inv.date || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{inv.total != null ? `₹${inv.total}` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                          inv.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          inv.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {inv.status === 'completed' ? 'Processed' : inv.status === 'failed' ? 'Failed' : 'Processing'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 hover:text-indigo-500 transition-colors">👁</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Vendors */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm">Top Vendors</h2>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}</div>
          ) : vendors.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No vendor data yet</p>
          ) : (
            <div className="space-y-3">
              {vendors.map((v, i) => {
                const maxSpend = vendors[0]?.total_spend || 1
                const pct = Math.round((v.total_spend / maxSpend) * 100)
                return (
                  <div key={v.vendor}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[140px]">{v.vendor}</span>
                      <span className="text-sm font-bold text-gray-900">₹{new Intl.NumberFormat('en-IN').format(v.total_spend)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Features section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-sm">Powerful Features to Simplify Your Workflow</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { icon: '🌐', title: 'Multi-language', desc: 'Extract from invoices in 90+ languages' },
            { icon: '📋', title: 'Custom Templates', desc: 'Extract only the data you need' },
            { icon: '📦', title: 'Bulk Processing', desc: 'Upload and process up to 50 invoices' },
            { icon: '⬇', title: 'Multiple Exports', desc: 'Export to Excel, PDF, JSON & more' },
            { icon: '🔗', title: 'Consolidation', desc: 'Merge multiple invoices into one report' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/60">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-base shrink-0">{f.icon}</div>
              <div>
                <p className="text-xs font-semibold text-gray-800">{f.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
