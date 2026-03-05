import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
    User, Phone, Award, Clock, DollarSign, Plus, Pencil, Trash2,
    Loader2, CheckCircle2, AlertCircle, X, Search, Car
} from 'lucide-react'

const HANG_BANG = ['A1', 'A2', 'B1', 'B2', 'C', 'D', 'E', 'F']
const TINH_TRANG = {
    hoat_dong: { label: 'Đang làm việc', color: 'bg-emerald-100 text-emerald-700' },
    nghi: { label: 'Nghỉ việc', color: 'bg-red-100 text-red-700' },
}

const fmt = (n) => Number(n || 0).toLocaleString('vi-VN') + ' ₫'
const empty = { ho_ten: '', sdt: '', hang_bang: 'B2', kinh_nghiem: 0, luong_co_ban: 0, phu_cap_chuyen: 0, trang_thai: 'hoat_dong', ghi_chu: '' }

function TaiXeModal({ open, onClose, editData, onSaved }) {
    const [form, setForm] = useState(empty)
    const [saving, setSaving] = useState(false)

    useEffect(() => { if (open) setForm(editData || empty) }, [open, editData])
    const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

    const handleSave = async () => {
        if (!form.ho_ten.trim()) return
        setSaving(true)
        const payload = {
            ho_ten: form.ho_ten, sdt: form.sdt, hang_bang: form.hang_bang,
            kinh_nghiem: +form.kinh_nghiem || 0,
            luong_co_ban: +form.luong_co_ban || 0,
            phu_cap_chuyen: +form.phu_cap_chuyen || 0,
            trang_thai: form.trang_thai, ghi_chu: form.ghi_chu
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">{editData ? 'Sửa tài xế' : 'Thêm tài xế'}</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Họ và tên *</label>
                        <input value={form.ho_ten} onChange={f('ho_ten')} placeholder="Nguyễn Văn A"
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Số điện thoại</label>
                        <input value={form.sdt} onChange={f('sdt')} placeholder="0901234567"
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Hạng bằng lái</label>
                        <select value={form.hang_bang} onChange={f('hang_bang')}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {HANG_BANG.map(h => <option key={h}>{h}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Kinh nghiệm (năm)</label>
                        <input type="number" min={0} value={form.kinh_nghiem} onChange={f('kinh_nghiem')}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Tình trạng</label>
                        <select value={form.trang_thai} onChange={f('trang_thai')}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {Object.entries(TINH_TRANG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Lương cơ bản (₫/tháng)</label>
                        <input type="number" min={0} value={form.luong_co_ban} onChange={f('luong_co_ban')}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Phụ cấp theo chuyến (₫)</label>
                        <input type="number" min={0} value={form.phu_cap_chuyen} onChange={f('phu_cap_chuyen')}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Ghi chú</label>
                        <input value={form.ghi_chu} onChange={f('ghi_chu')} placeholder="Ghi chú thêm..."
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
                <div className="flex gap-3 px-6 pb-6">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                    <button onClick={handleSave} disabled={saving || !form.ho_ten.trim()}
                        className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        {editData ? 'Cập nhật' : 'Thêm tài xế'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function TaiXePage() {
    const [list, setList] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState({ open: false, data: null })
    const [deleteItem, setDeleteItem] = useState(null)
    const [search, setSearch] = useState('')
    const [toast, setToast] = useState(null)

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

    const fetchList = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase.from('tai_xe').select('*').order('created_at', { ascending: false })
        setList(data || [])
        setLoading(false)
    }, [])

    useEffect(() => { fetchList() }, [])

    const handleDelete = async () => {
        if (!deleteItem) return
        await supabase.from('tai_xe').delete().eq('id', deleteItem.id)
        showToast('success', `Đã xóa tài xế ${deleteItem.ho_ten}`)
        setDeleteItem(null); fetchList()
    }

    const filtered = list.filter(x => {
        const q = search.toLowerCase()
        return !q || x.ho_ten?.toLowerCase().includes(q) || x.sdt?.includes(q)
    })

    const stats = [
        { label: 'Tổng tài xế', value: list.length, color: 'blue' },
        { label: 'Đang làm việc', value: list.filter(x => x.trang_thai === 'hoat_dong').length, color: 'emerald' },
        { label: 'Nghỉ việc', value: list.filter(x => x.trang_thai === 'nghi').length, color: 'red' },
    ]

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-2.5 shadow-lg shadow-indigo-200">
                    <Car className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Quản lý Tài xế</h2>
                    <p className="text-slate-500 text-sm">Danh sách tài xế vận tải</p>
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
            <div className="grid grid-cols-3 gap-4">
                {stats.map(s => (
                    <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className={`bg-${s.color}-100 rounded-xl p-2.5`}>
                            <User className={`w-5 h-5 text-${s.color}-600`} />
                        </div>
                        <div><p className="text-2xl font-bold text-slate-800">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên, SĐT..."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={() => setModal({ open: true, data: null })}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">
                    <Plus className="w-4 h-4" />Thêm tài xế
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">Chưa có tài xế nào</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {['Họ tên', 'SĐT', 'Hạng bằng', 'Kinh nghiệm', 'Lương CB', 'Phụ cấp/chuyến', 'Tình trạng', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(tx => {
                                    const tt = TINH_TRANG[tx.trang_thai] || TINH_TRANG.hoat_dong
                                    return (
                                        <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-slate-800">{tx.ho_ten}</td>
                                            <td className="px-4 py-3 text-slate-600">{tx.sdt || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">{tx.hang_bang}</span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{tx.kinh_nghiem} năm</td>
                                            <td className="px-4 py-3 text-slate-700 font-medium">{fmt(tx.luong_co_ban)}</td>
                                            <td className="px-4 py-3 text-slate-700">{fmt(tx.phu_cap_chuyen)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tt.color}`}>{tt.label}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1">
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

            <TaiXeModal open={modal.open} onClose={() => setModal({ open: false, data: null })} editData={modal.data}
                onSaved={() => { fetchList(); showToast('success', 'Đã lưu thông tin tài xế!') }} />

            {/* Delete confirm */}
            {deleteItem && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 rounded-xl p-2.5"><AlertCircle className="w-5 h-5 text-red-600" /></div>
                            <div>
                                <p className="font-semibold text-slate-800">Xóa tài xế {deleteItem.ho_ten}?</p>
                                <p className="text-sm text-slate-500">Thao tác này không thể hoàn tác.</p>
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
