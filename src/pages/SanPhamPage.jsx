import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    Plus, Search, Pencil, X, Check,
    ChevronUp, ChevronDown, Package, PackageX, Boxes,
    AlertCircle, Loader2, ShoppingBag, TrendingUp, EyeOff, Eye
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatVND = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value ?? 0)

// ─── Modal Thêm / Sửa ────────────────────────────────────────────────────────
function SanPhamModal({ open, onClose, editData, onSaved }) {
    const emptyForm = {
        ma_san_pham: '', ten_san_pham: '',
        mo_ta: '',
        ngay_san_xuat: '', han_su_dung: '',
        anh_san_pham: '',
    }
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

    // QR auto-generate từ mô tả (hoặc tên SP nếu chưa có mô tả)
    const qrText = form.mo_ta.trim() || form.ten_san_pham.trim() || 'SP'
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrText)}`

    useEffect(() => {
        if (open) {
            setForm(editData ? {
                ma_san_pham: editData.ma_san_pham || '',
                ten_san_pham: editData.ten_san_pham || '',
                mo_ta: editData.mo_ta || '',
                ngay_san_xuat: editData.ngay_san_xuat || '',
                han_su_dung: editData.han_su_dung || '',
                anh_san_pham: editData.anh_san_pham || '',
            } : emptyForm)
            setError('')
        }
    }, [editData, open])

    if (!open) return null

    const handleSave = async () => {
        if (!form.ten_san_pham.trim()) return setError('Vui lòng nhập tên sản phẩm.')
        setSaving(true); setError('')
        const payload = {
            ma_san_pham: form.ma_san_pham.trim() || null,
            ten_san_pham: form.ten_san_pham.trim(),
            mo_ta: form.mo_ta.trim(),
            ngay_san_xuat: form.ngay_san_xuat || null,
            han_su_dung: form.han_su_dung || null,
            qr_code: qrSrc,
            anh_san_pham: form.anh_san_pham.trim() || null,
        }
        if (editData?.id) {
            const { error } = await supabase.from('san_pham').update(payload).eq('id', editData.id)
            if (error) { setError('Lỗi: ' + error.message); setSaving(false); return }
        } else {
            const { data: newSp, error } = await supabase.from('san_pham').insert([payload]).select('id').single()
            if (error) { setError('Lỗi: ' + error.message); setSaving(false); return }
            // Tự động tạo kho_hang trống cho sản phẩm mới
            if (newSp?.id) {
                await supabase.from('kho_hang').insert([{
                    san_pham_id: newSp.id,
                    so_luong: 0,
                    gia_ban: 0,
                    gia_nhap: 0,
                    trang_thai: 'I',
                }])
            }
        }
        onSaved(); onClose()
        setSaving(false)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-violet-100 rounded-xl p-2">
                            <Package className="w-5 h-5 text-violet-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {editData ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-2.5 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />{error}
                        </div>
                    )}

                    {/* Mã SP + QR */}
                    <div className="flex gap-4 items-start">
                        <div className="flex-1 space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Mã sản phẩm</label>
                                <input value={form.ma_san_pham} onChange={e => setF('ma_san_pham', e.target.value)}
                                    placeholder="SP001"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Tên sản phẩm *</label>
                                <input value={form.ten_san_pham} onChange={e => setF('ten_san_pham', e.target.value)}
                                    placeholder="VD: Áo thun nam"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày sản xuất</label>
                                    <input type="date" value={form.ngay_san_xuat} onChange={e => setF('ngay_san_xuat', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Hạn sử dụng</label>
                                    <input type="date" value={form.han_su_dung} onChange={e => setF('han_su_dung', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500" />
                                </div>
                            </div>
                        </div>
                        {/* QR tự động */}
                        <div className="flex flex-col items-center gap-1 pt-1">
                            <label className="text-xs font-semibold text-slate-600">QR tự động</label>
                            <div className="border-2 border-violet-200 rounded-xl p-1.5 bg-violet-50">
                                <img src={qrSrc} alt="QR" className="w-[100px] h-[100px] rounded-lg" />
                            </div>
                            <span className="text-[10px] text-slate-400">{editData ? 'SP' : 'Mới'}</span>
                        </div>
                    </div>

                    {/* Mô tả */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Mô tả sản phẩm <span className="font-normal text-slate-400">(QR tự cập nhật)</span>
                        </label>
                        <textarea value={form.mo_ta} onChange={e => setF('mo_ta', e.target.value)}
                            rows={3} placeholder="Nhập mô tả chi tiết về sản phẩm..."
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
                    </div>

                    {/* Ảnh sản phẩm */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Link ảnh sản phẩm
                        </label>
                        <input value={form.anh_san_pham} onChange={e => setF('anh_san_pham', e.target.value)}
                            placeholder="https://example.com/anh-san-pham.jpg"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        {form.anh_san_pham.trim() && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center h-24">
                                <img src={form.anh_san_pham.trim()} alt="preview"
                                    className="max-h-24 max-w-full object-contain rounded"
                                    onError={e => { e.target.style.display = 'none' }} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-5 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {saving ? 'Đang lưu...' : 'Lưu sản phẩm'}
                    </button>
                </div>
            </div>
        </div>
    )
}
// ─── Modal Xác nhận xóa ───────────────────────────────────────────────────────
function DeleteModal({ open, onClose, sanPham, onDeleted }) {
    const [deleting, setDeleting] = useState(false)

    if (!open || !sanPham) return null

    const handleDelete = async () => {
        setDeleting(true)
        const { error } = await supabase.from('san_pham').delete().eq('id', sanPham.id)
        if (!error) onDeleted()
        onClose()
        setDeleting(false)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="text-center">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-7 h-7 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa</h3>
                    <p className="text-slate-500 text-sm mb-6">
                        Bạn có chắc muốn xóa sản phẩm <strong className="text-slate-700">{sanPham.ten_san_pham}</strong>?
                        Hành động này không thể hoàn tác.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all text-sm font-medium">
                            Hủy
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all text-sm font-medium flex items-center justify-center gap-2"
                        >
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            {deleting ? 'Đang xóa...' : 'Xóa'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Trang chính ──────────────────────────────────────────────────────────────
export default function SanPhamPage() {
    const { canSeeGiaNhap, role } = useAuth()
    const canEdit = role !== 'nhan_vien'
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [sortField, setSortField] = useState('created_at')
    const [sortDir, setSortDir] = useState('desc')
    const [modalOpen, setModalOpen] = useState(false)
    const [editData, setEditData] = useState(null)
    const [previewImg, setPreviewImg] = useState(null)

    const fetchData = async () => {
        setLoading(true)
        const { data: rows } = await supabase
            .from('san_pham')
            .select('*')
            .order(sortField, { ascending: sortDir === 'asc' })
        setData(rows || [])
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [sortField, sortDir])

    const handleToggleStatus = async (sp) => {
        const newStatus = sp.trang_thai === 'A' ? 'I' : 'A'
        await supabase.from('san_pham').update({ trang_thai: newStatus }).eq('id', sp.id)
        setData(prev => prev.map(d => d.id === sp.id ? { ...d, trang_thai: newStatus } : d))
    }

    const filtered = data.filter(sp => {
        const q = search.toLowerCase()
        return !q || sp.ten_san_pham?.toLowerCase().includes(q) || sp.mo_ta?.toLowerCase().includes(q)
    })

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDir('asc') }
    }

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ChevronUp className="w-3 h-3 text-slate-300" />
        return sortDir === 'asc'
            ? <ChevronUp className="w-3 h-3 text-violet-500" />
            : <ChevronDown className="w-3 h-3 text-violet-500" />
    }

    const stats = {
        total: data.length,
        active: data.filter(d => d.trang_thai === 'A').length,
    }

    const columns = [
        { label: 'Tên sản phẩm', field: 'ten_san_pham' },
        { label: 'Trạng thái', field: 'trang_thai' },
        { label: 'Mô tả', field: 'mo_ta' },
        { label: 'Ảnh SP', field: null },
    ]

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Quản lý Sản phẩm</h2>
                <p className="text-slate-500 text-sm mt-1">Quản lý danh sách sản phẩm trong kho hàng</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-violet-100 rounded-xl p-2.5">
                            <Boxes className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                            <p className="text-xs text-slate-500">Tổng sản phẩm</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 rounded-xl p-2.5">
                            <Package className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.active}</p>
                            <p className="text-xs text-slate-500">Đang hoạt động</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Tìm kiếm sản phẩm..."
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm transition-all"
                        />
                    </div>
                    {canEdit && (
                        <button
                            onClick={() => { setEditData(null); setModalOpen(true) }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Thêm sản phẩm</span>
                        </button>
                    )}
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
                        <p className="text-slate-500 font-medium">Không có sản phẩm nào</p>
                        <p className="text-slate-400 text-sm mt-1">Nhấn "Thêm sản phẩm" để bắt đầu</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {columns.map(col => (
                                        <th
                                            key={col.label}
                                            onClick={() => col.field && handleSort(col.field)}
                                            className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 select-none transition-colors ${col.field ? 'cursor-pointer hover:text-slate-800' : ''}`}
                                        >
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
                                {filtered.map(sp => {
                                    return (
                                        <tr key={sp.id} className="hover:bg-slate-50/70 transition-colors">
                                            {/* Tên + Mã SP (link → kho hàng) */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <Package className="w-4 h-4 text-violet-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-800 text-sm">{sp.ten_san_pham}</p>
                                                        {sp.ma_san_pham && (
                                                            <Link
                                                                to={`/kho-hang?sp=${encodeURIComponent(sp.ten_san_pham)}`}
                                                                className="text-xs font-mono text-violet-500 hover:text-violet-700 hover:underline"
                                                                title="Xem tồn kho"
                                                            >
                                                                {sp.ma_san_pham}
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Trạng thái */}
                                            <td className="px-4 py-3">
                                                {sp.trang_thai === 'I' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-semibold">
                                                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                                                        Inactive
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                                        Active
                                                    </span>
                                                )}
                                            </td>
                                            {/* Mô tả */}
                                            <td className="px-4 py-3 text-sm text-slate-500 max-w-xs">
                                                <span className="line-clamp-2">{sp.mo_ta || '—'}</span>
                                            </td>
                                            {/* Ảnh SP */}
                                            <td className="px-4 py-3">
                                                {sp.anh_san_pham ? (
                                                    <button onClick={() => setPreviewImg(sp.anh_san_pham)}
                                                        className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-violet-400 transition-all block">
                                                        <img src={sp.anh_san_pham} alt={sp.ten_san_pham}
                                                            className="w-full h-full object-cover"
                                                            onError={e => { e.target.src = '' }} />
                                                    </button>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center">
                                                        <Package className="w-4 h-4 text-slate-300" />
                                                        <span className="text-[7px] text-slate-300 mt-0.5">No img</span>
                                                    </div>
                                                )}
                                            </td>
                                            {/* Thao tác */}
                                            {canEdit ? (
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => { setEditData(sp); setModalOpen(true) }}
                                                            className="p-1.5 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                                                            title="Chỉnh sửa"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleStatus(sp)}
                                                            className={`p-1.5 rounded-lg transition-all ${sp.trang_thai === 'A'
                                                                ? 'text-slate-500 hover:text-yellow-600 hover:bg-yellow-50'
                                                                : 'text-slate-500 hover:text-green-600 hover:bg-green-50'
                                                                }`}
                                                            title={sp.trang_thai === 'A' ? 'Inactive sản phẩm' : 'Kích hoạt lại'}
                                                        >
                                                            {sp.trang_thai === 'A' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </td>
                                            ) : <td />}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Table footer */}
                {!loading && filtered.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                        <span>Hiển thị {filtered.length} / {data.length} sản phẩm</span>
                        <span>Cập nhật lần cuối: {new Date().toLocaleTimeString('vi-VN')}</span>
                    </div>
                )}
            </div>

            {/* Modals */}
            {/* Image Lightbox */}
            {previewImg && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
                    onClick={() => setPreviewImg(null)}>
                    <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setPreviewImg(null)}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-100 z-10">
                            <X className="w-4 h-4 text-slate-600" />
                        </button>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl p-2">
                            <img src={previewImg} alt="Sản phẩm" className="max-h-[80vh] w-full object-contain rounded-xl"
                                onError={e => { e.target.src = ''; e.target.alt = 'Không tải được ảnh' }} />
                        </div>
                    </div>
                </div>
            )}
            <SanPhamModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                editData={editData}
                onSaved={fetchData}
            />

        </div>
    )
}
