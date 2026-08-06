// ─── RESPONSIVE BASELINE (Phase 5G-C1 Part 13) ───────────────────────────────
//
// Establishes what the shell ACTUALLY does at each viewport class, before any
// responsive work. Written because a single measurement at 2048px was generalised
// to four viewport classes and got it wrong: the CSS already carries a TABLET
// RULING (2026-07-22) retiring the phone silhouette below 1280px, so tablets render
// full-bleed and were never letterboxed.
//
// This runs at six explicit sizes in ONE browser context via setViewportSize, so the
// numbers come from the same build and the same app state. It asserts nothing about
// what the design SHOULD be — it records what is, so the after-sweep has something
// honest to compare against.
import { test, expect } from './fixtures.mjs';

const VIEWPORTS = [
  { name: 'narrow-mobile', width: 360, height: 780 },
  { name: 'large-mobile', width: 430, height: 860 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1512, height: 950 },
  { name: 'large-monitor', width: 1920, height: 1080 },
];

test('measure the shell composition at every viewport class', async ({ page }) => {
  const rows = [];
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('./');
    // WAIT FOR THE SPLASH TO LEAVE, not for a timeout and not for text.
    // A 700ms wait screenshotted the splash. Waiting on app text then passed while
    // the splash was STILL COVERING the shell — .splash is an overlay, so the app
    // had content underneath the whole time. Only the overlay's absence proves the
    // shell is actually visible.
    await page.waitForFunction(() => {
      const sp = document.querySelector('.splash');
      if (sp) {
        const cs = getComputedStyle(sp);
        if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01) return false;
      }
      const app = document.querySelector('.app');
      return !!app && (app.innerText || '').trim().length > 120;
    }, null, { timeout: 20_000 });
    await page.waitForTimeout(400);       // let the reveal settle before measuring

    const m = await page.evaluate(() => {
      const stage = document.querySelector('.stagewrap');
      const app = document.querySelector('.app');
      const sr = stage ? stage.getBoundingClientRect() : null;
      const ar = app ? app.getBoundingClientRect() : null;
      const cs = stage ? getComputedStyle(stage) : null;
      const doc = document.documentElement;
      return {
        vw: window.innerWidth,
        stageW: sr ? Math.round(sr.width) : null,
        appW: ar ? Math.round(ar.width) : null,
        transform: cs ? cs.transform : null,
        // Horizontal overflow is a real defect at any width.
        docScrollW: doc.scrollWidth,
        docClientW: doc.clientWidth,
      };
    });
    const usable = m.appW && m.vw ? Math.round((m.appW / m.vw) * 100) : null;
    rows.push({ ...vp, ...m, usablePct: usable, deadSpacePct: usable == null ? null : 100 - usable });

    // No horizontal overflow anywhere — this one IS an assertion, at every size.
    expect(m.docScrollW, `${vp.name}: horizontal overflow`).toBeLessThanOrEqual(m.docClientW + 1);

    await page.screenshot({ path: `review-shots/baseline-${vp.name}.png`, fullPage: false });
  }

  // eslint-disable-next-line no-console
  console.log('\nRESPONSIVE_BASELINE\n' + rows.map(r =>
    `  ${r.name.padEnd(16)} vw=${String(r.vw).padStart(4)}  app=${String(r.appW).padStart(4)}px  `
    + `usable=${String(r.usablePct).padStart(3)}%  dead=${String(r.deadSpacePct).padStart(3)}%  transform=${r.transform}`
  ).join('\n') + '\nEND_BASELINE');

  expect(rows.length).toBe(VIEWPORTS.length);
});
