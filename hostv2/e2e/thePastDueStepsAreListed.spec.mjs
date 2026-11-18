// ─── THE PAST-DUE STEPS ARE LISTED, NOT ONLY COUNTED ────────────────────────
//
// Owner, 11/18/2026: "this screenshot shows 8 overdue but no list below."
// Reproduced on a Friendsgiving three days out: the month view put red counts
// on Nov 7, 14, 16 and 17 (8 late steps in all) while the list under the month
// was today's, and the week view never shows earlier weeks. A "Past due" list
// now names every open late step, with its date, in both views.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const boot = async (page, view) => {
  await page.addInitScript(([e, v]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-calendar-view', v);
  }, [{
    id: 'e2e-late-cal', name: 'My Friendsgiving', type: 'Friendsgiving', date: dateIn(3), startTime: '16:00',
    createdAt: new Date(Date.now() - 20 * 864e5).toISOString(),
    venue: "Vida's", venueCity: 'Baltimore', venueState: 'MD', guestEstimate: 15, guestCountSource: 'host',
    guests: [], vendors: [], budget: [],
    timeline: [
      { id: 'late-1', task: 'Send the invitation', leadDays: 21, week: '3 weeks out', done: false },
      { id: 'late-2', task: 'Assign each friend a dish by name', leadDays: 14, week: '2 weeks out', done: false },
      { id: 'done-1', task: 'Pick the date', leadDays: 30, week: '4 weeks out', done: true },
    ],
  }, view]);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Calendar');
  await settled(page);
};

for (const view of ['month', 'week']) {
  test(`${view} view: every late step is listed with its date`, async ({ page }) => {
    await boot(page, view);
    const late = page.locator('[data-cal-late]');
    await expect(late).toBeVisible();
    const label = await late.locator('.shelf-label').innerText();
    const n = Number((label.match(/(\d+)/) || [])[1]);
    expect(n).toBeGreaterThanOrEqual(2);                 // ours, plus the playbook's own late steps
    await expect(late.locator('.cal-item')).toHaveCount(n);
    for (const t of ['Send the invitation', 'Assign each friend a dish by name']) {
      await expect(late.locator('.cal-item', { hasText: t }).first()).toBeVisible();
    }
    await expect(late.locator('.cal-item', { hasText: 'Pick the date' })).toHaveCount(0);   // done is not late
    await expect(late.locator('.cal-item .cal-tag').first()).toHaveText(/^[A-Z][a-z]{2} \d{1,2}$/);
  });
}
