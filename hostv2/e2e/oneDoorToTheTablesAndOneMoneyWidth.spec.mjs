// ─── ONE DOOR TO THE TABLES; ONE WIDTH FOR YOUR MONEY (cohesion batch C) ─────
//
// Owner approved both renders on 11/24/2026 (renders/cohesion-c):
//   #18 Space, seats & helpers kept its own table ± beside Who sits where's.
//       Once Who sits where is open (a guest has said yes) it owns the count,
//       so Space says the count and routes there: one door. Before anyone says
//       yes, Who sits where has nothing to show and Space's ± is the only way
//       to set the tables (owner, 11/18/2026; tablesSeatPeople.spec), so it
//       stays there.
//   #62 Your money's summary card sat at the 820px prose measure beside a
//       1,130px list at 1440. It takes the list's width.
// Made-up names and places only.
import { test, expect, settled, sheetSettled, openSectionByName, dateIn } from './fixtures.mjs';

const EVENT = {
  id: 'one-door', name: 'Jordan’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(30), startTime: '18:00', startTimeSource: 'host',
  venue: 'Elm Court Hall', venueAddress: '42 Elm Ct, Springfield, VA 22150', venueCity: 'Springfield, VA', venueKind: 'venue',
  guestMode: 'count', guestCount: 60, guestCountSource: 'host',
  guests: [
    { id: 'g1', name: 'Avery Lane', rsvp: 'Yes', table: 1 }, { id: 'g2', name: 'Riley Stone', rsvp: 'Yes', table: 1 },
    { id: 'g3', name: 'Morgan Vale', rsvp: 'Maybe' },
  ],
  vendors: [{ id: 'v1', name: 'Maple Table Catering', category: 'Catering', status: 'Booked', cost: 1800, budgetCategory: 'Food' }],
  budget: [{ id: 'b1', category: 'Food', budgeted: 2000, actual: 0 }, { id: 'b2', category: 'Decor', budgeted: 300, actual: 0 }],
  timeline: [],
};
const boot = async (page) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await settled(page);
};

test('#18: once a guest has said yes, Space routes to Who sits where for the tables', async ({ page }) => {
  await boot(page);
  await openSectionByName(page, 'Space, seats & helpers');
  await sheetSettled(page);
  const seat = page.locator('.sheet [data-seat-check]');
  await expect(seat).toContainText('tables of 8 for 60 guests');
  await expect(seat.getByRole('button', { name: 'One more table' })).toHaveCount(0);
  await expect(seat.getByRole('button', { name: 'One fewer table' })).toHaveCount(0);
  await seat.locator('[data-seat-door]').click();
  await expect(page.locator('#sheet-title')).toHaveText('Who sits where');
  // The one ± that sets the tables lives there.
  await expect(page.locator('.sheet').last()).toContainText('Use the ± to change it.');
});

test('#62: at 1440 the money summary is as wide as the list beside it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await boot(page);
  await openSectionByName(page, 'Your money');
  await sheetSettled(page);
  const widths = await page.evaluate(() => {
    const sheet = [...document.querySelectorAll('.sheet')].pop();
    const panelOf = (el) => { let e = el; while (e && !(e.parentElement && e.parentElement.classList.contains('sheet-body'))) e = e.parentElement; return e; };
    const summary = panelOf(sheet.querySelector('.mbar'));
    const list = panelOf([...sheet.querySelectorAll('.shelf-label')].find((x) => /Expected costs/i.test(x.innerText)));
    return { summary: summary && summary.getBoundingClientRect().width, list: list && list.getBoundingClientRect().width };
  });
  expect(widths.summary, 'premise: the summary panel was found').toBeGreaterThan(0);
  expect(widths.list, 'premise: the expected-costs panel was found').toBeGreaterThan(900);
  expect(Math.abs(widths.summary - widths.list)).toBeLessThanOrEqual(2);
});
