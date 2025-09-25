// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Tailwind Vite 플러그인

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    open: true,
    port: 5174,
    proxy: {
      // 프론트에서 /api/* 로 호출하면 백엔드(8080)으로 프록시
      '/api': {
        target: 'http://172.23.80.1:8081', // 🔁 실제 백엔드 주소/포트
        changeOrigin: true,
        secure: false,
        /**
         * 백엔드가 /api 프리픽스를 사용하지 않는다면 주석 해제:
         * 예) 프론트: /api/vehicles  →  백엔드: /vehicles
         */
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
