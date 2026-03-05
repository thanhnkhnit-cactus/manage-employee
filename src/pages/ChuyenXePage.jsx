import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
    Plus, Search, Pencil, X, Check, Loader2, Truck, ChevronDown, ChevronUp,
    AlertCircle, Trash2, CheckCircle2, Clock, ArrowRight, Eye, MapPin,
    Navigation
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const genMaChuyen = () => `CX${Date.now()}`

const fmt = (n) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n ?? 0)

const formatDate = (d) => d
    ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
    : '—'

const TRANG_THAI_CHUYEN = {
    chuan_bi: { label: 'Chuẩn bị', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    dang_giao: { label: 'Đang giao', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    hoan_thanh: { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    huy: { label: 'Đã hủy', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

const TRANG_THAI_DON = {
    ban_nhap: { label: 'Bản nháp', color: 'bg-slate-100 text-slate-600' },
    cho_xu_ly: { label: 'Chờ xử lý', color: 'bg-amber-100 text-amber-700' },
    da_xac_nhan: { label: 'Đã xác nhận', color: 'bg-indigo-100 text-indigo-700' },
    dang_giao: { label: 'Đang giao', color: 'bg-blue-100 text-blue-700' },
    hoan_thanh: { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700' },
    huy: { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
}

// ─── Modal Tạo / Sửa Chuyến Xe ───────────────────────────────────────────────
function ChuyenXeModal({ open, onClose, editData, xeList, taixeList, donVCList, onSaved }) {
    const empty = { ma_chuyen: '', xe_id: '', tai_xe_id: '', ngay_khoi_hanh: '', ghi_chu: '', trang_thai: 'chuan_bi' }
    const [form, setForm] = useState(empty)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [selectedDon, setSelectedDon] = useState([])
    const [existingDon, setExistingDon] = useState([])
    const [donSearch, setDonSearch] = useState('')

    useEffect(() => {
        if (!open) return
        setError(''); setDonSearch('')
        if (editData) {
            setForm({
                ma_chuyen: editData.ma_chuyen || '',
                xe_id: editData.xe_id || '',
                tai_xe_id: editData.tai_xe_id || '',
                ngay_khoi_hanh: editData.ngay_khoi_hanh ? editData.ngay_khoi_hanh.slice(0, 16) : '',
                ghi_chu: editData.ghi_chu || '',
                trang_thai: editData.trang_thai || 'chuan_bi',
            })
                ; (async () => {
                    const { data } = await supabase
                        .from('chuyen_xe_don_van_chuyen')
                        .select('don_van_chuyen_id')
                        .eq('chuyen_xe_id', editData.id)
                    const ids = (data || []).map(r => r.don_van_chuyen_id)
                    setExistingDon(ids)
                    setSelectedDon(ids)
                })()
        } else {
            setForm({ ...empty, ma_chuyen: genMaChuyen() })
            setExistingDon([]); setSelectedDon([])
        }
    }, [open, editData])

    if (!open) return null

    const isEdit = !!editData
    const isLocked = editData?.trang_thai === 'hoan_thanh' || editData?.trang_thai === 'huy'

    const toggleDon = (id) => setSelectedDon(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

    // Chỉ hiển thị đơn đã xác nhận hoặc đang trong chuyến này
    const filteredDon = donVCList.filter(d => {
        const inThisTrip = existingDon.includes(d.id)
        const available = !d.chuyen_xe_id || d.chuyen_xe_id === editData?.id
        const canAdd = ['da_xac_nhan', 'dang_giao'].includes(d.trang_thai)
        const matchSearch = !donSearch ||
            d.ten_kh?.toLowerCase().includes(donSearch.toLowerCase()) ||
            d.diem_di?.toLowerCase().includes(donSearch.toLowerCase()) ||
            d.diem_den?.toLowerCase().includes(donSearch.toLowerCase())
        return (inThisTrip || (available && canAdd)) && matchSearch
    })

    const handleSave = async () => {
        if (!form.ma_chuyen.trim()) return setError('Vui lòng nhập mã chuyến.')
        setSaving(true); setError('')
        try {
            const xe = xeList.find(x => x.id === form.xe_id)
            const tx = taixeList.find(t => t.id === form.tai_xe_id)
            const payload = {
                ma_chuyen: form.ma_chuyen.trim(),
                xe_id: form.xe_id || null,
                tai_xe_id: form.tai_xe_id || null,
                bien_so: xe?.bien_so || null,
                ten_tai_xe: tx?.ho_ten || null,
                sdt_tai_xe: tx?.sdt || null,
                ngay_khoi_hanh: form.ngay_khoi_hanh || null,
                ghi_chu: form.ghi_chu.trim() || null,
                trang_thai: form.trang_thai,
                updated_at: new Date().toISOString(),
            }

            let chuyenId = editData?.id
            if (isEdit) {
                const { error: e } = await supabase.from('chuyen_xe').update(payload).eq('id', chuyenId)
                if (e) throw e
            } else {
                const { data, error: e } = await supabase.from('chuyen_xe').insert([payload]).select().single()
                if (e) throw e
                chuyenId = data.id
            }

            // Đồng bộ chuyen_xe_don_van_chuyen
            if (isEdit) {
                const removed = existingDon.filter(id => !selectedDon.includes(id))
                const added = selectedDon.filter(id => !existingDon.includes(id))
                if (removed.length) {
                    await supabase.from('chuyen_xe_don_van_chuyen').delete()
                        .eq('chuyen_xe_id', chuyenId).in('don_van_chuyen_id', removed)
                    await supabase.from('don_van_chuyen').update({ chuyen_xe_id: null }).in('id', removed)
                }
                if (added.length) {
                    await supabase.from('chuyen_xe_don_van_chuyen').upsert(
                        added.map(id => ({ chuyen_xe_id: chuyenId, don_van_chuyen_id: id })),
                        { onConflict: 'chuyen_xe_id,don_van_chuyen_id' }
                    )
                    await supabase.from('don_van_chuyen').update({ chuyen_xe_id: chuyenId, trang_thai: 'dang_giao' }).in('id', added)
                }
            } else {
                if (selectedDon.length) {
                    await supabase.from('chuyen_xe_don_van_chuyen').insert(
                        selectedDon.map(id => ({ chuyen_xe_id: chuyenId, don_van_chuyen_id: id }))
                    )
                    await supabase.from('don_van_chuyen').update({ chuyen_xe_id: chuyenId, trang_thai: 'dang_giao' })
                        .in('id', selectedDon)
                }
            }

            onSaved(); onClose()
        } catch (e) { setError('Có lỗi: ' + (e?.message || e)) }
        setSaving(false)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 rounded-xl p-2"><Truck className="w-5 h-5 text-indigo-600" /></div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{isEdit ? 'Chỉnh sửa chuyến xe' : 'Tạo chuyến xe mới'}</h2>
                            {isEdit && <p className="text-xs text-slate-500">Mã: {editData.ma_chuyen}</p>}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
                    {isLocked && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            Chuyến xe đã {editData.trang_thai === 'hoan_thanh' ? 'hoàn thành' : 'bị hủy'} — không thể chỉnh sửa.
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />{error}
                        </div>
                    )}

                    {/* Mã chuyến + Trạng thái */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã chuyến <span className="text-red-500">*</span></label>
                            <input value={form.ma_chuyen} readOnly={isEdit || isLocked}
                                onChange={e => setForm(f => ({ ...f, ma_chuyen: e.target.value }))}
                                className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isEdit || isLocked ? 'bg-slate-50 text-slate-500' : ''}`}
                                placeholder="CX..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Trạng thái</label>
                            <select value={form.trang_thai} disabled={isLocked}
                                onChange={e => setForm(f => ({ ...f, trang_thai: e.target.value }))}
                                className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isLocked ? 'opacity-60' : ''}`}>
                                {Object.entries(TRANG_THAI_CHUYEN).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Xe + Tài xế */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phương tiện &amp; Tài xế</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Chọn xe</label>
                                <select value={form.xe_id} disabled={isLocked}
                                    onChange={e => setForm(f => ({ ...f, xe_id: e.target.value }))}
                                    className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isLocked ? 'opacity-60' : ''}`}>
                                    <option value="">-- Chọn xe --</option>
                                    {xeList.map(xe => (
                                        <option key={xe.id} value={xe.id} disabled={xe.tinh_trang === 'bao_tri'}>
                                            {xe.bien_so} ({xe.loai_xe}){xe.tinh_trang === 'bao_tri' ? ' — Bảo trì' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Chọn tài xế</label>
                                <select value={form.tai_xe_id} disabled={isLocked}
                                    onChange={e => setForm(f => ({ ...f, tai_xe_id: e.target.value }))}
                                    className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isLocked ? 'opacity-60' : ''}`}>
                                    <option value="">-- Chọn tài xế --</option>
                                    {taixeList.filter(t => t.trang_thai === 'hoat_dong').map(tx => (
                                        <option key={tx.id} value={tx.id}>{tx.ho_ten}{tx.sdt ? ` (${tx.sdt})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ngày khởi hành</label>
                            <input type="datetime-local" value={form.ngay_khoi_hanh} disabled={isLocked}
                                onChange={e => setForm(f => ({ ...f, ngay_khoi_hanh: e.target.value }))}
                                className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isLocked ? 'opacity-60' : ''}`} />
                        </div>
                    </div>

                    {/* Ghi chú */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Ghi chú</label>
                        <textarea value={form.ghi_chu} disabled={isLocked}
                            onChange={e => setForm(f => ({ ...f, ghi_chu: e.target.value }))}
                            rows={2}
                            className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isLocked ? 'opacity-60' : ''}`}
                            placeholder="Ghi chú thêm..." />
                    </div>

                    {/* Chọn đơn vận chuyển */}
                    {!isLocked && (
                        <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                                    Đơn vận chuyển trong chuyến
                                    <span className="ml-2 bg-indigo-600 text-white rounded-full px-2 py-0.5 text-[10px]">
                                        {selectedDon.length}
                                    </span>
                                </p>
                                <p className="text-xs text-indigo-500">Chỉ đơn đã xác nhận mới được chọn</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input value={donSearch} onChange={e => setDonSearch(e.target.value)}
                                    placeholder="Tìm đơn theo khách hàng, tuyến đường..."
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                                {filteredDon.length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm py-6">
                                        Không có đơn phù hợp.<br />
                                        <span className="text-xs">Đơn cần có trạng thái "Đã xác nhận" để thêm vào chuyến.</span>
                                    </p>
                                ) : filteredDon.map(d => {
                                    const checked = selectedDon.includes(d.id)
                                    const status = TRANG_THAI_DON[d.trang_thai] || { label: d.trang_thai, color: 'bg-slate-100 text-slate-600' }
                                    return (
                                        <label key={d.id}
                                            className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all ${checked ? 'border-indigo-300 bg-indigo-50' : 'border-transparent hover:bg-white hover:border-slate-200'}`}>
                                            <input type="checkbox" checked={checked} onChange={() => toggleDon(d.id)}
                                                className="mt-0.5 accent-indigo-600 w-4 h-4 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${status.color}`}>{status.label}</span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-800 mt-1 truncate">{d.ten_kh || '—'}</p>
                                                <p className="text-xs text-slate-500 truncate">{d.diem_di} → {d.diem_den}</p>
                                                {d.km && <p className="text-xs text-blue-600">{d.km.toFixed(1)} km</p>}
                                            </div>
                                            <p className="text-xs font-bold text-slate-700 shrink-0">{fmt(d.tong_tien)}</p>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 pt-0">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Đóng</button>
                    {!isLocked && (
                        <button onClick={handleSave} disabled={saving}
                            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {saving ? 'Đang lưu...' : 'Lưu chuyến xe'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ open, onClose, chuyen, onDeleted }) {
    const [loading, setLoading] = useState(false)
    if (!open || !chuyen) return null

    const handleDelete = async () => {
        setLoading(true)
        // Giải phóng các đơn vận chuyển
        await supabase.from('don_van_chuyen').update({ chuyen_xe_id: null, trang_thai: 'da_xac_nhan' })
            .eq('chuyen_xe_id', chuyen.id)
        await supabase.from('chuyen_xe').delete().eq('id', chuyen.id)
        setLoading(false)
        onDeleted(); onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa</h3>
                <p className="text-slate-500 text-sm mb-4">
                    Xóa chuyến xe <strong>{chuyen.ma_chuyen}</strong>?
                    Các đơn vận chuyển sẽ được trả về trạng thái "Đã xác nhận".
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

// ─── Detail Modal (xem đơn trong chuyến + đánh dấu giao thành công) ──────────
function DetailModal({ open, onClose, chuyen, onStatusChanged }) {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(false)
    const [updatingId, setUpdatingId] = useState(null)

    useEffect(() => {
        if (!open || !chuyen) return
        setLoading(true)
            ; (async () => {
                const { data } = await supabase
                    .from('chuyen_xe_don_van_chuyen')
                    .select('don_van_chuyen_id, don:don_van_chuyen_id(*)')
                    .eq('chuyen_xe_id', chuyen.id)
                setOrders((data || []).map(r => r.don))
                setLoading(false)
            })()
    }, [open, chuyen])

    if (!open || !chuyen) return null

    const tt = TRANG_THAI_CHUYEN[chuyen.trang_thai] || { label: chuyen.trang_thai, color: 'bg-slate-100 text-slate-600' }
    const isLocked = chuyen.trang_thai === 'hoan_thanh' || chuyen.trang_thai === 'huy'

    const handleDelivered = async (don) => {
        if (don.trang_thai === 'hoan_thanh') return
        setUpdatingId(don.id)
        await supabase.from('don_van_chuyen')
            .update({ trang_thai: 'hoan_thanh', updated_at: new Date().toISOString() })
            .eq('id', don.id)
        setOrders(prev => prev.map(o => o.id === don.id ? { ...o, trang_thai: 'hoan_thanh' } : o))
        onStatusChanged && onStatusChanged()
        setUpdatingId(null)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${tt.dot || 'bg-slate-400'}`} />
                            <h2 className="text-xl font-bold text-slate-800">Chi tiết chuyến xe</h2>
                        </div>
                        <p className="font-mono text-sm text-indigo-600 mt-0.5">{chuyen.ma_chuyen}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Thông tin chuyến */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Trạng thái', value: <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${tt.color}`}><span className={`w-1.5 h-1.5 rounded-full ${tt.dot}`} />{tt.label}</span> },
                            { label: 'Biển số xe', value: chuyen.bien_so || '—' },
                            { label: 'Tài xế', value: chuyen.ten_tai_xe || '—' },
                            { label: 'SĐT tài xế', value: chuyen.sdt_tai_xe || '—' },
                            { label: 'Ngày khởi hành', value: formatDate(chuyen.ngay_khoi_hanh) },
                            { label: 'Ghi chú', value: chuyen.ghi_chu || '—' },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-50 rounded-xl px-4 py-3">
                                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                                <p className="text-sm font-semibold text-slate-800">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Danh sách đơn vận chuyển */}
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                            Đơn vận chuyển ({orders.length})
                        </p>
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                        ) : orders.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-6">Chưa có đơn nào trong chuyến</p>
                        ) : (
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                {orders.map(don => {
                                    const donStatus = TRANG_THAI_DON[don.trang_thai] || { label: don.trang_thai, color: 'bg-slate-100 text-slate-600' }
                                    const isDone = don.trang_thai === 'hoan_thanh'
                                    return (
                                        <div key={don.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isDone ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'}`}>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${donStatus.color}`}>{donStatus.label}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-800 mt-1">{don.ten_kh || '—'}</p>
                                                <p className="text-xs text-slate-500 truncate">{don.diem_di} → {don.diem_den}</p>
                                                <p className="text-xs font-bold text-blue-700 mt-0.5">{fmt(don.tong_tien)}</p>
                                            </div>
                                            {!isLocked && !isDone ? (
                                                <button
                                                    onClick={() => handleDelivered(don)}
                                                    disabled={updatingId === don.id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-all shrink-0">
                                                    {updatingId === don.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                    Đã giao ✓
                                                </button>
                                            ) : isDone && (
                                                <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold shrink-0">
                                                    <CheckCircle2 className="w-4 h-4" /> Hoàn thành
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 pb-6">
                    <button onClick={onClose} className="w-full px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Đóng</button>
                </div>
            </div>
        </div>
    )
}

// ─── Trang chính ─────────────────────────────────────────────────────────────
export default function ChuyenXePage() {
    const [data, setData] = useState([])
    const [xeList, setXeList] = useState([])
    const [taixeList, setTaixeList] = useState([])
    const [donVCList, setDonVCList] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [sortField, setSortField] = useState('created_at')
    const [sortDir, setSortDir] = useState('desc')
    const [modalOpen, setModalOpen] = useState(false)
    const [editData, setEditData] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [detailTarget, setDetailTarget] = useState(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        const [{ data: cx }, { data: xe }, { data: tx }, { data: dvc }] = await Promise.all([
            supabase.from('chuyen_xe').select('*').order(sortField, { ascending: sortDir === 'asc' }),
            supabase.from('doi_xe').select('id,bien_so,loai_xe,tinh_trang').order('bien_so'),
            supabase.from('tai_xe').select('id,ho_ten,sdt,trang_thai').order('ho_ten'),
            // Đơn đã xác nhận hoặc đang giao (có thể thêm vào chuyến)
            supabase.from('don_van_chuyen')
                .select('id,ten_kh,sdt_kh,diem_di,diem_den,km,tong_tien,trang_thai,chuyen_xe_id')
                .in('trang_thai', ['da_xac_nhan', 'dang_giao'])
                .order('created_at', { ascending: false }),
        ])
        setData(cx || [])
        setXeList(xe || [])
        setTaixeList(tx || [])
        setDonVCList(dvc || [])
        setLoading(false)
    }, [sortField, sortDir])

    useEffect(() => { fetchData() }, [fetchData])

    const filtered = data.filter(cx => {
        const q = search.toLowerCase()
        const matchQ = !q ||
            cx.ma_chuyen?.toLowerCase().includes(q) ||
            cx.bien_so?.toLowerCase().includes(q) ||
            cx.ten_tai_xe?.toLowerCase().includes(q)
        const matchStatus = filterStatus === 'all' || cx.trang_thai === filterStatus
        return matchQ && matchStatus
    })

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDir('asc') }
    }

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ChevronUp className="w-3 h-3 text-slate-300" />
        return sortDir === 'asc'
            ? <ChevronUp className="w-3 h-3 text-indigo-500" />
            : <ChevronDown className="w-3 h-3 text-indigo-500" />
    }

    const stats = {
        total: data.length,
        chuan_bi: data.filter(d => d.trang_thai === 'chuan_bi').length,
        dang_giao: data.filter(d => d.trang_thai === 'dang_giao').length,
        hoan_thanh: data.filter(d => d.trang_thai === 'hoan_thanh').length,
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Quản lý Chuyến xe</h2>
                <p className="text-slate-500 text-sm mt-1">Lên lịch, phân công tài xế và theo dõi các chuyến giao hàng</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { icon: Truck, color: 'indigo', label: 'Tổng chuyến', value: stats.total },
                    { icon: Clock, color: 'blue', label: 'Chuẩn bị', value: stats.chuan_bi },
                    { icon: ArrowRight, color: 'amber', label: 'Đang giao', value: stats.dang_giao },
                    { icon: CheckCircle2, color: 'emerald', label: 'Hoàn thành', value: stats.hoan_thanh },
                ].map(({ icon: Icon, color, label, value }) => (
                    <div key={label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`bg-${color}-100 rounded-xl p-2.5`}>
                                <Icon className={`w-5 h-5 text-${color}-600`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800 leading-tight">{value}</p>
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
                            placeholder="Tìm theo mã chuyến, biển số, tài xế..."
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="all">Tất cả trạng thái</option>
                        {Object.entries(TRANG_THAI_CHUYEN).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <button onClick={() => { setEditData(null); setModalOpen(true) }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all">
                        <Plus className="w-4 h-4" /> Tạo chuyến
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Chưa có chuyến xe nào</p>
                        <p className="text-slate-400 text-sm mt-1">Nhấn "Tạo chuyến" để bắt đầu</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {[
                                        { label: 'Mã chuyến', field: 'ma_chuyen' },
                                        { label: 'Phương tiện', field: 'bien_so' },
                                        { label: 'Tài xế', field: 'ten_tai_xe' },
                                        { label: 'Ngày khởi hành', field: 'ngay_khoi_hanh' },
                                        { label: 'Trạng thái', field: 'trang_thai' },
                                        { label: 'Ghi chú', field: null },
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
                                {filtered.map(cx => {
                                    const tt = TRANG_THAI_CHUYEN[cx.trang_thai] || { label: cx.trang_thai, color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' }
                                    const isLocked = cx.trang_thai === 'hoan_thanh' || cx.trang_thai === 'huy'
                                    return (
                                        <tr key={cx.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg font-medium">{cx.ma_chuyen}</span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {cx.bien_so
                                                    ? <p className="font-medium text-slate-800">{cx.bien_so}</p>
                                                    : <span className="text-slate-400">—</span>}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {cx.ten_tai_xe ? (
                                                    <div>
                                                        <p className="font-medium text-slate-800">{cx.ten_tai_xe}</p>
                                                        {cx.sdt_tai_xe && <p className="text-xs text-slate-500">{cx.sdt_tai_xe}</p>}
                                                    </div>
                                                ) : <span className="text-slate-400">—</span>}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-slate-600 text-xs">{formatDate(cx.ngay_khoi_hanh)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${tt.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${tt.dot}`} />
                                                    {tt.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 max-w-[140px]">
                                                <span className="text-xs line-clamp-1">{cx.ghi_chu || '—'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => setDetailTarget(cx)}
                                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Xem đơn trong chuyến">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {!isLocked && (
                                                        <button onClick={() => { setEditData(cx); setModalOpen(true) }}
                                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Chỉnh sửa">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {!isLocked && (
                                                        <button onClick={() => setDeleteTarget(cx)}
                                                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Xóa">
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
                                <span>Hiển thị {filtered.length} / {data.length} chuyến</span>
                                <span>Cập nhật: {new Date().toLocaleTimeString('vi-VN')}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <ChuyenXeModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                editData={editData}
                xeList={xeList}
                taixeList={taixeList}
                donVCList={donVCList}
                onSaved={fetchData}
            />
            <DeleteModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} chuyen={deleteTarget} onDeleted={fetchData} />
            <DetailModal open={!!detailTarget} onClose={() => setDetailTarget(null)} chuyen={detailTarget} onStatusChanged={fetchData} />
        </div>
    )
}
