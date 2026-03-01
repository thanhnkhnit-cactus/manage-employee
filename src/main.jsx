import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Xóa stale GoTrue lock khỏi localStorage để tránh app bị treo khi reload
// (Supabase GoTrue đôi khi để lại lock chưa release sau khi tab bị đóng đột ngột)
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('lock:sb-') || key.includes('-auth-token-lock')) {
    localStorage.removeItem(key)
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
