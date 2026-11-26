// ─── ONE BOARD, ONE COUNT OF OPEN STEPS ─────────────────────────────────────
// Live check of 9009f21 (11/26/2026, 10:00 AM EST): a seeded Thanksgiving dated
// today, made 6 days ago. One Plan board read "20 things still open", "27 plan
// steps still open" and "Needs you — 9 overdue": three rules, labelled alike
// (owner: "App is lying somewhere"). Now every count of steps past their window
// on the board is the same number, in the same words, and the run-through says
// how many are left in all.
import { test, expect, settled } from './fixtures.mjs';

const DAY = '2026-11-26';
const step = (id, leadDays, done = false) => ({ id, task: 'Probe step ' + id, leadDays, done });

test('the day-of board prints one past-their-window number everywhere', async ({ page }) => {
  await page.clock.setFixedTime(new Date(DAY + 'T10:00:00'));
  await page.addInitScript((date) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'open-probe');
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
        id: 'open-probe', type: 'Thanksgiving', name: 'Open probe', date,
        createdAt: new Date(Date.now() - 6 * 864e5).toISOString(),
        startTime: '15:00', startTimeSource: 'host', guestCount: 7, guests: [], vendors: [], budget: [],
        timeline: [['a', -14], ['b', -10], ['c', -5, true], ['d', -3], ['e', -2], ['f', -1], ['g', 0], ['h', 3]]
          .map(([id, leadDays, done]) => ({ id, task: 'Probe step ' + id, leadDays, done: !!done })),
      }]));
    }
  }, DAY);
  await page.goto('?elegant=1');
  await settled(page);
  const text = await page.locator('body').innerText();
  // The old words are gone…
  expect(text).not.toMatch(/\d+ things? still open/);
  expect(text).not.toMatch(/\d+ plan steps? still open/);
  expect(text).not.toMatch(/\b\d+ overdue\b/);
  // …and every "past their window" on the board names one number.
  const nums = [...text.matchAll(/(\d+)(?: steps?)? past (?:its|their) window/g)].map((m) => Number(m[1]));
  expect(nums.length).toBeGreaterThanOrEqual(2);
  expect(new Set(nums).size).toBe(1);
  // The run-through says how many are left in all, and the part is not larger than it.
  const left = text.match(/(\d+) plan steps? left/);
  expect(left).not.toBeNull();
  expect(Number(left[1])).toBeGreaterThanOrEqual(nums[0]);
});
