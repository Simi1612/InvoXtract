import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../lib/api'

const EXPORT_FORMATS = [
  { fmt: 'excel', label: 'Excel', ext: 'xlsx' },
  { fmt: 'csv', label: 'CSV', ext: 'csv' },
  { fmt: 'json', label: 'JSON', ext: 'json' },
  { fmt: 'pdf', label: 'PDF', ext: 'pdf' },
]

export default function Consolidate() {
  const [searchParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(null)
  const ids = searchParams.get('ids') || ''

  useEffect(() => {
    if (!ids) { setLoading(false); return }
    api.get('/invoices/consolidate-data', { params: { invoice_ids: ids } })
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [ids])

  async function handleExport(format) {
    setExporting(format)
    try {
      const res = await api.post(`/export/consolidated?format=${format}`,
        { invoice_ids: ids.split(',') }, { responseType: 'blob' })
      const ext = EXPORT_FORMATS.find(f => f.fmt === format)?.ext || format
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = `consolidated.${ext}`; a.click()
      URL.revokeObjectURL(url)
      toast.success(`Downloaded ${format.toUpperCase()}`)
    } catch { toast.error('Export failed') }
    setExporting(null)
  }

  const fmtNum = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0))

  if (loading) return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-40 skeleton" />)}
    </div>
  )

  if (!data || !ids) return (
    <div className="p-6 text-center py-20">
      <p className="text-gray-500 font-medium">No invoices selected</p>
      <Link to="/history" className="text-indigo-600 text-sm hover:underline mt-2 block">← Back to history</Link>
    </div>
  )

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to="/history" className="text-xs text-gray-400 hover:text-indigo-600 font-medium block mb-1">← Back to History</Link>
          <h1 className="text-xl font-bold text-gray-900">Consolidated Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data.invoices.length} invoices merged</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {EXPORT_FORMATS.map(({ fmt, label }) => (
            <button key={fmt} onClick={() => handleExport(fmt)} disabled={exporting !== null}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all active:scale-95
                ${exporting === fmt ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50'}`}>
              {exporting === fmt ? '...' : label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Invoices', data.summary.total_invoices],
          ['Subtotal', `₹${fmtNum(data.summary.grand_subtotal)}`],
          ['Tax', `₹${fmtNum(data.summary.grand_tax)}`],
          ['Grand Total', `₹${fmtNum(data.summary.grand_total)}`],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Per-invoice */}
      <div className="space-y-3">
        {data.invoices.map(inv => (
          <div key={inv.invoice_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50/60 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{inv.vendor_name || 'Unknown Vendor'}</p>
                <p className="text-xs text-gray-400">{inv.invoice_number || ''}{inv.date ? ` · ${inv.date}` : ''}</p>
              </div>
              <span className="font-bold text-gray-900 text-sm">₹{inv.total}</span>
            </div>
            {inv.line_items?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/40">
                    <tr>{['Description', 'Qty', 'Unit Price', 'Amount'].map(h => (
                      <th key={h} className="px-5 py-2.5 text-left text-xs font-medium text-gray-400">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {inv.line_items.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50/40">
                        <td className="px-5 py-2.5 text-gray-700 max-w-[220px] truncate">{item.description}</td>
                        <td className="px-5 py-2.5 text-gray-500">{item.quantity}</td>
                        <td className="px-5 py-2.5 text-gray-500">{item.unit_price}</td>
                        <td className="px-5 py-2.5 font-medium text-gray-900">{item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-100">
                    {[['Subtotal', inv.subtotal], ['Tax', inv.tax], ['Total', inv.total]].map(([l, v]) => (
                      <tr key={l}>
                        <td colSpan={3} className="px-5 py-2 text-right text-xs text-gray-500 font-medium">{l}</td>
                        <td className="px-5 py-2 font-semibold text-sm">{v}</td>
                      </tr>
                    ))}
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-indigo-600 text-white rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">Grand Total · {data.invoices.length} invoices</p>
        </div>
        <p className="text-2xl font-bold">₹{fmtNum(data.summary.grand_total)}</p>
      </div>
    </div>
  )
}
