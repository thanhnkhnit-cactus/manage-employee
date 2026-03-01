import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    Search, Boxes, PackageX, ShoppingBag, TrendingUp,
    ChevronUp, ChevronDown, Loader2, Check, X, EyeOff, Eye, Package
} from 'lucide-react'

const formatVND = (v) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v ?? 0)

export default function KhoHangPage() {
    const { role } = useAuth()
    const canEdit = role !== 'nhan_vien'
    const [searchParams] = useSearchParams()

    const [data, setData] = useState([])       // joined: kho_hang + san_pham info
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState(() => searchParams.get('sp') || '')
    const [sortField, setSortField] = useState('ten_san_pham')
    const [sortDir, setSortDir] = useState('asc')
    const [filterStatus, setFilterStatus] = useState('all')

    // Inline edit gia_ban
    const [editingId, setEditingId] = useState(null)
    const [editGia, setEditGia] = useState('')
    const [saving, setSaving] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        const { data: rows } = await supabase
            .from('kho_hang')
            .select(`
                id, so_luong, gia_ban, gia_nhap, trang_thai, updated_at,
                san_pham:san_pham_id (
                    id, ten_san_pham, ma_san_pham, mo_ta, anh_san_pham,
                    ngay_san_xuat, han_su_dung, trang_thai
                )
            `)
            .order('created_at', { ascending: false })
        setData((rows || []).map(r => ({
            ...r,
            ten_san_pham: r.san_pham?.ten_san_pham || '',
            ma_san_pham: r.san_pham?.ma_san_pham || '',
            mo_ta: r.san_pham?.mo_ta || '',
            anh_san_pham: r.san_pham?.anh_san_pham || '',
            han_su_dung: r.san_pham?.han_su_dung || null,
        })))
        setLoading(false)
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    // ── Stats ──────────────────────────────────────────────────────────────────
    const now = new Date()
    const in3months = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
    const stats = {
        total: data.length,
        outOfStock: data.filter(d => d.so_luong === 0).length,
        tongHangTon: data.reduce((s, d) => s + Number(d.so_luong) * Number(d.gia_ban), 0),
        ganHetHan: data.filter(d => {
            if (!d.han_su_dung) return false
            const hsd = new Date(d.han_su_dung)
            return hsd >= now && hsd <= in3months
        }).length,
    }

    // ── Filter / Sort ──────────────────────────────────────────────────────────
    const filtered = data
        .filter(d => {
            const q = search.toLowerCase()
            const matchQ = !q || d.ten_san_pham.toLowerCase().includes(q) ||
                d.ma_san_pham.toLowerCase().includes(q)
            const matchStatus = filterStatus === 'all' ||
                (filterStatus === 'A' ? d.so_luong > 0 : d.so_luong === 0)
            return matchQ && matchStatus
        })
        .sort((a, b) => {
            const va = a[sortField] ?? ''
            const vb = b[sortField] ?? ''
            if (va < vb) return sortDir === 'asc' ? -1 : 1
            if (va > vb) return sortDir === 'asc' ? 1 : -1
            return 0
        })

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDir('asc') }
    }
    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ChevronUp className="w-3 h-3 text-slate-300" />
        return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-violet-500" /> : <ChevronDown className="w-3 h-3 text-violet-500" />
    }

    // ── Inline edit gia_ban ────────────────────────────────────────────────────
    const startEdit = (row) => { setEditingId(row.id); setEditGia(row.gia_ban) }
    const cancelEdit = () => { setEditingId(null); setEditGia('') }
    const saveGia = async (id) => {
        setSaving(true)
        await supabase.from('kho_hang').update({ gia_ban: Number(editGia) || 0, updated_at: new Date().toISOString() }).eq('id', id)
        setData(prev => prev.map(d => d.id === id ? { ...d, gia_ban: Number(editGia) || 0 } : d))
        cancelEdit()
        setSaving(false)
    }

    // ── Toggle trang_thai ──────────────────────────────────────────────────────
    const handleToggle = async (row) => {
        const next = row.trang_thai === 'A' ? 'I' : 'A'
        await supabase.from('kho_hang').update({ trang_thai: next }).eq('id', row.id)
        setData(prev => prev.map(d => d.id === row.id ? { ...d, trang_thai: next } : d))
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Quản lý Kho hàng</h2>
                <p className="text-slate-500 text-sm mt-1">Theo dõi tồn kho, điều chỉnh giá bán theo lô hàng</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { icon: Boxes, color: 'violet', label: 'Tổng SP kho', value: stats.total, big: true },
                    { icon: PackageX, color: 'red', label: 'Hết hàng', value: stats.outOfStock, big: true },
                    { icon: ShoppingBag, color: 'emerald', label: 'Tổng tiền hàng tồn', value: formatVND(stats.tongHangTon), big: false },
                    {
                        icon: TrendingUp,
                        color: stats.ganHetHan > 0 ? 'orange' : 'slate',
                        label: 'Gần hết hạn (≤3th)',
                        value: stats.ganHetHan,
                        big: true,
                        warn: stats.ganHetHan > 0,
                    },
                ].map(({ icon: Icon, color, label, value, big, warn }) => (
                    <div key={label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`bg-${color}-100 rounded-xl p-2.5`}>
                                <Icon className={`w-5 h-5 text-${color}-600`} />
                            </div>
                            <div>
                                <p className={`font-bold leading-tight ${big ? 'text-2xl' : 'text-base'} ${warn ? 'text-orange-600' : 'text-slate-800'}`}>{value}</p>
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
                            placeholder="Tìm tên sản phẩm, mã SP..."
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
                        <option value="all">Tất cả</option>
                        <option value="A">Còn hàng</option>
                        <option value="I">Hết hàng</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Không có sản phẩm nào trong kho</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Ảnh</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                                        <button onClick={() => handleSort('ten_san_pham')} className="flex items-center gap-1 hover:text-slate-800">
                                            Tên sản phẩm <SortIcon field="ten_san_pham" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                                        <button onClick={() => handleSort('so_luong')} className="flex items-center gap-1 hover:text-slate-800">
                                            Số lượng <SortIcon field="so_luong" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Giá nhập</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                                        <button onClick={() => handleSort('gia_ban')} className="flex items-center gap-1 hover:text-slate-800 ml-auto">
                                            Giá bán <SortIcon field="gia_ban" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">HSD</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Trạng thái</th>
                                    {canEdit && <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Thao tác</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(row => {
                                    const isEditing = editingId === row.id
                                    const isOutOfStock = row.so_luong === 0
                                    return (
                                        <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                                            {/* Ảnh */}
                                            <td className="px-4 py-3">
                                                {row.anh_san_pham ? (
                                                    <img src={row.anh_san_pham} alt=""
                                                        className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                                                        onError={e => { e.target.style.display = 'none' }} />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                                        <Package className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                )}
                                            </td>
                                            {/* Tên SP */}
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-slate-800 text-sm">{row.ten_san_pham}</p>
                                                {row.ma_san_pham && <p className="text-xs text-slate-400 font-mono">{row.ma_san_pham}</p>}
                                            </td>
                                            {/* Số lượng */}
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-base font-bold ${isOutOfStock ? 'text-red-600' : 'text-slate-800'}`}>
                                                    {row.so_luong}
                                                </span>
                                            </td>
                                            {/* Giá nhập */}
                                            <td className="px-4 py-3 text-right text-sm text-slate-500">
                                                {formatVND(row.gia_nhap)}
                                            </td>
                                            {/* Giá bán – inline edit */}
                                            <td className="px-4 py-3 text-right">
                                                {isEditing ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <input type="number" min={0} value={editGia}
                                                            onChange={e => setEditGia(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter') saveGia(row.id); if (e.key === 'Escape') cancelEdit() }}
                                                            className="w-28 px-2 py-1 border-2 border-violet-400 rounded-lg text-right text-sm font-semibold focus:outline-none"
                                                            autoFocus />
                                                        <button onClick={() => saveGia(row.id)} disabled={saving}
                                                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => canEdit && startEdit(row)}
                                                        className={`text-sm font-semibold text-violet-700 ${canEdit ? 'hover:text-violet-900 hover:underline cursor-pointer' : 'cursor-default'}`}
                                                        title={canEdit ? 'Click để chỉnh giá bán' : ''}>
                                                        {formatVND(row.gia_ban)}
                                                    </button>
                                                )}
                                            </td>
                                            {/* HSD */}
                                            <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                                                {row.han_su_dung ? (
                                                    <span className={`${new Date(row.han_su_dung) <= in3months && new Date(row.han_su_dung) >= now ? 'text-orange-600 font-semibold' : ''}`}>
                                                        {row.han_su_dung}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            {/* Trạng thái */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium
                                                    ${isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {isOutOfStock ? 'Hết hàng' : 'Còn hàng'}
                                                </span>
                                            </td>
                                            {/* Thao tác */}
                                            {canEdit && (
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => handleToggle(row)}
                                                            className={`p-1.5 rounded-lg transition-all ${row.trang_thai === 'A'
                                                                ? 'text-slate-500 hover:text-orange-600 hover:bg-orange-50'
                                                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                            title={row.trang_thai === 'A' ? 'Tắt khỏi bán' : 'Kích hoạt bán'}>
                                                            {row.trang_thai === 'A' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                            <span>Hiển thị {filtered.length} / {data.length} sản phẩm</span>
                            <span>Cập nhật: {new Date().toLocaleTimeString('vi-VN')}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
