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

// ─── THE RAIL IS UP FROM 1024, NOT 1280 (2026-09-02, skip census) ───────────
//
// Nine e2e guards read `viewport.width < 1280` and explained themselves as
// "uses the rail" / "rail is only up at desktop widths". That last one was a
// flat contradiction of the app: `isWideBp` in lib/viewport.js counts
// tablet-land as wide, tablet-land starts at 1024, and styles.css:4915 already
// says in as many words that data-rail is "1" from 1024 and NOT from 1280.
// A unit test asserts the same thing. Only the e2e guards never got the memo.
//
// Measured against the built bundle: 18 rail rows at 1024x768, 1279x800,
// 1280x800 and 1440x900 alike.
//
// Cost: ten tests skipped on two projects each — twenty executions per matrix
// run — on a geometry where the surface they test demonstrably exists. A skip
// reads as a pass in a summary line, so this was twenty silent passes.
//
// Kept as ONE constant so the next breakpoint move has one place to land, and
// railBoundaryMatchesApp.test.js fails if it ever drifts from viewport.js.
export const RAIL_MIN_WIDTH = 1024;

/** True where the section rail is rendered and can be used as the door. */
export const hasRail = (viewport) => !!viewport && viewport.width >= RAIL_MIN_WIDTH;


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

// ─── THE SECTION DOOR MOVES WITH THE VIEWPORT ───────────────────────────────
//
// Below the rail band, the way into a section is two taps: the eyebrow menu,
// then "Jump to a section". At rail widths that row is deliberately NOT
// rendered — with the rail up it opened a sheet whose only content was a
// second copy of the rail (2026-08-21) — and the rail IS the section list.
//
// Ten specs had hand-rolled the phone path inline. Hiding that row turned all
// ten red in CI at `desktop` and `wide` while the app was fine, and I fixed
// exactly one of them (a11yFloor) because that was the one my local desktop
// run happened to execute. Nine were still carrying the old assumption.
//
// So the door lives here now, once. A spec that wants a section asks for the
// section; which door this viewport has is not a spec's business.
export const openSectionByName = async (page, name, opts = {}) => {
  const timeout = opts.timeout || 8000;
  const rail = page.locator('.srail-row', { hasText: name });
  if (await page.locator('.srail-row').count()) {
    await rail.first().click({ timeout });
  } else {
    // CLOSE ANY OPEN SHEET FIRST. Below the rail band the sheet covers the
    // whole stage, including the eyebrow this walk starts from, so calling
    // this helper while a sheet is open put the click on a scrim and timed out
    // eight seconds later.
    //
    // Fixed HERE rather than at the call site, and that is the point: this is
    // the fifth time in one session that the phone door-walk broke a spec at
    // every width except desktop. Four of those were patched locally, which is
    // how it came back a fifth time. A shared helper that only works from one
    // starting state is a trap with a countdown on it.
    if (await page.locator('.sheet').count()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    }
    await page.locator('.ev-eyebrow').first().click({ timeout });
    await page.locator('.sheet').last()
      .getByText('Jump to a section', { exact: false }).first().click({ timeout });
    await page.locator('.sheet').last()
      .getByText(name, { exact: false }).first().click({ timeout });
  }
  await page.waitForTimeout(opts.settle == null ? 400 : opts.settle);
};
