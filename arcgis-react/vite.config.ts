import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 8081,
    headers: {
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
    },
    proxy: {
      '/api-keeptrack': {
        target: 'https://api.keeptrack.space',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-keeptrack/, ''),
      },
    },
  },
});
