import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // SPA fallback: tất cả route 404 → index.html
  appType: 'spa',
  preview: {
    port: 4173,
    strictPort: true,
  },
})
