import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import api from '../lib/api'

const ALL_FIELDS = [
  { key: 'invoice_number', label: 'Invoice Number' },
  { key: 'date', label: 'Invoice Date' },
  { key: 'due_date', label: 'Due Date' },
  { key: 'payment_terms', label: 'Payment Terms' },
  { key: 'currency', label: 'Currency' },
  { key: 'vendor_name', label: 'Vendor Name' },
  { key: 'vendor_address', label: 'Vendor Address' },
  { key: 'buyer_name', label: 'Buyer Name' },
  { key: 'buyer_address', label: 'Buyer Address' },
  { key: 'line_items', label: 'Line Items' },
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'tax', label: 'Tax / GST' },
  { key: 'total', label: 'Total Amount' },
]

const EMPTY = { name: '', fields: [] }

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    try { const { data } = await api.get('/templates'); setTemplates(data) }
    catch { toast.error('Failed to load') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function toggleField(key) {
    setForm(f => ({
      ...f,
      fields: f.fields.includes(key) ? f.fields.filter(k => k !== key) : [...f.fields, key]
    }))
  }

  function startEdit(t) { setEditId(t.id); setForm({ name: t.name, fields: [...t.fields] }) }
  function cancel() { setEditId(null); setForm(EMPTY) }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Template name required')
    if (form.fields.length === 0) return toast.error('Select at least one field')
    setSaving(true)
    try {
      if (editId) { await api.put(`/templates/${editId}`, form); toast.success('Template updated') }
      else { await api.post('/templates', form); toast.success('Template created') }
      cancel(); load()
    } catch { toast.error('Save failed') }
    setSaving(false)
  }

  async function handleDelete(id) {
    try { await api.delete(`/templates/${id}`); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Extraction Templates</h1>
        <p className="text-sm text-gray-500 mt-0.5">Define custom field sets for different invoice types or clients</p>
      </div>

      {/* Create / Edit form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-gray-900 text-sm">{editId ? 'Edit Template' : 'New Template'}</h2>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Template Name</label>
          <input type="text" placeholder="e.g. GST Summary, Tax Invoice, Quick Extract"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-md" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">Fields to Extract</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ALL_FIELDS.map(({ key, label }) => {
              const checked = form.fields.includes(key)
              return (
                <label key={key}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all text-sm font-medium select-none ${
                    checked
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                  }`}>
                    {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>}
                  </div>
                  <input type="checkbox" checked={checked} onChange={() => toggleField(key)} className="sr-only" />
                  {label}
                </label>
              )
            })}
          </div>
          {form.fields.length > 0 && (
            <p className="text-xs text-indigo-600 font-medium mt-2">{form.fields.length} field{form.fields.length > 1 ? 's' : ''} selected</p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button onClick={handleSave} disabled={saving}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">
            {saving ? 'Saving...' : editId ? 'Update Template' : 'Create Template'}
          </button>
          {editId && (
            <button onClick={cancel}
              className="bg-white text-gray-600 border border-gray-200 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Template list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-20 skeleton" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-700 text-sm">No templates yet</p>
          <p className="text-xs text-gray-400 mt-1">Create your first template above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{t.fields.length} fields</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {t.fields.map(f => (
                    <span key={f} className="text-[11px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg font-medium">
                      {ALL_FIELDS.find(x => x.key === f)?.label || f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(t)}
                  className="text-xs text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-indigo-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
                  Edit
                </button>
                <button onClick={() => handleDelete(t.id)}
                  className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
