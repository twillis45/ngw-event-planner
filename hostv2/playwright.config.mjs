// ─── LAYER-2 HARNESS — the scripted browser matrix (process ask, 2026-07-22) ──
// Runs the BUILT bundle under vite preview on its own port (never the dev
// server), one fresh browser context per test — the user's real browser and
// localStorage are never touched. Requires Node ≥ 18 on PATH (the repo default
// shell resolves v16 first):  PATH="$(brew --prefix node)/bin:$PATH" npm run test:e2e
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  // ── THE GATE WAS A COIN FLIP (2026-08-06, board, production seat) ─────────
  // Two full runs at the same SHA on the same machine produced DISJOINT failure
  // sets — five failures then three, with not one individual case repeating.
  // tabletLandscapeSplit and decisionIdentity each failed once and passed once.
  // That is flake, not a broken build, and it matters more than it sounds:
  // pages-from-source.yml auto-publishes every push to main, so a green run was
  // proving the dice landed rather than that the UI was intact. It also means
  // every "e2e green" claimed today carried an unknown amount of luck.
  //
  // Two changes, both narrow. `retries: 1` distinguishes a flake from a real
  // failure instead of hiding it — a test that passes on retry is still
  // REPORTED as flaky, so the signal survives. `workers: 2` cuts the contention
  // between four browsers driving geometry-sensitive layout assertions on one
  // machine; the specs measure rendered boxes, which is exactly what starves
  // under parallel load. Slower, and honest.
  //
  // The real fix is upstream: several specs wait on page.waitForTimeout(2200)
  // rather than on a state. That is the actual flake source and it is named in
  // the path-to-9, not fixed here.
  retries: 1,
  workers: 2,
  reporter: [['list']],
  use: {
    // vite preview serves dist under the build base.
    baseURL: 'http://127.0.0.1:5233/ngw-event-planner/hostv2/',
  },
  // Two real geometries (Up-Next #3): portrait phone + the wide-but-short
  // landscape that the min-height guards exist for. Every probe runs in both.
  projects: [
    { name: 'mobile',    use: { viewport: { width: 430, height: 860 } } },
    { name: 'landscape', use: { viewport: { width: 860, height: 430 } } },
    // Tablet joined the matrix with the first ported tablet ruling (T1,
    // 2026-07-22) — every probe now guards the full-bleed tablet layouts.
    { name: 'tablet',      use: { viewport: { width: 768,  height: 1024 } } },
    { name: 'tablet-land', use: { viewport: { width: 1024, height: 768 } } },
  ],
  webServer: {
    // Serves the EXISTING dist — run `npm run build` first (the deploy dance
    // already does; CI chains them). Keeping the build out of here makes the
    // readiness probe deterministic.
    // --host 127.0.0.1: under Node ≥17 'localhost' resolves IPv6-first, so a
    // bare preview binds ::1 and the IPv4 readiness probe refuses forever.
    command: 'E2E_BASE=1 npx vite preview --port 5233 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:5233/ngw-event-planner/hostv2/',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
