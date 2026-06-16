import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
import fs from "fs"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useMockApi = env.VITE_USE_MOCK_API === 'true'

  return {
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          redux: ["@reduxjs/toolkit", "react-redux"],
          charts: ["recharts"],
          xlsx: ["xlsx"],
        },
      },
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

    // 목 API 모드일 때는 프록시 생략 (백엔드 미연결 502 방지)
    proxy: useMockApi ? undefined : {
      "/api": {
        target: "http://172.28.5.94:8081/",
        changeOrigin: true,
        secure: false,
      },
    },
  },
}})
