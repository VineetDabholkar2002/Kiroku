import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://127.0.0.1:7171',
        changeOrigin: true,
        secure: false,   // allows self-signed cert in dev
      }
    }
  }
})