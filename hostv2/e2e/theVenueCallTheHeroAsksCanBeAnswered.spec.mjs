// ─── THE VENUE CALL THE HERO ASKS CAN BE ANSWERED (hero-clears sweep, 11/20/2026) ──
//
// Owner report: "Some heroes don't clear when a section is completed." One
// shape of it, reproduced on a retirement party nine days out with its venue
// named ("VFW Post 12") and no venue vendor booked:
//
//   the hero asked "At home, a restaurant, or the workplace?" — past its window
//   — with no options under it, and the Calls sheet did not list that call at
//   all. There was nowhere to answer it, so the hero could never clear.
//
// The engine (playbooks decisionSettledByData, 11/15/2026 ruling) keeps the
// venue call open until a venue vendor is booked; the shell had its own older
// filter (2026-07-19) that dropped the call from the Calls board whenever a
// venue name was on file. The surfaceRegistry raiser still raised it from the
// engine's board, so the hero asked a call no surface would take an answer for.
// One rule now: the engine's.
import { test, expect, dateIn, settled } from './fixtures.mjs';

const EV = {
  id: 'E2E_venue_call', name: 'Pat’s send-off', type: 'Retirement Party', date: dateIn(9),
  guestMode: 'count', guestEstimate: 30, guestCountSource: 'host',
  venue: 'VFW Post 12', venueAddress: '12 Oak St, Austin, TX', venueCity: 'Austin, TX',
  startTime: '18:00', startTimeSource: 'host', totalBudget: 30000,
  budget: [], vendors: [], timeline: [], guests: [],
};
// A named place whose kind the app cannot tell is asked just that (owner,
// 11/21/2026: "Don't keep asking host for the same information"); a VFW post
// is asked rather than guessed, per the 11/15/2026 ruling.
const VENUE_ASK = /what kind of place is VFW Post 12/i;

const boot = async (page) => {
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
};
const ask = (page) => page.locator('.hero h2.ask').first().innerText();

test('a venue call on the board can be answered on the Calls sheet, and the hero moves on', async ({ page }) => {
  await boot(page);
  // PREMISE: the hero is on the venue call.
  expect(await ask(page)).toMatch(VENUE_ASK);
  await page.locator('.srail-row', { hasText: 'Calls to make' }).first().click();
  const sheet = page.locator('.sheet').last();
  // A long board paces itself; the venue call may sit under "show the rest".
  const rest = sheet.getByText(/show the rest/i);
  if (await rest.count()) await rest.first().click();
  await expect(sheet).toContainText(/What kind of place is VFW Post 12\?/i);
  await sheet.locator('button').filter({ hasText: 'Restaurant private room' }).first().click();
  await page.keyboard.press('Escape');
  await expect.poll(() => ask(page).catch(() => '')).not.toMatch(VENUE_ASK);
  await page.reload();
  await settled(page);
  expect(await ask(page).catch(() => '')).not.toMatch(VENUE_ASK);
});

test('the hero that asks the venue call offers its answers in place', async ({ page }) => {
  await boot(page);
  expect(await ask(page)).toMatch(VENUE_ASK);
  // The hero carries the call's own answers; take one in place. Asking only the
  // kind, there is no "our pick" to propose: every answer is an equal row.
  await page.locator('.hero').first().locator('button.decopt').filter({ hasText: 'Banquet hall / event venue' }).first().click();
  await expect.poll(() => ask(page).catch(() => '')).not.toMatch(VENUE_ASK);
});

// A party at the host's own place is not asked where it is: "at home" is a
// fact the event already holds (decisionSettledByData, 11/20/2026). With the
// shell's old filter gone this is the engine's answer, not a hidden row.
test('a party at home is not asked "at home, a restaurant, or the workplace?"', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-welcomed', '1');
  }, { ...EV, id: 'E2E_venue_home', venue: 'Home', venueKind: 'home' });
  await page.goto('?elegant=1');
  await settled(page);
  const hero = await page.locator('.hero').first().innerText();
  expect(hero.length).toBeGreaterThan(40);
  expect(hero).not.toMatch(VENUE_ASK);
  await page.locator('.srail-row', { hasText: 'Calls to make' }).first().click();
  const sheet = page.locator('.sheet').last();
  const rest = sheet.getByText(/show the rest/i);
  if (await rest.count()) await rest.first().click();
  // Not among the open calls; filed under Settled, answered by "Your place".
  const text = await sheet.innerText();
  const [openPart, settledPart = ''] = text.split(/\nSettled\n/i);
  expect(openPart).not.toMatch(/At home, a restaurant, or the workplace/i);
  expect(settledPart).toMatch(/Your place\s*\n?\s*At home, a restaurant, or the workplace/i);
});
