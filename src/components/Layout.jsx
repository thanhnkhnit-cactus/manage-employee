import { useState } from 'react'
import { useAuth, ROLE_LABELS } from '../contexts/AuthContext'
import { Building2, LogOut, Users, Package, FileText, Shield, Warehouse, Boxes, ChevronLeft, ChevronRight, Menu, X, ShieldCheck, Truck, Navigation, MapPin, ClipboardList } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const ROLE_BADGE_COLORS = {
    admin: 'bg-purple-100 text-purple-700',
    manager: 'bg-blue-100 text-blue-700',
    truong_phong_kinh_doanh: 'bg-indigo-100 text-indigo-700',
    ke_toan: 'bg-emerald-100 text-emerald-700',
    nhan_vien: 'bg-slate-100 text-slate-600',
    quan_ly_kho: 'bg-orange-100 text-orange-700',
}

// Định nghĩa tất cả menu items với menu_key tương ứng
const ALL_NAV_ITEMS = [
    { to: '/', label: 'Nhân viên', icon: Users, end: true, menuKey: 'nhan-vien' },
    { to: '/san-pham', label: 'Sản phẩm', icon: Package, end: false, menuKey: 'san-pham' },
    { to: '/kho-hang', label: 'Kho hàng', icon: Boxes, end: false, menuKey: 'kho-hang' },
    { to: '/hoa-don', label: 'Hóa đơn', icon: FileText, end: false, menuKey: 'hoa-don' },
    { to: '/nhap-hang', label: 'Nhập hàng', icon: Warehouse, end: false, menuKey: 'nhap-hang' },
    { to: '/vai-tro', label: 'Vai trò', icon: Shield, end: false, menuKey: 'vai-tro' },
    { to: '/phan-quyen', label: 'Phân quyền', icon: ShieldCheck, end: false, menuKey: 'phan-quyen' },
    { to: '/doi-xe', label: 'Đội xe (TMS)', icon: Truck, end: false, menuKey: 'doi-xe' },
    { to: '/len-don', label: 'Lên đơn báo giá', icon: Navigation, end: false, menuKey: 'len-don' },
    { to: '/don-van-chuyen', label: 'Đơn vận chuyển', icon: ClipboardList, end: false, menuKey: 'don-van-chuyen' },
    { to: '/chuyen-xe', label: 'Chuyến xe', icon: MapPin, end: false, menuKey: 'chuyen-xe' },
]

export default function Layout({ children }) {
    const { user, signOut, employeeProfile, role, hasMenuAccess } = useAuth()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    // Lọc menu dựa trên quyền từ DB
    const navItems = ALL_NAV_ITEMS.filter(item => hasMenuAccess(item.menuKey))

    const displayName = employeeProfile?.ho_ten || user?.email || ''
    const roleLabelText = role ? (ROLE_LABELS[role] || role) : 'Quản trị viên'
    const roleBadgeClass = ROLE_BADGE_COLORS[role] || 'bg-slate-100 text-slate-600'
    const avatar = (employeeProfile?.ho_ten || user?.email || 'U')[0]?.toUpperCase()

    const SidebarContent = ({ onNav }) => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-100 ${collapsed ? 'justify-center' : ''}`}>
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-2 flex-shrink-0">
                    <Building2 className="w-5 h-5 text-white" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <h1 className="text-sm font-bold text-slate-800 leading-tight whitespace-nowrap">Quản Lý Doanh Nghiệp</h1>
                        <p className="text-[10px] text-slate-400 leading-tight whitespace-nowrap">Hệ thống quản lý nhân sự &amp; SP</p>
                    </div>
                )}
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
                {navItems.map(({ to, label, icon: Icon, end, menuKey }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        onClick={onNav}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                            ${isActive
                                ? 'bg-blue-50 text-blue-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                            }
                            ${collapsed ? 'justify-center' : ''}
                            ${menuKey === 'phan-quyen' ? 'border-t border-slate-100 mt-1 pt-1' : ''}`
                        }
                        title={collapsed ? label : undefined}
                    >
                        {({ isActive }) => (
                            <>
                                <Icon className={`w-5 h-5 flex-shrink-0 ${menuKey === 'phan-quyen'
                                    ? (isActive ? 'text-purple-600' : 'text-purple-400 group-hover:text-purple-600')
                                    : (isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600')
                                    }`} />
                                {!collapsed && <span>{label}</span>}
                                {!collapsed && isActive && (
                                    <span className={`ml-auto w-1.5 h-1.5 rounded-full ${menuKey === 'phan-quyen' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User info + logout */}
            <div className={`border-t border-slate-100 px-3 py-3 space-y-2`}>
                {!collapsed && (
                    <div className="flex items-center gap-2.5 px-2 py-1">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {avatar}
                        </div>
                        <div className="overflow-hidden flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{displayName}</p>
                            <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadgeClass}`}>
                                <Shield className="w-2.5 h-2.5" />
                                {roleLabelText}
                            </span>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <div className="flex justify-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            title={displayName}>
                            {avatar}
                        </div>
                    </div>
                )}
                <button
                    onClick={signOut}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all text-sm font-medium ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? 'Đăng xuất' : undefined}
                >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>Đăng xuất</span>}
                </button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-50 flex">

            {/* ── Mobile Overlay ── */}
            {mobileOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)} />
            )}

            {/* ── Sidebar – Desktop ── */}
            <aside className={`hidden lg:flex flex-col bg-white border-r border-slate-200 shadow-sm transition-all duration-300 flex-shrink-0 relative ${collapsed ? 'w-16' : 'w-56'}`}>
                <SidebarContent />
                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(c => !c)}
                    className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-all z-10"
                    title={collapsed ? 'Mở rộng' : 'Thu gọn'}
                >
                    {collapsed ? <ChevronRight className="w-3 h-3 text-slate-500" /> : <ChevronLeft className="w-3 h-3 text-slate-500" />}
                </button>
            </aside>

            {/* ── Sidebar – Mobile (drawer) ── */}
            <aside className={`fixed top-0 left-0 h-full w-56 bg-white border-r border-slate-200 shadow-xl z-50 transform transition-transform duration-300 lg:hidden
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="absolute top-3 right-3">
                    <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
                <SidebarContent onNav={() => setMobileOpen(false)} />
            </aside>

            {/* ── Main area ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile top bar */}
                <header className="lg:hidden bg-white border-b border-slate-200 shadow-sm px-4 h-14 flex items-center gap-3 sticky top-0 z-30">
                    <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100">
                        <Menu className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg p-1.5">
                            <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-bold text-slate-800">Quản Lý Doanh Nghiệp</span>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6 overflow-auto">
                    {children}
                </main>

                {/* Footer */}
                <footer className="bg-white border-t border-slate-200 py-3 px-6">
                    <p className="text-center text-xs text-slate-400">
                        © 2024 Phần mềm Quản lý Doanh Nghiệp • Phiên bản 1.0
                    </p>
                </footer>
            </div>
        </div>
    )
}
