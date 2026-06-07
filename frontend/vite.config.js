import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const CSP_REPORT_ONLY =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' blob: data:; frame-src https://www.google.com https://maps.google.com; connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 http://localhost:5173 https://*.hf.space https://script.google.com https://script.googleusercontent.com https://maps.googleapis.com; worker-src 'self' blob:;"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Content-Security-Policy-Report-Only': CSP_REPORT_ONLY,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
