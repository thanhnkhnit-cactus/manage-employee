import { useAuth } from '../contexts/AuthContext'
import { Building2, LogOut, Users, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Layout({ children }) {
    const { user, signOut } = useAuth()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const handleSignOut = async () => {
        await signOut()
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-2">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-800 leading-tight">Quản Lý Nhân Viên</h1>
                                <p className="text-xs text-slate-500 leading-tight hidden sm:block">Hệ thống quản lý nhân sự</p>
                            </div>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-3">
                            {/* User info - desktop */}
                            <div className="hidden sm:flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-slate-700">{user?.email}</p>
                                    <p className="text-xs text-slate-500">Nhân viên kế toán</p>
                                </div>
                                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                    {user?.email?.[0]?.toUpperCase()}
                                </div>
                            </div>

                            {/* Sign out button */}
                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all text-sm font-medium"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Đăng xuất</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-xs text-slate-400">
                        © 2024 Phần mềm Quản lý Nhân viên • Phiên bản 1.0
                    </p>
                </div>
            </footer>
        </div>
    )
}
