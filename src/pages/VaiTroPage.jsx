import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    Shield, Plus, Pencil, Trash2, X, Check, Loader2,
    AlertCircle, CheckCircle2, Lock, Users, ChevronUp, ChevronDown
} from 'lucide-react'

// ─── Màu sắc badge theo mau_sac ───────────────────────────────────────────────
const MAU_OPTIONS = [
    { value: 'purple', label: 'Tím', cls: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
    { value: 'blue', label: 'Xanh dương', cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    { value: 'indigo', label: 'Chàm', cls: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
    { value: 'emerald', label: 'Xanh lá', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    { value: 'orange', label: 'Cam', cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
    { value: 'red', label: 'Đỏ', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    { value: 'slate', label: 'Xám', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
]

const CAP_BAC_LABELS = { 1: 'Teller', 2: 'Supervisor', 3: 'Manager', 4: 'Admin' }
const CAP_BAC_COLORS = {
    1: 'bg-slate-400 text-white',
    2: 'bg-indigo-500 text-white',
    3: 'bg-blue-600 text-white',
    4: 'bg-purple-600 text-white',
}

function getMau(val) { return MAU_OPTIONS.find(m => m.value === val) || MAU_OPTIONS[6] }

// ─── Modal Thêm/Sửa ───────────────────────────────────────────────────────────
function VaiTroModal({ open, onClose, editData, onSaved }) {
    const empty = { key: '', ten_vai_tro: '', mo_ta: '', cap_bac: 1, mau_sac: 'slate' }
    const [form, setForm] = useState(empty)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => { if (open) { setForm(editData || empty); setError('') } }, [open, editData])
    if (!open) return null

    const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }))

    const handleSave = async () => {
        if (!form.key?.trim()) { setError('Role Key không được để trống'); return }
        if (!form.ten_vai_tro?.trim()) { setError('Tên vai trò không được để trống'); return }
        // Validate key format: lowercase, underscore only
        if (!/^[a-z][a-z0-9_]*$/.test(form.key.trim())) {
            setError('Role Key chỉ dùng chữ thường, số và dấu _ (bắt đầu bằng chữ)')
            return
        }
        setSaving(true)
        const payload = {
            key: form.key.trim().toLowerCase(),
            ten_vai_tro: form.ten_vai_tro.trim(),
            mo_ta: form.mo_ta?.trim() || null,
            cap_bac: parseInt(form.cap_bac),
            mau_sac: form.mau_sac,
        }
        const { error: e } = editData
            ? await supabase.from('vai_tro').update(payload).eq('id', editData.id)
            : await supabase.from('vai_tro').insert([{ ...payload, la_he_thong: false }])
        if (e) {
            setError(e.code === '23505' ? 'Role Key đã tồn tại!' : e.message)
        } else { onSaved(); onClose() }
        setSaving(false)
    }

    const mauCurrent = getMau(form.mau_sac)

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">{editData ? 'Sửa vai trò' : 'Thêm vai trò mới'}</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />{error}
                        </div>
                    )}

                    {/* Role Key */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Role Key <span className="text-red-500">*</span>
                            <span className="ml-2 text-xs text-slate-400 font-normal">dùng trong hệ thống, không thể đổi sau khi tạo</span>
                        </label>
                        <input
                            value={form.key}
                            onChange={e => f('key')(e.target.value)}
                            disabled={!!editData}
                            placeholder="vd: truong_nhom, nhan_vien_moi"
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* Tên vai trò */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên vai trò <span className="text-red-500">*</span></label>
                        <input
                            value={form.ten_vai_tro}
                            onChange={e => f('ten_vai_tro')(e.target.value)}
                            placeholder="vd: Trưởng nhóm"
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Mô tả */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Mô tả</label>
                        <textarea
                            value={form.mo_ta ?? ''}
                            onChange={e => f('mo_ta')(e.target.value)}
                            rows={2}
                            placeholder="Mô tả chức năng và quyền hạn của vai trò này..."
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Cấp bậc */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Cấp bậc</label>
                            <select value={form.cap_bac} onChange={e => f('cap_bac')(e.target.value)}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                {Object.entries(CAP_BAC_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{k} — {v}</option>
                                ))}
                            </select>
                        </div>

                        {/* Màu sắc */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Màu badge</label>
                            <select value={form.mau_sac} onChange={e => f('mau_sac')(e.target.value)}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                {MAU_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Preview badge */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500">Preview:</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${mauCurrent.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${mauCurrent.dot}`} />
                            {form.ten_vai_tro || 'Tên vai trò'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ${CAP_BAC_COLORS[form.cap_bac]}`}>
                            {CAP_BAC_LABELS[form.cap_bac]}
                        </span>
                    </div>
                </div>

                <div className="flex gap-3 p-6 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {saving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Modal Xác nhận xóa ──────────────────────────────────────────────────────
function DeleteModal({ open, target, onClose, onDeleted }) {
    const [loading, setLoading] = useState(false)
    if (!open || !target) return null

    const handleDelete = async () => {
        setLoading(true)
        await supabase.from('vai_tro').delete().eq('id', target.id)
        onDeleted()
        onClose()
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-start gap-3">
                    <div className="bg-red-100 rounded-xl p-2.5 flex-shrink-0"><Trash2 className="w-5 h-5 text-red-600" /></div>
                    <div>
                        <p className="font-semibold text-slate-800">Xóa vai trò "{target.ten_vai_tro}"?</p>
                        <p className="text-sm text-slate-500 mt-1">Nhân viên đang có vai trò này sẽ bị ảnh hưởng. Hành động này không thể hoàn tác.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                    <button onClick={handleDelete} disabled={loading}
                        className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}Xóa
                    </button>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANG CHÍNH
// ═══════════════════════════════════════════════════════════════════════════════
export default function VaiTroPage() {
    const { role: myRole } = useAuth()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState({ open: false, data: null })
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [toast, setToast] = useState(null)
    const [sortField, setSortField] = useState('cap_bac')
    const [sortDir, setSortDir] = useState('desc')

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

    const fetchData = useCallback(async () => {
        setLoading(true)
        const { data: rows } = await supabase.from('vai_tro').select('*').order(sortField, { ascending: sortDir === 'asc' })
        setData(rows || [])
        setLoading(false)
    }, [sortField, sortDir])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDir('asc') }
    }

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ChevronUp className="w-3 h-3 text-slate-300" />
        return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
    }

    if (myRole !== 'admin') {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Bạn không có quyền truy cập trang này</p>
                </div>
            </div>
        )
    }

    const systemCount = data.filter(r => r.la_he_thong).length
    const customCount = data.filter(r => !r.la_he_thong).length

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 rounded-xl p-2.5"><Shield className="w-6 h-6 text-indigo-600" /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Quản lý Vai trò</h2>
                        <p className="text-slate-500 text-sm">Định nghĩa các vai trò/chức danh trong hệ thống</p>
                    </div>
                </div>
                <button onClick={() => setModal({ open: true, data: null })}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm">
                    <Plus className="w-4 h-4" />Thêm vai trò
                </button>
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
                {[
                    { label: 'Tổng vai trò', value: data.length, icon: Shield, color: 'indigo' },
                    { label: 'Vai trò hệ thống', value: systemCount, icon: Lock, color: 'slate' },
                    { label: 'Vai trò tuỳ chỉnh', value: customCount, icon: Users, color: 'blue' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`bg-${s.color}-100 rounded-xl p-2.5`}><s.icon className={`w-5 h-5 text-${s.color}-600`} /></div>
                            <div><p className="text-2xl font-bold text-slate-800">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {[
                                        { label: 'Vai trò', field: 'ten_vai_tro' },
                                        { label: 'Role Key', field: 'key' },
                                        { label: 'Cấp bậc', field: 'cap_bac' },
                                        { label: 'Mô tả', field: 'mo_ta' },
                                        { label: 'Loại', field: 'la_he_thong' },
                                    ].map(col => (
                                        <th key={col.field} onClick={() => handleSort(col.field)}
                                            className="px-4 py-3 text-left text-xs font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-800 transition-colors">
                                            <div className="flex items-center gap-1">{col.label}<SortIcon field={col.field} /></div>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.map(vt => {
                                    const mau = getMau(vt.mau_sac)
                                    return (
                                        <tr key={vt.id} className="hover:bg-slate-50/70 transition-colors group">
                                            {/* Tên vai trò */}
                                            <td className="px-4 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${mau.cls}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${mau.dot}`} />
                                                    {vt.ten_vai_tro}
                                                </span>
                                            </td>
                                            {/* Key */}
                                            <td className="px-4 py-3.5">
                                                <code className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg font-mono">{vt.key}</code>
                                            </td>
                                            {/* Cấp bậc */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ${CAP_BAC_COLORS[vt.cap_bac]}`}>
                                                        {CAP_BAC_LABELS[vt.cap_bac]}
                                                    </span>
                                                    <span className="text-xs text-slate-400">Bậc {vt.cap_bac}</span>
                                                </div>
                                            </td>
                                            {/* Mô tả */}
                                            <td className="px-4 py-3.5 text-sm text-slate-500 max-w-xs truncate">{vt.mo_ta || '—'}</td>
                                            {/* Loại */}
                                            <td className="px-4 py-3.5">
                                                {vt.la_he_thong
                                                    ? <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg"><Lock className="w-3 h-3" />Hệ thống</span>
                                                    : <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg"><Users className="w-3 h-3" />Tuỳ chỉnh</span>
                                                }
                                            </td>
                                            {/* Actions */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setModal({ open: true, data: vt })}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Chỉnh sửa">
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    {!vt.la_he_thong && (
                                                        <button onClick={() => setDeleteTarget(vt)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Xóa">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {vt.la_he_thong && (
                                                        <span className="p-1.5 text-slate-300 cursor-not-allowed" title="Không thể xóa vai trò hệ thống">
                                                            <Lock className="w-4 h-4" />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {/* Footer */}
                        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Vai trò hệ thống không thể xóa — chỉ có thể sửa tên và mô tả
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <VaiTroModal
                open={modal.open}
                onClose={() => setModal({ open: false, data: null })}
                editData={modal.data}
                onSaved={() => { fetchData(); showToast('success', 'Đã lưu vai trò thành công!') }}
            />
            <DeleteModal
                open={!!deleteTarget}
                target={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onDeleted={() => { fetchData(); showToast('success', 'Đã xóa vai trò!') }}
            />
        </div>
    )
}
