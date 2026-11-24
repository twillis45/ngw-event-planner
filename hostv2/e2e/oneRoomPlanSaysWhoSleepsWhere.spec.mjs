// ─── ONE ROOM PLAN SAYS WHO SLEEPS WHERE (owner pick "combine", 11/21/2026) ──
//
// Group Trip's "Settle who sleeps where…" opens the room plan in Where
// everyone stays. Rooms ± and named; tap a name, then a room; Draw lots places
// everyone (early risers first, night owls last); Copy the room list. The
// roster's "rooming with" is derived from the plan, and once everyone is in a
// room the row checks off.
// Jest twin: src/lib/__tests__/oneRoomPlanSaysWhoSleepsWhere.test.js.
import { test, expect, settled, sheetSettled, dateIn, openSectionByName, checklistStepAction, openAllPhases } from './fixtures.mjs';

const STEP = 'Settle who sleeps where: draw lots for the best rooms, and keep the early risers apart from the night owls';
const NAMES = ['Ana Ruiz', 'Bree Cole', 'Cam Ito', 'Dee Park'];
const EVENT = {
  id: 'e2e-rooms', name: 'Nashville girls trip', type: 'Group Trip', isDestination: true, date: dateIn(40), endDate: dateIn(43),
  createdAt: new Date(Date.now() - 20 * 864e5).toISOString(), venue: 'Nashville, TN', venueCity: 'Nashville', venueState: 'TN',
  guestMode: 'list', guestEstimate: 4, guestCountSource: 'host', vendors: [], budget: [], foodChoices: {},
  lodging: { hotelName: 'The Germantown house', code: 'HMX42' },
  guests: NAMES.map((n, i) => ({ id: 'g' + (i + 1), name: n, rsvp: 'Yes' })),
  timeline: [{ id: 'pbt-e2e-rooms-t_rooms', task: STEP, leadDays: 35, week: '1 month out', done: false, owner: '', category: 'planning', phase: 'planning' }],
};
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);

test('the row opens the room plan; draw lots, move one, and "rooming with" follows the plan', async ({ page }) => {
  await page.addInitScript((ev) => {
    // Every page load, the cockpit's included: it is a page of its own.
    window.__copied = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copied.push(t); } } });
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  await (await checklistStepAction(page, 'Plan who sleeps where')).click();
  await page.waitForURL(/demo=lodging/);
  const plan = page.locator('[data-room-plan]');
  await expect(plan).toBeVisible();
  await expect(plan).toContainText('it’s random — early risers (☀) fill rooms first and night owls (☾) last');
  await expect(plan.locator('[data-room]')).toHaveCount(3);   // two rooms + "No room yet"

  // Ana is an early riser, Dee a night owl: they land in different rooms.
  await plan.getByRole('button', { name: /^Ana Ruiz: no habit marked/ }).click();
  await plan.getByRole('button', { name: /^Dee Park: no habit marked/ }).click();
  await plan.getByRole('button', { name: /^Dee Park: early riser/ }).click();
  await plan.getByRole('button', { name: 'Draw lots' }).click();
  await expect.poll(async () => {
    const rp = (await stored(page)).roomPlan;
    return rp && rp.rooms.map((r) => r.guestIds.length);
  }).toEqual([2, 2]);
  const rooms = (await stored(page)).roomPlan.rooms;
  expect(rooms[0].guestIds).toContain('g1');
  expect(rooms[1].guestIds).toContain('g4');

  // Tap a name, then a room.
  await plan.locator('[data-room="r2"]').getByRole('button', { name: /^Dee Park/ }).click();
  await plan.locator('[data-room="r1"]').getByRole('button', { name: 'Put Dee here' }).click();
  await expect.poll(async () => (await stored(page)).roomPlan.rooms[0].guestIds).toContain('g4');
  for (const el of await plan.locator('button, input').all()) expect((await el.boundingBox()).height).toBeGreaterThanOrEqual(44);

  await plan.getByRole('button', { name: 'Copy the room list' }).click();
  expect((await page.evaluate(() => window.__copied))[0]).toMatch(/^Room 1: .*Dee Park/);

  // "Rooming with" below is the plan's, not a second record.
  const ana = page.getByRole('button', { name: /^Ana Ruiz — / });
  await expect(ana).toContainText('rooming with');
  await expect(ana).toContainText('Dee Park');
});

test('everyone in a room checks the row off', async ({ page }) => {
  const ev = { ...EVENT, id: 'e2e-rooms-done', roomPlan: { rooms: [{ id: 'r1', name: 'Room 1', guestIds: ['g1', 'g2'] }, { id: 'r2', name: 'Room 2', guestIds: ['g3', 'g4'] }], habits: {} } };
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  await openAllPhases(page);   // a step the plan handled sits in its phase (cohesion batch D)
  await expect(page.locator('.sheet').last().locator('.frow').filter({ hasText: 'Settle who sleeps where' })).toHaveClass(/\bgot\b/);
});
