import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import NhanVienPage from './pages/NhanVienPage'
import SanPhamPage from './pages/SanPhamPage'
import KhoHangPage from './pages/KhoHangPage'
import HoaDonPage from './pages/HoaDonPage'
import DonNhapHangPage from './pages/DonNhapHangPage'
import PhanQuyenPage from './pages/PhanQuyenPage'
import DoiXePage from './pages/DoiXePage'
import TaiXePage from './pages/TaiXePage'
import VaiTroPage from './pages/VaiTroPage'
import LenDonPage from './pages/LenDonPage'
import ChuyenXePage from './pages/ChuyenXePage'
import DonVanChuyenPage from './pages/DonVanChuyenPage'
import Layout from './components/Layout'
import { Loader2 } from 'lucide-react'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout><NhanVienPage /></Layout></ProtectedRoute>} />
      <Route path="/san-pham" element={<ProtectedRoute><Layout><SanPhamPage /></Layout></ProtectedRoute>} />
      <Route path="/kho-hang" element={<ProtectedRoute><Layout><KhoHangPage /></Layout></ProtectedRoute>} />
      <Route path="/hoa-don" element={<ProtectedRoute><Layout><HoaDonPage /></Layout></ProtectedRoute>} />
      <Route path="/nhap-hang" element={<ProtectedRoute><Layout><DonNhapHangPage /></Layout></ProtectedRoute>} />
      <Route path="/phan-quyen" element={<ProtectedRoute><Layout><PhanQuyenPage /></Layout></ProtectedRoute>} />
      <Route path="/doi-xe" element={<ProtectedRoute><Layout><DoiXePage /></Layout></ProtectedRoute>} />
      <Route path="/tai-xe" element={<ProtectedRoute><Layout><TaiXePage /></Layout></ProtectedRoute>} />
      <Route path="/vai-tro" element={<ProtectedRoute><Layout><VaiTroPage /></Layout></ProtectedRoute>} />
      <Route path="/len-don" element={<ProtectedRoute><Layout><LenDonPage /></Layout></ProtectedRoute>} />
      <Route path="/don-van-chuyen" element={<ProtectedRoute><Layout><DonVanChuyenPage /></Layout></ProtectedRoute>} />
      <Route path="/chuyen-xe" element={<ProtectedRoute><Layout><ChuyenXePage /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  )
}
