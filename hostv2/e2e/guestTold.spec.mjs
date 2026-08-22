// ─── WHO HAVE YOU TOLD ──────────────────────────────────────────────────────
//
// The transport board deferred guest sending and authorized this instead. The
// guest rails are `sms:`/`mailto:`/`tel:` — the phone's own apps send, and the
// app never claims otherwise. The cost of that honesty was that it watched a
// host open forty composers and remembered nothing.
//
// The risk this carries is the opposite of the one it fixes: a record that
// reads as a delivery claim would be the app lying about something it cannot
// see, on the list where being wrong costs the most. So the assertions are
// about what the copy SAYS as much as what the count does.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    // Wanda's guests carry no phone or email, so the rollup correctly renders
    // nothing there and every assertion would skip. Measured across the seeded
    // events: retirement, dmv-wedding and birthday have reachable guests.
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-retirement-party');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Guests');
  await settled(page);
};

test('the roster says who still does not know', async ({ page }) => {
  await boot(page);
  const rollup = page.locator('.told-rollup');
  await expect(rollup).toBeVisible();
  const line = (await rollup.innerText()).trim();

  // Either nobody is marked yet, or the count reads as the ruling specified.
  expect(line).toMatch(/Nobody marked told yet|Told \d+ of \d+|Told all \d+/);

  // THE RAIL THAT MATTERS: nothing here may read as delivery. The app took the
  // host's word; it did not watch anything arrive.
  expect(line).not.toMatch(/\bsent\b/i);
  expect(line).not.toMatch(/delivered|received/i);
});

test('marking one moves the count by exactly one, and undoes', async ({ page }) => {
  await boot(page);
  const rollup = page.locator('.told-rollup');
  const nums = async () => {
    const t = (await rollup.innerText()).trim();
    const m = t.match(/Told (\d+) of (\d+)/);
    return m ? { told: +m[1], total: +m[2] } : { told: 0, total: null };
  };

  // OPEN A GUEST FIRST. The contact rows -- and the record beside them -- live
  // in the expanded row, which is right: a roster of forty closed rows should
  // not carry forty composers. My first version looked for the button on the
  // collapsed list, found none, and skipped: a skip reads exactly like a pass
  // and would have shipped this untested.
  await page.locator('.grow button').first().click();
  await settled(page);
  const mark = page.locator('.guest-told').first();
  if (!(await mark.count())) test.skip(true, 'no reachable guest on this event — nothing to tell');

  // The label carries the relationship AND the source of the claim, so a
  // screen reader hears a sentence rather than a bare "told".
  const label = await mark.getAttribute('aria-label');
  expect(label).toMatch(/Mark that you told .+ yourself/i);

  const before = await nums();
  await mark.click();
  await settled(page);
  const after = await nums();
  expect(after.told).toBe(before.told + 1);
  if (before.total !== null) expect(after.total).toBe(before.total);   // the denominator is not a moving target

  // Undoable — a mis-tap has to be reversible or hosts stop tapping honestly.
  await page.locator('.guest-told').first().click();
  await settled(page);
  expect((await nums()).told).toBe(before.told);
});

test('it survives a reload — this is a record, not a session toggle', async ({ page }) => {
  await boot(page);
  await page.locator('.grow button').first().click();
  await settled(page);
  const mark = page.locator('.guest-told').first();
  if (!(await mark.count())) test.skip(true, 'no reachable guest');
  await mark.click();
  await settled(page);
  const marked = (await page.locator('.told-rollup').innerText()).trim();

  await page.reload();
  await settled(page);
  // THE DOOR MOVES WITH THE VIEWPORT -- the shared helper, not a rail click.
  // This line was `if (rail.count()) click`, which at mobile silently did
  // nothing, never reached the roster, and timed out on a rollup that was
  // never on screen. Third time today that assuming the desktop door broke a
  // test at every other width.
  await openSectionByName(page, 'Guests');
  await settled(page);
  expect((await page.locator('.told-rollup').innerText()).trim()).toBe(marked);
});
