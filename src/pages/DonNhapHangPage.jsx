import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    Plus, Search, Pencil, X, Check, ChevronUp, ChevronDown,
    Loader2, Warehouse, Package, Truck, AlertCircle, Eye, Trash2, PackageCheck, QrCode
} from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n) || 0)
const num = (v) => Number(v) || 0

const TRANG_THAI = {
    khoi_tao: { label: 'Khởi tạo', color: 'bg-slate-100 text-slate-700' },
    da_dat_coc: { label: 'Đã đặt cọc', color: 'bg-yellow-100 text-yellow-700' },
    cho_lay_hang: { label: 'Chờ lấy hàng', color: 'bg-blue-100 text-blue-700' },
    da_thanh_toan: { label: 'Đã thanh toán', color: 'bg-indigo-100 text-indigo-700' },
    dang_van_chuyen: { label: 'Đang vận chuyển', color: 'bg-orange-100 text-orange-700' },
    da_nhap_kho: { label: '✅ Đã nhập kho', color: 'bg-green-100 text-green-700' },
}

const EMPTY_ROW = () => ({
    _id: Math.random().toString(36).slice(2),
    san_pham_id: '', ten_san_pham: '',
    so_luong: '', gia_niem_yet: '', gia_nhap: '', phi_khac: '', han_su_dung: '',
})

const EMPTY_FORM = {
    ma_nhap_hang: '', ten_nha_cung_cap: '',
    ngay_tao: new Date().toISOString().slice(0, 10),
    phi_van_chuyen: '', cuoc_van_chuyen_khac: '',
    trang_thai: 'khoi_tao', ghi_chu: '',
}

// ─── Tính tổng ──────────────────────────────────────────────────────────────
// Thành tiền của 1 dòng = (giá nhập × số lượng) + phí khác
function calcThanhTien(row) { return num(row.gia_nhap) * num(row.so_luong) + num(row.phi_khac) }
// Tổng đơn hàng = sum thành tiền các dòng + phí VC đơn
function calcOrderTotal(rows, form) {
    return rows.reduce((s, r) => s + calcThanhTien(r), 0)
        + num(form.phi_van_chuyen) + num(form.cuoc_van_chuyen_khac)
}
// Giá gợi ý/sp = ((thành tiền / số lượng) + ((phí VC + cước VC) / tổng sản phẩm)) × 150%
function calcGiaGoiY(row, totalVc, totalQty) {
    const sl = num(row.so_luong) || 1
    const vcShare = num(totalVc) / Math.max(num(totalQty), 1)
    return Math.ceil((calcThanhTien(row) / sl + vcShare) * 1.5)
}
// Giá nhập/sp = (Thành tiền / Số lượng) + (Phí VC + Cước VC) / Tổng SL
function calcGiaNhapThuc(row, totalVc, totalQty) {
    const sl = num(row.so_luong) || 1
    const vcShare = num(totalVc) / Math.max(num(totalQty), 1)
    return Math.ceil((calcThanhTien(row) / sl) + vcShare)
}

// ─── Thêm mới sản phẩm Modal ─────────────────────────────────────────────────
function ThemMoiSanPhamModal({ open, onClose, onSaved }) {
    const [form, setForm] = useState({ ma_san_pham: '', ten_san_pham: '', mo_ta: '', ngay_san_xuat: '', han_su_dung: '', anh_san_pham: '' })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
    const qrData = form.mo_ta || form.ten_san_pham || 'SP'
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrData)}`

    useEffect(() => { if (open) { setForm({ ma_san_pham: '', ten_san_pham: '', mo_ta: '', ngay_san_xuat: '', han_su_dung: '', anh_san_pham: '' }); setError('') } }, [open])

    const handleSave = async () => {
        if (!form.ten_san_pham.trim()) return setError('Vui lòng nhập tên sản phẩm')
        setSaving(true); setError('')
        const { error: err } = await supabase.from('san_pham').insert({
            ma_san_pham: form.ma_san_pham || null,
            ten_san_pham: form.ten_san_pham.trim(),
            mo_ta: form.mo_ta || null,
            ngay_san_xuat: form.ngay_san_xuat || null,
            han_su_dung: form.han_su_dung || null,
            qr_code: qrData,
            anh_san_pham: form.anh_san_pham.trim() || null,
            trang_thai: 'I', so_luong: 0, gia_ban: 0, gia_nhap: 0,
        })
        if (err) { setError(err.message); setSaving(false); return }
        setSaving(false); onSaved(); onClose()
    }

    if (!open) return null
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-violet-100 rounded-xl p-2"><QrCode className="w-5 h-5 text-violet-600" /></div>
                        <h2 className="text-lg font-bold text-slate-800">Thêm sản phẩm mới</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 space-y-4">
                    {error && <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-700 text-sm">{error}</div>}
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Mã sản phẩm</label>
                                <input value={form.ma_san_pham} onChange={e => setF('ma_san_pham', e.target.value)}
                                    placeholder="SP001" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 font-mono" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Tên sản phẩm *</label>
                                <input value={form.ten_san_pham} onChange={e => setF('ten_san_pham', e.target.value)}
                                    placeholder="VD: Áo thun nam" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày sản xuất</label>
                                    <input type="date" value={form.ngay_san_xuat} onChange={e => setF('ngay_san_xuat', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Hạn sử dụng</label>
                                    <input type="date" value={form.han_su_dung} onChange={e => setF('han_su_dung', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-xs text-slate-500 font-medium">QR tự động</p>
                            <img src={qrUrl} alt="QR" className="w-32 h-32 rounded-xl border border-slate-200 shadow-sm" />
                            <p className="text-[10px] text-slate-400 text-center max-w-[128px] break-words">{qrData.slice(0, 30)}{qrData.length > 30 ? '...' : ''}</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Mô tả sản phẩm</label>
                        <textarea value={form.mo_ta} onChange={e => setF('mo_ta', e.target.value)} rows={3}
                            placeholder="Nhập mô tả chi tiết về sản phẩm..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
                    </div>
                    {/* Link ảnh sản phẩm */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Link ảnh sản phẩm</label>
                        <input value={form.anh_san_pham} onChange={e => setF('anh_san_pham', e.target.value)}
                            placeholder="https://example.com/anh-san-pham.jpg"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                        {form.anh_san_pham.trim() && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center h-24">
                                <img src={form.anh_san_pham.trim()} alt="preview"
                                    className="max-h-24 max-w-full object-contain rounded"
                                    onError={e => { e.target.style.display = 'none' }} />
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-3 px-5 pb-5 pt-1">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium disabled:opacity-60">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {saving ? 'Đang lưu...' : 'Lưu sản phẩm'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Product Grid Row (simplified) ──────────────────────────────────────────
function ProductRow({ row, products, onChange, onRemove, canRemove, totalVc, totalQty }) {
    const setF = (k, v) => onChange({ ...row, [k]: v })
    const handleProductSelect = (id) => {
        const sp = products.find(p => p.id === id)
        if (sp) onChange({ ...row, san_pham_id: id, ten_san_pham: sp.ten_san_pham, gia_niem_yet: sp.gia_ban || '' })
        else onChange({ ...row, san_pham_id: '', ten_san_pham: '' })
    }
    const thanhTien = calcThanhTien(row)
    const giaNhapThuc = calcGiaNhapThuc(row, totalVc, totalQty)
    const giaGoiY = calcGiaGoiY(row, totalVc, totalQty)
    return (
        <tr className="border-b border-slate-100 hover:bg-orange-50/30">
            <td className="px-2 py-2 min-w-[200px]">
                <select value={row.san_pham_id} onChange={e => handleProductSelect(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-orange-400">
                    <option value="">-- Chọn sản phẩm --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.ten_san_pham}</option>)}
                </select>
            </td>
            <td className="px-2 py-2 w-[70px]">
                <input type="number" min={0} value={row.so_luong} onChange={e => setF('so_luong', e.target.value)}
                    placeholder="0" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-orange-400" />
            </td>
            <td className="px-2 py-2 w-[110px]">
                <input type="number" min={0} value={row.gia_niem_yet} onChange={e => setF('gia_niem_yet', e.target.value)}
                    placeholder="0" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-400" />
            </td>
            <td className="px-2 py-2 w-[120px]">
                <input type="number" min={0} value={row.gia_nhap} onChange={e => setF('gia_nhap', e.target.value)}
                    placeholder="0" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-400" />
            </td>
            <td className="px-2 py-2 w-[100px]">
                <input type="number" min={0} value={row.phi_khac} onChange={e => setF('phi_khac', e.target.value)}
                    placeholder="0" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-400" />
            </td>
            <td className="px-2 py-2 w-[110px]">
                <input type="date" value={row.han_su_dung} onChange={e => setF('han_su_dung', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
            </td>
            <td className="px-2 py-2 w-[120px] text-right text-xs font-semibold text-slate-700 pr-3">
                {thanhTien > 0 ? new Intl.NumberFormat('vi-VN').format(thanhTien) : '—'}
            </td>
            <td className="px-2 py-2 w-[120px] text-right text-xs font-semibold text-blue-700 pr-3">
                {giaNhapThuc > 0 ? new Intl.NumberFormat('vi-VN').format(giaNhapThuc) : '—'}
            </td>
            <td className="px-2 py-2 w-[130px] text-right text-xs font-bold text-green-700 pr-3">
                {giaGoiY > 0 ? new Intl.NumberFormat('vi-VN').format(giaGoiY) : '—'}
            </td>
            <td className="px-2 py-2 w-[36px]">
                {canRemove && <button onClick={onRemove} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>}
            </td>
        </tr>
    )
}

// ─── Form Modal ───────────────────────────────────────────────────────────────
function DonNhapModal({ open, onClose, editData, editRows, products, onSaved, isLocked }) {
    const [form, setForm] = useState(EMPTY_FORM)
    const [rows, setRows] = useState([EMPTY_ROW()])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [addSpModalOpen, setAddSpModalOpen] = useState(false)

    useEffect(() => {
        if (!open) return
        if (editData) {
            setForm({
                ma_nhap_hang: editData.ma_nhap_hang || '',
                ten_nha_cung_cap: editData.ten_nha_cung_cap || '',
                ngay_tao: editData.ngay_tao?.slice(0, 10) || new Date().toISOString().slice(0, 10),
                phi_van_chuyen: editData.phi_van_chuyen ?? '',
                cuoc_van_chuyen_khac: editData.cuoc_van_chuyen_khac ?? '',
                trang_thai: editData.trang_thai || 'khoi_tao',
                ghi_chu: editData.ghi_chu || '',
            })
            setRows(editRows?.length ? editRows.map(r => ({ ...r, _id: r.id || Math.random().toString(36).slice(2) })) : [EMPTY_ROW()])
        } else {
            const ts = Date.now().toString().slice(-6)
            setForm({ ...EMPTY_FORM, ma_nhap_hang: `NH${ts}` })
            setRows([EMPTY_ROW()])
        }
        setError('')
    }, [open, editData, editRows])

    const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
    const updateRow = (idx, updated) => setRows(r => r.map((x, i) => i === idx ? updated : x))
    const removeRow = (idx) => setRows(r => r.filter((_, i) => i !== idx))
    const addRow = () => setRows(r => [...r, EMPTY_ROW()])

    const totalQty = rows.reduce((s, r) => s + num(r.so_luong), 0)
    const totalVc = num(form.phi_van_chuyen) + num(form.cuoc_van_chuyen_khac)
    const orderTotal = calcOrderTotal(rows, form)

    const handleSave = async () => {
        if (!form.ma_nhap_hang.trim()) return setError('Vui lòng nhập mã nhập hàng')
        if (rows.some(r => !r.san_pham_id)) return setError('Vui lòng chọn sản phẩm cho tất cả các dòng')
        setSaving(true); setError('')

        const orderPayload = {
            ma_nhap_hang: form.ma_nhap_hang.trim(),
            ten_nha_cung_cap: form.ten_nha_cung_cap || null,
            ngay_tao: form.ngay_tao,
            phi_van_chuyen: num(form.phi_van_chuyen),
            cuoc_van_chuyen_khac: num(form.cuoc_van_chuyen_khac),
            trang_thai: form.trang_thai,
            ghi_chu: form.ghi_chu || null,
        }

        let orderId = editData?.id
        let err

        if (orderId) {
            const res = await supabase.from('don_nhap_hang').update(orderPayload).eq('id', orderId)
            err = res.error
        } else {
            const res = await supabase.from('don_nhap_hang').insert(orderPayload).select('id').single()
            err = res.error; orderId = res.data?.id
        }
        if (err || !orderId) { setError(err?.message || 'Lỗi lưu đơn'); setSaving(false); return }

        // Upsert chi tiết: xóa cũ, insert mới
        if (orderId) {
            await supabase.from('don_nhap_hang_chi_tiet').delete().eq('don_nhap_hang_id', orderId)
            const totalVc = num(form.phi_van_chuyen) + num(form.cuoc_van_chuyen_khac)
            const totalQty = rows.reduce((s, r) => s + num(r.so_luong), 0)
            const chiTiet = rows.map(r => ({
                don_nhap_hang_id: orderId,
                san_pham_id: r.san_pham_id || null,
                ten_san_pham: (products.find(p => p.id === r.san_pham_id)?.ten_san_pham || r.ten_san_pham || '').trim(),
                so_luong: num(r.so_luong),
                gia_niem_yet: num(r.gia_niem_yet),
                gia_nhap: num(r.gia_nhap),
                phi_khac: num(r.phi_khac),
                han_su_dung: r.han_su_dung || null,
                gia_nhap_thuc: calcGiaNhapThuc(r, totalVc, totalQty),
                gia_goi_y: calcGiaGoiY(r, totalVc, totalQty),
            }))
            const res2 = await supabase.from('don_nhap_hang_chi_tiet').insert(chiTiet)
            if (res2.error) { setError(res2.error.message); setSaving(false); return }
        }

        onSaved(); onClose(); setSaving(false)
    }

    if (!open) return null
    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800">
                            {isLocked ? '📦 Chi tiết đơn nhập (Đã nhập kho)' : editData ? 'Chỉnh sửa đơn nhập' : 'Tạo đơn nhập hàng'}
                        </h2>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-5 space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex gap-2 text-red-700 text-sm">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}
                            </div>
                        )}

                        {isLocked && (
                            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-green-700 text-sm font-medium">
                                <PackageCheck className="w-4 h-4 flex-shrink-0" />
                                Đơn này đã nhập kho thành công — chỉ xem, không thể chỉnh sửa.
                            </div>
                        )}

                        {/* Đơn hàng Header fields */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Mã nhập hàng *</label>
                                <input value={form.ma_nhap_hang} onChange={e => setF('ma_nhap_hang', e.target.value)}
                                    disabled={isLocked}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono disabled:bg-slate-50 disabled:cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nhà cung cấp</label>
                                <input value={form.ten_nha_cung_cap} onChange={e => setF('ten_nha_cung_cap', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Tên NCC" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày tạo</label>
                                <input type="date" value={form.ngay_tao} onChange={e => setF('ngay_tao', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Trạng thái</label>
                                <select value={form.trang_thai} onChange={e => setF('trang_thai', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                                    {Object.entries(TRANG_THAI)
                                        .filter(([k]) => k !== 'da_nhap_kho')
                                        .map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Phí cấp đơn */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Phí vận chuyển đơn hàng</label>
                                <input type="number" min={0} value={form.phi_van_chuyen} onChange={e => setF('phi_van_chuyen', e.target.value)}
                                    placeholder="0"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Cước vận chuyển khác</label>
                                <input type="number" min={0} value={form.cuoc_van_chuyen_khac} onChange={e => setF('cuoc_van_chuyen_khac', e.target.value)}
                                    placeholder="0"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú</label>
                                <input value={form.ghi_chu} onChange={e => setF('ghi_chu', e.target.value)}
                                    placeholder="Ghi chú thêm..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                            </div>
                        </div>

                        {/* Product Grid */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-orange-50 px-4 py-2.5 flex items-center justify-between border-b border-orange-100">
                                <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Chi tiết sản phẩm</p>
                                {!isLocked && (
                                    <div className="flex gap-2">
                                        <button onClick={() => setAddSpModalOpen(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium transition-all">
                                            <QrCode className="w-3.5 h-3.5" /> Thêm SP mới
                                        </button>
                                        <button onClick={addRow}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium transition-all">
                                            <Plus className="w-3.5 h-3.5" /> Thêm dòng
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            {['Chọn sản phẩm', 'Số lượng', 'Giá NY', 'Giá nhập', 'Phí khác', 'HSD', 'Thành tiền', 'Giá nhập/sp', 'Giá gợi ý / sp', ''].map(h => (
                                                <th key={h} className="px-2 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, idx) => (
                                            <ProductRow key={row._id} row={row} products={products}
                                                onChange={updated => updateRow(idx, updated)}
                                                onRemove={() => removeRow(idx)}
                                                canRemove={rows.length > 1 && !isLocked}
                                                totalVc={totalVc}
                                                totalQty={totalQty || 1} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Summary */}
                            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-6 text-sm">
                                    <span className="text-slate-600">
                                        <span className="font-semibold">{rows.length}</span> dòng SP
                                        <span className="ml-3 font-semibold">{totalQty.toLocaleString('vi-VN')}</span> tổng SL
                                    </span>
                                </div>
                                <div className="flex gap-4">
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">Tổng tiền đơn</p>
                                        <p className="text-base font-bold text-orange-700">{fmt(orderTotal)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 px-5 pb-5 pt-1">
                        <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Đóng</button>
                        {!isLocked && (
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-medium disabled:opacity-60">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {saving ? 'Đang lưu...' : 'Lưu đơn nhập'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <ThemMoiSanPhamModal open={addSpModalOpen} onClose={() => setAddSpModalOpen(false)}
                onSaved={() => setAddSpModalOpen(false)} />
        </>
    )
}

// ─── Stock Confirmation Modal ─────────────────────────────────────────────────
function NhapKhoModal({ open, order, chiTiet, onClose, onConfirmed }) {
    const [lines, setLines] = useState([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open && chiTiet) {
            const totalVc = num(order?.phi_van_chuyen) + num(order?.cuoc_van_chuyen_khac)
            const totalQty = chiTiet.reduce((s, r) => s + num(r.so_luong), 0)
            setLines(chiTiet.map(r => ({
                ...r,
                so_luong_thuc_te: r.so_luong_thuc_te ?? r.so_luong,
                gia_nhap_thuc: r.gia_nhap_thuc ?? calcGiaNhapThuc(r, totalVc, totalQty),
                gia_goi_y: r.gia_goi_y ?? calcGiaGoiY(r, totalVc, totalQty),
            })))
        }
    }, [open, chiTiet, order])

    const updateLine = (idx, k, v) => setLines(prev => {
        const next = prev.map((l, i) => i === idx ? { ...l, [k]: v } : l)
        if (k === 'so_luong_thuc_te') {
            const totalVc = num(order?.phi_van_chuyen) + num(order?.cuoc_van_chuyen_khac)
            const totalQty = next.reduce((s, l) => s + num(l.so_luong_thuc_te), 0)
            return next.map(l => ({
                ...l,
                gia_nhap_thuc: l._manualNhap ? l.gia_nhap_thuc : Math.ceil((calcThanhTien({ ...l, so_luong: l.so_luong_thuc_te }) / (num(l.so_luong_thuc_te) || 1) + num(totalVc) / Math.max(totalQty, 1))),
                gia_goi_y: l._manualGia ? l.gia_goi_y : Math.ceil((calcThanhTien({ ...l, so_luong: l.so_luong_thuc_te }) / (num(l.so_luong_thuc_te) || 1) + num(totalVc) / Math.max(totalQty, 1)) * 1.5),
            }))
        }
        if (k === 'gia_nhap_thuc') return next.map((l, i) => i === idx ? { ...l, _manualNhap: true } : l)
        if (k === 'gia_goi_y') return next.map((l, i) => i === idx ? { ...l, _manualGia: true } : l)
        return next
    })

    const handleConfirm = async () => {
        setSaving(true)

        for (const line of lines) {
            const sl = num(line.so_luong_thuc_te)
            const gia = num(line.gia_goi_y)
            const giaNhap = num(line.gia_nhap_thuc)

            // Update chi_tiet record
            await supabase.from('don_nhap_hang_chi_tiet').update({
                so_luong_thuc_te: sl,
                gia_nhap_thuc: giaNhap,
                gia_goi_y: gia,
            }).eq('id', line.id)

            if (line.san_pham_id) {
                // Sản phẩm cũ → cập nhật kho_hang
                const { data: kh } = await supabase
                    .from('kho_hang')
                    .select('id, so_luong')
                    .eq('san_pham_id', line.san_pham_id)
                    .single()
                if (kh) {
                    await supabase.from('kho_hang').update({
                        so_luong: (kh.so_luong || 0) + sl,
                        trang_thai: 'A',
                        gia_nhap: giaNhap,
                        gia_ban: gia,
                        updated_at: new Date().toISOString(),
                    }).eq('id', kh.id)
                } else {
                    // kho_hang chưa có dòng → tạo mới
                    await supabase.from('kho_hang').insert([{
                        san_pham_id: line.san_pham_id,
                        so_luong: sl,
                        gia_ban: gia,
                        gia_nhap: giaNhap,
                        trang_thai: 'A',
                    }])
                }
                // Cập nhật thông tin phụ trong san_pham (không ghi SL/giá vào san_pham nữa)
                await supabase.from('san_pham').update({
                    don_nhap_hang_id: order.id,
                    ma_nhap_hang: order.ma_nhap_hang,
                    ngay_nhap_kho: new Date().toISOString().slice(0, 10),
                }).eq('id', line.san_pham_id)
            } else {
                // SP mới → insert san_pham và kho_hang
                const { data: newSp } = await supabase.from('san_pham').insert({
                    ten_san_pham: line.ten_san_pham,
                    mo_ta: `Nhập từ đơn ${order.ma_nhap_hang} - NCC: ${order.ten_nha_cung_cap || 'N/A'}`,
                    trang_thai: 'I',
                    don_nhap_hang_id: order.id,
                    ma_nhap_hang: order.ma_nhap_hang,
                    ngay_nhap_kho: new Date().toISOString().slice(0, 10),
                    han_su_dung: line.han_su_dung || null,
                }).select('id').single()
                if (newSp?.id) {
                    // Tạo kho_hang cho SP mới
                    await supabase.from('kho_hang').insert([{
                        san_pham_id: newSp.id,
                        so_luong: sl,
                        gia_ban: gia,
                        gia_nhap: giaNhap,
                        trang_thai: 'A',
                    }])
                    // Link chi_tiet → SP mới
                    await supabase.from('don_nhap_hang_chi_tiet').update({ san_pham_id: newSp.id }).eq('id', line.id)
                }
            }
        }

        // Set đơn → da_nhap_kho
        await supabase.from('don_nhap_hang').update({ trang_thai: 'da_nhap_kho' }).eq('id', order.id)

        setSaving(false); onConfirmed()
    }

    if (!open) return null
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 rounded-xl p-2"><PackageCheck className="w-5 h-5 text-green-600" /></div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Xác nhận nhập kho</h2>
                            <p className="text-xs text-slate-500">Kiểm tra và chỉnh SL thực tế, giá gợi ý trước khi cập nhật kho</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-5">
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {['Tên sản phẩm', 'SL đặt', 'SL thực tế', 'Giá nhập/sp', 'Giá gợi ý / sp', 'Loại'].map(h => (
                                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lines.map((line, idx) => (
                                    <tr key={line.id} className="hover:bg-slate-50">
                                        <td className="px-3 py-2.5 font-medium text-slate-800">{line.ten_san_pham}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-700">{line.so_luong}</td>
                                        <td className="px-3 py-2.5 w-[90px]">
                                            <input type="number" min={0} value={line.so_luong_thuc_te}
                                                onChange={e => updateLine(idx, 'so_luong_thuc_te', e.target.value)}
                                                className="w-full px-2 py-1.5 border-2 border-orange-300 rounded-lg text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400" />
                                        </td>
                                        <td className="px-3 py-2.5 w-[130px]">
                                            <input type="number" min={0} value={line.gia_nhap_thuc ?? ''}
                                                onChange={e => updateLine(idx, 'gia_nhap_thuc', e.target.value)}
                                                className="w-full px-2 py-1.5 border-2 border-blue-300 rounded-lg text-right text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400" />
                                        </td>
                                        <td className="px-3 py-2.5 w-[130px]">
                                            <input type="number" min={0} value={line.gia_goi_y}
                                                onChange={e => updateLine(idx, 'gia_goi_y', e.target.value)}
                                                className="w-full px-2 py-1.5 border-2 border-green-300 rounded-lg text-right text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-400" />
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {line.san_pham_id
                                                ? <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Cập nhật SL</span>
                                                : <span className="inline-flex items-center px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Tạo mới (I)</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex gap-3 px-5 pb-5 pt-1">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                    <button onClick={handleConfirm} disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium disabled:opacity-60">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                        {saving ? 'Đang cập nhật kho...' : 'Xác nhận & Nhập kho'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ open, order, chiTiet, onClose, onEdit, canEdit }) {
    if (!open || !order) return null
    const tt = TRANG_THAI[order.trang_thai] || {}
    const shipping = num(order.phi_van_chuyen) + num(order.cuoc_van_chuyen_khac)
    const itemTotal = (chiTiet || []).reduce((s, r) => s + num(r.gia_nhap) + num(r.cuoc_khac) + num(r.phi_khac), 0)
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Chi tiết đơn nhập</h2>
                        <span className="font-mono text-sm text-orange-600">{order.ma_nhap_hang}</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 space-y-4">
                    {/* Info */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Nhà cung cấp', value: order.ten_nha_cung_cap },
                            { label: 'Ngày tạo', value: order.ngay_tao },
                            { label: 'Trạng thái', value: <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${tt.color}`}>{tt.label}</span> },
                            { label: 'Phí vận chuyển', value: fmt(order.phi_van_chuyen) },
                            { label: 'Cước VC khác', value: fmt(order.cuoc_van_chuyen_khac) },
                            { label: 'Tổng tiền đơn', value: <span className="font-bold text-orange-700">{fmt(itemTotal + shipping)}</span> },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-50 rounded-xl px-3 py-2.5">
                                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                                <p className="text-sm font-semibold text-slate-800">{value ?? '—'}</p>
                            </div>
                        ))}
                    </div>
                    {/* Chi tiết SP */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                            <p className="text-xs font-bold text-slate-600 uppercase">Danh sách sản phẩm ({chiTiet?.length || 0})</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        {['Sản phẩm', 'Màu', 'SL đặt', 'SL thực tế', 'Giá nhập', 'Giá gợi ý'].map(h => (
                                            <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(chiTiet || []).map(r => (
                                        <tr key={r.id} className="hover:bg-slate-50">
                                            <td className="px-3 py-2 font-medium text-slate-800">{r.ten_san_pham}</td>
                                            <td className="px-3 py-2 text-slate-500 text-xs">{r.mau_sac || '—'}</td>
                                            <td className="px-3 py-2 text-center">{r.so_luong}</td>
                                            <td className="px-3 py-2 text-center text-emerald-700 font-medium">{r.so_luong_thuc_te ?? '—'}</td>
                                            <td className="px-3 py-2 text-right">{fmt(r.gia_nhap)}</td>
                                            <td className="px-3 py-2 text-right text-green-700 font-semibold">{r.gia_goi_y ? fmt(r.gia_goi_y) + '/sp' : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {order.ghi_chu && <p className="text-sm text-slate-500 italic">Ghi chú: {order.ghi_chu}</p>}
                </div>
                <div className="flex gap-3 px-5 pb-5 pt-1">
                    {canEdit && (
                        <button onClick={() => { onClose(); onEdit(order) }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-medium">
                            <Pencil className="w-4 h-4" /> Chỉnh sửa
                        </button>
                    )}
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Đóng</button>
                </div>
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DonNhapHangPage() {
    const { role } = useAuth()
    const canEdit = ['admin', 'manager', 'quan_ly_kho'].includes(role) || !role

    const [data, setData] = useState([])
    const [chiTietMap, setChiTietMap] = useState({})
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [sortField, setSortField] = useState('created_at')
    const [sortDir, setSortDir] = useState('desc')

    const [modalOpen, setModalOpen] = useState(false)
    const [editData, setEditData] = useState(null)
    const [editRows, setEditRows] = useState([])
    const [viewOrder, setViewOrder] = useState(null)
    const [nhapKhoOrder, setNhapKhoOrder] = useState(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        const [{ data: orders }, { data: prods }, { data: allChiTiet }] = await Promise.all([
            supabase.from('don_nhap_hang').select('*').order(sortField, { ascending: sortDir === 'asc' }),
            supabase.from('san_pham').select('id,ten_san_pham,gia_ban').order('ten_san_pham'),
            supabase.from('don_nhap_hang_chi_tiet').select('*').order('created_at'),
        ])
        setData(orders || [])
        setProducts(prods || [])
        const map = {}
        for (const c of (allChiTiet || [])) {
            if (!map[c.don_nhap_hang_id]) map[c.don_nhap_hang_id] = []
            map[c.don_nhap_hang_id].push(c)
        }
        setChiTietMap(map)
        setLoading(false)
    }, [sortField, sortDir])

    useEffect(() => { fetchData() }, [fetchData])

    const handleOpenEdit = (order) => {
        setEditData(order)
        setEditRows(chiTietMap[order.id] || [EMPTY_ROW()])
        setModalOpen(true)
    }

    const handleStatusChange = (order, newStatus) => {
        if (newStatus === 'da_nhap_kho' && order.trang_thai !== 'da_nhap_kho') {
            // Show confirmation modal
            setNhapKhoOrder(order)
        } else {
            supabase.from('don_nhap_hang').update({ trang_thai: newStatus }).eq('id', order.id).then(() => {
                setData(prev => prev.map(d => d.id === order.id ? { ...d, trang_thai: newStatus } : d))
                if (viewOrder?.id === order.id) setViewOrder(prev => ({ ...prev, trang_thai: newStatus }))
            })
        }
    }

    const filtered = data.filter(d => {
        const q = search.toLowerCase()
        const matchSearch = !q
            || d.ma_nhap_hang?.toLowerCase().includes(q)
            || d.ten_nha_cung_cap?.toLowerCase().includes(q)
            || (chiTietMap[d.id] || []).some(r => r.ten_san_pham?.toLowerCase().includes(q))
        return matchSearch && (filterStatus === 'all' || d.trang_thai === filterStatus)
    })

    const SortBtn = ({ field, label }) => (
        <button onClick={() => { sortField === field ? setSortDir(d => d === 'asc' ? 'desc' : 'asc') : (setSortField(field), setSortDir('asc')) }}
            className="flex items-center gap-1 hover:text-slate-800 transition-colors select-none">
            {label}
            {sortField === field
                ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-orange-500" /> : <ChevronDown className="w-3 h-3 text-orange-500" />)
                : <ChevronUp className="w-3 h-3 text-slate-300" />}
        </button>
    )

    const stats = {
        total: data.length,
        nhapKho: data.filter(d => d.trang_thai === 'da_nhap_kho').length,
        dangVC: data.filter(d => d.trang_thai === 'dang_van_chuyen').length,
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Quản lý Nhập hàng</h2>
                <p className="text-slate-500 text-sm mt-1">Theo dõi đơn nhập hàng nhiều sản phẩm và đồng bộ kho</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Tổng đơn nhập', value: stats.total, icon: Warehouse, color: 'bg-orange-100 text-orange-600' },
                    { label: 'Đã nhập kho', value: stats.nhapKho, icon: Package, color: 'bg-green-100 text-green-600' },
                    { label: 'Đang vận chuyển', value: stats.dangVC, icon: Truck, color: 'bg-blue-100 text-blue-600' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`${color} rounded-xl p-2.5`}><Icon className="w-5 h-5" /></div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{value}</p>
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
                            placeholder="Tìm mã nhập, NCC, sản phẩm..."
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                        <option value="all">Tất cả trạng thái</option>
                        {Object.entries(TRANG_THAI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    {canEdit && (
                        <button onClick={() => { setEditData(null); setEditRows([]); setModalOpen(true) }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-medium transition-all">
                            <Plus className="w-4 h-4" /> Tạo đơn nhập
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <Warehouse className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Chưa có đơn nhập hàng nào</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600"><SortBtn field="ma_nhap_hang" label="Mã nhập" /></th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Nhà cung cấp</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Sản phẩm</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600"><SortBtn field="ngay_tao" label="Ngày tạo" /></th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Tổng SL</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Trạng thái</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(order => {
                                    const ct = chiTietMap[order.id] || []
                                    const totalQty = ct.reduce((s, r) => s + (r.so_luong || 0), 0)
                                    const tt = TRANG_THAI[order.trang_thai] || {}
                                    return (
                                        <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-lg font-medium">{order.ma_nhap_hang}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">{order.ten_nha_cung_cap || '—'}</td>
                                            <td className="px-4 py-3">
                                                {ct.length === 0 ? <span className="text-slate-400 text-xs">—</span> : (
                                                    <div className="space-y-0.5">
                                                        {ct.slice(0, 2).map(r => (
                                                            <p key={r.id} className="text-xs text-slate-700 font-medium leading-tight">{r.ten_san_pham} <span className="text-slate-400">×{r.so_luong}</span></p>
                                                        ))}
                                                        {ct.length > 2 && <p className="text-xs text-slate-400">+{ct.length - 2} sản phẩm khác</p>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{order.ngay_tao}</td>
                                            <td className="px-4 py-3 text-center font-semibold text-slate-800">{totalQty}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {canEdit ? (
                                                    <select value={order.trang_thai} onChange={e => handleStatusChange(order, e.target.value)}
                                                        className={`text-xs font-medium px-2.5 py-1 rounded-lg border-0 cursor-pointer outline-none ${tt.color}`}>
                                                        {Object.entries(TRANG_THAI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                                    </select>
                                                ) : (
                                                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${tt.color}`}>{tt.label}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => setViewOrder(order)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Xem chi tiết">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {canEdit && (
                                                        <button onClick={() => handleOpenEdit(order)} className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all" title="Chỉnh sửa">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                            <span>Hiển thị {filtered.length} / {data.length} đơn nhập</span>
                            <span>Cập nhật: {new Date().toLocaleTimeString('vi-VN')}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <DonNhapModal open={modalOpen} onClose={() => setModalOpen(false)}
                editData={editData} editRows={editRows}
                products={products} onSaved={fetchData}
                isLocked={editData?.trang_thai === 'da_nhap_kho'} />

            <DetailModal open={!!viewOrder} order={viewOrder}
                chiTiet={viewOrder ? chiTietMap[viewOrder.id] : []}
                onClose={() => setViewOrder(null)}
                onEdit={handleOpenEdit} canEdit={canEdit} />

            <NhapKhoModal open={!!nhapKhoOrder} order={nhapKhoOrder}
                chiTiet={nhapKhoOrder ? chiTietMap[nhapKhoOrder.id] : []}
                onClose={() => setNhapKhoOrder(null)}
                onConfirmed={() => { setNhapKhoOrder(null); fetchData() }} />
        </div>
    )
}
