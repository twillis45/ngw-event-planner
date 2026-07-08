import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Standalone host-shell prototype. Imports the REAL engines from ../src
// (eventPlan, sample events) — read-only; never modifies the app.
export default defineConfig(({ command, mode }) => {
  // CRA-style env reads inside ../src libs (process.env.REACT_APP_*): bake the
  // SAME key set the CRA build bakes — loadEnv reads demo/.env* files with
  // CRA-equivalent precedence — so the prototype sees the real API base,
  // weather key, and Maps key instead of silently defaulting everything off.
  // (The deployed CRA bundle on this origin already ships these; V2 matching
  // it adds no new exposure.)
  const appEnv = loadEnv(mode, path.resolve(__dirname, '..'), 'REACT_APP_');
  return {
    // Production build ships as a static bundle under the Pages site.
    base: command === 'build' ? '/ngw-event-planner/hostv2/' : '/',
    plugins: [react()],
    resolve: {
      alias: { '@app': path.resolve(__dirname, '../src') },
    },
    define: {
      'process.env': JSON.stringify(appEnv),
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
  };
});
