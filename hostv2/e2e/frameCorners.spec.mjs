// ─── ONE RECTANGLE, ONE CORNER ──────────────────────────────────────────────
//
// The host has now caught this same defect twice by eye, on two different
// layers, which is what makes it worth a standing gate rather than a third fix.
//
//  1. The SHEET carried a phone bottom-sheet corner (26px top / 46px bottom)
//     inside a 20px desktop frame — fixed in the parity pass.
//  2. The SPLASH carried the 393x852 silhouette's 48px bezel inside that same
//     20px frame. Measured at 1440 before the fix: stagewrap 20, splash 48,
//     app 0 — three corners stacked on one rectangle.
//
// Both had the same cause. A radius written for the phone silhouette is
// unconditional at >=700px, while the desktop canvas overrides `.app` to a flat
// or 20px corner underneath it. Nothing connected the two, so each new full-
// bleed layer inherited the bezel by default and had to be caught by looking.
//
// This asserts the rule instead: with the rail up the stage is a real canvas,
// and every layer that fills the frame edge-to-edge takes the FRAME's corner.
import { test, expect, settled } from './fixtures.mjs';

const radius = (page, sel) => page.locator(sel).evaluate((n) => getComputedStyle(n).borderRadius);

test.describe('frame corners at desktop', () => {
  test.skip(({ viewport }) => !viewport || viewport.width < 1280, 'the desktop canvas only exists past the rail band');

  test('the splash takes the frame corner, not the phone bezel', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
      localStorage.setItem('ngw-welcomed', '1');
      localStorage.setItem('ngw-v2-welcomed', '1');
      // splash-seen deliberately unset: we need the splash actually up.
    });
    await page.goto('?elegant=1');
    await page.locator('.splash').waitFor({ state: 'visible', timeout: 15_000 });
    await expect(page.locator('.stagewrap')).toHaveAttribute('data-rail', '1');

    const frame = await radius(page, '.stagewrap');
    const splash = await radius(page, '.splash');
    expect(splash, `splash ${splash} does not match frame ${frame}`).toBe(frame);
  });

  test('an open sheet takes it too', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-welcomed', '1');
      localStorage.setItem('ngw-v2-welcomed', '1');
    });
    await page.goto('?elegant=1');
    await settled(page);
    await page.getByRole('button', { name: /^Guests$/ }).first().click();
    await settled(page);

    const frame = await radius(page, '.stagewrap');
    const sheet = await radius(page, '.sheet');
    expect(sheet, `sheet ${sheet} does not match frame ${frame}`).toBe(frame);
  });
});
