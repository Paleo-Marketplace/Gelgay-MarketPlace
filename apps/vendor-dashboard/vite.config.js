import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/vendor/',
  build: {
    outDir: '../buyer-storefront/public/vendor',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
});
