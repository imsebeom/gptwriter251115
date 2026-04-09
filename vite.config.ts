import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Dev: forward /api to Firebase Functions emulator
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        rewrite: (path) => {
          // /api/coach -> /<project>/us-central1/api/coach
          // project id resolved at runtime via env var
          const project = process.env.VITE_FIREBASE_PROJECT_ID || 'demo-getwriter';
          return `/${project}/us-central1/api${path.replace(/^\/api/, '')}`;
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
