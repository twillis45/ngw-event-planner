// ─── CAPTURE: the shopping hero, after the density fix ──────────────────────
//
// Photographs the `sheet.kind === 'food'` hero at 390px, which is where the
// price-provenance sentence was demoted from a third `Grounding` line into the
// muted provenance stamp (HostShellV2.jsx, 2026-09-24).
//
// USES THE SEEDED DEMO EVENT AND THE SHARED `openSectionByName` FIXTURE, not a
// hand-rolled localStorage seed plus a text click. The first threshold demo
// hand-rolled both and never reached this sheet at all: a budget prompt sat in
// front of it, "Plan the food" did nothing, and the spec still passed because
// its only checks were "reached the app" and "the two captures differ" — which
// two different guest counts satisfy on the home screen alone.
//
//   DENSITY_CAPTURE=1 npx playwright test e2e/_densityCapture.spec.mjs \
//     --config playwright.sandbox.config.mjs --project=desktop
import { test, expect, openSectionByName } from './fixtures.mjs';
import fs from 'node:fs';

const OUT = new URL('../../review-artifacts/2026-09-24_hero_density/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

test.skip(!process.env.DENSITY_CAPTURE, 'capture instrument — set DENSITY_CAPTURE=1 to run');

// 390px: the mobile-flagship geometry the density complaint was made against.
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

test('the shopping hero at 390px', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-last-event', 'test-day-before-vendors');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 120;
  }, null, { timeout: 20000 });

  await openSectionByName(page, 'spread');
  await expect(page.locator('#sheet-title')).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(600);

  // ── THE INSTRUMENT PROVES IT REACHED THE HERO ──────────────────────────────
  // Not "a file exists". These read the composed DOM for the four parts of the
  // parity kit and for the ONE muted line the fix produces. If the sheet did not
  // open, or opened on the no-kitchen / no-headcount branch, every one is absent
  // and this goes red instead of photographing the wrong screen.
  const sheet = page.locator('.sheet').last();
  const heroText = await sheet.innerText();
  expect(heroText).toMatch(/estimate, all in/i);   // hero signature since 2026-09-24

  // The count of `.grounding` elements IS the fix. Before: three `Grounding`
  // lines plus the vintage stamp. After: two, plus one merged muted line.
  const grounding = await sheet.locator('.grounding').allInnerTexts();

  await page.screenshot({ path: `${OUT}shopping-hero-390.png`, fullPage: false });
  fs.writeFileSync(`${OUT}shopping-hero-390.txt`,
    `GROUNDING BLOCKS (${grounding.length}):\n${grounding.map((g, i) => `  [${i}] ${g.replace(/\n/g, ' / ')}`).join('\n')}\n\n--- FULL SHEET TEXT ---\n${heroText}`);

  // eslint-disable-next-line no-console
  console.error(`\n=== SHOPPING HERO, ${grounding.length} .grounding blocks ===\n${grounding.map((g, i) => `[${i}] ${g.replace(/\n/g, ' / ')}`).join('\n')}\n`);
});
