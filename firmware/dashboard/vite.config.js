import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ── Update ESP32_IP to the address printed on Serial after WiFi connects ──
const ESP32_IP = '192.168.1.100'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['hls.js'],
  },
  build: {
    rollupOptions: {
      external: ['hls.js'],
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/sensors': {
        target: `http://${ESP32_IP}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sensors/, '/sensors'),
        timeout: 1000,
      },
      '/api/inference': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/inference/, '/inference'),
        timeout: 800,
      },
    },
  },
})
