// hostv4: the simplified host shell (UX_12, direction E), built beside hostv2
// rather than inside it (owner, 11/25/2026). It owns NO planning logic: every
// answer it shows comes from the same shared code hostv2 reads (`@app` → ../src),
// so a plan opens the same in both shells. Mirrors hostv2's build on the parts
// that matter for that: the alias, process.env, and JSX in .js files.
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const appEnv = loadEnv(mode, path.resolve(__dirname, '..'), 'REACT_APP_');
  return {
    base: './',
    plugins: [react({ include: /\.(js|jsx)$/ }), {
      // The page says which commit it is, as hostv2's does: the deploy refuses a
      // build whose <meta name="ngw-build"> does not name the commit it shipped.
      name: 'ngw-build-stamp',
      transformIndexHtml: (html) => html.replace('</head>', `  <meta name="ngw-build" content="${process.env.RELEASE_SHA || 'dev'} ${new Date().toISOString()}" />\n  </head>`),
    }],
    resolve: {
      alias: { '@app': path.resolve(__dirname, '../src') },
      dedupe: ['react', 'react-dom'],
    },
    define: { 'process.env': JSON.stringify({ ...appEnv, NODE_ENV: mode }) },
    server: { port: 5204, fs: { allow: [path.resolve(__dirname, '..')] } },
    test: { include: ['test/**/*.test.mjs'], environment: 'node' },
    esbuild: { loader: 'jsx', include: /\.(js|jsx)$/, exclude: [] },
    optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
  };
});
