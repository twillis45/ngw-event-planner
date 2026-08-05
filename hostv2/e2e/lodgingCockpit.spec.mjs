// ─── THE LODGING SLICE, DRIVEN (2026-08-04) ────────────────────────────────
//
// The cockpit had no e2e at all. Every defect found in it this week was found
// by hand, and the two that mattered most — a pick that claimed a booking, and
// a shortlist that could not grow past one — sat behind PASSING unit gates that
// hand-built their events instead of walking the surface.
//
// This walks the real path with real gestures: seed -> doors -> paste -> weigh
// -> correct -> pick. It runs at the project viewports, so the phone tier
// (<=430px) is exercised for the first time.
//
// It talks to a REAL unfurl backend (whatever REACT_APP_API_BASE_URL points at
// when dist was built). Nothing here is stubbed, so a green run means the round
// trip works end to end.
import { test, expect } from '@playwright/test';

const DEMO = './?demo=lodging';
const LISTING = 'https://www.airbnb.com/rooms/20421338';

// Playwright gives every test its own context, so storage already starts empty.
// An addInitScript clear() here was WRONG: it re-runs on every navigation, so it
// wiped the seed during seedExample()'s own reload and the cockpit bounced back
// to the empty state. Caught on the first run of this file.
const fresh = async (page) => { await page.goto(DEMO); };

// The seeded example is the ONLY fixture — no hand-built event objects, which
// is precisely how the unit gates missed the pick-claims-a-booking defect.
const seed = async (page) => {
  await fresh(page);
  await page.getByRole('button', { name: /Load the Santa Fe example/i }).click();
  await expect(page.locator('.lc-h1')).toBeVisible();
};

const paste = async (page, text) => {
  await page.locator('textarea').fill(text);
  await page.getByRole('button', { name: /Read what I pasted/i }).click();
};

test.describe('Where everyone stays — the Santa Fe birthday', () => {
  test('a fresh device offers the example rather than a dead end', async ({ page }) => {
    await fresh(page);
    await expect(page.locator('.lc-h1')).toHaveText(/Nothing to plan yet/i);
    // The defect this replaced named an act and offered nothing.
    await expect(page.getByRole('button', { name: /Load the Santa Fe example/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Open the planner/i })).toBeVisible();
    // The description is DERIVED — it said "five nights" while spanNights said four.
    await expect(page.locator('.lc-note').first()).toContainText('4 nights');
    await expect(page.locator('.lc-note').first()).toContainText('10 guests');
  });

  test('the three doors carry the answers the host already gave', async ({ page }) => {
    await seed(page);
    await expect(page.locator('.lc-h1')).toHaveText(/Go find some places/i);
    for (const door of ['Airbnb', 'Vrbo', 'Hotels']) {
      await expect(page.getByRole('link', { name: new RegExp(door, 'i') })).toBeVisible();
    }
    const line = page.getByText(/Opens with your own answers already in it/i);
    await expect(line).toContainText('Santa Fe');
    await expect(line).toContainText('10 guests');
    // Host language, never ISO — this shipped as "2028-06-17" once.
    await expect(line).not.toHaveText(/\d{4}-\d{2}-\d{2}/);
  });

  test('a pasted listing comes back with its own facts', async ({ page }) => {
    await seed(page);
    await paste(page, LISTING);
    // Bounded: unfurlListing aborts at 12s, so this can never hang the suite.
    await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });
    const row = page.locator('.lc-opt-name').first();
    // The name is READ, not "Airbnb listing" — that fallback means the read failed.
    await expect(row).toContainText(/Santa Fe/i);
    await expect(row).not.toHaveText(/^Airbnb listing$/);
    // `sleeps` is the field the whole comparison is blocked on; it only exists
    // because the unfurl reads the listing's structured record.
    const stored = await page.evaluate(() => {
      const ev = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0];
      return (ev.lodgingOptions || [])[0] || {};
    });
    expect(stored.sleeps, 'sleeps must come off the listing, not be typed').toBeGreaterThan(0);
    expect(String(stored.photoUrl || '')).toMatch(/^https:\/\//);
    expect(stored.sources.sleeps).toBe('read');
  });

  test('the kitchen claim says where it came from, and the host can overrule it', async ({ page }) => {
    await seed(page);
    await paste(page, LISTING);
    await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });

    await expect(page.getByText(/There is a kitchen/i)).toBeVisible();
    // An inference must name its basis — it used to speak like a typed fact.
    await expect(page.getByText(/Taken from the Airbnb link/i)).toBeVisible();

    // ...and the correction must actually take. It used to persist and be ignored.
    await page.getByRole('button', { name: /A hotel or room block/i }).click();
    await expect(page.getByText(/There is no kitchen/i)).toBeVisible();
    await expect(page.getByText(/You said:/i)).toBeVisible();
  });

  test('the shortlist can grow, and picking is not booking', async ({ page }) => {
    await seed(page);
    await paste(page, LISTING);
    await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });

    // The only route to a second place used to vanish at this stage.
    await expect(page.getByRole('button', { name: /Add another place/i })).toBeVisible();

    await page.getByRole('button', { name: /Make .* the pick/i }).first().click();
    // CHOOSING IS NOT BOOKING — one press used to jump straight to "on the books".
    await expect(page.getByText(/Choosing is not booking/i)).toBeVisible();
    await expect(page.locator('.lc-step.is-on')).toHaveText(/The pick/i);
    await expect(page.locator('.lc-h1')).not.toHaveText(/on the books/i);
    // It names the act AND offers it. Matched on the ACCESSIBLE name, which
    // carries the house — an aria-label overrides the visible text, and that is
    // deliberate here: with two places on screen "Open it to book" alone would
    // be announced twice with nothing to tell them apart.
    await expect(page.getByRole('link', { name: /Open .* to book it/i })).toBeVisible();
  });

  test('nothing overflows the phone, and no console errors', async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));

    await seed(page);
    await paste(page, LISTING);
    await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'the page must never scroll sideways').toBeLessThanOrEqual(0);
    expect(await page.locator('body').innerText()).not.toMatch(/undefined|NaN|\[object/);
    expect(errors).toEqual([]);
  });
});
