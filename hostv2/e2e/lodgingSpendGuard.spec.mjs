// ─── GUARD THE SPEND, NOT THE STATUS (board ruling 2026-08-14) ───────────────
//
// docs/audits/2026-08-14_VENUE_READER_BOARD_RULING.md
//
// The operations seat named both the defect and the place to fix it: "the
// warning belongs where the money leaves, not on a status pill 400 pixels
// away." The Grandmother seat is why it matters — shown a screen that said
// "3 of 6 handled" and a button telling her to sort where everyone stays, she
// said she would book twenty-four rooms, and if the party landed forty minutes
// away: "I'd shut the laptop and I would not open it again."
//
// So this is not an interstitial the host clicks past once. It renders inside
// the cockpit, above the fold, for the whole booking — and it disappears the
// moment the venue is named, because a warning that outlives its condition is
// the next thing a host learns to ignore.
//
// BOTH DIRECTIONS ARE THE CONTRACT. A guard that always shows is noise; a guard
// that never shows is nothing. The pair is what makes it a gate.
import { test, expect } from './fixtures.mjs';

const BASE = {
  type: 'Birthday', name: "Mom's 70th", isDestination: true,
  venueCity: 'Santa Fe', venueState: 'NM',
  date: '2027-06-20', endDate: '2027-06-24',
  guestMode: 'count', guestEstimate: 24, guestCount: 24, totalBudget: 9000,
  budget: [], guests: [], vendors: [], timeline: [],
};

const TOWN_ONLY = { ...BASE, id: 'E2E_guard_town' };
const NAMED = { ...BASE, id: 'E2E_guard_named', venue: 'The Lodge at Santa Fe' };

const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('./?demo=lodging');
  await page.locator('.lc-wrap').waitFor({ state: 'visible', timeout: 20_000 });
};

test.describe('the lodging spend guard', () => {
  test('an unsigned venue warns IN the cockpit, above the fold', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await boot(page, TOWN_ONLY);

    const guard = page.locator('.lc-venuegap');
    await expect(guard).toBeVisible();
    // Above the fold is part of the promise: a warning below the buying
    // controls is a warning the host meets after the money has gone.
    await expect(guard).toBeInViewport();

    const text = (await guard.innerText()).replace(/\s+/g, ' ');
    // The three things the pros insisted the copy carry: the gap, the money
    // consequence, and the CHEAPER ORDER — a hold is not a booking, and the
    // product had no vocabulary for the difference.
    expect(text).toMatch(/venue address isn’t set yet/i);
    expect(text).toMatch(/refundable/i);
    expect(text).toMatch(/hold/i);

    // It sits above the page's own headline, not tucked under it.
    const gy = (await guard.boundingBox()).y;
    const hy = (await page.locator('.lc-h1').boundingBox()).y;
    expect(gy).toBeLessThan(hy);

    // The act is named — never "Go" / "View" / "Do this" (CTA doctrine).
    const cta = guard.locator('button');
    await expect(cta).toHaveText(/Add the venue address/i);
  });

  test('the CTA routes to the venue field, and it is a real destination', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await boot(page, TOWN_ONLY);
    await page.locator('.lc-venuegap button').click();
    // Left the cockpit…
    await expect(page.locator('.lc-wrap')).toHaveCount(0, { timeout: 15_000 });
    // …and landed on the surface that owns the field, asking for it. Driven,
    // not inferred: this repo has shipped CTAs whose route resolved to nothing.
    await expect(page).toHaveURL(/focus=event-venue/);
    const ask = page.locator('.hero.elegant .hzone');
    await expect(ask).toBeVisible({ timeout: 15_000 });
    await expect(ask).toHaveText(/Pick the place/i);
  });

  test('a named venue raises no guard at all', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await boot(page, NAMED);
    // `toHaveCount(0)` rather than `not.toBeVisible()`: the promise is that the
    // element is not rendered, and a hidden node would satisfy the weaker form.
    await expect(page.locator('.lc-venuegap')).toHaveCount(0);
  });

  test('it holds on a phone, where the cockpit is the whole screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await boot(page, TOWN_ONLY);
    const guard = page.locator('.lc-venuegap');
    await expect(guard).toBeVisible();
    await expect(guard).toBeInViewport();
  });
});
