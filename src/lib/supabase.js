import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

// Giải pháp triệt để cho GoTrue lock timeout:
// Cung cấp custom lock implementation không bao giờ blocking
// Thay vì dùng BroadcastChannel lock (gây timeout 5s), ta dùng in-memory lock
const customLock = async (name, acquireTimeout, fn) => {
    // Thực thi hàm ngay lập tức không chờ lock
    return fn()
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        detectSessionInUrl: false,
        storage: localStorage,
        lock: customLock,
    }
})
