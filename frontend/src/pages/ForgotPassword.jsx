import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(error.message)
    else setDone(true)
    setLoading(false)
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Check your email</h2>
          <p className="text-gray-500 text-sm mt-1">Reset link sent to <strong>{email}</strong></p>
          <p className="text-gray-400 text-xs mt-2">Click the link in the email to set a new password.</p>
        </div>
        <Link to="/login" className="text-indigo-600 text-sm font-medium hover:underline block">← Back to sign in</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">IX</span>
            </div>
            <span className="text-xl font-bold text-gray-900">InvoXtract</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Forgot password?</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your email — we'll send a reset link</p>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Your email address" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500">
          <Link to="/login" className="text-indigo-600 font-medium hover:underline">← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
