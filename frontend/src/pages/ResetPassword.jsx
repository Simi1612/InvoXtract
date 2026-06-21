import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleReset(e) {
    e.preventDefault()
    if (password !== confirm) return setError('Passwords do not match')
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    await supabase.auth.signOut()
    navigate('/login')
  }

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
          <h1 className="text-xl font-bold text-gray-900">Set new password</h1>
          <p className="text-gray-500 text-sm mt-1">Enter and confirm your new password</p>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

        <form onSubmit={handleReset} className="space-y-4">
          <input type="password" placeholder="New password (min 6 characters)" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="password" placeholder="Confirm new password" value={confirm}
            onChange={e => setConfirm(e.target.value)} required minLength={6}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
