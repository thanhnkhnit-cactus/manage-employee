import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
    Search, Pencil, X, Check, Loader2, Truck, ChevronDown, ChevronUp,
    MapPin, Package, User, AlertCircle, Trash2, CheckCircle2, Clock,
    ArrowRight, Eye, XCircle, ClipboardList, Phone, Calendar,
    Navigation, Filter, RefreshCw
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n ?? 0)

const formatDate = (d) => d
    ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
    : '—'

// Trạng thái đơn vận chuyển (tách riêng khỏi hóa đơn)
const TRANG_THAI = {
    ban_nhap: { label: 'Bản nháp', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
    cho_xu_ly: { label: 'Chờ xử lý', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    da_xac_nhan: { label: 'Đã xác nhận', color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
    dang_giao: { label: 'Đang giao', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    hoan_thanh: { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    huy: { label: 'Đã hủy', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

const LOCKED_STATUSES = ['hoan_thanh']
// Chỉ đơn đã xác nhận mới cho vào chuyến xe
const CAN_ADD_TO_TRIP = ['da_xac_nhan', 'dang_giao']

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ value }) {
    const info = TRANG_THAI[value] || { label: value, color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' }
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${info.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
            {info.label}
        </span>
    )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ open, onClose, don, onSaved }) {
    const [trangThai, setTrangThai] = useState(don?.trang_thai || 'ban_nhap')
    const [ghiChu, setGhiChu] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!open || !don) return
        setTrangThai(don.trang_thai || 'ban_nhap')
        setGhiChu(don.ghi_chu || '')
        setError('')
    }, [open, don])

    if (!open || !don) return null

    const isLocked = LOCKED_STATUSES.includes(don.trang_thai)

    const handleSave = async () => {
        setSaving(true)
        setError('')
        try {
            const { error: e } = await supabase
                .from('don_van_chuyen')
                .update({ trang_thai: trangThai, ghi_chu: ghiChu, updated_at: new Date().toISOString() })
                .eq('id', don.id)
            if (e) throw e
            onSaved()
            onClose()
        } catch (e) {
            setError('Có lỗi: ' + (e?.message || e))
        }
        setSaving(false)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-100 rounded-xl p-2">
                            <Pencil className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Cập nhật đơn</h3>
                            <p className="text-xs text-slate-500 font-mono">{don.ma_don || don.id?.slice(0, 8)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    {isLocked && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            Đơn đã hoàn thành — không thể chỉnh sửa.
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />{error}
                        </div>
                    )}
                    {/* Thông tin đơn (chỉ đọc) */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Khách hàng</span>
                            <span className="font-semibold text-slate-800">{don.ten_kh || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Tuyến đường</span>
                            <span className="font-medium text-slate-700 text-right max-w-[200px] truncate">{don.diem_di} → {don.diem_den}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Tổng tiền</span>
                            <span className="font-bold text-blue-700">{fmt(don.tong_tien)}</span>
                        </div>
                    </div>
                    {/* Trạng thái */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Trạng thái</label>
                        <select value={trangThai}
                            disabled={isLocked}
                            onChange={e => setTrangThai(e.target.value)}
                            className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLocked ? 'opacity-60' : ''}`}>
                            {Object.entries(TRANG_THAI).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                    </div>
                    {/* Ghi chú */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Ghi chú</label>
                        <textarea value={ghiChu}
                            disabled={isLocked}
                            onChange={e => setGhiChu(e.target.value)}
                            rows={2}
                            className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLocked ? 'opacity-60' : ''}`}
                            placeholder="Thêm ghi chú..." />
                    </div>
                </div>
                <div className="flex gap-3 p-5 pt-0">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                    {!isLocked && (
                        <button onClick={handleSave} disabled={saving}
                            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {saving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ open, onClose, don }) {
    if (!open || !don) return null
    const hh = don.hang_hoa || {}
    const pp = don.phu_phi || {}

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Chi tiết đơn vận chuyển</h3>
                        <p className="text-xs text-blue-600 font-mono">{don.ma_don || don.id?.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    {/* Trạng thái */}
                    <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                        <span className="text-sm font-medium text-slate-600">Trạng thái</span>
                        <StatusBadge value={don.trang_thai} />
                    </div>
                    {/* Chuyến xe */}
                    {don.chuyen_xe_id && (
                        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-700">
                            <Truck className="w-4 h-4 shrink-0" />
                            Đơn đã được đưa vào chuyến xe
                        </div>
                    )}
                    {/* Khách hàng */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Khách hàng', value: don.ten_kh },
                            { label: 'SĐT KH', value: don.sdt_kh },
                            { label: 'Điểm đi', value: don.diem_di },
                            { label: 'Điểm đến', value: don.diem_den },
                            { label: 'Quãng đường', value: don.km ? `${don.km.toFixed(1)} km` : '—' },
                            { label: 'Tải trọng', value: don.tai_trong },
                            { label: 'Giá/km', value: fmt(don.gia_km) },
                            { label: 'Tổng tiền', value: fmt(don.tong_tien), highlight: true },
                            { label: 'Tài xế', value: don.tai_xe?.ho_ten || '—' },
                            { label: 'Phương tiện', value: don.doi_xe?.bien_so || '—' },
                            { label: 'Ngày tạo', value: formatDate(don.created_at) },
                            { label: 'Ghi chú', value: don.ghi_chu || '—' },
                        ].map(({ label, value, highlight }) => (
                            <div key={label} className="bg-slate-50 rounded-xl px-4 py-3">
                                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                                <p className={`text-sm font-semibold ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>{value ?? '—'}</p>
                            </div>
                        ))}
                    </div>
                    {/* Hàng hóa */}
                    {hh.loai && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Thông tin hàng hóa</p>
                            <div className="grid grid-cols-3 gap-2 text-xs text-slate-700">
                                <div><span className="text-slate-500">Loại: </span><strong>{hh.loai}</strong></div>
                                {hh.can_nang && <div><span className="text-slate-500">Nặng: </span><strong>{hh.can_nang} kg</strong></div>}
                                {hh.so_kien && <div><span className="text-slate-500">Kiện: </span><strong>{hh.so_kien}</strong></div>}
                            </div>
                        </div>
                    )}
                </div>
                <div className="px-5 pb-5">
                    <button onClick={onClose} className="w-full px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Đóng</button>
                </div>
            </div>
        </div>
    )
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ open, onClose, don, onDeleted }) {
    const [loading, setLoading] = useState(false)
    if (!open || !don) return null

    const handleDelete = async () => {
        setLoading(true)
        await supabase.from('don_van_chuyen').delete().eq('id', don.id)
        setLoading(false)
        onDeleted()
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa</h3>
                <p className="text-slate-500 text-sm mb-4">
                    Xóa đơn vận chuyển của <strong>{don.ten_kh || '—'}</strong>?
                    {don.chuyen_xe_id && <span className="block mt-1 text-amber-600 text-xs">⚠ Đơn này đang trong một chuyến xe!</span>}
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                    <button onClick={handleDelete} disabled={loading}
                        className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {loading ? 'Đang xóa...' : 'Xóa'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Trang chính ─────────────────────────────────────────────────────────────
export default function DonVanChuyenPage() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [sortField, setSortField] = useState('created_at')
    const [sortDir, setSortDir] = useState('desc')
    const [editTarget, setEditTarget] = useState(null)
    const [detailTarget, setDetailTarget] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        const { data: rows } = await supabase
            .from('don_van_chuyen')
            .select('*, tai_xe:tai_xe_id(ho_ten,sdt), doi_xe:xe_id(bien_so,loai_xe)')
            .order(sortField, { ascending: sortDir === 'asc' })
        setData(rows || [])
        setLoading(false)
    }, [sortField, sortDir])

    useEffect(() => { fetchData() }, [fetchData])

    const filtered = data.filter(d => {
        const q = search.toLowerCase()
        const matchQ = !q ||
            d.ten_kh?.toLowerCase().includes(q) ||
            d.sdt_kh?.toLowerCase().includes(q) ||
            d.diem_di?.toLowerCase().includes(q) ||
            d.diem_den?.toLowerCase().includes(q) ||
            d.ma_don?.toLowerCase().includes(q)
        const matchStatus = filterStatus === 'all' || d.trang_thai === filterStatus
        return matchQ && matchStatus
    })

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDir('asc') }
    }

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ChevronUp className="w-3 h-3 text-slate-300" />
        return sortDir === 'asc'
            ? <ChevronUp className="w-3 h-3 text-blue-500" />
            : <ChevronDown className="w-3 h-3 text-blue-500" />
    }

    const handleQuickStatus = async (id, newStatus) => {
        await supabase.from('don_van_chuyen')
            .update({ trang_thai: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id)
        setData(prev => prev.map(d => d.id === id ? { ...d, trang_thai: newStatus } : d))
    }

    const stats = {
        total: data.length,
        cho_xu_ly: data.filter(d => d.trang_thai === 'cho_xu_ly').length,
        da_xac_nhan: data.filter(d => d.trang_thai === 'da_xac_nhan').length,
        hoan_thanh: data.filter(d => d.trang_thai === 'hoan_thanh').length,
        dang_giao: data.filter(d => d.trang_thai === 'dang_giao').length,
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Quản lý Đơn Vận Chuyển</h2>
                    <p className="text-slate-500 text-sm mt-1">Quản lý, theo dõi và chuyển trạng thái các đơn vận chuyển</p>
                </div>
                <button onClick={fetchData}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm transition-all">
                    <RefreshCw className="w-4 h-4" /> Làm mới
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: 'Tổng đơn', value: stats.total, color: 'slate', icon: ClipboardList },
                    { label: 'Chờ xử lý', value: stats.cho_xu_ly, color: 'amber', icon: Clock },
                    { label: 'Đã xác nhận', value: stats.da_xac_nhan, color: 'indigo', icon: Check },
                    { label: 'Đang giao', value: stats.dang_giao, color: 'blue', icon: Truck },
                    { label: 'Hoàn thành', value: stats.hoan_thanh, color: 'emerald', icon: CheckCircle2 },
                ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className={`bg-${color}-100 rounded-xl p-2`}>
                                <Icon className={`w-4 h-4 text-${color}-600`} />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
                                <p className="text-xs text-slate-500">{label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Tìm theo khách hàng, SĐT, tuyến đường..."
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="all">Tất cả ({data.length})</option>
                        {Object.entries(TRANG_THAI).map(([k, v]) => (
                            <option key={k} value={k}>{v.label} ({data.filter(d => d.trang_thai === k).length})</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Không có đơn vận chuyển nào</p>
                        <p className="text-slate-400 text-sm mt-1">Tạo đơn mới từ trang <strong>Lên đơn báo giá</strong></p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {[
                                        { label: 'Khách hàng', field: 'ten_kh' },
                                        { label: 'Tuyến đường', field: null },
                                        { label: 'Tài xế / Xe', field: null },
                                        { label: 'Tổng tiền', field: 'tong_tien' },
                                        { label: 'Chuyến xe', field: null },
                                        { label: 'Trạng thái', field: 'trang_thai' },
                                        { label: 'Ngày tạo', field: 'created_at' },
                                    ].map(col => (
                                        <th key={col.label}
                                            onClick={() => col.field && handleSort(col.field)}
                                            className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 select-none whitespace-nowrap ${col.field ? 'cursor-pointer hover:text-slate-800' : ''}`}>
                                            <div className="flex items-center gap-1">
                                                {col.label}
                                                {col.field && <SortIcon field={col.field} />}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(d => {
                                    const isLocked = LOCKED_STATUSES.includes(d.trang_thai)
                                    const isCancelled = d.trang_thai === 'huy'
                                    return (
                                        <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                                            {/* Khách hàng */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <p className="font-semibold text-slate-800">{d.ten_kh || '—'}</p>
                                                {d.sdt_kh && <p className="text-xs text-slate-500">{d.sdt_kh}</p>}
                                            </td>
                                            {/* Tuyến đường */}
                                            <td className="px-4 py-3 max-w-[200px]">
                                                <p className="text-xs font-medium text-slate-700 truncate">{d.diem_di || '—'}</p>
                                                <p className="text-xs text-slate-400 truncate">→ {d.diem_den || '—'}</p>
                                                {d.km && <p className="text-xs text-blue-600 font-medium">{d.km.toFixed(1)} km</p>}
                                            </td>
                                            {/* Tài xế / Xe */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <p className="text-sm text-slate-700">{d.tai_xe?.ho_ten || '—'}</p>
                                                <p className="text-xs text-slate-400">{d.doi_xe?.bien_so || '—'}</p>
                                            </td>
                                            {/* Tổng tiền */}
                                            <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">
                                                {fmt(d.tong_tien)}
                                            </td>
                                            {/* Chuyến xe */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {d.chuyen_xe_id ? (
                                                    <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg font-medium">
                                                        <Truck className="w-3 h-3" /> Đã xếp
                                                    </span>
                                                ) : d.trang_thai === 'da_xac_nhan' ? (
                                                    <span className="text-xs text-amber-600 font-medium">Chờ xếp chuyến</span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </td>
                                            {/* Trạng thái */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {!isLocked && !isCancelled ? (
                                                    <select
                                                        value={d.trang_thai}
                                                        onChange={e => handleQuickStatus(d.id, e.target.value)}
                                                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border-0 cursor-pointer outline-none ${TRANG_THAI[d.trang_thai]?.color}`}>
                                                        {Object.entries(TRANG_THAI).map(([k, v]) => (
                                                            <option key={k} value={k}>{v.label}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <StatusBadge value={d.trang_thai} />
                                                )}
                                            </td>
                                            {/* Ngày tạo */}
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                                                {new Date(d.created_at).toLocaleDateString('vi-VN')}
                                            </td>
                                            {/* Thao tác */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button onClick={() => setDetailTarget(d)}
                                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        title="Xem chi tiết">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {!isLocked && (
                                                        <button onClick={() => setEditTarget(d)}
                                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                            title="Chỉnh sửa">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {!isLocked && (
                                                        <button onClick={() => setDeleteTarget(d)}
                                                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Xóa">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {filtered.length > 0 && (
                            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                                <span>Hiển thị {filtered.length} / {data.length} đơn vận chuyển</span>
                                <span>Cập nhật: {new Date().toLocaleTimeString('vi-VN')}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Ghi chú luồng */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <Navigation className="w-4 h-4" /> Luồng xử lý đơn vận chuyển
                </p>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                    {[
                        { label: 'Bản nháp', color: 'bg-slate-100 text-slate-600' },
                        { label: 'Chờ xử lý', color: 'bg-amber-100 text-amber-700' },
                        { label: 'Đã xác nhận ← KH confirm', color: 'bg-indigo-100 text-indigo-700' },
                        { label: 'Xếp vào Chuyến xe', color: 'bg-blue-100 text-blue-700' },
                        { label: 'Đang giao', color: 'bg-blue-200 text-blue-800' },
                        { label: 'Hoàn thành 🔒', color: 'bg-emerald-100 text-emerald-700' },
                    ].map((item, i, arr) => (
                        <span key={i} className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-lg font-medium ${item.color}`}>{item.label}</span>
                            {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-slate-400" />}
                        </span>
                    ))}
                </div>
            </div>

            {/* Modals */}
            <EditModal open={!!editTarget} onClose={() => setEditTarget(null)} don={editTarget} onSaved={fetchData} />
            <DetailModal open={!!detailTarget} onClose={() => setDetailTarget(null)} don={detailTarget} />
            <DeleteModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} don={deleteTarget} onDeleted={fetchData} />
        </div>
    )
}
