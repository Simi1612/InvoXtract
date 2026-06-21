import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../lib/api'

export default function History() {
  const [invoices, setInvoices] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const LIMIT = 20

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: LIMIT }
      if (search) params.search = search
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const { data } = await api.get('/invoices', { params })
      setInvoices(data.invoices)
      setTotal(data.total)
    } catch { toast.error('Failed to load') }
    setLoading(false)
  }, [page, search, dateFrom, dateTo])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])
  useEffect(() => {
    const ids = searchParams.get('consolidate')
    if (ids) setSelected(new Set(ids.split(',')))
  }, [searchParams])

  function toggle(id) {
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    setDeleting(id)
    try { await api.delete(`/invoices/${id}`); toast.success('Deleted'); fetchInvoices() }
    catch { toast.error('Delete failed') }
    setDeleting(null)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Invoice History</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} invoice{total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-2">
          {selected.size >= 2 && (
            <button onClick={() => navigate(`/consolidate?ids=${[...selected].join(',')}`)}
              className="btn-primary text-xs flex items-center gap-1.5">
              Merge Selected ({selected.size}) →
            </button>
          )}
          <Link to="/upload" className="btn-secondary text-xs flex items-center gap-1.5">
            <span>⬆</span> Upload
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input type="text" placeholder="Search vendor or invoice #..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="input flex-1 min-w-[180px] max-w-xs" />
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} className="input w-36" />
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} className="input w-36" />
        {(search || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPage(1) }}
            className="text-sm text-gray-400 hover:text-red-500 px-2">✕ Clear</button>
        )}
      </div>

      {loading ? (
        <div className="card overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex items-center gap-4 px-5 py-4 ${i < 4 ? 'border-b border-gray-50' : ''}`}>
              <div className="skeleton w-4 h-4 rounded" />
              <div className="skeleton h-4 flex-1 rounded" />
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-4 w-20 rounded" />
            </div>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="card py-20 text-center">
          <div className="text-5xl mb-4">📂</div>
          <p className="font-semibold text-gray-700">No invoices found</p>
          <p className="text-sm text-gray-400 mt-1">{search ? 'Try a different search' : 'Upload your first invoice 📄'}</p>
          {!search && <Link to="/upload" className="btn-primary inline-flex mt-4 text-xs">Upload now</Link>}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <table className="w-full">
              <thead className="bg-gray-50/60 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <input type="checkbox"
                      checked={selected.size === invoices.length && invoices.length > 0}
                      onChange={() => selected.size === invoices.length
                        ? setSelected(new Set())
                        : setSelected(new Set(invoices.map(i => i.id)))}
                      className="w-4 h-4 accent-indigo-600" />
                  </th>
                  {['Vendor', 'Invoice #', 'Date', 'Total', 'Uploaded', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map(inv => (
                  <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="hover:bg-gray-50/60 cursor-pointer transition-colors">
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggle(inv.id)}
                        className="w-4 h-4 accent-indigo-600" />
                    </td>
                    <td className="px-4 py-3.5 font-medium text-gray-900 text-sm max-w-[160px] truncate">{inv.vendor_name || '—'}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-sm">{inv.invoice_number || '—'}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-sm">{inv.date || '—'}</td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900 text-sm">
                      {inv.total != null ? `${inv.currency || ''} ${inv.total}` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <button onClick={e => handleDelete(inv.id, e)} disabled={deleting === inv.id}
                        className="text-xs text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40 p-1">
                        {deleting === inv.id ? '...' : '🗑'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {invoices.map(inv => (
              <div key={inv.id} className="card p-4 flex items-center gap-3">
                <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggle(inv.id)}
                  className="w-4 h-4 accent-indigo-600 shrink-0" />
                <div className="flex-1 min-w-0" onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <p className="font-medium text-gray-900 text-sm truncate">{inv.vendor_name || '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{inv.date || '—'} · {inv.invoice_number || ''}</p>
                </div>
                <span className="font-bold text-sm text-gray-900 shrink-0">
                  {inv.total != null ? `${inv.currency || ''} ${inv.total}` : '—'}
                </span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs">← Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-xs">Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
