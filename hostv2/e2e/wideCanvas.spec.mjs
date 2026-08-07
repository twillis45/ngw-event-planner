// ─── WHAT THE HOST SEES ABOVE 1280 (2026-08-06, board, design seat) ────────
// Everything the CI matrix ran was under 1280 — which is exactly where the
// shell stops being a phone silhouette and the responsive canvases switch on.
// The largest CSS feature in the repo had no coverage at all, and an audit
// found three real defects there. These pin the ones that were fixed.
import { test, expect } from '@playwright/test';

const EV = {
  id: 'E2E_TEST_wide', type: 'Birthday', name: 'Wide canvas', isDestination: true,
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
  await page.goto('./');
  await page.waitForTimeout(2200);
};

test.skip(({ viewport }) => !viewport || viewport.width < 1280, 'above-1280 behaviour only');

test('nothing overflows horizontally on a wide canvas', async ({ page }) => {
  await boot(page);
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(o).toBeLessThanOrEqual(1);
});
