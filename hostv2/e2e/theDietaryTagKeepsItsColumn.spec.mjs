// ─── THE DIETARY TAG KEEPS ITS COLUMN (design audit 2, 11/20/2026) ───────────
//
// At the data tier the guest roster lays a row out in tracks: name, kids, meal,
// dietary, reply. The name track was viewport-relative and the rest fixed, so
// Dietary got what was left: 8px at 1024x768 and 1024x1366, 0 at 1180x820,
// 18px at 1366x1024. "Peanut" painted over the reply chip and read "PeanuYes".
//
// Measured on every row with a dietary tag, at every project: the tag sits
// inside its own cell and clear of the reply chip, and (rail up) the header's
// Dietary label sits over the cell it names.
import { test, expect, sheetSettled, openSectionByName, dateIn } from './fixtures.mjs';

const EVENT = {
  id: 'diettrack-ev', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [
    { id: 'g1', name: 'Jordan Avery', rsvp: 'Yes' },
    { id: 'g2', name: 'Riley Park', rsvp: 'Yes', allergens: ['Peanut'] },
    { id: 'g3', name: 'Morgan Diaz', rsvp: 'Maybe', diet: 'Vegetarian' },
    { id: 'g4', name: 'Alexandra Montgomery-Hale', rsvp: '', diet: 'Vegetarian', allergens: ['Shellfish'] },
  ],
  vendors: [], budget: [], timeline: [],
};

test('every dietary tag sits in its own cell, clear of the reply chip', async ({ page }) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(800);
  await openSectionByName(page, 'Guests');
  await sheetSettled(page);
  await expect(page.locator('.grow', { hasText: 'Riley Park' }).first()).toBeVisible({ timeout: 8000 });

  const rows = await page.evaluate(() => [...document.querySelectorAll('.grow')].map((row) => {
    const tags = [...row.querySelectorAll('.gm-diet .tag')];
    if (!tags.length) return null;
    const reply = row.querySelector(':scope > button + button .tag');
    const cell = row.querySelector('.gm-diet').getBoundingClientRect();
    const rr = reply ? reply.getBoundingClientRect() : null;
    return {
      name: row.querySelector('button > span').innerText,
      railTier: !!row.closest('.stagewrap--responsive-data[data-rail="1"]'),
      cell: { l: cell.left, r: cell.right },
      tags: tags.map((t) => { const b = t.getBoundingClientRect(); return { text: t.innerText, l: b.left, r: b.right, t: b.top, b: b.bottom }; }),
      reply: rr && { l: rr.left, r: rr.right, t: rr.top, b: rr.bottom },
    };
  }).filter(Boolean));

  expect(rows.map((r) => r.name), 'premise: the rows with dietary tags were measured').toEqual(
    expect.arrayContaining(['Riley Park', 'Alexandra Montgomery-Hale']));
  for (const r of rows) {
    for (const t of r.tags) {
      const overlapsReply = r.reply && t.l < r.reply.r && t.r > r.reply.l && t.t < r.reply.b && t.b > r.reply.t;
      expect(overlapsReply, `${r.name}: "${t.text}" paints over the reply chip`).toBeFalsy();
      if (r.railTier) {
        expect(t.l, `${r.name}: "${t.text}" starts inside its cell`).toBeGreaterThanOrEqual(r.cell.l - 0.5);
        expect(t.r, `${r.name}: "${t.text}" ends inside its cell (cell ${Math.round(r.cell.r - r.cell.l)}px wide)`).toBeLessThanOrEqual(r.cell.r + 0.5);
      }
    }
  }

  // Rail up: the header's Dietary label still names the cell under it.
  const head = await page.evaluate(() => {
    const h = [...document.querySelectorAll('.ghead span')].find((s) => s.innerText.trim().toLowerCase() === 'dietary');
    if (!h || !h.getClientRects().length) return null;
    const row = [...document.querySelectorAll('.grow')].find((x) => x.querySelector('.gm-diet .tag'));
    return { label: h.getBoundingClientRect().left, cell: row.querySelector('.gm-diet').getBoundingClientRect().left };
  });
  if (rows.some((r) => r.railTier)) {
    expect(head, 'premise: the header shows at the data tier').not.toBeNull();
    expect(Math.abs(head.label - head.cell), 'Dietary header over its column').toBeLessThanOrEqual(6);
  }
});
