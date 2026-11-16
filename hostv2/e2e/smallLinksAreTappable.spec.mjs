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
