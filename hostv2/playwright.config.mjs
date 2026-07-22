// ─── LAYER-2 HARNESS — the scripted browser matrix (process ask, 2026-07-22) ──
// Runs the BUILT bundle under vite preview on its own port (never the dev
// server), one fresh browser context per test — the user's real browser and
// localStorage are never touched. Requires Node ≥ 18 on PATH (the repo default
// shell resolves v16 first):  PATH="$(brew --prefix node)/bin:$PATH" npm run test:e2e
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  workers: 4,
  reporter: [['list']],
  use: {
    // vite preview serves dist under the build base.
    baseURL: 'http://127.0.0.1:5233/ngw-event-planner/hostv2/',
    viewport: { width: 430, height: 860 }, // phone-ish; the frame fills it (no stagewrap scale)
  },
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
