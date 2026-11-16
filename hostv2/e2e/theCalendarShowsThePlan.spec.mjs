// ─── THE CALENDAR SHOWS THE PLAN (owner, 11/16/2026: week and month toggle) ─
// The checklist laid out by date: each step on the event date plus its lead,
// the event day marked, an overdue step says so. Week is a list; Month is a
// grid whose days open below it. The choice of view is remembered.
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const EV = { id: 'cust-cal', name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: dateIn(10), createdAt: new Date(Date.now() - 40 * 864e5).toISOString(),
  guestMode: 'count', guests: [], vendors: [], budget: [],
  timeline: [
    { id: 't1', task: 'Order the turkey', week: '2 weeks out', done: false },      // event − 14 = 4 days ago: overdue
    { id: 't2', task: 'Buy the wine', week: 'day before', done: false },           // event − 1
    { id: 't3', task: 'Send invites', week: '3 weeks out', done: true },
  ] };

test('week and month: the steps on their days, the event marked, the view remembered', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Calendar');
  const cal = page.locator('[data-calendar]');
  await expect(cal).toBeVisible();

  // WEEK: today's row says so; the overdue turkey sits on its day, marked.
  const week = cal.locator('[data-cal-week]');
  await expect(week).toBeVisible();
  await expect(week.locator(`[data-date="${dateIn(0)}"]`)).toContainText('Today');
  const turkeyDay = dateIn(-4);
  const inThisWeek = await week.locator(`[data-date="${turkeyDay}"]`).count();
  if (!inThisWeek) await cal.getByRole('button', { name: 'Previous week' }).click();
  const turkey = week.locator(`[data-date="${turkeyDay}"] .cal-item`, { hasText: 'Order the turkey' });
  await expect(turkey).toContainText('Overdue');

  // MONTH: the event day is marked; tapping it lists the event and the step due then.
  // The toggle SHOWS which view is on (live look, 11/16: both looked the same).
  const wk = cal.getByRole('button', { name: 'Week', exact: true });
  const mo = cal.getByRole('button', { name: 'Month', exact: true });
  await expect(wk).toHaveAttribute('aria-pressed', 'true');
  const bg = (l) => l.evaluate((n) => getComputedStyle(n).backgroundColor);
  expect(await bg(wk)).not.toBe(await bg(mo));
  await mo.click();
  await expect(mo).toHaveAttribute('aria-pressed', 'true');
  await expect(cal.locator('[data-cal-month]')).toBeVisible();
  const eventCell = cal.locator(`.cal-cell[data-date="${EV.date}"]:not(.is-out)`);
  if (!await eventCell.count()) await cal.getByRole('button', { name: 'Next month' }).click();
  await expect(eventCell).toHaveClass(/has-event/);
  await eventCell.click();
  // The event leads its day; the playbook's day-of steps follow it.
  await expect(cal.locator('[data-cal-picked] .cal-item').first()).toHaveText('Vida’s Friendsgiving');
  await expect(cal.locator('[data-cal-picked] .cal-item').first()).toHaveAttribute('data-kind', 'event');
  const wineCell = cal.locator(`.cal-cell[data-date="${dateIn(9)}"]:not(.is-out)`);
  if (await wineCell.count()) { await wineCell.click(); await expect(cal.locator('[data-cal-picked]')).toContainText('Buy the wine'); }

  // Remembered: reopen, and it is still the month.
  await page.reload(); await settled(page);
  await openSectionByName(page, 'Calendar');
  await expect(page.locator('[data-cal-month]')).toBeVisible();

  // Add to my calendar: one .ics file with the event and every open step.
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-cal-ics]').click()]);
  expect(dl.suggestedFilename()).toBe('Vidas-Friendsgiving-plan.ics');
  const ics = await (await import('node:fs')).promises.readFile(await dl.path(), 'utf8');
  expect(ics).toContain('BEGIN:VCALENDAR');
  expect(ics).toContain('SUMMARY:To do: Buy the wine');
  expect(ics).not.toContain('Send invites');                // done steps stay out
  await expect(page.locator('[data-calendar]')).toContainText('one-time copy');

  // Phone: finger-sized controls, nothing off the side.
  const small = await page.evaluate(() => [...document.querySelectorAll('[data-calendar] button')]
    .map((n) => n.getBoundingClientRect()).filter((r) => r.width && r.height < 40).length);
  expect(small).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
