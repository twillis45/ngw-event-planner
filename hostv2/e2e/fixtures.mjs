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

// ─── THE BOOT BEAT WAS A SLEEP IN FRONT OF A BROKEN STATE-WAIT (2026-08-15) ──
//
// Five specs opened with this, character for character:
//
//     await page.goto('?elegant=1');
//     await page.waitForTimeout(1600);                                  // guess
//     await page.locator('.splash').waitFor({ state: 'detached', … });  // real
//     await page.waitForTimeout(300);                                   // guess
//
// The state-wait in the middle looks like the load-bearing line and is not.
// `waitFor({ state:'detached' })` resolves IMMEDIATELY when the element has
// never mounted — and right after `goto` the splash usually has not mounted
// yet. So on a fast machine it returned at once, the boot was governed by the
// two sleeps, and on a slow one it did the opposite. That is the race the 1600
// was padding, and padding a race is how you get a suite whose two runs at the
// same SHA produce disjoint failure sets (see the `retries: 1` note in
// playwright.config.mjs — this is the "actual flake source" it names).
//
// `waitForFunction` cannot resolve early, because it asserts the END state
// rather than a transition: the splash is gone AND the app has real content.
// Both halves are needed — "splash gone" alone is true one frame before the
// app paints, which is the same early-return in a new costume.
//
// Typically settles in ~300ms against a fixed 1900ms, and it is DETERMINISTIC:
// a slow machine waits longer instead of failing, a fast one stops waiting.
export const settled = (page) =>
  page.waitForFunction(() => {
    const sp = document.querySelector('.splash');
    if (sp) {
      const cs = getComputedStyle(sp);
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01) return false;
    }
    const app = document.querySelector('.app');
    return !!app && (app.innerText || '').trim().length > 120;
  }, null, { timeout: 20_000 });
