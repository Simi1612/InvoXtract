import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'

const FEATURES = [
  { icon: '⚡', title: 'AI Extraction', desc: 'Gemini 2.0 Flash Vision reads any invoice — PDF, scan, photo — and returns structured JSON in seconds.' },
  { icon: '📦', title: 'Batch Processing', desc: 'Upload 50 invoices at once. Watch live progress as each one completes. Consolidate all into one report.' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'See spend by vendor, monthly trends, and totals — automatically from your invoice history.' },
  { icon: '⬇', title: 'Multi-format Export', desc: 'Download any invoice as Excel, CSV, JSON, or a branded PDF report. Single or consolidated.' },
  { icon: '✏️', title: 'Manual Correction', desc: 'AI gets it wrong? Click any field to edit inline. Changes saved instantly.' },
  { icon: '🔒', title: 'Per-user Isolation', desc: 'Every user sees only their own invoices. Supabase RLS enforces this at the database level.' },
]

const STEPS = [
  { step: '01', title: 'Upload Invoice', desc: 'Drag & drop any PDF, PNG, or JPG invoice.' },
  { step: '02', title: 'AI Extracts Data', desc: 'Gemini Vision reads all fields — vendor, line items, totals, dates.' },
  { step: '03', title: 'Export or Integrate', desc: 'Download as Excel/CSV/JSON/PDF or use the API.' },
]

const FIELD_LABELS = {
  invoice_number: 'Invoice #', date: 'Date', vendor_name: 'Vendor',
  buyer_name: 'Buyer', total: 'Total', tax: 'Tax', subtotal: 'Subtotal', currency: 'Currency',
}

export default function Landing() {
  const [demoResult, setDemoResult] = useState(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState('')

  const onDrop = useCallback(async (files) => {
    if (!files.length) return
    setDemoLoading(true)
    setDemoError('')
    setDemoResult(null)
    try {
      const fd = new FormData()
      fd.append('file', files[0])
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/extract/single`, fd)
      setDemoResult(data.extracted_data)
    } catch (e) {
      setDemoError(e.response?.data?.detail || 'Extraction failed. Try a clearer invoice image.')
    }
    setDemoLoading(false)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': [], 'image/png': [], 'image/jpeg': [] },
    maxFiles: 1,
    disabled: demoLoading,
  })

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="font-bold text-blue-600 text-xl">⚡ InvoiceAI</span>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link to="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center space-y-6">
        <div className="inline-block bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full">
          Powered by Google Gemini 2.0 Flash Vision
        </div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight">
          Extract Any Invoice<br />in Seconds with AI
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Upload PDF or image invoices. Get structured data instantly. Export to Excel, CSV, PDF, or JSON. No manual data entry ever again.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link to="/signup" className="bg-blue-600 text-white px-7 py-3 rounded-xl font-semibold hover:bg-blue-700 text-lg">
            Start for Free →
          </Link>
          <a href="#demo" className="border border-gray-200 text-gray-700 px-7 py-3 rounded-xl font-semibold hover:bg-gray-50 text-lg">
            Try Live Demo
          </a>
        </div>
        <p className="text-sm text-gray-400">Free forever for personal use · No credit card required</p>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Everything you need</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-gray-50 rounded-2xl p-6 space-y-3">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 text-lg">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(s => (
              <div key={s.step} className="text-center space-y-3">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-lg font-bold mx-auto">{s.step}</div>
                <h3 className="font-semibold text-gray-900">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guest demo */}
      <section id="demo" className="max-w-3xl mx-auto px-6 py-20 space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Try it now — no signup</h2>
          <p className="text-gray-500 mt-2">Drop any invoice. See AI extraction live. Results not saved.</p>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          } ${demoLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="text-4xl mb-3">📄</div>
          {demoLoading
            ? <div className="space-y-2">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
                <p className="text-blue-600 font-medium">Extracting with AI...</p>
              </div>
            : isDragActive
              ? <p className="text-blue-600 font-medium">Drop invoice here...</p>
              : <div>
                  <p className="font-medium text-gray-700">Drop invoice here or click to browse</p>
                  <p className="text-sm text-gray-400 mt-1">PDF, PNG, JPG · Max 10MB</p>
                </div>
          }
        </div>

        {demoError && <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">{demoError}</p>}

        {demoResult && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Extracted Data</h3>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">✓ Success</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(FIELD_LABELS).map(([key, label]) =>
                demoResult[key] != null ? (
                  <div key={key} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{String(demoResult[key])}</p>
                  </div>
                ) : null
              )}
            </div>
            {demoResult.line_items?.length > 0 && (
              <p className="text-sm text-gray-500">{demoResult.line_items.length} line items extracted</p>
            )}
            <div className="border-t border-gray-100 pt-4 text-center">
              <p className="text-sm text-gray-500 mb-3">Sign up to save this, process in batch, and export</p>
              <Link to="/signup" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 text-sm">
                Create Free Account →
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>Built with FastAPI · React · Supabase · Google Gemini</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <Link to="/login" className="hover:text-gray-600">Sign in</Link>
          <Link to="/signup" className="hover:text-gray-600">Sign up</Link>
        </div>
      </footer>
    </div>
  )
}
