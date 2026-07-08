import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Standalone host-shell prototype. Imports the REAL engines from ../src
// (eventPlan, sample events) — read-only; never modifies the app.
export default defineConfig(({ command }) => ({
  // Production build ships as a static bundle under the Pages site.
  base: command === 'build' ? '/ngw-event-planner/hostv2/' : '/',
  plugins: [react()],
  resolve: {
    alias: { '@app': path.resolve(__dirname, '../src') },
  },
  define: {
    // CRA-style env reads inside ../src libs (process.env.REACT_APP_*) — shim to
    // an empty object so every flag resolves undefined (defaults win).
    'process.env': '({})',
  },
  server: {
    port: 5199,
    fs: { allow: [path.resolve(__dirname, '..')] },
  },
  // Some app modules keep JSX in .js files — transform both extensions.
  esbuild: { loader: 'jsx', include: /\.(js|jsx)$/, exclude: [] },
  optimizeDeps: {
    esbuildOptions: { loader: { '.js': 'jsx' } },
  },
}));
