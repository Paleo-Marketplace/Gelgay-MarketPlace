import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/courier/',
  build: {
    outDir: '../buyer-storefront/public/courier',
    emptyOutDir: true
  },
  server: { port: 5175 }
});
