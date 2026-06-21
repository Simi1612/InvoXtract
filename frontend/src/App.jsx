import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import History from './pages/History'
import InvoiceDetail from './pages/InvoiceDetail'
import Templates from './pages/Templates'
import Analytics from './pages/Analytics'
import Consolidate from './pages/Consolidate'

function AppWithLayout({ children }) {
  return <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<AppWithLayout><Dashboard /></AppWithLayout>} />
          <Route path="/upload" element={<AppWithLayout><Upload /></AppWithLayout>} />
          <Route path="/history" element={<AppWithLayout><History /></AppWithLayout>} />
          <Route path="/invoices/:id" element={<AppWithLayout><InvoiceDetail /></AppWithLayout>} />
          <Route path="/templates" element={<AppWithLayout><Templates /></AppWithLayout>} />
          <Route path="/analytics" element={<AppWithLayout><Analytics /></AppWithLayout>} />
          <Route path="/consolidate" element={<AppWithLayout><Consolidate /></AppWithLayout>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
