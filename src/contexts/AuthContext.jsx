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

export const PRIVILEGED_ROLES = ['admin', 'manager', 'ke_toan', 'truong_phong_kinh_doanh', 'quan_ly_kho']

async function fetchEmployeeProfile(userEmail) {
    if (!userEmail) return null
    const { data } = await supabase
        .from('nhan_vien')
        .select('id, ma_nhan_vien, ho_ten, role, email, mat_khau')
        .eq('email', userEmail)
        .maybeSingle()
    return data ?? null
}

async function fetchMenuPermissions(role) {
    if (!role) return null  // null = no restriction (supabase admin)
    const { data } = await supabase
        .from('phan_quyen_menu')
        .select('menu_key, co_quyen')
        .eq('role', role)
    if (!data) return {}
    // Convert array → { [menu_key]: boolean }
    return data.reduce((acc, row) => {
        acc[row.menu_key] = row.co_quyen
        return acc
    }, {})
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [employeeProfile, setEmployeeProfile] = useState(null)
    const [menuPermissions, setMenuPermissions] = useState(null) // null = all allowed

    const loadProfile = async (authUser) => {
        if (!authUser) {
            setEmployeeProfile(null)
            setMenuPermissions(null)
            return
        }
        const profile = await fetchEmployeeProfile(authUser.email)
        setEmployeeProfile(profile)
        const perms = await fetchMenuPermissions(profile?.role ?? null)
        setMenuPermissions(perms)
    }

    const refreshMenuPermissions = async () => {
        if (!employeeProfile?.role) return
        const perms = await fetchMenuPermissions(employeeProfile.role)
        setMenuPermissions(perms)
    }

    useEffect(() => {
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
        setMenuPermissions(null)
        const { error } = await supabase.auth.signOut()
        return { error }
    }

    // Helper: kiểm tra user có quyền xem menu_key không
    const hasMenuAccess = (menuKey) => {
        if (!menuPermissions) return true   // null = Supabase admin, all access
        return menuPermissions[menuKey] !== false
    }

    const role = employeeProfile?.role ?? null
    const isAdmin = role === 'admin'
    const isPrivileged = !role || PRIVILEGED_ROLES.includes(role)
    const canSeeProfit = isPrivileged
    const canSeeGiaNhap = role !== 'nhan_vien' && role !== 'truong_phong_kinh_doanh'
    const canManageEmployees = role === 'admin' || role === 'manager'

    return (
        <AuthContext.Provider value={{
            user, loading, signIn, signOut,
            employeeProfile, role,
            isAdmin, isPrivileged,
            canSeeProfit, canSeeGiaNhap, canManageEmployees,
            menuPermissions, hasMenuAccess, refreshMenuPermissions,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
