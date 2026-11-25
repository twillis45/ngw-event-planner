import { defineConfig, loadEnv } from 'vite';
import { execFileSync } from 'node:child_process';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HOSTV2_BASE } from './deployBase.mjs';
import offlineShell from './src/offline/vitePluginOfflineShell.mjs';

// ── __dirname, DERIVED RATHER THAN INHERITED ───────────────────────────────
// This config is real ESM (hostv2 is "type": "module"), and Vite's planned
// default `configLoader: 'native'` does not provide the CJS `__dirname` — it
// warns about exactly that today, under vitest's newer Vite. Five uses below,
// and ONE OF THEM IS THE @app ALIAS, so a config that fails to load surfaces
// as "cannot find @app/*" and names nothing about __dirname.
//
// `import.meta.dirname` is the obvious replacement and was REJECTED: it needs
// Node >= 20.11, CI pins 20, and this repo's default local node is 16 — so it
// would leave CI green while `npm run build` broke on the desk. Measured:
// node 16 + import.meta.dirname => TypeError, "path" must be a string.
//
// This derives the same value from import.meta.url, which every ESM-capable
// Node has. No version floor, no bundler dependency.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  // ── WHICH COMMIT THIS BUILD IS (owner, 11/21/2026) ─────────────────────
  // RELEASE_SHA is set job-wide by pages-from-source.yml to the commit Checks
  // passed (not main's tip), and the release telemetry below already reads it.
  // The same value now stamps the page: the ngw-build meta tag, window.__BUILD__
  // (main.jsx) and the Version line in You & settings (BuildLine.jsx). Without
  // it (local, e2e) the commit is 'dev' and there is no time, which also keeps
  // a local build byte-identical across runs. Pinned by
  // test/theBuildSaysWhichCommit.test.mjs; the deploy checks the meta tag.
  const releaseSha = process.env.RELEASE_SHA || appEnv.REACT_APP_RELEASE_SHA || '';
  // The calendar version (owner, 11/22/2026): RELEASE_VERSION is set by the
  // deploy from scripts/calver.mjs (vYYYY.MM.DD.N without the v). No env, no
  // version: null, never a made-up one. Pinned by test/releaseVersion.test.mjs.
  const releaseVersion = process.env.RELEASE_VERSION || null;
  const build = releaseSha
    ? { commit: releaseSha, builtAt: new Date().toISOString(), version: releaseVersion }
    : { commit: 'dev', builtAt: null, version: releaseVersion };
  // WHEN EACH RELEASE WENT OUT (owner, 11/25/2026: What's new carries the time
  // of the release). Each past release's time is its tag's (the deploy fetches
  // the v* tags before building; tags are annotated, so they carry a time). The
  // release being built has no tag yet (it is pushed once the site is live), so
  // its time is this build's. No tags (a shallow local clone): an empty map, and
  // What's new shows dates alone.
  const releaseTimes = {};
  try {
    const out = execFileSync('git', ['for-each-ref', '--format=%(refname:strip=2) %(taggerdate:iso-strict)', 'refs/tags/v*'],
      { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    for (const line of out.split('\n')) {
      const [tag, at] = line.trim().split(' ');
      if (tag && at) releaseTimes[tag] = at;
    }
  } catch { /* no git here: dates alone */ }
  if (releaseVersion && build.builtAt) releaseTimes['v' + releaseVersion] = build.builtAt;
  return {
    // Production build ships as a static bundle under the Pages site.
    // E2E_BASE: `vite preview` runs as command==='serve', so without this the
    // preview served dist at '/' while the BUILT index references the deep
    // base — every asset 404'd and the harness saw a blank mount (Layer-2
    // debugging, 2026-07-22). Set by playwright.config's webServer only.
    //
    // THE BUILD IS RELATIVE (domain move, owner ruling 11/19/2026). One
    // artifact must serve both twillis45.github.io/ngw-event-planner/hostv2/
    // and events.noguessworksystems.com/hostv2/, so the built index, chunks,
    // CSS and BASE_URL all resolve against the page rather than naming a
    // prefix. `vite preview` (serve) still mounts dist at HOSTV2_BASE under
    // E2E_BASE, which is the old prefix; the dual-prefix check serves the same
    // dist at /hostv2/ too.
    base: command === 'build' ? './' : process.env.E2E_BASE ? HOSTV2_BASE : '/',
    plugins: [
      react(),
      // ── THE OFFLINE SHELL (host ruling 2026-09-27) ────────────────────
      // Emits sw.js with a precache manifest read off the bundle vite
      // actually produced. See src/offline/ — and read
      // docs/audits/2026-08-16_OFFLINE_SHELL_BOARD.md before changing any
      // of it: a board banned a hand-rolled worker and named the three
      // conditions this one is built to.
      offlineShell({ siteBase: '../' }),
      // index.html's manifest and touch-icon live at the SITE root, one level
      // ABOVE this bundle — so vite's own %BASE_URL% is the wrong value for
      // them. In a build that is '../', relative like the rest of the bundle,
      // so it is right under either prefix. In `serve` the bundle is at '/'
      // and so is the site root, so the token resolves to '/' and the dev
      // server keeps working.
      {
        name: 'ngw-site-base',
        transformIndexHtml: {
          order: 'pre',
          handler: (html) => html.replaceAll('%SITE_BASE%', command === 'build' ? '../' : '/'),
        },
      },
      // ── THE SITE ROOT, UNDER THE LOCAL PREVIEW (11/23/2026) ─────────────
      // The built index links '../favicon.ico', '../icon-192.png' and
      // '../hostv2-manifest.json'. The deploy serves those from the repo's
      // root public/ (the CRA build), one level above this bundle; `vite
      // preview` serves only dist, so locally they 404'd. CI never saw it:
      // its Chromium is the headless shell, which fetches no page icons. A
      // full Chromium does, logs "Failed to load resource: 404" for
      // icon-192.png, and every spec asserting no console errors went red on
      // the desk. This serves the same files the deploy does, from the same
      // place, at the site root, and only under the E2E_BASE preview.
      {
        name: 'ngw-preview-site-root',
        configurePreviewServer(server) {
          if (!process.env.E2E_BASE) return;
          const siteBase = HOSTV2_BASE.replace(/hostv2\/$/, '');
          const types = { '.ico': 'image/x-icon', '.png': 'image/png', '.json': 'application/manifest+json' };
          const files = ['favicon.ico', 'icon-192.png', 'icon-512.png', 'hostv2-manifest.json'];
          server.middlewares.use((req, res, next) => {
            const url = (req.url || '').split('?')[0];
            const name = url.startsWith(siteBase) ? url.slice(siteBase.length) : null;
            if (!name || !files.includes(name)) return next();
            res.setHeader('Content-Type', types[path.extname(name)]);
            res.end(fs.readFileSync(path.resolve(__dirname, '../public', name)));
          });
        },
      },
      {
        name: 'ngw-build-stamp',
        transformIndexHtml: {
          order: 'pre',
          handler: (html) => html.replace('</head>',
            `  <meta name="ngw-build" content="${[build.commit, build.builtAt].filter(Boolean).join(' ')}" />\n`
            + (build.version ? `  <meta name="ngw-build-version" content="${build.version}" />\n` : '')
            + '  </head>'),
        },
      },
    ],
    // ── SOURCE MAPS FOR SENTRY, NEVER ON THE PAGE (owner, 11/22/2026) ────
    // Off by default. The deploy sets SENTRY_SOURCEMAPS=1 only when a
    // SENTRY_AUTH_TOKEN secret exists; then the maps are 'hidden' (no
    // sourceMappingURL comment in the bundle), uploaded to Sentry, and deleted
    // before the artifact is published (pages-from-source.yml). The offline
    // shell never precaches .map (SHELL_EXT).
    build: { sourcemap: process.env.SENTRY_SOURCEMAPS === '1' ? 'hidden' : false },
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
      'process.env': JSON.stringify({ ...appEnv, NODE_ENV: mode,
        REACT_APP_RELEASE_SHA: releaseSha || 'unreported',
        REACT_APP_RELEASE_PROFILE: process.env.RELEASE_PROFILE || appEnv.REACT_APP_RELEASE_PROFILE || 'unreported',
      }),
      __NGW_BUILD__: JSON.stringify(build),
      __NGW_RELEASE_TIMES__: JSON.stringify(releaseTimes),
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
    // ONE MADE-UP HOST FOR THE PREVIEW (11/16/2026). Analytics is off on
    // localhost, so the first-open privacy notice could never be tested. The
    // e2e browser maps `ngw.test` to the local preview so the bundle sees a real
    // hostname (theAnalyticsNoticeStandsOut.spec.mjs). Preview server only; the
    // name resolves nowhere outside that test browser.
    preview: { allowedHosts: ['ngw.test'] },
    // ── VITEST SCOPE: test/, never e2e/ (2026-09-03) ────────────────────
    // Added with vitest as the SEAM into this tree. jest cannot reach hostv2 at
    // all — react-scripts pins its roots to demo/src — which is why 35 suites
    // read this shell as TEXT and why a syntax error here once passed a green
    // 5,451-test run. vitest reuses THIS config, so the @app alias, the jsx
    // loader and the env `define` are the same ones the app builds with.
    //
    // `include` is mandatory, not tidiness: the default glob swept up all 50
    // Playwright specs in e2e/ and they failed on `test.skip()` outside a
    // describe — 50 red files on the first run. Playwright owns e2e/;
    // vitest owns test/.
    test: {
      include: ['test/**/*.test.mjs'],
      environment: 'node',
    },
    // Some app modules keep JSX in .js files — transform both extensions.
    esbuild: { loader: 'jsx', include: /\.(js|jsx)$/, exclude: [] },
    optimizeDeps: {
      esbuildOptions: { loader: { '.js': 'jsx' } },
    },
  };
});
