import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

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
    // E2E_BASE: `vite preview` runs as command==='serve', so without this the
    // preview served dist at '/' while the BUILT index references the deep
    // base — every asset 404'd and the harness saw a blank mount (Layer-2
    // debugging, 2026-07-22). Set by playwright.config's webServer only.
    base: command === 'build' || process.env.E2E_BASE ? '/ngw-event-planner/hostv2/' : '/',
    plugins: [react()],
    resolve: {
      alias: { '@app': path.resolve(__dirname, '../src') },
      // ONE REACT. hostv2/node_modules carried 19.2.7 while the root carried
      // 19.2.6 and nothing deduped them — two React copies in one bundle is
      // the classic invalid-hook-call. It was latent only because the five
      // undeclared deps resolved UPWARD and dragged the root's copy along.
      // Declaring them (2026-09-03) makes hostv2 resolvable on its own, which
      // also makes the duplication reachable, so dedupe is part of that fix
      // rather than a separate tidy.
      //
      // MERGED INTO THIS BLOCK, not added as a second `resolve` key: a
      // duplicate key in an object literal silently wins, and the first
      // attempt killed the @app alias — the build caught it immediately.
      dedupe: ['react', 'react-dom'],
    },
    define: {
      // NODE_ENV IS BAKED TOO (2026-08-07). loadEnv only returns REACT_APP_*
      // keys, so `process.env.NODE_ENV` was replaced with `undefined` in this
      // bundle. That silently disabled every production check in ../src:
      // sentry.js gates on `NODE_ENV === 'production'`, so error reporting
      // could never have switched on in hostv2 even with a DSN configured —
      // wiring initSentry() without this would have shipped a reporter that
      // reports nothing. supabaseClient's dev-only misconfiguration warning was
      // dead for the opposite reason.
      // Only 4 reads exist in the hostv2 closure and all four want the real
      // value; `mode` is 'production' for `vite build` and 'development' for
      // the dev server, which is exactly the CRA semantics ../src expects.
      'process.env': JSON.stringify({ ...appEnv, NODE_ENV: mode }),
    },
    // ── HTTPS=1 FOR PHONE TESTING, OPT-IN ────────────────────────────────
    // `navigator.clipboard.readText()` requires a SECURE CONTEXT. `localhost`
    // counts as one; a plain-http LAN address does not — so testing the cockpit
    // on a real handset over http silently exercises only the fallback path and
    // never the clipboard offer, which is precisely the half that cannot be
    // checked in a desktop browser.
    //
    // Opt-in on purpose: the default `npm run dev` is untouched, and this only
    // engages when the certs actually exist. Generate them once with
    //   openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 825 \
    //     -keyout .certs/dev-key.pem -out .certs/dev-cert.pem \
    //     -subj "/CN=<your-lan-ip>" \
    //     -addext "subjectAltName=IP:<your-lan-ip>,IP:127.0.0.1,DNS:localhost"
    // then run  HTTPS=1 npx vite --host
    //
    // .certs/ is gitignored: a private key must never be committed, and this one
    // is a throwaway for a LAN dev server, not an identity.
    server: {
      port: 5199,
      fs: { allow: [path.resolve(__dirname, '..')] },
      ...(() => {
        if (!process.env.HTTPS) return null;
        const key = path.resolve(__dirname, '.certs/dev-key.pem');
        const cert = path.resolve(__dirname, '.certs/dev-cert.pem');
        if (!fs.existsSync(key) || !fs.existsSync(cert)) {
          // Say why rather than silently serving http and letting the tester
          // conclude the clipboard is broken.
          console.warn('[hostv2] HTTPS=1 but .certs/dev-{key,cert}.pem are missing — serving http.');
          return null;
        }
        return { https: { key: fs.readFileSync(key), cert: fs.readFileSync(cert) } };
      })(),
    },
    // Some app modules keep JSX in .js files — transform both extensions.
    esbuild: { loader: 'jsx', include: /\.(js|jsx)$/, exclude: [] },
    optimizeDeps: {
      esbuildOptions: { loader: { '.js': 'jsx' } },
    },
  };
});
