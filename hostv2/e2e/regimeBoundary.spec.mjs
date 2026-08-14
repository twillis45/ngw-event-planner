// ─── THE BOUNDARY THE MATRIX STEPS OVER ─────────────────────────────────────
//
// The projects in playwright.config.js sample the regimes but never their edge:
// 1024x768 and then 1440x900, so the shell is exercised well inside the tablet
// rules and well inside the desktop ones, and never at the pixel where it
// changes. 1279 has no coverage at all, and every project at or above 1280 is
// tall — 1440x900, 1920x1080 — so the wide-but-short window has none either.
//
// That second gap is not hypothetical. styles.css:4737 records that the host's
// own Chrome is 1280x654, that the height-gated rules at :162 and :141 left it
// rendering "a full-bleed slab, not a board on a field", and that the fix was to
// repeat the canvas geometry in a width-only query so short windows keep the
// inset and the radius. The rule exists BECAUSE of a specific window, and that
// window is the one geometry nothing measures. Reverting it today would turn
// every gate in this suite green.
//
// So this pins three points on the line rather than a range: the last pixel of
// the old regime, the first pixel of the new one, and the short window the
// width-only rule was written for. Cheap — one context, setViewportSize, no new
// project multiplying all 19 minutes of the matrix.
import { test, expect } from './fixtures.mjs';

const EV = {
  id: 'E2E_TEST_boundary', type: 'Birthday', name: 'Boundary', isDestination: true,
  venueCity: 'Santa Fe', venueState: 'NM', date: '2027-06-20', endDate: '2027-06-24',
  guestMode: 'count', guestEstimate: 5, guestCount: 5, totalBudget: 2000,
  budget: [], guests: [], vendors: [], timeline: [],
};

const boot = async (page) => {
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
};

/** Wait on the splash being gone, never on a timeout — see responsiveBaseline. */
const settled = (page) =>
  page.waitForFunction(() => {
    const sp = document.querySelector('.splash');
    if (sp) {
      const cs = getComputedStyle(sp);
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01) return false;
    }
    const app = document.querySelector('.app');
    return !!app && (app.innerText || '').trim().length > 120;
  }, null, { timeout: 20_000 });

const measure = (page) =>
  page.evaluate(() => {
    const doc = document.documentElement;
    const stage = document.querySelector('.stagewrap');
    const app = document.querySelector('.app');
    const r = stage?.getBoundingClientRect();
    return {
      hOverflow: doc.scrollWidth - doc.clientWidth,
      stageW: r ? Math.round(r.width) : null,
      // The inset and the radius together are what "a board on a field" means.
      // A slab has neither, and the slab is the failure :4737 describes.
      radius: app ? parseFloat(getComputedStyle(app).borderRadius) || 0 : 0,
      responsive: !!stage && [...stage.classList].some((c) => c.startsWith('stagewrap--responsive')),
      culprits: [...document.querySelectorAll('*')]
        .filter((e) => e.getBoundingClientRect().width > window.innerWidth + 1)
        .slice(0, 3)
        .map((e) => `${e.tagName}.${[...e.classList].join('.')}`),
    };
  });

test.describe('regime boundary', () => {
  test('1279 is still the old regime and does not overflow', async ({ page }) => {
    await boot(page);
    await page.setViewportSize({ width: 1279, height: 800 });
    await page.goto('./');
    await settled(page);
    const m = await measure(page);
    expect(m.culprits, 'nothing wider than the viewport').toEqual([]);
    expect(m.hOverflow).toBeLessThanOrEqual(1);
    // Full-bleed below 1280 is the 2026-07-22 tablet ruling, not an accident.
    expect(m.stageW).toBe(1279);
  });

  test('1280 switches to the responsive canvas', async ({ page }) => {
    await boot(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('./');
    await settled(page);
    const m = await measure(page);
    expect(m.hOverflow).toBeLessThanOrEqual(1);
    // min(100% - 48px, 1280px) — the inset is the point, so it must be < 1280.
    expect(m.stageW).toBeLessThan(1280);
  });

  /*
   * The regression this file exists for. If the width-only query at :4737 is
   * ever folded back under a min-height gate — the shape every neighbouring
   * rule has — this window loses the inset and the radius and goes back to
   * being the slab the host was looking at. Nothing else in the suite is short
   * enough to notice.
   */
  test('1280x654 — the host\'s own window — keeps the canvas, not a slab', async ({ page }) => {
    await boot(page);
    await page.setViewportSize({ width: 1280, height: 654 });
    await page.goto('./');
    await settled(page);
    const m = await measure(page);
    expect(m.culprits, 'nothing wider than the viewport').toEqual([]);
    expect(m.hOverflow).toBeLessThanOrEqual(1);
    expect(m.responsive, 'a responsive surface, not the phone silhouette').toBe(true);
    expect(m.stageW, 'inset from the viewport edge').toBeLessThan(1280);
    expect(m.radius, 'rounded, i.e. a board on a field').toBeGreaterThan(24);
  });
});
