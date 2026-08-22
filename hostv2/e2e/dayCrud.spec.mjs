// ─── ADD A DAY, DROP A DAY ──────────────────────────────────────────────────
//
// Workflow's named gap against Wanderlog. The span was editable only through a
// raw date input — a SPAN control, not a day control. A host thinks "the Sunday
// brunch got added", not "recompute the terminal date of the interval".
//
// The assertion that matters most is the LAST one: adding a day must actually
// open the span-gated "Your days" door. A day count that goes up while the
// programme stays hidden would be the number moving and nothing else — which
// is exactly the class of fault that took this session seven instances to see.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const boot = async (page, id) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', e);
  }, id);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Space, seats');
  await settled(page);
};

const count = async (page) => {
  const t = await page.locator('.day-crud .of').first().innerText();
  return /One day/i.test(t) ? 1 : parseInt((t.match(/(\d+)/) || [])[1], 10);
};

test('a single-day event can gain a day, and give it back', async ({ page }) => {
  await boot(page, 'my-crab-feast');
  await expect(page.locator('.day-crud')).toBeVisible();
  expect(await count(page)).toBe(1);

  // A single-day event has no day to drop — a control that appears to work
  // while doing nothing is worse than one that is plainly unavailable.
  expect(await page.locator('.day-crud button', { hasText: /Drop the last day/ }).count()).toBe(0);

  await page.locator('.day-crud button', { hasText: /Add a day/ }).click();
  await settled(page);
  expect(await count(page)).toBe(2);

  await page.locator('.day-crud button', { hasText: /Drop the last day/ }).click();
  await settled(page);
  expect(await count(page)).toBe(1);
  // ...and the drop control is gone again at one day.
  expect(await page.locator('.day-crud button', { hasText: /Drop the last day/ }).count()).toBe(0);
});

test('a spanning event counts its real days', async ({ page }) => {
  await boot(page, 'test-multi-day');
  expect(await count(page)).toBe(3);            // two nights = three days
  await page.locator('.day-crud button', { hasText: /Add a day/ }).click();
  await settled(page);
  expect(await count(page)).toBe(4);
});

test('the day count survives a reload — it is the event, not a toggle', async ({ page }) => {
  await boot(page, 'my-crab-feast');
  await page.locator('.day-crud button', { hasText: /Add a day/ }).click();
  await settled(page);
  expect(await count(page)).toBe(2);

  await page.reload();
  await settled(page);
  await openSectionByName(page, 'Space, seats');
  await settled(page);
  expect(await count(page)).toBe(2);
});

test('adding a day OPENS the per-day programme', async ({ page }) => {
  // THE ONE THAT PROVES IT DID SOMETHING. `spanNights(ev) >= 1` gates the
  // "Your days" door, and until today no seeded event tripped it. A day count
  // that rises while the programme stays hidden would be the number moving and
  // nothing else.
  await boot(page, 'my-crab-feast');
  // READS WHICHEVER DOOR LIST THIS VIEWPORT HAS. The first version queried
  // `.srail-row, .sec-row` directly, which at mobile matches nothing until the
  // Sections sheet is open -- so the door check read an empty list and reported
  // the programme missing on three viewports while it was there. Fourth time
  // today that assuming the desktop door broke a test everywhere else.
  const doors = async () => {
    const rail = page.locator('.srail-row');
    if (await rail.count()) {
      return rail.evaluateAll((ns) => ns.map((n) => (n.getAttribute('aria-label') || n.innerText || '').trim()));
    }
    // The space sheet is open on top of the eyebrow at these widths, so the
    // click was landing on a scrim. Close first, then walk.
    await page.keyboard.press('Escape');
    await settled(page);
    await page.locator('.ev-eyebrow').first().click({ timeout: 8000 });
    await page.locator('.sheet').last()
      .getByText('Jump to a section', { exact: false }).first().click({ timeout: 8000 });
    await settled(page);
    const names = await page.locator('.sheet').last().locator('.sec-row')
      .evaluateAll((ns) => ns.map((n) => (n.getAttribute('aria-label') || n.innerText || '').trim()));
    await page.keyboard.press('Escape');
    await settled(page);
    return names;
  };

  expect((await doors()).some((d) => /Your days/i.test(d))).toBe(false);

  // The door walk above may have closed the space sheet at mobile; reopen
  // before reaching for its controls.
  await openSectionByName(page, 'Space, seats');
  await settled(page);
  await page.locator('.day-crud button', { hasText: /Add a day/ }).click();
  await settled(page);

  expect((await doors()).some((d) => /Your days/i.test(d)),
    'the day count rose but the programme door never appeared').toBe(true);
});
