import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth, ROLE_LABELS } from '../contexts/AuthContext'
import {
    ShieldCheck, Loader2, CheckCircle2, AlertCircle, Save,
    Users, Package, Boxes, FileText, Warehouse, LayoutGrid,
    BarChart2, Settings, Bell, CreditCard, Truck, UserCog,
    BookOpen, Tag, PieChart, Calendar, ClipboardList, ChevronRight,
    ToggleLeft, ToggleRight, Check
} from 'lucide-react'

// ─── Danh sách tất cả menu / page ─────────────────────────────────────────────
// Dễ dàng mở rộng thêm pages mới bằng cách thêm vào đây
const MENU_GROUPS = [
    {
        groupKey: 'nhan-su',
        groupLabel: 'Nhân sự',
        color: 'blue',
        menus: [
            { key: 'nhan-vien', label: 'Quản lý Nhân viên', icon: Users },
            { key: 'cham-cong', label: 'Chấm công', icon: Calendar },
            { key: 'luong', label: 'Bảng lương', icon: CreditCard },
            { key: 'hop-dong', label: 'Hợp đồng lao động', icon: BookOpen },
        ],
    },
    {
        groupKey: 'kinh-doanh',
        groupLabel: 'Kinh doanh & Bán hàng',
        color: 'emerald',
        menus: [
            { key: 'hoa-don', label: 'Hóa đơn / Đơn hàng', icon: FileText },
            { key: 'san-pham', label: 'Sản phẩm', icon: Package },
            { key: 'khach-hang', label: 'Khách hàng', icon: UserCog },
            { key: 'khuyen-mai', label: 'Khuyến mãi & Giảm giá', icon: Tag },
        ],
    },
    {
        groupKey: 'kho-van',
        groupLabel: 'Kho vận',
        color: 'orange',
        menus: [
            { key: 'kho-hang', label: 'Kho hàng', icon: Boxes },
            { key: 'nhap-hang', label: 'Nhập hàng', icon: Warehouse },
            { key: 'van-chuyen', label: 'Vận chuyển', icon: Truck },
            { key: 'kiem-kho', label: 'Kiểm kho định kỳ', icon: ClipboardList },
        ],
    },
    {
        groupKey: 'tai-chinh',
        groupLabel: 'Tài chính & Báo cáo',
        color: 'indigo',
        menus: [
            { key: 'bao-cao', label: 'Báo cáo tổng hợp', icon: BarChart2 },
            { key: 'thu-chi', label: 'Thu chi nội bộ', icon: PieChart },
            { key: 'cong-no', label: 'Công nợ', icon: CreditCard },
        ],
    },
    {
        groupKey: 'he-thong',
        groupLabel: 'Hệ thống',
        color: 'purple',
        menus: [
            { key: 'vai-tro', label: 'Quản lý Vai trò', icon: ShieldCheck },
            { key: 'phan-quyen', label: 'Phân quyền Menu', icon: ShieldCheck },
            { key: 'thong-bao', label: 'Thông báo', icon: Bell },
            { key: 'cai-dat', label: 'Cài đặt hệ thống', icon: Settings },
        ],
    },
    {
        groupKey: 'van-tai',
        groupLabel: 'Quản lý Vận Tải',
        color: 'cyan',
        menus: [
            { key: 'len-don', label: 'Lên đơn báo giá', icon: ClipboardList },
            { key: 'don-van-chuyen', label: 'Đơn vận chuyển', icon: FileText },
            { key: 'chuyen-xe', label: 'Chuyến xe', icon: Truck },
            { key: 'doi-xe', label: 'Đội xe (TMS)', icon: Truck },
            { key: 'tai-xe', label: 'Tài xế', icon: UserCog },
        ],
    },
]

const ALL_MENUS = MENU_GROUPS.flatMap(g => g.menus)

// Màu style map: key mau_sac → Tailwind classes
const MAU_STYLE_MAP = {
    purple: { color: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
    blue: { color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    indigo: { color: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
    emerald: { color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    orange: { color: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
    red: { color: 'red', bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    cyan: { color: 'cyan', bg: 'bg-cyan-50', border: 'border-cyan-200', badge: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500' },
    slate: { color: 'slate', bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
}

const buildRoleDef = (vt) => ({
    key: vt.key,
    label: vt.ten_vai_tro,
    ...(MAU_STYLE_MAP[vt.mau_sac] || MAU_STYLE_MAP.slate),
})

const GROUP_COLORS = {
    blue: { header: 'bg-blue-50 border-blue-100', icon: 'text-blue-500', dot: 'bg-blue-500' },
    emerald: { header: 'bg-emerald-50 border-emerald-100', icon: 'text-emerald-500', dot: 'bg-emerald-500' },
    orange: { header: 'bg-orange-50 border-orange-100', icon: 'text-orange-500', dot: 'bg-orange-500' },
    indigo: { header: 'bg-indigo-50 border-indigo-100', icon: 'text-indigo-500', dot: 'bg-indigo-500' },
    cyan: { header: 'bg-cyan-50 border-cyan-100', icon: 'text-cyan-500', dot: 'bg-cyan-500' },
    purple: { header: 'bg-purple-50 border-purple-100', icon: 'text-purple-500', dot: 'bg-purple-500' },
}

// ToggleSwitch component
function ToggleSwitch({ on, locked, onChange }) {
    return (
        <button
            type="button"
            onClick={() => !locked && onChange(!on)}
            disabled={locked}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${locked
                ? 'cursor-not-allowed opacity-50 bg-purple-400 focus:ring-purple-300'
                : on
                    ? 'cursor-pointer bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-300'
                    : 'cursor-pointer bg-slate-200 hover:bg-slate-300 focus:ring-slate-300'
                }`}
        >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${on ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    )
}

export default function PhanQuyenPage() {
    const { role: myRole, refreshMenuPermissions } = useAuth()
    const [permissions, setPermissions] = useState({})
    const [roles, setRoles] = useState([])                // động từ vai_tro
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState(null)
    const [selectedRole, setSelectedRole] = useState('admin')
    const [hasChanges, setHasChanges] = useState(false)

    const showToast = (type, msg) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 3500)
    }

    const fetchData = async () => {
        setLoading(true)

        // Load vai trò từ DB
        const { data: vtData } = await supabase.from('vai_tro').select('*').order('cap_bac', { ascending: false })
        const loadedRoles = (vtData || []).map(buildRoleDef)
        setRoles(loadedRoles)
        // Đặt selected về role đầu tiên nếu chưa có admin
        if (loadedRoles.length > 0 && !loadedRoles.find(r => r.key === 'admin')) {
            setSelectedRole(loadedRoles[0].key)
        }

        // Load quyền menu
        const { data, error } = await supabase
            .from('phan_quyen_menu')
            .select('role, menu_key, co_quyen')

        if (!error && data) {
            const map = {}
            data.forEach(row => {
                if (!map[row.role]) map[row.role] = {}
                map[row.role][row.menu_key] = row.co_quyen
            })
            setPermissions(map)
        }
        setLoading(false)
        setHasChanges(false)
    }

    useEffect(() => { fetchData() }, [])

    const getPermission = (role, menuKey) => permissions[role]?.[menuKey] ?? false

    const handleToggle = (role, menuKey) => {
        if (role === 'admin' && menuKey === 'phan-quyen') return
        setPermissions(prev => ({
            ...prev,
            [role]: { ...prev[role], [menuKey]: !(prev[role]?.[menuKey] ?? false) }
        }))
        setHasChanges(true)
    }

    // Bật/tắt toàn bộ nhóm cho role hiện tại
    const handleGroupToggle = (role, group, forceOn) => {
        const newRolePerms = { ...permissions[role] }
        group.menus.forEach(({ key }) => {
            if (role === 'admin' && key === 'phan-quyen') return
            newRolePerms[key] = forceOn
        })
        setPermissions(prev => ({ ...prev, [role]: newRolePerms }))
        setHasChanges(true)
    }

    const handleSave = async () => {
        setSaving(true)
        const rows = []
        roles.forEach(({ key: role }) => {
            ALL_MENUS.forEach(({ key }) => {
                rows.push({ role, menu_key: key, co_quyen: permissions[role]?.[key] ?? false })
            })
        })
        const { error } = await supabase
            .from('phan_quyen_menu')
            .upsert(rows, { onConflict: 'role,menu_key' })

        if (error) {
            showToast('error', 'Lưu thất bại: ' + error.message)
        } else {
            showToast('success', 'Đã lưu phân quyền thành công!')
            await refreshMenuPermissions()
            setHasChanges(false)
        }
        setSaving(false)
    }

    // Đếm số menu đang được bật cho một role
    const countEnabled = (roleKey) => ALL_MENUS.filter(m => getPermission(roleKey, m.key)).length

    const selectedRoleDef = roles.find(r => r.key === selectedRole)

    if (myRole !== 'admin') {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Bạn không có quyền truy cập trang này</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 rounded-xl p-2.5">
                        <ShieldCheck className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Phân quyền Menu</h2>
                        <p className="text-slate-500 text-sm">Chọn vai trò bên trái, cấu hình quyền truy cập bên phải</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg font-medium">
                            Có thay đổi chưa lưu
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving || loading || !hasChanges}
                        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all shadow-sm"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>

            {/* ── Toast ── */}
            {toast && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border animate-fade-in ${toast.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    {toast.msg}
                </div>
            )}

            {/* ── Main Layout ── */}
            <div className="flex gap-5" style={{ minHeight: '600px' }}>

                {/* ── Left: Role Selector ── */}
                <div className="w-64 flex-shrink-0 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-3">Chọn vai trò</p>
                    {roles.map(roleDef => {
                        const enabled = countEnabled(roleDef.key)
                        const total = ALL_MENUS.length
                        const isSelected = selectedRole === roleDef.key
                        return (
                            <button
                                key={roleDef.key}
                                onClick={() => setSelectedRole(roleDef.key)}
                                className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all group ${isSelected
                                    ? `${roleDef.bg} ${roleDef.border} shadow-sm`
                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${roleDef.dot}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-slate-800' : 'text-slate-700'}`}>
                                            {roleDef.label}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {enabled}/{total} quyền được bật
                                        </p>
                                    </div>
                                    {isSelected
                                        ? <ChevronRight className={`w-4 h-4 text-${roleDef.color}-500 flex-shrink-0`} />
                                        : <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 group-hover:text-slate-400" />
                                    }
                                </div>
                                {/* Progress bar */}
                                <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1">
                                    <div
                                        className={`h-1 rounded-full transition-all ${roleDef.dot}`}
                                        style={{ width: `${(enabled / total) * 100}%` }}
                                    />
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* ── Right: Permission Groups ── */}
                <div className="flex-1 min-w-0">
                    {loading ? (
                        <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-slate-200">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Role header */}
                            {selectedRoleDef && (
                                <div className={`flex items-center justify-between px-5 py-4 rounded-xl border ${selectedRoleDef.bg} ${selectedRoleDef.border}`}>
                                    <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${selectedRoleDef.badge}`}>
                                            <span className={`w-2 h-2 rounded-full ${selectedRoleDef.dot}`} />
                                            {selectedRoleDef.label}
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            Đang có <strong className="text-slate-700">{countEnabled(selectedRole)}</strong>/{ALL_MENUS.length} quyền được bật
                                        </span>
                                    </div>
                                    {/* Bật tắt toàn bộ */}
                                    {selectedRole !== 'admin' && (
                                        <div className="flex gap-2">
                                            <button onClick={() => {
                                                const newPerms = {}
                                                ALL_MENUS.forEach(m => { newPerms[m.key] = true })
                                                setPermissions(p => ({ ...p, [selectedRole]: newPerms }))
                                                setHasChanges(true)
                                            }} className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg font-medium transition-all">
                                                Bật tất cả
                                            </button>
                                            <button onClick={() => {
                                                const newPerms = {}
                                                ALL_MENUS.forEach(m => { newPerms[m.key] = false })
                                                setPermissions(p => ({ ...p, [selectedRole]: newPerms }))
                                                setHasChanges(true)
                                            }} className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-all">
                                                Tắt tất cả
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Permission groups */}
                            {MENU_GROUPS.map(group => {
                                const gc = GROUP_COLORS[group.color]
                                const groupEnabled = group.menus.filter(m => getPermission(selectedRole, m.key)).length
                                const groupTotal = group.menus.length
                                const allOn = groupEnabled === groupTotal
                                const allOff = groupEnabled === 0

                                return (
                                    <div key={group.groupKey} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                        {/* Group header */}
                                        <div className={`flex items-center justify-between px-5 py-3 border-b ${gc.header}`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${gc.dot}`} />
                                                <p className="text-sm font-semibold text-slate-700">{group.groupLabel}</p>
                                                <span className="text-xs text-slate-400 bg-white/70 px-2 py-0.5 rounded-full border border-slate-200">
                                                    {groupEnabled}/{groupTotal}
                                                </span>
                                            </div>
                                            {selectedRole !== 'admin' && (
                                                <div className="flex gap-1.5">
                                                    <button
                                                        onClick={() => handleGroupToggle(selectedRole, group, true)}
                                                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${allOn ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200'}`}
                                                    >
                                                        Bật nhóm
                                                    </button>
                                                    <button
                                                        onClick={() => handleGroupToggle(selectedRole, group, false)}
                                                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${allOff ? 'bg-slate-100 text-slate-500' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                                                    >
                                                        Tắt nhóm
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Permission rows */}
                                        <div className="divide-y divide-slate-50">
                                            {group.menus.map(({ key, label, icon: Icon }) => {
                                                const isOn = getPermission(selectedRole, key)
                                                const isLocked = selectedRole === 'admin' && key === 'phan-quyen'
                                                return (
                                                    <div
                                                        key={key}
                                                        onClick={() => !isLocked && handleToggle(selectedRole, key)}
                                                        className={`flex items-center justify-between px-5 py-3.5 transition-all ${isLocked
                                                            ? 'cursor-not-allowed'
                                                            : 'cursor-pointer hover:bg-slate-50/70'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${isOn ? `${gc.header}` : 'bg-slate-100'
                                                                }`}>
                                                                <Icon className={`w-4 h-4 ${isOn ? gc.icon : 'text-slate-400'}`} />
                                                            </div>
                                                            <div>
                                                                <p className={`text-sm font-medium ${isOn ? 'text-slate-800' : 'text-slate-500'}`}>
                                                                    {label}
                                                                </p>
                                                                {isLocked && (
                                                                    <p className="text-[10px] text-purple-400 mt-0.5">Cố định cho Admin</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div onClick={e => e.stopPropagation()}>
                                                            <ToggleSwitch
                                                                on={isOn}
                                                                locked={isLocked}
                                                                onChange={(val) => {
                                                                    if (!isLocked) handleToggle(selectedRole, key)
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
