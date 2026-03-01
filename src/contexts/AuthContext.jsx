import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

// Map role value → nhãn tiếng Việt
export const ROLE_LABELS = {
    admin: 'Quản trị viên',
    manager: 'Quản lý',
    nhan_vien: 'Nhân viên',
    ke_toan: 'Kế toán',
    truong_phong_kinh_doanh: 'Trưởng phòng KD',
    quan_ly_kho: 'Quản lý kho',
}

// Các role được xem hết dữ liệu (được coi là "cấp trên")
export const PRIVILEGED_ROLES = ['admin', 'manager', 'ke_toan', 'truong_phong_kinh_doanh', 'quan_ly_kho']

async function fetchEmployeeProfile(userEmail) {
    if (!userEmail) return null
    const { data } = await supabase
        .from('nhan_vien')
        .select('id, ma_nhan_vien, ho_ten, role, email')
        .eq('email', userEmail)
        .maybeSingle()
    return data ?? null
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [employeeProfile, setEmployeeProfile] = useState(null) // { id, role, ho_ten, ... }

    const loadProfile = async (authUser) => {
        if (!authUser) { setEmployeeProfile(null); return }
        const profile = await fetchEmployeeProfile(authUser.email)
        setEmployeeProfile(profile)
    }

    useEffect(() => {
        // Timeout guard: nếu getSession() bị block bởi GoTrue lock, vẫn set loading = false sau 4s
        const timeout = setTimeout(() => setLoading(false), 4000)

        supabase.auth.getSession().then(async ({ data: { session } }) => {
            clearTimeout(timeout)
            const u = session?.user ?? null
            setUser(u)
            await loadProfile(u)
            setLoading(false)
        }).catch(() => {
            clearTimeout(timeout)
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const u = session?.user ?? null
            setUser(u)
            await loadProfile(u)
        })

        return () => { clearTimeout(timeout); subscription.unsubscribe() }
    }, [])

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        return { data, error }
    }

    const signOut = async () => {
        setEmployeeProfile(null)
        const { error } = await supabase.auth.signOut()
        return { error }
    }

    // Helpers derived from employeeProfile
    const role = employeeProfile?.role ?? null
    const isAdmin = role === 'admin'
    const isPrivileged = !role || PRIVILEGED_ROLES.includes(role) // null = Supabase admin not linked
    const canSeeProfit = isPrivileged
    const canSeeGiaNhap = role !== 'nhan_vien' && role !== 'truong_phong_kinh_doanh'
    const canManageEmployees = role === 'admin' || role === 'manager'

    return (
        <AuthContext.Provider value={{
            user, loading, signIn, signOut,
            employeeProfile, role,
            isAdmin, isPrivileged,
            canSeeProfit, canSeeGiaNhap, canManageEmployees,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
