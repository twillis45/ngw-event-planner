// ─── SMALL TEXT LINKS ARE STILL A FINGER WIDE (live hunt item 20, 11/16/2026) ─
// "What's in the estimate" and "add your state for local prices" are inline
// text buttons, 14px tall on a phone: under a third of the 44px floor. The fix
// is the zero-layout expander the sheet's "‹ Sections" already uses (a centered
// ::after), so the line keeps its look and the target grows. Measured as a
// finger would find it — elementFromPoint up and down from the center — not by
// the box, which an ::after does not change.
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const EVENT = { id: 'cust-taps', name: 'Linden Supper', type: 'Dinner Party', date: dateIn(30),
  guestCount: 24, guestMode: 'count', guestCountSource: 'host', budget: [], vendors: [], guests: [], timeline: [] };

const hitHeight = (loc) => loc.evaluate((el) => {
  const b = el.getBoundingClientRect(); const cx = b.left + Math.min(b.width / 2, 20), cy = b.top + b.height / 2;
  const on = (y) => { const e = document.elementFromPoint(cx, y); return !!e && (e === el || el.contains(e)); };
  let up = 0, dn = 0;
  for (let d = 1; d < 40 && on(cy - d); d++) up = d;
  for (let d = 1; d < 40 && on(cy + d); d++) dn = d;
  return up + dn + 1;
});

test('the estimate toggle and the add-your-state link are at least 44px tall to a finger', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'The spread & shopping');
  await settled(page);
  for (const name of [/^What’s in the estimate$/, /add your state/]) {
    const b = page.getByRole('button', { name }).first();
    await b.scrollIntoViewIfNeeded();
    expect(await hitHeight(b), String(name)).toBeGreaterThanOrEqual(44);
  }
});

// 50-host run (11/16/2026): two more under the floor. The money sheet's inline
// "Use $300" link (plan costs above the planning number) and the Space sheet's
// open rows ("Venue / location ›"), whose padding sat on a wrapper, not the button.
const FG = { id: 'cust-taps-fg', name: 'My Friendsgiving', type: 'Friendsgiving', date: dateIn(6),
  guestEstimate: 20, guestMode: 'count', guestCountSource: 'host',
  // A booked $300 table rental puts the plan's own lines over the band on ANY
  // date. Without it the plan sat at $375 against a $300 middle, and the link
  // vanished the day this event's dateIn(6) landed in Thanksgiving week, when
  // factors.usHolidays lifts the middle to $400 (CI, 11/19/2026): correct app
  // behavior, a calendar-dependent fixture.
  // A BOOKED $300 rental, not a $300 budget row: since the Wanda audit (P0-6,
  // 11/22/2026) a budget built from rows IS a set budget, so it no longer
  // leaves the editor proposing a number. A booked vendor still puts the plan
  // over the band's middle without setting a budget.
  budget: [], vendors: [{ id: 'v-rent', name: 'Table rental', category: 'Rentals', status: 'Booked', cost: 300 }], guests: [], timeline: [] };

test('the "Mid-range $…" tier and the Space rows are big enough to tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, FG);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Your money');
  await settled(page);
  // The INLINE path to the band's middle. It was a "Use $300 and trim" link;
  // since the owner's 11/24/2026 copy ruling it is the "Mid-range $300" tier in
  // the tier row, and it is held to the same 44px.
  const use = page.locator('.sheet').last().locator('.tier-link', { hasText: /^Mid.range \$/ }).first();
  await expect(use).toHaveCount(1);
  await use.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  expect(await hitHeight(use), 'Mid-range $… tier').toBeGreaterThanOrEqual(44);

  await openSectionByName(page, 'Space, seats');
  await settled(page);
  const row = page.getByRole('button', { name: /^Add note for / }).first();
  await row.scrollIntoViewIfNeeded();
  // A one-line row is only as tall as its text plus the BUTTON's own padding
  // (a wrapping row is tall either way), so the padding is what is checked.
  expect(await row.evaluate((b) => parseFloat(getComputedStyle(b).paddingTop)), 'Space row padding').toBeGreaterThanOrEqual(6);
  expect(await hitHeight(row), 'Space row').toBeGreaterThanOrEqual(32);
});
