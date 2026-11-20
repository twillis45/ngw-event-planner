// ─── A STEP THE CHECKLIST HANDLED IS NOT "CAUGHT UP" (hero-clears, 11/20/2026) ──
//
// Driven on the built bundle: three steps the plan had retired, each past its
// window. The checklist read "Every step is handled — the plan has them. 3 no
// longer needed", and the board hero read "Catch up on this step. — Order the
// balloons — Overdue by 5 days." The checklist and the overdue policy behind
// the hero answered "is this step handled?" with two different rules; they read
// one now (lib/taskEngine timelineStepResolved). Unit proof, including the
// arrivals-grid and bought-shop cases:
// src/lib/__tests__/aStepTheChecklistCallsHandledIsNotOverdue.test.js.
import { test, expect, dateIn, settled } from './fixtures.mjs';

const EV = {
  id: 'E2E_retired_steps', name: 'Test', type: 'Other', date: dateIn(20),
  guestMode: 'count', guestEstimate: 20, guestCountSource: 'host',
  venue: 'Lakeside Hall', venueAddress: '12 Oak St, Austin, TX', venueCity: 'Austin, TX',
  startTime: '18:00', startTimeSource: 'host', totalBudget: 5000,
  budget: [], vendors: [], guests: [],
  timeline: [
    { id: 'a', task: 'Order the balloons', leadDays: -25, retired: true },
    { id: 'b', task: 'Rent folding tables', leadDays: -24, retired: true },
    { id: 'c', task: 'Book the photo booth', leadDays: -23, retired: true },
    { id: 'd', task: 'Send the invites', leadDays: -30, done: true },
  ],
};

test('the hero does not ask to catch up on steps the checklist calls handled', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
  // PREMISE: the checklist calls every step handled.
  await page.locator('.srail-row', { hasText: 'Your checklist' }).first().click();
  await expect(page.locator('.sheet').last()).toContainText(/Every step is handled/i);
  await page.keyboard.press('Escape');
  const hero = await page.locator('.hero').first().innerText();
  expect(hero.length).toBeGreaterThan(40);
  expect(hero).not.toMatch(/catch up|overdue|order the balloons|rent folding tables|book the photo booth/i);
});
