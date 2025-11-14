import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    open: true,
    port: 5174,
    proxy: {
      // ✅ 기존 백엔드 프록시 (유지)
      '/api': {
        target: 'http://172.28.5.94:8081',
        changeOrigin: true,
        secure: false,
      },

      // ✅ 기상청 날씨 API 프록시 추가
      '/weather': {
        target: 'https://apihub.kma.go.kr',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/weather/, '/api/typ01/url'),
      },
    },
  },
})
