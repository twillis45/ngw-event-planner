// ─── DELETING YOUR LAST EVENT LANDS ON THE WELCOME, NOT ON A SAMPLE ──────────
//
// Found on the live site, 11/16/2026: the demo account deleted its only event
// and opened on "Margaret Adeyemi's Retirement Celebration" — a built-in sample
// with a made-up caterer bill ("Pay your caterer. Balance was due 37 days ago")
// and nothing on the board saying it was a sample. A host would read it as hers.
// Issue #100 D-5 closed the same trap for a brand-new host; this closes it for
// the host who deletes her last event: she gets the welcome a new visitor gets
// ("Start my event" / "Explore a sample first"), and chooses.
import { test, expect, settled, openEventsSheet } from './fixtures.mjs';

// The board's header: the tall header on a phone since owner ruling 1
// (11/23/2026), the ☰ eyebrow where it remains.
const HEAD = '[data-tt-head], .ev-eyebrow';

const ev = (id, name) => ({
  id, name, type: 'Birthday', date: '2027-06-12', venueCity: 'Anaheim', venueState: 'CA',
  guestMode: 'count', guestCount: 60, budget: [], vendors: [], guests: [], timeline: [],
});

const boot = async (page, events) => {
  await page.addInitScript((evs) => {
    if (sessionStorage.getItem('booted')) return;
    sessionStorage.setItem('booted', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify(evs));
    localStorage.setItem('ngw-hostv2-last-event', evs[0].id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, events);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?elegant=1');
  await settled(page);
};

const deleteCurrent = async (page, name) => {
  await openEventsSheet(page);
  await page.getByRole('button', { name: 'Delete ' + name, exact: true }).click();
  await page.getByRole('button', { name: 'Delete ' + name + ' for good' }).click();
};

test('deleting your only event shows the welcome, not a sample as if it were yours', async ({ page }) => {
  await boot(page, [ev('cust-only-1', 'Jordan’s 50th Birthday')]);
  await deleteCurrent(page, 'Jordan’s 50th Birthday');
  await expect(page.getByRole('button', { name: 'Start my event' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explore a sample first' })).toBeVisible();
  const text = await page.evaluate(() => document.body.innerText);
  expect(text).not.toMatch(/Margaret Adeyemi|Pay your caterer|Hearthstone/);
  // And a reload keeps her there: the welcome is not dismissed behind her back.
  await page.reload(); await settled(page);
  await expect(page.getByRole('button', { name: 'Start my event' })).toBeVisible();
});

test('(control) with another event left, deleting one lands on the other', async ({ page }) => {
  await boot(page, [ev('cust-a-1', 'Jordan’s 50th Birthday'), ev('cust-b-1', 'Sam’s Graduation')]);
  await deleteCurrent(page, 'Jordan’s 50th Birthday');
  await expect(page.getByRole('button', { name: 'Start my event' })).toHaveCount(0);
  await expect(page.locator(HEAD).first()).toContainText(/Sam’s Graduation/i);
});

// ── A SAMPLE SAYS SO (owner, 11/16/2026: "Yes, add the sample event label") ──
// Exploring a sample is a choice, but its plan must never read as hers.
test('a built-in sample event carries a "Sample" label in its header; her own event does not', async ({ page }) => {
  await boot(page, [ev('cust-own-1', 'Jordan’s 50th Birthday')]);
  await expect(page.locator('[data-sample-event]')).toHaveCount(0);
  // Explore the sample, the way the welcome offers it.
  await deleteCurrent(page, 'Jordan’s 50th Birthday');
  await page.getByRole('button', { name: 'Explore a sample first' }).click();
  await settled(page);
  const chip = page.locator('[data-tt-head] [data-sample-event], .ev-eyebrow [data-sample-event]').first();
  await expect(chip).toBeVisible();
  await expect(chip).toHaveText('Sample');
  // The header still reads its countdown and name, and fits 390px (the tall
  // header's date line carries the chip on a phone, ruling 1).
  const fits = await page.evaluate(() => {
    const b = document.querySelector('[data-tt-head] .tt-r1, .ev-eyebrow'); const r = b.getBoundingClientRect();
    return r.right <= window.innerWidth && document.documentElement.scrollWidth <= window.innerWidth;
  });
  expect(fits).toBe(true);
});
