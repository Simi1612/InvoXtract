import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/upload', label: 'Upload' },
  { to: '/history', label: 'History' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/templates', label: 'Templates' },
]

export default function Navbar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <Link to="/dashboard" className="font-bold text-blue-600 text-lg tracking-tight">⚡ InvoiceAI</Link>

      <div className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map(({ to, label }) => (
          <Link key={to} to={to}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === to ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}>
            {label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 hidden md:block truncate max-w-[160px]">{user?.email}</span>
        <button onClick={handleSignOut}
          className="text-sm text-gray-600 hover:text-red-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-red-200 transition-colors">
          Sign out
        </button>
      </div>
    </nav>
  )
}
