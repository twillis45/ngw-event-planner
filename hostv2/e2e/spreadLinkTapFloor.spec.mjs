// ─── THE OFFENDER THE SWEEP COULD NOT SEE (2026-08-15) ──────────────────────
//
// `mobileTapFloor.spec.mjs` sweeps every control on the home surface and the
// section directory, and it passes. It still missed a 187x17 control, because
//
//   THE SWEEP'S FIXTURE SETTLES THE FOOD DECISION.
//
// "Open the spread (N items) ›" renders only while food is UNSETTLED, so the
// sweep was honest and clean and the offender was simply never on screen. A
// sweep is only as complete as the STATES its fixture reaches — a different
// blind spot from the one mobileTapFloor was written to close.
//
// TWO THINGS THIS FILE EXISTS TO KEEP FROM COMING BACK.
//
// 1. A GEOMETRY ASSERTION WOULD HAVE PASSED ON A DEAD CONTROL. The first fix
//    here was a 44px `::after`, the same trick `.sheet-back` uses. It reported
//    position:absolute, top:0, height:44px — every measurement you would think
//    to write — while `.editor-slot` (overflow:clip, ending at this button's
//    exact bottom edge) clipped it to nothing. Measured fixed, dead to touch.
//    That is why the last test clicks a real coordinate below the text instead
//    of asserting a computed box, and why the fix is real padding.
//
// 2. THE SPLASH LIES TO PROBES. `settled()` returns while `.splash-leaving` is
//    still over the page, so `elementFromPoint` reports the overlay and any
//    click lands on it. Two diagnoses were thrown away to this before the wait
//    below was added. Do not remove it.
import { test, expect, settled } from './fixtures.mjs';

const FLOOR = 44;

// Food deliberately unset — that is the state under test, not an oversight.
const EV = {
  id: 'E2E_spreadlink', type: 'Birthday', name: 'Spread Link',
  venueCity: 'Santa Fe', venueState: 'NM', venue: 'The Lodge',
  date: '2027-06-20', guestMode: 'count', guestEstimate: 20, guestCount: 20,
  totalBudget: 3000, budget: [], guests: [], vendors: [], timeline: [],
};

const boot = async (page) => {
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('./');
  await settled(page);
  // see (2) in the header — settled() is not enough, the splash is still there
  await page.waitForFunction(() => !document.querySelector('.splash'), null, { timeout: 15_000 });
};

const link = (page) => page.locator('button.spread-link');

test.describe('the spread link clears the tap floor', () => {
  test('PREMISE — the control renders, so this spec is not vacuously green', async ({ page }) => {
    await boot(page);
    // The blind spot was "the offender was never on screen". If this ever stops
    // rendering, the rest of the file proves nothing and must say so HERE.
    await expect(link(page)).toHaveCount(1);
    await expect(link(page)).toContainText(/Open the spread/i);
  });

  test('the control itself is 44px — no pseudo-element, which .editor-slot clips', async ({ page }) => {
    await boot(page);
    const m = await page.evaluate(() => {
      const b = document.querySelector('button.spread-link');
      const box = b.getBoundingClientRect();
      const after = getComputedStyle(b, '::after');
      return { h: Math.round(box.height), w: Math.round(box.width), afterContent: after.content };
    });
    expect(m.h).toBeGreaterThanOrEqual(FLOOR);
    expect(m.w).toBeGreaterThanOrEqual(FLOOR);
    // Guard the regression directly: if someone "optimises" this back to a
    // zero-layout ::after expander, it is clipped and dead. See (1) above.
    expect(m.afterContent).toBe('none');
  });

  test('growing it pushed nothing off the fold', async ({ page }) => {
    await boot(page);
    // The padding costs 27px of hero-card height. That is affordable, but it is
    // affordable ONLY while the card still fits — assert it rather than hope.
    const fits = await page.evaluate(() => {
      const c = document.querySelector('.card.hero-card');
      return c ? c.getBoundingClientRect().bottom <= window.innerHeight : null;
    });
    expect(fits).toBe(true);
  });

  test('a REAL click inside the expander — below the text — opens the spread', async ({ page }) => {
    await boot(page);
    const l = link(page);
    await l.scrollIntoViewIfNeeded();
    const box = await l.boundingBox();
    // Aim in the padding, 6px above the bottom edge — outside the text, inside
    // the control. The clipped ::after version failed exactly here.
    await page.mouse.click(box.x + 40, box.y + box.height - 6);
    await expect(page.locator('#sheet-title')).toHaveText(/spread/i, { timeout: 10_000 });
  });
});
