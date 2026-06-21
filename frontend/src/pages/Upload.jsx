import { useState, useEffect, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../lib/api'

const FIELD_LABELS = {
  invoice_number: 'Invoice #', date: 'Date', due_date: 'Due Date',
  vendor_name: 'Vendor', buyer_name: 'Buyer',
  subtotal: 'Subtotal', tax: 'Tax', total: 'Total', currency: 'Currency',
}

function ResultCard({ result, selected, onSelect }) {
  const { invoice_id, file_name, extracted_data: ed, duplicate } = result
  if (!ed) return null
  return (
    <div className={`card p-5 transition-all ${selected ? 'ring-2 ring-indigo-500' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 truncate">{ed.vendor_name || 'Unknown Vendor'}</p>
            {duplicate && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Duplicate</span>}
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✅ Extracted</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{file_name}</p>
        </div>
        <div className="flex items-center gap-3 ml-3 shrink-0">
          {ed.total && <span className="text-sm font-bold text-gray-900">{ed.currency || ''} {ed.total}</span>}
          {invoice_id && (
            <input type="checkbox" checked={selected} onChange={() => onSelect(invoice_id)}
              className="w-4 h-4 accent-indigo-600 cursor-pointer" />
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        {Object.entries(FIELD_LABELS).map(([key, label]) =>
          ed[key] != null ? (
            <div key={key} className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-sm font-medium text-gray-900 truncate">{String(ed[key])}</p>
            </div>
          ) : null
        )}
      </div>
      {ed.line_items?.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-100 mt-2">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>{['Description', 'Qty', 'Price', 'Amount'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-400">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ed.line_items.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate">{item.description}</td>
                  <td className="px-3 py-2 text-gray-500">{item.quantity}</td>
                  <td className="px-3 py-2 text-gray-500">{item.unit_price}</td>
                  <td className="px-3 py-2 font-semibold text-gray-900">{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {invoice_id && (
        <a href={`/invoices/${invoice_id}`} className="text-xs text-indigo-600 font-medium hover:underline mt-3 block">
          View full detail →
        </a>
      )}
    </div>
  )
}

export default function Upload() {
  const [templates, setTemplates] = useState([])
  const [templateId, setTemplateId] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [batchProgress, setBatchProgress] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const navigate = useNavigate()
  const esRef = useRef(null)

  useEffect(() => {
    api.get('/templates').then(r => setTemplates(r.data)).catch(() => {})
    return () => esRef.current?.close()
  }, [])

  const onDrop = useCallback(async (files) => {
    if (!files.length) return
    setResults([]); setSelected(new Set()); setLoading(true)

    const handleSSE = (job_id, total) => {
      setBatchProgress({ current: 0, total, message: 'Starting...' })
      const es = new EventSource(`${import.meta.env.VITE_API_URL}/extract/batch/progress/${job_id}`)
      esRef.current = es
      es.onmessage = (e) => {
        const ev = JSON.parse(e.data)
        if (ev.status === 'batch_complete') {
          setBatchProgress(null); setLoading(false)
          toast.success(`✅ Done! ${ev.success_count}/${ev.total_files} extracted.`)
          es.close()
        } else {
          setBatchProgress({ current: ev.file_index, total: ev.total_files, message: ev.file_name })
          if (ev.status === 'completed') setResults(p => [...p, { ...ev, file_name: ev.file_name }])
          else toast.error(`Failed: ${ev.file_name}`)
        }
      }
      es.onerror = () => { setLoading(false); setBatchProgress(null); es.close() }
    }

    if (files.length === 1) {
      const fd = new FormData()
      fd.append('file', files[0])
      if (templateId) fd.append('template_id', templateId)
      try {
        const { data } = await api.post('/extract/single', fd)
        if (data.multi_page) { handleSSE(data.job_id, data.total_pages); setLoading(false); return }
        if (data.duplicate) toast.warning('⚠️ Duplicate invoice detected')
        else toast.success('⚡ Extracted!')
        setResults([{ ...data, file_name: files[0].name }])
      } catch (e) { toast.error(e.response?.data?.detail || 'Extraction failed') }
      setLoading(false)
    } else {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      if (templateId) fd.append('template_id', templateId)
      try {
        const { data } = await api.post('/extract/batch', fd)
        handleSSE(data.job_id, data.total_files)
      } catch (e) { toast.error(e.response?.data?.detail || 'Batch failed'); setLoading(false) }
    }
  }, [templateId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': [], 'image/png': [], 'image/jpeg': [] },
    maxFiles: 50, disabled: loading,
  })

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Upload Invoices</h1>
        <p className="text-sm text-gray-500 mt-0.5">PDF, PNG, JPG · Up to 50 files · Multi-page PDF supported</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 font-medium shrink-0">Extract mode:</span>
        <select value={templateId} onChange={e => setTemplateId(e.target.value)} className="input max-w-xs">
          <option value="">All fields (default)</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? 'border-indigo-400 bg-indigo-50 scale-[1.01] shadow-md' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50/50'}
          ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
        <input {...getInputProps()} />
        <div className="text-5xl mb-3">{isDragActive ? '📂' : '📄'}</div>
        {isDragActive
          ? <p className="text-indigo-600 font-semibold text-lg">Drop files here...</p>
          : <>
              <p className="font-semibold text-gray-700 text-base">Drag & drop invoices here</p>
              <p className="text-sm text-gray-400 mt-1">or <span className="text-indigo-600 font-medium cursor-pointer">click to browse</span></p>
              <p className="text-xs text-gray-300 mt-3">Supports PDF · PNG · JPG · Multi-page PDF</p>
            </>
        }
      </div>

      {batchProgress && (
        <div className="card p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 font-medium flex items-center gap-1.5">
              <span className="inline-block animate-spin">⚡</span>
              <span className="truncate max-w-[240px]">{batchProgress.message}</span>
            </span>
            <span className="text-indigo-600 font-bold shrink-0">{batchProgress.current}/{batchProgress.total}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {loading && !batchProgress && (
        <div className="card p-4 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-700 font-medium">⚡ AI extracting data...</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">{results.length} result{results.length !== 1 ? 's' : ''}</p>
            {selected.size >= 2 && (
              <button onClick={() => navigate(`/consolidate?ids=${[...selected].join(',')}`)} className="btn-primary text-xs">
                Merge Selected ({selected.size}) →
              </button>
            )}
          </div>
          {results.map((r, i) => (
            <ResultCard key={r.invoice_id || i} result={r}
              selected={selected.has(r.invoice_id)} onSelect={id => {
                setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
              }} />
          ))}
        </div>
      )}
    </div>
  )
}
