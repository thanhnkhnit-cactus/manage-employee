import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
    MapPin, Navigation, Truck, Fuel, DollarSign, Calculator,
    RotateCcw, FileText, ChevronDown, ChevronUp, Plus, Minus,
    AlertCircle, Loader2, CheckCircle2, ArrowRight, Copy, Package,
    ArrowLeftRight, Save, ClipboardList, X, Pencil, Trash2, Phone, User
} from 'lucide-react'

const LOAI_HANG_LIST = [
    'Hàng thương mại', 'Hàng điện tử', 'Hàng thực phẩm', 'Hàng dễ vỡ', 'Hàng ngành xây dựng',
    'Hóa chất', 'Vật tư công nghiệp', 'Hàng nông sản', 'Thiết bị máy móc', 'Khác'
]

// ── Bảng giá cước theo trọng tải ──────────────────────────────────────────────
const BANG_GIA = [
    { id: '500kg', label: '500 kg', tai: 0.5, gia_km: 10000 },
    { id: '1t', label: '1 tấn', tai: 1, gia_km: 12000 },
    { id: '2t5', label: '2.5 tấn', tai: 2.5, gia_km: 15000 },
    { id: '5t', label: '5 tấn', tai: 5, gia_km: 18000 },
    { id: '8t', label: '8 tấn', tai: 8, gia_km: 22000 },
    { id: '15t', label: '15 tấn', tai: 15, gia_km: 28000 },
    { id: 'custom', label: 'Tùy chỉnh', tai: 0, gia_km: 0 },
]

const PHU_PHI_LIST = [
    { id: 'nang_ha', label: 'Phí nâng hạ hàng', default: 200000 },
    { id: 'cho', label: 'Phí chờ (giờ)', default: 100000, unit: '/giờ' },
    { id: 'noi_thanh', label: 'Phí vào nội thành', default: 150000 },
    { id: 'cau_duong', label: 'Phí cầu đường', default: 50000 },
    { id: 'boc_xe', label: 'Phí bốc xếp', default: 300000 },
]

const fmt = (n) => Number(n || 0).toLocaleString('vi-VN') + ' ₫'

// ── Leaflet Map Component ──────────────────────────────────────────────────────
function MapComponent({ onPointSelect, markers, route }) {
    const mapRef = useRef(null)
    const leafletMap = useRef(null)
    const markersRef = useRef([])
    const routeLayerRef = useRef(null)
    const [leafletReady, setLeafletReady] = useState(false)

    // Load Leaflet CSS + JS via CDN
    useEffect(() => {
        if (window.L) { setLeafletReady(true); return }
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = () => setLeafletReady(true)
        document.head.appendChild(script)
    }, [])

    // Init map
    useEffect(() => {
        if (!leafletReady || !mapRef.current || leafletMap.current) return
        const L = window.L
        // Tập trung bản đồ vào Việt Nam
        const vnBounds = [[8.0, 102.0], [23.5, 110.0]]
        const map = L.map(mapRef.current, {
            maxBounds: vnBounds,
            maxBoundsViscosity: 0.9,
            minZoom: 5,
        }).setView([16.2, 106.0], 6)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map)
        map.on('click', (e) => {
            onPointSelect({ lat: e.latlng.lat, lng: e.latlng.lng })
        })
        leafletMap.current = map
    }, [leafletReady])

    // Update markers
    useEffect(() => {
        if (!leafletMap.current) return
        const L = window.L
        markersRef.current.forEach(m => m.remove())
        markersRef.current = []
        const colors = ['#2563eb', '#dc2626']
        const labels = ['A', 'B']
        markers.forEach((m, i) => {
            if (!m) return
            const icon = L.divIcon({
                className: '',
                html: `<div style="background:${colors[i]};color:#fff;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.3)"><span style="transform:rotate(45deg)">${labels[i]}</span></div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 30],
            })
            const marker = L.marker([m.lat, m.lng], { icon }).addTo(leafletMap.current)
            if (m.name) marker.bindPopup(`<b>${labels[i]}</b>: ${m.name}`).openPopup()
            markersRef.current.push(marker)
        })
    }, [markers])

    // Draw route
    useEffect(() => {
        if (!leafletMap.current) return
        const L = window.L
        if (routeLayerRef.current) { routeLayerRef.current.remove(); routeLayerRef.current = null }
        if (!route || route.length < 2) return
        const polyline = L.polyline(route, { color: '#2563eb', weight: 4, opacity: 0.8, dashArray: null }).addTo(leafletMap.current)
        routeLayerRef.current = polyline
        leafletMap.current.fitBounds(polyline.getBounds(), { padding: [40, 40] })
    }, [route])

    return (
        <div className="relative w-full h-full">
            {!leafletReady && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100 rounded-2xl">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            )}
            <div ref={mapRef} className="w-full h-full rounded-2xl" style={{ minHeight: 420 }} />
            {leafletReady && (
                <div className="absolute top-3 left-3 z-[999] bg-white rounded-xl shadow-md px-3 py-2 text-xs text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-blue-500" />
                    Click vào bản đồ để chọn điểm
                </div>
            )}
        </div>
    )
}

// ── Geocode search ─────────────────────────────────────────────────────────────
async function geocode(query) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=vn`
    const res = await fetch(url, { headers: { 'Accept-Language': 'vi' } })
    return res.json()
}

async function reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    const res = await fetch(url, { headers: { 'Accept-Language': 'vi' } })
    return res.json()
}

async function getRoute(from, to) {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
    const res = await fetch(url)
    const data = await res.json()
    if (data.code !== 'Ok') throw new Error('Không tìm được tuyến đường')
    const route = data.routes[0]
    const km = route.distance / 1000
    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
    return { km, coords }
}

// ── AddressInput ────────────────────────────────────────────────────────────────
function AddressInput({ label, value, onChange, onSelect, onFocus, color }) {
    const [query, setQuery] = useState(value?.name || '')
    const [results, setResults] = useState([])
    const [searching, setSearching] = useState(false)
    const timerRef = useRef(null)

    useEffect(() => { setQuery(value?.name || '') }, [value])

    const search = (q) => {
        setQuery(q)
        clearTimeout(timerRef.current)
        if (q.length < 3) { setResults([]); return }
        timerRef.current = setTimeout(async () => {
            setSearching(true)
            try { const r = await geocode(q); setResults(r) } catch { setResults([]) }
            setSearching(false)
        }, 600)
    }

    return (
        <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full ${color} text-white text-xs flex items-center justify-center font-bold`}>{label}</span>
                {label === 'A' ? 'Điểm đi' : 'Điểm đến'}
            </label>
            <div className="relative">
                <input
                    value={query}
                    onChange={e => search(e.target.value)}
                    onFocus={onFocus}
                    placeholder={`Nhập địa chỉ ${label === 'A' ? 'điểm đi' : 'điểm đến'}...`}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-9"
                />
                {searching && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-slate-400" />}
            </div>
            {results.length > 0 && (
                <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[1000] max-h-48 overflow-y-auto">
                    {results.map(r => (
                        <button key={r.place_id}
                            className="w-full text-left px-4 py-2.5 text-xs hover:bg-blue-50 border-b border-slate-100 last:border-0"
                            onClick={() => {
                                onSelect({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), name: r.display_name })
                                setQuery(r.display_name)
                                setResults([])
                            }}>
                            <p className="font-medium text-slate-800 truncate">{r.display_name.split(',')[0]}</p>
                            <p className="text-slate-400 truncate">{r.display_name}</p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────────
export default function LenDonPage() {
    const [from, setFrom] = useState(null)
    const [to, setTo] = useState(null)
    const [nextPoint, setNextPoint] = useState('A')  // which point to set on click
    const [routeCoords, setRouteCoords] = useState([])
    const [km, setKm] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Pricing
    const [selectedTai, setSelectedTai] = useState('2t5')
    const [customGiaKm, setCustomGiaKm] = useState(15000)
    const [customTai, setCustomTai] = useState(5)
    const [giaXang, setGiaXang] = useState(22000)
    const [tietKiem, setTietKiem] = useState(20)  // L/100km
    const [soChuyenRound, setSoChuyenRound] = useState(1)
    const [diHaiChieu, setDiHaiChieu] = useState(false)
    const [phuPhi, setPhuPhi] = useState({})
    const [giocho, setGioCho] = useState(0)
    const [showDetail, setShowDetail] = useState(true)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState(null)
    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500) }

    const [copied, setCopied] = useState(false)
    const copyResult = () => {
        if (!km) return
        const text = `Báo giá vận chuyển:\nTuyến: ${from?.name?.split(',')[0]} → ${to?.name?.split(',')[0]}\nCự ly: ${km.toFixed(1)} km\nTổng: ${fmt(tongTatCa)}`
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    // Thông tin KH
    const [tenKh, setTenKh] = useState('')
    const [sdtKh, setSdtKh] = useState('')

    // Tab
    const [tab, setTab] = useState('len-don')  // len-don | quan-ly

    // Dữ liệu quản lý
    const [donList, setDonList] = useState([])
    const [donLoading, setDonLoading] = useState(false)
    const [filterTT, setFilterTT] = useState('all')
    const [deleteItem, setDeleteItem] = useState(null)

    // Modal tạo đơn chính thức
    const [taoModal, setTaoModal] = useState(false)
    const [taiXeList, setTaiXeList] = useState([])
    const [xeList2, setXeList2] = useState([])
    const [donForm, setDonForm] = useState({ sdt_giao: '', sdt_nhan: '', tg_giao: '', tg_nhan: '', tai_xe_id: '', xe_id: '' })
    const df = k => e => setDonForm(p => ({ ...p, [k]: e.target.value }))

    // Thông tin hàng hóa
    const [hangHoa, setHangHoa] = useState({
        loai: 'Hàng thương mại',
        can_nang: '',
        dai: '', rong: '', cao: '',
        so_kien: '',
        ghi_chu: ''
    })
    const fh = (k) => (v) => setHangHoa(p => ({ ...p, [k]: v }))

    const bangGiaSelected = BANG_GIA.find(b => b.id === selectedTai)
    const giaKm = selectedTai === 'custom' ? customGiaKm : bangGiaSelected?.gia_km || 0

    // Tính toán
    const chiPhiXang = km ? (km * tietKiem / 100) * giaXang : 0
    const giaCuocDi = km ? km * giaKm : 0
    const giaCuocVe = diHaiChieu ? giaCuocDi * 0.5 : 0
    const giaCuoc = giaCuocDi + giaCuocVe
    const tongPhuPhi = PHU_PHI_LIST.reduce((s, p) => {
        if (!phuPhi[p.id]) return s
        const val = parseFloat(phuPhi[p.id + '_val'] || p.default) || 0
        const qty = p.id === 'cho' ? (parseFloat(giocho) || 0) : 1
        return s + val * qty
    }, 0)
    const tongChuyen = (giaCuoc + tongPhuPhi) * soChuyenRound
    const tongTatCa = tongChuyen

    // Click map → set point
    const handleMapClick = useCallback(async (latlng) => {
        setError('')
        try {
            const r = await reverseGeocode(latlng.lat, latlng.lng)
            const name = r.display_name || `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`
            const point = { ...latlng, name }
            if (nextPoint === 'A') { setFrom(point); setNextPoint('B') }
            else { setTo(point); setNextPoint('A') }
        } catch {
            const point = { ...latlng, name: `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}` }
            if (nextPoint === 'A') { setFrom(point); setNextPoint('B') }
            else { setTo(point); setNextPoint('A') }
        }
    }, [nextPoint])

    // Tính tuyến đường khi có đủ 2 điểm
    useEffect(() => {
        if (!from || !to) { setRouteCoords([]); setKm(null); return }
        setLoading(true); setError('')
        getRoute(from, to)
            .then(({ km, coords }) => { setKm(km); setRouteCoords(coords) })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false))
    }, [from, to])

    const reset = () => {
        setFrom(null); setTo(null); setRouteCoords([]); setKm(null)
        setNextPoint('A'); setError('')
    }

    const togglePhuPhi = (id) => {
        setPhuPhi(p => {
            const next = { ...p, [id]: !p[id] }
            return next
        })
    }

    const swapPoints = () => {
        setFrom(to)
        setTo(from)
    }

    // Fetch danh sách đơn
    const fetchDon = useCallback(async () => {
        setDonLoading(true)
        const { data } = await supabase.from('don_van_chuyen')
            .select('*, tai_xe(ho_ten,sdt), doi_xe(bien_so,loai_xe)')
            .order('created_at', { ascending: false })
        setDonList(data || [])
        setDonLoading(false)
    }, [])

    useEffect(() => { fetchDon() }, [])

    const openTaoModal = async () => {
        const [{ data: tx }, { data: xe }] = await Promise.all([
            supabase.from('tai_xe').select('id,ho_ten,sdt,hang_bang').eq('trang_thai', 'hoat_dong').order('ho_ten'),
            supabase.from('doi_xe').select('id,bien_so,loai_xe').order('bien_so'),
        ])
        setTaiXeList(tx || [])
        setXeList2(xe || [])
        setDonForm({ sdt_giao: sdtKh, sdt_nhan: '', tg_giao: '', tg_nhan: '', tai_xe_id: tx?.[0]?.id || '', xe_id: xe?.[0]?.id || '' })
        setTaoModal(true)
    }

    const buildPayload = (tt) => ({
        ten_kh: tenKh, sdt_kh: sdtKh,
        diem_di: from?.name?.split(',')[0] || '', diem_den: to?.name?.split(',')[0] || '',
        km, lat_di: from?.lat, lng_di: from?.lng, lat_den: to?.lat, lng_den: to?.lng,
        hang_hoa: hangHoa, tai_trong: bangGiaSelected?.label || customTai + 'T',
        gia_km: giaKm, gia_cuoc: giaCuocDi, phu_phi: phuPhi,
        di_hai_chieu: diHaiChieu, so_chuyen: soChuyenRound, tong_tien: tongTatCa,
        trang_thai: tt,
    })

    const luuBanNhap = async () => {
        if (!km) return
        setSaving(true)
        const { error } = await supabase.from('don_van_chuyen').insert(buildPayload('ban_nhap'))
        setSaving(false)
        if (error) { showToast('error', 'Lỗi khi lưu!'); return }
        showToast('success', 'Đã lưu bản nháp thành công!')
        fetchDon()
    }

    const taoChinhThuc = async () => {
        setSaving(true)
        const payload = {
            ...buildPayload('cho_xu_ly'),
            sdt_nguoi_giao: donForm.sdt_giao, sdt_nguoi_nhan: donForm.sdt_nhan,
            thoi_gian_giao: donForm.tg_giao || null, thoi_gian_nhan: donForm.tg_nhan || null,
            tai_xe_id: donForm.tai_xe_id || null, xe_id: donForm.xe_id || null,
        }
        const { error } = await supabase.from('don_van_chuyen').insert(payload)
        setSaving(false)
        if (error) { showToast('error', 'Lỗi khi tạo đơn!'); return }
        showToast('success', '✅ Đã tạo đơn vận chuyển!'); setTaoModal(false); fetchDon()
    }

    const handleDeleteDon = async () => {
        if (!deleteItem) return
        await supabase.from('don_van_chuyen').delete().eq('id', deleteItem.id)
        showToast('success', 'Đã xóa đơn!'); setDeleteItem(null); fetchDon()
    }

    const updateTrangThai = async (id, tt) => {
        await supabase.from('don_van_chuyen').update({ trang_thai: tt, updated_at: new Date().toISOString() }).eq('id', id)
        fetchDon()
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-2.5 shadow-lg shadow-blue-200">
                        <Navigation className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Lên Đơn Báo Giá Vận Tải</h2>
                        <p className="text-slate-500 text-sm">Tính cước tự động theo bản đồ &amp; trọng tải</p>
                    </div>
                </div>
                {/* Tabs */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    {[{ key: 'len-don', label: 'Lên đơn', icon: Navigation }, { key: 'quan-ly', label: 'Quản lý đơn', icon: ClipboardList }].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <t.icon className="w-4 h-4" />{t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${toast.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    {toast.msg}
                </div>
            )}

            {/* ══ TAB: QUẢN LÝ ĐƠN ══ */}
            {tab === 'quan-ly' && (() => {
                const TT_CONFIG = {
                    ban_nhap: { label: 'Bản nháp', color: 'bg-slate-100 text-slate-600' },
                    cho_xu_ly: { label: 'Chờ xử lý', color: 'bg-amber-100 text-amber-700' },
                    dang_giao: { label: 'Đang giao', color: 'bg-blue-100 text-blue-700' },
                    hoan_thanh: { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700' },
                    huy: { label: 'Đã hủy', color: 'bg-red-100 text-red-600' },
                }
                const filtered = filterTT === 'all' ? donList : donList.filter(d => d.trang_thai === filterTT)
                return (
                    <div className="space-y-4">
                        {/* Filter bar */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex gap-2 flex-wrap">
                            {[['all', 'Tất cả'], ...Object.entries(TT_CONFIG).map(([k, v]) => [k, v.label])].map(([k, l]) => (
                                <button key={k} onClick={() => setFilterTT(k)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${filterTT === k ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                                    {l} {k === 'all' ? `(${donList.length})` : `(${donList.filter(d => d.trang_thai === k).length})`}
                                </button>
                            ))}
                        </div>
                        {/* Table */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            {donLoading ? (
                                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                            ) : filtered.length === 0 ? (
                                <div className="text-center py-16"><ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-slate-500">Chưa có đơn nào</p></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead><tr className="bg-slate-50 border-b border-slate-200">
                                            {['Khách hàng', 'Tuyến', 'Tài xế / Xe', 'Tổng tiền', 'Trạng thái', 'Ngày tạo', ''].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filtered.map(d => {
                                                const tt = TT_CONFIG[d.trang_thai] || TT_CONFIG.ban_nhap
                                                return (
                                                    <tr key={d.id} className="hover:bg-slate-50/70">
                                                        <td className="px-4 py-3">
                                                            <p className="font-semibold text-slate-800">{d.ten_kh || '—'}</p>
                                                            <p className="text-xs text-slate-400">{d.sdt_kh || ''}</p>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px]">
                                                            <p className="truncate font-medium">{d.diem_di}</p>
                                                            <p className="truncate text-slate-400">→ {d.diem_den}</p>
                                                            <p className="text-blue-600 font-medium">{d.km?.toFixed(1)} km</p>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-slate-600">
                                                            <p>{d.tai_xe?.ho_ten || '—'}</p>
                                                            <p className="text-slate-400">{d.doi_xe?.bien_so || '—'}</p>
                                                        </td>
                                                        <td className="px-4 py-3 font-semibold text-slate-800">{fmt(d.tong_tien)}</td>
                                                        <td className="px-4 py-3">
                                                            <select value={d.trang_thai}
                                                                onChange={e => updateTrangThai(d.id, e.target.value)}
                                                                className={`text-xs px-2 py-1 rounded-lg border-0 font-medium cursor-pointer focus:outline-none ${tt.color}`}>
                                                                {Object.entries(TT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString('vi-VN')}</td>
                                                        <td className="px-4 py-3">
                                                            <button onClick={() => setDeleteItem(d)} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })()}

            {/* ══ TAB: LÊN ĐƠN ══ */}
            {tab === 'len-don' && <>
                {/* Thông tin KH */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><User className="w-4 h-4 text-blue-500" />Thông tin khách hàng</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Tên khách hàng</label>
                            <input value={tenKh} onChange={e => setTenKh(e.target.value)} placeholder="Nguyễn Văn A..."
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Số điện thoại KH</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input value={sdtKh} onChange={e => setSdtKh(e.target.value)} placeholder="0901234567"
                                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
                    {/* ─ Left: Map + địa chỉ ─ */}
                    <div className="xl:col-span-3 space-y-4">
                        {/* Địa chỉ */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-semibold text-slate-700">Chọn tuyến đường</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">
                                        Đang chọn:
                                        <span className={`ml-1 font-bold ${nextPoint === 'A' ? 'text-blue-600' : 'text-red-600'}`}>
                                            {nextPoint === 'A' ? '📍 Điểm đi' : '📍 Điểm đến'}
                                        </span>
                                    </span>
                                    <button onClick={reset} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                                        <RotateCcw className="w-3.5 h-3.5" />Đặt lại
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <AddressInput label="A" color="bg-blue-600" value={from}
                                        onFocus={() => setNextPoint('A')}
                                        onSelect={(p) => { setFrom(p); setNextPoint('B') }} />
                                </div>
                                <button
                                    onClick={swapPoints}
                                    title="Hoán đổi điểm đi / điểm đến"
                                    className="flex-shrink-0 mb-0.5 p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all group"
                                >
                                    <ArrowLeftRight className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                </button>
                                <div className="flex-1">
                                    <AddressInput label="B" color="bg-red-500" value={to}
                                        onFocus={() => setNextPoint('B')}
                                        onSelect={(p) => { setTo(p); setNextPoint('A') }} />
                                </div>
                            </div>
                            {from && to && (
                                <div className="flex items-center gap-2 pt-1">
                                    <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                    <p className="text-xs text-slate-500 truncate">
                                        <span className="font-medium">{from.name?.split(',')[0]}</span>
                                        <span className="mx-1 text-slate-300">→</span>
                                        <span className="font-medium">{to.name?.split(',')[0]}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Map */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" style={{ height: 420 }}>
                            <MapComponent
                                onPointSelect={handleMapClick}
                                markers={[from, to]}
                                route={routeCoords}
                            />
                        </div>

                        {/* Kết quả cự ly */}
                        {(loading || km !== null || error) && (
                            <div className={`rounded-2xl p-4 border ${loading ? 'bg-blue-50 border-blue-200' : error ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                {loading && (
                                    <div className="flex items-center gap-2 text-blue-700 text-sm">
                                        <Loader2 className="w-4 h-4 animate-spin" />Đang tính tuyến đường...
                                    </div>
                                )}
                                {error && (
                                    <div className="flex items-center gap-2 text-red-700 text-sm">
                                        <AlertCircle className="w-4 h-4" />{error}
                                    </div>
                                )}
                                {km !== null && !loading && (
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-emerald-700">
                                            <CheckCircle2 className="w-5 h-5" />
                                            <span className="font-bold text-lg">{km.toFixed(1)} km</span>
                                            <span className="text-sm font-medium">quãng đường theo đường bộ</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ─ Right: Tính giá ─ */}
                    <div className="xl:col-span-2 space-y-4">
                        {/* Trọng tải */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Truck className="w-4 h-4 text-blue-500" />Trọng tải & Giá cước
                            </p>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {BANG_GIA.filter(b => b.id !== 'custom').map(b => (
                                    <button key={b.id} onClick={() => setSelectedTai(b.id)}
                                        className={`px-3 py-2.5 rounded-xl border text-left transition-all ${selectedTai === b.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <p className={`text-sm font-bold ${selectedTai === b.id ? 'text-blue-700' : 'text-slate-700'}`}>{b.label}</p>
                                        <p className={`text-xs ${selectedTai === b.id ? 'text-blue-500' : 'text-slate-400'}`}>{b.gia_km.toLocaleString()} ₫/km</p>
                                    </button>
                                ))}
                                <button onClick={() => setSelectedTai('custom')}
                                    className={`px-3 py-2.5 rounded-xl border text-left transition-all col-span-2 ${selectedTai === 'custom' ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                    <p className={`text-sm font-bold ${selectedTai === 'custom' ? 'text-purple-700' : 'text-slate-700'}`}>Tùy chỉnh</p>
                                </button>
                            </div>
                            {selectedTai === 'custom' && (
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Trọng tải (tấn)</label>
                                        <input type="number" value={customTai} onChange={e => setCustomTai(+e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Giá / km (₫)</label>
                                        <input type="number" value={customGiaKm} onChange={e => setCustomGiaKm(+e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Giá dầu (₫/L)</label>
                                    <input type="number" value={giaXang} onChange={e => setGiaXang(+e.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Tiêu hao (L/100km)</label>
                                    <input type="number" value={tietKiem} onChange={e => setTietKiem(+e.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Số chuyến</label>
                                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                                        <button onClick={() => setSoChuyenRound(Math.max(1, soChuyenRound - 1))} className="px-3 py-2.5 hover:bg-slate-100 text-slate-500"><Minus className="w-3.5 h-3.5" /></button>
                                        <span className="flex-1 text-center text-sm font-bold text-slate-800">{soChuyenRound}</span>
                                        <button onClick={() => setSoChuyenRound(soChuyenRound + 1)} className="px-3 py-2.5 hover:bg-slate-100 text-slate-500"><Plus className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Hướng đi</label>
                                    <button
                                        onClick={() => setDiHaiChieu(v => !v)}
                                        className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all ${diHaiChieu
                                            ? 'bg-purple-50 border-purple-400 text-purple-700'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                            }`}>
                                        <ArrowLeftRight className="w-4 h-4" />
                                        {diHaiChieu ? '2 chiều' : '1 chiều'}
                                    </button>
                                    {diHaiChieu && (
                                        <p className="text-[11px] text-purple-500 mt-1 text-center">Chiều về = 50% chiều đi</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Thông tin hàng hóa */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4 text-emerald-500" />Thông tin hàng hóa
                            </p>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-500 mb-1.5 block">Loại hàng hóa</label>
                                    <select value={hangHoa.loai} onChange={e => fh('loai')(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
                                        {LOAI_HANG_LIST.map(l => <option key={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1.5 block">Cân nặng (kg)</label>
                                        <input type="number" value={hangHoa.can_nang} onChange={e => fh('can_nang')(e.target.value)}
                                            placeholder="0" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1.5 block">Số kiện / thùng</label>
                                        <input type="number" value={hangHoa.so_kien} onChange={e => fh('so_kien')(e.target.value)}
                                            placeholder="1" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1.5 block">Kích thước (D × R × C, cm)</label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[['dai', 'Dài'], ['rong', 'Rộng'], ['cao', 'Cao']].map(([k, lbl]) => (
                                            <div key={k} className="relative">
                                                <input type="number" value={hangHoa[k]} onChange={e => fh(k)(e.target.value)}
                                                    placeholder={lbl}
                                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                            </div>
                                        ))}
                                    </div>
                                    {hangHoa.dai && hangHoa.rong && hangHoa.cao && (
                                        <p className="text-xs text-slate-400 mt-1">
                                            Thể tích: <span className="font-medium text-emerald-600">
                                                {((hangHoa.dai * hangHoa.rong * hangHoa.cao) / 1000000).toFixed(3)} m³
                                            </span>
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1.5 block">Ghi chú đặc biệt</label>
                                    <input value={hangHoa.ghi_chu} onChange={e => fh('ghi_chu')(e.target.value)}
                                        placeholder="Hàng dễ vỡ, cần bảo quản lạnh..."
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                </div>
                            </div>
                        </div>

                        {/* Phụ phí */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-amber-500" />Phụ phí
                            </p>
                            <div className="space-y-2">
                                {PHU_PHI_LIST.map(p => (
                                    <div key={p.id}>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={!!phuPhi[p.id]}
                                                onChange={() => togglePhuPhi(p.id)}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                            <span className="text-sm text-slate-700 flex-1">{p.label}</span>
                                            {phuPhi[p.id] && (
                                                <input type="number"
                                                    value={phuPhi[p.id + '_val'] ?? p.default}
                                                    onChange={e => setPhuPhi(prev => ({ ...prev, [p.id + '_val']: e.target.value }))}
                                                    className="w-28 px-2 py-1 border border-slate-200 rounded-lg text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                />
                                            )}
                                        </label>
                                        {p.id === 'cho' && phuPhi[p.id] && (
                                            <div className="ml-6 mt-1 flex items-center gap-2">
                                                <span className="text-xs text-slate-400">Số giờ chờ:</span>
                                                <input type="number" value={giocho} onChange={e => setGioCho(e.target.value)} min={0}
                                                    className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-xs text-center focus:outline-none" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Kết quả */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-200">
                            <div className="flex items-center justify-between mb-4">
                                <p className="font-bold flex items-center gap-2"><Calculator className="w-4 h-4" />Tổng dự tính</p>
                                <button onClick={() => setShowDetail(!showDetail)}
                                    className="text-blue-200 hover:text-white text-xs flex items-center gap-1">
                                    Chi tiết {showDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            {showDetail && (
                                <div className="space-y-1.5 mb-4 text-sm">
                                    <div className="flex justify-between text-blue-100">
                                        <span>📍 Cự ly</span>
                                        <span className="font-medium">{km ? km.toFixed(1) + ' km' : '—'}</span>
                                    </div>
                                    <div className="flex justify-between text-blue-100">
                                        <span>🚛 Giá cước chiều đi ({giaKm.toLocaleString()} ₫/km)</span>
                                        <span className="font-medium">{km ? fmt(giaCuocDi) : '—'}</span>
                                    </div>
                                    {diHaiChieu && (
                                        <div className="flex justify-between text-purple-200">
                                            <span>🔄 Chiều về (50%)</span>
                                            <span className="font-medium">{km ? fmt(giaCuocVe) : '—'}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-blue-100">
                                        <span>⛽ Chi phí dầu (~{tietKiem} L/100km)</span>
                                        <span className="font-medium">{km ? fmt(chiPhiXang) : '—'}</span>
                                    </div>
                                    {PHU_PHI_LIST.filter(p => phuPhi[p.id]).map(p => {
                                        const val = parseFloat(phuPhi[p.id + '_val'] || p.default) || 0
                                        const qty = p.id === 'cho' ? (parseFloat(giocho) || 0) : 1
                                        return (
                                            <div key={p.id} className="flex justify-between text-blue-100">
                                                <span>➕ {p.label}{p.id === 'cho' ? ` × ${qty}h` : ''}</span>
                                                <span className="font-medium">{fmt(val * qty)}</span>
                                            </div>
                                        )
                                    })}
                                    {soChuyenRound > 1 && (
                                        <div className="flex justify-between text-blue-100 border-t border-blue-500 pt-1.5 mt-1.5">
                                            <span>× {soChuyenRound} chuyến</span>
                                            <span className="font-medium">{fmt(giaCuoc + tongPhuPhi)} × {soChuyenRound}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="border-t border-blue-500 pt-3">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-xs text-blue-200 mb-0.5">Tổng {soChuyenRound} chuyến</p>
                                        <p className="text-3xl font-black tracking-tight">
                                            {km ? fmt(tongTatCa) : '—'}
                                        </p>
                                    </div>
                                    <button onClick={copyResult} disabled={!km}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-40 rounded-xl text-xs font-medium transition-all">
                                        {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copied ? 'Đã copy' : 'Copy đơn'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Bảng giá tham khảo */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                <p className="text-sm font-semibold text-slate-700">Bảng giá tham khảo</p>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Trọng tải</th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Giá/km</th>
                                        {km && <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">{km.toFixed(0)} km</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {BANG_GIA.filter(b => b.id !== 'custom').map(b => (
                                        <tr key={b.id}
                                            onClick={() => setSelectedTai(b.id)}
                                            className={`cursor-pointer transition-colors ${selectedTai === b.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                                            <td className="px-4 py-2.5 font-medium text-slate-800">{b.label}</td>
                                            <td className="px-4 py-2.5 text-right text-slate-600">{b.gia_km.toLocaleString()} ₫</td>
                                            {km && (
                                                <td className="px-4 py-2.5 text-right font-semibold text-blue-700">
                                                    {fmt(km * b.gia_km)}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex gap-2">
                        <button onClick={luuBanNhap} disabled={!km || saving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Lưu bản nháp
                        </button>
                        <button onClick={openTaoModal} disabled={!km}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all">
                            <ClipboardList className="w-4 h-4" />Tạo đơn vận chuyển
                        </button>
                    </div>
                </div>
            </>}

            {taoModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 text-lg">Tạo Đơn Vận Chuyển</h3>
                            <button onClick={() => setTaoModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
                                <p><span className="font-semibold">KH:</span> {tenKh || '—'} {sdtKh && `· ${sdtKh}`}</p>
                                <p><span className="font-semibold">Tuyến:</span> {from?.name?.split(',')[0]} → {to?.name?.split(',')[0]}</p>
                                <p><span className="font-semibold">Cự ly:</span> {km?.toFixed(1)} km · <span className="font-semibold">Tổng:</span> {fmt(tongTatCa)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-700 mb-2">Thông tin giao nhận</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">SĐT người giao hàng</label>
                                        <input value={donForm.sdt_giao} onChange={df('sdt_giao')} placeholder="0901..."
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">SĐT người nhận hàng</label>
                                        <input value={donForm.sdt_nhan} onChange={df('sdt_nhan')} placeholder="0901..."
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Thời gian giao hàng</label>
                                        <input type="datetime-local" value={donForm.tg_giao} onChange={df('tg_giao')}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Thời gian nhận hàng (nếu có)</label>
                                        <input type="datetime-local" value={donForm.tg_nhan} onChange={df('tg_nhan')}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Tài xế</label>
                                {taiXeList.length === 0 ? (
                                    <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">Chưa có tài xế nào đang hoạt động.</p>
                                ) : (
                                    <select value={donForm.tai_xe_id} onChange={df('tai_xe_id')}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">— Chưa chọn tài xế —</option>
                                        {taiXeList.map(tx => (
                                            <option key={tx.id} value={tx.id}>{tx.ho_ten} · {tx.sdt} · Bằng {tx.hang_bang}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Xe vận chuyển</label>
                                {xeList2.length === 0 ? (
                                    <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">Chưa có xe nào.</p>
                                ) : (
                                    <select value={donForm.xe_id} onChange={df('xe_id')}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">— Chưa chọn xe —</option>
                                        {xeList2.map(xe => (
                                            <option key={xe.id} value={xe.id}>{xe.bien_so} — {xe.loai_xe}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <button onClick={() => setTaoModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium">Hủy</button>
                            <button onClick={taoChinhThuc} disabled={saving}
                                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Tạo đơn
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteItem && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 rounded-xl p-2.5"><AlertCircle className="w-5 h-5 text-red-600" /></div>
                            <div>
                                <p className="font-semibold text-slate-800">Xóa đơn này?</p>
                                <p className="text-sm text-slate-500">Thao tác không thể hoàn tác.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteItem(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium">Hủy</button>
                            <button onClick={handleDeleteDon} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium">Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
