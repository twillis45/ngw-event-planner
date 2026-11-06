// ─── A SHORT NAME IS ASKED ABOUT, NEVER ASSUMED ──────────────────────────────
//
// Gold run (11/5/2026): a reply signed "eve" became a new guest and Eve Brooks
// still read no reply. Owner ruling (option 3): never attach it on a guess — the
// lib flags the row (`maybeSameAs`) and the Guests sheet asks the host. Rail
// viewports only, as theCouplesSheSaidReachTheList explains.
import { test, expect } from './fixtures.mjs';

const RAIL = /tablet-land|tablet-tall|desktop|wide/;
const EV = {
  id: 'E2E_short', type: 'Get-Together', name: 'Book club', date: '2027-03-12',
  guestMode: 'list', guestEstimate: 3, budget: [], vendors: [], timeline: [],
  guests: [
    { id: 'g1', name: 'Eve Brooks', rsvp: '' },
    { id: 'g2', name: 'Ana Rivera', rsvp: '' },
    { id: 'g-rsvp-k1', name: 'eve', rsvp: 'Yes', meal: 'Fish', maybeSameAs: 'g1' },
  ],
};
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].guests);

const open = async (page) => {
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('./');
  const row = page.getByRole('button', { name: /^Guests$/ }).first();
  await row.waitFor({ state: 'visible', timeout: 20000 });
  await row.click();
  const ask = page.getByRole('group', { name: 'Is eve Eve Brooks?' });
  await expect(ask).toBeVisible({ timeout: 20000 });
  return ask;
};

test('"Same person" moves the reply onto Eve Brooks and the row goes', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'the section rail exists at tablet-land and above');
  const ask = await open(page);
  await ask.getByRole('button', { name: 'Same person' }).click();
  await expect.poll(async () => (await stored(page)).length).toBe(2);
  const eve = (await stored(page)).find((g) => g.id === 'g1');
  expect(eve).toMatchObject({ rsvp: 'Yes', meal: 'Fish', aka: ['eve'] });
  await expect(page.getByRole('group', { name: 'Is eve Eve Brooks?' })).toHaveCount(0);
});

test('"Different people" keeps both and does not ask again', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'the section rail exists at tablet-land and above');
  const ask = await open(page);
  await ask.getByRole('button', { name: 'Different people' }).click();
  await expect.poll(async () => (await stored(page)).find((g) => g.id === 'g-rsvp-k1').maybeSameAs).toBeUndefined();
  expect((await stored(page)).length).toBe(3);
  await page.reload();
  await page.getByRole('button', { name: /^Guests$/ }).first().click();
  await page.getByLabel(/Add guest names/i).waitFor({ state: 'visible', timeout: 20000 });
  await expect(page.getByRole('group', { name: 'Is eve Eve Brooks?' })).toHaveCount(0);
});
