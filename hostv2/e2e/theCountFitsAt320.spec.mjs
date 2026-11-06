// ─── THE COUNT FITS AT 320 ───────────────────────────────────────────────────
//
// Run 2 (11/6/2026, R2-12): on a 320×640 phone the home progress line truncated
// to "3 of 7 plan par…" (the count itself lost) and the fold handle sat against
// "dated work needs you now". Measured, not looked at.
import { test, expect } from './fixtures.mjs';

const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

test('at 320×640 the progress labels are whole and the handle keeps a gap', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.addInitScript((d) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'E2E_320', type: 'Game Night', name: 'Game night', date: d, createdAt: new Date().toISOString(),
      guestMode: 'count', guestEstimate: 10, venueAddress: '12 Sample Rd', venueCity: 'Pasadena', venueState: 'MD',
      budget: [], vendors: [], guests: [], timeline: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'E2E_320');
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, day(1));
  await page.goto('./?elegant=1');
  await page.locator('.eprog-labels').first().waitFor({ state: 'visible', timeout: 20000 });
  const m = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('.eprog-labels > span')];
    const grab = document.querySelector('.efold-grab');
    const lowest = Math.max(...spans.map((s) => s.getBoundingClientRect().bottom));
    return {
      clipped: spans.filter((s) => s.scrollWidth > s.clientWidth + 1).map((s) => s.innerText),
      gap: grab ? grab.getBoundingClientRect().top - lowest : null,
    };
  });
  expect(m.clipped, 'no label is cut off').toEqual([]);
  expect(m.gap, 'the handle sits clear of the text').toBeGreaterThanOrEqual(8);
});
