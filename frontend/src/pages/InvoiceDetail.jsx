import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../lib/api'

const SECTIONS = {
  'Invoice Info': ['invoice_number', 'date', 'due_date', 'payment_terms', 'currency'],
  'Vendor': ['vendor_name', 'vendor_address'],
  'Buyer': ['buyer_name', 'buyer_address'],
  'Financials': ['subtotal', 'tax', 'total'],
}
const LABELS = {
  invoice_number: 'Invoice #', date: 'Date', due_date: 'Due Date', payment_terms: 'Payment Terms',
  currency: 'Currency', vendor_name: 'Vendor Name', vendor_address: 'Vendor Address',
  buyer_name: 'Buyer Name', buyer_address: 'Buyer Address', subtotal: 'Subtotal', tax: 'Tax', total: 'Total',
}

// Confidence dot: green if value exists & looks complete, amber if short, red if null
function confidenceColor(val) {
  if (val == null || val === '') return 'bg-red-400'
  if (String(val).length < 3) return 'bg-amber-400'
  return 'bg-emerald-400'
}

function EditableField({ fieldKey, value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await onSave(fieldKey, val)
    setEditing(false)
    setSaving(false)
  }

  if (editing) return (
    <div className="flex items-center gap-2 mt-0.5">
      <input autoFocus value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        className="input text-sm py-1.5 flex-1" />
      <button onClick={save} disabled={saving} className="btn-primary text-xs py-1.5 px-2.5">{saving ? '...' : 'Save'}</button>
      <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1.5 px-2">✕</button>
    </div>
  )

  return (
    <div className="group flex items-center gap-2 mt-0.5">
      <span className="text-sm font-medium text-gray-900">{value ?? <span className="text-gray-300 italic">Not found</span>}</span>
      <button onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-indigo-500 text-xs">✏️</button>
    </div>
  )
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [rawOpen, setRawOpen] = useState(false)

  useEffect(() => {
    api.get(`/invoices/${id}`)
      .then(r => setInvoice(r.data))
      .catch(() => toast.error('Invoice not found'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave(key, val) {
    try {
      await api.patch(`/invoices/${id}`, { extracted_data: { [key]: val } })
      setInvoice(p => ({ ...p, extracted_data: { ...p.extracted_data, [key]: val } }))
      toast.success('Field updated')
    } catch { toast.error('Save failed') }
  }

  async function handleExport(format) {
    setExporting(true); setExportOpen(false)
    try {
      const res = await api.get(`/export/${id}`, { params: { format }, responseType: 'blob' })
      const ext = { csv: 'csv', excel: 'xlsx', json: 'json', pdf: 'pdf' }[format]
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = `invoice.${ext}`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Export failed') }
    setExporting(false)
  }

  if (loading) return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      {[...Array(3)].map((_, i) => <div key={i} className="card h-32 skeleton" />)}
    </div>
  )

  if (!invoice) return (
    <div className="p-6 text-center py-20">
      <p className="text-gray-400">Invoice not found.</p>
      <Link to="/history" className="text-indigo-600 text-sm hover:underline mt-2 block">← Back to history</Link>
    </div>
  )

  const ed = invoice.extracted_data || {}

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to="/history" className="text-xs text-gray-400 hover:text-indigo-600 font-medium">← History</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{ed.vendor_name || invoice.file_name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{invoice.file_name} · {new Date(invoice.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setExportOpen(o => !o)} disabled={exporting}
              className="btn-secondary text-sm flex items-center gap-2">
              ⬇ {exporting ? 'Exporting...' : 'Export'} <span className="text-xs text-gray-300">▾</span>
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-44 z-20">
                {[['excel', '📊 Excel (.xlsx)'], ['csv', '📋 CSV'], ['json', '{ } JSON'], ['pdf', '📄 PDF Report']].map(([fmt, label]) => (
                  <button key={fmt} onClick={() => handleExport(fmt)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700">{label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(SECTIONS).map(([section, fields]) => (
          <div key={section} className="card p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">{section}</h3>
            <div className="space-y-3.5">
              {fields.map(key => (
                <div key={key} className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${confidenceColor(ed[key])}`} title="Confidence" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">{LABELS[key]}</p>
                    <EditableField fieldKey={key} value={ed[key]} onSave={handleSave} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Line items */}
      {ed.line_items?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Line Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/60">
                <tr>{['Description', 'Qty', 'Unit Price', 'Amount'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-400">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ed.line_items.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50/40">
                    <td className="px-5 py-3 text-gray-700 max-w-[240px] truncate">{item.description}</td>
                    <td className="px-5 py-3 text-gray-500">{item.quantity}</td>
                    <td className="px-5 py-3 text-gray-500">{item.unit_price}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{item.amount}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-100 bg-gray-50/40">
                {[['Subtotal', ed.subtotal], ['Tax', ed.tax], ['Total', ed.total]].map(([l, v]) => (
                  <tr key={l}>
                    <td colSpan={3} className="px-5 py-2 text-right text-sm font-medium text-gray-500">{l}</td>
                    <td className="px-5 py-2 font-bold text-gray-900">{ed.currency || ''} {v}</td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Raw JSON */}
      <details className="card" onToggle={e => setRawOpen(e.target.open)}>
        <summary className="px-5 py-4 text-sm text-gray-500 cursor-pointer select-none font-medium hover:text-gray-700">
          {rawOpen ? '▾' : '▸'} Raw JSON
        </summary>
        <div className="px-5 pb-4">
          <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-4 overflow-x-auto">{JSON.stringify(ed, null, 2)}</pre>
        </div>
      </details>
    </div>
  )
}
