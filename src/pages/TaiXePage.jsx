import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
    User, Phone, Award, Clock, DollarSign, Plus, Pencil, Trash2,
    Loader2, CheckCircle2, AlertCircle, X, Search, Car, TrendingUp,
    AlertTriangle, Wallet, ChevronDown, ChevronUp, Route, BarChart2,
    FileText, RefreshCw
} from 'lucide-react'

const HANG_BANG = ['A1', 'A2', 'B1', 'B2', 'C', 'D', 'E', 'F']
const TINH_TRANG = {
    hoat_dong: { label: 'Đang làm việc', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    nghi: { label: 'Nghỉ việc', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}
const LOAI_LUONG = {
    co_dinh: { label: 'Cố định + Thưởng', icon: '💰', desc: 'Lương cơ bản + phụ cấp theo chuyến + thưởng cố định' },
    theo_km: { label: 'Tiền/km', icon: '🛣️', desc: 'Tính theo số km thực tế chạy trong tháng' },
    theo_doanh_thu: { label: '% Doanh thu', icon: '📊', desc: 'Hoa hồng theo % doanh thu chuyến xe' },
}
const LOAI_TU = {
    tam_ung: { label: 'Tạm ứng', color: 'bg-orange-100 text-orange-700', sign: '+' },
    quyet_toan: { label: 'Quyết toán', color: 'bg-blue-100 text-blue-700', sign: '-' },
    thanh_toan: { label: 'Thanh toán lương', color: 'bg-green-100 text-green-700', sign: '-' },
}

const fmt = (n) => Number(n || 0).toLocaleString('vi-VN') + ' ₫'
const num = (v) => Number(v) || 0

const EMPTY = {
    ho_ten: '', sdt: '', hang_bang: 'B2', kinh_nghiem: 0,
    loai_luong: 'co_dinh',
    luong_co_ban: 0, phu_cap_chuyen: 0, thuong_co_dinh: 0,
    tien_per_km: 0, ti_le_doanh_thu: 0,
    trang_thai: 'hoat_dong', vi_pham: '', ghi_chu: ''
}

// ─── Modal thêm/sửa tài xế ────────────────────────────────────────────────────
function TaiXeModal({ open, onClose, editData, onSaved }) {
    const [form, setForm] = useState(EMPTY)
    const [saving, setSaving] = useState(false)
    const [tab, setTab] = useState('info')

    useEffect(() => { if (open) { setForm(editData ? { ...EMPTY, ...editData } : EMPTY); setTab('info') } }, [open, editData])
    const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
    const fn = (k) => (e) => setForm(p => ({ ...p, [k]: Number(e.target.value) || 0 }))

    const handleSave = async () => {
        if (!form.ho_ten.trim()) return
        setSaving(true)
        const payload = {
            ho_ten: form.ho_ten.trim(), sdt: form.sdt,
            hang_bang: form.hang_bang, kinh_nghiem: num(form.kinh_nghiem),
            loai_luong: form.loai_luong,
            luong_co_ban: num(form.luong_co_ban),
            phu_cap_chuyen: num(form.phu_cap_chuyen),
            thuong_co_dinh: num(form.thuong_co_dinh),
            tien_per_km: num(form.tien_per_km),
            ti_le_doanh_thu: num(form.ti_le_doanh_thu),
            trang_thai: form.trang_thai,
            vi_pham: form.vi_pham || null,
            ghi_chu: form.ghi_chu || null,
            updated_at: new Date().toISOString()
        }
        if (editData?.id) {
            await supabase.from('tai_xe').update(payload).eq('id', editData.id)
        } else {
            await supabase.from('tai_xe').insert(payload)
        }
        setSaving(false); onSaved(); onClose()
    }

    if (!open) return null
    return (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 rounded-xl p-2">
                            <Car className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg">
                            {editData ? 'Sửa thông tin tài xế' : 'Thêm tài xế mới'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                    {[['info', 'Thông tin'], ['luong', 'Chế độ lương'], ['khac', 'Khác']].map(([k, l]) => (
                        <button key={k} onClick={() => setTab(k)}
                            className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 ${tab === k ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            {l}
                        </button>
                    ))}
                </div>

                <div className="p-6 space-y-4">
                    {/* Tab: Thông tin cơ bản */}
                    {tab === 'info' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Họ và tên *</label>
                                <input value={form.ho_ten} onChange={f('ho_ten')} placeholder="Nguyễn Văn A"
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Số điện thoại</label>
                                <input value={form.sdt} onChange={f('sdt')} placeholder="0901234567"
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Hạng bằng lái</label>
                                <select value={form.hang_bang} onChange={f('hang_bang')}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    {HANG_BANG.map(h => <option key={h}>{h}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Kinh nghiệm (năm)</label>
                                <input type="number" min={0} value={form.kinh_nghiem} onChange={fn('kinh_nghiem')}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Tình trạng</label>
                                <select value={form.trang_thai} onChange={f('trang_thai')}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    {Object.entries(TINH_TRANG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Tab: Chế độ lương */}
                    {tab === 'luong' && (
                        <div className="space-y-4">
                            {/* Chọn loại lương */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-2 block">Hình thức tính lương</label>
                                <div className="space-y-2">
                                    {Object.entries(LOAI_LUONG).map(([k, v]) => (
                                        <button key={k} onClick={() => setForm(p => ({ ...p, loai_luong: k }))}
                                            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${form.loai_luong === k ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{v.icon}</span>
                                                <div>
                                                    <p className={`text-sm font-semibold ${form.loai_luong === k ? 'text-indigo-700' : 'text-slate-700'}`}>{v.label}</p>
                                                    <p className="text-xs text-slate-500">{v.desc}</p>
                                                </div>
                                                {form.loai_luong === k && <CheckCircle2 className="w-4 h-4 text-indigo-500 ml-auto" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Thông số theo loại lương */}
                            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                {/* Luôn có lương cơ bản */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Lương cơ bản (₫/tháng)</label>
                                    <input type="number" min={0} value={form.luong_co_ban} onChange={fn('luong_co_ban')}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>

                                {form.loai_luong === 'co_dinh' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 mb-1 block">Phụ cấp/chuyến (₫)</label>
                                            <input type="number" min={0} value={form.phu_cap_chuyen} onChange={fn('phu_cap_chuyen')}
                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 mb-1 block">Thưởng cố định/tháng (₫)</label>
                                            <input type="number" min={0} value={form.thuong_co_dinh} onChange={fn('thuong_co_dinh')}
                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                    </div>
                                )}

                                {form.loai_luong === 'theo_km' && (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Đơn giá/km (₫)</label>
                                        <input type="number" min={0} value={form.tien_per_km} onChange={fn('tien_per_km')}
                                            placeholder="VD: 3000"
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                        <p className="text-xs text-slate-400 mt-1">Tổng lương = Lương CB + (Đơn giá × Tổng km/tháng)</p>
                                    </div>
                                )}

                                {form.loai_luong === 'theo_doanh_thu' && (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Tỷ lệ hoa hồng (%)</label>
                                        <input type="number" min={0} max={100} step={0.5} value={form.ti_le_doanh_thu} onChange={fn('ti_le_doanh_thu')}
                                            placeholder="VD: 5"
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                        <p className="text-xs text-slate-400 mt-1">Tổng lương = Lương CB + (% × Doanh thu chuyến/tháng)</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab: Khác */}
                    {tab === 'khac' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Vi phạm (nếu có)</label>
                                <textarea value={form.vi_pham || ''} onChange={f('vi_pham')} rows={3}
                                    placeholder="Ghi chú các vi phạm, lỗi giao thông..."
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Ghi chú</label>
                                <textarea value={form.ghi_chu || ''} onChange={f('ghi_chu')} rows={3}
                                    placeholder="Thông tin bổ sung..."
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 px-6 pb-6">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                    <button onClick={handleSave} disabled={saving || !form.ho_ten.trim()}
                        className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        {editData ? 'Cập nhật' : 'Thêm tài xế'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Modal chi tiết + tạm ứng ─────────────────────────────────────────────────
function TaiXeDetailModal({ open, onClose, taiXe, chuyenList, onRefresh }) {
    const [tamUngList, setTamUngList] = useState([])
    const [addForm, setAddForm] = useState({ loai: 'tam_ung', so_tien: '', ghi_chu: '', ngay: new Date().toISOString().slice(0, 10) })
    const [saving, setSaving] = useState(false)
    const [loadingTU, setLoadingTU] = useState(false)

    const fetchTamUng = useCallback(async () => {
        if (!taiXe?.id) return
        setLoadingTU(true)
        const { data } = await supabase.from('tai_xe_tam_ung').select('*').eq('tai_xe_id', taiXe.id).order('ngay', { ascending: false })
        setTamUngList(data || [])
        setLoadingTU(false)
    }, [taiXe?.id])

    useEffect(() => { if (open) fetchTamUng() }, [open, fetchTamUng])

    const handleAddTamUng = async () => {
        if (!addForm.so_tien || !taiXe?.id) return
        setSaving(true)
        const payload = { tai_xe_id: taiXe.id, loai: addForm.loai, so_tien: num(addForm.so_tien), ghi_chu: addForm.ghi_chu || null, ngay: addForm.ngay }
        await supabase.from('tai_xe_tam_ung').insert(payload)
        // Cập nhật tam_ung trên tai_xe
        const delta = addForm.loai === 'tam_ung' ? num(addForm.so_tien) : -num(addForm.so_tien)
        const newTamUng = Math.max(0, num(taiXe.tam_ung) + delta)
        await supabase.from('tai_xe').update({ tam_ung: newTamUng, updated_at: new Date().toISOString() }).eq('id', taiXe.id)
        setAddForm({ loai: 'tam_ung', so_tien: '', ghi_chu: '', ngay: new Date().toISOString().slice(0, 10) })
        setSaving(false); fetchTamUng(); onRefresh()
    }

    if (!open || !taiXe) return null

    // Thống kê chuyến tháng này
    const now = new Date()
    const thangNay = chuyenList.filter(c => {
        const d = new Date(c.created_at || c.ngay_khoi_hanh)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const soChuyenThang = thangNay.length
    const tongKmThang = thangNay.reduce((s, c) => s + num(c.tong_km || 0), 0)
    const tongDoanhThuThang = thangNay.reduce((s, c) => {
        const dons = c.don_van_chuyen || []
        return s + dons.reduce((a, d) => a + num(d.tong_tien), 0)
    }, 0)

    // Tính lương ước tính
    let luongUocTinh = num(taiXe.luong_co_ban)
    if (taiXe.loai_luong === 'co_dinh') {
        luongUocTinh += num(taiXe.phu_cap_chuyen) * soChuyenThang + num(taiXe.thuong_co_dinh)
    } else if (taiXe.loai_luong === 'theo_km') {
        luongUocTinh += num(taiXe.tien_per_km) * tongKmThang
    } else if (taiXe.loai_luong === 'theo_doanh_thu') {
        luongUocTinh += tongDoanhThuThang * (num(taiXe.ti_le_doanh_thu) / 100)
    }
    const luongThucNhan = luongUocTinh - num(taiXe.tam_ung)

    return (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 rounded-xl p-2.5">
                                <Car className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl">{taiXe.ho_ten}</h3>
                                <p className="text-indigo-200 text-sm">{taiXe.sdt} · Bằng {taiXe.hang_bang} · {taiXe.kinh_nghiem} năm KN</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                    {/* Stats tháng */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                        {[
                            { icon: Route, label: 'Chuyến tháng này', value: soChuyenThang },
                            { icon: TrendingUp, label: 'Tổng km', value: tongKmThang.toLocaleString('vi-VN') + ' km' },
                            { icon: DollarSign, label: 'Doanh thu', value: (tongDoanhThuThang / 1e6).toFixed(1) + ' tr₫' },
                        ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="bg-white/15 rounded-xl p-3">
                                <Icon className="w-4 h-4 mb-1 text-indigo-200" />
                                <p className="text-xl font-bold">{value}</p>
                                <p className="text-xs text-indigo-200">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-5 space-y-5">
                    {/* Lương ước tính */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                            <BarChart2 className="w-3.5 h-3.5" /> Lương ước tính tháng này
                        </p>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                            <div className="bg-white rounded-xl p-3 text-center">
                                <p className="text-xs text-slate-500 mb-1">Lương CB</p>
                                <p className="font-bold text-slate-800">{fmt(taiXe.luong_co_ban)}</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center">
                                <p className="text-xs text-slate-500 mb-1">
                                    {taiXe.loai_luong === 'co_dinh' ? 'Phụ cấp + Thưởng' :
                                        taiXe.loai_luong === 'theo_km' ? `${num(taiXe.tien_per_km).toLocaleString()}₫/km` :
                                            `${num(taiXe.ti_le_doanh_thu)}% DT`}
                                </p>
                                <p className="font-bold text-green-700">{fmt(luongUocTinh - num(taiXe.luong_co_ban))}</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center">
                                <p className="text-xs text-slate-500 mb-1">Thực nhận (trừ tạm ứng)</p>
                                <p className={`font-bold text-lg ${luongThucNhan >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>{fmt(luongThucNhan)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Vi phạm */}
                    {taiXe.vi_pham && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-red-600 mb-0.5">Vi phạm đã ghi nhận</p>
                                <p className="text-sm text-red-700">{taiXe.vi_pham}</p>
                            </div>
                        </div>
                    )}

                    {/* Tạm ứng hiện tại */}
                    <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-semibold text-orange-700">Tạm ứng đang treo:</span>
                        </div>
                        <span className="text-lg font-bold text-orange-700">{fmt(taiXe.tam_ung)}</span>
                    </div>

                    {/* Thêm tạm ứng / quyết toán */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5" /> Thêm giao dịch
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Loại</label>
                                <select value={addForm.loai} onChange={e => setAddForm(p => ({ ...p, loai: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    {Object.entries(LOAI_TU).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Số tiền (₫)</label>
                                <input type="number" min={0} value={addForm.so_tien} onChange={e => setAddForm(p => ({ ...p, so_tien: e.target.value }))}
                                    placeholder="0"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Ngày</label>
                                <input type="date" value={addForm.ngay} onChange={e => setAddForm(p => ({ ...p, ngay: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Ghi chú</label>
                                <input value={addForm.ghi_chu} onChange={e => setAddForm(p => ({ ...p, ghi_chu: e.target.value }))}
                                    placeholder="Lý do..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>
                        <button onClick={handleAddTamUng} disabled={saving || !addForm.so_tien}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Ghi nhận giao dịch
                        </button>
                    </div>

                    {/* Lịch sử tạm ứng */}
                    {loadingTU ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                    ) : tamUngList.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" /> Lịch sử giao dịch
                            </p>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {tamUngList.map(tu => {
                                    const info = LOAI_TU[tu.loai] || LOAI_TU.tam_ung
                                    return (
                                        <div key={tu.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${info.color}`}>{info.label}</span>
                                                <span className="text-slate-500 text-xs">{tu.ngay}</span>
                                                {tu.ghi_chu && <span className="text-slate-400 text-xs">· {tu.ghi_chu}</span>}
                                            </div>
                                            <span className={`font-bold ${info.sign === '+' ? 'text-orange-600' : 'text-green-600'}`}>
                                                {info.sign}{num(tu.so_tien).toLocaleString('vi-VN')}₫
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TaiXePage() {
    const [list, setList] = useState([])
    const [chuyenList, setChuyenList] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState({ open: false, data: null })
    const [detailTx, setDetailTx] = useState(null)
    const [deleteItem, setDeleteItem] = useState(null)
    const [search, setSearch] = useState('')
    const [filterTT, setFilterTT] = useState('all')
    const [toast, setToast] = useState(null)

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

    const fetchAll = useCallback(async () => {
        setLoading(true)
        const [{ data: txData }, { data: cxData }] = await Promise.all([
            supabase.from('tai_xe').select('*').order('created_at', { ascending: false }),
            supabase.from('chuyen_xe').select('*').order('created_at', { ascending: false }),
        ])
        setList(txData || [])
        setChuyenList(cxData || [])
        setLoading(false)
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])

    const handleDelete = async () => {
        if (!deleteItem) return
        await supabase.from('tai_xe').delete().eq('id', deleteItem.id)
        showToast('success', `Đã xóa tài xế ${deleteItem.ho_ten}`)
        setDeleteItem(null); fetchAll()
    }

    const filtered = list.filter(x => {
        const q = search.toLowerCase()
        const matchQ = !q || x.ho_ten?.toLowerCase().includes(q) || x.sdt?.includes(q)
        const matchTT = filterTT === 'all' || x.trang_thai === filterTT
        return matchQ && matchTT
    })

    const stats = [
        { label: 'Tổng tài xế', value: list.length, color: 'indigo', icon: User },
        { label: 'Đang làm việc', value: list.filter(x => x.trang_thai === 'hoat_dong').length, color: 'emerald', icon: CheckCircle2 },
        { label: 'Nghỉ việc', value: list.filter(x => x.trang_thai === 'nghi').length, color: 'red', icon: AlertCircle },
        { label: 'Đang chạy chuyến', value: chuyenList.filter(c => c.trang_thai === 'dang_giao').length, color: 'blue', icon: Route },
    ]

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-2.5 shadow-lg shadow-indigo-200">
                        <Car className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Quản lý Tài xế</h2>
                        <p className="text-slate-500 text-sm">Thông tin, lương thưởng & theo dõi lái xe vận tải</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchAll} className="p-2.5 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 text-slate-400">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={() => setModal({ open: true, data: null })}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm shadow-indigo-200 transition-all">
                        <Plus className="w-4 h-4" /> Thêm tài xế
                    </button>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${toast.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    {toast.msg}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {stats.map(s => (
                    <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className={`bg-${s.color}-100 rounded-xl p-2.5`}>
                            <s.icon className={`w-5 h-5 text-${s.color}-600`} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                            <p className="text-xs text-slate-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên, SĐT..."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <select value={filterTT} onChange={e => setFilterTT(e.target.value)}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="all">Tất cả tình trạng</option>
                    {Object.entries(TINH_TRANG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">Chưa có tài xế nào</p>
                        <button onClick={() => setModal({ open: true, data: null })}
                            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium">
                            + Thêm tài xế đầu tiên
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {['Tài xế', 'Liên hệ', 'Bằng lái', 'Hình thức lương', 'Lương CB', 'Tạm ứng', 'Tình trạng', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(tx => {
                                    const tt = TINH_TRANG[tx.trang_thai] || TINH_TRANG.hoat_dong
                                    const ll = LOAI_LUONG[tx.loai_luong] || LOAI_LUONG.co_dinh
                                    const chuyenTx = chuyenList.filter(c => c.tai_xe_id === tx.id)
                                    return (
                                        <tr key={tx.id} className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                                            onClick={() => setDetailTx(tx)}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                                                        <span className="text-sm font-bold text-indigo-600">{tx.ho_ten.charAt(0)}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{tx.ho_ten}</p>
                                                        <p className="text-xs text-slate-400">{tx.kinh_nghiem} năm KN · {chuyenTx.length} chuyến</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 text-slate-600">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                    {tx.sdt || '—'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">{tx.hang_bang}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-slate-600">{ll.icon} {ll.label}</span>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-700">{fmt(tx.luong_co_ban)}</td>
                                            <td className="px-4 py-3">
                                                {num(tx.tam_ung) > 0
                                                    ? <span className="text-orange-600 font-semibold text-xs bg-orange-50 px-2 py-1 rounded-lg">{fmt(tx.tam_ung)}</span>
                                                    : <span className="text-slate-400 text-xs">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${tt.dot}`} />
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tt.color}`}>{tt.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                <div className="flex gap-1">
                                                    <button onClick={() => setDetailTx(tx)}
                                                        className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-400 transition-all text-xs" title="Xem chi tiết">
                                                        <BarChart2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => setModal({ open: true, data: tx })}
                                                        className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-all">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => setDeleteItem(tx)}
                                                        className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            <TaiXeModal open={modal.open} onClose={() => setModal({ open: false, data: null })} editData={modal.data}
                onSaved={() => { fetchAll(); showToast('success', 'Đã lưu thông tin tài xế!') }} />

            <TaiXeDetailModal open={!!detailTx} onClose={() => setDetailTx(null)} taiXe={detailTx}
                chuyenList={chuyenList.filter(c => c.tai_xe_id === detailTx?.id)}
                onRefresh={fetchAll} />

            {/* Delete confirm */}
            {deleteItem && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 rounded-xl p-2.5"><AlertCircle className="w-5 h-5 text-red-600" /></div>
                            <div>
                                <p className="font-semibold text-slate-800">Xóa tài xế {deleteItem.ho_ten}?</p>
                                <p className="text-sm text-slate-500">Lịch sử tạm ứng sẽ bị xóa theo.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteItem(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium">Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
