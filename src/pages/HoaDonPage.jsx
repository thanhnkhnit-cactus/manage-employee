import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    Plus, Search, Pencil, Ban, X, Check, Lock, Eye,
    ChevronUp, ChevronDown, FileText, AlertCircle, Loader2,
    TrendingUp, CheckCircle2, XCircle
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatVND = (v) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v ?? 0)

const genMaHoaDon = () => `HD${Date.now()}`

const TRANG_THAI = {
    khoi_tao: { label: 'Khởi tạo', color: 'bg-blue-100 text-blue-700' },
    da_xuat_hang: { label: 'Đã xuất hàng', color: 'bg-indigo-100 text-indigo-700' },
    dang_giao_hang: { label: 'Đang giao hàng', color: 'bg-amber-100 text-amber-700' },
    giao_thanh_cong: { label: 'Giao hàng thành công', color: 'bg-emerald-100 text-emerald-700' },
    huy_don_hang: { label: 'Hủy đơn hàng', color: 'bg-red-100 text-red-700' },
    cho_hang_ve_kho: { label: 'Chờ hàng về kho', color: 'bg-orange-100 text-orange-700' },
    hoan_hang: { label: 'Hoàn hàng', color: 'bg-slate-100 text-slate-600' },
}
const CANCEL_STATUSES = ['huy_don_hang', 'hoan_hang', 'cho_hang_ve_kho']
const ACTIVE_STATUSES = ['khoi_tao', 'da_xuat_hang', 'dang_giao_hang']
const SHIPPED_STATUSES = ['da_xuat_hang', 'dang_giao_hang']

// ─── Password Modal ───────────────────────────────────────────────────────────
function PasswordModal({ open, onClose, onSuccess }) {
    const [pwd, setPwd] = useState('')
    const [error, setError] = useState('')

    useEffect(() => { if (open) { setPwd(''); setError('') } }, [open])

    if (!open) return null

    const handleCheck = () => {
        if (pwd === (import.meta.env.VITE_PROFIT_PASSWORD || '123456')) {
            onSuccess()
            onClose()
        } else {
            setError('Mật khẩu không đúng. Vui lòng thử lại.')
            setPwd('')
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="text-center mb-5">
                    <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Lock className="w-7 h-7 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Nhập mật khẩu</h3>
                    <p className="text-slate-500 text-sm mt-1">Để xem cột Lợi nhuận</p>
                </div>
                {error && (
                    <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-2.5 text-sm mb-4">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}
                <input
                    type="password"
                    value={pwd}
                    onChange={e => { setPwd(e.target.value); setError('') }}
                    onKeyDown={e => e.key === 'Enter' && handleCheck()}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm mb-4"
                    placeholder="••••••••"
                    autoFocus
                />
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                    <button onClick={handleCheck} className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                        <Unlock className="w-4 h-4" /> Xác nhận
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Modal Thêm / Sửa ────────────────────────────────────────────────────────
function HoaDonModal({ open, onClose, editData, products, employees = [], onSaved }) {
    const emptyForm = {
        ma_hoa_don: '', ma_van_don: '', ten_khach_hang: '', so_dien_thoai: '',
        san_pham_id: '', so_luong: '', phi_ship: '', phi_quang_cao: '',
        trang_thai: 'khoi_tao', ly_do_huy: '', chi_phi_hoan: '',
        nhan_vien_id: '', phi_hoa_hong: '',
    }
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [oldStatus, setOldStatus] = useState('khoi_tao')

    useEffect(() => {
        if (!open) return
        if (editData) {
            setForm({
                ma_hoa_don: editData.ma_hoa_don || '',
                ma_van_don: editData.ma_van_don || '',
                ten_khach_hang: editData.ten_khach_hang || '',
                so_dien_thoai: editData.so_dien_thoai || '',
                san_pham_id: editData.san_pham_id || '',
                so_luong: editData.so_luong ?? '',
                phi_ship: editData.phi_ship ?? '',
                phi_quang_cao: editData.phi_quang_cao ?? '',
                trang_thai: editData.trang_thai || 'khoi_tao',
                ly_do_huy: editData.ly_do_huy || '',
                chi_phi_hoan: editData.chi_phi_hoan ?? '',
                nhan_vien_id: editData.nhan_vien_id || '',
                phi_hoa_hong: editData.phi_hoa_hong ?? '',
            })
            setOldStatus(editData.trang_thai)
            const sp = products.find(p => p.id === editData.san_pham_id)
            setSelectedProduct(sp || null)
        } else {
            setForm({ ...emptyForm, ma_hoa_don: genMaHoaDon() })
            setSelectedProduct(null)
            setOldStatus('khoi_tao')
        }
        setError('')
    }, [editData, open, products])

    if (!open) return null

    const handleProductChange = (id) => {
        const sp = products.find(p => p.id === id)
        setSelectedProduct(sp || null)
        setForm(f => ({ ...f, san_pham_id: id }))
    }

    const soLuong = Number(form.so_luong) || 0
    const donGia = selectedProduct?.gia_ban ?? (editData?.don_gia ?? 0)
    const tongTien = soLuong * Number(donGia)
    const phiShip = Number(form.phi_ship) || 0
    const phiQC = Number(form.phi_quang_cao) || 0
    const chiPhiHoan = Number(form.chi_phi_hoan) || 0
    const gn = Number(selectedProduct?.gia_nhap ?? editData?.gia_nhap_snapshot ?? 0)
    const vc = Number(selectedProduct?.chi_phi_van_chuyen ?? editData?.chi_phi_vc_snapshot ?? 0)
    const phiHoaHong = Number(form.phi_hoa_hong) || 0
    const loiNhuan = tongTien - gn * soLuong - vc * soLuong - phiShip - phiQC - chiPhiHoan - phiHoaHong

    const showCancelFields = CANCEL_STATUSES.includes(form.trang_thai)
    const isLocked = editData?.trang_thai === 'giao_thanh_cong'

    const handleSave = async () => {
        if (!form.ma_hoa_don.trim()) return setError('Vui lòng nhập mã hóa đơn.')
        if (!form.ten_khach_hang.trim()) return setError('Vui lòng nhập tên khách hàng.')
        if (!form.san_pham_id) return setError('Vui lòng chọn sản phẩm.')
        if (soLuong <= 0) return setError('Số lượng phải lớn hơn 0.')
        if (phiShip < 0 || phiQC < 0) return setError('Phí không được âm.')

        // Kiểm tra tồn kho_hang khi tạo mới
        if (!editData && selectedProduct) {
            if (selectedProduct.so_luong < soLuong) {
                return setError(`Kho chỉ còn ${selectedProduct.so_luong} sản phẩm, không đủ số lượng yêu cầu.`)
            }
        }

        setSaving(true)
        setError('')

        try {
            if (editData?.id) {
                // ─ Cập nhật đơn hàng ─────────────────────────────────────
                const payload = {
                    ma_van_don: form.ma_van_don.trim(),
                    ten_khach_hang: form.ten_khach_hang.trim(),
                    so_dien_thoai: form.so_dien_thoai.trim(),
                    phi_ship: phiShip,
                    phi_quang_cao: phiQC,
                    trang_thai: form.trang_thai,
                    ly_do_huy: showCancelFields ? form.ly_do_huy.trim() : null,
                    chi_phi_hoan: showCancelFields ? chiPhiHoan : 0,
                    nhan_vien_id: form.nhan_vien_id || null,
                    ten_nhan_vien: form.nhan_vien_id ? (employees.find(e => e.id === form.nhan_vien_id)?.ho_ten || null) : null,
                    ma_nhan_vien: form.nhan_vien_id ? (employees.find(e => e.id === form.nhan_vien_id)?.ma_nhan_vien || null) : null,
                    phi_hoa_hong: phiHoaHong,
                }
                const { error: updErr } = await supabase.from('hoa_don').update(payload).eq('id', editData.id)
                if (updErr) throw updErr

                // Hoàn kho: nếu status chuyển sang hủy/hoàn từ trạng thái active
                const wasActive = ACTIVE_STATUSES.includes(oldStatus)
                const nowCancelled = ['huy_don_hang', 'hoan_hang'].includes(form.trang_thai)
                if (wasActive && nowCancelled && editData.san_pham_id) {
                    const { data: sp } = await supabase.from('san_pham').select('so_luong').eq('id', editData.san_pham_id).single()
                    if (sp) await supabase.from('san_pham').update({ so_luong: sp.so_luong + editData.so_luong }).eq('id', editData.san_pham_id)
                }
            } else {
                // ─ Tạo đơn hàng mới ──────────────────────────────────────
                const payload = {
                    ma_hoa_don: form.ma_hoa_don.trim(),
                    ma_van_don: form.ma_van_don.trim(),
                    ten_khach_hang: form.ten_khach_hang.trim(),
                    so_dien_thoai: form.so_dien_thoai.trim(),
                    san_pham_id: form.san_pham_id,
                    ten_san_pham: selectedProduct.ten_san_pham,
                    so_luong: soLuong,
                    don_gia: Number(selectedProduct.gia_ban),
                    phi_ship: phiShip,
                    phi_quang_cao: phiQC,
                    trang_thai: 'khoi_tao',
                    chi_phi_hoan: 0,
                    gia_nhap_snapshot: Number(selectedProduct.gia_nhap),
                    chi_phi_vc_snapshot: Number(selectedProduct.chi_phi_van_chuyen),
                    nhan_vien_id: form.nhan_vien_id || null,
                    ten_nhan_vien: form.nhan_vien_id ? (employees.find(e => e.id === form.nhan_vien_id)?.ho_ten || null) : null,
                    ma_nhan_vien: form.nhan_vien_id ? (employees.find(e => e.id === form.nhan_vien_id)?.ma_nhan_vien || null) : null,
                    phi_hoa_hong: phiHoaHong,
                }
                const { error: insErr } = await supabase.from('hoa_don').insert([payload])
                if (insErr) throw insErr
                // Tự động trừ tồn kho_hang khi tạo đơn
                const { data: kh } = await supabase.from('kho_hang').select('id, so_luong').eq('san_pham_id', form.san_pham_id).single()
                if (kh) await supabase.from('kho_hang').update({ so_luong: Math.max(0, kh.so_luong - soLuong), updated_at: new Date().toISOString() }).eq('id', kh.id)
            }

            onSaved()
            onClose()
        } catch (e) {
            setError('Có lỗi xảy ra: ' + (e?.message || e))
        }
        setSaving(false)
    }

    const isEdit = !!editData

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 rounded-xl p-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {isEdit ? 'Chỉnh sửa hóa đơn' : 'Tạo hóa đơn mới'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Khóa khi giao thành công */}
                    {isLocked && (
                        <div className="mx-6 mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">
                            <Check className="w-4 h-4 shrink-0" />
                            Đơn hàng đã giao thành công — không thể chỉnh sửa.
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Mã hóa đơn + Mã vận đơn */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã hóa đơn <span className="text-red-500">*</span></label>
                            <input value={form.ma_hoa_don} readOnly={isEdit || isLocked}
                                onChange={e => setForm(f => ({ ...f, ma_hoa_don: e.target.value }))}
                                className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isEdit || isLocked ? 'bg-slate-50 text-slate-500' : ''}`}
                                placeholder="HD..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã vận đơn</label>
                            <input value={form.ma_van_don} readOnly={isLocked}
                                onChange={e => setForm(f => ({ ...f, ma_van_don: e.target.value }))}
                                className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isLocked ? 'bg-slate-50 text-slate-500' : ''}`}
                                placeholder="VD: VD123456789" />
                        </div>
                    </div>

                    {/* Thông tin khách hàng */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên khách hàng <span className="text-red-500">*</span></label>
                            <input value={form.ten_khach_hang} readOnly={isLocked}
                                onChange={e => setForm(f => ({ ...f, ten_khach_hang: e.target.value }))}
                                className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isLocked ? 'bg-slate-50 text-slate-500' : ''}`}
                                placeholder="Nguyễn Văn A" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Số điện thoại</label>
                            <input value={form.so_dien_thoai} readOnly={isLocked}
                                onChange={e => setForm(f => ({ ...f, so_dien_thoai: e.target.value }))}
                                className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isLocked ? 'bg-slate-50 text-slate-500' : ''}`}
                                placeholder="0901234567" />
                        </div>
                    </div>

                    {/* Sản phẩm */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Thông tin sản phẩm</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Chọn sản phẩm <span className="text-red-500">*</span></label>
                                {isEdit ? (
                                    <input value={editData?.ten_san_pham} readOnly
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-500" />
                                ) : (
                                    <select value={form.san_pham_id} onChange={e => handleProductChange(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all">
                                        <option value="">-- Chọn sản phẩm --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id} disabled={p.so_luong === 0}>
                                                {p.ten_san_pham} (còn {p.so_luong})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Số lượng <span className="text-red-500">*</span></label>
                                <input type="number" min={1} value={form.so_luong}
                                    readOnly={isEdit}
                                    onChange={e => setForm(f => ({ ...f, so_luong: e.target.value }))}
                                    className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isEdit ? 'bg-slate-100 text-slate-500' : ''}`}
                                    placeholder="1" />
                            </div>
                        </div>

                        {/* Preview đơn giá & tổng tiền */}
                        {(selectedProduct || isEdit) && soLuong > 0 && (
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="bg-white rounded-lg p-3 border border-slate-200">
                                    <p className="text-xs text-slate-500 mb-1">Đơn giá (giá bán)</p>
                                    <p className="text-sm font-semibold text-slate-800">{formatVND(donGia)}</p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                    <p className="text-xs text-blue-600 mb-1">Tổng tiền</p>
                                    <p className="text-sm font-bold text-blue-700">{formatVND(tongTien)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Phí ship + Phí QC */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phí ship (VNĐ)</label>
                            <input type="number" min={0} value={form.phi_ship} readOnly={isLocked}
                                onChange={e => setForm(f => ({ ...f, phi_ship: e.target.value }))}
                                className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isLocked ? 'bg-slate-50 text-slate-500' : ''}`}
                                placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phí quảng cáo (VNĐ)</label>
                            <input type="number" min={0} value={form.phi_quang_cao} readOnly={isLocked}
                                onChange={e => setForm(f => ({ ...f, phi_quang_cao: e.target.value }))}
                                className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isLocked ? 'bg-slate-50 text-slate-500' : ''}`}
                                placeholder="0" />
                        </div>
                    </div>

                    {/* Nhân viên + Phí hoa hồng */}
                    {!isLocked && (
                        <div className="bg-indigo-50 rounded-xl p-4 space-y-3 border border-indigo-100">
                            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Nhân viên phụ trách</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã nhân viên</label>
                                    <select value={form.nhan_vien_id}
                                        onChange={e => setForm(f => ({ ...f, nhan_vien_id: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all">
                                        <option value="">-- Không có --</option>
                                        {employees.filter(nv => !nv.da_nghi_viec).map(nv => (
                                            <option key={nv.id} value={nv.id}>
                                                {nv.ma_nhan_vien} — {nv.ho_ten}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phí hoa hồng (VNĐ)</label>
                                    <input type="number" min={0} value={form.phi_hoa_hong}
                                        onChange={e => setForm(f => ({ ...f, phi_hoa_hong: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        placeholder="0" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Trạng thái (chỉ hiện khi sửa) */}
                    {isEdit && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Trạng thái đơn hàng</label>
                            <select value={form.trang_thai} onChange={e => setForm(f => ({ ...f, trang_thai: e.target.value }))}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all">
                                {Object.entries(TRANG_THAI).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Lý do hủy / Chi phí hoàn */}
                    {showCancelFields && (
                        <div className="bg-red-50 rounded-xl p-4 space-y-3 border border-red-200">
                            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Thông tin hủy / hoàn</p>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Lý do hủy</label>
                                <textarea value={form.ly_do_huy}
                                    onChange={e => setForm(f => ({ ...f, ly_do_huy: e.target.value }))}
                                    rows={2}
                                    className="w-full px-3 py-2.5 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none transition-all"
                                    placeholder="Nhập lý do..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Chi phí hoàn (VNĐ)</label>
                                <input type="number" min={0} value={form.chi_phi_hoan}
                                    onChange={e => setForm(f => ({ ...f, chi_phi_hoan: e.target.value }))}
                                    className="w-full px-3 py-2.5 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 transition-all"
                                    placeholder="0" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Đóng</button>
                    {!isLocked && (
                        <button onClick={handleSave} disabled={saving}
                            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {saving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ open, onClose, hoaDon, onDeleted }) {
    const [deleting, setDeleting] = useState(false)

    if (!open || !hoaDon) return null

    const willRestoreStock = ACTIVE_STATUSES.includes(hoaDon.trang_thai)

    const handleDelete = async () => {
        setDeleting(true)
        try {
            // Hoàn kho nếu đơn vẫn đang active
            if (willRestoreStock && hoaDon.san_pham_id) {
                const { data: sp } = await supabase.from('san_pham').select('so_luong').eq('id', hoaDon.san_pham_id).single()
                if (sp) {
                    await supabase.from('san_pham').update({ so_luong: sp.so_luong + hoaDon.so_luong }).eq('id', hoaDon.san_pham_id)
                }
            }
            const { error } = await supabase.from('hoa_don').delete().eq('id', hoaDon.id)
            if (!error) onDeleted()
        } catch (e) { console.error(e) }
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
                    <p className="text-slate-500 text-sm mb-2">
                        Xóa hóa đơn <strong className="text-slate-700">{hoaDon.ma_hoa_don}</strong>?
                    </p>
                    {willRestoreStock && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 mb-4 text-left">
                            ⚠ Đơn hàng đang ở trạng thái active — hệ thống sẽ tự động hoàn lại <strong>{hoaDon.so_luong}</strong> sản phẩm vào kho.
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                        <button onClick={handleDelete} disabled={deleting}
                            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
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
export default function HoaDonPage() {
    const { canSeeProfit, role } = useAuth()
    const canEdit = role !== 'nhan_vien'
    const [data, setData] = useState([])
    const [products, setProducts] = useState([])
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [sortField, setSortField] = useState('created_at')
    const [sortDir, setSortDir] = useState('desc')
    const [modalOpen, setModalOpen] = useState(false)
    const [editData, setEditData] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [viewDetail, setViewDetail] = useState(null)   // for detail modal
    const [profitUnlocked, setProfitUnlocked] = useState(false)
    const [pwdModalOpen, setPwdModalOpen] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        const [{ data: orders }, { data: prods }, { data: nvs }] = await Promise.all([
            supabase.from('hoa_don').select('*').order(sortField, { ascending: sortDir === 'asc' }),
            // Lấy sản phẩm cùng số lượng tồn kho từ kho_hang
            supabase.from('kho_hang')
                .select('id, so_luong, gia_ban, san_pham:san_pham_id(id, ten_san_pham, gia_nhap, chi_phi_van_chuyen, trang_thai)')
                .eq('trang_thai', 'A')
                .gt('so_luong', 0)
                .order('created_at', { ascending: true }),
            supabase.from('nhan_vien').select('id,ma_nhan_vien,ho_ten,da_nghi_viec').order('ma_nhan_vien', { ascending: true }),
        ])
        setData(orders || [])
        // map kho_hang + san_pham info into a flat product list
        setProducts((prods || []).map(kh => ({
            id: kh.san_pham?.id,
            kho_hang_id: kh.id,
            ten_san_pham: kh.san_pham?.ten_san_pham || '',
            gia_ban: kh.gia_ban,
            gia_nhap: kh.san_pham?.gia_nhap || 0,
            chi_phi_van_chuyen: kh.san_pham?.chi_phi_van_chuyen || 0,
            so_luong: kh.so_luong,
        })))
        setEmployees(nvs || [])
        setLoading(false)
    }

    const handleQuickStatus = async (hd, newStatus) => {
        // Khi xác nhận hoàn hàng (từ chờ hàng về kho) → cộng lại số lượng vào kho_hang
        const restoringStatuses = ['hoan_hang']
        const wasWaiting = hd.trang_thai === 'cho_hang_ve_kho'
        if (wasWaiting && restoringStatuses.includes(newStatus) && hd.san_pham_id) {
            const { data: kh } = await supabase.from('kho_hang').select('id, so_luong').eq('san_pham_id', hd.san_pham_id).single()
            if (kh) await supabase.from('kho_hang').update({ so_luong: kh.so_luong + hd.so_luong, updated_at: new Date().toISOString() }).eq('id', kh.id)
        }
        const { error } = await supabase.from('hoa_don').update({ trang_thai: newStatus }).eq('id', hd.id)
        if (!error) {
            setData(prev => prev.map(d => d.id === hd.id ? { ...d, trang_thai: newStatus } : d))
            if (viewDetail?.id === hd.id) setViewDetail(prev => ({ ...prev, trang_thai: newStatus }))
        }
    }

    // Hủy đơn hàng: nếu chưa xuất → cộng kho_hang + hủy; nếu đã xuất → chờ hàng về kho
    const handleCancel = async (hd) => {
        const isShipped = SHIPPED_STATUSES.includes(hd.trang_thai)
        if (isShipped) {
            const { error } = await supabase.from('hoa_don').update({ trang_thai: 'cho_hang_ve_kho' }).eq('id', hd.id)
            if (!error) setData(prev => prev.map(d => d.id === hd.id ? { ...d, trang_thai: 'cho_hang_ve_kho' } : d))
        } else {
            const { error } = await supabase.from('hoa_don').update({ trang_thai: 'huy_don_hang' }).eq('id', hd.id)
            if (!error) {
                setData(prev => prev.map(d => d.id === hd.id ? { ...d, trang_thai: 'huy_don_hang' } : d))
                if (hd.san_pham_id) {
                    const { data: kh } = await supabase.from('kho_hang').select('id, so_luong').eq('san_pham_id', hd.san_pham_id).single()
                    if (kh) await supabase.from('kho_hang').update({ so_luong: kh.so_luong + hd.so_luong, updated_at: new Date().toISOString() }).eq('id', kh.id)
                }
            }
        }
    }

    useEffect(() => { fetchData() }, [sortField, sortDir])

    const filtered = data.filter(hd => {
        const q = search.toLowerCase()
        const matchQ = !q || hd.ma_hoa_don?.toLowerCase().includes(q) ||
            hd.ten_khach_hang?.toLowerCase().includes(q) ||
            hd.ma_van_don?.toLowerCase().includes(q) ||
            hd.ten_san_pham?.toLowerCase().includes(q)
        const matchStatus = filterStatus === 'all' || hd.trang_thai === filterStatus
        return matchQ && matchStatus
    })

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDir('asc') }
    }
    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ChevronUp className="w-3 h-3 text-slate-300" />
        return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
    }

    const calcProfit = (hd) => Number(hd.tong_tien)
        - Number(hd.gia_nhap_snapshot) * Number(hd.so_luong)
        - Number(hd.chi_phi_vc_snapshot) * Number(hd.so_luong)
        - Number(hd.phi_ship) - Number(hd.phi_quang_cao) - Number(hd.chi_phi_hoan)
        - Number(hd.phi_hoa_hong)

    const stats = {
        total: data.length,
        thanh_cong: data.filter(d => d.trang_thai === 'giao_thanh_cong').length,
        huy_hoan: data.filter(d => CANCEL_STATUSES.includes(d.trang_thai)).length,
        doanh_thu: data.filter(d => d.trang_thai === 'giao_thanh_cong').reduce((s, d) => s + Number(d.tong_tien), 0),
    }

    const cols = [
        { label: 'Mã HĐ', field: 'ma_hoa_don' },
        { label: 'Mã vận đơn', field: 'ma_van_don' },
        { label: 'Khách hàng', field: 'ten_khach_hang' },
        { label: 'Sản phẩm', field: 'ten_san_pham' },
        { label: 'SL', field: 'so_luong' },
        { label: 'Tổng tiền', field: 'tong_tien' },
        { label: 'Phí ship', field: 'phi_ship' },
        { label: 'Phí QC', field: 'phi_quang_cao' },
        { label: 'Trạng thái', field: 'trang_thai' },
        { label: 'Lý do hủy', field: null },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Quản lý Hóa đơn</h2>
                <p className="text-slate-500 text-sm mt-1">Quản lý đơn hàng và theo dõi trạng thái giao hàng</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { icon: FileText, color: 'blue', label: 'Tổng đơn', value: stats.total },
                    { icon: CheckCircle2, color: 'emerald', label: 'Giao thành công', value: stats.thanh_cong },
                    { icon: XCircle, color: 'red', label: 'Hủy / Hoàn', value: stats.huy_hoan },
                    { icon: TrendingUp, color: 'violet', label: 'Doanh thu', value: formatVND(stats.doanh_thu), small: true },
                ].map(({ icon: Icon, color, label, value, small }) => (
                    <div key={label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`bg-${color}-100 rounded-xl p-2.5`}>
                                <Icon className={`w-5 h-5 text-${color}-600`} />
                            </div>
                            <div>
                                <p className={`font-bold text-slate-800 leading-tight ${small ? 'text-base' : 'text-2xl'}`}>{value}</p>
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
                            placeholder="Tìm theo mã HĐ, khách hàng, sản phẩm..."
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="all">Tất cả trạng thái</option>
                        {Object.entries(TRANG_THAI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    {/* Nút lợi nhuận - chỉ hiện với roles có quyền */}
                    {canSeeProfit && (
                        <button
                            onClick={() => profitUnlocked ? setProfitUnlocked(false) : setPwdModalOpen(true)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${profitUnlocked ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            title={profitUnlocked ? 'Ẩn lợi nhuận' : 'Xem lợi nhuận'}
                        >
                            {profitUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            <span className="hidden sm:inline">Lợi nhuận</span>
                        </button>
                    )}
                    <button onClick={() => { setEditData(null); setModalOpen(true) }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all">
                        <Plus className="w-4 h-4" /> <span>Tạo đơn</span>
                    </button>
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
                        <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Không có hóa đơn nào</p>
                        <p className="text-slate-400 text-sm mt-1">Nhấn "Tạo đơn" để bắt đầu</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {cols.map(col => (
                                        <th key={col.label}
                                            onClick={() => col.field && handleSort(col.field)}
                                            className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 select-none whitespace-nowrap ${col.field ? 'cursor-pointer hover:text-slate-800' : ''}`}>
                                            <div className="flex items-center gap-1">
                                                {col.label}
                                                {col.field && <SortIcon field={col.field} />}
                                            </div>
                                        </th>
                                    ))}
                                    {/* Cột lợi nhuận - chỉ admin/manager/kế toán */}
                                    {canSeeProfit && (
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                {profitUnlocked ? <Unlock className="w-3 h-3 text-amber-500" /> : <Lock className="w-3 h-3 text-slate-400" />}
                                                Lợi nhuận
                                            </div>
                                        </th>
                                    )}
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(hd => {
                                    const tt = TRANG_THAI[hd.trang_thai] || { label: hd.trang_thai, color: 'bg-slate-100 text-slate-600' }
                                    const profit = calcProfit(hd)
                                    return (
                                        <tr key={hd.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">{hd.ma_hoa_don}</span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 font-mono text-xs whitespace-nowrap">{hd.ma_van_don || '—'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <p className="font-medium text-slate-800">{hd.ten_khach_hang}</p>
                                                {hd.so_dien_thoai && <p className="text-xs text-slate-500">{hd.so_dien_thoai}</p>}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{hd.ten_san_pham}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <span className="text-slate-800 font-medium">{hd.so_luong}</span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-800">{formatVND(hd.tong_tien)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatVND(hd.phi_ship)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatVND(hd.phi_quang_cao)}</td>
                                            {/* Trạng thái — dropdown đổi inline */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {canEdit ? (
                                                    <select
                                                        value={hd.trang_thai}
                                                        onChange={e => handleQuickStatus(hd, e.target.value)}
                                                        className={`text-xs font-medium px-2.5 py-1 rounded-lg border-0 cursor-pointer outline-none ${tt.color}`}
                                                    >
                                                        {Object.entries(TRANG_THAI).map(([k, v]) => (
                                                            <option key={k} value={k}>{v.label}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${tt.color}`}>{tt.label}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 max-w-[160px]">
                                                <span className="text-xs line-clamp-1">{hd.ly_do_huy || '—'}</span>
                                            </td>
                                            {/* Lợi nhuận */}
                                            {canSeeProfit && (
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {profitUnlocked ? (
                                                        <span className={`text-sm font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {formatVND(profit)}
                                                        </span>
                                                    ) : (
                                                        <button onClick={() => setPwdModalOpen(true)}
                                                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600 transition-colors">
                                                            <Lock className="w-3.5 h-3.5" /> ••••••
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Xem chi tiết - tất cả role đều xem được */}
                                                    <button onClick={() => setViewDetail(hd)}
                                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Xem chi tiết">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {/* Chỉ cho sửa & hủy khi đơn chưa giao x"ng & chưa bị hủy */}
                                                    {canEdit && hd.trang_thai !== 'giao_thanh_cong' && !CANCEL_STATUSES.includes(hd.trang_thai) && (
                                                        <button onClick={() => { setEditData(hd); setModalOpen(true) }}
                                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Chỉnh sửa">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canEdit && hd.trang_thai !== 'giao_thanh_cong' && !CANCEL_STATUSES.includes(hd.trang_thai) && (
                                                        <button onClick={() => handleCancel(hd)}
                                                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title={SHIPPED_STATUSES.includes(hd.trang_thai) ? 'Hủy (chờ hàng về)' : 'Hủy đơn'}>
                                                            <Ban className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading && filtered.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                        <span>Hiển thị {filtered.length} / {data.length} hóa đơn</span>
                        <span>Cập nhật lần cuối: {new Date().toLocaleTimeString('vi-VN')}</span>
                    </div>
                )}
            </div>

            {/* Modals */}
            <PasswordModal open={pwdModalOpen} onClose={() => setPwdModalOpen(false)} onSuccess={() => setProfitUnlocked(true)} />
            <HoaDonModal open={modalOpen} onClose={() => setModalOpen(false)} editData={editData} products={products} employees={employees} onSaved={fetchData} />
            <DeleteModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} hoaDon={deleteTarget} onDeleted={fetchData} />
            {/* Detail Modal */}
            {viewDetail && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Chi tiết hóa đơn</h2>
                                <span className="font-mono text-sm text-blue-600">{viewDetail.ma_hoa_don}</span>
                            </div>
                            <button onClick={() => setViewDetail(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Status + change */}
                            <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                                <span className="text-sm font-medium text-slate-600">Trạng thái</span>
                                {canEdit ? (
                                    <select
                                        value={viewDetail.trang_thai}
                                        onChange={e => handleQuickStatus(viewDetail, e.target.value)}
                                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border-0 cursor-pointer outline-none ring-1 ring-slate-200 ${TRANG_THAI[viewDetail.trang_thai]?.color}`}
                                    >
                                        {Object.entries(TRANG_THAI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select>
                                ) : (
                                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${TRANG_THAI[viewDetail.trang_thai]?.color}`}>
                                        {TRANG_THAI[viewDetail.trang_thai]?.label}
                                    </span>
                                )}
                            </div>
                            {/* Grid info */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Mã vận đơn', value: viewDetail.ma_van_don },
                                    { label: 'Khách hàng', value: viewDetail.ten_khach_hang },
                                    { label: 'Số điện thoại', value: viewDetail.so_dien_thoai },
                                    { label: 'Sản phẩm', value: viewDetail.ten_san_pham },
                                    { label: 'Số lượng', value: viewDetail.so_luong },
                                    { label: 'Giá bán/sp', value: formatVND(viewDetail.don_gia) },
                                    { label: 'Tổng tiền', value: formatVND(viewDetail.tong_tien), highlight: true },
                                    { label: 'Phí ship', value: formatVND(viewDetail.phi_ship) },
                                    { label: 'Phí quảng cáo', value: formatVND(viewDetail.phi_quang_cao) },
                                    { label: 'Nhân viên', value: viewDetail.ma_nhan_vien ? `${viewDetail.ma_nhan_vien} — ${viewDetail.ten_nhan_vien}` : '—' },
                                    { label: 'Hoa hồng', value: formatVND(viewDetail.phi_hoa_hong) },
                                    ...(viewDetail.ly_do_huy ? [{ label: 'Lý do hủy', value: viewDetail.ly_do_huy }] : []),
                                    ...(viewDetail.chi_phi_hoan ? [{ label: 'Chi phí hoàn', value: formatVND(viewDetail.chi_phi_hoan) }] : []),
                                    ...(canSeeProfit && profitUnlocked ? [{ label: 'Lợi nhuận', value: formatVND(calcProfit(viewDetail)), highlight: true }] : []),
                                ].map(({ label, value, highlight }) => (
                                    <div key={label} className="bg-slate-50 rounded-xl px-4 py-3">
                                        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                                        <p className={`text-sm font-semibold ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>{value ?? '—'}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 text-right">
                                Tạo lúc {new Date(viewDetail.created_at).toLocaleString('vi-VN')}
                            </p>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            {canEdit && (
                                <button onClick={() => { setEditData(viewDetail); setViewDetail(null); setModalOpen(true) }}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">
                                    <Pencil className="w-4 h-4" /> Chỉnh sửa
                                </button>
                            )}
                            <button onClick={() => setViewDetail(null)}
                                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
