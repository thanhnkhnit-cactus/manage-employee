import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth, ROLE_LABELS } from '../contexts/AuthContext'
import * as XLSX from 'xlsx'
import {
    Plus, Search, Pencil, Trash2, Upload, X, Check,
    ChevronUp, ChevronDown, Users, UserCheck, UserX,
    FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Shield
} from 'lucide-react'

const ROLE_COLORS = {
    admin: 'bg-purple-100 text-purple-700',
    manager: 'bg-blue-100 text-blue-700',
    truong_phong_kinh_doanh: 'bg-indigo-100 text-indigo-700',
    ke_toan: 'bg-emerald-100 text-emerald-700',
    nhan_vien: 'bg-slate-100 text-slate-600',
    quan_ly_kho: 'bg-orange-100 text-orange-700',
}

// Map role key → Role tiếng Anh (Admin / Manager / Supervisor / Teller)
const ROLE_TO_EN = {
    admin: 'Admin',
    manager: 'Manager',
    ke_toan: 'Supervisor',
    truong_phong_kinh_doanh: 'Supervisor',
    quan_ly_kho: 'Supervisor',
    nhan_vien: 'Teller',
}

const ROLE_EN_COLORS = {
    Admin: 'bg-purple-600 text-white',
    Manager: 'bg-blue-600 text-white',
    Supervisor: 'bg-indigo-500 text-white',
    Teller: 'bg-slate-400 text-white',
}

// ─── Modal Form ──────────────────────────────────────────────────────────────────
const ALL_ROLES = [
    { value: 'nhan_vien', label: 'Nhân viên', level: 1 },
    { value: 'ke_toan', label: 'Kế toán', level: 2 },
    { value: 'quan_ly_kho', label: 'Quản lý kho', level: 2 },
    { value: 'truong_phong_kinh_doanh', label: 'Trưởng phòng KD', level: 2 },
    { value: 'manager', label: 'Quản lý', level: 3 },
    { value: 'admin', label: 'Quản trị viên', level: 4 },
]

function NhanVienModal({ open, onClose, editData, onSaved, isAdmin, myLevel = 4 }) {
    const [form, setForm] = useState({
        ma_nhan_vien: '', ho_ten: '', don_vi: '', ma_so_thue: '', so_cccd: '',
        da_nghi_viec: false, email: '', password: '', role: 'nhan_vien'
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Auto-generate mã nhân viên when opening add-new form
    useEffect(() => {
        if (editData) {
            setForm({
                ma_nhan_vien: editData.ma_nhan_vien || '',
                ho_ten: editData.ho_ten || '',
                don_vi: editData.don_vi || '',
                ma_so_thue: editData.ma_so_thue || '',
                so_cccd: editData.so_cccd || '',
                da_nghi_viec: editData.da_nghi_viec ?? false,
                email: editData.email || '',
                password: '',
                role: editData.role || 'nhan_vien',
            })
            setError('')
        } else if (open) {
            // Generate next mã NV
            supabase.from('nhan_vien').select('ma_nhan_vien').then(({ data: rows }) => {
                const nums = (rows || []).map(r => {
                    const m = r.ma_nhan_vien?.match(/^NV(\d+)$/i)
                    return m ? parseInt(m[1], 10) : 0
                })
                const next = (nums.length ? Math.max(...nums) : 0) + 1
                const nextCode = 'NV' + String(next).padStart(3, '0')
                setForm({ ma_nhan_vien: nextCode, ho_ten: '', don_vi: '', ma_so_thue: '', so_cccd: '', da_nghi_viec: false, email: '', password: '', role: 'nhan_vien' })
            })
            setError('')
        }
    }, [editData, open])

    if (!open) return null

    const handleSave = async () => {
        if (!form.ma_nhan_vien.trim()) return setError('Vui lòng nhập mã nhân viên')
        if (!form.ho_ten.trim()) return setError('Vui lòng nhập họ tên')
        if (!editData && form.email && !form.password) return setError('Vui lòng nhập mật khẩu cho tài khoản')

        // Kiểm tra tên không trùng
        let nameQuery = supabase.from('nhan_vien').select('id').ilike('ho_ten', form.ho_ten.trim())
        if (editData?.id) nameQuery = nameQuery.neq('id', editData.id)
        const { data: dupName } = await nameQuery.maybeSingle()
        if (dupName) return setError(`Tên "${form.ho_ten.trim()}" đã tồn tại. Vui lòng nhập tên khác.`)

        setSaving(true)
        setError('')

        let result
        if (editData?.id) {
            // Edit: chỉ cập nhật bảng nhan_vien, không đổi password
            result = await supabase.from('nhan_vien').update({
                ma_nhan_vien: form.ma_nhan_vien.trim(),
                ho_ten: form.ho_ten.trim(),
                don_vi: form.don_vi.trim(),
                ma_so_thue: form.ma_so_thue.trim(),
                so_cccd: form.so_cccd.trim(),
                da_nghi_viec: form.da_nghi_viec,
                email: form.email.trim() || null,
                role: form.role,
            }).eq('id', editData.id)
        } else {
            // Thêm mới: tạo auth account qua Edge Function (service role, không cần xác nhận email)
            let authUserId = null
            if (form.email.trim() && form.password) {
                const { data: { session } } = await supabase.auth.getSession()
                const res = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-auth-user`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token}`,
                            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                        },
                        body: JSON.stringify({
                            action: 'create',
                            email: form.email.trim(),
                            password: form.password,
                        }),
                    }
                )
                const json = await res.json()
                if (!res.ok || json.error) {
                    setError('Tạo tài khoản thất bại: ' + (json.error || res.statusText))
                    setSaving(false)
                    return
                }
                authUserId = json.user_id || null
            }
            result = await supabase.from('nhan_vien').insert([{
                ma_nhan_vien: form.ma_nhan_vien.trim(),
                ho_ten: form.ho_ten.trim(),
                don_vi: form.don_vi.trim(),
                ma_so_thue: form.ma_so_thue.trim(),
                so_cccd: form.so_cccd.trim(),
                da_nghi_viec: form.da_nghi_viec,
                email: form.email.trim() || null,
                role: form.role,
                mat_khau: form.password || null,
                ...(authUserId ? { user_id: authUserId } : {}),
            }])
        }

        if (result.error) {
            if (result.error.code === '23505') {
                setError('Mã nhân viên đã tồn tại. Vui lòng dùng mã khác.')
            } else {
                setError('Có lỗi xảy ra: ' + result.error.message)
            }
        } else {
            onSaved()
            onClose()
        }
        setSaving(false)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">
                        {editData ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Mã nhân viên <span className="text-red-500">*</span>
                            </label>
                            <input
                                value={form.ma_nhan_vien}
                                onChange={e => setForm({ ...form, ma_nhan_vien: e.target.value })}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                                placeholder="VD: NV001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Họ và tên <span className="text-red-500">*</span>
                            </label>
                            <input
                                value={form.ho_ten}
                                onChange={e => setForm({ ...form, ho_ten: e.target.value })}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                                placeholder="Nguyễn Văn A"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Đơn vị / Phòng ban</label>
                        <input
                            value={form.don_vi}
                            onChange={e => setForm({ ...form, don_vi: e.target.value })}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                            placeholder="VD: Phòng Kế toán"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã số thuế</label>
                            <input
                                value={form.ma_so_thue}
                                onChange={e => setForm({ ...form, ma_so_thue: e.target.value })}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                                placeholder="0123456789"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Số CCCD</label>
                            <input
                                value={form.so_cccd}
                                onChange={e => setForm({ ...form, so_cccd: e.target.value })}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                                placeholder="012345678901"
                            />
                        </div>
                    </div>

                    {/* Trạng thái nghỉ việc - chỉ admin mới đổi */}
                    <div className="flex items-center gap-3 pt-1">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.da_nghi_viec}
                                onChange={e => setForm({ ...form, da_nghi_viec: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                        </label>
                        <span className="text-sm font-medium text-slate-700">Đã nghỉ việc</span>
                    </div>

                    {/* Thông tin đăng nhập - chỉ admin mới đổi */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-indigo-500" />
                            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Tài khoản & Phân quyền</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email đăng nhập</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                                    placeholder="nhanvien@congty.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vai trò</label>
                                <select
                                    value={form.role}
                                    onChange={e => setForm({ ...form, role: e.target.value })}
                                    disabled={myLevel < 2}  // Teller không đổi được role
                                    className="w-full px-3 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {ALL_ROLES
                                        .filter(r => r.level <= myLevel)  // Chỉ hiện role ≤ cấp bậc của mình
                                        .map(r => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        </div>
                        {/* Mật khẩu – chỉ hiện khi thêm mới */}
                        {!editData && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Mật khẩu {form.email && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                                    placeholder="Tối thiểu 6 ký tự"
                                    autoComplete="new-password"
                                />
                            </div>
                        )}
                        <p className="text-xs text-indigo-500">💡 Nhập email + mật khẩu để tạo tài khoản đăng nhập cho nhân viên. Bỏ trống nếu chưa cần.</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all text-sm font-medium"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl transition-all text-sm font-medium flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {saving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteModal({ open, onClose, nhanVien, onDeleted }) {
    const [deleting, setDeleting] = useState(false)

    if (!open || !nhanVien) return null

    const handleDelete = async () => {
        setDeleting(true)
        const { error } = await supabase.from('nhan_vien').delete().eq('id', nhanVien.id)
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
                        Bạn có chắc muốn xóa nhân viên <strong className="text-slate-700">{nhanVien.ho_ten}</strong>?
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

// ─── Import Modal ──────────────────────────────────────────────────────────────
function ImportModal({ open, onClose, onImported }) {
    const [importing, setImporting] = useState(false)
    const [preview, setPreview] = useState([])
    const [importResult, setImportResult] = useState(null)
    const fileRef = useRef()

    if (!open) return null

    const handleFile = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target.result, { type: 'binary' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
            setPreview(data.slice(0, 5))
            setImportResult(null)
        }
        reader.readAsBinaryString(file)
    }

    const handleImport = async () => {
        const file = fileRef.current.files[0]
        if (!file) return
        setImporting(true)

        const reader = new FileReader()
        reader.onload = async (evt) => {
            const wb = XLSX.read(evt.target.result, { type: 'binary' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const data = XLSX.utils.sheet_to_json(ws, { defval: '' })

            const rows = data.map(row => ({
                ma_nhan_vien: String(row['MaNV'] || row['ma_nhan_vien'] || '').trim(),
                ho_ten: String(row['HoTen'] || row['ho_ten'] || '').trim(),
                don_vi: String(row['DonVi'] || row['don_vi'] || '').trim(),
                ma_so_thue: String(row['MaSoThue'] || row['ma_so_thue'] || '').trim(),
                so_cccd: String(row['SoCCCD'] || row['so_cccd'] || '').trim(),
                da_nghi_viec: false,
            })).filter(r => r.ma_nhan_vien && r.ho_ten)

            if (rows.length === 0) {
                setImportResult({ success: false, message: 'Không tìm thấy dữ liệu hợp lệ. Kiểm tra cột: MaNV, HoTen' })
                setImporting(false)
                return
            }

            const { error } = await supabase.from('nhan_vien').upsert(rows, { onConflict: 'ma_nhan_vien' })

            if (error) {
                setImportResult({ success: false, message: 'Lỗi: ' + error.message })
            } else {
                setImportResult({ success: true, message: `Đã import thành công ${rows.length} nhân viên!` })
                onImported()
            }
            setImporting(false)
        }
        reader.readAsBinaryString(file)
    }

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { MaNV: 'NV001', HoTen: 'Nguyễn Văn A', DonVi: 'Phòng Kế toán', MaSoThue: '0123456789', SoCCCD: '012345678901' },
            { MaNV: 'NV002', HoTen: 'Trần Thị B', DonVi: 'Phòng Nhân sự', MaSoThue: '9876543210', SoCCCD: '098765432109' },
        ])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'DanhSachNV')
        XLSX.writeFile(wb, 'mau_import_nhan_vien.xlsx')
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 rounded-xl p-2">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Import từ Excel</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Hướng dẫn */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                        <p className="font-semibold mb-1">Định dạng file Excel:</p>
                        <p>Các cột cần có: <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">MaNV</code>, <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">HoTen</code>, <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">DonVi</code>, <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">MaSoThue</code>, <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">SoCCCD</code></p>
                        <button onClick={downloadTemplate} className="mt-2 text-blue-600 hover:text-blue-800 underline font-medium">
                            ⬇ Tải file mẫu
                        </button>
                    </div>

                    {/* Upload zone */}
                    <div
                        onClick={() => fileRef.current.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-8 text-center cursor-pointer transition-all group"
                    >
                        <Upload className="w-10 h-10 text-slate-300 group-hover:text-blue-400 mx-auto mb-3 transition-all" />
                        <p className="text-slate-500 group-hover:text-slate-700 font-medium transition-all">Nhấp để chọn file Excel</p>
                        <p className="text-slate-400 text-xs mt-1">.xlsx, .xls</p>
                        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
                    </div>

                    {/* Preview */}
                    {preview.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-slate-700 mb-2">Xem trước (5 dòng đầu):</p>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            {Object.keys(preview[0]).slice(0, 5).map(k => (
                                                <th key={k} className="px-3 py-2 text-left font-semibold text-slate-600 border-b border-slate-200">{k}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.map((row, i) => (
                                            <tr key={i} className="border-b border-slate-100 last:border-0">
                                                {Object.values(row).slice(0, 5).map((v, j) => (
                                                    <td key={j} className="px-3 py-2 text-slate-600">{String(v)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {importResult && (
                        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${importResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {importResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                            {importResult.message}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 p-6 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all text-sm font-medium">
                        Đóng
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={importing || !fileRef.current?.files?.length}
                        className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl transition-all text-sm font-medium flex items-center justify-center gap-2"
                    >
                        {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {importing ? 'Đang import...' : 'Import'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function NhanVienPage() {
    const { role: myRole, employeeProfile } = useAuth()
    const isAdmin = myRole === 'admin' || myRole === null
    const myEmail = employeeProfile?.email || null
    const myId = employeeProfile?.id || null

    // Mapping: role key → role EN bậc
    // admin > manager > supervisor > teller
    const ROLE_LEVEL = {
        admin: 4,
        manager: 3,
        ke_toan: 2,
        truong_phong_kinh_doanh: 2,
        quan_ly_kho: 2,
        nhan_vien: 1,
    }

    const myLevel = ROLE_LEVEL[myRole] ?? 4  // null/undefined = admin

    // Trả về true nếu user hiện tại được phép XEM nhân viên này
    const canViewRow = (nv) => {
        if (myLevel >= 4) return true                   // Admin: thấy tất cả
        const nvLevel = ROLE_LEVEL[nv.role] ?? 1
        if (myLevel >= 3) return nvLevel <= 3           // Manager: thấy supervisor trở xuống + chính mình
        if (myLevel >= 2) return nvLevel <= 1 || nv.id === myId  // Supervisor: thấy teller + chính mình
        return nv.id === myId                            // Teller: chỉ thấy chính mình
    }

    // Trả về true nếu user hiện tại được phép SỬA nhân viên này
    const canEditRow = (nv) => {
        if (myLevel >= 4) return true                   // Admin: sửa tất cả
        const nvLevel = ROLE_LEVEL[nv.role] ?? 1
        if (myLevel >= 3) return nvLevel <= 3           // Manager: sửa supervisor + teller + chính mình
        if (myLevel >= 2) return nvLevel <= 1 || nv.id === myId  // Supervisor: sửa teller + chính mình
        return nv.id === myId                            // Teller: chỉ sửa chính mình
    }

    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterNghiViec, setFilterNghiViec] = useState('all')
    const [sortField, setSortField] = useState('ma_nhan_vien')
    const [sortDir, setSortDir] = useState('asc')
    const [modalOpen, setModalOpen] = useState(false)
    const [editData, setEditData] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [importOpen, setImportOpen] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        const { data: rows } = await supabase
            .from('nhan_vien')
            .select('*')
            .order(sortField, { ascending: sortDir === 'asc' })
        setData(rows || [])
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [sortField, sortDir])

    const filtered = data.filter(nv => {
        if (!canViewRow(nv)) return false                // RBAC: ẩn nhân viên không có quyền xem
        const q = search.toLowerCase()
        const matchSearch = !q || nv.ma_nhan_vien?.toLowerCase().includes(q) || nv.ho_ten?.toLowerCase().includes(q) || nv.don_vi?.toLowerCase().includes(q)
        const matchFilter = filterNghiViec === 'all' || (filterNghiViec === 'active' ? !nv.da_nghi_viec : nv.da_nghi_viec)
        return matchSearch && matchFilter
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

    const stats = {
        total: data.length,
        active: data.filter(d => !d.da_nghi_viec).length,
        resigned: data.filter(d => d.da_nghi_viec).length,
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Quản lý Nhân viên</h2>
                <p className="text-slate-500 text-sm mt-1">Quản lý danh sách nhân viên trong công ty</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 rounded-xl p-2.5">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                            <p className="text-xs text-slate-500">Tổng nhân viên</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 rounded-xl p-2.5">
                            <UserCheck className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.active}</p>
                            <p className="text-xs text-slate-500">Đang làm việc</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 rounded-xl p-2.5">
                            <UserX className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.resigned}</p>
                            <p className="text-xs text-slate-500">Đã nghỉ việc</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Tìm kiếm nhân viên..."
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                        />
                    </div>

                    {/* Filter */}
                    <select
                        value={filterNghiViec}
                        onChange={e => setFilterNghiViec(e.target.value)}
                        className="px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-slate-700 transition-all"
                    >
                        <option value="all">Tất cả</option>
                        <option value="active">Đang làm việc</option>
                        <option value="resigned">Đã nghỉ việc</option>
                    </select>

                    {/* Buttons - chỉ admin mới thấy */}
                    {isAdmin && (
                        <button
                            onClick={() => setImportOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-all"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Import Excel</span>
                        </button>
                    )}

                    {isAdmin && (
                        <button
                            onClick={() => { setEditData(null); setModalOpen(true) }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Thêm mới</span>
                        </button>
                    )}
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
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Không có nhân viên nào</p>
                        <p className="text-slate-400 text-sm">Thêm mới hoặc import từ Excel</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {[
                                        { label: 'Mã NV', field: 'ma_nhan_vien' },
                                        { label: 'Họ và tên', field: 'ho_ten' },
                                        { label: 'Đơn vị', field: 'don_vi' },
                                        { label: 'Mã số thuế', field: 'ma_so_thue' },
                                        { label: 'CCCD', field: 'so_cccd' },
                                        { label: 'Trạng thái', field: 'da_nghi_viec' },
                                    ].map(col => (
                                        <th
                                            key={col.field}
                                            onClick={() => handleSort(col.field)}
                                            className="px-4 py-3 text-left text-xs font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-800 transition-colors"
                                        >
                                            <div className="flex items-center gap-1">
                                                {col.label}
                                                <SortIcon field={col.field} />
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(nv => <tr key={nv.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">{nv.ma_nhan_vien}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>
                                            <span className="font-medium text-slate-800 text-sm">{nv.ho_ten}</span>
                                            {nv.email && <p className="text-xs text-slate-400 mt-0.5">{nv.email}</p>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{nv.don_vi || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">{nv.ma_so_thue || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">{nv.so_cccd || '—'}</td>

                                    <td className="px-4 py-3">
                                        {nv.da_nghi_viec ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium">
                                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                                Đã nghỉ
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                                Đang làm
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            {canEditRow(nv) && (
                                                <button
                                                    onClick={() => { setEditData(nv); setModalOpen(true) }}
                                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            )}
                                            {/* Delete: chỉ admin */}
                                            {isAdmin && (
                                                <button
                                                    onClick={() => setDeleteTarget(nv)}
                                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Table footer */}
                {!loading && filtered.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                        <span>Hiển thị {filtered.length} / {data.length} nhân viên</span>
                        <span>Cập nhật lần cuối: {new Date().toLocaleTimeString('vi-VN')}</span>
                    </div>
                )}
            </div>

            {/* Modals */}
            <NhanVienModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                editData={editData}
                onSaved={fetchData}
                isAdmin={isAdmin}
                myLevel={myLevel}
            />
            <DeleteModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                nhanVien={deleteTarget}
                onDeleted={fetchData}
            />
            <ImportModal
                open={importOpen}
                onClose={() => setImportOpen(false)}
                onImported={fetchData}
            />
        </div>
    )
}
