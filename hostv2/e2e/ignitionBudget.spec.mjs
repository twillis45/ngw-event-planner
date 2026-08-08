// ─── THE FIRST BOOT HAS A TIME BUDGET (2026-08-06, board, mobile seat) ──────
// Measured on a real device profile: 18.5s from boot to the primary action being
// visible, because the reveal was `1300 + nodeN*2000 + 900` with nodeN uncapped
// at rows-1 (up to 8). The better the parser read her sentence, the longer she
// waited — the ceremony was charging her for the intelligence.
//
// prefers-reduced-motion already did the same journey in 279ms, so a short path
// was always sanctioned; it just wasn't what most hosts got.
//
// This pins the ceiling. It is a BUDGET, not a duration — tune the beats freely,
// but the first boot may not exceed it, and it may not grow with how much the
// app understood.
import { test, expect } from '@playwright/test';

const RICH = {
  id: 'E2E_TEST_ignition', type: 'Birthday', name: 'A rich parse', isDestination: true,
  venueCity: 'Santa Fe', venueState: 'NM', date: '2027-06-20', endDate: '2027-06-24',
  guestMode: 'count', guestEstimate: 5, guestCount: 5, totalBudget: 2000,
  budget: [], guests: [], vendors: [], timeline: [],
  foodChoices: { sourcing: 'host cooks' },
};

const BUDGET_MS = 6000;   // ceiling for a WARM boot

test('a warm boot reaches the primary action fast', async ({ page }) => {
  // NOTE ON SCOPE, so nobody reads more into this than it proves: this is a WARM
  // boot of an existing event. It does NOT exercise the ignition reveal, which
  // fires only when a plan is BUILT. An earlier version of this test claimed to
  // measure the reveal and returned 303ms — it was loading a stored event and
  // measuring nothing. The reveal ceiling is verified separately, in a browser.
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
  }, RICH);
  const t0 = Date.now();
  await page.goto('./');
  const cta = page.locator('button, a').filter({ hasText: /Open|Add|Sort|Decide|Confirm|Plan/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 20000 });
  await expect(cta).toBeInViewport({ timeout: 20000 });
  const elapsed = Date.now() - t0;
  console.log(`WARM_BOOT_TO_ACTION_MS ${elapsed}`);
  expect(elapsed, `warm boot took ${elapsed}ms`).toBeLessThanOrEqual(BUDGET_MS);
});
