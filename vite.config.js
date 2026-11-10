import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    fs: { allow: ['frontend', 'node_modules', 'public', 'index.html'] },
    proxy: { '/api': 'http://127.0.0.1:8011' },
  },
})
