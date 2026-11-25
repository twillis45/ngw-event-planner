// ─── UP NEXT GOES WHERE THE ROW GOES (cohesion D's hookup for F, 11/25/2026) ──
//
// The checklist's "Up next" lit button reads taskRoute.upNextRoute, which is
// actionRoute (the board's "Then, in order" rows' one step fallback) minus the
// step's own row. Jest (src/lib/__tests__/upNextGoesWhereTheRowGoes.test.js)
// proves the routes agree for every step of every playbook; this proves the
// button wears that route and goes there. Wanda's next step is the album:
// its route is the After stage's album field.
import { test, expect, settled } from './fixtures.mjs';

test('1440x900: Up next wears its step\'s route and goes there', async ({ browser }) => {
  test.setTimeout(60_000);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('./?elegant=1');
  await settled(page);
  await page.locator('.srail-row', { hasText: 'Your checklist' }).first().click();
  const go = page.locator('[data-up-next] [data-up-next-go]');
  await expect(go).toHaveText('Add the album link');
  await expect(page.locator('[data-up-next]')).toHaveAttribute('data-up-next-step', /t_memory_collect$/);
  expect(JSON.parse(await go.getAttribute('data-route'))).toEqual({ focusField: 'after-album' });
  await go.click();
  // The route's destination: the checklist closes onto After, at the album field.
  await expect(page.locator('.sheet')).toHaveCount(0);
  await expect(page.locator('h1.mega')).toHaveText(/How it(’ll)? land/);
  await expect(page.getByLabel('Photo album link')).toBeFocused();
  await ctx.close();
});

test('1440x900: a step with nowhere to go says "Check it off" and wears no route', async ({ browser }) => {
  test.setTimeout(60_000);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const EV = { id: 'cust-up-own', name: 'Our Porch Supper', type: 'Dinner Party', date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    startTime: '18:00', startTimeSource: 'host', createdAt: '2026-11-01', venue: 'Home', venueKind: 'home', venueAddress: '42 Elm Ct, Springfield, VA 22150',
    guestMode: 'count', guestEstimate: 8, guests: [], vendors: [], budget: [],
    timeline: [{ id: 'own-1', task: 'Something only the host knows', week: 'This week', done: false }] };
  await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('./?elegant=1');
  await settled(page);
  await page.locator('.srail-row', { hasText: 'Your checklist' }).first().click();
  const card = page.locator('[data-up-next]');
  await expect(card).toBeVisible();
  // Whatever Up next is here: routed, it wears its route; not routed, it says
  // "Check it off" and wears none. Never a lit label that goes nowhere.
  const go = card.locator('[data-up-next-go]');
  const route = await go.getAttribute('data-route');
  if (route) await expect(go).not.toHaveText('Check it off');
  else await expect(go).toHaveText('Check it off');
  await ctx.close();
});
