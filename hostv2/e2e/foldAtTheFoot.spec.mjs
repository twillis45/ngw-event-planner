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
// SELF-PINNED, and that is the point. This rule governs BELOW 1280 only. At
// >=1280 the responsive-command layout deliberately keeps `min-height:0` and
// composes its own fold (measured at 1440x900: handle at 0%, 250px of Zone 3
// showing) — designed that way with board input, and untouched by this fix,
// whose guard stops at max-width:1279. Left unpinned, this spec ran on the
// `desktop` project and failed there, asserting a tablet rule against a surface
// that never claimed it. Whether the >=1280 fold is right is a separate
// question, recorded rather than smuggled in under a tablet gate.
import { test, expect } from './fixtures.mjs';

const EV = 'test-day-before-vendors';

// Every geometry below 1280 that a host actually holds. tablet-tall (1024x1366)
// is the reporting device: a 13-inch iPad in portrait, which resolves to
// `tablet-land` on a width-only breakpoint and was tested at no size before.
const SIZES = [
  ['phone', 430, 860],
  ['tablet portrait', 768, 1024],
  ['tablet landscape', 1024, 768],
  ['13-inch iPad portrait', 1024, 1366],
];

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
  // Element nodes only — NOT `*`. Driving this in Chrome dev caught it: Vite
  // inlines the stylesheet as a <style> tag, and the CSS comment documenting
  // this very fix contains the words "YOUR DAY-BEFORE PLAN", so `*` matched a
  // display:none STYLE at top=0 and reported the whole viewport as intruding.
  // Harmless against the built preview (CSS is a separate file) and wrong the
  // moment anyone runs it against dev.
  const zone3 = [...document.querySelectorAll('div,section,h1,h2,h3,p,span,li')].find(
    (e) => e.children.length === 0 && /YOUR DAY-BEFORE PLAN/i.test(e.textContent || ''));
  return {
    vh,
    foldTop: fold ? Math.round(fold.getBoundingClientRect().top) : null,
    zone3Top: zone3 ? Math.round(zone3.getBoundingClientRect().top) : null,
  };
});

for (const [label, w, h] of SIZES) {
  test(`${label} ${w}x${h} — PREMISE: the handle and the below-fold section both exist`, async ({ page }) => {
    // Without this, "the handle is low" passes on a page that has no handle.
    await page.setViewportSize({ width: w, height: h });
    await boot(page);
    const g = await geometry(page);
    expect(g.foldTop).not.toBeNull();
    expect(g.zone3Top).not.toBeNull();
  });

  test(`${label} ${w}x${h} — THE HANDLE SITS AT THE FOOT`, async ({ page }) => {
    // The host's own criterion. 80% is the floor, not the target — measured
    // 93-96% across these four once the fix landed.
    await page.setViewportSize({ width: w, height: h });
    await boot(page);
    const { vh, foldTop } = await geometry(page);
    const pct = Math.round((foldTop / vh) * 100);
    expect(pct, `fold handle at ${pct}% of a ${vh}px viewport`).toBeGreaterThanOrEqual(80);
  });

  test(`${label} ${w}x${h} — BELOW THE FOLD MEANS BELOW THE FOLD`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    // Host's words. Written first as "a peek is fine, cap it at 120px", which
    // was my invention — the PHONE has always shown exactly 0, so 0 is the
    // standard the product already sets and a tablet does not get a laxer one.
    // The fold HANDLE stays visible (asserted above); the below-fold SECTION
    // does not intrude at all.
    await boot(page);
    const { vh, zone3Top } = await geometry(page);
    const peek = Math.max(0, vh - zone3Top);
    expect(peek, `${peek}px of the below-fold section visible in the first screen`).toBe(0);
  });
}
