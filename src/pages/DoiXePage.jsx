import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
    Truck, Plus, Search, Pencil, Trash2, X, Check, Loader2,
    AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
    Wrench, Fuel, FileText, BarChart2, Calendar, AlertTriangle,
    Clock, TrendingUp, DollarSign, Gauge
} from 'lucide-react'

// ─── Hằng số ──────────────────────────────────────────────────────────────────
const LOAI_XE = ['Xe con', '1T', '2.5T', '5T', '10T', 'Container 20"', 'Container 40"', 'Xe tải nhỏ', 'Khác']

const TINH_TRANG = {
    ranh: { label: 'Rảnh', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    dang_chay: { label: 'Đang chạy', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    bao_tri: { label: 'Bảo trì', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
}

const LOAI_BDANG = {
    bao_duong: { label: 'Bảo dưỡng định kỳ', icon: Wrench, color: 'text-blue-500 bg-blue-50' },
    thay_lot: { label: 'Thay lốp', icon: Truck, color: 'text-orange-500 bg-orange-50' },
    thay_nhot: { label: 'Thay nhớt', icon: Fuel, color: 'text-amber-500 bg-amber-50' },
    khac: { label: 'Khác', icon: FileText, color: 'text-slate-500 bg-slate-50' },
}

const LOAI_CHI_PHI = {
    nhien_lieu: { label: 'Nhiên liệu', color: 'bg-amber-100 text-amber-700' },
    sua_chua: { label: 'Sửa chữa', color: 'bg-red-100 text-red-700' },
    phi_cau_duong: { label: 'Phí cầu đường', color: 'bg-indigo-100 text-indigo-700' },
    bao_duong: { label: 'Bảo dưỡng', color: 'bg-blue-100 text-blue-700' },
    phat_nguoi: { label: 'Phạt nguội', color: 'bg-blue-100 text-blue-700' },
    dang_kiem: { label: 'Đăng kiểm', color: 'bg-blue-100 text-blue-700' },
    ben_bai: { label: 'Bến bãi', color: 'bg-blue-100 text-blue-700' },
    khac: { label: 'Khác', color: 'bg-slate-100 text-slate-600' },
}

const formatVND = (v) => v != null ? new Intl.NumberFormat('vi-VN').format(v) + ' ₫' : '—'
const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

// Kiểm tra còn bao nhiêu ngày đến hạn
const daysUntil = (dateStr) => {
    if (!dateStr) return null
    const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
    return diff
}

// ─── Badge tình trạng ─────────────────────────────────────────────────────────
function TinhTrangBadge({ value }) {
    const t = TINH_TRANG[value] || TINH_TRANG.ranh
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${t.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
            {t.label}
        </span>
    )
}

// ─── Badge hạn (cảnh báo / quá hạn) ─────────────────────────────────────────
function HanBadge({ label, dateStr }) {
    const days = daysUntil(dateStr)
    if (days === null) return <span className="text-slate-400 text-xs">—</span>
    const color = days < 0 ? 'text-red-600 bg-red-50 border-red-200'
        : days < 30 ? 'text-orange-600 bg-orange-50 border-orange-200'
            : 'text-slate-500 bg-slate-50 border-slate-200'
    const icon = days < 0 ? '🚨' : days < 30 ? '⚠️' : '✅'
    return (
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs border ${color}`}>
            {icon} {label}: {formatDate(dateStr)}
            {days < 30 && <span className="font-semibold">({days < 0 ? `Quá ${-days}ngày` : `Còn ${days}ng`})</span>}
        </div>
    )
}

// Input dùng chung cho XeModal — khai báo ngoài component để tránh remount
function XeInput({ label, value, onChange, type = 'text', placeholder, required, step }) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <input
                type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
                placeholder={placeholder} step={step}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
            />
        </div>
    )
}

// ─── Modal Xe ─────────────────────────────────────────────────────────────────
function XeModal({ open, onClose, editData, onSaved }) {
    const empty = { bien_so: '', loai_xe: '1T', trong_tai_max: '', muc_tieu_hao: '', han_dang_kiem: '', han_bao_hiem: '', tinh_trang: 'ranh', tong_km: '', ghi_chu: '', la_xe_con: false, so_ghe_ngoi: '' }
    const [form, setForm] = useState(empty)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (open) { setForm(editData ? { ...editData, han_dang_kiem: editData.han_dang_kiem || '', han_bao_hiem: editData.han_bao_hiem || '' } : empty); setError('') }
    }, [open, editData])

    if (!open) return null

    const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }))

    const handleSave = async () => {
        if (!form.bien_so.trim()) { setError('Vui lòng nhập biển số xe'); return }
        setSaving(true)
        const payload = {
            bien_so: form.bien_so.trim().toUpperCase(),
            loai_xe: form.loai_xe,
            trong_tai_max: form.trong_tai_max !== '' ? parseFloat(form.trong_tai_max) : null,
            muc_tieu_hao: form.muc_tieu_hao !== '' ? parseFloat(form.muc_tieu_hao) : null,
            han_dang_kiem: form.han_dang_kiem || null,
            han_bao_hiem: form.han_bao_hiem || null,
            tinh_trang: form.tinh_trang,
            tong_km: parseFloat(form.tong_km) || 0,
            ghi_chu: form.ghi_chu || null,
            la_xe_con: !!form.la_xe_con,
            so_ghe_ngoi: form.so_ghe_ngoi !== '' ? parseInt(form.so_ghe_ngoi) : null,
            updated_at: new Date().toISOString(),
        }
        const { error: e } = editData
            ? await supabase.from('doi_xe').update(payload).eq('id', editData.id)
            : await supabase.from('doi_xe').insert([payload])
        if (e) { setError(e.code === '23505' ? 'Biển số đã tồn tại!' : e.message) }
        else { onSaved(); onClose() }
        setSaving(false)
    }


    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">{editData ? 'Chỉnh sửa xe' : 'Thêm xe mới'}</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="p-6 space-y-4">
                    {error && <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
                    <div className="grid grid-cols-2 gap-4">
                        <XeInput label="Biển số" value={form.bien_so} onChange={f('bien_so')} placeholder="51C-12345" required />
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Loại xe</label>
                            <select value={form.loai_xe} onChange={e => f('loai_xe')(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                {LOAI_XE.map(l => <option key={l}>{l}</option>)}
                            </select>
                        </div>
                        <XeInput label="Trọng tải (tấn)" value={form.trong_tai_max} onChange={f('trong_tai_max')} type="number" placeholder="5.5" step="0.01" />
                        <XeInput label="Tiêu hao (L/100km)" value={form.muc_tieu_hao} onChange={f('muc_tieu_hao')} type="number" placeholder="12.5" step="0.1" />
                        <XeInput label="Số ghế ngồi" value={form.so_ghe_ngoi} onChange={f('so_ghe_ngoi')} type="number" placeholder="4" />
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tình trạng</label>
                            <select value={form.tinh_trang} onChange={e => f('tinh_trang')(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                {Object.entries(TINH_TRANG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                        <XeInput label="Hạn đăng kiểm" value={form.han_dang_kiem} onChange={f('han_dang_kiem')} type="date" />
                        <XeInput label="Hạn bảo hiểm" value={form.han_bao_hiem} onChange={f('han_bao_hiem')} type="date" />
                        <XeInput label="Tổng KM hiện tại" value={form.tong_km} onChange={f('tong_km')} type="number" placeholder="0" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Ghi chú</label>
                        <textarea value={form.ghi_chu ?? ''} onChange={e => f('ghi_chu')(e.target.value)} rows={2}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                </div>
                <div className="flex gap-3 p-6 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {saving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Modal Bảo dưỡng ──────────────────────────────────────────────────────────
function BaoDuongModal({ open, onClose, xeId, editData, onSaved }) {
    const empty = {
        loai: 'bao_duong', ten_cong_viec: '',
        ngay_thuc_hien: new Date().toISOString().slice(0, 10),
        km_thuc_hien: '', km_ke_tiep: '', chi_phi: '',
        dia_chi_sua_chua: '', ghi_chu: '', anh_hoa_don: '', da_hoan_thanh: true
    }
    const [form, setForm] = useState(empty)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [preview, setPreview] = useState('')

    useEffect(() => {
        if (open) {
            setForm(editData ? { ...editData, ngay_thuc_hien: editData.ngay_thuc_hien?.slice(0, 10) || '' } : empty)
            setPreview(editData?.anh_hoa_don || '')
        }
    }, [open, editData])

    if (!open) return null
    const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }))

    const handleUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        const fileName = `bd-${Date.now()}.${file.name.split('.').pop()}`
        const { error } = await supabase.storage.from('hoa-don-xe').upload(fileName, file, { upsert: true })
        if (!error) {
            const { data: urlData } = supabase.storage.from('hoa-don-xe').getPublicUrl(fileName)
            f('anh_hoa_don')(urlData.publicUrl)
            setPreview(urlData.publicUrl)
        }
        setUploading(false)
    }

    const handleSave = async () => {
        setSaving(true)
        const payload = {
            xe_id: xeId, loai: form.loai,
            ten_cong_viec: form.ten_cong_viec || null,
            ngay_thuc_hien: form.ngay_thuc_hien,
            km_thuc_hien: form.km_thuc_hien || null,
            km_ke_tiep: form.km_ke_tiep || null,
            chi_phi: parseFloat(form.chi_phi) || 0,
            dia_chi_sua_chua: form.dia_chi_sua_chua || null,
            ghi_chu: form.ghi_chu || null,
            anh_hoa_don: form.anh_hoa_don || null,
            da_hoan_thanh: form.da_hoan_thanh
        }
        const { error } = editData
            ? await supabase.from('lich_bao_duong').update(payload).eq('id', editData.id)
            : await supabase.from('lich_bao_duong').insert([payload])
        if (!error) { onSaved(); onClose() }
        setSaving(false)
    }

    const cls = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">{editData ? 'Sửa bảo dưỡng' : 'Thêm bảo dưỡng'}</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="p-6 space-y-4">
                    {/* Loại & Tên công việc */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Loại công việc</label>
                            <select value={form.loai} onChange={e => f('loai')(e.target.value)} className={cls + ' bg-white'}>
                                {Object.entries(LOAI_BDANG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên công việc</label>
                            <input value={form.ten_cong_viec ?? ''} onChange={e => f('ten_cong_viec')(e.target.value)}
                                placeholder="VD: Thay dầu phanh..." className={cls} />
                        </div>
                    </div>
                    {/* Ngày, Chi phí, KM */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ngày thực hiện</label>
                            <input type="date" value={form.ngay_thuc_hien} onChange={e => f('ngay_thuc_hien')(e.target.value)} className={cls} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Chi phí (₫)</label>
                            <input type="number" value={form.chi_phi} onChange={e => f('chi_phi')(e.target.value)} placeholder="0" className={cls} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">KM thực hiện</label>
                            <input type="number" value={form.km_thuc_hien} onChange={e => f('km_thuc_hien')(e.target.value)} placeholder="0" className={cls} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">KM lần kế tiếp</label>
                            <input type="number" value={form.km_ke_tiep} onChange={e => f('km_ke_tiep')(e.target.value)} placeholder="0" className={cls} />
                        </div>
                    </div>
                    {/* Địa chỉ sửa chữa */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Địa chỉ sửa chữa / Gara</label>
                        <input value={form.dia_chi_sua_chua ?? ''} onChange={e => f('dia_chi_sua_chua')(e.target.value)}
                            placeholder="Tên gara, địa chỉ..." className={cls} />
                    </div>
                    {/* Ghi chú */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Ghi chú</label>
                        <textarea value={form.ghi_chu ?? ''} onChange={e => f('ghi_chu')(e.target.value)} rows={2}
                            className={cls + ' resize-none'} />
                    </div>
                    {/* Ảnh hóa đơn */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Ảnh hóa đơn</label>
                        <div className="flex items-center gap-3">
                            <label className={`flex items-center gap-2 px-4 py-2.5 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploading ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50'}`}>
                                {uploading
                                    ? <><Loader2 className="w-4 h-4 animate-spin text-blue-500" /><span className="text-sm text-blue-600">Đang tải...</span></>
                                    : <><FileText className="w-4 h-4 text-slate-400" /><span className="text-sm text-slate-500">Chọn ảnh</span></>}
                                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                            </label>
                            {preview && (
                                <div className="relative">
                                    <img src={preview} alt="Hóa đơn" className="h-16 w-24 object-cover rounded-xl border border-slate-200" />
                                    <button onClick={() => { f('anh_hoa_don')(''); setPreview('') }}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">×</button>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Hoàn thành */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.da_hoan_thanh} onChange={e => f('da_hoan_thanh')(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                        <span className="text-sm text-slate-700">Đã hoàn thành</span>
                    </label>
                </div>
                <div className="flex gap-3 p-6 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                    <button onClick={handleSave} disabled={saving || uploading}
                        className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Lưu
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Modal Chi phí ─────────────────────────────────────────────────────────────────
function ChiPhiModal({ open, onClose, xeId, editData, onSaved }) {
    const empty = {
        loai_chi_phi: 'nhien_lieu',
        ngay: new Date().toISOString().slice(0, 10),
        so_tien: '', km_tich_luy: '',
        ten_lai_xe: '', noi_phat_sinh: '', mo_ta: ''
    }
    const [form, setForm] = useState(empty)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open) setForm(editData ? { ...editData, ngay: editData.ngay?.slice(0, 10) || '' } : empty)
    }, [open, editData])

    if (!open) return null
    const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }))

    const handleSave = async () => {
        setSaving(true)
        const payload = {
            xe_id: xeId, loai_chi_phi: form.loai_chi_phi,
            ngay: form.ngay,
            so_tien: parseFloat(form.so_tien) || 0,
            km_tich_luy: form.km_tich_luy || null,
            ten_lai_xe: form.ten_lai_xe || null,
            noi_phat_sinh: form.noi_phat_sinh || null,
            mo_ta: form.mo_ta || null
        }
        const { error } = editData
            ? await supabase.from('chi_phi_xe').update(payload).eq('id', editData.id)
            : await supabase.from('chi_phi_xe').insert([payload])
        if (!error) { onSaved(); onClose() }
        setSaving(false)
    }

    const cls = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">{editData ? 'Sửa chi phí' : 'Thêm chi phí'}</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Loại chi phí</label>
                            <select value={form.loai_chi_phi} onChange={e => f('loai_chi_phi')(e.target.value)} className={cls + ' bg-white'}>
                                {Object.entries(LOAI_CHI_PHI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ngày</label>
                            <input type="date" value={form.ngay} onChange={e => f('ngay')(e.target.value)} className={cls} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Số tiền (₫)</label>
                            <input type="number" value={form.so_tien} onChange={e => f('so_tien')(e.target.value)} placeholder="0" className={cls} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">KM tích lũy</label>
                            <input type="number" value={form.km_tich_luy} onChange={e => f('km_tich_luy')(e.target.value)} placeholder="0" className={cls} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên lái xe</label>
                            <input value={form.ten_lai_xe ?? ''} onChange={e => f('ten_lai_xe')(e.target.value)}
                                placeholder="Nguyễn Văn A" className={cls} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nơi phát sinh</label>
                            <input value={form.noi_phat_sinh ?? ''} onChange={e => f('noi_phat_sinh')(e.target.value)}
                                placeholder="Hà Nội, TP.HCM..." className={cls} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Mô tả</label>
                        <textarea value={form.mo_ta ?? ''} onChange={e => f('mo_ta')(e.target.value)} rows={2}
                            className={cls + ' resize-none'} />
                    </div>
                </div>
                <div className="flex gap-3 p-6 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Lưu
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Modal Thêm chi phí hàng loạt ─────────────────────────────────────────────
function BulkChiPhiModal({ open, onClose, xeList, onSaved }) {
    const today = new Date().toISOString().slice(0, 10)
    const emptyForm = { loai_chi_phi: 'nhien_lieu', ngay: today, so_tien: '', noi_phat_sinh: '', mo_ta: '' }
    const [form, setForm] = useState(emptyForm)
    const [selectedIds, setSelectedIds] = useState([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open) { setForm(emptyForm); setSelectedIds(xeList.map(x => x.id)) }
    }, [open, xeList])

    if (!open) return null
    const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }))
    const cls = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
    const allChecked = selectedIds.length === xeList.length
    const toggleAll = () => setSelectedIds(allChecked ? [] : xeList.map(x => x.id))
    const toggleOne = (id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

    const handleSave = async () => {
        if (!selectedIds.length || !form.so_tien) return
        setSaving(true)
        const rows = selectedIds.map(xe_id => ({
            xe_id,
            loai_chi_phi: form.loai_chi_phi,
            ngay: form.ngay,
            so_tien: parseFloat(form.so_tien) || 0,
            noi_phat_sinh: form.noi_phat_sinh || null,
            mo_ta: form.mo_ta || null,
        }))
        await supabase.from('chi_phi_xe').insert(rows)
        setSaving(false); onSaved(); onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Thêm chi phí cho nhiều xe</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Nhập 1 lần → lưu đồng loạt cho các xe được chọn</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Loại chi phí</label>
                            <select value={form.loai_chi_phi} onChange={e => f('loai_chi_phi')(e.target.value)} className={cls + ' bg-white'}>
                                {Object.entries(LOAI_CHI_PHI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Ngày</label>
                            <input type="date" value={form.ngay} onChange={e => f('ngay')(e.target.value)} className={cls} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Số tiền / xe (₫)</label>
                            <input type="number" value={form.so_tien} onChange={e => f('so_tien')(e.target.value)} placeholder="0" className={cls} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Nơi phát sinh</label>
                            <input value={form.noi_phat_sinh} onChange={e => f('noi_phat_sinh')(e.target.value)} placeholder="Hà Nội..." className={cls} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Mô tả</label>
                        <input value={form.mo_ta} onChange={e => f('mo_ta')(e.target.value)} placeholder="Ghi chú..." className={cls} />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-slate-500">Áp dụng cho xe ({selectedIds.length}/{xeList.length})</label>
                            <button onClick={toggleAll} className="text-xs text-blue-600 hover:underline font-medium">
                                {allChecked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            </button>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto divide-y divide-slate-100">
                            {xeList.map(xe => (
                                <label key={xe.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                                    <input type="checkbox" checked={selectedIds.includes(xe.id)} onChange={() => toggleOne(xe.id)}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                    <span className="font-mono text-sm font-semibold text-blue-700">{xe.bien_so}</span>
                                    <span className="text-xs text-slate-400">{xe.loai_xe}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {selectedIds.length > 0 && form.so_tien && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm text-blue-700">
                            Sẽ tạo <strong>{selectedIds.length}</strong> bản ghi —
                            Tổng: <strong>{formatVND(parseFloat(form.so_tien || 0) * selectedIds.length)}</strong>
                        </div>
                    )}
                </div>
                <div className="flex gap-3 p-6 pt-0">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                    <button onClick={handleSave} disabled={saving || !selectedIds.length || !form.so_tien}
                        className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Lưu cho {selectedIds.length} xe
                    </button>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANG CHÍNH
// ═══════════════════════════════════════════════════════════════════════════════
export default function DoiXePage() {
    const [tab, setTab] = useState('danh-sach')
    const [xeList, setXeList] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterTT, setFilterTT] = useState('all')
    const [xeModal, setXeModal] = useState({ open: false, data: null })
    const [deleteXe, setDeleteXe] = useState(null)
    const [toast, setToast] = useState(null)

    // Tab bảo dưỡng
    const [selectedXeId, setSelectedXeId] = useState(null)
    const [bdList, setBdList] = useState([])
    const [bdModal, setBdModal] = useState({ open: false, data: null })

    // Tab chí phí / báo cáo
    const [cpList, setCpList] = useState([])
    const [cpModal, setCpModal] = useState({ open: false, data: null })
    const [bulkModal, setBulkModal] = useState(false)
    const [filterYear, setFilterYear] = useState(new Date().getFullYear())
    const [filterMonth, setFilterMonth] = useState(0)
    const [filterXe, setFilterXe] = useState('all')   // filter xe trong báo cáo
    const [cpXeId, setCpXeId] = useState('')           // xe được chọn khi thêm chi phí

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500) }

    // ── Fetch xe ──
    const fetchXe = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase.from('doi_xe').select('*').order('bien_so')
        setXeList(data || [])
        setLoading(false)
    }, [])

    // ── Fetch bảo dưỡng ──
    const fetchBaoduong = useCallback(async (xeId) => {
        if (!xeId) return
        if (xeId === 'all') {
            const { data } = await supabase
                .from('lich_bao_duong')
                .select('*, doi_xe(bien_so, loai_xe)')
                .order('ngay_thuc_hien', { ascending: false })
            setBdList(data || [])
        } else {
            const { data } = await supabase
                .from('lich_bao_duong')
                .select('*, doi_xe(bien_so, loai_xe)')
                .eq('xe_id', xeId)
                .order('ngay_thuc_hien', { ascending: false })
            setBdList(data || [])
        }
    }, [])

    // ── Fetch chi phí ──
    const fetchChiPhi = useCallback(async () => {
        const { data } = await supabase.from('chi_phi_xe').select('*, doi_xe(bien_so, loai_xe, tong_km)').order('ngay', { ascending: false })
        setCpList(data || [])
    }, [])

    useEffect(() => { fetchXe() }, [])
    useEffect(() => { if (tab === 'bao-duong') fetchBaoduong(selectedXeId || 'all') }, [tab, selectedXeId])
    useEffect(() => { if (tab === 'bao-cao') fetchChiPhi() }, [tab])
    useEffect(() => { if (!bulkModal) fetchChiPhi() }, [bulkModal])  // refresh sau khi bulk modal đóng
    useEffect(() => { if (xeList.length > 0 && !selectedXeId) setSelectedXeId(xeList[0].id) }, [xeList])
    useEffect(() => { if (xeList.length > 0 && !cpXeId) setCpXeId(xeList[0].id) }, [xeList])

    const filteredXe = xeList.filter(x => {
        const q = search.toLowerCase()
        const matchSearch = !q || x.bien_so?.toLowerCase().includes(q) || x.loai_xe?.toLowerCase().includes(q)
        const matchTT = filterTT === 'all' || x.tinh_trang === filterTT
        return matchSearch && matchTT
    })

    const handleDeleteXe = async () => {
        if (!deleteXe) return
        await supabase.from('doi_xe').delete().eq('id', deleteXe.id)
        showToast('success', `Đã xóa xe ${deleteXe.bien_so}`)
        setDeleteXe(null)
        fetchXe()
    }

    // Tổng hợp báo cáo chi phí
    const baoCao = xeList
        .filter(xe => filterXe === 'all' || xe.id === filterXe)
        .map(xe => {
            const cpXe = cpList.filter(c => {
                const d = new Date(c.ngay)
                return c.xe_id === xe.id
                    && d.getFullYear() === filterYear
                    && (filterMonth === 0 || d.getMonth() + 1 === filterMonth)
            })
            const tongCp = cpXe.reduce((s, c) => s + (Number(c.so_tien) || 0), 0)
            return { ...xe, tongCp, soCp: cpXe.length }
        }).filter(x => x.tongCp > 0)   // chỉ hiện xe có chi phí

    const selectedXe = xeList.find(x => x.id === selectedXeId)

    // ── TABS ──
    const TABS = [
        { key: 'danh-sach', label: 'Đội xe', icon: Truck },
        { key: 'bao-duong', label: 'Bảo dưỡng', icon: Wrench },
        { key: 'bao-cao', label: 'Báo cáo Chi phí', icon: BarChart2 },
    ]

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-xl p-2.5"><Truck className="w-6 h-6 text-blue-600" /></div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Quản lý Đội Xe</h2>
                    <p className="text-slate-500 text-sm">TMS – Transport Management System</p>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${toast.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    {toast.msg}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <t.icon className="w-4 h-4" />{t.label}
                    </button>
                ))}
            </div>

            {/* ══════════════ TAB 1: DANH SÁCH XE ══════════════ */}
            {tab === 'danh-sach' && (
                <div className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Tổng xe', value: xeList.length, icon: Truck, color: 'blue' },
                            { label: 'Đang chạy', value: xeList.filter(x => x.tinh_trang === 'dang_chay').length, icon: TrendingUp, color: 'emerald' },
                            { label: 'Bảo trì', value: xeList.filter(x => x.tinh_trang === 'bao_tri').length, icon: Wrench, color: 'orange' },
                        ].map(s => (
                            <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className={`bg-${s.color}-100 rounded-xl p-2.5`}><s.icon className={`w-5 h-5 text-${s.color}-600`} /></div>
                                    <div><p className="text-2xl font-bold text-slate-800">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Toolbar */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm biển số, loại xe..."
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <select value={filterTT} onChange={e => setFilterTT(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="all">Tất cả tình trạng</option>
                            {Object.entries(TINH_TRANG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <button onClick={() => setXeModal({ open: true, data: null })}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all">
                            <Plus className="w-4 h-4" />Thêm xe
                        </button>
                    </div>

                    {/* Grid xe */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                    ) : filteredXe.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Chưa có xe nào</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredXe.map(xe => {
                                const dkDays = daysUntil(xe.han_dang_kiem)
                                const bhDays = daysUntil(xe.han_bao_hiem)
                                const hasWarning = (dkDays !== null && dkDays < 30) || (bhDays !== null && bhDays < 30)
                                return (
                                    <div key={xe.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${hasWarning ? 'border-orange-300' : 'border-slate-200'}`}>
                                        {hasWarning && <div className="bg-orange-50 px-4 py-2 flex items-center gap-2 text-orange-700 text-xs font-medium border-b border-orange-200"><AlertTriangle className="w-3.5 h-3.5" />Sắp đến hạn — cần kiểm tra!</div>}
                                        <div className="p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="font-bold text-lg text-slate-800 font-mono">{xe.bien_so}</p>
                                                    <p className="text-sm text-slate-500">{xe.loai_xe} {xe.trong_tai_max ? `— ${xe.trong_tai_max}T` : ''}</p>
                                                </div>
                                                <TinhTrangBadge value={xe.tinh_trang} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mb-4">
                                                <div className="bg-slate-50 rounded-xl px-3 py-2">
                                                    <p className="text-[10px] text-slate-400 uppercase">Tổng KM</p>
                                                    <p className="text-sm font-semibold text-slate-800">{Number(xe.tong_km || 0).toLocaleString()} km</p>
                                                </div>
                                                <div className="bg-slate-50 rounded-xl px-3 py-2">
                                                    <p className="text-[10px] text-slate-400 uppercase">Tiêu hao</p>
                                                    <p className="text-sm font-semibold text-slate-800">{xe.muc_tieu_hao ?? '—'} L/100km</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1 mb-4">
                                                <HanBadge label="Đăng kiểm" dateStr={xe.han_dang_kiem} />
                                                <HanBadge label="Bảo hiểm" dateStr={xe.han_bao_hiem} />
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setXeModal({ open: true, data: xe }) }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all">
                                                    <Pencil className="w-3.5 h-3.5" />Sửa
                                                </button>
                                                <button onClick={() => { setSelectedXeId(xe.id); setTab('bao-duong') }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all">
                                                    <Wrench className="w-3.5 h-3.5" />Bảo dưỡng
                                                </button>
                                                <button onClick={() => setDeleteXe(xe)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 hover:border-red-200 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════ TAB 2: BẢO DƯỠNG ══════════════ */}
            {tab === 'bao-duong' && (
                <div className="space-y-4">
                    {/* ─ Toolbar ─ */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex gap-3 items-center">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Chọn xe</label>
                            <select value={selectedXeId || 'all'}
                                onChange={e => {
                                    const v = e.target.value
                                    setSelectedXeId(v === 'all' ? null : v)
                                    fetchBaoduong(v)
                                }}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="all">📊 Tất cả xe</option>
                                {xeList.map(x => <option key={x.id} value={x.id}>{x.bien_so} — {x.loai_xe}</option>)}
                            </select>
                        </div>
                        {selectedXeId && selectedXe && (
                            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
                                <Gauge className="w-4 h-4 text-slate-400" />
                                <div><p className="text-[10px] text-slate-400">Tổng KM</p><p className="text-sm font-bold text-slate-800">{Number(selectedXe.tong_km || 0).toLocaleString()} km</p></div>
                            </div>
                        )}
                        <button onClick={() => setBdModal({ open: true, data: null })} disabled={!selectedXeId}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium whitespace-nowrap">
                            <Plus className="w-4 h-4" />Thêm lịch
                        </button>
                    </div>

                    {/* ─ Timeline ─ */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {bdList.length === 0 ? (
                            <div className="text-center py-16"><Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Chưa có lịch bảo dưỡng</p></div>
                        ) : selectedXeId ? (
                            /* ─ View 1 xe ─ */
                            <div className="divide-y divide-slate-100">
                                {bdList.map(bd => {
                                    const loai = LOAI_BDANG[bd.loai] || LOAI_BDANG.khac
                                    const Icon = loai.icon
                                    return (
                                        <div key={bd.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${loai.color}`}><Icon className="w-5 h-5" /></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-slate-800">{loai.label}</p>
                                                    {bd.ten_cong_viec && <span className="text-xs text-slate-500">{bd.ten_cong_viec}</span>}
                                                    {!bd.da_hoan_thanh && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Chờ thực hiện</span>}
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(bd.ngay_thuc_hien)}</span>
                                                    {bd.km_thuc_hien && <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{Number(bd.km_thuc_hien).toLocaleString()} km</span>}
                                                    {bd.km_ke_tiep && <span className="flex items-center gap-1 text-blue-600"><Clock className="w-3 h-3" />Kế tiếp: {Number(bd.km_ke_tiep).toLocaleString()} km</span>}
                                                    {bd.dia_chi_sua_chua && <span className="text-slate-400">📍 {bd.dia_chi_sua_chua}</span>}
                                                </div>
                                                {bd.ghi_chu && <p className="text-xs text-slate-400 mt-0.5">{bd.ghi_chu}</p>}
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-sm font-semibold text-slate-800">{formatVND(bd.chi_phi)}</p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setBdModal({ open: true, data: bd })} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all text-slate-400"><Pencil className="w-3.5 h-3.5" /></button>
                                                <button onClick={async () => { await supabase.from('lich_bao_duong').delete().eq('id', bd.id); fetchBaoduong(selectedXeId) }} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-slate-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            /* ─ View tất cả xe, group by xe ─ */
                            <div>
                                {xeList.map(xe => {
                                    const rows = bdList.filter(b => b.xe_id === xe.id)
                                    if (rows.length === 0) return null
                                    return (
                                        <div key={xe.id}>
                                            <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
                                                <Truck className="w-4 h-4 text-blue-500" />
                                                <span className="font-bold text-sm text-blue-700 font-mono">{xe.bien_so}</span>
                                                <span className="text-xs text-slate-400">{xe.loai_xe}</span>
                                                <span className="ml-auto text-xs text-slate-400">{rows.length} bản ghi</span>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                                {rows.map(bd => {
                                                    const loai = LOAI_BDANG[bd.loai] || LOAI_BDANG.khac
                                                    const Icon = loai.icon
                                                    return (
                                                        <div key={bd.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors group">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${loai.color}`}><Icon className="w-4 h-4" /></div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-medium text-slate-800">{loai.label}</p>
                                                                    {bd.ten_cong_viec && <span className="text-xs text-slate-500">{bd.ten_cong_viec}</span>}
                                                                    {!bd.da_hoan_thanh && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Chờ</span>}
                                                                </div>
                                                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                                                    <span>{formatDate(bd.ngay_thuc_hien)}</span>
                                                                    {bd.dia_chi_sua_chua && <span>📍 {bd.dia_chi_sua_chua}</span>}
                                                                </div>
                                                            </div>
                                                            <p className="text-sm font-semibold text-slate-700">{formatVND(bd.chi_phi)}</p>
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => { setSelectedXeId(xe.id); setBdModal({ open: true, data: bd }) }} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400"><Pencil className="w-3 h-3" /></button>
                                                                <button onClick={async () => { await supabase.from('lich_bao_duong').delete().eq('id', bd.id); fetchBaoduong('all') }} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400"><Trash2 className="w-3 h-3" /></button>
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
            )}

            {/* ══════════════ TAB 3: BÁO CÁO CHI PHÍ ══════════════ */}
            {tab === 'bao-cao' && (
                <div className="space-y-4">
                    {/* Bộ lọc: Năm + Tháng + Xe */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Năm</label>
                            <select value={filterYear} onChange={e => setFilterYear(+e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Tháng</label>
                            <select value={filterMonth} onChange={e => setFilterMonth(+e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value={0}>Tất cả</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => <option key={m} value={m}>Tháng {m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Xe</label>
                            <select value={filterXe} onChange={e => setFilterXe(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="all">Tất cả xe</option>
                                {xeList.map(x => <option key={x.id} value={x.id}>{x.bien_so} — {x.loai_xe}</option>)}
                            </select>
                        </div>
                        <div className="flex-1" />
                        {/* Thêm chi phí hàng loạt */}
                        <div className="flex items-end gap-2">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Xe để nhập chi phí</label>
                                <select value={cpXeId} onChange={e => setCpXeId(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">-- chọn xe --</option>
                                    {xeList.map(x => <option key={x.id} value={x.id}>{x.bien_so}</option>)}
                                </select>
                            </div>
                            <button
                                onClick={() => { if (cpXeId) { setSelectedXeId(cpXeId); setCpModal({ open: true, data: null }) } }}
                                disabled={!cpXeId}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium whitespace-nowrap">
                                <Plus className="w-4 h-4" />Thêm chi phí
                            </button>
                            <button
                                onClick={() => setBulkModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium whitespace-nowrap">
                                <Plus className="w-4 h-4" />Tất cả xe
                            </button>
                        </div>
                    </div>

                    {/* Bảng báo cáo */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-blue-500" />
                            <h3 className="font-semibold text-slate-800">
                                Báo cáo chi phí — {filterMonth > 0 ? `Tháng ${filterMonth}/` : 'Năm '}{filterYear}
                            </h3>
                        </div>
                        {baoCao.length === 0 ? (
                            <div className="text-center py-16"><DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Chưa có dữ liệu chi phí</p></div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                {['Xe', 'Loại xe', 'Tổng chi phí', 'Tên chi phí', 'Số giao dịch'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {baoCao.sort((a, b) => b.tongCp - a.tongCp).map(xe => {
                                                // Lấy các loại chi phí phát sinh của xe này
                                                const loaiCp = [...new Set(
                                                    cpList.filter(c => {
                                                        const d = new Date(c.ngay)
                                                        return c.xe_id === xe.id
                                                            && d.getFullYear() === filterYear
                                                            && (filterMonth === 0 || d.getMonth() + 1 === filterMonth)
                                                    }).map(c => c.loai_chi_phi)
                                                )]
                                                return (
                                                    <tr key={xe.id} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="px-4 py-3 font-mono font-semibold text-blue-700">{xe.bien_so}</td>
                                                        <td className="px-4 py-3 text-slate-600">{xe.loai_xe}</td>
                                                        <td className="px-4 py-3 font-semibold text-slate-800">{formatVND(xe.tongCp)}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-wrap gap-1">
                                                                {loaiCp.map(k => (
                                                                    <span key={k} className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${LOAI_CHI_PHI[k]?.color || 'bg-slate-100 text-slate-600'}`}>
                                                                        {LOAI_CHI_PHI[k]?.label || k}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500">{xe.soCp}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Chi tiết chi phí của xe đang chọn */}
                                <div className="border-t border-slate-100 p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-slate-400" />
                                            <p className="text-sm font-semibold text-slate-700">Chi tiết chi phí —
                                                <select value={selectedXeId || ''} onChange={e => setSelectedXeId(e.target.value)} className="ml-2 px-2 py-0.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none">
                                                    {xeList.map(x => <option key={x.id} value={x.id}>{x.bien_so}</option>)}
                                                </select>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 max-h-72 overflow-y-auto">
                                        {cpList
                                            .filter(c => {
                                                const d = new Date(c.ngay)
                                                return c.xe_id === selectedXeId
                                                    && d.getFullYear() === filterYear
                                                    && (filterMonth === 0 || d.getMonth() + 1 === filterMonth)
                                            })
                                            .map(cp => (
                                                <div key={cp.id} className="px-3 py-2.5 bg-slate-50 rounded-xl group hover:bg-slate-100 transition-all">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${LOAI_CHI_PHI[cp.loai_chi_phi]?.color || 'bg-slate-100 text-slate-600'}`}>
                                                                {LOAI_CHI_PHI[cp.loai_chi_phi]?.label || cp.loai_chi_phi}
                                                            </span>
                                                            <span className="text-xs text-slate-500">{formatDate(cp.ngay)}</span>
                                                            {cp.ten_lai_xe && <span className="text-xs text-indigo-600 font-medium">&#128101; {cp.ten_lai_xe}</span>}
                                                            {cp.noi_phat_sinh && <span className="text-xs text-slate-400">&#128205; {cp.noi_phat_sinh}</span>}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-slate-800">{formatVND(cp.so_tien)}</span>
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => setCpModal({ open: true, data: cp })} className="p-1 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-all text-slate-400"><Pencil className="w-3 h-3" /></button>
                                                                <button onClick={async () => { await supabase.from('chi_phi_xe').delete().eq('id', cp.id); fetchChiPhi() }} className="p-1 hover:bg-red-100 hover:text-red-600 rounded-lg transition-all text-slate-400"><Trash2 className="w-3 h-3" /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {cp.mo_ta && <p className="text-xs text-slate-400 mt-1 truncate">{cp.mo_ta}</p>}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Modals */}
            <XeModal open={xeModal.open} onClose={() => setXeModal({ open: false, data: null })} editData={xeModal.data} onSaved={() => { fetchXe(); showToast('success', 'Đã lưu thông tin xe!') }} />
            <BaoDuongModal open={bdModal.open} onClose={() => setBdModal({ open: false, data: null })} xeId={selectedXeId} editData={bdModal.data} onSaved={() => { fetchBaoduong(selectedXeId); showToast('success', 'Đã lưu lịch bảo dưỡng!') }} />
            <ChiPhiModal open={cpModal.open} onClose={() => setCpModal({ open: false, data: null })} xeId={selectedXeId} editData={cpModal.data} onSaved={() => { fetchChiPhi(); showToast('success', 'Đã lưu chi phí!') }} />
            <BulkChiPhiModal open={bulkModal} onClose={() => setBulkModal(false)} xeList={xeList} onSaved={() => { fetchChiPhi(); showToast('success', `Đã lưu chi phí cho ${xeList.length} xe!`) }} />

            {/* Delete confirm */}
            {deleteXe && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 rounded-xl p-2.5"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                            <div><p className="font-semibold text-slate-800">Xóa xe {deleteXe.bien_so}?</p><p className="text-sm text-slate-500">Toàn bộ lịch bảo dưỡng và chi phí sẽ bị xóa.</p></div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteXe(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                            <button onClick={handleDeleteXe} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium">Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
