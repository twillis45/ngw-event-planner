// ─── THE HANDLE BELONGS AT THE FOOT OF THE VIEWPORT ─────────────────────────
//
// Host-reported on a 13-inch iPad in portrait: "the below fold on tablet
// portrait is encroaching" and "the handle is supposed to be at the bottom of
// the viewport in tablet portrait mode."
//
// Measured at 1024x1366 before the fix: the handle sat at y=667 — 49% up a
// 1366-tall screen — and the whole "TOMORROW · YOUR DAY-BEFORE PLAN" card was
// visible beside the ask, rows and all.
//
// DOCTRINE, not preference:
//   · UX_04 "Every view has exactly one dominant element ... If everything is
//     the same size and weight, nothing is dominant. Fix it." The ask is Zone 2;
//     the day-before card is Zone 3.
//   · UX_04 zone ordering is non-negotiable — Zone 3 sits BELOW Zone 2.
//   · UX_03 tablet-land test: "does the content area still breathe?"
//
// CAUSE: `.stagewrap--responsive-command[data-rail="1"] .hero.elegant
// .escreen.on{min-height:0}` carries NO media query while `data-rail="1"` goes
// up at 1024, so from 1024-1279 the ask screen collapsed to its content while
// the ≥1280 layout that justifies collapsing it did not apply. At 0-6-0 it also
// silently beat a lower-specificity tablet rule — the fix had to land on the
// same selector, guarded.
//
// WHY IT SURVIVED: the breakpoint is width-only, so a 13-inch iPad in PORTRAIT
// resolves to `tablet-land`, whose matrix project tests 1024x768 — short and
// wide. Tall-and-narrow tablet-land was tested at no size at all, which is why
// the one failing geometry was invisible. `tablet-tall` is added to the matrix
// alongside this file so the geometry is covered permanently.
import { test, expect } from './fixtures.mjs';

const EV = 'test-day-before-vendors';

const boot = async (page) => {
  await page.addInitScript((id) => {
    localStorage.setItem('ngw-hostv2-last-event', id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('./?elegant=1');
  await page.waitForTimeout(2600);
};

const geometry = (page) => page.evaluate(() => {
  const vh = window.innerHeight;
  const fold = document.querySelector('.efold');
  const zone3 = [...document.querySelectorAll('*')].find(
    (e) => e.children.length === 0 && /YOUR DAY-BEFORE PLAN/i.test(e.textContent || ''));
  return {
    vh,
    foldTop: fold ? Math.round(fold.getBoundingClientRect().top) : null,
    zone3Top: zone3 ? Math.round(zone3.getBoundingClientRect().top) : null,
  };
});

test('PREMISE — the fold handle and the below-fold section both exist', async ({ page }) => {
  // Without this, "the handle is low" passes on a page that has no handle.
  await boot(page);
  const g = await geometry(page);
  expect(g.foldTop).not.toBeNull();
  expect(g.zone3Top).not.toBeNull();
});

test('THE HANDLE SITS AT THE FOOT, not halfway up', async ({ page }) => {
  // The host's own criterion. 80% is the floor, not the target — phone measures
  // 94%, iPad portrait 87-90%. Below 80% the ask has stopped owning the screen.
  await boot(page);
  const { vh, foldTop } = await geometry(page);
  const pct = Math.round((foldTop / vh) * 100);
  expect(pct, `fold handle at ${pct}% of a ${vh}px viewport`).toBeGreaterThanOrEqual(80);
});

test('ZONE 3 ONLY PEEKS — it does not sit beside the ask', async ({ page }) => {
  // A peek is the design; the whole card in the first screen is the defect.
  // Measured at 1366 tall: 23px of label. 120px allows for type-scale drift
  // without allowing the card body back into the first screen.
  await boot(page);
  const { vh, zone3Top } = await geometry(page);
  const peek = Math.max(0, vh - zone3Top);
  expect(peek, `${peek}px of the below-fold section visible`).toBeLessThanOrEqual(120);
});
