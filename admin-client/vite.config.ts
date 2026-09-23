import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// В dev API проксирует сам Vite, в проде — nginx образа (docker/nginx.conf): клиент
// и там и там ходит на свой же origin, без CORS. В compose адрес — admin-server:4600.
const API = process.env.ADMIN_API_URL ?? 'http://localhost:4600';

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    host: '0.0.0.0',
    port: 8090,
    strictPort: true,
    proxy: { '/admin/api': API },
  },
  // AG Grid целиком — полтора мегабайта; админка грузится по локальной сети, дробить незачем.
  build: { chunkSizeWarningLimit: 2000 },
});
