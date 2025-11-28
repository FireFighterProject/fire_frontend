import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
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
    },
  },
})
