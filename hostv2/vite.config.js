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
    },
    define: {
      'process.env': JSON.stringify(appEnv),
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
