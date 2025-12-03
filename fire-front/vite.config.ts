import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
import fs from "fs"

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

    // 🔥 여기만 새로 추가 (인증서 적용)
    https: {
      key: fs.readFileSync("./key.pem"),
      cert: fs.readFileSync("./cert.pem"),
    },

    // 🔥 기존 프록시 절대 수정 안 함
    proxy: {
      "/api": {
        target: "http://172.28.5.94:8081/",
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
