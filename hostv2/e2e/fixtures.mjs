// ─── A GLOBAL SAFETY NET FOR THE FAKE API HOST (2026-08-06) ────────────────
//
// The e2e build bakes REACT_APP_API_BASE_URL=https://e2e-mock.invalid (a real,
// never-resolving RFC 2606 host) so isUnfurlConfigured() reads true and the
// lodgingCockpit specs that depend on it can exercise their real code path
// (see lodgingCockpit.spec.mjs's own header for why).
//
// That env var is baked into the WHOLE bundle, not scoped to the lodging
// feature — found live: making it true broke decisionIdentity.spec.mjs and
// boardMatrix.spec.mjs, both asserting "no console errors", because SOME
// OTHER surface also gates on the same API_BASE and fired its own request the
// moment isUnfurlConfigured()-equivalent code saw it was configured. Every
// one of those became a real DNS failure (net::ERR_NAME_NOT_RESOLVED) against
// a host that can never resolve.
//
// Rather than track down and hand-mock every surface that happens to touch
// API_BASE, EVERY test gets a page-level catch-all: any request to the fake
// host is answered with a harmless empty 200 unless a test registers its own,
// more specific route first. Playwright tries routes most-recently-registered
// first, so a spec-specific mock (see mockUnfurl/mockResults in
// lodgingCockpit.spec.mjs) still wins over this fallback.
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('https://e2e-mock.invalid/**',
      (route) => route.fulfill({ status: 200, json: { ok: true } }));
    await use(page);
  },
});

export { expect };
