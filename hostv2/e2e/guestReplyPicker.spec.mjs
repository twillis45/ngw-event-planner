// ─── THE REPLY PICKER LIVES IN THE DISCLOSURE, NOT IN ITS OWN TRIGGER ────────
// Board call, 2026-08-07. The guest roster used to render
// `rsvpPickFor === i ? <picker> : <trigger>` — the picker REPLACED the control
// that opened it, so the value you came to change disappeared as you changed it,
// focus died with the unmounted trigger, and a ~26px tag became four chips that
// reflowed the row and every row under it mid-tap.
//
// Three things must stay true, and none of them is visible to a unit test:
//   1. the COLLAPSED list contains no picker at all;
//   2. opening a guest does not move any collapsed row (UX_05:174 — height may
//      only change inside the accordion);
//   3. the targets clear the 44px phone floor (UX_03), which is the binding
//      floor here even though UX_05:72 would accept 32 for a chip.
//
// Runs on the phone project because that is where the floor bites.
import { test, expect } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await page.waitForTimeout(1600);
  await page.locator('.splash').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300);
};

// Deterministic nav to the roster: masthead menu → Jump to a section → Guests.
const openGuests = async (page) => {
  await page.locator('.ev-eyebrow').first().click({ timeout: 5000 });
  await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click({ timeout: 5000 });
  const guests = page.locator('.sheet').last().getByText('Guests', { exact: false }).first();
  await guests.click({ timeout: 5000 });
  await page.waitForTimeout(400);
};

test.describe('the guest reply picker', () => {
  test('is absent from the collapsed roster, and opening one guest moves no other row', async ({ page }) => {
    await boot(page);
    await openGuests(page);

    const triggers = page.locator('.grow > button[aria-expanded]');
    const n = await triggers.count();
    if (n === 0) { test.skip(true, 'this state has no roster rows'); return; }

    // 1. nothing to pick from until a guest is opened
    expect(await page.locator('[role="radiogroup"]').count(),
      'the collapsed roster must not contain a reply picker').toBe(0);

    // MEASURE SHAPE, NOT POSITION. The first cut of this asserted on absolute
    // getBoundingClientRect().top and failed at 860x430 — where the detail row
    // makes a short sheet scrollable, so every row's viewport top shifts by the
    // same amount. That is the CONTAINER SCROLLING, which is fine and often
    // wanted (it brings the picker into view); it is not the row reflow
    // UX_05:174 forbids. Heights and the gaps between consecutive rows are
    // scroll-invariant, so they isolate the thing actually under test — and a
    // uniform shift passes while a real reflow still fails.
    const shape = async () => page.locator('.grow').evaluateAll((els) => {
      const r = els.map((e) => e.getBoundingClientRect());
      return {
        heights: r.map((b) => Math.round(b.height)),
        gaps: r.slice(1).map((b, k) => Math.round(b.top - r[k].top)),
      };
    });
    const before = await shape();

    await triggers.last().click({ timeout: 5000 });
    await page.waitForTimeout(250);

    // 2. every collapsed row keeps its height and its spacing
    expect(await shape(), 'opening a guest must not reflow the collapsed rows').toEqual(before);

    const groups = page.locator('[role="radiogroup"]');
    expect(await groups.count(), 'exactly one picker, and only for the open guest').toBe(1);

    // 3. the phone floor
    const heights = await groups.first().locator('[role="radio"]').evaluateAll(
      (els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    expect(heights.length, 'Yes / No / Maybe / no reply').toBe(4);
    for (const h of heights) expect(h, `reply target ${h}px is under the 44px phone floor`).toBeGreaterThanOrEqual(44);

    // exactly one is current — a radiogroup, not four independent toggles
    const checked = await groups.first().locator('[role="radio"]').evaluateAll(
      (els) => els.filter((e) => e.getAttribute('aria-checked') === 'true').length);
    expect(checked, 'exactly one reply is the current one').toBe(1);
  });

  test('setting a reply updates the row it came from and keeps the picker open', async ({ page }) => {
    await boot(page);
    await openGuests(page);

    const triggers = page.locator('.grow > button[aria-expanded]');
    if (await triggers.count() === 0) { test.skip(true, 'this state has no roster rows'); return; }
    const trigger = triggers.last();
    await trigger.click({ timeout: 5000 });
    await page.waitForTimeout(250);

    const radios = page.locator('[role="radiogroup"]').first().locator('[role="radio"]');
    // pick whichever value is NOT currently set, so the assertion is a real change
    const target = radios.filter({ hasNotText: /^$/ }).nth(
      await radios.evaluateAll((els) => els.findIndex((e) => e.getAttribute('aria-checked') !== 'true')));
    const want = (await target.textContent()).trim();
    await target.click({ timeout: 5000 });
    await page.waitForTimeout(300);

    // the collapsed chip now says what was picked ('no reply' renders as-is)
    expect((await trigger.textContent()).trim().toLowerCase()).toBe(want.toLowerCase());
    // and the row stays open, so a mistap is correctable without reopening
    expect(await trigger.getAttribute('aria-expanded')).toBe('true');
    expect(await page.locator('[role="radiogroup"]').count()).toBe(1);
  });
});
