import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
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
