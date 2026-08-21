// ─── THE DESKTOP DETAIL PANEL, PROVEN RATHER THAN ASSUMED ───────────────────
//
// The 2026-08-07 spacing read's item 1 ("move the guest editor into the right
// column") was ATTEMPTED, reverted, and recorded as blocked on one unknown:
// what capped the roster's width. That cap was found and fixed (styles.css:
// `.stagewrap--responsive-data > .sheet > .roster{ max-width:none }`), and the
// two-column grid shipped gated on `[data-rail="1"][data-bp="desktop"]`.
//
// But "shipped" was never DRIVEN at a desktop viewport — the audit trail says
// the CSS exists, not that a host sees a panel. This spec is that proof, and
// it is written as a measurement, not a screenshot: open a guest, and assert
// the detail sits BESIDE the list (same top, to the right) instead of pushing
// it down, with column 1 wide enough to still be a table.
//
// The failure it guards is the one the attempt found: a detail column that
// squeezes the list instead of using the empty canvas. That reads as a
// deliberate layout in a screenshot and only measurement catches it.
import { test, expect, settled } from './fixtures.mjs';

const ROSTER = Array.from({ length: 8 }, (_, k) => ({
  id: 'g-d' + k,
  name: 'Detail Person ' + String(k).padStart(2, '0'),
  rsvp: k % 3 === 0 ? 'Yes' : '',
}));

const boot = async (page) => {
  await page.addInitScript((guests) => {
    localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
    localStorage.setItem('ngw-hostv2-patch-test-two-days', JSON.stringify({ guests }));
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ROSTER);
  await page.goto('?elegant=1');
  await settled(page);
};

// Desktop only, by design: below the rail band the accordion IS the right
// answer (there is no room for list AND detail at 1024 with a 200px rail),
// which is why the CSS is gated the same way.
test.describe('the roster detail panel at desktop', () => {
  test.skip(({ viewport }) => !viewport || viewport.width < 1280, 'desktop-only surface');

  test('an opened guest renders BESIDE the list, and the list stays a table', async ({ page }) => {
    await boot(page);
    await page.getByRole('button', { name: /^Guests$/ }).first().click();
    await settled(page);

    const roster = page.locator('.roster');
    await expect(roster).toBeVisible();
    // The gate itself: two columns, not one.
    const cols = await roster.evaluate(el => getComputedStyle(el).gridTemplateColumns);
    expect(cols.split(' ').length).toBe(2);

    const rowsBefore = await page.locator('.roster .grow').count();
    expect(rowsBefore).toBeGreaterThan(1);
    const firstRowBox = await page.locator('.roster .grow').first().boundingBox();

    // Open a guest — the reply control is the disclosure (per the 08-07 board).
    await page.locator('.roster .grow button[aria-expanded]').first().click();
    await settled(page);

    const detail = page.locator('.roster .gdetail');
    await expect(detail).toBeVisible();
    const d = await detail.boundingBox();
    const listAfter = await page.locator('.roster .grow').first().boundingBox();

    // BESIDE, not below: the detail starts to the right of the list column…
    expect(d.x).toBeGreaterThan(listAfter.x + listAfter.width - 1);
    // …and near the top of the roster rather than after the rows.
    expect(d.y).toBeLessThan(firstRowBox.y + 200);
    // THE REVERTED ATTEMPT'S FAILURE: the list must not be squeezed. It keeps
    // its width (the panel spends the empty canvas, not the table's measure).
    expect(listAfter.width).toBeGreaterThan(420);
    // And the rows do not reflow when the panel opens.
    expect(Math.abs(listAfter.x - firstRowBox.x)).toBeLessThan(2);
  });
});
