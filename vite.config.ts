import path from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      src: path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: true,
    // On the VPS the dev server sits behind nginx at <project>.dev.tuvithanso.org, and Vite rejects
    // requests for hosts it doesn't know. localhost is always allowed, so local dev is unaffected.
    allowedHosts: ['.dev.tuvithanso.org'],
  },
});
