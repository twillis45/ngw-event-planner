// The WHOLE browser suite in WebKit (Safari's engine), on demand only.
//
// Release-candidate exit criterion 2 asks for the full suite green in Chromium
// AND WebKit on the release commit. CI gates every change on the full Chromium
// matrix plus 8 critical journeys in WebKit (playwright.webkit.config.mjs);
// nothing had ever run every spec in WebKit, so the criterion was unmeasured.
// This runs every spec on the two viewports that matter most (phone, desktop)
// with WebKit. It gates nothing: .github/workflows/webkit-full.yml runs it by
// hand, and its result is a measurement for the release record.
//
// Same projects, servers and retries as the canonical config; only the engine
// changes. launchOptions is cleared because the canonical one may point at a
// local Chromium binary.
//
// serviceWorkers: 'block', as in playwright.webkit.config.mjs. The first run
// (11/16/2026, run 44005398746) left the offline worker on: 1,182 passed and
// 326 failed, the failures clustered in specs whose server answers are mocked
// ("element not found", missing text). In WebKit the worker answers before the
// test's mock can, so those failures measured the harness, not the app.
// Offline behavior keeps its own Chromium probes; this run does not claim it.
import { defineConfig } from '@playwright/test';
import canonical from './playwright.config.mjs';

export default defineConfig({
  ...canonical,
  use: { ...canonical.use, browserName: 'webkit', launchOptions: {}, serviceWorkers: 'block' },
  projects: canonical.projects
    .filter((p) => p.name === 'mobile' || p.name === 'desktop')
    .map((p) => ({ ...p, use: { ...p.use, browserName: 'webkit' } })),
});
